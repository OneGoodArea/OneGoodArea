import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { logger } from "./structured-logger";

/* trackEvent migrated from legacy src/lib/activity.ts (the only part the report
   generator needs). The legacy getAnalytics/getTrafficAnalytics belong to the
   admin module and migrate with it. The legacy ensureActivityTable() self-create
   is dropped: the migrator owns the byte-identical activity_events DDL.

   Like the legacy, this never throws into the caller: activity tracking must
   not break the main request. */

export async function trackEvent(
  event: string,
  userId?: string | null,
  metadata?: Record<string, unknown>
) {
  try {
    const id = generateId("evt");
    await sql`
      INSERT INTO activity_events (id, user_id, event, metadata)
      VALUES (${id}, ${userId || null}, ${event}, ${JSON.stringify(metadata || {})})
    `;
  } catch (error) {
    // Activity tracking should never break the main request
    logger.error("Activity tracking error:", error);
  }
}
