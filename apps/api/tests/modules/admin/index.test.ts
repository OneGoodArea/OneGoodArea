import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { sql } from "@/infrastructure/db/client";
import { getAnalytics, getTrafficAnalytics, getUsageStats, getRevenueExtras } from "@/modules/admin/index";

const mockSql = vi.mocked(sql);

beforeEach(() => mockSql.mockReset());

describe("getAnalytics", () => {
  it("aggregates counts and computes MRR from the plan breakdown", async () => {
    /* AR-313 Phase 1: "reports" nomenclature retired. Counts read from
       activity_events WHERE event LIKE 'api.%' now; intent distribution
       dropped (lived on report rows only); topAreas reads from
       metadata->>'area'. Mock queue order matches the new Promise.all. */
    mockSql
      .mockResolvedValueOnce([{ count: 12 }] as never)   // totalUsers
      .mockResolvedValueOnce([{ count: 240 }] as never)  // totalApiCalls
      .mockResolvedValueOnce([{ count: 30 }] as never)   // apiCallsThisMonth
      .mockResolvedValueOnce([{ day: "2026-05-01", count: 5 }] as never) // apiCallsPerDay
      .mockResolvedValueOnce([{ area: "Manchester", count: 9 }] as never) // topAreas
      .mockResolvedValueOnce([{ event: "api.score.scored", user_id: "u1", metadata: {}, created_at: "2026-05-01", name: "A", email: "a@b.com" }] as never) // recentActivity
      .mockResolvedValueOnce([{ day: "2026-05-01", count: 2 }] as never) // userGrowth
      .mockResolvedValueOnce([{ count: 8 }] as never)    // activeUsersThisMonth
      .mockResolvedValueOnce([{ count: 11 }] as never)   // usersWithApiCalls
      .mockResolvedValueOnce([{ count: 3 }] as never)    // paidUsers
      .mockResolvedValueOnce([{ plan: "business", count: 2 }, { plan: "growth", count: 1 }] as never); // subscriptionsByPlan

    const a = await getAnalytics();
    expect(a.totalUsers).toBe(12);
    expect(a.totalApiCalls).toBe(240);
    expect(a.apiCallsThisMonth).toBe(30);
    expect(a.activeUsersThisMonth).toBe(8);
    expect(a.usersWithApiCalls).toBe(11);
    expect(a.topAreas).toEqual([{ area: "Manchester", count: 9 }]);
    expect(a.paidUsers).toBe(3);
    expect(a.subscriptionsByPlan).toEqual([{ plan: "business", count: 2 }, { plan: "growth", count: 1 }]);
    // MRR = business(249)*2 + growth(499)*1 = 997
    expect(a.mrr).toBe(997);
  });
});

describe("getTrafficAnalytics", () => {
  it("aggregates pageview metrics", async () => {
    mockSql
      .mockResolvedValueOnce([{ count: 5000 }] as never) // totalPageviews
      .mockResolvedValueOnce([{ count: 100 }] as never)  // pageviewsToday
      .mockResolvedValueOnce([{ count: 120 }] as never)  // uniqueVisitorsToday
      .mockResolvedValueOnce([{ count: 500 }] as never)  // uniqueVisitors30d
      .mockResolvedValueOnce([{ day: "2026-05-01", count: 80 }] as never) // pageviewsPerDay
      .mockResolvedValueOnce([{ path: "/", count: 900 }] as never)        // topPages
      .mockResolvedValueOnce([{ referrer: "google.com", count: 50 }] as never) // topReferrers
      .mockResolvedValueOnce([{ device: "mobile", count: 60 }] as never)  // deviceBreakdown
      .mockResolvedValueOnce([{ country: "GB", count: 800 }] as never);   // topCountries

    const t = await getTrafficAnalytics();
    expect(t).not.toBeNull();
    expect(t!.totalPageviews).toBe(5000);
    expect(t!.uniqueVisitorsToday).toBe(120);
    expect(t!.topPages).toEqual([{ path: "/", count: 900 }]);
    expect(t!.topCountries).toEqual([{ country: "GB", count: 800 }]);
  });

  it("returns null when the result shape is unusable (defensive catch)", async () => {
    // Empty result sets -> row(undefined).count throws inside the try -> null.
    mockSql.mockResolvedValue([] as never);
    expect(await getTrafficAnalytics()).toBeNull();
  });
});

describe("getUsageStats", () => {
  it("aggregates per-product totals + top endpoints from api.* events", async () => {
    /* AR-313 Phase 2: the function fires 3 queries — calls_7d count,
       calls_30d count, and the full grouped-by-event roll-up which
       the function maps to products + slices for the top-20 list. */
    mockSql
      .mockResolvedValueOnce([{ count: 42 }] as never)   // calls_7d
      .mockResolvedValueOnce([{ count: 156 }] as never)  // calls_30d
      .mockResolvedValueOnce([
        { event: "api.score.computed", count: 50, last_seen: "2026-06-14T10:00:00Z" },
        { event: "api.signals.category", count: 40, last_seen: "2026-06-14T09:00:00Z" },
        { event: "api.portfolio.created", count: 20, last_seen: "2026-06-13T15:00:00Z" },
        { event: "api.query.executed", count: 15, last_seen: "2026-06-13T08:00:00Z" },
        { event: "api.bundle.created", count: 5, last_seen: "2026-06-12T22:00:00Z" },
        { event: "api.area.profiled", count: 26, last_seen: "2026-06-14T11:00:00Z" },
      ] as never);

    const u = await getUsageStats();

    expect(u.totals.calls_7d).toBe(42);
    expect(u.totals.calls_30d).toBe(156);

    // Per-product roll-up: every product appears (zero for any with no
    // matching events), totals sum by product mapping.
    const productByName = new Map(u.per_product.map((p) => [p.product, p.calls_30d]));
    expect(productByName.get("Signals")).toBe(66);       // 40 + 26 (api.signals.category + api.area.profiled)
    expect(productByName.get("Scores")).toBe(50);        // api.score.computed
    expect(productByName.get("Monitor")).toBe(20);       // api.portfolio.created
    expect(productByName.get("Intelligence")).toBe(15);  // api.query.executed
    expect(productByName.get("Org & Levers")).toBe(5);   // api.bundle.created

    // Top product = highest per-product total = Signals (66)
    expect(u.totals.top_product).toBe("Signals");
    // Top endpoint = first row by count = api.score.computed
    expect(u.totals.top_endpoint).toBe("api.score.computed");

    expect(u.top_endpoints).toHaveLength(6);
    expect(u.top_endpoints[0]).toMatchObject({ event: "api.score.computed", count: 50 });
  });

  it("handles a zero-traffic period gracefully (every product at 0, no top picks)", async () => {
    mockSql
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValueOnce([] as never);

    const u = await getUsageStats();
    expect(u.totals.calls_7d).toBe(0);
    expect(u.totals.calls_30d).toBe(0);
    expect(u.totals.top_product).toBeNull();
    expect(u.totals.top_endpoint).toBeNull();
    expect(u.per_product).toHaveLength(5);
    expect(u.per_product.every((p) => p.calls_30d === 0)).toBe(true);
    expect(u.top_endpoints).toHaveLength(0);
  });
});

describe("getRevenueExtras", () => {
  it("computes ARR (= MRR × 12) + MCP uptake by add-on and inclusive plan", async () => {
    /* AR-313 Phase 3: 3 parallel queries — subscriptions-by-plan,
       active mcp add-on count, addons grouped by key. Plan keys match
       the actual catalog (build/growth_v2/enterprise — see plans.ts). */
    mockSql
      .mockResolvedValueOnce([
        { plan: "build", count: 2 },        // £149 × 2 = £298
        { plan: "growth_v2", count: 1 },    // £1,499 × 1 = £1,499 (MCP inclusive)
        { plan: "enterprise", count: 1 },   // £4,999 × 1 = £4,999 (MCP inclusive)
      ] as never)
      .mockResolvedValueOnce([{ count: 3 }] as never)  // 3 separate MCP add-on subs
      .mockResolvedValueOnce([
        { addon_key: "mcp", active_count: 3 },
      ] as never);

    const r = await getRevenueExtras();

    // MRR = 298 + 1499 + 4999 = £6,796 → ARR = £81,552
    expect(r.arr).toBe(81552);

    expect(r.mcp.total_paying).toBe(4);           // 2 + 1 + 1
    expect(r.mcp.with_mcp_addon).toBe(3);
    expect(r.mcp.in_mcp_inclusive_plan).toBe(2);  // growth_v2 + enterprise

    expect(r.addons).toEqual([{ addon_key: "mcp", active_count: 3 }]);
  });

  it("returns zeroes when there are no active subscriptions", async () => {
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ count: 0 }] as never)
      .mockResolvedValueOnce([] as never);

    const r = await getRevenueExtras();
    expect(r.arr).toBe(0);
    expect(r.mcp.total_paying).toBe(0);
    expect(r.mcp.with_mcp_addon).toBe(0);
    expect(r.mcp.in_mcp_inclusive_plan).toBe(0);
    expect(r.addons).toEqual([]);
  });
});
