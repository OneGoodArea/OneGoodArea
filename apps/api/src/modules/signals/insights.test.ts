import { describe, it, expect, vi } from "vitest";
import {
  parseInsightsInput, buildInsightsSql, findInsights,
  INSIGHTS_DEFAULT_K, INSIGHTS_MAX_K, type Runner, type InsightsInput,
} from "./insights";

describe("parseInsightsInput (pure)", () => {
  it("rejects an empty signal_key", () => {
    expect(parseInsightsInput({ signalKey: "" }).ok).toBe(false);
    expect(parseInsightsInput({}).ok).toBe(false);
  });
  it("REQUIRES a peer-relative-z suffix (no on-the-fly ad-hoc anomaly on raw signals)", () => {
    const bad = parseInsightsInput({ signalKey: "crime.total_12m" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toMatch(/_peer_relative_z/);
  });
  it("accepts a peer-relative-z signal", () => {
    const r = parseInsightsInput({ signalKey: "crime.total_12m_peer_relative_z" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.signalKey).toBe("crime.total_12m_peer_relative_z");
      expect(r.input.k).toBe(INSIGHTS_DEFAULT_K);
    }
  });
  it("caps k at INSIGHTS_MAX_K", () => {
    const r = parseInsightsInput({ signalKey: "x_peer_relative_z", k: 9999 });
    expect(r.ok && r.input.k).toBe(INSIGHTS_MAX_K);
  });
  it("rejects negative min_abs_z", () => {
    expect(parseInsightsInput({ signalKey: "x_peer_relative_z", minAbsZ: -1 }).ok).toBe(false);
  });
  it("validates country", () => {
    expect(parseInsightsInput({ signalKey: "x_peer_relative_z", country: "Ireland" }).ok).toBe(false);
  });
});

describe("buildInsightsSql (pure)", () => {
  const base: InsightsInput = { signalKey: "crime.total_12m_peer_relative_z", k: 50 };

  it("selects geo_code + peer_relative_z + abs_z, filtered to the signal_key", () => {
    const { text } = buildInsightsSql(base);
    expect(text).toMatch(/SELECT geo_code, raw_value::float8 AS peer_relative_z, ABS\(raw_value\)::float8 AS abs_z/);
    expect(text).toMatch(/signal_key = \$1/);
  });
  it("orders by ABS(raw_value) DESC + LIMIT k", () => {
    const { text } = buildInsightsSql(base);
    expect(text).toMatch(/ORDER BY ABS\(raw_value\) DESC, geo_code ASC/);
    expect(text).toMatch(/LIMIT \$\d+/);
  });
  it("binds the signal_key as the first parameter", () => {
    const { params } = buildInsightsSql(base);
    expect(params[0]).toBe("crime.total_12m_peer_relative_z");
    expect(params[params.length - 1]).toBe(50); // k LAST
  });
  it("adds a country prefix filter", () => {
    const { text, params } = buildInsightsSql({ ...base, country: "England" });
    expect(text).toMatch(/geo_code LIKE \$\d+/);
    expect(params).toContain("E%");
  });
  it("adds a LAD scope via geo_lookup", () => {
    const { text, params } = buildInsightsSql({ ...base, lad: "E08000003" });
    expect(text).toMatch(/geo_code IN \(SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = \$\d+\)/);
    expect(params).toContain("E08000003");
  });
  it("adds ABS(raw_value) >= min_abs_z when threshold > 0", () => {
    const { text, params } = buildInsightsSql({ ...base, minAbsZ: 2 });
    expect(text).toMatch(/ABS\(raw_value\) >= \$\d+/);
    expect(params).toContain(2);
  });
  it("omits the threshold predicate when minAbsZ is 0 / undefined", () => {
    const { text: t0 } = buildInsightsSql({ ...base, minAbsZ: 0 });
    expect(t0).not.toMatch(/ABS\(raw_value\) >=/);
  });
});

describe("findInsights (I/O)", () => {
  it("maps rows to InsightRow[]", async () => {
    const run: Runner = async () => [
      { geo_code: "E01000001", peer_relative_z: "3.21", abs_z: "3.21" },
      { geo_code: "E01000002", peer_relative_z: "-2.85", abs_z: "2.85" },
    ];
    const out = await findInsights({ signalKey: "crime.total_12m_peer_relative_z", k: 10 }, run);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ geo_code: "E01000001", peer_relative_z: 3.21, abs_z: 3.21 });
    expect(out[1]).toEqual({ geo_code: "E01000002", peer_relative_z: -2.85, abs_z: 2.85 });
  });
  it("passes the built SQL + params to the runner", async () => {
    const run = vi.fn<Runner>(async () => []);
    await findInsights({ signalKey: "x_peer_relative_z", country: "England", k: 5 }, run);
    const [text, params] = run.mock.calls[0];
    expect(text).toContain("ORDER BY ABS(raw_value) DESC");
    expect(params[0]).toBe("x_peer_relative_z");
    expect(params).toContain("E%");
    expect(params[params.length - 1]).toBe(5);
  });
});
