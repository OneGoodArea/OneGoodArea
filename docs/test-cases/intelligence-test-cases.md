# Intelligence (Query Plane) — Test Cases

> **Source:** OneGoodArea API (Engine v2.0.2)
> **Endpoints covered:** `POST /v1/query`, `POST /v1/peers`, `POST /v1/insights`, `POST /v1/forecast`
> **Last updated:** 2026-07-01

## Scope

Covers the Intelligence surface — the query plane and its three standalone analytical endpoints. `POST /v1/query` runs a query **plan** either directly (programmatic mode, LLM never touched) or by translating a natural-language **question** into a Zod-validated plan (NL mode) and running the same deterministic executor; the plan + `plan_source` are echoed back for audit/replay. `POST /v1/peers` (k-NN), `POST /v1/insights` (peer-relative-z anomaly screening), and `POST /v1/forecast` (linear projection) expose the same handlers the executor dispatches to, standalone. Levers (org bundles + cohorts) gating is covered where the routes wire it. Does **not** cover the scoring engine or the data-refresh jobs.

All Intelligence routes are dark-flagged behind the `OGA_SIGNALS_API` feature flag (`getConfig().signalsApiEnabled`) and return **404** when disabled. All use `requireApiAccessWithOrg` (auth → per-key rate limit → plan API access, plus org context resolution).

### Source files validated against

| Layer | File |
|-------|------|
| Intelligence route handlers | `apps/api/src/routes/intelligence.ts` |
| Query-plane entry (runQuery / parse) | `apps/api/src/modules/intelligence/index.ts` |
| NL planner (prompt + Zod validation) | `apps/api/src/modules/intelligence/planner.ts` |
| Deterministic executor (plan dispatch) | `apps/api/src/modules/intelligence/executor.ts` |
| Cross-area query (rank_areas) | `apps/api/src/modules/signals/query.ts` |
| Peers (k-NN) | `apps/api/src/modules/signals/peers.ts` |
| Insights (peer-relative-z) | `apps/api/src/modules/signals/insights.ts` |
| Forecast (linear projection) | `apps/api/src/modules/signals/forecast.ts` |
| Auth / rate-limit / plan gate + org | `apps/api/src/shared/auth-api.ts` |
| Intelligence DTOs (contracts) | `packages/contracts/src/intelligence.ts` |

### Key constants (from code)

- Peers: `PEERS_DEFAULT_K = 20`, `PEERS_MAX_K = 200`, `PEERS_DEFAULT_MIN_SIGNALS = 3`, `PEERS_MAX_SIGNALS = 20`
- Insights: `INSIGHTS_DEFAULT_K = 50`, `INSIGHTS_MAX_K = 500`; `signal_key` must end in `_peer_relative_z`
- Forecast: `FORECAST_DEFAULT_WINDOW = 24`, `FORECAST_DEFAULT_HORIZON = 12`, `FORECAST_MIN_WINDOW = 6`, `FORECAST_MAX_WINDOW = 120`, `FORECAST_MAX_HORIZON = 60`, CI = ±2·residual_stderr (constant width)
- Plan ops: `rank_areas` (singular + compound), `get_area`, `score_area`, `compare_areas`, `find_peers`, `find_insights`, `find_forecast`
- `plan_source` ∈ `{ "client", "nl" }`

---

## 1. Feature Gate & Auth

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **INTEL-GATE-01** | Signals API disabled → 404 | 1. `OGA_SIGNALS_API=false`<br>2. Call any of `/v1/query`, `/v1/peers`, `/v1/insights`, `/v1/forecast` | **404** `{ error: "Not found" }` before auth runs. |
| **INTEL-GATE-02** | Missing Bearer token → 401 | 1. Enable flag<br>2. `POST /v1/query` with no auth | **401** `{ error: "Missing API key. Use: Authorization: Bearer oga_..." }`. |
| **INTEL-GATE-03** | Invalid / revoked key → 401 | 1. Send a bad Bearer token | **401** `{ error: "Invalid or revoked API key" }`. |
| **INTEL-GATE-04** | IP not in allowlist → 403 | 1. Key with `allowed_ip_cidrs` from a disallowed IP | **403** `{ error: "Request IP is not in the key's allowlist.", code: <blocked> }`. |
| **INTEL-GATE-05** | No plan API access → 403 | 1. Key on a plan without API access | **403** `{ error: "API access not available on your current plan. Upgrade at /pricing." }`. |
| **INTEL-GATE-06** | Per-key rate limit → 429 | 1. Exceed `RATE_LIMITS.apiReport` (30/min) | **429** `{ error: "Too many requests. Rate limit: 30 requests per minute." }`. |

---

## 2. Query — Programmatic Plan (`POST /v1/query`)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **QUERY-01** | rank_areas singular happy path | 1. Body `{ "plan": { "op": "rank_areas", "params": { "signal": "property.median_price", "country": "England", "sort": "value", "limit": 20 } } }` | **200** `{ plan, plan_source: "client", results: [AreaResult...], meta }`. LLM never invoked. `X-Engine-Version` header set. `api.query.executed` tracked with `op` + `plan_source: "client"`. |
| **QUERY-02** | rank_areas compound (multi-signal AND) | 1. Plan with `params.signals: [{key, filter:{lte:250000}}, {key, filter:{percentile_lte:50}}]` + `sort_by` | **200**. Results carry per-signal `signals` map plus top-level value/normalized/percentile mirroring the sort signal. AND semantics (areas missing any required signal drop out). |
| **QUERY-03** | Plan echoed back for replay | 1. Any successful programmatic call<br>2. Inspect response `.plan` | The exact submitted plan is returned unchanged with `plan_source: "client"`, so the caller can replay it verbatim. |
| **QUERY-04** | get_area op | 1. Plan `{ "op": "get_area", "params": { "area": "M1 1AE" } }` | **200** with `results` = the area profile (or `null` if unresolved). |
| **QUERY-05** | score_area op | 1. Plan `{ "op": "score_area", "params": { "area": "SW1A 1AA", "preset": "investing" } }` | **200** with `results` = a score result (preset defaults to `research`). |
| **QUERY-06** | compare_areas op | 1. Plan `{ "op": "compare_areas", "params": { "areas": ["M1 1AE", "EC1A 1BB"] } }` | **200** with `results.areas[]` — one slot per input, in order; unresolved slots kept as `{ query, profile: null }` (never silently dropped). |
| **QUERY-07** | find_peers via query plane | 1. Plan `{ "op": "find_peers", "params": { "target": { "postcode": "M1 1AE" }, "k": 20 } }` | **200** with `results.peers[]`. `results: null` if target unresolved or has no normalized signals (query plane preserves the null shape; standalone `/v1/peers` maps that to 404 — see PEER-08). |
| **QUERY-08** | find_insights via query plane | 1. Plan `{ "op": "find_insights", "params": { "signal_key": "crime.total_12m_peer_relative_z", "k": 50 } }` | **200** with `results.insights[]` + `results.meta.scope`/`threshold`. |
| **QUERY-09** | find_forecast via query plane | 1. Plan `{ "op": "find_forecast", "params": { "target": { "postcode": "M1 1AE" }, "signal_key": "property.median_price", "horizon_months": 12 } }` | **200** with `results.points[]` + regression meta. `results: null` when <2 monthly observations. |
| **QUERY-10** | Ambiguous place name → 422 | 1. Plan `get_area`/`find_peers`/etc. with a colliding place name (e.g. `{ "area": "Brixton" }` resolving to multiple postcodes) | **422** `{ error: "Place name \"...\" is ambiguous...", code: "ambiguous_location", candidates: [...] }`. Postcodes never trigger this. |

---

## 3. Query — Natural Language (`POST /v1/query`)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **QUERY-11** | NL question → plan → results | 1. Body `{ "question": "cheapest places to buy in England" }` | **200** `{ plan, plan_source: "nl", results, meta }`. Planner translates the question to a validated plan, then the SAME executor runs it. Response shape identical to programmatic. |
| **QUERY-12** | NL plan is Zod-validated | 1. Ask an NL question<br>2. Inspect the returned `.plan` | The plan validates against `QueryPlanSchema` (strict). If the model emits an invalid/unknown-op plan, it fails validation (see QUERY-14). |
| **QUERY-13** | Planner returns non-JSON → 422 | 1. Force the model to emit prose (no JSON object) | **422** `{ error, code: "no_json", raw }` — the raw LLM output is echoed for transparency. |
| **QUERY-14** | Planner emits invalid plan → 422 | 1. Model emits JSON that fails `QueryPlanSchema` (unknown op / extra field) | **422** `{ error, code: "invalid_plan", raw }`. |
| **QUERY-15** | LLM provider unavailable → 422 | 1. NL question with `ANTHROPIC_API_KEY` missing/unset | **422** `{ error, code: "llm_error" }` (construction failure is a typed error, not a 500). |
| **QUERY-16** | NL request captured for training | 1. Send an NL question (org not opted out) | A planner-log row is inserted AFTER the response (never adds to user-visible latency). Programmatic `{plan}` calls are NOT logged as training data. |
| **QUERY-17** | Training opt-out respected | 1. Key/org with `trainingOptout = true`<br>2. Send NL question | No planner-log capture. |

---

## 4. Query — Validation & Bundle Gating

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **QUERY-18** | Neither question nor plan → 400 | 1. Body `{}` | **400** `{ error: "Provide exactly one of {question} or {plan}. ..." }` (Zod union rejects). |
| **QUERY-19** | Both question and plan → 400 | 1. Body `{ "question": "x", "plan": {...} }` | **400** — the strict union permits exactly one (the other must be `undefined`). |
| **QUERY-20** | Empty question string → 400 | 1. Body `{ "question": "" }` | **400** (`question` is `.min(1)`). |
| **QUERY-21** | Unknown field in plan → 400 | 1. Plan object with an extra unrecognized key | **400** — every plan object is `.strict()`, so unknown params are rejected, never coerced. |
| **QUERY-22** | Bundle whitelist enforced (Levers) | 1. `?bundle=<id>` or body `bundle`<br>2. Executed plan references a signal outside the bundle whitelist | **422** `{ error: "Plan references signals not in bundle: ...", code: "bundle_signal_not_allowed", plan }`. Gating happens AFTER planning (applies to both programmatic + NL plans). |
| **QUERY-23** | Bundle allows in-whitelist signals | 1. `?bundle=<id>`<br>2. Plan references only whitelisted signals | **200** normal result. |

---

## 5. Peers — `POST /v1/peers` (k-NN)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **PEER-01** | Peers by geo_code | 1. Body `{ "target": { "geo_code": "E01034129" } }` | **200** `{ target: { geo_code, signals_used }, peers: [...], meta: { generated_at, scope } }`. Default `k = 20`. Peers ranked ascending by `distance`. |
| **PEER-02** | Peers by postcode | 1. Body `{ "target": { "postcode": "M1 1AE" } }` | **200**; postcode geocoded to an LSOA first; `scope` shows `postcode=... -> lsoa=...`. |
| **PEER-03** | Peers by area / place name | 1. Body `{ "target": { "area": "Manchester" } }` | **200**; area geocoded to LSOA. Unresolvable → **404** `{ error: "Could not resolve \"...\" to an LSOA." }`. |
| **PEER-04** | Missing target object | 1. Body `{}` | **400** `{ error: "Missing 'target' object. Provide as nested: {target: {geo_code...}} OR {postcode} OR {area}." }`. |
| **PEER-05** | Target must have exactly one key | 1. Body `{ "target": { "geo_code": "E01...", "postcode": "M1 1AE" } }` | **400** `{ error: "target must contain EXACTLY one of {geo_code, postcode, area}." }`. |
| **PEER-06** | Custom k | 1. Body `{ "target": {...}, "k": 10 }` | **200** with up to 10 peers. |
| **PEER-07** | k clamped to max | 1. Body `{ "k": 500 }` | Clamped to `PEERS_MAX_K = 200` (no error). Non-integer/<1 → **400** `{ error: "k must be a positive integer." }`. |
| **PEER-08** | Target has no normalized signals → 404 | 1. Target LSOA with no normalized signal values | **404** `{ error: "Target ... has no normalized signal values yet; cannot compute peers." }` (`signalsUsed` empty). |
| **PEER-09** | Explicit signals subset | 1. Body `{ "target": {...}, "signals": ["crime.total_12m", "property.median_price"] }` | Distance computed only over the intersection of those signals with what the target has. >20 signals → **400**; empty array → **400**. |
| **PEER-10** | min_signals overlap guard | 1. Body `{ "min_signals": 5 }` | Candidates must overlap on ≥5 dimensions (`HAVING COUNT(*) >= min_signals`). Default 3. Non-integer/<1 → **400**. |
| **PEER-11** | country scope | 1. Body `{ "country": "England" }` (case-insensitive) | Candidate set filtered by LSOA prefix (E/W/S). Invalid country → **400** `{ error: "country must be one of: England, Wales, Scotland (case-insensitive)." }`. |
| **PEER-12** | cohort_id filter (Levers) | 1. Body `{ "target": {...}, "cohort_id": "<slug/id>" }` | Candidate set restricted to the cohort's `geo_codes`; `scope` shows `cohort=<slug> (n=...)`. Target may be outside the cohort. |
| **PEER-13** | cohort_id with no org context → 422 | 1. `cohort_id` set, caller has no resolvable org (no api-key org, not owner of any org) | **422** `{ error: "Cannot resolve cohort_id: caller has no resolvable org context.", code: "no_org_context" }`. |
| **PEER-14** | cohort_id not found in org → 404 | 1. `cohort_id` that doesn't exist in the caller's org | **404** `{ error: "Cohort not found in your org." }`. |
| **PEER-15** | Peer place-context enrichment | 1. Successful peers call<br>2. Inspect a peer row | Each peer: `{ geo_code, distance, n_dims_used, admin_district, region, sample_postcode }` (last three nullable; postcodes.io overlays canonical names, geo_lookup is fallback). |

---

## 6. Insights — `POST /v1/insights` (peer-relative-z anomaly)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **INTEL-INS-01** | Insights happy path | 1. Body `{ "signal_key": "crime.total_12m_peer_relative_z", "country": "England", "k": 20 }` | **200** `{ signal_key, insights: [...], meta: { generated_at, scope, threshold } }`. Ranked by `abs_z` DESC. `X-Engine-Version` = `METHODOLOGY_VERSION`. `api.insights.queried` tracked. |
| **INTEL-INS-02** | Insight row shape | 1. Inspect an `insights[]` row | `{ geo_code, peer_relative_z (signed), abs_z (magnitude) }`. Sign of `peer_relative_z` tells the direction of the anomaly. |
| **INTEL-INS-03** | Missing signal_key → 400 | 1. Body `{}` | **400** `{ error: "Missing required 'signal_key' (a peer-relative-z signal, e.g. 'crime.total_12m_peer_relative_z' ...)." }`. |
| **INTEL-INS-04** | signal_key without _peer_relative_z suffix → 400 | 1. Body `{ "signal_key": "crime.total_12m" }` | **400** — message spells out the suffix requirement and suggests `crime.total_12m_peer_relative_z`; base signal queryable via `/v1/area`. |
| **INTEL-INS-05** | Wrong field name `signal` → 400 | 1. Body `{ "signal": "crime.total_12m" }` (uses `signal` not `signal_key`) | **400** `{ error: "Field name is 'signal_key' (not 'signal')...", code: "wrong_field_name" }` (AR-391 friendly hint). |
| **INTEL-INS-06** | min_abs_z threshold | 1. Body `{ "signal_key": "...", "min_abs_z": 2 }` | Only rows with `ABS(raw_value) >= 2` returned; `meta.threshold: 2`. Negative → **400** `{ error: "min_abs_z must be a non-negative number." }`. |
| **INTEL-INS-07** | k default + clamp | 1. Omit `k` → default 50<br>2. `k: 1000` → clamped to `INSIGHTS_MAX_K = 500` | Defaults/clamps applied. Non-integer/<1 → **400** `{ error: "k must be a positive integer." }`. |
| **INTEL-INS-08** | country / lad scope | 1. Body with `country` and/or `lad` | Scope reflected in `meta.scope` (e.g. `country=England lad=E08000003`); default `"national"`. Invalid country → **400**. |

---

## 7. Forecast — `POST /v1/forecast` (linear projection)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **FCST-01** | Forecast happy path | 1. Body `{ "target": { "postcode": "M1 1AE" }, "signal_key": "property.median_price", "horizon_months": 12 }` | **200** `{ target: { geo_code }, signal_key, points: [...], meta }`. Default window 24, horizon 12. `X-Engine-Version` = `METHODOLOGY_VERSION`. `api.forecast.queried` tracked. |
| **FCST-02** | Point shape + confidence interval | 1. Inspect a `points[]` entry | `{ observed_period ("YYYY-MM"), projected_value, lower_bound, upper_bound }`. Band = `projected_value ± 2·residual_stderr` (constant-width; does NOT widen with horizon — v1 tradeoff, ADR 0025). |
| **FCST-03** | Regression meta returned | 1. Inspect `meta` | `{ generated_at, scope, window_months, horizon_months, n_observations, r2, slope_per_month, intercept, residual_stderr, latest_observed_period }`. |
| **FCST-04** | Missing target → 400 | 1. Body without `target` | **400** `{ error: "Missing 'target' object..." }`. |
| **FCST-05** | Target not exactly one key → 400 | 1. `target` with 0 or 2 of {geo_code, postcode, area} | **400** `{ error: "target must contain EXACTLY one of {geo_code, postcode, area}." }`. |
| **FCST-06** | Unresolvable postcode/area → 404 | 1. `target: { area: "Nowheresville" }` | **404** `{ error: "Could not resolve \"...\" to an LSOA." }`. |
| **FCST-07** | Missing signal_key → 400 | 1. Body `{ "target": {...} }` no `signal_key` | **400** `{ error: "Missing required 'signal_key'." }`. |
| **FCST-08** | Insufficient time-series → 404 | 1. signal/LSOA with <2 monthly observations in the window | **404** `{ error: "No usable time-series for signal_key=... at ... in the trailing N months (need >=2 monthly observations)." }`. |
| **FCST-09** | window_months bounds | 1. `window_months: 3` (< min 6)<br>2. `window_months: 200` (> max 120) | (1) **400** `{ error: "window_months must be an integer >= 6." }`. (2) clamped to 120. |
| **FCST-10** | horizon_months bounds | 1. `horizon_months: 0`<br>2. `horizon_months: 100` (> max 60) | (1) **400** `{ error: "horizon_months must be a positive integer." }`. (2) clamped to 60. |
| **FCST-11** | Custom window + horizon | 1. Body `{ "window_months": 36, "horizon_months": 6 }` | **200**; regression fit over trailing 36 months, 6 projected points. |

---

## Test Environment Notes

- **API surface:** Fastify, `/v1/*` Bearer-authenticated routes.
- **Feature flag:** `OGA_SIGNALS_API=true` required; otherwise all four endpoints return 404.
- **Auth:** `requireApiAccessWithOrg` = authenticate → per-key rate limit (`RATE_LIMITS.apiReport`, 30/min) → plan API access, plus `{ userId, orgId, trainingOptout }` resolution.
- **Query plane:** programmatic `{plan}` skips the LLM; NL `{question}` runs the planner then the SAME executor. `plan` + `plan_source` (`client`|`nl`) echoed for audit/replay.
- **Strictness:** `QueryRequestSchema` is a strict union (exactly one of question/plan); `QueryPlanSchema` objects are `.strict()` (unknown ops/params rejected).
- **Typed error codes:** `no_json`, `invalid_plan`, `llm_error` → 422; `ambiguous_location` → 422 (+candidates); `bundle_signal_not_allowed` → 422; `no_org_context` → 422; `wrong_field_name` → 400.
- **Engine version header:** `/v1/query` uses `effectiveEngineVersionForCaller`; `/v1/insights` + `/v1/forecast` use `METHODOLOGY_VERSION`.
- **Error envelope:** app errors → `{ error, code }`; unexpected → 500 `{ error: "Internal server error" }`.
