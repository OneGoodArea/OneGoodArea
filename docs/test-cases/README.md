# Test cases — source of truth

Per-surface manual / exploratory test cases for OneGoodArea, one file per
surface. This is the **single source of truth** for human-authored test
cases; it replaces the old 3000-line `test-plan.md` (now in
[`../ARCHIVE/`](../ARCHIVE/)) which tested the killed reports/widget surface.

> Automated test code lives per-workspace under `apps/api/tests/`,
> `apps/web/tests/`, `packages/contracts/tests/` — not here. The endpoint
> catalog is [`../API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`](../API-REFERENCE/ENDPOINTS-BY-PRODUCT.md).

## Format

Each file follows the same shape:

- A header stamping the **engine version**, the surface, and **last-updated** date.
- A **"Source files validated against"** table — every case must trace to a
  real route/handler/contract, never invented behaviour.
- Test cases in a table: **ID · Test Case · Steps · Expected Result**, with a
  stable ID prefix per surface (e.g. `AREA-01`, `SCORE-01`).

Keep each file focused on one surface and reasonably sized; split if it grows past a few hundred lines.

## Index

### Web / UI surfaces
| File | Surface |
|---|---|
| [`auth-test-cases.md`](./auth-test-cases.md) | Sign-up, verify, sign-in, OAuth, forgot/reset password |
| [`dashboard-test-cases.md`](./dashboard-test-cases.md) | Authenticated dashboard behaviour |

### API surfaces (`/v1` + MCP)
| File | Surface | Endpoints |
|---|---|---|
| [`signals-test-cases.md`](./signals-test-cases.md) | Signals | `GET /v1/area` · `/v1/signals/:category` · `/v1/areas` |
| [`scores-test-cases.md`](./scores-test-cases.md) | Scores | `POST /v1/score` |
| [`monitor-test-cases.md`](./monitor-test-cases.md) | Monitor | `/v1/portfolios*` + `/changes` + webhooks |
| [`intelligence-test-cases.md`](./intelligence-test-cases.md) | Intelligence | `/v1/query` · `/peers` · `/insights` · `/forecast` |
| [`api-keys-test-cases.md`](./api-keys-test-cases.md) | Keys + usage + entitlements | `/keys*` · `/usage` · `/v1/me` |
| [`mcp-test-cases.md`](./mcp-test-cases.md) | MCP server | tools exposed by `mcp/src/server.ts` |

### Not yet authored (tracked)
- **Levers** (25 org-management endpoints: orgs / members / bundles /
  presets / methodology / cohorts) — see the endpoint catalog; test-case
  authoring is a tracked follow-up under AR-431.

## Related
- [`../TESTING/`](../TESTING/) — manual QA browser checklist + bug tracker
- [`../TESTING/bugs/bugs-to-solve.md`](../TESTING/bugs/bugs-to-solve.md) — open bugs
