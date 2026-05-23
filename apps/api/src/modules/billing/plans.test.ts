import { describe, it, expect } from "vitest";
import { PLANS, API_PLANS, V2_PUBLIC_PLANS, ADDONS } from "./plans";

/* Locks the catalog facts the usage gates depend on (quotas + entitlements). */

describe("plan catalog", () => {
  it("sandbox is a free 35-report API tier (the homepage claim)", () => {
    expect(PLANS.sandbox.reportsPerMonth).toBe(35);
    expect(PLANS.sandbox.price).toBe(0);
    expect(PLANS.sandbox.apiAccess).toBe(true);
    expect(PLANS.sandbox.mcpAccess).toBe(false);
  });

  it("MCP is included on growth_v2 + enterprise only", () => {
    expect(PLANS.growth_v2.mcpAccess).toBe(true);
    expect(PLANS.enterprise.mcpAccess).toBe(true);
    expect(PLANS.build.mcpAccess).toBe(false);
  });

  it("API_PLANS gates only api-access tiers and includes sandbox", () => {
    expect(API_PLANS).toContain("sandbox");
    expect(API_PLANS).toContain("enterprise");
    expect(API_PLANS).not.toContain("free"); // legacy consumer tier
  });

  it("the public v2 lineup is the 6 advertised tiers", () => {
    expect(V2_PUBLIC_PLANS).toEqual([
      "sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise",
    ]);
  });

  it("the MCP add-on is £29/mo", () => {
    expect(ADDONS.mcp.pricePence).toBe(2900);
  });
});
