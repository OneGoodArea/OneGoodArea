import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  canGenerateReport: vi.fn(),
  getUserPlan: vi.fn(),
  hasApiAccess: vi.fn(),
}));
vi.mock("@/modules/billing/stripe-client", () => ({
  stripe: { subscriptions: { retrieve: vi.fn() } },
}));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
// billing/plans kept real so PLANS reflects production.

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { canGenerateReport, getUserPlan, hasApiAccess } from "@/modules/usage";
import { stripe } from "@/modules/billing/stripe-client";
import { sql } from "@/infrastructure/db/client";

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockQuota = vi.mocked(canGenerateReport);
const mockGetPlan = vi.mocked(getUserPlan);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockSubRetrieve = vi.mocked(stripe.subscriptions.retrieve);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
});

describe("GET /usage", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/usage" })).statusCode).toBe(401);
  });

  it("returns the caller's quota usage", async () => {
    mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 3, limit: 35 } as never);
    const res = await app.inject({ method: "GET", url: "/usage", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ allowed: true, used: 3, limit: 35 });
  });
});

describe("GET /settings/subscription", () => {
  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/settings/subscription" })).statusCode).toBe(401);
  });

  it("reports plan with no Stripe subscription", async () => {
    mockGetPlan.mockResolvedValue("sandbox");
    mockSql.mockResolvedValue([] as never);
    const res = await app.inject({ method: "GET", url: "/settings/subscription", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plan).toBe("sandbox");
    expect(body.planName).toBe("Sandbox");
    expect(body.hasStripeSubscription).toBe(false);
    expect(body.cancelAt).toBeNull();
    expect(mockSubRetrieve).not.toHaveBeenCalled();
  });

  it("surfaces a scheduled cancellation date from Stripe", async () => {
    mockGetPlan.mockResolvedValue("build");
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_1" }] as never);
    mockSubRetrieve.mockResolvedValue({ cancel_at_period_end: true, current_period_end: 1735689600 } as never);
    const res = await app.inject({ method: "GET", url: "/settings/subscription", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.hasStripeSubscription).toBe(true);
    expect(body.cancelAt).toBe(new Date(1735689600 * 1000).toISOString());
  });

  it("treats a missing Stripe subscription as no cancellation (swallows the error)", async () => {
    mockGetPlan.mockResolvedValue("build");
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_gone" }] as never);
    mockSubRetrieve.mockRejectedValue(new Error("No such subscription"));
    const res = await app.inject({ method: "GET", url: "/settings/subscription", headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().cancelAt).toBeNull();
  });
});

describe("GET /keys/usage", () => {
  beforeEach(() => {
    mockApiAccess.mockResolvedValue(true);
    mockGetPlan.mockResolvedValue("build");
  });

  it("401s without a session token", async () => {
    expect((await app.inject({ method: "GET", url: "/keys/usage" })).statusCode).toBe(401);
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await app.inject({ method: "GET", url: "/keys/usage", headers: AUTH });
    expect(res.statusCode).toBe(403);
  });

  it("aggregates totals, a full 30-day series, and active keys", async () => {
    // Five queries in order: total, month, byDay, last, keys.
    mockSql
      .mockResolvedValueOnce([{ count: 42 }] as never)
      .mockResolvedValueOnce([{ count: 7 }] as never)
      .mockResolvedValueOnce([{ day: new Date().toISOString(), count: 5 }] as never)
      .mockResolvedValueOnce([{ created_at: "2026-05-20T00:00:00.000Z" }] as never)
      .mockResolvedValueOnce([
        { id: "key_1", key_preview: "oga_abcd", name: "Default", created_at: "2026-01-01", last_used_at: null },
      ] as never);

    const res = await app.inject({ method: "GET", url: "/keys/usage", headers: AUTH });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalRequests).toBe(42);
    expect(body.requestsThisMonth).toBe(7);
    expect(body.monthlyLimit).toBe(6000); // Build plan
    expect(body.dailyData).toHaveLength(30); // zero-filled
    expect(body.keys).toEqual([
      { id: "key_1", key_preview: "oga_abcd", name: "Default", created_at: "2026-01-01", last_used_at: null },
    ]);
  });
});
