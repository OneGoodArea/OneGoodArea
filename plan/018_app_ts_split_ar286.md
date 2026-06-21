# Plan 018: Split apps/api/src/app.ts into per-domain route modules (AR-286)

## 1. Jira

- **Jira issue:** AR-286
- **Plan file:** `plan/018_app_ts_split_ar286.md`
- **Branch (when implementation starts):** `feat/AR-286-app-ts-split`
- **Reviewer:** Marcos
- **Depends on:** nothing; orthogonal to the bug fixes surfaced by `docs/TESTING/api-end-to-end-2026-06-12.md` (those get their own tickets)

---

## 2. Why

Marcos flagged 2026-06-12 that `apps/api/src/app.ts` is too large and should be split. His exact guidance (Portuguese, translated):

> Split into modules. Plan with Claude first — you want related functions in a module. You don't want a utility class.

**Current state:**

| Metric | Value |
|---|---|
| `app.ts` total lines | **4,893** (verified 2026-06-20) |
| Route registrations | **94** (37 GET, 37 POST, 5 PATCH, 14 DELETE, 1 PUT — incl. typed-generic routes `app.delete<{...}>(...)`) |
| Unique route paths | **~60** |
| Top-level helper functions | **12** (auth ×4 incl. `authenticateEither`, CORS, ip extraction, bundle resolution, etc.) |
| Module-level imports | **~50** (from `./modules/*` + infrastructure + contracts) |
| Middleware added since plan | `@fastify/swagger` + `@fastify/swagger-ui` registered in `buildApp` (`/docs`, `/openapi.json`) — stays inline |

The business logic already lives in `apps/api/src/modules/{orgs,signals,scoring,intelligence,monitor,api-keys,...}`. What sits in `app.ts` is mostly:

1. **Route registration** — `app.get/post/patch/delete(path, handler)` glue that calls into the modules.
2. **Shared auth helpers** — `requireApiAccess`, `requireApiAccessWithOrg`, `authenticateSession`, etc.
3. **Cross-cutting helpers** — `resolveBundleForCaller`, `effectiveEngineVersionForCaller`, CORS for the widget, IP extraction.
4. **App assembly** — `buildApp()` itself.

So the split is mostly mechanical: lift each cohesive group of `app.X(...)` calls into a `routes/<domain>.ts` file that exports a `register<Domain>Routes(app)` function, and have `app.ts` call each register function in `buildApp()`.

---

## 3. The mandate Marcos was explicit about

> **You don't want a utility class.**

We will NOT create:
- A `routes-helpers.ts` grab-bag.
- A `RouteUtils` class that several domains import from.
- Cross-domain "convenience" functions that bridge unrelated concerns.

We WILL create:
- One `routes/<domain>.ts` per cohesive domain. Routes in the same module share their parameter shapes, their auth gates, and their business module dependency. That's functional cohesion.
- A thin `app.ts` that builds Fastify and calls each `register<X>Routes(app)`.
- A shared `shared/auth.ts` that holds the auth helpers used across every route module (this is NOT a utility class — it's a single-purpose module exporting the auth surface, same shape as `modules/auth/session-token.ts` today).

---

## 4. The target shape

```
apps/api/src/
├── app.ts                      # ~150 LOC — Fastify build + middleware + register*Routes calls
├── shared/
│   ├── auth-api.ts             # authenticate, requireApiAccess, requireApiAccessWithOrg (API-key callers)
│   ├── auth-session.ts         # authenticateSession (NextAuth bridge callers)
│   ├── auth-either.ts          # authenticateEither (dual-auth for /v1/orgs/*; imports auth-api + auth-session)
│   ├── bundles.ts              # resolveBundleForCaller, effectiveEngineVersionForCaller
│   ├── http.ts                 # widgetCorsHeaders, clientIpOf, headerString, isFromMcpServer
│   └── errors.ts               # isAppError narrowing helper (re-exported from infrastructure/errors if it lives there)
├── routes/
│   ├── system.ts               # /health, /v1/meta, /cron/rescore
│   ├── auth.ts                 # /auth/* + /settings/password + /settings/delete-account
│   ├── me.ts                   # /v1/me, /me/*, /usage, /settings/subscription, /watchlist/*, /track
│   ├── api-keys.ts             # /keys, /keys/:id, /keys/usage
│   ├── reports.ts              # /v1/report, /report, /report/:id
│   ├── stripe.ts               # /stripe/*
│   ├── signals.ts              # /v1/area, /v1/signals/:category, /v1/areas, /widget
│   ├── scoring.ts              # /v1/score, /v1/batch
│   ├── portfolios.ts           # /v1/portfolios + sub-resources
│   ├── orgs.ts                 # /v1/orgs root: POST list GET PATCH
│   ├── org-members.ts          # /v1/orgs/:id/members + /v1/orgs/:id/invitations + /v1/invitations/:token/accept
│   ├── org-bundles.ts          # /v1/orgs/:id/bundles + bundle CRUD
│   ├── org-presets.ts          # /v1/orgs/:id/presets + preset CRUD
│   ├── org-cohorts.ts          # /v1/orgs/:id/cohorts + cohort CRUD
│   ├── org-methodology.ts      # /v1/orgs/:id/methodology (GET/PUT/DELETE)
│   ├── intelligence.ts         # /v1/query, /v1/peers, /v1/insights, /v1/forecast
│   ├── webhooks.ts             # /v1/webhooks POST+GET, /v1/webhooks/:id DELETE+rotate-secret (AR-283 shipped)
│   └── admin.ts                # /admin/analytics, /admin/traffic-analytics, /admin/audience, /admin/usage, /admin/revenue
└── modules/                    # UNCHANGED — business logic stays where it is
```

**17 route files** + **4 shared helpers** + **1 thin app.ts**. Average route file size: ~180 LOC. Largest expected to be `routes/portfolios.ts` and `routes/orgs.ts` at ~250 LOC each. None over 300.

---

## 5. Per-file route inventory

_Line numbers verified 2026-06-20 against `app.ts` @ 4,893 LOC. Routes use both plain (`app.get("...")`) and typed-generic (`app.delete<{ Params }>("...")`) forms — the split lifts both verbatim._

| File | Routes (lines in current `app.ts`) | Approx LOC |
|---|---|---|
| `routes/system.ts` | `/health` (536), `/v1/meta` (548), `/cron/rescore` (4868) | ~60 |
| `routes/auth.ts` | `/auth/register` (4112), `/auth/resend-verification` (4193), `/auth/forgot-password` (4240), `/auth/reset-password` (4288), `/auth/login` (4333), `/auth/magic-link/request` (4389), `/auth/check-email` GET (4439), `/auth/check-email` POST (4478), `/auth/oauth-callback` (4519), `/settings/password` (4565), `/settings/delete-account` (3962) | ~430 |
| `routes/me.ts` | `/v1/me` (651), `/me/reports` (564), `/me/activity` (600), `/me/is-superuser` (633), `/usage` (3540), `/dashboard` (3556), `/settings/subscription` (3647), `/watchlist` GET (4675), `/watchlist` POST (4696), `/watchlist/:id` DELETE (4730), `/track` (3992) | ~380 |
| `routes/api-keys.ts` | `/keys` GET (3909), `/keys` POST (3923), `/keys/:id` DELETE (3942), `/keys/usage` (3688) | ~150 |
| `routes/reports.ts` | `/v1/report` (774), `/report` POST (4613), `/report/:id` GET (3849), `/report/:id` DELETE (3883) | ~280 |
| `routes/stripe.ts` | `/stripe/webhook` (3214), `/stripe/portal` (3225), `/stripe/cancel` (3249), `/stripe/checkout` (3302), `/stripe/addon-checkout` (3432) | ~320 |
| `routes/signals.ts` | `/v1/area` (887), `/v1/signals/:category` (964), `/v1/areas` (1027), `/widget` (4048) | ~220 |
| `routes/scoring.ts` | `/v1/score` (1088), `/v1/batch` (2974) | ~210 |
| `routes/portfolios.ts` | `/v1/portfolios` POST (1222), GET (1250), `/v1/portfolios/:id` GET (1271), DELETE (1295), `/v1/portfolios/:id/areas` (1319), `/v1/portfolios/:id/enrich` (1360), `/v1/portfolios/:id/changes` (1394) | ~270 |
| `routes/orgs.ts` | `/v1/orgs` POST (1457), GET (1494), `/v1/orgs/:id` GET (1516), PATCH (1540) — all use `authenticateEither` (dual-auth) | ~90 |
| `routes/org-members.ts` | members GET (1578), POST (1603), PATCH (1654), DELETE (1723), invitations POST (1792), GET (1839), DELETE (1864), accept (1894) — dual-auth | ~300 |
| `routes/org-bundles.ts` | POST (1964), GET (2013), GET `/:bundleId` (2040), PATCH (2066), DELETE (2117) | ~200 |
| `routes/org-presets.ts` | POST (2154), GET (2204), GET `/:presetId` (2230), PATCH (2256), DELETE (2314) | ~190 |
| `routes/org-cohorts.ts` | POST (2426), GET (2468), GET `/:cohortId` (2494), PATCH (2520), DELETE (2562) | ~170 |
| `routes/org-methodology.ts` | GET (2353), PUT (2378), DELETE (2592) | ~60 |
| `routes/intelligence.ts` | `/v1/query` (2629), `/v1/peers` (2709), `/v1/insights` (2822), `/v1/forecast` (2885) | ~360 |
| `routes/webhooks.ts` | `/v1/webhooks` POST (3087), GET (3133), `/v1/webhooks/:id` DELETE (3161), `/v1/webhooks/:id/rotate-secret` POST (3187) | ~130 |
| `routes/admin.ts` | `/admin/analytics` (4758), `/admin/traffic-analytics` (4774), `/admin/audience` (4793), `/admin/usage` (4819), `/admin/revenue` (4845) | ~90 |
| **Total** | **94 routes** | **~3,710 LOC** (distributed) |
| `app.ts` after split | wiring only | **~150 LOC** |

---

## 6. The `routes/<domain>.ts` contract

Every domain file follows the same shape so adding a new one is mechanical:

```typescript
// apps/api/src/routes/orgs.ts
import type { FastifyInstance } from "fastify";
import { requireApiAccess } from "../shared/auth";
import { CreateOrgRequestSchema, UpdateOrgRequestSchema } from "@onegoodarea/contracts";
import { createOrgWithOwner, listOrgsForUser, getOrgIfMember, updateOrg, getRoleInOrg } from "../modules/orgs";
import { hasAtLeastRole } from "../modules/orgs/rbac";
import { trackEvent } from "../modules/tracking/activity";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";

/** All `/v1/orgs` and `/v1/orgs/:id` routes. Children (members /
    invitations / bundles / presets / cohorts / methodology) live in
    their own sibling files. */
export function registerOrgRoutes(app: FastifyInstance): void {
  app.post("/v1/orgs", async (request, reply) => { /* ...existing handler verbatim... */ });
  app.get("/v1/orgs", async (request, reply) => { /* ... */ });
  app.get("/v1/orgs/:id", async (request, reply) => { /* ... */ });
  app.patch("/v1/orgs/:id", async (request, reply) => { /* ... */ });
}
```

**Rules each register function follows:**
- Pure side-effect on the passed `app` — no return value, no global state.
- Imports only from `shared/*`, `modules/*`, `@onegoodarea/contracts`, and `infrastructure/*`. Never from another `routes/*` file.
- Handler bodies are LIFTED VERBATIM from `app.ts`. Zero refactoring of logic — only relocation. Reduces review surface to a pure move.

---

## 7. `app.ts` after the split

```typescript
import Fastify, { type FastifyInstance } from "fastify";
import { getConfig } from "./infrastructure/config";
import { registerSystemRoutes } from "./routes/system";
import { registerAuthRoutes } from "./routes/auth";
import { registerMeRoutes } from "./routes/me";
import { registerApiKeysRoutes } from "./routes/api-keys";
import { registerReportsRoutes } from "./routes/reports";
import { registerStripeRoutes } from "./routes/stripe";
import { registerSignalsRoutes } from "./routes/signals";
import { registerScoringRoutes } from "./routes/scoring";
import { registerPortfoliosRoutes } from "./routes/portfolios";
import { registerOrgRoutes } from "./routes/orgs";
import { registerOrgMemberRoutes } from "./routes/org-members";
import { registerOrgBundleRoutes } from "./routes/org-bundles";
import { registerOrgPresetRoutes } from "./routes/org-presets";
import { registerOrgCohortRoutes } from "./routes/org-cohorts";
import { registerOrgMethodologyRoutes } from "./routes/org-methodology";
import { registerIntelligenceRoutes } from "./routes/intelligence";
import { registerWebhookRoutes } from "./routes/webhooks";

export function buildApp(opts: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({
    logger: opts.logger ?? false,
    bodyLimit: 1 * 1024 * 1024,
  });

  // CORS, hooks, error handler, @fastify/swagger + swagger-ui (/docs, /openapi.json),
  // and all other middleware stay inline here exactly as before.

  registerSystemRoutes(app);
  registerAuthRoutes(app);
  registerMeRoutes(app);
  registerApiKeysRoutes(app);
  registerReportsRoutes(app);
  registerStripeRoutes(app);
  registerSignalsRoutes(app);
  registerScoringRoutes(app);
  registerPortfoliosRoutes(app);
  registerOrgRoutes(app);
  registerOrgMemberRoutes(app);
  registerOrgBundleRoutes(app);
  registerOrgPresetRoutes(app);
  registerOrgCohortRoutes(app);
  registerOrgMethodologyRoutes(app);
  registerIntelligenceRoutes(app);
  registerWebhookRoutes(app);

  return app;
}
```

Target: **~150 LOC**. Everything else is import lines.

---

## 8. The shared helpers (what lifts to `shared/`)

These currently live as top-level functions in `app.ts`. They are USED by multiple route files, so they must lift — but Marcos's rule is clear: each `shared/*.ts` file is a single-purpose module, NOT a utility class.

_Helper line numbers verified 2026-06-20._

| Current location | New location | Used by |
|---|---|---|
| `authenticate` (205), `requireApiAccess` (231), `requireApiAccessWithOrg` (263) | `shared/auth-api.ts` | every route file (API-key callers) |
| `authenticateSession` (342) | `shared/auth-session.ts` | `routes/auth.ts`, `routes/me.ts`, and any session-gated routes |
| `authenticateEither` (290) | `shared/auth-either.ts` | `routes/orgs.ts`, `routes/org-members.ts` (all `/v1/orgs/*` + `/v1/invitations/*` dual-auth callers) |
| `resolveOrgPinForCaller` (370), `effectiveEngineVersionForCaller` (395), `resolveBundleForCaller` (411) | `shared/bundles.ts` | `routes/scoring.ts`, `routes/signals.ts`, `routes/intelligence.ts` |
| `isFromMcpServer` (154), `headerString` (160), `clientIpOf` (169), `widgetCorsHeaders` (179) | `shared/http.ts` | `routes/me.ts` (track), `routes/signals.ts` (widget), several others |

**`authenticateEither`** (added since plan, commit `87b58c6`) bridges API-key + NextAuth-session auth for org CRUD. It depends on both `auth-api` and `auth-session`, so it lives in its own `shared/auth-either.ts` that imports from those two — it is NOT a utility grab-bag; it is a single-purpose dual-auth gate, same cohesion rule as the others.

**`isAppError`** narrowing helper — already lives in `infrastructure/errors/*` and is imported, so no move; just keep the existing import path.

---

## 9. Sequencing — the actual PRs

This is too big for one PR. We split into **3 stacked PRs** that each verify the regression net before the next lands. Each is independently reviewable + revertible.

### PR 1 — `shared/` extractions (foundation)

- Create `shared/auth-api.ts`, `shared/auth-session.ts`, `shared/bundles.ts`, `shared/http.ts`.
- Move the helper functions VERBATIM (no signature changes).
- Update `app.ts` to import them from `shared/*` instead of defining them inline.
- No route changes yet — `app.ts` still owns all 94 routes.
- Verifies: `make build-api-image && make build-web-image` + typecheck + lint clean.

### PR 2 — Route extractions, batch A (low-risk domains first)

Lift these route files in one PR (each is mostly mechanical):
- `routes/system.ts`
- `routes/auth.ts`
- `routes/me.ts`
- `routes/api-keys.ts`
- `routes/reports.ts`
- `routes/stripe.ts`
- `routes/webhooks.ts`
- `routes/admin.ts`

After PR 2:
- `app.ts` shrinks to ~2,200 LOC (orgs + signals + scoring + portfolios + intelligence still inline).
- Every route in batch A registers via its new module. Endpoints respond byte-identically.

Verifies: `make build-api-image && make build-web-image` + e2e smoke (re-run the `2026-06-12` doc against staging/local).

### PR 3 — Route extractions, batch B (the rest)

Lift the remaining route files:
- `routes/signals.ts`
- `routes/scoring.ts`
- `routes/portfolios.ts`
- `routes/orgs.ts`
- `routes/org-members.ts`
- `routes/org-bundles.ts`
- `routes/org-presets.ts`
- `routes/org-cohorts.ts`
- `routes/org-methodology.ts`
- `routes/intelligence.ts`

After PR 3:
- `app.ts` is ~150 LOC.
- All 94 routes registered via the new structure.

Verifies: `make build-api-image && make build-web-image` + e2e smoke (final run). The e2e doc is the regression net.

### PR 4 — Test file relocation

Create `tests/routes/` directory. For each new route module, add or relocate tests as `tests/routes/<domain>.test.ts`. Any existing `tests/modules/*` tests that exercise route-level behaviour (request/response shape, auth gating) move here; pure business-logic unit tests stay in `tests/modules/*`.

Verifies: same total pass count as before relocation. No orphaned tests.

---

## 10. Verification before each PR merges

1. `make build-api-image && make build-web-image` — rebuild both container images from current branch sources. Both builds must succeed with no errors.
2. `cd apps/api && npx tsc --noEmit` — typecheck clean.
3. `npm run lint` from repo root — 0 errors.
4. **E2E smoke**: re-run the curl sweep from `docs/TESTING/api-end-to-end-2026-06-12.md` against the PR's container stack (or Render preview). Same status codes, same response shapes.
5. **Manual route discovery**: `fastify.printRoutes()` output before and after each PR must list the same 94 routes (same paths, same methods).

---

## 11. What this plan deliberately is NOT

- ❌ NOT fixing any of the bugs surfaced by the 06-12 sweep (place-name 500s, member FK validation, methodology mutation, Render stale deploy). Those get their own tickets. The split is purely structural so a structural review is uncontaminated by behavioural fixes.
- ❌ NOT refactoring the handler bodies. We are MOVING code, not rewriting it.
- ❌ NOT introducing Fastify plugins / route plugins. The `register<X>Routes(app)` function pattern is intentional — Fastify plugins would add framework complexity for no readability win. Marcos's mandate is cohesive modules, not framework features.
- ❌ NOT extracting middleware into per-route hooks. Existing hook wiring on `app` stays inline in `buildApp`. This includes the `@fastify/swagger` + `@fastify/swagger-ui` registration (`/docs`, `/openapi.json`) added since the original plan — it stays in `buildApp`, untouched.
- ❌ NOT creating a `RouteUtils` class. Per Marcos's exact words.

---

## 12. Decisions

1. **Three PRs vs one?** → Four PRs: three stacked route-extraction PRs + PR 4 for test relocation.
2. **`shared/auth.ts` shape** → Split into `shared/auth-api.ts` (API-key callers: `authenticate`, `requireApiAccess`, `requireApiAccessWithOrg`) + `shared/auth-session.ts` (NextAuth bridge: `authenticateSession`).
3. **`org-methodology.ts`** → Kept as its own file for symmetry with the other `org-*` siblings.
4. **Test file colocation** → `tests/routes/<domain>.test.ts`. Existing `tests/modules/*` tests that exercise route-level behaviour relocate in PR 4; pure unit tests stay where they are.

---

## 13. Sign-off

This plan is for Marcos's review. **No code changes land until Marcos confirms the structure + sequencing.**

After sign-off:
1. Update this plan with any direction changes.
2. Open PR 1 (`shared/` extractions).
3. Land PR 1 → reverify the e2e smoke → open PR 2 → and so on.

---

_Plan author: Claude Code, 2026-06-12. Updated 2026-06-15: inventory refreshed (94 routes, 4,811 LOC), admin domain added, auth split into auth-api/auth-session, verification updated to container builds, PR 4 (test relocation) added, open questions resolved._

_Re-validated 2026-06-20: split has NOT started (no `shared/` or `routes/` dirs; modules structure intact). Strategy, target shape, sequencing, `make build-api-image`/`build-web-image` targets, and the `2026-06-12` testing doc all still hold. Route count still 94 (37 GET / 37 POST / 5 PATCH / 14 DELETE / 1 PUT). Drift corrected: `app.ts` 4,811 → 4,893 LOC; all section-5 and section-8 line numbers refreshed; new `authenticateEither` dual-auth helper (commit `87b58c6`) added to `shared/` as `auth-either.ts`; `@fastify/swagger` + swagger-ui middleware noted as staying inline in `buildApp`._
