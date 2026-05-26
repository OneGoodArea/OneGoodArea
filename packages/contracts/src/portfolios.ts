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

/* ── change detection ──
   A material move in one signal for one tracked area, between two time-series
   periods. Powers `signal.changed` alerts. Needs the signal to have >= 2 stored
   periods (so prices, which accrue monthly; deprivation is static = no change). */
export const SignalChangeSchema = z.object({
  signal_key: z.string(),
  label: z.string().nullable(),
  area: z.string(),            // the tracked area string (as added to the portfolio)
  geo_code: z.string(),        // the LSOA it resolved to
  period_from: z.string(),
  period_to: z.string(),
  value_from: z.number().nullable(),
  value_to: z.number().nullable(),
  delta: z.number().nullable(),
  pct_change: z.number().nullable(),   // null when the baseline value is 0/absent
  direction: z.enum(["up", "down", "flat"]),
  material: z.boolean(),               // |pct_change| >= threshold_pct
});
export type SignalChange = z.infer<typeof SignalChangeSchema>;

/** The result of checking a portfolio for change between two periods. */
export const ChangeReportSchema = z.object({
  portfolio_id: z.string(),
  baseline: z.enum(["previous", "first"]),  // compare latest vs the prior period, or vs the oldest in range
  threshold_pct: z.number(),
  min_transactions: z.number(),             // sample-size gate for price moves (de-noise)
  areas_checked: z.number(),
  material_count: z.number(),
  changes: z.array(SignalChangeSchema),     // material changes only
  generated_at: z.string(),
});
export type ChangeReport = z.infer<typeof ChangeReportSchema>;
