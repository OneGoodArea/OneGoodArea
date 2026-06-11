import { NextResponse, type NextRequest } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sendOrgInvitationEmail } from "@/lib/email";

/* AR-272: list pending + create for the signed-in user's primary org.
   Org resolution matches the other AR-262/AR-263 BFFs: owner-first,
   then oldest org_members row. Mutations require admin or owner role.

   Tokens are SHA-256 hashed at rest. Plaintext only in the outbound
   email URL. 7-day expiry. The partial-unique-pending index in
   schema.ts (uq_org_invitations_pending) is the source of truth on
   "is there already an open invite for this email" — we just translate
   the 23505 collision to a 409. */

const CreateBodySchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(["member", "admin"]).default("member"),
}).strict();

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function resolveOrgId(userId: string): Promise<string | null> {
  const memberships = (await sql`
    SELECT org_id
      FROM org_members
     WHERE user_id = ${userId}
     ORDER BY (role = 'owner') DESC, joined_at ASC
     LIMIT 1
  `) as Array<{ org_id: string }>;
  return memberships[0]?.org_id ?? null;
}

async function getRoleInOrg(orgId: string, userId: string): Promise<string | null> {
  const result = (await sql`
    SELECT role FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId} LIMIT 1
  `) as Array<{ role: string }>;
  return result[0]?.role ?? null;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const orgId = await resolveOrgId(userId);
    if (!orgId) return NextResponse.json({ invitations: [], org_id: null });

    const invitations = (await sql`
      SELECT id, org_id, email, role, invited_by_user_id, expires_at, created_at
        FROM org_invitations
       WHERE org_id = ${orgId}
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
    `) as Array<{
      id: string;
      org_id: string;
      email: string;
      role: "member" | "admin";
      invited_by_user_id: string;
      expires_at: string;
      created_at: string;
    }>;
    return NextResponse.json({ invitations, org_id: orgId });
  } catch {
    /* Table may not exist on a fresh DB. Empty list is the safe fallback. */
    return NextResponse.json({ invitations: [], org_id: null });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const orgId = await resolveOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 404 });

  const role = await getRoleInOrg(orgId, userId);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  /* Reject if the email matches an existing user already in the org. */
  const existing = (await sql`
    SELECT m.user_id
      FROM org_members m
      JOIN users u ON u.id = m.user_id
     WHERE m.org_id = ${orgId} AND LOWER(u.email) = ${email}
     LIMIT 1
  `) as Array<{ user_id: string }>;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "User already a member", code: "user_already_member" },
      { status: 409 },
    );
  }

  /* Fetch org name for the email. */
  const orgRows = (await sql`
    SELECT name, display_name FROM orgs WHERE id = ${orgId} LIMIT 1
  `) as Array<{ name: string; display_name: string | null }>;
  const orgName = orgRows[0]?.display_name ?? orgRows[0]?.name ?? "Your org";

  const id = `inv_${randomBytes(12).toString("hex")}`;
  const plaintextToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(plaintextToken).digest("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();

  try {
    await sql`
      INSERT INTO org_invitations
        (id, org_id, email, role, token_hash, invited_by_user_id, expires_at)
      VALUES
        (${id}, ${orgId}, ${email}, ${parsed.data.role}, ${tokenHash}, ${userId}, ${expiresAt})
    `;
  } catch (err) {
    /* 23505 = unique_violation. Only the partial-pending index can fire
       here, so the meaning is unambiguous: open invite already exists. */
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "Invitation already pending", code: "invitation_already_pending" },
        { status: 409 },
      );
    }
    throw err;
  }

  await sendOrgInvitationEmail({
    to: email,
    token: plaintextToken,
    orgName,
    role: parsed.data.role,
  });

  return NextResponse.json(
    {
      invitation: {
        id,
        org_id: orgId,
        email,
        role: parsed.data.role,
        invited_by_user_id: userId,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
