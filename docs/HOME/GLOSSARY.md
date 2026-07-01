# Glossary

Domain terms used across the codebase + docs. Alphabetised.

## ADR
Architecture Decision Record. Short, durable record of a load-bearing decision with context + alternatives considered. See [`DECISIONS/`](../DECISIONS/) for the 37-strong catalog.

## .artifacts/
Repo-root directory for **generated** test reports + coverage + build outputs. Gitignored. Plan 007 phase 0.

## BFF bridge
Backend-for-Frontend bridge. apps/web mints a short-lived HS256 JWT signed with `AUTH_SECRET` and proxies dashboard requests to apps/api, which only verifies. Lets us keep NextAuth on apps/web while apps/api stays auth-library-free.

## Bundle (Levers)
Per-org whitelist of signal keys. Caller passes `?bundle=<id>` to filter `/v1/area`, `/v1/areas`, `/v1/query` results to only those signals.

## Cohort (Levers)
Per-org subset of LSOA codes (max 10,000) that scopes `/v1/peers` results to a customer's defined universe.

## Confidence
Per-signal data trust score, 0.0-1.0. Today availability/sample-based heuristic. Calibrated model lands with Phase 7.

## Deterministic
Same input → same output, every time. Scoring formulas are frozen. AI narrates the result; it cannot drift the maths.

## Engine version
Methodology version stamp on every response (`X-Engine-Version` header + `engine_version` body field). Customers can pin per request (header) or per org (Levers methodology pin).

## Golden test
Snapshot test that pins exact engine output for a postcode × intent matrix. Any refactor changing a number fails CI. See [`ENGINEERING/GOLDEN-TESTS.md`](../ENGINEERING/GOLDEN-TESTS.md).

## IMD / WIMD / SIMD
Indices of Multiple Deprivation. England (2025), Wales (2019), Scotland (2020). 7-domain composite at LSOA grain. The deprivation source loaded into the signal store.

## Intent
The historical name for the four preset scoring contexts: `moving | business | investing | research`. Each picks a different set of 5 dimensions. Levers presets (AR-196) layer saved weights on top.

## LAD
Local Authority District. ONS geo unit one level up from LSOA. ~300 in Great Britain.

## Levers
The epic that delivered the "fully configurable per client" half of the positioning. 8 commits (AR-193 through AR-200), 8 ADRs (0027-0034): orgs + bundles + presets + methodology pinning + cohorts + RBAC + white-label + IP allowlist.

## LSOA
Lower Super Output Area. ONS census geography, ~1,500 residents per LSOA, 43,916 across England + Wales + Scotland. **The atomic grain of the signal store.**

## Methodology pin (Levers)
Per-org engine_version anchor. Owner-only. When set, every response from the org's keys (without an explicit per-request header) is stamped with the pinned version.

## Moat clock
The monthly `timeseries:append` cron. Every snapshot of `signal_values` becomes immutable history in `signal_timeseries`. The corpus moves; old answers stay reproducible forever.

## MSOA
Middle Super Output Area. ONS geo unit between LSOA and LAD.

## NSPL
ONS National Statistics Postcode Lookup. The 1.8M postcode → LSOA spine. Loaded into `geo_lookup` table.

## Percentile
Rank (0-100) of a signal value within country scope. Pre-computed in `signal_percentiles`.

## Plotted
The brand v3 visual identity — graphite + warm white + the 29-dot Mark logo. (UI epic, separate workstream.)

## Preset (Levers)
Per-org saved `{base_preset, weights}` recipe. Caller passes `preset_id` to `/v1/score`; the engine uses the saved weights deterministically.

## Quartile / Percentile filter
Plan op filter on `signal_percentiles`. Lets `rank_areas` say "bottom quartile crime" without computing a percentile per request.

## RBAC (Levers)
Role-Based Access Control. Three roles: member (read), admin (Levers config mutations), owner (chain-of-authority + methodology pin).

## Signal
Atomic data point. `{key, value, normalized_value, percentile, confidence, source, observed_period}`. The product OneGoodArea sells.

## Signal store
The 7-table persisted Postgres schema. `geo_entities · geo_lookup · source_snapshots · signals · signal_values · signal_percentiles · signal_timeseries`.

## UPRN
Unique Property Reference Number. Address-level identifier. Future address-level scoring (AR-134, procurement-gated).

## v1 / v2 / v3
Engine version generations. v1 = consumer-era chartreuse aesthetic + intent-driven scoring. v2 = frozen golden-tested scoring engine + confidence + version stamping (current). v3 = future scoring-math change (TBD).

## See also

- [`INDEX.md`](./INDEX.md) — "How do I X?" question → doc map
- [`ARCHITECTURE/SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) — where every term lives in the live system
