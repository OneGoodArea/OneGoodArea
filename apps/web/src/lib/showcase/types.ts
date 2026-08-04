export type Product = "signals" | "scores" | "monitor" | "intelligence";

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