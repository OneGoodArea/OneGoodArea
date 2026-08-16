# Plan 082 — Automated + documented local install (from zero to working app)

## Purpose

Turn the current piecemeal setup — `app-setup`, `stack-*`, `signal-refresh`,
`load-geo`, `setup-test-tokens.sh`, `scripts-api-test-suite` — into a single
documented, staged install flow. A developer (or CI) goes from `git clone` to a
running API + web + populated signal store + green API test suite with two make
targets:

- `make app-install` — fast path (deps, env scaffold, DB stack, migrate/seed,
  sample NSPL geo spine, boot stack, test tokens, API test suite).
- `make app-install-full` — full-data path (real NSPL geo spine + full
  `signal-refresh`, ~GB downloads, long first run).

Plus a containerized prod-style path (`app-install-prod`) and an install
runbook in `docs/OPERATIONS/`, fixing known doc drift (`make db-seed` referenced
but missing; geo-spine prerequisite buried in a SIGNAL-REFRESH.md note).

This plan is born from the friction hit while bringing up the AR-817 worktree:
SELinux `:z` mount failures, non-idempotent FK migrations, empty geo spine
blocking `refresh:prices`, and a test suite that needs tokens first.

- Status: **PLANNED**.
- Jira: Epic **AR-853** "Local install + developer DX"; Story **AR-854**
  beneath it; Subtasks AR-855–AR-860, one per implementation step (see
  "Jira mapping").
- Branch/worktree: `feat/AR-854-local-install-dx` in
  `.worktrees/AR-854-local-install-dx`, created off `main`
  (see "GIT workflow").

## Scope (chosen by user)

- Local from-zero boot
- API test suite ready (tokens + suite wired into the flow)
- Docs rewrite (consolidate install into one OPERATIONS runbook, fix drift)
- Containerized prod-style (build images + full compose + refresh)

## Current state / facts driving the plan

- Make surface today (`build/`): `app-setup` (npm ci + env scaffold),
  `app-build/dev/test/typecheck/lint`, `stack-up-min/full/db`, `stack-down*`,
  `stack-logs`, `stack-clean`, `build-api-image`, `build-web-image`,
  `signal-refresh-build`, `signal-refresh` (boots postgres+neon-proxy then runs
  the containerized pipeline), `load-geo FILE=...`, `stack-dev-*`,
  `scripts-bootstrap-test-key`, `seed-showcase-key`, `scripts-run`,
  `scripts-api-test-suite`.
- `signal-refresh` step 1 runs `npm run migrate` (incl. `runSeeds()`) in the
  `signal-refresh` compose service (`node:22-alpine` refresh-stage image,
  repo root bind-mounted at `/app`, `DATABASE_URL` = local Postgres via
  neon-compat-proxy `NEON_FETCH_ENDPOINT`).
- `refresh:prices` / `refresh:crime` / `refresh:peers` map postcode→LSOA from
  `geo_lookup`; empty until the ONS NSPL spine is loaded once
  (`npm run load:geo -w @onegoodarea/api -- <nspl.csv>`). Sample:
  `apps/api/seed/nspl-sample.csv` (12 rows).
- Full data path pulls big remote files: NSPL (~1GB, manual ONS download) and
  police.uk `latest.zip` (~1.6GB, auto-downloaded + cached in `refresh-cache`).
- Test suite: `source scripts/setup-test-tokens.sh` (needs API up on
  `http://localhost:8080`) then `scripts/api-test-suite.sh localhost:8080`
  (or `make scripts-api-test-suite`).
- Uncommitted prereq fixes in the AR-817 worktree (discovered this session):
  1. `build/targets-scripts.mk` — SELinux `:z` on script mounts + signal env
     forwarding (`OGA_SIGNALS_API`, `OGA_SIGNALS_STORE_READ`).
  2. `apps/api/src/infrastructure/db/schema.ts` — idempotent FK migrations
     (`DROP CONSTRAINT IF EXISTS` before each `ADD CONSTRAINT`).
  3. `apps/api/scripts/signal-refresh.sh` — `run_step()` verbosity.
  4. `scripts/api-test-suite.sh` — Signals banner.
  All four are prerequisites for the install flow and must land as commits.

## Changes (staged automation)

### A. Prereq fixes committed (as their own fix commits)
- Take the 4 uncommitted worktree edits and commit them on the install branch,
  one commit each (or one grouped `chore(dev): ...` — see GIT workflow), each
  referencing its Jira key. These unblock `scripts-api-test-suite` and
  `signal-refresh` on any fresh machine (SELinux/Enforcing hosts included).

### B. `db-migrate` + `db-seed` targets (fill the documented gap)
- New `db-migrate` target: boots postgres+neon-proxy, runs
  `npm run migrate -w @onegoodarea/api` in the `signal-refresh` container
  (reuses the same compose invocation as `signal-refresh`'s step 1).
- New `db-seed` target: runs migrate + seeds explicitly (so `make db-seed` in
  LOCAL-SETUP.md becomes real). Alias semantics: migrate always; seeds only when
  gate env vars are set (`SEED_SHOWCASE_API_KEY`), matching current behavior.

### C. `load-geo-sample` convenience target
- `make load-geo-sample` ≡ `make load-geo FILE=apps/api/seed/nspl-sample.csv`.
- `app-install` uses it; `app-install-full` takes `NSPL_FILE=...` (real spine).

### D. `app-install` (fast path) — new target
Chains, failing fast with a clear message if any step fails:
1. `app-setup` (npm ci + env scaffold, idempotent)
2. `stack-up-db` (postgres + neon-proxy; full/db profile)
3. `db-seed` (migrate + env-gated seeds)
4. `load-geo-sample`
5. `stack-up-min` (boot API + web on the same DB)
6. `scripts/setup-test-tokens.sh` (source → exports OGA_* tokens)
7. `scripts-api-test-suite` (containerized, or host suite) — report pass/skip.

### E. `app-install-full` (full-data path) — new target
Same as D but: 4 uses `NSPL_FILE` (real NSPL; fail with download instruction if
unset) and 5 is replaced by `signal-refresh` (full pipeline). Warn about runtime
(~GB downloads, police archive cache). Add a fast-skip flag
(`SKIP_SIGNAL_REFRESH=1`) so the geo+setup part can be validated quickly.

### F. `app-install-prod` (containerized prod-style) — new target
- `build-api-image` + `build-web-image` + `signal-refresh-build`
- `stack-up-full` (minimal + full profiles: api, web, stripe-mock, mailhog,
  pgadmin) against container images (not bind-mount dev)
- Optionally `signal-refresh` against the same DB to populate.
- Documented env for prod-style parity (`OGA_SIGNALS_API`, `OGA_CRON_SECRET`,
  Stripe mock vars) — see docs.

### G. Docs rewrite (single install runbook)
- Rewrite `docs/OPERATIONS/LOCAL-SETUP.md` → "Install" runbook: prerequisites
  (Node 22+, npm 10+, podman/docker, SELinux note), the fast/full/prod paths,
  a make-target table, expected outcomes + row counts to sanity-check.
- Update `docs/OPERATIONS/README.md` index and README.md "Run locally" gist
  (`make app-install` / `make app-install-full`).
- Fix drift: remove/replace the bogus `make db-seed` reference; move the
  geo-spine prerequisite out of the SIGNAL-REFRESH.md note into the runbook
  (keep a pointer).
- Extend `docs/OPERATIONS/LOCAL-CONTAINERS.md` with a "prod-style install"
  section (profiles, image builds, refresh daemon, env vars).

## GIT workflow

- Worktree off `main`: `.worktrees/AR-854-local-install-dx` on
  `feat/AR-854-local-install-dx` (created — branch carries this plan).
- Start from `main`; the 4 prereq fixes are picked up as commits at step A (do
  NOT cherry-pick from AR-817 — they are identical working-tree edits; copy the
  current AR-817 files/diffs as the source of those commits).
- Commits (each referencing its Jira subtask key; commit style matches repo
  conventional-commits, e.g. `chore(dev): ...` / `docs(ops): ...`):
  1. `fix(scripts): SELinux :z mounts + signal env forwarding (AR-855)`
  2. `fix(db): make FK migrations idempotent (AR-855)`
  3. `chore(refresh): verbose run_step logging in signal-refresh.sh (AR-855)`
  4. `test(suite): print signals API/store flags banner (AR-855)`
  5. `feat(make): add db-migrate/db-seed targets (AR-856)`
  6. `feat(make): add load-geo-sample target (AR-856)`
  7. `feat(make): add app-install fast-path target (AR-857)`
  8. `feat(make): add app-install-full target (AR-858)`
  9. `feat(make): add app-install-prod target (AR-859)`
  10. `docs(ops): write install runbook + fix stale references (AR-860)`
- Push the branch; open a PR (draft first) via GitHub MCP.
- On merge to `main`: transition the Story/Subtasks → Done; then
  `git -C .worktrees/AR-817-amenities-warm-cache merge main` so the AR-817
  worktree carries the migrate/idempotency fix and install automation forward
  (the migrate fix is the one AR-817 needs most immediately).

## Jira mapping

Created (project AR, assignee Marcos Rossini):

- **Epic** AR-853 — "Local install + developer DX".
- **Story** AR-854 (beneath AR-853) — "Documented + automated install: from zero
  to working app, test suite, and prod-style stack".
- **Subtasks** (beneath AR-854, one per implementation step):
  - AR-855 — commit prereq fixes (4 commits).
  - AR-856 — add `db-migrate` / `db-seed` / `load-geo-sample` targets.
  - AR-857 — add `app-install` (fast path).
  - AR-858 — add `app-install-full`.
  - AR-859 — add `app-install-prod`.
  - AR-860 — write install runbook + fix doc drift.
- Sprint: **AR Sprint 9** (id 265) — the API sprint-field write is not exposed
  by the current tooling; assign the sprint in the Jira UI when implementation
  starts (the skill requires in-progress issues to be in the active sprint).
- Transitions: Story/Subtasks To Do → In Progress at implementation start;
  → Done on merge (status 10056).

Note: project issue-type hierarchy nests Subtasks under Stories (Tasks nest
under Epics), so the per-step issues are Subtasks, not Tasks.

## Verification

- Fresh-path check on the new worktree: `make app-install` on a clean volume →
  0 failed in the API suite (skips allowed only where tokens genuinely absent).
- `make app-install-full SKIP_SIGNAL_REFRESH=1` with a real NSPL file →
  `geo_lookup` populated, `refresh:prices` maps postcodes.
- `make app-install-full` on the sample path → pipeline passes migrate +
  deprivation; prices/crime produce expected 0-or-n rows with sample data.
- `make app-lint` / `make app-typecheck` on host.
- Runbook reviewed: every command in the doc is copy-paste runnable from a
  fresh clone.

## Acceptance criteria

- [ ] `make app-install` works from a fresh clone/volume and ends with a green
      (or fully-explained-skip) API test suite.
- [ ] `make app-install-full` and `make app-install-prod` documented + working.
- [ ] One OPERATIONS install runbook; stale `make db-seed` reference fixed.
- [ ] Jira Epic AR-853 / Story AR-854 / Subtasks AR-855–AR-860 created and
      linked; transitions to Done on merge (sprint assigned in UI at start).
- [ ] Prereq fixes committed and reach `main`; AR-817 worktree merged with
      `main`.
- [ ] No secrets committed (only mock/sample/test values).