/* Methodology version registry.
 *
 * Two purposes:
 *   1. Stamp every report with the engine version that produced it
 *      (regulated buyers need this in their model risk register).
 *   2. Power the public methodology changelog page.
 *
 * Versioning convention (semver):
 *   - MAJOR: breaking change to dimension structure, intent set, or core weight
 *            (anything that would invalidate prior scores)
 *   - MINOR: new dimension, new data source, new intent — additive
 *   - PATCH: formula tuning, threshold adjustment, confidence rubric refinement
 *
 * Newest version is always at the END of METHODOLOGY_VERSIONS.
 *
 * Earlier versions (1.0.0 through 1.2.0) are reconstructed from git history
 * for completeness. Formal versioning begins at 2.0.0 (2026-04-26).
 */

export interface MethodologyVersion {
  version: string;            // semver-ish, e.g. "2.0.0"
  released_at: string;        // ISO date YYYY-MM-DD
  summary: string;            // one-line summary, used in API response and changelog hero
  changes: string[];          // bullet list of changes shipped in this version
}

export const METHODOLOGY_VERSIONS: MethodologyVersion[] = [
  {
    version: "1.0.0",
    released_at: "2026-03-09",
    summary: "Initial deterministic scoring engine. Four intents, five weighted dimensions per intent. Scores computed from real data; AI narrates only.",
    changes: [
      "Four scoring intents: moving, business, investing, research",
      "Five weighted dimensions per intent, weights summing to 100",
      "Area-type benchmarks: urban, suburban, rural — different thresholds for transport, schools, amenities, foot traffic, tenant demand",
      "Five initial data sources: postcodes.io (geocoding + LSOA), police.uk (crime), IMD 2025 (English deprivation), OpenStreetMap (amenities), Environment Agency (flood)",
      "Server-side score lock: AI cannot drift the numbers",
    ],
  },
  {
    version: "1.1.0",
    released_at: "2026-03-13",
    summary: "Wales + Scotland deprivation data integration. WIMD 2019 and SIMD 2020 added.",
    changes: [
      "Welsh LSOAs (W-prefixed) score against WIMD 2019",
      "Scottish data zones (S-prefixed) score against SIMD 2020",
      "Deprivation context (rank percentile, country) added to reasoning strings",
    ],
  },
  {
    version: "1.2.0",
    released_at: "2026-03-16",
    summary: "Ofsted school inspections added as 7th data source (England). Schools dimension now quality-weighted.",
    changes: [
      "HM Land Registry SPARQL Price Paid added as 6th data source",
      "Ofsted school inspections added as 7th data source (England only)",
      "Schools dimension uses quality-weighted Ofsted ratings: Outstanding 1.2x, Good 1.0x, Requires Improvement 0.5x, Inadequate 0.2x",
      "Amenities dimension uses Ofsted-weighted school count where available, falls back to OSM count otherwise",
      "Estyn (Wales) and Education Scotland integration on roadmap",
    ],
  },
  {
    version: "2.0.0",
    released_at: "2026-04-26",
    summary: "Confidence scoring per dimension. Methodology versioning begins.",
    changes: [
      "Every dimension now returns confidence (0.0-1.0) and confidence_reason alongside score and reasoning",
      "Aggregate confidence on the overall report, weight-weighted across dimensions",
      "Confidence rubric: HIGH (1.0) for fresh primary data, MEDIUM (0.7) for partial fallback or older datasets, LOW (0.4) for full proxy fallback, NONE (0.2) when data is missing",
      "Honest about inferred dimensions: Footfall, Rental Yield, Regeneration, Tenant Demand have a MEDIUM ceiling — they are inferred not measured",
      "Schools degrades to MEDIUM in Wales/Scotland (no Ofsted), Demographics degrades to MEDIUM for WIMD 2019 and SIMD 2020 (older releases)",
      "engine_version field added to API response. All reports now stamped with the methodology version that produced them.",
      "Public methodology changelog established. Score values themselves are unchanged — confidence is purely additive metadata.",
    ],
  },
];

if (METHODOLOGY_VERSIONS.length === 0) {
  throw new Error("METHODOLOGY_VERSIONS must contain at least one entry");
}

/* Current methodology version. Stamped on every report. */
export const METHODOLOGY_VERSION = METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1].version;

export function getCurrentMethodology(): MethodologyVersion {
  return METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1];
}

export function getMethodologyByVersion(version: string): MethodologyVersion | undefined {
  return METHODOLOGY_VERSIONS.find((m) => m.version === version);
}
