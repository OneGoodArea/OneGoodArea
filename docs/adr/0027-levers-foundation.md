# ADR 0027 — Levers Foundation: tenancy primitives + org-aware auth

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** Levers epic AR-192; this story AR-193;
  [[product-architecture-mental-model]] (Levers is a cross-cutting
  capability, NOT under any single product); MEMORY.md positioning v3
  ("fully configurable per client" is the half this epic delivers).

## Context

The signal-first restructure (commit `369c7b9`, PR #60) shipped 4
products + 6 Intelligence surfaces + 26 ADRs of methodology. But the
system is **single-tenant**: every API key is Pedro's, no org concept,
no per-client config, no Enterprise tier. Positioning v3 explicitly
names "configurable scoring" and "the typed AI query plane over
monthly area time-series" — the next half of "fully configurable per
client" is Levers.

This ADR is the first commit of the Levers epic. Eight subsequent
commits build on top of it (custom signal bundles, custom presets,
methodology pinning, per-org peer graphs, RBAC, white-label, IP
allowlist, wrap). Everything depends on the tenancy primitive landing
correctly here.

## Decision

### Schema

Two new tables + one column added to `api_keys`:

```sql
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX orgs_slug_idx ON orgs (slug);

CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX org_members_user_idx ON org_members (user_id);

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS org_id TEXT;  -- nullable in this phase
CREATE INDEX api_keys_org_idx ON api_keys (org_id);
```

All idempotent (`IF NOT EXISTS`). The `role` enum lives at the
application layer (the `OrgMemberRow` TS type narrows it to
`"owner" | "admin" | "member"`); a database CHECK constraint can land
later once we observe the role values stay stable in prod.

### Expand-contract migration

`api_keys.org_id` stays **nullable** in this commit. The follow-up that
adds `NOT NULL` lands only after every existing key has been backfilled
in prod AND a release has been observed without surprise failures.

### Backfill

The migration runs three DML statements after the DDL:

1. Personal org per user. `id = 'org_' || user_id` (PK uniqueness by
   construction). `slug = email-local-part + first-12-chars(user_id)`
   (long enough to avoid common collisions; target-free
   `ON CONFLICT DO NOTHING` catches any unique violation if the slug
   collides anyway). `name = email-local-part + ' workspace'`.
2. User as `owner` member of their personal org.
3. `UPDATE api_keys SET org_id = 'org_' || user_id WHERE org_id IS NULL`.

All three are idempotent: re-running is a no-op on already-backfilled
rows. Verified on prod: 22 users → 22 orgs (1:1) → 22 owner
memberships; 15/15 api_keys backfilled.

### Auth signature

`validateApiKey(key)` returns `{ userId: string; orgId: string | null } | null`
instead of `string | null`. The `orgId` is nullable for legacy keys not
yet backfilled (won't exist in prod after this migration, but the type
stays nullable so future-created keys via paths that don't set org_id
explicitly don't break the runtime).

Touches every call site of `validateApiKey`:
- `authenticate` helper in `app.ts` (still returns `userId` to its
  callers; resolves the org internally — surgical, no churn through
  10 endpoint handlers).
- 3 inline `validateApiKey` calls (in `/v1/me`, `/v1/report`,
  `/v1/batch`) — destructure `result.userId` from the new shape.
- 14 test files — `mockResolvedValue("user_1")` →
  `mockResolvedValue({ userId: "user_1", orgId: null })`.

### What this commit does NOT add (deferred to follow-up commits)

- Endpoints to CRUD orgs / members (next commit).
- Org-scoped quotas in billing.
- Custom signal bundles / scoring presets / methodology pinning / per-org
  peer graphs / RBAC / white-label / IP allowlist (subsequent commits
  in the epic).
- `NOT NULL` constraint on `api_keys.org_id` (after observation period).
- Signup-flow auto-create of personal org for new users (next commit;
  the migration handles existing users only).
- Org-aware return values from `authenticate` / `requireApiAccess`
  helpers — they still return `userId` for now. Org-aware helpers
  (`authenticateWithOrg`) land when a real consumer wants org context.

## Consequences

**Positive**

- The system is now **multi-tenant by construction.** Every existing
  user has a personal org; every existing api_key knows which org it
  belongs to. New tables for future Levers commits can FK to orgs.id
  cleanly.
- `validateApiKey` returns org context for free — endpoints that opt
  into Levers features (custom bundles, peer-scoped graphs) just
  destructure `orgId` from the result.
- Foundation is dark-flagged by being **inert**: nothing in this commit
  changes endpoint behavior for existing keys (they validate, they get
  a `userId`, the org_id is fetched but unused). Risk surface at this
  layer is bounded to the migration itself.
- Expand-contract migration keeps it zero-downtime: nullable column +
  backfill, deferred NOT NULL constraint. Legacy `aiq_` keys (pre-AR-127
  prefix migration) keep validating because `validateApiKey` is a pure
  hash lookup — the new shape just adds an extra column to the SELECT.

**Negative / accepted**

- The `validateApiKey` signature change is a **type-level breaking
  change** for callers. Mitigated by `authenticate` / `requireApiAccess`
  staying the same shape (returning `userId`) — only 3 inline call
  sites in `app.ts` had to update destructuring, and every test mock
  had to update its return value. No external API contract change.
- The `slug` is opinionated (email-local-part + user_id prefix). Users
  can't edit it yet; an org-CRUD endpoint will let owners rename. Good
  enough for v1; the auto-generated slug is fine for billing/auth and
  invisible to most users.
- 22 personal orgs on prod is **noise** — most users don't need an
  org concept. But it's the simplest invariant ("every user belongs to
  at least one org") and avoids special-casing solo users in every
  query downstream.
- `org_members.role` is a TEXT column without a CHECK constraint;
  application enforces the enum. CHECK lands when RBAC is implemented
  (later Levers commit) so we can pick the constraint shape with the
  RBAC logic in front of us.
- Test mock churn — 14 test files updated by bulk sed. Reviewable +
  symmetric.

## Alternatives considered

- **Foreign keys on org_members → orgs / users.** Rejected for v1:
  this codebase has no FKs anywhere (decision earlier in the
  restructure). Application-layer enforces relational integrity;
  same pattern as portfolios / signal_values / peer_assignments.
- **Cascade delete of org on user delete.** Deferred to the
  account-deletion commit — needs careful thought about org members
  who aren't the owner.
- **One org per email domain instead of per user.** Rejected — too
  opinionated for backfill; users in the same domain might
  legitimately be separate orgs (consulting agencies, etc.). Better:
  let users invite each other into orgs explicitly (next commit).
- **`validateApiKey` returns just `userId` + a separate
  `lookupOrgId(userId)` call.** Rejected — adds a round-trip per
  request when the join is free (org_id is right there on the
  api_keys row).
- **Run the backfill as a separate one-off script.** Rejected — making
  it part of the idempotent migration registry means it runs on
  every fresh DB, every CI test DB, every developer's local clone.
  No "did you remember to run the backfill?" trap.
- **Stricter slug uniqueness via longer user_id prefix or hash.**
  Rejected — 12 chars of user_id is already 36 bits of entropy on top
  of the email local part; bumping further is diminishing returns.
  Target-free `ON CONFLICT DO NOTHING` handles the long-tail
  collision case cleanly.

## Proven on prod

The migration ran against prod Neon (idempotent, re-runnable):
- 22 users → 22 orgs created.
- 22 org_members rows with role='owner'.
- 15 api_keys updated, all with non-null `org_id`.
- Sample orgs verify the slug + name format:
  `org_user_..._iu6q / cara-robinson0903-user_1773084 / cara.robinson0903 workspace`.

The standard `oga_` fingerprint probe against the live Render API still
returns the expected 401 (the validateApiKey path runs and finds no
match for a non-key request); behavior unchanged for existing callers.
