import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-234 (GET) + AR-285 (POST): the OrgSwitcher's session-mode mirror
   of apps/api `/v1/orgs`. Session auth (NextAuth) instead of an API
   key because this is the sidebar's source of truth, not an API
   surface.

   - GET   /api/orgs — list every org the signed-in user belongs to
                       with their role. Used by the OrgSwitcher
                       trigger + dropdown.
   - POST  /api/orgs — create a new org with the caller as owner.
                       AR-234 deferred this surface; AR-285 plumbs it
                       through (modal lives in OrgSwitcher).

   Schema (shared Neon DB):
     orgs (id, slug, name, display_name, brand_url, logo_url, created_at, updated_at)
     org_members (org_id, user_id, role) */

interface OrgWithRoleRow {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  brand_url: string | null;
  created_at: string;
  updated_at: string;
  role: "owner" | "admin" | "member";
}

interface OrgRow {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  brand_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

/* Slug is optional — when omitted, derived from the name. Gives
   power-users explicit URL identifier control without forcing
   everyone to think about it. Same regex as apps/api's
   CreateOrgRequest. */
const CreateOrgSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
}).strict();

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = (await sql`
      SELECT o.id, o.slug, o.name, o.display_name, o.brand_url,
             o.created_at, o.updated_at, m.role
        FROM orgs o
        JOIN org_members m ON m.org_id = o.id
       WHERE m.user_id = ${userId}
       ORDER BY o.created_at ASC
    `) as OrgWithRoleRow[];

    return NextResponse.json({ orgs: result });
  } catch {
    /* The orgs / org_members tables may not exist yet on a fresh DB
       (the schema is created lazily by apps/api on first write). Empty
       list is the right fallback for a user whose org hasn't been
       provisioned, which is the same behaviour as the api endpoint. */
    return NextResponse.json({ orgs: [] });
  }
}

/* AR-285: create a new org with the caller as owner.

   The two INSERTs are NOT in a transaction here — the @neondatabase/
   serverless client is HTTP-mode for single statements. Same shape as
   apps/api's createOrgWithOwner, which is also two statements; if
   the membership write fails, the existing OrgSwitcher filters out
   orphan orgs (no JOIN match), so the worst case is a silently-hidden
   row rather than user-visible corruption. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const id = generateOrgId();
  const derived = parsed.data.slug ?? slugify(parsed.data.name);
  const slug = derived || slugify(id); // fallback for all-symbol names

  try {
    const inserted = (await sql`
      INSERT INTO orgs (id, slug, name)
      VALUES (${id}, ${slug}, ${parsed.data.name})
      RETURNING id, slug, name, display_name, brand_url, logo_url, created_at, updated_at
    `) as OrgRow[];
    if (inserted.length === 0) {
      return NextResponse.json({ error: "Insert returned no row" }, { status: 500 });
    }
    await sql`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${id}, ${userId}, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;

    return NextResponse.json(
      { org: inserted[0], caller_role: "owner" },
      { status: 201 },
    );
  } catch (err) {
    /* Postgres 23505 = unique_violation; the only unique constraint
       on orgs is the slug index, so this is a slug collision. Surface
       cleanly so the modal can prompt the user to pick another. */
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "An organisation with that slug already exists.", code: "slug_taken" },
        { status: 409 },
      );
    }
    const msg = err instanceof Error ? err.message : "";
    if (/duplicate key|unique constraint/i.test(msg)) {
      return NextResponse.json(
        { error: "An organisation with that slug already exists.", code: "slug_taken" },
        { status: 409 },
      );
    }
    throw err;
  }
}

/* Mirrors apps/api's generateId('org', 6) — same prefix + timestamp +
   base36 random shape, so an org created here is shape-identical to
   one created via POST /v1/orgs. */
function generateOrgId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 2 + 6);
  return `org_${ts}_${rand}`;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
