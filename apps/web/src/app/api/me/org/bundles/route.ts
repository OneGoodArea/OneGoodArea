import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { SIGNAL_CATALOGUE } from "@onegoodarea/contracts";

/* AR-274: signal bundles BFF. Same direct-DB pattern as the other
   /api/me/org/* surfaces. Resolves the user's primary org via
   owner-first / oldest org_members lookup; mutations require admin+. */

interface BundleRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  signal_keys: string[];
  created_at: string;
  updated_at: string;
}

const VALID_SIGNAL_KEYS: ReadonlySet<string> = new Set(
  SIGNAL_CATALOGUE.map((s) => s.key),
);

const CreateBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  signal_keys: z.array(z.string().min(1)).min(1).max(100),
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

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const ctx = await resolveOrgContext(userId);
    if (!ctx) {
      return NextResponse.json({ bundles: [], org_id: null, caller_role: null });
    }
    const bundles = (await sql`
      SELECT id, org_id, slug, name, signal_keys, created_at, updated_at
        FROM signal_bundles
       WHERE org_id = ${ctx.orgId}
       ORDER BY created_at DESC
    `) as BundleRow[];
    return NextResponse.json({
      bundles,
      org_id: ctx.orgId,
      caller_role: ctx.role,
    });
  } catch {
    /* Table may not exist on a fresh DB. Empty list is the safe fallback. */
    return NextResponse.json({ bundles: [], org_id: null, caller_role: null });
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

  /* Validate every signal_key against the catalogue. Reject the whole
     request if any unknown — mirrors the apps/api endpoint contract. */
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

  const slug = parsed.data.slug ?? slugify(parsed.data.name);
  const id = `bndl_${cryptoRandomHex(12)}`;

  try {
    await sql`
      INSERT INTO signal_bundles (id, org_id, slug, name, signal_keys)
      VALUES (${id}, ${ctx.orgId}, ${slug}, ${parsed.data.name}, ${parsed.data.signal_keys})
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

  return NextResponse.json(
    {
      bundle: {
        id,
        org_id: ctx.orgId,
        slug,
        name: parsed.data.name,
        signal_keys: parsed.data.signal_keys,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    { status: 201 },
  );
}

function cryptoRandomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
