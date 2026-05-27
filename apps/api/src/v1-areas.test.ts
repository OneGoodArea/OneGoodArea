import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("./modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("./infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("./modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("./modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn(), query: vi.fn() }));
// Keep parseAreasQuery real (tests the 400 paths); mock only the DB query.
vi.mock("./modules/signals", async (orig) => ({ ...(await orig() as object), queryAreas: vi.fn() }));

import { buildApp } from "./app";
import { validateApiKey } from "./modules/api-keys";
import { rateLimit } from "./infrastructure/rate-limit";
import { hasApiAccess } from "./modules/usage";
import { queryAreas } from "./modules/signals";
import { trackEvent } from "./modules/tracking/activity";

const app = buildApp();
afterAll(() => { app.close(); delete process.env.OGA_SIGNALS_API; });

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockQuery = vi.mocked(queryAreas);

function get(url: string, withAuth = true) {
  return app.inject({ method: "GET", url, headers: withAuth ? { authorization: "Bearer oga_good" } : {} });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  mockValidate.mockResolvedValue("user_1");
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockQuery.mockResolvedValue([
    { geo_type: "lsoa", geo_code: "E01000001", value: 1, normalized_value: 0.01, percentile: 1 },
  ]);
});

describe("GET /v1/areas", () => {
  it("404s when the dark flag is off (before auth)", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await get("/v1/areas?signal=deprivation.imd_decile");
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await get("/v1/areas?signal=deprivation.imd_decile", false);
    expect(res.statusCode).toBe(401);
  });

  it("400s when ?signal is missing (query not run)", async () => {
    const res = await get("/v1/areas?country=England");
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("400s on an invalid country", async () => {
    const res = await get("/v1/areas?signal=deprivation.imd_decile&country=Ireland");
    expect(res.statusCode).toBe(400);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await get("/v1/areas?signal=deprivation.imd_decile");
    expect(res.statusCode).toBe(429);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("200s: runs the query, returns ranked areas, meters the call", async () => {
    const res = await get("/v1/areas?signal=deprivation.imd_decile&country=England&max_percentile=10&limit=5");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signal).toBe("deprivation.imd_decile");
    expect(body.count).toBe(1);
    expect(body.areas[0].geo_code).toBe("E01000001");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ signal: "deprivation.imd_decile", country: "England", maxPercentile: 10, limit: 5 }),
    );
    expect(trackEvent).toHaveBeenCalledWith("api.areas.queried", "user_1", expect.objectContaining({ signal: "deprivation.imd_decile", results: 1 }));
    expect(res.headers["x-engine-version"]).toBeDefined();
  });
});
