/* modules/intelligence — the public entry for the query plane (AR-182, v1).

   ONE function: runQuery({question? | plan?}, aiProvider?). The two paths are:

   - PROGRAMMATIC ({plan}):  the LLM is NEVER touched. The validated plan goes
     straight to the deterministic executor. This is the API the moat exposes
     to other systems and to the MCP surface later.
   - NL ({question}):        the planner translates question -> Zod-validated
     plan, then the SAME executor runs it. Identical response shape.

   This separation is the audit-safety story: the plan + plan_source ride along
   in the response, so a consumer can see exactly what ran and replay it as a
   programmatic call. No narrative anywhere in v1. See ADR 0017. */

import type { QueryRequest, QueryResponse, PlannerError } from "@onegoodarea/contracts";
import { QueryRequestSchema } from "@onegoodarea/contracts";
import { getAiProvider, type AiProvider } from "../reports/ai";
import { plan as planFromNl } from "./planner";
import { executePlan } from "./executor";

export {
  buildPlannerPrompt,
  extractJson,
  parsePlanText,
  plan as planFromNl,
  SUPPORTED_SIGNALS,
} from "./planner";
export { executePlan } from "./executor";

/** Strict validation of the incoming request — exactly one of question | plan. */
export function parseQueryRequest(body: unknown): { ok: true; req: QueryRequest } | { ok: false; error: string } {
  const parsed = QueryRequestSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    return { ok: false, error: `Provide exactly one of {question} or {plan}. ${msg}` };
  }
  return { ok: true, req: parsed.data };
}

/** Either programmatic-mode (plan executed directly) OR NL-mode (plan first
    translated via the AiProvider, then executed). AiProvider is injected in
    tests; in prod it defaults to the configured Anthropic/Mock provider. */
export async function runQuery(
  req: QueryRequest,
  aiProvider: AiProvider | undefined = undefined,
): Promise<{ ok: true; response: QueryResponse } | { ok: false; error: PlannerError }> {
  if ("plan" in req && req.plan) {
    const response = await executePlan(req.plan, { planSource: "client" });
    return { ok: true, response };
  }
  // NL mode — strict typed failure on planner errors. AnthropicAiProvider's
  // constructor throws when ANTHROPIC_API_KEY is missing; that is a
  // configuration / runtime issue that belongs in the typed llm_error path
  // (-> 422) rather than as a 500. We catch the construction here.
  let provider: AiProvider;
  if (aiProvider) {
    provider = aiProvider;
  } else {
    try { provider = getAiProvider(); }
    catch (err) {
      return { ok: false, error: { code: "llm_error", message: err instanceof Error ? err.message : String(err) } };
    }
  }
  const planned = await planFromNl(req.question!, provider);
  if (!planned.ok) return { ok: false, error: planned.error };
  const response = await executePlan(planned.plan, { planSource: "nl" });
  return { ok: true, response };
}
