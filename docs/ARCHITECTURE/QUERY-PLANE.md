# Query plane — the Intelligence layer's typed grammar

The Intelligence product is **not a chatbot, not narrative**. It's a typed query plane where the AI emits a JSON plan that validates against a Zod-strict grammar; the deterministic executor runs it against the store. **The AI picks which query to run. It never sets numbers.**

## Why a query plane

Customers ask "give me an answer about property data" in natural language. Three positions you could take:
1. Wrap an LLM and hope — narrative, no determinism, no audit trail
2. Build a query DSL — deterministic, but customers have to learn it
3. **Translate NL → typed plan via AI → execute deterministically against the store**

We picked 3. NL flexibility on the front; deterministic behaviour on the back; every response echoes the executed plan + `plan_source` (`"client"` for programmatic, `"nl"` for AI-translated) so consumers can audit + replay any answer.

## The grammar (5 plan ops)

| Op | Returns |
|---|---|
| `get_area` | Full signal profile for one area (same as `GET /v1/area`) |
| `rank_areas` | Cross-area ranking, singular OR compound (multi-signal AND-filters) |
| `score_area` | Composite score (same as `POST /v1/score`) |
| `find_peers` | k-NN over normalised signal vectors |
| `find_insights` | Anomaly screening — rank by ABS(peer-relative z) |
| `find_forecast` | Linear regression projection for one (signal, area) over N months |

`QueryPlanSchema` lives in `packages/contracts/src/intelligence.ts`. Every object is `.strict()` — unknown ops or unknown params are REJECTED, never silently coerced.

## Two modes

- **Programmatic** (`POST /v1/query {plan}`) — the LLM is NEVER touched. Validated plan goes straight to the executor.
- **NL** (`POST /v1/query {question}`) — planner translates question → Zod-validated plan, then SAME executor runs it. Identical response shape.

## 6 surfaces shipped

| # | Surface | Endpoint |
|---|---|---|
| 1 | Query plane | `POST /v1/query` |
| 2 | Compound `rank_areas` | (inside `/v1/query`) |
| 3 | Derived signals layer | (data — 9 indicators from raw signals) |
| 4 | Peers (k-NN) | `POST /v1/peers` + `find_peers` plan op |
| 5 | Insights (anomaly) | `POST /v1/insights` + `find_insights` plan op |
| 6 | Forecast (linear) | `POST /v1/forecast` + `find_forecast` plan op |

## AI eval harness

`apps/api/src/modules/intelligence/eval/` — a 14-case curated NL→plan corpus + subset structural comparison + CLI gated by `OGA_EVAL_PLAN=true`. Baseline: **92.9%** (13/14) on `claude-sonnet-4-20250514`. The differentiator we cite to regulated-buyer compliance teams.

Run locally:
```bash
OGA_EVAL_PLAN=true ANTHROPIC_API_KEY=… \
  npm run eval:intelligence -w @onegoodarea/api
```

## See also

- [`SYSTEM-OVERVIEW.md`](./SYSTEM-OVERVIEW.md) section 10.9 — eval harness deep dive
- [`PRODUCTS.md`](./PRODUCTS.md) — where Intelligence sits in the 4-product map
- ADR 0017 — the original query plane decision
- ADR 0026 — the eval harness baseline
