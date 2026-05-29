# Decisions

The architectural-decision trail. Why each non-obvious choice was made + what was rejected and why.

## Sources

- [`docs/adr/`](../adr/) — the 35 ADRs in chronological order with the canonical index
- [`DECISION-LOG.md`](./DECISION-LOG.md) — timeline view of major decisions

## ADRs by category

### Signal-first restructure foundation (0001-0008)

| ADR | Topic |
|---|---|
| [0001](../adr/0001-signal-first-primitive.md) | Signal as the public primitive; `/v1/area` thin over live-fetch first |
| [0002](../adr/0002-signal-store-schema.md) | The 7-table persisted signal store schema |
| [0003](../adr/0003-source-refresh-jobs.md) | Reusable store-writer + deprivation first |
| [0004](../adr/0004-store-read-hybrid.md) | Store read-through + live fallback + `fetch_mode` provenance |
| [0005](../adr/0005-normalization-percentiles.md) | In-DB percentiles + normalised values, within-country scope |
| [0006](../adr/0006-geo-spine-loader.md) | The ONS geo spine loader |
| [0007](../adr/0007-cross-area-query.md) | `GET /v1/areas` cross-area query |
| [0008](../adr/0008-scores-v3.md) | Scores v3 — presets + custom weights, engine reused untouched |

### Time-series + first dynamic source (0009-0016)

`0009-monitor-portfolios` · `0010-timeseries-append` · `0011-prices-into-store` · `0012-property-store-read` · `0013-monitor-change-detection` · `0014-property-yoy-and-change-denoise` · `0015-crime-into-store` · `0016-crime-store-read`

### Intelligence — query plane + derived signals + peers + insights + forecast + eval (0017-0026)

Ten ADRs spanning the 6 Intelligence surfaces. Highlights: [0017](../adr/0017-query-plane.md) (typed plan grammar), [0023](../adr/0023-peers-knn.md) (k-NN over normalised vectors), [0026](../adr/0026-ai-eval-harness.md) (92.9% baseline).

### Levers — per-org configurability (0027-0034)

The 8-commit Levers epic, one ADR per commit:

| ADR | Topic |
|---|---|
| [0027](../adr/0027-levers-foundation.md) | orgs + org_members + api_keys.org_id + auth signature change |
| [0028](../adr/0028-levers-org-crud.md) | 7 `/v1/orgs/*` endpoints + signup auto-org |
| [0029](../adr/0029-levers-custom-signal-bundles.md) | Per-org signal whitelists + `?bundle=` filter |
| [0030](../adr/0030-levers-custom-scoring-presets.md) | Saved `{base_preset, weights}` + `preset_id` on `/v1/score` |
| [0031](../adr/0031-levers-methodology-pinning.md) | Per-org engine_version pin |
| [0032](../adr/0032-levers-peer-cohorts.md) | Per-org peer cohort filter on `/v1/peers` |
| [0033](../adr/0033-levers-full-rbac.md) | Full admin-tier RBAC + typed 403 codes |
| [0034](../adr/0034-levers-white-label-and-ip-allowlist.md) | orgs.display_name/brand_url + api_keys.allowed_ip_cidrs |

## See also

- [`docs/adr/README.md`](../adr/README.md) — full canonical ADR table
- [`docs/ARCHITECTURE/SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) — how the decisions stack up into the live system
