/* modules/scoring — the Scores product (a feature on top of signals).

   POST /v1/score: a composite area score, configurable by preset (the historical
   intents, demoted to named presets) or caller weights over the preset's
   dimensions. The deterministic engine (frozen v2, golden-tested) is reused
   untouched: it produces the per-dimension scores; custom weights only change the
   AGGREGATION, which we do here, outside the engine. No AI — scores are
   deterministic. See ADR 0008.

   Each preset uses a DIFFERENT set of five dimensions, so "custom weights" means
   "override the weights of the chosen preset's dimensions", not "redefine them".

   Transitional imports: the fetchers live in modules/signals, the engine in
   modules/reports/scoring-engine (frozen). */

import { fetchAreaSources } from "../signals";
import { computeScores, type ComputedScores } from "../reports/scoring-engine";
import { METHODOLOGY_VERSION } from "../reports/methodology";
import { logger } from "../tracking/structured-logger";
import { isIntent, type Intent, type ScoreResult, type ScoreDimension } from "@onegoodarea/contracts";

export const DEFAULT_PRESET: Intent = "research";

/** Stable slug for a dimension label, e.g. "Safety & Crime" -> "safety_crime". */
export function dimensionKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** The dimension keys each preset exposes (the valid custom-weight targets). The
    engine owns the labels; this mirrors them and is drift-guarded by a test that
    compares against computeScores output. */
export const PRESET_DIMENSION_KEYS: Record<Intent, readonly string[]> = {
  moving: ["safety_crime", "schools_education", "transport_commute", "daily_amenities", "cost_of_living"],
  business: ["foot_traffic_demand", "competition_density", "transport_access", "local_spending_power", "commercial_costs"],
  investing: ["price_growth", "rental_yield", "regeneration_infrastructure", "tenant_demand", "risk_factors"],
  research: ["safety_crime", "transport_links", "amenities_services", "demographics_economy", "environment_quality"],
};

export interface ScoreQuery {
  area: string;
  preset: Intent;
  weights?: Record<string, number>;
  /** AR-274 follow-on: optional whitelist of signal keys the call is
      gated to. When set, scoreArea NULLs out the underlying sources
      whose category prefixes have NO signal_key in the whitelist
      before handing to v2's frozen computeScores. The engine's
      existing graceful-null handling then collapses those dimensions
      to 0-confidence, which the weighted composite picks up
      automatically. Categories whose source has ANY signal in the
      bundle are passed through untouched. */
  bundle_allowed_keys?: readonly string[];
}

/* Map a signal key (e.g. "crime.total_12m", "transport.stations")
   to the underlying source it feeds. Transport lives inside the
   amenities source (AmenitiesData.transport_stations etc.) so it
   maps to "amenities". Keys whose prefix doesn't match any known
   source category are ignored — same conservative behaviour as the
   apps/api bundle validator. */
const SIGNAL_PREFIX_TO_SOURCE: Record<string, ScoreSourceName> = {
  crime: "crime",
  deprivation: "deprivation",
  property: "property",
  schools: "ofsted",
  amenities: "amenities",
  transport: "amenities",
  environment: "flood",
};

type ScoreSourceName = "crime" | "deprivation" | "property" | "ofsted" | "amenities" | "flood";

/** PURE. From the bundle's allowed signal keys, derive the set of
    sources that retain at least one signal. Sources NOT in this set
    must be nulled before scoring so v2 produces a partial composite. */
export function sourcesAllowedByBundle(allowedKeys: readonly string[]): Set<ScoreSourceName> {
  const sources = new Set<ScoreSourceName>();
  for (const key of allowedKeys) {
    const prefix = key.split(".", 1)[0];
    const source = SIGNAL_PREFIX_TO_SOURCE[prefix];
    if (source) sources.add(source);
  }
  return sources;
}

/** PURE: validate/coerce the request body into a ScoreQuery, or return an error. */
export function parseScoreBody(body: unknown): { ok: true; query: ScoreQuery } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const area = typeof b.area === "string" ? b.area.trim() : "";
  if (!area) return { ok: false, error: "Missing required 'area' (a UK postcode or place name)." };

  let preset: Intent = DEFAULT_PRESET;
  if (b.preset !== undefined) {
    if (!isIntent(b.preset)) return { ok: false, error: "preset must be one of: moving, business, investing, research." };
    preset = b.preset;
  }

  let weights: Record<string, number> | undefined;
  if (b.weights !== undefined) {
    if (typeof b.weights !== "object" || b.weights === null || Array.isArray(b.weights)) {
      return { ok: false, error: "weights must be an object mapping dimension keys to positive numbers." };
    }
    const valid = new Set(PRESET_DIMENSION_KEYS[preset]);
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(b.weights as Record<string, unknown>)) {
      if (!valid.has(k)) {
        return { ok: false, error: `Unknown dimension '${k}' for preset '${preset}'. Valid: ${[...valid].join(", ")}.` };
      }
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return { ok: false, error: `weight for '${k}' must be a positive number.` };
      out[k] = n;
    }
    if (Object.keys(out).length === 0) return { ok: false, error: "weights cannot be empty." };
    weights = out;
  }

  return { ok: true, query: { area, preset, weights } };
}

/** PURE: re-aggregate the engine's per-dimension scores with the effective
    weights (preset defaults, optionally overridden). */
export function applyWeights(
  base: ComputedScores,
  weights?: Record<string, number>,
): { score: number; dimensions: ScoreDimension[]; confidence: number; weights_source: "preset" | "custom" } {
  const dims: ScoreDimension[] = base.dimensions.map((d) => {
    const key = dimensionKey(d.label);
    const weight = weights?.[key] ?? d.weight;
    return { key, label: d.label, score: d.score, weight, confidence: d.confidence };
  });
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0) || 1;
  const score = Math.round(dims.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight);
  const confidence = Math.round((dims.reduce((s, d) => s + d.confidence * d.weight, 0) / totalWeight) * 100) / 100;
  return { score, dimensions: dims, confidence, weights_source: weights ? "custom" : "preset" };
}

/** Score one area. Returns null if the area cannot be geocoded (-> 404). Uses the
    shared signals fetch (which serves deprivation from the store when enabled). */
export async function scoreArea(query: ScoreQuery): Promise<ScoreResult | null> {
  const fetched = await fetchAreaSources(query.area);
  if (!fetched) return null;
  const { geo, sources } = fetched;

  /* AR-274 follow-on: when a bundle is set, null out sources whose
     categories aren't represented in the bundle. v2's computeScores
     handles null inputs by collapsing that dimension to 0-confidence;
     applyWeights then composes the partial score over the surviving
     dimensions. v2's math is unchanged. */
  let { crime, deprivation, amenities, flood, property, ofsted } = sources;
  if (query.bundle_allowed_keys) {
    const allowed = sourcesAllowedByBundle(query.bundle_allowed_keys);
    if (!allowed.has("crime"))       crime = null;
    if (!allowed.has("deprivation")) deprivation = null;
    if (!allowed.has("amenities"))   amenities = null;
    if (!allowed.has("flood"))       flood = null;
    if (!allowed.has("property"))    property = null;
    if (!allowed.has("ofsted"))      ofsted = null;
  }

  const base = computeScores(
    query.preset, crime, deprivation, amenities, flood, geo.area_type, property, ofsted,
  );
  const agg = applyWeights(base, query.weights);

  logger.info(`[scoring] /v1/score "${query.area}" preset=${query.preset} weights=${agg.weights_source} dep=${fetched.depFromStore ? "store" : "live"} property=${fetched.propertyFromStore ? "store" : "live"} crime=${fetched.crimeFromStore ? "store" : "live"} -> ${agg.score}`);

  return {
    area: query.area,
    preset: query.preset,
    score: agg.score,
    area_type: base.area_type,
    dimensions: agg.dimensions,
    confidence: agg.confidence,
    weights_source: agg.weights_source,
    engine_version: METHODOLOGY_VERSION,
  };
}
