# Product spec — Intelligence

> Part of [AR-204 product-pages spec pack](./AR-204-product-pages-spec-pack.md).

## Thesis

Intelligence is a typed query + insight plane over the UK area moat. **Not a chatbot, not narrative — AI never sets the numbers.** Six plan ops (`rank_areas` singular, `rank_areas` compound, `get_area`, `score_area`, `find_peers`, `find_insights`, `find_forecast`) sit under one Zod-strict discriminated union; the executor dispatches deterministically against Postgres, and every response echoes the executed plan plus `plan_source` so any answer is replayable as a programmatic call. `POST /v1/query` accepts either `{plan}` (LLM never touched — the JSON grammar IS the API) or `{question}` (the planner translates NL through the AiProvider seam into the SAME typed plan, then the SAME executor runs it). Measured baseline: **92.9% planner accuracy on a 14-case curated corpus** against `claude-sonnet-4-20250514`, with a Wilson 95% CI of roughly 70-99%. `/v1/peers`, `/v1/insights`, `/v1/forecast` are convenience endpoints over the same plan ops — one implementation per capability, two surfaces.

## Primitive contract

`QueryPlanSchema` is a strict Zod discriminated union on `op` covering six operations. `QueryRequestSchema` requires EXACTLY one of `{question}` OR `{plan}`. `QueryResponseSchema` is a per-op union where every response echoes the executed plan plus `plan_source` (`'client'` for programmatic, `'nl'` for planner-derived). Every nested object is `.strict()` — unknown ops or unknown params are REJECTED, never silently coerced.

**Zod source:** `packages/contracts/src/intelligence.ts`

| Field | Type | Description | Example |
|---|---|---|---|
| `plan.op` | literal | `rank_areas` / `get_area` / `score_area` / `find_peers` / `find_insights` / `find_forecast`. | `rank_areas` |
| `plan.params` (rank_areas singular) | object.strict | Backward-compat sugar: `{ signal, country?, lad?, sort?, limit?, min_percentile?, max_percentile?, min_value?, max_value? }`. | `{ signal: 'property.median_price', sort: 'value', limit: 20 }` |
| `plan.params` (rank_areas compound) | object.strict | Multi-signal AND filter: `{ signals: [{key, filter?}, ...] 1..8 entries, sort_by?, country?, lad?, limit? }`. `sort_by.signal` must appear in `signals[].key`. | `{ signals: [...], sort_by: {signal:'price_change_pct_yoy', mode:'value', direction:'desc'}, country:'England', limit:50 }` |
| `plan.params` (get_area) | object.strict | `{ area: string }`. | `{ area: 'M1 1AE' }` |
| `plan.params` (score_area) | object.strict | `{ area, preset?, weights? }`. | `{ area: 'SW1A 1AA', preset: 'investing' }` |
| `plan.params` (find_peers) | object.strict | `{ target: {geo_code}\|{postcode}\|{area} EXACTLY one, signals?: string[1..20], country?, lad?, k?: 1..200 default 20, min_signals?: 1..20 default 3 }`. | `{ target: {postcode:'M1 1AE'}, k:20 }` |
| `plan.params` (find_insights) | object.strict | `{ signal_key (MUST end in _peer_relative_z), country?, lad?, min_abs_z?, k?: 1..500 default 50 }`. | `{ signal_key:'crime.total_12m_peer_relative_z', min_abs_z:2 }` |
| `plan.params` (find_forecast) | object.strict | `{ target (same as peers), signal_key, window_months?: 6..120 default 24, horizon_months?: 1..60 default 12 }`. | `{ target:{postcode:'M1 1AE'}, signal_key:'property.median_price', horizon_months:12 }` |
| `plan_source` | `'client' \| 'nl'` | How this plan reached executor: `'client'` = programmatic, `'nl'` = planner-derived. | `nl` |
| `results` (rank_areas) | `AreaResult[]` | Each row: `{ geo_type, geo_code, value, normalized_value, percentile, signals?: Record<key, {value, normalized_value, percentile}> }`. Compound queries fill `signals`. | `{ geo_code:'E01...', value:218500, signals:{...} }` |
| `results` (find_peers) | `PeersResponse \| null` | `{ target: {geo_code, signals_used}, peers: [{geo_code, distance, n_dims_used}], meta }`. distance 0=identical, 1=max. | `{ peers:[{geo_code, distance: 0.045, n_dims_used: 7}, ...] }` |
| `results` (find_insights) | `InsightsResponse \| null` | `{ signal_key, insights:[{geo_code, peer_relative_z (signed), abs_z}], meta }`. Ranked by abs_z DESC. | `{ insights:[{geo_code, peer_relative_z: -2.7, abs_z: 2.7}, ...] }` |
| `results` (find_forecast) | `ForecastResponse \| null` | `{ target, signal_key, points: [{observed_period 'YYYY-MM', projected_value, lower_bound, upper_bound}], meta:{n_observations, r2, slope_per_month, intercept, residual_stderr, ...} }`. | `{ points:[{...}], meta:{r2:0.71, ...} }` |
| `meta.generated_at` | ISO timestamp | Same across every op. | `2026-05-31T...` |
| `X-Engine-Version` | header | Echoes effective methodology version (honours Levers methodology pin). | `2.0.2` |
| `PlannerError` | `{ code, message, raw? }` | Typed planner failure. `code ∈ {no_json, invalid_plan, llm_error}`. `raw` carries LLM output. Endpoint maps to 422. | `{ code:'invalid_plan', message:'(root): Unknown op', raw:'...' }` |

## Under the hood

**Store or compute?** Hybrid. `/v1/query` dispatches a Zod-validated `QueryPlan` to `executor.ts`, which calls existing module functions (`queryAreas` / `queryAreasCompound` / `getAreaProfile` / `scoreArea` / `findPeers` / `findInsights` / `runForecast`). No new DB code, no inference. Compound `rank_areas` is one `signal_values` INNER JOIN per signal (plus matching `signal_percentiles` LEFT JOIN), all parameters bound through `query(text, params)` — no SQL injection surface. `find_insights` is a single ORDER BY scan over a pre-materialised peer-relative-z derived signal (heavy peer math runs OFFLINE in `refresh:peers` + `derive:signals`). `find_forecast` is one Postgres `regr_slope`/`regr_intercept`/`regr_r2`/`regr_syy` aggregate over `signal_timeseries` + JS-side projection — no pre-computation. `find_peers` does two SQL round-trips per request. All endpoints behind `OGA_SIGNALS_API` + `requireApiAccess` (or `guardSignals` for insights/forecast). 404 when flag off.

**Lineage.** Every response echoes the executed plan plus `plan_source` so any answer is replayable as a programmatic call — that IS the audit-safety contract (ADR 0017). Forecast meta exposes `n_observations` / `r2` / `slope_per_month` / `intercept` / `residual_stderr` / `latest_observed_period` so callers can re-compute textbook CIs themselves. Insights expose signed `peer_relative_z` + `abs_z`. Peers expose `distance` + `n_dims_used`. `X-Engine-Version` header stamps every response. `peer_assignments` rows carry `computed_at` + `engine_version`. AI eval corpus (`eval/cases.ts`) and 92.9% baseline are version-controlled in-repo.

**RBAC + Levers interplay.** Three Levers integrations:
1. **Custom Signal Bundles** — when `?bundle=` or `body.bundle` is set, `resolveBundleForCaller` fetches the org's whitelist; AFTER planning/execution, `planSignalsOutsideBundle` walks the typed plan and returns 422 `bundle_signal_not_allowed` if any referenced signal_key is outside (caveat: `get_area` and `score_area` plan ops currently bypass — v1 gap, ADR 0034).
2. **Peer Cohorts** — `/v1/peers` accepts `body.cohort_id`; `getCohort` resolves org's named LSOA subset and constrains candidate set inside `buildPeersSql`.
3. **Methodology Pinning** — every response sets `X-Engine-Version` via `effectiveEngineVersionForCaller(orgId, userId)` so a pinned org sees deterministic methodology across runs.

White-label + IP allowlist (AR-200) apply to the API key, not the surface.

**Rate limits / quota.** Standard `requireApiAccess` metering: `api.query.executed` (tagged with op + plan_source + bundle), `api.peers.queried`, `api.insights.queried`, `api.forecast.queried`. Suggested per-IP rate limit on `/v1/query` is LOWER than other surfaces because NL mode burns LLM credits; programmatic `{plan}` mode is free of that cost. `/v1/peers`, `/v1/insights`, `/v1/forecast` are pure SQL — heavier per-call DB work but no LLM.

## Endpoints

### `POST /v1/query`

The typed query plane. Send EITHER `{plan}` (programmatic, LLM untouched) OR `{question}` (NL → planner translates via AiProvider → SAME executor). Response always echoes the executed plan + `plan_source`.

**Request body:** EXACTLY one of `question` (string) or `plan` (`QueryPlan` matching `QueryPlanSchema`). Optional `bundle` (string or query param `?bundle=`) for Levers AR-195 gating.

**Status codes:** 200 (plan validated + executed) · 400 (both `question` and `plan`, or neither) · 401 missing/invalid key · 404 (`OGA_SIGNALS_API` off) · 422 (planner returned no JSON [`code=no_json`], invalid plan [`code=invalid_plan`], LLM error [`code=llm_error`], plan references signals outside bundle [`code=bundle_signal_not_allowed`]; body carries raw LLM output) · 500 DB/I/O.

**Sample curl:**
```
curl -s https://api.onegoodarea.com/v1/query \
  -H 'Authorization: Bearer oga_live_...' \
  -H 'Content-Type: application/json' \
  -d '{"question":"England LSOAs under 250000 GBP AND rising YoY AND in bottom quartile crime, sort by YoY desc, limit 5"}'
```

**Sample response (abridged):**
```json
{
  "plan": {
    "op": "rank_areas",
    "params": {
      "signals": [
        {"key":"property.median_price","filter":{"lte":250000}},
        {"key":"property.price_change_pct_yoy","filter":{"gt":0}},
        {"key":"crime.total_12m","filter":{"percentile_lte":25}}
      ],
      "sort_by":{"signal":"property.price_change_pct_yoy","mode":"value","direction":"desc"},
      "country":"England","limit":5
    }
  },
  "plan_source": "nl",
  "results": [{"geo_type":"lsoa","geo_code":"E01...","value":182.4,"signals":{...}}],
  "meta": { "generated_at": "2026-05-31T..." }
}
```

### `POST /v1/peers`

Areas like this one. k-NN over normalized signal values, Euclidean dimension-mean-squared. Same capability via `/v1/query` with `op='find_peers'`.

**Body:**
- `target`: `{geo_code}` | `{postcode}` | `{area}` EXACTLY one
- `signals?`: `string[1..20]`, default = all signals target has normalized
- `country?`, `lad?`: scope candidates
- `k?`: default 20, max 200
- `min_signals?`: HAVING guard, default 3
- `cohort_id?`: Levers AR-198 named org peer cohort

**Response:** `PeersResponse` — `{ target:{geo_code, signals_used}, peers:[{geo_code, distance, n_dims_used}], meta }`. `distance ∈ [0,1]`.

### `POST /v1/insights`

Anomaly screening — LSOAs ranked by `ABS(peer_relative_z)` on a peer-relative-z derived signal. Reads materialised `signal_values`; expensive peer math is OFFLINE.

**Body:** `signal_key` (MUST end in `_peer_relative_z`), `country?`, `lad?`, `min_abs_z?` (default 0), `k?` (default 50, max 500).

**Response:** `{ signal_key, insights:[{geo_code, peer_relative_z (signed), abs_z}], meta:{generated_at, scope, threshold} }`. Ranked by abs_z DESC.

### `POST /v1/forecast`

Linear time-series projection for ONE signal at ONE LSOA. Linear regression (Postgres `regr_*`) over trailing `window_months`; project `horizon_months` forward. **NOT a learned model.** No ARIMA / Holt-Winters / Prophet / seasonality.

**Body:** `target` (same shape as peers), `signal_key`, `window_months?` (default 24, min 6, max 120), `horizon_months?` (default 12, max 60).

**Response:** `{ target:{geo_code}, signal_key, points:[{observed_period 'YYYY-MM', projected_value, lower_bound, upper_bound}], meta:{n_observations, r2, slope_per_month, intercept, residual_stderr, latest_observed_period, window_months, horizon_months} }`. **CI band = constant-width ±2 · residual_stderr; does NOT widen with horizon.**

## Compound grammar

**`rank_areas` compound** (the headline). `params`:
- `signals: [{ key, filter? }, ...]` — 1..8 entries
- Each filter is EXACTLY ONE operator from `{ eq, lt, lte, gt, gte, between, percentile_lt, percentile_lte, percentile_gt, percentile_gte, percentile_between }`. Strict single-key Zod unions reject combined ops.
- value-ops compare against `raw_value`; percentile-ops compare against `signal_percentiles.percentile` (0..100).
- **AND semantics** across `signals[]`: executor builds one INNER JOIN per signal + matching LEFT JOIN for percentile filters.
- Signal entry without filter still INNER JOINs (area must exist for that signal) but no WHERE constraint — useful for "include this column but don't filter."
- `sort_by.signal` MUST appear in `signals[].key` (Zod refinement). Default sort: `percentile_desc` on `signals[0]`.
- `country` scopes anchor `geo_code` (E/W/S prefix); `lad` scopes via `geo_lookup` JOIN. `limit` default 100, max 1000.
- Singular sugar shape (`{ signal, sort, min_percentile, max_percentile, min_value, max_value }`) coexists for back-compat.

**`find_peers`** grammar: target = exactly one of `{geo_code}` | `{postcode}` | `{area}`, optional `signals[]` (1..20, default = all target has normalized), country/lad scope, k=20 default (max 200), min_signals=3 default. Distance = `SQRT(AVG_i((t_i - c_i)^2))` over dimensions BOTH have normalized — Euclidean dimension-mean-squared, symmetric, bounded `[0,1]`, robust to missing dims. No per-signal weighting in v1.

**`find_insights`** grammar: `signal_key` MUST end in `_peer_relative_z` (parseInsightsInput enforces), optional country/lad, optional `min_abs_z` (default 0), k=50 default (max 500). Ranks LSOAs by `ABS(peer_relative_z) DESC`.

**`find_forecast`** grammar: target (same shape as peers), `signal_key` (any signal with monthly time-series), `window_months` (6..120, default 24), `horizon_months` (1..60, default 12). Methodology = linear regression via Postgres-native `regr_slope`/`regr_intercept`/`regr_r2`/`regr_syy` over the trailing window. CI is **CONSTANT-WIDTH**: lower/upper = `y_pred ± K · residual_stderr` where `K=2` (~95% under normal-residual assumption). The CI does NOT widen with horizon distance (textbook caveat acknowledged in ADR 0025).

## ICP value (compressed)

| ICP | One-line value |
|---|---|
| CRE / site selection ⭐ | Compound `rank_areas` AND-joins up to 8 constraints server-side with `sort_by` + country/LAD scope in one call; `find_peers` narrows to "areas like our best store" and the plan grammar IS version-controllable JSON to replay monthly. |
| Public sector | Every response echoes the executed plan + `plan_source` and dispatches to deterministic Postgres (no inference in executor); methodology, Zod schema, SQL and the 14-case corpus are all published — AI picks the query, never the numbers. |
| Lender | Three guarantees: published 92.9%/14-case accuracy baseline (Wilson CI ~70-99%), replayable executed plan per response, and `X-Engine-Version` methodology pin so quarterly runs are deterministic — auditable AI-assisted screening. |
| InsureTech | `find_peers` gives a stable symmetric similarity metric and `find_insights` ranks by `ABS(peer_relative_z)` so underwriters comp risk against a real peer group ("3.8σ from peers on crime"), with `cohort_id` to pin a custom peer set. |
| PropTech | `POST /v1/query` powers both NL area search (`{question}`) and pre-staged high-traffic queries (`{plan}`, no LLM cost) over one executor; `find_peers` is the "similar areas" tile — no planner or peer-graph cache to maintain. |

## Demo strategy

**Endpoint:** `POST /v1/query` with `{question}`

**Why this endpoint:** The showstopper. The whole pitch — typed plan grammar, AI as interface not answer, every result traces to deterministic SQL — collapses into one widget: paste a natural-language question, watch the planner emit a typed plan, see the rows that came out of the database, copy the plan and replay as a programmatic call. No other surface lands the dual-mode framing as viscerally. The 6 plan ops mean a small curated prompt list can demo the full surface.

**Response shape user sees:** Two panels side by side. **Left:** the executed plan JSON (`plan_source: 'nl'`). **Right:** typed results — for `rank_areas`, an AreaResult table; for `find_peers`, a peers list with distance + n_dims_used; for `find_forecast`, projected points with lower_bound/upper_bound and r2/n_observations. Below: "copy as cURL" showing the equivalent programmatic `{plan}` body. Visual punch line: **AI picked the query, the database produced the answer, and here's how to replay it without AI.**

**Postcode allowlist:** `M1 1AE, SW1A 1AA, EC1A 1BB, B1 1AA, L1 8JQ, LS1 1UR, NE1 1AD, BS1 4ST, G1 1XL, CF10 1EP` plus a **curated NL-prompt allowlist** (10–15 prompts from the eval corpus, e.g. "most deprived LSOAs in Manchester", "cheapest places to buy in England", "England areas under 250k AND rising YoY AND low crime", "areas similar to M1 1AE in England", "forecast median house price in M1 1AE next 12 months", "England LSOAs with anomalously high crime vs peers |z| >= 2").

**Rate-limit suggestion:** 3 requests / 60s per IP for `/v1/query` NL mode (lower than other surfaces — each call burns Anthropic LLM credit; proxy should also enforce curated prompt allowlist). 10 requests / 60s for `{plan}` mode demos (no LLM cost). 10 requests / 60s for standalone `/v1/peers`, `/v1/insights`, `/v1/forecast` demos.

## Methodology proof

- `/methodology section 9` (Intelligence query plane — 6 plan ops + dual input mode).
- `/methodology section 10` (Confidence — n_observations, r2, residual_stderr, abs_z, n_dims_used surfaced per response).
- **ADR 0017** — Intelligence v1: typed query plane. Plan grammar IS the API; planner vs executor separation; AiProvider seam; 422 with raw LLM output on invalid plan.
- **ADR 0019** — Multi-signal compound `rank_areas`. signals[] 1..8, filter operators, AND semantics via INNER JOIN, sort_by refinement. ~70-80% of ICP screening questions unlocked with no new endpoint.
- **ADR 0023** — `POST /v1/peers` (k-NN over normalised signals). Euclidean dimension-mean-squared, symmetric, bounded `[0,1]`, min_signals HAVING guard.
- **ADR 0024** — Peer-relative derived signals + `POST /v1/insights`. peer_assignments materialised (~840k rows), 2k-target chunking around Neon 5min HTTP cap.
- **ADR 0025** — `POST /v1/forecast` (linear projection). Postgres `regr_*`, constant-width CI `±2 · residual_stderr` (NOT widening), explicit non-claims (no ARIMA / Holt-Winters / Prophet / seasonality / outlier filtering, one signal one LSOA).
- **ADR 0026** — AI eval harness. 14-case curated corpus, comparePlans subset deep-diff, **92.9% baseline against claude-sonnet-4-20250514**, Wilson 95% CI ~70-99%, gated CLI behind `OGA_EVAL_PLAN`. Marketing copy MUST say "92.9% on a 14-case curated corpus" not "92.9% planner accuracy".

## Gotchas

1. **NOT a chatbot. NOT narrative.** Product never produces prose answers. LLM emits typed plan; database produces rows. `/v1/analyze` (narrative) explicitly deferred per ADR 0017.
2. **AI never sets the numbers.** Planner is constrained to picking one of 6 ops over a fixed `SUPPORTED_SIGNALS` list. Unknown ops/params REJECTED by Zod `.strict()`, never silently coerced.
3. **Forecast is LINEAR REGRESSION, not a learned model.** Postgres `regr_slope` / `regr_intercept` / `regr_r2` / `regr_syy` over trailing window. No ARIMA, Holt-Winters, Prophet, seasonality detection, outlier filtering, nonlinear trend. Do NOT claim "time-series ML" or "predictive model."
4. **Forecast CI is CONSTANT WIDTH:** `lower/upper = projected_value ± 2 · residual_stderr`. Band does NOT widen with horizon distance. Textbook extrapolation formula acknowledged in ADR 0025 as not implemented in v1.
5. Peers is **plain Euclidean** distance over normalised signal values, dimension-mean-squared. NOT cosine, NOT pgvector, NOT k-d tree. No per-signal weighting in v1 — every overlapping dimension counts equally.
6. **The 92.9% planner-accuracy number MUST always be qualified with "14-case curated corpus"** and ideally with the Wilson 95% CI (~70-99%). Reporting "92.9% planner accuracy" bare overstates precision (ADR 0026 explicitly calls this out).
7. The planner currently tested only against `claude-sonnet-4-20250514`. Anthropic flagged this model for EOL 2026-06-15 — harness measures the seam, not the model; headline number is provider-specific and needs a re-run on any swap.
8. **No OR / nested logic** on `rank_areas` in v1. "Affordable OR rising" is NOT expressible. AND semantics only. OR + aggregates deferred to Increment 4 per ADR 0019.
9. Compound `rank_areas` uses INNER JOINs across `signals[]`, so an area missing ANY filter signal in the store drops out. A signal listed WITHOUT a filter still INNER JOINs — leaving filter off does NOT make it optional. True LEFT-JOIN coalescing deferred.
10. `/v1/insights` `signal_key` MUST end in `_peer_relative_z`. `parseInsightsInput` enforces. Anomaly screening against a raw signal is a different question and a different surface.
11. **Multi-signal joint forecasting is OUT OF SCOPE.** One signal at a time. One LSOA at a time. No batch forecast endpoint — N LSOAs = N calls.
12. Bundle gating (Levers AR-195) on `/v1/query` inspects executed plan via `extractSignalKeysFromPlan`, BUT `get_area` and `score_area` plan ops currently BYPASS the bundle filter today. **Documented v1 gap** — should be called out honestly.
13. `find_peers` and `find_insights` gated by `guardSignals` / `OGA_SIGNALS_API` flag. `/v1/query` gated by `requireApiAccessWithOrg`. 404 (not 403) when flag off.
14. Eval harness is plan-level only — measures NL→plan correctness, NOT NL→plan→result correctness end-to-end. A plan that passes might still produce surprising results against a future data state.
15. **92.9% does NOT mean "gets every question right."** The one failing case (rank-compound-affordable-rising-safe) was signal-order variance inside a compound `signals[]` array — semantically equivalent, but corpus matcher is order-sensitive. Honest framing only.
