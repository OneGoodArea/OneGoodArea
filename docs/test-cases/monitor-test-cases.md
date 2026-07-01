# Monitor (Portfolios) — Test Cases

> **Source:** OneGoodArea API (Engine v2.0.2)
> **Endpoints covered:** `POST /v1/portfolios`, `GET /v1/portfolios`, `GET /v1/portfolios/:id`, `DELETE /v1/portfolios/:id`, `POST /v1/portfolios/:id/areas`, `POST /v1/portfolios/:id/enrich`, `POST /v1/portfolios/:id/changes`, `GET /v1/portfolios/:id/changes`, plus the webhook subscription surface (`POST/GET/DELETE /v1/webhooks`, `POST /v1/webhooks/:id/rotate-secret`) that receives `signal.changed`.
> **Last updated:** 2026-07-01

## Scope

Covers the Monitor product: portfolio CRUD lifecycle, bulk-adding tracked areas (with the per-call cap), bulk enrichment (scoring every area), and change detection (diff vs a baseline period, threshold + sample-size gating, and the `signal.changed` webhook fan-out with its signed envelope). Also covers the auth/feature gates that wrap every route. Does **not** cover the scoring engine internals (see the scoring/area test plans) or the dashboard UI.

All Monitor routes are dark-flagged behind the `OGA_SIGNALS_API` feature flag (`getConfig().signalsApiEnabled`) and are scoped to the authenticated api-key's `user_id` (ownership). Every non-existent or non-owned portfolio returns 404 (there is no 403 for cross-user access — a portfolio you don't own is indistinguishable from one that doesn't exist).

### Source files validated against

| Layer | File |
|-------|------|
| Portfolio route handlers | `apps/api/src/routes/portfolios.ts` |
| Portfolio module (CRUD + enrich) | `apps/api/src/modules/monitor/portfolio.ts` |
| Change detection (pure diff + I/O) | `apps/api/src/modules/monitor/change-detection.ts` |
| Webhook signing / delivery / CRUD | `apps/api/src/modules/webhooks/index.ts` |
| Webhook route handlers | `apps/api/src/routes/webhooks.ts` |
| Auth / rate-limit / plan gate | `apps/api/src/shared/auth-api.ts` |
| Monitor DTOs (contracts) | `packages/contracts/src/portfolios.ts` |

### Key constants (from code)

- `PORTFOLIO_ADD_MAX = 200` (max areas per `/areas` call — see note in ADD-04)
- `PORTFOLIO_ENRICH_MAX = 50` (max areas scored per enrich call)
- `ENRICH_CONCURRENCY = 5`, `RESOLVE_CONCURRENCY = 5`
- `DEFAULT_THRESHOLD_PCT = 5`, `DEFAULT_MIN_TRANSACTIONS = 8`, `CHANGE_AREA_MAX = 100`
- Webhook signing: HMAC-SHA256 over `t=<unix-seconds>.<raw-body>`, header `X-OneGoodArea-Signature: t=<ts>,v1=<hex>`, secret prefix `whsec_`, delivery timeout 5000 ms
- Supported webhook event types: `signal.changed` (the only live event)

---

## 1. Feature Gate & Auth

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MON-GATE-01** | Signals API disabled → 404 | 1. Set `OGA_SIGNALS_API=false` (or unset)<br>2. Call any `/v1/portfolios*` endpoint with a valid key | Returns **404** `{ error: "Not found" }`. The `guardSignals`/`guardSignalsCtx` short-circuit before auth runs. |
| **MON-GATE-02** | Missing Bearer token → 401 | 1. Enable signals API<br>2. `GET /v1/portfolios` with no `Authorization` header | **401** `{ error: "Missing API key. Use: Authorization: Bearer oga_..." }`. |
| **MON-GATE-03** | Invalid / revoked key → 401 | 1. Send `Authorization: Bearer oga_invalid` | **401** `{ error: "Invalid or revoked API key" }`. |
| **MON-GATE-04** | IP not in key allowlist → 403 | 1. Use a key with a non-empty `allowed_ip_cidrs` from a disallowed IP | **403** `{ error: "Request IP is not in the key's allowlist.", code: <blocked> }`. |
| **MON-GATE-05** | Plan lacks API access → 403 | 1. Authenticate with a key whose plan has no API access (`hasApiAccess` false) | **403** `{ error: "API access not available on your current plan. Upgrade at /pricing." }`. |
| **MON-GATE-06** | Per-key rate limit → 429 | 1. Exceed the per-key budget (`RATE_LIMITS.apiReport`, 30 req/min)<br>2. Send one more request | **429** `{ error: "Too many requests. Rate limit: 30 requests per minute." }`. Rate-limit headers present on the reply. |
| **MON-GATE-07** | Ownership isolation | 1. User A creates portfolio `pf_x`<br>2. User B (different key) calls `GET /v1/portfolios/pf_x` | **404** `{ error: "Portfolio not found" }`. Every query filters on `user_id`; B can never see or mutate A's portfolios. |

---

## 2. Create Portfolio — `POST /v1/portfolios`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PORT-01** | Create with valid name | 1. `POST /v1/portfolios` body `{ "name": "London investments" }` | **201** with `{ id, name, area_count: 0 }`. `id` is prefixed `pf`. `api.portfolio.created` event tracked. |
| **PORT-02** | Missing name | 1. `POST /v1/portfolios` body `{}` | **400** `{ error: "Missing required 'name'." }`. |
| **PORT-03** | Whitespace-only name | 1. Body `{ "name": "   " }` | **400** `{ error: "Missing required 'name'." }` (name is `.trim()`-ed, then empty). |
| **PORT-04** | Non-string name | 1. Body `{ "name": 123 }` | **400** `{ error: "Missing required 'name'." }` (only `typeof === "string"` is accepted). |
| **PORT-05** | Name too long (>200 chars) | 1. Body `{ "name": "<201 chars>" }` | **400** `{ error: "name too long (max 200 chars)." }`. |
| **PORT-06** | Name exactly 200 chars | 1. Body `{ "name": "<200 chars>" }` | **201** created (boundary is inclusive at 200). |

---

## 3. List & Get Portfolios

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PORT-07** | List portfolios | 1. `GET /v1/portfolios` | **200** `{ portfolios: [...] }`. Each item: `{ id, name, area_count, created_at }`. Ordered by `created_at DESC`. `area_count` is a computed COUNT of joined `portfolio_areas`. |
| **PORT-08** | List is user-scoped | 1. User A has 2 portfolios, User B has 1<br>2. Each lists | A sees only A's 2; B sees only B's 1. |
| **PORT-09** | Empty list | 1. New user with no portfolios calls `GET /v1/portfolios` | **200** `{ portfolios: [] }`. |
| **PORT-10** | Get portfolio detail | 1. `GET /v1/portfolios/:id` for an owned portfolio | **200** `{ id, name, created_at, area_count, areas: [...] }`. `areas` ordered by `created_at`; each area `{ id, area, label, created_at }`. |
| **PORT-11** | Get non-existent / non-owned | 1. `GET /v1/portfolios/pf_missing` | **404** `{ error: "Portfolio not found" }`. |

---

## 4. Delete Portfolio — `DELETE /v1/portfolios/:id`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PORT-12** | Delete owned portfolio | 1. `DELETE /v1/portfolios/:id` for an owned portfolio | **200** `{ deleted: true }`. Deletes `portfolio_areas` rows first, then the portfolio row. |
| **PORT-13** | Delete non-owned / missing | 1. `DELETE /v1/portfolios/pf_missing` | **404** `{ error: "Portfolio not found" }`. No rows deleted. |
| **PORT-14** | Delete cascades areas | 1. Create a portfolio, add areas<br>2. Delete it<br>3. Verify `portfolio_areas` | All tracked areas for that portfolio removed. |
| **PORT-15** | Delete then get | 1. Delete a portfolio<br>2. `GET /v1/portfolios/:id` | **404** `{ error: "Portfolio not found" }`. |

---

## 5. Add Areas — `POST /v1/portfolios/:id/areas`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PORT-16** | Add areas happy path | 1. `POST /v1/portfolios/:id/areas` body `{ "areas": [{ "area": "M1 1AE", "label": "office" }, { "area": "SW1A 1AA" }] }` | **200** `{ added: 2, portfolio: <PortfolioDetail> }`. `label` optional (defaults `null`). `api.portfolio.areas_added` tracked with `added` count. |
| **PORT-17** | Response echoes full detail | 1. Add areas to a portfolio<br>2. Inspect response `.portfolio` | Full `PortfolioDetail` (id, name, area_count, areas[]) returned alongside `added` (AR-386 — saves a second round-trip). |
| **PORT-18** | Dedup on (portfolio_id, area) | 1. Add `M1 1AE` twice (same call or two calls) | Second insert is a no-op (`ON CONFLICT (portfolio_id, area) DO NOTHING`). `added` counts only rows actually inserted (e.g. adding an existing area returns `added: 0`). |
| **PORT-19** | Empty / missing areas array | 1. Body `{}` or `{ "areas": [] }` | **400** `{ error: "Body must be { areas: [{ area, label? }, ...] }." }`. |
| **PORT-20** | Non-array areas | 1. Body `{ "areas": "M1 1AE" }` | **400** `{ error: "Body must be { areas: [...] }." }`. |
| **PORT-21** | Area with empty/blank string | 1. Body `{ "areas": [{ "area": "  " }] }` | **400** `{ error: "Each area needs a non-empty 'area' string." }`. |
| **PORT-22** | Area missing 'area' key | 1. Body `{ "areas": [{ "label": "x" }] }` | **400** `{ error: "Each area needs a non-empty 'area' string." }`. |
| **PORT-23** | Bulk-add cap enforced | 1. Body with **201** area objects (> `PORTFOLIO_ADD_MAX` = 200) | **400** `{ error: "Too many areas (201); max 200 per call." }`. |
| **PORT-24** | Bulk-add at cap | 1. Body with exactly 200 area objects | **200**, all inserted (boundary inclusive; guard is `length > PORTFOLIO_ADD_MAX`). |
| **PORT-25** | Add to non-owned portfolio | 1. `POST /v1/portfolios/pf_missing/areas` with valid body | **404** `{ error: "Portfolio not found" }` (ownership checked in `addAreas`). |
| **PORT-26** | Area strings are trimmed | 1. Body `{ "areas": [{ "area": "  M1 1AE  " }] }` | Stored/deduped as `"M1 1AE"` (trimmed before insert). |

> **Note (ADD-cap discrepancy):** the route enforces `PORTFOLIO_ADD_MAX = 200`, but the contract `AddAreaRequestSchema` caps the array at `.max(100)`. The task brief and the "max 100" figure come from the contract; the live route currently accepts up to 200. Test both boundaries and flag the mismatch.

---

## 6. Enrich Portfolio — `POST /v1/portfolios/:id/enrich`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PORT-27** | Enrich with default preset | 1. `POST /v1/portfolios/:id/enrich` body `{}` | **200** `{ count, results: [...] }`. Default preset `research`. Each result `{ area, label, score, error }`. `X-Engine-Version` header set. `api.portfolio.enriched` tracked. |
| **PORT-28** | Enrich with explicit preset | 1. Body `{ "preset": "investing" }` | **200**. Preset must be one of `moving`, `business`, `investing`, `research`. |
| **PORT-29** | Invalid preset | 1. Body `{ "preset": "vacation" }` | **400** `{ error: "preset must be one of: moving, business, investing, research." }`. |
| **PORT-30** | Enrich caps at 50 areas | 1. Portfolio with 60 tracked areas<br>2. Enrich | Only the first `PORTFOLIO_ENRICH_MAX = 50` areas (by `created_at` order) are scored; `count` ≤ 50. |
| **PORT-31** | Per-area failure isolated | 1. Portfolio containing an unresolvable area (e.g. junk string)<br>2. Enrich | That row returns `{ score: null, error: "Could not resolve area" }` (or `"Enrichment failed"` on a thrown error); the whole call still returns **200** with other areas scored. |
| **PORT-32** | Enrich non-owned portfolio | 1. `POST /v1/portfolios/pf_missing/enrich` | **404** `{ error: "Portfolio not found" }`. |
| **PORT-33** | Enrich empty portfolio | 1. Portfolio with 0 areas<br>2. Enrich | **200** `{ count: 0, results: [] }`. |

---

## 7. Change Detection — `POST /v1/portfolios/:id/changes`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MON-CHG-01** | Detect changes with defaults | 1. `POST /v1/portfolios/:id/changes` body `{}` | **200** `ChangeReport`: `{ portfolio_id, baseline: "previous", threshold_pct: 5, min_transactions: 8, areas_checked, material_count, changes: [...], generated_at }`. `X-Engine-Version` header set. `api.portfolio.changes_checked` tracked with `material` count. |
| **MON-CHG-02** | Only material changes returned | 1. Trigger detection where some signals moved <5% and some ≥5% | `changes[]` contains only rows with `material: true` (`\|pct_change\| >= threshold_pct`). Sub-threshold moves are dropped from the array. |
| **MON-CHG-03** | Baseline = "first" | 1. Body `{ "baseline": "first" }` | Compares latest period vs the **oldest** in range (rather than the immediately prior period). Report echoes `baseline: "first"`. |
| **MON-CHG-04** | Baseline = "previous" (default) | 1. Body `{ "baseline": "previous" }` or omit | Compares latest vs the immediately prior period. |
| **MON-CHG-05** | Invalid baseline | 1. Body `{ "baseline": "latest" }` | **400** `{ error: "baseline must be 'previous' or 'first'." }`. |
| **MON-CHG-06** | Custom threshold_pct | 1. Body `{ "threshold_pct": 10 }` | Only moves with `\|pct_change\| >= 10` are material. Report echoes `threshold_pct: 10`. |
| **MON-CHG-07** | threshold_pct = 0 | 1. Body `{ "threshold_pct": 0 }` | Any non-zero move is material (`\|pct_change\| >= 0`). Accepted (non-negative). |
| **MON-CHG-08** | Negative threshold_pct | 1. Body `{ "threshold_pct": -1 }` | **400** `{ error: "threshold_pct must be a non-negative number." }`. |
| **MON-CHG-09** | Non-numeric threshold_pct | 1. Body `{ "threshold_pct": "high" }` | **400** `{ error: "threshold_pct must be a non-negative number." }` (`Number()` → NaN, not finite). |
| **MON-CHG-10** | Sample-size gate drops small-sample price move | 1. `property.median_price` swings ≥ threshold but one/both periods have `transaction_count` < `min_transactions` (default 8) | That change is dropped — not material. Only price moves whose backing `property.transaction_count` clears `min_transactions` in **both** periods survive. |
| **MON-CHG-11** | min_transactions = 0 disables gating | 1. Body `{ "min_transactions": 0 }` | No sample-size gating; a price move on 2 sales can count if it clears threshold. Report echoes `min_transactions: 0`. |
| **MON-CHG-12** | Custom min_transactions | 1. Body `{ "min_transactions": 20 }` | Price moves require ≥20 transactions in both periods. Report echoes `min_transactions: 20`. |
| **MON-CHG-13** | Negative min_transactions | 1. Body `{ "min_transactions": -5 }` | **400** `{ error: "min_transactions must be a non-negative number." }`. |
| **MON-CHG-14** | Sample series never alerts | 1. Portfolio tracking areas with `property.transaction_count` history | `property.transaction_count` (a `SAMPLE_SIGNALS` member) is never itself a change subject — it only gates `property.median_price`. No `signal.changed` row for the count series. |
| **MON-CHG-15** | Static signal never changes | 1. Track areas whose only signal is `deprivation.*` (static, one period) | No changes (needs ≥2 distinct periods to diff; `diffSeries` returns null with <2 points). |
| **MON-CHG-16** | Unresolvable areas dropped | 1. Portfolio contains a junk area string that won't geocode | It's silently dropped from `areas_checked`; detection continues for the rest (`resolveAreasToLsoa` swallows geocode failures with a warn log). |
| **MON-CHG-17** | Area cap at 100 | 1. Portfolio with 120 tracked areas | Only the first `CHANGE_AREA_MAX = 100` areas are resolved + checked. |
| **MON-CHG-18** | direction field | 1. Trigger up, down, and flat moves | Each `SignalChange` has `direction` = `up` (delta>0), `down` (delta<0), or `flat` (delta==0 or null). |
| **MON-CHG-19** | pct_change null when baseline is 0/absent | 1. A signal whose `value_from` is 0 or null | `pct_change: null`, `material: false` (can't compute a percentage). |
| **MON-CHG-20** | Detect on non-owned portfolio | 1. `POST /v1/portfolios/pf_missing/changes` | **404** `{ error: "Portfolio not found" }`. |

---

## 8. Change Probe (read-only) — `GET /v1/portfolios/:id/changes`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MON-CHG-21** | Read-only probe fires no webhooks | 1. `GET /v1/portfolios/:id/changes` (no body) | **200** same `ChangeReport` shape as POST, but `emit: false` internally — **no** `signal.changed` webhooks are sent. Safe for dashboards/previews (AR-399). |
| **MON-CHG-22** | Probe uses defaults | 1. `GET /v1/portfolios/:id/changes` | Uses default baseline `previous`, threshold 5%, min_transactions 8 (no body params accepted on GET). |
| **MON-CHG-23** | Probe does not track/emit side effects | 1. Subscribe to `signal.changed`<br>2. `GET .../changes` with material moves present | Report lists material changes, but **no** webhook delivery is attempted (unlike POST). |
| **MON-CHG-24** | Probe on non-owned portfolio | 1. `GET /v1/portfolios/pf_missing/changes` | **404** `{ error: "Portfolio not found" }`. |

---

## 9. Webhook Fan-out (`signal.changed`)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MON-WH-01** | POST /changes fires webhook on material change | 1. Subscribe a HTTPS URL to `signal.changed`<br>2. `POST /v1/portfolios/:id/changes` with `emit` default (true) and ≥1 material change | Each material change POSTed to the subscribed URL. Envelope `{ id, type: "signal.changed", created, data }` where `data` = `{ portfolio_id, ...SignalChange }`. |
| **MON-WH-02** | emit=false suppresses webhooks | 1. `POST .../changes` body `{ "emit": false }` with material changes present | **200** report returned, but no webhook deliveries attempted. |
| **MON-WH-03** | No material changes → no webhooks | 1. `POST .../changes` when `material_count = 0` | No deliveries (fan-out only runs when `changes.length > 0`). |
| **MON-WH-04** | HMAC signature header | 1. Receive a delivery<br>2. Inspect headers | `X-OneGoodArea-Signature: t=<unix>,v1=<hex>` where `v1 = HMAC-SHA256(secret, "<t>.<raw-body>")`. Also `X-OneGoodArea-Event: signal.changed`, `X-OneGoodArea-Delivery: whd_...`, `User-Agent: OneGoodArea-Webhooks/1.0`. |
| **MON-WH-05** | Signature verifies with subscription secret | 1. Recompute HMAC-SHA256 over `t.body` with the `whsec_` secret<br>2. Compare with `v1` | Values match (Stripe-style signing). |
| **MON-WH-06** | Delivery timeout | 1. Subscriber URL hangs > 5000 ms | Delivery aborts (`AbortSignal.timeout(5000)`), recorded `status: "failed"`, `last_failure_at` updated. Never breaks the change-detection call path. |
| **MON-WH-07** | Delivery recorded per subscription | 1. Two active subscriptions to `signal.changed`<br>2. Fire a change | One `webhook_deliveries` row per subscription; success rows get `delivered_at` + `last_success_at`. |
| **MON-WH-08** | Only matching + active subs receive | 1. One active sub to `signal.changed`, one revoked sub, one active sub to a different event | Only the active sub subscribed to `signal.changed` is delivered to. |
| **MON-WH-09** | Webhook errors don't fail the API call | 1. All subscriber URLs error/time out<br>2. `POST .../changes` | The `/changes` call still returns **200** with the report (`fireWebhookEvent` swallows errors; deliveries done via `Promise.allSettled`). |

---

## 10. Webhook Subscription CRUD (`/v1/webhooks`)

> These routes use `requireApiAccess` (user scope, no org). They are **not** behind `OGA_SIGNALS_API`, but are the receiving end of Monitor's `signal.changed`, so they're covered here.

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **MON-WH-10** | Create subscription | 1. `POST /v1/webhooks` body `{ "url": "https://example.com/hooks", "events": ["signal.changed"] }` | **201** `{ id, url, events, secret, created_at }`. `secret` (prefix `whsec_`) returned **once**, never recoverable. |
| **MON-WH-11** | Reject non-HTTPS URL | 1. Body with `"url": "http://example.com/h"` | **400** `{ error: "Webhook URL must use HTTPS" }`. |
| **MON-WH-12** | Reject private / localhost URL | 1. `url` = `https://localhost/h` or `https://192.168.0.1/h` | **400** `{ error: "Webhook URL cannot point at localhost or a private network" }`. Blocks localhost, 127.0.0.1, 0.0.0.0, ::1, 10.*, 192.168.*, 169.254.*, 172.16–31.*. |
| **MON-WH-13** | Reject unknown event types | 1. Body `{ "url": "https://x.com", "events": ["order.created"] }` | **400** `{ error: "events must be a non-empty array of supported types: 'signal.changed'" }` (unsupported types filtered → empty → rejected). |
| **MON-WH-14** | List subscriptions | 1. `GET /v1/webhooks` | **200** `{ subscriptions: [...] }` — active only, ordered `created_at DESC`. Each `{ id, url, events, status, created_at, last_success_at, last_failure_at }`. |
| **MON-WH-15** | Delete (revoke) subscription | 1. `DELETE /v1/webhooks/:id` | **200** `{ id, status: "revoked" }`. Sets `status='revoked'` (soft delete). |
| **MON-WH-16** | Delete non-owned / already-revoked | 1. `DELETE /v1/webhooks/whsub_missing` | **404** `{ error: "Webhook subscription not found or already revoked" }`. |
| **MON-WH-17** | Rotate signing secret | 1. `POST /v1/webhooks/:id/rotate-secret` | **200** `{ id, secret: "whsec_..." }`. New secret returned once; the old secret stops verifying immediately (in-flight retries will fail verification). |
| **MON-WH-18** | Rotate non-owned / revoked | 1. `POST /v1/webhooks/whsub_missing/rotate-secret` | **404** `{ error: "Webhook subscription not found or already revoked" }`. |

---

## Test Environment Notes

- **API surface:** Fastify, `/v1/*` Bearer-authenticated routes.
- **Feature flag:** `OGA_SIGNALS_API=true` (env → `getConfig().signalsApiEnabled`) required for all `/v1/portfolios*` routes; otherwise 404.
- **Auth:** `Authorization: Bearer oga_...`; gate chain = authenticate → per-key rate limit (`RATE_LIMITS.apiReport`, 30/min) → plan API access.
- **Scoping:** all portfolio rows scoped by `user_id` (ownership); org re-scope deferred to Levers (ADR 0009).
- **ID prefixes:** portfolios `pf_`, portfolio areas `pfa_`, webhook subs `whsub_`, deliveries `whd_`, events `evt_`.
- **Webhook signing:** HMAC-SHA256, header `X-OneGoodArea-Signature: t=<ts>,v1=<hex>`, 5s delivery timeout.
- **Error envelope:** app errors → `{ error, code }` at their status code; unexpected errors → 500 `{ error: "Internal server error" }`.
