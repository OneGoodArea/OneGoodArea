import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("./stripe-client", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  },
}));
vi.mock("../../infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("../tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("../tracking/structured-logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { handleStripeWebhook } from "./webhook-handler";
import { stripe } from "./stripe-client";
import { sql } from "../../infrastructure/db/client";
import { trackEvent } from "../tracking/activity";

const mockConstruct = vi.mocked(stripe.webhooks.constructEvent);
const mockRetrieve = vi.mocked(stripe.subscriptions.retrieve);
const mockSql = vi.mocked(sql);

/** Find sql tagged-template calls whose query text contains `substr`. */
function sqlCalls(substr: string) {
  return mockSql.mock.calls.filter((c) =>
    (c[0] as unknown as string[]).join("?").includes(substr),
  );
}

/** A Stripe subscription object with valid unix-second period fields. */
const liveSub = {
  id: "sub_live",
  customer: "cus_1",
  status: "active",
  current_period_start: 1700000000,
  current_period_end: 1702592000,
};

function event(type: string, object: Record<string, unknown>, id = "evt_1") {
  return { id, type, data: { object } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  // Default: not previously processed, all writes succeed.
  mockSql.mockResolvedValue([] as never);
  mockRetrieve.mockResolvedValue(liveSub as never);
});

afterAll(() => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

describe("handleStripeWebhook", () => {
  it("500s when the webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await handleStripeWebhook("{}", "sig");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Webhook secret not configured" });
    expect(mockConstruct).not.toHaveBeenCalled();
  });

  it("400s on an invalid signature and never touches the DB", async () => {
    mockConstruct.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid signature" });
    expect(mockSql).not.toHaveBeenCalled();
  });

  it("verifies the signature with the raw body + secret", async () => {
    mockConstruct.mockReturnValue(event("ping", {}) as never);
    await handleStripeWebhook("the-raw-body", "t=1,v1=abc");
    expect(mockConstruct).toHaveBeenCalledWith("the-raw-body", "t=1,v1=abc", "whsec_test");
  });

  it("deduplicates an already-processed event (no reprocessing)", async () => {
    mockConstruct.mockReturnValue(event("checkout.session.completed", { metadata: {} }) as never);
    mockSql.mockResolvedValueOnce([{ id: "evt_1" }] as never); // isEventAlreadyProcessed -> found
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true, deduplicated: true });
    expect(sqlCalls("INSERT INTO webhook_events")).toHaveLength(0);
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it("checkout.session.completed (main plan): upserts subscriptions + tracks the upgrade", async () => {
    mockConstruct.mockReturnValue(
      event("checkout.session.completed", {
        metadata: { user_id: "user_1", plan: "build" },
        subscription: "sub_x",
        customer: "cus_1",
      }) as never,
    );
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(mockRetrieve).toHaveBeenCalledWith("sub_x");
    expect(trackEvent).toHaveBeenCalledWith("plan.upgraded", "user_1", { plan: "build" });
    expect(sqlCalls("INSERT INTO subscriptions")).toHaveLength(1);
    // Marked processed.
    const recorded = sqlCalls("INSERT INTO webhook_events");
    expect(recorded).toHaveLength(1);
    expect(recorded[0][3]).toBe("processed");
  });

  it("checkout.session.completed (add-on): inserts subscription_addons + tracks the purchase", async () => {
    mockConstruct.mockReturnValue(
      event("checkout.session.completed", {
        metadata: { user_id: "user_1", addon: "mcp" },
        subscription: "sub_addon",
        customer: "cus_1",
      }) as never,
    );
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(200);
    expect(mockRetrieve).toHaveBeenCalledWith("sub_addon");
    expect(trackEvent).toHaveBeenCalledWith("addon.purchased", "user_1", { addon: "mcp" });
    expect(sqlCalls("INSERT INTO subscription_addons")).toHaveLength(1);
    // The add-on branch must NOT touch the main plan row.
    expect(sqlCalls("INSERT INTO subscriptions")).toHaveLength(0);
  });

  it("customer.subscription.updated (main plan): updates the subscription row", async () => {
    mockConstruct.mockReturnValue(
      event("customer.subscription.updated", { ...liveSub, metadata: {} }) as never,
    );
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(200);
    expect(sqlCalls("UPDATE subscriptions")).toHaveLength(1);
    expect(sqlCalls("UPDATE subscription_addons")).toHaveLength(0);
  });

  it("customer.subscription.updated (add-on): mirrors status into the addon row", async () => {
    mockConstruct.mockReturnValue(
      event("customer.subscription.updated", { ...liveSub, metadata: { addon: "mcp" } }) as never,
    );
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(200);
    expect(sqlCalls("UPDATE subscription_addons")).toHaveLength(1);
    expect(sqlCalls("UPDATE subscriptions")).toHaveLength(0);
  });

  it("customer.subscription.deleted (main plan): reverts the plan to sandbox", async () => {
    mockConstruct.mockReturnValue(
      event("customer.subscription.deleted", { ...liveSub, metadata: {} }) as never,
    );
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(200);
    const reverts = sqlCalls("plan = 'sandbox'");
    expect(reverts).toHaveLength(1);
  });

  it("500s and records a failure when processing throws (so Stripe retries)", async () => {
    // An empty subscription object makes new Date(undefined*1000).toISOString()
    // throw inside the try -> the SUT's own catch runs (no rejecting mock, per
    // the vitest gotcha).
    mockRetrieve.mockResolvedValue({} as never);
    mockConstruct.mockReturnValue(
      event("checkout.session.completed", {
        metadata: { user_id: "user_1", plan: "build" },
        subscription: "sub_x",
        customer: "cus_1",
      }) as never,
    );
    const res = await handleStripeWebhook("raw", "sig");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Webhook processing failed" });
    const recorded = sqlCalls("INSERT INTO webhook_events");
    expect(recorded).toHaveLength(1);
    expect(recorded[0][3]).toBe("failed"); // status param
  });
});
