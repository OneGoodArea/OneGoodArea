import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-276: PATCH + DELETE a single scoring_preset. RBAC: admin or owner. */

type Role = "owner" | "admin" | "member";
type BasePreset = "moving" | "business" | "investing" | "research";

const BASE_PRESET_DIMENSIONS: Record<BasePreset, readonly string[]> = {
  moving: ["safety_crime", "schools_education", "transport_commute", "daily_amenities", "cost_of_living"],
  business: ["foot_traffic_demand", "competition_density", "transport_access", "local_spending_power", "commercial_costs"],
  investing: ["price_growth", "rental_yield", "regeneration_infrastructure", "tenant_demand", "risk_factors"],
  research: ["safety_crime", "transport_links", "amenities_services", "demographics_economy", "environment_quality"],
};

const PatchBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  base_preset: z.enum(["moving", "business", "investing", "research"]).optional(),
  weights: z.record(z.string(), z.number().positive()).refine(
    (w) => Object.keys(w).length > 0,
    { message: "weights cannot be empty" },
  ).optional(),
}).strict().refine(
  (b) =>
    b.name !== undefined ||
    b.slug !== undefined ||
    b.base_preset !== undefined ||
    b.weights !== undefined,
  { message: "At least one field must be provided." },
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

  const { id: presetId } = await params;
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

  const existing = (await sql`
    SELECT id, base_preset FROM scoring_presets WHERE id = ${presetId} AND org_id = ${ctx.orgId} LIMIT 1
  `) as Array<{ id: string; base_preset: BasePreset }>;
  if (existing.length === 0) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }

  /* When base_preset or weights change, re-validate weight keys against
     the effective dimension set. The effective base_preset is the new
     one if provided, else the existing row's. */
  if (parsed.data.weights) {
    const effectiveBase = parsed.data.base_preset ?? existing[0].base_preset;
    const validKeys = new Set(BASE_PRESET_DIMENSIONS[effectiveBase]);
    const unknown = Object.keys(parsed.data.weights).filter((k) => !validKeys.has(k));
    if (unknown.length > 0) {
      return NextResponse.json(
        {
          error: `Unknown weight keys for ${effectiveBase}: ${unknown.slice(0, 5).join(", ")}${
            unknown.length > 5 ? "…" : ""
          }`,
          code: "unknown_weight_keys",
        },
        { status: 400 },
      );
    }
  }

  /* COALESCE keeps untouched columns. weights is jsonb so cast explicitly. */
  const nextName = parsed.data.name ?? null;
  const nextSlug = parsed.data.slug ?? null;
  const nextBase = parsed.data.base_preset ?? null;
  const nextWeights = parsed.data.weights ?? null;

  try {
    await sql`
      UPDATE scoring_presets
         SET name = COALESCE(${nextName}, name),
             slug = COALESCE(${nextSlug}, slug),
             base_preset = COALESCE(${nextBase}, base_preset),
             weights = COALESCE(${nextWeights}::jsonb, weights),
             updated_at = NOW()
       WHERE id = ${presetId} AND org_id = ${ctx.orgId}
    `;
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "A preset with that slug already exists in your org", code: "slug_taken" },
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

  const { id: presetId } = await params;

  const ctx = await resolveOrgContext(userId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  const result = await sql`
    DELETE FROM scoring_presets
     WHERE id = ${presetId} AND org_id = ${ctx.orgId}
     RETURNING id
  `;
  if (result.length === 0) {
    return NextResponse.json({ error: "Preset not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
