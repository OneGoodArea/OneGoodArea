import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn(), canMakeApiCall: vi.fn(), canMakeNlCall: vi.fn() }));
/* AR-547: see signals.test.ts — stub tier resolution, keep checkQuota real. */
vi.mock("@/modules/tiers", async (orig) => ({
  ...(await orig() as object),
  resolveTier: vi.fn(async () => "basic"),
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/orgs/bundles", () => ({
  resolveBundleForCaller: vi.fn().mockResolvedValue({ ok: true, allowed: null }),
  planSignalsOutsideBundle: vi.fn().mockReturnValue([]),
}));
vi.mock("@/modules/orgs/engine-version", () => ({
  effectiveEngineVersionForCaller: vi.fn().mockResolvedValue("1.0.0"),
}));

/* Partial mock: keep parseQueryRequest real (so body validation runs) but
   stub runQuery so each test can decide what the executor "produces" —
   including throwing AmbiguousLocationError. AmbiguousLocationError is
   re-exported through the same module so the endpoint's `instanceof`
   check still hits. */
vi.mock("@/modules/intelligence", async () => {
  const actual = await vi.importActual<typeof import("@/modules/intelligence")>("@/modules/intelligence");
  return { ...actual, runQuery: vi.fn() };
});

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess, canMakeApiCall, canMakeNlCall } from "@/modules/usage";
import { runQuery, AmbiguousLocationError } from "@/modules/intelligence";
import { trackEvent } from "@/modules/tracking/activity";

const app = await buildApp();
afterAll(() => {
  app.close();
  delete process.env.OGA_SIGNALS_API;
});

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockRunQuery = vi.mocked(runQuery);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  vi.mocked(canMakeApiCall).mockResolvedValue({ allowed: true, plan: "sandbox", used: 0, limit: 200 } as never);
  vi.mocked(canMakeNlCall).mockResolvedValue({ allowed: true, plan: "sandbox", used: 0, limit: 10 } as never);
});

function post(body: unknown) {
  return app.inject({
    method: "POST",
    url: "/v1/query",
    headers: { authorization: "Bearer oga_good", "content-type": "application/json" },
    payload: JSON.stringify(body),
  });
}

function postAnonymous(body: unknown, query = "") {
  return app.inject({
    method: "POST",
    url: `/v1/query${query}`,
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(body),
  });
}

describe("POST /v1/query — AR-267 ambiguous_location", () => {
  it("returns 422 with the candidate list when the area is ambiguous", async () => {
    const candidates = [
      { label: "Brixton, Lambeth, London", postcode: "SW2 1AA", district: "Lambeth", country: "England" },
      { label: "Brixton, South Hams, Devon", postcode: "PL8 2AQ", district: "South Hams", country: "England" },
    ];
    mockRunQuery.mockRejectedValueOnce(new AmbiguousLocationError("Brixton", candidates));

    const res = await post({ question: "tell me about Brixton" });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.code).toBe("ambiguous_location");
    expect(body.candidates).toEqual(candidates);
    expect(body.error).toMatch(/ambiguous/i);
    expect(body.error).toContain("Brixton");
  });

  it("passes the caller's resolved tier through to runQuery (AR-597, Plan 059.5)", async () => {
    mockRunQuery.mockResolvedValueOnce({ ok: true, response: { plan: { op: "get_area" }, plan_source: "nl" } } as never);
    await post({ question: "tell me about M1 1AE" });
    expect(mockRunQuery).toHaveBeenCalledWith(expect.anything(), undefined, "basic");
  });

  it("does NOT 200 with arbitrarily-picked data when ambiguous (contract guarantee)", async () => {
    mockRunQuery.mockRejectedValueOnce(
      new AmbiguousLocationError("Brixton", [
        { label: "Brixton, Lambeth, London", postcode: "SW2 1AA", district: "Lambeth", country: "England" },
        { label: "Brixton, South Hams, Devon", postcode: "PL8 2AQ", district: "South Hams", country: "England" },
      ]),
    );
    const res = await post({ question: "what's Brixton like" });
    expect(res.statusCode).not.toBe(200);
  });

  it("still 500s on a genuinely unexpected error (does not swallow non-ambiguity errors)", async () => {
    mockRunQuery.mockRejectedValueOnce(new Error("DB connection lost"));
    const res = await post({ question: "anything" });
    expect(res.statusCode).toBe(500);
  });
});

describe("POST /v1/query — anonymous access (AR-594, Plan 059.2)", () => {
  it("allows a caller with no Authorization header, within the anonymous tier quota", async () => {
    mockRunQuery.mockResolvedValueOnce({
      ok: true,
      response: { plan: { op: "get_area" }, plan_source: "client" },
    } as never);

    const res = await postAnonymous({ plan: { op: "get_area", params: { area: "M1 1AE" } } });
    expect(res.statusCode).toBe(200);
    expect(vi.mocked(trackEvent)).toHaveBeenCalledWith(
      "api.query.executed",
      null,
      expect.objectContaining({ op: "get_area" }),
      null,
    );
  });

  it("does not consult the monthly NL cap for an anonymous NL question (tier quota governs instead)", async () => {
    vi.mocked(canMakeNlCall).mockResolvedValue({ allowed: false, plan: "sandbox", used: 99, limit: 1 } as never);
    mockRunQuery.mockResolvedValueOnce({
      ok: true,
      response: { plan: { op: "rank_areas" }, plan_source: "nl" },
    } as never);

    const res = await postAnonymous({ question: "best areas for families" });
    expect(res.statusCode).toBe(200);
    expect(vi.mocked(canMakeNlCall)).not.toHaveBeenCalled();
  });

  it("429s an anonymous caller once the anonymous tier quota is exhausted", async () => {
    mockRate.mockResolvedValueOnce({ success: false, remaining: 0, reset: 0 });
    const res = await postAnonymous({ plan: { op: "get_area", params: { area: "M1 1AE" } } });
    expect(res.statusCode).toBe(429);
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it("422s an anonymous caller who passes ?bundle=", async () => {
    const res = await postAnonymous({ plan: { op: "get_area", params: { area: "M1 1AE" } } }, "?bundle=some-bundle");
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe("no_org_context");
  });
});
