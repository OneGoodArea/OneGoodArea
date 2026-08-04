/* Levers (AR-196): unit tests for the presets module's pure helpers.
   findUnknownWeightKeys is the load-bearing validator — every create
   and patch goes through it, including when the patch changes
   base_preset and re-validates the existing weights against the new
   dimension set. The dimension catalog is pinned by the scoring
   module's own tests; this test pins our enforcement of it. */

import { describe, it, expect } from "vitest";
import { findUnknownWeightKeys } from "@/modules/orgs/presets";

describe("presets/findUnknownWeightKeys", () => {
  it("returns empty when every weight key is in the base_preset's dimension set", () => {
    expect(
      findUnknownWeightKeys("moving", {
        crime: 0.2,
        deprivation: 0.1,
        property: 0.2,
        schools: 0.2,
        amenities: 0.1,
        transport: 0.15,
        environment: 0.05,
      }),
    ).toEqual([]);
  });

  it("flags weight keys that aren't in the chosen base_preset's dimension set", () => {
    // price_growth is not one of the seven shared keys.
    expect(
      findUnknownWeightKeys("moving", {
        crime: 0.5,
        price_growth: 0.5,
      }),
    ).toEqual(["price_growth"]);
  });

  it("returns every unknown key (in iteration order) for a base_preset with zero overlap", () => {
    // Legacy methodology-1.0.0 keys vs the shared seven.
    expect(
      findUnknownWeightKeys("research", {
        foot_traffic_demand: 0.5,
        competition_density: 0.5,
      }).sort(),
    ).toEqual(["competition_density", "foot_traffic_demand"]);
  });

  it("accepts a partial weights map (callers can override 1 of 7 dims)", () => {
    // Only one weight, but it's a valid shared dim.
    expect(findUnknownWeightKeys("business", { crime: 2 })).toEqual([]);
  });

  it("treats empty weights as valid (the Zod contract refines empty-out)", () => {
    expect(findUnknownWeightKeys("moving", {})).toEqual([]);
  });

  it("is case-sensitive (dim keys are lower_snake)", () => {
    expect(findUnknownWeightKeys("moving", { Crime: 1 })).toEqual(["Crime"]);
  });
});
