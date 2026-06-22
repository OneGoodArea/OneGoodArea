import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/modules/api-keys", () => ({ validateApiKey: vi.fn() }));
vi.mock("@/infrastructure/rate-limit", () => ({ rateLimit: vi.fn(), rateLimitHeaders: () => ({}) }));
vi.mock("@/modules/usage", () => ({ hasApiAccess: vi.fn() }));
vi.mock("@/modules/tracking/activity", () => ({ trackEvent: vi.fn() }));
vi.mock("@/infrastructure/db/client", () => ({ sql: vi.fn(), query: vi.fn() }));
vi.mock("@/modules/cache/area-cache", () => ({ getCachedAreaResult: vi.fn() }));
// Partial mock: keep real exports (e.g. parseAreasQuery) but stub DB-touching functions.
vi.mock("@/modules/signals", async (orig) => {
  const actual = await orig() as object;
  return { ...actual, getAreaProfile: vi.fn(), queryAreas: vi.fn() };
});

import { buildApp } from "@/app";
import { validateApiKey } from "@/modules/api-keys";
import { rateLimit } from "@/infrastructure/rate-limit";
import { hasApiAccess } from "@/modules/usage";
import { getAreaProfile, queryAreas } from "@/modules/signals";
import { trackEvent } from "@/modules/tracking/activity";
import { sql } from "@/infrastructure/db/client";
import { getCachedAreaResult } from "@/modules/cache/area-cache";

const app = await buildApp();
afterAll(() => {
  app.close();
  delete process.env.OGA_SIGNALS_API;
});

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockProfile = vi.mocked(getAreaProfile);
const mockQuery = vi.mocked(queryAreas);
const mockCache = vi.mocked(getCachedAreaResult);

// ── v1-area + v1-signals shared profile ────────────────────────────

const sig = (key: string, category: string, source: string, value: number | null) => ({
  key, category, label: key, value, unit: "count", direction: "lower_is_better",
  confidence: value === null ? 0 : 0.9, confidence_reason: "x", source, observed_period: "p",
});

const PROFILE_SIGNALS = {
  geo: { query: "M1 1AE", postcode: "M1 1AE", latitude: 53.47, longitude: -2.23, lsoa: "E01005207", msoa: "E02000984", admin_district: "Manchester", region: "North West", country: "England", area_type: "urban" },
  signals: [
    sig("crime.total_12m", "crime", "police.uk", 1200),
    sig("crime.monthly_rate", "crime", "police.uk", 100),
    sig("property.median_price", "property", "HM Land Registry", 250000),
    sig("environment.flood_areas_nearby", "environment", "Environment Agency", null),
  ],
  meta: { engine_version: "2.0.2", generated_at: "2026-05-25T00:00:00.000Z", sources: ["police.uk", "HM Land Registry"], fetch_mode: "live" },
} as never;

const PROFILE_AREA = {
  geo: { query: "M1 1AE", postcode: "M1 1AE", latitude: 53.47, longitude: -2.23, lsoa: "E01005207", msoa: "E02000984", admin_district: "Manchester", region: "North West", country: "England", area_type: "urban" },
  signals: [{ key: "crime.total_12m", category: "crime", label: "Recorded crimes (12 months)", value: 1200, unit: "count", direction: "lower_is_better", confidence: 0.9, confidence_reason: "ok", source: "police.uk", observed_period: "Apr 2025 to Mar 2026" }],
  meta: { engine_version: "2.0.2", generated_at: "2026-05-25T00:00:00.000Z", sources: ["police.uk"], fetch_mode: "live" },
} as never;

function apiGet(url: string, withAuth = true) {
  return app.inject({ method: "GET", url, headers: withAuth ? { authorization: "Bearer oga_good" } : {} });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true";
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockProfile.mockResolvedValue(PROFILE_AREA);
  mockQuery.mockResolvedValue([
    { geo_type: "lsoa", geo_code: "E01000001", value: 1, normalized_value: 0.01, percentile: 1 },
  ]);
  mockCache.mockResolvedValue(null);
});

// ── v1-area.test.ts ─────────────────────────────────────────────────

describe("GET /v1/area", () => {
  it("404s like an unknown route when the dark flag is off (before any auth)", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await apiGet("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await apiGet("/v1/area?area=M1%201AE", false);
    expect(res.statusCode).toBe(401);
  });

  it("401s on an invalid key", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await apiGet("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(401);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await apiGet("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(429);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await apiGet("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(403);
  });

  it("400s when no area/postcode param is provided", async () => {
    const res = await apiGet("/v1/area");
    expect(res.statusCode).toBe(400);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("404s when the area cannot be geocoded", async () => {
    mockProfile.mockResolvedValue(null);
    const res = await apiGet("/v1/area?area=Nowhereville");
    expect(res.statusCode).toBe(404);
  });

  it("200s on the happy path: returns the profile, meters the call, stamps the engine version", async () => {
    const res = await apiGet("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.geo.postcode).toBe("M1 1AE");
    expect(body.signals[0].key).toBe("crime.total_12m");
    expect(body.meta.fetch_mode).toBe("live");
    expect(mockProfile).toHaveBeenCalledWith("M1 1AE");
    expect(trackEvent).toHaveBeenCalledWith(
      "api.area.profiled",
      "user_1",
      expect.objectContaining({ area: "M1 1AE", signals: 1, sources: 1 }),
      null,
    );
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
  });

  it("accepts the ?postcode= alias", async () => {
    const res = await apiGet("/v1/area?postcode=M1%201AE");
    expect(res.statusCode).toBe(200);
    expect(mockProfile).toHaveBeenCalledWith("M1 1AE");
  });
});

describe("GET /v1/area — Levers bundle filter (AR-195)", () => {
  const PROFILE_MULTI = {
    geo: { query: "M1 1AE", postcode: "M1 1AE", latitude: 53.47, longitude: -2.23, lsoa: "E01005207", msoa: "E02000984", admin_district: "Manchester", region: "North West", country: "England", area_type: "urban" },
    signals: [
      { key: "crime.total_12m", category: "crime", label: "crime", value: 1200, unit: "count", direction: "lower_is_better", confidence: 0.9, confidence_reason: "ok", source: "police.uk", observed_period: "2025" },
      { key: "property.median_price", category: "property", label: "price", value: 250000, unit: "GBP", direction: "neutral", confidence: 0.9, confidence_reason: "ok", source: "land_registry", observed_period: "2025" },
      { key: "deprivation.imd_decile", category: "deprivation", label: "imd", value: 5, unit: "decile", direction: "higher_is_better", confidence: 1, confidence_reason: "ok", source: "imd", observed_period: "2025" },
    ],
    meta: { engine_version: "2.0.2", generated_at: "2026-05-25T00:00:00.000Z", sources: ["police.uk", "land_registry", "imd"], fetch_mode: "live" },
  } as never;

  it("filters response signals to the bundle whitelist when ?bundle= is set", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    mockProfile.mockResolvedValue(PROFILE_MULTI);
    vi.mocked(sql).mockResolvedValueOnce([{
      id: "bndl_x", org_id: "org_acme", slug: "underwriting", name: "Underwriting v1",
      signal_keys: ["property.median_price", "deprivation.imd_decile"],
      created_at: "2026-05-28", updated_at: "2026-05-28",
    }] as never);

    const res = await apiGet("/v1/area?postcode=M1%201AE&bundle=bndl_x");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signals.map((s: { key: string }) => s.key).sort()).toEqual([
      "deprivation.imd_decile",
      "property.median_price",
    ]);
    expect(body.meta.sources.sort()).toEqual(["imd", "land_registry"]);
  });

  it("404s when ?bundle= references an unknown id", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    vi.mocked(sql).mockResolvedValueOnce([] as never);
    const res = await apiGet("/v1/area?postcode=M1%201AE&bundle=bndl_nope");
    expect(res.statusCode).toBe(404);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("returns full profile when no ?bundle= is set (default behaviour unchanged)", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    mockProfile.mockResolvedValue(PROFILE_MULTI);
    const res = await apiGet("/v1/area?postcode=M1%201AE");
    expect(res.statusCode).toBe(200);
    expect(res.json().signals).toHaveLength(3);
  });
});

// ── v1-signals.test.ts ──────────────────────────────────────────────

describe("GET /v1/signals/:category", () => {
  beforeEach(() => {
    mockProfile.mockResolvedValue(PROFILE_SIGNALS);
  });

  it("404s when the dark flag is off, before any auth", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await apiGet("/v1/signals/crime?area=M1%201AE");
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await apiGet("/v1/signals/crime?area=M1%201AE", false);
    expect(res.statusCode).toBe(401);
  });

  it("400s on an unknown category (before geocoding)", async () => {
    const res = await apiGet("/v1/signals/weather?area=M1%201AE");
    expect(res.statusCode).toBe(400);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("400s when no area is provided", async () => {
    const res = await apiGet("/v1/signals/crime");
    expect(res.statusCode).toBe(400);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("404s when the area cannot be geocoded", async () => {
    mockProfile.mockResolvedValue(null);
    const res = await apiGet("/v1/signals/crime?area=Nowhereville");
    expect(res.statusCode).toBe(404);
  });

  it("200s and filters the profile to just the requested category", async () => {
    const res = await apiGet("/v1/signals/crime?area=M1%201AE");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signals).toHaveLength(2);
    expect(body.signals.every((s: { category: string }) => s.category === "crime")).toBe(true);
    expect(body.meta.sources).toEqual(["police.uk"]);
    expect(body.geo.postcode).toBe("M1 1AE");
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
    expect(trackEvent).toHaveBeenCalledWith(
      "api.signals.category",
      "user_1",
      expect.objectContaining({ category: "crime", signals: 2 }),
      null,
    );
  });

  it("returns an empty signal set (still 200) for a category with no coverage", async () => {
    const res = await apiGet("/v1/signals/environment?area=M1%201AE");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signals).toHaveLength(1);
    expect(body.signals[0].value).toBeNull();
    expect(body.meta.sources).toEqual([]);
  });
});

// ── v1-areas.test.ts ────────────────────────────────────────────────

describe("GET /v1/areas", () => {
  it("404s when the dark flag is off (before auth)", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await apiGet("/v1/areas?signal=deprivation.imd_decile");
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await apiGet("/v1/areas?signal=deprivation.imd_decile", false);
    expect(res.statusCode).toBe(401);
  });

  it("400s when ?signal is missing (query not run)", async () => {
    const res = await apiGet("/v1/areas?country=England");
    expect(res.statusCode).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("400s on an invalid country", async () => {
    const res = await apiGet("/v1/areas?signal=deprivation.imd_decile&country=Ireland");
    expect(res.statusCode).toBe(400);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await apiGet("/v1/areas?signal=deprivation.imd_decile");
    expect(res.statusCode).toBe(429);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("200s: runs the query, returns ranked areas, meters the call", async () => {
    const res = await apiGet("/v1/areas?signal=deprivation.imd_decile&country=England&max_percentile=10&limit=5");
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.signal).toBe("deprivation.imd_decile");
    expect(body.count).toBe(1);
    expect(body.areas[0].geo_code).toBe("E01000001");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ signal: "deprivation.imd_decile", country: "England", maxPercentile: 10, limit: 5 }),
    );
    expect(trackEvent).toHaveBeenCalledWith("api.areas.queried", "user_1", expect.objectContaining({ signal: "deprivation.imd_decile", results: 1 }), null);
    expect(res.headers["x-engine-version"]).toBeDefined();
  });
});

// ── widget.test.ts ──────────────────────────────────────────────────

describe("OPTIONS /widget", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await app.inject({ method: "OPTIONS", url: "/widget", headers: { origin: "https://embed.example.com" } });
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("https://embed.example.com");
    expect(res.headers["access-control-allow-methods"]).toBe("GET, OPTIONS");
  });
});

describe("GET /widget", () => {
  it("sets CORS headers and 400s without a postcode", async () => {
    const res = await app.inject({ method: "GET", url: "/widget" });
    expect(res.statusCode).toBe(400);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("400s on an invalid postcode", async () => {
    const res = await app.inject({ method: "GET", url: "/widget?postcode=%20" });
    expect(res.statusCode).toBe(400);
    expect(mockCache).not.toHaveBeenCalled();
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await app.inject({ method: "GET", url: "/widget?postcode=M1+1AE" });
    expect(res.statusCode).toBe(429);
    expect(mockCache).not.toHaveBeenCalled();
  });

  it("404s on a cache miss (cache-only, never generates)", async () => {
    mockCache.mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/widget?postcode=M1+1AE" });
    expect(res.statusCode).toBe(404);
  });

  it("returns the shaped cached summary on a hit", async () => {
    mockCache.mockResolvedValue({
      report: {
        area: "Manchester",
        intent: "moving",
        areaiq_score: 72,
        area_type: "urban",
        sub_scores: [
          { label: "Safety", score: 60 },
          { label: "Transport", score: 80 },
        ],
      },
      area: "Manchester",
      score: 72,
      created_at: "2026-05-24T00:00:00.000Z",
    } as never);

    const res = await app.inject({ method: "GET", url: "/widget?postcode=M1+1AE&intent=moving" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.area).toBe("Manchester");
    expect(body.score).toBe(72);
    expect(body.area_type).toBe("urban");
    expect(body.dimensions).toEqual([
      { label: "Safety", score: 60 },
      { label: "Transport", score: 80 },
    ]);
    expect(body.powered_by).toBe("https://www.onegoodarea.com");
  });
});
