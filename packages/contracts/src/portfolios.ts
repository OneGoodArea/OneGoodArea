/* @onegoodarea/contracts — the Monitor product DTOs.

   A portfolio is a tracked book of areas. v1 = create/list/get/delete + bulk
   enrich (score every area). Change detection + alerts ride the time-series
   later. Scoped to a user today; to an org when Levers land. */

import { z } from "zod";
import { ScoreResultSchema } from "./scores";

/** One area tracked in a portfolio. */
export const PortfolioAreaSchema = z.object({
  id: z.string(),
  area: z.string(),
  label: z.string().nullable(),
  created_at: z.string().optional(),
});
export type PortfolioArea = z.infer<typeof PortfolioAreaSchema>;

/** A portfolio summary (list view). */
export const PortfolioSchema = z.object({
  id: z.string(),
  name: z.string(),
  area_count: z.number().optional(),
  created_at: z.string().optional(),
});
export type Portfolio = z.infer<typeof PortfolioSchema>;

/** A portfolio with its areas (detail view). */
export const PortfolioDetailSchema = PortfolioSchema.extend({
  areas: z.array(PortfolioAreaSchema),
});
export type PortfolioDetail = z.infer<typeof PortfolioDetailSchema>;

/** One row of a bulk-enrich result: the area + its score, or an error. */
export const PortfolioEnrichItemSchema = z.object({
  area: z.string(),
  label: z.string().nullable(),
  score: ScoreResultSchema.nullable(),
  error: z.string().nullable(),
});
export type PortfolioEnrichItem = z.infer<typeof PortfolioEnrichItemSchema>;
