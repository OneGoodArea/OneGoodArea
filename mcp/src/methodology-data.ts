/**
 * Methodology snippets per dimension. Baked into the MCP server so
 * `methodology_for` returns instant explanations without a network round-trip.
 *
 * Source of truth: https://www.onegoodarea.com/methodology
 * Update this file when the methodology page changes — the engine version
 * is stamped on every API response so a stale snippet here just means the
 * MCP description lags real scoring by a release.
 *
 * Methodology 1.1.0 (AR-694): every preset scores the SAME seven signal
 * categories — crime, deprivation, property, schools, amenities, transport,
 * environment. Intent is expressed only through the weights. The dimension
 * names below match the labels the engine emits in `dimensions[].label`.
 */

export interface DimensionMethodology {
  dimension: string;
  intents: string[];
  source: string;
  summary: string;
  weights: Record<string, number>;
}

export const METHODOLOGY: DimensionMethodology[] = [
  {
    dimension: "Crime",
    intents: ["moving", "business", "investing", "research"],
    source: "Police.uk (last 3 months street-level crime data)",
    summary:
      "Penalises rising crime and violent-crime concentration, rewards falling crime. Benchmarked against the area's urban/suburban/rural classification so rural postcodes are not unfairly penalised against city-centre baselines. Present for every preset; weighted highest for moving, where borrower-side risk matters most.",
    weights: { moving: 20, business: 5, investing: 10, research: 15 },
  },
  {
    dimension: "Deprivation",
    intents: ["moving", "business", "investing", "research"],
    source: "IMD 2025 (England), WIMD 2019 (Wales), SIMD 2020 (Scotland)",
    summary:
      "Official deprivation indices mapped to a 0-100 score from the LSOA decile ranking (decile 1 = most deprived, decile 10 = least). For the business preset the same signal doubles as a local spending-power proxy; for the other presets it reflects the neighbourhood's socioeconomic profile.",
    weights: { moving: 10, business: 15, investing: 10, research: 15 },
  },
  {
    dimension: "Property",
    intents: ["moving", "business", "investing", "research"],
    source: "HM Land Registry sold prices (primary), IMD 2025 deprivation (fallback)",
    summary:
      "Intent-aware property signal. For moving it is affordability: median sold price scored as a ratio of the national median. For business it is a commercial-cost proxy (higher values = higher rents = lower score). For investing it combines price growth and rental-yield scores. Falls back to IMD decile proxies when Land Registry data is unavailable for the postcode area.",
    weights: { moving: 20, business: 15, investing: 30, research: 14 },
  },
  {
    dimension: "Schools",
    intents: ["moving", "business", "investing", "research"],
    source: "Ofsted inspection ratings (England), Estyn (Wales), Education Scotland (planned), OpenStreetMap",
    summary:
      "School and educational facility density with quality weighting: an Outstanding-rated school counts more than one rated Requires Improvement. Diminishing returns beyond a handful of good schools within 1.5km. Without Ofsted data (Wales, Scotland, or unseeded areas) the score degrades to a count-based proxy at reduced confidence.",
    weights: { moving: 20, business: 5, investing: 5, research: 14 },
  },
  {
    dimension: "Amenities",
    intents: ["moving", "business", "investing", "research"],
    source: "OpenStreetMap (food/drink, healthcare, shops, parks/leisure, retail)",
    summary:
      "Weighted composite across education, food and drink, healthcare, retail, and green spaces, each normalised against area-type benchmarks so rural areas are not penalised for fewer amenities by absolute count. The business preset weights this category highest as the footfall and catchment driver.",
    weights: { moving: 10, business: 25, investing: 15, research: 14 },
  },
  {
    dimension: "Transport",
    intents: ["moving", "business", "investing", "research"],
    source: "OpenStreetMap (rail stations, bus stops, road network)",
    summary:
      "Rail and bus connectivity combined into a single accessibility score. Benchmarked against area type so a rural postcode with one station ranks higher than a city-centre postcode with one station. Heaviest for the business preset, where access drives footfall and catchment.",
    weights: { moving: 15, business: 20, investing: 15, research: 14 },
  },
  {
    dimension: "Environment",
    intents: ["moving", "business", "investing", "research"],
    source: "Environment Agency (flood risk), OpenStreetMap (green space)",
    summary:
      "Combines flood risk zones, active flood warnings, and green space availability. Areas with no flood risk and good park access score highest; active warnings are penalised heavily. When flood data is unavailable the score falls back to green-space count at reduced confidence.",
    weights: { moving: 5, business: 15, investing: 15, research: 14 },
  },
];

/* The MCP ships a static engine snapshot as a fallback; the
   score_postcode tool already echoes the live engine_version from each
   response. A future story should make engine_version read the live
   value from the /me startup call rather than this constant. */
export const ENGINE = {
  version: "1.1.0",
  released: "2026-08-04",
  changelog: [
    {
      version: "1.0.0",
      date: "2026-07-08",
      summary:
        "Deterministic UK area-intelligence engine. Four decision presets, five weighted dimensions each, per-dimension confidence, and full source attribution. Scores are computed from public data by fixed formulas; no AI in the scoring path.",
    },
    {
      version: "1.1.0",
      date: "2026-08-04",
      summary:
        "Intent-aware scoring. Every preset now scores the same seven categories — safety & crime, deprivation, property, schools, amenities, transport, environment — using the full source set; intent changes only how those categories are weighted.",
    },
  ],
} as const;

/** Match a user's dimension query against the canonical names (case-insensitive, partial match). */
export function findDimension(query: string): DimensionMethodology | null {
  const q = query.toLowerCase().trim();
  // Exact match first
  const exact = METHODOLOGY.find((d) => d.dimension.toLowerCase() === q);
  if (exact) return exact;
  // Substring match (e.g. "environ" matches "Environment")
  return METHODOLOGY.find((d) => d.dimension.toLowerCase().includes(q)) ?? null;
}
