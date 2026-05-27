import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../signals/query", () => ({ queryAreas: vi.fn(), queryAreasCompound: vi.fn() }));
vi.mock("../signals", () => ({ getAreaProfile: vi.fn() }));
vi.mock("../scoring", () => ({ scoreArea: vi.fn() }));

import { executePlan } from "./executor";
import { queryAreas, queryAreasCompound } from "../signals/query";
import { getAreaProfile } from "../signals";
import { scoreArea } from "../scoring";

const mockQueryAreas = vi.mocked(queryAreas);
const mockQueryAreasCompound = vi.mocked(queryAreasCompound);
const mockGetAreaProfile = vi.mocked(getAreaProfile);
const mockScoreArea = vi.mocked(scoreArea);

beforeEach(() => { vi.clearAllMocks(); });

describe("executePlan — rank_areas", () => {
  it("dispatches to queryAreas with mapped params + defaults", async () => {
    mockQueryAreas.mockResolvedValue([
      { geo_type: "lsoa", geo_code: "E01000001", value: 1, normalized_value: 0.05, percentile: 0.5 },
    ]);
    const res = await executePlan(
      { op: "rank_areas", params: { signal: "deprivation.imd_decile", lad: "E08000003" } },
      { planSource: "client" },
    );
    expect(mockQueryAreas).toHaveBeenCalledWith(expect.objectContaining({
      signal: "deprivation.imd_decile",
      lad: "E08000003",
      sort: "percentile_desc", // default
      limit: 100,              // default
    }));
    expect(res.plan_source).toBe("client");
    expect(res.plan.op).toBe("rank_areas");
    expect(res.results).toHaveLength(1);
  });

  it("respects explicit sort/limit/filters", async () => {
    mockQueryAreas.mockResolvedValue([]);
    await executePlan(
      { op: "rank_areas", params: {
        signal: "property.median_price", country: "England",
        sort: "value", limit: 25, min_percentile: 10, max_percentile: 90, min_value: 50000, max_value: 5000000,
      } },
      { planSource: "nl" },
    );
    expect(mockQueryAreas).toHaveBeenCalledWith({
      signal: "property.median_price", country: "England", lad: undefined,
      sort: "value", limit: 25,
      minPercentile: 10, maxPercentile: 90, minValue: 50000, maxValue: 5000000,
    });
  });
});

describe("executePlan — rank_areas COMPOUND (Increment 2)", () => {
  it("dispatches a compound plan to queryAreasCompound with mapped params", async () => {
    mockQueryAreasCompound.mockResolvedValue([
      { geo_type: "lsoa", geo_code: "E01000001", value: 12, normalized_value: 0.8, percentile: 85,
        signals: {
          "property.median_price": { value: 200000, normalized_value: 0.4, percentile: 40 },
          "property.price_change_pct_yoy": { value: 12, normalized_value: 0.8, percentile: 85 },
        },
      },
    ]);
    const res = await executePlan(
      { op: "rank_areas", params: {
        signals: [
          { key: "property.median_price", filter: { lte: 250000 } },
          { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
        ],
        sort_by: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
        country: "England",
        limit: 50,
      } },
      { planSource: "client" },
    );
    expect(mockQueryAreas).not.toHaveBeenCalled();
    expect(mockQueryAreasCompound).toHaveBeenCalledWith(expect.objectContaining({
      country: "England",
      limit: 50,
      signals: [
        { key: "property.median_price", filter: { lte: 250000 } },
        { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
      ],
      sortBy: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
    }));
    if (res.plan.op === "rank_areas") {
      expect("signals" in res.plan.params).toBe(true);
    }
    expect(res.results).toHaveLength(1);
  });

  it("a singular plan still routes through queryAreas (backward compat)", async () => {
    mockQueryAreas.mockResolvedValue([]);
    await executePlan(
      { op: "rank_areas", params: { signal: "deprivation.imd_decile" } },
      { planSource: "client" },
    );
    expect(mockQueryAreas).toHaveBeenCalledOnce();
    expect(mockQueryAreasCompound).not.toHaveBeenCalled();
  });
});

describe("executePlan — get_area", () => {
  it("dispatches to getAreaProfile and surfaces null on a miss", async () => {
    mockGetAreaProfile.mockResolvedValue(null);
    const res = await executePlan(
      { op: "get_area", params: { area: "Nowhere" } },
      { planSource: "client" },
    );
    expect(mockGetAreaProfile).toHaveBeenCalledWith("Nowhere");
    expect(res.results).toBeNull();
    if (res.plan.op === "get_area") expect(res.plan.params.area).toBe("Nowhere");
  });
});

describe("executePlan — score_area", () => {
  it("dispatches to scoreArea with default preset 'research'", async () => {
    mockScoreArea.mockResolvedValue({ area: "M1 1AE", preset: "research" } as never);
    await executePlan(
      { op: "score_area", params: { area: "M1 1AE" } },
      { planSource: "client" },
    );
    expect(mockScoreArea).toHaveBeenCalledWith({ area: "M1 1AE", preset: "research", weights: undefined });
  });

  it("passes through explicit preset + custom weights", async () => {
    mockScoreArea.mockResolvedValue({ area: "SW1A 1AA", preset: "investing" } as never);
    await executePlan(
      { op: "score_area", params: { area: "SW1A 1AA", preset: "investing", weights: { affordability: 60 } } },
      { planSource: "nl" },
    );
    expect(mockScoreArea).toHaveBeenCalledWith({
      area: "SW1A 1AA", preset: "investing", weights: { affordability: 60 },
    });
  });
});

describe("executePlan — meta + plan echo", () => {
  it("stamps generated_at + echoes the plan + plan_source on every response", async () => {
    mockGetAreaProfile.mockResolvedValue(null);
    const res = await executePlan({ op: "get_area", params: { area: "X" } }, { planSource: "nl" });
    expect(res.meta.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(res.plan_source).toBe("nl");
    expect(res.plan).toMatchObject({ op: "get_area", params: { area: "X" } });
  });
});
