import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-277: PATCH + DELETE a single peer cohort. RBAC: admin or owner. */

const COHORT_MAX = 10_000;

type Role = "owner" | "admin" | "member";

const PatchBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  geo_codes: z.array(z.string().min(1).max(20)).min(1).max(COHORT_MAX).optional(),
}).strict().refine(
  (b) => b.name !== undefined || b.slug !== undefined || b.geo_codes !== undefined,
  { message: "At least one of name, slug, or geo_codes must be provided." },
);

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const ctx = await resolveOrgContext(userId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  /* Ownership scope before mutate so a 403/404 result doesn't leak whether
     a same-id cohort exists in a different org. */
  const existing = (await sql`
    SELECT id FROM peer_cohorts WHERE id = ${cohortId} AND org_id = ${ctx.orgId} LIMIT 1
  `) as Array<{ id: string }>;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }

  const nextName = parsed.data.name ?? null;
  const nextSlug = parsed.data.slug ?? null;
  const nextGeoCodes = parsed.data.geo_codes ?? null;

  try {
    await sql`
      UPDATE peer_cohorts
         SET name = COALESCE(${nextName}, name),
             slug = COALESCE(${nextSlug}, slug),
             geo_codes = COALESCE(${nextGeoCodes}::text[], geo_codes),
             updated_at = NOW()
       WHERE id = ${cohortId} AND org_id = ${ctx.orgId}
    `;
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "A cohort with that slug already exists in your org", code: "slug_taken" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: cohortId } = await params;

  const ctx = await resolveOrgContext(userId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  const result = await sql`
    DELETE FROM peer_cohorts
     WHERE id = ${cohortId} AND org_id = ${ctx.orgId}
     RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
