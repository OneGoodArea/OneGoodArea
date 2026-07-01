import { describe, it, expect, vi } from "vitest";
import {
  buildNormalizedValueSql,
  buildPercentilesSql,
  buildRegionalPercentilesSql,
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

  /* AR-408: regional percentile SQL partitions by ONS region and
     excludes rows with NULL region so we never store scope_key=''
     against 'regional' (would collide with the 'national' scope_key
     empty-string convention). */
  it("regional percentiles insert is scoped 'regional' by ONS region + excludes null regions", () => {
    const sql = buildRegionalPercentilesSql();
    expect(sql).toContain("INSERT INTO signal_percentiles");
    expect(sql).toContain("'regional', ge.region");
    expect(sql).toContain("PERCENT_RANK() OVER (PARTITION BY ge.region ORDER BY v.raw_value) * 100");
    expect(sql).toContain("AND ge.region IS NOT NULL");
    expect(sql).toContain("ON CONFLICT (signal_key, geo_type, geo_code, scope, scope_key)");
  });
});

describe("runDeprivationNormalize", () => {
  it("runs normalized_value + national + regional percentile statements for each deprivation signal", async () => {
    const run = vi.fn<QueryRunner>(async () => []);
    const summary = await runDeprivationNormalize(run);

    expect(summary.signals).toEqual([...DEPRIVATION_SIGNAL_KEYS]);
    /* AR-408: 3 statements per signal now: normalized_value +
       national percentiles + regional percentiles. */
    expect(run).toHaveBeenCalledTimes(DEPRIVATION_SIGNAL_KEYS.length * 3);
    // Each call binds the signal key as the sole parameter.
    for (const call of run.mock.calls) {
      expect(call[1]).toHaveLength(1);
      expect(DEPRIVATION_SIGNAL_KEYS).toContain(call[1][0]);
    }
  });
});
