import { z } from "zod";

const DayCountSchema = z.object({ day: z.string(), count: z.number() });
const CountSchema = z.object({ count: z.number() });

export const AdminAnalyticsResponseSchema = z.object({
  totalUsers: z.number(),
  totalApiCalls: z.number(),
  apiCallsThisMonth: z.number(),
  activeUsersThisMonth: z.number(),
  apiCallsPerDay: z.array(DayCountSchema),
  topAreas: z.array(z.object({ area: z.string().nullable(), count: z.number() })),
  recentActivity: z.array(z.object({
    event: z.string(),
    user_id: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()),
    created_at: z.string(),
    name: z.string().nullable(),
    email: z.string().nullable(),
  })),
  userGrowth: z.array(DayCountSchema),
  usersWithApiCalls: z.number(),
  paidUsers: z.number(),
  subscriptionsByPlan: z.array(z.object({ plan: z.string(), count: z.number() })),
  mrr: z.number(),
});

export const AdminTrafficAnalyticsResponseSchema = z.object({
  totalPageviews: z.number(),
  pageviewsToday: z.number(),
  uniqueVisitorsToday: z.number(),
  uniqueVisitors30d: z.number(),
  pageviewsPerDay: z.array(DayCountSchema),
  topPages: z.array(z.object({ path: z.string(), count: z.number() })),
  topReferrers: z.array(z.object({ referrer: z.string(), count: z.number() })),
  deviceBreakdown: z.array(z.object({ device: z.string(), count: z.number() })),
  topCountries: z.array(z.object({ country: z.string(), count: z.number() })),
});

export const AdminAudienceResponseSchema = z.object({
  users: z.object({
    total: z.number(),
    active_7d: z.number(),
    active_30d: z.number(),
    signups_per_day: z.array(z.object({ day: z.string(), count: z.number() })),
    churn_signal_count: z.number(),
    stale_users: z.array(z.object({ user_id: z.string(), email: z.string(), days_inactive: z.number() })),
  }),
  orgs: z.object({
    total: z.number(),
    size_distribution: z.array(z.object({ bucket: z.enum(["1", "2-5", "6-20", "20+"]), count: z.number() })),
    top_by_activity: z.array(z.object({ org_id: z.string(), org_name: z.string(), events_30d: z.number() })),
  }),
  geo: z.object({
    top_countries: z.array(z.object({ country: z.string(), count: z.number() })),
    unique_countries_30d: z.number(),
  }),
});

export const AdminUsageResponseSchema = z.object({
  totals: z.object({
    calls_7d: z.number(),
    calls_30d: z.number(),
    top_product: z.enum(["Signals", "Scores", "Monitor", "Intelligence", "Org & Levers"]).nullable(),
    top_endpoint: z.string().nullable(),
  }),
  per_product: z.array(z.object({
    product: z.enum(["Signals", "Scores", "Monitor", "Intelligence", "Org & Levers"]),
    calls_30d: z.number(),
  })),
  top_endpoints: z.array(z.object({ event: z.string(), count: z.number(), last_seen: z.string() })),
});

export const AdminRevenueResponseSchema = z.object({
  arr: z.number(),
  mcp: z.object({
    total_paying: z.number(),
    with_mcp_addon: z.number(),
    in_mcp_inclusive_plan: z.number(),
  }),
  addons: z.array(z.object({ addon_key: z.string(), active_count: z.number() })),
});

export const AdminMcpAdoptionResponseSchema = z.object({
  total_events_30d: z.number(),
  unique_orgs_30d: z.number(),
  unique_users_30d: z.number(),
  top_orgs: z.array(z.object({
    org_id: z.string().nullable(),
    org_name: z.string().nullable(),
    event_count: z.number(),
    last_seen: z.string(),
  })),
  by_client_app: z.array(z.object({ client_app: z.string(), event_count: z.number() })),
});

export const AdminTrainingCorpusResponseSchema = z.object({
  planner_pairs_30d: z.number(),
  planner_pairs_total: z.number(),
  planner_last_seen: z.string().nullable(),
  brief_pairs_30d: z.number(),
  brief_pairs_total: z.number(),
  brief_last_seen: z.string().nullable(),
  keys_opted_out: z.number(),
  keys_total: z.number(),
});
