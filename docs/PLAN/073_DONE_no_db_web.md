# 073 — Remove direct DB access from web (AR-728)

## Purpose
Make `apps/web` fully runtime-independent of the database: no `DATABASE_URL`
in web env, env examples, web code, or web tests. The API remains the sole DB
owner (governance invariant from `docs/ARCHITECTURE/DB_SYNC_EXCEPTIONS.md`).

## Jira
- Epic: AR-646 (Remove direct database access from the web layer)
- Task: **AR-728** — Drop DB-needing web testing routes + strip `DATABASE_URL`
  from web env/examples/tests
- Related stories (their work feeds this task): AR-647 (magic-link consume +
  oauth-callback proxying), AR-648 (org resolution), AR-649 (welcome email_verified)

## Current DB surface in apps/web
- `apps/web/src/lib/db.ts` + `lib/db-types.ts` — neon client (`sql`), lazy
  `DATABASE_URL` read on first query.
- `apps/web/src/lib/runtime/env/validation.ts` — `validateRuntimeConfig` throws
  `"DATABASE_URL is required"` unconditionally (`validation.ts:60-62`).
- `apps/web/src/lib/runtime/env/index.ts` — parses `databaseUrl`,
  `getRuntimeDiagnostics()` exposes `hasDatabaseUrl`.
- `apps/web/src/lib/auth.ts` — magic-link `authorize()` direct `sql` reads
  (token consume + email_verified backfill), and `jwt` callback reads
  `user_type`.
- `apps/web/src/app/welcome/page.tsx` — direct `neon(DATABASE_URL)` for
  `email_verified`.
- `apps/web/src/app/api/testing/auth/login/route.ts` — DB write (upsert user +
  mint session), **dead code / zero callers**.
- `apps/web/scripts/seed-ofsted.ts` — uses `DATABASE_URL`, API-owned job.
- Web tests: `tests/unit/runtime-env.test.ts` (DATABASE_URL cases),
  `tests/unit/testing-auth-guards.test.ts`.
- Env examples: `.env.local.test.example`, `env/{local,dev,prod}/web.env.example`,
  `env/local/postgres.env.example` comment, `compose/compose.yml`,
  `compose/compose.test.yml`.

## Scope decisions (from AR-723 report §3a, user-approved)
- Drop the DB-needing web testing route; testing that needs a DB goes through
  the API, not web (no workarounds).
- No DB-related variables anywhere in web env / env examples / tests.
- magic-link consume + welcome email_verified + jwt user_type move to API
  per the three endpoint specs (AR-647 / AR-649), so web keeps working while
  losing `DATABASE_URL`.

## Steps
1. **Delete** `apps/web/src/app/api/testing/auth/login/route.ts`. Keep
   `testing/auth/logout` (cookie-only) and `testing/runtime/*` (env
   diagnostics), but prune any DB references. `OGA_ENABLE_TESTING_AUTH_ROUTES`
   env stays only if a non-DB testing route still uses it; else remove.
2. **API endpoints** (this worktree only wires calls; the endpoints themselves are
   AR-647 / AR-649, landed separately). Ensure web calls:
   - magic-link consume → `POST /auth/magic-link/consume`
   - welcome email_verified → `GET /auth/state`
   - org resolution → `GET /orgs/resolve` (AR-648, if touched)
   - jwt `user_type` → proxied via API (AR-647 / AR-654 related)
3. **Relax runtime env guard** in `apps/web/src/lib/runtime/env/`:
   - drop `databaseUrl` from `validation.ts`, `index.ts`,
     `getRuntimeDiagnostics()`.
   - `validation.ts` no longer throws on missing `DATABASE_URL`.
4. **Remove web DB client**: after last caller is gone, delete
   `apps/web/src/lib/db.ts` and `apps/web/src/lib/db-types.ts`.
5. **Env examples**: delete `DATABASE_URL` from `.env.local.example`,
   `env/{local,dev}/web.env.example`, `env/prod/web.env.example`, fix
   `env/local/postgres.env.example` comment, and remove `DATABASE_URL` from the
   web service in `compose/compose.yml` + `compose/compose.test.yml`.
6. **Tests**: update `apps/web/tests/unit/runtime-env.test.ts` (remove
   DATABASE_URL cases / `databaseUrl` assertions); prune
   `testing-auth-guards.test.ts` to non-DB guard cases only.
7. **seed-ofsted.ts**: keep API-owned; ensure it documents API ownership or
   runs under the API migration path (not required to run web). Move comment.

## Gate
- `grep -rn DATABASE_URL apps/web` → no results.
- `grep -rn DATABASE_URL` across `env/*/web.env.example`, `.env.local*.example`,
  `compose/*.yml` web services → no results (API examples obviously keep it).
- `npm run typecheck` (web) and `npm test` (web) pass.
- Web starts without `DATABASE_URL`.

## Git / Jira
- Worktree: `.worktrees/AR-728-no-db-web`, branch `feat/AR-728-no-db-web`
  (off `main` a7bf646). Never commit on `main`.
- Commits: one per logical step above (delete testing route, env guard, db client
  removal, env examples, tests). Standard enterprise commit message.
- Jira: AR-728 `In Progress` → when PR opened, link PR in issue → on merge,
  transition to Done. Note dependency on AR-647 / AR-649 for the proxy endpoints.