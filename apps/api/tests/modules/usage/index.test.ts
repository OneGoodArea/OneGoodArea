import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { sql } from "@/infrastructure/db/client";
import { getUserPlan, hasApiAccess, canMakeApiCall, canMakeNlCall, hasMcpAccess, hasLeversAccess } from "@/modules/usage/index";
import type { UserType } from "@onegoodarea/contracts";

const mockSql = vi.mocked(sql);

/* usage gates fire several queries each; route the mock by SQL text instead of
   call order so tests are robust. Configure the fake DB per test. */
let db: {
  email: string;
  userType: UserType;
  subscriptionPlan: string | null; // null = no active sub row
  reportCount: number;
  nlCount: number; // AR-488: monthly natural-language (plan_source='nl') call count
  addons: string[];
};

function routeQuery(strings: TemplateStringsArray): Promise<unknown[]> {
  const q = strings.join(" ");
  /* AR-654: isSuperuser now reads user_type via resolveUserType(). Match on
     "FROM users WHERE id" so the routing survives column additions. */
  if (q.includes("FROM users WHERE id")) {
    return Promise.resolve([{ email: db.email, user_type: db.userType }]);
  }
  if (q.includes("FROM subscriptions")) {
    return Promise.resolve(db.subscriptionPlan ? [{ plan: db.subscriptionPlan }] : []);
  }
  /* AR-331: canMakeApiCall now counts api.* events instead of rows
     in the dropped reports table. Field name `reportCount` is kept
     in the local test fixture for diff clarity; semantically it is
     the api-call count this month. */
  /* AR-488: the NL sub-cap counts api.query.executed events tagged
     plan_source='nl'; route it before the broader api.* total counter. */
  if (q.includes("FROM activity_events") && q.includes("plan_source")) {
    return Promise.resolve([{ count: db.nlCount }]);
  }
  if (q.includes("FROM activity_events") && q.includes("event LIKE")) {
    return Promise.resolve([{ count: db.reportCount }]);
  }
  if (q.includes("FROM subscription_addons")) {
    return Promise.resolve(db.addons.map((addon_key) => ({ addon_key, status: "active" })));
  }
  return Promise.resolve([]);
}

beforeEach(() => {
  db = { email: "user@example.com", userType: "user", subscriptionPlan: null, reportCount: 0, nlCount: 0, addons: [] };
  mockSql.mockReset();
  mockSql.mockImplementation(routeQuery as never);
});

describe("getUserPlan", () => {
  it("defaults to sandbox when there is no active subscription", async () => {
    expect(await getUserPlan("u1")).toBe("sandbox");
  });

  it("returns the active subscription plan", async () => {
    db.subscriptionPlan = "build";
    expect(await getUserPlan("u1")).toBe("build");
  });

  it("returns business for a superuser regardless of subscription", async () => {
    db.userType = "superuser";
    expect(await getUserPlan("u1")).toBe("business");
  });
});

describe("hasApiAccess", () => {
  it("is true for sandbox (api-enabled free tier)", async () => {
    expect(await hasApiAccess("u1")).toBe(true);
  });
});

describe("canMakeApiCall", () => {
  it("allows when usage is under the plan limit", async () => {
    db.reportCount = 5; // sandbox limit is 200
    const r = await canMakeApiCall("u1");
    expect(r.allowed).toBe(true);
    expect(r.plan).toBe("sandbox");
    expect(r.limit).toBe(200);
  });

  it("blocks when usage hits the limit", async () => {
    db.reportCount = 200;
    const r = await canMakeApiCall("u1");
    expect(r.allowed).toBe(false);
  });

  it("gives a superuser an unlimited quota", async () => {
    db.userType = "superuser";
    db.reportCount = 999999;
    const r = await canMakeApiCall("u1");
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe(Infinity);
  });
});

describe("hasMcpAccess", () => {
  it("is true on a plan that includes MCP (growth_v2)", async () => {
    db.subscriptionPlan = "growth_v2";
    expect(await hasMcpAccess("u1")).toBe(true);
  });

  it("falls back to an active mcp add-on on a non-MCP plan", async () => {
    db.subscriptionPlan = "build"; // mcpAccess false
    db.addons = ["mcp"];
    expect(await hasMcpAccess("u1")).toBe(true);
  });

  it("is false on a non-MCP plan with no add-on", async () => {
    db.subscriptionPlan = "build";
    expect(await hasMcpAccess("u1")).toBe(false);
  });
});

describe("canMakeNlCall", () => {
  it("caps the sandbox free tier at 10 NL calls a month", async () => {
    db.nlCount = 4;
    const r = await canMakeNlCall("u1");
    expect(r.plan).toBe("sandbox");
    expect(r.limit).toBe(10);
    expect(r.allowed).toBe(true);
  });

  it("blocks when the NL sub-cap is hit", async () => {
    db.nlCount = 10;
    const r = await canMakeNlCall("u1");
    expect(r.allowed).toBe(false);
  });

  it("does not cap plans without an NL sub-cap (build)", async () => {
    db.subscriptionPlan = "build";
    db.nlCount = 999;
    const r = await canMakeNlCall("u1");
    expect(r.limit).toBe(Infinity);
    expect(r.allowed).toBe(true);
  });

  it("gives a superuser an unlimited NL quota", async () => {
    db.userType = "superuser";
    db.nlCount = 999;
    const r = await canMakeNlCall("u1");
    expect(r.limit).toBe(Infinity);
    expect(r.allowed).toBe(true);
  });
});

describe("hasLeversAccess (AR-542)", () => {
  it("is false on the free sandbox tier", async () => {
    expect(await hasLeversAccess("u1")).toBe(false);
  });

  it("is false on a v1 free tier", async () => {
    db.subscriptionPlan = "free";
    expect(await hasLeversAccess("u1")).toBe(false);
  });

  it("is true on a paid plan", async () => {
    db.subscriptionPlan = "build";
    expect(await hasLeversAccess("u1")).toBe(true);
  });

  it("is true for a superuser (reported as business)", async () => {
    db.userType = "superuser";
    expect(await hasLeversAccess("u1")).toBe(true);
  });
});
