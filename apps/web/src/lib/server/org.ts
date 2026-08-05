import { callApi } from "./api-client";

/**
 * Resolve the signed-in user's primary org ID via the API's /me/org endpoint
 * (owner-first, then oldest org_members row).
 *
 * AR-646: web no longer talks to the DB directly — this proxies through
 * apps/api (single indexed lookup on the API side), replacing the old direct
 * `sql` against org_members.
 */
export async function resolveOrgId(userId: string): Promise<string | null> {
  const res = await callApi<{ org: { id: string } | null }>("/me/org", { userId });
  if (!res.ok || !res.data?.org) return null;
  return res.data.org.id ?? null;
}
