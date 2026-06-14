import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasApiAccess, getUserPlan } from "@/lib/usage";
import { PLANS, PlanId } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { ApiKeyRow, ActivityEventRow, row, rows as typedRows } from "@/lib/db-types";
import { logger } from "@/lib/logger";

/** Aggregate count returned by COUNT(*)::int queries. */
interface CountRow { count: number; }

/** Daily aggregation shape. */
interface DayCountRow { day: string; count: number; }

/** Projected shape for API key previews in this route. */
type ApiKeyPreview = Pick<ApiKeyRow, "id" | "name" | "created_at" | "last_used_at"> & {
  key_preview: string;
};

/* AR-287 broadened the filter to all `api.*` events.
   AR-289 adds per-org scoping: when ?org=<id> is passed, the BFF
   validates the caller is a member of that org and filters every
   query by `org_id = ?`. Without ?org=, the existing user-wide
   behaviour is preserved (for browsers that haven't yet sent the
   active-org id, and for users with only one org).

   The "this month" quota counter stays user-scoped — it's tied to
   PLANS[plan].reportsPerMonth which is a report quota, not an
   org quota. Mixing scopes there would mislabel quota consumption. */

export async function GET(req: NextRequest): Promise<NextResponse> {
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

  /* AR-289: parse + validate the org context. ?org= is optional;
     when present, the caller MUST be a member of that org (else 403
     — prevents information disclosure via guessed org ids). When
     absent, the chart shows user-wide stats (existing behaviour). */
  const url = new URL(req.url);
  const orgIdParam = url.searchParams.get("org");
  let scopedOrgId: string | null = null;
  if (orgIdParam) {
    const memberships = (await sql`
      SELECT 1
        FROM org_members
       WHERE user_id = ${userId} AND org_id = ${orgIdParam}
       LIMIT 1
    `) as Array<unknown>;
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: "You aren't a member of that organisation.", code: "not_a_member" },
        { status: 403 },
      );
    }
    scopedOrgId = orgIdParam;
  }

  const plan = await getUserPlan(userId);

  try {
    const [
      totalRequests,
      requestsThisMonth,
      requestsByDay,
      lastRequest,
      apiKeys,
    ] = await Promise.all([
      // Total API requests (all time, all api.* events)
      scopedOrgId
        ? sql`
            SELECT COUNT(*)::int as count
            FROM activity_events
            WHERE user_id = ${userId} AND event LIKE 'api.%' AND org_id = ${scopedOrgId}
          `
        : sql`
            SELECT COUNT(*)::int as count
            FROM activity_events
            WHERE user_id = ${userId} AND event LIKE 'api.%'
          `,
      // Reports this month — quota counter, kept user-scoped (it's a
      // user-plan quota, not an org quota). Same regardless of ?org=.
      sql`
        SELECT COUNT(*)::int as count
        FROM activity_events
        WHERE user_id = ${userId}
          AND event = 'api.report.generated'
          AND created_at >= date_trunc('month', NOW())
      `,
      // Traffic per day (last 30 days, all api.* events)
      scopedOrgId
        ? sql`
            SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
            FROM activity_events
            WHERE user_id = ${userId}
              AND event LIKE 'api.%'
              AND org_id = ${scopedOrgId}
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY day
            ORDER BY day
          `
        : sql`
            SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
            FROM activity_events
            WHERE user_id = ${userId}
              AND event LIKE 'api.%'
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY day
            ORDER BY day
          `,
      // Last API request of any kind
      scopedOrgId
        ? sql`
            SELECT created_at
            FROM activity_events
            WHERE user_id = ${userId} AND event LIKE 'api.%' AND org_id = ${scopedOrgId}
            ORDER BY created_at DESC
            LIMIT 1
          `
        : sql`
            SELECT created_at
            FROM activity_events
            WHERE user_id = ${userId} AND event LIKE 'api.%'
            ORDER BY created_at DESC
            LIMIT 1
          `,
      // Active API keys (unchanged — keys are user-owned, not org-scoped)
      sql`
        SELECT
          ak.id,
          ak.key_prefix as key_preview,
          ak.name,
          ak.created_at,
          ak.last_used_at
        FROM api_keys ak
        WHERE ak.user_id = ${userId} AND ak.revoked = FALSE
        ORDER BY ak.created_at DESC
      `,
    ]);

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
      scope: scopedOrgId ? { org_id: scopedOrgId } : { org_id: null },
    });
  } catch (error) {
    logger.error("[API Usage] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
