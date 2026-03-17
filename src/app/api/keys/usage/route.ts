import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasApiAccess, getUserPlan } from "@/lib/usage";
import { PLANS, PlanId } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { ApiKeyRow, ActivityEventRow, row, rows as typedRows } from "@/lib/db-types";

/** Aggregate count returned by COUNT(*)::int queries. */
interface CountRow { count: number; }

/** Daily aggregation shape. */
interface DayCountRow { day: string; count: number; }

/** Projected shape for API key previews in this route. */
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & {
  key_preview: string;
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiAllowed = await hasApiAccess(userId);
  if (!apiAllowed) {
    return NextResponse.json(
      { error: "API usage dashboard requires a Developer, Business, or Growth plan" },
      { status: 403 }
    );
  }

  const plan = await getUserPlan(userId);

  try {
    // Query activity_events for api.report.generated events for this user
    const [
      totalRequests,
      requestsThisMonth,
      requestsByDay,
      lastRequest,
      apiKeys,
    ] = await Promise.all([
      // Total API requests (all time)
      sql`
        SELECT COUNT(*)::int as count
        FROM activity_events
        WHERE user_id = ${userId} AND event = 'api.report.generated'
      `,
      // Requests this month
      sql`
        SELECT COUNT(*)::int as count
        FROM activity_events
        WHERE user_id = ${userId}
          AND event = 'api.report.generated'
          AND created_at >= date_trunc('month', NOW())
      `,
      // Requests per day (last 30 days)
      sql`
        SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
        FROM activity_events
        WHERE user_id = ${userId}
          AND event = 'api.report.generated'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day
        ORDER BY day
      `,
      // Last request timestamp
      sql`
        SELECT created_at
        FROM activity_events
        WHERE user_id = ${userId} AND event = 'api.report.generated'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      // Active API keys with usage count from activity_events metadata
      sql`
        SELECT
          ak.id,
          LEFT(ak.key, 8) || '...' as key_preview,
          ak.name,
          ak.created_at,
          ak.last_used_at
        FROM api_keys ak
        WHERE ak.user_id = ${userId} AND ak.revoked = FALSE
        ORDER BY ak.created_at DESC
      `,
    ]);

    // Type the raw query results
    const totalCount = row<CountRow>(totalRequests[0]);
    const monthCount = row<CountRow>(requestsThisMonth[0]);
    const dailyCounts = typedRows<DayCountRow>(requestsByDay);
    const lastRow = lastRequest.length > 0 ? row<Pick<ActivityEventRow, "created_at">>(lastRequest[0]) : null;
    const keys = typedRows<ApiKeyPreview>(apiKeys);

    // Fill in missing days with zero counts for the chart
    const dayMap = new Map<string, number>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap.set(key, 0);
    }
    for (const dc of dailyCounts) {
      const key = new Date(dc.day).toISOString().split("T")[0];
      dayMap.set(key, dc.count);
    }

    const dailyData = Array.from(dayMap.entries()).map(([day, count]) => ({
      day,
      count,
    }));

    return NextResponse.json({
      totalRequests: totalCount.count || 0,
      requestsThisMonth: monthCount.count || 0,
      monthlyLimit: PLANS[plan as PlanId]?.reportsPerMonth ?? 100,
      dailyData,
      lastRequestAt: lastRow?.created_at || null,
      keys: keys.map((k) => ({
        id: k.id,
        key_preview: k.key_preview,
        name: k.name,
        created_at: k.created_at,
        last_used_at: k.last_used_at,
      })),
    });
  } catch (error) {
    console.error("[API Usage] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
