export interface AreaDimension {
  label: string;
  score: number;
  weight: number;
  summary: string;
}

export interface AreaData {
  name: string;
  region: string;
  postcode: string;
  areaType: "urban" | "suburban" | "rural";
  overallScore: number;
  population: string;
  avgPropertyPrice: string;
  summary: string;
  dimensions: AreaDimension[];
  lockedSections: string[];
  lockedRecommendations: number;
  intents: { label: string; score: number; slug: string }[];
  dataSources: string[];
}
