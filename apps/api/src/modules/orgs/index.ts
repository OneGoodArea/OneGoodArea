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

import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import type { OrgRow, OrgMemberRow } from "../../infrastructure/db/types";
import { rows } from "../../infrastructure/db/types";
import type {
  Org, OrgMember, OrgWithRole, OrgRole,
} from "@onegoodarea/contracts";

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
  const result = rows<OrgRow & { role: OrgRole }>(await sql`
    SELECT o.id, o.slug, o.name, o.created_at, o.updated_at, m.role
      FROM orgs o
      JOIN org_members m ON m.org_id = o.id
     WHERE m.user_id = ${userId}
     ORDER BY o.created_at ASC
  `);
  return result.map((r) => ({ ...orgFromRow(r), role: r.role }));
}

/** Return the org if the caller is a member, otherwise null (the endpoint
    maps null to 404). */
export async function getOrgIfMember(orgId: string, userId: string): Promise<Org | null> {
  const result = rows<OrgRow>(await sql`
    SELECT o.id, o.slug, o.name, o.created_at, o.updated_at
      FROM orgs o
      JOIN org_members m ON m.org_id = o.id
     WHERE o.id = ${orgId} AND m.user_id = ${userId}
     LIMIT 1
  `);
  if (result.length === 0) return null;
  return orgFromRow(result[0]);
}

/** Resolve the caller's role in a given org (or null if not a member). */
export async function getRoleInOrg(orgId: string, userId: string): Promise<OrgRole | null> {
  const result = rows<Pick<OrgMemberRow, "role">>(await sql`
    SELECT role FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId} LIMIT 1
  `);
  return result.length === 0 ? null : result[0].role;
}

/** List all members of an org. Caller membership is checked at the
    endpoint layer; this function is pure data fetch. */
export async function listMembers(orgId: string): Promise<OrgMember[]> {
  const result = rows<OrgMemberRow>(await sql`
    SELECT org_id, user_id, role, joined_at
      FROM org_members
     WHERE org_id = ${orgId}
     ORDER BY joined_at ASC
  `);
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
  const insertResult = rows<OrgRow>(await sql`
    INSERT INTO orgs (id, slug, name)
    VALUES (${id}, ${slug}, ${input.name})
    RETURNING id, slug, name, created_at, updated_at
  `);
  if (insertResult.length === 0) throw new Error("orgs insert returned no row");
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${id}, ${input.userId}, 'owner')
  `;
  return orgFromRow(insertResult[0]);
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
  await sql`
    INSERT INTO orgs (id, slug, name)
    VALUES (${id}, ${slug}, ${name})
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${id}, ${userId}, 'owner')
    ON CONFLICT (org_id, user_id) DO NOTHING
  `;
}

/** Rename / re-slug an org. Owner-only — caller must be checked upstream.
    Returns the updated org or null if not found. */
export async function updateOrg(orgId: string, patch: { name?: string; slug?: string }): Promise<Org | null> {
  // Three cases: name only, slug only, both. updated_at always bumps.
  // The Neon tagged template wants typed binds so we branch explicitly
  // instead of composing dynamic SQL.
  let result: OrgRow[] = [];
  if (patch.name !== undefined && patch.slug !== undefined) {
    result = rows<OrgRow>(await sql`
      UPDATE orgs SET name = ${patch.name}, slug = ${patch.slug}, updated_at = NOW()
       WHERE id = ${orgId}
       RETURNING id, slug, name, created_at, updated_at
    `);
  } else if (patch.name !== undefined) {
    result = rows<OrgRow>(await sql`
      UPDATE orgs SET name = ${patch.name}, updated_at = NOW()
       WHERE id = ${orgId}
       RETURNING id, slug, name, created_at, updated_at
    `);
  } else if (patch.slug !== undefined) {
    result = rows<OrgRow>(await sql`
      UPDATE orgs SET slug = ${patch.slug}, updated_at = NOW()
       WHERE id = ${orgId}
       RETURNING id, slug, name, created_at, updated_at
    `);
  } else {
    // Zod refines this away; defensive no-op.
    return null;
  }
  if (result.length === 0) return null;
  return orgFromRow(result[0]);
}

/** Add a user to an org with the given role. Owner-only mutation.
    Idempotent via ON CONFLICT — adding an existing member is a no-op
    (the role is NOT updated, to avoid accidental privilege escalation;
    a future `changeMemberRole` op covers that case explicitly). */
export async function addMember(input: { orgId: string; userId: string; role: OrgRole }): Promise<void> {
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${input.orgId}, ${input.userId}, ${input.role})
    ON CONFLICT (org_id, user_id) DO NOTHING
  `;
}

/** Remove a member from an org. Owner-only mutation. The endpoint guards
    against removing the LAST OWNER (would orphan the org); this function
    trusts the caller did that check. Returns true if a row was deleted. */
export async function removeMember(orgId: string, userId: string): Promise<boolean> {
  const deleted = await sql`
    DELETE FROM org_members
     WHERE org_id = ${orgId} AND user_id = ${userId}
     RETURNING user_id
  `;
  return deleted.length > 0;
}

/** Count the owners of an org. Used by the endpoint to prevent removing
    the last owner. */
export async function countOwners(orgId: string): Promise<number> {
  const result = rows<{ n: number }>(await sql`
    SELECT COUNT(*)::int AS n FROM org_members
     WHERE org_id = ${orgId} AND role = 'owner'
  `);
  return result.length === 0 ? 0 : (result[0].n ?? 0);
}
