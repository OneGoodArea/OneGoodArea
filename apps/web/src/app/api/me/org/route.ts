import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-284 org settings BFF.

   GET /api/me/org   — returns the signed-in user's primary org (owner-
   first, then oldest membership) + the caller's role. Used by
   /dashboard/org to render the read view and gate the edit controls.

   PATCH /api/me/org — partial update of the primary org's identity +
   white-label fields. Owner+admin only; mirrors the apps/api PATCH
   /v1/orgs/:id contract so a future flip to bridge-token forwarding
   is a one-line change. Slug uniqueness is enforced at the DB layer
   (unique index on orgs.slug); we surface the conflict as 409 with
   a typed code instead of leaking the raw constraint name.

   Direct-DB pattern matching the other /api/me/org/* routes. */

type Role = "owner" | "admin" | "member";

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

/* Body shape mirrors the apps/api UpdateOrgRequestSchema verbatim —
   keeps the two surfaces in lockstep so a bridge-token forward is
   a drop-in replacement later. */
const PatchBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(60).optional(),
  display_name: z.string().min(1).max(200).nullable().optional(),
  brand_url: z.string().url().max(500).nullable().optional(),
  logo_url: z.string().url().max(2000).nullable().optional(),
}).strict().refine(
  (b) =>
    b.name !== undefined ||
    b.slug !== undefined ||
    b.display_name !== undefined ||
    b.brand_url !== undefined ||
    b.logo_url !== undefined,
  { message: "At least one of name, slug, display_name, brand_url, or logo_url must be provided." },
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

async function fetchOrg(orgId: string): Promise<OrgRow | null> {
  const rows = (await sql`
    SELECT id, slug, name, display_name, brand_url, logo_url, created_at, updated_at
      FROM orgs
     WHERE id = ${orgId}
     LIMIT 1
  `) as OrgRow[];
  return rows[0] ?? null;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveOrgContext(userId);
  if (!ctx) {
    return NextResponse.json({ org: null, caller_role: null });
  }
  const org = await fetchOrg(ctx.orgId);
  if (!org) {
    /* org_members row points at a missing orgs row — shouldn't happen
       in practice (the migration backfill maintains the invariant) but
       handle it cleanly rather than 500. */
    return NextResponse.json({ org: null, caller_role: null });
  }
  return NextResponse.json({ org, caller_role: ctx.role });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const current = await fetchOrg(ctx.orgId);
  if (!current) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  /* Read-modify-write — matches the apps/api updateOrg pattern.
     `undefined` leaves the field unchanged; explicit `null` clears
     it; a string overwrites. */
  const patch = parsed.data;
  const next = {
    name:         patch.name         ?? current.name,
    slug:         patch.slug         ?? current.slug,
    display_name: patch.display_name !== undefined ? patch.display_name : current.display_name,
    brand_url:    patch.brand_url    !== undefined ? patch.brand_url    : current.brand_url,
    logo_url:     patch.logo_url     !== undefined ? patch.logo_url     : current.logo_url,
  };

  try {
    const updated = (await sql`
      UPDATE orgs
         SET name = ${next.name},
             slug = ${next.slug},
             display_name = ${next.display_name},
             brand_url = ${next.brand_url},
             logo_url = ${next.logo_url},
             updated_at = NOW()
       WHERE id = ${ctx.orgId}
       RETURNING id, slug, name, display_name, brand_url, logo_url, created_at, updated_at
    `) as OrgRow[];
    if (updated.length === 0) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }
    return NextResponse.json({ org: updated[0], caller_role: ctx.role });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/duplicate key|unique constraint/i.test(msg)) {
      return NextResponse.json(
        { error: "Slug already in use. Pick a different slug.", code: "slug_in_use" },
        { status: 409 },
      );
    }
    throw err;
  }
}
