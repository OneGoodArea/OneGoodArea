import { describe, it, expect } from "vitest";
import { QueryPlanSchema, RankAreasPlanSchema, SignalFilterSchema } from "./intelligence";

describe("@onegoodarea/contracts — intelligence query plan", () => {
  it("accepts the singular rank_areas params (backward-compat)", () => {
    const r = RankAreasPlanSchema.safeParse({
      op: "rank_areas",
      params: { signal: "deprivation.imd_decile", country: "England", sort: "value", limit: 20 },
    });
    expect(r.success).toBe(true);
  });

  it("accepts the compound rank_areas params with signals[] + sort_by", () => {
    const r = RankAreasPlanSchema.safeParse({
      op: "rank_areas",
      params: {
        signals: [
          { key: "property.median_price", filter: { lte: 250000 } },
          { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
          { key: "crime.total_12m", filter: { percentile_lte: 50 } },
        ],
        sort_by: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
        country: "England",
        limit: 50,
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a compound plan when sort_by.signal isn't in signals[].key", () => {
    const r = RankAreasPlanSchema.safeParse({
      op: "rank_areas",
      params: {
        signals: [{ key: "property.median_price", filter: { lte: 250000 } }],
        sort_by: { signal: "deprivation.imd_decile" },
      },
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty signals array", () => {
    const r = RankAreasPlanSchema.safeParse({ op: "rank_areas", params: { signals: [] } });
    expect(r.success).toBe(false);
  });

  it("the discriminated QueryPlanSchema still validates both shapes under op=rank_areas", () => {
    const ok1 = QueryPlanSchema.safeParse({
      op: "rank_areas",
      params: { signal: "crime.total_12m" },
    });
    const ok2 = QueryPlanSchema.safeParse({
      op: "rank_areas",
      params: { signals: [{ key: "crime.total_12m" }] },
    });
    expect(ok1.success).toBe(true);
    expect(ok2.success).toBe(true);
  });
});

describe("@onegoodarea/contracts — SignalFilterSchema (strict single-op)", () => {
  it("accepts each individual operator shape", () => {
    const samples = [
      { eq: 1 }, { lt: 1 }, { lte: 1 }, { gt: 1 }, { gte: 1 },
      { between: [1, 5] },
      { percentile_lt: 25 }, { percentile_lte: 50 },
      { percentile_gt: 75 }, { percentile_gte: 90 },
      { percentile_between: [25, 75] },
    ];
    for (const s of samples) {
      expect(SignalFilterSchema.safeParse(s).success).toBe(true);
    }
  });

  it("rejects an empty filter object", () => {
    expect(SignalFilterSchema.safeParse({}).success).toBe(false);
  });

  it("rejects two operators in one filter", () => {
    expect(SignalFilterSchema.safeParse({ lt: 5, gt: 1 }).success).toBe(false);
  });

  it("rejects a percentile op outside 0..100", () => {
    expect(SignalFilterSchema.safeParse({ percentile_lt: 150 }).success).toBe(false);
  });
});
