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
/* AR-596 (Plan 059.4): these routes now also accept a real API key
   (bearerAuth) as a fallback when the session JWT doesn't verify. Mock it
   so that fallback resolves deterministically instead of hitting the real
   DB-backed implementation. */
vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
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
import { validateApiKey } from "@/modules/api-keys";
import { getUserEmail, hasAddon, getUserPlan, getStripeCustomerId } from "@/modules/usage";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";
import { APP_URL } from "@/infrastructure/config";

beforeAll(() => server.close());
afterAll(() => server.listen({ onUnhandledRequest: "error" }));

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockValidateKey = vi.mocked(validateApiKey);
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
  mockValidateKey.mockResolvedValue(null); // AR-596: no session -> OR-auth falls back to this
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

  // AR-489: OneGoodArea is demo-led; self-serve checkout is disabled. Every
  // authenticated attempt is rejected with 403 self_serve_disabled regardless
  // of plan, and no Stripe call is made.
  it("403s self_serve_disabled for any plan", async () => {
    for (const plan of ["build", "scale", "growth_v2", "developer", "bogus"]) {
      const res = await post({ plan });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe("self_serve_disabled");
    }
  });
});

describe("POST /stripe/addon-checkout", () => {
  function post(body: unknown, headers: Record<string, string> = AUTH) {
    return app.inject({ method: "POST", url: "/stripe/addon-checkout", headers, payload: JSON.stringify(body) });
  }

  beforeEach(() => {
    mockHasAddon.mockResolvedValue(false);
    // AR-487: sandbox now includes MCP, so it short-circuits (plan_includes).
    // Use "build" for the add-on flow: a paid tier that genuinely lacks MCP.
    mockGetPlan.mockResolvedValue("build");
  });

  it("401s without a session token", async () => {
    const res = await app.inject({ method: "POST", url: "/stripe/addon-checkout", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  // AR-489: the MCP add-on is retired (MCP is included on every package). Every
  // authenticated attempt is rejected with 403 addon_retired; no Stripe call.
  it("403s addon_retired for any addon", async () => {
    for (const addon of ["mcp", "bogus"]) {
      const res = await post({ addon });
      expect(res.statusCode).toBe(403);
      expect(res.json().code).toBe("addon_retired");
    }
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
