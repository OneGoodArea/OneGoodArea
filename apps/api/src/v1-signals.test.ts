import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("./modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("./infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("./modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("./modules/signals", () => ({ getAreaProfile: vi.fn() }));
vi.mock("./modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("./infrastructure/db/client", () => ({ sql: vi.fn() }));

import { buildApp } from "./app";
import { validateApiKey } from "./modules/api-keys";
import { rateLimit } from "./infrastructure/rate-limit";
import { hasApiAccess } from "./modules/usage";
import { getAreaProfile } from "./modules/signals";
import { trackEvent } from "./modules/tracking/activity";

const app = buildApp();
afterAll(() => {
  app.close();
  delete process.env.OGA_SIGNALS_API;
});

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockProfile = vi.mocked(getAreaProfile);

const sig = (key: string, category: string, source: string, value: number | null) => ({
  key, category, label: key, value, unit: "count", direction: "lower_is_better",
  confidence: value === null ? 0 : 0.9, confidence_reason: "x", source, observed_period: "p",
});

const PROFILE = {
  geo: { query: "M1 1AE", postcode: "M1 1AE", latitude: 53.47, longitude: -2.23, lsoa: "E01005207", msoa: "E02000984", admin_district: "Manchester", region: "North West", country: "England", area_type: "urban" },
  signals: [
    sig("crime.total_12m", "crime", "police.uk", 1200),
    sig("crime.monthly_rate", "crime", "police.uk", 100),
    sig("property.median_price", "property", "HM Land Registry", 250000),
    sig("environment.flood_areas_nearby", "environment", "Environment Agency", null),
  ],
  meta: { engine_version: "2.0.2", generated_at: "2026-05-25T00:00:00.000Z", sources: ["police.uk", "HM Land Registry"], fetch_mode: "live" },
} as never;

function get(url: string, withAuth = true) {
  return app.inject({ method: "GET", url, headers: withAuth ? { authorization: "Bearer oga_good" } : {} });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  mockValidate.mockResolvedValue("user_1");
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockProfile.mockResolvedValue(PROFILE);
});

describe("GET /v1/signals/:category", () => {
  it("404s when the dark flag is off, before any auth", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await get("/v1/signals/crime?area=M1%201AE");
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await get("/v1/signals/crime?area=M1%201AE", false);
    expect(res.statusCode).toBe(401);
  });

  it("400s on an unknown category (before geocoding)", async () => {
    const res = await get("/v1/signals/weather?area=M1%201AE");
    expect(res.statusCode).toBe(400);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("400s when no area is provided", async () => {
    const res = await get("/v1/signals/crime");
    expect(res.statusCode).toBe(400);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("404s when the area cannot be geocoded", async () => {
    mockProfile.mockResolvedValue(null);
    const res = await get("/v1/signals/crime?area=Nowhereville");
    expect(res.statusCode).toBe(404);
  });

  it("200s and filters the profile to just the requested category", async () => {
    const res = await get("/v1/signals/crime?area=M1%201AE");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signals).toHaveLength(2);
    expect(body.signals.every((s: { category: string }) => s.category === "crime")).toBe(true);
    expect(body.meta.sources).toEqual(["police.uk"]); // only crime's source
    expect(body.geo.postcode).toBe("M1 1AE");
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
    expect(trackEvent).toHaveBeenCalledWith(
      "api.signals.category",
      "user_1",
      expect.objectContaining({ category: "crime", signals: 2 }),
    );
  });

  it("returns an empty signal set (still 200) for a category with no coverage", async () => {
    const res = await get("/v1/signals/environment?area=M1%201AE");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signals).toHaveLength(1); // the null-coverage flood signal is still listed
    expect(body.signals[0].value).toBeNull();
    expect(body.meta.sources).toEqual([]); // nothing contributed a real value
  });
});
