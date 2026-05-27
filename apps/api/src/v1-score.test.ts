import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("./modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("./infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("./modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("./modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn(), query: vi.fn() }));
// Keep parseScoreBody real (tests the 400 paths); mock only scoreArea (network).
vi.mock("./modules/scoring", async (orig) => ({ ...(await orig() as object), scoreArea: vi.fn() }));

import { buildApp } from "./app";
import { validateApiKey } from "./modules/api-keys";
import { rateLimit } from "./infrastructure/rate-limit";
import { hasApiAccess } from "./modules/usage";
import { scoreArea } from "./modules/scoring";
import { trackEvent } from "./modules/tracking/activity";

const app = buildApp();
afterAll(() => { app.close(); delete process.env.OGA_SIGNALS_API; });

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockScore = vi.mocked(scoreArea);

const RESULT = {
  area: "M1 1AE", preset: "research", score: 62, area_type: "urban",
  dimensions: [{ key: "safety_crime", label: "Safety & Crime", score: 70, weight: 20, confidence: 0.9 }],
  confidence: 0.8, weights_source: "preset", engine_version: "2.0.2",
} as never;

function post(body: unknown, withAuth = true) {
  return app.inject({
    method: "POST", url: "/v1/score",
    headers: { "content-type": "application/json", ...(withAuth ? { authorization: "Bearer oga_good" } : {}) },
    payload: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  mockValidate.mockResolvedValue("user_1");
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockScore.mockResolvedValue(RESULT);
});

describe("POST /v1/score", () => {
  it("404s when the dark flag is off (before auth)", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await post({ area: "M1 1AE" });
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await post({ area: "M1 1AE" }, false);
    expect(res.statusCode).toBe(401);
  });

  it("400s when area is missing (score not computed)", async () => {
    const res = await post({ preset: "moving" });
    expect(res.statusCode).toBe(400);
    expect(mockScore).not.toHaveBeenCalled();
  });

  it("400s on an invalid preset", async () => {
    const res = await post({ area: "M1 1AE", preset: "vibes" });
    expect(res.statusCode).toBe(400);
  });

  it("400s on a weight key not in the preset", async () => {
    const res = await post({ area: "M1 1AE", preset: "moving", weights: { price_growth: 50 } });
    expect(res.statusCode).toBe(400);
    expect(mockScore).not.toHaveBeenCalled();
  });

  it("404s when the area cannot be geocoded", async () => {
    mockScore.mockResolvedValue(null);
    const res = await post({ area: "Nowhereville" });
    expect(res.statusCode).toBe(404);
  });

  it("200s: returns the score + components, meters the call", async () => {
    const res = await post({ area: "M1 1AE", preset: "research" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.score).toBe(62);
    expect(body.dimensions[0].key).toBe("safety_crime");
    expect(body.weights_source).toBe("preset");
    expect(mockScore).toHaveBeenCalledWith(expect.objectContaining({ area: "M1 1AE", preset: "research" }));
    expect(trackEvent).toHaveBeenCalledWith("api.score.computed", "user_1", expect.objectContaining({ preset: "research", score: 62 }));
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
  });
});
