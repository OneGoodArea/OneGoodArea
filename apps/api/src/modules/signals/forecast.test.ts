import { describe, it, expect, vi } from "vitest";
import {
  parseForecastInput, buildForecastStatsSql, projectForecast, addMonths, runForecast,
  FORECAST_DEFAULT_WINDOW, FORECAST_DEFAULT_HORIZON, FORECAST_MAX_HORIZON, FORECAST_CI_K,
  type Runner, type ForecastStatsRow,
} from "./forecast";

describe("parseForecastInput (pure)", () => {
  it("rejects missing target / signal_key", () => {
    expect(parseForecastInput({}).ok).toBe(false);
    expect(parseForecastInput({ targetGeoCode: "X" }).ok).toBe(false);
    expect(parseForecastInput({ signalKey: "y" }).ok).toBe(false);
  });
  it("defaults window=24 + horizon=12 when omitted", () => {
    const r = parseForecastInput({ targetGeoCode: "E01000001", signalKey: "x" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.windowMonths).toBe(FORECAST_DEFAULT_WINDOW);
      expect(r.input.horizonMonths).toBe(FORECAST_DEFAULT_HORIZON);
    }
  });
  it("caps horizon at FORECAST_MAX_HORIZON", () => {
    const r = parseForecastInput({ targetGeoCode: "E01000001", signalKey: "x", horizonMonths: 9999 });
    expect(r.ok && r.input.horizonMonths).toBe(FORECAST_MAX_HORIZON);
  });
  it("rejects window_months below the minimum (6)", () => {
    expect(parseForecastInput({ targetGeoCode: "E01000001", signalKey: "x", windowMonths: 3 }).ok).toBe(false);
  });
  it("rejects non-positive horizon_months", () => {
    expect(parseForecastInput({ targetGeoCode: "E01000001", signalKey: "x", horizonMonths: 0 }).ok).toBe(false);
    expect(parseForecastInput({ targetGeoCode: "E01000001", signalKey: "x", horizonMonths: -1 }).ok).toBe(false);
  });
});

describe("buildForecastStatsSql (pure)", () => {
  const sql = buildForecastStatsSql();
  it("filters to (signal_key, lsoa, geo_code) and monthly periods", () => {
    expect(sql).toMatch(/signal_key = \$1/);
    expect(sql).toMatch(/geo_code = \$2/);
    expect(sql).toMatch(/geo_type = 'lsoa'/);
    expect(sql).toMatch(/observed_period ~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}\$'/);
  });
  it("computes synthetic x = year*12 + month (same shape as the trend-slope derive)", () => {
    expect(sql).toMatch(/substr\(observed_period, 1, 4\)::int \* 12 \+ substr\(observed_period, 6, 2\)::int/);
  });
  it("clips to the trailing windowMonths via ROW_NUMBER + WHERE rn <= $3", () => {
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(ORDER BY observed_period DESC\) AS rn/);
    expect(sql).toMatch(/rn <= \$3/);
  });
  it("returns regr_slope / intercept / r2 / count / y_variance / latest_period / latest_x", () => {
    expect(sql).toMatch(/regr_slope\(y, x\)::float8 AS slope/);
    expect(sql).toMatch(/regr_intercept\(y, x\)::float8 AS intercept/);
    expect(sql).toMatch(/regr_r2\(y, x\)::float8 AS r2/);
    expect(sql).toMatch(/COUNT\(\*\)::int AS n_observations/);
    expect(sql).toMatch(/regr_syy\(y, x\) \/ NULLIF\(COUNT\(\*\) - 1, 0\)/);
    expect(sql).toMatch(/MAX\(observed_period\)/);
    expect(sql).toMatch(/AS latest_x/);
  });
});

describe("addMonths (pure)", () => {
  it("increments by 1 within a year", () => {
    expect(addMonths("2026-01", 1)).toBe("2026-02");
    expect(addMonths("2026-05", 7)).toBe("2026-12");
  });
  it("carries into the next year", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-11", 3)).toBe("2027-02");
  });
  it("carries multiple years forward", () => {
    expect(addMonths("2026-06", 30)).toBe("2028-12");
  });
  it("handles negative offsets (rolling back)", () => {
    expect(addMonths("2026-03", -3)).toBe("2025-12");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
  it("rejects malformed inputs", () => {
    expect(() => addMonths("2026/01", 1)).toThrow();
    expect(() => addMonths("abc", 1)).toThrow();
  });
});

describe("projectForecast (pure)", () => {
  const baseStats: ForecastStatsRow = {
    slope: 1000,           // £1,000 per month
    intercept: 0,
    r2: 0.5,
    n_observations: 24,
    y_variance: 4_000_000, // SD = £2,000
    latest_observed_period: "2026-05",
    latest_x: 2026 * 12 + 5, // doesn't actually matter for the math
  };

  it("emits horizonMonths points anchored at latest_observed_period + i", () => {
    const r = projectForecast(baseStats, 3);
    expect(r.points).toHaveLength(3);
    expect(r.points[0].observed_period).toBe("2026-06");
    expect(r.points[1].observed_period).toBe("2026-07");
    expect(r.points[2].observed_period).toBe("2026-08");
  });
  it("projected_value = intercept + slope * (latest_x + i)", () => {
    const r = projectForecast(baseStats, 1);
    // x = latest_x + 1; y = 0 + 1000 * x
    const expected = 0 + 1000 * (baseStats.latest_x + 1);
    expect(r.points[0].projected_value).toBe(expected);
  });
  it("residual_stderr = SQRT((1-r2) * y_variance)", () => {
    // (1 - 0.5) * 4_000_000 = 2_000_000; SQRT = ~1414.21
    const r = projectForecast(baseStats, 1);
    expect(r.residualStderr).toBeCloseTo(Math.sqrt(2_000_000), 5);
  });
  it("CI half-width is FORECAST_CI_K * residual_stderr (constant across horizon — see ADR 0025)", () => {
    const r = projectForecast(baseStats, 2);
    const halfWidth = FORECAST_CI_K * Math.sqrt(2_000_000);
    expect(r.points[0].upper_bound - r.points[0].projected_value).toBeCloseTo(halfWidth, 5);
    expect(r.points[1].upper_bound - r.points[1].projected_value).toBeCloseTo(halfWidth, 5);
    // Important: same width at horizon 1 and 2 — v1 limitation documented in ADR.
    expect(r.points[1].upper_bound - r.points[1].lower_bound).toBeCloseTo(r.points[0].upper_bound - r.points[0].lower_bound, 5);
  });
  it("falls back to null residual_stderr + 0 half-width when r2 is null (degenerate fit)", () => {
    const r = projectForecast({ ...baseStats, r2: null }, 1);
    expect(r.residualStderr).toBeNull();
    expect(r.points[0].lower_bound).toBe(r.points[0].projected_value);
    expect(r.points[0].upper_bound).toBe(r.points[0].projected_value);
  });
});

describe("runForecast (I/O wired to an injected runner)", () => {
  it("returns null when the window has no rows", async () => {
    const run: Runner = async () => [];
    const r = await runForecast({ targetGeoCode: "X", signalKey: "y", windowMonths: 24, horizonMonths: 12 }, run);
    expect(r).toBeNull();
  });
  it("returns null when there's < 2 observations (regression undefined)", async () => {
    const run: Runner = async () => [{
      slope: null, intercept: null, r2: null, n_observations: 1, y_variance: 0,
      latest_observed_period: "2026-05", latest_x: 24317,
    }];
    const r = await runForecast({ targetGeoCode: "X", signalKey: "y", windowMonths: 24, horizonMonths: 12 }, run);
    expect(r).toBeNull();
  });
  it("maps DB stats to ForecastResult", async () => {
    const run = vi.fn<Runner>(async () => [{
      slope: "1000", intercept: "200000", r2: "0.7", n_observations: 24,
      y_variance: "1000000", latest_observed_period: "2026-05", latest_x: 24317,
    }]);
    const r = await runForecast({ targetGeoCode: "E01000001", signalKey: "property.median_price", windowMonths: 24, horizonMonths: 3 }, run);
    expect(r).not.toBeNull();
    if (r) {
      expect(r.stats.slope).toBe(1000);
      expect(r.stats.r2).toBe(0.7);
      expect(r.stats.n_observations).toBe(24);
      expect(r.points).toHaveLength(3);
      // First projected: y = 200000 + 1000*(24317+1) = 200000 + 24318000 = 24,518,000
      expect(r.points[0].projected_value).toBe(200000 + 1000 * (24317 + 1));
    }
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][1]).toEqual(["property.median_price", "E01000001", 24]);
  });
});
