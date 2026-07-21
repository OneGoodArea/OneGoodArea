# Plan 048: Single-Source-of-Truth OpenAPI (Zod type provider)

## Purpose (one sentence)

Eliminate the residual spec/behavior drift that Plan 046's hand-backfill can't
prevent, by making the route `.schema` **BE** the Zod contract from
`@onegoodarea/contracts`, so Fastify validates and documents from the same object.

## JIRA

- Epic parent: **AR-441** (Playground → /playground Scalar surface).
- Story: **AR-502** — "Single-source OpenAPI (Zod type provider)". One branch
  `feat/AR-502-openapi-single-source`. Planning branch: `plan/openapi-single-source`.
- This plan is ONE story (not an epic). Steps are subtasks of AR-502, each a
  commit on the branch (see Plan 047):

| Step | Subtask | Maps to |
|---|---|---|
| 48.1 | AR-525 | Adopt @fastify/type-provider-zod |
| 48.2 | AR-526 | Migrate route schemas to Zod source |
| 48.3 | AR-527 | Upgrade CI guard (non-trivial Zod schemas) |
| 48.4 | AR-528 | Preserve renderers (/playground Scalar + raw spec) |
| 48.5 | AR-529 | Tests |

## Execution

Develop in a git worktree (Plan 047). Wave 1b — after Plan 046 merges. One
branch (`feat/AR-502-openapi-single-source`); each step is a commit. CI green
before merge.

---

## Context / current state (verified)

- Plan 046 backfills `.schema` via `zodToJsonSchema` (a JSON-Schema *copy*). Many
  handlers still validate via manual in-handler Zod parse → two sources → drift
  possible even after 046.
- Foundation exists: `infrastructure/utils/zod-to-json-schema.ts` (Plan 019) +
  ~75 `.schema` blocks. No `@fastify/type-provider-zod` adopted yet.
- Renderer: Scalar at `/playground` (Plan 046/050). Swagger UI retired (Scalar-only).

---

## Steps

### 48.1 — Adopt Zod type provider
Register `@fastify/type-provider-zod` at `buildApp` (`apps/api/src/app.ts`).

### 48.2 — Migrate route schemas to Zod source
Replace `body: zodToJsonSchema(X)` / manual JSON schema with `body: X` directly
(v1 public first). Remove redundant in-handler Zod parse where the provider now
validates.

### 48.3 — Upgrade CI guard
Extend 046's guard to assert each protected route's schema is a non-trivial
Zod-derived schema (not placeholder tags/summary) — closes the last drift window.

### 48.4 — Preserve renderers
Keep `/playground` (Scalar) + raw OpenAPI spec after the type-provider migration.

### 48.5 — Tests
Bad body → 400 from the provider (not the handler); spec body matches the Zod
contract; Scalar shows the full schema; diff gate = handler logic unchanged
except redundant manual parses removed.

---

## Safeguards & Execution Gates

**Where code may be written**
- `main`: ❌ never edited directly (PR-only CI). Implementation on
  `feat/AR-502-openapi-single-source` inside a git worktree.

**Branch protection (via GitHub MCP)**
- Before the first PR, verify `main` protection (review + required CI checks) via
  GitHub MCP; if absent, stop and report.
- Own PR per worktree; CI green before merge.

**Pre-implementation checks**
1. Repo tree clean; on `main` before `git worktree add`.
2. Plan 046 merged (backfilled schemas exist).
3. `compose/compose.test.yml` builds + stack up.

**Test execution model (containers, fire away)**
- Unit: vitest inside `api-test`. E2E: node/curl against `api-test`. Tear down after.

**Rollback / abort**
- Independently revertible (own branch/PR). No destructive action without confirm.

---

## Test Gates

**BEFORE coding** — 046 merged; test stack up.

**AFTER coding (must pass in container)**
- **Unit:** provider validates request bodies; spec `paths` bodies match the Zod
  contract; upgraded 046 guard passes (non-trivial Zod-derived schemas).
- **E2E:** `/playground` renders the full schema; no manual-parse drift.
- **Diff gate:** handler source unchanged except redundant in-handler Zod parses
  removed.

---

## Risks
- Type provider changes request typing; some handlers do post-parse transforms →
  migrate per tag (public v1 first, then auth/admin).

## Out of scope
- Tier/quota logic (044); developer surface (043/050); the 046 backfill itself.
