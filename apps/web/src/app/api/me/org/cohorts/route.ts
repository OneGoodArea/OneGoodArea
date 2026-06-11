import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-277: peer cohorts BFF. Direct-DB pattern matching the other
   /api/me/org/* surfaces. Owner-first org resolution; admin+ for
   mutations. Cohorts cap at 10,000 geo_codes per row to match the
   contract (COHORT_MAX_GEO_CODES). */

const COHORT_MAX = 10_000;

type Role = "owner" | "admin" | "member";

interface CohortRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  geo_codes: string[];
  created_at: string;
  updated_at: string;
}

const CreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  geo_codes: z.array(z.string().min(1).max(20)).min(1).max(COHORT_MAX),
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
    if (!ctx) {
      return NextResponse.json({ cohorts: [], org_id: null, caller_role: null });
    }
    const cohorts = (await sql`
      SELECT id, org_id, slug, name, geo_codes, created_at, updated_at
        FROM peer_cohorts
       WHERE org_id = ${ctx.orgId}
       ORDER BY created_at DESC
    `) as CohortRow[];
    return NextResponse.json({
      cohorts,
      org_id: ctx.orgId,
      caller_role: ctx.role,
    });
  } catch {
    /* Table may not exist on a fresh DB. Empty list is the safe fallback. */
    return NextResponse.json({ cohorts: [], org_id: null, caller_role: null });
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

  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const id = `coh_${cryptoRandomHex(12)}`;

  try {
    await sql`
      INSERT INTO peer_cohorts (id, org_id, slug, name, geo_codes)
      VALUES (${id}, ${ctx.orgId}, ${slug}, ${parsed.data.name}, ${parsed.data.geo_codes})
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

  return NextResponse.json(
    {
      cohort: {
        id,
        org_id: ctx.orgId,
        slug,
        name: parsed.data.name,
        geo_codes: parsed.data.geo_codes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}
