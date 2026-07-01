import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { Signal } from "@onegoodarea/contracts";

vi.mock("@/modules/signals/data-sources/postcodes", () => ({ geocodeArea: vi.fn() }));
vi.mock("@/modules/signals/data-sources/police", () => ({ getCrimeData: vi.fn() }));
vi.mock("@/modules/signals/data-sources/deprivation", () => ({ getDeprivationData: vi.fn() }));
vi.mock("@/modules/signals/data-sources/openstreetmap", () => ({ getNearbyAmenities: vi.fn() }));
vi.mock("@/modules/signals/data-sources/flood", () => ({ getFloodRisk: vi.fn() }));
vi.mock("@/modules/signals/data-sources/land-registry", () => ({ getPropertyPrices: vi.fn() }));
vi.mock("@/modules/signals/data-sources/ofsted", () => ({ getOfstedSchools: vi.fn() }));
vi.mock("@/modules/signals/store-reader", () => ({
  readDeprivationFromStore: vi.fn(),
  readDeprivationNormalization: vi.fn(),
  readPropertyFromStore: vi.fn(),
  readPropertyNormalization: vi.fn(),
  readCrimeFromStore: vi.fn(),
  readCrimeNormalization: vi.fn(),
}));
vi.mock("@/modules/tracking/structured-logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getAreaProfile } from "@/modules/signals/index";
import { geocodeArea } from "@/modules/signals/data-sources/postcodes";
import { getDeprivationData } from "@/modules/signals/data-sources/deprivation";
import { getPropertyPrices } from "@/modules/signals/data-sources/land-registry";
import { getCrimeData } from "@/modules/signals/data-sources/police";
import {
  readDeprivationFromStore,
  readDeprivationNormalization,
  readPropertyFromStore,
  readPropertyNormalization,
  readCrimeFromStore,
  readCrimeNormalization,
} from "@/modules/signals/store-reader";

const mockGeocode = vi.mocked(geocodeArea);
const mockLiveDep = vi.mocked(getDeprivationData);
const mockLiveProperty = vi.mocked(getPropertyPrices);
const mockLiveCrime = vi.mocked(getCrimeData);
const mockStoreDep = vi.mocked(readDeprivationFromStore);
const mockStoreNorm = vi.mocked(readDeprivationNormalization);
const mockStoreProperty = vi.mocked(readPropertyFromStore);
const mockStorePropertyNorm = vi.mocked(readPropertyNormalization);
const mockStoreCrime = vi.mocked(readCrimeFromStore);
const mockStoreCrimeNorm = vi.mocked(readCrimeNormalization);

const GEO = {
  query: "M1 1AE", latitude: 53.47, longitude: -2.23, admin_district: "Manchester",
  region: "North West", ward: "", constituency: "", country: "England",
  lsoa: "E01005207", lsoa11: "E01005207", msoa: "E02000984",
  rural_urban: "Urban major conurbation", area_type: "urban" as const,
};
const STORE_DEP = { lsoa_code: "E01005207", lsoa_name: "", local_authority: "", imd_rank: 5000, imd_decile: 5 };
const LIVE_DEP = { lsoa_code: "E01005207", lsoa_name: "Manchester 1", local_authority: "Manchester", imd_rank: 6000, imd_decile: 6 };

function decile(signals: Signal[]): number | string | null {
  return signals.find((s) => s.key === "deprivation.imd_decile")!.value;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OGA_SIGNALS_STORE_READ;
  mockGeocode.mockResolvedValue(GEO);
  mockLiveDep.mockResolvedValue(LIVE_DEP);
  mockStoreDep.mockResolvedValue(null);
  mockStoreNorm.mockResolvedValue({});
  mockLiveProperty.mockResolvedValue(null);
  mockStoreProperty.mockResolvedValue(null);
  mockStorePropertyNorm.mockResolvedValue({});
  mockLiveCrime.mockResolvedValue(null);
  mockStoreCrime.mockResolvedValue(null);
  mockStoreCrimeNorm.mockResolvedValue({});
});

function signal(signals: import("@onegoodarea/contracts").Signal[], key: string) {
  return signals.find((s) => s.key === key)!;
}
afterAll(() => { delete process.env.OGA_SIGNALS_STORE_READ; });

describe("getAreaProfile (store-read flip)", () => {
  it("returns null when the area cannot be geocoded", async () => {
    mockGeocode.mockResolvedValue(null);
    expect(await getAreaProfile("Nowhere")).toBeNull();
  });

  it("serves fully live when the store-read flag is off (default)", async () => {
    const profile = (await getAreaProfile("M1 1AE"))!;
    expect(mockStoreDep).not.toHaveBeenCalled();
    expect(mockLiveDep).toHaveBeenCalledOnce();
    expect(profile.meta.fetch_mode).toBe("live");
    expect(decile(profile.signals)).toBe(6); // live value
  });

  it("reads deprivation from the store and skips the live fetch on a hit (hybrid)", async () => {
    process.env.OGA_SIGNALS_STORE_READ = "true";
    mockStoreDep.mockResolvedValue(STORE_DEP);

    const profile = (await getAreaProfile("M1 1AE"))!;

    expect(mockStoreDep).toHaveBeenCalledWith("E01005207");
    expect(mockLiveDep).not.toHaveBeenCalled(); // live deprivation fetch skipped
    expect(profile.meta.fetch_mode).toBe("hybrid");
    expect(decile(profile.signals)).toBe(5); // stored value
  });

  it("enriches store-backed signals with normalized_value + percentile", async () => {
    process.env.OGA_SIGNALS_STORE_READ = "true";
    mockStoreDep.mockResolvedValue(STORE_DEP);
    mockStoreNorm.mockResolvedValue({
      "deprivation.imd_decile": { normalized_value: 0.5, percentile: 50, regional_percentile: 45 },
      "deprivation.imd_rank": { normalized_value: 0.786, percentile: 78.58, regional_percentile: 82.1 },
    });

    const profile = (await getAreaProfile("M1 1AE"))!;

    const dec = signal(profile.signals, "deprivation.imd_decile");
    expect(dec.normalized_value).toBe(0.5);
    expect(dec.percentile).toBe(50);
    // live-only signals carry no normalization
    expect(signal(profile.signals, "crime.total_12m").percentile).toBeUndefined();
  });

  it("falls back to the live fetch on a store miss (stays live)", async () => {
    process.env.OGA_SIGNALS_STORE_READ = "true";
    mockStoreDep.mockResolvedValue(null);

    const profile = (await getAreaProfile("M1 1AE"))!;

    expect(mockStoreDep).toHaveBeenCalledOnce();
    expect(mockLiveDep).toHaveBeenCalledOnce();
    expect(profile.meta.fetch_mode).toBe("live");
    expect(decile(profile.signals)).toBe(6); // live value
  });

  it("reads property from the store and skips the live property fetch on a hit (hybrid)", async () => {
    process.env.OGA_SIGNALS_STORE_READ = "true";
    mockStoreProperty.mockResolvedValue({
      postcode_area: "E01005207", median_price: 285000, mean_price: 285000, transaction_count: 42,
      price_change_pct: null, by_property_type: [], tenure_split: { freehold: 0, leasehold: 0 },
      price_range: { min: 285000, max: 285000 }, period: "2025-01 to 2025-12", prior_median: null,
    });
    mockStorePropertyNorm.mockResolvedValue({ "property.median_price": { normalized_value: 0.99, percentile: 99.24, regional_percentile: 95 } });

    const profile = (await getAreaProfile("M1 1AE"))!;

    expect(mockStoreProperty).toHaveBeenCalledWith("E01005207");
    expect(mockLiveProperty).not.toHaveBeenCalled(); // live property fetch skipped
    expect(profile.meta.fetch_mode).toBe("hybrid");
    const med = signal(profile.signals, "property.median_price");
    expect(med.value).toBe(285000);
    expect(med.percentile).toBe(99.24);
  });

  it("reads crime from the store and skips the live crime fetch on a hit (hybrid)", async () => {
    process.env.OGA_SIGNALS_STORE_READ = "true";
    mockStoreCrime.mockResolvedValue({
      total_crimes: 240, months_covered: 12, by_category: { "Violence and sexual offences": 40 },
      top_streets: [], outcome_breakdown: {},
      monthly_trend: [{ month: "2025-01", count: 18 }, { month: "2025-12", count: 22 }],
    });
    mockStoreCrimeNorm.mockResolvedValue({ "crime.total_12m": { normalized_value: 0.42, percentile: 41.5, regional_percentile: 38.2 } });

    const profile = (await getAreaProfile("M1 1AE"))!;

    expect(mockStoreCrime).toHaveBeenCalledWith("E01005207");
    expect(mockLiveCrime).not.toHaveBeenCalled(); // live crime fetch skipped
    expect(profile.meta.fetch_mode).toBe("hybrid");
    const total = signal(profile.signals, "crime.total_12m");
    expect(total.value).toBe(240);
    expect(total.percentile).toBe(41.5);
    // monthly rate derives from the stored total + months_covered
    expect(signal(profile.signals, "crime.monthly_rate").value).toBe(20); // 240 / 12
  });
});
