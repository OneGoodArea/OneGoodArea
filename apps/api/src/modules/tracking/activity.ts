import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { getRequestContext } from "../../shared/request-context";
import { logger } from "./structured-logger";

/* trackEvent migrated from legacy src/lib/activity.ts (the only part the report
   generator needs). The legacy getAnalytics/getTrafficAnalytics belong to the
   admin module and migrate with it. The legacy ensureActivityTable() self-create
   is dropped: the migrator owns the byte-identical activity_events DDL.

   Like the legacy, this never throws into the caller: activity tracking must
   not break the main request.

   AR-375: every event now carries {source, client_app} merged from the
   per-request AsyncLocalStorage context (set by the Fastify onRequest hook
   in app.ts). Call sites are unchanged. Outside a request (CLI scripts),
   context is null and these fields are omitted from metadata. */

export async function trackEvent(
  event: string,
  userId?: string | null,
  metadata?: Record<string, unknown>,
  /* AR-289: org context for per-org /api-usage scoping. Optional so
     non-API call sites (auth flows, public pageviews) keep passing
     nothing — those events stay org-less by design. API call sites
     should pass the api key's org_id, which validateApiKey returns. */
  orgId?: string | null,
) {
  try {
    const id = generateId("evt");
    const ctx = getRequestContext();
    const enrichedMetadata = ctx
      ? { ...(metadata ?? {}), source: ctx.source, client_app: ctx.client_app }
      : (metadata ?? {});
    await sql`
      INSERT INTO activity_events (id, user_id, event, metadata, org_id)
      VALUES (${id}, ${userId || null}, ${event}, ${JSON.stringify(enrichedMetadata)}, ${orgId || null})
    `;
  } catch (error) {
    // Activity tracking should never break the main request
    logger.error("Activity tracking error:", error);
  }
}
