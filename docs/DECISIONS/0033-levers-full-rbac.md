# ADR 0033 — Levers: full RBAC (admin role honored)

- **Status:** Accepted
- **Date:** 2026-05-28
- **Context refs:** Levers epic AR-192; this story AR-199; depends on
  [[adr-0027-levers-foundation]] (the `org_members.role` column +
  the `OrgRole` enum) and every Levers commit since (each shipped
  owner-only mutations as the placeholder until full RBAC landed).

## Context

`org_members.role` has been `owner | admin | member` since ADR 0027.
Every Levers endpoint since has inline-checked `role !== "owner"`,
which means `admin` and `member` were functionally identical — both
denied. The role existed in the contract but had no behavior
attached.

This commit honors `admin` as a real, owner-distinct mutator. The
goal is an enterprise-ready three-tier shape:

- **member** — read-only.
- **admin** — daily Levers operator (bundles / presets / cohorts /
  member-CRUD-for-non-owners / org-rename).
- **owner** — chain-of-authority moves (methodology pin, granting
  ownership, removing owners, future org-delete).

## Decision

### Pure helper in `modules/orgs/index.ts`

```ts
export const ROLE_RANK: Record<OrgRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};
export function hasAtLeastRole(actual: OrgRole, required: OrgRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
```

Every endpoint that mutates calls `hasAtLeastRole(role, "admin")`
(daily Levers) or `hasAtLeastRole(role, "owner")` (compliance-grade
or chain-of-authority). The numeric rank is what allows future roles
(e.g. `viewer` below `member`, or `auditor` between) to slot in
without rewriting every endpoint.

### Role matrix (this commit)

| Operation                                              | member | admin | owner |
|--------------------------------------------------------|:------:|:-----:|:-----:|
| GET `/v1/orgs`, `/v1/orgs/:id`                         | ✅     | ✅    | ✅    |
| GET `/v1/orgs/:id/members`                             | ✅     | ✅    | ✅    |
| GET `/v1/orgs/:id/bundles` + variants                  | ✅     | ✅    | ✅    |
| GET `/v1/orgs/:id/presets` + variants                  | ✅     | ✅    | ✅    |
| GET `/v1/orgs/:id/cohorts` + variants                  | ✅     | ✅    | ✅    |
| GET `/v1/orgs/:id/methodology`                         | ✅     | ✅    | ✅    |
| PATCH `/v1/orgs/:id` (rename / re-slug)                | ❌     | ✅    | ✅    |
| POST `/v1/orgs/:id/members` (add)                      | ❌     | ✅¹   | ✅    |
| DELETE `/v1/orgs/:id/members/:userId` (non-owner)      | ❌²    | ✅    | ✅    |
| DELETE `/v1/orgs/:id/members/:userId` (owner-role)     | ❌     | ❌³   | ✅⁴   |
| POST/PATCH/DELETE `/v1/orgs/:id/bundles`               | ❌     | ✅    | ✅    |
| POST/PATCH/DELETE `/v1/orgs/:id/presets`               | ❌     | ✅    | ✅    |
| POST/PATCH/DELETE `/v1/orgs/:id/cohorts`               | ❌     | ✅    | ✅    |
| PUT/DELETE `/v1/orgs/:id/methodology`                  | ❌     | ❌    | ✅    |

¹ admin can add `admin` or `member`. Adding an `owner` → 403 `cannot_grant_owner`.
² Self-removal is allowed for any role (still subject to last-owner guard).
³ admin trying to remove an owner-role member → 403 `cannot_remove_owner_as_admin`.
⁴ Owner removing an owner still triggers the last-owner guard (409 if the target is the LAST owner).

### Owner-only kept on methodology

The methodology pin is a regulator-facing audit anchor. We deliberately
keep it owner-only — the cost of a misclick by an admin (regulated
buyer's pipeline silently re-stamping with the latest version) is
high. An owner moving the pin is an event with weight; an admin
flipping it is a daily-config move that doesn't fit the role
semantics here. Compliance teams asked for this shape explicitly.

### Last-owner guard preserved

A self-removing owner whose org has no other owner still 409s.
Otherwise an owner could orphan their own org. The guard was there
before this commit; it still is.

### Self-removal is open

Any role can remove themselves. The org's owner protections cover
the orphan case; nothing else is at stake when a member voluntarily
leaves.

### Error codes

Three new typed error codes that consumers can program against:

- `admin_required` — operation requires admin+.
- `owner_required` — operation requires owner.
- `cannot_grant_owner` — admin tried to add an owner-role member.
- `cannot_remove_owner_as_admin` — admin tried to remove an
  owner-role member.

## Consequences

**Positive**

- **Enterprise three-tier role model is real.** Customers can
  delegate Levers operations to an admin without giving them
  audit-anchor-grade powers.
- **One central definition** of role rank. New endpoints just call
  `hasAtLeastRole(role, "admin")` or `..., "owner")` — no role
  ladder lives in any handler.
- **Typed error codes** make 403 reasons actionable for clients.
- **Compliance posture preserved** on methodology and ownership
  grants — admins can run the daily knobs but can't touch the
  three things compliance cares about most.
- **Backwards compatible** for owner callers — owners can still do
  everything they could before. The behavior change is purely a
  loosening for `admin`-role callers (who previously got 403 on
  every mutation).
- **Test coverage:** 4 new unit tests on `hasAtLeastRole` +
  `ROLE_RANK` ordering pin.

**Negative / accepted**

- No PATCH on member role yet (`/v1/orgs/:id/members/:userId` PATCH
  for promotion / demotion). Today the workflow is `DELETE` + re-add
  with the new role; ugly but explicit. Promotion-to-owner stays a
  chain-of-authority move (only an owner can do it via re-add)
  which is correct. A change-role endpoint is a wrap-commit candidate.
- No DELETE org endpoint. Cascade semantics (members? bundles?
  presets? cohorts? methodology_pin?) need a deliberate decision and
  this commit isn't the place. Deferred to the wrap commit.
- No audit/log trail for "admin made this change vs owner". The
  existing `trackEvent` payloads include `userId`; the role at-time-
  of-action could be added but isn't today.
- The role-rank approach makes adding a `viewer` (below member) or
  `auditor` (between member and admin) trivial — but designing those
  roles is a separate exercise. Not done here.
- Inline checks in 11 endpoints — could be a Fastify pre-handler
  decorator (`fastify.addHook("preHandler", ...)`) keyed by route
  prefix. Cleaner long term; for this commit explicit inline calls
  keep the role policy visible at the call site (which is what
  reviewers actually look at).

## Alternatives considered

- **Boolean flags per operation** (`can_edit_bundles`, `can_edit_methodology`).
  Rejected — explodes the data model, no ergonomic story for new
  endpoints, no natural "admin > member" partial-order.
- **`role IN ('owner','admin')`** instead of a rank check. Works
  but reads as a magic-string set every time; the helper is a thin
  wrapper but makes future role additions (viewer, auditor) one-line
  changes.
- **A separate `org_role_grants` table** that maps an operation key
  to required role. Over-engineered for v1; the operation set is small
  enough that inline checks at each endpoint stay readable. A
  configuration layer is a wrap commit at most.
- **Make admin able to set methodology pin too.** Rejected after
  considering it. The pin is an externally-visible audit anchor; the
  cost of a wrong move by an admin is higher than the cost of forcing
  an owner click. If a customer wants admin-level pin control, they
  can promote the user to owner — pin is the one place where role
  granularity is intentional.
