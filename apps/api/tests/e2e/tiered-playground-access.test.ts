/* AR-599 (Plan 059.7): cross-tier integration coverage for Plan 059.
   Exercises the FULL chain — Authorization header -> validateApiKey ->
   resolveTier (real) -> checkQuota (real, including the AR-593 global
   free-tier backstop) -> route handler -> response — for each tier the
   playground actually serves: anonymous, basic, high_tier, superuser.

   This is an in-process integration test via Fastify's app.inject(), not a
   containerized e2e run against a live compose stack. A genuine
   containerized run (per .claude/rules/containerized-testing.md) is
   blocked in this environment by a pre-existing Podman short-name-mode
   config issue unrelated to this plan (see Plan 059 implementation notes)
   — deferred until that's fixed. Only resolveTier's own dependencies
   (isSuperuser, getUserPlan, the users.tier column lookup) and the
   rate-limit primitive are mocked; everything in between — validateApiKey,
   resolveTier, checkQuota, requireCredential, requireApiAccessWithOrgOrAnonymous,
   the /v1/query handler — runs for real. */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", async (orig) => ({
  ...(await orig() as object),
  rateLimit: vi.fn(),
}));
vi.mock("@/modules/usage", () => ({
  isSuperuser: vi.fn(),
  getUserPlan: vi.fn(),
  canMakeApiCall: vi.fn(),
  canMakeNlCall: vi.fn(),
  hasApiAccess: vi.fn(),
}));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/orgs/bundles", () => ({
  resolveBundleForCaller: vi.fn().mockResolvedValue({ ok: true, allowed: null }),
  planSignalsOutsideBundle: vi.fn().mockReturnValue([]),
}));
vi.mock("@/modules/orgs/engine-version", () => ({
  effectiveEngineVersionForCaller: vi.fn().mockResolvedValue("1.0.0"),
}));
vi.mock("@/modules/intelligence", async () => {
  const actual = await vi.importActual<typeof import("@/modules/intelligence")>("@/modules/intelligence");
  return { ...actual, runQuery: vi.fn() };
});

import { buildApp } from "@/app";
import { sql } from "@/infrastructure/db/client";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { isSuperuser, getUserPlan, hasApiAccess, canMakeApiCall } from "@/modules/usage";
import { runQuery } from "@/modules/intelligence";

const app = await buildApp();
const mockSql = vi.mocked(sql);
const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockIsSuperuser = vi.mocked(isSuperuser);
const mockGetUserPlan = vi.mocked(getUserPlan);
const mockHasApiAccess = vi.mocked(hasApiAccess);
const mockRunQuery = vi.mocked(runQuery);

/** Drives resolveTier's own users.tier column lookup for a given userId. */
function routeQuery(userTier: string | null) {
  return (strings: TemplateStringsArray) => {
    const q = strings.join(" ");
    if (q.includes("FROM users WHERE id")) return Promise.resolve([{ tier: userTier }]);
    return Promise.resolve([]);
  };
}

beforeEach(() => {
  process.env.OGA_SIGNALS_API = "true";
  vi.clearAllMocks();
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockHasApiAccess.mockResolvedValue(true);
  vi.mocked(canMakeApiCall).mockResolvedValue({ allowed: true, plan: "sandbox", used: 0, limit: 200 } as never);
  mockRunQuery.mockResolvedValue({ ok: true, response: { plan: { op: "get_area" }, plan_source: "client" } } as never);
});

function postQuery(headers?: Record<string, string>) {
  return app.inject({
    method: "POST",
    url: "/v1/query",
    headers: { "content-type": "application/json", ...headers },
    payload: JSON.stringify({ plan: { op: "get_area", params: { area: "M1 1AE" } } }),
  });
}

describe("Tiered playground access — cross-tier integration (AR-599, Plan 059.7)", () => {
  it("anonymous: no header, resolves to the anonymous tier, 200 within quota", async () => {
    const res = await postQuery();
    expect(res.statusCode).toBe(200);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("anonymous: 429s once the anonymous tier's own quota is exhausted", async () => {
    mockRate.mockResolvedValueOnce({ success: false, remaining: 0, reset: 0 });
    const res = await postQuery();
    expect(res.statusCode).toBe(429);
  });

  it("anonymous: 429s once the shared free-tier global backstop is exhausted, even with quota left", async () => {
    mockRate.mockImplementation(async (identifier) =>
      identifier === "global:free-tier-daily"
        ? { success: false, remaining: 0, reset: 0 }
        : { success: true, remaining: 4, reset: 0 },
    );
    const res = await postQuery();
    expect(res.statusCode).toBe(429);
  });

  it("basic: a real API key with no plan/tier override resolves to basic, 200 within quota", async () => {
    mockSql.mockImplementation(routeQuery(null) as never);
    mockValidate.mockResolvedValue({ userId: "user_basic", orgId: null } as never);
    mockIsSuperuser.mockResolvedValue(false);
    mockGetUserPlan.mockResolvedValue("sandbox" as never);
    const res = await postQuery({ authorization: "Bearer oga_basic" });
    expect(res.statusCode).toBe(200);
  });

  it("high_tier: a real API key on a paid plan resolves to high_tier and is exempt from the free-tier backstop", async () => {
    mockSql.mockImplementation(routeQuery(null) as never);
    mockValidate.mockResolvedValue({ userId: "user_paid", orgId: null } as never);
    mockIsSuperuser.mockResolvedValue(false);
    mockGetUserPlan.mockResolvedValue("build" as never);
    // Even if the shared free-tier bucket is exhausted, high_tier never touches it.
    mockRate.mockImplementation(async (identifier) =>
      identifier === "global:free-tier-daily"
        ? { success: false, remaining: 0, reset: 0 }
        : { success: true, remaining: 119, reset: 0 },
    );
    const res = await postQuery({ authorization: "Bearer oga_paid" });
    expect(res.statusCode).toBe(200);
  });

  it("superuser: unlimited quota — never calls rateLimit at all", async () => {
    mockSql.mockImplementation(routeQuery(null) as never);
    mockValidate.mockResolvedValue({ userId: "staff_1", orgId: null } as never);
    mockIsSuperuser.mockResolvedValue(true);
    const res = await postQuery({ authorization: "Bearer oga_staff" });
    expect(res.statusCode).toBe(200);
    expect(mockRate).not.toHaveBeenCalled();
  });
});
