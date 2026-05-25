/* Cross-area query — the data-infrastructure differentiator.

   "Find the LSOAs (optionally within a country/LAD) where signal X is in the
   bottom decile / above a threshold, ranked." This is what the store unlocks and
   the live-fetch path never could (it answers one area at a time). Reads
   signal_values + signal_percentiles; an optional LAD scope joins geo_lookup
   (the ONS spine). See ADR 0007.

   Country is scoped by the LSOA code PREFIX (E/W/S), which is robust and does
   not depend on the geo_entities.country column (which currently holds a mix of
   names from the deprivation refresh and codes from the NSPL load — a separate
   cleanup). */

import { query as defaultQuery } from "../../infrastructure/db/client";

export type Country = "England" | "Wales" | "Scotland";
const COUNTRY_PREFIX: Record<Country, string> = { England: "E", Wales: "W", Scotland: "S" };
export function isCountry(v: unknown): v is Country {
  return v === "England" || v === "Wales" || v === "Scotland";
}

export type AreasSort = "percentile" | "percentile_desc" | "value" | "value_desc";
const SORT_SQL: Record<AreasSort, string> = {
  percentile: "sp.percentile ASC NULLS LAST",
  percentile_desc: "sp.percentile DESC NULLS LAST",
  value: "sv.raw_value ASC NULLS LAST",
  value_desc: "sv.raw_value DESC NULLS LAST",
};

export const AREAS_LIMIT_DEFAULT = 100;
export const AREAS_LIMIT_MAX = 1000;

export interface AreasQuery {
  signal: string;
  country?: Country;
  lad?: string;
  maxPercentile?: number;
  minPercentile?: number;
  minValue?: number;
  maxValue?: number;
  sort: AreasSort;
  limit: number;
}

export type Runner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
const runDefault: Runner = (text, params) => defaultQuery(text, params);

/** PURE: validate + coerce raw query-string params into an AreasQuery, or return
    an error string. Keeps the endpoint thin and the rules unit-testable. */
export function parseAreasQuery(raw: Record<string, unknown>): { ok: true; query: AreasQuery } | { ok: false; error: string } {
  const signal = typeof raw.signal === "string" ? raw.signal.trim() : "";
  if (!signal) return { ok: false, error: "Missing required ?signal= (a signal key, e.g. deprivation.imd_decile)." };

  let country: Country | undefined;
  if (raw.country !== undefined) {
    if (!isCountry(raw.country)) return { ok: false, error: "country must be one of: England, Wales, Scotland." };
    country = raw.country;
  }

  const lad = typeof raw.lad === "string" && raw.lad.trim() ? raw.lad.trim() : undefined;

  const pct = (v: unknown, name: string): number | undefined | { error: string } => {
    if (v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { error: `${name} must be a number 0-100.` };
    return n;
  };
  const numv = (v: unknown, name: string): number | undefined | { error: string } => {
    if (v === undefined) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return { error: `${name} must be a number.` };
    return n;
  };
  const maxPercentile = pct(raw.max_percentile, "max_percentile");
  if (maxPercentile && typeof maxPercentile === "object") return { ok: false, error: maxPercentile.error };
  const minPercentile = pct(raw.min_percentile, "min_percentile");
  if (minPercentile && typeof minPercentile === "object") return { ok: false, error: minPercentile.error };
  const minValue = numv(raw.min_value, "min_value");
  if (minValue && typeof minValue === "object") return { ok: false, error: minValue.error };
  const maxValue = numv(raw.max_value, "max_value");
  if (maxValue && typeof maxValue === "object") return { ok: false, error: maxValue.error };

  const sort: AreasSort = (typeof raw.sort === "string" && raw.sort in SORT_SQL ? raw.sort : "percentile") as AreasSort;

  let limit = AREAS_LIMIT_DEFAULT;
  if (raw.limit !== undefined) {
    const n = Number(raw.limit);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: "limit must be a positive integer." };
    limit = Math.min(n, AREAS_LIMIT_MAX);
  }

  return {
    ok: true,
    query: {
      signal, country, lad,
      maxPercentile: maxPercentile as number | undefined,
      minPercentile: minPercentile as number | undefined,
      minValue: minValue as number | undefined,
      maxValue: maxValue as number | undefined,
      sort, limit,
    },
  };
}

/** PURE: build the parameterized SQL for a cross-area query. */
export function buildAreasQuery(q: AreasQuery): { text: string; params: unknown[] } {
  const where: string[] = ["sv.signal_key = $1"];
  const params: unknown[] = [q.signal];
  let p = 2;
  if (q.country) { where.push(`sv.geo_code LIKE $${p}`); params.push(`${COUNTRY_PREFIX[q.country]}%`); p++; }
  if (q.lad) { where.push(`sv.geo_code IN (SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $${p})`); params.push(q.lad); p++; }
  if (q.maxPercentile !== undefined) { where.push(`sp.percentile <= $${p}`); params.push(q.maxPercentile); p++; }
  if (q.minPercentile !== undefined) { where.push(`sp.percentile >= $${p}`); params.push(q.minPercentile); p++; }
  if (q.maxValue !== undefined) { where.push(`sv.raw_value <= $${p}`); params.push(q.maxValue); p++; }
  if (q.minValue !== undefined) { where.push(`sv.raw_value >= $${p}`); params.push(q.minValue); p++; }

  params.push(q.limit);
  const text =
    `SELECT sv.geo_type, sv.geo_code, sv.raw_value, sv.normalized_value, sp.percentile
       FROM signal_values sv
       LEFT JOIN signal_percentiles sp
         ON sp.signal_key = sv.signal_key AND sp.geo_type = sv.geo_type
        AND sp.geo_code = sv.geo_code AND sp.scope = 'national'
      WHERE ${where.join(" AND ")}
      ORDER BY ${SORT_SQL[q.sort]}
      LIMIT $${p}`;
  return { text, params };
}

export interface AreaResult {
  geo_type: string;
  geo_code: string;
  value: number | null;
  normalized_value: number | null;
  percentile: number | null;
}

/** Run a cross-area query and map rows to AreaResult[]. */
export async function queryAreas(q: AreasQuery, run: Runner = runDefault): Promise<AreaResult[]> {
  const { text, params } = buildAreasQuery(q);
  const rows = await run(text, params);
  return rows.map((r) => ({
    geo_type: String(r.geo_type),
    geo_code: String(r.geo_code),
    value: r.raw_value === null || r.raw_value === undefined ? null : Number(r.raw_value),
    normalized_value: r.normalized_value === null || r.normalized_value === undefined ? null : Number(r.normalized_value),
    percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
  }));
}
