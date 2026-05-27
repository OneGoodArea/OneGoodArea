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

/* rank_areas params come in TWO shapes (Increment 2, AR-184):
   - SINGULAR (backward-compat sugar): one `signal` + optional global filters.
     This is the Increment 1 surface; existing callers + tests keep working
     byte-identically.
   - COMPOUND: `signals[]` with per-signal filters + `sort_by`. One signal_values
     JOIN per filter signal in the executor. AND semantics only in this
     increment (OR / aggregates deferred to Increment 4).
   The discriminator stays at `op: "rank_areas"` (top level) so the outer
   QueryPlanSchema discriminated union is untouched; the params union is local. */

const COUNTRY = z.enum(["England", "Wales", "Scotland"]);
const SORT = z.enum(["percentile", "percentile_desc", "value", "value_desc"]);
const PCT = z.number().min(0).max(100);
const LIMIT = z.number().int().positive().max(1000);

/** Singular params — the Increment 1 shape; kept as backward-compat sugar. */
export const RankAreasSingularParamsSchema = z.object({
  signal: z.string().min(1),
  country: COUNTRY.optional(),
  lad: z.string().optional(),
  sort: SORT.optional(),
  limit: LIMIT.optional(),
  min_percentile: PCT.optional(),
  max_percentile: PCT.optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
}).strict();
export type RankAreasSingularParams = z.infer<typeof RankAreasSingularParamsSchema>;

/** Per-signal filter — EXACTLY ONE operator per filter object. The strict
    single-key unions reject combined operators (`{lt:5, gt:1}` -> use
    `{between:[1,5]}` instead). Percentile filters require percentile data
    available in signal_percentiles for that signal; value filters operate on
    signal_values.raw_value. */
export const SignalFilterSchema = z.union([
  z.object({ eq: z.number() }).strict(),
  z.object({ lt: z.number() }).strict(),
  z.object({ lte: z.number() }).strict(),
  z.object({ gt: z.number() }).strict(),
  z.object({ gte: z.number() }).strict(),
  z.object({ between: z.tuple([z.number(), z.number()]) }).strict(),
  z.object({ percentile_lt: PCT }).strict(),
  z.object({ percentile_lte: PCT }).strict(),
  z.object({ percentile_gt: PCT }).strict(),
  z.object({ percentile_gte: PCT }).strict(),
  z.object({ percentile_between: z.tuple([PCT, PCT]) }).strict(),
]);
export type SignalFilter = z.infer<typeof SignalFilterSchema>;

/** One entry in the compound `signals[]` — a signal key plus an optional
    per-signal filter. Signals listed without a filter contribute to the
    response shape (their value/percentile come back per row) but apply no
    WHERE constraint; useful for "include this column but don't filter on it". */
export const SignalEntrySchema = z.object({
  key: z.string().min(1),
  filter: SignalFilterSchema.optional(),
}).strict();
export type SignalEntry = z.infer<typeof SignalEntrySchema>;

/** Compound `sort_by`: pick which of the listed signals ranks the results, and
    whether to sort by raw value or percentile, ascending or descending. */
export const SortBySchema = z.object({
  signal: z.string().min(1),
  mode: z.enum(["value", "percentile"]).optional(),
  direction: z.enum(["asc", "desc"]).optional(),
}).strict();
export type SortBy = z.infer<typeof SortBySchema>;

/** Compound params — multi-signal AND filter + per-signal sort_by. */
export const RankAreasCompoundParamsSchema = z.object({
  signals: z.array(SignalEntrySchema).min(1).max(8),
  sort_by: SortBySchema.optional(),
  country: COUNTRY.optional(),
  lad: z.string().optional(),
  limit: LIMIT.optional(),
}).strict().refine(
  (p) => !p.sort_by || p.signals.some((s) => s.key === p.sort_by!.signal),
  { message: "sort_by.signal must appear in signals[].key", path: ["sort_by", "signal"] },
);
export type RankAreasCompoundParams = z.infer<typeof RankAreasCompoundParamsSchema>;

/** Rank LSOAs by signals (cross-area). Reuses /v1/areas / queryAreas in the
    singular path; the compound path builds one signal_values JOIN per filter. */
export const RankAreasPlanSchema = z.object({
  op: z.literal("rank_areas"),
  params: z.union([RankAreasSingularParamsSchema, RankAreasCompoundParamsSchema]),
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

/* ── /v1/peers params (AR-188, Increment 6) ────────────────────────────
   k-NN over normalized signals. Target is identified by exactly ONE of:
     - geo_code   (LSOA code, e.g. E01034129)
     - postcode   (resolved to LSOA via the geo spine)
     - area       (free-text — resolved like /v1/area; broadest)
   Optional signals[] subsets the comparison dimensions (default = all
   normalized signals available for the target). country / lad scope
   the candidate set. k = number of peers (default 20, max 200). */
const TargetByGeoCode = z.object({
  geo_code: z.string().min(1),
  postcode: z.undefined().optional(),
  area: z.undefined().optional(),
}).strict();
const TargetByPostcode = z.object({
  postcode: z.string().min(1),
  geo_code: z.undefined().optional(),
  area: z.undefined().optional(),
}).strict();
const TargetByArea = z.object({
  area: z.string().min(1),
  geo_code: z.undefined().optional(),
  postcode: z.undefined().optional(),
}).strict();
export const PeersTargetSchema = z.union([TargetByGeoCode, TargetByPostcode, TargetByArea]);
export type PeersTarget = z.infer<typeof PeersTargetSchema>;

const peersParamsBase = {
  target: PeersTargetSchema,
  signals: z.array(z.string().min(1)).min(1).max(20).optional(),
  country: z.enum(["England", "Wales", "Scotland"]).optional(),
  lad: z.string().optional(),
  k: z.number().int().positive().max(200).optional(),
  min_signals: z.number().int().positive().max(20).optional(),
} as const;

/** Find peers (areas like this one) by k-NN over normalized signal values. */
export const FindPeersPlanSchema = z.object({
  op: z.literal("find_peers"),
  params: z.object(peersParamsBase).strict(),
}).strict();
export type FindPeersPlan = z.infer<typeof FindPeersPlanSchema>;

/** The full plan grammar (v1). Strict discriminated union — unknown ops fail
    validation. Extension point: insights / forecast land as new ops. */
export const QueryPlanSchema = z.discriminatedUnion("op", [
  RankAreasPlanSchema,
  GetAreaPlanSchema,
  ScoreAreaPlanSchema,
  FindPeersPlanSchema,
]);
export type QueryPlan = z.infer<typeof QueryPlanSchema>;

/* ── /v1/peers DTOs (independent of the plan op so the standalone
   endpoint can use the SAME request shape via PeersRequestSchema). ── */

export const PeersRequestSchema = z.object(peersParamsBase).strict();
export type PeersRequest = z.infer<typeof PeersRequestSchema>;

export const PeerResultSchema = z.object({
  geo_code: z.string(),
  distance: z.number(),         // 0 = identical, 1 = maximally distant (over [0,1] normalized space)
  n_dims_used: z.number().int(), // how many signal dimensions contributed to this peer's distance
}).strict();
export type PeerResult = z.infer<typeof PeerResultSchema>;

export const PeersResponseSchema = z.object({
  target: z.object({
    geo_code: z.string(),
    signals_used: z.array(z.string()),
  }).strict(),
  peers: z.array(PeerResultSchema),
  meta: z.object({ generated_at: z.string(), scope: z.string() }).strict(),
}).strict();
export type PeersResponse = z.infer<typeof PeersResponseSchema>;

/* ── area-result row shape (mirrors apps/api queryAreas exactly; declared here
   so the typed response below can reference it without a backend dep).

   Compound queries (Increment 2) add an optional `signals` map keyed by the
   listed signal keys — each value carries that signal's value/normalized/
   percentile for the area. The legacy top-level value/normalized/percentile
   fields mirror the SORT signal (or the first signal when no sort_by is
   given), so callers built against the singular shape keep working unchanged. ── */
export const AreaSignalValueSchema = z.object({
  value: z.number().nullable(),
  normalized_value: z.number().nullable(),
  percentile: z.number().nullable(),
}).strict();
export type AreaSignalValue = z.infer<typeof AreaSignalValueSchema>;

export const AreaResultSchema = z.object({
  geo_type: z.string(),
  geo_code: z.string(),
  value: z.number().nullable(),
  normalized_value: z.number().nullable(),
  percentile: z.number().nullable(),
  signals: z.record(z.string(), AreaSignalValueSchema).optional(),
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
/** find_peers wraps the standalone PeersResponse shape so it composes
    through /v1/query identically. */
export const QueryResponseFindPeers = z.object({
  plan: FindPeersPlanSchema,
  plan_source: z.enum(["client", "nl"]),
  results: PeersResponseSchema.nullable(),
  meta: z.object({ generated_at: z.string() }),
}).strict();
/** Flat union over the per-op response shapes. (The plan.op is the natural
    discriminator, but it sits one level down, so a plain z.union keeps the
    schema simple and the inferred type a clean discriminated union.) */
export const QueryResponseSchema = z.union([
  QueryResponseRankAreas,
  QueryResponseGetArea,
  QueryResponseScoreArea,
  QueryResponseFindPeers,
]);
export type QueryResponse = z.infer<typeof QueryResponseSchema>;

/** A typed planner failure — exposed so the endpoint can translate to 422. */
export interface PlannerError { code: "invalid_plan" | "no_json" | "llm_error"; message: string; raw?: string }

/* Silence "unused" — SignalSchema may be needed when Signal-level result shapes
   land (e.g. a future plan op that returns signals directly). */
void SignalSchema;
