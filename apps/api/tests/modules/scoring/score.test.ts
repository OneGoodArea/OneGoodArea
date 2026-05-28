import { describe, it, expect } from "vitest";
import { dimensionKey, PRESET_DIMENSION_KEYS, parseScoreBody, applyWeights } from "@/modules/scoring/score";
import { computeScores, type ComputedScores } from "@/modules/reports/scoring-engine";
import { INTENTS, type Intent } from "@onegoodarea/contracts";

describe("dimensionKey", () => {
  it("slugifies labels", () => {
    expect(dimensionKey("Safety & Crime")).toBe("safety_crime");
    expect(dimensionKey("Cost of Living")).toBe("cost_of_living");
    expect(dimensionKey("Regeneration & Infrastructure")).toBe("regeneration_infrastructure");
  });
});

describe("PRESET_DIMENSION_KEYS drift guard", () => {
  // If the engine renames a dimension, this fails loudly so we update the keys.
  it("matches the engine's actual dimension labels for every preset", () => {
    for (const intent of INTENTS) {
      const base = computeScores(intent, null, null, null, null, "suburban", null, null);
      const keys = base.dimensions.map((d) => dimensionKey(d.label));
      expect(keys).toEqual([...PRESET_DIMENSION_KEYS[intent as Intent]]);
    }
  });
});

describe("parseScoreBody", () => {
  it("requires area, defaults preset to research", () => {
    expect(parseScoreBody({}).ok).toBe(false);
    const r = parseScoreBody({ area: "M1 1AE" });
    expect(r.ok && r.query).toMatchObject({ area: "M1 1AE", preset: "research" });
  });
  it("rejects a bad preset", () => {
    expect(parseScoreBody({ area: "x", preset: "vibes" }).ok).toBe(false);
  });
  it("accepts valid weights over the preset's dimensions", () => {
    const r = parseScoreBody({ area: "x", preset: "moving", weights: { safety_crime: 40, cost_of_living: 10 } });
    expect(r.ok && r.query.weights).toEqual({ safety_crime: 40, cost_of_living: 10 });
  });
  it("rejects a weight key not in the preset's dimensions", () => {
    const r = parseScoreBody({ area: "x", preset: "moving", weights: { price_growth: 50 } });
    expect(r.ok).toBe(false); // price_growth belongs to 'investing', not 'moving'
  });
  it("rejects non-positive weights", () => {
    expect(parseScoreBody({ area: "x", weights: { safety_crime: 0 } }).ok).toBe(false);
  });
});

describe("applyWeights", () => {
  const base: ComputedScores = {
    overall: 0,
    area_type: "urban",
    confidence: 0,
    dimensions: [
      { label: "Safety & Crime", score: 80, weight: 25, confidence: 0.9, reasoning: "", confidence_reason: "" },
      { label: "Schools & Education", score: 40, weight: 20, confidence: 0.5, reasoning: "", confidence_reason: "" },
      { label: "Transport & Commute", score: 60, weight: 20, confidence: 0.8, reasoning: "", confidence_reason: "" },
      { label: "Daily Amenities", score: 50, weight: 15, confidence: 0.7, reasoning: "", confidence_reason: "" },
      { label: "Cost of Living", score: 30, weight: 20, confidence: 0.6, reasoning: "", confidence_reason: "" },
    ],
  };

  it("with no custom weights reproduces the preset weighting", () => {
    const r = applyWeights(base);
    // (80*25 + 40*20 + 60*20 + 50*15 + 30*20) / 100 = 5350/100 = 53.5 -> 54
    expect(r.score).toBe(54);
    expect(r.weights_source).toBe("preset");
    expect(r.dimensions[0]).toMatchObject({ key: "safety_crime", weight: 25 });
  });

  it("custom weights change the overall + are reflected per-dimension", () => {
    const r = applyWeights(base, { safety_crime: 80 }); // heavily weight the 80-scorer
    // weights [80,20,20,15,20] total 155; (80*80+40*20+60*20+50*15+30*20)/155 = 9750/155 = 62.9 -> 63
    expect(r.score).toBe(63);
    expect(r.weights_source).toBe("custom");
    expect(r.dimensions.find((d) => d.key === "safety_crime")!.weight).toBe(80);
  });
});
