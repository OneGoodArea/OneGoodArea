import { describe, it, expect, vi } from "vitest";
import { buildTimeseriesAppendSql, appendTimeseries } from "./timeseries";
import type { QueryRunner } from "./store-writer";

describe("buildTimeseriesAppendSql (pure)", () => {
  const sql = buildTimeseriesAppendSql();
  it("inserts into signal_timeseries from signal_values", () => {
    expect(sql).toContain("INSERT INTO signal_timeseries");
    expect(sql).toContain("FROM signal_values");
  });
  it("keys history by observed_period and is immutable per period (DO NOTHING)", () => {
    expect(sql).toContain("ON CONFLICT (signal_key, geo_type, geo_code, observed_period) DO NOTHING");
    expect(sql).toContain("WHERE observed_period IS NOT NULL");
  });
  it("excludes property.* (prices manage their own monthly history)", () => {
    expect(sql).toContain("signal_key NOT LIKE 'property.%'");
  });
});

describe("appendTimeseries", () => {
  it("reports the delta of new history rows", async () => {
    let n = 100;
    const run = vi.fn<QueryRunner>(async (text) => {
      if (text.includes("count(*)")) return [{ n }];
      if (text.startsWith("INSERT")) { n += 12; return []; } // the append adds 12 rows
      return [];
    });

    const summary = await appendTimeseries(run);

    expect(summary).toEqual({ appended: 12, total: 112 });
    // count (before) + insert + count (after) = 3 calls
    expect(run).toHaveBeenCalledTimes(3);
  });
});
