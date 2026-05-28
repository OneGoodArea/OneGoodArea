import { describe, it, expect } from "vitest";
import { summarize, renderReport, type CaseResult } from "@/modules/intelligence/eval/report";
import type { QueryPlan } from "@onegoodarea/contracts";

const planA: QueryPlan = { op: "get_area", params: { area: "X" } };
const planB: QueryPlan = { op: "rank_areas", params: { signal: "deprivation.imd_decile" } };

const passResult = (id: string, plan: QueryPlan): CaseResult => ({
  id, description: `desc-${id}`, nl_question: `q-${id}`,
  expected_plan: plan, expected_op: plan.op,
  planner_ok: true, comparison: { match: true, diff: [] },
});
const failResult = (id: string, plan: QueryPlan): CaseResult => ({
  id, description: `desc-${id}`, nl_question: `q-${id}`,
  expected_plan: plan, expected_op: plan.op,
  planner_ok: true, comparison: { match: false, diff: [{ path: "params.area", expected: "X", actual: "Y" }] },
});
const plannerErr = (id: string, plan: QueryPlan): CaseResult => ({
  id, description: `desc-${id}`, nl_question: `q-${id}`,
  expected_plan: plan, expected_op: plan.op,
  planner_ok: false, planner_error: "invalid_plan", raw: "{nope}",
});

describe("summarize", () => {
  it("computes overall pass/fail/accuracy", () => {
    const s = summarize([passResult("a", planA), failResult("b", planA), plannerErr("c", planB)]);
    expect(s.total).toBe(3);
    expect(s.passed).toBe(1);
    expect(s.failed).toBe(2);
    expect(s.accuracyPct).toBeCloseTo(33.3, 0);
  });
  it("breaks down by op", () => {
    const s = summarize([passResult("a", planA), passResult("b", planA), failResult("c", planB)]);
    expect(s.byOp["get_area"]).toEqual({ total: 2, passed: 2, accuracyPct: 100 });
    expect(s.byOp["rank_areas"]).toEqual({ total: 1, passed: 0, accuracyPct: 0 });
  });
  it("returns zero accuracy on empty input", () => {
    const s = summarize([]);
    expect(s).toEqual({ total: 0, passed: 0, failed: 0, accuracyPct: 0, byOp: {} });
  });
});

describe("renderReport", () => {
  it("opens with the headline accuracy number", () => {
    const results = [passResult("a", planA), failResult("b", planB)];
    const md = renderReport(results, summarize(results));
    expect(md).toMatch(/Overall accuracy: 50%/);
    expect(md).toMatch(/1\/2 cases passed/);
  });
  it("includes a by-op breakdown table", () => {
    const results = [passResult("a", planA), failResult("b", planB)];
    const md = renderReport(results, summarize(results));
    expect(md).toMatch(/## By plan op/);
    expect(md).toMatch(/\| op \| passed \| total \| accuracy \|/);
  });
  it("renders per-case PASS / FAIL with the first diff for failures", () => {
    const results = [passResult("a", planA), failResult("b", planB)];
    const md = renderReport(results, summarize(results));
    expect(md).toMatch(/✅ PASS — a/);
    expect(md).toMatch(/❌ FAIL — b/);
    expect(md).toMatch(/First diff at `params\.area`/);
  });
  it("renders planner-failure cases with the error code + raw output", () => {
    const results = [plannerErr("c", planB)];
    const md = renderReport(results, summarize(results));
    expect(md).toMatch(/Planner failure.*invalid_plan/);
    expect(md).toMatch(/Raw output/);
  });
  it("includes a runId when supplied", () => {
    const md = renderReport([], summarize([]), { runId: "2026-05-27" });
    expect(md).toMatch(/Intelligence eval report — 2026-05-27/);
  });
});
