/* Unified normalize step — the single idempotent normalization job.

   ALL the refresh + derive jobs are WRITE-ONLY (they do their I/O and DB
   writes, that's their atomic unit). Normalization runs SEPARATELY here so a
   transient Neon HTTP timeout in normalize cannot fail the underlying data
   write. The cron explicitly chains: migrate -> refresh:deprivation ->
   refresh:prices -> derive:signals -> normalize:signals -> timeseries:append.
   Re-running this job is a no-op except for any keys that aren't yet
   normalized -- so it doubles as a safety net for any prior partial run.

   See ADR 0018 (derived signals + write-only / unified normalize). */

import { normalizeSignals } from "./normalize";
import { DEPRIVATION_SIGNAL_KEYS } from "./normalize";
import { PRICES_NORMALIZE_KEYS } from "./prices";
import { CRIME_NORMALIZE_KEYS } from "./crime";
import { DERIVED_NORMALIZE_KEYS } from "./derive";

/** Every signal that goes through the normalize job. Each key writes into
    signal_values.normalized_value + signal_percentiles rows for BOTH
    scope='national' AND scope='regional' (AR-408). Add new keys here as
    new sources / derived signals land. Ordering doesn't matter
    (normalize is independent per key). */
export const ALL_NORMALIZE_KEYS = [
  ...DEPRIVATION_SIGNAL_KEYS,
  ...PRICES_NORMALIZE_KEYS,
  ...CRIME_NORMALIZE_KEYS,
  ...DERIVED_NORMALIZE_KEYS,
] as const;

/* CLI:  npm run normalize:signals -w @onegoodarea/api  (idempotent; run after
   any refresh / derive job; safe to re-run at any time). */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("normalize-all.ts"));
if (invokedDirectly) {
  normalizeSignals(ALL_NORMALIZE_KEYS)
    .then((s) => {
      console.log(`[normalize:signals] normalized ${s.signals.length} signals (scopes: national + regional):`);
      for (const k of s.signals) console.log(`  ✓ ${k}`);
      process.exit(0);
    })
    .catch((err) => { console.error("[normalize:signals] failed:", err); process.exit(1); });
}
