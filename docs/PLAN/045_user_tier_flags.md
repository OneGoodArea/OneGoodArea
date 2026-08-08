# Plan 045: User Tier/Role Flags on Creation (gated)

> Standalone dependency plan (NOT an epic). Feeds EPIC B (Plan 044) — provides
> the `tier` column `resolveTier` reads, and the self-scoped exposure of `tier`.

## Purpose (one sentence)

Add a `tier` column (enum-checked) to `users`, settable at creation time ONLY by
a privileged/internal path, invisible and unsettable by self-service signup, yet
readable by the user themselves via a self-scoped endpoint.

## JIRA

Single story (child of EPIC-B). Key `AR-YYY` (created at implementation time).
Planning branch: `plan/user-tier-flags`.

**This plan = one JIRA = one branch:** `feat/AR-YYY-user-tier-flags` (own worktree,
see Plan 047). Implementation is step-by-step across its sub-steps (45.1–45.5)
within this single branch; each sub-step is a commit, not a separate JIRA.

## Execution

Develop in a git worktree (see Plan 047). Wave 1 — runs in parallel with Plan
046. Branch `feat/AR-YYY-user-tier-flags` off `main`; own PR; CI green
independently. Feeds EPIC B (044), which rebases onto the merged result.

---

## Context / current state (verified)

- `users` table has `is_superuser BOOLEAN NOT NULL DEFAULT FALSE`
  (`infrastructure/db/schema.ts:53`), backfilled for `SUPERUSER_EMAILS`.
- NO `tier` (or `is_engineering`) column yet.
- Self-service creation paths:
  - `POST /auth/register` (`routes/auth.ts:44`) inserts
    `users (id, email, name, password_hash, provider, email_verified, signup_source)`
    — no tier.
  - Google/OAuth insert at `routes/auth.ts:461` — no tier.
- Existing self-scoped pattern: `/me/is-superuser` returns the flag to the caller
  themselves (session-auth), NOT leaked in a broad `/me` payload.
- `billing/plans.ts` + `modules/usage` own `plan` (billing tier, from
  `subscriptions`). The new `tier` column is the **EPIC B TIERS overlay**
  (anonymous/logged_in/basic/high_tier/engineering/superuser), decoupled from
  billing plan.
- Test stack: `compose/compose.test.yml` (ephemeral `oga_test` DB, no volumes).

---

## Rules (from user)

1. Flags MUST be addable at user-creation time (insert).
2. Random/external users MUST NOT see or set these flags — default to the lowest
   tier on self-signup; only a privileged, internal-only path escalates them.
3. Visibility: the user MAY see their OWN `tier` (self-scoped endpoint, mirroring
   `/me/is-superuser`), but it is never returned to other callers or in any
   shared/client serializer.

---

## Steps

### 45.1 — Schema: add `tier` column
- `ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'basic'
   CHECK (tier IN ('anonymous','logged_in','basic','high_tier','engineering','superuser'))`.
- Keep `is_superuser` as the super-privilege override (superuser > any tier).

### 45.2 — Gated write path (privileged only)
- New internal/admin-only mutation to set `tier` (superuser-only endpoint or
  seed/migration script). NEVER reachable from `/auth/register` or OAuth.
- `/auth/register` and OAuth insert: explicitly do NOT pass `tier` (defaults to
  lowest). Assert via test that a crafted body with `tier` is ignored (column not
  in INSERT list; reject unknown fields).

### 45.3 — Self-scoped read (point b)
- Expose `tier` to the user themselves: extend `/me` or add `/me/tier` (mirror
  `/me/is-superuser` pattern). Returns the caller's own tier only.
- Audit all user-row serializers: `/me`, `/keys/usage`, org member views — NONE
  may include `tier`/`is_superuser` for non-privileged callers.

### 45.4 — `resolveTier(ctx)` consumes the column (EPIC B B.1)
- anonymous (no key) -> logged_in/basic/high_tier (plan mapping) ->
  engineering (tier col) -> superuser (`is_superuser`, overrides).

### 45.5 — Tests (see Test Gates below)

---

## Safeguards & Execution Gates

**Where code may be written**
- `main`: ❌ never edited directly (PR-only CI). Implementation on
  `feat/AR-YYY-user-tier-flags` inside a git worktree.

**Branch protection (via GitHub MCP)**
- Before the first PR, verify `main` protection (review + required CI checks)
  via GitHub MCP (`mcp__github__get_branch_protection` on
  `OneGoodArea/OneGoodArea@main`); if absent, stop and report.
- Own PR per worktree; CI green before merge.

**Pre-implementation checks**
1. Repo tree clean; on `main` before `git worktree add`.
2. `compose/compose.test.yml` builds + stack up:
   `podman compose -f compose/compose.test.yml up -d --build`.
3. `is_superuser` backfill test currently passes (regression baseline).

**Test execution model (containers, fire away)**
- Unit: vitest inside `api-test` container.
- E2E: node/curl script against `api-test` over compose network.
- Tear down: `podman compose -f compose/compose.test.yml down`.

**Rollback / abort**
- Independently revertible. Migration is additive + idempotent; safe to revert.

---

## Test Gates

**BEFORE coding**
- `oga_test` DB up; `is_superuser` backfill test passes.

**AFTER coding (must pass in container)**
- **Unit:**
  - Migration idempotent (`ADD COLUMN IF NOT EXISTS` + `CHECK`); re-run on
    existing DB does not error.
  - `POST /auth/register` with body `{"tier":"engineering",...}` → row stored
    with `tier = 'basic'` (ignored). Test asserts DB row, not just response.
  - OAuth insert likewise defaults to lowest tier.
  - `GET /me/tier` (session-auth) returns the caller's own `tier` only.
  - A non-privileged `GET /me` / `/keys/usage` response contains NO `tier` /
    `is_superuser` field.
- **E2E:** register via `api-test` container → `GET /me/tier` = `basic`;
  privileged superuser sets `tier='engineering'` → reflected in `resolveTier`
  path (asserted via a test endpoint or DB read).
- **Regression:** existing `is_superuser` backfill + `/me/is-superuser` still
  pass.

---

## Risks
- Accidentally exposing flags via a shared serializer — audit all user row reads.
- Tier column vs boolean flags — chose `tier TEXT` for grow/collapse safety.

## Out of scope
- Billing plan changes; LLM routing impl (EPIC B); Swagger UI (EPIC A); spec
  sync (046).
