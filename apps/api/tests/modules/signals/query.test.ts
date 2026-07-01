import { describe, it, expect, vi } from "vitest";
import {
  parseAreasQuery, buildAreasQuery, queryAreas,
  buildCompoundAreasQuery, queryAreasCompound,
  type Runner, type AreasQuery, type CompoundAreasQuery,
} from "@/modules/signals/query";

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
  const base: AreasQuery = { signal: "deprivation.imd_decile", sort: "percentile", limit: 50, scope: "national" };

  it("builds a minimal national query", () => {
    const { text, params } = buildAreasQuery(base);
    expect(text).toContain("FROM signal_values sv");
    expect(text).toContain("LEFT JOIN signal_percentiles sp");
    expect(text).toContain("WHERE sv.signal_key = $1");
    expect(text).toContain("ORDER BY sp.percentile ASC NULLS LAST");
    expect(text).toContain("sp.scope = $2");
    expect(params).toEqual(["deprivation.imd_decile", "national", 50]); // signal + scope + limit
  });

  it("adds a country prefix filter", () => {
    const { text, params } = buildAreasQuery({ ...base, country: "Scotland" });
    expect(text).toContain("sv.geo_code LIKE $2");
    expect(params).toEqual(["deprivation.imd_decile", "S%", "national", 50]);
  });

  it("adds a LAD scope via geo_lookup + a percentile bound", () => {
    const { text, params } = buildAreasQuery({ ...base, lad: "E08000003", maxPercentile: 10 });
    expect(text).toContain("sv.geo_code IN (SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $2)");
    expect(text).toContain("sp.percentile <= $3");
    expect(params).toEqual(["deprivation.imd_decile", "E08000003", 10, "national", 50]);
  });

  /* AR-408: scope parameter picks which signal_percentiles rows drive
     percentile filters + ranking. Regional scope surfaces within-region
     outperformers instead of the national flatten. */
  it("uses scope='regional' when the query asks for it", () => {
    const { text, params } = buildAreasQuery({ ...base, scope: "regional" });
    expect(text).toContain("sp.scope = $2");
    expect(params).toEqual(["deprivation.imd_decile", "regional", 50]);
  });
});

describe("queryAreas", () => {
  it("maps rows to AreaResult[]", async () => {
    const run: Runner = async () => [
      { geo_type: "lsoa", geo_code: "E01000001", raw_value: 3, normalized_value: 0.3, percentile: "30" },
      { geo_type: "lsoa", geo_code: "E01000002", raw_value: null, normalized_value: null, percentile: null },
    ];
    const out = await queryAreas({ signal: "deprivation.imd_decile", sort: "percentile", limit: 50, scope: "national" }, run);
    expect(out[0]).toEqual({ geo_type: "lsoa", geo_code: "E01000001", value: 3, normalized_value: 0.3, percentile: 30 });
    expect(out[1].value).toBeNull();
  });

  it("passes the built SQL + params to the runner", async () => {
    const run = vi.fn<Runner>(async () => []);
    await queryAreas({ signal: "crime.total_12m", country: "England", sort: "value_desc", limit: 5, scope: "national" }, run);
    const [text, params] = run.mock.calls[0];
    expect(text).toContain("ORDER BY sv.raw_value DESC NULLS LAST");
    expect(params).toEqual(["crime.total_12m", "E%", "national", 5]);
  });
});

/* ── compound multi-signal (Increment 2 / AR-184) ──────────────────────── */

describe("buildCompoundAreasQuery (pure)", () => {
  const baseLimit = 100;

  it("builds one signal_values JOIN per non-anchor signal", () => {
    const q: CompoundAreasQuery = {
      signals: [
        { key: "property.median_price", filter: { lte: 250000 } },
        { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
        { key: "crime.total_12m", filter: { percentile_lte: 50 } },
      ],
      limit: baseLimit,
    };
    const { text, params } = buildCompoundAreasQuery(q);
    expect(text).toContain("FROM signal_values sv0");
    expect(text).toContain("INNER JOIN signal_values sv1");
    expect(text).toContain("INNER JOIN signal_values sv2");
    expect(text).toContain("LEFT JOIN signal_percentiles sp0");
    expect(text).toContain("LEFT JOIN signal_percentiles sp1");
    expect(text).toContain("LEFT JOIN signal_percentiles sp2");
    // Anchor signal_key bound to $1, default sort = percentile_desc on signals[0]
    expect(params[0]).toBe("property.median_price");
    expect(text).toContain("ORDER BY sp0.percentile DESC NULLS LAST");
  });

  it("emits a typed predicate per filter operator", () => {
    const q: CompoundAreasQuery = {
      signals: [
        { key: "a", filter: { eq: 1 } },
        { key: "b", filter: { lt: 2 } },
        { key: "c", filter: { lte: 3 } },
        { key: "d", filter: { gt: 4 } },
        { key: "e", filter: { gte: 5 } },
        { key: "f", filter: { between: [6, 7] } },
        { key: "g", filter: { percentile_lt: 10 } },
        { key: "h", filter: { percentile_between: [20, 30] } },
      ],
      limit: 10,
    };
    const { text } = buildCompoundAreasQuery(q);
    expect(text).toMatch(/sv0\.raw_value = \$\d+/);
    expect(text).toMatch(/sv1\.raw_value < \$\d+/);
    expect(text).toMatch(/sv2\.raw_value <= \$\d+/);
    expect(text).toMatch(/sv3\.raw_value > \$\d+/);
    expect(text).toMatch(/sv4\.raw_value >= \$\d+/);
    expect(text).toMatch(/sv5\.raw_value BETWEEN \$\d+ AND \$\d+/);
    expect(text).toMatch(/sp6\.percentile < \$\d+/);
    expect(text).toMatch(/sp7\.percentile BETWEEN \$\d+ AND \$\d+/);
  });

  it("scopes by country prefix on the anchor and applies LAD scope via geo_lookup", () => {
    const q: CompoundAreasQuery = {
      signals: [{ key: "property.median_price", filter: { lte: 300000 } }],
      country: "England", lad: "E08000003", limit: 25,
    };
    const { text, params } = buildCompoundAreasQuery(q);
    expect(text).toContain("sv0.geo_code LIKE $");
    expect(text).toContain("SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = $");
    expect(params).toContain("E%");
    expect(params).toContain("E08000003");
    expect(params[params.length - 1]).toBe(25); // limit is the LAST bound param
  });

  it("respects sort_by mode + direction on any listed signal", () => {
    const q: CompoundAreasQuery = {
      signals: [
        { key: "property.median_price", filter: { lte: 250000 } },
        { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
      ],
      sortBy: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
      limit: 50,
    };
    const { text } = buildCompoundAreasQuery(q);
    expect(text).toContain("ORDER BY sv1.raw_value DESC NULLS LAST");
  });

  it("supports a signal entry without a filter (response-only column)", () => {
    const q: CompoundAreasQuery = {
      signals: [
        { key: "property.median_price", filter: { lte: 250000 } },
        { key: "deprivation.imd_decile" }, // no filter — included but no WHERE
      ],
      limit: 10,
    };
    const { text } = buildCompoundAreasQuery(q);
    expect(text).toContain("INNER JOIN signal_values sv1");
    // No filter predicate referencing sv1.raw_value / sp1.percentile in the WHERE.
    expect(text).not.toMatch(/sv1\.raw_value [<>=]/);
    expect(text).not.toMatch(/sp1\.percentile [<>=]/);
  });
});

describe("queryAreasCompound", () => {
  it("maps rows into per-signal map + legacy sort-signal mirror fields", async () => {
    const run: Runner = async () => [
      { geo_type: "lsoa", geo_code: "E01000001",
        sv0_raw: "200000", sv0_norm: "0.4", sp0_pct: "40",
        sv1_raw: "12", sv1_norm: "0.8", sp1_pct: "85" },
    ];
    const out = await queryAreasCompound({
      signals: [
        { key: "property.median_price", filter: { lte: 250000 } },
        { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
      ],
      sortBy: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
      limit: 10,
    }, run);
    expect(out).toHaveLength(1);
    expect(out[0].geo_code).toBe("E01000001");
    // Per-signal map populated
    expect(out[0].signals?.["property.median_price"]).toEqual({ value: 200000, normalized_value: 0.4, percentile: 40 });
    expect(out[0].signals?.["property.price_change_pct_yoy"]).toEqual({ value: 12, normalized_value: 0.8, percentile: 85 });
    // Legacy top-level fields mirror the sort signal
    expect(out[0].value).toBe(12);
    expect(out[0].normalized_value).toBe(0.8);
    expect(out[0].percentile).toBe(85);
  });

  it("rejects an empty signals list", () => {
    expect(() => buildCompoundAreasQuery({ signals: [], limit: 10 })).toThrow();
  });

  /* ICP E2E 2026-06-30 finding #3: rank_areas/find_areas was returning
     duplicate geo_code rows (the SQL fans out across signal_values rows
     per (signal_key, geo_code) when multiple observation periods exist).
     queryAreasCompound now dedupes by geo_code, keeping the first
     occurrence (which honors the SQL's ORDER BY). */
  it("dedupes duplicate geo_codes returned by the SQL fan-out", async () => {
    const run: Runner = async () => [
      // Same geo_code twice — fan-out artifact
      { geo_type: "lsoa", geo_code: "E01033664",
        sv0_raw: "1", sv0_norm: "0", sp0_pct: "0",
        sv1_raw: "6", sv1_norm: "0.5", sp1_pct: "50" },
      { geo_type: "lsoa", geo_code: "E01033664",
        sv0_raw: "1", sv0_norm: "0", sp0_pct: "0",
        sv1_raw: "6", sv1_norm: "0.5", sp1_pct: "50" },
      // A distinct geo_code
      { geo_type: "lsoa", geo_code: "E01033673",
        sv0_raw: "1", sv0_norm: "0", sp0_pct: "0",
        sv1_raw: "6", sv1_norm: "0.5", sp1_pct: "50" },
    ];
    const out = await queryAreasCompound({
      signals: [
        { key: "crime.total_12m" },
        { key: "deprivation.imd_decile" },
      ],
      limit: 50,
    }, run);
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.geo_code)).toEqual(["E01033664", "E01033673"]);
  });
});

/* ICP E2E 2026-06-30 finding #5: country names case-insensitive on
   input. "ENGLAND", "england", "England" all accepted; canonical
   "England" returned to downstream readers. */
describe("parseAreasQuery — country case insensitivity (AR-387)", () => {
  it("accepts ENGLAND (uppercase)", () => {
    const r = parseAreasQuery({ signal: "crime.total_12m", country: "ENGLAND" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.country).toBe("England");
  });
  it("accepts england (lowercase)", () => {
    const r = parseAreasQuery({ signal: "crime.total_12m", country: "england" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.country).toBe("England");
  });
  it("accepts wAlEs (mixed)", () => {
    const r = parseAreasQuery({ signal: "crime.total_12m", country: "wAlEs" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.query.country).toBe("Wales");
  });
  it("rejects garbage", () => {
    const r = parseAreasQuery({ signal: "crime.total_12m", country: "Mars" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/case-insensitive/);
  });
});
