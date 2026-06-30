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

  /* Case-insensitive country names: accept ENGLAND, england, England. */
  let country: Country | undefined;
  if (raw.country !== undefined) {
    const normalized =
      typeof raw.country === "string"
        ? raw.country.charAt(0).toUpperCase() + raw.country.slice(1).toLowerCase()
        : raw.country;
    if (!isCountry(normalized)) {
      return { ok: false, error: "country must be one of: England, Wales, Scotland (case-insensitive)." };
    }
    country = normalized;
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
  /** Compound queries (Increment 2) populate a per-signal map; singular
      queries omit this field. The map mirrors signals[].key -> {value,
      normalized, percentile} for that area. */
  signals?: Record<string, { value: number | null; normalized_value: number | null; percentile: number | null }>;
}

/** Run a cross-area query and map rows to AreaResult[]. */
export async function queryAreas(q: AreasQuery, run: Runner = runDefault): Promise<AreaResult[]> {
  const { text, params } = buildAreasQuery(q);
  const rows = await run(text, params);
  /* Dedupe by geo_code, keeping first occurrence (honors the ORDER BY).
     Same fix as queryAreasCompound — see comment there. ICP E2E
     finding #3. */
  const seen = new Set<string>();
  const out: AreaResult[] = [];
  for (const r of rows) {
    const geo_code = String(r.geo_code);
    if (seen.has(geo_code)) continue;
    seen.add(geo_code);
    out.push({
      geo_type: String(r.geo_type),
      geo_code,
      value: r.raw_value === null || r.raw_value === undefined ? null : Number(r.raw_value),
      normalized_value: r.normalized_value === null || r.normalized_value === undefined ? null : Number(r.normalized_value),
      percentile: r.percentile === null || r.percentile === undefined ? null : Number(r.percentile),
    });
  }
  return out;
}

/* ── COMPOUND query (Increment 2, AR-184) ──────────────────────────────────
   Multi-signal AND filters + per-signal sort. One signal_values JOIN per
   listed signal + one matching signal_percentiles JOIN (LEFT — percentiles
   may not exist for every signal). Filters apply per-signal in the WHERE.
   The first signal anchors the FROM (so every returned LSOA has a value
   for it); subsequent signals are INNER JOINs (AND semantics — areas
   missing any required signal drop out).

   Mode of operation:
   - signals[0] is the anchor: FROM signal_values sv0.
   - signals[i] (i>=1): INNER JOIN signal_values sv{i} ON sv{i}.geo_code = sv0.geo_code AND sv{i}.signal_key = $p.
   - Percentile JOIN for sort/filter: LEFT JOIN signal_percentiles sp{i}.
   - country/lad scope the anchor's geo_code.
   - sort_by picks one signal's value or percentile to ORDER BY (defaults to
     percentile_desc of signals[0]). */

export type SignalFilter =
  | { eq: number }
  | { lt: number } | { lte: number }
  | { gt: number } | { gte: number }
  | { between: [number, number] }
  | { percentile_lt: number } | { percentile_lte: number }
  | { percentile_gt: number } | { percentile_gte: number }
  | { percentile_between: [number, number] };

export interface CompoundSignalEntry { key: string; filter?: SignalFilter }
export interface CompoundSortBy { signal: string; mode?: "value" | "percentile"; direction?: "asc" | "desc" }

export interface CompoundAreasQuery {
  signals: CompoundSignalEntry[];
  country?: Country;
  lad?: string;
  sortBy?: CompoundSortBy;
  limit: number;
}

function filterToSql(f: SignalFilter, valueCol: string, pctCol: string, params: unknown[], pStart: number): { sql: string; pNext: number } {
  const push = (v: unknown): number => { params.push(v); return params.length; };
  if ("eq" in f) return { sql: `${valueCol} = $${push(f.eq)}`, pNext: pStart + 1 };
  if ("lt" in f) return { sql: `${valueCol} < $${push(f.lt)}`, pNext: pStart + 1 };
  if ("lte" in f) return { sql: `${valueCol} <= $${push(f.lte)}`, pNext: pStart + 1 };
  if ("gt" in f) return { sql: `${valueCol} > $${push(f.gt)}`, pNext: pStart + 1 };
  if ("gte" in f) return { sql: `${valueCol} >= $${push(f.gte)}`, pNext: pStart + 1 };
  if ("between" in f) {
    const a = push(f.between[0]); const b = push(f.between[1]);
    return { sql: `${valueCol} BETWEEN $${a} AND $${b}`, pNext: pStart + 2 };
  }
  if ("percentile_lt" in f) return { sql: `${pctCol} < $${push(f.percentile_lt)}`, pNext: pStart + 1 };
  if ("percentile_lte" in f) return { sql: `${pctCol} <= $${push(f.percentile_lte)}`, pNext: pStart + 1 };
  if ("percentile_gt" in f) return { sql: `${pctCol} > $${push(f.percentile_gt)}`, pNext: pStart + 1 };
  if ("percentile_gte" in f) return { sql: `${pctCol} >= $${push(f.percentile_gte)}`, pNext: pStart + 1 };
  if ("percentile_between" in f) {
    const a = push(f.percentile_between[0]); const b = push(f.percentile_between[1]);
    return { sql: `${pctCol} BETWEEN $${a} AND $${b}`, pNext: pStart + 2 };
  }
  // Exhaustive — TS already enforces but defensive at runtime.
  throw new Error("unknown signal filter shape");
}

/** PURE: build the parameterized SQL for a compound (multi-signal AND) query. */
export function buildCompoundAreasQuery(q: CompoundAreasQuery): { text: string; params: unknown[] } {
  if (q.signals.length === 0) throw new Error("compound query requires at least one signal");
  const params: unknown[] = [];
  const push = (v: unknown): number => { params.push(v); return params.length; };

  // Anchor signal -> FROM signal_values sv0
  const anchor = q.signals[0];
  const anchorP = push(anchor.key);
  const where: string[] = [`sv0.signal_key = $${anchorP}`];
  const selectCols: string[] = [
    `sv0.geo_type AS geo_type`,
    `sv0.geo_code AS geo_code`,
    `sv0.raw_value AS sv0_raw`,
    `sv0.normalized_value AS sv0_norm`,
    `sp0.percentile AS sp0_pct`,
  ];
  const joins: string[] = [
    `LEFT JOIN signal_percentiles sp0
       ON sp0.signal_key = sv0.signal_key AND sp0.geo_type = sv0.geo_type
      AND sp0.geo_code = sv0.geo_code AND sp0.scope = 'national'`,
  ];

  if (q.country) { where.push(`sv0.geo_code LIKE $${push(`${COUNTRY_PREFIX[q.country]}%`)}`); }
  if (q.lad) { where.push(`sv0.geo_code IN (SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $${push(q.lad)})`); }

  if (anchor.filter) {
    const f = filterToSql(anchor.filter, "sv0.raw_value", "sp0.percentile", params, 0);
    where.push(f.sql);
  }

  // Sibling signals -> INNER JOIN (AND semantics)
  for (let i = 1; i < q.signals.length; i++) {
    const s = q.signals[i];
    const keyP = push(s.key);
    joins.push(
      `INNER JOIN signal_values sv${i}
         ON sv${i}.geo_type = sv0.geo_type
        AND sv${i}.geo_code = sv0.geo_code
        AND sv${i}.signal_key = $${keyP}`,
    );
    joins.push(
      `LEFT JOIN signal_percentiles sp${i}
         ON sp${i}.signal_key = sv${i}.signal_key
        AND sp${i}.geo_type = sv${i}.geo_type
        AND sp${i}.geo_code = sv${i}.geo_code
        AND sp${i}.scope = 'national'`,
    );
    selectCols.push(`sv${i}.raw_value AS sv${i}_raw`);
    selectCols.push(`sv${i}.normalized_value AS sv${i}_norm`);
    selectCols.push(`sp${i}.percentile AS sp${i}_pct`);
    if (s.filter) {
      const f = filterToSql(s.filter, `sv${i}.raw_value`, `sp${i}.percentile`, params, 0);
      where.push(f.sql);
    }
  }

  // Resolve sort_by -> ORDER BY clause referencing the chosen alias.
  // Default: percentile_desc on signals[0]. If the chosen signal isn't in
  // signals[], we'd have already failed Zod refinement upstream — defensive
  // fallback to signals[0] here too.
  const sortIdx = q.sortBy ? Math.max(0, q.signals.findIndex((s) => s.key === q.sortBy!.signal)) : 0;
  const sortMode = q.sortBy?.mode ?? "percentile";
  const sortDir = q.sortBy?.direction ?? "desc";
  const sortCol = sortMode === "percentile" ? `sp${sortIdx}.percentile` : `sv${sortIdx}.raw_value`;
  const sortSql = `${sortCol} ${sortDir.toUpperCase()} NULLS LAST`;

  const limitP = push(q.limit);
  const text =
    `SELECT ${selectCols.join(", ")}
       FROM signal_values sv0
       ${joins.join("\n       ")}
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortSql}
      LIMIT $${limitP}`;
  return { text, params };
}

/** Run a compound cross-area query. The returned rows expose a `signals` map
    keyed by each listed signal key with its value/normalized/percentile, AND
    legacy top-level value/normalized/percentile fields that mirror the sort
    signal (or signals[0] when no sort_by) for backward-compat consumers. */
export async function queryAreasCompound(q: CompoundAreasQuery, run: Runner = runDefault): Promise<AreaResult[]> {
  const { text, params } = buildCompoundAreasQuery(q);
  const rows = await run(text, params);
  const sortIdx = q.sortBy ? Math.max(0, q.signals.findIndex((s) => s.key === q.sortBy!.signal)) : 0;
  const toNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
  const mapped = rows.map((r) => {
    const sig: Record<string, { value: number | null; normalized_value: number | null; percentile: number | null }> = {};
    for (let i = 0; i < q.signals.length; i++) {
      sig[q.signals[i].key] = {
        value: toNum(r[`sv${i}_raw`]),
        normalized_value: toNum(r[`sv${i}_norm`]),
        percentile: toNum(r[`sp${i}_pct`]),
      };
    }
    const sortSig = sig[q.signals[sortIdx].key];
    return {
      geo_type: String(r.geo_type),
      geo_code: String(r.geo_code),
      value: sortSig.value,
      normalized_value: sortSig.normalized_value,
      percentile: sortSig.percentile,
      signals: sig,
    };
  });

  /* Dedupe by geo_code, keeping first occurrence (which honors the
     ORDER BY direction). The SQL can return the same geo_code multiple
     times if signal_values / signal_percentiles have multiple rows per
     (signal_key, geo_code) — e.g. different observation periods. Until
     the SQL is tightened with a DISTINCT ON, this guarantees the API
     contract that the caller sees one row per area. Surfaced via ICP
     E2E 2026-06-30 finding #3. */
  const seen = new Set<string>();
  const deduped: AreaResult[] = [];
  for (const r of mapped) {
    if (seen.has(r.geo_code)) continue;
    seen.add(r.geo_code);
    deduped.push(r);
  }
  return deduped;
}
