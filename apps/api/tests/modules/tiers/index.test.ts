import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  isSuperuser: vi.fn(),
  getUserPlan: vi.fn(),
}));
vi.mock("@/infrastructure/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

import { sql } from "@/infrastructure/db/client";
import { isSuperuser, getUserPlan } from "@/modules/usage";
import { rateLimit } from "@/infrastructure/rate-limit";
import { RATE_LIMITS } from "@/infrastructure/config";
import { getAiConfig } from "@/modules/ai/config";
import { resolveTier, checkQuota, decideLlm, TIERS } from "@/modules/tiers/index";

const mockSql = vi.mocked(sql);
const mockIsSuperuser = vi.mocked(isSuperuser);
const mockGetUserPlan = vi.mocked(getUserPlan);
const mockRateLimit = vi.mocked(rateLimit);

function routeQuery(strings: TemplateStringsArray): Promise<unknown[]> {
  const q = strings.join(" ");
  if (q.includes("FROM users WHERE id") && q.includes("tier")) {
    return Promise.resolve([{ tier: db.tier }]);
  }
  if (q.includes("FROM users WHERE id")) {
    return Promise.resolve([{ email: "test@test.com", is_superuser: false, tier: db.tier }]);
  }
  if (q.includes("FROM subscriptions")) {
    return Promise.resolve(db.plan ? [{ plan: db.plan }] : []);
  }
  return Promise.resolve([]);
}

let db: { tier: string | null; plan: string | null };

beforeEach(() => {
  db = { tier: "basic", plan: "sandbox" };
  mockSql.mockReset();
  mockSql.mockImplementation(routeQuery as never);
  mockIsSuperuser.mockReset();
  mockIsSuperuser.mockResolvedValue(false);
  mockGetUserPlan.mockReset();
  mockGetUserPlan.mockResolvedValue("sandbox");
  mockRateLimit.mockReset();
  mockRateLimit.mockResolvedValue({ success: true, remaining: 29, reset: Date.now() + 60000 });
});

describe("resolveTier", () => {
  it("returns anonymous when userId is null", async () => {
    const tier = await resolveTier({ userId: null, hasApiKey: false });
    expect(tier).toBe("anonymous");
  });

  it("returns superuser when is_superuser is true", async () => {
    mockIsSuperuser.mockResolvedValue(true);
    const tier = await resolveTier({ userId: "u1", hasApiKey: true });
    expect(tier).toBe("superuser");
  });

  it("returns engineering when tier column is 'engineering'", async () => {
    db.tier = "engineering";
    const tier = await resolveTier({ userId: "u1", hasApiKey: true });
    expect(tier).toBe("engineering");
  });

  it("returns high_tier when tier column is 'high_tier'", async () => {
    db.tier = "high_tier";
    const tier = await resolveTier({ userId: "u1", hasApiKey: true });
    expect(tier).toBe("high_tier");
  });

  it("maps V2 paid plans to high_tier", async () => {
    db.plan = "build";
    mockGetUserPlan.mockResolvedValue("build");
    const tier = await resolveTier({ userId: "u1", hasApiKey: true });
    expect(tier).toBe("high_tier");
  });

  it("maps sandbox plan to basic", async () => {
    db.plan = "sandbox";
    mockGetUserPlan.mockResolvedValue("sandbox");
    const tier = await resolveTier({ userId: "u1", hasApiKey: true });
    expect(tier).toBe("basic");
  });

  it("returns logged_in for users with API key but no plan match", async () => {
    db.tier = null;
    db.plan = "sandbox";
    mockGetUserPlan.mockResolvedValue("sandbox");
    const tier = await resolveTier({ userId: "u1", hasApiKey: true });
    expect(tier).toBe("basic");
  });

  it("returns basic for logged-in users without API key", async () => {
    db.tier = null;
    db.plan = "sandbox";
    mockGetUserPlan.mockResolvedValue("sandbox");
    const tier = await resolveTier({ userId: "u1", hasApiKey: false });
    expect(tier).toBe("basic");
  });
});

describe("checkQuota", () => {
  it("allows requests within quota", async () => {
    const verdict = await checkQuota("basic", "api:test-key");
    expect(verdict.allowed).toBe(true);
    expect(verdict.tier).toBe("basic");
    expect(verdict.reason).toBeNull();
  });

  it("denies requests past quota", async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60000 });
    const verdict = await checkQuota("basic", "api:test-key");
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("Rate limit");
  });

  it("always allows unlimited tiers (engineering)", async () => {
    const verdict = await checkQuota("engineering", "api:test-key");
    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBeNull();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("always allows unlimited tiers (superuser)", async () => {
    const verdict = await checkQuota("superuser", "api:test-key");
    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBeNull();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("passes correct config to rateLimit", async () => {
    await checkQuota("anonymous", "api:anon-key");
    expect(mockRateLimit).toHaveBeenCalledWith("api:anon-key", { max: 5, windowSeconds: 60 });
  });
});

describe("checkQuota — free-tier global backstop (AR-593, Plan 059.1)", () => {
  it.each(["anonymous", "logged_in", "basic"] as const)(
    "also checks the shared global bucket for %s tier",
    async (tier) => {
      await checkQuota(tier, "api:some-key");
      expect(mockRateLimit).toHaveBeenCalledWith("global:free-tier-daily", RATE_LIMITS.freeTierGlobal);
    },
  );

  it.each(["high_tier", "engineering", "superuser"] as const)(
    "does not check the shared global bucket for %s tier",
    async (tier) => {
      await checkQuota(tier, "api:some-key");
      expect(mockRateLimit).not.toHaveBeenCalledWith("global:free-tier-daily", RATE_LIMITS.freeTierGlobal);
    },
  );

  it("denies the request when the global bucket is exhausted, even if the per-identifier quota passed", async () => {
    mockRateLimit.mockImplementation(async (identifier) => {
      if (identifier === "global:free-tier-daily") {
        return { success: false, remaining: 0, reset: Date.now() + 86400000 };
      }
      return { success: true, remaining: 29, reset: Date.now() + 60000 };
    });

    const verdict = await checkQuota("basic", "api:some-key");
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("Free-tier global daily limit");
  });

  it("does not touch the global bucket when the per-identifier quota already failed", async () => {
    mockRateLimit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60000 });

    await checkQuota("basic", "api:some-key");
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRateLimit).not.toHaveBeenCalledWith("global:free-tier-daily", RATE_LIMITS.freeTierGlobal);
  });
});

describe("decideLlm", () => {
  it("returns the AI config strategy route for each tier", () => {
    const config = getAiConfig();
    for (const tier of ["anonymous", "logged_in", "basic", "high_tier", "engineering", "superuser"]) {
      const route = decideLlm(tier as Parameters<typeof decideLlm>[0]);
      expect(route.strategy).toBe(config.strategies[tier].strategy);
      expect(route.providers).toEqual(config.strategies[tier].providers);
      expect(route.retryCount).toBe(config.aiRetryCount);
    }
  });

  it("resolves the anonymous tier to its fallback chain", () => {
    expect(decideLlm("anonymous")).toEqual({
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
      retryCount: getAiConfig().aiRetryCount,
    });
  });
});

describe("TIERS catalog", () => {
  it("has entries for all tier types", () => {
    expect(Object.keys(TIERS)).toHaveLength(6);
    for (const tier of ["anonymous", "logged_in", "basic", "high_tier", "engineering", "superuser"]) {
      expect(TIERS[tier as keyof typeof TIERS]).toBeDefined();
      expect(TIERS[tier as keyof typeof TIERS].quota).toBeDefined();
    }
  });

  it("has unlimited quota for engineering and superuser", () => {
    expect(TIERS.engineering.quota.max).toBeNull();
    expect(TIERS.superuser.quota.max).toBeNull();
  });

  it("has limited quota for anonymous and basic", () => {
    expect(TIERS.anonymous.quota.max).toBe(5);
    expect(TIERS.basic.quota.max).toBe(30);
  });
});
