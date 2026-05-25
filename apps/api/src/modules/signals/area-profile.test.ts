import { describe, it, expect } from "vitest";
import { AreaProfileSchema, type Signal } from "@onegoodarea/contracts";
import { buildAreaProfile, type AreaSources } from "./area-profile";
import type { GeocodedArea } from "../reports/data-sources/postcodes";

const geo: GeocodedArea = {
  query: "M1 1AE",
  latitude: 53.47,
  longitude: -2.23,
  admin_district: "Manchester",
  region: "North West",
  ward: "City Centre",
  constituency: "Manchester Central",
  country: "England",
  lsoa: "E01005207",
  lsoa11: "E01005207",
  msoa: "E02000984",
  rural_urban: "Urban major conurbation",
  area_type: "urban",
};

const fullSources: AreaSources = {
  crime: {
    total_crimes: 1200,
    months_covered: 12,
    by_category: { "anti-social-behaviour": 400 },
    top_streets: [],
    outcome_breakdown: {},
    monthly_trend: [
      { month: "2025-04", count: 100 },
      { month: "2026-03", count: 100 },
    ],
  },
  deprivation: { lsoa_code: "E01005207", lsoa_name: "Manchester 001A", local_authority: "Manchester", imd_rank: 5000, imd_decile: 3 },
  amenities: { schools: 5, restaurants_cafes: 40, pubs_bars: 15, healthcare: 8, shops: 60, parks_leisure: 6, transport_stations: 3, bus_stops: 25, total: 162, highlights: [] },
  flood: { flood_areas_nearby: 2, rivers_at_risk: ["Irwell"], active_warnings: [{ description: "x", severity: "Flood warning", severityLevel: 2, message: "m" }] },
  property: { postcode_area: "M1", median_price: 250000, mean_price: 260000, transaction_count: 83, price_change_pct: 4.2, by_property_type: [], tenure_split: { freehold: 10, leasehold: 73 }, price_range: { min: 100000, max: 500000 }, period: "2025", prior_median: 240000 },
  ofsted: { schools: [], total_rated: 6, rating_breakdown: { Outstanding: 2, Good: 2, "Requires improvement": 1, Inadequate: 1 }, inspectorate: "Ofsted" },
};

const emptySources: AreaSources = { crime: null, deprivation: null, amenities: null, flood: null, property: null, ofsted: null };

function byKey(signals: Signal[], key: string): Signal {
  const s = signals.find((x) => x.key === key);
  if (!s) throw new Error(`signal ${key} missing from catalog`);
  return s;
}

describe("buildAreaProfile", () => {
  it("produces a schema-valid profile", () => {
    const profile = buildAreaProfile(geo, fullSources);
    expect(() => AreaProfileSchema.parse(profile)).not.toThrow();
  });

  it("carries the geo identity and a live fetch_mode", () => {
    const { geo: g, meta } = buildAreaProfile(geo, fullSources);
    expect(g.postcode).toBe("M1 1AE");
    expect(g.lsoa).toBe("E01005207");
    expect(g.area_type).toBe("urban");
    expect(meta.fetch_mode).toBe("live");
    expect(meta.engine_version).toBeTruthy();
  });

  it("maps raw source values onto the signal catalog", () => {
    const { signals } = buildAreaProfile(geo, fullSources);
    expect(byKey(signals, "crime.total_12m").value).toBe(1200);
    expect(byKey(signals, "crime.monthly_rate").value).toBe(100); // 1200 / 12
    expect(byKey(signals, "deprivation.imd_decile").value).toBe(3);
    expect(byKey(signals, "property.median_price").value).toBe(250000);
    expect(byKey(signals, "property.price_change_pct").value).toBe(4.2);
    expect(byKey(signals, "transport.stations").value).toBe(3);
    expect(byKey(signals, "environment.active_flood_warnings").value).toBe(1);
  });

  it("derives good_or_outstanding_pct from the Ofsted rating breakdown", () => {
    const { signals } = buildAreaProfile(geo, fullSources);
    // (Outstanding 2 + Good 2) / 6 rated = 67%
    expect(byKey(signals, "schools.good_or_outstanding_pct").value).toBe(67);
  });

  it("attributes deprivation to the country-correct index", () => {
    const england = buildAreaProfile(geo, fullSources);
    expect(byKey(england.signals, "deprivation.imd_decile").source).toBe("IMD 2025");

    const welsh = buildAreaProfile(geo, {
      ...fullSources,
      deprivation: { lsoa_code: "W01000123", lsoa_name: "Cardiff 1", local_authority: "Cardiff", imd_rank: 900, imd_decile: 5 },
    });
    expect(byKey(welsh.signals, "deprivation.imd_decile").source).toBe("WIMD 2019");
  });

  it("scales property confidence with the transaction sample", () => {
    const robust = buildAreaProfile(geo, fullSources);
    expect(byKey(robust.signals, "property.median_price").confidence).toBe(0.9); // 83 txns

    const thin = buildAreaProfile(geo, {
      ...fullSources,
      property: { ...fullSources.property!, transaction_count: 4 },
    });
    expect(byKey(thin.signals, "property.median_price").confidence).toBe(0.4); // <10 txns
  });

  it("scales crime confidence with months of data", () => {
    const sparse = buildAreaProfile(geo, {
      ...fullSources,
      crime: { ...fullSources.crime!, months_covered: 2 },
    });
    expect(byKey(sparse.signals, "crime.total_12m").confidence).toBe(0.4);
  });

  it("lists only the sources that actually contributed", () => {
    const { meta } = buildAreaProfile(geo, fullSources);
    expect(meta.sources).toEqual(
      expect.arrayContaining(["police.uk", "IMD 2025", "HM Land Registry", "OpenStreetMap", "Environment Agency", "Ofsted"]),
    );
  });

  it("keeps a stable catalog with value:null + confidence 0 when a source has no coverage", () => {
    const full = buildAreaProfile(geo, fullSources);
    const empty = buildAreaProfile(geo, emptySources);

    // Same set of signal keys regardless of coverage (predictable schema).
    expect(empty.signals.map((s) => s.key)).toEqual(full.signals.map((s) => s.key));

    for (const s of empty.signals) {
      expect(s.value).toBeNull();
      expect(s.confidence).toBe(0);
      expect(s.confidence_reason).toMatch(/no .* coverage|no .* found/i);
    }
    expect(empty.meta.sources).toEqual([]);
    // Still a valid profile.
    expect(() => AreaProfileSchema.parse(empty)).not.toThrow();
  });
});
