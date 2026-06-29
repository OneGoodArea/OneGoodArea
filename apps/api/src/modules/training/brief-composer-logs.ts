import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { getRequestContext } from "../../shared/request-context";
import { logger } from "../tracking/structured-logger";

/* AR-377 / plan 029: capture (request → server-composed brief) pairs
   from /v1/score?explain=true for training a richer composer model.
   Sister of planner-logs.ts — same contract:

   - Insert is fire-and-forget. Never throws into the caller.
   - Per-key opt-out is checked BEFORE writing.
   - Source + client_app are read from the AsyncLocalStorage request
     context populated by app.ts's onRequest hook (AR-375).

   ONLY called when the explain branch fires. The bare /v1/score path
   has no brief to capture — no insert there. */

export interface BriefComposerLogInsert {
  userId: string;
  orgId: string | null;
  /** The area string as it arrived from the caller (postcode or
      place name). Used for filtering training data by area type. */
  area: string;
  /** Preset name when one was used (moving/business/etc.). Null when
      the caller passed custom weights without a preset base. */
  preset: string | null;
  /** Custom weights when set; null when the request used a vanilla preset. */
  weights: Record<string, number> | null;
  /** Full validated request body (area, preset, weights, bundle,
      preset_id — whatever shape the caller sent). Stored as JSONB so
      future training pipelines can reconstruct the exact input. */
  request: unknown;
  /** Full ScoreResultSchema response including summary, dimensions
      (with reasoning + confidence), recommendations, data_sources.
      This is the composer output we're trying to learn. */
  response: unknown;
  /** Whether the call returned 2xx. Failure rows still carry training
      value (they show what the engine refused to score). */
  responseOk: boolean;
  /** Wall-clock latency in milliseconds from scoreArea start to finish. */
  latencyMs: number;
}

export async function insertBriefComposerLog(
  fields: BriefComposerLogInsert,
  trainingOptout: boolean,
): Promise<void> {
  if (trainingOptout) return;
  try {
    const id = generateId("blog");
    const ctx = getRequestContext();
    await sql`
      INSERT INTO brief_composer_logs
        (id, org_id, user_id, area, preset, weights,
         request, response, response_ok, latency_ms, source, client_app)
      VALUES (
        ${id},
        ${fields.orgId},
        ${fields.userId},
        ${fields.area},
        ${fields.preset},
        ${fields.weights ? JSON.stringify(fields.weights) : null},
        ${JSON.stringify(fields.request)},
        ${JSON.stringify(fields.response)},
        ${fields.responseOk},
        ${fields.latencyMs},
        ${ctx?.source ?? null},
        ${ctx?.client_app ?? null}
      )
    `;
  } catch (error) {
    logger.error("Brief composer log insert failed:", error);
  }
}
