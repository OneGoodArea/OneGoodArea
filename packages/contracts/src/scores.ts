/* @onegoodarea/contracts — the Scores product DTO.

   A composite area score: the optional "feature" layered on the Signals
   primitive. Either a preset (the historical intents, demoted to named presets)
   or caller-supplied weights over the preset's dimensions. Always transparent:
   the components, their weights, and confidence are returned, never just a
   number. AI never sets these — the scoring engine is deterministic. */

import { z } from "zod";
import { AreaTypeSchema } from "./signals";

/** One weighted component of a composite score. */
export const ScoreDimensionSchema = z.object({
  /** Stable slug for the dimension, e.g. "safety_crime" (override target for custom weights). */
  key: z.string(),
  /** Human label, e.g. "Safety & Crime". */
  label: z.string(),
  /** 0-100 deterministic dimension score. */
  score: z.number(),
  /** The weight applied to this dimension in the overall (preset default or custom override). */
  weight: z.number(),
  /** 0-1 data-quality confidence for this dimension. */
  confidence: z.number().min(0).max(1),
});
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;

/** Request body for POST /v1/score. */
export const ScoreRequestSchema = z.object({
  /** UK postcode or place name to score. */
  area: z.string().min(1),
  /** Scoring preset. Defaults to "research" if omitted. */
  preset: z.enum(["moving", "business", "investing", "research"]).optional(),
  /** Custom weight overrides for the preset's dimensions. Must be a subset of the
      preset's valid dimension keys; each value must be a positive number. */
  weights: z.record(z.string(), z.number()).optional(),
}).strict();
export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;

/** The response of POST /v1/score. */
export const ScoreResultSchema = z.object({
  /** The resolved area (postcode or place) that was scored. */
  area: z.string(),
  /** The preset used (one of the intent presets: moving|business|investing|research). */
  preset: z.string(),
  /** Overall composite score, 0-100. */
  score: z.number(),
  area_type: AreaTypeSchema,
  dimensions: z.array(ScoreDimensionSchema),
  /** Aggregate confidence, 0-1 (weighted by the effective weights). */
  confidence: z.number().min(0).max(1),
  /** Whether the overall used the preset's default weights or caller overrides. */
  weights_source: z.enum(["preset", "custom"]),
  engine_version: z.string(),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;
