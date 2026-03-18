import { describe, it, expect } from "vitest";
import { asSubscription, asCheckoutSession } from "./stripe-types";

describe("stripe-types", () => {
  describe("asSubscription", () => {
    it("extracts subscription fields from a raw object", () => {
      const raw = {
        id: "sub_123",
        customer: "cus_456",
        status: "active",
        cancel_at_period_end: false,
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        extra_field: "ignored",
      };
      const sub = asSubscription(raw);
      expect(sub.id).toBe("sub_123");
      expect(sub.customer).toBe("cus_456");
      expect(sub.status).toBe("active");
      expect(sub.cancel_at_period_end).toBe(false);
      expect(sub.current_period_start).toBe(1700000000);
      expect(sub.current_period_end).toBe(1702592000);
    });

    it("works with cancelled subscriptions", () => {
      const raw = {
        id: "sub_789",
        customer: "cus_101",
        status: "canceled",
        cancel_at_period_end: true,
        current_period_start: 1700000000,
        current_period_end: 1702592000,
      };
      const sub = asSubscription(raw);
      expect(sub.status).toBe("canceled");
      expect(sub.cancel_at_period_end).toBe(true);
    });
  });

  describe("asCheckoutSession", () => {
    it("extracts checkout session fields", () => {
      const raw = {
        customer: "cus_456",
        subscription: "sub_123",
        metadata: { user_id: "user_001", plan: "starter" },
        extra: "ignored",
      };
      const session = asCheckoutSession(raw);
      expect(session.customer).toBe("cus_456");
      expect(session.subscription).toBe("sub_123");
      expect(session.metadata?.user_id).toBe("user_001");
      expect(session.metadata?.plan).toBe("starter");
    });

    it("handles null subscription", () => {
      const raw = {
        customer: "cus_456",
        subscription: null,
        metadata: null,
      };
      const session = asCheckoutSession(raw);
      expect(session.subscription).toBeNull();
      expect(session.metadata).toBeNull();
    });
  });
});
