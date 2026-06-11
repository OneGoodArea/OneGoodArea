/* modules/orgs — Levers (AR-194): per-org tenancy CRUD.

   Endpoints in app.ts call into these functions. Each is split into a
   tight I/O layer + a pure helper where the input → SQL → row-shape logic
   is unit-testable without a live DB.

   Two callers of `createPersonalOrgForUser`:
     1. The Foundation migration backfill (AR-193, ADR 0027) — every
        existing user got a personal org via inline SQL during the
        `orgs_backfill` migration step.
     2. The /auth/register path (this commit) — every NEW user gets a
        personal org auto-created in the same transaction shape.

   See ADR 0028. */

import { generateId } from "../../infrastructure/utils/id";
import { OrgRepository } from "../../infrastructure/db/dal";
import type { OrgRow, OrgMemberRow } from "../../infrastructure/db/types";
import type { OrgRole } from "@onegoodarea/contracts";
import type {
  Org, OrgMember, OrgWithRole,
} from "@onegoodarea/contracts";

const repo = new OrgRepository();

/* ── RBAC (pure) — Levers AR-199 ─────────────────────────────────────── */

/** Roles in ascending privilege order. The numeric rank is what
    endpoints compare against. owner > admin > member.
    See ADR 0033 for the full operation-by-role matrix. */
export const ROLE_RANK: Record<OrgRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

/** PURE: does `actual` meet or exceed the required role rank?
    Used by every Levers endpoint that mutates org state. */
export function hasAtLeastRole(actual: OrgRole, required: OrgRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/* ── slug derivation (pure) ──────────────────────────────────────────── */

/** PURE: turn arbitrary text into a slug-safe form. Lowercases, replaces
    runs of non-alphanumeric with single dashes, trims leading/trailing
    dashes. Empty / all-symbol input returns "" (caller decides fallback). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** PURE: build a personal-org slug for a given user (matches the migration
    backfill formula in schema.ts so existing backfills and new signups
    produce the same shape). */
export function personalOrgSlug(email: string, userId: string): string {
  const local = slugify(email.split("@")[0] ?? "");
  const suffix = userId.slice(0, 12);
  return `${local}-${suffix}`;
}

/** PURE: derive an org id from a userId (matches the migration formula). */
export function personalOrgId(userId: string): string {
  return `org_${userId}`;
}

/* ── row → DTO shapers (pure) ────────────────────────────────────────── */

function orgFromRow(r: OrgRow): Org {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    display_name: r.display_name ?? null,
    brand_url: r.brand_url ?? null,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

function memberFromRow(r: OrgMemberRow): OrgMember {
  return {
    org_id: r.org_id,
    user_id: r.user_id,
    role: r.role,
    joined_at: String(r.joined_at),
  };
}

/* ── reads ───────────────────────────────────────────────────────────── */

/** List every org the caller belongs to, with their role in each.
    Empty array if not a member of anything (shouldn't happen post-
    backfill, but possible if a user was created in the gap before
    this commit lands). */
export async function listOrgsForUser(userId: string): Promise<OrgWithRole[]> {
  const result = await repo.listForUser(userId);
  return result.map((r) => ({ ...orgFromRow(r), role: r.role }));
}

/** Return the org if the caller is a member, otherwise null (the endpoint
    maps null to 404). */
export async function getOrgIfMember(orgId: string, userId: string): Promise<Org | null> {
  const r = await repo.findForMember(orgId, userId);
  if (!r) return null;
  return orgFromRow(r);
}

/** Resolve the caller's role in a given org (or null if not a member). */
export async function getRoleInOrg(orgId: string, userId: string): Promise<OrgRole | null> {
  return repo.getRoleInOrg(orgId, userId);
}

/** List all members of an org. Caller membership is checked at the
    endpoint layer; this function is pure data fetch. */
export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const result = await repo.listMembers(orgId);
  return result.map(memberFromRow);
}

/* ── writes ──────────────────────────────────────────────────────────── */

/** Create a new org with the caller as owner. Generates an id; uses the
    provided slug or derives one from the name. Returns the created org. */
export async function createOrgWithOwner(input: {
  name: string;
  slug?: string;
  userId: string;
}): Promise<Org> {
  const id = generateId("org");
  const derived = input.slug ?? slugify(input.name);
  const slug = derived || slugify(id); // fallback to id if name was all-symbol
  const insertedRow = await repo.createOrg(id, slug, input.name);
  await repo.addMember(id, input.userId, "owner");
  return orgFromRow(insertedRow);
}

/** Create the auto-personal org for a user. Idempotent via ON CONFLICT —
    safe to call twice (e.g. if the migration ran AND signup also calls
    it for the same user). Uses the SAME id + slug formula as the
    migration backfill so re-running matches. */
export async function createPersonalOrgForUser(userId: string, email: string): Promise<void> {
  const id = personalOrgId(userId);
  const slug = personalOrgSlug(email, userId);
  const localPart = email.split("@")[0] ?? "workspace";
  const name = `${localPart} workspace`;
  await repo.createPersonalOrg(id, slug, name, userId);
}

/** Rename / re-slug / re-brand an org. Owner+/admin+ check happens
    upstream (ADR 0033). Patch semantics:
      - field absent (undefined) -> keep current value
      - field set to a string   -> overwrite
      - display_name / brand_url set to null -> clear to NULL

    Read-modify-write pattern: fetch the current row, apply the patch in
    JS, write back. One extra SELECT per PATCH, but the alternative is
    8+ SQL branches across 4 fields × 2 states. Same pattern as
    updatePreset / updateCohort. */
export async function updateOrg(
  orgId: string,
  patch: {
    name?: string;
    slug?: string;
    display_name?: string | null;
    brand_url?: string | null;
  },
): Promise<Org | null> {
  const current = await repo.findById(orgId);
  if (!current) return null;
  const next = {
    name: patch.name ?? current.name,
    slug: patch.slug ?? current.slug,
    display_name: patch.display_name !== undefined ? patch.display_name : current.display_name,
    brand_url: patch.brand_url !== undefined ? patch.brand_url : current.brand_url,
  };
  const updated = await repo.update(orgId, next);
  if (!updated) return null;
  return orgFromRow(updated);
}

/** Add a user to an org with the given role. Owner-only mutation.
    Idempotent via ON CONFLICT — adding an existing member is a no-op
    (the role is NOT updated, to avoid accidental privilege escalation;
    a future `changeMemberRole` op covers that case explicitly). */
export async function addMember(input: { orgId: string; userId: string; role: OrgRole }): Promise<void> {
  await repo.addMember(input.orgId, input.userId, input.role);
}

/** Remove a member from an org. Owner-only mutation. The endpoint guards
    against removing the LAST OWNER (would orphan the org); this function
    trusts the caller did that check. Returns true if a row was deleted. */
export async function removeMember(orgId: string, userId: string): Promise<boolean> {
  return repo.removeMember(orgId, userId);
}

/** Count the owners of an org. Used by the endpoint to prevent removing
    the last owner. */
export async function countOwners(orgId: string): Promise<number> {
  return repo.countOwners(orgId);
}

/** Change a member's role (AR-273). Returns true if a row was updated.
    The endpoint layer handles RBAC + last-owner protection; this just
    flips the column. Idempotent — same role twice is a no-op that still
    returns true. */
export async function changeMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
): Promise<boolean> {
  return repo.updateMemberRole(orgId, userId, role);
}
