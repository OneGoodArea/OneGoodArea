import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { SIGNAL_CATALOGUE } from "@onegoodarea/contracts";

/* AR-274: PATCH + DELETE a single bundle. RBAC: admin or owner. */

type Role = "owner" | "admin" | "member";

const VALID_SIGNAL_KEYS: ReadonlySet<string> = new Set(
  SIGNAL_CATALOGUE.map((s) => s.key),
);

const PatchBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  signal_keys: z.array(z.string().min(1)).min(1).max(100).optional(),
}).strict().refine(
  (b) => b.name !== undefined || b.slug !== undefined || b.signal_keys !== undefined,
  { message: "At least one of name, slug, or signal_keys must be provided." },
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

  const { id: bundleId } = await params;

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

  if (parsed.data.signal_keys) {
    const unknown = parsed.data.signal_keys.filter((k) => !VALID_SIGNAL_KEYS.has(k));
    if (unknown.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown signal keys: ${unknown.slice(0, 5).join(", ")}${
            unknown.length > 5 ? "…" : ""
          }`,
          code: "unknown_signal_keys",
        },
        { status: 400 },
      );
    }
  }

  /* Verify the bundle belongs to the caller's org BEFORE the UPDATE so
     a 403/404 result doesn't leak whether a same-id bundle exists in a
     different org. */
  const existing = (await sql`
    SELECT id FROM signal_bundles WHERE id = ${bundleId} AND org_id = ${ctx.orgId} LIMIT 1
  `) as Array<{ id: string }>;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  /* Apply only the fields the caller sent. COALESCE keeps untouched
     columns intact. Postgres treats undefined → null in the binding so
     we explicitly null-out the optional inputs that weren't included. */
  const nextName = parsed.data.name ?? null;
  const nextSlug = parsed.data.slug ?? null;
  const nextKeys = parsed.data.signal_keys ?? null;

  try {
    await sql`
      UPDATE signal_bundles
         SET name = COALESCE(${nextName}, name),
             slug = COALESCE(${nextSlug}, slug),
             signal_keys = COALESCE(${nextKeys}::text[], signal_keys),
             updated_at = NOW()
       WHERE id = ${bundleId} AND org_id = ${ctx.orgId}
    `;
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "A bundle with that slug already exists in your org", code: "slug_taken" },
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

  const { id: bundleId } = await params;

  const ctx = await resolveOrgContext(userId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  const result = await sql`
    DELETE FROM signal_bundles
     WHERE id = ${bundleId} AND org_id = ${ctx.orgId}
     RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
