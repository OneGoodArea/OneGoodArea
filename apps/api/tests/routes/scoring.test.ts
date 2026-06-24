import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({
  hasApiAccess: vi.fn(),
  canMakeApiCall: vi.fn(),
  getUserPlan: vi.fn(),
  hasMcpAccess: vi.fn(),
  trackMcpCall: vi.fn(),
  listAddons: vi.fn(),
  getMcpUsageThisMonth: vi.fn(),
}));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn(), query: vi.fn() }));
vi.mock("@/modules/reports/report-generator", () => ({ generateReport: vi.fn() }));
// Partial mock: keep real parseScoreBody etc, stub scoreArea.
vi.mock("@/modules/scoring", async (orig) => {
  const actual = await orig() as object;
  return { ...actual, scoreArea: vi.fn() };
});

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess, canMakeApiCall } from "@/modules/usage";
import { generateReport } from "@/modules/reports/report-generator";
import { scoreArea } from "@/modules/scoring";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";

const app = await buildApp();
afterAll(() => { app.close(); delete process.env.OGA_SIGNALS_API; });

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockQuota = vi.mocked(canMakeApiCall);
const mockGenerate = vi.mocked(generateReport);
const mockScore = vi.mocked(scoreArea);

const SCORE_RESULT = {
  area: "M1 1AE", preset: "research", score: 62, area_type: "urban",
  dimensions: [{ key: "safety_crime", label: "Safety & Crime", score: 70, weight: 20, confidence: 0.9 }],
  confidence: 0.8, weights_source: "preset", engine_version: "2.0.2",
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 0, limit: 35 } as never);
  mockGenerate.mockImplementation(async (area: string) => ({ id: `rpt_${area}`, report: { area } as never }));
  mockScore.mockResolvedValue(SCORE_RESULT);
});

// ── v1-score.test.ts ────────────────────────────────────────────────

describe("POST /v1/score", () => {
  function postScore(body: unknown, withAuth = true) {
    return app.inject({
      method: "POST", url: "/v1/score",
      headers: { "content-type": "application/json", ...(withAuth ? { authorization: "Bearer oga_good" } : {}) },
      payload: JSON.stringify(body),
    });
  }

  it("404s when the dark flag is off (before auth)", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await postScore({ area: "M1 1AE" });
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await postScore({ area: "M1 1AE" }, false);
    expect(res.statusCode).toBe(401);
  });

  it("400s when area is missing (score not computed)", async () => {
    const res = await postScore({ preset: "moving" });
    expect(res.statusCode).toBe(400);
    expect(mockScore).not.toHaveBeenCalled();
  });

  it("400s on an invalid preset", async () => {
    const res = await postScore({ area: "M1 1AE", preset: "vibes" });
    expect(res.statusCode).toBe(400);
  });

  it("400s on a weight key not in the preset", async () => {
    const res = await postScore({ area: "M1 1AE", preset: "moving", weights: { price_growth: 50 } });
    expect(res.statusCode).toBe(400);
    expect(mockScore).not.toHaveBeenCalled();
  });

  it("404s when the area cannot be geocoded", async () => {
    mockScore.mockResolvedValue(null);
    const res = await postScore({ area: "Nowhereville" });
    expect(res.statusCode).toBe(404);
  });

  it("200s: returns the score + components, meters the call", async () => {
    const res = await postScore({ area: "M1 1AE", preset: "research" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.score).toBe(62);
    expect(body.dimensions[0].key).toBe("safety_crime");
    expect(body.weights_source).toBe("preset");
    expect(mockScore).toHaveBeenCalledWith(expect.objectContaining({ area: "M1 1AE", preset: "research" }));
    expect(trackEvent).toHaveBeenCalledWith("api.score.computed", "user_1", expect.objectContaining({ preset: "research", score: 62 }), null);
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
  });
});

describe("POST /v1/score — Levers preset_id (AR-196)", () => {
  function postScore(body: unknown) {
    return app.inject({
      method: "POST", url: "/v1/score",
      headers: { "content-type": "application/json", authorization: "Bearer oga_good" },
      payload: JSON.stringify(body),
    });
  }

  it("resolves preset_id to the saved preset's {base_preset, weights} and calls scoreArea accordingly", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    vi.mocked(sql).mockResolvedValueOnce([{
      id: "spr_x", org_id: "org_acme", slug: "underwriting", name: "Underwriting v1",
      base_preset: "moving",
      weights: { safety_crime: 0.5, schools_education: 0.2, transport_commute: 0.1, daily_amenities: 0.1, cost_of_living: 0.1 },
      created_at: "2026-05-28", updated_at: "2026-05-28",
    }] as never);

    const res = await postScore({ area: "M1 1AE", preset_id: "spr_x" });
    expect(res.statusCode).toBe(200);
    expect(mockScore).toHaveBeenCalledWith(expect.objectContaining({
      area: "M1 1AE",
      preset: "moving",
      weights: expect.objectContaining({ safety_crime: 0.5 }),
    }));
    expect(trackEvent).toHaveBeenCalledWith(
      "api.score.computed",
      "user_1",
      expect.objectContaining({ preset_id: "spr_x", weights: "custom" }),
      "org_acme",
    );
  });

  it("422s when preset_id is passed alongside explicit preset (mutually exclusive)", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    const res = await postScore({ area: "M1 1AE", preset_id: "spr_x", preset: "moving" });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe("preset_id_conflict");
    expect(mockScore).not.toHaveBeenCalled();
  });

  it("422s when preset_id is passed alongside explicit weights (mutually exclusive)", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    const res = await postScore({ area: "M1 1AE", preset_id: "spr_x", weights: { safety_crime: 1 } });
    expect(res.statusCode).toBe(422);
    expect(res.json().code).toBe("preset_id_conflict");
  });

  it("404s when preset_id is unknown in the caller's org", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    vi.mocked(sql).mockResolvedValueOnce([] as never);
    const res = await postScore({ area: "M1 1AE", preset_id: "spr_nope" });
    expect(res.statusCode).toBe(404);
    expect(mockScore).not.toHaveBeenCalled();
  });
});

describe("POST /v1/score — Levers methodology pin (AR-197)", () => {
  function postScore(body: unknown) {
    return app.inject({
      method: "POST", url: "/v1/score",
      headers: { "content-type": "application/json", authorization: "Bearer oga_good" },
      payload: JSON.stringify(body),
    });
  }

  it("stamps the org's pinned engine_version on the response header when set", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    vi.mocked(sql).mockResolvedValueOnce([
      { org_id: "org_acme", engine_version: "2.0.1", created_at: "2026-05-28", updated_at: "2026-05-28" },
    ] as never);
    const res = await postScore({ area: "M1 1AE", preset: "research" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-engine-version"]).toBe("2.0.1");
  });

  it("falls back to METHODOLOGY_VERSION (latest) when no pin is set", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    vi.mocked(sql).mockResolvedValueOnce([] as never);
    const res = await postScore({ area: "M1 1AE", preset: "research" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
  });
});

// ── v1-batch.test.ts ────────────────────────────────────────────────

describe("POST /v1/batch", () => {
  function postBatch(body: unknown, headers: Record<string, string> = {}) {
    return app.inject({
      method: "POST",
      url: "/v1/batch",
      headers: { "content-type": "application/json", authorization: "Bearer oga_good", ...headers },
      payload: JSON.stringify(body),
    });
  }

  it("401s without a bearer token", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/batch", headers: { "content-type": "application/json" }, payload: "{}" });
    expect(res.statusCode).toBe(401);
  });

  it("429s when batch-rate-limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    expect((await postBatch({ items: [{ area: "M1", intent: "research" }] })).statusCode).toBe(429);
  });

  it("403s without API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    expect((await postBatch({ items: [{ area: "M1", intent: "research" }] })).statusCode).toBe(403);
  });

  it("400s on a malformed body / item", async () => {
    expect((await postBatch({})).statusCode).toBe(400);
    expect((await postBatch({ items: [{ area: "M1" }] })).statusCode).toBe(400);
    expect((await postBatch({ items: [] })).statusCode).toBe(400);
  });

  it("400s when the batch exceeds the max size", async () => {
    const items = Array.from({ length: 101 }, () => ({ area: "M1", intent: "research" }));
    expect((await postBatch({ items })).statusCode).toBe(400);
  });

  it("429s when the batch exceeds remaining quota", async () => {
    mockQuota.mockResolvedValue({ allowed: true, plan: "sandbox", used: 34, limit: 35 } as never);
    const res = await postBatch({ items: [{ area: "M1", intent: "research" }, { area: "M2", intent: "research" }] });
    expect(res.statusCode).toBe(429);
    expect(res.json().remaining).toBe(1);
  });

  it("200s and returns per-item results + summary on the happy path", async () => {
    const res = await postBatch({
      items: [
        { area: "Manchester", intent: "research" },
        { area: "Leeds", intent: "bad" },
        { area: "Bristol", intent: "investing" },
      ],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary).toEqual({ total: 3, succeeded: 2, failed: 1 });
    expect(body.results).toHaveLength(3);
    expect(res.headers["x-engine-version"]).toBeDefined();
  });
});
