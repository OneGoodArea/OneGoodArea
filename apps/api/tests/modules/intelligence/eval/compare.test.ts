import { describe, it, expect } from "vitest";
import { comparePlans, deepDiff, safeParsePlan } from "@/modules/intelligence/eval/compare";
import type { QueryPlan } from "@onegoodarea/contracts";

describe("safeParsePlan", () => {
  it("normalizes a valid plan through Zod (defaults filled where applicable)", () => {
    const p = safeParsePlan({ op: "get_area", params: { area: "M1 1AE" } });
    expect(p).not.toBeNull();
    expect(p?.op).toBe("get_area");
  });
  it("returns null on invalid plans", () => {
    expect(safeParsePlan({ op: "bogus", params: {} })).toBeNull();
    expect(safeParsePlan({ op: "get_area", params: { area: "x", extra: 1 } })).toBeNull();
  });
});

describe("deepDiff", () => {
  it("returns [] for identical scalars", () => {
    expect(deepDiff(1, 1)).toEqual([]);
    expect(deepDiff("x", "x")).toEqual([]);
    expect(deepDiff(null, null)).toEqual([]);
  });
  it("returns [] for deeply identical objects", () => {
    expect(deepDiff({ a: { b: [1, 2, 3] } }, { a: { b: [1, 2, 3] } })).toEqual([]);
  });
  it("reports the first mismatching nested field with a dotted path", () => {
    const d = deepDiff({ a: { b: 1, c: 2 } }, { a: { b: 1, c: 3 } });
    expect(d).toHaveLength(1);
    expect(d[0]).toEqual({ path: "a.c", expected: 2, actual: 3 });
  });
  it("reports array length mismatches via .length", () => {
    const d = deepDiff([1, 2], [1, 2, 3]);
    expect(d[0].path).toBe(".length");
  });
  it("reports missing keys with the key name in the path", () => {
    const d = deepDiff({ a: 1, b: 2 }, { a: 1 });
    expect(d[0].path).toBe(".b");
    expect(d[0].expected).toBe(2);
    expect(d[0].actual).toBeUndefined();
  });
  it("SUBSET semantics — extra fields in actual are tolerated", () => {
    // The corpus only commits to what the user implied; the planner can
    // legitimately emit defaults (limit, sort, etc.) without failing.
    expect(deepDiff({ a: 1 }, { a: 1, b: 2 })).toEqual([]);
    expect(deepDiff({ a: 1 }, { a: 1, b: { c: 2 } })).toEqual([]);
  });
});

describe("comparePlans", () => {
  it("returns match=true on structurally identical plans", () => {
    const e: QueryPlan = { op: "get_area", params: { area: "M1 1AE" } };
    const a: QueryPlan = { op: "get_area", params: { area: "M1 1AE" } };
    expect(comparePlans(e, a).match).toBe(true);
  });
  it("returns match=false when op differs (first mismatch reported)", () => {
    const e: QueryPlan = { op: "get_area", params: { area: "X" } };
    const a: QueryPlan = { op: "score_area", params: { area: "X" } };
    const r = comparePlans(e, a);
    expect(r.match).toBe(false);
    expect(r.diff[0].path).toBe("op");
  });
  it("tolerates planner-emitted optional defaults when corpus omits them (subset semantics)", () => {
    // Corpus says "I care about op + area"; planner emits preset=research as
    // its default. That's fine — the SUBSET semantics encode minimum
    // required shape, not exact equality.
    const e: QueryPlan = { op: "score_area", params: { area: "X" } };
    const a: QueryPlan = { op: "score_area", params: { area: "X", preset: "research" } };
    expect(comparePlans(e, a).match).toBe(true);
  });
  it("still fails when an explicitly-asserted field disagrees", () => {
    // Corpus pins preset=investing; planner emits preset=moving -> mismatch.
    const e: QueryPlan = { op: "score_area", params: { area: "X", preset: "investing" } };
    const a: QueryPlan = { op: "score_area", params: { area: "X", preset: "moving" } };
    expect(comparePlans(e, a).match).toBe(false);
  });
  it("reports first diff for compound rank_areas params mismatch", () => {
    const e: QueryPlan = {
      op: "rank_areas",
      params: {
        signals: [{ key: "property.median_price", filter: { lte: 250000 } }],
        country: "England",
      },
    };
    const a: QueryPlan = {
      op: "rank_areas",
      params: {
        signals: [{ key: "property.median_price", filter: { lte: 300000 } }],
        country: "England",
      },
    };
    const r = comparePlans(e, a);
    expect(r.match).toBe(false);
    expect(r.diff[0].path).toMatch(/signals\[0\]\.filter\.lte/);
  });
  it("reports a plan-level failure when either side is invalid", () => {
    const e: QueryPlan = { op: "get_area", params: { area: "X" } };
    // The cast lets us simulate a corpus/planner output that's invalid.
    const r = comparePlans(e, { op: "bogus" } as unknown as QueryPlan);
    expect(r.match).toBe(false);
    expect(r.diff[0].path).toBe("(plan)");
  });
});
