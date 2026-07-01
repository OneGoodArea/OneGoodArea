# ADR 0028 — Levers: Org CRUD endpoints + signup auto-org

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-194; depends on
  [[adr-0027-levers-foundation]] (the `orgs` + `org_members` schema +
  `validateApiKey` returning `{userId, orgId}`).

## Context

ADR 0027 (Foundation) landed the **tenancy primitives** — schema,
backfill, auth-shape change — but explicitly deferred:

- CRUD endpoints to create / list / inspect / rename orgs and manage
  membership.
- Signup-flow auto-create of personal org for **new** users (the
  migration only covered existing users).
- Role-aware mutation guards (owner-only writes).

This ADR ships those pieces. It is the second of 8–9 Levers commits;
the next layers (custom signal bundles, scoring presets, methodology
pinning, per-org peer graphs, RBAC fully, white-label, IP allowlist)
all FK to `orgs.id` and can now compose against this surface.

## Decision

### Contracts (`packages/contracts/src/orgs.ts`)

Five Zod schemas plus DTO types:

- `OrgRoleSchema` — `"owner" | "admin" | "member"` enum.
- `OrgSchema` — id / slug / name / created_at / updated_at (`strict`).
- `OrgMemberSchema` — org_id / user_id / role / joined_at (`strict`).
- `OrgWithRoleSchema` — `OrgSchema.extend({ role: OrgRoleSchema })`,
  returned by `GET /v1/orgs` so the client knows what the caller can
  do without a second round-trip.
- Request bodies: `CreateOrgRequestSchema`, `UpdateOrgRequestSchema`
  (refined: ≥1 of {name, slug}), `AddMemberRequestSchema` (role
  optional, defaults `member` server-side).

Slugs are validated `^[a-z0-9-]+$`, length 2–60. The server derives a
slug from name if one isn't passed (`slugify(name)` — lowercase,
non-alphanumeric → `-`, trim).

### Module (`apps/api/src/modules/orgs/index.ts`)

Pure helpers + thin I/O functions:

- `slugify(input)` — lowercase + non-alphanumeric → single dash +
  trim. Idempotent. Unit-tested.
- `personalOrgId(userId)` = `'org_' + userId`.
- `personalOrgSlug(email, userId)` = `slugify(local-part) + '-' +
  userId.slice(0,12)`. **Matches the migration backfill formula
  exactly** so re-running is a no-op via `ON CONFLICT DO NOTHING`.
- `listOrgsForUser` / `getOrgIfMember` / `getRoleInOrg` / `listMembers`
  — JOIN-based reads.
- `createOrgWithOwner` — generates id, inserts org + owner membership.
- `createPersonalOrgForUser(userId, email)` — idempotent personal-org
  creation; called from `/auth/register` for new credentials signups.
- `updateOrg` — rename / re-slug; three branches (name only / slug
  only / both) because Neon tagged-template binds are typed.
- `addMember` / `removeMember` / `countOwners` — membership writes +
  last-owner-guard input.

### Endpoints (`apps/api/src/app.ts`)

Seven routes, all `requireApiAccess`-gated (api-key auth; session-mode
via the BFF bridge calls the same routes):

| Method | Path | Guard | Notes |
|--------|------|-------|-------|
| POST   | `/v1/orgs`                          | api-key + member  | Creates org with caller as owner. 409 on slug collision. |
| GET    | `/v1/orgs`                          | api-key + member  | List caller's orgs with role. |
| GET    | `/v1/orgs/:id`                      | api-key + member  | 404 if caller not a member. |
| PATCH  | `/v1/orgs/:id`                      | api-key + owner   | Rename / re-slug. 409 on slug collision. |
| GET    | `/v1/orgs/:id/members`              | api-key + member  | List members. |
| POST   | `/v1/orgs/:id/members`              | api-key + owner   | Add existing user by id. |
| DELETE | `/v1/orgs/:id/members/:userId`      | api-key + (owner ∨ self) | Removes one member. Last-owner guard: 409 if `target.role === 'owner' && countOwners === 1`. |

Membership is checked BEFORE the body is validated for owner-only
ops; this lets a 404 ("Org not found") absorb both "doesn't exist" and
"caller not a member" — no membership enumeration.

### Signup auto-org

`/auth/register` calls `createPersonalOrgForUser(id, sanitizedEmail)`
inline after the `INSERT INTO users`. Wrapped in `try/catch` so an
org failure does NOT block account creation (a lazy ensure path can
backfill on first authenticated request — TBD if observed in prod).

OAuth signups still flow through apps/web's NextAuth (apps/api can't
intercept). The migration backfilled every existing OAuth user; the
gap is only NEW OAuth signups going forward. Closing that gap needs
either (a) a BFF call to the same helper or (b) a lazy-ensure path at
session-bridge time. Deferred to whichever Levers commit needs org
context from OAuth users first.

### Telemetry

Four `trackEvent` calls: `api.org.created`, `api.org.updated`,
`api.org.member_added`, `api.org.member_removed`. Pre-existing
activity pipeline — no new shape needed.

### Migration test loosened

`migrate.test.ts > every DDL statement is idempotent` previously
accepted `IF NOT EXISTS` and `DROP NOT NULL`. The Foundation DML
statements (backfill INSERT into orgs / org_members) use the OTHER
idempotency mechanism: `ON CONFLICT [target] DO NOTHING` and
`UPDATE ... WHERE org_id IS NULL` (predicate-guarded re-runs). The
test now accepts those patterns too. Same safety property, broader
expression.

## Consequences

**Positive**

- Orgs are now first-class: a user can create them, rename them,
  invite each other, leave. The whole 4-product surface can FK
  to orgs.id from here on.
- New credentials signups get a personal org **automatically**
  (matching the migration's invariant: every user belongs to ≥1 org).
- The `last_owner` guard is enforced server-side: orgs can never be
  orphaned.
- Slug collisions surface as 409s with a clear message — clients
  can retry with a different slug instead of guessing.
- All 7 endpoints share the `requireApiAccess` gate so plan + rate
  limits are honored.
- Test coverage: 11 unit tests on the pure helpers (slug formula,
  personalOrgId/Slug round-trips).

**Negative / accepted**

- `admin` role is defined in the contract but functionally
  equivalent to `member` for THIS commit's RBAC (owner-only writes).
  Full RBAC (`admin` can add members, edit org, but not delete the
  org) lands in a later Levers commit.
- OAuth signups don't get auto-org from this commit. Existing OAuth
  users are covered by the migration; new ones will be addressed in
  a follow-up.
- Adding a member to an org assumes the user already exists in
  `users` (no email-invite flow yet). Acceptable for v1; cross-org
  invite UX is a later commit.
- No FK constraint on `org_members.org_id` / `user_id` — same
  pattern as the rest of the codebase (decision earlier in the
  restructure). Application enforces.
- The Foundation `ON CONFLICT (org_id, user_id) DO NOTHING` in the
  org_members backfill means: if the migration already ran AND
  someone races a manual membership change before the next run,
  the manual change "wins" and the migration is a no-op. Fine —
  by the time anyone is racing this, the migration has already
  completed on prod.

## Alternatives considered

- **Session-mode auth (`authenticateSession`) on org endpoints.**
  Rejected — api-key gate is the right default; session-mode via
  the BFF bridge can call the same endpoints once apps/web ships the
  UI. Half the consumers (MCP, programmatic Intelligence) want
  api-key access anyway.
- **Per-endpoint role-check helpers.** Considered, deferred — each
  endpoint's role check is one line (`role !== 'owner'`) and inlining
  keeps the auth flow visible at the call site. A
  `requireOwner(orgId, userId)` helper lands with full RBAC.
- **Promote/demote via PATCH /v1/orgs/:id/members/:userId.** Skipped
  for v1 — only owners exist functionally for now (the only role
  that gates writes). Re-adding a member with a different role is
  an explicit no-op today via `ON CONFLICT DO NOTHING`; the change-
  role op lands with full RBAC.
- **`DELETE /v1/orgs/:id` (delete the org entirely).** Deferred —
  cascade semantics for memberships + future per-org config tables
  (signal bundles, presets, peer graphs) need to be designed up
  front. Soft-delete vs hard-delete is also a Levers-wide decision.
- **Self-removal as a separate endpoint.** Rejected — the same
  DELETE handles "owner removes member" + "member removes
  themselves" with one extra clause. Less surface area.
