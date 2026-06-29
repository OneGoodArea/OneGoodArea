import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { getRequestContext } from "../../shared/request-context";
import { logger } from "../tracking/structured-logger";

/* AR-376 / plan 029: capture (NL question → emitted plan) pairs from
   /v1/query for training a smaller proprietary planner LLM. Caller path:

     intelligence route
       → resolves auth (gets trainingOptout from api_keys row)
       → calls runQuery(...)
       → insertPlannerLog({...}, trainingOptout)

   This module owns the insert. Never throws into the caller — same
   contract as trackEvent. Failures log to the structured logger.

   Source + client_app are read from the AsyncLocalStorage request
   context populated by app.ts's onRequest hook (AR-375). Outside a
   request (e.g. CLI scripts), source/client_app fall back to null.

   Per-key opt-out: when `trainingOptout` is true we skip silently. This
   is the load-bearing privacy check — never bypass it. */

export interface PlannerLogInsert {
  /** User id from the validated API key. */
  userId: string;
  /** Org id from the validated API key. Nullable for legacy keys. */
  orgId: string | null;
  /** Raw NL question text (only the NL path is logged — programmatic
      {plan} calls aren't training data). */
  question: string;
  /** The typed plan emitted by the planner (executor's input shape). */
  plan: unknown;
  /** Whether the plan was authored by the model ("llm") or supplied by
      the client ("client"). Only "llm" rows are useful training data;
      "client" rows shouldn't reach this insert in the first place. */
  planSource: string | null;
  /** Whether the call ultimately returned 2xx. Failure rows still carry
      training value — they teach the planner what didn't work. */
  responseOk: boolean;
  /** Error code when responseOk is false (e.g. "ambiguous_location",
      "llm_error", "bundle_signal_not_allowed"). Null on success. */
  errorCode: string | null;
  /** Wall-clock latency in milliseconds from runQuery start to finish. */
  latencyMs: number;
}

export async function insertPlannerLog(
  fields: PlannerLogInsert,
  trainingOptout: boolean,
): Promise<void> {
  if (trainingOptout) return;
  try {
    const id = generateId("plog");
    const ctx = getRequestContext();
    await sql`
      INSERT INTO query_planner_logs
        (id, org_id, user_id, question, plan, plan_source,
         response_ok, error_code, latency_ms, source, client_app)
      VALUES (
        ${id},
        ${fields.orgId},
        ${fields.userId},
        ${fields.question},
        ${JSON.stringify(fields.plan)},
        ${fields.planSource},
        ${fields.responseOk},
        ${fields.errorCode},
        ${fields.latencyMs},
        ${ctx?.source ?? null},
        ${ctx?.client_app ?? null}
      )
    `;
  } catch (error) {
    logger.error("Planner log insert failed:", error);
  }
}
