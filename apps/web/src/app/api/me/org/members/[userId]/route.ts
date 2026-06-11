import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-273: change role + remove member for the signed-in user's
   primary org. Direct-DB pattern; RBAC + last-owner protection
   mirrors the apps/api endpoint exactly so both surfaces enforce
   the same invariants. */

const PatchBodySchema = z.object({
  role: z.enum(["owner", "admin", "member"]),
}).strict();

type Role = "owner" | "admin" | "member";

async function resolveOrgContext(userId: string): Promise<
  | { orgId: string; role: Role }
  | null
> {
  const memberships = (await sql`
    SELECT org_id, role
      FROM org_members
     WHERE user_id = ${userId}
     ORDER BY (role = 'owner') DESC, joined_at ASC
     LIMIT 1
  `) as Array<{ org_id: string; role: Role }>;
  return memberships[0] ? { orgId: memberships[0].org_id, role: memberships[0].role } : null;
}

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };
function hasAtLeastRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

async function getTargetRole(orgId: string, userId: string): Promise<Role | null> {
  const result = (await sql`
    SELECT role FROM org_members WHERE org_id = ${orgId} AND user_id = ${userId} LIMIT 1
  `) as Array<{ role: Role }>;
  return result[0]?.role ?? null;
}

async function countOwners(orgId: string): Promise<number> {
  const result = (await sql`
    SELECT COUNT(*)::int AS n FROM org_members WHERE org_id = ${orgId} AND role = 'owner'
  `) as Array<{ n: number }>;
  return result[0]?.n ?? 0;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const callerId = session?.user?.id;
  if (!callerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: targetUserId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const ctx = await resolveOrgContext(callerId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (!hasAtLeastRole(ctx.role, "admin")) {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }
  if (parsed.data.role === "owner" && !hasAtLeastRole(ctx.role, "owner")) {
    return NextResponse.json(
      { error: "Only an owner can grant the owner role", code: "cannot_grant_owner" },
      { status: 403 },
    );
  }

  const currentRole = await getTargetRole(ctx.orgId, targetUserId);
  if (!currentRole) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (currentRole === "owner" && parsed.data.role !== "owner") {
    const owners = await countOwners(ctx.orgId);
    if (owners <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last owner", code: "last_owner" },
        { status: 409 },
      );
    }
  }

  await sql`
    UPDATE org_members
       SET role = ${parsed.data.role}
     WHERE org_id = ${ctx.orgId} AND user_id = ${targetUserId}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const callerId = session?.user?.id;
  if (!callerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: targetUserId } = await params;

  const ctx = await resolveOrgContext(callerId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (!hasAtLeastRole(ctx.role, "admin")) {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  const currentRole = await getTargetRole(ctx.orgId, targetUserId);
  if (!currentRole) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (currentRole === "owner") {
    const owners = await countOwners(ctx.orgId);
    if (owners <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last owner", code: "last_owner" },
        { status: 409 },
      );
    }
  }

  const result = await sql`
    DELETE FROM org_members
     WHERE org_id = ${ctx.orgId} AND user_id = ${targetUserId}
     RETURNING user_id
  `;
  if (result.length === 0) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  return NextResponse.json({ removed: true });
}
