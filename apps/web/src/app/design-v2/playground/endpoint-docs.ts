/* Per-endpoint documentation content for /playground (AR-437 step 2).
   Keyed by the TabId in client.tsx. Kept as data (not JSX) so the
   docs pane component stays layout-only and this file is the single
   place to edit copy or fields for any endpoint.

   Response shape is deliberately shallow. top-level keys + a
   one-line meaning. Deeper detail lives in the OpenAPI spec + the
   /docs surfaces. The playground docs pane is a springboard, not a
   substitute for the reference. */

export type ParamRow = {
  name: string;
  type: string;
  required: boolean;
  desc: string;
};

export type ResponseKey = {
  key: string;
  type: string;
  desc: string;
};

export type ErrorRow = {
  code: number;
  when: string;
};

export type EndpointDoc = {
  /** Who uses this endpoint and for what. the ICP framing. */
  icp: string;
  params: ParamRow[];
  response: ResponseKey[];
  errors: ErrorRow[];
  /** Free text. e.g. "30 requests / minute per API key" or
      "3 calls per browser session in the playground". */
  rateLimit: string;
};

export const ENDPOINT_DOCS: Record<string, EndpointDoc> = {
  area: {
    icp: "A full neighbourhood profile for one postcode. Crime, deprivation, schools, transport, property, amenities and environment, in one response, with the sources named.",
    params: [
      { name: "postcode", type: "string", required: false, desc: "UK postcode, e.g. `SW1A 1AA`. Provide either this or `area`." },
      { name: "area", type: "string", required: false, desc: "Place name, e.g. `Manchester`. Resolved via ONS spine." },
    ],
    response: [
      { key: "geo", type: "object", desc: "Resolved location: postcode, LSOA, MSOA, LAD, region, country, coordinates." },
      { key: "signals", type: "Signal[]", desc: "All indexed signals for the resolved LSOA. Each carries value, unit, source, observed period, confidence, normalized value + national + regional percentiles." },
      { key: "meta", type: "object", desc: "Engine version, fetch mode (`store` / `live` / `hybrid`), source list." },
    ],
    errors: [
      { code: 400, when: "Missing both `postcode` and `area`, or the value fails validation." },
      { code: 404, when: "The area could not be resolved to a UK LSOA." },
    ],
    rateLimit: "30 requests / minute per API key. Playground: capped per browser session.",
  },
  score: {
    icp: "One composite 0 to 100 score for an area, tuned to the intent (moving in, siting a business, investing, or researching). Override the weights when you want your own model.",
    params: [
      { name: "area", type: "string", required: true, desc: "Postcode or place name (same resolver as `/v1/area`)." },
      { name: "preset", type: "string", required: false, desc: "`moving`, `business`, `investing` or `research`. Defaults to `research`." },
      { name: "weights", type: "object", required: false, desc: "Custom per-dimension weights (0–100). Overrides the preset's dimension weights." },
    ],
    response: [
      { key: "overall", type: "number", desc: "Composite 0–100 score under the chosen preset + weights." },
      { key: "dimensions", type: "Dimension[]", desc: "Each dimension: key, label, score, weight, confidence, reasoning." },
      { key: "confidence", type: "number", desc: "Aggregate confidence across dimensions." },
      { key: "weights_source", type: "string", desc: "`preset` or `custom`. for audit trails." },
    ],
    errors: [
      { code: 400, when: "Unknown preset, or `weights` keys do not match the chosen preset's dimensions." },
      { code: 404, when: "The area could not be resolved." },
      { code: 422, when: "`preset_id` mutually exclusive with `preset` / `weights`. pick one." },
    ],
    rateLimit: "30 requests / minute per API key.",
  },
  peers: {
    icp: "Areas statistically similar to one you already know. k-NN over the normalized signal vector; same shape, different geography.",
    params: [
      { name: "target", type: "object", required: true, desc: "One of `{postcode}`, `{geo_code}`, or `{area}`. Exactly one." },
      { name: "k", type: "number", required: false, desc: "Number of peers to return. Defaults to 20, max 200." },
      { name: "signals", type: "string[]", required: false, desc: "Signal keys to weight the distance by. Defaults to all normalized signals." },
      { name: "min_signals", type: "number", required: false, desc: "Reject peers with fewer than N overlapping signals. Default 3." },
    ],
    response: [
      { key: "target", type: "object", desc: "Resolved target: geo_code + signals used." },
      { key: "peers", type: "Peer[]", desc: "Ranked peers. Each: geo_code, distance (0–1), n_dims_used, sample_postcode, admin_district, region." },
    ],
    errors: [
      { code: 400, when: "`target` missing, malformed, or contains more than one of the accepted keys." },
      { code: 404, when: "The target could not be resolved to an LSOA." },
    ],
    rateLimit: "30 requests / minute per API key.",
  },
  rank: {
    icp: "The top (or bottom) N areas by any signal within a scope. Compound filters and percentile floors narrow to a shortlist that matches your criteria.",
    params: [
      { name: "signal", type: "string", required: true, desc: "Signal key to rank by, e.g. `property.median_price` or `crime.total_12m`." },
      { name: "country", type: "string", required: false, desc: "`England`, `Scotland`, or `Wales`. Defaults to all." },
      { name: "lad", type: "string", required: false, desc: "Restrict to a specific Local Authority District." },
      { name: "limit", type: "number", required: false, desc: "Max rows to return. Default 20, max 200." },
      { name: "percentile_gte", type: "number", required: false, desc: "0–100. Return only areas at or above this percentile." },
      { name: "scope", type: "string", required: false, desc: "`national` (default) or `regional`. Regional ranks within ONS region." },
    ],
    response: [
      { key: "signal", type: "string", desc: "Echo of the signal ranked." },
      { key: "count", type: "number", desc: "Number of areas returned." },
      { key: "areas", type: "AreaRow[]", desc: "Each row: geo_code, admin_district, region, value, unit, percentile, regional_percentile." },
    ],
    errors: [
      { code: 400, when: "Unknown signal key, bad percentile range, or invalid country / scope." },
      { code: 422, when: "Signal not in the caller's `bundle` (Levers-scoped API keys only)." },
    ],
    rateLimit: "30 requests / minute per API key.",
  },
  insights: {
    icp: "Areas doing something unexpected relative to their peers. Peer-relative z-scores mean unusual for who you are, not unusual overall.",
    params: [
      { name: "signal_key", type: "string", required: true, desc: "Must be a peer-relative z-score signal. ends in `_peer_relative_z` (e.g. `crime.total_12m_peer_relative_z`)." },
      { name: "country", type: "string", required: false, desc: "Restrict to a country." },
      { name: "lad", type: "string", required: false, desc: "Restrict to a Local Authority District." },
      { name: "min_abs_z", type: "number", required: false, desc: "Only return areas with |z| ≥ this. Default 0." },
      { name: "k", type: "number", required: false, desc: "Max rows. Default 20." },
    ],
    response: [
      { key: "signal_key", type: "string", desc: "Echo of the peer-relative signal used." },
      { key: "anomalies", type: "Anomaly[]", desc: "Ranked by |z| descending. Each: geo_code, value, peer_avg, peer_stddev, z, admin_district." },
    ],
    errors: [
      { code: 400, when: "Signal is not a peer-relative variant (must end in `_peer_relative_z`). Error carries a hint pointing at `/v1/area` for the base signal." },
    ],
    rateLimit: "30 requests / minute per API key.",
  },
  forecast: {
    icp: "Any signal projected forward N months for one postcode. Linear regression over the trailing window, with residual-based confidence bounds so you know how tight the fit is.",
    params: [
      { name: "target", type: "object", required: true, desc: "One of `{postcode}`, `{geo_code}`, or `{area}`. Exactly one." },
      { name: "signal_key", type: "string", required: true, desc: "Signal to project. Must have monthly time-series (e.g. `property.median_price`, `crime.total_12m`)." },
      { name: "window_months", type: "number", required: false, desc: "Trailing months to fit the regression on. Default 24." },
      { name: "horizon_months", type: "number", required: false, desc: "Months to project forward. Default 12, max 60." },
    ],
    response: [
      { key: "projected", type: "ProjectedPoint[]", desc: "One row per future month: observed_period, projected_value, lower_bound, upper_bound." },
      { key: "meta", type: "object", desc: "Fit quality: r2, n_observations, slope_per_month, scope." },
    ],
    errors: [
      { code: 400, when: "Signal has no time-series or the window is out of bounds." },
      { code: 404, when: "Target could not be resolved." },
      { code: 422, when: "Not enough observations for the requested window (needs at least 3 monthly points)." },
    ],
    rateLimit: "30 requests / minute per API key.",
  },
  nl: {
    icp: "Ask a question in plain English. The API translates it to a structured plan, executes it deterministically, and returns the plan alongside the answer for audit.",
    params: [
      { name: "question", type: "string", required: false, desc: "Natural-language question. e.g. *best areas for families in London*." },
      { name: "plan", type: "object", required: false, desc: "A structured query plan, skipping the LLM. Send this from client code for reproducible results." },
    ],
    response: [
      { key: "plan_source", type: "string", desc: "`client` (you sent `plan`) or `nl` (LLM translated `question`)." },
      { key: "plan", type: "object", desc: "The plan that was actually executed. Send it back verbatim next time for the same answer, no LLM." },
      { key: "results", type: "unknown", desc: "The output of the executed plan (shape depends on the op. rank_areas, get_area, score_area, find_peers, find_insights, find_forecast, compare_areas)." },
      { key: "meta", type: "object", desc: "Engine version + latency breakdown (plan / execute)." },
    ],
    errors: [
      { code: 400, when: "Both `question` and `plan` sent, or neither. Or the plan fails Zod validation." },
      { code: 422, when: "The LLM's plan referenced a signal not in the caller's bundle." },
    ],
    rateLimit: "3 AI queries per browser session in the playground. 30 requests / minute per API key otherwise.",
  },
};
