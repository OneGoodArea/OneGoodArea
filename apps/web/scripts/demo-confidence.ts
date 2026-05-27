/* Demo: run the scoring engine with two realistic data shapes and
   pretty-print confidence values per dimension and overall.

   Usage: npx tsx scripts/demo-confidence.ts

   Purpose: lets a human eyeball that the confidence rubric is doing
   what we expect (HIGH when data is rich, LOW when fallback is used). */

import { computeScores } from "../src/lib/scoring-engine";
import type { CrimeSummary } from "../src/lib/data-sources/police";
import type { DeprivationData } from "../src/lib/data-sources/deprivation";
import type { AmenitiesData } from "../src/lib/data-sources/openstreetmap";
import type { FloodRiskData } from "../src/lib/data-sources/flood";
import type { PropertyPriceData } from "../src/lib/data-sources/land-registry";
import type { OfstedData } from "../src/lib/data-sources/ofsted";

/* ── Rich data: looks like an English urban LSOA ── */

const richCrime: CrimeSummary = {
  total_crimes: 1240, months_covered: 12,
  by_category: { "violent-crime": 220, "burglary": 110, "shoplifting": 410, "anti-social-behaviour": 500 },
  top_streets: [{ name: "High Street", count: 200 }],
  outcome_breakdown: { "Investigation complete": 300 },
  monthly_trend: Array.from({ length: 12 }, (_, i) => ({ month: `2024-${String(i + 1).padStart(2, "0")}`, count: 100 + i })),
};

const richDeprivation: DeprivationData = {
  lsoa_code: "E01000001", lsoa_name: "Manchester 001A",
  local_authority: "Manchester", imd_rank: 16878, imd_decile: 5,
};

const richAmenities: AmenitiesData = {
  schools: 12, restaurants_cafes: 28, pubs_bars: 14, healthcare: 8,
  shops: 22, parks_leisure: 9, transport_stations: 4, bus_stops: 24,
  total: 121, highlights: ["Piccadilly Station", "Manchester Victoria", "Oxford Road"],
};

const richFlood: FloodRiskData = { flood_areas_nearby: 1, rivers_at_risk: ["River Irwell"], active_warnings: [] };

const richPropertyPrices: PropertyPriceData = {
  postcode_area: "M1", median_price: 245000, mean_price: 280000, transaction_count: 124,
  price_change_pct: 4.2, by_property_type: [{ type: "Flat", median: 198000, count: 80 }],
  tenure_split: { freehold: 24, leasehold: 100 }, price_range: { min: 95000, max: 850000 },
  period: "2024-2025", prior_median: 235000,
};

const richOfsted: OfstedData = {
  schools: [
    { urn: 1, school_name: "St Mary's Primary", phase: "Primary", overall_rating: 1, rating_text: "Outstanding", inspection_date: "2024-01-01", distance_km: 0.5 },
    { urn: 2, school_name: "Manchester Secondary", phase: "Secondary", overall_rating: 2, rating_text: "Good", inspection_date: "2024-02-01", distance_km: 0.8 },
    { urn: 3, school_name: "City Academy", phase: "Primary", overall_rating: 2, rating_text: "Good", inspection_date: "2024-03-01", distance_km: 1.2 },
    { urn: 4, school_name: "Hope Sixth Form", phase: "Sixth Form", overall_rating: 1, rating_text: "Outstanding", inspection_date: "2024-04-01", distance_km: 1.4 },
  ],
  total_rated: 4, rating_breakdown: { Outstanding: 2, Good: 2 }, inspectorate: "Ofsted",
};

/* ── Sparse data: looks like a small Welsh rural LSOA with no Land Registry,
      no Ofsted (Wales), and minimal OSM coverage ── */

const sparseCrime: CrimeSummary = {
  total_crimes: 18, months_covered: 12,
  by_category: { "anti-social-behaviour": 12, "other-theft": 6 },
  top_streets: [], outcome_breakdown: {},
  monthly_trend: [{ month: "2024-12", count: 18 }],
};

const sparseDeprivation: DeprivationData = {
  lsoa_code: "W01000001", lsoa_name: "Powys 001",
  local_authority: "Powys", imd_rank: 1200, imd_decile: 6,
};

const sparseAmenities: AmenitiesData = {
  schools: 1, restaurants_cafes: 2, pubs_bars: 1, healthcare: 1,
  shops: 2, parks_leisure: 1, transport_stations: 0, bus_stops: 3,
  total: 11, highlights: [],
};

/* ── Run + pretty-print ── */

function fmtConfidence(c: number): string {
  if (c >= 0.95) return `${c.toFixed(2)} HIGH`;
  if (c >= 0.6)  return `${c.toFixed(2)} MEDIUM`;
  if (c >= 0.3)  return `${c.toFixed(2)} LOW`;
  return `${c.toFixed(2)} NONE`;
}

function printResult(label: string, intent: "moving" | "business" | "investing" | "research", crime: CrimeSummary | null, dep: DeprivationData | null, amen: AmenitiesData | null, flood: FloodRiskData | null, prop: PropertyPriceData | null, ofsted: OfstedData | null) {
  const result = computeScores(intent, crime, dep, amen, flood, "urban", prop, ofsted);
  console.log(`\n  ${label}  (intent: ${intent})`);
  console.log(`  ${"".padEnd(64, "-")}`);
  console.log(`  Overall: ${result.overall}/100   Confidence: ${fmtConfidence(result.confidence)}`);
  console.log(`  ${"".padEnd(64, "-")}`);
  for (const d of result.dimensions) {
    const line = `  ${d.label.padEnd(32)} ${String(d.score).padStart(3)}/100  conf ${fmtConfidence(d.confidence)}`;
    console.log(line);
    console.log(`    why: ${d.confidence_reason}`);
  }
}

console.log("=".repeat(70));
console.log("  CONFIDENCE SCORING DEMO");
console.log("=".repeat(70));

printResult(
  "Manchester city centre  (rich data: full English coverage)",
  "moving",
  richCrime, richDeprivation, richAmenities, richFlood, richPropertyPrices, richOfsted,
);

printResult(
  "Powys, Wales  (sparse: no Land Registry, no Ofsted, light OSM)",
  "moving",
  sparseCrime, sparseDeprivation, sparseAmenities, null, null, null,
);

printResult(
  "Manchester city centre  (rich data, business intent)",
  "business",
  richCrime, richDeprivation, richAmenities, richFlood, richPropertyPrices, null,
);

printResult(
  "Manchester city centre  (rich data, investing intent)",
  "investing",
  richCrime, richDeprivation, richAmenities, richFlood, richPropertyPrices, null,
);

console.log();
