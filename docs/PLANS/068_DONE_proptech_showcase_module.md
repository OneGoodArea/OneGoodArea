# 068 PropTech showcase module + transactions endpoint

Status: implemented

## Purpose

Build an independent PropTech showcase as a new company product mirroring
nested.com, plus the `GET /v1/area/transactions` endpoint it demoes. The
showcase is a self-contained web module (`modules/showcase-proptech/`) with
the route shell kept at `app/showcase/proptech/page.tsx`, so the existing
hub (`/showcase`) and `/for/{icp}` → showcase navigation is untouched.

Out of scope (explicitly deferred): NL/LLM/chat (intelligence) tab.

## API — new endpoint

1. `land-registry.ts`: retain raw SPARQL bindings in the outcode cache
   (they are currently aggregated and discarded). Cache entry holds both
   `PropertyPriceData` (unchanged shape) and `transactions`. New export
   `getPropertyTransactions(postcode)` returns last-12-month bindings,
   date-desc, each `{ date, price, property_type, estate_type }`.
2. `packages/contracts/src/signals.ts`: add Zod `PropertyTransactionSchema`
   and `TransactionsResponseSchema`; export via `index.ts`.
3. `routes/signals.ts`: register `GET /v1/area/transactions` — tag Signals,
   bearerAuth + bridgeToken, `requireApiAccessWithOrg`, `validateLocationInput`,
   404 when null. Zod response schema auto-appears in the Scalar playground
   (hybrid validator/serializer compilers + zodSafeJsonSchemaTransform).
4. `shared/http.ts` + `shared/request-context.ts`: UA stamp
   `onegoodarea-proptech/1.0.0` → `client_app: "proptech"`.
5. Tests: `land-registry.test.ts` (getPropertyTransactions: window, order,
   labels, cache-share) + `signals.test.ts` (route: 200/400/404/auth).

## Web — independent showcase module

- Route shell `app/showcase/proptech/page.tsx` (server component, mirrors
  estate-agents page: force-dynamic, server fetch → hydrated client).
- `modules/showcase-proptech/`: components + constants + `cache.ts` + CSS.
  Tabs: Signals (signal cards + sales-history transaction list + audit
  lineage), Scores (`POST /v1/score` presets/weights/explain), Monitor
  (static demo portfolio + change diff). No intelligence tab.
- `lib/showcase/api.ts`: add `getTransactions(postcode)`, reuse
  `SHOWCASE_API_KEY` + UA stamp + 60s timeout + `ApiError`.
- BFF proxy `app/api/showcase/transactions/route.ts` (mirrors
  `score/route.ts`).
- Cache: showcase-exclusive, keyed by `SHA-256(JSON.stringify(response))`.
- Links: hub card proptech `Soon → Live`
  (`design-v2/showcase-hub/client.tsx`); `/for/proptech` adds
  "Try the Demo Workflow → /showcase/proptech" CTA.

## Jira

- Story: AR-758 "Build proptech showcase demo module + transactions
  endpoint" (this plan).

## Steps

1. Contracts: Zod transaction schemas + exports. Commit.
2. land-registry.ts: retain bindings, `getPropertyTransactions` + tests.
   Commit.
3. routes/signals.ts: `GET /v1/area/transactions` + route tests. Commit.
4. shared/http.ts + request-context.ts: proptech UA stamp. Commit.
5. web lib/showcase: `getTransactions` + BFF proxy route. Commit.
6. modules/showcase-proptech + route shell + CSS. Commit.
7. Hub card Live + `/for/proptech` CTA. Commit.
8. Verify: repo lint/typecheck/tests per software-testing skill. Push. PR
   (draft format per jira-github-lifecycle).

## Git workflow

- Worktree at `.worktrees/AR-758-proptech-showcase`, branch
  `feat/AR-758-proptech-showcase`.
- One commit per step, author `Marcos Rossini <marcos.tengelmann@gmail.com>`.
- Never push to `main`; PR per jira-github-lifecycle draft format.

## Jira closure

- AR-758 → In Progress (done). Link PR on open. → Done on merge.
- Rename plan `068_proptech_showcase_module` →
  `068_DONE_proptech_showcase_module` once fully implemented.
