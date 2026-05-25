/* Input data shapes the scoring engine consumes (it never fetches — pure).
   Copied VERBATIM from the legacy src/lib/data-sources/* type exports.

   The actual fetchers migrate later (a data-sources module). Until the
   Phase 4 cutover these MUST stay in sync with src/lib/data-sources/*. */

export type AreaType = "urban" | "suburban" | "rural";

export interface CrimeSummary {
  total_crimes: number;
  months_covered: number;
  by_category: Record<string, number>;
  top_streets: { name: string; count: number }[];
  outcome_breakdown: Record<string, number>;
  monthly_trend: { month: string; count: number }[];
}

export interface DeprivationData {
  lsoa_code: string;
  lsoa_name: string;
  local_authority: string;
  imd_rank: number;
  imd_decile: number;
}

export interface AmenitiesData {
  schools: number;
  restaurants_cafes: number;
  pubs_bars: number;
  healthcare: number;
  shops: number;
  parks_leisure: number;
  transport_stations: number;
  bus_stops: number;
  total: number;
  highlights: string[];
}

export interface FloodWarning {
  description: string;
  severity: string;
  severityLevel: number;
  message: string;
}

export interface FloodRiskData {
  flood_areas_nearby: number;
  rivers_at_risk: string[];
  active_warnings: FloodWarning[];
}

export interface PropertyPriceData {
  postcode_area: string;
  median_price: number;
  mean_price: number;
  transaction_count: number;
  price_change_pct: number | null;
  by_property_type: { type: string; median: number; count: number }[];
  tenure_split: { freehold: number; leasehold: number };
  price_range: { min: number; max: number };
  period: string;
  prior_median: number | null;
}

export interface OfstedSchool {
  urn: number;
  school_name: string;
  phase: string;
  overall_rating: number | null;
  rating_text: string;
  inspection_date: string;
  distance_km: number;
}

export interface OfstedData {
  schools: OfstedSchool[];
  total_rated: number;
  rating_breakdown: Record<string, number>;
  inspectorate: string;
}
