# Plan 025 — Kill legacy reports surface (AR-324)

**Status:** SKELETON 2026-06-22. Awaiting per-phase detailing.
**Jira Epic:** [AR-324 Kill legacy reports surface (B2C residue from v1)](https://podnex.atlassian.net/browse/AR-324)
**Stories:** Created bit-by-bit as we enter each phase (not all upfront).
**Branches:** One per story, off clean main. Squash-merge to main per [[feedback-operations-loop]].

---

## 1. Purpose

Remove the legacy reports surface end-to-end. Reports = the v1 B2C postcode-lookup flow (`/v1/report` → AI-narrated paragraph + score breakdown rendered at `/report/[id]`). The four products (Signals / Scores / Monitor / Intelligence) replace it; the master proposal demoted it; the dashboard restructure then removed the surface shelf entirely. There is no conceptual reason for reports to exist in the new architecture.

Killing it also fixes two adjacent correctness bugs:
- `/v1/score` currently shares the "reports-per-month" quota via `canGenerateReport()` — the field name lies about what it gates.
- `modules/reports/` accidentally hides engine infrastructure (`methodology`, `engine-version`, `ai` provider, batch processor) imported by 8+ files across the 4 products.

## 2. Hard rules

- **One PR per phase.** Small sequential commits inside. Localhost-tested before push. Squash-merge to main.
- **No em-dashes anywhere** ([[feedback-no-em-dashes]]).
- **No SQL in apps/web** ([[feedback-no-db-in-web]]).
- **Env vars introduced or changed must be reflected in Vercel/Render in the same PR** ([[feedback-env-vars-with-refactor]]).
- **No backwards-compat shims.** Zero external consumers on the legacy endpoints (mum/dad/friends only); delete cleanly, don't soft-deprecate.
- **No replacement product.** There is no "Reports v2".

## 3. Phases (one PR each — story key assigned at start of phase)

| # | Phase | Why this order | Story key |
|---|---|---|---|
| 1 | **Refactor:** move engine infra out of `modules/reports/` → `modules/engine/`. Rename `report-cache` to neutral name. | Pre-req. Without this, deleting `modules/reports/` breaks Scores, Intelligence, Signals, Monitor, system cron, bundle resolution. No behavior change. | TBD |
| 2 | **Auth redirect + dashboard home** stop pointing at `/report`. | Unhooks the surface from the user's daily flow. Reversible if anything breaks. | TBD |
| 3 | **Frontend pages** — delete `/report`, `/report/[id]`, generator UI. | Removes the public B2C surface. Backend still answers; nothing calls it from the app anymore. | TBD |
| 4 | **Webhook taxonomy** — drop `report.created` from `SUPPORTED_EVENT_TYPES`. | Public contract change; do it before backend delete so live webhook subscribers stop receiving the event cleanly. | TBD |
| 5 | **Rename** `canGenerateReport` → `canMakeApiCall`, `reportsPerMonth` → `apiCallsPerMonth`, 429 message → "Monthly API call limit reached". | Correctness fix. /v1/score reads accurately. /v1/me + /usage display the truth. | TBD |
| 6 | **Backend delete** — `routes/reports.ts` + remaining `modules/reports/` files. | Hard delete. Endpoints 404. Nothing in the app or other products imports it after phases 1–5. | TBD |
| 7 | **DB tables** — drop `reports`, `report_history`; rename `report_cache` to match new role. | Last. Reversible-ish (data is gone, but rebuildable). Migration is idempotent. | TBD |
| 8 | **Marketing sweep** — 13 mentions across 7 files, schema.org searchAction, docs/api-reference "Reports" section. | Can run in parallel from phase 2 onward but cleanest as its own PR at the end so search ranking + crawl don't refer to dead URLs after backend delete. | TBD |

## 4. Acceptance for the epic as a whole

1. `git grep -i "report"` in apps/api + apps/web returns only neutral language (e.g. "we report what ran" as English, not "reports" as a product noun).
2. No file under `modules/reports/` exists.
3. No endpoint named `/v1/report*` or `/report` (in apps/api) exists. They 404.
4. `webhook.SUPPORTED_EVENT_TYPES` does not contain `report.created`.
5. `PLANS` catalog has no `reportsPerMonth` field. `canGenerateReport` is not exported.
6. DB has no `reports` or `report_history` tables.
7. Marketing pages, blog posts, schema.org searchAction, and docs/api-reference contain zero "report"-as-product-noun mentions.
8. All 4 products (Signals, Scores, Monitor, Intelligence) function identically to their pre-epic state. Full apps/api + apps/web test suites green.

## 5. Risks / things to verify before phase 6 (backend delete)

- **Re-grep `modules/reports/` cross-imports after phase 1** to confirm the move was complete. Any leftover import = phase 1 isn't done.
- **Stripe metering** — pricing isn't restructured yet ([[project-pricing-v2]]); the rename in phase 5 keeps the same numbers, so no `usage_records` need updating. Verify by inspecting plan rows: the field name changes, the values don't.
- **Webhook subscribers in prod** — query the live `webhook_endpoints` table for any subscriber filtering on `report.created`. Notify before phase 4 lands. Likely zero (no B2B customers).
- **MCP server** — will be redone regardless per Pedro 2026-06-19. Not a constraint here.

## 6. Out of scope

- Replacement product. There is no "Reports v2".
- Stripe price ID restructuring.
- MCP integration changes.
- Grandfathering legacy `report_id` URLs.
- Dashboard signal-first restructure (separate epic, queued).

---

## Phase detail (filled in interactively as we enter each phase)

### Phase 1 — Refactor engine infra out of modules/reports/

**Goal:** move every file in `modules/reports/` to its semantically correct home *except* `report-generator.ts` (which IS the reports surface and stays put for Phase 6's delete). Zero behavior change. Pure relocate + rename + import-rewrite. After this PR, `modules/reports/` contains exactly one file.

**Story:** AR-325 (to be created when we start)
**Branch:** `feat/AR-325-engine-infra-relocate`

#### File map

| From | To | Rationale |
|---|---|---|
| `modules/reports/scoring-engine/index.ts` | `modules/engine/scoring/index.ts` | The deterministic v2 engine math — IP core, not "reports" |
| `modules/reports/scoring-engine/v2.ts` | `modules/engine/scoring/v2.ts` | Frozen v2 engine, golden-tested |
| `modules/reports/methodology.ts` | `modules/engine/methodology.ts` | `METHODOLOGY_VERSION` + helpers — read by 10 sites across 4 products |
| `modules/reports/engine-version.ts` | `modules/engine/version.ts` | Rename: "engine-version" is redundant inside `modules/engine/` |
| `modules/reports/ai/anthropic-provider.ts` | `modules/engine/ai/anthropic-provider.ts` | AI provider abstraction (consumed by Intelligence) |
| `modules/reports/ai/index.ts` | `modules/engine/ai/index.ts` | `getAiProvider` factory |
| `modules/reports/ai/mock-provider.ts` | `modules/engine/ai/mock-provider.ts` | Test mock |
| `modules/reports/ai/types.ts` | `modules/engine/ai/types.ts` | `AiProvider` type |
| `modules/reports/batch.ts` | `modules/engine/batch.ts` | Generic batch processor — used by `/v1/batch` (Scores), not reports-specific |
| `modules/reports/rescore.ts` | `modules/engine/rescore.ts` | Cron worker for the engine's time-series compounding |
| `modules/reports/top-postcodes.ts` | `modules/engine/top-postcodes.ts` | Seed list for rescore |
| `modules/reports/report-cache.ts` | `modules/cache/area-cache.ts` | **Rename.** Keyed by (postcode, intent), caches area data. Reports surface dies; the cache lives on for Scores |
| `modules/reports/report-generator.ts` | *(stays — killed in Phase 6)* | The Anthropic narrator. The only thing that's actually "reports". |

After this PR: `modules/reports/` contains exactly `report-generator.ts`.

#### Identifier renames inside the moved files

- `getCachedReport` → `getCachedAreaResult` (in `modules/cache/area-cache.ts`)
- `setCachedReport` → `setCachedAreaResult`
- Other exports keep their names. The function `generateReport` stays untouched (it stays in `modules/reports/` until Phase 6).

#### Import-rewrite scope (every site changes path string, nothing else)

**Production code (15 sites):**
- `routes/intelligence.ts` — methodology
- `routes/me.ts` — methodology
- `routes/org-methodology.ts` — version
- `routes/reports.ts` — version + report-generator (only path string for version; report-generator path unchanged since it's staying)
- `routes/scoring.ts` — batch + version
- `routes/signals.ts` — area-cache (renamed import: `getCachedReport` → `getCachedAreaResult`)
- `routes/system.ts` — rescore
- `shared/bundles.ts` — version + methodology
- `modules/intelligence/eval/run.ts` — ai
- `modules/intelligence/index.ts` — ai
- `modules/intelligence/planner.ts` — ai (type-only)
- `modules/scoring/score.ts` — scoring-engine + methodology
- `modules/signals/area-profile.ts` — methodology
- `modules/signals/refresh/crime.ts` + 4 sibling refresh files — methodology
- `modules/webhooks/index.ts` — comment-only mention (update the comment to point at new path)

**Tests (12+ sites in `apps/api/tests/modules/reports/`):** move test files to mirror the new structure (`tests/modules/engine/...`, `tests/modules/cache/...`) and rewrite their `@/modules/reports/*` import paths.

#### Commit boundaries (small, sequential, each tsc-green)

1. **Commit A — create `modules/engine/` + move scoring-engine subdir.** Move `scoring-engine/` files. Rewrite 4 production importers + 2 test importers.
2. **Commit B — move methodology.** 10 production importers + 2 test importers.
3. **Commit C — move + rename engine-version → version.** 5 production importers + 1 test importer.
4. **Commit D — move ai/ subdir.** 3 production importers + 4 test importers.
5. **Commit E — move batch + rescore + top-postcodes.** 3 production importers + 2 test importers.
6. **Commit F — create `modules/cache/` + move + rename report-cache → area-cache.** Renames the two exported functions. 1 production importer (`routes/signals.ts`) + 1 test importer + 1 importer in `modules/reports/report-generator.ts` itself (the renamed import path + renamed function names — even though report-generator dies in Phase 6, it must remain tsc-green until then).

Each commit lands the moves + rewrites for ONE category of files. `npm run typecheck -w @onegoodarea/api` must pass after each.

#### Test plan

- After each commit: `npm run typecheck -w @onegoodarea/api` clean.
- After Commit F: full apps/api test suite green (the renamed tests + renamed function names verified end-to-end).
- Localhost smoke before push: hit `/v1/score`, `/v1/signals`, `/v1/me` — verify each still returns 200 with `X-Engine-Version` header set.
- Confirm `git grep -l "modules/reports/" apps/api/src` returns only `routes/reports.ts` + `modules/reports/report-generator.ts` (and the comment in `modules/webhooks/index.ts` if not yet updated).

#### Out of scope for Phase 1

- No deletion of any reports-surface code. `report-generator.ts`, `routes/reports.ts`, `/v1/report`, `/v1/batch` (the report-batch path), DB tables — all alive.
- No webhook taxonomy change.
- No marketing copy change.
- No DB migration.

### Phase 2 — Auth redirect + compare page removal

**Goal:** stop new signups landing on `/report`; delete the orphaned `/compare` page (already off the sidebar, retired per its own header comment, violates no-db-in-web). After this PR, `/dashboard` is the post-signup landing page and `/compare` returns 404.

**Story:** [AR-326](https://podnex.atlassian.net/browse/AR-326)
**Branch:** `feat/AR-326-auth-redirect-compare-delete`

#### Why /compare comes out in this phase (not Phase 3)

I expanded the original Phase 2 scope by one surface because three independent signals all said "kill /compare now":
1. The page's own header comment says it retires (absorbed into `/dashboard/intelligence` rank_areas)
2. The AppShell sidebar comment at line 43-48 says `/compare` is already off the sidebar; the page exists only for legacy direct URL hits
3. `compare/page.tsx` runs `SELECT ... FROM reports` directly from a `apps/web` server component — a [[feedback-no-db-in-web]] violation that goes away for free

The compare page's data model is `Report[]` — when Reports as a surface dies, the page stops being meaningful. Phase 3 (frontend pages delete) was going to take it out anyway; doing it in Phase 2 means one less PR + cleaner intermediate state.

#### Changes

| File | Change |
|---|---|
| `apps/web/src/lib/auth.ts:141` | `newUser: "/report"` → `newUser: "/dashboard"` |
| `apps/web/src/lib/auth.ts:148` | Drop `startsWith("/compare")` from the protected-routes middleware. KEEP the `/report` line — that page survives until Phase 3 |
| `apps/web/src/app/robots.ts:9` | Remove `/compare` from the disallow list |
| `apps/web/src/app/design-v2/_shared/app-shell.tsx:43-48` | Update the stale comment that says `/compare` "still exists for direct navigation" (it won't after this PR) |
| `apps/web/src/app/design-v2/_shared/app-shell.tsx:359-365` | Remove dead `case "compare":` from the NavIconDark switch — no sidebar nav item references it. The general `icons.tsx` "compare" icon stays untouched (used by admin/dashboard-primitives) |
| `apps/web/src/app/design-v2/compare/` | **Delete entire directory** (page.tsx, client.tsx, compare.css, loading.tsx) |

#### Commit boundaries

1. **Commit 1 — docs(plan):** Phase 2 detail in plan/025
2. **Commit 2 — feat(auth):** newUser → /dashboard + drop /compare from protected-routes middleware
3. **Commit 3 — feat(web):** delete compare/ directory + robots.ts + app-shell comment + dead icon case

#### Test plan

- After each commit: `npm run typecheck -w @onegoodarea/web` clean
- After Commit 3: `npm run test -w @onegoodarea/web` green
- Visit `/compare` locally before merge: must 404
- Sign up a fresh test user: must land on `/dashboard`, not `/report`

#### Out of scope for Phase 2

- The `/report` page itself (Phase 3 / AR-327)
- The `/v1/report` backend endpoint (Phase 6)
- The `report.created` webhook event (Phase 4)
- Plan field rename (Phase 5)
- DB tables (Phase 7)
- Marketing copy sweep (Phase 8)

### Phase 3 — Delete /report frontend page

**Goal:** delete the legacy report generator UI (`/report` and `/report/[id]`) end-to-end on the frontend. Add 301 redirects so legacy bookmarks, marketing-page links (still alive until Phase 8), and the schema.org searchAction all resolve to `/dashboard` instead of 404.

**Story:** [AR-327](https://podnex.atlassian.net/browse/AR-327)
**Branch:** `feat/AR-327-delete-report-page`

#### Changes

| File / dir | Change |
|---|---|
| `apps/web/src/app/report/` | DELETE (page.tsx + [id]/loading.tsx + [id]/page.tsx) |
| `apps/web/src/app/design-v2/report/` | DELETE (page.tsx + [id]/* + client.tsx + report.css) |
| `apps/web/next.config.ts` | Add `async redirects()` with two 301 entries: `/report` → `/dashboard`, `/report/:id` → `/dashboard` |
| `apps/web/src/lib/auth.ts:146` | Drop `startsWith("/report")` from the protected-routes middleware (dead code after page delete) |
| `apps/web/src/app/design-v2/_shared/app-shell.tsx` | Refresh the comment that says `/report` "is still alive" — now it isn't |

#### Why 301 redirects in this phase

Without redirects, the brief window between Phase 3 (this PR) and Phase 8 (marketing sweep) leaves marketing-page links pointing at 404. Two affected surfaces in particular:
1. Schema.org searchAction in `page.tsx:34` (`/report?q={search_term_string}`) — indexed by Google
2. Blog posts ("Three free reports per month at onegoodarea.com") — high-traffic if any blog content ranks

301 redirects are SEO-clean (permanent), preserve any inbound traffic, and the marketing sweep in Phase 8 still rewrites the underlying text. No double-work.

#### Out of scope

- BFF routes at `apps/web/src/app/api/report/` + `apps/web/src/app/api/v1/report/` (these are the API surface — Phase 6 kills them alongside the apps/api endpoints)
- Marketing copy rewrites (Phase 8)
- DB tables (Phase 7)
- Tests that use `/report/x` as a generic API path in BFF/proxy unit tests (benign; the BFF still exists)
- The sidebar test fixture mentioning "Reports" (benign primitive test data)

#### Commit boundaries

1. `docs(plan)`: Phase 3 detail
2. `feat(web)`: delete /report directories + add 301 redirects + drop /report from auth middleware + refresh app-shell comment

### Phase 4 — Webhook taxonomy

*(to be detailed when we start)*

### Phase 5 — Rename canGenerateReport / reportsPerMonth

*(to be detailed when we start)*

### Phase 6 — Backend delete

*(to be detailed when we start)*

### Phase 7 — DB tables

*(to be detailed when we start)*

### Phase 8 — Marketing sweep

*(to be detailed when we start)*
