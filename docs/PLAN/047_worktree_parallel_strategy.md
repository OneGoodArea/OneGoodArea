# Plan 047: Worktree & Parallel Execution Strategy

> Orchestration plan (NOT an epic, NOT a feature). Defines HOW Plans
> 043/044/045/046/048/049/050 are developed in parallel using git worktrees, then
> integrated. Companion to the implementation plans; does not change application
> code itself.

## Purpose (one sentence)

Use one git worktree per plan/story so 043/044/045/046/048/049/050 are developed,
linted, typechecked, and CI-validated in parallel on isolated branches, then
merged into `main` — minimizing context-switching and merge friction.

---

## Context / conventions (verified)

- Repo: `OneGoodArea`, default branch `main`. Remote `origin` (GitHub).
- Branch naming already in use:
  - Planning: `plan/<slug>` (no JIRA) — e.g. `plan/qa-scripts-housekeeping-ar478`.
  - Implementation: `feat/<JIRA-KEY>-<slug>` (carries JIRA key).
- CI (`ci.yml`): runs on PRs to `main` (lint + typecheck + test with Stripe mock).
  Each worktree branch can open its own PR and get CI green independently.
- Worktree location: **inside the project directory** at `.worktrees/<slug>` off
  repo root. MUST be added to `.gitignore` (append `.worktrees/`) so worktrees are
  never committed.
- Container engine auto-detects Podman then Docker (`CTR_ENGINE`); "docker" in
  conversation = Podman. Test stack: `compose/compose.test.yml` (ephemeral
  `oga_test`, isolated ports, no volumes).

---

## JIRA story map (all children of epic AR-441)

| Plan | Story | Subtasks |
|---|---|---|
| 043 Branded /playground surface | AR-498 | AR-505..AR-508 |
| 044 EPIC B (tiers + demo-key quota) | AR-499 | AR-510..AR-515 |
| 045 User tier flags | AR-500 | AR-516..AR-519 |
| 046 OpenAPI spec sync | AR-501 | AR-520..AR-524, AR-541 |
| 048 Single-source Zod | AR-502 | AR-525..AR-529 |
| 049 Scalar branding lockdown | AR-503 | AR-530..AR-534 |
| 050 Retire proxy + /playground module | AR-504 | AR-535..AR-540 |

## Strategy

### Per-plan / per-JIRA worktree + branch
Each plan is one branch; EPIC plans (043, 044) spawn one branch per story. Every
branch gets its own worktree. Branch naming: `feat/<JIRA-KEY>-<slug>`.

| Plan | Story | Worktree path | Branch |
|---|---|---|---|
| 046 OpenAPI sync | AR-501 | `.worktrees/046-openapi-sync` | `feat/AR-501-openapi-schema-sync` |
| 045 User tier flags | AR-500 | `.worktrees/045-user-tier-flags` | `feat/AR-500-user-tier-flags` |
| 044 EPIC B | AR-499 | `.worktrees/044-epic-b` | `feat/AR-499-tiers-demo-key-quota` |
| 050 Retire proxy + module | AR-504 | `.worktrees/050-retire-surface` | `feat/AR-504-playground-retire-surface` |
| 048 Single-source Zod | AR-502 | `.worktrees/048-single-source` | `feat/AR-502-openapi-single-source` |
| 043 Branded surface | AR-498 | `.worktrees/043-developer-surface` | `feat/AR-498-developer-surface` |
| 049 Scalar branding | AR-503 | `.worktrees/049-scalar-branding` | `feat/AR-503-scalar-branding-lockdown` |

### Parallel waves
- **Wave 1 (fully parallel, no shared code):** 046 and 045.
  - 046 touches only `apps/api` route `.schema` + a spec test. No dependency on 045.
    Internally, 046 splits into Wave 1 (46.2a: public v1 API-key routes, AR-521)
    and Wave 2 (46.2b: session/dashboard routes + internal marking, AR-541) — both
    commits on the same branch, sequential.
  - 045 touches only `users` schema + gated write + self-scoped read. No dependency on 046.
  - Both worked simultaneously in separate worktrees; each opens its own PR.
- **Wave 1b (after 046, no shared code with Wave 1):** 050 and 048.
  - 050 (retire custom proxy + establish independent `developer-surface` module)
    depends on **046 only** — renders the now-accurate spec at `/playground`.
  - 048 (single-source Zod type provider) depends on **046 only** — builds on the
    backfilled schemas.
  - 050 and 048 are independent of each other; can run in parallel.
- **Wave 2 (depends on Wave 1):** 044 EPIC B.
  - `resolveTier` (044) reads the `tier` column from 045 -> branch 044 FROM the
    merged 045 (or rebase onto `integ/...` that includes 045).
  - Standalone 044 steps (rate-limit module, gate wiring, LLM routing) proceed as
    soon as 045 merges. Does NOT need 046.
- **Wave 3 (depends on 046 + 050 + 044):** 043 Branded surface.
  - A.1/A.2 consume the synced spec (046) + the `developer-surface` module (050) +
    the demo-key tier quota (044).
- **Wave 3b (after 043 + 050):** 049 Scalar branding lockdown.
  - Hardens the `/playground` Scalar page (branded home, CSS, kill external CTAs).

### Integration branch
- After 046 + 045 merge to `main`: create `integ/tier-developer-surface` from
  `main`, merge 046 + 045 there, let 044/050/048 rebase onto it, then 043, then 049.
  This gives one place to run the full lint/typecheck/test suite across the
  combined change before the final merge to `main`.
- Simpler alternative: merge each plan directly to `main` in wave order; dependents
  rebase onto `main` as deps land.

---

## Safeguards & Execution Gates

**Branch protection**
- Before the FIRST PR of any plan, verify `main` protection: PR review approval +
  green status checks (`lint`, `typecheck`, `test`).
- Use GitHub MCP where available. NOTE: `mcp__github__get_branch_protection` is
  not present in this environment's MCP toolset — fall back to `gh api
  repos/OneGoodArea/OneGoodArea/branches/main/protection` (or the GitHub web UI)
  and RECORD the result in a comment on AR-441. If protection/checks are missing,
  STOP and report — do not open the PR.
- Every worktree branch opens its own PR; CI must be green before merge.

**Test execution model (containers, fire away)**
- Spin the stack: `podman compose -f compose/compose.test.yml up -d --build`.
- Unit: vitest inside `api-test` / `web-test` containers
  (`npm run test -w @onegoodarea/api`).
- E2E: node/curl script (pattern `e2e/playground-rate-limit.mjs`) run against the
  `api-test` container over the compose network — i.e. the test runner lives
  OUTSIDE the implementation container and calls it over HTTP.
- Integration (ON-DEMAND, before final merge to `main`): spin the full stack on
  `integ/tier-developer-surface`, run combined unit + e2e. Not auto-run per PR.
- Tear down: `podman compose -f compose/compose.test.yml down`.

**Per-worktree isolation**
- Each worktree runs its OWN ephemeral `compose.test.yml` stack (isolated
  `oga_test`, isolated ports) → unit/e2e run in parallel with no cross-talk.
- `node_modules`: run `npm install` inside each worktree after `git worktree add`
  (or symlink to avoid re-install).

---

## Worktree workflow (commands, for implementer)

Branch-per-plan/story: every story is its own worktree/branch. Steps inside a
story are commits, not branches. Worktrees live INSIDE the project at
`.worktrees/<slug>` and `.worktrees/` is gitignored.

```
# from repo root on main, clean tree
# Wave 1 (parallel):
git worktree add -b feat/AR-501-openapi-schema-sync .worktrees/046-openapi-sync
git worktree add -b feat/AR-500-user-tier-flags    .worktrees/045-user-tier-flags

# Wave 1b (after 046 merges):
git worktree add -b feat/AR-504-playground-retire-surface .worktrees/050-retire-surface
git worktree add -b feat/AR-502-openapi-single-source      .worktrees/048-single-source

# Wave 2 (044 EPIC B — needs 045):
git worktree add -b feat/AR-499-tiers-demo-key-quota .worktrees/044-epic-b

# Wave 3 (043 — needs 046 + 050 + 044):
git worktree add -b feat/AR-498-developer-surface .worktrees/043-developer-surface

# Wave 3b (049 — after 043 + 050):
git worktree add -b feat/AR-503-scalar-branding-lockdown .worktrees/049-scalar-branding

# spin containers + fire tests (per worktree):
podman compose -f compose/compose.test.yml up -d --build
npm run test -w @onegoodarea/api
# e2e script against api-test container over network
podman compose -f compose/compose.test.yml down

# cleanup after merge:
git worktree remove .worktrees/046-openapi-sync
git worktree prune
```

---

## Dependencies recap
```
046 ─┬─► 050 ─┐
    │         ├─► 043 ─► 049
    └─► 048    │
045 ──► 044 ──┘ (044 demo-key feeds 043 A.1)
```
- Parallel: 046 ‖ 045 (Wave 1); 050 ‖ 048 (Wave 1b, both on 046).
- Serial gates: 044 needs 045; 050 needs 046; 048 needs 046; 043 needs 046 + 050
  (+ 044 demo key); 049 needs 043 + 050.

## Risks / notes
- Worktrees share the same `.git` but separate working dirs + node_modules per
  workspace — run `npm install` inside each worktree after add (or symlink
  node_modules to avoid re-install).
- 046 has internal waves (46.2a Wave 1 → 46.2b Wave 2) — both are commits on the
  same branch, not separate worktrees. The overall wave sequencing (046 ‖ 045 in
  Wave 1) still applies at the plan level.
- Stripe mock + Neon test DB: each worktree's tests need their own env; the
  existing `local:test:*` Make targets assume one tree — run tests serially per
  worktree or point each at an isolated DB (the ephemeral `compose.test.yml`
  already isolates per-stack).
- Don't merge a plan that another open worktree still depends on without rebasing
  the dependent worktree first.
- `.worktrees/` MUST stay gitignored — verify after the first `git worktree add`.

## Out of scope
- All application code (covered by 043/044/045/046/048/049/050).
