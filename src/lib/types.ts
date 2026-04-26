export type Intent = "moving" | "business" | "investing" | "research";

export interface SubScore {
  label: string;
  score: number;
  weight: number;
  summary: string;
  reasoning?: string;
  confidence?: number;          // 0.0–1.0, derived from data quality. Optional for back-compat with cached pre-2026-04-26 reports.
  confidence_reason?: string;   // Human-readable explanation of the confidence value.
}

export interface ReportSection {
  title: string;
  content: string;
  data_points?: { label: string; value: string }[];
}

export type AreaType = "urban" | "suburban" | "rural";

export interface DataFreshness {
  source: string;
  period: string;
  status: "live" | "recent" | "static";
}

export interface PropertyMarketData {
  postcode_area: string;
  median_price: number;
  mean_price: number;
  transaction_count: number;
  price_change_pct: number | null;
  by_property_type: { type: string; median: number; count: number }[];
  tenure_split: { freehold: number; leasehold: number };
  price_range: { min: number; max: number };
  period: string;
}

export interface SchoolInfo {
  name: string;
  phase: string;
  rating: string;
  distance_km: number;
}

export interface SchoolsData {
  schools: SchoolInfo[];
  rating_breakdown: Record<string, number>;
  inspectorate: string;
}

export interface AreaReport {
  area: string;
  intent: Intent;
  areaiq_score: number;
  area_type?: AreaType;
  sub_scores: SubScore[];
  summary: string;
  sections: ReportSection[];
  recommendations: string[];
  data_sources?: string[];
  data_freshness?: DataFreshness[];
  property_data?: PropertyMarketData;
  schools_data?: SchoolsData;
  confidence?: number;          // Aggregate confidence across dimensions, 0.0–1.0. Optional for back-compat.
  generated_at: string;
}

export interface ReportRecord {
  id: string;
  area: string;
  intent: Intent;
  country: string;
  report: AreaReport;
  score: number;
  created_at: string;
}
