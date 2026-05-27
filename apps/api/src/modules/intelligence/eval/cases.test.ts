import { describe, it, expect } from "vitest";
import { QueryPlanSchema } from "@onegoodarea/contracts";
import { EVAL_CASES } from "./cases";

describe("EVAL_CASES corpus sanity (AR-191 / ADR 0026)", () => {
  it("every case has the required fields", () => {
    for (const c of EVAL_CASES) {
      expect(c.id).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.nl_question).toBeTruthy();
      expect(c.expected_plan).toBeDefined();
    }
  });
  it("every case has a UNIQUE id (no duplicates)", () => {
    const ids = EVAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every expected_plan validates against QueryPlanSchema (no malformed corpus entries)", () => {
    for (const c of EVAL_CASES) {
      const r = QueryPlanSchema.safeParse(c.expected_plan);
      expect(r.success, `case ${c.id} expected_plan failed Zod: ${r.success ? "" : JSON.stringify(r.error.issues)}`).toBe(true);
    }
  });
  it("covers every one of the 6 plan ops at least once", () => {
    const ops = new Set(EVAL_CASES.map((c) => c.expected_plan.op));
    for (const op of ["rank_areas", "get_area", "score_area", "find_peers", "find_insights", "find_forecast"]) {
      expect(ops.has(op as "rank_areas")).toBe(true);
    }
  });
  it("covers BOTH rank_areas variants (singular + compound)", () => {
    const ranks = EVAL_CASES.filter((c) => c.expected_plan.op === "rank_areas");
    const singular = ranks.filter((c) => "signal" in c.expected_plan.params).length;
    const compound = ranks.filter((c) => "signals" in c.expected_plan.params).length;
    expect(singular).toBeGreaterThan(0);
    expect(compound).toBeGreaterThan(0);
  });
  it("corpus is at least 10 cases (meaningful sample size)", () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(10);
  });
});
