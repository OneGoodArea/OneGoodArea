import { z } from "zod";

export const UsageCheckResponseSchema = z.object({
  allowed: z.boolean(),
  plan: z.string(),
  used: z.number(),
  limit: z.number().nullable(),
});
