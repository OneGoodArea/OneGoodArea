# Architecture

How OneGoodArea is built — the system snapshot, the four products, the data layer, the AI query plane, and the deploy topology.

## Documents

| File | What it covers |
|---|---|
| [`SYSTEM-OVERVIEW.md`](./SYSTEM-OVERVIEW.md) | The single mental-model snapshot. 13 sections covering everything from positioning to the operating loop. Read this first if you're new. |
| [`PRODUCTS.md`](./PRODUCTS.md) | The four composable products — Signals, Scores, Monitor, Intelligence. Endpoint mappings + product boundaries. |
| [`DATA-LAYER.md`](./DATA-LAYER.md) | The persisted signal store + 7-table schema + time-series moat + data sources. |
| [`QUERY-PLANE.md`](./QUERY-PLANE.md) | The Intelligence layer's typed grammar — planner + executor + 6 surfaces + AI eval harness. |
| [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) | Render (apps/api) + Vercel (apps/web) + Neon (Postgres). Containerized + portable. |

## Related

- [`docs/DECISIONS/`](../DECISIONS/) — the 35 ADRs (`docs/adr/` source) indexed by category + a timeline.
- [`docs/OPERATIONS/`](../OPERATIONS/) — runbooks for migrations, signal refresh, monitoring.
- [`docs/API-REFERENCE/`](../API-REFERENCE/) — the surface this architecture serves.
