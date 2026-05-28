/* Peers — k-NN over normalized signal values (Increment 6 / AR-188 / ADR 0023).

   The product question: "areas like THIS one." Given a target LSOA, return
   the k most-similar LSOAs by distance over their normalized signal vectors.
   This is the foundation for the anomaly model (Monitor's brain) and unlocks
   peer-relative derived signals and peer-aware smoothing (property median
   price etc.).

   Distance metric: Euclidean over normalized_value, dimension-mean-squared:

       distance(target, candidate) = SQRT( AVG_i ( (t_i - c_i)^2 ) )

   Where AVG is over dimensions i where BOTH the target and the candidate
   have a non-null normalized_value. Symmetric. Bounded in [0, 1] when
   inputs are in [0, 1]. Robust to missing dimensions: candidates with
   fewer overlapping signals aren't artificially closer or farther.

   The min_signals HAVING guard rejects candidates with too little overlap
   (default 3 dimensions). Country/LAD scope the candidate set, mirroring
   /v1/areas.

   Pure + I/O split: parsePeersInput + buildPeersSql are unit-testable;
   findPeers wires the runner. See ADR 0023. */

import { query as defaultQuery } from "../../infrastructure/db/client";

export type Country = "England" | "Wales" | "Scotland";
const COUNTRY_PREFIX: Record<Country, string> = { England: "E", Wales: "W", Scotland: "S" };

export const PEERS_DEFAULT_K = 20;
export const PEERS_MAX_K = 200;
export const PEERS_DEFAULT_MIN_SIGNALS = 3;
export const PEERS_MAX_SIGNALS = 20;

export interface PeersInput {
  /** Pre-resolved LSOA code (the endpoint resolves postcode / area first). */
  targetGeoCode: string;
  /** Explicit subset of signal_keys to compare on. If undefined, use ALL
      normalized signals the target has. */
  signals?: string[];
  country?: Country;
  lad?: string;
  /** Levers (AR-198): per-org peer cohort filter. When set, only LSOAs
      whose geo_code is in this list are considered as candidates. The
      target is permitted to be outside the cohort — the question is
      "given THIS area, find peers in MY universe". */
  cohortGeoCodes?: string[];
  k: number;
  minSignals: number;
}

export interface PeerRow {
  geo_code: string;
  distance: number;
  n_dims_used: number;
}

export type Runner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
const runDefault: Runner = (text, params) => defaultQuery(text, params);

/** PURE: validate + normalize the request inputs into a PeersInput, or return
    a typed error string. The endpoint pre-resolves postcode/area -> LSOA; the
    raw `signals[]`, `country`, `lad`, `k`, `min_signals` arrive here. */
export function parsePeersInput(raw: {
  targetGeoCode: string;
  signals?: string[];
  country?: string;
  lad?: string;
  cohortGeoCodes?: string[];
  k?: number;
  minSignals?: number;
}): { ok: true; input: PeersInput } | { ok: false; error: string } {
  const targetGeoCode = (raw.targetGeoCode ?? "").trim();
  if (!targetGeoCode) return { ok: false, error: "Missing target geo_code." };

  let country: Country | undefined;
  if (raw.country !== undefined) {
    if (raw.country !== "England" && raw.country !== "Wales" && raw.country !== "Scotland") {
      return { ok: false, error: "country must be one of: England, Wales, Scotland." };
    }
    country = raw.country;
  }

  const lad = raw.lad && raw.lad.trim() ? raw.lad.trim() : undefined;

  let k = PEERS_DEFAULT_K;
  if (raw.k !== undefined) {
    const n = Number(raw.k);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: "k must be a positive integer." };
    k = Math.min(n, PEERS_MAX_K);
  }

  let minSignals = PEERS_DEFAULT_MIN_SIGNALS;
  if (raw.minSignals !== undefined) {
    const n = Number(raw.minSignals);
    if (!Number.isInteger(n) || n < 1) return { ok: false, error: "min_signals must be a positive integer." };
    minSignals = Math.min(n, PEERS_MAX_SIGNALS);
  }

  let signals: string[] | undefined;
  if (raw.signals !== undefined) {
    if (!Array.isArray(raw.signals) || raw.signals.length === 0) {
      return { ok: false, error: "signals must be a non-empty array of signal_keys." };
    }
    signals = raw.signals.map((s) => String(s).trim()).filter((s) => s.length > 0);
    if (signals.length === 0) return { ok: false, error: "signals must contain at least one non-empty signal_key." };
    if (signals.length > PEERS_MAX_SIGNALS) {
      return { ok: false, error: `signals: at most ${PEERS_MAX_SIGNALS} signal_keys per request.` };
    }
  }

  return {
    ok: true,
    input: {
      targetGeoCode,
      signals,
      country,
      lad,
      cohortGeoCodes: raw.cohortGeoCodes,
      k,
      minSignals,
    },
  };
}

/** PURE: SQL for the target's signal vector. The endpoint runs this first to
    learn signals_used + to feed the candidates query an explicit signal list. */
export function buildTargetSignalsSql(): string {
  return `SELECT signal_key, normalized_value
            FROM signal_values
           WHERE geo_type = 'lsoa'
             AND geo_code = $1
             AND normalized_value IS NOT NULL
             AND ($2::text[] IS NULL OR signal_key = ANY($2))
           ORDER BY signal_key ASC`;
}

/** PURE: SQL for the k-NN candidates query. Reads signal_values (normalized
    side) for all OTHER LSOAs whose signal_key is among the target's vector,
    groups per geo_code, computes AVG((t_i - c_i)^2) (the dim-mean-squared)
    + COUNT of overlapping dims, then ORDER BY SQRT(msd) ASC LIMIT k.

    The target vector is supplied as parallel arrays (signal_keys + values) so
    Postgres treats it as a one-row VALUES join — fast index-friendly equality
    on signal_key. */
export function buildPeersSql(input: PeersInput): { text: string; params: unknown[] } {
  const params: unknown[] = [];
  const push = (v: unknown): number => { params.push(v); return params.length; };

  // $1 = target geo_code (used both to exclude self AND to drive the
  // target-vector CTE so the SQL is a single round-trip query).
  const targetP = push(input.targetGeoCode);
  // $2 = explicit signal_keys filter (or NULL = "all signals the target has").
  const signalsP = push(input.signals ?? null);
  const minSigP = push(input.minSignals);
  const kP = push(input.k);

  const candWhere: string[] = [
    `sv.geo_type = 'lsoa'`,
    `sv.normalized_value IS NOT NULL`,
    `sv.geo_code <> $${targetP}`,
  ];
  if (input.country) {
    const c = push(`${COUNTRY_PREFIX[input.country]}%`);
    candWhere.push(`sv.geo_code LIKE $${c}`);
  }
  if (input.lad) {
    const lp = push(input.lad);
    candWhere.push(`sv.geo_code IN (SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $${lp})`);
  }
  // Levers (AR-198): cohort filter — candidates must be in the org's
  // cohort universe. Stacks with country/lad if both are set.
  if (input.cohortGeoCodes && input.cohortGeoCodes.length > 0) {
    const cohortP = push(input.cohortGeoCodes);
    candWhere.push(`sv.geo_code = ANY($${cohortP}::text[])`);
  }

  const text = `WITH target AS (
  SELECT signal_key, normalized_value
    FROM signal_values
   WHERE geo_type = 'lsoa'
     AND geo_code = $${targetP}
     AND normalized_value IS NOT NULL
     AND ($${signalsP}::text[] IS NULL OR signal_key = ANY($${signalsP}))
),
candidates AS (
  SELECT sv.geo_code,
         AVG(POWER(sv.normalized_value - t.normalized_value, 2))::float8 AS msd,
         COUNT(*)::int AS n_dims_used
    FROM signal_values sv
    JOIN target t ON t.signal_key = sv.signal_key
   WHERE ${candWhere.join(" AND ")}
   GROUP BY sv.geo_code
  HAVING COUNT(*) >= $${minSigP}
)
SELECT geo_code, SQRT(msd)::float8 AS distance, n_dims_used
  FROM candidates
 ORDER BY distance ASC, geo_code ASC
 LIMIT $${kP}`;
  return { text, params };
}

export interface PeersResult {
  /** Signal_keys actually used in the comparison (the target's available
      normalized signals, optionally intersected with the caller's `signals`). */
  signalsUsed: string[];
  /** Ranked peers ascending by distance. */
  peers: PeerRow[];
}

/** I/O: run the two queries and assemble the result. */
export async function findPeers(input: PeersInput, run: Runner = runDefault): Promise<PeersResult> {
  // Step 1: target's available normalized signals (filtered by caller's list if any).
  const targetRows = await run(buildTargetSignalsSql(), [input.targetGeoCode, input.signals ?? null]);
  const signalsUsed = targetRows.map((r) => String(r.signal_key));
  if (signalsUsed.length === 0) return { signalsUsed, peers: [] };

  // Step 2: k-NN over the candidates. The candidates query re-derives the
  // target's vector via the SAME filter the step-1 query used, so the two are
  // consistent and the SQL stays one round trip.
  const { text, params } = buildPeersSql(input);
  const rows = await run(text, params);
  const peers: PeerRow[] = rows.map((r) => ({
    geo_code: String(r.geo_code),
    distance: Number(r.distance),
    n_dims_used: Number(r.n_dims_used),
  }));
  return { signalsUsed, peers };
}
