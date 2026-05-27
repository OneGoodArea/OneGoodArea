/* Peer assignments refresh — materialize k-NN peer sets per LSOA.

   The product question "areas like this one" runs per-request through
   /v1/peers (ADR 0023). The DERIVED question — "for each LSOA, what is its
   signal X relative to its peer group?" — is what powers anomaly detection
   (Increment 7, ADR 0024). Asking that question on the fly for every LSOA
   would be O(N^2) per request, so we materialize the peer assignment ONCE
   in the peer_assignments table and JOIN against it from the derive step.

   This is a write-only job (matches ADR 0018's separation). Idempotent:
   re-running recomputes in place via ON CONFLICT DO UPDATE.

   Compute model:
     - Target signal vector = the LSOA's available normalized_value across
       signal_values.
     - Distance to candidate = SQRT(AVG((t_i - c_i)^2)) over signals BOTH
       have (the SAME metric POST /v1/peers uses — single definition of
       "peer" across the surface).
     - HAVING n_dims_used >= MIN_DIMS rejects sparse overlaps.
     - ROW_NUMBER() OVER (PARTITION BY target ORDER BY distance ASC) <= K
       picks the top-K nearest neighbours per target.

   See ADR 0024. */

import { query as defaultQuery } from "../../../infrastructure/db/client";
import { METHODOLOGY_VERSION } from "../../reports/methodology";
import { logger } from "../../tracking/structured-logger";
import type { QueryRunner } from "./store-writer";

const runDefault: QueryRunner = (text, params) => defaultQuery(text, params);

export const PEERS_REFRESH_DEFAULT_K = 20;
export const PEERS_REFRESH_DEFAULT_MIN_DIMS = 3;
/** How many target LSOAs to fan out to per HTTP round-trip. Bigger LATERAL
    chunks blow the serverless driver's ~5-min HTTP cap (proven the hard way
    on prod); per-target round-trips are sub-second each. We process targets
    one-per-round-trip in CONCURRENCY-wide parallel waves. */
export const PEERS_REFRESH_DEFAULT_CHUNK = 1;
/** How many per-target queries to run concurrently. The serverless driver
    pools internally, so this is bounded by Neon's connection limit (Launch
    plan ~10 concurrent) and the LATERAL plan's CPU/memory cost. 8 is a
    sensible default; bump via `concurrency` in PeersRefreshSpec if needed. */
export const PEERS_REFRESH_DEFAULT_CONCURRENCY = 8;

export interface PeersRefreshSpec {
  /** How many peers to keep per target (default 20). */
  k?: number;
  /** Reject candidates with fewer than this many overlapping signals (default 3). */
  minDims?: number;
  /** Restrict to a country prefix (default = all). Useful for staged refreshes. */
  countryPrefix?: "E" | "W" | "S";
  /** Engine version stamp on every row. Defaults to METHODOLOGY_VERSION. */
  engineVersion?: string;
  /** Targets per HTTP round-trip. Defaults to PEERS_REFRESH_DEFAULT_CHUNK (1). */
  chunkSize?: number;
  /** How many round-trips to run in parallel. Defaults to
      PEERS_REFRESH_DEFAULT_CONCURRENCY (8). */
  concurrency?: number;
}

/** PURE: build the LATERAL k-NN-per-target SQL for a CHUNK of target LSOAs.
    Bound `$1` to a string[] of target_codes -- the SQL filters to those via
    `target_code = ANY($1)`. Chunking keeps each HTTP round-trip well inside
    the serverless driver's ~5-minute cap. The orchestrator slices the full
    target list into chunks and calls this builder once per chunk.

    The LATERAL subquery references the outer target's signal vector by
    correlated column reference, so Postgres still runs a per-target k-NN
    within each chunk. ON CONFLICT DO UPDATE is idempotent across chunks. */
export function buildRefreshPeerAssignmentsSql(spec: PeersRefreshSpec = {}): string {
  const k = Number.isFinite(spec.k) && (spec.k ?? 0) > 0 ? Number(spec.k) : PEERS_REFRESH_DEFAULT_K;
  const minDims = Number.isFinite(spec.minDims) && (spec.minDims ?? 0) > 0 ? Number(spec.minDims) : PEERS_REFRESH_DEFAULT_MIN_DIMS;
  const ev = (spec.engineVersion ?? METHODOLOGY_VERSION).replace(/'/g, "''");

  return `INSERT INTO peer_assignments (
  geo_type, geo_code, peer_geo_code, peer_rank, distance, n_dims_used, engine_version
)
SELECT 'lsoa' AS geo_type,
       t.target_code,
       p.peer_code,
       p.peer_rank,
       p.distance,
       p.n_dims_used,
       '${ev}'
  FROM UNNEST($1::text[]) AS t(target_code)
  CROSS JOIN LATERAL (
    SELECT *
      FROM (
        SELECT sv.geo_code AS peer_code,
               SQRT(AVG(POWER(sv.normalized_value - tsv.normalized_value, 2)))::float8 AS distance,
               COUNT(*)::int AS n_dims_used,
               ROW_NUMBER() OVER (
                 ORDER BY SQRT(AVG(POWER(sv.normalized_value - tsv.normalized_value, 2))) ASC,
                          sv.geo_code ASC
               ) AS peer_rank
          FROM signal_values sv
          JOIN signal_values tsv
            ON tsv.geo_code = t.target_code
           AND tsv.signal_key = sv.signal_key
           AND tsv.geo_type = 'lsoa'
           AND tsv.normalized_value IS NOT NULL
         WHERE sv.geo_type = 'lsoa'
           AND sv.normalized_value IS NOT NULL
           AND sv.geo_code <> t.target_code
         GROUP BY sv.geo_code
        HAVING COUNT(*) >= ${minDims}
      ) c
     WHERE c.peer_rank <= ${k}
  ) p
ON CONFLICT (geo_type, geo_code, peer_geo_code) DO UPDATE
   SET peer_rank = EXCLUDED.peer_rank,
       distance = EXCLUDED.distance,
       n_dims_used = EXCLUDED.n_dims_used,
       computed_at = NOW(),
       engine_version = EXCLUDED.engine_version`;
}

/** PURE: SQL for listing target LSOAs (with optional country prefix). The
    orchestrator runs this first to get the full target list, then slices it
    into chunks for the LATERAL k-NN. */
export function buildListTargetsSql(spec: PeersRefreshSpec = {}): { text: string; params: unknown[] } {
  const prefix = spec.countryPrefix ?? "";
  const where: string[] = [`geo_type = 'lsoa'`, `normalized_value IS NOT NULL`];
  const params: unknown[] = [];
  if (prefix) { where.push(`geo_code LIKE $1`); params.push(`${prefix}%`); }
  return {
    text: `SELECT DISTINCT geo_code FROM signal_values WHERE ${where.join(" AND ")} ORDER BY geo_code ASC`,
    params,
  };
}

export interface PeersRefreshSummary {
  /** Distinct LSOAs that got at least one peer assignment row. */
  targetsCovered: number;
  /** Total rows in peer_assignments after the refresh. */
  rowsAfter: number;
  /** k + min_dims used (echoed for traceability). */
  k: number;
  minDims: number;
  /** Targets processed across all chunks (for progress reporting). */
  targetsProcessed: number;
  /** Number of chunks run. */
  chunks: number;
}

/** Orchestration: list targets, then run per-target LATERAL inserts in
    CONCURRENCY-wide parallel waves. Each round-trip processes `chunkSize`
    targets (default 1) — small enough to stay inside the serverless driver's
    ~5-minute HTTP cap by orders of magnitude. Idempotent across chunks +
    waves: every (target, peer) row is upserted.

    Total runtime ≈ (targets / concurrency) × per-target_query_ms. With 42k
    targets, concurrency=8, ~500ms per query that's ~45 minutes — long, but
    bounded and resumable on partial failures. */
export async function runRefreshPeerAssignments(
  spec: PeersRefreshSpec = {},
  run: QueryRunner = runDefault,
  onProgress?: (msg: { chunkIndex: number; totalChunks: number; chunkSize: number; targetsProcessed: number }) => void,
): Promise<PeersRefreshSummary> {
  const k = Number.isFinite(spec.k) && (spec.k ?? 0) > 0 ? Number(spec.k) : PEERS_REFRESH_DEFAULT_K;
  const minDims = Number.isFinite(spec.minDims) && (spec.minDims ?? 0) > 0 ? Number(spec.minDims) : PEERS_REFRESH_DEFAULT_MIN_DIMS;
  const chunkSize = Number.isFinite(spec.chunkSize) && (spec.chunkSize ?? 0) > 0 ? Number(spec.chunkSize) : PEERS_REFRESH_DEFAULT_CHUNK;
  const concurrency = Number.isFinite(spec.concurrency) && (spec.concurrency ?? 0) > 0 ? Number(spec.concurrency) : PEERS_REFRESH_DEFAULT_CONCURRENCY;

  const list = buildListTargetsSql(spec);
  const targetRows = (await run(list.text, list.params)) as { geo_code: string }[];
  const targets = targetRows.map((r) => String(r.geo_code));

  const sql = buildRefreshPeerAssignmentsSql(spec);
  const totalChunks = Math.ceil(targets.length / chunkSize);
  let processed = 0;
  let chunkIndex = 0;
  let next = 0;

  // Work-stealing worker pool. Each worker grabs the next slice via the
  // shared cursor `next`, runs the LATERAL insert, advances the progress
  // counters, then loops. Concurrency is bounded by `concurrency`.
  async function worker(): Promise<void> {
    for (;;) {
      const start = next;
      if (start >= targets.length) return;
      next = start + chunkSize;
      const chunk = targets.slice(start, Math.min(start + chunkSize, targets.length));
      await run(sql, [chunk]);
      processed += chunk.length;
      chunkIndex += 1;
      onProgress?.({ chunkIndex, totalChunks, chunkSize: chunk.length, targetsProcessed: processed });
    }
  }
  const pool = Array.from({ length: Math.min(concurrency, totalChunks) }, () => worker());
  await Promise.all(pool);

  const totalRows = (await run(`SELECT COUNT(*)::int AS n FROM peer_assignments`, [])) as { n?: number }[];
  const distinct = (await run(`SELECT COUNT(DISTINCT geo_code)::int AS n FROM peer_assignments`, [])) as { n?: number }[];

  return {
    targetsCovered: Number(distinct[0]?.n ?? 0),
    rowsAfter: Number(totalRows[0]?.n ?? 0),
    k,
    minDims,
    targetsProcessed: processed,
    chunks: totalChunks,
  };
}

/* CLI: npm run refresh:peers -w @onegoodarea/api  (idempotent; run after
   normalize:signals; safe to re-run at any time). */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("peers-refresh.ts"));
if (invokedDirectly) {
  // CLI args:  --country=E|W|S   --concurrency=<n>   --k=<n>   --min-dims=<n>
  // No args = full refresh. Useful for partial proofs:
  //   npm run refresh:peers -w @onegoodarea/api -- --country=S
  const argv = process.argv.slice(2);
  const argOf = (name: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : undefined;
  };
  const country = argOf("country");
  const countryPrefix = country === "E" || country === "W" || country === "S" ? country : undefined;
  const concurrency = argOf("concurrency") ? Number(argOf("concurrency")) : undefined;
  const k = argOf("k") ? Number(argOf("k")) : undefined;
  const minDims = argOf("min-dims") ? Number(argOf("min-dims")) : undefined;

  let lastLogged = 0;
  runRefreshPeerAssignments({ countryPrefix, concurrency, k, minDims }, undefined, (p) => {
    // Log every ~5% of chunks (avoids 42k log lines on a full refresh).
    const tick = Math.max(1, Math.floor(p.totalChunks / 20));
    if (p.chunkIndex - lastLogged >= tick || p.chunkIndex === p.totalChunks) {
      lastLogged = p.chunkIndex;
      console.log(`[refresh:peers] chunk ${p.chunkIndex}/${p.totalChunks} -> processed=${p.targetsProcessed}`);
    }
  })
    .then((s) => {
      logger.info(`[refresh:peers] targets=${s.targetsCovered} rows=${s.rowsAfter} k=${s.k} min_dims=${s.minDims} chunks=${s.chunks}`);
      console.log(`[refresh:peers] DONE targets=${s.targetsCovered} rows=${s.rowsAfter} k=${s.k} min_dims=${s.minDims} chunks=${s.chunks}`);
      process.exit(0);
    })
    .catch((err) => { console.error("[refresh:peers] failed:", err); process.exit(1); });
}
