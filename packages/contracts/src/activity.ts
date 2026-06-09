/* @onegoodarea/contracts — activity events DTOs.

   Schema for the GET /me/activity endpoint (AR-235). Events are
   written by trackEvent() across the api on user-visible actions
   (api.report.generated, api.area.profiled, api.score.computed,
   api.portfolio.*, api.org.created, etc.). This endpoint reads them
   back, scoped to the caller. */

import { z } from "zod";

/** A single row from activity_events. The `metadata` field is freeform
    JSONB so we don't pin a schema for it here; consumers handle
    event-type-specific shapes at the call site. */
export const ActivityEventSchema = z.object({
  id: z.string().min(1),
  /** The actor's user_id. Nullable to match the column (legacy rows
      from before user attribution may be NULL). */
  user_id: z.string().nullable(),
  /** Dotted event name, e.g. "api.report.generated". */
  event: z.string().min(1),
  /** Freeform event metadata, recorded at trackEvent time. */
  metadata: z.record(z.string(), z.unknown()),
  /** ISO timestamp. */
  created_at: z.string(),
}).strict();
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

/** GET /me/activity response. */
export const MeActivityResponseSchema = z.object({
  events: z.array(ActivityEventSchema),
  /** Total events the caller can read (for paginator total-page math). */
  total: z.number().int().nonnegative(),
  /** 1-based page number echoed back. */
  page: z.number().int().positive(),
  /** Page size echoed back. */
  page_size: z.number().int().positive(),
}).strict();
export type MeActivityResponse = z.infer<typeof MeActivityResponseSchema>;
