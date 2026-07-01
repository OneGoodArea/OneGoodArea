# MCP Server — Test Cases

> **Source:** OneGoodArea MCP server (Engine v2.0.2)
> **Last updated:** 2026-07-01

## Scope

Covers the OneGoodArea MCP server (`@oga-mcp/server`, server version `1.0.3`) exposed over stdio to MCP clients (Claude Desktop, Cursor, Claude Code, Windsurf). Includes: server startup and API-key handling, the `/v1/me` entitlement gate, tool discovery/listing, and every one of the eleven registered tools — happy path, required-argument validation, argument-bound validation, auth/API-key propagation to the underlying REST API, and error passthrough from the API. Does **not** cover the underlying REST API's own scoring/engine behaviour (that is validated server-side against `apps/api`).

The server registers **eleven tools**: nine network tools that proxy the OneGoodArea REST API at `/v1/*` (`score_postcode`, `compare_postcodes`, `get_area_signals`, `get_signals_by_category`, `find_areas`, `find_peers`, `watch_portfolio`, `get_portfolio_changes`, `area_brief`) and two static-lookup tools that make no network call (`methodology_for`, `engine_version`).

### Source files validated against

| Layer | File |
|-------|------|
| Server entry point / dispatch | `mcp/src/server.ts` |
| REST API HTTP client | `mcp/src/api-client.ts` |
| Static methodology + engine data | `mcp/src/methodology-data.ts` |
| `score_postcode` tool | `mcp/src/tools/score-postcode.ts` |
| `compare_postcodes` tool | `mcp/src/tools/compare-postcodes.ts` |
| `get_area_signals` tool | `mcp/src/tools/get-area-signals.ts` |
| `get_signals_by_category` tool | `mcp/src/tools/get-signals-by-category.ts` |
| `find_areas` tool | `mcp/src/tools/find-areas.ts` |
| `find_peers` tool | `mcp/src/tools/find-peers.ts` |
| `watch_portfolio` tool | `mcp/src/tools/watch-portfolio.ts` |
| `get_portfolio_changes` tool | `mcp/src/tools/get-portfolio-changes.ts` |
| `area_brief` tool | `mcp/src/tools/area-brief.ts` |
| `area_brief` audience config | `mcp/src/tools/area-brief-audiences.ts` |
| `methodology_for` tool | `mcp/src/tools/methodology-for.ts` |
| `engine_version` tool | `mcp/src/tools/engine-version.ts` |
| Package README | `mcp/README.md` |

### Transport & auth model

- **Transport:** stdio (`StdioServerTransport`). The server runs via `npx -y @oga-mcp/server`.
- **API key:** read from the `OOGA_API_KEY` env var. Must start with `oga_`.
- **Base URL:** defaults to `https://onegoodarea.onrender.com`; override via `OOGA_API_BASE` (used for local dev).
- **Auth propagation:** every REST call sends `Authorization: Bearer <OOGA_API_KEY>` and `User-Agent: onegoodarea-mcp-server/1.0.3`.
- **Entitlement gate:** on startup the server calls `GET /v1/me` and refuses to serve unless `mcp_access === true` (skippable via `OOGA_SKIP_ENTITLEMENT_CHECK=1`).

### Tool → endpoint map

| Tool | HTTP call(s) | Network? |
|------|-------------|----------|
| `score_postcode` | `POST /v1/score?explain=true` | Yes |
| `compare_postcodes` | N × `POST /v1/score?explain=true` (parallel, `Promise.allSettled`) | Yes |
| `get_area_signals` | `GET /v1/area?area=<area>` | Yes |
| `get_signals_by_category` | `GET /v1/signals/:category?area=<area>` | Yes |
| `find_areas` | `POST /v1/query` `{question}` | Yes |
| `find_peers` | `POST /v1/peers` `{target:{area}, k?}` | Yes |
| `watch_portfolio` | `POST /v1/portfolios` then `POST /v1/portfolios/:id/areas` | Yes |
| `get_portfolio_changes` | `POST /v1/portfolios/:id/changes` (`emit:false`) | Yes |
| `area_brief` | `GET /v1/area` + `POST /v1/score?explain=true` (parallel) | Yes |
| `methodology_for` | none — static lookup in `methodology-data.ts` | No |
| `engine_version` | none — static lookup in `methodology-data.ts` | No |

---

## 1. Server Startup & API-Key Handling

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-01** | Missing `OOGA_API_KEY` aborts startup | 1. Launch the server with `OOGA_API_KEY` unset | Writes `[oga-mcp] Missing OOGA_API_KEY env var. Get one at https://www.onegoodarea.com/dashboard` to stderr and exits with code 1 (`process.exit(1)`). |
| **MCP-02** | Malformed key prefix aborts startup | 1. Launch with `OOGA_API_KEY=sk_test123` (does not start with `oga_`) | Writes `[oga-mcp] OOGA_API_KEY looks malformed (expected to start with 'oga_'). Got prefix: sk_t` to stderr and exits code 1. |
| **MCP-03** | Valid key prefix accepted | 1. Launch with `OOGA_API_KEY=oga_validkey` and a reachable API | Key check passes; server proceeds to the `/v1/me` entitlement check. |
| **MCP-04** | Default base URL used | 1. Launch without `OOGA_API_BASE` | Client targets `https://onegoodarea.onrender.com`; startup log reads `... (api: https://onegoodarea.onrender.com)`. |
| **MCP-05** | Base URL override honoured | 1. Launch with `OOGA_API_BASE=http://localhost:4000` | Client targets `http://localhost:4000`; startup log reflects the override. Trailing slash is stripped from the base URL. |
| **MCP-06** | Startup log lists engine + listening line | 1. Launch with a valid key and entitled plan | After connect, stderr shows `[oga-mcp] v1.0.3 listening on stdio (api: ...)`. |
| **MCP-07** | Fatal error handler | 1. Force `main()` to reject (e.g. transport failure) | Catch handler writes `[oga-mcp] Fatal: <message>` and exits code 1. |

---

## 2. Entitlement Gate (`GET /v1/me`)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-08** | Plan with MCP access boots | 1. Start server with a key whose `/v1/me` returns `mcp_access: true` | Writes `[oga-mcp] Entitlement OK · plan: <plan_name> · engine: <engine_version>` and continues to register tools. |
| **MCP-09** | Plan without MCP access is blocked | 1. Start with a key whose `/v1/me` returns `mcp_access: false` | Writes the upgrade guidance (mentions Growth £1,499/mo, Enterprise, £29/mo MCP add-on, `/pricing`) and exits code 1. Tools are never served. |
| **MCP-10** | `/v1/me` unreachable / errors | 1. Start with an API base that returns an error or is unreachable | Writes `[oga-mcp] Could not verify entitlement at /v1/me: <msg>` plus the "Check OOGA_API_KEY ... OOGA_API_BASE reachable" hint and exits code 1. |
| **MCP-11** | Entitlement check bypass flag | 1. Start with `OOGA_SKIP_ENTITLEMENT_CHECK=1` | Writes `[oga-mcp] OOGA_SKIP_ENTITLEMENT_CHECK=1 — skipping /me check` and boots without calling `/v1/me`. |
| **MCP-12** | `/v1/me` request carries auth | 1. Inspect the outbound `/v1/me` request | Sends `Authorization: Bearer <OOGA_API_KEY>` and `User-Agent: onegoodarea-mcp-server/1.0.3`; 10s timeout via `AbortController`. |
| **MCP-13** | Training-capture state logged (opted in) | 1. Boot with `/v1/me` returning `key.training_optout: false` (or absent) | Logs `[oga-mcp] Training-data capture: ON for this key. ...`. Absent field defaults to ON (participating). |
| **MCP-14** | Training-capture state logged (opted out) | 1. Boot with `/v1/me` returning `key.training_optout: true` | Logs `[oga-mcp] Training-data capture: OFF (you opted out) for this key. ...`. |

---

## 3. Tool Discovery / Listing

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-15** | `ListTools` returns exactly 11 tools | 1. Send an MCP `ListTools` request | Returns 11 tool defs: `score_postcode`, `compare_postcodes`, `get_area_signals`, `get_signals_by_category`, `find_areas`, `find_peers`, `watch_portfolio`, `get_portfolio_changes`, `area_brief`, `methodology_for`, `engine_version`. |
| **MCP-16** | Each tool has name + description + inputSchema | 1. Inspect each entry in the `ListTools` response | Every tool exposes `name`, a non-empty `description`, and an `inputSchema` object with `additionalProperties: false`. |
| **MCP-17** | Server identity | 1. Inspect the MCP `initialize` handshake | Server reports name `onegoodarea`, version `1.0.3`, and `capabilities.tools`. |
| **MCP-18** | Unknown tool name handled gracefully | 1. Send `CallTool` with `name: "does_not_exist"` | Returns `{ content: [{ type: "text", text: "Unknown tool: does_not_exist" }], isError: true }` (does not throw). |

---

## 4. `score_postcode` — `POST /v1/score?explain=true`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-19** | Happy path | 1. Call `score_postcode` with `{area: "SW1A 1AA", preset: "moving"}` | POSTs `/v1/score?explain=true` with body `{area, preset}`. Returns markdown: `# SW1A 1AA · moving · <score>/100`, engine version, area type, `## Summary`, `## Dimensions` (label, score, weight, confidence, reasoning, confidence_reason), `## Recommendations`, `## Data sources`. |
| **MCP-20** | Missing `area` | 1. Call with `{preset: "moving"}` | `parseScorePostcodeArgs` throws `area must be a non-empty string`. |
| **MCP-21** | Missing `preset` | 1. Call with `{area: "M1 1AE"}` | Throws `preset must be one of: moving, business, investing, research`. |
| **MCP-22** | Blank / whitespace `area` | 1. Call with `{area: "   ", preset: "moving"}` | Throws `area must be a non-empty string`. |
| **MCP-23** | `area` over 100 chars | 1. Call with a 101-char `area` | Throws `area must be 100 characters or fewer`. |
| **MCP-24** | Invalid `preset` value | 1. Call with `{area: "M1 1AE", preset: "buying"}` | Throws `preset must be one of: moving, business, investing, research`. |
| **MCP-25** | `area` is trimmed before the call | 1. Call with `{area: "  Shoreditch  ", preset: "research"}` | The trimmed value `Shoreditch` is sent to the API. |
| **MCP-26** | Auth header propagated | 1. Inspect the outbound `/v1/score` request | Carries `Authorization: Bearer <key>`, `Content-Type: application/json`, `User-Agent: onegoodarea-mcp-server/1.0.3`. |
| **MCP-27** | API error passthrough | 1. API responds `402` with `{error: "quota exceeded"}` | Tool returns `{ isError: true }` with text `OneGoodArea API error (HTTP 402): quota exceeded`. |
| **MCP-28** | Non-`OogaApiError` failure | 1. Force a network/timeout error (not an HTTP error) | Returns `{ isError: true }` with text `Tool error: <message>`. |

---

## 5. `compare_postcodes` — parallel `POST /v1/score?explain=true`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-29** | Happy path | 1. Call with `{areas: ["M1 1AE", "SW4 0LG"], preset: "investing"}` | Scores each area in parallel (`Promise.allSettled`). Returns `# Comparison · 2 areas · preset: investing`, a table sorted by descending score (`Rank | Area | Score | Area type | Top dimension`), `## Summaries`, and engine version footer. |
| **MCP-30** | Fewer than 2 areas rejected | 1. Call with `{areas: ["M1 1AE"], preset: "moving"}` | Throws `areas must contain at least 2 entries`. |
| **MCP-31** | More than 8 areas rejected | 1. Call with 9 areas | Throws `areas must contain at most 8 entries`. |
| **MCP-32** | `areas` not an array | 1. Call with `{areas: "M1 1AE,SW4 0LG", preset: "moving"}` | Throws `areas must be an array`. |
| **MCP-33** | Empty / blank member | 1. Call with `{areas: ["M1 1AE", "  "], preset: "moving"}` | Throws `every area must be a non-empty string`. |
| **MCP-34** | Member over 100 chars | 1. Include a 101-char member | Throws `each area must be 100 characters or fewer`. |
| **MCP-35** | Invalid preset | 1. Call with a preset not in the enum | Throws `preset must be one of: moving, business, investing, research`. |
| **MCP-36** | Partial failure surfaces inline | 1. One area scores OK, the other returns an API error | Response is NOT `isError`. Failing row shows `ERROR` and the reason in the table (`HTTP <status>: <message>`); succeeding row ranks normally. |
| **MCP-37** | All areas fail → `isError` | 1. Every area's score call rejects | Response includes `isError: true`; every table row shows `ERROR`. |
| **MCP-38** | Sort order — errors sink to bottom | 1. Mix successful and failed areas | Successful rows sorted by descending score; error rows placed last. |

---

## 6. `get_area_signals` — `GET /v1/area`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-39** | Happy path | 1. Call with `{area: "M1 1AE"}` | GETs `/v1/area?area=M1%201AE`. Returns the full signals catalog rendered as text (all seven categories with value/unit, percentile, confidence + reason, source, observed period). |
| **MCP-40** | Missing `area` | 1. Call with `{}` | Throws `area must be a non-empty string`. |
| **MCP-41** | `area` over 100 chars | 1. Call with a 101-char `area` | Throws `area must be 100 characters or fewer`. |
| **MCP-42** | `area` URL-encoded in query | 1. Call with `{area: "Manchester city centre"}` | Value is `encodeURIComponent`-encoded in the `?area=` query string. |
| **MCP-43** | Auth header propagated | 1. Inspect the outbound GET | Carries `Authorization: Bearer <key>` and `User-Agent: onegoodarea-mcp-server/1.0.3` (no `Content-Type` on GET). |
| **MCP-44** | API error passthrough | 1. API responds `404` `{error: "area not found"}` | Returns `{ isError: true }` with `OneGoodArea API error (HTTP 404): area not found`. |

---

## 7. `get_signals_by_category` — `GET /v1/signals/:category`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-45** | Happy path | 1. Call with `{area: "M1 1AE", category: "crime"}` | GETs `/v1/signals/crime?area=M1%201AE`. Returns the category-filtered signals rendered as text. |
| **MCP-46** | Missing `area` | 1. Call with `{category: "crime"}` | Throws `area must be a non-empty string`. |
| **MCP-47** | Missing `category` | 1. Call with `{area: "M1 1AE"}` | Throws `category must be one of: crime, deprivation, property, schools, amenities, transport, environment`. |
| **MCP-48** | Invalid `category` | 1. Call with `{area: "M1 1AE", category: "weather"}` | Throws `category must be one of: crime, deprivation, property, schools, amenities, transport, environment`. |
| **MCP-49** | All seven categories accepted | 1. Call once per category in `SIGNAL_CATEGORIES` | Each is routed to `/v1/signals/<category>` without a validation error. |
| **MCP-50** | `area` over 100 chars | 1. Call with a 101-char `area` | Throws `area must be 100 characters or fewer`. |
| **MCP-51** | API error passthrough | 1. API returns an HTTP error | Returns `{ isError: true }` with `OneGoodArea API error (HTTP <status>): <message>`. |

---

## 8. `find_areas` — `POST /v1/query`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-52** | Happy path (NL query) | 1. Call with `{question: "areas under £250k median price and rising YoY in England"}` | POSTs `/v1/query` with `{question}`. Returns the emitted plan (one of `rank_areas`, `get_area`, `score_area`, `compare_areas`, `find_peers`, `find_insights`, `find_forecast`) plus op-specific results, rendered as text. |
| **MCP-53** | Missing `question` | 1. Call with `{}` | Throws `question must be a non-empty string`. |
| **MCP-54** | Blank `question` | 1. Call with `{question: "   "}` | Throws `question must be a non-empty string`. |
| **MCP-55** | `question` over 500 chars | 1. Call with a 501-char question | Throws `question must be 500 characters or fewer`. |
| **MCP-56** | `question` trimmed before send | 1. Call with leading/trailing whitespace | Trimmed value is sent in the POST body. |
| **MCP-57** | Auth header propagated | 1. Inspect the outbound POST | Carries `Authorization: Bearer <key>`, `Content-Type: application/json`, `User-Agent: onegoodarea-mcp-server/1.0.3`. |
| **MCP-58** | API error passthrough | 1. Planner returns HTTP error (e.g. `422` unplannable) | Returns `{ isError: true }` with `OneGoodArea API error (HTTP <status>): <message>`. |

---

## 9. `find_peers` — `POST /v1/peers`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-59** | Happy path (default k) | 1. Call with `{area: "M1 1AE"}` | POSTs `/v1/peers` with `{target: {area}}` (no `k`). Returns `# Peers · M1 1AE`, generated-at, and the ranked peers block (geo_code, distance, n_dims_used). |
| **MCP-60** | Happy path (explicit k) | 1. Call with `{area: "M1 1AE", k: 10}` | Body includes `k: 10`. |
| **MCP-61** | Missing `area` | 1. Call with `{k: 5}` | Throws `area must be a non-empty string`. |
| **MCP-62** | `area` over 100 chars | 1. Call with a 101-char `area` | Throws `area must be 100 characters or fewer`. |
| **MCP-63** | `k` below range | 1. Call with `{area: "M1 1AE", k: 0}` | Throws `k must be an integer between 1 and 200`. |
| **MCP-64** | `k` above range | 1. Call with `{area: "M1 1AE", k: 201}` | Throws `k must be an integer between 1 and 200`. |
| **MCP-65** | `k` non-integer | 1. Call with `{area: "M1 1AE", k: 5.5}` | Throws `k must be an integer between 1 and 200`. |
| **MCP-66** | `k` omitted → not sent | 1. Call without `k` | Request body has no `k` field (server default applies). |
| **MCP-67** | API error passthrough | 1. API returns an HTTP error | Returns `{ isError: true }` with `OneGoodArea API error (HTTP <status>): <message>`. |

---

## 10. `watch_portfolio` — `POST /v1/portfolios` + `POST /v1/portfolios/:id/areas`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-68** | Happy path | 1. Call with `{name: "North West BTL", areas: ["M1 1AE", "M14 5TP"]}` | POSTs `/v1/portfolios` `{name}`, then `/v1/portfolios/:id/areas` `{areas: [{area}, ...]}`. Returns `# Portfolio: North West BTL`, the `**ID:**`, tracked-areas list, and a `get_portfolio_changes` hint. |
| **MCP-69** | Missing `name` | 1. Call with `{areas: ["M1 1AE"]}` | Throws `name must be a non-empty string`. |
| **MCP-70** | Missing / empty `areas` | 1. Call with `{name: "X", areas: []}` | Throws `areas must be a non-empty array`. |
| **MCP-71** | `name` over 200 chars | 1. Call with a 201-char name | Throws `name must be 200 characters or fewer`. |
| **MCP-72** | More than 100 areas | 1. Call with 101 areas | Throws `areas must contain at most 100 entries`. |
| **MCP-73** | Blank area member | 1. Include `"  "` in `areas` | Throws `every area must be a non-empty string`. |
| **MCP-74** | Area member over 100 chars | 1. Include a 101-char member | Throws `each area must be 100 characters or fewer`. |
| **MCP-75** | Create OK but add fails → partial state | 1. `POST /v1/portfolios` succeeds, `POST .../areas` fails | Returns `isError: true` but still shows `# Portfolio: <name>`, the new `**ID:**`, `**Areas tracked: 0**`, the add-step error, and retry guidance. |
| **MCP-76** | Create fails → early abort | 1. `POST /v1/portfolios` returns an HTTP error | Returns `isError: true` with `OneGoodArea API error (HTTP <status>) creating portfolio: <message>`. Add step never runs. |
| **MCP-77** | Auth propagated on both calls | 1. Inspect both outbound POSTs | Each carries `Authorization: Bearer <key>` and the standard headers. |

---

## 11. `get_portfolio_changes` — `POST /v1/portfolios/:id/changes`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-78** | Happy path (defaults) | 1. Call with `{portfolio_id: "ptf_123"}` | POSTs `/v1/portfolios/ptf_123/changes` with `emit:false` and no optional overrides. Returns `# Portfolio changes · ptf_123`, baseline/threshold/min-transactions scope, counts, and the per-area change table. |
| **MCP-79** | No material changes | 1. API returns `changes: []` | Renders `No material signal changes detected for this portfolio with the current threshold.` |
| **MCP-80** | Missing `portfolio_id` | 1. Call with `{}` | Throws `portfolio_id must be a non-empty string`. |
| **MCP-81** | `threshold_pct` negative | 1. Call with `{portfolio_id: "ptf_123", threshold_pct: -1}` | Throws `threshold_pct must be a non-negative number`. |
| **MCP-82** | `baseline` invalid | 1. Call with `{portfolio_id: "ptf_123", baseline: "latest"}` | Throws `baseline must be 'previous' or 'first'`. |
| **MCP-83** | `min_transactions` negative | 1. Call with `{portfolio_id: "ptf_123", min_transactions: -5}` | Throws `min_transactions must be a non-negative number`. |
| **MCP-84** | Optional overrides forwarded | 1. Call with `{portfolio_id: "ptf_123", baseline: "first", threshold_pct: 10, min_transactions: 30}` | All three appear in the POST body alongside `emit: false`. |
| **MCP-85** | Webhooks never fired on probe | 1. Inspect the POST body | `emit: false` is always set — the probe call does not trigger customer webhooks. |
| **MCP-86** | API error passthrough | 1. API returns an HTTP error (e.g. `404` unknown portfolio) | Returns `{ isError: true }` with `OneGoodArea API error (HTTP <status>): <message>`. |

---

## 12. `area_brief` — `GET /v1/area` + `POST /v1/score?explain=true`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-87** | Happy path | 1. Call with `{area: "SW1A 1AA", audience: "lender"}` | Fires `GET /v1/area` and `POST /v1/score?explain=true` in parallel, then renders the audience-shaped brief (verdict, audience-relevant dimensions + signals with provenance, recommendations, data sources). |
| **MCP-88** | Missing `area` | 1. Call with `{audience: "lender"}` | Throws `area must be a non-empty string`. |
| **MCP-89** | Missing `audience` | 1. Call with `{area: "SW1A 1AA"}` | Throws `audience must be one of: lender, insurer, retailer, investor`. |
| **MCP-90** | Invalid `audience` | 1. Call with `{area: "SW1A 1AA", audience: "bank"}` | Throws `audience must be one of: lender, insurer, retailer, investor`. |
| **MCP-91** | `area` over 100 chars | 1. Call with a 101-char `area` | Throws `area must be 100 characters or fewer`. |
| **MCP-92** | Audience → preset mapping | 1. Call once per audience and inspect the `/v1/score` preset | `lender` → `moving`; `insurer` → `investing`; `retailer` → `business`; `investor` → `investing`. |
| **MCP-93** | Either sub-call failing → error | 1. Make `/v1/area` (or `/v1/score`) reject | `Promise.all` rejects; returns `{ isError: true }` with `OneGoodArea API error (HTTP <status>): <message>`. |
| **MCP-94** | Two API calls per invocation | 1. Count outbound requests for one `area_brief` call | Exactly two: one `GET /v1/area`, one `POST /v1/score?explain=true`. |

---

## 13. `methodology_for` — static lookup (no network)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-95** | Exact-match dimension | 1. Call with `{dimension: "Safety & Crime"}` | Returns markdown `# Safety & Crime` with `**Used in intents:**` (derived from non-zero weights), `**Data source:**`, `## How it scores`, `## Weight per intent`, and the methodology URL. No network call. |
| **MCP-96** | Partial / case-insensitive match | 1. Call with `{dimension: "safety"}` | Matches `Safety & Crime` via substring match (`findDimension`). |
| **MCP-97** | Unknown dimension | 1. Call with `{dimension: "vibes"}` | Returns `{ isError: true }` with `No methodology found for "vibes". Available dimensions: <list>`. |
| **MCP-98** | Missing `dimension` | 1. Call with `{}` | Throws `dimension must be a non-empty string`. |
| **MCP-99** | Blank `dimension` | 1. Call with `{dimension: "   "}` | Throws `dimension must be a non-empty string`. |
| **MCP-100** | Intents derived from weights, not static list | 1. Call for a dimension whose non-zero weights span more presets than its static `intents` field | `**Used in intents:**` lists every preset with weight > 0 (AR-391), so the header cannot drift from the weights table. |
| **MCP-101** | No quota cost | 1. Call the tool with an invalid/entitled key | Executes without any `/v1/*` HTTP call — purely local data. |

---

## 14. `engine_version` — static lookup (no network)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MCP-102** | Happy path | 1. Call `engine_version` (no args) | Returns `# OneGoodArea engine 2.0.2`, `Released: 2026-05-14`, a `## Changelog` section listing each entry (2.0.2, 2.0.1, 2.0.0, 1.x), and the methodology URL. |
| **MCP-103** | Takes no arguments | 1. Inspect the tool's `inputSchema` | `properties: {}`, `additionalProperties: false`; ignores any supplied args. |
| **MCP-104** | No network / no quota cost | 1. Call the tool | No `/v1/*` HTTP call is made; data comes from the static `ENGINE` constant. |

---

## Test Environment Notes

- **Package:** `@oga-mcp/server`, server version `1.0.3` (`SERVER_VERSION` in `mcp/src/server.ts`).
- **Engine (static snapshot):** v2.0.2, released 2026-05-14 (`ENGINE` in `mcp/src/methodology-data.ts`). The live engine version is echoed from each `/v1/score` and `/v1/area` response.
- **Transport:** stdio (`StdioServerTransport`).
- **Default API base:** `https://onegoodarea.onrender.com` (override via `OOGA_API_BASE`).
- **Auth:** `OOGA_API_KEY` env var (must start with `oga_`) sent as `Authorization: Bearer <key>` on every REST call.
- **Timeouts:** `/v1/me` uses a 10s abort; all tool calls default to a 60s abort (engine can take 15–45s on cache miss).
- **Env flags:** `OOGA_SKIP_ENTITLEMENT_CHECK=1` skips the `/v1/me` gate (dev only); `OOGA_API_BASE` overrides the base URL.
- **Error contract:** API HTTP errors surface as `OneGoodArea API error (HTTP <status>): <message>` with `isError: true`; other failures surface as `Tool error: <message>`.
- **REST endpoints proxied:**
  - `GET /v1/me` — entitlement + plan
  - `POST /v1/score?explain=true` — score an area
  - `GET /v1/area?area=<area>` — full signals catalog
  - `GET /v1/signals/:category?area=<area>` — one signal category
  - `POST /v1/query` — natural-language plan
  - `POST /v1/peers` — k-NN peers
  - `POST /v1/portfolios` + `POST /v1/portfolios/:id/areas` — Monitor setup
  - `POST /v1/portfolios/:id/changes` — change detection (`emit:false`)
