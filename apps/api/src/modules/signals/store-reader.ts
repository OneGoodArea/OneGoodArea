/* modules/signals/store-reader — serve signals FROM the persisted store.

   The read half of the fetch-on-read → serve-from-store shift. For now it reads
   deprivation (the first source refreshed into the store) and reconstructs the
   SAME DeprivationData struct the live fetcher returns, so buildAreaProfile is
   unchanged and a store-served signal is byte-identical to a live-served one.

   Boundary-version note: deprivation is keyed by the source's own LSOA codes
   (England LSOA21CD = the same code geo.lsoa carries, so England matches; Wales
   WIMD-2019 + Scotland SIMD-2020 use 2011 codes, which won't match the 2021
   geo.lsoa, so those naturally fall back to live until the ONS geo spine
   normalizes boundaries). See ADR 0004. */

import { query as defaultQuery } from "../../infrastructure/db/client";
import type { DeprivationData, PropertyPriceData, CrimeSummary } from "./inputs";

/** Parameterized read runner ($1, $2, …). Injected in tests. */
export type Reader = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

const runDefault: Reader = (text, params) => defaultQuery(text, params);

/** Read deprivation for an LSOA from the store, or null if not present (caller
    falls back to a live fetch). Requires BOTH rank and decile to be stored;
    otherwise treats it as a miss so we never serve a partial struct. */
export async function readDeprivationFromStore(
  geoCode: string,
  run: Reader = runDefault,
): Promise<DeprivationData | null> {
  if (!geoCode) return null;

  const rows = await run(
    `SELECT signal_key, raw_value
       FROM signal_values
      WHERE geo_type = 'lsoa' AND geo_code = $1
        AND signal_key IN ('deprivation.imd_rank', 'deprivation.imd_decile')`,
    [geoCode],
  );

  let rank: number | null = null;
  let decile: number | null = null;
  for (const r of rows) {
    const v = r.raw_value;
    if (v === null || v === undefined) continue;
    if (r.signal_key === "deprivation.imd_rank") rank = Number(v);
    else if (r.signal_key === "deprivation.imd_decile") decile = Number(v);
  }
  if (rank === null || Number.isNaN(rank) || decile === null || Number.isNaN(decile)) {
    return null;
  }

  // lsoa_code must be the real code (its prefix drives the source label in
  // buildAreaProfile); name/LA aren't used by the signal mapping.
  return { lsoa_code: geoCode, lsoa_name: "", local_authority: "", imd_rank: rank, imd_decile: decile };
}

/** Per-signal normalization (normalized_value 0-1 + national percentile 0-100)
    for the deprivation signals at an LSOA, keyed by signal_key. Used to enrich
    the served Signals when deprivation is store-backed. Empty when absent. */
export async function readDeprivationNormalization(
  geoCode: string,
  run: Reader = runDefault,
): Promise<Record<string, { normalized_value: number | null; percentile: number | null }>> {
  if (!geoCode) return {};

  const rows = await run(
    `SELECT sv.signal_key, sv.normalized_value, sp.percentile
       FROM signal_values sv
       LEFT JOIN signal_percentiles sp
         ON sp.signal_key = sv.signal_key AND sp.geo_type = sv.geo_type
        AND sp.geo_code = sv.geo_code AND sp.scope = 'national'
      WHERE sv.geo_type = 'lsoa' AND sv.geo_code = $1
        AND sv.signal_key IN ('deprivation.imd_rank', 'deprivation.imd_decile')`,
    [geoCode],
  );

  const out: Record<string, { normalized_value: number | null; percentile: number | null }> = {};
  for (const r of rows) {
    const key = r.signal_key as string;
    out[key] = {
      normalized_value: r.normalized_value === null || r.normalized_value === undefined ? null : Number(r.normalized_value),
      percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
    };
  }
  return out;
}

/* ── property (HM Land Registry prices) ──

   The store holds an LSOA-grained window median (the robust "current" figure,
   from refresh/prices.ts) — a DIFFERENT, finer grain than the live fetcher's
   postcode-district median. price_change_pct (YoY) is computed from the monthly
   time-series when two years of history are present (ADR 0014); null otherwise
   (the engine's price-trend reasoning is simply skipped). See ADR 0012 + 0014. */

/** PURE: year-over-year price change from the monthly time-series.

    Groups the monthly (median, count) points by calendar year, forms a
    transaction-count-weighted annual figure per year, and compares the two most
    recent years. Weighting by volume keeps a low-sale month from dominating.
    Returns nulls when there is fewer than two years of data or the prior year is
    non-positive. */
export function computeYoY(
  points: ReadonlyArray<{ signal_key: string; observed_period: string; raw_value: number | null }>,
): { price_change_pct: number | null; prior_median: number | null } {
  const byPeriod = new Map<string, { median?: number; count?: number }>();
  for (const p of points) {
    if (p.raw_value === null || p.raw_value === undefined) continue;
    const e = byPeriod.get(p.observed_period) ?? {};
    if (p.signal_key === "property.median_price") e.median = Number(p.raw_value);
    else if (p.signal_key === "property.transaction_count") e.count = Number(p.raw_value);
    byPeriod.set(p.observed_period, e);
  }

  const byYear = new Map<string, { wsum: number; csum: number }>();
  for (const [period, e] of byPeriod) {
    if (e.median === undefined || !e.count) continue; // need both, count>0
    const year = period.slice(0, 4);
    const agg = byYear.get(year) ?? { wsum: 0, csum: 0 };
    agg.wsum += e.median * e.count;
    agg.csum += e.count;
    byYear.set(year, agg);
  }

  const years = [...byYear.keys()].sort().reverse();
  if (years.length < 2) return { price_change_pct: null, prior_median: null };
  const latest = byYear.get(years[0]!)!;
  const prior = byYear.get(years[1]!)!;
  if (latest.csum === 0 || prior.csum === 0) return { price_change_pct: null, prior_median: null };

  const annualLatest = latest.wsum / latest.csum;
  const annualPrior = prior.wsum / prior.csum;
  if (annualPrior <= 0) return { price_change_pct: null, prior_median: null };

  const pct = ((annualLatest - annualPrior) / annualPrior) * 100;
  return { price_change_pct: Math.round(pct * 100) / 100, prior_median: Math.round(annualPrior) };
}

/** Read property prices for an LSOA from the store, or null if absent / no
    usable median (caller falls back to a live fetch). Reconstructs the
    PropertyPriceData fields the mapper + scoring engine actually read
    (median_price, transaction_count, postcode_area, period, price_change_pct,
    prior_median); the unused fields get safe fills. YoY comes from the monthly
    time-series (computeYoY) when two years are present. */
export async function readPropertyFromStore(
  geoCode: string,
  run: Reader = runDefault,
): Promise<PropertyPriceData | null> {
  if (!geoCode) return null;

  const rows = await run(
    `SELECT signal_key, raw_value, observed_period
       FROM signal_values
      WHERE geo_type = 'lsoa' AND geo_code = $1
        AND signal_key IN ('property.median_price', 'property.transaction_count')`,
    [geoCode],
  );

  let median: number | null = null;
  let count: number | null = null;
  let period = "Latest available";
  for (const r of rows) {
    const v = r.raw_value;
    if (r.signal_key === "property.median_price") {
      if (v !== null && v !== undefined) median = Number(v);
      if (typeof r.observed_period === "string" && r.observed_period) period = r.observed_period;
    } else if (r.signal_key === "property.transaction_count") {
      if (v !== null && v !== undefined) count = Number(v);
    }
  }
  if (median === null || Number.isNaN(median) || median <= 0) return null;

  // YoY from the monthly history (two years needed; null otherwise).
  const tsRows = await run(
    `SELECT signal_key, observed_period, raw_value
       FROM signal_timeseries
      WHERE geo_type = 'lsoa' AND geo_code = $1
        AND signal_key IN ('property.median_price', 'property.transaction_count')
        AND observed_period ~ '^[0-9]{4}-[0-9]{2}$'`,
    [geoCode],
  );
  const { price_change_pct, prior_median } = computeYoY(
    tsRows.map((r) => ({
      signal_key: r.signal_key as string,
      observed_period: r.observed_period as string,
      raw_value: r.raw_value === null || r.raw_value === undefined ? null : Number(r.raw_value),
    })),
  );

  const txns = count === null || Number.isNaN(count) ? 0 : count;
  return {
    postcode_area: geoCode, // the LSOA — only used in human-readable reasoning
    median_price: median,
    mean_price: median, // not read by the mapper/engine; safe fill
    transaction_count: txns,
    price_change_pct,
    by_property_type: [],
    tenure_split: { freehold: 0, leasehold: 0 },
    price_range: { min: median, max: median },
    period,
    prior_median,
  };
}

/** Normalization (normalized_value + national percentile) for the store-backed
    property signals at an LSOA, keyed by signal_key. Only median_price is
    normalized. Empty when absent. */
export async function readPropertyNormalization(
  geoCode: string,
  run: Reader = runDefault,
): Promise<Record<string, { normalized_value: number | null; percentile: number | null }>> {
  if (!geoCode) return {};

  const rows = await run(
    `SELECT sv.signal_key, sv.normalized_value, sp.percentile
       FROM signal_values sv
       LEFT JOIN signal_percentiles sp
         ON sp.signal_key = sv.signal_key AND sp.geo_type = sv.geo_type
        AND sp.geo_code = sv.geo_code AND sp.scope = 'national'
      WHERE sv.geo_type = 'lsoa' AND sv.geo_code = $1
        AND sv.signal_key = 'property.median_price'`,
    [geoCode],
  );

  const out: Record<string, { normalized_value: number | null; percentile: number | null }> = {};
  for (const r of rows) {
    const key = r.signal_key as string;
    out[key] = {
      normalized_value: r.normalized_value === null || r.normalized_value === undefined ? null : Number(r.normalized_value),
      percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
    };
  }
  return out;
}

/* ── crime (police.uk) ──

   Reconstructs the CrimeSummary the mapper + scoring engine read from the store
   (refresh/crime.ts): total_crimes from signal_values + the real monthly_trend
   from the crime.monthly_count time-series (trailing 12). by_category is
   reconstructed from a stored violent count (crime.violent_12m) IF present;
   until a refresh populates that it is empty, which costs the engine only the
   bounded violent-crime adjustment (the dominant monthly-rate + trend terms are
   exact). top_streets / outcome_breakdown are not stored. See ADR 0016. */

/** Read crime for an LSOA from the store, or null if absent (caller falls back
    to a live fetch). */
export async function readCrimeFromStore(
  geoCode: string,
  run: Reader = runDefault,
): Promise<CrimeSummary | null> {
  if (!geoCode) return null;

  const valueRows = await run(
    `SELECT signal_key, raw_value
       FROM signal_values
      WHERE geo_type = 'lsoa' AND geo_code = $1
        AND signal_key IN ('crime.total_12m', 'crime.violent_12m')`,
    [geoCode],
  );
  let total: number | null = null;
  let violent = 0;
  for (const r of valueRows) {
    const v = r.raw_value;
    if (v === null || v === undefined) continue;
    if (r.signal_key === "crime.total_12m") total = Number(v);
    else if (r.signal_key === "crime.violent_12m") violent = Number(v);
  }
  if (total === null || Number.isNaN(total)) return null;

  // Real monthly trend from the time-series (trailing 12 months, ascending).
  const tsRows = await run(
    `SELECT observed_period, raw_value
       FROM signal_timeseries
      WHERE geo_type = 'lsoa' AND geo_code = $1 AND signal_key = 'crime.monthly_count'
      ORDER BY observed_period DESC
      LIMIT 12`,
    [geoCode],
  );
  const monthly_trend = tsRows
    .map((r) => ({ month: r.observed_period as string, count: r.raw_value === null || r.raw_value === undefined ? 0 : Number(r.raw_value) }))
    .reverse(); // back to ascending (oldest -> newest) for the engine's first/last trend

  const by_category: Record<string, number> = violent > 0 ? { "Violence and sexual offences": violent } : {};

  return {
    total_crimes: total,
    months_covered: monthly_trend.length,
    by_category,
    top_streets: [],
    outcome_breakdown: {},
    monthly_trend,
  };
}

/** Normalization for the store-backed crime signals at an LSOA (only
    crime.total_12m is normalized). Empty when absent. */
export async function readCrimeNormalization(
  geoCode: string,
  run: Reader = runDefault,
): Promise<Record<string, { normalized_value: number | null; percentile: number | null }>> {
  if (!geoCode) return {};

  const rows = await run(
    `SELECT sv.signal_key, sv.normalized_value, sp.percentile
       FROM signal_values sv
       LEFT JOIN signal_percentiles sp
         ON sp.signal_key = sv.signal_key AND sp.geo_type = sv.geo_type
        AND sp.geo_code = sv.geo_code AND sp.scope = 'national'
      WHERE sv.geo_type = 'lsoa' AND sv.geo_code = $1
        AND sv.signal_key = 'crime.total_12m'`,
    [geoCode],
  );

  const out: Record<string, { normalized_value: number | null; percentile: number | null }> = {};
  for (const r of rows) {
    const key = r.signal_key as string;
    out[key] = {
      normalized_value: r.normalized_value === null || r.normalized_value === undefined ? null : Number(r.normalized_value),
      percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
    };
  }
  return out;
}
