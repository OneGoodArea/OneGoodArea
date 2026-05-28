import { describe, it, expect, vi } from "vitest";
import {
  buildNormalizedValueSql,
  buildPercentilesSql,
  runDeprivationNormalize,
  DEPRIVATION_SIGNAL_KEYS,
} from "@/modules/signals/refresh/normalize";
import type { QueryRunner } from "@/modules/signals/refresh/store-writer";

describe("normalization SQL (pure)", () => {
  it("normalized_value update ranks within country, ascending by raw_value", () => {
    const sql = buildNormalizedValueSql();
    expect(sql).toContain("UPDATE signal_values");
    expect(sql).toContain("PERCENT_RANK() OVER (PARTITION BY ge.country ORDER BY v.raw_value)");
    expect(sql).toContain("WHERE v.signal_key = $1 AND v.raw_value IS NOT NULL");
  });

  it("percentiles insert is scoped national-within-country and upserts", () => {
    const sql = buildPercentilesSql();
    expect(sql).toContain("INSERT INTO signal_percentiles");
    expect(sql).toContain("'national', ge.country");
    expect(sql).toContain("PERCENT_RANK() OVER (PARTITION BY ge.country ORDER BY v.raw_value) * 100");
    expect(sql).toContain("ON CONFLICT (signal_key, geo_type, geo_code, scope, scope_key)");
  });
});

describe("runDeprivationNormalize", () => {
  it("runs the normalized_value + percentile statements for each deprivation signal", async () => {
    const run = vi.fn<QueryRunner>(async () => []);
    const summary = await runDeprivationNormalize(run);

    expect(summary.signals).toEqual([...DEPRIVATION_SIGNAL_KEYS]);
    // 2 statements (normalized_value + percentiles) per signal.
    expect(run).toHaveBeenCalledTimes(DEPRIVATION_SIGNAL_KEYS.length * 2);
    // Each call binds the signal key as the sole parameter.
    for (const call of run.mock.calls) {
      expect(call[1]).toHaveLength(1);
      expect(DEPRIVATION_SIGNAL_KEYS).toContain(call[1][0]);
    }
  });
});
