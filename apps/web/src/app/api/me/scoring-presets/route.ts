import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-262 list-only → AR-276 list + create.

   GET: returns the user's primary org's saved scoring_presets + the
   caller's role in that org (so the dashboard can gate management
   actions in the UI).

   POST: admin or owner creates a new preset. Name + base_preset +
   non-empty weights map. Slug derived from name unless explicitly
   provided. Server-side weight-key validation against
   PRESET_DIMENSION_KEYS is performed by apps/api when the saved
   preset is later referenced via preset_id; we mirror the SHAPE
   check here so obvious wrong-key requests fail fast at the BFF. */

type Role = "owner" | "admin" | "member";
type BasePreset = "moving" | "business" | "investing" | "research";

interface PresetRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  base_preset: BasePreset;
  weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

const BASE_PRESET_DIMENSIONS: Record<BasePreset, readonly string[]> = {
  moving: ["safety_crime", "schools_education", "transport_commute", "daily_amenities", "cost_of_living"],
  business: ["foot_traffic_demand", "competition_density", "transport_access", "local_spending_power", "commercial_costs"],
  investing: ["price_growth", "rental_yield", "regeneration_infrastructure", "tenant_demand", "risk_factors"],
  research: ["safety_crime", "transport_links", "amenities_services", "demographics_economy", "environment_quality"],
};

const CreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  base_preset: z.enum(["moving", "business", "investing", "research"]),
  weights: z.record(z.string(), z.number().positive()).refine(
    (w) => Object.keys(w).length > 0,
    { message: "weights cannot be empty" },
  ),
}).strict();

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

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function cryptoRandomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ctx = await resolveOrgContext(userId);
    if (!ctx) return NextResponse.json({ presets: [], org_id: null, caller_role: null });

    const presets = (await sql`
      SELECT id, org_id, slug, name, base_preset, weights,
             created_at, updated_at
        FROM scoring_presets
       WHERE org_id = ${ctx.orgId}
       ORDER BY created_at DESC
    `) as PresetRow[];

    return NextResponse.json({ presets, org_id: ctx.orgId, caller_role: ctx.role });
  } catch {
    /* scoring_presets / org_members may not exist on a fresh DB. */
    return NextResponse.json({ presets: [], org_id: null, caller_role: null });
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

  const ctx = await resolveOrgContext(userId);
  if (!ctx) return NextResponse.json({ error: "No org" }, { status: 404 });
  if (ctx.role !== "owner" && ctx.role !== "admin") {
    return NextResponse.json(
      { error: "Admin or owner required", code: "admin_required" },
      { status: 403 },
    );
  }

  /* Every weight key must belong to the chosen base preset's dimensions.
     Server enforces too, but failing fast at the BFF gives the modal an
     immediate error to surface inline. */
  const validKeys = new Set(BASE_PRESET_DIMENSIONS[parsed.data.base_preset]);
  const unknown = Object.keys(parsed.data.weights).filter((k) => !validKeys.has(k));
  if (unknown.length > 0) {
    return NextResponse.json(
      {
        error: `Unknown weight keys for ${parsed.data.base_preset}: ${unknown.slice(0, 5).join(", ")}${
          unknown.length > 5 ? "…" : ""
        }`,
        code: "unknown_weight_keys",
      },
      { status: 400 },
    );
  }

  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const id = `pset_${cryptoRandomHex(12)}`;

  try {
    await sql`
      INSERT INTO scoring_presets (id, org_id, slug, name, base_preset, weights)
      VALUES (${id}, ${ctx.orgId}, ${slug}, ${parsed.data.name}, ${parsed.data.base_preset}, ${parsed.data.weights}::jsonb)
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

  return NextResponse.json(
    {
      preset: {
        id,
        org_id: ctx.orgId,
        slug,
        name: parsed.data.name,
        base_preset: parsed.data.base_preset,
        weights: parsed.data.weights,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
