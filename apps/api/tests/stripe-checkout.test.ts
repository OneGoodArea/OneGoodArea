import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  getUserEmail: vi.fn(),
  hasAddon: vi.fn(),
  getUserPlan: vi.fn(),
}));
vi.mock("@/modules/billing/stripe-client", () => ({
  stripe: {
    customers: { retrieve: vi.fn(), create: vi.fn() },
    subscriptions: { retrieve: vi.fn(), update: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  },
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
// billing/plans kept REAL so PLANS / ADDONS / V2_PAID_PLANS reflect production.

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { getUserEmail, hasAddon, getUserPlan } from "@/modules/usage";
import { stripe } from "@/modules/billing/stripe-client";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockEmail = vi.mocked(getUserEmail);
const mockHasAddon = vi.mocked(hasAddon);
const mockGetPlan = vi.mocked(getUserPlan);
const mockCustomerCreate = vi.mocked(stripe.customers.create);
const mockSubRetrieve = vi.mocked(stripe.subscriptions.retrieve);
const mockSubUpdate = vi.mocked(stripe.subscriptions.update);
const mockCheckoutCreate = vi.mocked(stripe.checkout.sessions.create);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt", "content-type": "application/json" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
  mockEmail.mockResolvedValue("user@example.com");
  mockSql.mockResolvedValue([] as never);
  mockCustomerCreate.mockResolvedValue({ id: "cus_new" } as never);
  mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/sess_1" } as never);
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
    const res = await post({ plan: "build" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("https://checkout.stripe.com/c/sess_1");
    expect(mockCustomerCreate).toHaveBeenCalledWith({
      email: "user@example.com",
      metadata: { user_id: "user_1" },
    });
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://www.onegoodarea.com/dashboard?upgraded=true",
        cancel_url: "https://www.onegoodarea.com/pricing",
        metadata: { user_id: "user_1", plan: "build" },
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith("plan.upgrade.started", "user_1", { plan: "build" });
  });

  it("existing active subscription: swaps the plan in place (proration), no new checkout", async () => {
    mockSql.mockResolvedValueOnce([{ stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1" }] as never);
    mockSubRetrieve.mockResolvedValue({ status: "active", items: { data: [{ id: "si_1" }] } } as never);
    const res = await post({ plan: "scale" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("/dashboard?upgraded=true");
    expect(mockSubUpdate).toHaveBeenCalledWith("sub_1", {
      items: [{ id: "si_1", price: expect.any(String) }],
      proration_behavior: "create_prorations",
    });
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
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
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("short-circuits (200) when the plan already includes the entitlement", async () => {
    mockGetPlan.mockResolvedValue("growth_v2"); // mcpAccess: true
    const res = await post({ addon: "mcp" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ plan_includes: true });
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("creates an isolated add-on subscription checkout with addon metadata", async () => {
    const res = await post({ addon: "mcp" });
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("https://checkout.stripe.com/c/sess_1");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { user_id: "user_1", addon: "mcp" },
        subscription_data: { metadata: { user_id: "user_1", addon: "mcp" } },
        success_url: "https://www.onegoodarea.com/dashboard?addon=mcp&purchased=1",
      }),
    );
    expect(trackEvent).toHaveBeenCalledWith("addon.purchase.started", "user_1", { addon: "mcp" });
  });
});
