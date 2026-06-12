import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn() }));
vi.mock("@/modules/orgs/bundles", () => ({
  resolveBundleForCaller: vi.fn().mockResolvedValue({ ok: true, allowed: null }),
  planSignalsOutsideBundle: vi.fn().mockReturnValue([]),
}));
vi.mock("@/modules/orgs/engine-version", () => ({
  effectiveEngineVersionForCaller: vi.fn().mockResolvedValue("2.0.2"),
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
import { hasApiAccess } from "@/modules/usage";
import { runQuery, AmbiguousLocationError } from "@/modules/intelligence";

const app = buildApp();
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
});

function post(body: unknown) {
  return app.inject({
    method: "POST",
    url: "/v1/query",
    headers: { authorization: "Bearer oga_good", "content-type": "application/json" },
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
