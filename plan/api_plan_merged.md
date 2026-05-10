# OneGoodArea API Split Plan (Merged)

## 1. What each prior plan missed

### What `api_plan_copilot.md` did better
1. Clear target architecture: **web**, **public API**, **internal API**
2. Better diagnosis of current coupling
3. Better route classification and migration surfaces
4. Better route-by-route TDD coverage expectations
5. Better handling of admin as **internal**, not public

### What `api_plan_gemini.md` did better
1. Better emphasis on **module-by-module migration**
2. Better emphasis on a dedicated **backend workspace**
3. Better emphasis on converting existing test artifacts into executable tests
4. Better emphasis on explicit auth migration steps

### What both missed or underweighted
1. **Vercel free-plan constraints**: do not force an early 2-project operational split
2. **Transition safety**: do the split first as a **logical separation inside the current repo**
3. **Small-module migration sequence**: each domain should be extracted, tested, switched, and cleaned up independently
4. **Avoiding a big-bang auth rewrite**
5. **Keeping one deployment first, then two deployments later**

---

## 2. Recommended strategy

**Yes — modularization first, one module at a time, is the best approach.**

For your current stage and **Vercel free plan**, the safest plan is:

1. **Create a backend architecture inside the current repo first**
2. **Move the web to consume HTTP only**
3. **Keep one Vercel deployment during the migration**
4. **Split into two Vercel projects only after the API boundary is real and stable**

This gives you the backend split you want **without** adding avoidable deployment complexity too early.

---

## 3. Recommended end state

### Stage A — transitional target (recommended now)

One repository, one deployment, but **three logical surfaces**:

| Surface | Consumers | Exposure |
|---|---|---|
| Web app | browser users | first-party only |
| Public API | enterprise clients, partner systems | public/versioned |
| Internal API | admin UI, Stripe webhook, cron, internal tooling | private/internal only |

### Stage B — final target (recommended later)

Two deployments:

| Deployment | Contains |
|---|---|
| `web` | UI, auth UX, docs, static pages |
| `api` | public API, internal API, billing, cron, admin endpoints |

**Admin recommendation:** keep admin in the **API deployment**, but under `/internal/admin/*`, with role-based auth. Do not expose admin functionality through the customer API.

---

## 4. Target modularization

Create modules first, then migrate code into them individually.

```text
src/modules/
  auth/
  reports/
  usage/
  api-keys/
  watchlist/
  account/
  billing/
  admin/
  tracking/
  widget/
  shared/

src/contracts/
  public-api/
  web-api/
  internal-api/

src/infrastructure/
  db/
  repositories/
  external/

src/tests/
  contracts/
  integration/
  modules/
  fixtures/
```

### Module ownership

| Module | Owns |
|---|---|
| `auth` | user identity, session bridge, admin roles, API credentials |
| `reports` | report generation, report retrieval, report deletion |
| `usage` | plan limits, API access rules, rate/entitlement checks |
| `api-keys` | create/list/revoke/validate keys |
| `watchlist` | saved areas |
| `account` | password, delete account, user profile/subscription view |
| `billing` | checkout, portal, cancel, webhook processing |
| `admin` | analytics, traffic, admin-only data |
| `tracking` | events, page tracking, internal telemetry |
| `widget` | public cached widget access |

---

## 5. TDD operating model

For **every module**, use the same exact loop:

1. Write or update the **contract test**
2. Write the **module/unit test**
3. Write the **repository/infrastructure test** if persistence changes
4. Write the **route integration test**
5. Make the adapter pass
6. Switch one caller
7. Remove old direct usage

### Test layers

| Layer | Purpose |
|---|---|
| Contract tests | request/response shape and error contract |
| Module tests | business rules |
| Repository tests | SQL behavior and persistence |
| Route integration tests | auth + validation + module wiring |
| Optional HTTP smoke tests | end-to-end verification after main suite is green |

### Quality gate order

1. `npm run test`
2. `npm run lint`
3. `npm run build`
4. `npm run test:api` only after the HTTP tooling is pinned and reproducible

---

## 6. Reproducible test setup

### Keep
1. Vitest as the primary test runner
2. Existing library tests
3. Existing `.http` files as optional smoke checks

### Change
1. Stop excluding all route code from meaningful API coverage goals
2. Add executable route integration tests for the API pathways
3. Add fixtures/factories for users, subscriptions, API keys, reports
4. Pin any HTTP test tooling in `devDependencies`
5. Use a deterministic test database path/environment

### Practical recommendation

Do **not** start by building a parser from `tests_files/tests-automated.md`.

Instead:
1. Use those documents as a source checklist
2. Convert them gradually into **real Vitest test files**
3. Keep the `.http` collection as regression/smoke coverage only

That is simpler, safer, and easier to maintain.

---

## 7. Auth strategy

Do this in two stages.

### Stage 1 — during logical split
1. Keep existing web session auth working
2. Keep API-key auth for the public API
3. Introduce a dedicated internal auth check for admin/internal routes
4. Remove hardcoded email allowlists and replace with a role/permission model

### Stage 2 — during physical split
1. Let the web authenticate the user
2. Let the web call the API with a backend-trusted token/session bridge
3. Keep customer API auth fully separate from web sessions
4. Keep admin/internal auth separate from customer credentials

**Do not** make customer API keys usable against internal/admin routes.

---

## 8. Route target map

| Current route | Target |
|---|---|
| `/api/v1/report` | public API `/v1/reports` |
| `/api/widget` | public API `/v1/widget` or `/v1/widgets/:postcode` |
| `/api/report` | web API `/me/reports` |
| `/api/report/[id]` | web API `/me/reports/:id` |
| `/api/watchlist` | web API `/me/watchlist` |
| `/api/watchlist/[id]` | web API `/me/watchlist/:id` |
| `/api/usage` | web API `/me/usage` |
| `/api/keys` | web API `/me/api-keys` |
| `/api/keys/usage` | web API `/me/api-usage` |
| `/api/settings/*` | web API `/me/account/*` |
| admin page direct fetches | internal API `/internal/admin/*` |
| `/api/stripe/*` | internal API `/internal/billing/*` |
| `/api/cron/rescore` | internal API `/internal/cron/rescore` |
| `/api/track` | internal API `/internal/track` |
| `/api/health` | internal API `/internal/health` or public health if needed |

---

## 9. Migration sequence

## Phase 0 — Freeze and classify

1. Choose the **single canonical UI tree**
2. Freeze the API inventory
3. Classify every route as **public**, **web**, or **internal**
4. Freeze v1 public API scope
5. Define admin permission model

## Phase 1 — Foundation

1. Create module directories
2. Create contract directories
3. Create repository interfaces
4. Move database bootstrap/schema creation out of request handlers
5. Add shared test fixtures/factories
6. Pin missing test tooling if needed

## Phase 2 — Reports module first

This should be the first migrated module because it is the main business capability and already has both session and API-key consumers.

1. Write contract tests for:
   - session report creation
   - API-key report creation
   - report retrieval
   - report deletion
2. Extract `reports` use cases from route code
3. Extract report repository
4. Rebuild existing routes as thin adapters
5. Add target `/me/reports` and `/v1/reports` handlers
6. Switch one report caller in the web app
7. Remove one direct DB read path

## Phase 3 — Watchlist module

1. Add contract tests
2. Extract module logic
3. Extract repository
4. Add route integration tests
5. Switch dashboard/report UI callers
6. Remove old direct usage

## Phase 4 — Usage + API keys module

1. Extract usage policies
2. Extract API-key creation/list/revoke/validate logic
3. Add full integration tests
4. Switch API usage dashboard
5. Switch key management UI

## Phase 5 — Account module

1. Password change
2. Delete account
3. Subscription info read model
4. Registration / forgot-password / reset-password / resend-verification
5. Full route tests for auth, validation, and persistence

## Phase 6 — Billing module

1. Checkout
2. Portal
3. Cancel
4. Webhook idempotency
5. Split public-facing account actions from internal webhook processing

## Phase 7 — Admin module

1. Add admin role model
2. Create `/internal/admin/analytics`
3. Create `/internal/admin/traffic`
4. Move admin page to consume internal APIs only
5. Remove direct DB access from admin pages

## Phase 8 — Tracking + widget module

1. Move tracking into internal API/module boundary
2. Keep widget as public/cached-only
3. Add CORS and cache contract tests

## Phase 9 — Web becomes HTTP-only

1. Remove all remaining direct page-level DB reads
2. Remove direct imports of repositories and business logic from pages
3. Ensure the web can run without DB credentials

## Phase 10 — Physical deployment split

Only do this after all previous phases are green.

1. Create `apps/web`
2. Create `apps/api`
3. Move modules/contracts/infrastructure into shared packages
4. Point `web` to `api` via environment variables
5. Deploy as two Vercel projects

---

## 10. Per-module migration template

Use this exact checklist for each module.

1. Identify current files using the module
2. Freeze route contract
3. Write failing contract tests
4. Write failing module tests
5. Write failing integration tests
6. Extract module service/use cases
7. Extract repository
8. Rewire existing route to module
9. Add target route namespace if applicable
10. Switch one UI consumer
11. Remove one old direct import / DB path
12. Run test/lint/build
13. Move to next module

---

## 11. Required TDD coverage by surface

### Public API
1. auth failures
2. invalid input
3. rate limiting
4. entitlement failures
5. all intent permutations
6. success payload shape
7. downstream/internal failure mapping

### Web API
1. unauthenticated access
2. ownership checks
3. validation
4. persistence
5. plan/usage logic
6. side-effect behavior

### Internal API
1. admin/auth restrictions
2. secret validation
3. webhook idempotency
4. cron authorization
5. null/empty dataset handling

---

## 12. Vercel free-plan guidance

For now:

1. Prefer **one Vercel project during the migration**
2. Avoid introducing a separate always-on backend service early
3. Keep the split **logical first**, **physical later**
4. Keep cron, webhook, admin, and public API isolated by namespace and auth, even if hosted together
5. Only create a second Vercel project when:
   - the web no longer needs DB access
   - the API boundary is stable
   - module tests and route tests are green

This minimizes deployment complexity while still moving toward the correct architecture.

---

## 13. What not to do

1. Do not migrate both UI trees at once
2. Do not start with billing or admin
3. Do not do a big-bang auth rewrite first
4. Do not expose internal/admin routes in the public API
5. Do not keep request-time table creation
6. Do not physically split deployments before the logical split is complete
7. Do not treat manual plans as the primary executable test suite

---

## 14. Final recommended implementation order

1. Freeze scope and choose canonical UI
2. Create modules/contracts/repositories foundation
3. Migrate **reports**
4. Migrate **watchlist**
5. Migrate **usage**
6. Migrate **api-keys**
7. Migrate **account/auth flows**
8. Migrate **billing**
9. Migrate **admin**
10. Migrate **tracking/widget**
11. Remove all direct DB reads from the web
12. Split into `web` and `api` deployments

---

## 15. Definition of done

1. Web pages no longer access the DB directly
2. All user/admin/customer interactions go through HTTP APIs
3. Public API is versioned and documented
4. Internal/admin routes are isolated and not exposed to customers
5. Every migrated module has contract, module, and integration tests
6. The migration was executed one module at a time with green checks at each step
7. The app can stay on one Vercel project during migration and split cleanly later
