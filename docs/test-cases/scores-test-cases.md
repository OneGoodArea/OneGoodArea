# Scores API — Test Cases

> **Source:** OneGoodArea API (Engine v2.0.2)
> **Endpoint:** `POST /v1/score`
> **Last updated:** 2026-07-01

## Scope

Covers `POST /v1/score`, the deterministic composite-score product layered on top of the Signals primitive. Includes: scoring by preset, custom weight overrides, org-saved presets (`preset_id`, Levers), the mutual-exclusivity rule between `preset_id` and `preset`/`weights`, weight validation, area resolution, the bundle gate, the `explain` flag, engine-version stamping / determinism, and the shared Bearer-auth gate. Scoring is fully deterministic — the frozen v2 engine produces per-dimension scores and there is **no AI** in the path. Does **not** cover the raw signals endpoints (see `signals-test-cases.md`).

Like the signals routes, `POST /v1/score` is hard-gated by `signalsApiEnabled`; when off it returns `404 { "error": "Not found" }` before auth.

### Source files validated against

| Layer | File |
|-------|------|
| Route handler | `apps/api/src/routes/scoring.ts` |
| Scoring orchestration (parse + aggregate) | `apps/api/src/modules/scoring/score.ts` |
| Frozen engine (v2) | `apps/api/src/modules/engine/scoring-engine/v2.ts` |
| Engine resolver / entry | `apps/api/src/modules/engine/scoring-engine/index.ts` |
| Engine version pinning | `apps/api/src/modules/engine/version.ts` |
| Methodology version registry | `apps/api/src/modules/engine/methodology.ts` |
| Version stamp helper | `apps/api/src/shared/bundles.ts` |
| Bearer auth / gate | `apps/api/src/shared/auth-api.ts` |
| Org preset resolver | `apps/api/src/modules/orgs/presets.ts` |
| Score request / result contracts | `packages/contracts/src/scores.ts` |

### Presets and their dimension keys (`PRESET_DIMENSION_KEYS`)

Custom `weights` may only target the keys of the chosen preset (each preset uses a **different** five-dimension set):

| Preset | Dimension keys |
|--------|----------------|
| `moving` | `safety_crime`, `schools_education`, `transport_commute`, `daily_amenities`, `cost_of_living` |
| `business` | `foot_traffic_demand`, `competition_density`, `transport_access`, `local_spending_power`, `commercial_costs` |
| `investing` | `price_growth`, `rental_yield`, `regeneration_infrastructure`, `tenant_demand`, `risk_factors` |
| `research` | `safety_crime`, `transport_links`, `amenities_services`, `demographics_economy`, `environment_quality` |

Default preset when omitted: **`research`**.

### Auth gate (`requireApiAccessWithOrg`)

Same order as the signals routes: `401` missing key ("Missing API key. Use: Authorization: Bearer oga_...") → `401` invalid/revoked ("Invalid or revoked API key") → `403 ip_not_allowed` → `429` rate limit ("Too many requests. Rate limit: 30 requests per minute.") → `403` no API access ("API access not available on your current plan. Upgrade at /pricing.").

---

## 1. Happy path & response shape

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-01** | Score with default preset | 1. `POST /v1/score` body `{ "area": "M1 1AE" }` with a valid Bearer key | `200`. `preset` = `"research"`. Body: `{ area, preset, score (0–100), area_type, dimensions[], confidence (0–1), weights_source, engine_version }`. `weights_source` = `"preset"`. |
| **SCORE-02** | Score with explicit preset | 1. Body `{ "area": "M1 1AE", "preset": "business" }` | `200`. `preset` = `"business"`. `dimensions[].key` are the business dimension keys. |
| **SCORE-03** | Dimension shape | 1. Inspect any element of `dimensions[]` | `{ key, label, score (0–100), weight, confidence (0–1), reasoning, confidence_reason }`. `reasoning` and `confidence_reason` come straight from the engine (not LLM-generated). |
| **SCORE-04** | `engine_version` stamped in body | 1. Inspect `engine_version` in the response body | Equals `METHODOLOGY_VERSION` = `"2.0.2"`. |
| **SCORE-05** | `X-Engine-Version` response header | 1. Inspect the response header | Set from the caller's org methodology pin (via `effectiveEngineVersionForCaller`), defaulting to `"2.0.2"` when no pin is set. |
| **SCORE-06** | Aggregate confidence is weighted | 1. Inspect `confidence` | 0–1, the weight-weighted average of the dimension confidences (rounded to 2 dp). |

---

## 2. Custom weights

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-10** | Valid custom weights | 1. Body `{ "area": "M1 1AE", "preset": "moving", "weights": { "safety_crime": 3, "schools_education": 1 } }` | `200`. `weights_source` = `"custom"`. Only the aggregation changes; per-dimension `score` values are identical to the preset run (weights re-weight, they don't rescore). Unspecified dimensions keep their preset default weight. |
| **SCORE-11** | Unknown dimension key | 1. Body with `weights: { "not_a_dim": 2 }` for preset `moving` | `400 { "error": "Unknown dimension 'not_a_dim' for preset 'moving'. Valid: safety_crime, schools_education, transport_commute, daily_amenities, cost_of_living." }`. |
| **SCORE-12** | Wrong-preset dimension key | 1. Preset `research` with a `business` key, e.g. `weights: { "rental_yield": 2 }` | `400` unknown-dimension error (keys are validated against the chosen preset's set). |
| **SCORE-13** | Non-positive weight | 1. `weights: { "safety_crime": 0 }` (or a negative) | `400 { "error": "weight for 'safety_crime' must be a positive number." }`. |
| **SCORE-14** | Non-numeric weight | 1. `weights: { "safety_crime": "high" }` | `400 { "error": "weight for 'safety_crime' must be a positive number." }`. |
| **SCORE-15** | Empty weights object | 1. `weights: {}` | `400 { "error": "weights cannot be empty." }`. |
| **SCORE-16** | `weights` not an object | 1. `weights: [1,2,3]` or `weights: "x"` | `400 { "error": "weights must be an object mapping dimension keys to positive numbers." }`. |

---

## 3. Org-saved presets (`preset_id`, Levers AR-196)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-20** | Score with a saved `preset_id` | 1. Body `{ "area": "M1 1AE", "preset_id": "<saved id>" }` for the caller's org | `200`. The saved preset resolves to its `base_preset` + `weights`; `weights_source` = `"custom"` (saved presets are custom weights). The `preset_id` is recorded on the `api.score.computed` activity event. |
| **SCORE-21** | `preset_id` + `preset` together | 1. Body `{ "area": "...", "preset_id": "x", "preset": "moving" }` | `422 { "error": "preset_id is mutually exclusive with preset / weights.", "code": "preset_id_conflict" }`. |
| **SCORE-22** | `preset_id` + `weights` together | 1. Body `{ "area": "...", "preset_id": "x", "weights": { "safety_crime": 2 } }` | `422 { "code": "preset_id_conflict" }`. |
| **SCORE-23** | `preset_id` not found in org | 1. Body with a `preset_id` that doesn't exist for the org | `404 { "error": "Preset not found in your org." }`. |
| **SCORE-24** | `preset_id` with no resolvable org | 1. Legacy key (`org_id = NULL`, no owner org) + `preset_id` | `422 { "error": "Cannot resolve preset_id: caller has no resolvable org context.", "code": "no_org_context" }`. |

---

## 4. Area validation & bundle gate

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-30** | Missing `area` | 1. Body `{}` or `{ "preset": "moving" }` | `400 { "error": "Missing required 'area' (a UK postcode or place name)." }`. |
| **SCORE-31** | Unresolvable area | 1. Body `{ "area": "Zzzxyq" }` (cannot geocode) | `404 { "error": "Could not resolve area \"Zzzxyq\". Provide a UK postcode or place name." }`. |
| **SCORE-32** | Invalid preset value | 1. Body `{ "area": "M1 1AE", "preset": "buying" }` | `400 { "error": "preset must be one of: moving, business, investing, research." }`. |
| **SCORE-33** | Bundle gate nulls out-of-bundle sources | 1. Body `{ "area": "M1 1AE" }` with `?bundle=<id>` (or `bundle` in body) | `200`. Sources whose category prefixes have no signal in the bundle are nulled before scoring; the engine collapses those dimensions to 0-confidence and the composite is computed over the survivors. `X-Bundle-Applied: <id>` header set. |
| **SCORE-34** | Bundle not found / no org context | 1. `?bundle=nope`; then legacy key with no org | `404 "Bundle not found in your org."`; `422 { "code": "no_org_context" }`. |

---

## 5. `explain` flag (AR-363)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-40** | `explain` via query param | 1. `POST /v1/score?explain=true` body `{ "area": "M1 1AE" }` | `200`. Response additionally includes `summary` (string), `recommendations[]`, and `data_sources[]`, all server-composed from real engine state (no client/LLM synthesis). |
| **SCORE-41** | `explain` via body | 1. Body `{ "area": "M1 1AE", "explain": true }` | Same enriched response. Query param, when present, takes precedence over the body value. |
| **SCORE-42** | Default (no `explain`) | 1. Body `{ "area": "M1 1AE" }` | `summary` / `recommendations` / `data_sources` are omitted (narrow primitive shape preserved). |
| **SCORE-43** | Invalid `explain` query value | 1. `POST /v1/score?explain=maybe` | `400 { "error": "explain query param must be 'true' or 'false'." }`. |
| **SCORE-44** | Invalid `explain` body value | 1. Body `{ "area": "...", "explain": "maybe" }` | `400 { "error": "explain must be a boolean." }`. |

---

## 6. Determinism & engine version

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-50** | Determinism / repeatability | 1. Send the same request body twice (same area, preset, weights) | Identical `score` and per-dimension `score` values. Engine is frozen v2, golden-master tested, no randomness, no AI. |
| **SCORE-51** | Custom weights don't change dimension scores | 1. Compare a preset run vs. a custom-weights run for the same area | Per-dimension `score` values are unchanged; only the overall `score` and `weights_source` differ (weights affect aggregation only). |
| **SCORE-52** | Version stamp is consistent | 1. Compare body `engine_version` and the `X-Engine-Version` header (no org pin) | Both report `"2.0.2"` (`METHODOLOGY_VERSION`). |
| **SCORE-53** | Org methodology pin drives the header | 1. Caller's org has a valid v2.x methodology pin set | `X-Engine-Version` echoes the pinned version (resolved via `resolveEngineVersion`); body `engine_version` still reflects what the engine produced. |
| **SCORE-54** | Per-request `X-Engine-Version` header is not honoured | 1. Send request header `X-Engine-Version: 2.0.0` | The per-request override was retired with `/v1/report` (AR-324); the response stamp is driven only by the org pin / latest. Supported versions remain `2.0.0`, `2.0.1`, `2.0.2`. |

---

## 7. Auth gate & endpoint availability

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SCORE-60** | Missing API key | 1. `POST /v1/score` with no `Authorization` header | `401 { "error": "Missing API key. Use: Authorization: Bearer oga_..." }`. |
| **SCORE-61** | Invalid / revoked key | 1. `Authorization: Bearer oga_invalid` | `401 { "error": "Invalid or revoked API key" }`. |
| **SCORE-62** | IP not in allowlist | 1. Key with an `allowed_ip_cidrs` excluding the caller IP | `403 { "code": "ip_not_allowed" }`. |
| **SCORE-63** | Rate limited | 1. Exceed 30 requests/minute for the key | `429 { "error": "Too many requests. Rate limit: 30 requests per minute." }`. |
| **SCORE-64** | Plan without API access | 1. Valid key on a plan lacking API access | `403 { "error": "API access not available on your current plan. Upgrade at /pricing." }`. |
| **SCORE-65** | Endpoint disabled | 1. `signalsApiEnabled` off | `404 { "error": "Not found" }` (before auth). |
| **SCORE-66** | Server error path | 1. Force an unexpected engine/DB failure | `500 { "error": "Internal server error" }`; typed `AppError`s surface as `{ error, code }` with their own status. |

---

## Test Environment Notes

- **Auth:** Bearer API key via `requireApiAccessWithOrg` (returns `{ userId, orgId, trainingOptout }`).
- **Rate limit:** per-key `apiReport` budget, 30 requests/minute → `429`.
- **Determinism:** the scoring engine is the frozen v2 module (`scoring-engine/v2.ts`), golden-master tested; custom `weights` only re-aggregate the engine's per-dimension scores (`applyWeights`).
- **Engine version:** `2.0.2` (`METHODOLOGY_VERSION`); supported pins `2.0.0`/`2.0.1`/`2.0.2` are score-equivalent (patches changed only confidence metadata).
- **Training capture:** on `explain=true` paths only, a brief-composer training row is inserted (respecting `trainingOptout`); plain score responses are not captured.
</content>
