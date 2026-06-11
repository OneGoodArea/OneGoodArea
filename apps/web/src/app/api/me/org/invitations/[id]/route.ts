import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-272: revoke a pending invitation for the caller's primary org.
   Idempotent — already-revoked/already-accepted/non-existent rows all
   return 404 (the row matched no pending invite, the resolution is
   the same: there's nothing to do). Admin or owner required. */

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: invitationId } = await params;

  const memberships = (await sql`
    SELECT org_id, role
      FROM org_members
     WHERE user_id = ${userId}
     ORDER BY (role = 'owner') DESC, joined_at ASC
     LIMIT 1
  `) as Array<{ org_id: string; role: string }>;
  const membership = memberships[0];
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  const result = await sql`
    UPDATE org_invitations
       SET revoked_at = NOW()
     WHERE id = ${invitationId}
       AND org_id = ${membership.org_id}
       AND accepted_at IS NULL
       AND revoked_at IS NULL
     RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json(
      { error: "Invitation not found or already resolved" },
      { status: 404 },
    );
  }
  return NextResponse.json({ revoked: true });
}
