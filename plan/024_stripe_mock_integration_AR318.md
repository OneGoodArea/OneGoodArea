# Plan 024: Stripe Mock Integration — Config, Compose, and Test Migration (AR-318 Phase 2)

## 1. JIRA Integration

- **Jira Issue:** AR-322
- **Previous Phase Jira:** AR-321 (Done — standalone mock service)
- **Plan File:** `plan/024_stripe_mock_integration_AR318.md`
- **Previous Plan:** `plan/023_stripe_mock_service_AR318.md`
- **Branch:** `feat/AR-318-stripe-mock-service`

---

## 2. Objective

Complete the Stripe Mock Service integration started in Plan 023 (AR-321). AR-321 delivered the standalone stripe-mock Docker service (`services/stripe-mock/*`). This plan covers wiring it into the application config, adding it to the compose test stack, building it via the Makefile, and migrating the two Stripe route test files from `vi.mock()` to the Docker mock service.

---

## 3. Context — What was done in Phase 1 (AR-321 ✅)

The following files exist and are committed on `feat/AR-318-stripe-mock-service`:

- `services/stripe-mock/server.js` — zero-dependency HTTP server with control API (`POST /__test/reset`, `POST /__test/expect`, `GET /__test/health`)
- `services/stripe-mock/Dockerfile` — single-stage Node 22 Alpine image
- `services/stripe-mock/package.json` — minimal package, no dependencies
- `services/stripe-mock/healthcheck.js` — exits 0 if `/__test/health` returns 200

---

## 4. Files to Change

### 4.1 `apps/api/src/modules/billing/stripe-client.ts`

Add `apiBase` support to the Stripe constructor so the client can be pointed at the mock service:

```typescript
const config = getConfig();
stripeClient = new Stripe(secretKey, {
  typescript: true,
  ...(config.stripeApiBaseUrl ? { apiBase: config.stripeApiBaseUrl } : {}),
});
```

### 4.2 `apps/api/src/infrastructure/config/index.ts`

Add `stripeApiBaseUrl` field (optional string, defaults to undefined) to `ApiConfig` and `getConfig()`:

```typescript
stripeApiBaseUrl: process.env.STRIPE_API_BASE_URL || undefined,
```

### 4.3 `compose/compose.test.yml`

Add `stripe-mock-test` service:

```yaml
stripe-mock-test:
  build:
    context: ../services/stripe-mock
    dockerfile: Dockerfile
  image: onegoodarea/stripe-mock:local
  healthcheck:
    test: ["CMD", "node", "healthcheck.js"]
    interval: 3s
    timeout: 3s
    retries: 20
    start_period: 5s
```

Add env vars to `api-test`:

```yaml
STRIPE_API_BASE_URL: http://stripe-mock-test:12111
STRIPE_SECRET_KEY: sk_test_mock
```

Make `api-test` depend on `stripe-mock-test` with `condition: service_healthy`.

### 4.4 `apps/api/tests/stripe-checkout.test.ts`

- Remove `vi.mock("@/modules/billing/stripe-client")` — the real client now hits the mock service
- Remove all `vi.mocked(stripe.*)` variables — no longer mocking at JS level
- Add `POST /__test/reset` + `POST /__test/expect` calls in `beforeEach` to set up per-test scenarios
- Import `APP_URL` from `@/infrastructure/config` and use in assertions for URLs
- Keep all other `vi.mock()` calls (session-token, usage, db, activity) — only stripe-client changes

### 4.5 `apps/api/tests/stripe-session-routes.test.ts`

Same changes as above.

### 4.6 `build/targets-services.mk`

Add `build-stripe-mock-test-image` target and include it in `build-test-images`:

```makefile
build-stripe-mock-test-image: ## Build the stripe-mock-test Docker image
	$(CTR_COMPOSE_TEST_CMD) build stripe-mock-test

build-test-images: ## Build all test Docker images
	$(CTR_COMPOSE_TEST_CMD) build stripe-mock-test api-test web-test
```

---

## 5. Out of Scope

- **Webhook tests** (`stripe-webhook.test.ts`) — webhooks use `stripe.webhooks.constructEvent()` which verifies signatures. That's a different problem from the checkout/portal route tests. Keep the existing `vi.mock()` for webhook tests for now.
- **Stripe client unit tests** (`stripe-client.test.ts`) — these test the lazy-init proxy itself, not the HTTP calls. Keep as-is.
- **Other `vi.mock()` cleanup** — only the checkout and session route tests are migrating. Other test files that mock `stripe-client` can be migrated later if needed.

---

## 6. Commit Strategy

| # | Commit | Scope |
|---|---|---|
| 1 | `feat(config): add STRIPE_API_BASE_URL to ApiConfig` | `config/index.ts`, `stripe-client.ts` |
| 2 | `feat(compose): add stripe-mock-test service to test stack` | `compose/compose.test.yml`, `build/targets-services.mk` |
| 3 | `test(stripe): migrate checkout tests to use Docker mock service` | `stripe-checkout.test.ts` |
| 4 | `test(stripe): migrate session route tests to use Docker mock service` | `stripe-session-routes.test.ts` |

---

## 7. Verification Checklist

- [ ] `STRIPE_API_BASE_URL` env var is picked up by `stripe-client.ts` and passed to Stripe constructor
- [ ] `make build-test-images` builds the stripe-mock service
- [ ] `make api-test-container` passes all stripe checkout tests
- [ ] `make api-test-container` passes all stripe session route tests
- [ ] `npm run test -w @onegoodarea/api` still passes locally (no regressions)
- [ ] `npm run typecheck` passes

---

## 8. Risk Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Stripe SDK `apiBase` option doesn't behave identically to the live API | MEDIUM | Mock only the endpoints the routes actually call. Test assertions focus on URL construction + metadata — not Stripe-side logic. |
| `vi.mock()` removal breaks tests that still need it | HIGH | Keep all other `vi.mock()` calls intact. Only remove the `stripe-client` mock. Other modules (session-token, usage, db) are still mocked. |
| Control API is too complex for test authors | LOW | Keep the interface minimal — `reset` + `expect(method, path, status, body)` is <5 lines per test scenario. Same mental model as `mockResolvedValueOnce`. |

---

## 9. Success Criteria

- [ ] All 14 failing tests pass in the container
- [ ] No hardcoded URLs in stripe test assertions (all use `APP_URL`)
- [ ] Stripe client makes real HTTP calls through the SDK in tests
- [ ] Per-test scenario control (happy path, Stripe error, network failure)
- [ ] Zero new external dependencies
- [ ] All verification checklist items green
