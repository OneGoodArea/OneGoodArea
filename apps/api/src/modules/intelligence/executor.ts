/* modules/intelligence — the executor (validated QueryPlan -> typed result).

   This is the deterministic half of the query plane. It dispatches a
   Zod-validated plan to the EXISTING proven handlers (queryAreas /
   getAreaProfile / scoreArea) — there is no new DB code here, no new
   business logic, no inference. The plan grammar IS the contract; this file
   just types the dispatch.

   Returns a typed QueryResponse with the plan echoed back (so consumers see
   exactly what ran). Throws only on genuinely exceptional DB / I/O errors —
   the endpoint catches and maps to 500. See ADR 0017. */

import type { QueryPlan, QueryResponse } from "@onegoodarea/contracts";
import { queryAreas, queryAreasCompound, type AreasQuery, type CompoundAreasQuery } from "../signals/query";
import { getAreaProfile } from "../signals";
import { scoreArea } from "../scoring";

const AREAS_LIMIT_DEFAULT = 100;

/** Detect which of the two params shapes a rank_areas plan carries.
    The two are disjoint (singular has `signal: string`, compound has
    `signals: array`) — checking for the compound key is unambiguous. */
function isCompoundParams(
  p: Extract<QueryPlan, { op: "rank_areas" }>["params"],
): p is Extract<Extract<QueryPlan, { op: "rank_areas" }>["params"], { signals: unknown }> {
  return "signals" in p && Array.isArray((p as { signals?: unknown }).signals);
}

/** Plan -> AreasQuery for the existing singular queryAreas handler. Defaults
    match /v1/areas (limit 100, sort percentile_desc). */
function singularRankAreasParams(p: Extract<Extract<QueryPlan, { op: "rank_areas" }>["params"], { signal: string }>): AreasQuery {
  return {
    signal: p.signal,
    country: p.country,
    lad: p.lad,
    sort: p.sort ?? "percentile_desc",
    limit: p.limit ?? AREAS_LIMIT_DEFAULT,
    minPercentile: p.min_percentile,
    maxPercentile: p.max_percentile,
    minValue: p.min_value,
    maxValue: p.max_value,
  };
}

/** Plan -> CompoundAreasQuery for the multi-JOIN queryAreasCompound handler. */
function compoundRankAreasParams(p: Extract<Extract<QueryPlan, { op: "rank_areas" }>["params"], { signals: unknown }>): CompoundAreasQuery {
  return {
    signals: p.signals.map((s) => ({ key: s.key, filter: s.filter })),
    country: p.country,
    lad: p.lad,
    sortBy: p.sort_by ? {
      signal: p.sort_by.signal,
      mode: p.sort_by.mode,
      direction: p.sort_by.direction,
    } : undefined,
    limit: p.limit ?? AREAS_LIMIT_DEFAULT,
  };
}

export interface ExecuteOpts { planSource: "client" | "nl" }

/** Run a validated plan. Returns the typed QueryResponse matching the plan op. */
export async function executePlan(plan: QueryPlan, opts: ExecuteOpts): Promise<QueryResponse> {
  const meta = { generated_at: new Date().toISOString() };
  const plan_source = opts.planSource;

  if (plan.op === "rank_areas") {
    const rows = isCompoundParams(plan.params)
      ? await queryAreasCompound(compoundRankAreasParams(plan.params))
      : await queryAreas(singularRankAreasParams(plan.params));
    return { plan, plan_source, results: rows, meta };
  }
  if (plan.op === "get_area") {
    const profile = await getAreaProfile(plan.params.area);
    return { plan, plan_source, results: profile, meta };
  }
  // score_area (the discriminator is exhaustive over the union)
  const score = await scoreArea({
    area: plan.params.area,
    preset: plan.params.preset ?? "research",
    weights: plan.params.weights,
  });
  return { plan, plan_source, results: score, meta };
}
