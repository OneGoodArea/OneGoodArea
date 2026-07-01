# Architecture Decision Records

Short, durable records of the load-bearing decisions in the signal-first
restructure (and beyond). Each ADR captures the *context*, the *decision*, and
the *consequences* so future contributors (and future us) understand the *why*,
not just the *what*.

Format: one file per decision, `NNNN-short-slug.md`, numbered in order. A
decision is never edited away once superseded; instead a later ADR supersedes it
and both are kept (the trail matters).

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-signal-first-primitive.md) | Signal as the public primitive; thin `/v1/area` over live-fetch first | Accepted |
| [0002](./0002-signal-store-schema.md) | The persisted signal store schema (7 tables, Phase 1 — extended by 0024/0027/0029–0034) | Accepted |
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
| [0019](./0019-compound-rank-areas.md) | Compound `rank_areas` grammar — multi-signal `signals[]` + `sort_by`, AND semantics | Accepted |
| [0020](./0020-rolling-yoy-derived-signals.md) | Rolling-12-month YoY derived signals (`buildRollingSumYoYSql`) | Accepted |
| [0021](./0021-trend-slope-derived-signals.md) | Trend-slope derived signals via Postgres `regr_slope` | Accepted |
| [0022](./0022-six-month-momentum-derived-signals.md) | 6-month short-horizon momentum derived signals | Accepted |
| [0023](./0023-peers-knn.md) | Peers k-NN — `POST /v1/peers` over normalized signals; `find_peers` plan op | Accepted |
| [0024](./0024-peer-relative-and-insights.md) | Peer-relative z-scores + `POST /v1/insights` anomaly screening; `find_insights` plan op | Accepted |
| [0025](./0025-forecast-linear-projection.md) | Forecast — `POST /v1/forecast` linear projection with residual-stderr CI; `find_forecast` plan op | Accepted |
| [0026](./0026-ai-eval-harness.md) | AI eval harness — golden NL→plan corpus + CLI; 92.9% baseline (the 6th Intelligence surface) | Accepted |
| [0027](./0027-levers-foundation.md) | Levers Foundation — `orgs` + `org_members` + `api_keys.org_id`; `validateApiKey` returns `{userId, orgId}` | Accepted |
| [0028](./0028-levers-org-crud.md) | Levers Org CRUD — `/v1/orgs` + signup auto-org; owner-only mutations + last-owner guard | Accepted |
| [0029](./0029-levers-custom-signal-bundles.md) | Levers custom signal bundles — `?bundle=<id>` filter across `/v1/area`·`/areas`·`/query` | Accepted |
| [0030](./0030-levers-custom-scoring-presets.md) | Levers custom scoring presets — `preset_id` on `POST /v1/score` | Accepted |
| [0031](./0031-levers-methodology-pinning.md) | Levers methodology pinning per org (precedence: header > org pin > default) | Accepted |
| [0032](./0032-levers-peer-cohorts.md) | Levers peer cohorts — `cohort_id` filter on `POST /v1/peers` | Accepted |
| [0033](./0033-levers-full-rbac.md) | Levers full RBAC — admin tier + typed 403 codes; owner-only guards retained | Accepted |
| [0034](./0034-levers-white-label-and-ip-allowlist.md) | Levers white-label (`display_name`/`brand_url`) + per-key IP allowlist | Accepted |
| [0035](./0035-prod-container-parity.md) | Production container parity — portable `make container-*` workflow, three-image layout | Accepted |
| [0036](./0036-brand-v3-close-out-and-aiq-strip.md) | AR-204 close-out + `.aiq` token strip (`globals.css` 952 → 159 lines) | Accepted |
| [0037](./0037-brand-v3-dashboard-primitives.md) | Brand v3 dashboard primitives (AR-217 Phase 0) — 7 shipped, extract-on-second-use | Accepted |
