import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-234: list the orgs the signed-in user belongs to + their role
   in each. Mirrors the apps/api `/v1/orgs` read query (org_repository
   listForUser) but uses NextAuth session for auth instead of an API
   key, because the OrgSwitcher in the sidebar is a session surface,
   not an API surface.

   Schema (shared Neon DB):
     orgs (id, slug, name, display_name, brand_url, created_at, updated_at)
     org_members (org_id, user_id, role)

   role enum: "owner" | "admin" | "member" */

interface OrgWithRoleRow {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  brand_url: string | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "member";
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = (await sql`
      SELECT o.id, o.slug, o.name, o.display_name, o.brand_url,
             o.created_at, o.updated_at, m.role
        FROM orgs o
        JOIN org_members m ON m.org_id = o.id
       WHERE m.user_id = ${userId}
       ORDER BY o.created_at ASC
    `) as OrgWithRoleRow[];

    return NextResponse.json({ orgs: result });
  } catch {
    /* The orgs / org_members tables may not exist yet on a fresh DB
       (the schema is created lazily by apps/api on first write). Empty
       list is the right fallback for a user whose org hasn't been
       provisioned, which is the same behaviour as the api endpoint. */
    return NextResponse.json({ orgs: [] });
  }
}
