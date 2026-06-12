/* modules/intelligence — the executor (validated QueryPlan -> typed result).

   This is the deterministic half of the query plane. It dispatches a
   Zod-validated plan to the EXISTING proven handlers (queryAreas /
   getAreaProfile / scoreArea) — there is no new DB code here, no new
   business logic, no inference. The plan grammar IS the contract; this file
   just types the dispatch.

   Returns a typed QueryResponse with the plan echoed back (so consumers see
   exactly what ran). Throws only on genuinely exceptional DB / I/O errors —
   the endpoint catches and maps to 500. See ADR 0017. */

import type { QueryPlan, QueryResponse, AmbiguousLocationCandidate } from "@onegoodarea/contracts";
import { queryAreas, queryAreasCompound, type AreasQuery, type CompoundAreasQuery } from "../signals/query";
import { getAreaProfile } from "../signals";
import { scoreArea } from "../scoring";
import { findPeers, parsePeersInput } from "../signals/peers";
import { findInsights, parseInsightsInput } from "../signals/insights";
import { runForecast, parseForecastInput } from "../signals/forecast";
import { geocodeAreaStrict } from "../signals/data-sources/postcodes";

/* AR-267: thrown by every NL executor branch when a non-postcode place
   name resolves to multiple distinct postcodes (e.g. "Brixton" -> London
   AND Devon). /v1/query catches this and returns 422 with the candidate
   list so the caller can re-ask. Never instantiate from a postcode path
   — postcodes are unambiguous by definition. */
export class AmbiguousLocationError extends Error {
  constructor(public readonly query: string, public readonly candidates: AmbiguousLocationCandidate[]) {
    super(`Place name "${query}" is ambiguous — ${candidates.length} candidates.`);
    this.name = "AmbiguousLocationError";
  }
}

/* AR-267: a UK postcode (matched by the same regex postcodes.ts uses) is
   unambiguous by definition, so we skip the strict resolver for those
   inputs and let the downstream handler do its single fetch. */
const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Disambiguate a free-text area input before handing it to downstream
    handlers that take a string ({getAreaProfile, scoreArea}). Throws
    AmbiguousLocationError on name-collision so the endpoint can return
    422; otherwise returns the original string (postcodes pass through
    unchanged, place names pass through and re-geocode in the handler —
    one extra postcodes.io call, but worth the simplicity). */
async function resolveAreaInputStrict(query: string): Promise<string> {
  if (POSTCODE_REGEX.test(query.trim())) return query;
  const result = await geocodeAreaStrict(query);
  if (result.kind === "ambiguous") throw new AmbiguousLocationError(query, result.candidates);
  return query;
}

/** Disambiguate, then resolve to an LSOA — used by find_peers and
    find_forecast which need the LSOA code, not a postcode. Throws on
    ambiguous; returns null on not-found (matches existing null-results
    contract). */
async function resolveTargetAreaStrict(query: string): Promise<{ lsoa: string } | null> {
  const result = await geocodeAreaStrict(query);
  if (result.kind === "ambiguous") throw new AmbiguousLocationError(query, result.candidates);
  if (result.kind === "not_found") return null;
  return { lsoa: result.area.lsoa };
}

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
    // AR-267: disambiguate BEFORE handing off to getAreaProfile. Strict
    // resolver throws AmbiguousLocationError; the endpoint maps to 422.
    const resolved = await resolveAreaInputStrict(plan.params.area);
    const profile = await getAreaProfile(resolved);
    return { plan, plan_source, results: profile, meta };
  }
  if (plan.op === "score_area") {
    const resolved = await resolveAreaInputStrict(plan.params.area);
    const score = await scoreArea({
      area: resolved,
      preset: plan.params.preset ?? "research",
      weights: plan.params.weights,
    });
    return { plan, plan_source, results: score, meta };
  }
  if (plan.op === "compare_areas") {
    /* AR-266: fan out getAreaProfile per slot in parallel; preserve
       not-founds as null slots (NOT dropped) so the caller can see
       exactly which input failed. Order matches plan.params.areas. */
    const queries = plan.params.areas;
    const profiles = await Promise.all(queries.map((a) => getAreaProfile(a)));
    return {
      plan, plan_source,
      results: {
        areas: queries.map((query, i) => ({ query, profile: profiles[i] })),
        meta: { generated_at: meta.generated_at, scope: `areas=${queries.length}` },
      },
      meta,
    };
  }
  if (plan.op === "find_forecast") {
    // find_forecast — resolve target -> LSOA, fit linear regression on the
    // trailing window of signal_timeseries, project horizon_months ahead.
    // Returns null when the target can't be resolved OR the window has
    // < 2 monthly observations.
    const tgt = plan.params.target;
    let targetGeoCode: string | null = null;
    if ("geo_code" in tgt && tgt.geo_code) {
      targetGeoCode = tgt.geo_code.trim();
    } else {
      const q = ("postcode" in tgt ? tgt.postcode : "area" in tgt ? tgt.area : "")!.trim();
      if (q) {
        // AR-267: disambiguate place names; postcode shape skips the strict
        // path (resolveTargetAreaStrict is no-op cost for postcodes via
        // geocodeAreaStrict's POSTCODE_REGEX branch above).
        const resolved = await resolveTargetAreaStrict(q);
        if (resolved) targetGeoCode = resolved.lsoa;
      }
    }
    if (!targetGeoCode) return { plan, plan_source, results: null, meta };

    const parsed = parseForecastInput({
      targetGeoCode,
      signalKey: plan.params.signal_key,
      windowMonths: plan.params.window_months,
      horizonMonths: plan.params.horizon_months,
    });
    if (!parsed.ok) return { plan, plan_source, results: null, meta };

    const result = await runForecast(parsed.input);
    if (!result) return { plan, plan_source, results: null, meta };

    return {
      plan, plan_source,
      results: {
        target: { geo_code: targetGeoCode },
        signal_key: parsed.input.signalKey,
        points: result.points,
        meta: {
          generated_at: meta.generated_at,
          scope: `geo_code=${targetGeoCode}`,
          window_months: parsed.input.windowMonths,
          horizon_months: parsed.input.horizonMonths,
          n_observations: result.stats.n_observations,
          r2: result.stats.r2,
          slope_per_month: result.stats.slope,
          intercept: result.stats.intercept,
          residual_stderr: result.residualStderr,
          latest_observed_period: result.stats.latest_observed_period,
        },
      },
      meta,
    };
  }
  if (plan.op === "find_insights") {
    // find_insights — anomaly screening by ABS(peer_relative_z) on a chosen
    // signal. Same parseInsightsInput + findInsights used by POST /v1/insights.
    const parsed = parseInsightsInput({
      signalKey: plan.params.signal_key,
      country: plan.params.country,
      lad: plan.params.lad,
      minAbsZ: plan.params.min_abs_z,
      k: plan.params.k,
    });
    if (!parsed.ok) return { plan, plan_source, results: null, meta };
    const rows = await findInsights(parsed.input);
    const scope = [
      parsed.input.country ? `country=${parsed.input.country}` : "",
      parsed.input.lad ? `lad=${parsed.input.lad}` : "",
      parsed.input.minAbsZ ? `min_abs_z=${parsed.input.minAbsZ}` : "",
    ].filter(Boolean).join(" ") || "national";
    return {
      plan, plan_source,
      results: {
        signal_key: parsed.input.signalKey,
        insights: rows,
        meta: { generated_at: meta.generated_at, scope, threshold: parsed.input.minAbsZ ?? null },
      },
      meta,
    };
  }
  // find_peers — resolve target (geo_code | postcode | area) -> LSOA, then
  // dispatch to the SAME findPeers used by POST /v1/peers. Returns null
  // results when the target can't be resolved OR has no normalized signals;
  // the endpoint maps that to 404 separately, but in the query plane we
  // preserve the typed shape (results: null) for symmetry with get_area /
  // score_area.
  const tgt = plan.params.target;
  let targetGeoCode: string | null = null;
  if ("geo_code" in tgt && tgt.geo_code) {
    targetGeoCode = tgt.geo_code.trim();
  } else {
    const q = ("postcode" in tgt ? tgt.postcode : "area" in tgt ? tgt.area : "")!.trim();
    if (q) {
      // AR-267: same disambiguation as find_forecast — never silently pick.
      const resolved = await resolveTargetAreaStrict(q);
      if (resolved) targetGeoCode = resolved.lsoa;
    }
  }
  if (!targetGeoCode) return { plan, plan_source, results: null, meta };

  const parsed = parsePeersInput({
    targetGeoCode,
    signals: plan.params.signals,
    country: plan.params.country,
    lad: plan.params.lad,
    k: plan.params.k,
    minSignals: plan.params.min_signals,
  });
  if (!parsed.ok) return { plan, plan_source, results: null, meta };

  const result = await findPeers(parsed.input);
  if (result.signalsUsed.length === 0) return { plan, plan_source, results: null, meta };

  return {
    plan,
    plan_source,
    results: {
      target: { geo_code: targetGeoCode, signals_used: result.signalsUsed },
      peers: result.peers,
      meta: { generated_at: meta.generated_at, scope: `geo_code=${targetGeoCode}` },
    },
    meta,
  };
}

