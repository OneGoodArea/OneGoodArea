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
import { METHODOLOGY_VERSION } from "../../reports/methodology";
import { logger } from "../../tracking/structured-logger";
import {
  upsertSignalCatalog,
  type QueryRunner,
  type SignalCatalogRow,
} from "./store-writer";

const runDefault: QueryRunner = (text, params) => defaultQuery(text, params);

/* ── catalog (one entry per derived signal so it's discoverable + countable) ── */

const PROPERTY_YOY_SOURCE = "HM Land Registry Price Paid Data (derived: YoY)";

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
];

/** Keys that get normalized after derivation (national-within-country percentile,
    so /v1/areas can filter by min_percentile / max_percentile on them). */
export const DERIVED_NORMALIZE_KEYS = ["property.price_change_pct_yoy"] as const;

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

/* ── orchestration ── */

export interface DerivationSummary {
  catalog: number;
  derivedSignals: string[];
  rowsBefore: number;
  rowsAfter: number;
  appended: number;
}

/** Derive `property.price_change_pct_yoy` from the time-series. WRITE-ONLY:
    does NOT normalize (run `normalize:signals` as a separate step). This
    separation makes a transient HTTP timeout in normalize unable to fail the
    underlying data write. Idempotent: re-running recomputes in place. */
export async function runDerivations(run: QueryRunner = runDefault): Promise<DerivationSummary> {
  const countYoY = async (): Promise<number> => {
    const rows = (await run(`SELECT count(*)::int AS n FROM signal_values WHERE signal_key='property.price_change_pct_yoy'`, [])) as { n?: number }[];
    return Number(rows[0]?.n ?? 0);
  };

  const catalog = await upsertSignalCatalog(DERIVED_SIGNALS, run);

  const rowsBefore = await countYoY();
  await run(buildPropertyYoYSql(), []);
  const rowsAfter = await countYoY();

  return {
    catalog,
    derivedSignals: [...DERIVED_NORMALIZE_KEYS],
    rowsBefore,
    rowsAfter,
    appended: rowsAfter - rowsBefore,
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
