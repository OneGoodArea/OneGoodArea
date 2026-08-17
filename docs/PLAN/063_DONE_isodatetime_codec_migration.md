# Plan: Fix the Date/String Type-Lie at row()/rows(), Validate Timestamps with z.string().datetime()

## Purpose

AR-628/AR-629 fixed the Neon `Date`-vs-`z.string()` 500 class by coercing every `Date` to an ISO string at the response boundary (a per-endpoint `isoOrNull` helper, then a global recursive `isoifyDates` walk in `hybrid-serializer-compiler.ts`). Both fixes are safe but leave `z.string()` as the declared type for every timestamp field — which validates nothing (any string passes) — and leave the actual choke point untouched.

**Root cause, precisely:** `row<T>()`/`rows<T>()` in `infrastructure/db/types.ts` — the DB-read boundary every module funnels through — do zero runtime work today (`return r as T`, a pure type assertion). That's where the type-lie lives: declared row types say `string`, the Neon driver hands back `Date`, nothing reconciles them in between.

**Fix:** make `row()`/`rows()` do the conversion for real — scan each row's top-level values (a raw SQL row is always flat, no recursion needed) and convert any `Date` to its ISO string before the cast. This makes the existing row-type declarations (e.g. `ApiKeyRow.created_at: string`) true at runtime for every consumer, not just HTTP responses — no retyping of the row interfaces themselves needed. Response contracts upgrade from bare `z.string()` to a shared `z.string().datetime()` (validates real ISO-8601 shape, not just "any string"). This is more fundamental than either AR-628 or AR-629's fix, and than the `z.codec()`-based approach first considered here — it fixes every consumer of a DAL row, not just the HTTP response path, and lets both AR-628's and AR-629's remediations be deleted outright rather than kept as a fallback. Also decoupled from the Neon driver (relevant since a future migration off Neon is on the table).

**Known gap:** 123 raw `await sql` call sites in `apps/api/src` vs. only 104 calls to `row()`/`rows()`/`typedRows()` — some query results bypass the helper entirely. That gap must be audited (AR-632) before assuming the `row()`/`rows()` fix has full coverage.

## Linked Jira

- Story: [AR-631](https://podnex.atlassian.net/browse/AR-631)
- Subtasks: AR-632 (foundation), AR-633 (api-keys), AR-634 (admin), AR-635 (activity/dashboard/me), AR-636 (orgs core), AR-637 (org sub-resources), AR-638 (webhooks), AR-639 (portfolios), AR-640 (users), AR-641 (cleanup)
- Prior work: AR-628, AR-629

## Scope

One shared `z.string().datetime()` validator in `packages/contracts`, plus the `row()`/`rows()` normalization fix, then migrate every DB-sourced timestamp field module by module. Each module is its own Jira subtask and its own commit.

**In scope** (DB-sourced timestamps, subject to the original bug):
api-keys, admin, activity + dashboard/me, orgs (core), org sub-resources (bundles, cohorts, presets, invitations — all under `modules/orgs/`), webhooks, portfolios, users.

**Out of scope**: `generated_at` fields in `signals.ts` / `intelligence.ts` — confirmed computed in-app via `new Date().toISOString()` in `routes/intelligence.ts`, never round-tripped through the DB, so they were never subject to the AR-628/629 bug and don't need touching.

## Steps (one Jira subtask + one commit each)

1. **Foundation** — in `infrastructure/db/types.ts`, make `row<T>()`/`rows<T>()` convert any `Date` value to its ISO string before casting (flat scan, no recursion). Add `IsoDateTimeSchema = z.string().datetime()` to `packages/contracts` (e.g. `common.ts`), export from `index.ts`. Audit the 123-vs-104 raw-`sql`-vs-`row()`/`rows()` gap and note any timestamp field read outside the helper for the relevant module step below.
2. **API Keys** — `contracts/api-keys.ts`, `modules/api-keys/index.ts`, `routes/api-keys.ts`. Switch `created_at`/`last_used_at` to `IsoDateTimeSchema`, drop the `isoOrNull` calls this module introduced in AR-628 (the module functions can now just return what `row()`/`rows()` already normalized).
3. **Admin** — `contracts/admin.ts`, `modules/admin/index.ts`. Same treatment for `recentActivity.created_at`, `top_endpoints.last_seen`, `top_orgs.last_seen`, `planner_last_seen`, `brief_last_seen`; drop AR-628's `isoOrNull` calls here.
4. **Activity + Dashboard/Me** — `contracts/activity.ts`, `contracts/dashboard.ts`, `modules/activity/index.ts`, `routes/me.ts`. Covers `/me/activity`, the AR-629 fix site.
5. **Orgs (core)** — `contracts/orgs.ts`, `modules/orgs/index.ts`, `routes/orgs.ts`, `routes/org-members.ts` (`joined_at`).
6. **Org sub-resources** — `contracts/{bundles,cohorts,presets,invitations}.ts`, `modules/orgs/{bundles,cohorts,presets,invitations}.ts`, `routes/org-{bundles,cohorts,presets}.ts`.
7. **Webhooks** — `contracts/webhooks.ts`, `routes/webhooks.ts` (`created_at`, `last_success_at`, `last_failure_at`).
8. **Portfolios** — `contracts/portfolios.ts`, `routes/portfolios.ts`, `modules/monitor/portfolio.ts`. Confirmed DB-sourced (`portfolios`/`portfolio_areas` tables).
9. **Users** — `contracts/users.ts`. No confirmed live handler found in the initial scan; verify actual wiring at implementation time and fold into whichever route owns it, or drop the field if genuinely dead.
10. **Cleanup (final)** — remove `infrastructure/utils/iso-date.ts` (`isoOrNull`) and all call sites. Remove `isoifyDates` and its call site in `hybrid-serializer-compiler.ts` entirely, plus its now-dead unit test cases — no fallback needed, since `row()`/`rows()` normalizes upstream of every consumer including response serialization. Full API test suite must pass with zero remaining `isoOrNull`/`isoifyDates`/manual `.toISOString()` call sites.

## Git Workflow

- Branch: `feat/AR-631-isodatetime-migration`, cut from `main`.
- One commit per step above (10 commits), each independently revertable.
- Worktree: use an isolated worktree per [Worktree Selection Guide](../../.claude/skills/worktree-selection.md) since this touches `packages/contracts` (shared dependency) while other work may be in flight on `main`.
- No direct pushes to `main`; open a PR per the standard PR draft format once all steps land.

## Jira Breakdown

- **Story** AR-631 — this plan (status: To Do until implementation starts).
- **Subtasks** AR-632 through AR-641 (10 total, one per numbered step above) — each moves to In Progress/Done independently as its commit lands; each must be assigned to the active sprint once work starts (per [Jira & GitHub Lifecycle](../../.claude/skills/jira-github-lifecycle.md)).
