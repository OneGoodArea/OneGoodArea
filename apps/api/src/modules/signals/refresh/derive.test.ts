import { describe, it, expect, vi } from "vitest";
import {
  buildPropertyYoYSql, buildRollingSumYoYSql, buildRegrSlopeSql, runDerivations,
  DERIVED_SIGNALS, DERIVED_NORMALIZE_KEYS, ROLLING_YOY_SPECS, TREND_SLOPE_SPECS,
} from "./derive";
import type { QueryRunner } from "./store-writer";

describe("buildPropertyYoYSql (pure)", () => {
  const sql = buildPropertyYoYSql();

  it("reads from the time-series + joins median to count", () => {
    expect(sql).toMatch(/FROM signal_timeseries mt/);
    expect(sql).toMatch(/JOIN signal_timeseries ct/);
    expect(sql).toMatch(/'property\.median_price'/);
    expect(sql).toMatch(/'property\.transaction_count'/);
  });

  it("filters to monthly periods only (excludes annual / window labels)", () => {
    expect(sql).toMatch(/observed_period ~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}\$'/);
  });

  it("computes a count-WEIGHTED annual median (not a naive mean of medians)", () => {
    expect(sql).toMatch(/SUM\(median \* count\)/);
    expect(sql).toMatch(/NULLIF\(SUM\(count\), 0\)/);
  });

  it("ranks years descending per LSOA and joins rn=1 (latest) to rn=2 (prior)", () => {
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY geo_code ORDER BY year DESC\)/);
    expect(sql).toMatch(/p\.rn = 2/);
    expect(sql).toMatch(/l\.rn = 1/);
  });

  it("only emits a row when the prior annual is positive (no divide-by-zero / nonsense %)", () => {
    expect(sql).toMatch(/p\.annual_median > 0/);
  });

  it("inserts into signal_values as property.price_change_pct_yoy and is idempotent (ON CONFLICT DO UPDATE)", () => {
    expect(sql).toMatch(/INSERT INTO signal_values/);
    expect(sql).toMatch(/'property\.price_change_pct_yoy'/);
    expect(sql).toMatch(/ON CONFLICT \(signal_key, geo_type, geo_code\) DO UPDATE/);
  });

  it("labels the observed_period as 'YoY <from> -> <to>' for transparency", () => {
    expect(sql).toMatch(/'YoY ' \|\| year_from \|\| ' -> ' \|\| year_to/);
  });

  it("interpolates the engine version", () => {
    const custom = buildPropertyYoYSql("9.9.9-test");
    expect(custom).toContain("'9.9.9-test'");
  });
});

describe("DERIVED_SIGNALS catalog", () => {
  it("declares property.price_change_pct_yoy (pct, neutral)", () => {
    const yoy = DERIVED_SIGNALS.find((s) => s.key === "property.price_change_pct_yoy");
    expect(yoy).toBeDefined();
    expect(yoy?.unit).toBe("pct");
    expect(yoy?.direction).toBe("neutral");
    expect(yoy?.category).toBe("property");
  });
  it("declares the Increment 3 rolling YoY signals", () => {
    const volumeYoy = DERIVED_SIGNALS.find((s) => s.key === "property.transaction_count_change_pct_yoy");
    expect(volumeYoy).toBeDefined();
    expect(volumeYoy?.unit).toBe("pct");
    expect(volumeYoy?.category).toBe("property");

    const crimeYoy = DERIVED_SIGNALS.find((s) => s.key === "crime.total_12m_change_pct_yoy");
    expect(crimeYoy).toBeDefined();
    expect(crimeYoy?.unit).toBe("pct");
    expect(crimeYoy?.direction).toBe("lower_is_better");
    expect(crimeYoy?.category).toBe("crime");
  });
  it("DERIVED_NORMALIZE_KEYS lists every derived signal", () => {
    expect(DERIVED_NORMALIZE_KEYS).toContain("property.price_change_pct_yoy");
    expect(DERIVED_NORMALIZE_KEYS).toContain("property.transaction_count_change_pct_yoy");
    expect(DERIVED_NORMALIZE_KEYS).toContain("crime.total_12m_change_pct_yoy");
  });
  it("ROLLING_YOY_SPECS wires source signals into derived keys", () => {
    const crime = ROLLING_YOY_SPECS.find((s) => s.derivedKey === "crime.total_12m_change_pct_yoy");
    expect(crime?.sourceKey).toBe("crime.monthly_count");
    const volume = ROLLING_YOY_SPECS.find((s) => s.derivedKey === "property.transaction_count_change_pct_yoy");
    expect(volume?.sourceKey).toBe("property.transaction_count");
  });
  it("declares the trend-slope signals (rate_per_month)", () => {
    const crimeSlope = DERIVED_SIGNALS.find((s) => s.key === "crime.monthly_count_trend_slope_24m");
    expect(crimeSlope).toBeDefined();
    expect(crimeSlope?.unit).toBe("rate_per_month");
    expect(crimeSlope?.direction).toBe("lower_is_better");

    const volumeSlope = DERIVED_SIGNALS.find((s) => s.key === "property.transaction_count_trend_slope_24m");
    expect(volumeSlope).toBeDefined();
    expect(volumeSlope?.unit).toBe("rate_per_month");
    expect(volumeSlope?.direction).toBe("neutral");
  });
  it("DERIVED_NORMALIZE_KEYS lists the trend-slope signals", () => {
    expect(DERIVED_NORMALIZE_KEYS).toContain("crime.monthly_count_trend_slope_24m");
    expect(DERIVED_NORMALIZE_KEYS).toContain("property.transaction_count_trend_slope_24m");
  });
  it("TREND_SLOPE_SPECS wires source -> derived (24m / minObs=18)", () => {
    const crime = TREND_SLOPE_SPECS.find((s) => s.derivedKey === "crime.monthly_count_trend_slope_24m");
    expect(crime?.sourceKey).toBe("crime.monthly_count");
    expect(crime?.windowMonths).toBe(24);
    expect(crime?.minObservations).toBe(18);
    const volume = TREND_SLOPE_SPECS.find((s) => s.derivedKey === "property.transaction_count_trend_slope_24m");
    expect(volume?.sourceKey).toBe("property.transaction_count");
  });
});

describe("buildRegrSlopeSql (pure, AR-186 / ADR 0021)", () => {
  const sql = buildRegrSlopeSql({
    sourceKey: "crime.monthly_count",
    derivedKey: "crime.monthly_count_trend_slope_24m",
    windowMonths: 24,
    minObservations: 18,
    confidenceReason: "test reason",
  });

  it("uses regr_slope(y, x) with x as a synthetic month index from observed_period", () => {
    expect(sql).toMatch(/regr_slope\(y, x\)/);
    expect(sql).toMatch(/substr\(observed_period, 1, 4\)::int \* 12 \+ substr\(observed_period, 6, 2\)::int/);
  });
  it("filters to the configured sourceKey + monthly periods only", () => {
    expect(sql).toMatch(/signal_key = 'crime\.monthly_count'/);
    expect(sql).toMatch(/observed_period ~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}\$'/);
  });
  it("ranks rows DESC and clips to windowMonths", () => {
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY geo_code ORDER BY observed_period DESC\)/);
    expect(sql).toMatch(/rn <= 24/);
  });
  it("requires HAVING COUNT(*) >= minObservations AND regr_slope NOT NULL (rejects sparse / degenerate series)", () => {
    expect(sql).toMatch(/HAVING COUNT\(\*\) >= 18/);
    expect(sql).toMatch(/regr_slope\(y, x\) IS NOT NULL/);
  });
  it("inserts into signal_values with the derived key + idempotent ON CONFLICT DO UPDATE", () => {
    expect(sql).toMatch(/INSERT INTO signal_values/);
    expect(sql).toMatch(/'crime\.monthly_count_trend_slope_24m'/);
    expect(sql).toMatch(/ON CONFLICT \(signal_key, geo_type, geo_code\) DO UPDATE/);
  });
  it("stamps the observed_period as 'slope <window_start>..<window_end> (n=<count>)'", () => {
    expect(sql).toMatch(/'slope ' \|\| window_start \|\| '\.\.' \|\| window_end \|\| ' \(n=' \|\| n \|\| '\)'/);
  });
  it("defaults to windowMonths=24 + minObservations=12 when omitted", () => {
    const defaults = buildRegrSlopeSql({
      sourceKey: "x", derivedKey: "y", confidenceReason: "z",
    });
    expect(defaults).toMatch(/rn <= 24/);
    expect(defaults).toMatch(/HAVING COUNT\(\*\) >= 12/);
  });
  it("honours non-default window + minObservations", () => {
    const custom = buildRegrSlopeSql({
      sourceKey: "x", derivedKey: "y", confidenceReason: "z",
      windowMonths: 36, minObservations: 24,
    });
    expect(custom).toMatch(/rn <= 36/);
    expect(custom).toMatch(/HAVING COUNT\(\*\) >= 24/);
  });
  it("interpolates the engine version + escapes single quotes", () => {
    const tricky = buildRegrSlopeSql({
      sourceKey: "x", derivedKey: "y", confidenceReason: "Pedro's note", engineVersion: "9.9.9-test",
    });
    expect(tricky).toContain("'9.9.9-test'");
    expect(tricky).toContain("Pedro''s note");
  });
});

describe("buildRollingSumYoYSql (pure, Increment 3 / AR-185)", () => {
  const sql = buildRollingSumYoYSql({
    sourceKey: "crime.monthly_count",
    derivedKey: "crime.total_12m_change_pct_yoy",
    confidenceReason: "test reason",
  });

  it("reads from the time-series for the configured source key only", () => {
    expect(sql).toMatch(/FROM signal_timeseries/);
    expect(sql).toMatch(/signal_key = 'crime\.monthly_count'/);
    expect(sql).not.toMatch(/'property\.median_price'/);
  });
  it("filters to monthly periods only (YYYY-MM)", () => {
    expect(sql).toMatch(/observed_period ~ '\^\[0-9\]\{4\}-\[0-9\]\{2\}\$'/);
  });
  it("ranks rows DESC per LSOA and splits into 1..12 (latest) vs 13..24 (prior)", () => {
    expect(sql).toMatch(/ROW_NUMBER\(\) OVER \(PARTITION BY geo_code ORDER BY observed_period DESC\)/);
    expect(sql).toMatch(/rn BETWEEN 1 AND 12/);
    expect(sql).toMatch(/rn BETWEEN 13 AND 24/);
  });
  it("requires a FULL 12 months on both sides + prior_12m > 0 (no divide-by-zero / short LSOAs)", () => {
    expect(sql).toMatch(/latest_months = 12/);
    expect(sql).toMatch(/prior_months = 12/);
    expect(sql).toMatch(/prior_12m > 0/);
  });
  it("inserts into signal_values under the configured derived key with ON CONFLICT DO UPDATE", () => {
    expect(sql).toMatch(/INSERT INTO signal_values/);
    expect(sql).toMatch(/'crime\.total_12m_change_pct_yoy'/);
    expect(sql).toMatch(/ON CONFLICT \(signal_key, geo_type, geo_code\) DO UPDATE/);
  });
  it("labels the observed_period as 'YoY <prior_start>..<prior_end> -> <latest_start>..<latest_end>'", () => {
    expect(sql).toMatch(/'YoY ' \|\| prior_window_start \|\| '\.\.' \|\| prior_window_end \|\| ' -> ' \|\| latest_window_start \|\| '\.\.' \|\| latest_period/);
  });
  it("interpolates the engine version", () => {
    const custom = buildRollingSumYoYSql({
      sourceKey: "x", derivedKey: "y", confidenceReason: "z", engineVersion: "9.9.9-test",
    });
    expect(custom).toContain("'9.9.9-test'");
  });
  it("respects minPriorSum when provided", () => {
    const guarded = buildRollingSumYoYSql({
      sourceKey: "x", derivedKey: "y", confidenceReason: "z", minPriorSum: 8,
    });
    expect(guarded).toMatch(/prior_12m > 8/);
  });
  it("escapes single quotes in user-configurable strings", () => {
    const tricky = buildRollingSumYoYSql({
      sourceKey: "x", derivedKey: "y", confidenceReason: "Pedro's note",
    });
    // The single quote must be SQL-escaped (doubled) — otherwise it would break the INSERT.
    expect(tricky).toContain("Pedro''s note");
  });
});

describe("runDerivations (WRITE-ONLY: catalog -> derive each spec, no normalize)", () => {
  it("runs property YoY + every rolling-YoY spec + every trend-slope spec, never normalizes", async () => {
    const calls: string[] = [];
    const run = vi.fn<QueryRunner>(async (text) => {
      if (text.includes("INSERT INTO signals")) calls.push("catalog");
      else if (text.includes("FROM signal_timeseries mt")) calls.push("derive:property_yoy");
      else if (text.includes("'crime.monthly_count'") && text.includes("INSERT INTO signal_values") && text.includes("rn BETWEEN 1 AND 12")) calls.push("derive:crime_yoy");
      else if (text.includes("'property.transaction_count'") && text.includes("INSERT INTO signal_values") && text.includes("rn BETWEEN 1 AND 12")) calls.push("derive:volume_yoy");
      else if (text.includes("regr_slope(y, x)") && text.includes("'crime.monthly_count'")) calls.push("derive:crime_slope");
      else if (text.includes("regr_slope(y, x)") && text.includes("'property.transaction_count'")) calls.push("derive:volume_slope");
      else if (text.includes("PERCENT_RANK()")) calls.push("normalize");
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='property.price_change_pct_yoy'")) {
        return [{ n: calls.includes("derive:property_yoy") ? 35000 : 0 }];
      }
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='crime.total_12m_change_pct_yoy'")) {
        return [{ n: calls.includes("derive:crime_yoy") ? 40000 : 0 }];
      }
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='property.transaction_count_change_pct_yoy'")) {
        return [{ n: calls.includes("derive:volume_yoy") ? 30000 : 0 }];
      }
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='crime.monthly_count_trend_slope_24m'")) {
        return [{ n: calls.includes("derive:crime_slope") ? 33000 : 0 }];
      }
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='property.transaction_count_trend_slope_24m'")) {
        return [{ n: calls.includes("derive:volume_slope") ? 2000 : 0 }];
      }
      return [];
    });

    const summary = await runDerivations(run);

    expect(calls[0]).toBe("catalog");
    expect(calls).toContain("derive:property_yoy");
    expect(calls).toContain("derive:crime_yoy");
    expect(calls).toContain("derive:volume_yoy");
    expect(calls).toContain("derive:crime_slope");
    expect(calls).toContain("derive:volume_slope");
    // CRUCIAL: normalize is a SEPARATE step (normalize:signals); derive never calls it.
    expect(calls).not.toContain("normalize");

    expect(summary.derivedSignals).toEqual([
      "property.price_change_pct_yoy",
      "property.transaction_count_change_pct_yoy",
      "property.transaction_count_trend_slope_24m",
      "crime.total_12m_change_pct_yoy",
      "crime.monthly_count_trend_slope_24m",
    ]);
    expect(summary.totals["property.price_change_pct_yoy"]).toEqual({ before: 0, after: 35000, appended: 35000 });
    expect(summary.totals["crime.total_12m_change_pct_yoy"]).toEqual({ before: 0, after: 40000, appended: 40000 });
    expect(summary.totals["property.transaction_count_change_pct_yoy"]).toEqual({ before: 0, after: 30000, appended: 30000 });
    expect(summary.totals["crime.monthly_count_trend_slope_24m"]).toEqual({ before: 0, after: 33000, appended: 33000 });
    expect(summary.totals["property.transaction_count_trend_slope_24m"]).toEqual({ before: 0, after: 2000, appended: 2000 });
    // Legacy scalars track property.price_change_pct_yoy for back-compat.
    expect(summary.rowsBefore).toBe(0);
    expect(summary.rowsAfter).toBe(35000);
    expect(summary.appended).toBe(35000);
  });
});
