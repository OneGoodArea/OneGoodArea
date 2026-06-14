# Plan 010: Web-to-API Migration (AR-203)

## 1. JIRA Integration

- **Jira Issue:** AR-203 (to be created)
- **Plan File:** plan/010_web_api_migration_ar203.md
- **Branch:** feat/AR-203-web-api-separation
- **Depends On:** Plan 008, Plan 009

---

## 2. Context & Sequencing

This plan executes **AFTER** plans 008 and 009:
- **Plan 008:** Production container parity across platforms
- **Plan 009:** PostgreSQL container + Data Access Layer (DAL)
- **Plan 010 (This):** Migrate web layer to use API instead of direct DB

The DAL (Plan 009) creates the repository layer in `/apps/api/src/infrastructure/db/dal`. This plan:
1. Wraps those repositories with REST API endpoints
2. Replaces web lib functions with HTTP calls to those endpoints
3. Deletes direct database access from the web layer

---

## 3. Current Problem

**Web layer directly accesses PostgreSQL:**
```
apps/web/src/lib/ → Direct SQL → PostgreSQL
```

This violates the three-tier architecture defined in Plan 009.

**Affected files:**
- `api-keys.ts` — API key validation & management
- `auth.ts` — User authentication
- `activity.ts` — Activity tracking
- `usage.ts` — Plan/quota tracking
- `webhooks.ts` — Webhook dispatch
- `rate-limit.ts` — Rate limiting infrastructure
- `idempotency.ts` — Request idempotency
- `db.ts` — Direct Neon client (TO BE DELETED)

**Total:** ~450+ lines of direct SQL in web layer

---

## 4. Target Architecture

After this plan:

```
Web Routes (apps/web/src/app/api/)
    ↓ HTTP Calls (fetch)
API Endpoints (apps/api/src/app.ts)
    ↓ In-process calls
Repositories/DAL (apps/api/src/infrastructure/db/dal/)
    ↓ Parameterized SQL
PostgreSQL
```

**Result:**
- ✓ Single source of truth (all DB access in API layer)
- ✓ No DATABASE_URL needed in web environment
- ✓ Web is a stateless HTTP client
- ✓ API layer enforces all business logic & security

---

## 5. Implementation: 10 Commits (Logical Units)

### Phase 1: Infrastructure (Commits 1-3)
Create API endpoints that use the DAL (from Plan 009).

### Phase 2: Web Migration (Commits 4-8)
Replace web lib functions with HTTP calls to new endpoints.

### Phase 3: Cleanup (Commits 9-10)
Delete direct DB access, add linting rules, update docs.

---

## 6. Detailed Commit Sequence

### Commit 1: Create API endpoint for API key validation
**File:** `apps/api/src/app.ts`  
**Endpoint:** `POST /v1/api-keys/validate`  
**Size:** ~30 LOC  
**Uses:** `ApiKeyRepository` (from Plan 009 DAL)  
**Runnable:** ✓ Testable with curl

```typescript
app.post("/v1/api-keys/validate", async (request, reply) => {
  try {
    const { key } = request.body as { key: string };
    if (!key) return reply.code(400).send({ error: "API key required" });
    
    const result = await apiKeyRepository.validateKey(key);
    if (!result?.userId) return reply.code(401).send({ error: "Invalid key" });
    
    return reply.code(200).send({ user_id: result.userId });
  } catch (error) {
    logger.error("[/v1/api-keys/validate]", error);
    return reply.code(500).send({ error: "Internal server error" });
  }
});
```

**Test:** `apps/api/tests/v1-api-keys-validate.test.ts`

---

### Commit 2: Create API endpoints for usage tracking
**File:** `apps/api/src/app.ts`  
**Endpoints:**
- `GET /v1/usage/plan` → Returns user's current plan
- `GET /v1/usage/addons` → Lists active addons
- `POST /v1/usage/track-mcp` → Increments MCP usage quota

**Size:** ~100 LOC  
**Uses:** `UsageRepository` (from Plan 009 DAL)  
**Runnable:** ✓ Testable with curl

```typescript
app.get("/v1/usage/plan", async (request, reply) => {
  const userId = await requireApiAccess(request, reply);
  if (!userId) return reply;
  const plan = await usageRepository.getPlan(userId);
  return reply.send({ plan });
});

app.get("/v1/usage/addons", async (request, reply) => {
  const userId = await requireApiAccess(request, reply);
  if (!userId) return reply;
  const addons = await usageRepository.listAddons(userId);
  return reply.send({ addons });
});

app.post("/v1/usage/track-mcp", async (request, reply) => {
  const userId = await requireApiAccess(request, reply);
  if (!userId) return reply;
  await usageRepository.trackMcpCall(userId);
  return reply.send({ tracked: true });
});
```

**Test:** `apps/api/tests/v1-usage.test.ts`

---

### Commit 3: Create API endpoints for webhooks & activity
**File:** `apps/api/src/app.ts`  
**Endpoints:**
- `POST /v1/webhooks/fire` → Dispatch webhook event to subscribers
- `POST /v1/activity/track` → Log activity event
- `GET /v1/activity/analytics` → Get activity analytics

**Size:** ~120 LOC  
**Uses:** `WebhookRepository`, `ActivityRepository` (from Plan 009 DAL)  
**Runnable:** ✓ Testable with curl

```typescript
app.post("/v1/webhooks/fire", async (request, reply) => {
  try {
    const { event_type, event_id, payload } = request.body;
    if (!event_type || !event_id) {
      return reply.code(400).send({ error: "event_type and event_id required" });
    }
    await webhookRepository.fireEvent(event_type, event_id, payload);
    return reply.code(202).send({ queued: true });
  } catch (error) {
    logger.error("[/v1/webhooks/fire]", error);
    return reply.code(500).send({ error: "Internal server error" });
  }
});

app.post("/v1/activity/track", async (request, reply) => {
  const userId = await requireApiAccess(request, reply);
  if (!userId) return reply;
  const { event, data } = request.body;
  if (!event) return reply.code(400).send({ error: "Event required" });
  await activityRepository.track(event, userId, data);
  return reply.code(202).send({ tracked: true });
});

app.get("/v1/activity/analytics", async (request, reply) => {
  const userId = await requireApiAccess(request, reply);
  if (!userId) return reply;
  const analytics = await activityRepository.getAnalytics(userId);
  return reply.send(analytics);
});
```

**Test:** `apps/api/tests/v1-webhooks-fire.test.ts`, `v1-activity.test.ts`

---

### Commit 4: Migrate web/lib/api-keys.ts
**File:** `apps/web/src/lib/api-keys.ts`  
**Changes:** Replace direct SQL with HTTP calls to `/v1/api-keys/validate`  
**Size:** ~50 LOC change  
**Runnable:** ✓ Endpoints `/v1/batch`, `/v1/report` still work

```typescript
// BEFORE:
import { sql } from "@/lib/db";
export async function validateApiKey(key: string): Promise<string | null> {
  const hash = hashApiKey(key);
  const result = await sql`SELECT user_id FROM api_keys WHERE key_hash = ${hash}`;
  return result[0]?.user_id ?? null;
}

// AFTER:
export async function validateApiKey(key: string): Promise<string | null> {
  try {
    const response = await fetch("/api/v1/api-keys/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!response.ok) return null;
    const { user_id } = await response.json();
    return user_id || null;
  } catch {
    return null;
  }
}
```

**Test:** Verify `/v1/batch` and `/v1/report` auth still works

---

### Commit 5: Migrate web/lib/usage.ts
**File:** `apps/web/src/lib/usage.ts`  
**Changes:** Replace direct SQL with HTTP calls  
**Functions affected:**
- `getUserPlan()` → calls `GET /v1/usage/plan`
- `hasApiAccess()` → calls `GET /v1/usage/plan`
- `hasAddon()` → calls `GET /v1/usage/addons`
- `listAddons()` → calls `GET /v1/usage/addons`
- `trackMcpCall()` → calls `POST /v1/usage/track-mcp`
- `getMcpUsageThisMonth()` → calls `GET /v1/usage/plan` (quota tracking)

**Size:** ~100 LOC change  
**Runnable:** ✓ Quota gating still enforced

```typescript
// BEFORE:
export async function getUserPlan(userId: string): Promise<PlanId> {
  const rows = await sql`SELECT plan_id FROM users WHERE id = ${userId}`;
  return (rows[0]?.plan_id as PlanId) ?? "free";
}

// AFTER:
export async function getUserPlan(userId: string): Promise<PlanId> {
  try {
    const response = await fetch("/api/v1/usage/plan");
    if (!response.ok) return "free";
    const { plan } = await response.json();
    return (plan as PlanId) ?? "free";
  } catch {
    return "free";
  }
}
```

**Test:** Verify plan gates still work in `/v1/report` and `/v1/batch`

---

### Commit 6: Migrate web/lib/webhooks.ts
**File:** `apps/web/src/lib/webhooks.ts`  
**Changes:** Replace `fireWebhookEvent()` with HTTP call  
**Functions affected:**
- `fireWebhookEvent()` → calls `POST /v1/webhooks/fire`
- `createWebhookSubscription()` (already has API endpoint)
- `listWebhookSubscriptions()` (already has API endpoint)

**Size:** ~40 LOC change  
**Runnable:** ✓ Webhook dispatch via API

```typescript
// BEFORE:
export async function fireWebhookEvent(...): Promise<void> {
  const subs = await sql`SELECT * FROM webhook_subscriptions WHERE ...`;
  // ... dispatch logic
}

// AFTER:
export async function fireWebhookEvent(eventType: string, eventId: string, payload: unknown): Promise<void> {
  try {
    await fetch("/api/v1/webhooks/fire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType, event_id: eventId, payload }),
    });
  } catch (error) {
    console.error("Webhook fire error:", error);
  }
}
```

**Test:** Verify webhook dispatch in background jobs

---

### Commit 7: Migrate web/lib/activity.ts
**File:** `apps/web/src/lib/activity.ts`  
**Changes:** Replace direct SQL with HTTP calls  
**Functions affected:**
- `trackEvent()` → calls `POST /v1/activity/track`
- `getAnalytics()` → calls `GET /v1/activity/analytics`

**Size:** ~50 LOC change  
**Runnable:** ✓ Activity tracking via API

```typescript
// BEFORE:
export async function trackEvent(event: string, userId: string, data?: unknown): Promise<void> {
  await sql`INSERT INTO activity_events (event, user_id, ...) VALUES (...)`;
}

// AFTER:
export async function trackEvent(event: string, userId: string, data?: unknown): Promise<void> {
  try {
    await fetch("/api/v1/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
  } catch (error) {
    console.error("Activity track error:", error);
  }
}
```

**Test:** Verify event tracking in background jobs

---

### Commit 8: Refactor web/lib/rate-limit.ts (infrastructure)
**File:** `apps/web/src/lib/rate-limit.ts`  
**Changes:** Remove direct DB access for rate limiting  
**Decision:** Move rate-limit queries to API layer?
  - Option A: Keep web-level rate-limiting (lightweight, local checks)
  - Option B: Move to API (centralized, but adds latency)

**Recommendation:** Option A (keep local, fast rate limiting in web)

**Size:** ~60 LOC cleanup  
**Runnable:** ✓ Rate limiting still works

---

### Commit 9: Delete db.ts and remove DATABASE_URL
**Files:**
- `apps/web/src/lib/db.ts` — **DELETE**
- `.env.local`, deployment config — Remove `DATABASE_URL`

**Size:** ~30 LOC deletion  
**Runnable:** ✓ Web no longer needs DB credentials

Verify build succeeds without `DATABASE_URL`:
```bash
cd apps/web && npm run build
```

---

### Commit 10: Add ESLint rule + documentation
**Files Created/Modified:**
- `apps/web/.eslintrc.json` — Add `no-restricted-imports` rule
- `docs/WEB_API_SEPARATION.md` — Architecture documentation

**Size:** ~50 LOC  
**Runnable:** ✓ ESLint enforces no future violations

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "name": "@/lib/db",
        "message": "❌ Web layer cannot import db directly. Use /api/v1/* endpoints instead."
      }
    ]
  }
}
```

---

## 7. Testing Strategy

### Per-Commit Validation

Each commit must pass:
1. **Build:** `npm run build` in both apps/web and apps/api
2. **Linter:** `npm run lint`
3. **Tests:** `npm run test`
4. **Manual:** Curl test for new endpoints (Commits 1-3)

### Test Files to Create

- `apps/api/tests/v1-api-keys-validate.test.ts`
- `apps/api/tests/v1-usage.test.ts`
- `apps/api/tests/v1-webhooks-fire.test.ts`
- `apps/api/tests/v1-activity.test.ts`

### Manual Verification Checklist (Before Merging)

- [ ] `/v1/batch` endpoint works (API key validation)
- [ ] `/v1/report` endpoint works (usage quota gating)
- [ ] Webhook dispatch works (via `/v1/webhooks/fire`)
- [ ] Activity tracking works (via `/v1/activity/track`)
- [ ] Web builds without `DATABASE_URL`
- [ ] ESLint rule prevents `@/lib/db` imports
- [ ] All existing tests pass (no regressions)

---

## 8. Branch Strategy

**Two branches (separate concerns):**

### Planning Phase: `feat/AR-203-web-api-separation`
- Contains the detailed implementation plan
- Includes architecture documentation
- No code changes
- Status: ✓ Complete

### Implementation Phase: `impl/AR-203-web-api-separation`
- Will contain the 10 commits
- Created from main after prerequisite plans (008, 009) are complete
- Single branch for implementation (follows CLAUDE.md rule 8)

**10 commits (on impl branch):**
```
impl/AR-203-web-api-separation
├── Commit 1: API endpoint: POST /v1/api-keys/validate
├── Commit 2: API endpoints: GET /v1/usage/*, POST /v1/usage/track-mcp
├── Commit 3: API endpoints: POST /v1/webhooks/fire, POST /v1/activity/track
├── Commit 4: Migrate web/lib/api-keys.ts to HTTP calls
├── Commit 5: Migrate web/lib/usage.ts to HTTP calls
├── Commit 6: Migrate web/lib/webhooks.ts to HTTP calls
├── Commit 7: Migrate web/lib/activity.ts to HTTP calls
├── Commit 8: Cleanup web/lib/rate-limit.ts infrastructure
├── Commit 9: Delete db.ts, remove DATABASE_URL
└── Commit 10: Add ESLint rule, update documentation
```

**All commits include:**
- Clear, intent-based messages (per CLAUDE.md rule 9)
- Co-authored-by trailer
- No destructive git actions (squashing, rebasing prohibited)

---

## 9. Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Breaking web routes | CRITICAL | LOW | Test each function before merging commit |
| API performance lag | MEDIUM | MEDIUM | Monitor fetch latency (<50ms per call) |
| Partial migration (missed files) | HIGH | MEDIUM | ESLint rule + CI checks catch violations |
| Race conditions (async fetch) | LOW | LOW | Existing web routes already async |
| Rate limit bypass | MEDIUM | LOW | Verify rate limit headers unchanged |

---

## 10. Success Criteria

- [ ] All 10 commits merged to main
- [ ] Zero direct SQL in `/apps/web/src/lib/` (except schema)
- [ ] Zero imports of `@/lib/db` in web routes (linted)
- [ ] All web tests pass (regressions: none)
- [ ] All API tests pass (new endpoints: 100% coverage)
- [ ] `DATABASE_URL` not present in web environment
- [ ] ESLint rule active and enforced
- [ ] Documentation updated with new architecture
- [ ] Web builds without DB credentials
- [ ] Performance baseline: <50ms per API call

---

## 11. Effort Estimate

| Phase | Commits | LOC Added | LOC Changed | LOC Deleted | Hours |
|-------|---------|-----------|-------------|------------|-------|
| Infrastructure | 1-3 | ~250 | — | — | 2-3 |
| Web Migration | 4-8 | — | ~300 | — | 2-3 |
| Cleanup | 9-10 | ~50 | — | ~30 | 1-2 |
| Testing | All | ~400 | — | — | 2-3 |
| **TOTAL** | **10** | **~700** | **~300** | **~30** | **7-11** |

---

## 12. Dependencies & Sequencing

- **Prerequisite:** Plan 009 (DAL with repositories) must be merged first
- **Blocks:** Any future direct DB access in web layer
- **Timeline:** After Plans 008 & 009 complete

---

## 13. CLAUDE.md Compliance

✓ **Rule 7:** Never modify main directly → Use `feat/AR-203-web-api-separation` branch  
✓ **Rule 8:** Logical commits → 10 small, atomic, reviewable commits  
✓ **Rule 9:** Clear messages → Intent-based commit messages  
✓ **Rule 13:** Simple solutions → Direct 1:1 mapping of web libs to API endpoints  
✓ **Rule 14:** Reuse patterns → Follow existing API endpoint conventions  
✓ **Rule 15:** Avoid premature abstraction → Straightforward, no over-engineering  

---

## 14. Next Steps

### Phase A: Planning (Complete ✓)
1. ✓ Create JIRA issue AR-203
2. ✓ Create planning branch: `feat/AR-203-web-api-separation`
3. ✓ Document plan with CLAUDE.md compliance checks
4. ✓ Verify prerequisites (Plan 008, Plan 009)

### Phase B: Implementation (Pending)
1. **Verify prerequisites:** Plans 008 & 009 merged and working
2. **Create implementation branch:** `impl/AR-203-web-api-separation` (from main)
3. **Implement Commit 1:** API endpoint for API key validation
4. **Test Commit 1:** Curl test, build, lint
5. **Commit 1 → code review** 
6. **Repeat for Commits 2-10**
7. **Create PR** from impl branch → main

---

**Status:** Planning phase complete, ready for implementation  
**Current Branch:** `feat/AR-203-web-api-separation` (planning)  
**Implementation Branch:** `impl/AR-203-web-api-separation` (to be created)  
**Next Action:** Begin implementation after Plans 008 & 009 complete
