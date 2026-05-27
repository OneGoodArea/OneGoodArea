import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../signals/query", () => ({ queryAreas: vi.fn(), queryAreasCompound: vi.fn() }));
vi.mock("../signals", () => ({ getAreaProfile: vi.fn() }));
vi.mock("../scoring", () => ({ scoreArea: vi.fn() }));
vi.mock("../signals/peers", () => ({ findPeers: vi.fn(), parsePeersInput: vi.fn() }));
vi.mock("../signals/insights", () => ({ findInsights: vi.fn(), parseInsightsInput: vi.fn() }));
vi.mock("../signals/forecast", () => ({ runForecast: vi.fn(), parseForecastInput: vi.fn() }));
vi.mock("../signals/data-sources/postcodes", () => ({ geocodeArea: vi.fn() }));

import { executePlan } from "./executor";
import { queryAreas, queryAreasCompound } from "../signals/query";
import { getAreaProfile } from "../signals";
import { scoreArea } from "../scoring";
import { findPeers, parsePeersInput } from "../signals/peers";
import { findInsights, parseInsightsInput } from "../signals/insights";
import { runForecast, parseForecastInput } from "../signals/forecast";
import { geocodeArea } from "../signals/data-sources/postcodes";

const mockQueryAreas = vi.mocked(queryAreas);
const mockQueryAreasCompound = vi.mocked(queryAreasCompound);
const mockGetAreaProfile = vi.mocked(getAreaProfile);
const mockScoreArea = vi.mocked(scoreArea);
const mockFindPeers = vi.mocked(findPeers);
const mockParsePeersInput = vi.mocked(parsePeersInput);
const mockFindInsights = vi.mocked(findInsights);
const mockParseInsightsInput = vi.mocked(parseInsightsInput);
const mockRunForecast = vi.mocked(runForecast);
const mockParseForecastInput = vi.mocked(parseForecastInput);
const mockGeocodeArea = vi.mocked(geocodeArea);

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

describe("executePlan — find_peers (AR-188 / ADR 0023)", () => {
  it("dispatches a find_peers plan with geo_code target straight to findPeers (no geocoding)", async () => {
    mockParsePeersInput.mockReturnValue({ ok: true, input: { targetGeoCode: "E01034129", k: 20, minSignals: 3 } });
    mockFindPeers.mockResolvedValue({
      signalsUsed: ["property.median_price", "crime.total_12m"],
      peers: [{ geo_code: "E01034130", distance: 0.1, n_dims_used: 2 }],
    });
    const res = await executePlan(
      { op: "find_peers", params: { target: { geo_code: "E01034129" }, k: 20 } },
      { planSource: "client" },
    );
    expect(mockGeocodeArea).not.toHaveBeenCalled();
    expect(mockFindPeers).toHaveBeenCalledOnce();
    if (res.plan.op === "find_peers" && res.results) {
      expect(res.results.target.geo_code).toBe("E01034129");
      expect(res.results.peers).toHaveLength(1);
      expect(res.results.target.signals_used).toEqual(["property.median_price", "crime.total_12m"]);
    } else {
      throw new Error("expected find_peers result");
    }
  });

  it("resolves a postcode target via geocodeArea before calling findPeers", async () => {
    mockGeocodeArea.mockResolvedValue({ lsoa: "E01034129" } as never);
    mockParsePeersInput.mockReturnValue({ ok: true, input: { targetGeoCode: "E01034129", k: 5, minSignals: 3 } });
    mockFindPeers.mockResolvedValue({
      signalsUsed: ["crime.total_12m"],
      peers: [{ geo_code: "E01034130", distance: 0.05, n_dims_used: 1 }],
    });
    await executePlan(
      { op: "find_peers", params: { target: { postcode: "M1 1AE" }, k: 5 } },
      { planSource: "nl" },
    );
    expect(mockGeocodeArea).toHaveBeenCalledWith("M1 1AE");
    expect(mockFindPeers).toHaveBeenCalledOnce();
  });

  it("returns null results when the target cannot be geocoded", async () => {
    mockGeocodeArea.mockResolvedValue(null);
    const res = await executePlan(
      { op: "find_peers", params: { target: { area: "Nowhere-on-Sea" } } },
      { planSource: "nl" },
    );
    expect(res.results).toBeNull();
    expect(mockFindPeers).not.toHaveBeenCalled();
  });

  it("returns null results when the target has no normalized signals", async () => {
    mockParsePeersInput.mockReturnValue({ ok: true, input: { targetGeoCode: "E01034129", k: 20, minSignals: 3 } });
    mockFindPeers.mockResolvedValue({ signalsUsed: [], peers: [] });
    const res = await executePlan(
      { op: "find_peers", params: { target: { geo_code: "E01034129" } } },
      { planSource: "client" },
    );
    expect(res.results).toBeNull();
  });
});

describe("executePlan — find_insights (AR-189 / ADR 0024)", () => {
  it("dispatches find_insights to the SAME findInsights used by POST /v1/insights", async () => {
    mockParseInsightsInput.mockReturnValue({
      ok: true,
      input: { signalKey: "crime.total_12m_peer_relative_z", country: "England", k: 50, minAbsZ: 2 },
    });
    mockFindInsights.mockResolvedValue([
      { geo_code: "E01000001", peer_relative_z: 3.5, abs_z: 3.5 },
      { geo_code: "E01000002", peer_relative_z: -3.2, abs_z: 3.2 },
    ]);
    const res = await executePlan(
      { op: "find_insights", params: { signal_key: "crime.total_12m_peer_relative_z", country: "England", k: 50, min_abs_z: 2 } },
      { planSource: "client" },
    );
    expect(mockParseInsightsInput).toHaveBeenCalledWith(expect.objectContaining({
      signalKey: "crime.total_12m_peer_relative_z",
      country: "England",
      k: 50,
      minAbsZ: 2,
    }));
    expect(mockFindInsights).toHaveBeenCalledOnce();
    if (res.plan.op === "find_insights" && res.results) {
      expect(res.results.signal_key).toBe("crime.total_12m_peer_relative_z");
      expect(res.results.insights).toHaveLength(2);
      expect(res.results.meta.threshold).toBe(2);
      expect(res.results.meta.scope).toMatch(/country=England/);
    } else {
      throw new Error("expected find_insights result");
    }
  });
  it("returns null results when parseInsightsInput rejects the params", async () => {
    mockParseInsightsInput.mockReturnValue({ ok: false, error: "test reason" });
    const res = await executePlan(
      { op: "find_insights", params: { signal_key: "bad.signal_key" } },
      { planSource: "nl" },
    );
    expect(res.results).toBeNull();
    expect(mockFindInsights).not.toHaveBeenCalled();
  });
});

describe("executePlan — find_forecast (AR-190 / ADR 0025)", () => {
  it("dispatches with geo_code target to the SAME runForecast used by POST /v1/forecast", async () => {
    mockParseForecastInput.mockReturnValue({
      ok: true,
      input: { targetGeoCode: "E01034129", signalKey: "property.median_price", windowMonths: 24, horizonMonths: 12 },
    });
    mockRunForecast.mockResolvedValue({
      stats: {
        slope: 1200, intercept: 200000, r2: 0.65, n_observations: 24, y_variance: 5_000_000,
        latest_observed_period: "2026-05", latest_x: 24317,
      },
      residualStderr: 1500,
      points: [
        { observed_period: "2026-06", projected_value: 224000, lower_bound: 221000, upper_bound: 227000 },
      ],
    });

    const res = await executePlan(
      { op: "find_forecast", params: { target: { geo_code: "E01034129" }, signal_key: "property.median_price", horizon_months: 12 } },
      { planSource: "client" },
    );
    expect(mockGeocodeArea).not.toHaveBeenCalled();
    expect(mockRunForecast).toHaveBeenCalledOnce();
    if (res.plan.op === "find_forecast" && res.results) {
      expect(res.results.target.geo_code).toBe("E01034129");
      expect(res.results.signal_key).toBe("property.median_price");
      expect(res.results.points).toHaveLength(1);
      expect(res.results.meta.slope_per_month).toBe(1200);
      expect(res.results.meta.r2).toBe(0.65);
      expect(res.results.meta.residual_stderr).toBe(1500);
    } else {
      throw new Error("expected find_forecast result");
    }
  });

  it("resolves postcode target via geocodeArea before runForecast", async () => {
    mockGeocodeArea.mockResolvedValue({ lsoa: "E01034129" } as never);
    mockParseForecastInput.mockReturnValue({
      ok: true, input: { targetGeoCode: "E01034129", signalKey: "crime.monthly_count", windowMonths: 24, horizonMonths: 6 },
    });
    mockRunForecast.mockResolvedValue({
      stats: { slope: 0.3, intercept: 5, r2: 0.4, n_observations: 24, y_variance: 4, latest_observed_period: "2026-03", latest_x: 24315 },
      residualStderr: 1.55,
      points: [{ observed_period: "2026-04", projected_value: 7295.4, lower_bound: 7292.3, upper_bound: 7298.5 }],
    });
    await executePlan(
      { op: "find_forecast", params: { target: { postcode: "M1 1AE" }, signal_key: "crime.monthly_count", horizon_months: 6 } },
      { planSource: "nl" },
    );
    expect(mockGeocodeArea).toHaveBeenCalledWith("M1 1AE");
    expect(mockRunForecast).toHaveBeenCalledOnce();
  });

  it("returns null results when the target cannot be geocoded", async () => {
    mockGeocodeArea.mockResolvedValue(null);
    const res = await executePlan(
      { op: "find_forecast", params: { target: { area: "Nowhere" }, signal_key: "x" } },
      { planSource: "nl" },
    );
    expect(res.results).toBeNull();
    expect(mockRunForecast).not.toHaveBeenCalled();
  });

  it("returns null results when runForecast returns null (e.g. insufficient observations)", async () => {
    mockParseForecastInput.mockReturnValue({
      ok: true, input: { targetGeoCode: "E01034129", signalKey: "x", windowMonths: 24, horizonMonths: 12 },
    });
    mockRunForecast.mockResolvedValue(null);
    const res = await executePlan(
      { op: "find_forecast", params: { target: { geo_code: "E01034129" }, signal_key: "x" } },
      { planSource: "client" },
    );
    expect(res.results).toBeNull();
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
