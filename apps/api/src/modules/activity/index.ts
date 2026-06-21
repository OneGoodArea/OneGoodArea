/* AR-235 [AR-217-A18] Activity module, read side.

   The write path is already in place via trackEvent() in
   apps/api/src/modules/tracking/activity.ts which inserts into the
   activity_events table from every user-visible endpoint
   (api.report.generated, api.score.computed, api.portfolio.*,
   api.org.created etc.).

   This module owns the READ path: list the events a given user can
   see, paginated. Scope is caller's user_id. There's no org_id
   column on activity_events today, so org-scoping is implicit (the
   user sees their own actions across orgs they belong to). A future
   migration can add org_id + scope reads per the active-org context. */

import { sql } from "../../infrastructure/db/client";
import { rows } from "../../infrastructure/db/types";
import type { ActivityEvent } from "@onegoodarea/contracts";

interface ActivityEventRow {
  id: string;
  user_id: string | null;
  event: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ActivityCountRow {
  total: number;
}

export interface ActivityPage {
  events: ActivityEvent[];
  total: number;
}

/** Page a user's activity events. 1-based page index. */
export async function listForUser(
  userId: string,
  page: number,
  pageSize: number,
): Promise<ActivityPage> {
  const offset = (page - 1) * pageSize;

  const eventResult = rows<ActivityEventRow>(await sql`
    SELECT id, user_id, event, metadata, created_at
      FROM activity_events
     WHERE user_id = ${userId}
     ORDER BY created_at DESC
     LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  const countResult = rows<ActivityCountRow>(await sql`
    SELECT COUNT(*)::int AS total
      FROM activity_events
     WHERE user_id = ${userId}
  `);

  const events = eventResult.map(eventFromRow);
  const total = countResult[0]?.total ?? 0;
  return { events, total };
}

function eventFromRow(row: ActivityEventRow): ActivityEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    event: row.event,
    /* metadata defaults to {} in the DDL but null can still surface
       on legacy rows; normalise to an empty object so the contract
       stays Record<string, unknown> (never null). */
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}
