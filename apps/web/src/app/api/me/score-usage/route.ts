import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-262: score-call usage breakdown for the signed-in user over the
   last 30 days. Groups api.score.computed activity_events by the
   `preset` field in metadata. Used by /dashboard/scores to show
   per-preset call counts.

   Events are scoped to the caller's user_id (no org column on
   activity_events today). Per-org breakdown lands once we add
   org_id to activity_events. */

interface UsageRow {
  preset: string;
  count: number;
}

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = (await sql`
      SELECT
        COALESCE(metadata->>'preset', metadata->>'preset_id', 'unknown') AS preset,
        COUNT(*)::int AS count
      FROM activity_events
      WHERE user_id = ${userId}
        AND event = 'api.score.computed'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY preset
      ORDER BY count DESC
    `) as UsageRow[];

    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return NextResponse.json({ window_days: 30, total, by_preset: rows });
  } catch {
    return NextResponse.json({ window_days: 30, total: 0, by_preset: [] });
  }
}
