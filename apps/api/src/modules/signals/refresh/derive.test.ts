import { describe, it, expect, vi } from "vitest";
import {
  buildPropertyYoYSql, buildRollingSumYoYSql, runDerivations,
  DERIVED_SIGNALS, DERIVED_NORMALIZE_KEYS, ROLLING_YOY_SPECS,
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
  it("upserts the catalog, runs property YoY + every rolling YoY spec, never normalizes", async () => {
    const calls: string[] = [];
    const run = vi.fn<QueryRunner>(async (text) => {
      if (text.includes("INSERT INTO signals")) calls.push("catalog");
      else if (text.includes("FROM signal_timeseries mt")) calls.push("derive:property_yoy");
      else if (text.includes("'crime.monthly_count'") && text.includes("INSERT INTO signal_values")) calls.push("derive:crime_yoy");
      else if (text.includes("'property.transaction_count'") && text.includes("INSERT INTO signal_values") && text.includes("rn BETWEEN 1 AND 12")) calls.push("derive:volume_yoy");
      else if (text.includes("PERCENT_RANK()")) calls.push("normalize");
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='property.price_change_pct_yoy'")) {
        const before = calls.includes("derive:property_yoy");
        return [{ n: before ? 35000 : 0 }];
      }
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='crime.total_12m_change_pct_yoy'")) {
        return [{ n: calls.includes("derive:crime_yoy") ? 40000 : 0 }];
      }
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='property.transaction_count_change_pct_yoy'")) {
        return [{ n: calls.includes("derive:volume_yoy") ? 30000 : 0 }];
      }
      return [];
    });

    const summary = await runDerivations(run);

    expect(calls[0]).toBe("catalog");
    expect(calls).toContain("derive:property_yoy");
    expect(calls).toContain("derive:crime_yoy");
    expect(calls).toContain("derive:volume_yoy");
    // CRUCIAL: normalize is a SEPARATE step (normalize:signals); derive never calls it.
    expect(calls).not.toContain("normalize");

    expect(summary.derivedSignals).toEqual([
      "property.price_change_pct_yoy",
      "property.transaction_count_change_pct_yoy",
      "crime.total_12m_change_pct_yoy",
    ]);
    expect(summary.totals["property.price_change_pct_yoy"]).toEqual({ before: 0, after: 35000, appended: 35000 });
    expect(summary.totals["crime.total_12m_change_pct_yoy"]).toEqual({ before: 0, after: 40000, appended: 40000 });
    expect(summary.totals["property.transaction_count_change_pct_yoy"]).toEqual({ before: 0, after: 30000, appended: 30000 });
    // Legacy scalars track property.price_change_pct_yoy for back-compat.
    expect(summary.rowsBefore).toBe(0);
    expect(summary.rowsAfter).toBe(35000);
    expect(summary.appended).toBe(35000);
  });
});
