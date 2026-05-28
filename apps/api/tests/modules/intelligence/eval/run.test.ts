import { describe, it, expect } from "vitest";
import { runEval } from "@/modules/intelligence/eval/run";
import type { AiProvider } from "@/modules/reports/ai";
import type { EvalCase } from "@/modules/intelligence/eval/cases";

const stubAlways = (raw: string): AiProvider => ({ generateNarrative: async () => raw });

describe("runEval (with injected AiProvider)", () => {
  it("records pass / fail per case + summarizes", async () => {
    const cases: EvalCase[] = [
      {
        id: "a", description: "get_area pass case", nl_question: "tell me about M1 1AE",
        expected_plan: { op: "get_area", params: { area: "M1 1AE" } },
      },
      {
        id: "b", description: "get_area mismatch (wrong area)", nl_question: "tell me about M1 1AE",
        expected_plan: { op: "get_area", params: { area: "M1 1AE" } },
      },
    ];
    // Provider returns different JSON depending on call count.
    let n = 0;
    const provider: AiProvider = {
      generateNarrative: async () => {
        n += 1;
        if (n === 1) return JSON.stringify({ op: "get_area", params: { area: "M1 1AE" } });
        return JSON.stringify({ op: "get_area", params: { area: "WRONG" } });
      },
    };
    const { results, summary } = await runEval(cases, provider);
    expect(results).toHaveLength(2);
    expect(results[0].planner_ok).toBe(true);
    expect(results[0].comparison?.match).toBe(true);
    expect(results[1].planner_ok).toBe(true);
    expect(results[1].comparison?.match).toBe(false);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.accuracyPct).toBe(50);
  });
  it("records a planner-failure when the LLM returns non-JSON", async () => {
    const cases: EvalCase[] = [{
      id: "broken", description: "planner returns prose", nl_question: "x",
      expected_plan: { op: "get_area", params: { area: "X" } },
    }];
    const { results, summary } = await runEval(cases, stubAlways("I think Manchester is nice."));
    expect(results[0].planner_ok).toBe(false);
    expect(results[0].planner_error).toBe("no_json");
    expect(summary.passed).toBe(0);
  });
  it("records a planner-failure when the LLM returns an invalid plan shape", async () => {
    const cases: EvalCase[] = [{
      id: "invalid", description: "planner returns unknown op", nl_question: "x",
      expected_plan: { op: "get_area", params: { area: "X" } },
    }];
    const { results } = await runEval(cases, stubAlways('{"op":"do_a_thing","params":{}}'));
    expect(results[0].planner_ok).toBe(false);
    expect(results[0].planner_error).toBe("invalid_plan");
  });
});
