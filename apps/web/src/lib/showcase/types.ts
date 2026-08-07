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