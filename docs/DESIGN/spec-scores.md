# Product spec — Scores

> Part of [AR-204 product-pages spec pack](./AR-204-product-pages-spec-pack.md).

## Thesis

Scores is the deterministic composite layer on top of Signals: a `POST /v1/score` endpoint that takes an area and a preset (`moving` | `business` | `investing` | `research`) and returns a single 0-100 score, every per-dimension component that produced it, the weight applied to each, the per-dimension confidence, and the engine_version that ran. Each preset selects a **DIFFERENT** five-dimension set — `moving` is about safety + schools + commute + amenities + cost; `investing` is about price growth + yield + regeneration + tenant demand + risk — so customising the score means re-weighting that preset's dimensions, not redefining them. The engine is frozen v2, golden-tested, and never gets touched by AI; caller-supplied weights only change the aggregation, which happens outside the engine via `applyWeights`. Levers stack on top: a per-org saved preset (`preset_id`, ADR 0030) replaces the `{base_preset, weights}` payload on every call; an org-level methodology pin (ADR 0031) stamps a chosen engine_version on every response header until the compliance team flips it. The whole surface exists so a regulated buyer's underwriting model — or a PropTech app's area-quality UI — can run on a versioned, configurable, transparent number that's reproducible deploy-to-deploy.

## Primitive contract

**Zod source:** `packages/contracts/src/scores.ts` — `ScoreResultSchema` (response DTO) + `ScoreDimensionSchema` (per-dimension shape). Saved-preset shapes: `packages/contracts/src/presets.ts`. Methodology-pin shapes: `packages/contracts/src/methodology.ts`.

| Field | Type | Description | Example |
|---|---|---|---|
| `area` | string | Resolved area echoed after server validation + geocoding. | `"M1 1AE"` |
| `preset` | enum (`moving` / `business` / `investing` / `research`) | Selects the 5-dimension set. | `"research"` |
| `score` | number (0-100, integer) | Weighted average of the 5 dimension scores, rounded. | `62` |
| `area_type` | enum (urban / suburban / rural) | Drives area-type benchmarks inside `computeScores`. | `"urban"` |
| `dimensions` | `ScoreDimension[5]` | The 5 per-dimension components. | `[{ key, label, score, weight, confidence }]` |
| `dimensions[].key` | string | Stable slug — override target for caller-supplied weights. | `"safety_crime"` |
| `dimensions[].label` | string | Human-readable label (source of truth for the slug via `dimensionKey()`). | `"Safety & Crime"` |
| `dimensions[].score` | number (0-100) | Deterministic per-dimension score. Caller weights NEVER touch this — they change aggregation only. | `70` |
| `dimensions[].weight` | positive number | Effective weight — preset default unless overridden. | `20` |
| `dimensions[].confidence` | number (0-1) | Rubric: HIGH (1.0) primary, MEDIUM (0.7) partial fallback, LOW (0.4) full proxy, NONE (0.2) missing. Variance-aware on property-backed dims (2.0.1 rubric — wide YoY swings cap at MEDIUM). | `0.9` |
| `confidence` | number (0-1) | Weight-weighted aggregate across the 5 dimensions. | `0.8` |
| `weights_source` | enum (`preset` / `custom`) | Provenance. `preset` = preset's default weights. `custom` = caller-supplied weights OR a resolved saved `preset_id`. There is **NO** `saved_preset` value. | `"preset"` |
| `engine_version` | string | The version the engine actually ran (METHODOLOGY_VERSION at request time). Body stamp. Distinct from `X-Engine-Version` response header which carries auditor's pin. | `"2.0.2"` |

## Under the hood

**Store or compute?** Hybrid, leaning compute. Each `/v1/score` call runs `scoreArea(query)` (apps/api/src/modules/scoring/score.ts): (1) `fetchAreaSources` from modules/signals — which serves deprivation + property + crime from the store when available, falling back to live source fetches; (2) `computeScores` runs the **FROZEN v2 deterministic engine** for the chosen preset and returns the 5 per-dimension scores + per-dim confidence; (3) `applyWeights` re-aggregates with effective weights (preset default OR caller override OR saved-preset weights) — this is the pure step where custom weights enter, never touching the engine. Dark-flagged behind `OGA_SIGNALS_API`.

**Lineage.** Body `engine_version` carries METHODOLOGY_VERSION (today `2.0.2`). Response header `X-Engine-Version` carries the EFFECTIVE pin via `effectiveEngineVersionForCaller(orgId, userId)` — precedence: explicit `X-Engine-Version` request header → org methodology pin → METHODOLOGY_VERSION. The body/header split is deliberate: body = what ran, header = audit anchor. When v3 ships, this seam routes pinned orgs to v2 and unpinned to v3 from the same deployment. Every call emits `api.score.computed` activity event with `{ area, preset, weights: 'preset'|'custom', preset_id, score }`.

**RBAC + Levers interplay.** Plain `/v1/score` requires any API key with API access on plan. Levers AR-196 saved presets: resolve caller's org → `getPreset(orgId, presetId)` → 404 if cross-org/unknown → 422 `preset_id_conflict` if combined with `preset`/`weights`. Preset CRUD (`/v1/orgs/:id/presets`): admin/owner for mutations, any member for reads. Levers AR-197 methodology pin: owner-only mutations on `PUT/DELETE /v1/orgs/:id/methodology`; stamped automatically on every product-surface response header. Bundles (AR-195) do NOT affect `/v1/score`. IP allowlist (AR-200) enforced at auth.

**Rate limits / quota.** `/v1/score` is **NOT** metered against the monthly report quota — no report is generated. Per-key rate limit only: the `apiReport` budget (30 req/60s), shared with the rest of `/v1/*`. Headers `X-RateLimit-*` stamped on every response. `/v1/report` by contrast DOES consume one unit of monthly quota + respects same rate limit + honours `Idempotency-Key`.

## Endpoints

### `POST /v1/score`

Deterministic composite score for a UK area by preset, with optional caller-supplied weights over the preset's fixed dimension set. Returns components + per-dim confidence + `weights_source` + `engine_version`. No AI.

**Request (body):**

| Field | Type | Required | Description |
|---|---|---|---|
| `area` | string | yes | UK postcode or place name. Geocoded server-side. |
| `preset` | enum | no | `moving` / `business` / `investing` / `research`. Default `research`. Each uses a DIFFERENT 5-dim set. |
| `weights` | `Record<string, positive number>` | no | Override preset's default weights. Keys MUST be in `PRESET_DIMENSION_KEYS[preset]`. Partial overrides allowed. |
| `preset_id` | string | no | Levers AR-196: reference saved per-org preset (`spr_...`). Mutually exclusive with `preset` + `weights` → 422 `preset_id_conflict`. |
| `X-Engine-Version` (header) | string | no | AR-131: pin response engine version per request. Must be in `SUPPORTED_ENGINE_VERSIONS` = `['2.0.0','2.0.1','2.0.2']`. Beats org pin. |

**Response:** `ScoreResult` (Zod schema in `packages/contracts/src/scores.ts`). Response header `X-Engine-Version` carries effective version.

**Status codes:** 200 OK · 400 (missing area, invalid preset, unknown dim key for preset, non-positive weight, empty weights, unsupported X-Engine-Version) · 401 missing/invalid key · 403 (no API access on plan, IP-allowlist) · 404 (ungeocodable, unknown preset_id) · 422 (`preset_id_conflict`, `no_org_context`) · 429 (rate-limit hit, 30 req/min).

**RBAC:** any API key with API access; dark-flagged behind `OGA_SIGNALS_API`. NOT metered against monthly report quota. Meters one `api.score.computed` activity event.

**Sample curl:**
```
curl -X POST https://api.onegoodarea.com/v1/score \
  -H 'Authorization: Bearer oga_live_...' \
  -H 'Content-Type: application/json' \
  -d '{"area":"M1 1AE","preset":"research"}'
```

**Sample response (abridged):**
```json
{
  "area": "M1 1AE",
  "preset": "research",
  "score": 62,
  "area_type": "urban",
  "dimensions": [
    { "key": "safety_crime", "label": "Safety & Crime", "score": 70, "weight": 20, "confidence": 0.9 }
  ],
  "confidence": 0.8,
  "weights_source": "preset",
  "engine_version": "2.0.2"
}
```

### `POST /v1/report` (legacy)

Same deterministic engine + AI narrative layered on top (server-side score lock — AI cannot drift the numbers). **METERED** against monthly report quota. Carries idempotency + X-Engine-Version pin.

**Request body:** `area` (required), `intent` (required enum same as preset — historically "intents" demoted to named presets per ADR 0008), `Idempotency-Key` header (optional, AR-128), `X-Engine-Version` header (optional pin).

**Status codes:** 200 (generated or replayed) · 400 · 401 · 403 (no API access, IP blocked, MCP gate failed) · 429 (per-key rate-limit OR monthly report limit). RBAC: any-API-key with API access; consumes 1 unit monthly quota via `canGenerateReport` gate; MCP-originated needs MCP entitlement (£29/mo add-on or Growth/Enterprise).

### Preset CRUD: `POST/GET/PATCH/DELETE /v1/orgs/:id/presets[/:presetId]`

Levers AR-196 saved scoring presets. 5 endpoints. Validates weight keys against `PRESET_DIMENSION_KEYS[base_preset]` on write. Org-scoped — no cross-org access.

- **POST** — 201 ScoringPreset (`{ id: 'spr_...', org_id, slug, name, base_preset, weights, created_at, updated_at }`). RBAC: admin/owner. 400 schema or `unknown_weight_keys`. 403 `admin_required`. 409 slug collision.
- **GET (list)** — 200 `{ presets: ScoringPreset[] }` ordered by created_at asc. RBAC: any member.
- **GET (one)** — 200 single preset. 404 cross-org.
- **PATCH** — Update any subset of `{name, slug, base_preset, weights}`. Re-validates weights against EFFECTIVE base_preset. 200 updated · 400 schema / unknown_weight_keys / no fields set · 403 admin_required · 404 · 409 slug collision.
- **DELETE** — 200 `{ deleted: true }`. 403 admin_required.

## Compound grammar — weights[] override + preset_id

**`POST /v1/score` body schema** (Zod-validated in `apps/api/src/modules/scoring/score.ts::parseScoreBody`):

```
{
  "area":      string  (required — UK postcode or place name)
  "preset":    "moving" | "business" | "investing" | "research"  (optional, defaults to "research")
  "weights":   { [dimension_key: string]: positive number }       (optional override)
  "preset_id": string                                              (optional — Levers AR-196 saved preset)
}
```

### Rules

1. **Weight keys MUST match `PRESET_DIMENSION_KEYS[preset]`** — the 5 valid keys per preset.
   - `moving`: `safety_crime | schools_education | transport_commute | daily_amenities | cost_of_living`
   - `business`: `foot_traffic_demand | competition_density | transport_access | local_spending_power | commercial_costs`
   - `investing`: `price_growth | rental_yield | regeneration_infrastructure | tenant_demand | risk_factors`
   - `research`: `safety_crime | transport_links | amenities_services | demographics_economy | environment_quality`
2. **Partial weights OK** — missing keys fall back to preset's default; totalWeight re-normalised at aggregation time.
3. **Every weight must be positive number** (`> 0`, finite). 0/negatives/non-numbers → 400.
4. **Empty weights object rejected** — pass no `weights` field at all to use preset defaults.
5. **`preset_id` mutually exclusive with `preset` + `weights`** → 422 `preset_id_conflict`. Saved preset is the complete recipe.
6. **`preset_id` validates against caller's org** — 404 if doesn't belong. Legacy keys with null `org_id` lazy-resolve to first owned org.
7. **`weights_source`** = `"preset"` when `weights` absent; `"custom"` otherwise. `preset_id` calls surface as `"custom"` (the named preset_id audit trail lives in `api.score.computed` activity event, not in response body).

### Error codes a buyer can program against

- `400` — missing area, invalid preset enum, unknown dimension key, non-positive weight, weights empty.
- `404` — area cannot be geocoded; preset_id unknown in caller's org.
- `422` — `preset_id_conflict`, `no_org_context`.
- `400` — `engine_version_unsupported` / `engine_version_unknown` on bad `X-Engine-Version` header.

## ICP value (compressed)

| ICP | One-line value |
|---|---|
| Lender ⭐ | `engine_version` in body + `X-Engine-Version` header, org-lockable via `PUT /v1/orgs/:id/methodology` — every decision reproducible to a known version, so the model risk register gets a 1:1 API-call-to-engine mapping. |
| InsureTech | Returns every dimension's raw score, weight and variance-aware confidence (not a black box); actuary tunes weights within the preset's fixed dims and saves once as a `preset_id`. |
| PropTech | Four presets = four audiences (family/investor/business/general) from one endpoint; deterministic so scores are cache-stable, with components + confidence for on-demand drill-down. |
| CRE / site selection | `preset: 'business'` returns the exact 5 site-selection dims with per-portfolio weight overrides + defensible methodology cite, run at scale (30/min, no monthly quota). |
| Public sector | `preset: 'research'` general-purpose composite, deterministic + `METHODOLOGY_VERSIONS`-stamped — FOI-defensible and reproducible across deploys and procurement cycles, no AI in path. |

## Demo strategy

**Endpoint:** `POST /v1/score`

**Why this endpoint:** Single endpoint, rich response. One body — `{area, preset}` — returns overall score, all 5 dimensions, per-dim confidence, aggregate confidence, weights_source, engine_version. No auth-fail surface (proxy bears the API key); no quota to exhaust (`/v1/score` is NOT metered). User sees deterministic-engine output land in <1s, with transparency story (components + confidence + version) baked into response. `/v1/report` would be wrong here — generates AI narrative, is metered, heavier response; this page sells the deterministic score, not the narrated report.

**Response shape user sees:** JSON block showing: `score` (0-100), `preset`, `area_type`, then 5 dimensions each with key + label + score + weight + confidence, then aggregate confidence, `weights_source: 'preset'`, `engine_version: '2.0.2'`. Side-by-side render: left = curl request, right = response with 5 dimensions visualised as bars. Optional toggle: "try with custom weights" swaps in a weights object and recomputes — same engine, different aggregation, `weights_source` flips to `'custom'`.

**Postcode allowlist:** `M1 1AE, EC1A 1BB, B1 1AA, SW1A 1AA, LS1 4DT, NE1 7RU, BS1 4ST, OX1 2JD, CB2 1TN, YO1 7PR`

**Rate-limit suggestion:** 5 requests / 60s per IP at the demo proxy. Production `/v1/score` is 30/min/key.

## Methodology proof

- `/methodology section 7` (Scoring) — 4 preset × 5 dim matrix mirrored from `PRESET_DIMENSION_KEYS`, frozen v2 engine + applyWeights re-aggregation outside engine (ADR 0008).
- `/methodology section 11` (Versioning) — semver, METHODOLOGY_VERSIONS registry, `SUPPORTED_ENGINE_VERSIONS` pin window, header vs body engine_version split (AR-131, ADR 0008).
- `/methodology section 12` (Levers — per-org methodology) — org methodology pin (ADR 0031, AR-197), saved scoring presets (ADR 0030, AR-196), precedence rule.
- **ADR 0008** (Scores v3) — canonical primary source.
- **ADR 0030** (Levers — custom scoring presets) — 5 endpoints + `preset_id` resolution + error codes.
- **ADR 0031** (Levers — per-org methodology pinning) — GET/PUT/DELETE, precedence, defense-in-depth fallback.

## Gotchas

1. **Each preset uses a DIFFERENT set of five dimensions** — do NOT list one set as if it covers all 4. The marketing page MUST show all 4 preset × 5 dim matrices, or it lies.
2. `weights_source` is strict 2-value enum: `'preset' | 'custom'`. No `'saved_preset'` — saved presets surface as `'custom'`. Audit trail of which preset_id was used lives in `api.score.computed` activity event, not response body.
3. `/v1/score` is NOT metered against monthly report quota — only per-key rate limit (30 req/min). `/v1/report` IS metered (`canGenerateReport`). Do NOT conflate pricing-wise.
4. There is NO AI in the `/v1/score` path. computeScores → applyWeights → response, deterministic end-to-end. AI narrative lives on `/v1/report` only (score-locked). Do NOT claim "AI-powered scoring."
5. Supported engine_version pin window is `['2.0.0', '2.0.1', '2.0.2']` only. 1.x is EOL (reconstructed-from-history snapshots). All three 2.0.x are SCORE-EQUIVALENT (patches changed confidence rubric + Overpass reliability, not scoring math) — they resolve to latest engine and ECHO the requested version in response header. Body's `engine_version` is always METHODOLOGY_VERSION.
6. Body `engine_version` and response HEADER `X-Engine-Version` can diverge. Body = what ran. Header = what auditor pinned. Will become semantically distinct when v3.0.0 freezes a separate engine module.
7. Custom weights operate WITHIN a preset's fixed dimension set. Re-weight, not redefine. Fully custom dimension composition is NOT a `/v1/score` feature — Levers saved presets only save `{base_preset, weights}`.
8. Scores endpoint is dark-flagged behind `OGA_SIGNALS_API`. 404s like unknown route when off (before auth).
9. Methodology pinning (AR-197) is OWNER-only, not admin-only. Don't sell as "any team member can pin."
10. Preset and methodology pin lookups are best-effort — DB hiccup logs + falls back to METHODOLOGY_VERSION. Endpoint stays up; pin isn't guaranteed to always be honoured if table is unhealthy.
