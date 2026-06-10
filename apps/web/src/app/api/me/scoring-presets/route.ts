import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-262: list the scoring_presets the user's primary org owns.
   Org resolution: oldest org_members row for this user (a user who
   wasn't backfilled has no orgs and gets an empty list). This is the
   same fallback used by other dashboard surfaces for now; active-
   org overrides land when session-side org context is wired. */

interface PresetRow {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  base_preset: "moving" | "business" | "investing" | "research";
  weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    /* Resolve the user's primary org. Owner-first, then oldest. */
    const memberships = (await sql`
      SELECT org_id, role
        FROM org_members
       WHERE user_id = ${userId}
       ORDER BY (role = 'owner') DESC, joined_at ASC
       LIMIT 1
    `) as Array<{ org_id: string; role: string }>;
    const orgId = memberships[0]?.org_id;
    if (!orgId) {
      return NextResponse.json({ presets: [], org_id: null });
    }

    const presets = (await sql`
      SELECT id, org_id, slug, name, base_preset, weights,
             created_at, updated_at
        FROM scoring_presets
       WHERE org_id = ${orgId}
       ORDER BY created_at DESC
    `) as PresetRow[];

    return NextResponse.json({ presets, org_id: orgId });
  } catch {
    /* scoring_presets / org_members tables may not exist on a fresh
       DB. Empty list is the right fallback. */
    return NextResponse.json({ presets: [], org_id: null });
  }
}
