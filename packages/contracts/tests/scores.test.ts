import { describe, it, expect } from "vitest";
import { ScoreResultSchema, ScoreDimensionSchema, type ScoreResult } from "../src/scores";

const dim = {
  key: "safety_crime",
  label: "Safety & Crime",
  score: 79,
  weight: 20,
  confidence: 0.4,
  reasoning: "12 violent crimes per 1,000 residents over 12 months — below the urban benchmark.",
  confidence_reason: "Only 47 crimes recorded — sparse sample, treat as indicative.",
};

const result: ScoreResult = {
  area: "M1 1AE",
  preset: "research",
  score: 53,
  area_type: "urban",
  dimensions: [dim],
  confidence: 0.5,
  weights_source: "preset",
  engine_version: "2.0.2",
};

describe("ScoreResultSchema", () => {
  it("round-trips a valid score result", () => {
    expect(ScoreResultSchema.parse(result)).toEqual(result);
  });
  it("only allows preset | custom as weights_source", () => {
    expect(() => ScoreResultSchema.parse({ ...result, weights_source: "magic" })).toThrow();
  });
  it("rejects confidence outside 0..1", () => {
    expect(() => ScoreResultSchema.parse({ ...result, confidence: 2 })).toThrow();
  });
  it("validates a dimension", () => {
    expect(ScoreDimensionSchema.parse(dim)).toEqual(dim);
  });

  /* AR-363 — optional explain-mode fields. */
  it("accepts a result with explain-mode fields", () => {
    const withExplain: ScoreResult = {
      ...result,
      summary: "53/100 — mixed for an urban area, with low confidence.",
      recommendations: ["Safety & Crime scores 49/100. 12 violent crimes per 1k residents."],
      data_sources: ["postcodes.io (geocoding)", "police.uk crime archive"],
    };
    expect(ScoreResultSchema.parse(withExplain)).toEqual(withExplain);
  });
  it("dimension requires reasoning + confidence_reason", () => {
    const bare = { key: "x", label: "X", score: 50, weight: 20, confidence: 0.5 };
    expect(() => ScoreDimensionSchema.parse(bare)).toThrow();
  });
});
