import { sql } from "../../infrastructure/db/client";
import {
  row,
  rows as typedRows,
  type CountRow,
  type DayCountRow,
  type AreaCountRow,
  type PlanCountRow,
  type RecentActivityRow,
  type PathCountRow,
  type ReferrerCountRow,
  type DeviceCountRow,
  type CountryCountRow,
} from "../../infrastructure/db/types";
import { PLAN_PRICES_GBP } from "../../infrastructure/config";

/* Admin analytics. Migrated from legacy src/lib/activity.ts (the getAnalytics +
   getTrafficAnalytics half; trackEvent moved earlier to modules/tracking).
   Imports repointed; the getTrafficAnalytics `CREATE TABLE pageviews` self-ensure
   is dropped (the migrator owns pageviews). Read-only aggregate queries. */

/* AR-313 Phase 1 (pulled forward from Phase 3 on 2026-06-15): retired
   "reports" nomenclature. The `reports` table is legacy; OneGoodArea v2
   is signal-first. Every count that used to read FROM reports now reads
   FROM activity_events WHERE event LIKE 'api.%' (the 33-event taxonomy).
   - totalReports          → totalApiCalls
   - reportsThisMonth      → apiCallsThisMonth
   - reportsPerDay         → apiCallsPerDay
   - usersWithReports      → usersWithApiCalls (funnel "first call" step)
   - intentDistribution    → dropped (intent lived on reports rows only)
   - topAreas              → kept BUT now sources from activity_events
                              metadata.area (set by /v1/score + /v1/area)
   - activeUsersThisMonth  → already counted activity_events; unchanged
*/
export async function getAnalytics() {
  const [
    totalUsers,
    totalApiCalls,
    apiCallsThisMonth,
    apiCallsPerDay,
    topAreas,
    recentActivity,
    userGrowth,
    activeUsersThisMonth,
    // Conversion funnel queries
    usersWithApiCalls,
    paidUsers,
    // Revenue / subscription breakdown
    subscriptionsByPlan,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM users`,
    sql`SELECT COUNT(*)::int as count FROM activity_events WHERE event LIKE 'api.%'`,
    sql`
      SELECT COUNT(*)::int as count
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND created_at >= date_trunc('month', NOW())
    `,
    sql`
      SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day
    `,
    sql`
      SELECT (metadata->>'area') as area, COUNT(*)::int as count
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND metadata->>'area' IS NOT NULL
       GROUP BY metadata->>'area'
       ORDER BY count DESC
       LIMIT 10
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
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND user_id IS NOT NULL
         AND created_at >= date_trunc('month', NOW())
    `,
    // Funnel "first api call" step: users who made at least one api.* call
    sql`
      SELECT COUNT(DISTINCT user_id)::int as count
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND user_id IS NOT NULL
    `,
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
  const planPrices = PLAN_PRICES_GBP;

  const subscriptionBreakdown = typedRows<PlanCountRow>(subscriptionsByPlan);
  const mrr = subscriptionBreakdown.reduce((sum, r) => {
    return sum + (planPrices[r.plan] || 0) * r.count;
  }, 0);

  return {
    totalUsers: row<CountRow>(totalUsers[0]).count,
    totalApiCalls: row<CountRow>(totalApiCalls[0]).count,
    apiCallsThisMonth: row<CountRow>(apiCallsThisMonth[0]).count,
    activeUsersThisMonth: row<CountRow>(activeUsersThisMonth[0]).count,
    apiCallsPerDay: typedRows<DayCountRow>(apiCallsPerDay),
    topAreas: typedRows<AreaCountRow>(topAreas),
    recentActivity: typedRows<RecentActivityRow>(recentActivity),
    userGrowth: typedRows<DayCountRow>(userGrowth),
    // Conversion funnel
    usersWithApiCalls: row<CountRow>(usersWithApiCalls[0]).count,
    paidUsers: row<CountRow>(paidUsers[0]).count,
    // Revenue
    subscriptionsByPlan: subscriptionBreakdown,
    mrr,
  };
}

export async function getTrafficAnalytics() {
  try {
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

/* AR-313 Phase 1: composite "who's using us" stats for the admin Audience tab.
   Returns users/orgs/geo in one round-trip — one shape, one fetch. All counts
   restricted to api.* events (signal-first taxonomy) for activity windows;
   pageviews used for geography because that's where Vercel's country header
   lands. */
export interface AudienceStats {
  users: {
    total: number;
    active_7d: number;
    active_30d: number;
    signups_per_day: { day: string; count: number }[];
    churn_signal_count: number;
    stale_users: { user_id: string; email: string; days_inactive: number }[];
  };
  orgs: {
    total: number;
    size_distribution: { bucket: "1" | "2-5" | "6-20" | "20+"; count: number }[];
    top_by_activity: { org_id: string; org_name: string; events_30d: number }[];
  };
  geo: {
    top_countries: { country: string; count: number }[];
    unique_countries_30d: number;
  };
}

/* AR-313 Phase 1 — city-granularity geo deferred: pageviews has no `city`
   column today (only `country` via Vercel header). Adding it is its own
   migration + collection change; out of scope here. */

interface StaleUserRow { user_id: string; email: string; days_inactive: number; }
interface SizeBucketRow { bucket: "1" | "2-5" | "6-20" | "20+"; count: number; }
interface TopOrgRow { org_id: string; org_name: string; events_30d: number; }

export async function getAudienceStats(): Promise<AudienceStats> {
  const [
    totalUsers,
    active7d,
    active30d,
    signupsPerDay,
    churnCount,
    staleUsers,
    totalOrgs,
    sizeDistribution,
    topOrgsByActivity,
    topCountries,
    uniqueCountries30d,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM users`,
    sql`
      SELECT COUNT(DISTINCT user_id)::int as count
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND user_id IS NOT NULL
         AND created_at >= NOW() - INTERVAL '7 days'
    `,
    sql`
      SELECT COUNT(DISTINCT user_id)::int as count
        FROM activity_events
       WHERE event LIKE 'api.%'
         AND user_id IS NOT NULL
         AND created_at >= NOW() - INTERVAL '30 days'
    `,
    sql`
      SELECT date_trunc('day', created_at)::date as day, COUNT(*)::int as count
        FROM users
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day
    `,
    sql`
      SELECT COUNT(*)::int as count
        FROM users u
       WHERE u.created_at < NOW() - INTERVAL '14 days'
         AND NOT EXISTS (
           SELECT 1 FROM activity_events a
            WHERE a.user_id = u.id
              AND a.event LIKE 'api.%'
              AND a.created_at >= NOW() - INTERVAL '14 days'
         )
    `,
    sql`
      SELECT u.id as user_id, u.email,
             EXTRACT(DAY FROM NOW() - COALESCE(
               (SELECT MAX(created_at) FROM activity_events a WHERE a.user_id = u.id AND a.event LIKE 'api.%'),
               u.created_at
             ))::int as days_inactive
        FROM users u
       WHERE u.created_at < NOW() - INTERVAL '14 days'
         AND NOT EXISTS (
           SELECT 1 FROM activity_events a
            WHERE a.user_id = u.id
              AND a.event LIKE 'api.%'
              AND a.created_at >= NOW() - INTERVAL '14 days'
         )
       ORDER BY days_inactive DESC
       LIMIT 10
    `,
    sql`SELECT COUNT(*)::int as count FROM orgs`,
    sql`
      SELECT bucket, count::int as count
      FROM (
        SELECT
          CASE
            WHEN n = 1 THEN '1'
            WHEN n BETWEEN 2 AND 5 THEN '2-5'
            WHEN n BETWEEN 6 AND 20 THEN '6-20'
            ELSE '20+'
          END as bucket,
          CASE
            WHEN n = 1 THEN 1
            WHEN n BETWEEN 2 AND 5 THEN 2
            WHEN n BETWEEN 6 AND 20 THEN 3
            ELSE 4
          END as sort_order,
          COUNT(*) as count
        FROM (
          SELECT org_id, COUNT(*)::int as n
            FROM org_members
           GROUP BY org_id
        ) sized
        GROUP BY bucket, sort_order
      ) sized_groups
      ORDER BY sort_order
    `,
    sql`
      SELECT o.id as org_id, o.name as org_name, COUNT(a.id)::int as events_30d
        FROM orgs o
        JOIN org_members m ON m.org_id = o.id
        JOIN activity_events a ON a.user_id = m.user_id
       WHERE a.event LIKE 'api.%'
         AND a.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY o.id, o.name
       ORDER BY events_30d DESC
       LIMIT 10
    `,
    sql`
      SELECT country, COUNT(*)::int as count
        FROM pageviews
       WHERE country IS NOT NULL
         AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY country
       ORDER BY count DESC
       LIMIT 10
    `,
    sql`
      SELECT COUNT(DISTINCT country)::int as count
        FROM pageviews
       WHERE country IS NOT NULL
         AND created_at >= NOW() - INTERVAL '30 days'
    `,
  ]);

  return {
    users: {
      total: row<CountRow>(totalUsers[0]).count,
      active_7d: row<CountRow>(active7d[0]).count,
      active_30d: row<CountRow>(active30d[0]).count,
      signups_per_day: typedRows<DayCountRow>(signupsPerDay).map((r) => ({
        day: String(r.day),
        count: r.count,
      })),
      churn_signal_count: row<CountRow>(churnCount[0]).count,
      stale_users: typedRows<StaleUserRow>(staleUsers),
    },
    orgs: {
      total: row<CountRow>(totalOrgs[0]).count,
      size_distribution: typedRows<SizeBucketRow>(sizeDistribution),
      top_by_activity: typedRows<TopOrgRow>(topOrgsByActivity),
    },
    geo: {
      top_countries: typedRows<CountryCountRow>(topCountries),
      unique_countries_30d: row<CountRow>(uniqueCountries30d[0]).count,
    },
  };
}
