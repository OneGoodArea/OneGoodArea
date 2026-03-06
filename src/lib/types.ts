export type Intent = "moving" | "business" | "investing" | "research";

export interface SubScore {
  label: string;
  score: number;
  summary: string;
}

export interface ReportSection {
  title: string;
  content: string;
  data_points?: { label: string; value: string }[];
}

export interface AreaReport {
  area: string;
  intent: Intent;
  areaiq_score: number;
  sub_scores: SubScore[];
  summary: string;
  sections: ReportSection[];
  recommendations: string[];
  data_sources?: string[];
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
