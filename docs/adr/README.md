# Architecture Decision Records

Short, durable records of the load-bearing decisions in the signal-first
restructure (and beyond). Each ADR captures the *context*, the *decision*, and
the *consequences* so future contributors (and future us) understand the *why*,
not just the *what*. See `EXECUTION-PLAYBOOK.md` §4.

Format: one file per decision, `NNNN-short-slug.md`, numbered in order. A
decision is never edited away once superseded; instead a later ADR supersedes it
and both are kept (the trail matters).

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-signal-first-primitive.md) | Signal as the public primitive; thin `/v1/area` over live-fetch first | Accepted |
| [0002](./0002-signal-store-schema.md) | The persisted signal store schema (7 tables, Phase 1) | Accepted |
| [0003](./0003-source-refresh-jobs.md) | Source refresh jobs (reusable store-writer + deprivation first) | Accepted |
| [0004](./0004-store-read-hybrid.md) | Serving from the store (read-through + live fallback + hybrid provenance) | Accepted |
| [0005](./0005-normalization-percentiles.md) | Normalization (in-DB percentiles + normalized values, within-country scope) | Accepted |
| [0006](./0006-geo-spine-loader.md) | The ONS geo spine loader (streaming NSPL, config-driven, seed in git) | Accepted |
| [0007](./0007-cross-area-query.md) | Cross-area query (`GET /v1/areas`) — country-by-prefix, LAD via the spine | Accepted |
| [0008](./0008-scores-v3.md) | Scores v3 (`POST /v1/score`) — presets + custom weights, engine reused untouched | Accepted |
| [0009](./0009-monitor-portfolios.md) | Monitor v1 — portfolios + bulk enrich (change detection later) | Accepted |
| [0010](./0010-timeseries-append.md) | Time-series append (the moat clock) — monthly snapshot, immutable per period | Accepted |
| [0011](./0011-prices-into-store.md) | HM Land Registry prices into the store — first dynamic + backfilled source (LSOA × month) | Accepted |
| [0012](./0012-property-store-read.md) | Serve property (prices) from the store on `/v1/area` — robust annual median, grain district→LSOA | Accepted |
| [0013](./0013-monitor-change-detection.md) | Monitor change detection (`signal.changed`) — diff time-series periods, alert on material moves | Accepted |
| [0014](./0014-property-yoy-and-change-denoise.md) | Property YoY from the store (2yr backfill) + change-detection sample-size de-noising | Accepted |
| [0015](./0015-crime-into-store.md) | Crime into the store (police.uk bulk archive, LSOA-native) — loader + sample; prod load on archive download | Accepted |
| [0016](./0016-crime-store-read.md) | Serve crime from the store on `/v1/area` — store-read flip mirroring property, real monthly_trend, by_category gap documented | Accepted |
| [0017](./0017-query-plane.md) | Intelligence v1: `POST /v1/query` — the typed query plane (programmatic + NL), planner/executor split, deterministic principle | Accepted |
| [0018](./0018-derived-signals-and-write-only-refresh.md) | Derived signals layer + write-only refresh / unified normalize — `property.price_change_pct_yoy` queryable; resilient cron | Accepted |
| [0019](./0019-compound-rank-areas.md) | Intelligence Increment 2: multi-signal compound `rank_areas` grammar — `signals[]` + `sort_by`, one JOIN per filter signal, AND semantics, backward-compat sugar | Accepted |
| [0020](./0020-rolling-yoy-derived-signals.md) | Intelligence Increment 3: parameterized rolling-12-month YoY derived signals (`buildRollingSumYoYSql`) — adds `crime.total_12m_change_pct_yoy` + `property.transaction_count_change_pct_yoy` | Accepted |
| [0021](./0021-trend-slope-derived-signals.md) | Intelligence Increment 3 follow-up: trend-slope derived signals (`buildRegrSlopeSql` via Postgres `regr_slope`) — adds `crime.monthly_count_trend_slope_24m` + `property.transaction_count_trend_slope_24m` | Accepted |
| [0022](./0022-six-month-momentum-derived-signals.md) | Intelligence Increment 3 follow-up: 6-month short-horizon momentum (parameterized `buildCountWeightedMedianDeltaSql` + `buildRollingSumDeltaSql`) — adds `property.median_price_change_pct_6m` + `crime.total_6m_change_pct` | Accepted |
| [0023](./0023-peers-knn.md) | Intelligence Increment 6: `POST /v1/peers` — k-NN over normalized signals (Euclidean, dim-mean-squared, country/LAD scope); `find_peers` plan op composes through `/v1/query` | Accepted |
| [0024](./0024-peer-relative-and-insights.md) | Intelligence Increment 7: `peer_assignments` materialization + peer-relative z-score derived signals (`buildPeerRelativeZSql`) + `POST /v1/insights` (anomaly screening) + `find_insights` plan op | Accepted |
| [0025](./0025-forecast-linear-projection.md) | Intelligence Increment 8: `POST /v1/forecast` — linear time-series projection via Postgres `regr_*` aggregates; constant-width residual-stderr CI; `find_forecast` plan op | Accepted |
| [0026](./0026-ai-eval-harness.md) | Intelligence Increment 9: AI eval harness — golden NL→plan corpus + subset structural comparison + CLI; baseline 92.9% (13/14) on `claude-sonnet-4`; the 6th Intelligence surface (product mental model complete) | Accepted |
| [0027](./0027-levers-foundation.md) | Levers Foundation (AR-193): `orgs` + `org_members` tables + `api_keys.org_id` nullable column + backfill (1 personal org per user; 1 owner per org; api_keys.org_id populated); `validateApiKey` returns `{userId, orgId}`; expand-contract migration | Accepted |
| [0028](./0028-levers-org-crud.md) | Levers Org CRUD (AR-194): 7 endpoints under `/v1/orgs` + `/auth/register` auto-creates personal org for new credentials signups; owner-only mutations + last-owner guard; slug derivation matches the Foundation backfill formula | Accepted |
| [0029](./0029-levers-custom-signal-bundles.md) | Levers Custom Signal Bundles (AR-195): `signal_bundles` table + 5 CRUD endpoints under `/v1/orgs/:id/bundles`; `?bundle=<id>` filters `/v1/area` response, gates `/v1/areas` rank-signal, validates `/v1/query` plans via pure `extractSignalKeysFromPlan` helper; `requireApiAccessWithOrg` helper + lazy first-owner fallback when key.org_id is null | Accepted |
