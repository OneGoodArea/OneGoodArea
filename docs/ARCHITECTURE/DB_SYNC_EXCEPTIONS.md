# DB Sync: Exceptions Report (AR-723)

## Purpose

This report closes out the DB-sync reconciliation (AR-718): it catalogues every
known deviation between the Neon and Docker databases and the migration
registry, codifies the **migrations-only DDL governance invariant**, specifies
the API endpoints the AR-646 epic needs, and proposes a remediation roadmap
(draft — the proposed epic and tracks are NOT created yet; they await triage).

The reconciliation itself (Phase 1 diff, AR-719) and the v1 migration rewrite
(AR-720, verified AR-722) are covered by their own tickets. v1 lives in the
throwaway sandbox `feat/AR-720-db-sync-sandbox` and stays there until Track D
(promotion + gated apply) is working.

## Governance invariant

> **No changes to the database structure may occur outside the migrations.**

- Structural DDL (`CREATE`/`ALTER`/`DROP` of tables, columns, indexes,
  sequences, views) is allowed **only** inside
  `apps/api/src/infrastructure/db/schema.ts` `MIGRATIONS` / `SEEDS`, executed
  through `runMigrations()` / the `migrate.ts` CLI.
- Application handlers, the web test-bootstrap SQL, and ad-hoc scripts must
  never issue structural DDL.
- DML that creates *rows* (not structure) is fine and expected — e.g. the
  refresh jobs that populate `signals`, `geo_entities`, `ofsted_schools`
  (see Exception 4).
- Enforcement (suggested, Track C): a CI drift check (fresh DB → run
  migrations → diff vs expected schema → fail on drift), an `AGENTS.md` note,
  and a PR-template checklist item "no direct DDL outside migrations".

## Exception catalog

### 1. `reddit_seen_posts` — Neon-only orphan

- **What:** a table that exists only in Neon; **0 references** repo-wide
  (confirmed by grep across all apps). It is not in the migration registry and
  not in the Docker `oga_local` schema.
- **Why it's an exception:** it predates the migration registry; nothing reads
  or writes it, so the migrator does not recreate it.
- **Owning ticket:** none yet — tracked here only.
- **Removal path:** owner decision. Either (a) drop the table on Neon
  (`DROP TABLE IF EXISTS reddit_seen_posts`) and add a `DROP` migration so it
  never reappears, or (b) adopt it into `MIGRATIONS` if a writer is planned.
  Recommend (a).
- **Risk:** low — no code references; it is pure dead weight.

### 2. Test-only fixtures — structural DDL outside the migrations

The web test suite issues direct DDL that violates the governance invariant.
These are accepted today because they are test-scoped, but they are the main
reason the web layer still needs a database at all (AR-646).

| Fixture | What it creates | Location |
|---|---|---|
| `runtime_bootstrap_marker` | `CREATE TABLE IF NOT EXISTS runtime_bootstrap_marker` + `CREATE EXTENSION pgcrypto` | `apps/web/tests/db/bootstrap/001-bootstrap.sql` |
| `runtime_seed_runs` | `CREATE TABLE IF NOT EXISTS runtime_seed_runs` | `apps/web/tests/seeds/framework/001-seed-framework.sql` |
| Baseline profile seeds | `INSERT INTO runtime_seed_runs` and report-cache rows | `apps/web/tests/seeds/profiles/baseline/100-baseline-users.sql`, `110-baseline-report-cache.sql` |
| Test assertion | asserts `INSERT INTO runtime_seed_runs` | `apps/web/tests/unit/runtime-seeds.test.ts:20` |

- **Why it's an exception:** historical — the web test harness bootstraps its
  own schema directly instead of using the API migrator.
- **Owning ticket:** Track A (proposed) under the remediation epic; overlaps
  AR-646.
- **Removal path:** fold these fixtures into the API `MIGRATIONS`/`SEEDS`
  (or make the web tests call the API migrator), then delete the SQL files and
  the now-redundant table creation.
- **Risk:** low today; medium if web gains more direct-DDL fixtures. Direct DDL
  in tests can mask drift between the "real" schema and what tests assume.

### 3. Web-layer direct database access — AR-646-tracked

AR-646 ("remove direct DB access from `apps/web`") owns these. They are
exceptions because they keep a second DB client (`@neondatabase/serverless`
`neon()`) and a hard `DATABASE_URL` requirement in the web process.

| File | What it does | AR-646 story |
|---|---|---|
| `apps/web/src/lib/auth.ts` | `SELECT ... FROM magic_link_tokens` (line 75), atomic `UPDATE magic_link_tokens SET used = TRUE` (line 91) in `authorize()` | AR-647 |
| `apps/web/src/lib/server/org.ts` | `SELECT org_id FROM org_members` in `resolveOrgId` (line 13) | AR-648 |
| `apps/web/src/app/welcome/page.tsx` | `SELECT email_verified FROM users` via direct `neon(url)` (lines 2, 35-39) | AR-649 |
| `apps/web/src/app/api/testing/auth/login/route.ts` | `INSERT`/`UPDATE users` (test-only) | accepted |
| `apps/web/src/lib/runtime/env/validation.ts` | hard `throw "DATABASE_URL is required"` (lines 60-62) | blocker |

- **Key conflict:** the "acceptable" testing login route uses `@/lib/db` (the
  Neon client), and `validation.ts` hard-requires `DATABASE_URL`. Together they
  block the epic goal of removing `DATABASE_URL` from web. Owner decision
  needed: move the testing login onto the API and relax the env guard.
- **Dependency:** the magic-link consume path (AR-647) depends on
  `magic_link_tokens`, which is **absent from Docker dev until v1 lands** — so
  AR-647 cannot be developed locally until Track D applies v1.
- **Removal path:** new API endpoints (specs in "AR-646 endpoint specs"
  below); web calls them over HTTP; `DATABASE_URL` guard relaxed.

### 4. Live data pipelines — by-design DML (no DDL)

These tables are populated by refresh jobs at runtime, not by migrations. This
is **intended**: the jobs write rows (DML) through the shared write layer
`apps/api/src/modules/signals/refresh/store-writer.ts` (ADR 0003 — chunked,
parameterized, idempotent upserts). No job issues DDL; their schema is owned by
v1 migrations. They are exceptions only in the sense that the *data* is
refresh-driven, so a fresh DB is empty until the first run.

| Table | Writer job | Trigger |
|---|---|---|
| `signals` (catalog) | `deprivation.ts` (`DEPRIVATION_SIGNALS`), `prices.ts` (`PRICES_SIGNALS`), `crime.ts` (`CRIME_SIGNALS`), `derive.ts` (`DERIVED_SIGNALS`) | `npm run refresh:deprivation/prices/crime` + `npm run derive:signals` |
| `geo_entities` | `deprivation.ts` (LSOA entities) + `geo-spine.ts` (ONS spine asserts same LSOA entities) | `refresh:deprivation`; `npm run load:geo -- <path>` |
| `geo_lookup` | `geo-spine.ts` (ONS NSPL/ONSPD loader, ~1M rows, config-driven column map) | `load:geo` (manual/CI; full ONS file not in git) |
| `ofsted_schools` | `refresh/ofsted.ts` (standalone; auto-resolves latest gov.uk CSV, upsert + delete-stale, writes `updated_at` + `source_snapshots`) | `npm run refresh:ofsted` ("monthly cron") |
| `source_snapshots` | append-only provenance row per job | same jobs |
| `signal_values` / `signal_timeseries` | source jobs write current values; `timeseries.ts` appends history | `npm run timeseries:append` |

- **Note:** `signals` catalog is DML-driven by design
  (`schema.ts:736-737` "Seeded by the refresh path, not here (the migrator is
  DDL-only)"). AR-721 (SEEDS consolidation) must respect this — catalog rows
  stay refresh-driven; do NOT fold them into `SEEDS` unless we change that
  design deliberately.
- **Owning ticket:** none required — by design. Track A (proposed) may touch
  this only to document/verify.
- **Removal path:** none (keep as-is). Add a CI/ops note that a fresh DB
  requires the first refresh run before signals/geo data is queryable.

### 5. `api_keys` column ordinal drift — immaterial

- **What:** `api_keys` has the same 14 columns in Neon and Docker, but in a
  different column order (a historical `ADD COLUMN` at the end vs an inline
  definition). Column order is immaterial to correctness — all queries are
  name-based.
- **Why it's an exception:** not a real defect; listed for completeness.
- **Owning ticket:** none.
- **Removal path:** none needed. v1 defines a canonical order; any fresh DB
  matches it.
- **Risk:** none.

### 6. Sequence convergence — `report_history_id_seq`

- **What:** Neon's sequence is `report_history_id_seq`; Docker's was
  `score_history_id_seq` (table renamed `score_history` → `report_history` at
  some point, sequence not renamed). v1 includes
  `ALTER SEQUENCE IF EXISTS score_history_id_seq RENAME TO report_history_id_seq`
  so both converge.
- **Why it's an exception:** rename fallout; harmless but must be converged for
  schema diff tooling to see the DBs as equal.
- **Owning ticket:** AR-720.
- **Removal path:** already handled by v1; verified on scratch DB
  (sequence `report_history_id_seq` exists).
- **Risk:** none — v1 is idempotent (`IF EXISTS`).

## AR-646 endpoint specs (draft)

Three new API endpoints let AR-646 remove web's direct DB access. These are
specs only — no code. All follow the API's existing conventions (`withAuth`,
`generateId`, `logger`, parameterized `query`).

### Spec 1 — `POST /auth/magic-link/consume` (AR-647)

Moves the consume half of magic-link auth out of `apps/web/src/lib/auth.ts`.

- **Request:** `{ "token": string }` (the token from the magic link).
- **Behaviour:**
  1. `SELECT id, user_id, email, expires_at, used FROM magic_link_tokens WHERE token = $1`.
  2. If no row, `used` is `TRUE`, or `expires_at < NOW()` → `401` (no leak of
     whether the token existed).
  3. **Atomically** `UPDATE magic_link_tokens SET used = TRUE WHERE id = $1 AND used = FALSE` — if 0 rows updated (race), `401`.
  4. Backfill `UPDATE users SET email_verified = TRUE WHERE id = $1 AND email_verified = FALSE`.
  5. Create a session/return the same shape the current web `authorize()`
     produces (user id + verified state), so the web layer can swap the call.
- **Concurrency:** the single-row atomic update preserves the current
  "second click sees used=TRUE" behaviour (`auth.ts:84-91`).

### Spec 2 — `GET /orgs/resolve?userId=<id>` (AR-648)

Replaces `resolveOrgId` (`apps/web/src/lib/server/org.ts:11-13`).

- **Request:** authenticated; `userId` from the session (server-side).
- **Behaviour:** `SELECT org_id FROM org_members WHERE user_id = $1 ORDER BY
  created_at ASC LIMIT 1` (owner-first ordering preserved) → `{ orgId }` or
  `{ orgId: null }`.
- **Auth:** must not allow resolving arbitrary user ids — use the session user,
  or admin-gate.

### Spec 3 — `GET /auth/state` (AR-649)

Replaces the welcome-page direct `SELECT email_verified FROM users`
(`apps/web/src/app/welcome/page.tsx:35-39`).

- **Request:** authenticated.
- **Response:** `{ emailVerified: boolean }` (optionally `{ user }` when the
  profile endpoint exists).
- **Auth:** session user only; never accept a client-supplied id.

## Remediation roadmap (PROPOSAL — not yet created)

Draft structure to be triaged. When approved, these are created under a new
epic, e.g. **"Migrations-only schema governance"**, with the stories below
running in parallel (separate worktrees/branches, Jira workflow
To Do → In Progress → In Review → Done via jira-github-lifecycle).

| Track | Story (proposed) | Scope | Parallel with |
|---|---|---|---|
| A | Fold web test fixtures into API migrations/seeds; make web tests use the API migrator | Exception 2 | B, C, D |
| B | `reddit_seen_posts`: drop-on-Neon + `DROP` migration | Exception 1 | A, C, D |
| C | CI drift check + `AGENTS.md` + PR checklist (governance enforcement) | Invariant | A, B, D |
| D | Promote v1 from sandbox → real branch → PR → gated apply to `oga_local` + Neon (backup/PITR) | v1 (AR-720) | A, B, C |
| E | AR-646 web-layer removal via the 3 endpoint specs | Exceptions 3 | independent epic (AR-646) |

- **Ordering:** B is an unblock for nothing (orphan); D must land before any
  local AR-647 development. Tracks A–D are mutually independent; E runs under
  AR-646 in parallel with all of them.
- **v1 disposition:** stays in the sandbox until Track D is working, then the
  sandbox worktree is thrown away.

## Verification summary (Phase 2, AR-720/AR-722)

- v1 = 41 migrations + 1 seed, ~100 statements, all idempotent
  (`IF NOT EXISTS` / `IF EXISTS` / `SET DEFAULT` / `RENAME ... IF EXISTS`).
- Fresh scratch DB (`oga_sync_scratch`, Docker): run 1 exit 0; re-run
  idempotent (only "already exists, skipping" NOTICEs).
- Shape matches Neon: `magic_link_tokens` columns identical (incl.
  `idx_magic_link_email_created`), `subscriptions` `'free'::text` /
  `'active'::text`, sequence `report_history_id_seq`, `users` 14 columns.
- `migrate.test.ts` 16/16 passing; `npx tsc --noEmit` exit 0.
- Scratch DB dropped after verification; `oga_local` and Neon untouched.
