import { z } from "zod";

export const TrainingRetentionResponseSchema = z.object({
  retention_days: z.number(),
  cutoff: z.string(),
  planner_pairs_deleted: z.number(),
  brief_pairs_deleted: z.number(),
});
