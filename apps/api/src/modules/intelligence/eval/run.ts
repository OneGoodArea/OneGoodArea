/* Eval: orchestrator + CLI (AR-191, ADR 0026).

   For each case in the corpus:
     1. Call the planner with the NL question (injectable AiProvider).
     2. Parse + validate the emitted plan.
     3. Compare against the expected plan via comparePlans().
     4. Record a CaseResult with pass/fail + diff for the report.

   The CLI prints a markdown report to stdout. Gated by OGA_EVAL_PLAN=true
   so CI doesn't burn LLM credits on every push; you can also run it on
   demand against the live provider locally:

     OGA_EVAL_PLAN=true ANTHROPIC_API_KEY=... \
       npm run eval:intelligence -w @onegoodarea/api

   See ADR 0026. */

import { getConfig } from "../../../infrastructure/config";
import { plan as planFromNl } from "../planner";
import { getAiProvider, type AiProvider } from "../../engine/ai";
import { EVAL_CASES, type EvalCase } from "./cases";
import { comparePlans } from "./compare";
import { type CaseResult, summarize, renderReport, type ReportSummary } from "./report";

export interface RunResult {
  results: CaseResult[];
  summary: ReportSummary;
}

/** Orchestrate the eval. AiProvider is injectable; tests pass a stub
    that returns canned JSON, prod passes the configured Anthropic
    provider via getAiProvider(). */
export async function runEval(
  cases: EvalCase[] = EVAL_CASES,
  provider?: AiProvider,
): Promise<RunResult> {
  const ai = provider ?? getAiProvider();
  const results: CaseResult[] = [];
  for (const c of cases) {
    const planned = await planFromNl(c.nl_question, ai);
    if (!planned.ok) {
      results.push({
        id: c.id, description: c.description, nl_question: c.nl_question,
        expected_plan: c.expected_plan, expected_op: c.expected_plan.op,
        planner_ok: false, planner_error: planned.error.code, raw: planned.error.raw,
      });
      continue;
    }
    const comparison = comparePlans(c.expected_plan, planned.plan);
    results.push({
      id: c.id, description: c.description, nl_question: c.nl_question,
      expected_plan: c.expected_plan, expected_op: c.expected_plan.op,
      planner_ok: true, comparison,
    });
  }
  return { results, summary: summarize(results) };
}

/* CLI: npm run eval:intelligence -w @onegoodarea/api
   Skipped unless OGA_EVAL_PLAN=true to avoid accidental LLM spend in CI. */
const invokedDirectly = Boolean(process.argv[1]?.endsWith("run.ts"));
if (invokedDirectly) {
  const config = getConfig();
  if (!config.evalPlanEnabled) {
    console.log("[eval] SKIPPED — set OGA_EVAL_PLAN=true to run against the live AiProvider.");
    process.exit(0);
  }
  runEval()
    .then(({ results, summary }) => {
      const runId = new Date().toISOString();
      console.log(renderReport(results, summary, { runId }));
      // Exit 1 if anything failed -- lets CI / cron treat regressions as gating.
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => { console.error("[eval] failed:", err); process.exit(1); });
}
