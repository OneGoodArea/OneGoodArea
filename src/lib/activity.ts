import { sql } from "@/lib/db";
import { ensureActivityTable } from "@/lib/db-schema";
import {
  row,
  rows as typedRows,
  CountRow,
  DayCountRow,
  AreaCountRow,
  IntentCountRow,
  PlanCountRow,
  RecentActivityRow,
  PathCountRow,
  ReferrerCountRow,
  DeviceCountRow,
  CountryCountRow,
} from "@/lib/db-types";

let tableReady = false;

export async function trackEvent(
  event: string,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    if (!tableReady) {
      await ensureActivityTable();
      tableReady = true;
    }

    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await sql`
      INSERT INTO activity_events (id, user_id, event, metadata)
      VALUES (${id}, ${userId || null}, ${event}, ${JSON.stringify(metadata || {})})
    `;
  } catch (error) {
    // Activity tracking should never break the main request
    console.error("Activity tracking error:", error);
  }
}

// ── Analytics queries ──

export async function getAnalytics() {
  const [
    totalUsers,
    totalReports,
    reportsThisMonth,
    reportsPerDay,
    topAreas,
    intentDistribution,
    recentActivity,
    userGrowth,
    activeUsersThisMonth,
    // Conversion funnel queries
    usersWithReports,
    paidUsers,
    // Revenue / subscription breakdown
    subscriptionsByPlan,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM users`,
    sql`SELECT COUNT(*)::int as count FROM reports`,
    sql`SELECT COUNT(*)::int as count FROM reports WHERE created_at >= date_trunc('month', NOW())`,
    sql`
      SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
      FROM reports
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day
    `,
    sql`
      SELECT area, COUNT(*)::int as count
      FROM reports
      GROUP BY area ORDER BY count DESC LIMIT 10
    `,
    sql`
      SELECT intent, COUNT(*)::int as count
      FROM reports
      GROUP BY intent ORDER BY count DESC
    `,
    sql`
      SELECT ae.event, ae.user_id, ae.metadata, ae.created_at, u.name, u.email
      FROM activity_events ae
      LEFT JOIN users u ON ae.user_id = u.id
      ORDER BY ae.created_at DESC LIMIT 30
    `,
    sql`
      SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day
    `,
    sql`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM reports
      WHERE created_at >= date_trunc('month', NOW())
    `,
    // Users who have generated at least 1 report
    sql`SELECT COUNT(DISTINCT user_id)::int as count FROM reports`,
    // Users on a paid plan (active subscription, not free)
    sql`
      SELECT COUNT(*)::int as count FROM subscriptions
      WHERE status = 'active' AND plan != 'free' AND stripe_subscription_id IS NOT NULL
    `,
    // Active subscriptions grouped by plan tier
    sql`
      SELECT plan, COUNT(*)::int as count FROM subscriptions
      WHERE status = 'active' AND plan != 'free' AND stripe_subscription_id IS NOT NULL
      GROUP BY plan ORDER BY count DESC
    `,
  ]);

  // MRR calculation based on plan prices
  const planPrices: Record<string, number> = {
    starter: 29,
    pro: 79,
    business: 249,
  };

  const subscriptionBreakdown = typedRows<PlanCountRow>(subscriptionsByPlan);
  const mrr = subscriptionBreakdown.reduce((sum, r) => {
    return sum + (planPrices[r.plan] || 0) * r.count;
  }, 0);

  return {
    totalUsers: row<CountRow>(totalUsers[0]).count,
    totalReports: row<CountRow>(totalReports[0]).count,
    reportsThisMonth: row<CountRow>(reportsThisMonth[0]).count,
    activeUsersThisMonth: row<CountRow>(activeUsersThisMonth[0]).count,
    reportsPerDay: typedRows<DayCountRow>(reportsPerDay),
    topAreas: typedRows<AreaCountRow>(topAreas),
    intentDistribution: typedRows<IntentCountRow>(intentDistribution),
    recentActivity: typedRows<RecentActivityRow>(recentActivity),
    userGrowth: typedRows<DayCountRow>(userGrowth),
    // Conversion funnel
    usersWithReports: row<CountRow>(usersWithReports[0]).count,
    paidUsers: row<CountRow>(paidUsers[0]).count,
    // Revenue
    subscriptionsByPlan: subscriptionBreakdown,
    mrr,
  };
}

// ── Traffic analytics ──

export async function getTrafficAnalytics() {
  try {
    // Ensure table exists (may not exist on first load)
    await sql`
      CREATE TABLE IF NOT EXISTS pageviews (
        id SERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        referrer TEXT,
        country TEXT,
        device TEXT,
        session_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const [
      totalPageviews,
      pageviewsToday,
      uniqueVisitorsToday,
      uniqueVisitors30d,
      pageviewsPerDay,
      topPages,
      topReferrers,
      deviceBreakdown,
      topCountries,
    ] = await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM pageviews`,
      sql`SELECT COUNT(*)::int as count FROM pageviews WHERE created_at >= date_trunc('day', NOW())`,
      sql`SELECT COUNT(DISTINCT session_id)::int as count FROM pageviews WHERE created_at >= date_trunc('day', NOW())`,
      sql`SELECT COUNT(DISTINCT session_id)::int as count FROM pageviews WHERE created_at >= NOW() - INTERVAL '30 days'`,
      sql`
        SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
        FROM pageviews
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day
      `,
      sql`
        SELECT path, COUNT(*)::int as count
        FROM pageviews
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY path ORDER BY count DESC LIMIT 15
      `,
      sql`
        SELECT referrer, COUNT(*)::int as count
        FROM pageviews
        WHERE referrer IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY referrer ORDER BY count DESC LIMIT 10
      `,
      sql`
        SELECT device, COUNT(*)::int as count
        FROM pageviews
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY device ORDER BY count DESC
      `,
      sql`
        SELECT country, COUNT(*)::int as count
        FROM pageviews
        WHERE country IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY country ORDER BY count DESC LIMIT 10
      `,
    ]);

    return {
      totalPageviews: row<CountRow>(totalPageviews[0]).count,
      pageviewsToday: row<CountRow>(pageviewsToday[0]).count,
      uniqueVisitorsToday: row<CountRow>(uniqueVisitorsToday[0]).count,
      uniqueVisitors30d: row<CountRow>(uniqueVisitors30d[0]).count,
      pageviewsPerDay: typedRows<DayCountRow>(pageviewsPerDay),
      topPages: typedRows<PathCountRow>(topPages),
      topReferrers: typedRows<ReferrerCountRow>(topReferrers),
      deviceBreakdown: typedRows<DeviceCountRow>(deviceBreakdown),
      topCountries: typedRows<CountryCountRow>(topCountries),
    };
  } catch {
    return null;
  }
}
