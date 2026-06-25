/* @onegoodarea/contracts — Levers (AR-197): per-org methodology pinning.

   A pin is the engine_version every response from this org will be
   stamped with when no explicit X-Engine-Version header is sent. The
   header still wins per-request. See ADR 0031. */

import { z } from "zod";

/** GET /v1/orgs/:id/methodology — `engine_version` is null when no pin
    is set (the caller will get the latest stamp on subsequent requests).
    `pinned` mirrors `engine_version !== null` and is the friendlier
    boolean for clients that just want to know "are we locked?". */
export const MethodologyPinSchema = z.object({
  engine_version: z.string().nullable(),
  pinned: z.boolean(),
}).strict();
export type MethodologyPin = z.infer<typeof MethodologyPinSchema>;

/** PUT /v1/orgs/:id/methodology — body. The server validates the value
    against SUPPORTED_ENGINE_VERSIONS (no equivalent contract-level
    enum here because the supported window evolves on the server side
    and we don't want to ship a new contracts release every time). */
export const SetMethodologyPinRequestSchema = z.object({
  engine_version: z.string().min(1),
}).strict();
export type SetMethodologyPinRequest = z.infer<typeof SetMethodologyPinRequestSchema>;

/* ────────────────────────────────────────────────────────────────────
   Methodology version registry — moved here from apps/api + apps/web
   in AR-352 so both workspaces import a single source of truth.

   Two purposes:
     1. Stamp every report with the engine version that produced it
        (regulated buyers need this in their model risk register).
     2. Power the public methodology changelog page.

   Versioning convention (semver):
     - MAJOR: breaking change to dimension structure, intent set, or
              core weight (anything that would invalidate prior scores)
     - MINOR: new dimension, new data source, new intent — additive
     - PATCH: formula tuning, threshold adjustment, confidence rubric
              refinement

   Newest version is always at the END of METHODOLOGY_VERSIONS.

   Earlier versions (1.0.0 through 1.2.0) are reconstructed from git
   history for completeness. Formal versioning begins at 2.0.0
   (2026-04-26).
   ──────────────────────────────────────────────────────────────────── */

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
  {
    version: "2.0.1",
    released_at: "2026-05-14",
    summary: "Property confidence rubric is now variance-aware. Wide YoY swings cap confidence at MEDIUM. No score changes.",
    changes: [
      "Property-backed dimensions (Cost of Living, Price Growth, Commercial Costs, Rental Yield) factor YoY price volatility into the confidence band, not just transaction count",
      "New rubric: HIGH requires both >=50 transactions AND <=15% absolute YoY change. MEDIUM for >=20 transactions (smaller sample or volatile prices). LOW for <20 transactions.",
      "Resolves AR-137 — central York YO1 was returning HIGH confidence on 83 txns with a -21% YoY swing. Insurance underwriters need honest variance signal.",
      "Confidence-reason strings updated to surface both sample size and volatility explicitly",
      "Patch version (PATCH) — score values are byte-identical to v2.0.0; only confidence metadata refines",
    ],
  },
  {
    version: "2.0.2",
    released_at: "2026-05-14",
    summary: "OpenStreetMap data-source reliability hardening. Transport scoring no longer degrades to NONE confidence for UK city centres. No formula changes.",
    changes: [
      "Overpass query timeout bumped from 15s to 25s server-side; client AbortSignal from 20s to 35s",
      "Overpass failures now retry once after 500ms before falling back to null",
      "Overpass errors now logged via logger.warn() — previously silent (Sentry-invisible)",
      "Resolves AR-135: dense UK city centres (Manchester, Birmingham, Edinburgh, Cardiff, York etc.) consistently exceeded the previous 15s Overpass timeout when the bundled 8-subquery hit thousands of nodes in the 1-2km radii. Reports for these postcodes returned Transport scoring with confidence NONE despite the areas having major rail and bus coverage.",
      "Patch version (PATCH) — implementation reliability fix, scoring formulas are byte-identical to v2.0.1.",
    ],
  },
];

/* The list is hard-coded above with at least one entry. We assert this
   once at module load so consumers can read `METHODOLOGY_VERSION` as a
   non-nullable string under `noUncheckedIndexedAccess`. */
function getLatest(): MethodologyVersion {
  const last = METHODOLOGY_VERSIONS[METHODOLOGY_VERSIONS.length - 1];
  if (!last) {
    throw new Error("METHODOLOGY_VERSIONS must contain at least one entry");
  }
  return last;
}

/** Current methodology version. Stamped on every report. */
export const METHODOLOGY_VERSION = getLatest().version;

export function getCurrentMethodology(): MethodologyVersion {
  return getLatest();
}

export function getMethodologyByVersion(version: string): MethodologyVersion | undefined {
  return METHODOLOGY_VERSIONS.find((m) => m.version === version);
}
