import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-272: accept-invitation BFF used by /accept-invite. Hashes the
   plaintext token, looks up the row, validates state + email match,
   then runs the atomic accept (UPDATE invitation SET accepted_at +
   INSERT org_members) in two statements with the accept guarded by
   accepted_at IS NULL to make it safe under concurrency.

   Error codes match the apps/api endpoint so the UI can branch on
   the same vocabulary either way. */

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const rows = (await sql`
    SELECT id, org_id, email, role, expires_at, accepted_at, revoked_at
      FROM org_invitations
     WHERE token_hash = ${tokenHash}
     LIMIT 1
  `) as Array<{
    id: string;
    org_id: string;
    email: string;
    role: "member" | "admin";
    expires_at: string;
    accepted_at: string | null;
    revoked_at: string | null;
  }>;
  const row = rows[0];
  if (!row) {
    return NextResponse.json(
      { error: "invitation_not_found", code: "invitation_not_found" },
      { status: 404 },
    );
  }
  if (row.revoked_at) {
    return NextResponse.json(
      { error: "invitation_revoked", code: "invitation_revoked" },
      { status: 410 },
    );
  }
  if (row.accepted_at) {
    return NextResponse.json(
      { error: "invitation_already_accepted", code: "invitation_already_accepted" },
      { status: 410 },
    );
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "invitation_expired", code: "invitation_expired" },
      { status: 410 },
    );
  }
  if (row.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "email_mismatch", code: "email_mismatch" },
      { status: 403 },
    );
  }

  /* Atomic-ish: the WHERE accepted_at IS NULL guard makes the UPDATE
     safe under concurrent accepts. Whichever request lands first wins;
     the loser sees zero rows updated and falls through to the
     already_accepted branch. */
  const accepted = await sql`
    UPDATE org_invitations
       SET accepted_at = NOW(), accepted_by_user_id = ${userId}
     WHERE id = ${row.id}
       AND accepted_at IS NULL
       AND revoked_at IS NULL
       AND expires_at > NOW()
     RETURNING id
  `;
  if (accepted.length === 0) {
    return NextResponse.json(
      { error: "invitation_already_accepted", code: "invitation_already_accepted" },
      { status: 410 },
    );
  }
  await sql`
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (${row.org_id}, ${userId}, ${row.role})
    ON CONFLICT (org_id, user_id) DO NOTHING
  `;

  const orgRows = (await sql`
    SELECT id, slug, name, display_name FROM orgs WHERE id = ${row.org_id} LIMIT 1
  `) as Array<{ id: string; slug: string; name: string; display_name: string | null }>;
  const org = orgRows[0];
  return NextResponse.json({
    org_id: row.org_id,
    org_slug: org?.slug ?? "",
    org_name: org?.display_name ?? org?.name ?? "",
    role: row.role,
  });
}
