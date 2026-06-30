/* Insights — anomaly screening over peer-relative z-scores (AR-189, ADR 0024).

   The product question: "which LSOAs are unusually high / low on signal X
   relative to their peer group?" Answered by ranking by ABS(peer_relative_z)
   on a peer-relative-z derived signal that lives in signal_values (e.g.
   crime.total_12m_peer_relative_z). This is the FIRST appearance of the
   trainable-models capability per the product mental model: peers + derived
   z-score = unsupervised anomaly. (Label-supervised variants land later.)

   Reads peer-relative-z signals from signal_values; does NOT compute them on
   the fly — that's the refresh:peers + derive job's responsibility. Keeping
   the query-time path cheap (a single ORDER BY ABS scan).

   Country/LAD scope mirror /v1/areas. min_abs_z optional threshold filter.
   Pure builder + injectable runner. See ADR 0024. */

import { query as defaultQuery } from "../../infrastructure/db/client";

export type Country = "England" | "Wales" | "Scotland";
const COUNTRY_PREFIX: Record<Country, string> = { England: "E", Wales: "W", Scotland: "S" };

export const INSIGHTS_DEFAULT_K = 50;
export const INSIGHTS_MAX_K = 500;

export interface InsightsInput {
  signalKey: string;
  country?: Country;
  lad?: string;
  /** Filter to ABS(peer_relative_z) >= minAbsZ (default 0 = no threshold). */
  minAbsZ?: number;
  k: number;
}

export interface InsightRow {
  geo_code: string;
  peer_relative_z: number;
  abs_z: number;
}

export type Runner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
const runDefault: Runner = (text, params) => defaultQuery(text, params);

/** PURE: validate + normalize an insights request, or return a typed error. */
export function parseInsightsInput(raw: {
  signalKey?: string;
  country?: string;
  lad?: string;
  minAbsZ?: number;
  k?: number;
}): { ok: true; input: InsightsInput } | { ok: false; error: string } {
  const signalKey = (raw.signalKey ?? "").trim();
  if (!signalKey) return { ok: false, error: "Missing required 'signal_key' (a peer-relative-z signal, e.g. crime.total_12m_peer_relative_z)." };
  if (!signalKey.endsWith("_peer_relative_z")) {
    return { ok: false, error: "signal_key must be a peer-relative-z signal (suffix '_peer_relative_z')." };
  }

  /* Developer-experience: country names are case-insensitive on input.
     "ENGLAND", "england", "England" all normalize to "England". The
     internal canonical form stays Title-case for the downstream Country
     type + COUNTRY_PREFIX lookup. */
  let country: Country | undefined;
  if (raw.country !== undefined) {
    const normalized =
      typeof raw.country === "string"
        ? raw.country.charAt(0).toUpperCase() + raw.country.slice(1).toLowerCase()
        : raw.country;
    if (normalized !== "England" && normalized !== "Wales" && normalized !== "Scotland") {
      return { ok: false, error: "country must be one of: England, Wales, Scotland (case-insensitive)." };
    }
    country = normalized as Country;
  }

  const lad = raw.lad && raw.lad.trim() ? raw.lad.trim() : undefined;

  let minAbsZ: number | undefined;
  if (raw.minAbsZ !== undefined) {
    const n = Number(raw.minAbsZ);
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: "min_abs_z must be a non-negative number." };
    minAbsZ = n;
  }

  let k = INSIGHTS_DEFAULT_K;
  if (raw.k !== undefined) {
    const n = Number(raw.k);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: "k must be a positive integer." };
    k = Math.min(n, INSIGHTS_MAX_K);
  }

  return { ok: true, input: { signalKey, country, lad, minAbsZ, k } };
}

/** PURE: build the SQL for ranking LSOAs by ABS(peer_relative_z) on the given
    signal. ORDER BY ABS(raw_value) DESC; LIMIT k. Optional country/LAD scope
    + optional |z| >= threshold. */
export function buildInsightsSql(input: InsightsInput): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  const push = (v: unknown): number => { params.push(v); return params.length; };

  const where: string[] = [
    `signal_key = $${push(input.signalKey)}`,
    `geo_type = 'lsoa'`,
    `raw_value IS NOT NULL`,
  ];
  if (input.country) {
    where.push(`geo_code LIKE $${push(`${COUNTRY_PREFIX[input.country]}%`)}`);
  }
  if (input.lad) {
    where.push(`geo_code IN (SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $${push(input.lad)})`);
  }
  if (input.minAbsZ !== undefined && input.minAbsZ > 0) {
    where.push(`ABS(raw_value) >= $${push(input.minAbsZ)}`);
  }
  const kP = push(input.k);

  const text = `SELECT geo_code, raw_value::float8 AS peer_relative_z, ABS(raw_value)::float8 AS abs_z
                  FROM signal_values
                 WHERE ${where.join(" AND ")}
                 ORDER BY ABS(raw_value) DESC, geo_code ASC
                 LIMIT $${kP}`;
  return { text, params };
}

/** I/O: run the insights query and map rows. */
export async function findInsights(input: InsightsInput, run: Runner = runDefault): Promise<InsightRow[]> {
  const { text, params } = buildInsightsSql(input);
  const rows = await run(text, params);
  return rows.map((r) => ({
    geo_code: String(r.geo_code),
    peer_relative_z: Number(r.peer_relative_z),
    abs_z: Number(r.abs_z),
  }));
}
