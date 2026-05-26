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
import { queryAreas, type AreasQuery } from "../signals/query";
import { getAreaProfile } from "../signals";
import { scoreArea } from "../scoring";

const AREAS_LIMIT_DEFAULT = 100;

/** Plan -> AreasQuery for the queryAreas handler. Defaults match
    /v1/areas (limit 100, sort percentile_desc). */
function rankAreasParams(plan: Extract<QueryPlan, { op: "rank_areas" }>): AreasQuery {
  const p = plan.params;
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

export interface ExecuteOpts { planSource: "client" | "nl" }

/** Run a validated plan. Returns the typed QueryResponse matching the plan op. */
export async function executePlan(plan: QueryPlan, opts: ExecuteOpts): Promise<QueryResponse> {
  const meta = { generated_at: new Date().toISOString() };
  const plan_source = opts.planSource;

  if (plan.op === "rank_areas") {
    const rows = await queryAreas(rankAreasParams(plan));
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
