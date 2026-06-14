# Plan 010 v2: Web-to-API Migration (AR-203) — Rewrite

## 1. JIRA Integration

- **Jira Issue:** AR-203
- **Plan File:** plan/010_v2_web_api_migration_ar203.md
- **Supersedes:** plan/010_web_api_migration_ar203.md (10x underestimated scope)
- **Branch:** plan/AR-203-web-api-rewrite (planning), impl/AR-203-web-api-migration (impl)

---

## 2. Why Rewrite

Original plan: "~450 LOC, 10 commits, 7-11 hours."
**Reality:** 60+ files import `from "@/lib/db"`, ~30 callers of duplicated libs, 40+ routes/pages with raw SQL. The API already migrated the duplicated modules — web just never switched.

---

## 3. Existing Infrastructure (discovered during planning)

### 3.1 Auth Bridge — ALREADY EXISTS

```
apps/web                                      apps/api
├── lib/server/bridge.ts     mintBridgeToken ──► modules/auth/session-token.ts
│   Signs JWT(HS256, sub=userId, exp=5m)          Verifies JWT with shared AUTH_SECRET
│   Key: AUTH_SECRET                               Returns userId if valid
│
├── lib/server/api-client.ts  callApi(path, {userId})
│   Mints bridge token → Authorization: Bearer <jwt>
│   Forwards to INTERNAL_API_URL (default: http://localhost:4000)
│
└── tests/unit/bridge.test.ts     ✅ 4 tests
    tests/unit/api-client.test.ts  ✅ 6 tests
```

**No new infrastructure needed.** Web routes just need to use `callApi()` instead of local SQL.

### 3.2 Containers & Compose

- `compose.yml`: Both `api` and `web` share `AUTH_SECRET: replace-me`
- `compose.override.yml`: API → `8080:8080`, Web → `3000:3000`
- `INTERNAL_API_URL: http://api:8080` set in web env
- `render.yaml`: deploys API container only. Web stays on Vercel. Unaffected.

### 3.3 CI (GitHub Actions)

- `.github/workflows/ci.yml`: `npm install`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`
- **No containers in CI** — tests use mocks/vitest directly
- `signal-refresh.yml`: API data jobs — unaffected

### 3.4 Test Landscape

| Workspace | Tests | Affected by this plan? |
|---|---|---|
| `apps/web/tests/unit/` | 26 files | `runtime-env.test.ts` references DATABASE_URL. Others are pure logic — unaffected. |
| `apps/api/tests/` | 97 files | New tests needed for any NEW endpoints created |

### 3.5 Env Files

| File | DATABASE_URL present? | Action |
|---|---|---|
| `.env.local` | Yes | Remove in final cleanup phase |
| `.env.test.local` | Yes | Remove in final cleanup phase |
| `compose.yml` (web service) | No | Already clean ✅ |

---

## 4. Architecture

```
Browser (session cookie)
    │
    ▼
Web Container (apps/web) — Vercel
    │  Route Handler: reads NextAuth session → userId
    │
    │  callApi(path, {userId})     ← ALREADY EXISTS
    │    └── mintBridgeToken(userId) → JWT
    │        Authorization: Bearer <jwt> ──────►
    │
    ▼
API Container (apps/api) — Render / OCI
    │  verifySessionToken(request)  ← ALREADY EXISTS
    │    └── modules/auth/session-token.ts
    │
    ▼
  DAL → PostgreSQL
```

---

## 5. Phased Approach

### Phase 1A: Switch route callers of DUPLICATED libs → use existing `callApi()`

These lib functions already exist in `apps/api/src/modules/`. Web routes just need to switch.

| Lib function | API module location | ~15 callers to switch |
|---|---|---|
| `validateApiKey` | `modules/api-keys/` | 5 routes |
| `createApiKey`, `listApiKeys`, `revokeApiKey` | `modules/api-keys/` | 2 routes |
| `createWebhookSubscription`, `listWebhookSubscriptions`, `revokeWebhookSubscription` | `modules/webhooks/` | 2 routes |
| `fireWebhookEvent` | `modules/webhooks/` | 1 lib |
| `getUserPlan`, `hasApiAccess`, `canGenerateReport`, `hasMcpAccess`, `trackMcpCall`, `getMcpUsageThisMonth`, `hasAddon`, `listAddons`, `getStripeCustomerId` | `modules/usage/` | ~15 callers |
| `trackEvent` | `modules/tracking/activity.ts` | ~10 callers |
| `getAnalytics`, `getTrafficAnalytics` | Not in API yet (admin only) | 2 pages |
| `generateReport` | `modules/reports/report-generator.ts` | 2 routes |

**Commit pattern (CLAUDE.md rule 8):** One commit per route/file switched.

**Implementation detail:** Each web route must:
1. Read userId from NextAuth session (already done)
2. Replace `import { fn } from "@/lib/xxx"` + local call → `callApi(path, {userId})`
3. Map the response shape

### Phase 1B: Auth endpoints (register, login, verify, forgot-password, magic-link, etc.)

~7 web routes + 1 lib refactor. Most API endpoints already exist. 3 new API endpoints needed.

#### 9B.0 Public-Endpoint Proxy Pattern

Auth endpoints are PUBLIC (no session, no API key). Need a third proxy pattern:

| Pattern | Auth mechanism | Helper | Use case |
|---|---|---|---|
| **Session proxy** | NextAuth session → bridge token | `proxySession(req, path)` | Dashboard routes |
| **API-key proxy** | Forward `Authorization: Bearer <api-key>` | `proxyApiKey(req)` | Public v1 API |
| **Public proxy** | No auth — forward body as-is | `proxyPublic(req, path)` | Auth endpoints (register, login, etc.) |

```typescript
// New: apps/web/src/lib/server/proxy.ts addition
export async function proxyPublic(req: NextRequest, apiPath: string): Promise<NextResponse> {
  const apiUrl = `${apiBaseUrl()}${apiPath}`;
  const body = req.method !== "GET" ? await req.json().catch(() => undefined) : undefined;
  const res = await fetch(apiUrl, {
    method: req.method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
```

#### 9B.1 Already-Existing API Endpoints (proxy immediately)

| # | Web route | Target API | Commit |
|---|---|---|---|
| 1 | `POST /api/auth/register` | `POST /auth/register` ✅ exists | `Switch POST /api/auth/register to proxyPublic → /auth/register` |
| 2 | `POST /api/auth/forgot-password` | `POST /auth/forgot-password` ✅ exists | `Switch POST /api/auth/forgot-password to proxyPublic` |
| 3 | `POST /api/auth/reset-password` | `POST /auth/reset-password` ✅ exists | `Switch POST /api/auth/reset-password to proxyPublic` |
| 4 | `POST /api/auth/resend-verification` | `POST /auth/resend-verification` ✅ exists | `Switch POST /api/auth/resend-verification to proxyPublic` |

Each web route currently: validates inputs → queries DB → sends emails. The API endpoints replicate this **exactly** (same tables, same email providers, same rate limits). The web routes become 3-line proxies.

#### 9B.2 New API Endpoints Needed (3 total)

**9B.2.1 `POST /auth/login` (for NextAuth credentials authorize)**

Needed because the NextAuth `authorize()` callback currently queries `users` + `password_hash` directly. Purpose: validate credentials, return user object.

```
POST /auth/login
Body: { email: string, password: string }
→ 200 { id: string, email: string, name: string | null }
→ 401 { error: "invalid_credentials" }
→ 429 { error: "rate_limited" }  // 5 attempts/min per IP
```

Implementation: copy the authorize() logic from `apps/web/src/lib/auth.ts` lines 67-100 (find user by email, verify password, transparent PBKDF2 rehash). Add rate limit (5/min per IP). Add to `apps/api/src/app.ts`.

**9B.2.2 `POST /auth/magic-link/request`**

Copy from `apps/web/src/app/api/auth/magic-link/request/route.ts`. Rate limit (3/min per IP), create token in `magic_link_tokens`, send email via configured provider. The API already imports `sendVerificationEmail` and has the email infrastructure.

**9B.2.3 `GET /auth/check-email`**

Copy from `apps/web/src/app/api/auth/check-email/route.ts`. Returns `{ exists: boolean, provider: string | null }` for the given email. Rate limited (3/min per IP). Used by the sign-in page to determine whether to show "sign in" vs "sign up" form.

#### 9B.3 NextAuth Callbacks Refactor

The file `apps/web/src/lib/auth.ts` contains the NextAuth configuration. Two callbacks hit the DB:

**`signIn` callback (OAuth):** Currently: ensures users table → checks existing → inserts or updates user → `trackEvent("auth.signin", ...)`.

Refactored to:
```typescript
async signIn({ user, account }) {
  if (account?.provider === "google" || account?.provider === "github") {
    const res = await fetch(`${apiBaseUrl()}/auth/oauth-callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        image: user.image,
        provider: account.provider,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      user.id = data.id;
    }
  }
  return true;
}
```

This needs a **new API endpoint** `POST /auth/oauth-callback`:
```
POST /auth/oauth-callback
Body: { email, name, image, provider }
→ 200 { id: string }   // existing or newly created user id
```
Implementation: copy the signIn callback logic (ensureTable, upsert user, return id). Also trackEvent("auth.signin") internally.

**`authorize` callback (credentials):** Currently queries DB for user lookup + password verify.

Refactored to:
```typescript
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null;
  const res = await fetch(`${apiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });
  if (!res.ok) return null;
  return res.json();
}
```

**`jwt` callback:** Already clean — assigns `token.userId = user.id`. No DB access.

**`session` callback:** Already clean — assigns `session.user.id = token.userId`. No DB access.

After refactoring, `apps/web/src/lib/auth.ts` no longer imports `sql`, `trackEvent`, `hashPassword`, `verifyPassword`, `ensureUsersTable`, `ensureVerificationTable`, `ensureMagicLinkTokensTable`, `generateId`, or `logger`.

#### 9B.4 NextAuth Handler — Stays in Web

`GET+POST /api/auth/[...nextauth]` is NextAuth's built-in handler. **Cannot be proxied** — NextAuth manages its own JWT session tokens, CSRF tokens, callback URLs, and redirects. This is a framework concern, not a DB concern. The handler stays in web but no longer hits the DB.

#### 9B.5 Phase 1B Commit Sequence

| # | What | Type | Depends on |
|---|---|---|---|
| 1 | Add `proxyPublic()` to `apps/web/src/lib/server/proxy.ts` | Infra | — |
| 2 | Add `POST /auth/login` to API | New endpoint | — |
| 3 | Add `POST /auth/magic-link/request` to API | New endpoint | — |
| 4 | Add `GET /auth/check-email` to API | New endpoint | — |
| 5 | Add `POST /auth/oauth-callback` to API | New endpoint | — |
| 6 | Refactor NextAuth authorize() → `fetch POST /auth/login` | Lib refactor | #2 |
| 7 | Refactor NextAuth signIn() → `fetch POST /auth/oauth-callback` | Lib refactor | #5 |
| 8 | Strip DB imports from auth.ts | Cleanup | #6, #7 |
| 9 | `POST /api/auth/register` → `proxyPublic(req, "/auth/register")` | Route proxy | #1 |
| 10 | `POST /api/auth/forgot-password` → `proxyPublic(req, "/auth/forgot-password")` | Route proxy | #1 |
| 11 | `POST /api/auth/reset-password` → `proxyPublic(req, "/auth/reset-password")` | Route proxy | #1 |
| 12 | `POST /api/auth/resend-verification` → `proxyPublic(req, "/auth/resend-verification")` | Route proxy | #1 |
| 13 | `POST /api/auth/magic-link/request` → `proxyPublic(req, "/auth/magic-link/request")` | Route proxy | #1, #3 |
| 14 | `GET /api/auth/check-email` → `proxyPublic(req, "/auth/check-email")` | Route proxy | #1, #4 |

Total Phase 1B: **14 commits** (1 infra + 4 new API endpoints + 2 lib refactors + 1 cleanup + 6 route proxies)

Note: Commit #2 (POST /auth/login) must be in the API container and deployed **before** commit #6 (NextAuth refactor), otherwise logins break. This is the only deploy-order dependency in Phase 1.

### Phase 1C: Org CRUD (members, bundles, cohorts, presets, invitations, methodology)

~12 web route files (22 HTTP methods). API already has `/v1/orgs/:id/*` endpoints — but they're API-key-authed. Need dual-auth.

#### 9C.0 Challenge: URL Structure Mismatch

| | Web routes | API endpoints |
|---|---|---|
| **Path** | `/api/me/org/members` (implicit org) | `/v1/orgs/:id/members` (explicit org) |
| **Auth** | Session cookie (NextAuth) | API key (Bearer oga_xxx) |
| **Org resolution** | Query `org_memberships` for user's org | Read org_id from API key row |

**Chosen approach (Option B):** Web resolves orgId from session (one lightweight query), then calls `callApi("/v1/orgs/{orgId}/...", {userId})`. API v1 org endpoints get dual-auth (bridge token + API key).

#### 9C.1 API Side: Dual-Auth + Org Membership Validation

Add `authenticateEither()` to `apps/api/src/app.ts`:

```typescript
async function authenticateEither(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  const token = header.slice(7);

  // 1. Try bridge token (session user — no plan check)
  const session = await verifySessionToken(token);
  if (session) return session.userId;

  // 2. Fall back to API key
  const result = await validateApiKey(token, clientIpOf(request));
  if (!result) {
    reply.code(401).send({ error: "Invalid or revoked API key" });
    return null;
  }
  if ("blocked" in result) {
    reply.code(403).send({ error: "Request IP is not in the key's allowlist.", code: result.blocked });
    return null;
  }
  return result.userId;
}
```

For org-scoped endpoints, wrap in `requireOrgAccess(userId, orgId)` which validates membership when using bridge tokens:

```typescript
async function requireOrgAccess(
  userId: string,
  orgId: string,
  reply: FastifyReply,
  isSession: boolean,
): Promise<boolean> {
  if (isSession) {
    // Bridge token: validate org membership
    const membership = await sql`
      SELECT role FROM org_memberships WHERE user_id = ${userId} AND org_id = ${orgId}
    `;
    if (membership.length === 0) {
      reply.code(403).send({ error: "You are not a member of this organization" });
      return false;
    }
  }
  // API key: org is already resolved from the key row — trust it
  return true;
}
```

**Which endpoints get dual-auth:** All `/v1/orgs/:id/*` endpoints. The existing `requireApiAccess` call is replaced with `authenticateEither`. Rate limiting + plan check remain for API key path; skipped for bridge token path.

**Which endpoint stays API-key only:** `POST /v1/invitations/:token/accept` — public (no auth needed, the token IS the auth).

#### 9C.2 Web Side: Org Resolution Helper

Add `resolveOrgId(userId)` to web — one lightweight query:

```typescript
// New helper in apps/web (could go in lib/server/org.ts)
async function resolveOrgId(userId: string): Promise<string | null> {
  const result = await sql`
    SELECT org_id FROM org_memberships
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return result.length > 0 ? result[0].org_id : null;
}
```

This is the ONLY DB query that stays in the web container for Phase 1C. It's a single indexed lookup.

#### 9C.3 Web Route → API Endpoint Mapping

| # | Web route | Method(s) | Target API endpoint | Auth |
|---|---|---|---|---|
| 1 | `/api/orgs` | POST | `/v1/orgs` | Dual |
| 2 | `/api/me/org/members` | GET, POST | `/v1/orgs/{orgId}/members` | Dual |
| 3 | `/api/me/org/members/[userId]` | PATCH, DELETE | `/v1/orgs/{orgId}/members/{userId}` | Dual |
| 4 | `/api/me/org/invitations` | GET, POST | `/v1/orgs/{orgId}/invitations` | Dual |
| 5 | `/api/me/org/invitations/[id]` | DELETE | `/v1/orgs/{orgId}/invitations/{id}` | Dual |
| 6 | `/api/invitations/[token]/accept` | POST | `/v1/invitations/{token}/accept` | Public (token) |
| 7 | `/api/me/org/bundles` | GET, POST | `/v1/orgs/{orgId}/bundles` | Dual |
| 8 | `/api/me/org/bundles/[id]` | GET, PATCH, DELETE | `/v1/orgs/{orgId}/bundles/{id}` | Dual |
| 9 | `/api/me/scoring-presets` | GET, POST | `/v1/orgs/{orgId}/presets` | Dual |
| 10 | `/api/me/scoring-presets/[id]` | GET, PATCH, DELETE | `/v1/orgs/{orgId}/presets/{id}` | Dual |
| 11 | `/api/me/org/cohorts` | GET, POST | `/v1/orgs/{orgId}/cohorts` | Dual |
| 12 | `/api/me/org/cohorts/[id]` | GET, PATCH, DELETE | `/v1/orgs/{orgId}/cohorts/{id}` | Dual |

Each web route follows the same pattern:

```typescript
// Before (current):
export const GET = withAuth(async (req, { userId }) => {
  const memberships = await sql`SELECT org_id FROM org_memberships...`;
  const orgId = memberships[0]?.org_id;
  const members = await sql`SELECT ... FROM org_memberships m JOIN users u ... WHERE m.org_id = ${orgId}`;
  return NextResponse.json({ members, org_id: orgId });
});

// After (Phase 1C):
export const GET = withAuth(async (req, { userId }) => {
  const orgId = await resolveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 404 });
  return proxySession(req, `/v1/orgs/${orgId}/members`);
});
```

#### 9C.4 Methodology (special case)

The API already has `GET /v1/orgs/:id/methodology` and `PUT /v1/orgs/:id/methodology`. These get dual-auth like the other org endpoints. The web routes for methodology are page components (server-side data fetching) — deferred to Phase 1F.

#### 9C.5 Phase 1C Commit Sequence

| # | What | Type | Depends on |
|---|---|---|---|
| 1 | Add `authenticateEither()` to API | Infra | — |
| 2 | Add `requireOrgAccess()` to API | Infra | #1 |
| 3 | Convert `/v1/orgs` (POST, GET) to dual-auth | API refactor | #1 |
| 4 | Convert `/v1/orgs/:id/members/*` to dual-auth | API refactor | #1, #2 |
| 5 | Convert `/v1/orgs/:id/invitations/*` to dual-auth | API refactor | #1, #2 |
| 6 | Convert `/v1/orgs/:id/bundles/*` to dual-auth | API refactor | #1, #2 |
| 7 | Convert `/v1/orgs/:id/presets/*` to dual-auth | API refactor | #1, #2 |
| 8 | Convert `/v1/orgs/:id/cohorts/*` to dual-auth | API refactor | #1, #2 |
| 9 | Convert `/v1/orgs/:id/methodology` to dual-auth | API refactor | #1, #2 |
| 10 | Add `resolveOrgId()` helper to web | Infra | — |
| 11 | Switch `POST /api/orgs` → proxy | Route | #3, #10 |
| 12 | Switch `/api/me/org/members` → proxy | Route | #4, #10 |
| 13 | Switch `/api/me/org/members/[userId]` → proxy | Route | #4, #10 |
| 14 | Switch `/api/me/org/invitations` → proxy | Route | #5, #10 |
| 15 | Switch `/api/me/org/invitations/[id]` → proxy | Route | #5, #10 |
| 16 | Switch `/api/invitations/[token]/accept` → proxy | Route | — |
| 17 | Switch `/api/me/org/bundles` → proxy | Route | #6, #10 |
| 18 | Switch `/api/me/org/bundles/[id]` → proxy | Route | #6, #10 |
| 19 | Switch `/api/me/scoring-presets` → proxy | Route | #7, #10 |
| 20 | Switch `/api/me/scoring-presets/[id]` → proxy | Route | #7, #10 |
| 21 | Switch `/api/me/org/cohorts` → proxy | Route | #8, #10 |
| 22 | Switch `/api/me/org/cohorts/[id]` → proxy | Route | #8, #10 |

Total Phase 1C: **22 commits** (2 API infra + 7 API refactors + 1 web helper + 12 route switches)

**Risk:** The `authenticateEither()` + `requireOrgAccess()` changes touch the auth path for ALL v1 org endpoints. External API consumers using API keys must continue to work identically. The bridge-token path is additive — no change to API key behavior.

### Phase 1D: Stripe (checkout, cancel, addon-checkout, webhook, portal)

~5 routes. All API endpoints already exist and use `authenticateSession` (bridge tokens). Web routes just need to proxy.

#### 9D.1 Finding: API Stripe Endpoints Already Bridge-Ready

All 5 Stripe API endpoints already use `authenticateSession(request, reply)` — they accept bridge tokens natively. The web routes are still calling the DB directly. This is the easiest phase.

| # | Web route | API endpoint | Auth pattern | Special |
|---|---|---|---|---|
| 1 | `POST /api/stripe/checkout` | `POST /stripe/checkout` | authenticateSession | — |
| 2 | `POST /api/stripe/cancel` | `POST /stripe/cancel` | authenticateSession | — |
| 3 | `POST /api/stripe/addon-checkout` | `POST /stripe/addon-checkout` | authenticateSession | — |
| 4 | `POST /api/stripe/portal` | `POST /stripe/portal` | authenticateSession | — |
| 5 | `POST /api/stripe/webhook` | `POST /stripe/webhook` | **HMAC signature** | Needs raw body + Stripe-Signature header |

Routes 1-4 use `proxySession(req, path, { forwardBody: true })`. One-liner proxies.

Route 5 (webhook) is special: Stripe signs the raw body. We need a raw-body forwarder:

```typescript
// Stripe webhook proxy — forwards raw body + Stripe-Signature header
export async function proxyStripeWebhook(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text(); // raw, not JSON-parsed
  const sig = req.headers.get("stripe-signature");
  const res = await fetch(`${apiBaseUrl()}/stripe/webhook`, {
    method: "POST",
    headers: sig ? { "stripe-signature": sig, "content-type": "application/json" } : {},
    body: rawBody,
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
```

#### 9D.2 Phase 1D Commit Sequence

| # | What | Type |
|---|---|---|
| 1 | Add `proxyStripeWebhook()` to proxy.ts | Infra |
| 2 | Switch `POST /api/stripe/checkout` → proxySession | Route |
| 3 | Switch `POST /api/stripe/cancel` → proxySession | Route |
| 4 | Switch `POST /api/stripe/addon-checkout` → proxySession | Route |
| 5 | Switch `POST /api/stripe/portal` → proxySession | Route |
| 6 | Switch `POST /api/stripe/webhook` → proxyStripeWebhook | Route |

Total Phase 1D: **6 commits**

### Phase 1E: Settings & remaining routes

~3 route files + pageview tracking. API endpoints already exist.

| # | Web route | API endpoint | Auth | Notes |
|---|---|---|---|---|
| 1 | `DELETE /api/settings/delete-account` | `DELETE /settings/delete-account` | authenticateSession | Already exists |
| 2 | `POST /api/settings/password` | `POST /settings/password` | authenticateSession | Already exists |
| 3 | `POST /api/track` (pageviews) | `POST /track` | Public (no auth) | Already exists |

Already handled in earlier phases:
- `GET /api/settings/subscription` → Phase 1A (#7)
- `GET /api/keys/usage` → Phase 1A (#2)

#### 9E.1 Phase 1E Commit Sequence

| # | What | Type |
|---|---|---|
| 1 | Switch `DELETE /api/settings/delete-account` → proxySession | Route |
| 2 | Switch `POST /api/settings/password` → proxySession | Route |
| 3 | Switch `POST /api/track` → proxyPublic | Route |

Total Phase 1E: **3 commits**

### Phase 1F: Page components (report/[id], compare, dashboard, verify)

~6 pages. Server components that fetch data server-side. Pattern: `auth()` → userId → `callApi(path, {userId})`.

| # | Page | Current lib calls | API endpoint | Status |
|---|---|---|---|---|
| 1 | `dashboard/page.tsx` | `getUserPlan`, `canGenerateReport`, `getMcpUsageThisMonth`, `hasMcpAccess`, `hasAddon`, `listAddons`, `getMonthlyReportCount` | `GET /usage` + multiple | Need composite endpoint or multiple calls |
| 2 | `dashboard/billing/page.tsx` | `getUserPlan`, `getMonthlyReportCount`, `hasMcpAccess`, `hasAddon`, `getMcpUsageThisMonth` | Multiple | Same as above |
| 3 | `compare/page.tsx` | `getUserPlan` | `GET /settings/subscription` | ✅ exists |
| 4 | `design-v2/compare/page.tsx` | `getUserPlan` | `GET /settings/subscription` | ✅ exists |
| 5 | `admin/page.tsx` | `getAnalytics`, `getTrafficAnalytics` | — | ❌ Needs new endpoints |
| 6 | `design-v2/admin/page.tsx` | `getAnalytics`, `getTrafficAnalytics` | — | ❌ Same |

Pages 3-4: simple — `callApi("/settings/subscription", {userId})` returning `{ plan }`.

Pages 1-2 (dashboard): need a composite endpoint or use multiple callApi calls. The `GET /usage` endpoint returns `{ allowed, plan, used, limit }` but the dashboard pages need more data (MCP usage, addon status, monthly counts). **Recommendation:** either add a `GET /dashboard` composite endpoint, or make multiple callApi calls (usage + settings/subscription + a new MCP status endpoint).

Pages 5-6 (admin): need new `GET /admin/analytics` and `GET /admin/traffic-analytics` endpoints in the API. Copy logic from `apps/web/src/lib/activity.ts` (`getAnalytics` and `getTrafficAnalytics` functions). Admin-only, gated by superuser check.

#### 9F.1 Phase 1F Commit Sequence

| # | What | Type |
|---|---|---|
| 1 | Switch `compare/page.tsx` → callApi | Page |
| 2 | Switch `design-v2/compare/page.tsx` → callApi | Page |
| 3 | Add `GET /dashboard` composite endpoint to API | New endpoint |
| 4 | Switch `dashboard/page.tsx` → callApi | Page |
| 5 | Switch `dashboard/billing/page.tsx` → callApi | Page |
| 6 | Add `GET /admin/analytics` to API | New endpoint |
| 7 | Add `GET /admin/traffic-analytics` to API | New endpoint |
| 8 | Switch `admin/page.tsx` → callApi | Page |
| 9 | Switch `design-v2/admin/page.tsx` → callApi | Page |

Total Phase 1F: **~9 commits** (needs more detailed design for dashboard composite endpoint)

---

## 10. Overall Summary

### 10.1 Commit Totals by Phase

| Phase | Commits | New API endpoints | API refactors | Web route switches | Description |
|---|---|---|---|---|---|
| 1A | 12 | 0 | 0 | 11 | Session + API-key proxy for duplicated libs |
| 1B | 14 | 4 | 0 | 6 | Auth endpoints + NextAuth callback refactor |
| 1C | 22 | 0 | 7 | 12 | Dual-auth for org CRUD endpoints |
| 1D | 6 | 0 | 0 | 5 | Stripe routes (API already bridge-ready) |
| 1E | 3 | 0 | 0 | 3 | Settings + pageview tracking |
| 1F | ~9 | 3 | 0 | 6 | Page components |
| **Total** | **~66** | **7** | **7** | **43** | |

### 10.2 New API Endpoints Needed (7 total)

| Endpoint | Phase | Purpose |
|---|---|---|
| `POST /auth/login` | 1B | NextAuth credentials authorize |
| `POST /auth/oauth-callback` | 1B | NextAuth OAuth signIn callback |
| `POST /auth/magic-link/request` | 1B | Magic link token generation |
| `GET /auth/check-email` | 1B | Sign-in page email lookup |
| `GET /dashboard` | 1F | Composite dashboard data |
| `GET /admin/analytics` | 1F | Admin analytics |
| `GET /admin/traffic-analytics` | 1F | Admin traffic analytics |

### 10.3 Proxy Helpers Created

| Helper | Phase | Use case |
|---|---|---|
| `proxyApiKey()` | 1A | Forward API-key-authed requests to API |
| `proxyPublic()` | 1B | Forward public (no-auth) requests to API |
| `proxyStripeWebhook()` | 1D | Forward Stripe-signed raw body to API |
| `proxySession()` | (already exists) | Session → bridge token → API |

### 10.4 DB Queries Remaining in Web After Migration

| Query | Location | Why it stays |
|---|---|---|
| `resolveOrgId(userId)` | Phase 1C helper | Single indexed lookup. Needed to bridge `/me/org/*` → `/v1/orgs/{id}/*` URL mismatch |
| NextAuth session management | `[...nextauth]` handler | Framework concern — NextAuth manages JWT sessions internally |

**All other DB access is eliminated from the web container.**

### 10.5 Deploy-Order Dependencies

| Dependency | Why |
|---|---|
| `POST /auth/login` in API → before NextAuth authorize refactor | Logins break if authorize calls non-existent endpoint |
| `authenticateEither()` in API → before org route proxies | Bridge tokens need dual-auth acceptance |
| Stripe webhook proxy → verify with Stripe test mode | Raw body forwarding must preserve signature validity |

---

## 6. Dead Code Deletion — Per Lib Module

After all callers of a lib function are switched:
1. Delete the function from the web lib
2. If the entire lib file is empty → delete the file
3. If `import { sql } from "@/lib/db"` is no longer used → remove the import
4. Final: delete `apps/web/src/lib/db.ts`

---

## 7. CI/CD & Test Strategy

### Per-Commit Validation
1. `npm run typecheck` — must pass
2. `npm run lint` — must pass
3. `npm test` — affected tests updated, all pass
4. Manual: verify switched route works via `make stack-up-min` + curl

### Test Updates Needed
- `apps/web/tests/unit/runtime-env.test.ts` — remove DATABASE_URL assertion (final cleanup phase)
- New API tests for any new endpoints (Phase 1B+)
- Web tests for lib functions being deleted → move to API tests or delete if redundant

### CI Impact
- **No change.** CI runs `npm install` + `npm test` directly (no containers).
- Tests that need the API container → they run in CI today via the `callApi` mock pattern

### Makefile Targets
- `make stack-up-min` — verify full stack boots
- `make api-test-container` — verify API tests pass
- No new Makefile targets needed

---

## 8. Git Strategy

- **Implementation branch:** `impl/AR-203-web-api-migration`
- One commit per route/file switched
- Phases committed sequentially
- Dead code deletion: separate commits per lib module
- No destructive actions without confirmation (CLAUDE.md rule 10)

---

## 9. Phase 1A — Detailed Caller-to-Endpoint Mapping

### 9.0 Two Proxy Patterns

Phase 1A requires TWO distinct proxy patterns because the web container handles both session cookies AND API keys:

| Pattern | Auth mechanism | Helper | Use case |
|---|---|---|---|
| **Session proxy** | NextAuth session cookie → userId → bridge token | `proxySession(req, path)` | Dashboard routes, keys management |
| **API-key proxy** | Forward `Authorization: Bearer <api-key>` untouched | New `proxyApiKey(req)` | Public v1 API (me, report, batch, webhooks) |

`proxySession` already exists in `apps/web/src/lib/server/proxy.ts`. We need to add `proxyApiKey` — a thin forwarder that relays the original request (headers + body) to the API container without authenticating it on the web side. The API container handles `validateApiKey` internally.

```typescript
// New: apps/web/src/lib/server/proxy.ts addition
export async function proxyApiKey(req: NextRequest): Promise<NextResponse> {
  const apiUrl = `${apiBaseUrl()}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const forwardedHeaders = new Headers();
  // Forward relevant headers, skip hop-by-hop
  for (const [key, value] of req.headers.entries()) {
    if (!["host", "connection", "content-length", "transfer-encoding"].includes(key.toLowerCase())) {
      forwardedHeaders.set(key, value);
    }
  }
  const res = await fetch(apiUrl, {
    method: req.method,
    headers: forwardedHeaders,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    duplex: "half",
  });
  return new NextResponse(res.body, { status: res.status, headers: res.headers });
}
```

### 9.1 Session-Authed Routes (Pattern: proxySession)

#### 9.1.1 `apps/web/src/app/api/keys/route.ts`
- **Current:** `withAuth` → `hasApiAccess(userId)` → `createApiKey(userId, name)` / `listApiKeys(userId)`
- **Target API:** `GET /keys` (list), `POST /keys` (create, includes hasApiAccess gate)
- **Switch to:** 
  - GET → `proxySession(req, "/keys")`
  - POST → `proxySession(req, "/keys", { forwardBody: true })`
- **Response shape match:** API returns `{ keys: [...] }` / `{ key: {...} }` — same as web routes return today
- **Commit:** `Switch GET/POST /api/keys to proxySession`

#### 9.1.2 `apps/web/src/app/api/keys/[id]/route.ts`
- **Current:** `withAuth` → `revokeApiKey(userId, id)`
- **Target API:** `DELETE /keys/:id`
- **Switch to:** `proxySession(req, "/keys/" + id, { method: "DELETE" })`
- **Response shape match:** API returns `{ success: true }` — same
- **Commit:** `Switch DELETE /api/keys/[id] to proxySession`

#### 9.1.3 `apps/web/src/app/api/keys/usage/route.ts`
- **Current:** `withAuth` → `hasApiAccess(userId)` + `getUserPlan(userId)` + complex SQL
- **Target API:** `GET /keys/usage` (already does hasApiAccess gate, getUserPlan, full dashboard queries)
- **Switch to:** `proxySession(req, "/keys/usage")`
- **Response shape match:** API returns `{ totalRequests, requestsThisMonth, monthlyLimit, dailyData, lastRequestAt, keys }` — FULL replacement
- **Commit:** `Switch GET /api/keys/usage to proxySession`

#### 9.1.4 `apps/web/src/app/api/report/route.ts`
- **Current:** `auth()` → `canGenerateReport(userId)` → `generateReport(area, intent, userId)` → `trackEvent(...)`
- **Target API:** `POST /report` (rate limit + canGenerateReport + generateReport + trackEvent + email — FULL pipeline)
- **Switch to:** `proxySession(req, "/report", { forwardBody: true })`
- **ONE callApi replaces 3 function calls + rate limiting + email**
- **Commit:** `Switch POST /api/report to proxySession`

#### 9.1.5 `apps/web/src/app/api/usage/route.ts`
- **Current:** `withAuth` → `canGenerateReport(userId)`
- **Target API:** `GET /usage`
- **Switch to:** `proxySession(req, "/usage")`
- **Commit:** `Switch GET /api/usage to proxySession`

#### 9.1.6 `apps/web/src/app/api/settings/subscription/route.ts`
- **Current:** `withAuth` → `getUserPlan(userId)` + Stripe subscription lookup
- **Target API:** `GET /settings/subscription` (returns `{ plan, planName, hasStripeSubscription, cancelAt }`)
- **Switch to:** `proxySession(req, "/settings/subscription")`
- **Commit:** `Switch GET /api/settings/subscription to proxySession`

### 9.2 API-Key-Authed v1 Routes (Pattern: proxyApiKey)

These routes currently: extract API key → `validateApiKey(key)` → userId → call duplicated libs.
**All already have equivalent endpoints in the API container** that handle the full flow.

#### 9.2.1 `apps/web/src/app/api/v1/me/route.ts`
- **Current:** `validateApiKey(key)` → `getUserPlan` + `hasApiAccess` + `hasMcpAccess` + `canGenerateReport` + `listAddons` + `getMcpUsageThisMonth`
- **Target API:** `GET /v1/me` (replicates FULL flow — validates key, returns plan/entitlements/mcp/usage/addons)
- **Switch to:** `proxyApiKey(req)` — thin proxy, 3 lines
- **Commit:** `Switch GET /api/v1/me to thin proxy → API container`

#### 9.2.2 `apps/web/src/app/api/v1/report/route.ts`
- **Current:** `validateApiKey(key)` → `hasApiAccess` + `canGenerateReport` + `trackMcpCall` + `hasMcpAccess` + `generateReport` + `trackEvent`
- **Target API:** `POST /v1/report` (replicates FULL flow including MCP gating)
- **Switch to:** `proxyApiKey(req)` — thin proxy
- **Commit:** `Switch POST /api/v1/report to thin proxy → API container`

#### 9.2.3 `apps/web/src/app/api/v1/batch/route.ts`
- **Current:** `validateApiKey(key)` → `hasApiAccess` + `canGenerateReport` + batch processing
- **Target API:** `POST /v1/batch` (already uses `requireApiAccess` which validates the API key internally)
- **Switch to:** `proxyApiKey(req)` — thin proxy
- **Commit:** `Switch POST /api/v1/batch to thin proxy → API container`

#### 9.2.4 `apps/web/src/app/api/v1/webhooks/route.ts`
- **Current:** `validateApiKey(key)` → `hasApiAccess` + webhook CRUD
- **Target API:** `GET /v1/webhooks`, `POST /v1/webhooks` (already use `requireApiAccess`)
- **Switch to:** `proxyApiKey(req)` — thin proxy
- **Commit:** `Switch GET+POST /api/v1/webhooks to thin proxy → API container`

#### 9.2.5 `apps/web/src/app/api/v1/webhooks/[id]/route.ts`
- **Current:** `validateApiKey(key)` → `hasApiAccess` + `revokeWebhookSubscription(userId, id)`
- **Target API:** `DELETE /v1/webhooks/:id` (already uses `requireApiAccess`)
- **Switch to:** `proxyApiKey(req)` — thin proxy
- **Commit:** `Switch DELETE /api/v1/webhooks/[id] to thin proxy → API container`

### 9.3 Lib-to-Lib Cross-Calls (handled implicitly)

These lib files call OTHER duplicated libs. They become dead code as route callers switch:

| Lib file | Cross-calls | Resolution |
|---|---|---|
| `apps/web/src/lib/generate-report.ts` | `fireWebhookEvent()` from webhooks.ts, `trackEvent()` from activity.ts | Dead after routes 9.1.4 + 9.2.2 switch. The API container's report-generator module already handles both. |
| `apps/web/src/lib/batch.ts` | `generateReport()` from generate-report.ts | Dead after route 9.2.3 switches. API `/v1/batch` handles internally. |
| `apps/web/src/lib/auth.ts` | `trackEvent()` from activity.ts | Handled in Phase 1B (auth endpoints) |

### 9.4 Not in Phase 1A (deferred)

| Caller | Why deferred |
|---|---|
| `apps/web/src/app/admin/page.tsx` — `getAnalytics()`, `getTrafficAnalytics()` | No API endpoint exists yet (admin-only). Phase 1F. |
| `apps/web/src/app/design-v2/admin/page.tsx` — same | Same |
| `apps/web/src/app/dashboard/page.tsx` — various usage functions | Server components. Phase 1F. |
| `apps/web/src/app/dashboard/billing/page.tsx` — same | Phase 1F. |
| `apps/web/src/app/compare/page.tsx` — `getUserPlan` | Phase 1F. |
| `apps/web/src/app/design-v2/compare/page.tsx` — same | Phase 1F. |
| Stripe routes (`/api/stripe/*`) | Phase 1D — already have API endpoints, but need auth verification first |
| `apps/web/src/lib/auth.ts` — `trackEvent` | Phase 1B |

### 9.5 Phase 1A Commit Sequence

| # | Route switched | Pattern | Prerequisites |
|---|---|---|---|
| 1 | Add `proxyApiKey()` to `apps/web/src/lib/server/proxy.ts` | Infra | None |
| 2 | `GET /api/keys/usage` → `proxySession(req, "/keys/usage")` | Session | #1 |
| 3 | `GET+POST /api/keys` → `proxySession(req, "/keys")` | Session | #1 |
| 4 | `DELETE /api/keys/[id]` → `proxySession(req, "/keys/{id}")` | Session | #1 |
| 5 | `GET /api/usage` → `proxySession(req, "/usage")` | Session | #1 |
| 6 | `POST /api/report` → `proxySession(req, "/report")` | Session | #1 |
| 7 | `GET /api/settings/subscription` → `proxySession(req, "/settings/subscription")` | Session | #1 |
| 8 | `GET /api/v1/me` → `proxyApiKey(req)` | API-key | #1 |
| 9 | `POST /api/v1/report` → `proxyApiKey(req)` | API-key | #1 |
| 10 | `POST /api/v1/batch` → `proxyApiKey(req)` | API-key | #1 |
| 11 | `GET+POST /api/v1/webhooks` → `proxyApiKey(req)` | API-key | #1 |
| 12 | `DELETE /api/v1/webhooks/[id]` → `proxyApiKey(req)` | API-key | #1 |

Total: **12 commits** (1 infra + 11 route switches)

---

**Status:** Phase 1A mapping complete ✅ — ready for implementation  
**JIRA:** AR-203  
**Branch:** plan/AR-203-web-api-rewrite
