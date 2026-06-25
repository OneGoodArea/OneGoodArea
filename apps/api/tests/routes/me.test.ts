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
vi.mock("@/modules/orgs", async (orig) => {
  const actual = await orig() as object;
  return {
    ...actual,
    getOrgIfMember: vi.fn(),
    getRoleInOrg: vi.fn(),
    updateOrg: vi.fn(),
  };
});
vi.mock("@/modules/webhooks", async (orig) => {
  const actual = await orig() as object;
  return {
    ...actual,
    createWebhookSubscription: vi.fn(),
    listWebhookSubscriptions: vi.fn(),
    revokeWebhookSubscription: vi.fn(),
    rotateWebhookSecret: vi.fn(),
  };
});

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
import { getOrgIfMember, getRoleInOrg, updateOrg } from "@/modules/orgs";
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  revokeWebhookSubscription,
  rotateWebhookSecret,
} from "@/modules/webhooks";

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
const mockGetOrgIfMember = vi.mocked(getOrgIfMember);
const mockGetRoleInOrg = vi.mocked(getRoleInOrg);
const mockUpdateOrg = vi.mocked(updateOrg);
const mockCreateWebhook = vi.mocked(createWebhookSubscription);
const mockListWebhooks = vi.mocked(listWebhookSubscriptions);
const mockRevokeWebhook = vi.mocked(revokeWebhookSubscription);
const mockRotateWebhook = vi.mocked(rotateWebhookSecret);

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

// ── me-org.test.ts ──────────────────────────────────────────────────
// AR-348 (epic AR-343): session-authed /me/org GET + PATCH.

describe("GET /me/org", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "GET", url: "/me/org" });
    expect(res.statusCode).toBe(401);
  });

  it("returns { org: null, caller_role: null } when the user has no memberships", async () => {
    mockSql.mockResolvedValueOnce([] as never);
    const res = await app.inject({ method: "GET", url: "/me/org", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ org: null, caller_role: null });
  });

  it("returns the primary org + role for a member", async () => {
    mockSql.mockResolvedValueOnce([{ org_id: "org_acme", role: "admin" }] as never);
    mockGetOrgIfMember.mockResolvedValue({
      id: "org_acme", slug: "acme", name: "Acme",
      display_name: null, brand_url: null, logo_url: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    } as never);
    const res = await app.inject({ method: "GET", url: "/me/org", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.caller_role).toBe("admin");
    expect(body.org.id).toBe("org_acme");
  });

  it("returns { org: null } if org_members points at a missing org row", async () => {
    mockSql.mockResolvedValueOnce([{ org_id: "org_dangling", role: "owner" }] as never);
    mockGetOrgIfMember.mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/me/org", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ org: null, caller_role: null });
  });
});

describe("PATCH /me/org", () => {
  function patchOrg(body: unknown) {
    return app.inject({
      method: "PATCH",
      url: "/me/org",
      headers: { ...SESSION_AUTH, ...JSON_HEADERS },
      payload: JSON.stringify(body),
    });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "PATCH", url: "/me/org", headers: JSON_HEADERS, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("404s when the user has no membership", async () => {
    mockSql.mockResolvedValueOnce([] as never);
    const res = await patchOrg({ name: "New Name" });
    expect(res.statusCode).toBe(404);
  });

  it("403s when the caller is a plain member (admin or owner required)", async () => {
    mockSql.mockResolvedValueOnce([{ org_id: "org_acme", role: "member" }] as never);
    mockGetRoleInOrg.mockResolvedValue("member");
    const res = await patchOrg({ name: "Renamed" });
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe("admin_required");
    expect(mockUpdateOrg).not.toHaveBeenCalled();
  });

  it("200s on the happy path for an admin", async () => {
    mockSql.mockResolvedValueOnce([{ org_id: "org_acme", role: "admin" }] as never);
    mockGetRoleInOrg.mockResolvedValue("admin");
    mockUpdateOrg.mockResolvedValue({
      id: "org_acme", slug: "acme", name: "Acme Renamed",
      display_name: null, brand_url: null, logo_url: null,
      created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z",
    } as never);
    const res = await patchOrg({ name: "Acme Renamed" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.org.name).toBe("Acme Renamed");
    expect(body.caller_role).toBe("admin");
    expect(mockUpdateOrg).toHaveBeenCalledWith("org_acme", { name: "Acme Renamed" });
  });

  it("relays a unique-slug conflict as 409 with code slug_in_use", async () => {
    mockSql.mockResolvedValueOnce([{ org_id: "org_acme", role: "owner" }] as never);
    mockGetRoleInOrg.mockResolvedValue("owner");
    mockUpdateOrg.mockRejectedValue(new Error("duplicate key value violates unique constraint orgs_slug_key"));
    const res = await patchOrg({ slug: "taken" });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe("slug_in_use");
  });
});

// ── me-webhooks.test.ts ─────────────────────────────────────────────
// AR-350 (epic AR-343): session-authed /me/webhooks family. Wraps the
// same module helpers as /v1/webhooks so the underlying CRUD is single-
// source; these tests verify the auth + thin wiring only.

describe("GET /me/webhooks", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "GET", url: "/me/webhooks" });
    expect(res.statusCode).toBe(401);
  });

  it("returns the caller's subscriptions", async () => {
    mockListWebhooks.mockResolvedValue([
      { id: "wh_1", url: "https://example.com/hook", events: ["signal.changed"], status: "active", created_at: "2026-01-01T00:00:00Z", last_success_at: null, last_failure_at: null },
    ] as never);
    const res = await app.inject({ method: "GET", url: "/me/webhooks", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().subscriptions).toHaveLength(1);
    expect(mockListWebhooks).toHaveBeenCalledWith("user_1");
  });
});

describe("POST /me/webhooks", () => {
  function postWebhook(body: unknown) {
    return app.inject({
      method: "POST",
      url: "/me/webhooks",
      headers: { ...SESSION_AUTH, ...JSON_HEADERS },
      payload: JSON.stringify(body),
    });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/me/webhooks", headers: JSON_HEADERS, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s on a non-object body", async () => {
    const res = await app.inject({ method: "POST", url: "/me/webhooks", headers: { ...SESSION_AUTH, ...JSON_HEADERS }, payload: '"hello"' });
    expect(res.statusCode).toBe(400);
  });

  it("400s on an invalid URL", async () => {
    const res = await postWebhook({ url: "ftp://nope", events: ["signal.changed"] });
    expect(res.statusCode).toBe(400);
    expect(mockCreateWebhook).not.toHaveBeenCalled();
  });

  it("400s when events is empty or all unknown", async () => {
    const res = await postWebhook({ url: "https://example.com/hook", events: [] });
    expect(res.statusCode).toBe(400);
    const res2 = await postWebhook({ url: "https://example.com/hook", events: ["bogus"] });
    expect(res2.statusCode).toBe(400);
    expect(mockCreateWebhook).not.toHaveBeenCalled();
  });

  it("201s and returns the new subscription with secret on happy path", async () => {
    mockCreateWebhook.mockResolvedValue({
      id: "wh_2",
      url: "https://example.com/hook",
      events: ["signal.changed"],
      secret: "whsec_abcdef",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
    } as never);
    const res = await postWebhook({ url: "https://example.com/hook", events: ["signal.changed"] });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.secret).toBe("whsec_abcdef");
    expect(mockCreateWebhook).toHaveBeenCalledWith("user_1", "https://example.com/hook", ["signal.changed"]);
  });
});

describe("DELETE /me/webhooks/:id", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/me/webhooks/wh_1" });
    expect(res.statusCode).toBe(401);
  });

  it("404s when the subscription is not found for the caller", async () => {
    mockRevokeWebhook.mockResolvedValue(false);
    const res = await app.inject({ method: "DELETE", url: "/me/webhooks/wh_missing", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(404);
    expect(mockRevokeWebhook).toHaveBeenCalledWith("user_1", "wh_missing");
  });

  it("200s on revoke", async () => {
    mockRevokeWebhook.mockResolvedValue(true);
    const res = await app.inject({ method: "DELETE", url: "/me/webhooks/wh_1", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("POST /me/webhooks/:id/rotate-secret", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/me/webhooks/wh_1/rotate-secret" });
    expect(res.statusCode).toBe(401);
  });

  it("404s when the subscription is not found", async () => {
    mockRotateWebhook.mockResolvedValue(null);
    const res = await app.inject({ method: "POST", url: "/me/webhooks/wh_missing/rotate-secret", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(404);
  });

  it("returns the new secret on happy path", async () => {
    mockRotateWebhook.mockResolvedValue("whsec_newsecret");
    const res = await app.inject({ method: "POST", url: "/me/webhooks/wh_1/rotate-secret", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ secret: "whsec_newsecret" });
    expect(mockRotateWebhook).toHaveBeenCalledWith("user_1", "wh_1");
  });
});

// ── me-score-usage / me-portfolios / me-profile ─────────────────────
// AR-353 (follow-up to AR-351): cover the three lower-risk endpoints
// added in AR-343 that were skipped in the first test pass. Read-only
// or single-field-update, no RBAC gates — but enough behaviour worth
// pinning (preset bucketing, pagination clamps, intent allowlist).

describe("GET /me/score-usage", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "GET", url: "/me/score-usage" });
    expect(res.statusCode).toBe(401);
  });

  it("returns the preset breakdown and a total summed from rows", async () => {
    mockSql.mockResolvedValueOnce([
      { preset: "core", count: 12 },
      { preset: "deep", count: 4 },
      { preset: "unknown", count: 1 },
    ] as never);
    const res = await app.inject({ method: "GET", url: "/me/score-usage", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.window_days).toBe(30);
    expect(body.total).toBe(17);
    expect(body.by_preset).toEqual([
      { preset: "core", count: 12 },
      { preset: "deep", count: 4 },
      { preset: "unknown", count: 1 },
    ]);
  });

  it("returns zero totals when the caller has no score activity", async () => {
    mockSql.mockResolvedValueOnce([] as never);
    const res = await app.inject({ method: "GET", url: "/me/score-usage", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ window_days: 30, total: 0, by_preset: [] });
  });

  it("degrades to an empty result (not 500) when the underlying query throws", async () => {
    mockSql.mockRejectedValueOnce(new Error("db down"));
    const res = await app.inject({ method: "GET", url: "/me/score-usage", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ window_days: 30, total: 0, by_preset: [] });
  });
});

describe("GET /me/portfolios", () => {
  it("401s without a session token", async () => {
    const res = await app.inject({ method: "GET", url: "/me/portfolios" });
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty page when the caller has no portfolios", async () => {
    mockSql
      .mockResolvedValueOnce([{ total: 0 }] as never) // count
      .mockResolvedValueOnce([] as never);             // portfolios page
    const res = await app.inject({ method: "GET", url: "/me/portfolios", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ portfolios: [], total: 0, page: 1, page_size: 20 });
  });

  it("inline-joins areas and rolls up area_count per portfolio", async () => {
    mockSql
      .mockResolvedValueOnce([{ total: 2 }] as never)
      .mockResolvedValueOnce([
        { id: "p_1", name: "London", created_at: "2026-01-01", updated_at: "2026-01-02" },
        { id: "p_2", name: "Manchester", created_at: "2026-01-03", updated_at: "2026-01-03" },
      ] as never)
      .mockResolvedValueOnce([
        { id: "pa_1", portfolio_id: "p_1", area: "SW1A 1AA", label: "Westminster", created_at: "2026-01-01" },
        { id: "pa_2", portfolio_id: "p_1", area: "EC1A 1BB", label: null, created_at: "2026-01-02" },
        { id: "pa_3", portfolio_id: "p_2", area: "M1 1AA", label: "City", created_at: "2026-01-03" },
      ] as never);
    const res = await app.inject({ method: "GET", url: "/me/portfolios", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.portfolios).toHaveLength(2);
    expect(body.portfolios[0]).toMatchObject({ id: "p_1", area_count: 2 });
    expect(body.portfolios[0].areas).toHaveLength(2);
    expect(body.portfolios[1]).toMatchObject({ id: "p_2", area_count: 1 });
  });

  it("clamps page_size to 100 max and 1 min, and accepts ?q for search", async () => {
    mockSql
      .mockResolvedValueOnce([{ total: 0 }] as never)
      .mockResolvedValueOnce([] as never);
    const res = await app.inject({ method: "GET", url: "/me/portfolios?page=2&page_size=500&q=lon", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().page_size).toBe(100);
    expect(res.json().page).toBe(2);
  });

  it("falls back to page=1 / page_size=20 on garbage query params", async () => {
    mockSql
      .mockResolvedValueOnce([{ total: 0 }] as never)
      .mockResolvedValueOnce([] as never);
    const res = await app.inject({ method: "GET", url: "/me/portfolios?page=oops&page_size=-5", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.page).toBe(1);
    expect(body.page_size).toBe(1); // -5 clamped to min 1, matching the route's Math.max(1, ...) guard
  });

  it("degrades to an empty page (not 500) when the count query throws", async () => {
    mockSql.mockRejectedValueOnce(new Error("db down"));
    const res = await app.inject({ method: "GET", url: "/me/portfolios", headers: SESSION_AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ portfolios: [], total: 0, page: 1, page_size: 20 });
  });
});

describe("PATCH /me/profile", () => {
  function patchProfile(body: unknown) {
    return app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: { ...SESSION_AUTH, ...JSON_HEADERS },
      payload: JSON.stringify(body),
    });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/me/profile",
      headers: JSON_HEADERS,
      payload: "{}",
    });
    expect(res.statusCode).toBe(401);
  });

  it("200s and no-ops on an empty body", async () => {
    const res = await patchProfile({});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("200s and no-ops on intents=null (the welcome-flow skippable case)", async () => {
    const res = await patchProfile({ intents: null });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s when intents is not an array", async () => {
    const res = await patchProfile({ intents: "moving" });
    expect(res.statusCode).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s on an unknown intent slug", async () => {
    const res = await patchProfile({ intents: ["moving", "vibing"] });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain("vibing");
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("400s when an intents entry is not a string", async () => {
    const res = await patchProfile({ intents: ["moving", 42] });
    expect(res.statusCode).toBe(400);
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("writes the dedup'd CSV on the happy path", async () => {
    mockSql.mockResolvedValueOnce([] as never);
    const res = await patchProfile({ intents: ["moving", "investing", "moving"] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSql).toHaveBeenCalledTimes(1);
    /* The route uses a tagged template — assert on the parameter array
       that follows the strings array. The CSV preserves order of first
       appearance and drops the duplicate. */
    const callArgs = mockSql.mock.calls[0] as unknown[];
    expect(callArgs[1]).toBe("moving,investing");
    expect(callArgs[2]).toBe("user_1");
  });

  it("accepts an empty intents array and skips the UPDATE", async () => {
    const res = await patchProfile({ intents: [] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(mockSql).not.toHaveBeenCalled();
  });
});
