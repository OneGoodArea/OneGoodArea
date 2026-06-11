import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-273: list members of the signed-in user's primary org. Joins
   users for the display name + email so the dashboard doesn't need
   a second round-trip. Org resolution matches the other AR-262/263/272
   BFFs: owner-first, then oldest org_members row. */

interface MemberRow {
  user_id: string;
  email: string;
  name: string | null;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const memberships = (await sql`
      SELECT org_id, role
        FROM org_members
       WHERE user_id = ${userId}
       ORDER BY (role = 'owner') DESC, joined_at ASC
       LIMIT 1
    `) as Array<{ org_id: string; role: string }>;
    const orgId = memberships[0]?.org_id;
    if (!orgId) {
      return NextResponse.json({ members: [], org_id: null, caller_role: null });
    }

    const members = (await sql`
      SELECT m.user_id, u.email, u.name, m.role, m.joined_at
        FROM org_members m
        JOIN users u ON u.id = m.user_id
       WHERE m.org_id = ${orgId}
       ORDER BY
         CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         m.joined_at ASC
    `) as MemberRow[];

    return NextResponse.json({
      members,
      org_id: orgId,
      caller_role: memberships[0].role,
    });
  } catch {
    return NextResponse.json({ members: [], org_id: null, caller_role: null });
  }
}
