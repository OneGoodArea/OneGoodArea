/* Normalization — raw stored values → comparable percentiles.

   The defensible core of the product (MASTER §7): turn mismatched raw indices
   into model-ready, comparable numbers. This job computes, per signal, where
   each area sits in its distribution and writes:
     - signal_percentiles  (per-scope percentile rank, 0-100)
     - signal_values.normalized_value  (the national position, 0-1)

   Computed IN the database with PERCENT_RANK() window functions — scalable (no
   85k-row round-trip into the app) and the natural tool for the job.

   Scope discipline: deprivation is normalized WITHIN each country
   (national-within-England / Wales / Scotland), because IMD 2025, WIMD 2019 and
   SIMD 2020 are different methodologies that are NOT comparable across the
   border. scope_key = country. Regional/LAD scopes come with the ONS geo spine.

   normalized_value is a DIRECTION-AGNOSTIC position (ascending by raw_value,
   0 = lowest raw value, 1 = highest). The signal's `direction` tells the
   consumer how to read it (e.g. for deprivation, higher rank = less deprived =
   higher normalized = better). See ADR 0005. */

import { query as defaultQuery } from "../../../infrastructure/db/client";
import type { QueryRunner } from "./store-writer";

const runDefault: QueryRunner = (text, params) => defaultQuery(text, params);

/** The deprivation signals to normalize (the keys the refresh job writes). */
export const DEPRIVATION_SIGNAL_KEYS = ["deprivation.imd_rank", "deprivation.imd_decile"] as const;

/** UPDATE signal_values.normalized_value = national-within-country position
    (0-1) for one signal. PURE string (param $1 = signal_key) for exact testing. */
export function buildNormalizedValueSql(): string {
  return `UPDATE signal_values sv
     SET normalized_value = sub.pr, updated_at = NOW()
    FROM (
      SELECT v.geo_type, v.geo_code,
             PERCENT_RANK() OVER (PARTITION BY ge.country ORDER BY v.raw_value) AS pr
        FROM signal_values v
        JOIN geo_entities ge ON ge.geo_type = v.geo_type AND ge.geo_code = v.geo_code
       WHERE v.signal_key = $1 AND v.raw_value IS NOT NULL
    ) sub
   WHERE sv.signal_key = $1 AND sv.geo_type = sub.geo_type AND sv.geo_code = sub.geo_code`;
}

/** INSERT/UPSERT national-within-country percentile (0-100) into
    signal_percentiles for one signal. PURE string (param $1 = signal_key). */
export function buildPercentilesSql(): string {
  return `INSERT INTO signal_percentiles
            (signal_key, geo_type, geo_code, scope, scope_key, percentile, computed_at)
          SELECT v.signal_key, v.geo_type, v.geo_code, 'national', ge.country,
                 PERCENT_RANK() OVER (PARTITION BY ge.country ORDER BY v.raw_value) * 100,
                 NOW()
            FROM signal_values v
            JOIN geo_entities ge ON ge.geo_type = v.geo_type AND ge.geo_code = v.geo_code
           WHERE v.signal_key = $1 AND v.raw_value IS NOT NULL
          ON CONFLICT (signal_key, geo_type, geo_code, scope, scope_key)
          DO UPDATE SET percentile = EXCLUDED.percentile, computed_at = NOW()`;
}

export interface NormalizeSummary {
  signals: string[];
}

/** Normalize every deprivation signal (national-within-country). Idempotent:
    re-running recomputes in place. */
export async function runDeprivationNormalize(run: QueryRunner = runDefault): Promise<NormalizeSummary> {
  const normalizedValueSql = buildNormalizedValueSql();
  const percentilesSql = buildPercentilesSql();

  for (const key of DEPRIVATION_SIGNAL_KEYS) {
    await run(normalizedValueSql, [key]);
    await run(percentilesSql, [key]);
  }

  return { signals: [...DEPRIVATION_SIGNAL_KEYS] };
}

/* CLI entry:  npm run normalize:deprivation -w @onegoodarea/api */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("normalize.ts"));
if (invokedDirectly) {
  runDeprivationNormalize()
    .then((s) => {
      console.log(`[normalize:deprivation] normalized ${s.signals.length} signals (national-within-country):`);
      for (const k of s.signals) console.log(`  ✓ ${k}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[normalize:deprivation] failed:", err);
      process.exit(1);
    });
}
