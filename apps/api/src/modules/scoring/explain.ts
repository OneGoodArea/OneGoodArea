/* AR-363: server-side composition of brief-shape fields for /v1/score?explain=true.

   Three pure helpers that turn the existing engine output (per-dimension
   reasoning + confidence_reason already produced by scoring-engine/v2.ts)
   into a one-paragraph summary, a recommendations list, and a deduplicated
   data-sources list.

   Hard rule: every output value here is derived from real engine state.
   No invented prose. No LLM. No client-side synthesis. The MCP tool that
   consumes this just renders what the API returns. */

import type { ScoreDimension } from "@onegoodarea/contracts";
import type { AreaType } from "../signals/inputs";

/* ── Summary ──────────────────────────────────────────────────────── */

function scoreBand(score: number): string {
  if (score >= 75) return "strong";
  if (score >= 60) return "above-average";
  if (score >= 45) return "mixed";
  if (score >= 30) return "below-average";
  return "weak";
}

function confidenceBand(confidence: number): string {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.60) return "medium";
  if (confidence >= 0.35) return "low";
  return "very low";
}

/** Compose a one-paragraph summary from the overall score + the
    best and worst dimensions. Every value cited comes from the
    deterministic engine; this function is pure formatting. */
export function composeScoreSummary(
  overallScore: number,
  overallConfidence: number,
  areaType: AreaType,
  dimensions: ReadonlyArray<ScoreDimension>,
): string {
  if (dimensions.length === 0) {
    return `${overallScore}/100 for a ${areaType} area, with ${confidenceBand(overallConfidence)} confidence.`;
  }

  const sortedByScore = [...dimensions].sort((a, b) => b.score - a.score);
  const top = sortedByScore[0]!;
  const bottom = sortedByScore[sortedByScore.length - 1]!;

  const band = scoreBand(overallScore);
  const confBand = confidenceBand(overallConfidence);

  /* When top === bottom (single dimension) skip the contrast. */
  if (top.key === bottom.key) {
    return `${overallScore}/100 — ${band} for a ${areaType} area, with ${confBand} confidence. Single-dimension score on ${top.label} (${top.score}/100).`;
  }

  return `${overallScore}/100 — ${band} for a ${areaType} area, with ${confBand} confidence. Strongest on ${top.label} (${top.score}/100); weakest on ${bottom.label} (${bottom.score}/100).`;
}

/* ── Recommendations ──────────────────────────────────────────────── */

const LOW_SCORE_THRESHOLD = 50;
const LOW_CONFIDENCE_THRESHOLD = 0.5;
const MAX_RECOMMENDATIONS = 4;

/** Surface up to MAX_RECOMMENDATIONS actionable points from the
    dimension set: dimensions scoring below 50 (real weakness) and
    dimensions with confidence below 0.5 (treat-as-indicative). The
    `confidence_reason` from the engine carries the WHY. */
export function composeRecommendations(
  dimensions: ReadonlyArray<ScoreDimension>,
): string[] {
  const out: string[] = [];

  /* Lowest scores first — those are the actionable weaknesses. */
  const byScore = [...dimensions]
    .filter((d) => d.score < LOW_SCORE_THRESHOLD)
    .sort((a, b) => a.score - b.score);
  for (const d of byScore) {
    if (out.length >= MAX_RECOMMENDATIONS) break;
    out.push(`${d.label} scores ${d.score}/100. ${d.reasoning}`);
  }

  /* Then low-confidence dimensions that aren't already surfaced.
     A reader who already saw "Crime is 30/100" doesn't need a second
     "Crime confidence is low" line. */
  const seen = new Set(byScore.map((d) => d.key));
  const byConfidence = [...dimensions]
    .filter((d) => d.confidence < LOW_CONFIDENCE_THRESHOLD && !seen.has(d.key))
    .sort((a, b) => a.confidence - b.confidence);
  for (const d of byConfidence) {
    if (out.length >= MAX_RECOMMENDATIONS) break;
    out.push(`${d.label} confidence is ${confidenceBand(d.confidence)}: ${d.confidence_reason}. Treat as indicative.`);
  }

  return out;
}

/* ── Data sources ─────────────────────────────────────────────────── */

export interface SourcePresence {
  crime: boolean;
  deprivation: boolean;
  property: boolean;
  amenities: boolean;
  flood: boolean;
  ofsted: boolean;
}

/** Static source attribution keyed by which inputs actually returned data.
    Geocoding (postcodes.io / ONS) is always cited because every score
    requires LSOA resolution. */
export function computeDataSources(presence: SourcePresence, areaCountry: "England" | "Wales" | "Scotland" | "Unknown"): string[] {
  const sources: string[] = ["postcodes.io (geocoding)"];

  if (presence.deprivation) {
    if (areaCountry === "Wales") sources.push("StatsWales WIMD 2019");
    else if (areaCountry === "Scotland") sources.push("Scottish Government SIMD 2020");
    else sources.push("MHCLG IMD 2025");
  }
  if (presence.crime) sources.push("police.uk crime archive");
  if (presence.amenities) sources.push("OpenStreetMap (Overpass)");
  if (presence.flood) sources.push("Environment Agency flood data");
  if (presence.property) sources.push("HM Land Registry Price Paid");
  if (presence.ofsted) sources.push("Ofsted school inspections (DfE)");

  return sources;
}
