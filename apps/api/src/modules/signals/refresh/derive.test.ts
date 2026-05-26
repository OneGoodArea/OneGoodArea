import { describe, it, expect, vi } from "vitest";
import { buildPropertyYoYSql, runDerivations, DERIVED_SIGNALS, DERIVED_NORMALIZE_KEYS } from "./derive";
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
  it("DERIVED_NORMALIZE_KEYS lists the YoY signal", () => {
    expect(DERIVED_NORMALIZE_KEYS).toContain("property.price_change_pct_yoy");
  });
});

describe("runDerivations (WRITE-ONLY: catalog -> derive, no normalize)", () => {
  it("upserts the catalog and runs the YoY SQL, but does NOT normalize", async () => {
    const calls: string[] = [];
    const run = vi.fn<QueryRunner>(async (text) => {
      if (text.includes("INSERT INTO signals")) calls.push("catalog");
      else if (text.includes("FROM signal_timeseries mt")) calls.push("derive");
      else if (text.includes("PERCENT_RANK()")) calls.push("normalize");
      else if (text.includes("count(*)::int AS n FROM signal_values WHERE signal_key='property.price_change_pct_yoy'")) {
        calls.push("count"); return [{ n: calls.filter((c) => c === "count").length === 1 ? 0 : 35000 }];
      }
      return [];
    });

    const summary = await runDerivations(run);

    expect(calls[0]).toBe("catalog");
    expect(calls).toContain("derive");
    // CRUCIAL: normalize is a SEPARATE step (normalize:signals); derive never calls it.
    expect(calls).not.toContain("normalize");

    expect(summary.derivedSignals).toEqual(["property.price_change_pct_yoy"]);
    expect(summary.rowsBefore).toBe(0);
    expect(summary.rowsAfter).toBe(35000);
    expect(summary.appended).toBe(35000);
  });
});
