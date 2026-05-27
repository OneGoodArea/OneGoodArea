import { describe, it, expect } from "vitest";
import { asSubscription, asCheckoutSession } from "./stripe-types";

/* Boundary cast helpers — they narrow `unknown` to the typed field shapes
   without copying. The contract worth pinning: identity pass-through (so the
   webhook handler reads live Stripe objects, not snapshots) + field access. */

describe("stripe-types boundary casts", () => {
  it("asSubscription passes the object through and exposes the typed fields", () => {
    const raw = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      current_period_start: 1700000000,
      current_period_end: 1702592000,
      extra: "ignored",
    };
    const s = asSubscription(raw);
    expect(s).toBe(raw); // identity cast, no copy
    expect(s.id).toBe("sub_1");
    expect(s.customer).toBe("cus_1");
    expect(s.current_period_end).toBe(1702592000);
  });

  it("asCheckoutSession passes the object through and exposes the typed fields", () => {
    const raw = { customer: "cus_1", subscription: "sub_1", metadata: { user_id: "u1", plan: "build" } };
    const s = asCheckoutSession(raw);
    expect(s).toBe(raw);
    expect(s.subscription).toBe("sub_1");
    expect(s.metadata?.user_id).toBe("u1");
  });
});
