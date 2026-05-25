import { describe, it, expect, vi } from "vitest";
import { SUPERUSER_EMAILS, RATE_LIMITS, PLAN_PRICES_GBP, EMAIL_FROM } from "../lib/config";

// Mock Stripe SDK so importing stripe.ts doesn't require a real API key
vi.mock("stripe", () => ({
  default: class {
    constructor() { return {}; }
  },
}));

import { PLANS } from "../lib/stripe";

describe("config", () => {
  describe("SUPERUSER_EMAILS", () => {
    it("contains at least one email", () => {
      expect(SUPERUSER_EMAILS.length).toBeGreaterThan(0);
    });

    it("all entries are valid email format", () => {
      for (const email of SUPERUSER_EMAILS) {
        expect(email).toMatch(/@/);
      }
    });
  });

  describe("RATE_LIMITS", () => {
    it("all limits have positive max and windowSeconds", () => {
      for (const [key, limit] of Object.entries(RATE_LIMITS)) {
        expect(limit.max, `${key}.max`).toBeGreaterThan(0);
        expect(limit.windowSeconds, `${key}.windowSeconds`).toBeGreaterThan(0);
      }
    });

    it("API report limit is higher than web report limit", () => {
      expect(RATE_LIMITS.apiReport.max).toBeGreaterThan(RATE_LIMITS.report.max);
    });
  });

  describe("PLAN_PRICES_GBP", () => {
    it("covers all paid plans", () => {
      const expectedPlans = ["starter", "pro", "developer", "business", "growth"];
      for (const plan of expectedPlans) {
        expect(PLAN_PRICES_GBP[plan], `${plan} should have a price`).toBeGreaterThan(0);
      }
    });

    it("prices are in ascending order within tiers", () => {
      expect(PLAN_PRICES_GBP.starter).toBeLessThan(PLAN_PRICES_GBP.pro);
      expect(PLAN_PRICES_GBP.developer).toBeLessThan(PLAN_PRICES_GBP.business);
      expect(PLAN_PRICES_GBP.business).toBeLessThan(PLAN_PRICES_GBP.growth);
    });
  });

  describe("EMAIL_FROM", () => {
    it("contains the OneGoodArea brand name", () => {
      expect(EMAIL_FROM).toContain("OneGoodArea");
    });

    it("contains a valid email address", () => {
      expect(EMAIL_FROM).toMatch(/<.*@.*>/);
    });
  });
});

describe("PLANS config", () => {
  it("free plan has no priceId", () => {
    expect(PLANS.free.priceId).toBeNull();
  });

  it("free plan has no API access", () => {
    expect(PLANS.free.apiAccess).toBe(false);
  });

  it("all paid plans have positive report limits", () => {
    const paidPlans = ["starter", "pro", "developer", "business", "growth"] as const;
    for (const plan of paidPlans) {
      expect(PLANS[plan].reportsPerMonth, `${plan} reports`).toBeGreaterThan(0);
    }
  });

  it("API plans have apiAccess enabled", () => {
    expect(PLANS.developer.apiAccess).toBe(true);
    expect(PLANS.business.apiAccess).toBe(true);
    expect(PLANS.growth.apiAccess).toBe(true);
  });

  it("consumer plans do not have apiAccess", () => {
    expect(PLANS.free.apiAccess).toBe(false);
    expect(PLANS.starter.apiAccess).toBe(false);
    expect(PLANS.pro.apiAccess).toBe(false);
  });
});
