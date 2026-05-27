import { describe, it, expect } from "vitest";
import { ALL_NORMALIZE_KEYS } from "./normalize-all";

describe("ALL_NORMALIZE_KEYS", () => {
  it("covers every source's normalized keys (deprivation + property + crime + derived)", () => {
    // deprivation
    expect(ALL_NORMALIZE_KEYS).toContain("deprivation.imd_rank");
    expect(ALL_NORMALIZE_KEYS).toContain("deprivation.imd_decile");
    // property (raw + derived YoY)
    expect(ALL_NORMALIZE_KEYS).toContain("property.median_price");
    expect(ALL_NORMALIZE_KEYS).toContain("property.price_change_pct_yoy");
    // crime
    expect(ALL_NORMALIZE_KEYS).toContain("crime.total_12m");
  });

  it("has no duplicates (a key is normalized once per pass)", () => {
    const set = new Set(ALL_NORMALIZE_KEYS);
    expect(set.size).toBe(ALL_NORMALIZE_KEYS.length);
  });
});
