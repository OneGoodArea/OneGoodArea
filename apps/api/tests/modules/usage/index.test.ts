import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));

import { sql } from "@/infrastructure/db/client";
import { getUserPlan, hasApiAccess, canMakeApiCall, hasMcpAccess } from "@/modules/usage/index";

const mockSql = vi.mocked(sql);

/* usage gates fire several queries each; route the mock by SQL text instead of
   call order so tests are robust. Configure the fake DB per test. */
let db: {
  email: string;
  /* AR-312: DB-backed superuser flag. Default false; the "ptengelmann gets
     business" tests set it TRUE to exercise the DB-column branch. */
  isSuperuser: boolean;
  subscriptionPlan: string | null; // null = no active sub row
  reportCount: number;
  addons: string[];
};

function routeQuery(strings: TemplateStringsArray): Promise<unknown[]> {
  const q = strings.join(" ");
  /* AR-312: isSuperuser now SELECTS email + is_superuser. Match on the
     unique "FROM users WHERE id" substring so the routing survives column
     additions in the SELECT list. */
  if (q.includes("FROM users WHERE id")) {
    return Promise.resolve([{ email: db.email, is_superuser: db.isSuperuser }]);
  }
  if (q.includes("FROM subscriptions")) {
    return Promise.resolve(db.subscriptionPlan ? [{ plan: db.subscriptionPlan }] : []);
  }
  if (q.includes("FROM reports")) return Promise.resolve([{ count: db.reportCount }]);
  if (q.includes("FROM subscription_addons")) {
    return Promise.resolve(db.addons.map((addon_key) => ({ addon_key, status: "active" })));
  }
  return Promise.resolve([]);
}

beforeEach(() => {
  db = { email: "user@example.com", isSuperuser: false, subscriptionPlan: null, reportCount: 0, addons: [] };
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
    /* AR-312: DB column is the source of truth in prod. Test exercises
       that path explicitly. Email match is no longer the gate. */
    db.isSuperuser = true;
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
    db.reportCount = 5; // sandbox limit is 35
    const r = await canMakeApiCall("u1");
    expect(r.allowed).toBe(true);
    expect(r.plan).toBe("sandbox");
    expect(r.limit).toBe(35);
  });

  it("blocks when usage hits the limit", async () => {
    db.reportCount = 35;
    const r = await canMakeApiCall("u1");
    expect(r.allowed).toBe(false);
  });

  it("gives a superuser an unlimited quota", async () => {
    /* AR-312: superuser via DB column, not email. */
    db.isSuperuser = true;
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
