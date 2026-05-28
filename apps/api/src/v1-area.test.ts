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
import { sql } from "./infrastructure/db/client";

const app = buildApp();
afterAll(() => {
  app.close();
  delete process.env.OGA_SIGNALS_API;
});

const mockValidate = vi.mocked(validateApiKey);
const mockRate = vi.mocked(rateLimit);
const mockApiAccess = vi.mocked(hasApiAccess);
const mockProfile = vi.mocked(getAreaProfile);

const PROFILE = {
  geo: { query: "M1 1AE", postcode: "M1 1AE", latitude: 53.47, longitude: -2.23, lsoa: "E01005207", msoa: "E02000984", admin_district: "Manchester", region: "North West", country: "England", area_type: "urban" },
  signals: [{ key: "crime.total_12m", category: "crime", label: "Recorded crimes (12 months)", value: 1200, unit: "count", direction: "lower_is_better", confidence: 0.9, confidence_reason: "ok", source: "police.uk", observed_period: "Apr 2025 to Mar 2026" }],
  meta: { engine_version: "2.0.2", generated_at: "2026-05-25T00:00:00.000Z", sources: ["police.uk"], fetch_mode: "live" },
} as never;

function get(url: string, withAuth = true) {
  return app.inject({
    method: "GET",
    url,
    headers: withAuth ? { authorization: "Bearer oga_good" } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OGA_SIGNALS_API = "true"; // flag on for most tests
  mockValidate.mockResolvedValue({ userId: "user_1", orgId: null });
  mockRate.mockResolvedValue({ success: true, remaining: 29, reset: 0 });
  mockApiAccess.mockResolvedValue(true);
  mockProfile.mockResolvedValue(PROFILE);
});

describe("GET /v1/area", () => {
  it("404s like an unknown route when the dark flag is off (before any auth)", async () => {
    process.env.OGA_SIGNALS_API = "false";
    const res = await get("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(404);
    expect(mockValidate).not.toHaveBeenCalled();
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("401s without a bearer token", async () => {
    const res = await get("/v1/area?area=M1%201AE", false);
    expect(res.statusCode).toBe(401);
  });

  it("401s on an invalid key", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await get("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(401);
  });

  it("429s when rate limited", async () => {
    mockRate.mockResolvedValue({ success: false, remaining: 0, reset: 0 });
    const res = await get("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(429);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("403s when the plan has no API access", async () => {
    mockApiAccess.mockResolvedValue(false);
    const res = await get("/v1/area?area=M1%201AE");
    expect(res.statusCode).toBe(403);
  });

  it("400s when no area/postcode param is provided", async () => {
    const res = await get("/v1/area");
    expect(res.statusCode).toBe(400);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("404s when the area cannot be geocoded", async () => {
    mockProfile.mockResolvedValue(null);
    const res = await get("/v1/area?area=Nowhereville");
    expect(res.statusCode).toBe(404);
  });

  it("200s on the happy path: returns the profile, meters the call, stamps the engine version", async () => {
    const res = await get("/v1/area?area=M1%201AE");
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
    );
    expect(res.headers["x-engine-version"]).toBe("2.0.2");
  });

  it("accepts the ?postcode= alias", async () => {
    const res = await get("/v1/area?postcode=M1%201AE");
    expect(res.statusCode).toBe(200);
    expect(mockProfile).toHaveBeenCalledWith("M1 1AE");
  });
});

/* Levers (AR-195): ?bundle= filtering on /v1/area. The bundle resolution
   goes through the orgs/bundles module which hits `sql` once. Test setup
   primes the sql mock with the bundle row; the second validateApiKey call
   (from requireApiAccessWithOrg) re-uses the same mockResolvedValue. */
describe("GET /v1/area — Levers bundle filter (AR-195)", () => {
  const PROFILE_MULTI = {
    ...PROFILE,
    signals: [
      { key: "crime.total_12m", category: "crime", label: "crime", value: 1200, unit: "count", direction: "lower_is_better", confidence: 0.9, confidence_reason: "ok", source: "police.uk", observed_period: "2025" },
      { key: "property.median_price", category: "property", label: "price", value: 250000, unit: "GBP", direction: "neutral", confidence: 0.9, confidence_reason: "ok", source: "land_registry", observed_period: "2025" },
      { key: "deprivation.imd_decile", category: "deprivation", label: "imd", value: 5, unit: "decile", direction: "higher_is_better", confidence: 1, confidence_reason: "ok", source: "imd", observed_period: "2025" },
    ],
    meta: { ...PROFILE.meta, sources: ["police.uk", "land_registry", "imd"] },
  } as never;

  it("filters response signals to the bundle whitelist when ?bundle= is set", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    mockProfile.mockResolvedValue(PROFILE_MULTI);
    // First sql call = getBundle SELECT.
    vi.mocked(sql).mockResolvedValueOnce([{
      id: "bndl_x", org_id: "org_acme", slug: "underwriting", name: "Underwriting v1",
      signal_keys: ["property.median_price", "deprivation.imd_decile"],
      created_at: "2026-05-28", updated_at: "2026-05-28",
    }] as never);

    const res = await get("/v1/area?postcode=M1%201AE&bundle=bndl_x");
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
    vi.mocked(sql).mockResolvedValueOnce([] as never); // bundle SELECT -> 0 rows
    const res = await get("/v1/area?postcode=M1%201AE&bundle=bndl_nope");
    expect(res.statusCode).toBe(404);
    expect(mockProfile).not.toHaveBeenCalled();
  });

  it("returns full profile when no ?bundle= is set (default behaviour unchanged)", async () => {
    mockValidate.mockResolvedValue({ userId: "user_1", orgId: "org_acme" });
    mockProfile.mockResolvedValue(PROFILE_MULTI);
    const res = await get("/v1/area?postcode=M1%201AE");
    expect(res.statusCode).toBe(200);
    expect(res.json().signals).toHaveLength(3);
  });
});
