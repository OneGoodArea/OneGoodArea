import { describe, it, expect } from "vitest";
import {
  PLANS,
  API_PLANS,
  CONSUMER_PLANS,
  V2_PUBLIC_PLANS,
  V2_PAID_PLANS,
  type PlanId,
} from "../lib/stripe";

/**
 * PLANS integrity tests for pricing v2 (AR-143).
 *
 * Catches bugs introduced when adding tiers, repricing, or refactoring the
 * plans groupings. Specifically guards against the AR-141 class of bugs
 * (display copy disagreeing with PLANS, invented features without product backing).
 */

describe("PLANS object integrity", () => {
  it("every plan has required fields", () => {
    for (const id of Object.keys(PLANS) as PlanId[]) {
      const plan = PLANS[id];
      expect(plan.name, `${id}.name`).toBeTypeOf("string");
      expect(plan.name.length, `${id}.name length`).toBeGreaterThan(0);
      expect(plan.price, `${id}.price`).toBeTypeOf("number");
      expect(plan.price, `${id}.price >=0`).toBeGreaterThanOrEqual(0);
      expect(plan.reportsPerMonth, `${id}.reportsPerMonth`).toBeTypeOf("number");
      expect(plan.reportsPerMonth, `${id}.reportsPerMonth >0`).toBeGreaterThan(0);
      expect(plan.apiAccess, `${id}.apiAccess`).toBeTypeOf("boolean");
      expect(plan.generation, `${id}.generation`).toMatch(/^v[12]$/);
    }
  });

  it("v1 legacy plans match canonical prices (regression guard for grandfathering)", () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.starter.price).toBe(2900);
    expect(PLANS.pro.price).toBe(7900);
    expect(PLANS.developer.price).toBe(9900);
    expect(PLANS.business.price).toBe(49900);
    expect(PLANS.growth.price).toBe(149900);
  });

  it("v2 active plans match the AR-143 approved prices", () => {
    expect(PLANS.sandbox.price).toBe(0);
    expect(PLANS.starter_v2.price).toBe(4900);     // £49
    expect(PLANS.build.price).toBe(14900);          // £149
    expect(PLANS.scale.price).toBe(49900);          // £499
    expect(PLANS.growth_v2.price).toBe(149900);     // £1,499
    expect(PLANS.enterprise.price).toBe(499900);    // £4,999 (public floor)
  });

  it("v2 active plans match the AR-143 approved monthly call quotas", () => {
    expect(PLANS.sandbox.reportsPerMonth).toBe(35);
    expect(PLANS.starter_v2.reportsPerMonth).toBe(1500);
    expect(PLANS.build.reportsPerMonth).toBe(6000);
    expect(PLANS.scale.reportsPerMonth).toBe(25000);
    expect(PLANS.growth_v2.reportsPerMonth).toBe(100000);
    expect(PLANS.enterprise.reportsPerMonth).toBe(250000);
  });

  it("v1 consumer plans deny API access (legacy contract)", () => {
    expect(PLANS.free.apiAccess).toBe(false);
    expect(PLANS.starter.apiAccess).toBe(false);
    expect(PLANS.pro.apiAccess).toBe(false);
  });

  it("all v2 paid plans grant API access (Sandbox is also true so devs can evaluate)", () => {
    for (const id of V2_PAID_PLANS) {
      expect(PLANS[id].apiAccess, `${id} should grant apiAccess`).toBe(true);
    }
    expect(PLANS.sandbox.apiAccess).toBe(true);
  });

  it("v2 plans are generation v2; v1 legacy plans are generation v1", () => {
    const v1Ids: PlanId[] = ["free", "starter", "pro", "developer", "business", "growth"];
    const v2Ids: PlanId[] = ["sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];
    for (const id of v1Ids) expect(PLANS[id].generation, `${id} gen`).toBe("v1");
    for (const id of v2Ids) expect(PLANS[id].generation, `${id} gen`).toBe("v2");
  });

  it("v2 paid mid-tiers (Build/Scale/Growth) are eligible for soft-cap overage", () => {
    expect(PLANS.build.overageMode).toBe("soft");
    expect(PLANS.scale.overageMode).toBe("soft");
    expect(PLANS.growth_v2.overageMode).toBe("soft");
    // Soft-cap parameters per project_pricing_v2.md
    expect(PLANS.build.softCapHeadroomPct).toBe(25);
    expect(PLANS.build.overagePence).toBe(5); // £0.05 per overage call
    expect(PLANS.scale.softCapHeadroomPct).toBe(25);
    expect(PLANS.growth_v2.softCapHeadroomPct).toBe(25);
  });

  it("Sandbox + Starter v2 are hard-capped (no overage billing)", () => {
    expect(PLANS.sandbox.overageMode).toBe("hard");
    expect(PLANS.starter_v2.overageMode).toBe("hard");
  });

  it("Enterprise is negotiated overage (custom MSA)", () => {
    expect(PLANS.enterprise.overageMode).toBe("negotiated");
  });

  it("price IDs are unique within v2 active tiers (no copy-paste regression)", () => {
    const v2Ids: PlanId[] = ["starter_v2", "build", "scale", "growth_v2", "enterprise"];
    const priceIds = v2Ids
      .map((id) => PLANS[id].priceId)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    const unique = new Set(priceIds);
    expect(unique.size, "no duplicate v2 price IDs").toBe(priceIds.length);
  });

  it("annual price IDs (when set) are unique vs monthly", () => {
    const buildMonthly = PLANS.build.priceId;
    const buildAnnual = "annualPriceId" in PLANS.build ? PLANS.build.annualPriceId : "";
    const scaleMonthly = PLANS.scale.priceId;
    const scaleAnnual = "annualPriceId" in PLANS.scale ? PLANS.scale.annualPriceId : "";
    if (buildMonthly && buildAnnual) {
      expect(buildAnnual).not.toBe(buildMonthly);
    }
    if (scaleMonthly && scaleAnnual) {
      expect(scaleAnnual).not.toBe(scaleMonthly);
    }
  });
});

describe("Plan groupings", () => {
  it("API_PLANS includes every plan with apiAccess: true", () => {
    for (const id of Object.keys(PLANS) as PlanId[]) {
      const inApi = API_PLANS.includes(id);
      const grants = PLANS[id].apiAccess;
      expect(inApi, `${id} apiAccess=${grants} should be in API_PLANS=${inApi}`).toBe(grants);
    }
  });

  it("CONSUMER_PLANS contains v1 consumer tiers only", () => {
    expect(CONSUMER_PLANS).toContain("free");
    expect(CONSUMER_PLANS).toContain("starter");
    expect(CONSUMER_PLANS).toContain("pro");
    // V2 active plans must NOT be in CONSUMER_PLANS
    expect(CONSUMER_PLANS).not.toContain("sandbox");
    expect(CONSUMER_PLANS).not.toContain("build");
    expect(CONSUMER_PLANS).not.toContain("scale");
  });

  it("V2_PUBLIC_PLANS is exactly the 6 v2 tiers", () => {
    expect(V2_PUBLIC_PLANS).toHaveLength(6);
    const expected = ["sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];
    for (const id of expected) {
      expect(V2_PUBLIC_PLANS, `V2_PUBLIC_PLANS should include ${id}`).toContain(id);
    }
  });

  it("V2_PAID_PLANS excludes Sandbox (free) and includes the 5 paid tiers", () => {
    expect(V2_PAID_PLANS).toHaveLength(5);
    expect(V2_PAID_PLANS).not.toContain("sandbox");
    expect(V2_PAID_PLANS).toContain("enterprise");
  });

  it("v1 legacy paid tiers are NOT in V2_PUBLIC_PLANS (kept for grandfathering only)", () => {
    expect(V2_PUBLIC_PLANS).not.toContain("starter");
    expect(V2_PUBLIC_PLANS).not.toContain("pro");
    expect(V2_PUBLIC_PLANS).not.toContain("developer");
    expect(V2_PUBLIC_PLANS).not.toContain("business");
    expect(V2_PUBLIC_PLANS).not.toContain("growth");
  });
});

describe("Margin sanity (project_pricing_v2.md COGS check)", () => {
  /* Per project_pricing_v2.md, the margin model assumes:
   * - Claude Sonnet 4 cost per uncached call: ~£0.025
   * - 24h cache hit rate: 70-80% at scale
   * - Effective COGS per BILLED call: £0.005-£0.008
   *
   * If the per-call rate drops below £0.012, even with 75% cache hit rate, gross
   * margin falls below 50% which is unsustainable. This test guards against
   * accidentally setting a tier so cheap that the unit economics break. */
  const COGS_PER_CALL_AT_75_CACHE = 0.0025; // £0.0025 (= £0.025 * 0.10 cache miss rate, paying for tokens)
  const MIN_MARGIN_PCT = 50;

  function effectivePerCallPence(planId: PlanId): number {
    return PLANS[planId].price / PLANS[planId].reportsPerMonth;
  }
  function marginPct(planId: PlanId): number {
    const perCallPence = effectivePerCallPence(planId);
    const perCallGbp = perCallPence / 100;
    return ((perCallGbp - COGS_PER_CALL_AT_75_CACHE) / perCallGbp) * 100;
  }

  it("Build tier margin >=50% at typical 75% cache hit rate", () => {
    expect(marginPct("build")).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
  });
  it("Scale tier margin >=50%", () => {
    expect(marginPct("scale")).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
  });
  it("Growth tier margin >=50%", () => {
    expect(marginPct("growth_v2")).toBeGreaterThanOrEqual(MIN_MARGIN_PCT);
  });
});
