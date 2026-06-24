import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({
  getUserPlan: vi.fn(),
  hasApiAccess: vi.fn(),
  hasMcpAccess: vi.fn(),
  canMakeApiCall: vi.fn(),
  listAddons: vi.fn(),
  getMcpUsageThisMonth: vi.fn(),
  trackMcpCall: vi.fn(),
}));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { verifySessionToken } from "@/modules/auth/session-token";
import { rateLimit } from "@/infrastructure/rate-limit";
import {
  getUserPlan,
  hasApiAccess,
  hasMcpAccess,
  canMakeApiCall,
  listAddons,
  getMcpUsageThisMonth,
} from "@/modules/usage";
import { sql } from "@/infrastructure/db/client";
import { METHODOLOGY_VERSION } from "@/modules/engine/methodology";

const app = await buildApp();

const mockValidate = vi.mocked(validateApiKey);
const mockSessionVerify = vi.mocked(verifySessionToken);
const mockRate = vi.mocked(rateLimit);
const mockGetPlan = vi.mocked(getUserPlan);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockMcpAccess = vi.mocked(hasMcpAccess);
const mockQuota = vi.mocked(canMakeApiCall);
const mockAddons = vi.mocked(listAddons);
const mockMcpUsage = vi.mocked(getMcpUsageThisMonth);
const mockSql = vi.mocked(sql);

const JSON_HEADERS = { "content-type": "application/json" };
const SESSION_AUTH = { authorization: "Bearer session.jwt" };
const API_AUTH = { authorization: "Bearer oga_good" };

beforeEach(() => {
  vi.clearAllMocks();
  // Defaults for v1-me and me-reports:
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockGetPlan.mockResolvedValue("sandbox");
  mockApiAccess.mockResolvedValue(true);
  mockMcpAccess.mockResolvedValue(false);
  mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 3, limit: 35 } as never);
  mockAddons.mockResolvedValue([]);
  mockMcpUsage.mockResolvedValue(0);
  // Defaults for track and watchlist:
  mockSql.mockResolvedValue([] as never);
  mockSessionVerify.mockResolvedValue({ userId: "user_1" });
});

// ── me-activity.test.ts ─────────────────────────────────────────────

describe("GET /me/activity", () => {
  it("401s when the Authorization header is missing", async () => {
    const res = await app.inject({ method: "GET", url: "/me/activity" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized");
    expect(mockSessionVerify).not.toHaveBeenCalled();
  });

  it("401s when the session token is invalid", async () => {
    mockSessionVerify.mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/me/activity",
      headers: { authorization: "Bearer bad-token" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("Unauthorized");
  });

  it("returns the caller's events with defaults (page=1, page_size=20)", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          id: "evt_1",
          user_id: "user_1",
          event: "api.score.computed",
          metadata: { area: "SW1A 1AA", preset: "research" },
          created_at: "2026-06-09T12:00:00Z",
        },
      ] as never)
      .mockResolvedValueOnce([{ total: 1 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(mockSessionVerify).toHaveBeenCalledWith("good-token");
    expect(mockSql).toHaveBeenCalledTimes(2);
    const body = res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toEqual({
      id: "evt_1",
      user_id: "user_1",
      event: "api.score.computed",
      metadata: { area: "SW1A 1AA", preset: "research" },
      created_at: "2026-06-09T12:00:00Z",
    });
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.page_size).toBe(20);
  });

  it("honours page + page_size query params", async () => {
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 73 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity?page=3&page_size=10",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events).toHaveLength(0);
    expect(body.total).toBe(73);
    expect(body.page).toBe(3);
    expect(body.page_size).toBe(10);
  });

  it("caps page_size at 100", async () => {
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity?page_size=9999",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().page_size).toBe(100);
  });

  it("normalises non-numeric page params to the defaults", async () => {
    mockSql
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ total: 0 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity?page=abc&page_size=xyz",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.page).toBe(1);
    expect(body.page_size).toBe(20);
  });

  it("normalises null metadata to an empty object", async () => {
    mockSql
      .mockResolvedValueOnce([
        {
          id: "evt_legacy",
          user_id: "user_1",
          event: "api.report.generated",
          metadata: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ] as never)
      .mockResolvedValueOnce([{ total: 1 }] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/activity",
      headers: { authorization: "Bearer good-token" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().events[0].metadata).toEqual({});
  });
});

// ── me-reports.test.ts ──────────────────────────────────────────────

describe("GET /me/reports", () => {
  it("401s when the Authorization header is missing", async () => {
    const res = await app.inject({ method: "GET", url: "/me/reports" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/Missing API key/);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s when the API key is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await app.inject({
      method: "GET",
      url: "/me/reports",
      headers: { authorization: "Bearer oga_bad" },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/Invalid or revoked/);
  });

  it("returns the caller's reports for a valid key", async () => {
    mockSql.mockResolvedValue([
      { id: "rpt_1", area: "Manchester", intent: "research", score: 72, created_at: "2026-01-02" },
      { id: "rpt_2", area: "Leeds", intent: "investing", score: 64, created_at: "2026-01-01" },
    ] as never);

    const res = await app.inject({
      method: "GET",
      url: "/me/reports",
      headers: { authorization: "Bearer oga_good" },
    });

    expect(res.statusCode).toBe(200);
    expect(mockValidate).toHaveBeenCalledWith("oga_good", expect.anything());
    expect(mockSql).toHaveBeenCalledOnce();
    const body = res.json();
    expect(body.reports).toHaveLength(2);
    expect(body.reports[0]).toEqual({
      id: "rpt_1",
      area: "Manchester",
      intent: "research",
      score: 72,
      created_at: "2026-01-02",
    });
  });
});

// ── track.test.ts ───────────────────────────────────────────────────

describe("POST /track", () => {
  function postTrack(body: unknown, headers: Record<string, string> = {}) {
    return app.inject({
      method: "POST",
      url: "/track",
      headers: { ...JSON_HEADERS, ...headers },
      payload: JSON.stringify(body),
    });
  }

  it("400s when path is missing", async () => {
    const res = await postTrack({ referrer: "https://x.com" });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ ok: false });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("skips api/admin/static paths without inserting", async () => {
    for (const path of ["/api/v1/report", "/admin/x", "/_next/static/y"]) {
      const res = await postTrack({ path });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    }
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("inserts a pageview with derived device + cleaned external referrer", async () => {
    const res = await postTrack(
      { path: "/area/m1", referrer: "https://google.com/search?q=x", sessionId: "s1" },
      { "user-agent": "iPhone Safari", "x-vercel-ip-country": "GB" },
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSql).toHaveBeenCalledTimes(1);
    const params = mockSql.mock.calls[0].slice(1);
    expect(params).toEqual(["/area/m1", "google.com", "GB", "mobile", "s1"]);
  });

  it("drops a same-site referrer (keeps only external hostnames)", async () => {
    await postTrack({ path: "/area/m1", referrer: "https://www.onegoodarea.com/pricing" });
    const params = mockSql.mock.calls[0].slice(1);
    expect(params[1]).toBeNull();
  });

  it("never fails visibly: returns ok even if the insert throws", async () => {
    mockSql.mockRejectedValue(new Error("db down"));
    const res = await postTrack({ path: "/area/m1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

// ── v1-me.test.ts ───────────────────────────────────────────────────

describe("GET /v1/me", () => {
  function getMe(headers: Record<string, string> = {}) {
    return app.inject({ method: "GET", url: "/v1/me", headers: { ...API_AUTH, ...headers } });
  }

  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
  });

  it("401s on an invalid key", async () => {
    mockValidate.mockResolvedValue(null);
    expect((await getMe()).statusCode).toBe(401);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await getMe()).statusCode).toBe(429);
  });

  it("returns plan + entitlements for the sandbox tier", async () => {
    const res = await getMe();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plan).toBe("sandbox");
    expect(body.plan_name).toBe("Sandbox");
    expect(body.api_access).toBe(true);
    expect(body.mcp_access).toBe(false);
    expect(body.api_calls_per_month).toBe(35);
    expect(body.used_this_month).toBe(3);
    expect(body.limit_this_month).toBe(35);
    expect(body.engine_version).toBe(METHODOLOGY_VERSION);
    expect(body.addons).toEqual([]);
  });

  it("reports an unlimited (null) limit for a superuser-style Infinity quota", async () => {
    mockQuota.mockResolvedValue({ allowed: true, plan: "business", used: 999, limit: Infinity } as never);
    mockGetPlan.mockResolvedValue("business");
    const body = (await getMe()).json();
    expect(body.limit_this_month).toBeNull();
  });
});

// ── watchlist.test.ts ───────────────────────────────────────────────

describe("GET /watchlist", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/watchlist" })).statusCode).toBe(401);
  });

  it("returns the caller's saved areas", async () => {
    mockSql.mockResolvedValue([
      { id: "sa_1", postcode: "M1 1AE", label: "Home", intent: "moving", created_at: "2026-05-25" },
    ] as never);
    const res = await app.inject({ method: "GET", url: "/watchlist", headers: { ...SESSION_AUTH, "content-type": "application/json" } });
    expect(res.statusCode).toBe(200);
    expect(res.json().areas).toHaveLength(1);
    expect(res.json().areas[0].postcode).toBe("M1 1AE");
  });
});

describe("POST /watchlist", () => {
  function postWatchlist(body: unknown) {
    return app.inject({
      method: "POST",
      url: "/watchlist",
      headers: { ...SESSION_AUTH, "content-type": "application/json" },
      payload: JSON.stringify(body),
    });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/watchlist", headers: JSON_HEADERS, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s when postcode is missing", async () => {
    const res = await postWatchlist({ label: "Home" });
    expect(res.statusCode).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("normalises the postcode and saves (201)", async () => {
    mockSql.mockResolvedValue([
      { id: "sa_1", postcode: "M1 1AE", label: "Home", intent: "moving", created_at: "x" },
    ] as never);
    const res = await postWatchlist({ postcode: " m1 1ae ", label: " Home ", intent: "moving" });
    expect(res.statusCode).toBe(201);
    expect(res.json().area.id).toBe("sa_1");
    const params = mockSql.mock.calls[0].slice(1);
    expect(params[1]).toBe("M1 1AE");
    expect(params[2]).toBe("Home");
  });

  it("409s when the area is already saved (ON CONFLICT DO NOTHING -> no row)", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await postWatchlist({ postcode: "M1 1AE" });
    expect(res.statusCode).toBe(409);
  });
});

describe("DELETE /watchlist/:id", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "DELETE", url: "/watchlist/sa_1" })).statusCode).toBe(401);
  });

  it("404s when the area is not the caller's", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "DELETE", url: "/watchlist/sa_x", headers: { ...SESSION_AUTH, "content-type": "application/json" } });
    expect(res.statusCode).toBe(404);
  });

  it("removes the caller's saved area", async () => {
    mockSql.mockResolvedValue([{ id: "sa_1" }] as never);
    const res = await app.inject({ method: "DELETE", url: "/watchlist/sa_1", headers: { ...SESSION_AUTH, "content-type": "application/json" } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
