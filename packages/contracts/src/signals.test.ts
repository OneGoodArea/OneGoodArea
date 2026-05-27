import { describe, it, expect } from "vitest";
import {
  SignalSchema,
  AreaGeoSchema,
  AreaProfileSchema,
  SignalCategorySchema,
  SIGNAL_CATEGORIES,
  isSignalCategory,
  type Signal,
  type AreaProfile,
} from "./signals";

const validSignal: Signal = {
  key: "crime.total_12m",
  category: "crime",
  label: "Total recorded crime (12 months)",
  value: 540,
  unit: "count",
  direction: "lower_is_better",
  confidence: 0.9,
  confidence_reason: "police.uk returned 12 months of data for this area.",
  source: "police.uk",
  observed_period: "Apr 2025 to Mar 2026",
};

describe("SignalSchema", () => {
  it("accepts a well-formed signal", () => {
    expect(SignalSchema.parse(validSignal)).toEqual(validSignal);
  });

  it("accepts a null value (no source coverage) and a string value", () => {
    expect(SignalSchema.parse({ ...validSignal, value: null }).value).toBeNull();
    expect(SignalSchema.parse({ ...validSignal, value: "Outstanding" }).value).toBe("Outstanding");
  });

  it("accepts optional store-backed normalization (normalized_value 0-1, percentile 0-100)", () => {
    const enriched = SignalSchema.parse({ ...validSignal, normalized_value: 0.786, percentile: 78.58 });
    expect(enriched.normalized_value).toBe(0.786);
    expect(enriched.percentile).toBe(78.58);
    // omitted on live signals
    expect(SignalSchema.parse(validSignal).percentile).toBeUndefined();
    // out-of-range percentile rejected
    expect(() => SignalSchema.parse({ ...validSignal, percentile: 140 })).toThrow();
  });

  it("rejects confidence outside 0..1", () => {
    expect(() => SignalSchema.parse({ ...validSignal, confidence: 1.5 })).toThrow();
    expect(() => SignalSchema.parse({ ...validSignal, confidence: -0.1 })).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() => SignalSchema.parse({ ...validSignal, category: "weather" })).toThrow();
  });

  it("rejects an unknown direction", () => {
    expect(() => SignalSchema.parse({ ...validSignal, direction: "up" })).toThrow();
  });
});

describe("SignalCategorySchema", () => {
  it("exposes the seven live categories", () => {
    expect(SIGNAL_CATEGORIES).toEqual([
      "crime",
      "deprivation",
      "property",
      "schools",
      "amenities",
      "transport",
      "environment",
    ]);
    for (const c of SIGNAL_CATEGORIES) {
      expect(SignalCategorySchema.parse(c)).toBe(c);
    }
  });

  it("isSignalCategory guards the trust boundary", () => {
    expect(isSignalCategory("crime")).toBe(true);
    expect(isSignalCategory("environment")).toBe(true);
    expect(isSignalCategory("weather")).toBe(false);
    expect(isSignalCategory(null)).toBe(false);
    expect(isSignalCategory(42)).toBe(false);
  });
});

describe("AreaGeoSchema", () => {
  it("accepts a postcode-resolved area and a place-name area (null postcode)", () => {
    const base = {
      query: "M1 1AE",
      postcode: "M1 1AE",
      latitude: 53.47,
      longitude: -2.23,
      lsoa: "E01005207",
      msoa: "E02000984",
      admin_district: "Manchester",
      region: "North West",
      country: "England",
      area_type: "urban" as const,
    };
    expect(AreaGeoSchema.parse(base).postcode).toBe("M1 1AE");
    expect(AreaGeoSchema.parse({ ...base, query: "Soho", postcode: null }).postcode).toBeNull();
  });

  it("rejects an unknown area_type", () => {
    expect(() =>
      AreaGeoSchema.parse({
        query: "x", postcode: null, latitude: 0, longitude: 0,
        lsoa: null, msoa: null, admin_district: null, region: null,
        country: "England", area_type: "coastal",
      }),
    ).toThrow();
  });
});

describe("AreaProfileSchema", () => {
  const profile: AreaProfile = {
    geo: {
      query: "M1 1AE", postcode: "M1 1AE", latitude: 53.47, longitude: -2.23,
      lsoa: "E01005207", msoa: "E02000984", admin_district: "Manchester",
      region: "North West", country: "England", area_type: "urban",
    },
    signals: [validSignal],
    meta: {
      engine_version: "2.0.2",
      generated_at: "2026-05-25T12:00:00.000Z",
      sources: ["police.uk"],
      fetch_mode: "live",
    },
  };

  it("round-trips a full profile", () => {
    expect(AreaProfileSchema.parse(profile)).toEqual(profile);
  });

  it("allows live | store | hybrid as fetch_mode and rejects anything else", () => {
    for (const mode of ["live", "store", "hybrid"] as const) {
      expect(AreaProfileSchema.parse({ ...profile, meta: { ...profile.meta, fetch_mode: mode } }).meta.fetch_mode).toBe(mode);
    }
    expect(() => AreaProfileSchema.parse({ ...profile, meta: { ...profile.meta, fetch_mode: "cached" } })).toThrow();
  });
});
