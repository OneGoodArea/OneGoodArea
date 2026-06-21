import { sql } from "../../client";
import { type OrgRow, type OrgMemberRow, rows } from "../../types";
import type { OrgRole } from "@onegoodarea/contracts";

/** DAL repository for the `orgs` and `org_members` tables. */
export class OrgRepository {
  /* ── reads ─────────────────────────────────────────────────────────── */

  async listForUser(userId: string): Promise<(OrgRow & { role: OrgRole })[]> {
    return rows<OrgRow & { role: OrgRole }>(await sql`
      SELECT o.id, o.slug, o.name, o.display_name, o.brand_url, o.logo_url, o.created_at, o.updated_at, m.role
        FROM orgs o
        JOIN org_members m ON m.org_id = o.id
       WHERE m.user_id = ${userId}
       ORDER BY o.created_at ASC
    `);
  }

  async findForMember(orgId: string, userId: string): Promise<OrgRow | null> {
    const result = rows<OrgRow>(await sql`
      SELECT o.id, o.slug, o.name, o.display_name, o.brand_url, o.logo_url, o.created_at, o.updated_at
        FROM orgs o
        JOIN org_members m ON m.org_id = o.id
       WHERE o.id = ${orgId} AND m.user_id = ${userId}
       LIMIT 1
    `);
    return result[0] ?? null;
  }

  async getRoleInOrg(orgId: string, userId: string): Promise<OrgRole | null> {
    const result = rows<Pick<OrgMemberRow, "role">>(await sql`
      SELECT role FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId} LIMIT 1
    `);
    return result.length === 0 ? null : result[0].role;
  }

  async listMembers(orgId: string): Promise<OrgMemberRow[]> {
    /* AR-310: LEFT JOIN users so the dashboard members page can render
       name + email without an N+1. LEFT (not INNER) keeps the row visible
       if the user record was deleted but the org_members FK stub remains. */
    return rows<OrgMemberRow>(await sql`
      SELECT om.org_id, om.user_id, om.role, om.joined_at,
             u.email, u.name
        FROM org_members om
   LEFT JOIN users u ON u.id = om.user_id
       WHERE om.org_id = ${orgId}
       ORDER BY om.joined_at ASC
    `);
  }

  async findById(orgId: string): Promise<OrgRow | null> {
    const result = rows<OrgRow>(await sql`
      SELECT id, slug, name, display_name, brand_url, logo_url, created_at, updated_at
        FROM orgs
       WHERE id = ${orgId}
       LIMIT 1
    `);
    return result[0] ?? null;
  }

  /* ── writes ─────────────────────────────────────────────────────────── */

  async createOrg(id: string, slug: string, name: string): Promise<OrgRow> {
    const result = rows<OrgRow>(await sql`
      INSERT INTO orgs (id, slug, name)
      VALUES (${id}, ${slug}, ${name})
      RETURNING id, slug, name, display_name, brand_url, logo_url, created_at, updated_at
    `);
    if (result.length === 0) throw new Error("orgs insert returned no row");
    return result[0];
  }

  async addMember(orgId: string, userId: string, role: OrgRole): Promise<void> {
    await sql`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${orgId}, ${userId}, ${role})
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;
  }

  /** Idempotent personal-org creation. Uses ON CONFLICT DO NOTHING so it is
   *  safe to call twice (migration backfill + signup). */
  async createPersonalOrg(
    id: string,
    slug: string,
    name: string,
    userId: string,
  ): Promise<void> {
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

  async update(
    orgId: string,
    fields: {
      name: string;
      slug: string;
      display_name: string | null;
      brand_url: string | null;
      logo_url: string | null;
    },
  ): Promise<OrgRow | null> {
    const result = rows<OrgRow>(await sql`
      UPDATE orgs
         SET name = ${fields.name},
             slug = ${fields.slug},
             display_name = ${fields.display_name},
             brand_url = ${fields.brand_url},
             logo_url = ${fields.logo_url},
             updated_at = NOW()
       WHERE id = ${orgId}
       RETURNING id, slug, name, display_name, brand_url, logo_url, created_at, updated_at
    `);
    return result[0] ?? null;
  }

  async removeMember(orgId: string, userId: string): Promise<boolean> {
    const deleted = await sql`
      DELETE FROM org_members
       WHERE org_id = ${orgId} AND user_id = ${userId}
       RETURNING user_id
    `;
    return deleted.length > 0;
  }

  async countOwners(orgId: string): Promise<number> {
    const result = rows<{ n: number }>(await sql`
      SELECT COUNT(*)::int AS n FROM org_members
       WHERE org_id = ${orgId} AND role = 'owner'
    `);
    return result[0]?.n ?? 0;
  }

  /** AR-273: change a member's role. RETURNING tells the module whether
      a row actually matched — used by the endpoint to differentiate 200
      vs 404. */
  async updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<boolean> {
    const result = await sql`
      UPDATE org_members
         SET role = ${role}
       WHERE org_id = ${orgId} AND user_id = ${userId}
       RETURNING user_id
    `;
    return result.length > 0;
  }
}
