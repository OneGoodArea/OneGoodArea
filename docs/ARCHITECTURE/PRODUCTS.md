# Products — the four composable surfaces

OneGoodArea is sold as **four composable products** sitting on a persisted signal store + a typed AI query plane. Customers pick the surfaces they need; everything shares the same engine.

## 1. Signals

The atomic primitive. Per-LSOA values + normalised score + percentile + confidence + source attribution. Served from the store with live fallback during transition.

| Endpoint | Use case |
|---|---|
| `GET /v1/area?postcode=…` | Full signal profile for one area |
| `GET /v1/signals/:category?area=…` | Category-scoped (property, crime, deprivation, …) |
| `GET /v1/areas?signal=…&country=…` | Cross-area filter + rank |

## 2. Scores

Deterministic composite. Frozen v2 engine, golden-tested. Preset weights (one per intent: moving / business / investing / research) or caller-supplied weights over the preset's dimensions.

| Endpoint | Use case |
|---|---|
| `POST /v1/score` | Score one area `{area, preset}` or `{area, weights}` or `{area, preset_id}` (Levers saved preset) |

## 3. Monitor

Portfolio CRUD + bulk enrich + change detection via the time-series moat. Material moves fire `signal.changed` webhooks.

| Endpoint | Use case |
|---|---|
| `POST/GET /v1/portfolios` | CRUD portfolios |
| `POST /v1/portfolios/:id/areas` | Bulk add tracked areas |
| `POST /v1/portfolios/:id/enrich` | Full signal enrichment for every area |
| `POST /v1/portfolios/:id/changes` | Diff vs baseline, fire `signal.changed` webhooks |

## 4. Intelligence

Typed query plane (programmatic OR NL-planned), k-NN peers, anomaly screening, linear projection. AI is the INTERFACE; determinism is the floor. Measured planner accuracy: **92.9%** on a 14-case curated corpus.

| Endpoint | Use case |
|---|---|
| `POST /v1/query` | Typed query plane. `{plan}` programmatic OR `{question}` NL → planner |
| `POST /v1/peers` | k-NN over normalised signals: areas like this one |
| `POST /v1/insights` | Anomaly screening — rank LSOAs by `\|peer-relative z\|` |
| `POST /v1/forecast` | Linear regression projection for one (signal, area) over N months |

## Levers (cross-cutting)

Per-org tenancy + configurability that layers across the four products: custom signal bundles, scoring presets, methodology pinning, peer cohorts, RBAC, white-label, IP allowlist. See [`docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`](../API-REFERENCE/ENDPOINTS-BY-PRODUCT.md) for the 25 `/v1/orgs/*` endpoints.

## See also

- [`DATA-LAYER.md`](./DATA-LAYER.md) — what each product reads underneath
- [`QUERY-PLANE.md`](./QUERY-PLANE.md) — how the Intelligence layer's typed grammar works
- [`SYSTEM-OVERVIEW.md`](./SYSTEM-OVERVIEW.md) §3 — the deeper product breakdown with rationale
