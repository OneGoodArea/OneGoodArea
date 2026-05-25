import { describe, it, expect } from "vitest";
import { ScoreResultSchema, ScoreDimensionSchema, type ScoreResult } from "./scores";

const dim = { key: "safety_crime", label: "Safety & Crime", score: 79, weight: 20, confidence: 0.4 };

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
});
