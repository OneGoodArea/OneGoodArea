import { describe, it, expect } from "vitest";
import { computeScores } from "../lib/scoring-engine";
import type { CrimeSummary } from "../lib/data-sources/police";
import type { DeprivationData } from "../lib/data-sources/deprivation";
import type { AmenitiesData } from "../lib/data-sources/openstreetmap";
import type { FloodRiskData } from "../lib/data-sources/flood";
import type { PropertyPriceData } from "../lib/data-sources/land-registry";
import type { OfstedData } from "../lib/data-sources/ofsted";

/* ── Test fixtures ── */

const crime: CrimeSummary = {
  total_crimes: 300,
  months_covered: 3,
  by_category: { "violent-crime": 60, "burglary": 30, "shoplifting": 210 },
  top_streets: [{ name: "High Street", count: 50 }],
  outcome_breakdown: { "Investigation complete": 100 },
  monthly_trend: [
    { month: "2025-01", count: 95 },
    { month: "2025-02", count: 100 },
    { month: "2025-03", count: 105 },
  ],
};

const deprivation: DeprivationData = {
  lsoa_code: "E01000001",
  lsoa_name: "Test LSOA",
  local_authority: "Test LA",
  imd_rank: 16878,
  imd_decile: 5,
};

const amenities: AmenitiesData = {
  schools: 10,
  restaurants_cafes: 15,
  pubs_bars: 5,
  healthcare: 4,
  shops: 8,
  parks_leisure: 6,
  transport_stations: 3,
  bus_stops: 12,
  total: 63,
  highlights: ["Test Station", "Central Station"],
};

const flood: FloodRiskData = {
  flood_areas_nearby: 2,
  rivers_at_risk: ["River Test"],
  active_warnings: [],
};

const propertyPrices: PropertyPriceData = {
  postcode_area: "SW1",
  median_price: 350000,
  mean_price: 400000,
  transaction_count: 150,
  price_change_pct: 3.5,
  by_property_type: [{ type: "Flat", median: 300000, count: 80 }],
  tenure_split: { freehold: 60, leasehold: 90 },
  price_range: { min: 150000, max: 2000000 },
  period: "2024-2025",
  prior_median: 338000,
};

const ofsted: OfstedData = {
  schools: [
    { urn: 1, school_name: "Test Primary", phase: "Primary", overall_rating: 1, rating_text: "Outstanding", inspection_date: "2024-01-01", distance_km: 0.5 },
    { urn: 2, school_name: "Test Secondary", phase: "Secondary", overall_rating: 2, rating_text: "Good", inspection_date: "2024-02-01", distance_km: 0.8 },
    { urn: 3, school_name: "Test Academy", phase: "Primary", overall_rating: 3, rating_text: "Requires Improvement", inspection_date: "2024-03-01", distance_km: 1.2 },
  ],
  total_rated: 3,
  rating_breakdown: { Outstanding: 1, Good: 1, "Requires Improvement": 1 },
  inspectorate: "Ofsted",
};

/* ── Core properties ── */

describe("computeScores", () => {
  describe("general properties", () => {
    it("returns scores for all 4 intents", () => {
      for (const intent of ["moving", "business", "investing", "research"] as const) {
        const result = computeScores(intent, crime, deprivation, amenities, flood);
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
        expect(result.dimensions.length).toBe(5);
        expect(result.area_type).toBe("suburban");
      }
    });

    it("is deterministic (same input = same output)", () => {
      const a = computeScores("moving", crime, deprivation, amenities, flood);
      const b = computeScores("moving", crime, deprivation, amenities, flood);
      expect(a).toEqual(b);
    });

    it("clamps all dimension scores between 5 and 95", () => {
      for (const intent of ["moving", "business", "investing", "research"] as const) {
        const result = computeScores(intent, crime, deprivation, amenities, flood);
        for (const dim of result.dimensions) {
          expect(dim.score).toBeGreaterThanOrEqual(5);
          expect(dim.score).toBeLessThanOrEqual(95);
        }
      }
    });

    it("dimension weights sum to 100", () => {
      for (const intent of ["moving", "business", "investing", "research"] as const) {
        const result = computeScores(intent, crime, deprivation, amenities, flood);
        const totalWeight = result.dimensions.reduce((s, d) => s + d.weight, 0);
        expect(totalWeight).toBe(100);
      }
    });

    it("every dimension has a non-empty reasoning string", () => {
      for (const intent of ["moving", "business", "investing", "research"] as const) {
        const result = computeScores(intent, crime, deprivation, amenities, flood);
        for (const dim of result.dimensions) {
          expect(dim.reasoning.length).toBeGreaterThan(0);
        }
      }
    });
  });

  /* ── Null / missing data handling ── */

  describe("null data graceful degradation", () => {
    it("returns fallback scores when everything is null", () => {
      for (const intent of ["moving", "business", "investing", "research"] as const) {
        const result = computeScores(intent, null, null, null, null);
        for (const dim of result.dimensions) {
          // All null → fallback scores (50 for most, 40-45 for environment/risk composites)
          expect(dim.score).toBeGreaterThanOrEqual(30);
          expect(dim.score).toBeLessThanOrEqual(50);
        }
      }
    });

    it("handles partial null data without crashing", () => {
      expect(() => computeScores("moving", crime, null, amenities, null)).not.toThrow();
      expect(() => computeScores("investing", null, deprivation, null, flood)).not.toThrow();
      expect(() => computeScores("business", null, null, amenities, null)).not.toThrow();
    });
  });

  /* ── Area type benchmarks ── */

  describe("area type benchmarks", () => {
    it("produces different scores for different area types", () => {
      const urban = computeScores("moving", crime, deprivation, amenities, flood, "urban");
      const rural = computeScores("moving", crime, deprivation, amenities, flood, "rural");
      // Same data, different benchmarks — at least one dimension should differ
      const urbanScores = urban.dimensions.map(d => d.score);
      const ruralScores = rural.dimensions.map(d => d.score);
      expect(urbanScores).not.toEqual(ruralScores);
    });

    it("sets area_type on the result", () => {
      expect(computeScores("moving", crime, deprivation, amenities, flood, "urban").area_type).toBe("urban");
      expect(computeScores("moving", crime, deprivation, amenities, flood, "rural").area_type).toBe("rural");
    });
  });

  /* ── Safety scoring ── */

  describe("safety scoring", () => {
    it("scores low crime areas higher", () => {
      const lowCrime: CrimeSummary = { ...crime, total_crimes: 30, by_category: { shoplifting: 30 }, monthly_trend: [] };
      const highCrime: CrimeSummary = { ...crime, total_crimes: 3000, by_category: { "violent-crime": 1500, shoplifting: 1500 } };
      const low = computeScores("research", lowCrime, deprivation, amenities, flood);
      const high = computeScores("research", highCrime, deprivation, amenities, flood);
      const safetyLow = low.dimensions.find(d => d.label.includes("Safety"))!;
      const safetyHigh = high.dimensions.find(d => d.label.includes("Safety"))!;
      expect(safetyLow.score).toBeGreaterThan(safetyHigh.score);
    });

    it("penalises high violent crime percentage", () => {
      const peaceful: CrimeSummary = { ...crime, by_category: { shoplifting: 300 } };
      const violent: CrimeSummary = { ...crime, by_category: { "violent-crime": 300 } };
      const p = computeScores("research", peaceful, deprivation, amenities, flood);
      const v = computeScores("research", violent, deprivation, amenities, flood);
      const safetyP = p.dimensions.find(d => d.label.includes("Safety"))!;
      const safetyV = v.dimensions.find(d => d.label.includes("Safety"))!;
      expect(safetyP.score).toBeGreaterThan(safetyV.score);
    });
  });

  /* ── Property prices integration ── */

  describe("property price integration", () => {
    it("uses real prices when available for cost of living", () => {
      const withPrices = computeScores("moving", crime, deprivation, amenities, flood, "suburban", propertyPrices);
      const withoutPrices = computeScores("moving", crime, deprivation, amenities, flood, "suburban", null);
      const costWith = withPrices.dimensions.find(d => d.label.includes("Cost"))!;
      const costWithout = withoutPrices.dimensions.find(d => d.label.includes("Cost"))!;
      // Should produce different scores since real prices vs IMD proxy
      expect(costWith.score).not.toBe(costWithout.score);
      expect(costWith.reasoning).toContain("Median sold price");
    });

    it("uses YoY change for price growth in investing", () => {
      const result = computeScores("investing", crime, deprivation, amenities, flood, "suburban", propertyPrices);
      const growth = result.dimensions.find(d => d.label.includes("Price Growth"))!;
      expect(growth.reasoning).toContain("YoY");
    });
  });

  /* ── Ofsted integration ── */

  describe("ofsted integration", () => {
    it("uses quality-weighted scoring when Ofsted data available", () => {
      const withOfsted = computeScores("moving", crime, deprivation, amenities, flood, "suburban", null, ofsted);
      const withoutOfsted = computeScores("moving", crime, deprivation, amenities, flood, "suburban", null, null);
      const schoolsWith = withOfsted.dimensions.find(d => d.label.includes("School"))!;
      const schoolsWithout = withoutOfsted.dimensions.find(d => d.label.includes("School"))!;
      expect(schoolsWith.reasoning).toContain("Ofsted");
      expect(schoolsWithout.reasoning).not.toContain("Ofsted");
    });
  });

  /* ── Deprivation context ── */

  describe("deprivation context", () => {
    it("uses IMD 2025 for English LSOAs", () => {
      const result = computeScores("research", crime, deprivation, amenities, flood);
      const demo = result.dimensions.find(d => d.label.includes("Demographics"))!;
      expect(demo.reasoning).toContain("IMD 2025");
    });

    it("uses WIMD 2019 for Welsh LSOAs", () => {
      const welshDep: DeprivationData = { ...deprivation, lsoa_code: "W01000001" };
      const result = computeScores("research", crime, welshDep, amenities, flood);
      const demo = result.dimensions.find(d => d.label.includes("Demographics"))!;
      expect(demo.reasoning).toContain("WIMD 2019");
    });

    it("uses SIMD 2020 for Scottish data zones", () => {
      const scottishDep: DeprivationData = { ...deprivation, lsoa_code: "S01000001" };
      const result = computeScores("research", crime, scottishDep, amenities, flood);
      const demo = result.dimensions.find(d => d.label.includes("Demographics"))!;
      expect(demo.reasoning).toContain("SIMD 2020");
    });
  });

  /* ── Intent-specific dimensions ── */

  describe("intent-specific dimensions", () => {
    it("moving includes Safety, Schools, Transport, Amenities, Cost of Living", () => {
      const result = computeScores("moving", crime, deprivation, amenities, flood);
      const labels = result.dimensions.map(d => d.label);
      expect(labels).toContain("Safety & Crime");
      expect(labels).toContain("Schools & Education");
      expect(labels).toContain("Transport & Commute");
      expect(labels).toContain("Daily Amenities");
      expect(labels).toContain("Cost of Living");
    });

    it("business includes Foot Traffic, Competition, Transport, Spending Power, Commercial Costs", () => {
      const result = computeScores("business", crime, deprivation, amenities, flood);
      const labels = result.dimensions.map(d => d.label);
      expect(labels).toContain("Foot Traffic & Demand");
      expect(labels).toContain("Competition Density");
      expect(labels).toContain("Transport & Access");
      expect(labels).toContain("Local Spending Power");
      expect(labels).toContain("Commercial Costs");
    });

    it("investing includes Price Growth, Rental Yield, Regeneration, Tenant Demand, Risk Factors", () => {
      const result = computeScores("investing", crime, deprivation, amenities, flood);
      const labels = result.dimensions.map(d => d.label);
      expect(labels).toContain("Price Growth");
      expect(labels).toContain("Rental Yield");
      expect(labels).toContain("Regeneration & Infrastructure");
      expect(labels).toContain("Tenant Demand");
      expect(labels).toContain("Risk Factors");
    });

    it("research includes Safety, Transport, Amenities, Demographics, Environment", () => {
      const result = computeScores("research", crime, deprivation, amenities, flood);
      const labels = result.dimensions.map(d => d.label);
      expect(labels).toContain("Safety & Crime");
      expect(labels).toContain("Transport Links");
      expect(labels).toContain("Amenities & Services");
      expect(labels).toContain("Demographics & Economy");
      expect(labels).toContain("Environment & Quality");
    });
  });
});
