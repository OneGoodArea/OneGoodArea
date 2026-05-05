/**
 * Methodology snippets per dimension. Baked into the MCP server so
 * `methodology_for` returns instant explanations without a network round-trip.
 *
 * Source of truth: https://www.onegoodarea.com/methodology
 * Update this file when the methodology page changes — the engine version
 * is stamped on every API response so a stale snippet here just means the
 * MCP description lags real scoring by a release.
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
    dimension: "Safety & Crime",
    intents: ["moving", "research"],
    source: "Police.uk (last 3 months street-level crime data)",
    summary:
      "Penalises rising crime, rewards falling crime, weights violent crime concentration. Benchmarked against the area's urban/suburban/rural classification so rural postcodes are not unfairly penalised against city-centre baselines.",
    weights: { moving: 25, business: 15, investing: 15, research: 20 },
  },
  {
    dimension: "Schools & Education",
    intents: ["moving"],
    source: "Ofsted inspection ratings (England), Estyn (Wales), Education Scotland (planned)",
    summary:
      "School and educational facility density nearby with diminishing-returns curve. One Outstanding-rated school within 1.5km matters more than many middling ones further away.",
    weights: { moving: 20, business: 0, investing: 10, research: 20 },
  },
  {
    dimension: "Transport & Commute",
    intents: ["moving", "business", "research"],
    source: "OpenStreetMap (rail stations, bus stops, road network)",
    summary:
      "Rail and bus connectivity combined into a single accessibility score. Benchmarked against area type so a rural postcode with 1 train station ranks higher than a city-centre postcode with 1 train station.",
    weights: { moving: 20, business: 15, investing: 15, research: 20 },
  },
  {
    dimension: "Daily Amenities",
    intents: ["moving", "research"],
    source: "OpenStreetMap (food/drink, healthcare, shops, parks/leisure, retail)",
    summary:
      "Weighted composite across education, food and drink, healthcare, retail, and green spaces. Each category normalised against area-type benchmarks to avoid penalising rural areas with fewer amenities by absolute count.",
    weights: { moving: 15, business: 0, investing: 10, research: 20 },
  },
  {
    dimension: "Cost of Living",
    intents: ["moving"],
    source: "HM Land Registry sold prices (primary), IMD 2025 deprivation data (fallback)",
    summary:
      "Uses Land Registry sold prices as the primary input. Scored as a ratio of local median to national median. Falls back to IMD deprivation deciles when Land Registry data is unavailable for the postcode area.",
    weights: { moving: 20, business: 0, investing: 0, research: 0 },
  },
  {
    dimension: "Foot Traffic & Demand",
    intents: ["business"],
    source: "OpenStreetMap (commercial activity density), transport connectivity",
    summary:
      "Transport connectivity combined with commercial activity density. Strong rail, bus, and retail presence indicates higher natural footfall. Used by retail, F&B, and hospitality site-selection teams.",
    weights: { business: 30 },
  },
  {
    dimension: "Competition Density",
    intents: ["business"],
    source: "OpenStreetMap (existing commercial venues by category)",
    summary:
      "Counts existing similar venues nearby. Lower density = less competitive saturation. Doesn't differentiate by venue size or quality — purely a density metric.",
    weights: { business: 20 },
  },
  {
    dimension: "Local Spending Power",
    intents: ["business"],
    source: "HM Land Registry, IMD 2025",
    summary:
      "Combines property values with deprivation scores to estimate disposable income in the area. Higher spending power supports premium retail and F&B.",
    weights: { business: 20 },
  },
  {
    dimension: "Commercial Costs",
    intents: ["business"],
    source: "HM Land Registry (residential as proxy until commercial data lands)",
    summary:
      "Estimates rent and leasehold cost using residential prices as a proxy. Inverted scoring: high cost = low score. Replace with commercial rent data when AR-134 (address-level) ships.",
    weights: { business: 15 },
  },
  {
    dimension: "Price Growth",
    intents: ["investing"],
    source: "HM Land Registry (5-year price history)",
    summary:
      "Year-on-year median price growth over 5 years. Smoothed to avoid single-quarter spikes. Used by buy-to-let and build-to-rent operators to forecast capital appreciation.",
    weights: { investing: 25 },
  },
  {
    dimension: "Rental Yield",
    intents: ["investing"],
    source: "HM Land Registry (sold prices), VOA/Rightmove proxies (rent estimates)",
    summary:
      "Annual gross rental income as a percentage of capital value. London-weighted benchmarks vs national. Below 4% = soft, 4-6% = market, above 6% = strong yield play.",
    weights: { investing: 25 },
  },
  {
    dimension: "Regeneration & Infrastructure",
    intents: ["investing"],
    source: "OpenStreetMap (construction/development markers), IMD 2025 (infrastructure indicators)",
    summary:
      "Signals of imminent regeneration: new construction nearby, transport upgrades, low IMD score with rising property prices. Forward-looking indicator for capital appreciation.",
    weights: { investing: 20 },
  },
  {
    dimension: "Tenant Demand",
    intents: ["investing"],
    source: "IMD 2025, Police.uk (proxy via local density and stability)",
    summary:
      "Estimates rental demand from population density, employment proxies via IMD, and historic crime stability. Weak proxy until address-level demographic data lands.",
    weights: { investing: 15 },
  },
  {
    dimension: "Risk Factors",
    intents: ["investing"],
    source: "Environment Agency (flood zones), Police.uk (crime stability)",
    summary:
      "Flood risk zones, active flood warnings, crime trend volatility. Inverted scoring: more risk = lower score.",
    weights: { investing: 15 },
  },
  {
    dimension: "Transport Links",
    intents: ["research"],
    source: "OpenStreetMap",
    summary:
      "Same as Transport & Commute but presented as a neutral baseline metric for the research intent (no decision-side weighting).",
    weights: { research: 20 },
  },
  {
    dimension: "Amenities & Services",
    intents: ["research"],
    source: "OpenStreetMap",
    summary:
      "Same composite as Daily Amenities but presented neutrally for the research intent.",
    weights: { research: 20 },
  },
  {
    dimension: "Demographics & Economy",
    intents: ["research"],
    source: "IMD 2025 (England), WIMD 2019 (Wales), SIMD 2020 (Scotland)",
    summary:
      "Official deprivation indices. Maps decile ranking to a 0-100 score that reflects the socioeconomic profile of the neighbourhood. Decile 1 = most deprived, decile 10 = least deprived.",
    weights: { research: 20 },
  },
  {
    dimension: "Environment & Quality",
    intents: ["research"],
    source: "Environment Agency, OpenStreetMap (green space)",
    summary:
      "Combines flood risk zones, active flood warnings, and green space availability. Areas with no flood risk and good park access score highest.",
    weights: { research: 20 },
  },
];

export const ENGINE = {
  version: "2.0.0",
  released: "2026-04-26",
  changelog: [
    {
      version: "2.0.0",
      date: "2026-04-26",
      summary:
        "Confidence scoring per dimension. Engine version stamp on every response. Source attribution per signal. Production rollout via infrastructure-engine merge to main.",
    },
    {
      version: "1.x",
      date: "pre 2026-04-26",
      summary:
        "Initial deterministic scoring engine. 7 public datasets integrated. 4 intent compositions. LSOA-level scoring. Web reports + JSON API + drop-in widget.",
    },
  ],
} as const;

/** Match a user's dimension query against the canonical names (case-insensitive, partial match). */
export function findDimension(query: string): DimensionMethodology | null {
  const q = query.toLowerCase().trim();
  // Exact match first
  const exact = METHODOLOGY.find((d) => d.dimension.toLowerCase() === q);
  if (exact) return exact;
  // Substring match (e.g. "safety" matches "Safety & Crime")
  return METHODOLOGY.find((d) => d.dimension.toLowerCase().includes(q)) ?? null;
}
