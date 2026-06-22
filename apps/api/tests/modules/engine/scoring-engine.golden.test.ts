import { describe, it, expect } from "vitest";
// Guards the FROZEN v2 engine explicitly (not the index resolver), so v2's
// byte-identical output stays locked regardless of future v3 routing.
import { computeScores } from "@/modules/engine/scoring-engine/v2";
import type {
  CrimeSummary,
  DeprivationData,
  AmenitiesData,
  FloodRiskData,
  PropertyPriceData,
  OfstedData,
} from "@/modules/signals/inputs";

/* ============================================================================
   GOLDEN-MASTER / characterization net for the deterministic scoring engine.

   PURPOSE: freeze the EXACT output of computeScores() — every score, weight,
   label, reasoning string, and confidence value — for a representative matrix
   of inputs. Any change that shifts a number or string fails CI loudly.

   WHY IT EXISTS: this is the regression net for the apps/api decoupling
   (separation doc, metric #4: "0 main-branch runtime regressions, branch-by-
   branch TDD"). When scoring-engine.ts moves to
   apps/api/src/modules/reports/, these snapshots MUST stay byte-identical —
   that is the proof the move changed nothing.

   The engine is deterministic (no Date/Math.random), so snapshots are stable.
   To intentionally re-baseline after an APPROVED engine change, run:
       npx vitest run -u src/tests/scoring-engine.golden.test.ts
   A diff in these snapshots on any UNPLANNED change = a real regression.

   Fixtures mirror src/tests/scoring-engine.test.ts so the two suites describe
   the same engine from two angles: that one asserts *properties*, this one
   freezes *exact output*.
   ============================================================================ */

const crime: CrimeSummary = {
  total_crimes: 300,
  months_covered: 3,
  by_category: { "violent-crime": 60, burglary: 30, shoplifting: 210 },
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

const INTENTS = ["moving", "business", "investing", "research"] as const;

describe("scoring-engine golden master", () => {
  // 1. Full data — every source present. The richest, highest-confidence path.
  describe("full data · suburban · prices + ofsted", () => {
    for (const intent of INTENTS) {
      it(`${intent}`, () => {
        expect(
          computeScores(intent, crime, deprivation, amenities, flood, "suburban", propertyPrices, ofsted),
        ).toMatchSnapshot();
      });
    }
  });

  // 2. Core data only — the common live path before prices/ofsted resolve.
  describe("core data only · default area type", () => {
    for (const intent of INTENTS) {
      it(`${intent}`, () => {
        expect(
          computeScores(intent, crime, deprivation, amenities, flood),
        ).toMatchSnapshot();
      });
    }
  });

  // 3. Area-type benchmarks — same data, different urban/rural thresholds.
  describe("area-type benchmarks · full data", () => {
    for (const areaType of ["urban", "rural"] as const) {
      for (const intent of INTENTS) {
        it(`${intent} · ${areaType}`, () => {
          expect(
            computeScores(intent, crime, deprivation, amenities, flood, areaType, propertyPrices, ofsted),
          ).toMatchSnapshot();
        });
      }
    }
  });

  // 4. Graceful degradation — every source null. Locks the fallback path.
  describe("all sources null · graceful degradation", () => {
    for (const intent of INTENTS) {
      it(`${intent}`, () => {
        expect(
          computeScores(intent, null, null, null, null),
        ).toMatchSnapshot();
      });
    }
  });
});
