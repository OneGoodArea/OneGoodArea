import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { mockReset, mockExpect, getCalls } from "../stripe-mock-control";
import { server } from "../msw-server";

/* Stripe route tests (checkout / addon-checkout / portal / cancel).
 *
 * These run against the local stripe-mock service (a project-controlled
 * double wired via STRIPE_API_BASE_URL in compose.test.yml — never leaves the
 * network). The real Stripe SDK makes the HTTP calls, so we close MSW for this
 * suite: MSW's Node HTTP interception otherwise hangs the SDK's keep-alive
 * socket.
 *
 * Checkout and session-route tests live together in ONE file on purpose: the
 * mock holds a single set of expectations/recorded calls, so two test files
 * hitting it in parallel (Vitest parallelises across files) would stomp on each
 * other. Within one file, tests run serially and beforeEach gives each a clean
 * mock. */

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  getUserEmail: vi.fn(),
  hasAddon: vi.fn(),
  getUserPlan: vi.fn(),
  getStripeCustomerId: vi.fn(),
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
// billing/plans kept REAL so PLANS / ADDONS / V2_PAID_PLANS reflect production.
// stripe-client also kept REAL — it connects to the stripe-mock service.

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { getUserEmail, hasAddon, getUserPlan, getStripeCustomerId } from "@/modules/usage";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";
import { APP_URL } from "@/infrastructure/config";

beforeAll(() => server.close());
afterAll(() => server.listen({ onUnhandledRequest: "error" }));

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockEmail = vi.mocked(getUserEmail);
const mockHasAddon = vi.mocked(hasAddon);
const mockGetPlan = vi.mocked(getUserPlan);
const mockCustomer = vi.mocked(getStripeCustomerId);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };

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
    await mockExpect("POST", "/v1/customers", 200, { id: "cus_new" });
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

describe("POST /stripe/portal", () => {
  function post(headers: Record<string, string> = AUTH) {
    return app.inject({ method: "POST", url: "/stripe/portal", headers });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/stripe/portal" });
    expect(res.statusCode).toBe(401);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("401s on an invalid session token", async () => {
    mockVerify.mockResolvedValue(null);
    expect((await post()).statusCode).toBe(401);
  });

  it("400s when the user has no billing account", async () => {
    mockCustomer.mockResolvedValue(null);
    const res = await post();
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("No billing account");
  });

  it("returns a portal URL pointing back at the frontend dashboard", async () => {
    mockCustomer.mockResolvedValue("cus_1");
    await mockExpect("POST", "/v1/billing_portal/sessions", 200, { url: "https://billing.stripe.com/p/session_1" });

    const res = await post();
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("https://billing.stripe.com/p/session_1");

    const calls = await getCalls();
    const portalCall = calls.find((c) => c.method === "POST" && c.path === "/v1/billing_portal/sessions");
    expect(portalCall).toBeDefined();
    expect(portalCall!.body).toMatchObject({
      customer: "cus_1",
      return_url: `${APP_URL}/dashboard`,
    });
  });
});

describe("POST /stripe/cancel", () => {
  function post(headers: Record<string, string> = AUTH) {
    return app.inject({ method: "POST", url: "/stripe/cancel", headers });
  }

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/stripe/cancel" });
    expect(res.statusCode).toBe(401);
  });

  it("404s when there is no active subscription", async () => {
    mockSql.mockResolvedValue([] as never);
    const res = await post();
    expect(res.statusCode).toBe(404);

    const calls = await getCalls();
    const subRetrieveCall = calls.find((c) => c.method === "GET" && c.path?.startsWith("/v1/subscriptions/"));
    expect(subRetrieveCall).toBeUndefined();
  });

  it("409s when already scheduled for cancellation", async () => {
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_1", plan: "build" }] as never);
    await mockExpect("GET", "/v1/subscriptions/sub_1", 200, {
      cancel_at_period_end: true,
      current_period_end: 1735689600,
    });

    const res = await post();
    expect(res.statusCode).toBe(409);
    expect(res.json().cancel_at).toBe(new Date(1735689600 * 1000).toISOString());

    const calls = await getCalls();
    const subUpdateCall = calls.find((c) => c.method === "POST" && c.path === "/v1/subscriptions/sub_1");
    expect(subUpdateCall).toBeUndefined();
  });

  it("schedules cancellation at period end and records the event", async () => {
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_1", plan: "build" }] as never);
    await mockExpect("GET", "/v1/subscriptions/sub_1", 200, { cancel_at_period_end: false, current_period_end: 1 });
    await mockExpect("POST", "/v1/subscriptions/sub_1", 200, { cancel_at_period_end: true, current_period_end: 1735689600 });

    const res = await post();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.cancel_at).toBe(new Date(1735689600 * 1000).toISOString());

    const calls = await getCalls();
    const subUpdateCall = calls.find((c) => c.method === "POST" && c.path === "/v1/subscriptions/sub_1");
    expect(subUpdateCall).toBeDefined();
    expect(subUpdateCall!.body).toMatchObject({ cancel_at_period_end: true });

    expect(trackEvent).toHaveBeenCalledWith(
      "plan.cancel_scheduled",
      "user_1",
      expect.objectContaining({ plan: "build" }),
    );
  });
});
