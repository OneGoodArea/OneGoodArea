import { describe, it, expect, vi } from "vitest";
import {
  parsePeersInput, buildTargetSignalsSql, buildPeersSql, buildPeerEnrichmentSql, findPeers,
  PEERS_DEFAULT_K, PEERS_MAX_K, PEERS_DEFAULT_MIN_SIGNALS,
  type Runner, type PeersInput,
} from "@/modules/signals/peers";

/* ── parsePeersInput ─────────────────────────────────────────────────────── */

describe("parsePeersInput", () => {
  it("rejects an empty targetGeoCode", () => {
    expect(parsePeersInput({ targetGeoCode: "" }).ok).toBe(false);
    expect(parsePeersInput({ targetGeoCode: "   " }).ok).toBe(false);
  });
  it("defaults k=20 + min_signals=3 when omitted", () => {
    const r = parsePeersInput({ targetGeoCode: "E01000001" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.input.k).toBe(PEERS_DEFAULT_K);
      expect(r.input.minSignals).toBe(PEERS_DEFAULT_MIN_SIGNALS);
    }
  });
  it("caps k at PEERS_MAX_K", () => {
    const r = parsePeersInput({ targetGeoCode: "E01000001", k: 9999 });
    expect(r.ok && r.input.k).toBe(PEERS_MAX_K);
  });
  it("rejects a non-integer or non-positive k", () => {
    expect(parsePeersInput({ targetGeoCode: "x", k: 0 }).ok).toBe(false);
    expect(parsePeersInput({ targetGeoCode: "x", k: 3.5 }).ok).toBe(false);
  });
  it("validates country to England/Wales/Scotland", () => {
    expect(parsePeersInput({ targetGeoCode: "x", country: "Ireland" }).ok).toBe(false);
    const ok = parsePeersInput({ targetGeoCode: "x", country: "Scotland" });
    expect(ok.ok && ok.input.country).toBe("Scotland");
  });
  it("filters empty signal keys + rejects an empty signals array", () => {
    const r = parsePeersInput({ targetGeoCode: "x", signals: ["", "  "] });
    expect(r.ok).toBe(false);
  });
  it("trims and accepts a non-empty signals array", () => {
    const r = parsePeersInput({ targetGeoCode: "x", signals: ["  property.median_price ", "crime.total_12m"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.input.signals).toEqual(["property.median_price", "crime.total_12m"]);
  });
});

/* ── buildTargetSignalsSql ───────────────────────────────────────────────── */

describe("buildTargetSignalsSql (pure)", () => {
  const sql = buildTargetSignalsSql();
  it("selects target's normalized signal_keys (filtered by optional array)", () => {
    expect(sql).toMatch(/SELECT signal_key, normalized_value/);
    expect(sql).toMatch(/FROM signal_values/);
    expect(sql).toMatch(/geo_type = 'lsoa'/);
    expect(sql).toMatch(/geo_code = \$1/);
    expect(sql).toMatch(/normalized_value IS NOT NULL/);
    expect(sql).toMatch(/\(\$2::text\[\] IS NULL OR signal_key = ANY\(\$2\)\)/);
  });
});

/* ── buildPeersSql ───────────────────────────────────────────────────────── */

describe("buildPeersSql (pure)", () => {
  const base: PeersInput = { targetGeoCode: "E01000001", k: 20, minSignals: 3 };

  it("emits a CTE for the target vector + a candidates CTE + outer SELECT", () => {
    const { text } = buildPeersSql(base);
    expect(text).toMatch(/WITH target AS/);
    expect(text).toMatch(/candidates AS/);
    expect(text).toMatch(/FROM candidates/);
  });
  it("computes dim-mean-squared + n_dims_used per candidate", () => {
    const { text } = buildPeersSql(base);
    expect(text).toMatch(/AVG\(POWER\(sv\.normalized_value - t\.normalized_value, 2\)\)::float8 AS msd/);
    expect(text).toMatch(/COUNT\(\*\)::int AS n_dims_used/);
  });
  it("excludes the target itself from candidates", () => {
    const { text } = buildPeersSql(base);
    expect(text).toMatch(/sv\.geo_code <> \$1/);
  });
  it("orders by distance ASC + applies the k limit", () => {
    const { text } = buildPeersSql(base);
    expect(text).toMatch(/ORDER BY distance ASC, geo_code ASC/);
    expect(text).toMatch(/LIMIT \$\d+/);
  });
  it("HAVING gates candidates on minSignals overlap", () => {
    const { text } = buildPeersSql({ ...base, minSignals: 5 });
    expect(text).toMatch(/HAVING COUNT\(\*\) >= \$\d+/);
  });
  it("binds target_geo_code, signals_filter, min_signals, k in order; signals defaults to NULL", () => {
    const { params } = buildPeersSql(base);
    expect(params[0]).toBe("E01000001");
    expect(params[1]).toBeNull();
    expect(params[2]).toBe(3);
    expect(params[3]).toBe(20);
  });
  it("passes the signals array through when caller provided one", () => {
    const { params } = buildPeersSql({ ...base, signals: ["property.median_price", "crime.total_12m"] });
    expect(params[1]).toEqual(["property.median_price", "crime.total_12m"]);
  });
  it("adds a country prefix filter on the anchor", () => {
    const { text, params } = buildPeersSql({ ...base, country: "Scotland" });
    expect(text).toMatch(/sv\.geo_code LIKE \$\d+/);
    expect(params).toContain("S%");
  });
  it("adds a LAD scope via geo_lookup", () => {
    const { text, params } = buildPeersSql({ ...base, lad: "E08000003" });
    expect(text).toMatch(/sv\.geo_code IN \(SELECT DISTINCT lsoa_code FROM geo_lookup WHERE lad_code = \$\d+\)/);
    expect(params).toContain("E08000003");
  });
});

/* ── buildPeerEnrichmentSql (AR-398) ─────────────────────────────────────── */

describe("buildPeerEnrichmentSql (pure)", () => {
  const sql = buildPeerEnrichmentSql();
  it("selects lad_name + region + a representative postcode per LSOA", () => {
    expect(sql).toMatch(/SELECT DISTINCT ON \(lsoa_code\)/);
    expect(sql).toMatch(/lsoa_code, lad_name, region, postcode/);
  });
  it("matches by ANY against the peer geo_codes array", () => {
    expect(sql).toMatch(/lsoa_code = ANY\(\$1::text\[\]\)/);
  });
  it("orders so DISTINCT ON keeps the alphabetically-first postcode per LSOA", () => {
    expect(sql).toMatch(/ORDER BY lsoa_code, postcode ASC/);
  });
});

/* ── findPeers (I/O wired to an injected runner) ─────────────────────────── */

describe("findPeers", () => {
  /* AR-398: findPeers now makes THREE queries — target signals, candidates,
     and a final enrichment lookup against geo_lookup. The runner mock
     branches on the SQL prefix to keep tests readable. */
  function runner(opts: {
    targetSignals?: Record<string, unknown>[];
    candidates?: Record<string, unknown>[];
    enrichment?: Record<string, unknown>[];
  }): Runner {
    return vi.fn<Runner>(async (text) => {
      if (text.startsWith("SELECT signal_key")) return opts.targetSignals ?? [];
      if (text.startsWith("SELECT DISTINCT ON (lsoa_code)")) return opts.enrichment ?? [];
      return opts.candidates ?? [];
    });
  }

  it("returns peers with admin_district + region + sample_postcode when geo_lookup has them", async () => {
    const run = runner({
      targetSignals: [
        { signal_key: "property.median_price", normalized_value: 0.5 },
        { signal_key: "crime.total_12m", normalized_value: 0.3 },
      ],
      candidates: [
        { geo_code: "E01000002", distance: "0.12", n_dims_used: 2 },
        { geo_code: "E01000003", distance: "0.20", n_dims_used: 2 },
      ],
      enrichment: [
        { lsoa_code: "E01000002", lad_name: "Manchester", region: "North West", postcode: "M1 1AE" },
        { lsoa_code: "E01000003", lad_name: "Salford", region: "North West", postcode: "M3 6FZ" },
      ],
    });
    const out = await findPeers({ targetGeoCode: "E01000001", k: 5, minSignals: 2 }, run);
    expect(out.peers).toHaveLength(2);
    expect(out.peers[0]).toEqual({
      geo_code: "E01000002",
      distance: 0.12,
      n_dims_used: 2,
      admin_district: "Manchester",
      region: "North West",
      sample_postcode: "M1 1AE",
    });
    expect(out.peers[1].admin_district).toBe("Salford");
  });

  it("returns nulls for peers not in geo_lookup (shape stays stable)", async () => {
    const run = runner({
      targetSignals: [{ signal_key: "crime.total_12m", normalized_value: 0.3 }],
      candidates: [
        { geo_code: "E01000002", distance: "0.12", n_dims_used: 1 },
        { geo_code: "E01999999", distance: "0.20", n_dims_used: 1 }, // not in geo_lookup
      ],
      enrichment: [
        { lsoa_code: "E01000002", lad_name: "Manchester", region: "North West", postcode: "M1 1AE" },
      ],
    });
    const out = await findPeers({ targetGeoCode: "E01000001", k: 5, minSignals: 1 }, run);
    expect(out.peers[0].admin_district).toBe("Manchester");
    expect(out.peers[1]).toEqual({
      geo_code: "E01999999",
      distance: 0.20,
      n_dims_used: 1,
      admin_district: null,
      region: null,
      sample_postcode: null,
    });
  });

  it("skips the enrichment query when there are zero peer candidates", async () => {
    const run = runner({
      targetSignals: [{ signal_key: "crime.total_12m", normalized_value: 0.3 }],
      candidates: [],
      enrichment: [], // shouldn't be reached
    });
    const out = await findPeers({ targetGeoCode: "E01000001", k: 5, minSignals: 1 }, run);
    expect(out.peers).toEqual([]);
    // 2 calls: target signals + candidates. NOT 3.
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("short-circuits to empty peers when the target has no normalized signals", async () => {
    const run = vi.fn<Runner>(async () => []);
    const out = await findPeers({ targetGeoCode: "X", k: 5, minSignals: 3 }, run);
    expect(out.signalsUsed).toEqual([]);
    expect(out.peers).toEqual([]);
    expect(run).toHaveBeenCalledOnce(); // never reached candidates or enrichment
  });
});
