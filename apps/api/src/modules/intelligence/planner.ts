/* modules/intelligence — the planner (NL -> validated QueryPlan).

   The AI's job is NARROW: read a natural-language question, emit a JSON query
   plan that matches the typed grammar. Nothing else. The plan grammar is the
   contract; the deterministic executor produces the actual answer from the
   store.

   Strict by design:
     - Output MUST be JSON (we strip ```json fences defensively).
     - Plan MUST validate against QueryPlanSchema (`.strict()` on every object,
       so unknown ops / unknown params are REJECTED, never silently coerced).
     - Failures return a typed PlannerError, never throw — the endpoint maps
       them to 422 with the LLM's raw output for transparency.

   This file is one half of the query plane (the other is the executor). The
   programmatic path skips this file entirely. See ADR 0017. */

import { QueryPlanSchema, type QueryPlan, type PlannerError } from "@onegoodarea/contracts";
import type { AiProvider } from "../reports/ai";

/** The set of signal keys the moat currently serves. Embedded in the prompt so
    the model can only pick from real, indexed signals. Add new keys here when a
    new source lands (deprivation / property / crime today). */
export const SUPPORTED_SIGNALS = [
  "deprivation.imd_decile",
  "deprivation.imd_rank",
  "property.median_price",
  "property.transaction_count",
  "property.price_change_pct_yoy",
  "property.median_price_change_pct_6m",
  "property.median_price_peer_relative_z",
  "property.transaction_count_change_pct_yoy",
  "property.transaction_count_trend_slope_24m",
  "crime.total_12m",
  "crime.total_12m_change_pct_yoy",
  "crime.total_6m_change_pct",
  "crime.total_12m_peer_relative_z",
  "crime.monthly_count_trend_slope_24m",
  "crime.monthly_rate",
  "crime.monthly_count",
] as const;

/** PURE: build the system+user prompt for the planner.

    The prompt is intentionally tight + structured. It says exactly what valid
    output looks like and refuses to ask for prose, narrative, or commentary. */
export function buildPlannerPrompt(question: string): string {
  return [
    `You are the QUERY PLANNER for the OneGoodArea data layer. Your ONLY job is`,
    `to translate a user's question into a JSON query plan that matches the`,
    `grammar below. You DO NOT answer the question. You DO NOT produce prose,`,
    `narrative, or commentary. You output ONE JSON object, nothing else.`,
    ``,
    `## Plan grammar (one of three ops)`,
    ``,
    `### rank_areas — rank LSOAs by signals across a region`,
    `Two shapes are accepted (use COMPOUND whenever the question mentions more`,
    `than one signal-level constraint):`,
    ``,
    `SINGULAR (one signal):`,
    `{"op":"rank_areas","params":{`,
    `  "signal": "<one of: ${SUPPORTED_SIGNALS.join(", ")}>",`,
    `  "country": "England"|"Wales"|"Scotland"   (optional),`,
    `  "lad": "<ONS LAD code, e.g. E08000003 for Manchester>"   (optional),`,
    `  "sort": "percentile"|"percentile_desc"|"value"|"value_desc"   (optional, default percentile_desc),`,
    `  "limit": 1..1000   (optional, default 100),`,
    `  "min_percentile": 0..100   (optional),`,
    `  "max_percentile": 0..100   (optional),`,
    `  "min_value": number   (optional),`,
    `  "max_value": number   (optional)`,
    `}}`,
    ``,
    `COMPOUND (multiple signals, ANDed together — the preferred shape for any`,
    `multi-constraint question):`,
    `{"op":"rank_areas","params":{`,
    `  "signals": [`,
    `    {"key": "<signal>", "filter": {<one of: eq|lt|lte|gt|gte|between|percentile_lt|percentile_lte|percentile_gt|percentile_gte|percentile_between>}},`,
    `    ...   (1..8 entries; filter is OPTIONAL — a signal without filter is`,
    `           included in the response but applies no WHERE constraint)`,
    `  ],`,
    `  "sort_by": {"signal": "<must be one of the keys above>", "mode": "value"|"percentile", "direction": "asc"|"desc"}   (optional, default percentile_desc on signals[0]),`,
    `  "country": "England"|"Wales"|"Scotland"   (optional),`,
    `  "lad": "<ONS LAD code>"   (optional),`,
    `  "limit": 1..1000   (optional, default 100)`,
    `}}`,
    ``,
    `Filter operator semantics:`,
    `- value ops (eq/lt/lte/gt/gte/between) compare against the signal's raw value`,
    `  (e.g. price in GBP). \`between\` takes [min, max] inclusive.`,
    `- percentile_* ops compare against the national percentile (0-100).`,
    `  Use \`percentile_lte: 25\` for "bottom quartile" / low-X areas, etc.`,
    `- Exactly ONE operator per filter object.`,
    ``,
    `### get_area — return the full signal profile for one area`,
    `{"op":"get_area","params":{"area":"<postcode or place name, e.g. M1 1AE>"}}`,
    ``,
    `### score_area — score one area (preset weights or custom)`,
    `{"op":"score_area","params":{`,
    `  "area": "<postcode or place name>",`,
    `  "preset": "moving"|"business"|"investing"|"research"   (optional, default research),`,
    `  "weights": { "<dimension_key>": <number>, ... }   (optional)`,
    `}}`,
    ``,
    `### find_peers — areas like a target area (k-NN over normalized signals)`,
    `{"op":"find_peers","params":{`,
    `  "target": {"geo_code":"<LSOA code>"} | {"postcode":"<postcode>"} | {"area":"<place name>"},   (EXACTLY one of these three)`,
    `  "signals": ["<one or more of the supported signals above>"]   (optional; default = all the target has),`,
    `  "country": "England"|"Wales"|"Scotland"   (optional),`,
    `  "lad": "<ONS LAD code>"   (optional),`,
    `  "k": 1..200   (optional, default 20),`,
    `  "min_signals": 1..20   (optional, default 3)`,
    `}}`,
    ``,
    `### find_insights — anomaly screening (LSOAs unusually high/low vs their peers)`,
    `{"op":"find_insights","params":{`,
    `  "signal_key": "<a peer-relative-z signal, suffix _peer_relative_z>",`,
    `  "country": "England"|"Wales"|"Scotland"   (optional),`,
    `  "lad": "<ONS LAD code>"   (optional),`,
    `  "min_abs_z": <number>   (optional; filter to |z| >= this),`,
    `  "k": 1..500   (optional, default 50)`,
    `}}`,
    ``,
    `## Hard rules`,
    `- Output ONLY the JSON object. No prose. No markdown fences. No commentary.`,
    `- "signal" MUST be one of the listed keys. Do not invent signal keys.`,
    `- Unknown / unsupported fields MUST be omitted (any extra field will be rejected).`,
    `- If the question is ambiguous or unanswerable from the grammar, pick the`,
    `  CLOSEST conservative plan (e.g. get_area on the obvious area).`,
    ``,
    `## Examples`,
    `Q: "most deprived LSOAs in Manchester"`,
    `A: {"op":"rank_areas","params":{"signal":"deprivation.imd_decile","lad":"E08000003","sort":"value","limit":20}}`,
    ``,
    `Q: "where are the cheapest places to buy in England?"`,
    `A: {"op":"rank_areas","params":{"signal":"property.median_price","country":"England","sort":"value","limit":20}}`,
    ``,
    `Q: "areas under £250k AND rising YoY AND low crime AND below-median deprivation"`,
    `A: {"op":"rank_areas","params":{"signals":[`,
    `   {"key":"property.median_price","filter":{"lte":250000}},`,
    `   {"key":"property.price_change_pct_yoy","filter":{"gt":0}},`,
    `   {"key":"crime.total_12m","filter":{"percentile_lte":50}},`,
    `   {"key":"deprivation.imd_decile","filter":{"percentile_gte":50}}`,
    `],"sort_by":{"signal":"property.price_change_pct_yoy","mode":"value","direction":"desc"},"country":"England","limit":50}}`,
    ``,
    `Q: "England areas in bottom quartile crime that are also affordable"`,
    `A: {"op":"rank_areas","params":{"signals":[`,
    `   {"key":"crime.total_12m","filter":{"percentile_lte":25}},`,
    `   {"key":"property.median_price","filter":{"percentile_lte":50}}`,
    `],"sort_by":{"signal":"crime.total_12m","mode":"percentile","direction":"asc"},"country":"England","limit":50}}`,
    ``,
    `Q: "tell me about M1 1AE"`,
    `A: {"op":"get_area","params":{"area":"M1 1AE"}}`,
    ``,
    `Q: "score SW1A 1AA for investment"`,
    `A: {"op":"score_area","params":{"area":"SW1A 1AA","preset":"investing"}}`,
    ``,
    `Q: "areas similar to M1 1AE in England"`,
    `A: {"op":"find_peers","params":{"target":{"postcode":"M1 1AE"},"country":"England","k":20}}`,
    ``,
    `Q: "give me peers of LSOA E01034129 on crime and price only"`,
    `A: {"op":"find_peers","params":{"target":{"geo_code":"E01034129"},"signals":["crime.total_12m","property.median_price"],"k":20}}`,
    ``,
    `Q: "England LSOAs with anomalously high crime vs their peer group, |z| >= 2"`,
    `A: {"op":"find_insights","params":{"signal_key":"crime.total_12m_peer_relative_z","country":"England","min_abs_z":2,"k":50}}`,
    ``,
    `## The question`,
    question,
  ].join("\n");
}

/** PURE: extract a JSON object from an LLM response. Tolerates leading prose
    or ```json fences (we asked for clean JSON; we defend against the model's
    occasional verbosity). Returns null when no parseable object is found. */
export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** PURE: validate raw LLM output into a typed QueryPlan, or a typed error. */
export function parsePlanText(raw: string): { ok: true; plan: QueryPlan } | { ok: false; error: PlannerError } {
  const json = extractJson(raw);
  if (json === null) {
    return { ok: false, error: { code: "no_json", message: "Planner did not return parseable JSON.", raw } };
  }
  const parsed = QueryPlanSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: { code: "invalid_plan", message: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "), raw } };
  }
  return { ok: true, plan: parsed.data };
}

/** I/O: call the AiProvider with the planner prompt for the user's question,
    then validate. Returns a typed result; never throws on planner failures. */
export async function plan(
  question: string,
  aiProvider: AiProvider,
): Promise<{ ok: true; plan: QueryPlan } | { ok: false; error: PlannerError }> {
  let raw: string;
  try {
    raw = await aiProvider.generateNarrative(buildPlannerPrompt(question));
  } catch (err) {
    return { ok: false, error: { code: "llm_error", message: err instanceof Error ? err.message : String(err) } };
  }
  return parsePlanText(raw);
}
