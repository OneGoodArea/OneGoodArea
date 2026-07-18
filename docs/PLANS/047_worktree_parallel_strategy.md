# Plan 047: Worktree & Parallel Execution Strategy

> Orchestration plan (NOT an epic, NOT a feature). Defines HOW Plans 043/044/045/046
> are developed in parallel using git worktrees, then integrated. Companion to the
> four implementation plans; does not change application code itself.

## Purpose (one sentence)

Use one git worktree per plan so 043/044/045/046 are developed, linted, typechecked,
and CI-validated in parallel on isolated branches, then merged into an integration
branch and finally `main` — minimizing context-switching and merge friction.

---

## Context / conventions (verified)

- Repo: `OneGoodArea`, default branch `main`. Remote `origin` (GitHub).
- Branch naming already in use:
  - Planning: `plan/<slug>` (no JIRA) — e.g. `plan/qa-scripts-housekeeping-ar478`.
  - Implementation: `feat/AR-XXX-<slug>` (carries JIRA key).
- CI (`ci.yml`): runs on PRs to `main` (lint + typecheck + test with Stripe mock).
  Each worktree branch can open its own PR and get CI green independently.
- Worktree location convention: `.worktrees/<slug>` off repo root.
- Container engine auto-detects Podman then Docker (`CTR_ENGINE`); "docker" in
  conversation = Podman. Test stack: `compose/compose.test.yml` (ephemeral
  `oga_test`, isolated ports, no volumes).

---

## Strategy

### Per-plan / per-JIRA worktree + branch
Each plan is one branch; EPIC plans (043, 044) spawn ONE branch PER CHILD JIRA
story. Every branch gets its own worktree. Branch naming: `feat/<JIRA-KEY>-<slug>`.

| Plan | JIRA(s) | Worktree path(s) | Branch(es) |
|---|---|---|---|
| 046 OpenAPI sync | AR-YYY (1 story) | `.worktrees/046-openapi-sync` | `feat/AR-YYY-openapi-schema-sync` |
| 045 User tier flags | AR-YYY (1 story) | `.worktrees/045-user-tier-flags` | `feat/AR-YYY-user-tier-flags` |
| 044 EPIC B | AR-B1..AR-B6 (6 stories) | `.worktrees/044-b1-tiers` … `.worktrees/044-b6-tests` | `feat/AR-B1-tiers-catalog-resolver` … `feat/AR-B6-tier-tests` |
| 043 EPIC A | AR-A1..AR-A5 (5 stories) | `.worktrees/043-a1-wrapper` … `.worktrees/043-a5-tests` | `feat/AR-A1-playground-wrapper` … `feat/AR-A5-dev-surface-tests` |

### Parallel waves
- **Wave 1 (fully parallel, no shared code):** 046 and 045.
  - 046 touches only `apps/api` route `.schema` + a spec test. No dependency on 045.
  - 045 touches only `users` schema + gated write + self-scoped read. No dependency on 046.
  - Both worked simultaneously in separate worktrees; each opens its own PR.
- **Wave 2 (depends on Wave 1):** 044 EPIC B.
  - `resolveTier` (B.1) reads the `tier` column from 045 -> branch 044 FROM the
    merged 045 (or rebase onto `integ/...` that includes 045).
  - `modules/rate-limit/*` (B.2) + gate wiring (B.3) + LLM routing (B.4) are
    standalone; can proceed as soon as 045 merges. Does NOT need 046.
- **Wave 3 (depends on 046 + 044):** 043 EPIC A.
  - A.1/A.2 consume the synced spec (046) + the demo-key tier quota (044).
  - A.3 (retire custom playground proxy) is the LAST step and MUST wait until 044's
    demo-key quota exists, so anonymous users keep a cap.

### Integration branch
- After 046 + 045 merge to `main` (or before, to save cycles): create
  `integ/tier-developer-surface` from `main`, merge 046 + 045 there, let 044 rebase
  onto it, then 043. This gives one place to run the full lint/typecheck/test suite
  across the combined change before the final merge to `main`.
- Alternative (simpler): merge each plan directly to `main` in wave order; 044 and
  043 rebase onto `main` as deps land.

---

## Safeguards & Execution Gates

**Branch protection (via GitHub MCP — NOT gh CLI)**
- Before the FIRST PR of any plan, verify `main` protection using GitHub MCP:
  `mcp__github__get_branch_protection` (or equivalent) on
  `OneGoodArea/OneGoodArea@main`.
- Required: PR review approval + green status checks (`lint`, `typecheck`, `test`).
- If protection/checks are missing, STOP and report — do not open the PR.
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

Branch-per-JIRA: every story (incl. each EPIC child) is its own worktree/branch.
Steps inside a story are commits, not branches.

```
# from repo root on main, clean tree
# Wave 1 (parallel):
git worktree add -b feat/AR-YYY-openapi-schema-sync .worktrees/046-openapi-sync
git worktree add -b feat/AR-YYY-user-tier-flags    .worktrees/045-user-tier-flags

# ... work sub-steps as commits, open PR per story, get CI green (containers)

# Wave 2 (044 EPIC B — one branch per child JIRA, sequential on deps):
git worktree add -b feat/AR-B1-tiers-catalog-resolver  .worktrees/044-b1-tiers     # needs 045
git worktree add -b feat/AR-B2-ratelimit-module         .worktrees/044-b2-ratelimit # needs B1
git worktree add -b feat/AR-B3-gate-tier-quota          .worktrees/044-b3-gate      # needs B2
git worktree add -b feat/AR-B4-llm-tier-routing         .worktrees/044-b4-llm       # needs B1 (parallel w/ B3)
git worktree add -b feat/AR-B5-tier-config-deploy       .worktrees/044-b5-config    # needs B1 (parallel w/ B3/B4)
git worktree add -b feat/AR-B6-tier-tests               .worktrees/044-b6-tests     # needs B2,B3,B4

# Wave 3 (043 EPIC A — one branch per child JIRA):
git worktree add -b feat/AR-A1-playground-wrapper        .worktrees/043-a1-wrapper   # needs 046
git worktree add -b feat/AR-A2-developers-surface        .worktrees/043-a2-developers # needs A1,046
git worktree add -b feat/AR-A4-preserve-renderers        .worktrees/043-a4-preserve   # needs A1 (parallel w/ A2)
git worktree add -b feat/AR-A3-retire-playground-proxy   .worktrees/043-a3-retire     # needs EPIC-B AR-B3
git worktree add -b feat/AR-A5-dev-surface-tests         .worktrees/043-a5-tests      # needs A1,A3

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
046 ─┐
    ├─► 043 EPIC A
045 ─┘ (045 also ─► 044 EPIC B ─► 043)
```
- Parallel: 046 ‖ 045 (Wave 1).
- Serial gates: 044 needs 045; 043 needs 046 + 044; 043 A.3 needs 044's demo quota.

## Risks / notes
- Worktrees share the same `.git` but separate working dirs + node_modules per
  workspace — run `npm install` inside each worktree after add (or symlink
  node_modules to avoid re-install).
- Stripe mock + Neon test DB: each worktree's tests need their own env; the
  existing `local:test:*` Make targets assume one tree — run tests serially per
  worktree or point each at an isolated DB (the ephemeral `compose.test.yml`
  already isolates per-stack).
- Don't merge a plan that another open worktree still depends on without rebasing
  the dependent worktree first.

## Out of scope
- All application code (covered by 043/044/045/046).
