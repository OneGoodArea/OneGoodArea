/* @onegoodarea/contracts — the Intelligence product DTOs.

   Intelligence is the smart QUERY + INSIGHT plane over the moat: NOT a chatbot,
   NOT narrative. This file defines the QUERY PLANE (v1, AR-182): a typed query
   plan grammar the moat answers. The JSON plan IS the public API; NL is one
   optional input mode (clients can post a pre-built plan and skip the LLM
   entirely).

   The non-negotiable principle: AI is interface + planner, it NEVER sets the
   numbers. The plan grammar is the contract; the DB produces the answer;
   invalid plans are rejected. Every result traces to real store rows.

   Future surfaces (insights/anomaly, peers, forecast, MCP, eval harness) extend
   this grammar with new plan ops; the discriminated union below is the
   extension point. See [[product-architecture-mental-model]] for the full
   6-surface Intelligence vision. */

import { z } from "zod";
import { SignalSchema, AreaProfileSchema } from "./signals";
import { ScoreResultSchema } from "./scores";

/* ── the plan grammar (each op = one supported operation over the store) ── */

/** Rank LSOAs by a signal (cross-area). Reuses /v1/areas / queryAreas. */
export const RankAreasPlanSchema = z.object({
  op: z.literal("rank_areas"),
  params: z.object({
    signal: z.string().min(1),
    country: z.enum(["England", "Wales", "Scotland"]).optional(),
    lad: z.string().optional(),
    sort: z.enum(["percentile", "percentile_desc", "value", "value_desc"]).optional(),
    limit: z.number().int().positive().max(1000).optional(),
    min_percentile: z.number().min(0).max(100).optional(),
    max_percentile: z.number().min(0).max(100).optional(),
    min_value: z.number().optional(),
    max_value: z.number().optional(),
  }).strict(),
}).strict();
export type RankAreasPlan = z.infer<typeof RankAreasPlanSchema>;

/** Fetch the full signal profile for one area. Reuses /v1/area / getAreaProfile. */
export const GetAreaPlanSchema = z.object({
  op: z.literal("get_area"),
  params: z.object({ area: z.string().min(1) }).strict(),
}).strict();
export type GetAreaPlan = z.infer<typeof GetAreaPlanSchema>;

/** Score one area (preset + optional custom weights). Reuses /v1/score / scoreArea. */
export const ScoreAreaPlanSchema = z.object({
  op: z.literal("score_area"),
  params: z.object({
    area: z.string().min(1),
    preset: z.enum(["moving", "business", "investing", "research"]).optional(),
    weights: z.record(z.string(), z.number()).optional(),
  }).strict(),
}).strict();
export type ScoreAreaPlan = z.infer<typeof ScoreAreaPlanSchema>;

/** The full plan grammar (v1). Strict discriminated union — unknown ops fail
    validation. Extension point: insights / peers / forecast land as new ops. */
export const QueryPlanSchema = z.discriminatedUnion("op", [
  RankAreasPlanSchema,
  GetAreaPlanSchema,
  ScoreAreaPlanSchema,
]);
export type QueryPlan = z.infer<typeof QueryPlanSchema>;

/* ── area-result row shape (mirrors apps/api queryAreas exactly; declared here
   so the typed response below can reference it without a backend dep). ── */
export const AreaResultSchema = z.object({
  geo_type: z.string(),
  geo_code: z.string(),
  value: z.number().nullable(),
  normalized_value: z.number().nullable(),
  percentile: z.number().nullable(),
});
export type AreaResult = z.infer<typeof AreaResultSchema>;

/* ── request + response ── */

/** Either a free-text question (NL mode -> planner) OR a pre-built plan
    (programmatic mode -> skips the LLM entirely). EXACTLY one is required. */
export const QueryRequestSchema = z.union([
  z.object({ question: z.string().min(1), plan: z.undefined().optional() }).strict(),
  z.object({ plan: QueryPlanSchema, question: z.undefined().optional() }).strict(),
]);
export type QueryRequest = z.infer<typeof QueryRequestSchema>;

/** Discriminated response: the result shape matches the plan op, so the
    consumer always knows what to expect. The plan + plan_source are returned
    alongside the results for transparency, repeatability, and audit. */
export const QueryResponseRankAreas = z.object({
  plan: RankAreasPlanSchema,
  plan_source: z.enum(["client", "nl"]),
  results: z.array(AreaResultSchema),
  meta: z.object({ generated_at: z.string() }),
}).strict();
export const QueryResponseGetArea = z.object({
  plan: GetAreaPlanSchema,
  plan_source: z.enum(["client", "nl"]),
  results: AreaProfileSchema.nullable(),
  meta: z.object({ generated_at: z.string() }),
}).strict();
export const QueryResponseScoreArea = z.object({
  plan: ScoreAreaPlanSchema,
  plan_source: z.enum(["client", "nl"]),
  results: ScoreResultSchema.nullable(),
  meta: z.object({ generated_at: z.string() }),
}).strict();
/** Flat union over the three per-op response shapes. (The plan.op is the
    natural discriminator, but it sits one level down, so a plain z.union keeps
    the schema simple and the inferred type a clean discriminated union.) */
export const QueryResponseSchema = z.union([
  QueryResponseRankAreas,
  QueryResponseGetArea,
  QueryResponseScoreArea,
]);
export type QueryResponse = z.infer<typeof QueryResponseSchema>;

/** A typed planner failure — exposed so the endpoint can translate to 422. */
export interface PlannerError { code: "invalid_plan" | "no_json" | "llm_error"; message: string; raw?: string }

/* Silence "unused" — SignalSchema may be needed when Signal-level result shapes
   land (e.g. a future plan op that returns signals directly). */
void SignalSchema;
