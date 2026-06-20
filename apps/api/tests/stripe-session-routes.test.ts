import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/auth/session-token", () => ({ verifySessionToken: vi.fn() }));
vi.mock("@/modules/usage", () => ({ getStripeCustomerId: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
// stripe-client kept REAL — it connects to the stripe-mock Docker service.

import { buildApp } from "@/app";
import { verifySessionToken } from "@/modules/auth/session-token";
import { getStripeCustomerId } from "@/modules/usage";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";
import { APP_URL } from "@/infrastructure/config";

const app = await buildApp();

const mockVerify = vi.mocked(verifySessionToken);
const mockCustomer = vi.mocked(getStripeCustomerId);
const mockSql = vi.mocked(sql);

const AUTH = { authorization: "Bearer session.jwt.token" };

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
