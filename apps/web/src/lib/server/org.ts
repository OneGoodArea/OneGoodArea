import { sql } from "@/lib/db";

/**
 * Resolve the signed-in user's primary org ID via a single indexed lookup.
 * Owner-first, then oldest org_members row.
 *
 * This is the ONLY DB query that stays in the web container after Phase 1C
 * — needed to bridge the URL mismatch between web's /api/me/org/* (implicit
 * org) and API's /v1/orgs/:id/* (explicit org) endpoints.
 */
export async function resolveOrgId(userId: string): Promise<string | null> {
  const result = (await sql`
    SELECT org_id FROM org_members
    WHERE user_id = ${userId}
    ORDER BY (role = 'owner') DESC, joined_at ASC
    LIMIT 1
  `) as Array<{ org_id: string }>;
  return result[0]?.org_id ?? null;
}
