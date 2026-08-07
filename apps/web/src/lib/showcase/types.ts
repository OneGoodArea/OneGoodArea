export type Product = "signals" | "scores" | "monitor" | "intelligence";
export type Preset = "moving" | "business" | "investing" | "research";

export interface Signal {
  id: string;
  name: string;
  description: string;
  value: number | string | null;
  category: string;
}

export interface Score {
  id: string;
  name: string;
  value: number;
  maxValue: number;
  product: Product;
  weight: number;
  confidence: number;
}

export interface ScoreResult {
  preset: Preset;
  score: number;
  confidence: number;
  weightsSource: "preset" | "custom";
  dimensions: Score[];
}

export interface PropertyTransaction {
  date: string;
  price: number;
  propertyType: string;
  estateType: string;
}

export interface TransactionsResult {
  postcodeArea: string;
  period: { from: string; to: string };
  transactionCount: number;
  transactions: PropertyTransaction[];
}

export interface Weight {
  product: Product;
  value: number;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  description: string;
}

/* ── Monitor / portfolios ── */

export interface PortfolioArea {
  id: string;
  area: string;
  label: string | null;
  created_at?: string;
}

export interface Portfolio {
  id: string;
  name: string;
  area_count?: number;
  created_at?: string;
}

export interface PortfolioDetail extends Portfolio {
  areas: PortfolioArea[];
}

export interface PortfolioEnrichItem {
  area: string;
  label: string | null;
  score: ScoreResult | null;
  error: string | null;
}

export interface PortfolioChange {
  signal_key: string;
  label: string | null;
  area: string;
  geo_code: string;
  period_from: string;
  period_to: string;
  value_from: number | null;
  value_to: number | null;
  delta: number | null;
  pct_change: number | null;
  direction: "up" | "down" | "flat";
  material: boolean;
}

export interface ChangeReport {
  portfolio_id: string;
  baseline: "previous" | "first";
  threshold_pct: number;
  min_transactions: number;
  areas_checked: number;
  material_count: number;
  changes: PortfolioChange[];
  generated_at: string;
}