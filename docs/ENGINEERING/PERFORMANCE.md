# Performance

Notes on where time is spent + what's been measured. This doc grows as benchmarks land.

## What we measure today

- **CI suite duration** — `npm test` across all workspaces completes in **~8s**. Tracked informally in PR descriptions.
- **AI eval baseline** — `apps/api/src/modules/intelligence/eval/` ran 14 NL→plan cases at **92.9%** structural accuracy on `claude-sonnet-4-20250514`. Re-runnable via `OGA_EVAL_PLAN=true npm run eval:intelligence -w @onegoodarea/api`.

## Hot paths to know about

### `/v1/score` cold path

1. `geocodeArea(input)` — Postcodes.io HTTP (50-200ms) OR ONS spine lookup (50ms)
2. `fetchAreaSources(area)` — 7 source fetchers in parallel via Promise.all; bottleneck is the slowest (currently HM Land Registry SPARQL at ~400ms cold)
3. `computeScores(...)` — pure compute, ~5ms
4. `applyWeights(base, weights?)` — pure compute, <1ms
5. Total: ~500ms cold for the slowest source; ~50-100ms warm

### `/v1/area` store-backed path

1. Geocode (as above)
2. `getAreaProfile()` — store reads via Neon; ~20-100ms depending on Neon cold-state
3. Total: ~100-200ms

### `/v1/areas` cross-area query

1. Single SQL query against `signal_values` + `signal_percentiles` with country/LAD filters
2. ~50-150ms for typical filter+rank against 43k LSOAs

### `/v1/query` (Intelligence, NL mode)

1. Planner: Anthropic Claude call, ~1-2s (the dominant cost)
2. Plan validation: Zod parse, <5ms
3. Executor: depends on the op — `rank_areas` runs the same SQL as `/v1/areas`
4. Total: ~1-3s typical

### `/v1/query` (programmatic mode)

LLM never touched. Pure executor cost. ~50-200ms typical.

## Optimisations applied

- **Store read-through with live fallback** — first request hot-loads; cache lives in `signal_values` indefinitely. Reduces P50 of `/v1/area` from ~800ms (all-live) to ~100ms (store-backed).
- **esbuild bundle for apps/api** — boots in milliseconds vs `tsx`'s ~3s on Render free tier.
- **MSW for tests** — every external HTTP request is mocked; no real network in CI.

## Optimisations deferred

- **Coverage threshold tuning** — `apps/web/vitest.config.ts` sets thresholds at 60-70%; raise once intelligence/levers tests stabilise
- **Bundle size monitoring** — apps/web build output isn't tracked; could add bundlewatch
- **Render free tier sleep** — 30-60s cold start; mitigate by graduating to a paid plan once customer load justifies it
- **Address-level scoring** (AR-134) — UPRN granular reads are 100× more granular than LSOA; pre-aggregate where possible

## See also

- [`docs/OPERATIONS/SIGNAL-REFRESH.md`](../OPERATIONS/SIGNAL-REFRESH.md) — refresh job cadence
- [`docs/OPERATIONS/MONITORING.md`](../OPERATIONS/MONITORING.md) — what to watch in prod
