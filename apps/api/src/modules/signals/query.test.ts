import { describe, it, expect, vi } from "vitest";
import { parseAreasQuery, buildAreasQuery, queryAreas, type Runner, type AreasQuery } from "./query";

describe("parseAreasQuery", () => {
  it("requires a signal", () => {
    const r = parseAreasQuery({});
    expect(r.ok).toBe(false);
  });
  it("coerces + defaults a valid query", () => {
    const r = parseAreasQuery({ signal: "deprivation.imd_decile", country: "England", max_percentile: "10", limit: "20" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.query).toMatchObject({ signal: "deprivation.imd_decile", country: "England", maxPercentile: 10, limit: 20, sort: "percentile" });
    }
  });
  it("rejects a bad country + out-of-range percentile", () => {
    expect(parseAreasQuery({ signal: "x", country: "Ireland" }).ok).toBe(false);
    expect(parseAreasQuery({ signal: "x", max_percentile: "150" }).ok).toBe(false);
  });
  it("caps limit at the max", () => {
    const r = parseAreasQuery({ signal: "x", limit: "99999" });
    expect(r.ok && r.query.limit).toBe(1000);
  });
});

describe("buildAreasQuery (pure)", () => {
  const base: AreasQuery = { signal: "deprivation.imd_decile", sort: "percentile", limit: 50 };

  it("builds a minimal national query", () => {
    const { text, params } = buildAreasQuery(base);
    expect(text).toContain("FROM signal_values sv");
    expect(text).toContain("LEFT JOIN signal_percentiles sp");
    expect(text).toContain("WHERE sv.signal_key = $1");
    expect(text).toContain("ORDER BY sp.percentile ASC NULLS LAST");
    expect(params).toEqual(["deprivation.imd_decile", 50]); // signal + limit
  });

  it("adds a country prefix filter", () => {
    const { text, params } = buildAreasQuery({ ...base, country: "Scotland" });
    expect(text).toContain("sv.geo_code LIKE $2");
    expect(params).toEqual(["deprivation.imd_decile", "S%", 50]);
  });

  it("adds a LAD scope via geo_lookup + a percentile bound", () => {
    const { text, params } = buildAreasQuery({ ...base, lad: "E08000003", maxPercentile: 10 });
    expect(text).toContain("sv.geo_code IN (SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $2)");
    expect(text).toContain("sp.percentile <= $3");
    expect(params).toEqual(["deprivation.imd_decile", "E08000003", 10, 50]);
  });
});

describe("queryAreas", () => {
  it("maps rows to AreaResult[]", async () => {
    const run: Runner = async () => [
      { geo_type: "lsoa", geo_code: "E01000001", raw_value: 3, normalized_value: 0.3, percentile: "30" },
      { geo_type: "lsoa", geo_code: "E01000002", raw_value: null, normalized_value: null, percentile: null },
    ];
    const out = await queryAreas({ signal: "deprivation.imd_decile", sort: "percentile", limit: 50 }, run);
    expect(out[0]).toEqual({ geo_type: "lsoa", geo_code: "E01000001", value: 3, normalized_value: 0.3, percentile: 30 });
    expect(out[1].value).toBeNull();
  });

  it("passes the built SQL + params to the runner", async () => {
    const run = vi.fn<Runner>(async () => []);
    await queryAreas({ signal: "crime.total_12m", country: "England", sort: "value_desc", limit: 5 }, run);
    const [text, params] = run.mock.calls[0];
    expect(text).toContain("ORDER BY sv.raw_value DESC NULLS LAST");
    expect(params).toEqual(["crime.total_12m", "E%", 5]);
  });
});
