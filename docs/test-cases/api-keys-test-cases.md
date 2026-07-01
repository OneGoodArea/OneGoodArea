# API Keys, Usage & Entitlements — Test Cases

> **Source:** OneGoodArea API (Engine v2.0.2)
> **Endpoints covered:** `GET /keys`, `POST /keys`, `DELETE /keys/:id`, `GET /keys/usage`, `GET /usage`, `GET /v1/me`
> **Last updated:** 2026-07-01

## Scope

Covers the session-authenticated API-key management surface (list / create / revoke), the per-key usage-analytics dashboard, the session usage/entitlement check, and the programmatic `GET /v1/me` profile endpoint (plan, entitlements, org branding, and per-key IP allowlist). Does **not** cover the per-key training-data opt-out toggle (`PATCH /keys/:id`, AR-385) beyond noting its presence in payloads, nor the browser authentication lifecycle (see `auth-test-cases.md`).

**Auth models in play (two distinct gates):**

- **Session (JWT bridge)** — `GET /keys`, `POST /keys`, `DELETE /keys/:id`, `GET /keys/usage`, `GET /usage`. Requires `Authorization: Bearer <session-token>` minted by apps/web from the NextAuth session. Missing/invalid → `401 { "error": "Unauthorized" }`.
- **API key (programmatic)** — `GET /v1/me`. Requires `Authorization: Bearer oga_...`. Missing/malformed → `401`; invalid/revoked → `401`; IP outside allowlist → `403`.

### Source files validated against

| Layer | File |
|-------|------|
| Key management routes | `apps/api/src/routes/api-keys.ts` |
| `/v1/me`, `/usage`, `/dashboard` routes | `apps/api/src/routes/me.ts` |
| Key module (create/list/revoke/validate) | `apps/api/src/modules/api-keys/index.ts` |
| Key DAL repository | `apps/api/src/infrastructure/db/dal/repositories/api-key-repository.ts` |
| Plan entitlements & quotas | `apps/api/src/modules/usage/index.ts` |
| Plan catalog (`PLANS`, `API_PLANS`) | `apps/api/src/modules/billing/plans.ts` |
| Session auth (JWT bridge) | `apps/api/src/shared/auth-session.ts` |
| Route registration | `apps/api/src/app.ts` |

### Key facts grounded in code

- New keys use the `oga_` prefix: `oga_` + `crypto.randomBytes(24).toString("hex")` (48 hex chars).
- Keys are stored as SHA-256 hashes plus a display prefix; plaintext is returned **once** on create and never persisted.
- `key_preview` = first 12 chars + `...` + last 4 (e.g. `oga_a1b2c3d4...9f2e`).
- Legacy `aiq_`-prefixed keys still validate (validation is a pure hash lookup, no prefix gate).
- API access (`hasApiAccess`) is granted to `API_PLANS`: `developer`, `business`, `growth` (v1) and `sandbox`, `starter_v2`, `build`, `scale`, `growth_v2`, `enterprise` (v2). Superusers always pass.

---

## 1. List API Keys — `GET /keys`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **KEY-01** | List keys — authenticated | 1. Send `GET /keys` with a valid session Bearer token | `200 { "keys": [...] }`. Each key: `id`, `key_preview`, `name`, `created_at`, `last_used_at`, `training_optout`. Only non-revoked keys (`revoked = FALSE`), ordered `created_at DESC`. |
| **KEY-02** | List keys — no keys yet | 1. Authenticate as a user who has created no keys<br>2. `GET /keys` | `200 { "keys": [] }`. |
| **KEY-03** | List keys — unauthenticated | 1. `GET /keys` with no `Authorization` header | `401 { "error": "Unauthorized" }`. |
| **KEY-04** | List keys — invalid session token | 1. `GET /keys` with `Authorization: Bearer garbage` | `401 { "error": "Unauthorized" }` (session token fails to verify). |
| **KEY-05** | List keys excludes revoked keys | 1. Create a key, then revoke it<br>2. `GET /keys` | Revoked key is absent from `keys` (DAL filters `revoked = FALSE`). |
| **KEY-06** | `key_preview` never exposes full secret | 1. Inspect any entry in `keys` | `key_preview` is the truncated prefix form (`oga_xxxxxxxx...xxxx`), never the full key or hash. |
| **KEY-07** | Server error handling | 1. Simulate a DB failure during `listApiKeys` | `500 { "error": "Something went wrong. Please try again." }`. |

---

## 2. Create API Key — `POST /keys` (plan-gated)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **KEY-08** | Create key — API-enabled plan | 1. Authenticate as a user on an `API_PLANS` tier (e.g. `sandbox`)<br>2. `POST /keys` with body `{ "name": "CI key" }` | `200 { "key": { "id", "key", "name" } }`. `key` starts with `oga_` and is the full 48-hex-char plaintext. |
| **KEY-09** | Create key — default name | 1. `POST /keys` with empty body `{}` | `200`. `key.name = "Default"` (falls back when `name` absent/empty). |
| **KEY-10** | Plaintext key returned only once | 1. Create a key, capture `key.key`<br>2. `GET /keys` and `GET /keys/usage` | The full plaintext key is never returned again — only `key_preview`. Server stores a SHA-256 hash, not the plaintext. |
| **KEY-11** | Key prefix format | 1. Create a key<br>2. Inspect `key.key` | Format `oga_` + 48 lowercase hex chars (`crypto.randomBytes(24)`). |
| **KEY-12** | Create key — plan without API access | 1. Authenticate as a user whose plan is **not** in `API_PLANS`<br>2. `POST /keys` | `403 { "error": "API keys are not available on your current plan. Upgrade at /pricing." }`. No key created. |
| **KEY-13** | Create key — superuser override | 1. Authenticate as a superuser (`users.is_superuser = TRUE`)<br>2. `POST /keys` | `200`. `hasApiAccess` short-circuits `true` for superusers regardless of plan. |
| **KEY-14** | Create key — unauthenticated | 1. `POST /keys` with no `Authorization` header | `401 { "error": "Unauthorized" }`. Plan gate never reached. |
| **KEY-15** | Create key — server error handling | 1. Simulate a DB failure during `createApiKey` | `500 { "error": "Something went wrong. Please try again." }`. |

---

## 3. Revoke API Key — `DELETE /keys/:id`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **KEY-16** | Revoke own key | 1. Create a key `id`<br>2. `DELETE /keys/:id` as the owner | `200 { "success": true }`. Row set `revoked = TRUE`; key no longer appears in `GET /keys`. |
| **KEY-17** | Revoked key stops validating | 1. Revoke a key<br>2. Use its plaintext against `GET /v1/me` | `401 { "error": "Invalid or revoked API key" }` (`findByHash` filters `revoked = FALSE`). |
| **KEY-18** | Revoke non-owned key → 404 | 1. Authenticate as user A<br>2. `DELETE /keys/:id` where `id` belongs to user B | `404 { "error": "Key not found" }`. The DAL `revoke` is owner-scoped (`WHERE id = :id AND user_id = :userId`); no row updated → returns false → 404. **Not 403** (avoids leaking whether the ID exists). |
| **KEY-19** | Revoke non-existent key → 404 | 1. `DELETE /keys/does-not-exist` | `404 { "error": "Key not found" }`. |
| **KEY-20** | Revoke already-revoked key | 1. Revoke a key<br>2. `DELETE /keys/:id` again | `404 { "error": "Key not found" }` — the `RETURNING id` yields no row on the second call. |
| **KEY-21** | Revoke — unauthenticated | 1. `DELETE /keys/:id` with no `Authorization` header | `401 { "error": "Unauthorized" }`. |
| **KEY-22** | Revoke — server error handling | 1. Simulate a DB failure during `revokeApiKey` | `500 { "error": "Something went wrong. Please try again." }`. |

---

## 4. Usage Analytics — `GET /keys/usage`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **USAGE-01** | Usage dashboard — happy path | 1. Authenticate on an API-enabled plan<br>2. `GET /keys/usage` | `200` with `totalRequests`, `requestsThisMonth`, `monthlyLimit`, `dailyData`, `lastRequestAt`, `keys`. |
| **USAGE-02** | Counts all `api.*` events | 1. Make calls hitting multiple API endpoints (score, query, peers, `/v1/me`, etc.)<br>2. `GET /keys/usage` | `totalRequests` counts every `activity_events` row where `event LIKE 'api.%'` for the user (not just one path). |
| **USAGE-03** | Requests this month | 1. Inspect `requestsThisMonth` | Counts `api.*` events with `created_at >= date_trunc('month', NOW())`. |
| **USAGE-04** | Monthly limit reflects plan | 1. Inspect `monthlyLimit` | Equals `PLANS[plan].apiCallsPerMonth` (e.g. `sandbox` = 35, `starter_v2` = 1500), falling back to `100` if unknown. |
| **USAGE-05** | Daily breakdown shape (30-day series) | 1. Inspect `dailyData` | Array of exactly 30 `{ day, count }` entries (last 30 days, oldest first). Days with no activity are zero-filled; `day` is `YYYY-MM-DD`. |
| **USAGE-06** | Last request timestamp | 1. Make an API call, then `GET /keys/usage` | `lastRequestAt` = most recent `api.*` event `created_at`; `null` when the user has no API activity. |
| **USAGE-07** | Keys list embedded | 1. Inspect `keys` | Same shape as `GET /keys` entries: `id`, `key_preview`, `name`, `created_at`, `last_used_at`, `training_optout`; non-revoked, `created_at DESC`. |
| **USAGE-08** | Plan without API access → 403 | 1. Authenticate on a plan not in `API_PLANS`<br>2. `GET /keys/usage` | `403 { "error": "API usage dashboard requires a Developer, Business, or Growth plan" }`. |
| **USAGE-09** | Unauthenticated → 401 | 1. `GET /keys/usage` with no `Authorization` header | `401 { "error": "Unauthorized" }`. |
| **USAGE-10** | Org filter — member | 1. `GET /keys/usage?org=<orgId>` where caller is a member of that org | `200`. The four stat queries add `AND org_id = <orgId>`; `keys` stays user-scoped. |
| **USAGE-11** | Org filter — non-member → 403 | 1. `GET /keys/usage?org=<orgId>` where caller is **not** in `org_members` for that org | `403 { "error": "You are not a member of that organisation." }`. |
| **USAGE-12** | Empty/absent org param ignored | 1. `GET /keys/usage` (no `org`) or `?org=` | Treated as no filter → user-wide counts (membership check skipped). |
| **USAGE-13** | Server error handling | 1. Simulate a DB failure during the stat queries | `500 { "error": "Failed to fetch usage data" }`. |

---

## 5. Session Usage Check — `GET /usage`

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **USAGE-14** | Usage check — happy path | 1. Authenticate with a session token<br>2. `GET /usage` | `200` with `{ allowed, plan, used, limit }` from `canMakeApiCall`. |
| **USAGE-15** | `used` vs `limit` | 1. Inspect response | `used` = this-month `api.*` count; `limit` = `PLANS[plan].apiCallsPerMonth`; `allowed = used < limit`. |
| **USAGE-16** | Superuser has unlimited quota | 1. Authenticate as a superuser<br>2. `GET /usage` | `allowed = true`, `limit = null` (Infinity serialized as `null` in this response is not applied here — `canMakeApiCall` returns `Infinity` for superusers; verify serialization). |
| **USAGE-17** | Usage check — unauthenticated | 1. `GET /usage` with no `Authorization` header | `401 { "error": "Unauthorized" }`. |
| **USAGE-18** | Server error handling | 1. Simulate a DB failure during `canMakeApiCall` | `500 { "error": "Failed to check usage" }`. |

---

## 6. Profile & Entitlements — `GET /v1/me` (API-key auth)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **ME-01** | Profile — valid API key | 1. `GET /v1/me` with `Authorization: Bearer oga_...` | `200` with full profile: `plan`, `plan_name`, `generation`, `api_access`, `mcp_access`, `api_calls_per_month`, `used_this_month`, `limit_this_month`, `engine_version`, `addons`, `mcp_calls_this_month`, `org`, `key`. |
| **ME-02** | Entitlement fields | 1. Inspect `api_access` / `mcp_access` | `api_access` = `hasApiAccess`, `mcp_access` = `hasMcpAccess` for the key's user. Booleans. |
| **ME-03** | Quota fields | 1. Inspect `api_calls_per_month`, `used_this_month`, `limit_this_month` | `api_calls_per_month` = plan config; `used_this_month` = this-month `api.*` count; `limit_this_month` = numeric limit, or `null` for superusers (Infinity → null). |
| **ME-04** | Plan metadata | 1. Inspect `plan`, `plan_name`, `generation` | `plan` = plan id; `plan_name` = `PLANS[plan].name`; `generation` = `"v1"` or `"v2"`. |
| **ME-05** | Engine version | 1. Inspect `engine_version` | Equals `METHODOLOGY_VERSION` (canonical), not a hardcoded value. |
| **ME-06** | Org branding exposed | 1. Use a key belonging to an org member<br>2. Inspect `org` | `{ id, slug, name, display_name, brand_url, role }`. Resolved from the key's `org_id`, or first-owner fallback for pre-AR-193 keys. |
| **ME-07** | Org null when none | 1. Use a key with no org and user not an org owner | `org: null`. A DB error during org lookup also degrades gracefully to `org: null` (does not 500). |
| **ME-08** | IP allowlist exposed | 1. Inspect `key.allowed_ip_cidrs` | Array of the key's stored CIDRs; empty array `[]` when unrestricted. |
| **ME-09** | Training opt-out exposed | 1. Inspect `key.training_optout` | Boolean; defaults `false` (participate) when unset on the key. |
| **ME-10** | Missing Bearer header → 401 | 1. `GET /v1/me` with no `Authorization` header | `401 { "error": "Missing API key. Use: Authorization: Bearer oga_..." }`. |
| **ME-11** | Malformed auth header → 401 | 1. `GET /v1/me` with `Authorization: Token oga_...` (not `Bearer `) | `401 { "error": "Missing API key. Use: Authorization: Bearer oga_..." }`. |
| **ME-12** | Invalid / revoked key → 401 | 1. `GET /v1/me` with a bogus or revoked `oga_...` key | `401 { "error": "Invalid or revoked API key" }`. |
| **ME-13** | IP not in allowlist → 403 | 1. Configure a key with an IP allowlist<br>2. Call `/v1/me` from an IP outside it | `403 { "error": "Request IP is not in the key's allowlist.", "code": "ip_not_allowed" }`. |
| **ME-14** | Rate limited → 429 | 1. Call `/v1/me` past the per-key `apiReport` budget (30 req/min) | `429 { "error": "Too many requests. Rate limit: 30 requests per minute." }`. Rate-limit headers set on the reply. |
| **ME-15** | Legacy `aiq_` key still validates | 1. `GET /v1/me` with a pre-migration `aiq_...` key | `200`. Validation is a hash lookup with no prefix gate. |
| **ME-16** | `last_used_at` rotates on call | 1. Note a key's `last_used_at`<br>2. Call `/v1/me`, then `GET /keys` | `last_used_at` advances. (Timestamp is touched even for an IP-blocked attempt — fire-and-forget before the IP gate.) |

---

## Test Environment Notes

- **API service:** OneGoodArea API (Fastify), routes registered at root (no prefix) via `registerApiKeysRoutes` / `registerMeRoutes` in `apps/api/src/app.ts`.
- **Session auth:** `authenticateSession` verifies a short-lived JWT the web app mints from the NextAuth session (`Authorization: Bearer <session-token>`). Failure → `401 { "error": "Unauthorized" }`.
- **API-key auth:** `validateApiKey` hashes the presented `oga_...` key (SHA-256) and looks it up among non-revoked rows; enforces the per-key IP allowlist when non-empty.
- **Plan gate:** `hasApiAccess(userId)` = superuser OR plan ∈ `API_PLANS`. Applied to `POST /keys` and `GET /keys/usage`.
- **Usage metering:** all quota/analytics counts derive from `activity_events` rows where `event LIKE 'api.%'`.
- **Endpoints:**
  - `GET /keys` — list caller's keys (session)
  - `POST /keys` — create key, plan-gated (session)
  - `DELETE /keys/:id` — revoke key, owner-scoped (session)
  - `GET /keys/usage` — usage analytics + embedded keys (session, plan-gated)
  - `GET /usage` — quota check `{ allowed, plan, used, limit }` (session)
  - `GET /v1/me` — profile, entitlements, org branding, key allowlist (API key)
