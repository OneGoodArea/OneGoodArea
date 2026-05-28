import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({ getStripeCustomerId: vi.fn() }));
vi.mock("@/modules/billing/stripe-client", () => ({
  stripe: {
    billingPortal: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { getStripeCustomerId } from "@/modules/usage";
import { stripe } from "@/modules/billing/stripe-client";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";

const app = buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockCustomer = vi.mocked(getStripeCustomerId);
const mockPortalCreate = vi.mocked(stripe.billingPortal.sessions.create);
const mockSubRetrieve = vi.mocked(stripe.subscriptions.retrieve);
const mockSubUpdate = vi.mocked(stripe.subscriptions.update);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt.token" };

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockResolvedValue({ userId: "user_1" });
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
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/p/session_1" } as never);
    const res = await post();
    expect(res.statusCode).toBe(200);
    expect(res.json().url).toBe("https://billing.stripe.com/p/session_1");
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_1",
      return_url: "https://www.onegoodarea.com/dashboard",
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
    expect(mockSubRetrieve).not.toHaveBeenCalled();
  });

  it("409s when already scheduled for cancellation", async () => {
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_1", plan: "build" }] as never);
    mockSubRetrieve.mockResolvedValue({
      cancel_at_period_end: true,
      current_period_end: 1735689600,
    } as never);
    const res = await post();
    expect(res.statusCode).toBe(409);
    expect(res.json().cancel_at).toBe(new Date(1735689600 * 1000).toISOString());
    expect(mockSubUpdate).not.toHaveBeenCalled();
  });

  it("schedules cancellation at period end and records the event", async () => {
    mockSql.mockResolvedValue([{ stripe_subscription_id: "sub_1", plan: "build" }] as never);
    mockSubRetrieve.mockResolvedValue({ cancel_at_period_end: false, current_period_end: 1 } as never);
    mockSubUpdate.mockResolvedValue({ cancel_at_period_end: true, current_period_end: 1735689600 } as never);
    const res = await post();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.cancel_at).toBe(new Date(1735689600 * 1000).toISOString());
    expect(mockSubUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    expect(trackEvent).toHaveBeenCalledWith(
      "plan.cancel_scheduled",
      "user_1",
      expect.objectContaining({ plan: "build" }),
    );
  });
});
