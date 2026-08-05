# 072 — DB Sync: Exceptions Report (AR-723)

## Purpose
Publish the DB-sync reconciliation outcomes as a durable, very detailed exceptions
report in the repo, codify the **migrations-only DDL governance invariant**, and
spec the AR-646 web-layer API endpoints so the parallel epic can proceed. v1
(baseline in sandbox `feat/AR-720-db-sync-sandbox`) stays untouched until Track D
works.

## Linked Jira
- **Epic:** AR-718 (DB sync reconcile Neon ⇄ Docker, v1 reset, exceptions report)
- **Epic (related):** AR-646 (remove direct DB access from `apps/web`)
- **Task (this branch):** AR-723 — Exceptions report
- **Sibling tasks:** AR-719 (Phase 1 diff), AR-720 (v1 rewrite), AR-721 (SEEDS), AR-722 (verify) — all under AR-718 via Relates.
- **Proposed remediation (report-only, NOT created yet):** new epic "Migrations-only schema governance" + Track A–E stories (see report §Remediation).

## High-level steps
1. Write `docs/ARCHITECTURE/DB_SYNC_EXCEPTIONS.md`:
   - Exception catalog (reddit_seen_posts, test fixtures, web direct-DB, live pipelines, api_keys column order, sequence convergence).
   - Migrations-only governance invariant + enforcement suggestion.
   - Remediation roadmap (proposed epic + parallel Tracks A–E, Jira workflow usage).
   - AR-646 endpoint specs (magic-link/consume, org-resolution, auth-state).
2. Post Jira comments on AR-646 / AR-718 / AR-720 summarizing findings.
3. Set AR-723 In Progress; assign executor.
4. Commit per step on `feat/AR-723-exceptions-report`; push; output PR draft.

## Git workflow
- **Isolation:** worktree `.worktrees/AR-723-exceptions-report`, branch `feat/AR-723-exceptions-report`, off `main` (e663674). Never edit on `main`.
- **Commits:** one logical commit per artifact (plan doc; report; jira sync) — small, imperative messages, authored by driving human (Marcos Rossini).
- **Pushes:** feature branch only. PR to `main` at end; no direct pushes to `main`.
- **Sandbox:** `feat/AR-720-db-sync-sandbox` v1 retained until Track D working.

## Jira structure
- AR-718 = Epic. AR-719/720/721/722/723 = Tasks linked via `Relates`. Plan lives here on the impl branch; Jira updated across the lifecycle (To Do → In Progress → Done on merge).
- Proposed remediation epic + Tracks stays a proposal inside the report until triaged (per user).