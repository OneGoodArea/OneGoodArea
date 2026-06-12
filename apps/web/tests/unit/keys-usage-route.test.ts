import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/usage", () => ({
  hasApiAccess: vi.fn(),
  getUserPlan: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET } from "@/app/api/keys/usage/route";
import { auth } from "@/lib/auth";
import { hasApiAccess, getUserPlan } from "@/lib/usage";
import { sql } from "@/lib/db";

const mockAuth = vi.mocked(auth as unknown as () => Promise<{ user?: { id?: string } } | null>);
const mockHasApi = vi.mocked(hasApiAccess);
const mockGetPlan = vi.mocked(getUserPlan);
const mockSql = vi.mocked(sql as unknown as (...args: unknown[]) => Promise<unknown[]>);

/* Tagged-template sql calls land as (strings, ...values). The strings
   are the raw SQL chunks; we join them to inspect the filter clauses
   in each query without depending on which interpolated value goes
   where. */
function sqlChunks(callIndex: number): string {
  const call = mockSql.mock.calls[callIndex] as unknown as [TemplateStringsArray, ...unknown[]];
  const [strings] = call;
  return Array.from(strings).join(" $$ "); // separator just so we can see boundaries
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user_1" } });
  mockHasApi.mockResolvedValue(true);
  mockGetPlan.mockResolvedValue("business" as never);
  /* Default success shape — 5 parallel queries each return a sensible
     row. Individual tests override what they care about. */
  mockSql
    .mockResolvedValueOnce([{ count: 42 }])                                    // totalRequests
    .mockResolvedValueOnce([{ count: 5 }])                                     // requestsThisMonth (reports only)
    .mockResolvedValueOnce([{ day: "2026-06-12", count: 7 }])                  // requestsByDay
    .mockResolvedValueOnce([{ created_at: "2026-06-12T10:00:00.000Z" }])       // lastRequest
    .mockResolvedValueOnce([]);                                                 // apiKeys
});

describe("GET /api/keys/usage", () => {
  it("401s without a session and never queries the DB", async () => {
    mockAuth.mockResolvedValue(null);
    /* Reset the per-test default mocks so we can assert sql wasn't called. */
    mockSql.mockReset();
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("403s when the user's plan doesn't include API access", async () => {
    mockHasApi.mockResolvedValue(false);
    mockSql.mockReset();
    const res = await GET();
    expect(res.status).toBe(403);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("totalRequests query counts EVERY api.* event (AR-287)", async () => {
    await GET();
    const sqlText = sqlChunks(0);
    expect(sqlText).toContain("LIKE 'api.%'");
    expect(sqlText).not.toContain("'api.report.generated'");
  });

  it("requestsThisMonth query stays scoped to api.report.generated (quota metric)", async () => {
    /* This is the quota counter — broadening it would mislabel
       non-report API calls as quota consumption. */
    await GET();
    const sqlText = sqlChunks(1);
    expect(sqlText).toContain("'api.report.generated'");
    expect(sqlText).toContain("date_trunc('month'");
  });

  it("requestsByDay (chart) query counts every api.* event over 30 days (AR-287)", async () => {
    await GET();
    const sqlText = sqlChunks(2);
    expect(sqlText).toContain("LIKE 'api.%'");
    expect(sqlText).toContain("INTERVAL '30 days'");
    expect(sqlText).toContain("date_trunc('day'");
  });

  it("lastRequest query returns the timestamp of the most recent api.* event (AR-287)", async () => {
    await GET();
    const sqlText = sqlChunks(3);
    expect(sqlText).toContain("LIKE 'api.%'");
    expect(sqlText).toContain("ORDER BY created_at DESC");
    expect(sqlText).toContain("LIMIT 1");
  });

  it("happy-path response shape — counts wired into the right fields", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalRequests).toBe(42);
    expect(body.requestsThisMonth).toBe(5);
    expect(body.lastRequestAt).toBe("2026-06-12T10:00:00.000Z");
    /* 30 days backfilled to zero, with our one real-day entry merged in. */
    expect(body.dailyData).toHaveLength(30);
    const today = body.dailyData.find((d: { day: string; count: number }) => d.day === "2026-06-12");
    expect(today?.count).toBe(7);
  });

  it("fills 30 days with zero counts when no traffic at all", async () => {
    mockSql.mockReset();
    mockSql
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]) // no rows at all
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const res = await GET();
    const body = await res.json();
    expect(body.dailyData).toHaveLength(30);
    expect(body.dailyData.every((d: { count: number }) => d.count === 0)).toBe(true);
    expect(body.lastRequestAt).toBeNull();
  });
});
