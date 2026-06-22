/* Derived signals — compute new queryable signals from the time-series.

   This is the keystone between v1's narrow rank-by-one-signal and an ICP-grade
   query plane (AR-183 / ADR 0018). Real customer questions ("areas that grew
   >20% YoY", "rising prices in low-crime LSOAs", "gentrification screens") need
   signals that DON'T exist in the raw stores -- they're derivatives over the
   time-series. This module computes them in-DB and stores them in
   `signal_values` so `rank_areas` (and any future query op) can filter / sort
   on them with no new endpoint or executor change.

   First derived signal: `property.price_change_pct_yoy` -- count-weighted YoY
   over the most recent two years per LSOA. The same pattern extends to crime
   YoY, multi-period deltas, peer-relative percentiles, trend slope, etc.

   In-DB derivation is intentional: scalable (no row round-trip to the app),
   idempotent (ON CONFLICT DO UPDATE), and the pure SQL builder is exactly
   unit-testable. The append job (timeseries.ts) already excludes `property.%`
   so the derived signal_value never leaks into the monthly time-series. */

import { query as defaultQuery } from "../../../infrastructure/db/client";
import { METHODOLOGY_VERSION } from "../../engine/methodology";
import { logger } from "../../tracking/structured-logger";
import {
  upsertSignalCatalog,
  type QueryRunner,
  type SignalCatalogRow,
} from "./store-writer";

const runDefault: QueryRunner = (text, params) => defaultQuery(text, params);

/* ── catalog (one entry per derived signal so it's discoverable + countable) ── */

const PROPERTY_YOY_SOURCE = "HM Land Registry Price Paid Data (derived: YoY)";
const PROPERTY_VOLUME_YOY_SOURCE = "HM Land Registry Price Paid Data (derived: transaction-volume YoY)";
const PROPERTY_VOLUME_SLOPE_SOURCE = "HM Land Registry Price Paid Data (derived: 24-month transaction-volume trend slope)";
const PROPERTY_6M_SOURCE = "HM Land Registry Price Paid Data (derived: 6-month count-weighted median delta)";
const CRIME_YOY_SOURCE = "Police.uk street-level crime (derived: 12-month YoY)";
const CRIME_SLOPE_SOURCE = "Police.uk street-level crime (derived: 24-month trend slope)";
const CRIME_6M_SOURCE = "Police.uk street-level crime (derived: 6-month rolling-sum delta)";
const CRIME_PEER_Z_SOURCE = "Police.uk street-level crime (derived: peer-relative z-score over normalized crime.total_12m)";
const PROPERTY_PRICE_PEER_Z_SOURCE = "HM Land Registry Price Paid Data (derived: peer-relative z-score over normalized property.median_price)";

export const DERIVED_SIGNALS: SignalCatalogRow[] = [
  {
    key: "property.price_change_pct_yoy",
    category: "property",
    label: "Year-on-year change in median sale price (%)",
    unit: "pct",
    direction: "neutral",
    source: PROPERTY_YOY_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "property.median_price_change_pct_6m",
    category: "property",
    label: "6-month change in median sale price (%)",
    unit: "pct",
    direction: "neutral",
    source: PROPERTY_6M_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "property.transaction_count_change_pct_yoy",
    category: "property",
    label: "Year-on-year change in transaction volume (%)",
    unit: "pct",
    direction: "neutral",
    source: PROPERTY_VOLUME_YOY_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "property.transaction_count_trend_slope_24m",
    category: "property",
    label: "24-month trend slope of monthly transaction volume (transactions / month / month)",
    unit: "rate_per_month",
    direction: "neutral",
    source: PROPERTY_VOLUME_SLOPE_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "crime.total_12m_change_pct_yoy",
    category: "crime",
    label: "Year-on-year change in trailing 12-month crime count (%)",
    unit: "pct",
    direction: "lower_is_better",
    source: CRIME_YOY_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "crime.total_6m_change_pct",
    category: "crime",
    label: "6-month change in crime count (%)",
    unit: "pct",
    direction: "lower_is_better",
    source: CRIME_6M_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "crime.monthly_count_trend_slope_24m",
    category: "crime",
    label: "24-month trend slope of monthly crime count (crimes / month / month)",
    unit: "rate_per_month",
    direction: "lower_is_better",
    source: CRIME_SLOPE_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "crime.total_12m_peer_relative_z",
    category: "crime",
    label: "Peer-relative z-score on trailing 12-month crime count (vs k-NN peers)",
    unit: "z_score",
    direction: "lower_is_better",
    source: CRIME_PEER_Z_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
  {
    key: "property.median_price_peer_relative_z",
    category: "property",
    label: "Peer-relative z-score on median sale price (vs k-NN peers)",
    unit: "z_score",
    direction: "neutral",
    source: PROPERTY_PRICE_PEER_Z_SOURCE,
    methodology_version: METHODOLOGY_VERSION,
  },
];

/** Keys that get normalized after derivation (national-within-country percentile,
    so /v1/areas can filter by min_percentile / max_percentile on them). */
export const DERIVED_NORMALIZE_KEYS = [
  "property.price_change_pct_yoy",
  "property.median_price_change_pct_6m",
  "property.transaction_count_change_pct_yoy",
  "property.transaction_count_trend_slope_24m",
  "property.median_price_peer_relative_z",
  "crime.total_12m_change_pct_yoy",
  "crime.total_6m_change_pct",
  "crime.monthly_count_trend_slope_24m",
  "crime.total_12m_peer_relative_z",
] as const;

/* ── pure SQL ── */

/** PURE: the YoY derivation. One statement, four CTEs:
      1. monthly_pairs: join median + count rows per (LSOA, month) -- need both
         to count-weight the annual.
      2. annual:        SUM(median * count) / SUM(count) per LSOA per year.
      3. ranked:        rank years per LSOA descending (rn=1 latest, rn=2 prior).
      4. yoy:           (latest - prior) / prior * 100 where both exist + prior > 0.
    Then INSERT … SELECT into signal_values with ON CONFLICT DO UPDATE.
    Returns the SQL string for exact unit testing.

    Exported so tests can assert the statement, and the orchestrator can run it. */
export function buildPropertyYoYSql(engineVersion: string = METHODOLOGY_VERSION): string {
  // engineVersion is interpolated as a SQL string literal (it's a constant from
  // our own code, not user input). Same pattern as the rest of refresh/*.
  const ev = engineVersion.replace(/'/g, "''");
  return `WITH monthly_pairs AS (
  SELECT mt.geo_code,
         substr(mt.observed_period, 1, 4) AS year,
         mt.raw_value AS median,
         ct.raw_value AS count
    FROM signal_timeseries mt
    JOIN signal_timeseries ct
      ON ct.geo_type = mt.geo_type
     AND ct.geo_code = mt.geo_code
     AND ct.signal_key = 'property.transaction_count'
     AND ct.observed_period = mt.observed_period
   WHERE mt.signal_key = 'property.median_price'
     AND mt.geo_type = 'lsoa'
     AND mt.observed_period ~ '^[0-9]{4}-[0-9]{2}$'
     AND mt.raw_value IS NOT NULL
     AND ct.raw_value IS NOT NULL AND ct.raw_value > 0
),
annual AS (
  SELECT geo_code, year,
         (SUM(median * count)::float8) / NULLIF(SUM(count), 0) AS annual_median
    FROM monthly_pairs
   GROUP BY geo_code, year
),
ranked AS (
  SELECT geo_code, year, annual_median,
         ROW_NUMBER() OVER (PARTITION BY geo_code ORDER BY year DESC) AS rn
    FROM annual
),
yoy AS (
  SELECT l.geo_code,
         l.year AS year_to,
         p.year AS year_from,
         l.annual_median AS latest_annual,
         p.annual_median AS prior_annual,
         ((l.annual_median - p.annual_median) / p.annual_median * 100.0) AS yoy_pct
    FROM ranked l
    JOIN ranked p ON p.geo_code = l.geo_code AND p.rn = 2
   WHERE l.rn = 1 AND p.annual_median > 0
)
INSERT INTO signal_values (
  signal_key, geo_type, geo_code,
  raw_value, raw_value_text, normalized_value, confidence, confidence_reason,
  source_snapshot_id, observed_period, engine_version
)
SELECT 'property.price_change_pct_yoy', 'lsoa', geo_code,
       ROUND(yoy_pct::numeric, 2), NULL, NULL,
       0.85,
       'Derived from property.median_price annual (count-weighted) over the two most recent years.',
       NULL,
       'YoY ' || year_from || ' -> ' || year_to,
       '${ev}'
  FROM yoy
ON CONFLICT (signal_key, geo_type, geo_code) DO UPDATE
   SET raw_value = EXCLUDED.raw_value,
       confidence = EXCLUDED.confidence,
       confidence_reason = EXCLUDED.confidence_reason,
       observed_period = EXCLUDED.observed_period,
       engine_version = EXCLUDED.engine_version,
       updated_at = NOW()`;
}

/* ── parameterized rolling-12-month sum YoY (Increment 3, AR-185) ──

   Generic over any monthly-sum signal in the time-series. Takes the latest
   24 months per LSOA (ranked DESC by observed_period), splits into two
   12-month windows, and computes (latest_sum - prior_sum) / prior_sum * 100.
   Emits only when BOTH windows have a full 12 months AND prior > 0.

   This is the DRY engine behind crime.total_12m_change_pct_yoy and
   property.transaction_count_change_pct_yoy. Adding the next rolling YoY
   signal is one DERIVED_SIGNALS entry + one runRollingSumYoY call. */

export interface RollingSumYoYSpec {
  /** Source signal_key in signal_timeseries (e.g. "crime.monthly_count"). */
  sourceKey: string;
  /** Output signal_key in signal_values (e.g. "crime.total_12m_change_pct_yoy"). */
  derivedKey: string;
  /** Human-readable provenance line stored on each emitted row. */
  confidenceReason: string;
  /** Engine version stamp. Defaults to METHODOLOGY_VERSION. */
  engineVersion?: string;
  /** Defensive lower bound for "prior" sum -- avoids divide-by-zero AND avoids
      computing wildly noisy YoY off tiny samples. Defaults to 0 (strictly > 0). */
  minPriorSum?: number;
}

/** PURE: build the parameterized rolling-12-month sum YoY SQL. CTEs:
      1. ranked:  per-LSOA rank of monthly rows by observed_period DESC.
      2. windows: latest_12m (rn 1..12) + prior_12m (rn 13..24) sums + period markers.
      3. yoy:     filter to LSOAs with FULL 12 months on both sides + prior > minPriorSum.
    Then INSERT ... SELECT into signal_values with ON CONFLICT DO UPDATE.
    Strings come from constants in our own code, not user input -- same pattern
    as buildPropertyYoYSql. */
export function buildRollingSumYoYSql(spec: RollingSumYoYSpec): string {
  const ev = (spec.engineVersion ?? METHODOLOGY_VERSION).replace(/'/g, "''");
  const sourceKey = spec.sourceKey.replace(/'/g, "''");
  const derivedKey = spec.derivedKey.replace(/'/g, "''");
  const reason = spec.confidenceReason.replace(/'/g, "''");
  const minPrior = Number.isFinite(spec.minPriorSum) ? Number(spec.minPriorSum) : 0;
  return `WITH ranked AS (
  SELECT geo_code, observed_period, raw_value,
         ROW_NUMBER() OVER (PARTITION BY geo_code ORDER BY observed_period DESC) AS rn
    FROM signal_timeseries
   WHERE signal_key = '${sourceKey}'
     AND geo_type = 'lsoa'
     AND observed_period ~ '^[0-9]{4}-[0-9]{2}$'
     AND raw_value IS NOT NULL
),
windows AS (
  SELECT geo_code,
         SUM(CASE WHEN rn BETWEEN 1 AND 12 THEN raw_value ELSE 0 END) AS latest_12m,
         SUM(CASE WHEN rn BETWEEN 13 AND 24 THEN raw_value ELSE 0 END) AS prior_12m,
         COUNT(*) FILTER (WHERE rn BETWEEN 1 AND 12) AS latest_months,
         COUNT(*) FILTER (WHERE rn BETWEEN 13 AND 24) AS prior_months,
         MIN(observed_period) FILTER (WHERE rn = 1) AS latest_period,
         MIN(observed_period) FILTER (WHERE rn = 12) AS latest_window_start,
         MIN(observed_period) FILTER (WHERE rn = 13) AS prior_window_end,
         MIN(observed_period) FILTER (WHERE rn = 24) AS prior_window_start
    FROM ranked
   GROUP BY geo_code
),
yoy AS (
  SELECT geo_code, latest_12m, prior_12m,
         latest_window_start, latest_period, prior_window_start, prior_window_end,
         ((latest_12m - prior_12m) / prior_12m * 100.0) AS yoy_pct
    FROM windows
   WHERE latest_months = 12 AND prior_months = 12 AND prior_12m > ${minPrior}
)
INSERT INTO signal_values (
  signal_key, geo_type, geo_code,
  raw_value, raw_value_text, normalized_value, confidence, confidence_reason,
  source_snapshot_id, observed_period, engine_version
)
SELECT '${derivedKey}', 'lsoa', geo_code,
       ROUND(yoy_pct::numeric, 2), NULL, NULL,
       0.85,
       '${reason}',
       NULL,
       'YoY ' || prior_window_start || '..' || prior_window_end || ' -> ' || latest_window_start || '..' || latest_period,
       '${ev}'
  FROM yoy
ON CONFLICT (signal_key, geo_type, geo_code) DO UPDATE
   SET raw_value = EXCLUDED.raw_value,
       confidence = EXCLUDED.confidence,
       confidence_reason = EXCLUDED.confidence_reason,
       observed_period = EXCLUDED.observed_period,
       engine_version = EXCLUDED.engine_version,
       updated_at = NOW()`;
}

/** The rolling-YoY specs shipped this increment. Adding a new rolling YoY is
    one entry here + one DERIVED_SIGNALS entry + the matching key in
    DERIVED_NORMALIZE_KEYS. */
export const ROLLING_YOY_SPECS: RollingSumYoYSpec[] = [
  {
    sourceKey: "crime.monthly_count",
    derivedKey: "crime.total_12m_change_pct_yoy",
    confidenceReason: "Derived from crime.monthly_count: trailing 12-month sum vs trailing 12-month sum 12 months prior.",
  },
  {
    sourceKey: "property.transaction_count",
    derivedKey: "property.transaction_count_change_pct_yoy",
    confidenceReason: "Derived from property.transaction_count: trailing 12-month sum vs trailing 12-month sum 12 months prior.",
  },
];

/* ── parameterized linear-regression trend slope (AR-186, ADR 0021) ──

   YoY answers a two-point question ("year-over-year"); trend slope answers
   the smoothed question ("what is the direction of this signal over the
   last N months?"). For any monthly-cadence signal in signal_timeseries we
   compute Postgres `regr_slope(y, x)` over the trailing windowMonths
   observations per LSOA. x is a synthetic month index (year*12 + month),
   so the slope's units are `raw_value-per-month`. HAVING COUNT(*) >=
   minObservations rejects sparse series (single outliers wreck a slope).

   Unlike rolling-YoY this can run on ANY monthly cadence signal -- it
   doesn't require an exact 24-month window, just at least minObservations
   data points inside the window. LSOAs with fewer points get no row. */

export interface RegrSlopeSpec {
  /** Source signal_key in signal_timeseries (e.g. "crime.monthly_count"). */
  sourceKey: string;
  /** Output signal_key in signal_values. */
  derivedKey: string;
  /** Trailing window size (months). 24 by default. */
  windowMonths?: number;
  /** Minimum observations required for a row (filters out sparse LSOAs). 12 by default. */
  minObservations?: number;
  /** Human-readable provenance line stored on each emitted row. */
  confidenceReason: string;
  /** Engine version stamp. Defaults to METHODOLOGY_VERSION. */
  engineVersion?: string;
}

/** PURE: build the parameterized regression-slope SQL. Strings are escaped + only
    interpolated for code-controlled values (signal keys, reason). x is computed
    from observed_period 'YYYY-MM' as year*12 + month (a synthetic integer index),
    so the slope's units are raw_value per month-step. */
export function buildRegrSlopeSql(spec: RegrSlopeSpec): string {
  const ev = (spec.engineVersion ?? METHODOLOGY_VERSION).replace(/'/g, "''");
  const sourceKey = spec.sourceKey.replace(/'/g, "''");
  const derivedKey = spec.derivedKey.replace(/'/g, "''");
  const reason = spec.confidenceReason.replace(/'/g, "''");
  const windowMonths = Number.isFinite(spec.windowMonths) && (spec.windowMonths ?? 0) > 0 ? Number(spec.windowMonths) : 24;
  const minObs = Number.isFinite(spec.minObservations) && (spec.minObservations ?? 0) > 0 ? Number(spec.minObservations) : 12;
  return `WITH ranked AS (
  SELECT geo_code, observed_period,
         raw_value::float8 AS y,
         (substr(observed_period, 1, 4)::int * 12 + substr(observed_period, 6, 2)::int)::float8 AS x,
         ROW_NUMBER() OVER (PARTITION BY geo_code ORDER BY observed_period DESC) AS rn
    FROM signal_timeseries
   WHERE signal_key = '${sourceKey}'
     AND geo_type = 'lsoa'
     AND observed_period ~ '^[0-9]{4}-[0-9]{2}$'
     AND raw_value IS NOT NULL
),
slope AS (
  SELECT geo_code,
         regr_slope(y, x) AS slope,
         COUNT(*)::int AS n,
         MIN(observed_period) AS window_start,
         MAX(observed_period) AS window_end
    FROM ranked
   WHERE rn <= ${windowMonths}
   GROUP BY geo_code
  HAVING COUNT(*) >= ${minObs}
     AND regr_slope(y, x) IS NOT NULL
)
INSERT INTO signal_values (
  signal_key, geo_type, geo_code,
  raw_value, raw_value_text, normalized_value, confidence, confidence_reason,
  source_snapshot_id, observed_period, engine_version
)
SELECT '${derivedKey}', 'lsoa', geo_code,
       ROUND(slope::numeric, 6), NULL, NULL,
       0.8,
       '${reason}',
       NULL,
       'slope ' || window_start || '..' || window_end || ' (n=' || n || ')',
       '${ev}'
  FROM slope
ON CONFLICT (signal_key, geo_type, geo_code) DO UPDATE
   SET raw_value = EXCLUDED.raw_value,
       confidence = EXCLUDED.confidence,
       confidence_reason = EXCLUDED.confidence_reason,
       observed_period = EXCLUDED.observed_period,
       engine_version = EXCLUDED.engine_version,
       updated_at = NOW()`;
}

/* ── parameterized N-month delta builders (AR-187, ADR 0022) ──

   Short-horizon momentum signals. Where YoY compares two 12-month windows,
   these compare two N-month windows. Same shape, more responsive: a 6-month
   delta picks up market / crime moves that haven't yet rotated into the
   trailing 12-month sum.

   Two flavors, mirroring the YoY pair:
     - buildCountWeightedMedianDeltaSql -- count-weighted median delta (use
       when raw_value is itself a median over a noisy small sample, e.g.
       property monthly LSOA medians). Mirrors buildPropertyYoYSql.
     - buildRollingSumDeltaSql -- rolling-sum delta (use when raw_value is
       a count to be summed, e.g. crime.monthly_count, transactions).
       Mirrors buildRollingSumYoYSql.

   Both clip to rows ranked 1..N (latest window) vs N+1..2N (prior window)
   per LSOA, require BOTH windows full + prior > 0, and INSERT with
   ON CONFLICT DO UPDATE for idempotency. */

export interface CountWeightedMedianDeltaSpec {
  /** Source signal_key holding the median (e.g. "property.median_price"). */
  sourceKeyValue: string;
  /** Source signal_key holding the count weight (e.g. "property.transaction_count"). */
  sourceKeyCount: string;
  /** Output signal_key in signal_values (e.g. "property.median_price_change_pct_6m"). */
  derivedKey: string;
  /** Window length in months. Default 6. */
  windowMonths?: number;
  /** Lower bound for the prior count-weighted median (avoid divide-by-zero / tiny samples). Default 0. */
  minPriorValue?: number;
  /** Human-readable provenance line stored on each emitted row. */
  confidenceReason: string;
  /** Engine version stamp. Defaults to METHODOLOGY_VERSION. */
  engineVersion?: string;
}

/** PURE: build the parameterized count-weighted N-month median-delta SQL.
    Mirrors buildPropertyYoYSql but with N-month windows (latest = ranked 1..N,
    prior = ranked N+1..2N) instead of calendar years. Count-weighted: each
    month's median is weighted by that month's transaction count, so a low-
    volume month doesn't dominate. */
export function buildCountWeightedMedianDeltaSql(spec: CountWeightedMedianDeltaSpec): string {
  const ev = (spec.engineVersion ?? METHODOLOGY_VERSION).replace(/'/g, "''");
  const sourceVal = spec.sourceKeyValue.replace(/'/g, "''");
  const sourceCnt = spec.sourceKeyCount.replace(/'/g, "''");
  const derivedKey = spec.derivedKey.replace(/'/g, "''");
  const reason = spec.confidenceReason.replace(/'/g, "''");
  const n = Number.isFinite(spec.windowMonths) && (spec.windowMonths ?? 0) > 0 ? Number(spec.windowMonths) : 6;
  const minPrior = Number.isFinite(spec.minPriorValue) ? Number(spec.minPriorValue) : 0;
  return `WITH monthly_pairs AS (
  SELECT mt.geo_code, mt.observed_period,
         mt.raw_value AS median,
         ct.raw_value AS count
    FROM signal_timeseries mt
    JOIN signal_timeseries ct
      ON ct.geo_type = mt.geo_type
     AND ct.geo_code = mt.geo_code
     AND ct.signal_key = '${sourceCnt}'
     AND ct.observed_period = mt.observed_period
   WHERE mt.signal_key = '${sourceVal}'
     AND mt.geo_type = 'lsoa'
     AND mt.observed_period ~ '^[0-9]{4}-[0-9]{2}$'
     AND mt.raw_value IS NOT NULL
     AND ct.raw_value IS NOT NULL AND ct.raw_value > 0
),
ranked AS (
  SELECT geo_code, observed_period, median, count,
         ROW_NUMBER() OVER (PARTITION BY geo_code ORDER BY observed_period DESC) AS rn
    FROM monthly_pairs
),
windows AS (
  SELECT geo_code,
         SUM(CASE WHEN rn BETWEEN 1 AND ${n} THEN median * count ELSE 0 END) AS latest_num,
         SUM(CASE WHEN rn BETWEEN 1 AND ${n} THEN count ELSE 0 END) AS latest_den,
         SUM(CASE WHEN rn BETWEEN ${n + 1} AND ${2 * n} THEN median * count ELSE 0 END) AS prior_num,
         SUM(CASE WHEN rn BETWEEN ${n + 1} AND ${2 * n} THEN count ELSE 0 END) AS prior_den,
         COUNT(*) FILTER (WHERE rn BETWEEN 1 AND ${n}) AS latest_months,
         COUNT(*) FILTER (WHERE rn BETWEEN ${n + 1} AND ${2 * n}) AS prior_months,
         MIN(observed_period) FILTER (WHERE rn = 1) AS latest_period,
         MIN(observed_period) FILTER (WHERE rn = ${n}) AS latest_window_start,
         MIN(observed_period) FILTER (WHERE rn = ${n + 1}) AS prior_window_end,
         MIN(observed_period) FILTER (WHERE rn = ${2 * n}) AS prior_window_start
    FROM ranked
   GROUP BY geo_code
),
delta AS (
  SELECT geo_code,
         (latest_num::float8 / NULLIF(latest_den, 0)) AS latest_wmedian,
         (prior_num::float8 / NULLIF(prior_den, 0)) AS prior_wmedian,
         latest_window_start, latest_period, prior_window_start, prior_window_end
    FROM windows
   WHERE latest_months = ${n} AND prior_months = ${n}
     AND latest_den > 0 AND prior_den > 0
),
delta_pct AS (
  SELECT geo_code,
         ((latest_wmedian - prior_wmedian) / prior_wmedian * 100.0) AS pct,
         latest_window_start, latest_period, prior_window_start, prior_window_end
    FROM delta
   WHERE prior_wmedian > ${minPrior}
)
INSERT INTO signal_values (
  signal_key, geo_type, geo_code,
  raw_value, raw_value_text, normalized_value, confidence, confidence_reason,
  source_snapshot_id, observed_period, engine_version
)
SELECT '${derivedKey}', 'lsoa', geo_code,
       ROUND(pct::numeric, 2), NULL, NULL,
       0.85,
       '${reason}',
       NULL,
       '${n}m ' || prior_window_start || '..' || prior_window_end || ' -> ' || latest_window_start || '..' || latest_period,
       '${ev}'
  FROM delta_pct
ON CONFLICT (signal_key, geo_type, geo_code) DO UPDATE
   SET raw_value = EXCLUDED.raw_value,
       confidence = EXCLUDED.confidence,
       confidence_reason = EXCLUDED.confidence_reason,
       observed_period = EXCLUDED.observed_period,
       engine_version = EXCLUDED.engine_version,
       updated_at = NOW()`;
}

export interface RollingSumDeltaSpec {
  /** Source signal_key in signal_timeseries (e.g. "crime.monthly_count"). */
  sourceKey: string;
  /** Output signal_key in signal_values (e.g. "crime.total_6m_change_pct"). */
  derivedKey: string;
  /** Window length in months. Default 6. */
  windowMonths?: number;
  /** Lower bound for the prior N-month sum. Default 0. */
  minPriorSum?: number;
  /** Human-readable provenance line stored on each emitted row. */
  confidenceReason: string;
  /** Engine version stamp. Defaults to METHODOLOGY_VERSION. */
  engineVersion?: string;
}

/** PURE: build the parameterized N-month rolling-sum delta SQL. Like
    buildRollingSumYoYSql but with configurable window length: latest = ranked
    1..N, prior = ranked N+1..2N. */
export function buildRollingSumDeltaSql(spec: RollingSumDeltaSpec): string {
  const ev = (spec.engineVersion ?? METHODOLOGY_VERSION).replace(/'/g, "''");
  const sourceKey = spec.sourceKey.replace(/'/g, "''");
  const derivedKey = spec.derivedKey.replace(/'/g, "''");
  const reason = spec.confidenceReason.replace(/'/g, "''");
  const n = Number.isFinite(spec.windowMonths) && (spec.windowMonths ?? 0) > 0 ? Number(spec.windowMonths) : 6;
  const minPrior = Number.isFinite(spec.minPriorSum) ? Number(spec.minPriorSum) : 0;
  return `WITH ranked AS (
  SELECT geo_code, observed_period, raw_value,
         ROW_NUMBER() OVER (PARTITION BY geo_code ORDER BY observed_period DESC) AS rn
    FROM signal_timeseries
   WHERE signal_key = '${sourceKey}'
     AND geo_type = 'lsoa'
     AND observed_period ~ '^[0-9]{4}-[0-9]{2}$'
     AND raw_value IS NOT NULL
),
windows AS (
  SELECT geo_code,
         SUM(CASE WHEN rn BETWEEN 1 AND ${n} THEN raw_value ELSE 0 END) AS latest_sum,
         SUM(CASE WHEN rn BETWEEN ${n + 1} AND ${2 * n} THEN raw_value ELSE 0 END) AS prior_sum,
         COUNT(*) FILTER (WHERE rn BETWEEN 1 AND ${n}) AS latest_months,
         COUNT(*) FILTER (WHERE rn BETWEEN ${n + 1} AND ${2 * n}) AS prior_months,
         MIN(observed_period) FILTER (WHERE rn = 1) AS latest_period,
         MIN(observed_period) FILTER (WHERE rn = ${n}) AS latest_window_start,
         MIN(observed_period) FILTER (WHERE rn = ${n + 1}) AS prior_window_end,
         MIN(observed_period) FILTER (WHERE rn = ${2 * n}) AS prior_window_start
    FROM ranked
   GROUP BY geo_code
),
delta AS (
  SELECT geo_code, latest_sum, prior_sum,
         latest_window_start, latest_period, prior_window_start, prior_window_end,
         ((latest_sum - prior_sum) / prior_sum * 100.0) AS pct
    FROM windows
   WHERE latest_months = ${n} AND prior_months = ${n} AND prior_sum > ${minPrior}
)
INSERT INTO signal_values (
  signal_key, geo_type, geo_code,
  raw_value, raw_value_text, normalized_value, confidence, confidence_reason,
  source_snapshot_id, observed_period, engine_version
)
SELECT '${derivedKey}', 'lsoa', geo_code,
       ROUND(pct::numeric, 2), NULL, NULL,
       0.85,
       '${reason}',
       NULL,
       '${n}m ' || prior_window_start || '..' || prior_window_end || ' -> ' || latest_window_start || '..' || latest_period,
       '${ev}'
  FROM delta
ON CONFLICT (signal_key, geo_type, geo_code) DO UPDATE
   SET raw_value = EXCLUDED.raw_value,
       confidence = EXCLUDED.confidence,
       confidence_reason = EXCLUDED.confidence_reason,
       observed_period = EXCLUDED.observed_period,
       engine_version = EXCLUDED.engine_version,
       updated_at = NOW()`;
}

/** N-month count-weighted-median-delta specs shipped this increment. */
export const COUNT_WEIGHTED_DELTA_SPECS: CountWeightedMedianDeltaSpec[] = [
  {
    sourceKeyValue: "property.median_price",
    sourceKeyCount: "property.transaction_count",
    derivedKey: "property.median_price_change_pct_6m",
    windowMonths: 6,
    confidenceReason: "Derived from property.median_price (count-weighted by property.transaction_count): latest 6-month count-weighted median vs prior 6-month.",
  },
];

/** N-month rolling-sum-delta specs shipped this increment. */
export const ROLLING_SUM_DELTA_SPECS: RollingSumDeltaSpec[] = [
  {
    sourceKey: "crime.monthly_count",
    derivedKey: "crime.total_6m_change_pct",
    windowMonths: 6,
    confidenceReason: "Derived from crime.monthly_count: latest 6-month sum vs prior 6-month sum.",
  },
];

/* ── parameterized peer-relative z-score (AR-189, ADR 0024) ──

   For each LSOA, computes a z-score on a target signal relative to its k
   nearest neighbours (the `peer_assignments` materialization). Uses the
   normalized_value of the target signal so the units are comparable across
   signals; z stays signed (negative = below peer mean; positive = above)
   so consumers can rank by ABS(z) for anomaly screening (/v1/insights) or
   filter by sign for direction.

       z = (target_norm - peer_avg) / peer_stddev_samp

   Defensive: NULLIF(stddev, 0) avoids div-by-zero when all peers are
   identical; the HAVING n_peers >= minPeers guard ensures the stddev is
   meaningful. */

export interface PeerRelativeZSpec {
  /** Source signal in signal_values (e.g. "crime.total_12m"). Must have
      normalized_value populated for both targets and their peers. */
  sourceSignalKey: string;
  /** Output signal in signal_values (e.g. "crime.total_12m_peer_relative_z"). */
  derivedKey: string;
  /** Minimum peers required to emit a row (default 5, so the stddev is meaningful). */
  minPeers?: number;
  /** Human-readable provenance line stored on each emitted row. */
  confidenceReason: string;
  /** Engine version stamp. Defaults to METHODOLOGY_VERSION. */
  engineVersion?: string;
}

/** PURE: build the peer-relative z-score SQL. Joins peer_assignments to find
    each target's peer set, JOINs signal_values to get peers' normalized
    values, computes AVG + STDDEV_SAMP per target, then joins back to the
    target's own normalized value to compute z. Idempotent INSERT ON CONFLICT
    DO UPDATE. */
export function buildPeerRelativeZSql(spec: PeerRelativeZSpec): string {
  const ev = (spec.engineVersion ?? METHODOLOGY_VERSION).replace(/'/g, "''");
  const sourceKey = spec.sourceSignalKey.replace(/'/g, "''");
  const derivedKey = spec.derivedKey.replace(/'/g, "''");
  const reason = spec.confidenceReason.replace(/'/g, "''");
  const minPeers = Number.isFinite(spec.minPeers) && (spec.minPeers ?? 0) > 0 ? Number(spec.minPeers) : 5;

  return `WITH target_norm AS (
  SELECT geo_code, normalized_value AS target_value
    FROM signal_values
   WHERE signal_key = '${sourceKey}'
     AND geo_type = 'lsoa'
     AND normalized_value IS NOT NULL
),
peer_stats AS (
  SELECT pa.geo_code AS target_code,
         AVG(psv.normalized_value)::float8 AS peer_avg,
         STDDEV_SAMP(psv.normalized_value)::float8 AS peer_stddev,
         COUNT(psv.normalized_value)::int AS n_peers
    FROM peer_assignments pa
    JOIN signal_values psv
      ON psv.geo_type = pa.geo_type
     AND psv.geo_code = pa.peer_geo_code
     AND psv.signal_key = '${sourceKey}'
     AND psv.normalized_value IS NOT NULL
   WHERE pa.geo_type = 'lsoa'
   GROUP BY pa.geo_code
  HAVING COUNT(psv.normalized_value) >= ${minPeers}
),
z AS (
  SELECT ps.target_code AS geo_code,
         tn.target_value,
         ps.peer_avg,
         ps.peer_stddev,
         ps.n_peers,
         ((tn.target_value - ps.peer_avg) / NULLIF(ps.peer_stddev, 0))::float8 AS z_score
    FROM peer_stats ps
    JOIN target_norm tn ON tn.geo_code = ps.target_code
   WHERE ps.peer_stddev > 0
)
INSERT INTO signal_values (
  signal_key, geo_type, geo_code,
  raw_value, raw_value_text, normalized_value, confidence, confidence_reason,
  source_snapshot_id, observed_period, engine_version
)
SELECT '${derivedKey}', 'lsoa', geo_code,
       ROUND(z_score::numeric, 4), NULL, NULL,
       0.80,
       '${reason}',
       NULL,
       'peer-relative z over ' || n_peers || ' peers',
       '${ev}'
  FROM z
ON CONFLICT (signal_key, geo_type, geo_code) DO UPDATE
   SET raw_value = EXCLUDED.raw_value,
       confidence = EXCLUDED.confidence,
       confidence_reason = EXCLUDED.confidence_reason,
       observed_period = EXCLUDED.observed_period,
       engine_version = EXCLUDED.engine_version,
       updated_at = NOW()`;
}

/** Peer-relative z specs shipped this increment. */
export const PEER_RELATIVE_Z_SPECS: PeerRelativeZSpec[] = [
  {
    sourceSignalKey: "crime.total_12m",
    derivedKey: "crime.total_12m_peer_relative_z",
    confidenceReason: "Peer-relative z-score: target's normalized crime.total_12m vs the mean+stddev of its k-NN peers' normalized crime.total_12m.",
  },
  {
    sourceSignalKey: "property.median_price",
    derivedKey: "property.median_price_peer_relative_z",
    confidenceReason: "Peer-relative z-score: target's normalized property.median_price vs the mean+stddev of its k-NN peers' normalized property.median_price.",
  },
];

/** Trend-slope specs shipped this increment. Adding the next trend slope is
    one entry here + one DERIVED_SIGNALS row + one DERIVED_NORMALIZE_KEYS line
    + one SUPPORTED_SIGNALS line in the planner. */
export const TREND_SLOPE_SPECS: RegrSlopeSpec[] = [
  {
    sourceKey: "crime.monthly_count",
    derivedKey: "crime.monthly_count_trend_slope_24m",
    windowMonths: 24,
    minObservations: 18,
    confidenceReason: "Derived from crime.monthly_count: linear-regression slope over the trailing 24 months (units: crimes/month/month).",
  },
  {
    sourceKey: "property.transaction_count",
    derivedKey: "property.transaction_count_trend_slope_24m",
    windowMonths: 24,
    minObservations: 18,
    confidenceReason: "Derived from property.transaction_count: linear-regression slope over the trailing 24 months (units: transactions/month/month).",
  },
];

/* ── orchestration ── */

export interface DerivationSummary {
  catalog: number;
  derivedSignals: string[];
  totals: Record<string, { before: number; after: number; appended: number }>;
  /** Compat with prior single-signal callers: counts for property.price_change_pct_yoy. */
  rowsBefore: number;
  rowsAfter: number;
  appended: number;
}

/** Derive every supported signal from the time-series. WRITE-ONLY: does NOT
    normalize (run `normalize:signals` as a separate step). This separation
    makes a transient HTTP timeout in normalize unable to fail the underlying
    data write. Idempotent: re-running recomputes each derivation in place. */
export async function runDerivations(run: QueryRunner = runDefault): Promise<DerivationSummary> {
  const countKey = async (key: string): Promise<number> => {
    const rows = (await run(`SELECT count(*)::int AS n FROM signal_values WHERE signal_key='${key.replace(/'/g, "''")}'`, [])) as { n?: number }[];
    return Number(rows[0]?.n ?? 0);
  };

  const catalog = await upsertSignalCatalog(DERIVED_SIGNALS, run);

  const totals: Record<string, { before: number; after: number; appended: number }> = {};

  // Existing count-weighted-annual YoY on property prices (kept verbatim).
  const propertyKey = "property.price_change_pct_yoy";
  const propertyBefore = await countKey(propertyKey);
  await run(buildPropertyYoYSql(), []);
  const propertyAfter = await countKey(propertyKey);
  totals[propertyKey] = { before: propertyBefore, after: propertyAfter, appended: propertyAfter - propertyBefore };

  // New rolling-12-month sum YoY derivations.
  for (const spec of ROLLING_YOY_SPECS) {
    const before = await countKey(spec.derivedKey);
    await run(buildRollingSumYoYSql(spec), []);
    const after = await countKey(spec.derivedKey);
    totals[spec.derivedKey] = { before, after, appended: after - before };
  }

  // Trend-slope derivations (regr_slope over the trailing windowMonths).
  for (const spec of TREND_SLOPE_SPECS) {
    const before = await countKey(spec.derivedKey);
    await run(buildRegrSlopeSql(spec), []);
    const after = await countKey(spec.derivedKey);
    totals[spec.derivedKey] = { before, after, appended: after - before };
  }

  // Short-horizon (N-month) count-weighted-median deltas (e.g. property 6m).
  for (const spec of COUNT_WEIGHTED_DELTA_SPECS) {
    const before = await countKey(spec.derivedKey);
    await run(buildCountWeightedMedianDeltaSql(spec), []);
    const after = await countKey(spec.derivedKey);
    totals[spec.derivedKey] = { before, after, appended: after - before };
  }

  // Short-horizon (N-month) rolling-sum deltas (e.g. crime 6m).
  for (const spec of ROLLING_SUM_DELTA_SPECS) {
    const before = await countKey(spec.derivedKey);
    await run(buildRollingSumDeltaSql(spec), []);
    const after = await countKey(spec.derivedKey);
    totals[spec.derivedKey] = { before, after, appended: after - before };
  }

  // Peer-relative z-scores (depend on peer_assignments + normalized_value;
  // run AFTER refresh:peers and AFTER normalize:signals — the cron orders
  // these explicitly; ad-hoc runs require peer_assignments to be populated).
  for (const spec of PEER_RELATIVE_Z_SPECS) {
    const before = await countKey(spec.derivedKey);
    await run(buildPeerRelativeZSql(spec), []);
    const after = await countKey(spec.derivedKey);
    totals[spec.derivedKey] = { before, after, appended: after - before };
  }

  return {
    catalog,
    derivedSignals: [...DERIVED_NORMALIZE_KEYS],
    totals,
    // Back-compat scalars (the original single-derivation contract).
    rowsBefore: propertyBefore,
    rowsAfter: propertyAfter,
    appended: propertyAfter - propertyBefore,
  };
}

/* CLI:  npm run derive:signals -w @onegoodarea/api  (run after refresh:prices) */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("derive.ts"));
if (invokedDirectly) {
  runDerivations()
    .then((s) => {
      logger.info(`[derive] catalog: ${s.catalog} signals; ${s.derivedSignals.length} derived signals normalized; ${s.rowsAfter} total YoY rows (+${s.appended} new)`);
      console.log(`[derive] catalog=${s.catalog} signals derived=${s.derivedSignals.join(",")} rows=${s.rowsAfter} (+${s.appended} new)`);
      process.exit(0);
    })
    .catch((err) => { console.error("[derive] failed:", err); process.exit(1); });
}
