import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/usage", () => ({
  isSuperuser: vi.fn(),
  getUserPlan: vi.fn(),
}));

import { sql } from "@/infrastructure/db/client";
import { isSuperuser, getUserPlan } from "@/modules/usage";
import { resolveTier } from "@/modules/tiers/index";

const mockSql = vi.mocked(sql);
const mockIsSuperuser = vi.mocked(isSuperuser);
const mockGetUserPlan = vi.mocked(getUserPlan);

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
