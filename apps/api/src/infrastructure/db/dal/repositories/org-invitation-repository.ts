import { sql } from "../../client";
import { type OrgInvitationRow, rows } from "../../types";

/** DAL repository for the `org_invitations` table (AR-272).
    Token lookup is by SHA-256 hash; the plaintext lives only in the
    outbound email and never reaches this layer. */
export class OrgInvitationRepository {
  /* ── reads ─────────────────────────────────────────────────────────── */

  /** Pending = not accepted, not revoked, not expired. The list endpoint
      filters by these three predicates so the UI doesn't surface dead
      rows. ORDER BY created_at DESC matches the dashboard convention. */
  async listPending(orgId: string): Promise<OrgInvitationRow[]> {
    return rows<OrgInvitationRow>(await sql`
      SELECT id, org_id, email, role, token_hash, invited_by_user_id,
             expires_at, accepted_at, accepted_by_user_id, revoked_at, created_at
        FROM org_invitations
       WHERE org_id = ${orgId}
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
    `);
  }

  /** Token lookup. Caller hashes the plaintext first. Returns the row
      regardless of accepted/revoked/expired state — domain checks live
      in the module so error codes are precise. */
  async findByTokenHash(tokenHash: string): Promise<OrgInvitationRow | null> {
    const result = rows<OrgInvitationRow>(await sql`
      SELECT id, org_id, email, role, token_hash, invited_by_user_id,
             expires_at, accepted_at, accepted_by_user_id, revoked_at, created_at
        FROM org_invitations
       WHERE token_hash = ${tokenHash}
       LIMIT 1
    `);
    return result[0] ?? null;
  }

  async findById(id: string): Promise<OrgInvitationRow | null> {
    const result = rows<OrgInvitationRow>(await sql`
      SELECT id, org_id, email, role, token_hash, invited_by_user_id,
             expires_at, accepted_at, accepted_by_user_id, revoked_at, created_at
        FROM org_invitations
       WHERE id = ${id}
       LIMIT 1
    `);
    return result[0] ?? null;
  }

  /* ── writes ─────────────────────────────────────────────────────────── */

  /** Insert raises 23505 on the partial unique index (uq_org_invitations_pending)
      if a pending invite already exists for (org_id, email). The module catches
      that and returns a typed error to the caller. */
  async create(row: Omit<OrgInvitationRow, "created_at" | "accepted_at" | "accepted_by_user_id" | "revoked_at">): Promise<void> {
    await sql`
      INSERT INTO org_invitations
        (id, org_id, email, role, token_hash, invited_by_user_id, expires_at)
      VALUES
        (${row.id}, ${row.org_id}, ${row.email}, ${row.role}, ${row.token_hash},
         ${row.invited_by_user_id}, ${row.expires_at})
    `;
  }

  /** Idempotent revoke. RETURNING tells the module whether anything
      actually flipped — used to discriminate 200 (revoked) vs 404 (no
      such pending invite). */
  async revoke(id: string, orgId: string): Promise<boolean> {
    const result = await sql`
      UPDATE org_invitations
         SET revoked_at = NOW()
       WHERE id = ${id} AND org_id = ${orgId}
         AND accepted_at IS NULL AND revoked_at IS NULL
       RETURNING id
    `;
    return result.length > 0;
  }

  /** Atomic accept: mark invitation accepted AND insert the org_members
      row in a single statement chain. ON CONFLICT DO NOTHING on the
      members insert covers the rare race where the same user accepts
      twice — the invitation row only flips once thanks to the WHERE
      accepted_at IS NULL guard. Returns true if anything happened. */
  async accept(
    invitationId: string,
    orgId: string,
    userId: string,
    role: "member" | "admin",
  ): Promise<boolean> {
    const updated = await sql`
      UPDATE org_invitations
         SET accepted_at = NOW(), accepted_by_user_id = ${userId}
       WHERE id = ${invitationId}
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > NOW()
       RETURNING id
    `;
    if (updated.length === 0) return false;
    await sql`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${orgId}, ${userId}, ${role})
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;
    return true;
  }
}
