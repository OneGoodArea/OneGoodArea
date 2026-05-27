/* Eval: the golden corpus (AR-191, ADR 0026).

   Each case is one NL question + the expected plan the planner should
   emit. The corpus is small + curated, covering the 6 plan ops + their
   common variations. Add a case here whenever:
     - we ship a new plan op (extend coverage),
     - a real customer asks something the planner gets wrong (regression),
     - we add a derived signal that has new NL phrasings.

   Conventions:
     - `id` is a short kebab-case slug; unique.
     - `description` is one-line; appears in the markdown report.
     - `nl_question` is the user-facing English (avoid em dashes; pound sign
       is fine in JSON but planner sometimes echoes pre-converted "GBP").
     - `expected_plan` is the structurally-matching plan. Optional fields
       can be omitted -- both `expected` and `actual` are Zod-parsed before
       compare, so defaults fill in equivalently.
     - We try to cover: minimum case per op + at least one compound /
       multi-constraint case.

   See ADR 0026. */

import type { QueryPlan } from "@onegoodarea/contracts";

export interface EvalCase {
  id: string;
  description: string;
  nl_question: string;
  expected_plan: QueryPlan;
}

export const EVAL_CASES: EvalCase[] = [
  /* ── rank_areas — singular ─────────────────────────────────────────── */
  {
    id: "rank-most-deprived-manchester",
    description: "rank_areas singular, LAD scope, value sort",
    nl_question: "most deprived LSOAs in Manchester",
    expected_plan: {
      op: "rank_areas",
      params: { signal: "deprivation.imd_decile", lad: "E08000003", sort: "value", limit: 20 },
    },
  },
  {
    id: "rank-cheapest-england",
    description: "rank_areas singular, country scope, value sort",
    nl_question: "where are the cheapest places to buy in England?",
    expected_plan: {
      op: "rank_areas",
      params: { signal: "property.median_price", country: "England", sort: "value", limit: 20 },
    },
  },

  /* ── rank_areas — compound ─────────────────────────────────────────── */
  {
    id: "rank-compound-affordable-rising-safe",
    description: "rank_areas COMPOUND: 4 constraints (price + YoY + crime + IMD)",
    nl_question:
      "England areas under 250000 GBP AND rising year over year AND with low crime AND below-median deprivation",
    expected_plan: {
      op: "rank_areas",
      params: {
        signals: [
          { key: "property.median_price", filter: { lte: 250000 } },
          { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
          { key: "crime.total_12m", filter: { percentile_lte: 50 } },
          { key: "deprivation.imd_decile", filter: { percentile_gte: 50 } },
        ],
        sort_by: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
        country: "England",
        limit: 50,
      },
    },
  },
  {
    id: "rank-compound-bottom-quartile-crime",
    description: "rank_areas COMPOUND: bottom-quartile crime + affordable",
    nl_question: "England areas in bottom quartile crime that are also affordable",
    expected_plan: {
      op: "rank_areas",
      params: {
        signals: [
          { key: "crime.total_12m", filter: { percentile_lte: 25 } },
          { key: "property.median_price", filter: { percentile_lte: 50 } },
        ],
        sort_by: { signal: "crime.total_12m", mode: "percentile", direction: "asc" },
        country: "England",
        limit: 50,
      },
    },
  },

  /* ── get_area ─────────────────────────────────────────────────────── */
  {
    id: "getarea-postcode",
    description: "get_area by postcode",
    nl_question: "tell me about M1 1AE",
    expected_plan: { op: "get_area", params: { area: "M1 1AE" } },
  },
  {
    id: "getarea-place",
    description: "get_area by place name",
    nl_question: "what's in Clapham?",
    expected_plan: { op: "get_area", params: { area: "Clapham" } },
  },

  /* ── score_area ───────────────────────────────────────────────────── */
  {
    id: "score-investing",
    description: "score_area with investing preset",
    nl_question: "score SW1A 1AA for investment",
    expected_plan: { op: "score_area", params: { area: "SW1A 1AA", preset: "investing" } },
  },
  {
    id: "score-default",
    description: "score_area without explicit preset (planner free to default or omit)",
    nl_question: "give me an area score for M1 1AE",
    expected_plan: { op: "score_area", params: { area: "M1 1AE" } },
  },

  /* ── find_peers ───────────────────────────────────────────────────── */
  {
    id: "peers-postcode",
    description: "find_peers by postcode, country scope",
    nl_question: "areas similar to M1 1AE in England",
    expected_plan: {
      op: "find_peers",
      params: { target: { postcode: "M1 1AE" }, country: "England", k: 20 },
    },
  },
  {
    id: "peers-geo-code-signal-subset",
    description: "find_peers by geo_code, with a 2-signal subset",
    nl_question: "give me peers of LSOA E01034129 on crime and price only",
    expected_plan: {
      op: "find_peers",
      params: {
        target: { geo_code: "E01034129" },
        signals: ["crime.total_12m", "property.median_price"],
        k: 20,
      },
    },
  },

  /* ── find_insights ────────────────────────────────────────────────── */
  {
    id: "insights-crime-z-threshold",
    description: "find_insights on crime peer-relative-z, |z| >= 2",
    nl_question: "England LSOAs with anomalously high crime vs their peer group, |z| >= 2",
    expected_plan: {
      op: "find_insights",
      params: { signal_key: "crime.total_12m_peer_relative_z", country: "England", min_abs_z: 2, k: 50 },
    },
  },
  {
    id: "insights-price-z",
    description: "find_insights on property peer-relative-z, default threshold",
    nl_question: "which English areas are dramatically over- or under-priced compared to their peers?",
    expected_plan: {
      op: "find_insights",
      params: { signal_key: "property.median_price_peer_relative_z", country: "England" },
    },
  },

  /* ── find_forecast ────────────────────────────────────────────────── */
  {
    id: "forecast-price-12mo",
    description: "find_forecast: median price 12 months ahead",
    nl_question: "forecast the next 12 months of median house price in M1 1AE",
    expected_plan: {
      op: "find_forecast",
      params: { target: { postcode: "M1 1AE" }, signal_key: "property.median_price", horizon_months: 12 },
    },
  },
  {
    id: "forecast-crime-6mo-geocode",
    description: "find_forecast: crime count 6 months ahead, geo_code target",
    nl_question: "project crime.monthly_count for E01034129 over the next 6 months",
    expected_plan: {
      op: "find_forecast",
      params: { target: { geo_code: "E01034129" }, signal_key: "crime.monthly_count", horizon_months: 6 },
    },
  },
];
