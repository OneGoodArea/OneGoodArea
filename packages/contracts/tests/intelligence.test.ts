import { describe, it, expect } from "vitest";
import {
  QueryPlanSchema, RankAreasPlanSchema, SignalFilterSchema,
  FindPeersPlanSchema, PeersRequestSchema,
  FindInsightsPlanSchema, InsightsRequestSchema,
  FindForecastPlanSchema, ForecastRequestSchema,
} from "../src/intelligence";

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

describe("@onegoodarea/contracts — find_peers plan + PeersRequest (Increment 6 / AR-188)", () => {
  it("accepts a find_peers plan with geo_code target", () => {
    const r = FindPeersPlanSchema.safeParse({
      op: "find_peers",
      params: { target: { geo_code: "E01034129" }, k: 20 },
    });
    expect(r.success).toBe(true);
  });
  it("accepts a find_peers plan with postcode target + signal subset", () => {
    const r = FindPeersPlanSchema.safeParse({
      op: "find_peers",
      params: {
        target: { postcode: "M1 1AE" },
        signals: ["property.median_price", "crime.total_12m"],
        country: "England",
        k: 10,
      },
    });
    expect(r.success).toBe(true);
  });
  it("rejects a target with TWO of geo_code/postcode/area", () => {
    const r = FindPeersPlanSchema.safeParse({
      op: "find_peers",
      params: { target: { geo_code: "E01034129", postcode: "M1 1AE" } },
    });
    expect(r.success).toBe(false);
  });
  it("rejects a target with ZERO identifiers", () => {
    const r = FindPeersPlanSchema.safeParse({
      op: "find_peers",
      params: { target: {} },
    });
    expect(r.success).toBe(false);
  });
  it("rejects out-of-range k", () => {
    expect(FindPeersPlanSchema.safeParse({
      op: "find_peers", params: { target: { geo_code: "E01034129" }, k: 0 },
    }).success).toBe(false);
    expect(FindPeersPlanSchema.safeParse({
      op: "find_peers", params: { target: { geo_code: "E01034129" }, k: 201 },
    }).success).toBe(false);
  });
  it("rejects an empty signals[]", () => {
    expect(FindPeersPlanSchema.safeParse({
      op: "find_peers", params: { target: { geo_code: "E01034129" }, signals: [] },
    }).success).toBe(false);
  });
  it("QueryPlanSchema discriminated union accepts find_peers under op=find_peers", () => {
    const r = QueryPlanSchema.safeParse({
      op: "find_peers", params: { target: { geo_code: "E01034129" } },
    });
    expect(r.success).toBe(true);
  });
  it("PeersRequestSchema accepts the same shape as the plan params (standalone endpoint)", () => {
    const r = PeersRequestSchema.safeParse({
      target: { area: "Manchester city centre" },
      signals: ["property.median_price"],
      k: 30,
      min_signals: 1,
    });
    expect(r.success).toBe(true);
  });
});

describe("@onegoodarea/contracts — find_insights plan + InsightsRequest (Increment 7 / AR-189)", () => {
  it("accepts a minimal find_insights plan (signal_key only)", () => {
    const r = FindInsightsPlanSchema.safeParse({
      op: "find_insights",
      params: { signal_key: "crime.total_12m_peer_relative_z" },
    });
    expect(r.success).toBe(true);
  });
  it("accepts a fully-specified find_insights plan", () => {
    const r = FindInsightsPlanSchema.safeParse({
      op: "find_insights",
      params: {
        signal_key: "property.median_price_peer_relative_z",
        country: "England",
        lad: "E08000003",
        min_abs_z: 2.5,
        k: 100,
      },
    });
    expect(r.success).toBe(true);
  });
  it("rejects missing signal_key", () => {
    expect(FindInsightsPlanSchema.safeParse({ op: "find_insights", params: {} }).success).toBe(false);
  });
  it("rejects k out of range", () => {
    expect(FindInsightsPlanSchema.safeParse({
      op: "find_insights", params: { signal_key: "x_peer_relative_z", k: 0 },
    }).success).toBe(false);
    expect(FindInsightsPlanSchema.safeParse({
      op: "find_insights", params: { signal_key: "x_peer_relative_z", k: 501 },
    }).success).toBe(false);
  });
  it("rejects negative min_abs_z", () => {
    expect(FindInsightsPlanSchema.safeParse({
      op: "find_insights", params: { signal_key: "x_peer_relative_z", min_abs_z: -0.5 },
    }).success).toBe(false);
  });
  it("QueryPlanSchema discriminated union accepts find_insights under op=find_insights", () => {
    const r = QueryPlanSchema.safeParse({
      op: "find_insights", params: { signal_key: "crime.total_12m_peer_relative_z" },
    });
    expect(r.success).toBe(true);
  });
  it("InsightsRequestSchema accepts the same shape (standalone endpoint)", () => {
    const r = InsightsRequestSchema.safeParse({
      signal_key: "crime.total_12m_peer_relative_z", min_abs_z: 2,
    });
    expect(r.success).toBe(true);
  });
});

describe("@onegoodarea/contracts — find_forecast plan + ForecastRequest (Increment 8 / AR-190)", () => {
  it("accepts a minimal find_forecast plan (target + signal_key)", () => {
    const r = FindForecastPlanSchema.safeParse({
      op: "find_forecast",
      params: { target: { postcode: "M1 1AE" }, signal_key: "property.median_price" },
    });
    expect(r.success).toBe(true);
  });
  it("accepts a fully-specified find_forecast plan", () => {
    const r = FindForecastPlanSchema.safeParse({
      op: "find_forecast",
      params: {
        target: { geo_code: "E01034129" },
        signal_key: "crime.monthly_count",
        window_months: 36,
        horizon_months: 24,
      },
    });
    expect(r.success).toBe(true);
  });
  it("rejects window_months < 6 (degenerate fit)", () => {
    expect(FindForecastPlanSchema.safeParse({
      op: "find_forecast",
      params: { target: { geo_code: "E01034129" }, signal_key: "x", window_months: 3 },
    }).success).toBe(false);
  });
  it("rejects horizon_months > 60", () => {
    expect(FindForecastPlanSchema.safeParse({
      op: "find_forecast",
      params: { target: { geo_code: "E01034129" }, signal_key: "x", horizon_months: 61 },
    }).success).toBe(false);
  });
  it("rejects a target with TWO of geo_code/postcode/area (re-uses PeersTargetSchema)", () => {
    expect(FindForecastPlanSchema.safeParse({
      op: "find_forecast",
      params: { target: { geo_code: "E01034129", postcode: "M1 1AE" }, signal_key: "x" },
    }).success).toBe(false);
  });
  it("QueryPlanSchema discriminated union accepts find_forecast under op=find_forecast", () => {
    const r = QueryPlanSchema.safeParse({
      op: "find_forecast",
      params: { target: { geo_code: "E01034129" }, signal_key: "property.median_price" },
    });
    expect(r.success).toBe(true);
  });
  it("ForecastRequestSchema accepts the same shape (standalone endpoint)", () => {
    const r = ForecastRequestSchema.safeParse({
      target: { area: "Manchester city centre" },
      signal_key: "property.median_price",
      horizon_months: 12,
    });
    expect(r.success).toBe(true);
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
