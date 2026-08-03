import { z } from "zod";

/** Shared Zod schema for ISO-8601 datetime strings.
 *  Use this instead of bare z.string() for any DB-sourced timestamp field.
 *  Accepts both UTC 'Z' suffix and timezone offsets (+01:00, -05:00). */
export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;
