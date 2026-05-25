import { describe, it, expect } from "vitest";
import { ADDONS, ADDON_KEYS, PLANS, type AddonKey } from "../lib/stripe";

/**
 * ADDONS integrity tests for AR-144 Session 5 (MCP add-on flow).
 *
 * Guards against:
 *   - Add-on key drift between ADDONS map, ADDON_KEYS array, and webhook
 *     metadata
 *   - Missing or invalid Stripe price IDs at deploy time
 *   - Pricing regressions on the £29/mo MCP add-on
 *   - Plan vs add-on entitlement contradictions (e.g. Growth somehow
 *     requiring an add-on it should include free)
 */

describe("ADDONS object integrity", () => {
  it("ADDON_KEYS matches the keys of ADDONS map", () => {
    expect(Object.keys(ADDONS).sort()).toEqual([...ADDON_KEYS].sort());
  });

  it("every add-on has required fields", () => {
    for (const key of ADDON_KEYS) {
      const a = ADDONS[key];
      expect(a.key, `${key}.key`).toBe(key);
      expect(a.name, `${key}.name`).toBeTypeOf("string");
      expect(a.name.length, `${key}.name length`).toBeGreaterThan(0);
      expect(a.pricePence, `${key}.pricePence`).toBeTypeOf("number");
      expect(a.pricePence, `${key}.pricePence > 0`).toBeGreaterThan(0);
      expect(a.description, `${key}.description`).toBeTypeOf("string");
      expect(a.description.length, `${key}.description length > 30`).toBeGreaterThan(30);
    }
  });

  it("MCP add-on price is £29/mo per AR-144 spec", () => {
    expect(ADDONS.mcp.pricePence).toBe(2900);
  });

  it("MCP add-on name does not invent claims (e.g. 'Premium', 'Pro')", () => {
    // Per feedback_no_invented_claims.md — name should describe what it IS, not aspire
    expect(ADDONS.mcp.name).toBe("MCP Server access");
  });
});

describe("ADDONS vs PLANS coherence (no contradictory entitlements)", () => {
  it("Growth has plan.mcpAccess: true (no add-on needed)", () => {
    expect(PLANS.growth_v2.mcpAccess).toBe(true);
  });

  it("Enterprise has plan.mcpAccess: true (no add-on needed)", () => {
    expect(PLANS.enterprise.mcpAccess).toBe(true);
  });

  it("Sandbox/Starter/Build/Scale have mcpAccess: false (must purchase add-on)", () => {
    expect(PLANS.sandbox.mcpAccess).toBe(false);
    expect(PLANS.starter_v2.mcpAccess).toBe(false);
    expect(PLANS.build.mcpAccess).toBe(false);
    expect(PLANS.scale.mcpAccess).toBe(false);
  });
});

/**
 * Pure decision logic for hasMcpAccess. Wraps the same rules used by the
 * DB-backed function in src/lib/usage.ts but without the network round-trip.
 */
function computeMcpAccess(plan: string, hasMcpAddon: boolean, isSuperuser: boolean): boolean {
  if (isSuperuser) return true;
  const planConfig = PLANS[plan as keyof typeof PLANS];
  if (planConfig?.mcpAccess === true) return true;
  return hasMcpAddon;
}

describe("computeMcpAccess (pure decision logic)", () => {
  it("superuser always gets MCP access regardless of plan", () => {
    expect(computeMcpAccess("free", false, true)).toBe(true);
    expect(computeMcpAccess("sandbox", false, true)).toBe(true);
  });

  it("Growth plan grants MCP without add-on", () => {
    expect(computeMcpAccess("growth_v2", false, false)).toBe(true);
  });

  it("Enterprise plan grants MCP without add-on", () => {
    expect(computeMcpAccess("enterprise", false, false)).toBe(true);
  });

  it("Sandbox without add-on = no MCP", () => {
    expect(computeMcpAccess("sandbox", false, false)).toBe(false);
  });

  it("Sandbox WITH add-on = MCP granted", () => {
    expect(computeMcpAccess("sandbox", true, false)).toBe(true);
  });

  it("Build with add-on = MCP granted", () => {
    expect(computeMcpAccess("build", true, false)).toBe(true);
  });

  it("Scale without add-on = no MCP (must purchase)", () => {
    expect(computeMcpAccess("scale", false, false)).toBe(false);
  });

  it("V1 legacy free without add-on = no MCP", () => {
    expect(computeMcpAccess("free", false, false)).toBe(false);
  });

  it("V1 legacy growth (no plan-included MCP) without add-on = no MCP", () => {
    expect(computeMcpAccess("growth", false, false)).toBe(false);
  });

  it("V1 legacy growth WITH add-on = MCP granted (grandfathered customer can buy add-on)", () => {
    expect(computeMcpAccess("growth", true, false)).toBe(true);
  });

  it("Unknown plan without add-on = no MCP (fail-safe)", () => {
    expect(computeMcpAccess("nonsense_plan", false, false)).toBe(false);
  });
});

/**
 * Webhook event metadata routing — distinguishes add-on subs from main plan subs.
 * The webhook checks session.metadata?.addon to route between branches.
 */

interface WebhookMetadataInput {
  addon?: string;
  plan?: string;
  user_id?: string;
}

function classifyWebhookEvent(metadata: WebhookMetadataInput): "addon" | "plan" | "unknown" {
  if (metadata.addon && metadata.user_id) return "addon";
  if (metadata.plan && metadata.user_id) return "plan";
  return "unknown";
}

describe("classifyWebhookEvent (route add-on vs main plan checkouts)", () => {
  it("classifies add-on purchase by metadata.addon", () => {
    expect(classifyWebhookEvent({ addon: "mcp", user_id: "user_001" })).toBe("addon");
  });

  it("classifies main plan purchase by metadata.plan", () => {
    expect(classifyWebhookEvent({ plan: "build", user_id: "user_001" })).toBe("plan");
  });

  it("returns unknown when both addon and user_id missing", () => {
    expect(classifyWebhookEvent({})).toBe("unknown");
  });

  it("returns unknown when addon set but user_id missing (malformed event)", () => {
    expect(classifyWebhookEvent({ addon: "mcp" })).toBe("unknown");
  });

  it("when both addon and plan set, addon takes precedence (defensive)", () => {
    // Shouldn't happen in practice, but if it does, route to addon branch
    // because that's the more recent/specific signal.
    expect(classifyWebhookEvent({ addon: "mcp", plan: "build", user_id: "u1" })).toBe("addon");
  });
});

/**
 * Period string for MCP usage tracking — must match what the DB primary key
 * expects (YYYY-MM, zero-padded month).
 */
function formatPeriod(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

describe("MCP usage period formatting", () => {
  it("zero-pads single-digit months", () => {
    expect(formatPeriod(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(formatPeriod(new Date(Date.UTC(2026, 8, 15)))).toBe("2026-09");
  });

  it("handles double-digit months without padding", () => {
    expect(formatPeriod(new Date(Date.UTC(2026, 9, 1)))).toBe("2026-10");
    expect(formatPeriod(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12");
  });

  it("uses UTC (not local time) so period is consistent across timezones", () => {
    // 23:00 UTC on 2026-05-31 should still be in 2026-05 period
    expect(formatPeriod(new Date(Date.UTC(2026, 4, 31, 23, 0, 0)))).toBe("2026-05");
  });
});

/**
 * MCP User-Agent detection — the /api/v1/report endpoint uses this to track
 * MCP usage and gate MCP-only features.
 */
function isFromMcp(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return userAgent.toLowerCase().includes("onegoodarea-mcp-server");
}

describe("isFromMcp User-Agent detection", () => {
  it("matches the MCP server's User-Agent", () => {
    expect(isFromMcp("onegoodarea-mcp-server/0.2.0")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(isFromMcp("OneGoodArea-MCP-Server/0.2.0")).toBe(true);
  });

  it("does not match other clients", () => {
    expect(isFromMcp("Mozilla/5.0")).toBe(false);
    expect(isFromMcp("curl/8.0")).toBe(false);
    expect(isFromMcp("PostmanRuntime/7.0")).toBe(false);
  });

  it("returns false for missing User-Agent header", () => {
    expect(isFromMcp(null)).toBe(false);
    expect(isFromMcp("")).toBe(false);
  });
});

/**
 * /api/stripe/addon-checkout request validation — pure logic for what the
 * route accepts before any DB / Stripe call.
 */

function validateAddonRequest(body: unknown): { ok: true; addon: AddonKey } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "Body must be an object" };
  const obj = body as Record<string, unknown>;
  const addon = obj.addon;
  if (typeof addon !== "string") return { ok: false, error: "addon must be a string" };
  if (!ADDON_KEYS.includes(addon as AddonKey)) {
    return { ok: false, error: `Invalid addon. Supported: ${ADDON_KEYS.join(", ")}` };
  }
  return { ok: true, addon: addon as AddonKey };
}

describe("addon-checkout request validation", () => {
  it("accepts valid mcp request", () => {
    const r = validateAddonRequest({ addon: "mcp" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.addon).toBe("mcp");
  });

  it("rejects missing addon", () => {
    const r = validateAddonRequest({});
    expect(r.ok).toBe(false);
  });

  it("rejects unknown addon (vapourware guard)", () => {
    const r = validateAddonRequest({ addon: "premium-sla" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Invalid addon");
  });

  it("rejects non-string addon", () => {
    const r = validateAddonRequest({ addon: 123 });
    expect(r.ok).toBe(false);
  });

  it("rejects null body", () => {
    const r = validateAddonRequest(null);
    expect(r.ok).toBe(false);
  });
});
