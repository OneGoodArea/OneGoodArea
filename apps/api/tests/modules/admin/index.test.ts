import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { sql } from "@/infrastructure/db/client";
import { getAnalytics, getTrafficAnalytics } from "@/modules/admin/index";

const mockSql = vi.mocked(sql);

beforeEach(() => mockSql.mockReset());

describe("getAnalytics", () => {
  it("aggregates counts and computes MRR from the plan breakdown", async () => {
    // Queue results in the exact Promise.all order the function issues them.
    mockSql
      .mockResolvedValueOnce([{ count: 12 }] as never)   // totalUsers
      .mockResolvedValueOnce([{ count: 240 }] as never)  // totalReports
      .mockResolvedValueOnce([{ count: 30 }] as never)   // reportsThisMonth
      .mockResolvedValueOnce([{ day: "2026-05-01", count: 5 }] as never) // reportsPerDay
      .mockResolvedValueOnce([{ area: "Manchester", count: 9 }] as never) // topAreas
      .mockResolvedValueOnce([{ intent: "research", count: 20 }] as never) // intentDistribution
      .mockResolvedValueOnce([{ event: "report.created", user_id: "u1", metadata: {}, created_at: "2026-05-01", name: "A", email: "a@b.com" }] as never) // recentActivity
      .mockResolvedValueOnce([{ day: "2026-05-01", count: 2 }] as never) // userGrowth
      .mockResolvedValueOnce([{ count: 8 }] as never)    // activeUsersThisMonth
      .mockResolvedValueOnce([{ count: 11 }] as never)   // usersWithReports
      .mockResolvedValueOnce([{ count: 3 }] as never)    // paidUsers
      .mockResolvedValueOnce([{ plan: "business", count: 2 }, { plan: "growth", count: 1 }] as never); // subscriptionsByPlan

    const a = await getAnalytics();
    expect(a.totalUsers).toBe(12);
    expect(a.totalReports).toBe(240);
    expect(a.reportsThisMonth).toBe(30);
    expect(a.activeUsersThisMonth).toBe(8);
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
