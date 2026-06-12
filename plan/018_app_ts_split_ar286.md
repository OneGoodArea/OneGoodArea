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
| `app.ts` total lines | **3,687** |
| Route registrations | **81** |
| Unique route paths | **54** |
| Top-level helper functions | **11** (auth, CORS, ip extraction, bundle resolution, etc.) |
| Module-level imports | **~40** (from `./modules/*` + infrastructure + contracts) |

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
│   ├── auth.ts                 # requireApiAccess, requireApiAccessWithOrg, authenticateSession, etc.
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
│   └── webhooks.ts             # /v1/webhooks + /v1/webhooks/:id (+ AR-283 rotate-secret when it deploys)
└── modules/                    # UNCHANGED — business logic stays where it is
```

**17 route files** + **4 shared helpers** + **1 thin app.ts**. Average route file size: ~180 LOC. Largest expected to be `routes/portfolios.ts` and `routes/orgs.ts` at ~250 LOC each. None over 300.

---

## 5. Per-file route inventory

| File | Routes (lines in current `app.ts`) | Approx LOC |
|---|---|---|
| `routes/system.ts` | `/health` (418), `/v1/meta` (421), `/cron/rescore` (3663) | ~60 |
| `routes/auth.ts` | `/auth/register` (3263), `/auth/resend-verification` (3343), `/auth/forgot-password` (3390), `/auth/reset-password` (3438), `/settings/password` (3480), `/settings/delete-account` (3113) | ~280 |
| `routes/me.ts` | `/v1/me` (478), `/me/reports` (428), `/me/activity` (455), `/usage` (2848), `/settings/subscription` (2863), `/watchlist` GET (3588), `/watchlist` POST (3607), `/watchlist/:id` DELETE (3639), `/track` (3143) | ~330 |
| `routes/api-keys.ts` | `/keys` GET (3060), `/keys` POST (3074), `/keys/:id` DELETE (3093), `/keys/usage` (2904) | ~150 |
| `routes/reports.ts` | `/v1/report` (592), `/report` POST (3528), `/report/:id` GET (3004), `/report/:id` DELETE (3036) | ~280 |
| `routes/stripe.ts` | `/stripe/webhook` (2522), `/stripe/portal` (2533), `/stripe/cancel` (2557), `/stripe/checkout` (2610), `/stripe/addon-checkout` (2740) | ~320 |
| `routes/signals.ts` | `/v1/area` (691), `/v1/signals/:category` (758), `/v1/areas` (811), `/widget` (3199) | ~220 |
| `routes/scoring.ts` | `/v1/score` (863), `/v1/batch` (2343) | ~210 |
| `routes/portfolios.ts` | `/v1/portfolios` GET (992), POST (975), `/v1/portfolios/:id` GET (1004), DELETE (1019), `/v1/portfolios/:id/areas` (1034), `/v1/portfolios/:id/enrich` (1065), `/v1/portfolios/:id/changes` (1089) | ~270 |
| `routes/orgs.ts` | `/v1/orgs` POST (1142), GET (1169), `/v1/orgs/:id` GET (1182), PATCH (1197) | ~85 |
| `routes/org-members.ts` | members CRUD (1226, 1242, 1284, 1344), invitations CRUD (1404, 1442, 1458), accept (1479) | ~280 |
| `routes/org-bundles.ts` | bundles CRUD (1540, 1580, 1596, 1613, 1655) | ~180 |
| `routes/org-presets.ts` | presets CRUD (1683, 1724, 1740, 1757, 1806) | ~170 |
| `routes/org-cohorts.ts` | cohorts CRUD (1891, 1924, 1940, 1957, 1990) | ~150 |
| `routes/org-methodology.ts` | methodology GET (1836), PUT (1852), DELETE (2011) | ~50 |
| `routes/intelligence.ts` | `/v1/query` (2039), `/v1/peers` (2109), `/v1/insights` (2212), `/v1/forecast` (2264) | ~340 |
| `routes/webhooks.ts` | `/v1/webhooks` POST (2442), GET (2478), DELETE (2497) | ~110 |
| **Total** | **81 routes** | **~3,485 LOC** (distributed) |
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

  // CORS, hooks, error handler, etc. (whatever was inline before)

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

| Current location | New location | Used by |
|---|---|---|
| `authenticate` (197), `requireApiAccess` (223), `requireApiAccessWithOrg` (255), `authenticateSession` (280) | `shared/auth.ts` | every route file |
| `resolveOrgPinForCaller` (308), `effectiveEngineVersionForCaller` (333), `resolveBundleForCaller` (349) | `shared/bundles.ts` | `routes/scoring.ts`, `routes/signals.ts`, `routes/intelligence.ts` |
| `isFromMcpServer` (146), `headerString` (152), `clientIpOf` (161), `widgetCorsHeaders` (171) | `shared/http.ts` | `routes/me.ts` (track), `routes/signals.ts` (widget), several others |

**`isAppError`** narrowing helper — already lives in `infrastructure/errors/*` and is imported, so no move; just keep the existing import path.

---

## 9. Sequencing — the actual PRs

This is too big for one PR. We split into **3 stacked PRs** that each verify the regression net before the next lands. Each is independently reviewable + revertible.

### PR 1 — `shared/` extractions (foundation)

- Create `shared/auth.ts`, `shared/bundles.ts`, `shared/http.ts`.
- Move the helper functions VERBATIM (no signature changes).
- Update `app.ts` to import them from `shared/*` instead of defining them inline.
- No route changes yet — `app.ts` still owns all 81 routes.
- Verifies: typecheck + apps/api full suite (914+ tests) + lint clean.

### PR 2 — Route extractions, batch A (low-risk domains first)

Lift these route files in one PR (each is mostly mechanical):
- `routes/system.ts`
- `routes/auth.ts`
- `routes/me.ts`
- `routes/api-keys.ts`
- `routes/reports.ts`
- `routes/stripe.ts`
- `routes/webhooks.ts`

After PR 2:
- `app.ts` shrinks to ~2,000 LOC (orgs + signals + scoring + portfolios + intelligence still inline).
- Every route in batch A registers via its new module. Endpoints respond byte-identically.

Verifies: typecheck + full suite + e2e smoke (re-run the `2026-06-12` doc against staging/local).

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
- All 81 routes registered via the new structure.

Verifies: typecheck + full suite + e2e smoke (final run). The e2e doc is the regression net.

---

## 10. Verification before each PR merges

1. `cd apps/api && npx tsc --noEmit` — clean.
2. `cd apps/api && npx vitest run` — current 914/914 passing; no regression.
3. `npm run lint` from repo root — 0 errors.
4. **E2E smoke**: re-run the curl sweep from `docs/TESTING/api-end-to-end-2026-06-12.md` against the PR's Render preview (or local stack). Same status codes, same response shapes, same latency profile per endpoint. The doc IS the spec.
5. **Manual route discovery**: `fastify.printRoutes()` output before and after each PR must list the same 81 routes (same paths, same methods).

---

## 11. What this plan deliberately is NOT

- ❌ NOT fixing any of the bugs surfaced by the 06-12 sweep (place-name 500s, member FK validation, methodology mutation, Render stale deploy). Those get their own tickets. The split is purely structural so a structural review is uncontaminated by behavioural fixes.
- ❌ NOT refactoring the handler bodies. We are MOVING code, not rewriting it.
- ❌ NOT introducing Fastify plugins / route plugins. The `register<X>Routes(app)` function pattern is intentional — Fastify plugins would add framework complexity for no readability win. Marcos's mandate is cohesive modules, not framework features.
- ❌ NOT extracting middleware into per-route hooks. Existing hook wiring on `app` stays inline in `buildApp`.
- ❌ NOT creating a `RouteUtils` class. Per Marcos's exact words.

---

## 12. Open questions for Marcos's review

1. **Three PRs vs one?** The plan above is three stacked PRs for a clean review chain. If you prefer one big-bang refactor, we can merge PR 2 + PR 3 into one — but the review surface becomes ~3,500 LOC of moves to verify against the original. I lean toward three PRs.
2. **`shared/auth.ts` shape**: one file with all four auth helpers, or split into `shared/auth-api.ts` (API-key callers) + `shared/auth-session.ts` (NextAuth bridge callers)? The four functions are tightly related so I'd keep them in one file unless you'd rather see them by surface.
3. **`org-methodology.ts` (only 3 routes, ~50 LOC)** — too small to be its own file, fold into `routes/orgs.ts`? It's the only "engineering" surface inside the org tree (the others are CRUD over child resources), so it does fit cohesively. I lean toward keeping it separate for symmetry with the other org-* files.
4. **Test file colocation**: when we add new tests for `routes/<domain>.ts`, mirror as `tests/routes/<domain>.test.ts`, or merge them into the per-handler test files that already exist under `tests/modules/*`? My instinct is the former — route-level integration tests deserve their own folder.

---

## 13. Sign-off

This plan is for Marcos's review. **No code changes land until Marcos confirms the structure + sequencing.**

After sign-off:
1. Update this plan with any direction changes.
2. Open PR 1 (`shared/` extractions).
3. Land PR 1 → reverify the e2e smoke → open PR 2 → and so on.

---

_Plan author: Claude Code, 2026-06-12, signed off in branch `chore/AR-286-app-ts-split-plan`._
