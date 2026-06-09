import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

/* AR-257 web BFF for the activity feed.

   Reads activity_events directly from the same Neon DB rather than
   bridging through apps/api's GET /me/activity. The apps/api endpoint
   exists (AR-235) and is the right surface for an api-key consumer,
   but the dashboard runs on a NextAuth cookie, not an api-key, and
   the bridge-token wiring isn't set up in local dev so a proxy
   attempt 500s. Same SQL the apps/api activity module runs, just
   session-authed here. */

interface ActivityRow {
  id: string;
  user_id: string | null;
  event: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface CountRow {
  total: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const rawSize = Number.parseInt(url.searchParams.get("page_size") ?? "20", 10);
  const pageSize =
    Number.isFinite(rawSize) ? Math.min(100, Math.max(1, rawSize)) : 20;

  const offset = (page - 1) * pageSize;

  try {
    const eventRows = (await sql`
      SELECT id, user_id, event, metadata, created_at
        FROM activity_events
       WHERE user_id = ${userId}
       ORDER BY created_at DESC
       LIMIT ${pageSize}
      OFFSET ${offset}
    `) as ActivityRow[];

    const countRows = (await sql`
      SELECT COUNT(*)::int AS total
        FROM activity_events
       WHERE user_id = ${userId}
    `) as CountRow[];

    const events = eventRows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      event: row.event,
      metadata: row.metadata ?? {},
      created_at: row.created_at,
    }));
    const total = countRows[0]?.total ?? 0;

    return NextResponse.json({
      events,
      total,
      page,
      page_size: pageSize,
    });
  } catch {
    /* activity_events may not exist on a fresh DB (the migrator
       creates it lazily). Return an empty page so the UI renders
       the empty state rather than throwing. */
    return NextResponse.json({
      events: [],
      total: 0,
      page,
      page_size: pageSize,
    });
  }
}
