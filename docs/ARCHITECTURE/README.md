# Architecture

How OneGoodArea is built — the system snapshot, the four products, the data layer, the AI query plane, and the deploy topology.

## Documents

| File | What it covers |
|---|---|
| [`SYSTEM-OVERVIEW.md`](./SYSTEM-OVERVIEW.md) | Thin hub — start here, then follow links to each topic |
| [`PRODUCTS.md`](./PRODUCTS.md) | The four composable products — Signals, Scores, Monitor, Intelligence |
| [`SIGNAL-STORE.md`](./SIGNAL-STORE.md) | The persisted signal store — tables, derived signals, monthly cron |
| [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md) | Where things run — Vercel, Render, Neon, auth modes |
| [`CODE-ORG.md`](./CODE-ORG.md) | Code structure + key entry points |
| [`PRINCIPLES.md`](./PRINCIPLES.md) | The non-negotiable methodology rules |
| [`DATA-LAYER.md`](./DATA-LAYER.md) | Schema rationale + data sources |
| [`DATA-SOURCES.md`](./DATA-SOURCES.md) | Per-source current state + the "belongs in the store?" decision frame |
| [`DATA-SOURCES-ROADMAP.md`](./DATA-SOURCES-ROADMAP.md) | Proposed ingest direction — per-source actions, target cron, priorities |
| [`QUERY-PLANE.md`](./QUERY-PLANE.md) | Intelligence layer grammar — planner + executor + 6 surfaces |
| [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) | Deploy topology |
| [`CONTAINERS.md`](./CONTAINERS.md) | Cross-platform container workflow |

## Related

- [`docs/DECISIONS/`](../DECISIONS/) — 37 ADRs indexed by category + timeline
- [`docs/OPERATIONS/`](../OPERATIONS/) — runbooks for migrations, signal refresh, monitoring
- [`docs/API-REFERENCE/`](../API-REFERENCE/) — the surface this architecture serves
