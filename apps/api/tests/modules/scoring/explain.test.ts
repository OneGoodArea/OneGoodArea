/* AR-363 — unit tests for the brief-shape composition helpers used by
   /v1/score?explain=true. All three are pure functions. Every value
   in the output is derived from a real engine input; we test that
   the formatting honours the input, not that the engine logic is
   correct (that's covered by the engine golden tests). */

import { describe, it, expect } from "vitest";
import {
  composeScoreSummary,
  composeRecommendations,
  computeDataSources,
  type SourcePresence,
} from "@/modules/scoring/explain";
import type { ScoreDimension } from "@onegoodarea/contracts";

function dim(over: Partial<ScoreDimension>): ScoreDimension {
  return {
    key: "test",
    label: "Test",
    score: 50,
    weight: 20,
    confidence: 0.7,
    reasoning: "default reasoning",
    confidence_reason: "default confidence reason",
    ...over,
  };
}

describe("composeScoreSummary", () => {
  it("contrasts top and bottom dimensions when they differ", () => {
    const out = composeScoreSummary(72, 0.9, "urban", [
      dim({ key: "safety", label: "Safety", score: 88 }),
      dim({ key: "cost", label: "Cost of Living", score: 55 }),
    ]);
    expect(out).toContain("72/100");
    expect(out).toContain("urban");
    expect(out).toContain("high confidence");
    expect(out).toContain("Strongest on Safety (88/100)");
    expect(out).toContain("weakest on Cost of Living (55/100)");
  });

  it("uses 'above-average' band for 60..74", () => {
    const out = composeScoreSummary(65, 0.7, "suburban", [
      dim({ key: "a", label: "A", score: 70 }),
      dim({ key: "b", label: "B", score: 60 }),
    ]);
    expect(out).toContain("above-average");
  });

  it("uses 'strong' band for 75..100", () => {
    const out = composeScoreSummary(85, 0.9, "urban", [dim({ score: 85 })]);
    expect(out).toContain("strong");
  });

  it("uses 'weak' band for 0..29", () => {
    const out = composeScoreSummary(20, 0.7, "rural", [dim({ score: 20 })]);
    expect(out).toContain("weak");
  });

  it("collapses single-dimension case to one line without contrast", () => {
    const out = composeScoreSummary(80, 0.9, "urban", [
      dim({ key: "only", label: "Only Dimension", score: 80 }),
    ]);
    expect(out).toContain("Single-dimension score on Only Dimension (80/100)");
    expect(out).not.toContain("weakest on");
  });

  it("handles empty dimensions gracefully", () => {
    const out = composeScoreSummary(50, 0.5, "urban", []);
    expect(out).toBe("50/100 for a urban area, with low confidence.");
  });
});

describe("composeRecommendations", () => {
  it("surfaces low-scoring dimensions first, lowest first", () => {
    const out = composeRecommendations([
      dim({ key: "high", label: "High", score: 80, confidence: 0.9 }),
      dim({ key: "med-low", label: "Med-Low", score: 45, confidence: 0.9, reasoning: "below benchmark" }),
      dim({ key: "lowest", label: "Lowest", score: 25, confidence: 0.9, reasoning: "well below benchmark" }),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("Lowest scores 25/100");
    expect(out[0]).toContain("well below benchmark");
    expect(out[1]).toContain("Med-Low scores 45/100");
  });

  it("then surfaces low-confidence dimensions that weren't already flagged", () => {
    const out = composeRecommendations([
      dim({ key: "ok", label: "OK", score: 70, confidence: 0.9 }),
      dim({
        key: "shaky",
        label: "Shaky",
        score: 70,
        confidence: 0.4,
        confidence_reason: "Only 8 transactions in sample",
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("Shaky confidence is low");
    expect(out[0]).toContain("Only 8 transactions in sample");
    expect(out[0]).toContain("Treat as indicative");
  });

  it("uses 'very low' band when confidence is below 0.35", () => {
    const out = composeRecommendations([
      dim({
        key: "noisy",
        label: "Noisy",
        score: 70,
        confidence: 0.25,
        confidence_reason: "No primary source",
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("Noisy confidence is very low");
  });

  it("does not double-flag a dimension that's low on score AND confidence", () => {
    const out = composeRecommendations([
      dim({
        key: "double",
        label: "Double Trouble",
        score: 30,
        confidence: 0.3,
        reasoning: "low score",
        confidence_reason: "low confidence",
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("Double Trouble scores 30/100");
    expect(out[0]).toContain("low score");
  });

  it("caps at 4 recommendations", () => {
    const lowScoreDims = Array.from({ length: 8 }, (_, i) =>
      dim({ key: `d${i}`, label: `D${i}`, score: 10 + i, confidence: 0.9 }),
    );
    const out = composeRecommendations(lowScoreDims);
    expect(out.length).toBeLessThanOrEqual(4);
  });

  it("returns empty array when nothing is below threshold", () => {
    const out = composeRecommendations([
      dim({ key: "a", label: "A", score: 80, confidence: 0.9 }),
      dim({ key: "b", label: "B", score: 70, confidence: 0.8 }),
    ]);
    expect(out).toEqual([]);
  });
});

describe("computeDataSources", () => {
  function allPresent(): SourcePresence {
    return { crime: true, deprivation: true, property: true, amenities: true, flood: true, ofsted: true };
  }

  it("always cites postcodes.io for geocoding", () => {
    const out = computeDataSources(
      { crime: false, deprivation: false, property: false, amenities: false, flood: false, ofsted: false },
      "England",
    );
    expect(out).toEqual(["postcodes.io (geocoding)"]);
  });

  it("uses MHCLG IMD for England deprivation", () => {
    const out = computeDataSources({ ...allPresent(), property: false, ofsted: false }, "England");
    expect(out).toContain("MHCLG IMD 2025");
    expect(out).not.toContain("StatsWales WIMD 2019");
  });

  it("uses WIMD for Wales", () => {
    const out = computeDataSources({ ...allPresent(), property: false, ofsted: false }, "Wales");
    expect(out).toContain("StatsWales WIMD 2019");
    expect(out).not.toContain("MHCLG IMD 2025");
  });

  it("uses SIMD for Scotland", () => {
    const out = computeDataSources({ ...allPresent(), property: false, ofsted: false }, "Scotland");
    expect(out).toContain("Scottish Government SIMD 2020");
  });

  it("omits sources that returned no data", () => {
    const out = computeDataSources(
      { crime: false, deprivation: true, property: false, amenities: true, flood: false, ofsted: false },
      "England",
    );
    expect(out).toContain("MHCLG IMD 2025");
    expect(out).toContain("OpenStreetMap (Overpass)");
    expect(out).not.toContain("police.uk crime archive");
    expect(out).not.toContain("HM Land Registry Price Paid");
    expect(out).not.toContain("Environment Agency flood data");
    expect(out).not.toContain("Ofsted school inspections (DfE)");
  });

  it("cites all six sources when all are present", () => {
    const out = computeDataSources(allPresent(), "England");
    expect(out).toEqual([
      "postcodes.io (geocoding)",
      "MHCLG IMD 2025",
      "police.uk crime archive",
      "OpenStreetMap (Overpass)",
      "Environment Agency flood data",
      "HM Land Registry Price Paid",
      "Ofsted school inspections (DfE)",
    ]);
  });
});
