# Plan: E2E Test Suite + Zod Schema Migration + Contact 500 Fix

## Overview

Build comprehensive Vitest E2E test suite for all API endpoints with DB before/after SQL verification, migrate all route bodies from raw JSON Schema to Zod schemas (via `@onegoodarea/contracts`), and fix the contact API 500 error as the first deliverable.

## Phase 1: Fix Contact Route 500 Bug

**File: `apps/api/src/routes/contact.ts`**

**Root cause:** The handler body (lines 71-117) has NO top-level try/catch. The `rateLimit()` call at line 74 is unprotected - if the DB is down, `rateLimit()` throws an unhandled rejection, Fastify returns a raw 500. Every other handler in the codebase wraps its body in `try { ... } catch { return reply.code(500)... }`.

**Changes:**
1. Wrap handler body in top-level try/catch (matching `auth.ts` pattern)
2. Add `500: ContactErrorResponse` to the response schema
3. Add test case in `apps/api/tests/routes/contact.test.ts` for `rateLimit` throwing -> 500

## Phase 2: Add Missing Zod Schemas to `packages/contracts`

**New files:**

| File | Schema | Used By |
|------|--------|---------|
| `packages/contracts/src/contact.ts` | `ContactRequestSchema` | `contact.ts` body |
| `packages/contracts/src/api-keys.ts` | `CreateApiKeyRequestSchema`, `UpdateApiKeyRequestSchema` | `api-keys.ts` |
| `packages/contracts/src/webhooks.ts` | `CreateWebhookRequestSchema` | `webhooks.ts` POST |
| `packages/contracts/src/admin.ts` | `SetUserTierRequestSchema` | `admin.ts` tier |
| `packages/contracts/src/common.ts` | `IdParamsSchema`, `OrgMemberParamsSchema` | Shared param schemas |

**Extend existing:**

| File | Change | Used By |
|------|--------|---------|
| `packages/contracts/src/scores.ts` | Add `preset_id`, `bundle` to `ScoreRequestSchema` | `scoring.ts` |
| `packages/contracts/src/portfolios.ts` | Add `EnrichPortfolioRequestSchema`, `ChangesRequestSchema` | `portfolios.ts` |

Export all from `packages/contracts/src/index.ts`.

## Phase 3: Migrate Route Bodies to Zod

Replace raw JSON Schema `body` objects with imported Zod schemas:

| Route File | Endpoints |
|-----------|-----------|
| `contact.ts` | POST /contact |
| `scoring.ts` | POST /v1/score |
| `portfolios.ts` | POST /v1/portfolios, areas, enrich, changes |
| `intelligence.ts` | POST /v1/query, peers, insights, forecast |
| `webhooks.ts` | POST /v1/webhooks |
| `api-keys.ts` | POST /keys, PATCH /keys/:id |
| `admin.ts` | POST /admin/users/:id/tier |

**NOT migrated:** Auth routes (manual validation due to complex provider logic).

## Phase 4: E2E Test Infrastructure + 14 Test Files

**Infrastructure:**

| File | Purpose |
|------|---------|
| `apps/api/vitest.config.e2e.ts` | Separate Vitest config, no MSW, `tests/e2e/` directory |
| `apps/api/tests/e2e/helpers/db.ts` | Direct Neon SQL for before/after verification |
| `apps/api/tests/e2e/helpers/api.ts` | `buildApp()` + `app.inject()` client |
| `apps/api/tests/e2e/helpers/progress.ts` | `[X/Y] POST /v1/portfolios (0.12s)` reporter |
| `apps/api/tests/e2e/helpers/setup.ts` | Migrations, test user, API key, session token |

**Test files (~134 tests):**

| File | Endpoints Covered |
|------|------------------|
| `contact.e2e.test.ts` | POST /contact (5 cases) |
| `scoring.e2e.test.ts` | POST /v1/score (4 cases) |
| `portfolios.e2e.test.ts` | CRUD + enrich + changes (10 cases) |
| `intelligence-query.e2e.test.ts` | POST /v1/query (4 cases) |
| `intelligence-peers.e2e.test.ts` | POST /v1/peers (3 cases) |
| `intelligence-insights.e2e.test.ts` | POST /v1/insights (3 cases) |
| `intelligence-forecast.e2e.test.ts` | POST /v1/forecast (4 cases) |
| `webhooks.e2e.test.ts` | CRUD + rotate (5 cases) |
| `api-keys.e2e.test.ts` | CRUD + usage (5 cases) |
| `me.e2e.test.ts` | Profile, activity, webhooks, portfolios, org (8 cases) |
| `admin.e2e.test.ts` | Analytics, audience, usage, tier (5 cases) |
| `orgs.e2e.test.ts` | Orgs + members + bundles + presets + cohorts (12 cases) |
| `auth.e2e.test.ts` | Register, login, magic link, reset, delete (8 cases) |
| `billing.e2e.test.ts` | Stripe webhooks + subscription (4 cases) |

Each mutating test runs SQL before/after to prove DB side-effects.

## Phase 5: Makefile Targets

Add to `build/targets-services.mk`:

```makefile
api-e2e-container: ## Run API E2E tests in ephemeral container
	$(CTR_COMPOSE_TEST_CMD) run $(BUILD_FLAG_TEST) --rm --entrypoint sh api-test \
	  -lc "npm install --no-audit --no-fund && npx vitest run --config apps/api/vitest.config.e2e.ts -w @onegoodarea/api"; \
	EXIT=$$?; $(CTR_COMPOSE_TEST_CMD) down; exit $$EXIT

api-e2e-local: ## Run API E2E tests locally (requires running dev stack)
	npx vitest run --config apps/api/vitest.config.e2e.ts -w @onegoodarea/api
```

## Implementation Order

1. **Phase 1** - Contact 500 fix (smallest, highest value)
2. **Phase 2** - Zod schemas in contracts (prerequisite for Phase 3)
3. **Phase 3** - Route body migration (straightforward)
4. **Phase 4** - E2E tests (main deliverable)
5. **Phase 5** - Makefile targets (CI wiring)

## Key Design Decisions

- **E2E tests use `app.inject()`** (Fastify's built-in), not HTTP, so they run in-process with no port binding
- **DB verification uses raw `sql` tagged templates** from `@neondatabase/serverless`, not an ORM - matching the production codebase pattern
- **The hybrid validator/compiler** (`hybrid-validator-compiler.ts`) already dispatches Zod vs AJV per route - Zod body schemas are a drop-in
- **Auth routes stay manual** - their body validation is intertwined with business logic (provider checks, password strength)
- **Playground endpoints are dead** - retired in Plan 050, no tests needed
