/* Levers (AR-195): unit tests for the bundles module's PURE helpers.
   The CRUD I/O paths are covered by the standard "lands on prod, smoke
   tested" path documented in ADR 0029. The interesting correctness is in
   the four pure functions: validation, dedupe, filtering, plan
   extraction. */

import { describe, it, expect } from "vitest";
import {
  findUnknownSignalKeys,
  dedupeSignalKeys,
  filterSignalsByBundle,
  extractSignalKeysFromPlan,
  planSignalsOutsideBundle,
} from "@/modules/orgs/bundles";
import type { QueryPlan } from "@onegoodarea/contracts";

describe("bundles/findUnknownSignalKeys", () => {
  it("returns empty when every key is in the active taxonomy", () => {
    expect(findUnknownSignalKeys(["deprivation.imd_decile", "property.median_price"])).toEqual([]);
  });

  it("returns just the unknown keys, preserving input order", () => {
    expect(
      findUnknownSignalKeys(["deprivation.imd_decile", "fake.thing", "property.median_price", "another.fake"]),
    ).toEqual(["fake.thing", "another.fake"]);
  });

  it("treats every key as unknown when none match", () => {
    expect(findUnknownSignalKeys(["x", "y"])).toEqual(["x", "y"]);
  });

  it("is case-sensitive (the canonical taxonomy is lower-snake)", () => {
    expect(findUnknownSignalKeys(["Property.Median_Price"])).toEqual(["Property.Median_Price"]);
  });
});

describe("bundles/dedupeSignalKeys", () => {
  it("preserves insertion order on first occurrence", () => {
    expect(dedupeSignalKeys(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("is a no-op on already-unique input", () => {
    expect(dedupeSignalKeys(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("handles empty input", () => {
    expect(dedupeSignalKeys([])).toEqual([]);
  });
});

describe("bundles/filterSignalsByBundle", () => {
  type S = { key: string; value: number | null };
  const sample: S[] = [
    { key: "a", value: 1 },
    { key: "b", value: null },
    { key: "c", value: 3 },
  ];

  it("returns the input unchanged when allowed is undefined (no bundle)", () => {
    expect(filterSignalsByBundle(sample, undefined)).toEqual(sample);
  });

  it("filters to only the allowed keys", () => {
    expect(filterSignalsByBundle(sample, ["a", "c"])).toEqual([
      { key: "a", value: 1 },
      { key: "c", value: 3 },
    ]);
  });

  it("returns an empty array when the allowed set has zero overlap", () => {
    expect(filterSignalsByBundle(sample, ["x", "y"])).toEqual([]);
  });

  it("returns an empty array when allowed is empty (impossible via CRUD; defensive)", () => {
    expect(filterSignalsByBundle(sample, [])).toEqual([]);
  });
});

describe("bundles/extractSignalKeysFromPlan", () => {
  it("rank_areas singular shape — returns [signal]", () => {
    const plan: QueryPlan = {
      op: "rank_areas",
      params: { signal: "deprivation.imd_decile" },
    };
    expect(extractSignalKeysFromPlan(plan)).toEqual(["deprivation.imd_decile"]);
  });

  it("rank_areas compound shape — returns every signals[].key in order", () => {
    const plan: QueryPlan = {
      op: "rank_areas",
      params: {
        signals: [
          { key: "deprivation.imd_decile", filter: { lt: 5 } },
          { key: "property.median_price" },
          { key: "crime.total_12m", filter: { percentile_gt: 80 } },
        ],
      },
    };
    expect(extractSignalKeysFromPlan(plan)).toEqual([
      "deprivation.imd_decile",
      "property.median_price",
      "crime.total_12m",
    ]);
  });

  it("find_peers — returns provided signals[] (else empty)", () => {
    const withSignals: QueryPlan = {
      op: "find_peers",
      params: { target: { geo_code: "E01000001" }, signals: ["property.median_price", "crime.total_12m"] },
    };
    expect(extractSignalKeysFromPlan(withSignals)).toEqual(["property.median_price", "crime.total_12m"]);
    const withoutSignals: QueryPlan = {
      op: "find_peers",
      params: { target: { geo_code: "E01000001" } },
    };
    expect(extractSignalKeysFromPlan(withoutSignals)).toEqual([]);
  });

  it("find_insights — returns [signal_key]", () => {
    const plan: QueryPlan = {
      op: "find_insights",
      params: { signal_key: "crime.total_12m_peer_relative_z" },
    };
    expect(extractSignalKeysFromPlan(plan)).toEqual(["crime.total_12m_peer_relative_z"]);
  });

  it("find_forecast — returns [signal_key]", () => {
    const plan: QueryPlan = {
      op: "find_forecast",
      params: { target: { postcode: "M1 1AE" }, signal_key: "property.median_price" },
    };
    expect(extractSignalKeysFromPlan(plan)).toEqual(["property.median_price"]);
  });

  it("get_area + score_area — return empty (no signal-key references in the plan params)", () => {
    expect(extractSignalKeysFromPlan({ op: "get_area", params: { area: "M1 1AE" } })).toEqual([]);
    expect(extractSignalKeysFromPlan({ op: "score_area", params: { area: "M1 1AE" } })).toEqual([]);
  });
});

describe("bundles/planSignalsOutsideBundle", () => {
  it("returns empty when every referenced signal is allowed", () => {
    const plan: QueryPlan = {
      op: "rank_areas",
      params: {
        signals: [
          { key: "deprivation.imd_decile" },
          { key: "property.median_price", filter: { lte: 250000 } },
        ],
      },
    };
    expect(planSignalsOutsideBundle(plan, ["deprivation.imd_decile", "property.median_price", "crime.total_12m"])).toEqual([]);
  });

  it("returns the disallowed keys (in plan order) when some are outside the bundle", () => {
    const plan: QueryPlan = {
      op: "rank_areas",
      params: {
        signals: [
          { key: "deprivation.imd_decile" },
          { key: "crime.total_12m", filter: { percentile_gt: 80 } },
          { key: "property.median_price" },
        ],
      },
    };
    // Bundle allows deprivation + property only — crime is outside.
    expect(planSignalsOutsideBundle(plan, ["deprivation.imd_decile", "property.median_price"])).toEqual([
      "crime.total_12m",
    ]);
  });

  it("returns every referenced key when the bundle is empty", () => {
    const plan: QueryPlan = {
      op: "rank_areas",
      params: { signal: "deprivation.imd_decile" },
    };
    expect(planSignalsOutsideBundle(plan, [])).toEqual(["deprivation.imd_decile"]);
  });

  it("get_area never trips the gate (no signal-key references)", () => {
    expect(planSignalsOutsideBundle({ op: "get_area", params: { area: "M1 1AE" } }, [])).toEqual([]);
  });
});
