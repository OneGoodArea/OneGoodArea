import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  getUserEmail: vi.fn(),
  hasAddon: vi.fn(),
  getUserPlan: vi.fn(),
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
// billing/plans kept REAL so PLANS / ADDONS / V2_PAID_PLANS reflect production.
// stripe-client also kept REAL — it connects to the stripe-mock Docker service.

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { getUserEmail, hasAddon, getUserPlan } from "@/modules/usage";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";
import { APP_URL } from "@/infrastructure/config";

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockEmail = vi.mocked(getUserEmail);
const mockHasAddon = vi.mocked(hasAddon);
const mockGetPlan = vi.mocked(getUserPlan);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };

/** Base URL of the stripe-mock service for control API calls. */
const MOCK_URL = process.env.STRIPE_API_BASE_URL || "http://localhost:12111";

async function mockReset() {
  await fetch(`${MOCK_URL}/__test/reset`, { method: "POST" });
}

async function mockExpect(method: string, path: string, status = 200, body: unknown = {}) {
  await fetch(`${MOCK_URL}/__test/expect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, path, status, body }),
  });
}

async function getCalls() {
  const res = await fetch(`${MOCK_URL}/__test/calls`);
  return res.json() as Promise<Array<{ method: string; path: string; body: unknown }>>;
}

beforeEach(async () => {
  vi.clearAllMocks();
  await mockReset();
  mockVerify.mockResolvedValue({ userId: "user_1" });
  mockEmail.mockResolvedValue("user@example.com");
  mockSql.mockResolvedValue([] as never);
});

describe("POST /stripe/checkout", () => {
  function post(body: unknown, headers: Record<string, string> = AUTH) {
    return app.inject({ method: "POST", url: "/stripe/checkout", headers, payload: JSON.stringify(body) });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/stripe/checkout", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s on an invalid / non-self-serve plan", async () => {
    expect((await post({ plan: "bogus" })).statusCode).toBe(400);
    expect((await post({ plan: "enterprise" })).statusCode).toBe(400);
    expect((await post({})).statusCode).toBe(400);
  });

  it("new customer: creates customer + checkout session pointing at the frontend", async () => {
    await mockExpect("POST", "/v1/customers", 200, { id: "cus_new" });
    await mockExpect("POST", "/v1/checkout/sessions", 200, { url: "https://checkout.stripe.com/c/sess_1" });

    const res = await post({ plan: "build" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("https://checkout.stripe.com/c/sess_1");

    const calls = await getCalls();
    const customerCall = calls.find((c) => c.method === "POST" && c.path === "/v1/customers");
    expect(customerCall).toBeDefined();
    expect(customerCall!.body).toMatchObject({
      email: "user@example.com",
      metadata: { user_id: "user_1" },
    });

    const checkoutCall = calls.find((c) => c.method === "POST" && c.path === "/v1/checkout/sessions");
    expect(checkoutCall).toBeDefined();
    expect(checkoutCall!.body).toMatchObject({
      success_url: `${APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${APP_URL}/pricing`,
      metadata: { user_id: "user_1", plan: "build" },
    });

    expect(trackEvent).toHaveBeenCalledWith("plan.upgrade.started", "user_1", { plan: "build" });
  });

  it("existing active subscription: swaps the plan in place (proration), no new checkout", async () => {
    mockSql.mockResolvedValueOnce([{ stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" }] as never);
    await mockExpect("GET", "/v1/subscriptions/sub_1", 200, { status: "active", items: { data: [{ id: "si_1" }] } });
    await mockExpect("POST", "/v1/subscriptions/sub_1", 200, {});

    const res = await post({ plan: "scale" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("/dashboard?upgraded=true");

    const calls = await getCalls();
    const subRetrieveCall = calls.find((c) => c.method === "GET" && c.path === "/v1/subscriptions/sub_1");
    expect(subRetrieveCall).toBeDefined();

    const subUpdateCall = calls.find((c) => c.method === "POST" && c.path === "/v1/subscriptions/sub_1");
    expect(subUpdateCall).toBeDefined();
    expect(subUpdateCall!.body).toMatchObject({
      items: [{ id: "si_1", price: expect.any(String) }],
      proration_behavior: "create_prorations",
    });

    const checkoutCall = calls.find((c) => c.path === "/v1/checkout/sessions");
    expect(checkoutCall).toBeUndefined();

    expect(trackEvent).toHaveBeenCalledWith("plan.changed", "user_1", { plan: "scale" });
  });
});

describe("POST /stripe/addon-checkout", () => {
  function post(body: unknown, headers: Record<string, string> = AUTH) {
    return app.inject({ method: "POST", url: "/stripe/addon-checkout", headers, payload: JSON.stringify(body) });
  }

  beforeEach(() => {
    mockHasAddon.mockResolvedValue(false);
    mockGetPlan.mockResolvedValue("sandbox");
  });

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/stripe/addon-checkout", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("400s on an unsupported addon", async () => {
    expect((await post({ addon: "bogus" })).statusCode).toBe(400);
  });

  it("short-circuits (200) when the add-on is already owned", async () => {
    mockHasAddon.mockResolvedValue(true);
    const res = await post({ addon: "mcp" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ already_owned: true });

    const calls = await getCalls();
    const checkoutCall = calls.find((c) => c.path === "/v1/checkout/sessions");
    expect(checkoutCall).toBeUndefined();
  });

  it("short-circuits (200) when the plan already includes the entitlement", async () => {
    mockGetPlan.mockResolvedValue("growth_v2"); // mcpAccess: true
    const res = await post({ addon: "mcp" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ plan_includes: true });

    const calls = await getCalls();
    const checkoutCall = calls.find((c) => c.path === "/v1/checkout/sessions");
    expect(checkoutCall).toBeUndefined();
  });

  it("creates an isolated add-on subscription checkout with addon metadata", async () => {
    await mockExpect("POST", "/v1/checkout/sessions", 200, { url: "https://checkout.stripe.com/c/sess_1" });

    const res = await post({ addon: "mcp" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("https://checkout.stripe.com/c/sess_1");

    const calls = await getCalls();
    const checkoutCall = calls.find((c) => c.method === "POST" && c.path === "/v1/checkout/sessions");
    expect(checkoutCall).toBeDefined();
    expect(checkoutCall!.body).toMatchObject({
      metadata: { user_id: "user_1", addon: "mcp" },
      subscription_data: { metadata: { user_id: "user_1", addon: "mcp" } },
      success_url: `${APP_URL}/dashboard?addon=mcp&purchased=1`,
    });

    expect(trackEvent).toHaveBeenCalledWith("addon.purchase.started", "user_1", { addon: "mcp" });
  });
});
