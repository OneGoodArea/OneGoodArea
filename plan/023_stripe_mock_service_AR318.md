# Plan 023: Stripe Mock Service for Containerised API Tests (AR-318)

## Status: PHASE 1 COMPLETE ✅ — Phase 2 moved to Plan 024

- **Jira Issue:** AR-321 (Done)
- **Next Phase Jira:** AR-322
- **Plan File:** `plan/023_stripe_mock_service_AR318.md`
- **Next Plan:** `plan/024_stripe_mock_integration_AR318.md`
- **Branch:** `feat/AR-318-stripe-mock-service`

---

## 2. Objective

Replace vitest-level `vi.mock()` of the Stripe SDK in API tests with a real HTTP mock Stripe service running in Docker, so that:

- The Stripe client makes genuine HTTP calls through its SDK instead of being intercepted by vitest module mocks
- Tests can control responses per scenario (happy path, unhappy path, errors) via a control API
- Tests reset state between runs (same pattern as the DB + neon-proxy)
- Stripe integration tests are decoupled from the vitest module-mock system

---

## 3. Why — Problem Analysis

### 3.1 Current approach has two problems

**Problem A — Hardcoded URLs in test assertions**

Both `stripe-checkout.test.ts` and `stripe-session-routes.test.ts` assert against `"https://www.onegoodarea.com/..."`:

```typescript
// stripe-checkout.test.ts:70-71
cancel_url: "https://www.onegoodarea.com/pricing",

// stripe-session-routes.test.ts:56
return_url: "https://www.onegoodarea.com/dashboard",
```

But `APP_URL` is derived from `NEXTAUTH_URL`, which `compose.test.yml` sets to `http://localhost:3000`. The actual URLs generated at runtime are `http://localhost:3000/...`, producing assertion failures in the container.

**Problem B — Stripe is mocked at the JS module level**

Tests use `vi.mock("@/modules/billing/stripe-client")` to replace the `stripe` proxy with synthetic mock functions. This means:

- Tests never exercise the real `stripe-client.ts` module (the lazy-init proxy, the config-based secret key lookup)
- The mock is brittle — it must exactly match the shape of every Stripe method a route calls
- Adding a new Stripe endpoint call to a route requires updating the mock in every test file that hits that route
- The test cannot distinguish between "the mock was called correctly" and "the real SDK would work"

### 3.2 Why a custom mock service (and not alternatives)

| Option | Considered? | Verdict |
|---|---|---|
| **`stripe/stripe-mock`** (official Go binary) | ✅ | Returns static example data for every endpoint. No way to control per-test responses. No state reset. Would still need `vi.mock()` for scenario control — defeats the purpose. |
| **`localstripe`** (community Python) | ✅ | Stateful, more complete, but adds Python dependency to the stack. No control API for per-test seeding. Unclear maintenance trajectory. |
| **Custom Node.js service** | ✅ | Follows the exact pattern of `services/neon-compat-proxy` — small HTTP server with a `POST /__test/expect` control endpoint and `POST /__test/reset`. Zero new dependencies (Node is already in the stack). Full control over every response shape and error scenario. Maintained by us. |

### 3.3 How a control API works

Tests pre-register expected responses before each scenario and reset between tests:

```typescript
// Test setup calls this before each scenario
await fetch("http://stripe-mock:12111/__test/reset", { method: "POST" });
await fetch("http://stripe-mock:12111/__test/expect", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    method: "POST",
    path: "/v1/checkout/sessions",
    status: 200,
    body: { id: "cs_test_1", url: "https://checkout.stripe.com/c/sess_1", ... },
  }),
});
```

Between test suites, `POST /__test/reset` clears all expectations so no state leaks between files.

---

## 4. PHASE 1 — Files to Create ✅ COMPLETE

### 4.1 `services/stripe-mock/package.json`

Minimal Node.js package, same pattern as `services/neon-compat-proxy/package.json`.

### 4.2 `services/stripe-mock/server.js`

A plain HTTP server (no Express/Fastify dependency — keep it zero-dep like neon-compat-proxy) that:

1. **Control endpoints**:
   - `POST /__test/reset` — clears all pre-registered expectations
   - `POST /__test/expect` — registers a single expectation (method + path pattern → status + body)
   - `GET /__test/health` — healthcheck (return 200)

2. **Stripe API endpoints** (proxied to the controlled state machine):
   - `POST /v1/checkout/sessions` — checkout session creation
   - `POST /v1/billing_portal/sessions` — portal session creation
   - `POST /v1/customers` — customer creation
   - `GET /v1/customers/:id` — customer retrieval
   - `GET /v1/subscriptions/:id` — subscription retrieval
   - `POST /v1/subscriptions/:id` — subscription update

   **Matching logic**: look up the most recently registered expectation matching method + path. If found, return its status + body. If not found, return 501 with a clear message (catches unexpected calls in tests).

3. **State machine** (minimal): each expectation is consumed once by default (pop the match), or can be marked as persistent. This matches how `vi.fn().mockResolvedValueOnce(...)` works.

### 4.3 `services/stripe-mock/Dockerfile`

Multi-stage? No — single stage, minimal Node image, same as neon-compat-proxy:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 12111
CMD ["node", "server.js"]
```

### 4.4 `services/stripe-mock/healthcheck.js`

Standard healthcheck that `GET /__test/health` returns 200.

---

## 5. PHASE 2 — Files to Change → MOVED TO PLAN 024 (AR-322)

The following sections (originally Sections 5-10 of this plan) have been moved to `plan/024_stripe_mock_integration_AR318.md`:

- 5.1 `apps/api/src/modules/billing/stripe-client.ts` — Add `apiBase` support
- 5.2 `apps/api/src/infrastructure/config/index.ts` — Add `stripeApiBaseUrl` field
- 5.3 `compose/compose.test.yml` — Add `stripe-mock-test` service + env vars
- 5.4 `apps/api/tests/stripe-checkout.test.ts` — Migrate from vi.mock()
- 5.5 `apps/api/tests/stripe-session-routes.test.ts` — Migrate from vi.mock()
- 5.6 `build/targets-services.mk` — Add build target
- Commit strategy, verification checklist, risk mitigation, success criteria

---

## 6. Commit (Phase 1)

```
feat(stripe-mock): add Docker test service with control API (AR-321)

Add the standalone stripe-mock HTTP service that will replace vi.mock()
in Stripe API tests:
- server.js: zero-dependency HTTP server with POST /__test/reset,
  POST /__test/expect, and GET /__test/health control endpoints
- Route all Stripe API paths through an expectation-based state machine
- Dockerfile, package.json, healthcheck.js following the neon-compat-proxy pattern

Phase 2 (config wiring, compose service, test migration) tracked in AR-322.

Generated with [Continue](https://continue.dev)

Co-Authored-By: Continue <noreply@continue.dev>
```
