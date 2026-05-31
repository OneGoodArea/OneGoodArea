# AR-204 — Product pages spec pack

> **Status:** Locked. Drives the next 4 product-page PRs (`/products/signals`, `/scores`, `/monitor`, `/intelligence`) plus the 2 prerequisite infra PRs (demo proxy backend + `<TryItPanel />`).
> **Compiled:** 2026-05-31 from 4 parallel recon agents over ADRs 0001-0035 + `apps/api` Fastify routes + `packages/contracts` Zod schemas + a sample test per surface (407k subagent tokens).
> **Tone:** every claim is verified against the ADR or the live code at the time of compilation. Page authors MUST verify against the current code before committing copy — see "Verification protocol" below.

---

## How to read this doc

This is the cold-start reference for the 4 product marketing pages. Each surface has:

1. **Thesis** — one paragraph that drives the hero copy. Plain English. No marketing fluff. Grounded in ADRs.
2. **Primitive contract** — what lands on the wire, field by field, with examples.
3. **Under the hood** — store / compute / lineage / RBAC + Levers interplay / rate limits.
4. **Endpoints** — every real Fastify path, method, request shape, response shape, status codes, RBAC, sample curl, sample response.
5. **Compound grammar** — where applicable (rank_areas signals[], scoring weights[], change-detection knobs).
6. **5 ICP narratives** — PropTech, InsureTech, Lender, CRE/site selection, Public sector — each with **Problem → Why this product → Their value → Sales line**, in Pedro's 2026-05-31 voice.
7. **Demo strategy** — which endpoint a `<TryItPanel />` widget should call, what the user sees, postcode allowlist, rate-limit suggestion.
8. **Methodology proof** — cross-links into `/methodology` + the source ADRs.
9. **Gotchas** — what NOT to claim. Deferred work. Dark-flag gates. Things that look true but aren't.

The "Gotchas" lists are the most important part of each section: they exist to stop us inventing marketing claims that the code does not back.

---

## Verification protocol

Before committing copy on any product page, I MUST:

1. Re-read the primary ADR(s) listed in that surface's `methodology_proof`.
2. Spot-check the cited route file (`apps/api/src/modules/<surface>/routes.ts` or `apps/api/src/app.ts`) — confirm the path, the verb, the request shape.
3. Spot-check `packages/contracts/src/<surface>.ts` for the Zod schema if the page renders a response shape.
4. If any claim has drifted, update this doc AND the page copy in the same commit.

Memory + this spec pack are NOT the source of truth. The code is.

---

## Cross-surface summary

| Surface | One-line | Primary endpoint | Compound grammar lives at |
|---|---|---|---|
| Signals | Deterministic, addressable UK area-data layer at LSOA × month grain | `GET /v1/area` | `/v1/areas` (single-signal AND threshold + scope) |
| Scores | Deterministic composite scoring with 4 presets × different 5 dims each | `POST /v1/score` | `weights[]` override + `preset_id` saved presets |
| Monitor | Portfolios + on-demand change-detection + signed webhooks | `POST /v1/portfolios/:id/changes` | Body knobs: baseline, threshold_pct, min_transactions, emit |
| Intelligence | Typed query + insight plane. 6 plan ops. Dual mode (programmatic plan OR NL) | `POST /v1/query` | `signals[]` 1-8 entries × 11 filter ops + sort_by (rank_areas compound) |

**ICP-to-surface lead map** (what each ICP narrative leans on per page):

| ICP | Signals page leads with | Scores page leads with | Monitor page leads with | Intelligence page leads with |
|---|---|---|---|---|
| PropTech | ⭐ Strongest | One endpoint, four flavours | Movers feed for customers | NL search + similar areas |
| InsureTech | Deterministic dated inputs | Configurable composite | ⭐ Strongest | Peer-relative anomaly |
| Lender | Audit + percentile-normalised | ⭐ Strongest (versioning) | Portfolio drift | Auditable AI screening |
| CRE / site selection | Single-signal threshold + LAD | Site-selection preset | Watchlist of candidates | ⭐ Strongest (compound) |
| Public sector | Country-scoped percentiles | Research preset, FOI-defensible | Lineage-stamped change report | ⭐ Defensibility |

(One ⭐ per row indicates which page leads with that ICP. Every page covers all 5 ICPs.)

---

# § 1 — Signals

## 1.1 Thesis

Signals is the deterministic, addressable UK area-data layer. For any UK postcode or place name we resolve the area down to its ONS Lower-layer Super Output Area (LSOA) and return a stable catalog of typed signals across seven categories — crime, deprivation, property, schools, amenities, transport, environment — each with a raw value, unit, direction, source, observed period, per-signal confidence and (where the persisted store backs it) a national percentile and a normalized 0-1 position. Provenance is on the wire on every response: `meta.fetch_mode` is honestly `"live"`, `"store"` or `"hybrid"` depending on which sources came from the persisted store versus a live upstream fetch. The same shape is the response of `/v1/area` (one area, all signals), `/v1/signals/:category` (one area, one category) and `/v1/areas` (rank LSOAs across a country or local authority by a single signal's value or percentile). Signals is the primitive the rest of the product composes — Scores adds weights, Monitor adds change detection, Intelligence adds the typed query plane — but the deterministic data layer is the product you buy here.

## 1.2 Primitive contract

The Signal is the atomic unit. AreaProfile bundles the seven-category Signal catalog for one area plus a meta block. Contract: Zod schema shared between apps/web and apps/api so the runtime payload and static types cannot drift.

**Zod source:** `packages/contracts/src/signals.ts`

| Field | Type | Description | Example |
|---|---|---|---|
| `key` | string | Stable, category-namespaced identifier (e.g. `property.median_price`). | `"crime.total_12m"` |
| `category` | enum | One of: crime, deprivation, property, schools, amenities, transport, environment. | `"crime"` |
| `label` | string | Human-readable display label. | `"Recorded crimes (12 months)"` |
| `value` | `number \| string \| null` | Raw observed value. `null` = no coverage (distinct from real zero). | `1200` |
| `unit` | `string \| null` | Unit of value: count, GBP, decile, rank, pct, per_month, etc. | `"count"` |
| `normalized_value` | `number \| null` (0-1, optional) | Position within comparison distribution, ascending. Present only on store-backed signals. | `0.786` |
| `percentile` | `number \| null` (0-100, optional) | Percentile rank within country scope (national-within-country today). | `78.58` |
| `direction` | enum | `higher_is_better`, `lower_is_better`, `neutral`. Orthogonal to normalized_value. | `"lower_is_better"` |
| `confidence` | number (0-1) | Per-signal data-trust. v1 is availability/sample based. Calibrated outcome-based confidence is Phase 7. | `0.9` |
| `confidence_reason` | string | Plain-language explanation of the confidence figure. | `"police.uk: 12 months of data."` |
| `source` | string | Attribution string. Source names go on `/methodology`, not marketing copy. | `"police.uk"` |
| `observed_period` | string | Static, trailing-window, or monthly. | `"Apr 2025 to Mar 2026"` |
| `geo.lsoa` | `string \| null` | ONS LSOA code — canonical addressable grain (~42k UK areas). | `"E01005207"` |
| `geo.msoa / admin_district / region / country` | strings | ONS spine handles. | `"Manchester"` |
| `geo.area_type` | enum | urban / suburban / rural, from the ONS rural-urban code. | `"urban"` |
| `meta.fetch_mode` | enum (live / store / hybrid) | Provenance on the wire. The live→store flip is non-breaking. | `"hybrid"` |
| `meta.engine_version` | string | Pinnable methodology version. Also returned as `X-Engine-Version` header. Org methodology pin overrides. | `"2.0.2"` |
| `meta.generated_at` | ISO string | When the profile was assembled. | `"2026-05-25T00:00:00.000Z"` |
| `meta.sources` | `string[]` | Source datasets that contributed at least one signal. | `["police.uk", "HM Land Registry"]` |

## 1.3 Under the hood

**Store or compute?** Hybrid by design. Three sources are served from the persisted signal store (Postgres) when their LSOA row is present and `OGA_SIGNALS_STORE_READ` is enabled: **deprivation** (IMD/WIMD/SIMD), **property** (HM Land Registry, England & Wales, window-median per LSOA + monthly history), **crime** (police.uk bulk archive, trailing-12-month total + monthly time-series). The remaining four (amenities, transport, schools, environment) are fetched **live** per request from upstream APIs. Every signal goes through the same `buildAreaProfile` mapper so a store-served signal is byte-equivalent to a live-served one in shape. Store misses (e.g. Scotland prices, since HM Land Registry is E&W only) fall back to live automatically with no special-casing. See ADRs 0001/0002/0004/0011/0012/0015/0016.

**Lineage.** Every row in `signal_values` and `signal_timeseries` carries `source_snapshot_id` + `engine_version` + `boundary_version` (e.g. `"2021"` for the ONS spine). `source_snapshots` is an append-only provenance ledger (id, source, release, ingested_at, licence, checksum, row count). Every refresh job writes one row; every served value points back to one snapshot. On the wire: `meta.fetch_mode`, `meta.engine_version`, `meta.generated_at`, and the `X-Engine-Version` response header.

**RBAC + Levers interplay.** All Signals endpoints are opt-in gated through the Levers stack: `?bundle=<id>` on `/v1/area` and `/v1/areas` filters the response to the org's signal-key whitelist (AR-195); an org methodology pin overrides `meta.engine_version` + the header (AR-197); the api-key row's `allowed_ip_cidrs` (AR-200) is enforced at auth (403 `ip_not_allowed`); org white-label fields surface on `/v1/me` for branded report wrappers. With no Levers config set, behaviour is unchanged.

**Rate limits / quota.** Auth is API-key only (`Authorization: Bearer oga_...`). Per-key rate limit is **30 req/min** for the API surface. The monthly REPORT quota does NOT apply to Signals — no report is generated. Activity events: `api.area.profiled`, `api.signals.category`, `api.areas.queried`. Entire surface is dark-flagged behind `OGA_SIGNALS_API`; routes 404 like an unknown path when off, before auth. Store-read path is independently flagged via `OGA_SIGNALS_STORE_READ`.

## 1.4 Endpoints

### `GET /v1/area`

Returns the full Signal catalog (seven categories) for one UK postcode or place name. No scoring, no AI — just the typed primitive.

**Request (query):**

| Field | Type | Required | Description |
|---|---|---|---|
| `area` | string | one-of | UK postcode (e.g. `M1 1AE`) or place name. |
| `postcode` | string | one-of | Alias for `area`. |
| `bundle` | string (Lever) | no | Bundle id from caller's org; filters response to the bundle's signal whitelist (AR-195). |

**Response:** 200 with `AreaProfile` (see `AreaProfileSchema`): `{ geo: AreaGeo, signals: Signal[], meta: { engine_version, generated_at, sources, fetch_mode } }`. Sets `X-Engine-Version` header.

**Status codes:** 200 OK · 400 missing/invalid area · 401 missing/invalid key · 403 plan no API access or IP-allowlist blocked · 404 ungeocodable or dark flag off · 429 rate-limited.

**Sample curl:**
```
curl -H "Authorization: Bearer oga_live_xxx" \
  "https://api.onegoodarea.com/v1/area?postcode=M1%201AE"
```

**Sample response (abridged):**
```json
{
  "geo": {
    "query": "M1 1AE", "postcode": "M1 1AE",
    "lsoa": "E01005207", "admin_district": "Manchester",
    "region": "North West", "country": "England", "area_type": "urban"
  },
  "signals": [
    { "key": "crime.total_12m", "category": "crime",
      "value": 1200, "unit": "count", "direction": "lower_is_better",
      "percentile": 88.4, "normalized_value": 0.88,
      "confidence": 0.9, "confidence_reason": "police.uk: 12 months of data.",
      "source": "police.uk", "observed_period": "Apr 2025 to Mar 2026" }
  ],
  "meta": { "engine_version": "2.0.2", "fetch_mode": "hybrid", "sources": ["police.uk","HM Land Registry"] }
}
```

### `GET /v1/signals/:category`

Same `AreaProfile` shape, filtered to one of the seven categories.

**Request:** path enum `:category` (one of `crime`, `deprivation`, `property`, `schools`, `amenities`, `transport`, `environment`) + `area` or `postcode` query param. Unknown category 400s before geocoding.

**Response:** 200 with `AreaProfile` where `signals[]` is the subset of the requested category. Same `X-Engine-Version` header.

**Sample:** `GET /v1/signals/crime?postcode=M1%201AE`

### `GET /v1/areas`

Cross-area ranking. Only the store can answer this — the live-fetch path is one-area-at-a-time.

**Request (query):**

| Field | Type | Required | Description |
|---|---|---|---|
| `signal` | string | yes | Signal key to rank by (e.g. `property.median_price`, `crime.total_12m`). |
| `country` | enum | no | `England`, `Wales`, `Scotland`. Scoped by LSOA prefix (E/W/S). |
| `lad` | string | no | Local Authority District code. Resolved via the ONS spine. |
| `min_percentile`, `max_percentile` | number 0-100 | no | Percentile band. |
| `min_value`, `max_value` | number | no | Raw-value band. |
| `sort` | enum | no | `percentile` (default asc), `percentile_desc`, `value`, `value_desc`. |
| `limit` | integer | no | Default 100, max 1000. |
| `bundle` | string (Lever) | no | If set, requested signal MUST be in bundle whitelist (else 422 `bundle_signal_not_allowed`). |

**Response:** 200 with `{ signal, count, areas: AreaResult[] }` where each row is `{ geo_type, geo_code, value, normalized_value, percentile }`. Region scope is NOT supported yet — LAD + country only.

**Sample:** `GET /v1/areas?signal=deprivation.imd_decile&country=England&max_percentile=10&limit=5`

## 1.5 Compound grammar

Single-signal grammar only on `/v1/areas`. Filters compose as AND across `country` + `lad` + one each of `min_percentile`/`max_percentile`/`min_value`/`max_value` against the named `signal`. The MULTI-signal compound grammar (`signals: [{ key, filter }, ...]` with `sort_by` and 11 filter operators) lives on `/v1/query` under Intelligence — **NOT** on `/v1/areas`. Marketing copy for Signals must not claim compound multi-signal filters here; point compound users to the Intelligence product page.

## 1.6 ICP narratives

### PropTech ⭐
**Problem:** Your product already has the buyer or renter on the page — what they want next is rich, decision-grade context about the area, at a grain that resolves to the property they care about. Building that yourself means stitching together a dozen government APIs, normalising mismatched indices across England, Wales and Scotland, and reconciling 2011 vs 2021 boundaries before you write a single feature.

**Why this product:** Signals is exactly that data layer, already stitched together. One typed request to `/v1/area?postcode=...` returns the seven-category catalog at LSOA grain with national-within-country percentiles, normalized 0-1 positions, per-signal confidence, sources and observed periods. Pin to the signal keys your model consumes (`property.median_price`, `property.price_change_pct_yoy`, `crime.total_12m`, `deprivation.imd_decile`) and the contract stays additive — new signals slot in without breaking the keys you already depend on. `/v1/signals/:category` lets you pull just the slice your area-detail panel needs.

**Their value:** Weeks of integration replaced by one API key. Your area-detail screen ships with comparable percentiles instead of raw numbers that mean different things in Cardiff and Manchester. Provenance is on the wire (`meta.fetch_mode`, `meta.engine_version`, `source`, `observed_period` per signal) so your compliance review actually has answers.

**Sales line:** Drop one endpoint into your property detail page and ship richer area context than your competitor's roadmap.

### InsureTech
**Problem:** Underwriting needs deterministic, addressable, dated data per area — values you can pin a price to and re-derive on audit. Live one-API-per-source fan-outs and "trust our score" report APIs do not survive an actuarial review.

**Why this product:** Every Signal carries `source_snapshot_id`, `engine_version` (also stamped on `X-Engine-Version`), `observed_period`, and a `confidence` with a plain-language `confidence_reason`. Bundles let you lock the model to the exact signal keys your tariff uses, so a refresh that adds new keys cannot silently change your inputs. Methodology pinning fixes the engine version per org so historical quotes are reproducible.

**Their value:** Reproducible inputs you can defend to a regulator. Per-signal confidence flows into your decline/refer logic without you inventing it. Smaller blast radius on data updates because the bundle whitelists which signals reach your model.

**Sales line:** Deterministic, dated, pinnable area inputs your actuarial team can sign off.

### Lender
**Problem:** Decisioning at scale needs comparable, percentile-normalised area inputs across the whole book — and you need to back-test against history. Most data vendors give you raw numbers that aren't comparable across home nations, with no audit trail of what "the value was" on the date you decisioned.

**Why this product:** `/v1/area` returns national-within-country percentiles for store-backed signals (deprivation, property, crime); `/v1/areas` ranks the universe at LSOA grain across a country or LAD for batch screening. Country-scoping is by LSOA code prefix (E/W/S), so cross-border methodology lies (e.g. comparing IMD 2025 to SIMD 2020) are structurally impossible. The store stamps `engine_version` and `source_snapshot_id` per row.

**Their value:** Concentration analysis, exposure screens and back-tests run against one consistent grain. Audit trail per decision because the wire payload carries lineage. LAD-scoped ranking via the ONS spine without you running the spine.

**Sales line:** Comparable, percentile-normalised, audited area inputs for decisioning at portfolio scale.

### CRE / site selection
**Problem:** Picking a site is a ranking problem: "which areas in this LAD or country meet my thresholds on deprivation, prices and footfall proxies, sorted". You don't want a one-area-at-a-time report API; you want to query the universe.

**Why this product:** `/v1/areas` is exactly that — filter by country, by LAD, by percentile band or raw-value threshold on a chosen signal, sort by percentile/value asc or desc, capped at 1000 rows. Combine with `/v1/area` to drill into shortlisted areas for the full seven-category profile. Compound multi-signal filtering across the universe is one query plane up (Intelligence `/v1/query`), but the single-signal ranking that anchors most site-selection workflows lives here and is on every API key.

**Their value:** Shortlists generated against typed thresholds in one HTTP call instead of geocoding 1000 postcodes through a report API. The LAD scope is honest and ONS-backed. Output is ready to merge with internal footfall, rent or lease data because the geo_code is the canonical LSOA.

**Sales line:** Threshold-and-rank the LSOA universe in one query, then drill into any area's full profile.

### Public sector
**Problem:** Public-sector analysts need defensible, sourced, dated area metrics that won't be challenged in an FOI response or a council briefing — and they need to compare like-with-like inside a country, not across a methodological border.

**Why this product:** Every Signal carries an explicit `source`, `observed_period`, `confidence` and `confidence_reason`. Normalisation is country-scoped on purpose (ADR 0005) because England's IMD 2025, Wales's WIMD 2019 and Scotland's SIMD 2020 are not comparable — we refuse to manufacture a cross-GB deprivation percentile. `/v1/areas` lets analysts shortlist LSOAs within a LAD or a country against a published methodology version pinned per response.

**Their value:** An evidence base that holds up under scrutiny. Country-scoped percentiles instead of false-precision cross-border comparisons. Same methodology version on every report run if pinned via Levers — no "the numbers moved" mid-cycle.

**Sales line:** Defensible, sourced, dated area metrics with the methodology version stamped on every response.

## 1.7 Demo strategy

**Endpoint:** `GET /v1/area?postcode={postcode}`

**Why this endpoint:** It is the canonical one-shot proof of the product. One query param resolves to a full seven-category catalog with lineage and (where store-backed) percentiles — the entire pitch of "Signals is the typed UK area-data layer" is visible in a single JSON payload. No body to construct, no auth-fail edge cases beyond a curated postcode allowlist, no compound grammar to teach. `/v1/areas` would be a stronger differentiator demo but requires three more decisions from the user (signal key, country, threshold) and would feel like a search box instead of "feel the primitive".

**Response shape user sees:** Formatted JSON pane showing the resolved `geo` block (postcode → LSOA → admin_district → country → urban/suburban/rural), the seven-category `signals[]` catalog with value + unit + direction + percentile + confidence + source + observed_period on each row, and the `meta` block. Pretty-print highlights `percentile`, `confidence`, `source` to draw eye to lineage and normalisation.

**Postcode allowlist:** `M1 1AE, EC1A 1BB, SW1A 1AA, B1 1AA, LS1 4DT, CF10 1EP, EH1 1YZ, G1 1XW, BS1 4ST, NE1 5DW`

**Rate-limit suggestion:** 5 req / 60s per IP at the demo proxy; hard cap 50 / 24h per IP. The real `/v1/area` limit is 30/min per API key — the demo proxy is intentionally tighter.

## 1.8 Methodology proof

- `/methodology §3` (the persisted signal store) — store-backed percentiles vs live-fetched (ADRs 0002, 0004).
- `/methodology §5` (Normalisation) — country-scoped percentile rule (ADR 0005). No cross-GB deprivation comparison.
- `/methodology §6` (ONS geo spine) — LSOA addressability + postcode → LSOA/LAD/region (ADR 0006).
- `/methodology §10` (time-series + moat clock) — `signal_timeseries` monthly history (ADR 0010), powers derived signals like `property.price_change_pct_yoy` (ADR 0018).
- `/methodology §11-12` (property store flip) + `§15-16` (crime store flip) — explain hybrid `fetch_mode` (ADRs 0011/0012/0015/0016).

## 1.9 Gotchas

1. Do NOT claim every response is served from the store. `fetch_mode` is `live`, `store` or `hybrid` per response.
2. Do NOT claim postcode-grain addressability. Canonical grain is LSOA (~42k UK areas).
3. Do NOT enumerate source names on marketing copy (AR-204 §5 rule). Seven categories are public; specific attributions live on `/methodology` and on the `source` field at runtime.
4. Do NOT claim live-API-per-request universally — that was v1; three sources are store-backed when LSOA coverage exists.
5. Do NOT claim Scotland prices. HM Land Registry is E&W only; Scotland LSOAs fall back to live (may have no value).
6. Do NOT claim Wales/Scotland deprivation store-read parity with England. England IMD 2025 uses 2021 LSOA codes; WIMD 2019 / SIMD 2020 use 2011 codes that store-miss and fall back to live.
7. Do NOT claim multi-signal compound filtering on `/v1/areas` — that lives on `/v1/query` under Intelligence.
8. Do NOT claim region-scoped ranking on `/v1/areas` — only `country` and `lad` supported today.
9. Do NOT claim calibrated outcome-based confidence. v1 is availability/sample based; calibrated is Phase 7.
10. Do NOT forget the dark flags. Entire surface behind `OGA_SIGNALS_API`; routes 404 like unknown paths when off. Store-read independently gated by `OGA_SIGNALS_STORE_READ`. Both must be on in prod.
11. Do NOT promise unauthenticated access. Every endpoint requires Bearer `oga_...` + API access on plan.
12. Do NOT enumerate pricing or quotas — pricing parked per AR-204. Quote rate limit (30/min/key) only because it's fixed in code.

---

# § 2 — Scores

## 2.1 Thesis

Scores is the deterministic composite layer on top of Signals: a `POST /v1/score` endpoint that takes an area and a preset (`moving` | `business` | `investing` | `research`) and returns a single 0-100 score, every per-dimension component that produced it, the weight applied to each, the per-dimension confidence, and the engine_version that ran. Each preset selects a **DIFFERENT** five-dimension set — `moving` is about safety + schools + commute + amenities + cost; `investing` is about price growth + yield + regeneration + tenant demand + risk — so customising the score means re-weighting that preset's dimensions, not redefining them. The engine is frozen v2, golden-tested, and never gets touched by AI; caller-supplied weights only change the aggregation, which happens outside the engine via `applyWeights`. Levers stack on top: a per-org saved preset (`preset_id`, ADR 0030) replaces the `{base_preset, weights}` payload on every call; an org-level methodology pin (ADR 0031) stamps a chosen engine_version on every response header until the compliance team flips it. The whole surface exists so a regulated buyer's underwriting model — or a PropTech app's area-quality UI — can run on a versioned, configurable, transparent number that's reproducible deploy-to-deploy.

## 2.2 Primitive contract

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

## 2.3 Under the hood

**Store or compute?** Hybrid, leaning compute. Each `/v1/score` call runs `scoreArea(query)` (apps/api/src/modules/scoring/score.ts): (1) `fetchAreaSources` from modules/signals — which serves deprivation + property + crime from the store when available, falling back to live source fetches; (2) `computeScores` runs the **FROZEN v2 deterministic engine** for the chosen preset and returns the 5 per-dimension scores + per-dim confidence; (3) `applyWeights` re-aggregates with effective weights (preset default OR caller override OR saved-preset weights) — this is the pure step where custom weights enter, never touching the engine. Dark-flagged behind `OGA_SIGNALS_API`.

**Lineage.** Body `engine_version` carries METHODOLOGY_VERSION (today `2.0.2`). Response header `X-Engine-Version` carries the EFFECTIVE pin via `effectiveEngineVersionForCaller(orgId, userId)` — precedence: explicit `X-Engine-Version` request header → org methodology pin → METHODOLOGY_VERSION. The body/header split is deliberate: body = what ran, header = audit anchor. When v3 ships, this seam routes pinned orgs to v2 and unpinned to v3 from the same deployment. Every call emits `api.score.computed` activity event with `{ area, preset, weights: 'preset'|'custom', preset_id, score }`.

**RBAC + Levers interplay.** Plain `/v1/score` requires any API key with API access on plan. Levers AR-196 saved presets: resolve caller's org → `getPreset(orgId, presetId)` → 404 if cross-org/unknown → 422 `preset_id_conflict` if combined with `preset`/`weights`. Preset CRUD (`/v1/orgs/:id/presets`): admin/owner for mutations, any member for reads. Levers AR-197 methodology pin: owner-only mutations on `PUT/DELETE /v1/orgs/:id/methodology`; stamped automatically on every product-surface response header. Bundles (AR-195) do NOT affect `/v1/score`. IP allowlist (AR-200) enforced at auth.

**Rate limits / quota.** `/v1/score` is **NOT** metered against the monthly report quota — no report is generated. Per-key rate limit only: the `apiReport` budget (30 req/60s), shared with the rest of `/v1/*`. Headers `X-RateLimit-*` stamped on every response. `/v1/report` by contrast DOES consume one unit of monthly quota + respects same rate limit + honours `Idempotency-Key`.

## 2.4 Endpoints

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

## 2.5 Compound grammar — weights[] override + preset_id

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

## 2.6 ICP narratives

### Lender ⭐
**Problem:** A mortgage lender's model risk register treats every API the underwriting model depends on as a model input. If the supplier silently changes a coefficient, that's an undisclosed model change — a regulated event. Today most area-scoring vendors version nothing (or version their codebase, which is not the same thing). Auditors ask: "what version of the area score produced this decision in March 2026, and is it byte-equivalent to the score you'd compute today?" Without a versioned, pinnable methodology, the answer is "we don't know." That answer doesn't pass model governance.

**Why this product:** Every `/v1/score` response carries `engine_version` in the body AND `X-Engine-Version` on the response header. Both can be locked at the org level via `PUT /v1/orgs/:id/methodology { engine_version: '2.0.1' }` — one row per org, owner-only, write-time validated against `SUPPORTED_ENGINE_VERSIONS`. When v3 actually changes scoring math, a lender's compliance team can keep stamping v2.x while they re-validate, then flip on their own schedule. The deterministic engine is frozen v2, golden-tested; `METHODOLOGY_VERSIONS` is the audit document. AI never touches the scoring path.

**Their value:** Every decision produced from `/v1/score` is reproducible to a known methodology version. The model risk register has a 1:1 mapping between an API call and the engine that ran. The org-level pin works across every key the lender holds without per-call header discipline. Closes a compliance gap that's table-stakes for any production underwriting model.

**Sales line:** Versioned, pinnable, deterministic area scoring with the audit trail your model risk register already asks for.

### InsureTech
**Problem:** An underwriter's area-risk view is a weighted blend the actuary owns — safety, flood, demographics, property volatility — and the weights change with each pricing cycle. Off-the-shelf "area scores" are black-box composites with frozen weights the vendor chose; useless inside an underwriting model because the actuary can't see (let alone tune) the weighting. Sending the full weights map on every API call is also operationally painful — weights live in the carrier's codebase, not the vendor's.

**Why this product:** `POST /v1/score` returns every dimension's raw score, weight, and per-dim confidence — the actuary sees components, not a black box. Weights are either a preset or a caller-supplied map over the preset's fixed dimension set. With Levers AR-196, the carrier saves a preset once (`POST /v1/orgs/:id/presets { base_preset: 'moving', weights: {...} }`) and references it as `preset_id` forever. Confidence is variance-aware on property-backed dimensions (2.0.1 rubric).

**Their value:** Configurable weights without per-call payload. Transparent components for actuary's review. Honest confidence signal that flags volatility before adverse selection. One saved `preset_id` per underwriting model lifecycle.

**Sales line:** Configurable composite scoring the actuary can audit, with a saved preset_id per underwriting model and honest confidence on every dimension.

### PropTech
**Problem:** PropTech tools (search portals, agent CRMs, valuation widgets) need a single composite "how good is this area" number for the UI — not a 12-signal forensics view. But buyers / renters / agents see different things in "good": a family cares about schools and safety, an investor cares about price growth and rental yield, a business cares about footfall and competition density. One score doesn't fit; building four bespoke scores in-house means owning the data pipeline.

**Why this product:** `/v1/score`'s four presets ARE those four audiences. One endpoint, one call, four UX flavours by parameter. Engine is deterministic so the score is stable for a given postcode + preset across deploys — cached UI states stay coherent. Components + weights + confidence come back in every response, so a portal can show the breakdown on demand without a second call.

**Their value:** Four audience-matched scores from one endpoint, no in-house pipeline. Deterministic + stable for caching. Transparency on demand.

**Sales line:** One endpoint, four audience-tuned composite scores, deterministic enough to cache and transparent enough to drill into.

### CRE / site selection
**Problem:** A CRE site-selection workflow needs to compare hundreds of candidate locations on a consistent yardstick — footfall demand, competition density, transport access, local spending power, commercial costs. Most "area data" vendors stop at single-signal lookups; rolling them into a defensible site-selection score is the analyst's problem. And the score has to be defensible: "why did we open here and not there" is a question the property committee will ask.

**Why this product:** `POST /v1/score` with `preset: 'business'` returns exactly the 5 dimensions a site-selection analyst needs (`foot_traffic_demand, competition_density, transport_access, local_spending_power, commercial_costs`), with weights the team can override per portfolio class or save once via preset_id. Every response carries per-dim confidence + deterministic engine version. Run at scale on the shortlist (30 req/min, no monthly quota on `/v1/score`).

**Their value:** Purpose-built business-preset dimensions. Configurable weights per portfolio class. Defensible methodology cite for the committee. Free of monthly report quota.

**Sales line:** A purpose-built commercial site-selection score with per-portfolio weights and a methodology cite you can put in the committee paper.

### Public sector
**Problem:** A council planning team or regeneration body needs a consistent way to triage LSOAs across a borough — relative deprivation, environment quality, transport access, demographic shifts. They don't need an AI narrative; they need a reproducible, methodology-documented number that survives FOI scrutiny and the next election cycle's procurement review. They also need to point at the methodology when challenged.

**Why this product:** `POST /v1/score` with `preset: 'research'` is the general-purpose composite (`safety_crime, transport_links, amenities_services, demographics_economy, environment_quality`). Engine is deterministic — same postcode + preset → same score across deploys. Published `METHODOLOGY_VERSIONS` + engine_version stamped on every response means an FOI request can be answered by pointing at the version. No AI in path; no "model made it up" challenge.

**Their value:** FOI-defensible methodology trail. Reproducible across deploys and procurement cycles. Researcher-tuned default preset that doesn't bias toward commercial or investor lenses.

**Sales line:** A reproducible, methodology-documented composite for triaging areas at the LSOA level — built for the procurement notice and the FOI request.

## 2.7 Demo strategy

**Endpoint:** `POST /v1/score`

**Why this endpoint:** Single endpoint, rich response. One body — `{area, preset}` — returns overall score, all 5 dimensions, per-dim confidence, aggregate confidence, weights_source, engine_version. No auth-fail surface (proxy bears the API key); no quota to exhaust (`/v1/score` is NOT metered). User sees deterministic-engine output land in <1s, with transparency story (components + confidence + version) baked into response. `/v1/report` would be wrong here — generates AI narrative, is metered, heavier response; this page sells the deterministic score, not the narrated report.

**Response shape user sees:** JSON block showing: `score` (0-100), `preset`, `area_type`, then 5 dimensions each with key + label + score + weight + confidence, then aggregate confidence, `weights_source: 'preset'`, `engine_version: '2.0.2'`. Side-by-side render: left = curl request, right = response with 5 dimensions visualised as bars. Optional toggle: "try with custom weights" swaps in a weights object and recomputes — same engine, different aggregation, `weights_source` flips to `'custom'`.

**Postcode allowlist:** `M1 1AE, EC1A 1BB, B1 1AA, SW1A 1AA, LS1 4DT, NE1 7RU, BS1 4ST, OX1 2JD, CB2 1TN, YO1 7PR`

**Rate-limit suggestion:** 5 requests / 60s per IP at the demo proxy. Production `/v1/score` is 30/min/key.

## 2.8 Methodology proof

- `/methodology §7` (Scoring) — 4 preset × 5 dim matrix mirrored from `PRESET_DIMENSION_KEYS`, frozen v2 engine + applyWeights re-aggregation outside engine (ADR 0008).
- `/methodology §11` (Versioning) — semver, METHODOLOGY_VERSIONS registry, `SUPPORTED_ENGINE_VERSIONS` pin window, header vs body engine_version split (AR-131, ADR 0008).
- `/methodology §12` (Levers — per-org methodology) — org methodology pin (ADR 0031, AR-197), saved scoring presets (ADR 0030, AR-196), precedence rule.
- **ADR 0008** (Scores v3) — canonical primary source.
- **ADR 0030** (Levers — custom scoring presets) — 5 endpoints + `preset_id` resolution + error codes.
- **ADR 0031** (Levers — per-org methodology pinning) — GET/PUT/DELETE, precedence, defense-in-depth fallback.

## 2.9 Gotchas

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

---

# § 3 — Monitor

## 3.1 Thesis

Monitor is OneGoodArea's third product: save a book of areas, bulk-enrich them with deterministic scores, then on demand diff their stored time-series to detect material moves and fire signed webhooks. You create a portfolio, add up to 200 areas per call, bulk-enrich up to 50 at a time (concurrency 5), and `POST /v1/portfolios/:id/changes` to surface the (area, signal) pairs that moved beyond a threshold across the time-series corpus. Price moves are sample-size gated (default 8 transactions in both periods) so a 47% swing on 2 sales does not earn an alert. When something material happens, a Stripe-style HMAC-SHA256 signed payload lands on your registered HTTPS endpoint. Portfolios are scoped to the api-key's user today (org-scoping lands with Levers), and the only event the change-detector actually emits today is `signal.changed`. See ADRs 0009, 0013, 0014.

## 3.2 Primitive contract

Three typed shapes land on the wire: **Portfolio** / **PortfolioDetail** (tracked book + areas), **ChangeReport** (result of change-detection run, with material `SignalChange` rows), **WebhookSubscription** (signing secret + event filter). All Zod-validated in `@onegoodarea/contracts`.

**Zod source:** `packages/contracts/src/portfolios.ts`

| Field | Type | Description | Example |
|---|---|---|---|
| `Portfolio.id` | string | `pf_`-prefixed id. | `pf_8s2k4m9q` |
| `Portfolio.name` | string | Trimmed, max 200 chars. | `"UK lender book Q2"` |
| `Portfolio.area_count` | number? | Joined at list time. | `42` |
| `PortfolioDetail.areas[].area` | string | Area as added (postcode, place, LSOA code). | `"M1 1AE"` |
| `PortfolioDetail.areas[].label` | `string \| null` | Optional caller label. | `"Asset #142"` |
| `ChangeReport.portfolio_id` | string | Portfolio described. | `pf_8s2k4m9q` |
| `ChangeReport.baseline` | `'previous' \| 'first'` | What "from" means. | `"previous"` |
| `ChangeReport.threshold_pct` | number | `|pct_change|` must clear; default 5. | `5` |
| `ChangeReport.min_transactions` | number | Sample-size gate for price moves; default 8, 0 disables. | `8` |
| `ChangeReport.areas_checked` | number | Areas resolved to LSOA and diffed. | `42` |
| `ChangeReport.material_count` | number | (area, signal) pairs that moved ≥ threshold. | `7` |
| `ChangeReport.changes[]` | `SignalChange[]` | Material rows only. | `[{...}]` |
| `SignalChange.signal_key` | string | Catalog key. | `"property.median_price"` |
| `SignalChange.period_from / period_to` | string | YYYY-MM for monthly. | `"2025-01" / "2025-12"` |
| `SignalChange.value_from / value_to` | `number \| null` | Raw values. | `200000 / 260000` |
| `SignalChange.pct_change` | `number \| null` | Rounded to 2dp; null when baseline is 0/absent. | `30` |
| `SignalChange.direction` | `'up' \| 'down' \| 'flat'` | Sign of move. | `"up"` |
| `SignalChange.material` | boolean | `|pct_change| >= threshold_pct`. | `true` |
| `WebhookSubscription.url` | string | Public HTTPS endpoint. No localhost / RFC 1918. | `"https://api.example.com/oga/hook"` |
| `WebhookSubscription.events` | `string[]` | Subset of `['report.created', 'score.changed', 'signal.changed']`. | `["signal.changed"]` |
| `WebhookSubscription.secret` | string | Returned ONCE; `whsec_` prefix; HMAC-SHA256. | `"whsec_3a2c...e9"` |

## 3.3 Under the hood

**Store or compute?** Hybrid. The book itself (portfolios + portfolio_areas) is persisted; bulk enrich is synchronous fan-out over `scoreArea` (concurrency 5, cap 50, per-area failures captured as `error` strings); change detection is computed on demand by reading `signal_timeseries` for resolved LSOAs and diffing in memory via the pure `diffSeries`/`buildChanges` core. Static signals (e.g. deprivation, single stored period) silently produce nothing. Whole signal surface gated by `OGA_SIGNALS_API` via `guardSignals`; a failed gate returns 404, not 401.

**Lineage.** Every change row carries `period_from` / `period_to` / `value_from` / `value_to` + resolved `geo_code`. `X-Engine-Version` header set on enrich + changes responses. Webhook envelopes signed Stripe-style: `t=<unix-seconds>.<raw-json-body>` HMAC-SHA256, sent as `X-OneGoodArea-Signature: t=<ts>,v1=<hex>`, alongside `X-OneGoodArea-Event` + `X-OneGoodArea-Delivery` headers. Delivery row persisted in `webhook_deliveries` (status / http_status / attempts / response_body snippet) so failures are auditable.

**RBAC + Levers interplay.** **Portfolios are scoped to api-key's `user_id` today** — ownership enforced by WHERE clause on every query. NO `org_id` on portfolios yet. The Levers epic re-scopes when org tenancy + RBAC land (ADR 0009 explicitly defers it). Custom signal bundles, methodology pinning, peer cohorts do NOT modify Monitor today.

**Rate limits / quota.** Hard caps in code (NOT plan-quota):
- `PORTFOLIO_ADD_MAX = 200` areas per add call
- `PORTFOLIO_ENRICH_MAX = 50` areas per enrich call (`ENRICH_CONCURRENCY = 5` in-flight)
- `CHANGE_AREA_MAX = 100` areas per change-detection call
- `DEFAULT_THRESHOLD_PCT = 5`, `DEFAULT_MIN_TRANSACTIONS = 8`
- `WEBHOOK_DELIVERY_TIMEOUT_MS = 5000` (5s POST timeout)
- Failed webhook rows recorded for retry cron

Each call meters `api.portfolio.created` / `api.portfolio.areas_added` / `api.portfolio.enriched` / `api.portfolio.changes_checked` against caller's plan via `requireApiAccess`.

## 3.4 Endpoints

### `POST /v1/portfolios`
Create empty book. Body: `name` (string, ≤200). 201 with `{ id, name, area_count: 0 }`. 400 missing/oversized name · 401 · 404 (flag off). RBAC: any-API-key.

### `GET /v1/portfolios`
List caller's portfolios. Response: `{ portfolios: Portfolio[] }` sorted by `created_at` desc, joined `area_count`.

### `GET /v1/portfolios/:id`
Fetch one with all areas. `PortfolioDetail: { id, name, area_count, areas: PortfolioArea[] }`. 404 not owned / doesn't exist.

### `DELETE /v1/portfolios/:id`
Soft cascade (manual — no FK constraints). 200 `{ deleted: true }`.

### `POST /v1/portfolios/:id/areas`
Add areas (dedup on `(portfolio_id, area)`, cap 200/call). Body: `areas: Array<{ area: string; label?: string|null }>` (1..200). 200 `{ added: number }` — duplicates silently skipped via `ON CONFLICT DO NOTHING`.

### `POST /v1/portfolios/:id/enrich`
Bulk-score every tracked area. Synchronous, cap 50, concurrency 5. Per-area failures captured. Body: `preset?` (`moving`/`business`/`investing`/`research`, default `research`). 200 `{ count, results: PortfolioEnrichItem[] }` — each `{ area, label, score: ScoreResult|null, error: string|null }`. `X-Engine-Version` stamped.

### `POST /v1/portfolios/:id/changes`
Detect material moves + fire `signal.changed` webhooks. On-demand, no cron. Body fields all optional:
- `baseline`: `'previous'` (default) or `'first'`
- `threshold_pct`: number ≥0, default `DEFAULT_THRESHOLD_PCT = 5`
- `min_transactions`: number ≥0, default `DEFAULT_MIN_TRANSACTIONS = 8`; BOTH periods need ≥N transactions for price moves; 0 disables
- `emit`: boolean, default true

Response: `ChangeReport` with material-only rows. Status: 200 (material_count may be 0 — also signal) · 400 invalid args · 404 not owned.

**Sample curl:**
```
curl -X POST https://api.onegoodarea.com/v1/portfolios/pf_8s2k4m9q/changes \
  -H 'Authorization: Bearer oga_live_...' \
  -H 'Content-Type: application/json' \
  -d '{"baseline":"first","threshold_pct":5,"min_transactions":8}'
```

### Webhooks: `POST /v1/webhooks` · `GET /v1/webhooks` · `DELETE /v1/webhooks/:id`

- **POST** body: `url` (public HTTPS, no `http://`/`localhost`/`127.0.0.1`/`0.0.0.0`/`::1`/`10.x`/`192.168.x`/`169.254.x`/`172.16-31.x`), `events: string[]` (subset of `SUPPORTED_EVENT_TYPES = ['report.created', 'score.changed', 'signal.changed']`; unknowns silently filtered). Response 201: `{ id, url, events, secret: 'whsec_...', created_at }`. **Save the secret — never returned again.**
- **GET** lists active subscriptions (secret omitted).
- **DELETE** soft-deletes (status → `'revoked'`).

## 3.5 Compound grammar — `POST /v1/portfolios/:id/changes` body

All fields optional:

```
{
  "baseline":         "previous" | "first",   // default "previous"
                                              // "previous" = latest vs prior period
                                              // "first" = latest vs oldest in stored range
  "threshold_pct":    number >= 0,            // default 5. |pct_change| clears this to be material
  "min_transactions": number >= 0,            // default 8. BOTH periods need >= N transactions
                                              // for a price move (property.median_price) to count.
                                              // 0 disables. Applied only to signals with a backing
                                              // count series (today: property.median_price gated
                                              // by property.transaction_count). Other signals ungated.
  "emit":             boolean                 // default true. Fire signal.changed webhooks
}
```

Server-side caps: `CHANGE_AREA_MAX = 100` areas resolved per call. Sample series themselves (e.g. `property.transaction_count`) are NEVER emitted as `signal.changed` — they are gating inputs, not alert subjects.

## 3.6 ICP narratives

### InsureTech ⭐
**Problem:** An insurer's book of insured locations is a portfolio that drifts continuously: median prices move, deprivation context shifts neighbourhood by neighbourhood, crime patterns rebalance. Pricing teams need to know when the assumed risk profile of a tracked LSOA has actually changed — not at renewal, ongoing — and they need the alert to be auditable, not a black-box score.

**Why this product:** Monitor IS the InsureTech surface. Save the book as a portfolio, enrich on intake, then run change-detection on a cadence. Material moves arrive as signed `signal.changed` webhooks with the exact signal_key, period_from/to, value_from/to and pct_change. Sample-size gating (min_transactions=8 default) is exactly the de-noising an actuarial team needs to avoid alerting on 2-sale LSOA-months.

**Their value:** Exposure drift detected continuously, not at renewal. Every alert auditable (raw values + periods + threshold + sample gate in the same envelope). HMAC-SHA256 signed delivery means it's fit for downstream automated pricing or referral workflows.

**Sales line:** Sign up your insured-location book as a portfolio, get HMAC-signed alerts when a tracked LSOA's price or risk signal moves materially.

### Lender
**Problem:** A residential or commercial lender's book is geographically concentrated, and the questions are "where has location-risk drifted?" and "which LSOAs have moved enough to retrigger LTV stress?". Manual re-screening at portfolio scale is impossible; spreadsheet-based reviews lag the actual moves by quarters.

**Why this product:** Monitor stores the book once, bulk-enriches on intake (sync up to 50, concurrency 5), then runs change-detection ad hoc or scheduled. `baseline='first'` surfaces cumulative drift since onboarding; `baseline='previous'` surfaces month-on-month moves. Both report exact `value_from`, `value_to`, `pct_change` for each tracked LSOA-signal pair.

**Their value:** Risk teams can prove "we knew on date X" for every material move. Full enrich + changes loop is one HTTP surface, behind one API key, with same engine_version stamp as rest of platform.

**Sales line:** Track location-risk drift across the lending book, with sample-size-gated change alerts that you can audit row-by-row.

### PropTech
**Problem:** PropTech platforms surface portfolio dashboards, alerts and "what changed this month" digests to landlords, agents and asset managers. They have the UI; they do not have a deterministic, signed source of area-level change that they can ship to their customers without owning a data team.

**Why this product:** Attach a portfolio to each customer's book and call `/v1/portfolios/:id/changes` on a cadence they control. Output is shaped for UI: one row per (area, signal) with period_from/to, value_from/to, pct_change, direction, material — feed straight into a "movers this month" panel. Webhooks turn that into push notifications without polling.

**Their value:** Ship a "portfolio intelligence" feature on top of OneGoodArea instead of building it. Customers get area-level signal moves with stamped engine_version + lineage, not vibes. Sample-size gating means they don't embarrass themselves with a 47% move on 2 sales.

**Sales line:** Attach a OneGoodArea portfolio to every customer book, get signed change webhooks, ship a movers feed without a data team.

### CRE / site selection
**Problem:** A site-selection or CRE team carries a watchlist of candidate locations: short-listed development sites, tenant catchments, comparable hold areas. They want to know when a watched area's price or trend signal has moved enough to revisit the underwriting — without re-running ad-hoc reports every week.

**Why this product:** A watchlist is a portfolio, candidates are areas, and `/v1/portfolios/:id/changes` with `baseline='first'` tells you which watched LSOAs have moved since you started watching. `threshold_pct` tunes what "material" means for their underwriting hurdle.

**Their value:** Team stops re-running area reports manually. Material moves arrive as a list (or webhook), with exact pct_change and from/to periods needed to retrigger an underwriting review. Static signals correctly do nothing — only signals that actually move trigger.

**Sales line:** Your watchlist as a portfolio; tunable change-detection tells you which sites have moved enough to revisit.

### Public sector
**Problem:** Local authority and central-gov analytical teams hold lists of priority LSOAs (regen targets, levelling-up wards, intervention catchments) and need a defensible, lineage-stamped record of how their tracked areas have moved over time. The honest answer is often "we cannot tell yet, sample size too small" — and the team needs the system to say that, not to hallucinate a move.

**Why this product:** Monitor is honest by construction: a single-period signal (deprivation) produces no change row. A price move on 2 sales is filtered by `min_transactions=8`. The `ChangeReport` carries baseline + threshold_pct + min_transactions, so a published "areas that moved" note has the methodology stamped inside the artifact. Webhooks are optional — the sync endpoint is fine for analyst-driven workflows.

**Their value:** A reproducible, lineage-stamped record of which tracked areas moved between two periods, with the gating decisions visible in the artifact. No vendor black-box; the diff core is documented in ADR 0013/0014 and unit-tested.

**Sales line:** Track priority LSOAs as a portfolio, get a lineage-stamped change report with honest sample-size gating built in.

## 3.7 Demo strategy

**Endpoint:** `POST /v1/portfolios/:demoId/changes` (proxied as `/api/demo/v1/portfolios/:demoId/changes`)

**Why this endpoint:** Monitor is stateful — a real demo would need create-portfolio + add-areas + (wait for time-series) + changes, which is hostile in a marketing widget. The honest play is a **PRE-SEEDED demo portfolio** (e.g. "Demo portfolio: 4 inner-Manchester LSOAs") maintained server-side by the demo proxy. The TryItPanel renders a frozen portfolio summary + an "Run change detection" button calling `POST /changes` with the body the user can edit (baseline, threshold_pct, min_transactions). Feels read-only (no portfolio mutation in widget), exercises the actual diff core against real time-series data, shows the sample-size gate live by toggling min_transactions between 0 and 8.

**Response shape user sees:** A `ChangeReport` JSON pane (baseline, threshold_pct, min_transactions, areas_checked, material_count) plus a small table of `SignalChange` rows (signal_key, area, period_from → period_to, value_from → value_to, pct_change %, direction arrow). Toggling min_transactions 0→8 visibly drops noisy rows. "No material changes" is the honest empty case — annotate "Nothing moved past your threshold + sample gate."

**Postcode allowlist:** Not postcode-based. Fixed portfolio ids — allowlist to `pf_demo_manchester_inner, pf_demo_city_of_london, pf_demo_birmingham_central`. Block any other portfolio id. Body params parsed and clamped: `baseline ∈ {previous, first}`, `threshold_pct ∈ [0, 50]`, `min_transactions ∈ [0, 50]`, `emit` FORCED to `false` (no webhooks fire from demo).

**Rate-limit suggestion:** 5 requests / 60s per IP. Daily ceiling 200/day/IP.

## 3.8 Methodology proof

- `/methodology` change-detection section — diff core (`diffSeries`/`buildChanges`), baseline modes, sample-size gate.
- **ADR 0009** — Monitor v1: portfolios + bulk enrich, user-scoped, 50-area sync cap, deferred org-scoping.
- **ADR 0013** — Monitor change detection (`signal.changed`): pure diff core, on-demand endpoint, static signals correctly silent, `score.changed` deferred.
- **ADR 0014** — Property YoY + change-detection de-noising: sample-size gate, transaction_count as gate-not-alert, 2-year backfill makes YoY work.
- `/methodology` Webhooks section — Stripe-style HMAC-SHA256, X-OneGoodArea-Signature, public-HTTPS-only, 3-event catalog.
- Unit test `apps/api/tests/modules/monitor/change-detection.test.ts` — diff core tested without DB or network.

## 3.9 Gotchas

1. Portfolios are scoped to api-key's `user_id` today, NOT org. Org-scoping deferred to Levers (ADR 0009).
2. Bulk enrich is SYNCHRONOUS, cap 50, concurrency 5. Lender book of thousands can't be enriched in one call today. Async `portfolio_runs` is next increment, not shipped.
3. Change detection is ON-DEMAND only. NO scheduled auto-detect cron today. ADR 0013 names cron as future increment.
4. Supported event catalog is EXACTLY 3 events: `report.created`, `score.changed`, `signal.changed`. There is **NO** `portfolio.changed`. Do not invent.
5. Of the 3 catalog events, change-detection ONLY fires `signal.changed` today. `score.changed` is in `SUPPORTED_EVENT_TYPES` but NOT emitted by Monitor (requires per-period composite scoring, deferred). `report.created` fired by Reports, not Monitor.
6. Static signals (deprivation IMD, single-period catalog) produce ZERO change rows. `diffSeries` returns null when <2 periods.
7. Price move sample-size gating defaults `min_transactions=8` in BOTH periods. Below that, silently dropped. Set `min_transactions: 0` to disable — expect noise.
8. `property.transaction_count` is a SAMPLE signal (gates `property.median_price`), NEVER itself a change subject. A "2 sales became 1" move will never fire.
9. Webhook destinations must be PUBLIC HTTPS. Rejects http://, localhost, 127.0.0.1, 0.0.0.0, ::1, RFC 1918, link-local.
10. Webhook signing secret (`whsec_...`) returned ONCE. Storing it is caller's job.
11. `WEBHOOK_DELIVERY_TIMEOUT_MS = 5000` — 5s timeout. Slow receivers recorded as failures.
12. `CHANGE_AREA_MAX = 100` — change detection only resolves + diffs first 100 areas in a portfolio per call. No pagination yet.
13. `X-Engine-Version` stamped on enrich + changes, but headline `ScoreResult.median_price` is annual median while `pct_change` is computed on volume-weighted monthly aggregate (ADR 0014) — two slightly different central measures. Documented, not invented away.

---

# § 4 — Intelligence

## 4.1 Thesis

Intelligence is a typed query + insight plane over the UK area moat. **Not a chatbot, not narrative — AI never sets the numbers.** Six plan ops (`rank_areas` singular, `rank_areas` compound, `get_area`, `score_area`, `find_peers`, `find_insights`, `find_forecast`) sit under one Zod-strict discriminated union; the executor dispatches deterministically against Postgres, and every response echoes the executed plan plus `plan_source` so any answer is replayable as a programmatic call. `POST /v1/query` accepts either `{plan}` (LLM never touched — the JSON grammar IS the API) or `{question}` (the planner translates NL through the AiProvider seam into the SAME typed plan, then the SAME executor runs it). Measured baseline: **92.9% planner accuracy on a 14-case curated corpus** against `claude-sonnet-4-20250514`, with a Wilson 95% CI of roughly 70-99%. `/v1/peers`, `/v1/insights`, `/v1/forecast` are convenience endpoints over the same plan ops — one implementation per capability, two surfaces.

## 4.2 Primitive contract

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

## 4.3 Under the hood

**Store or compute?** Hybrid. `/v1/query` dispatches a Zod-validated `QueryPlan` to `executor.ts`, which calls existing module functions (`queryAreas` / `queryAreasCompound` / `getAreaProfile` / `scoreArea` / `findPeers` / `findInsights` / `runForecast`). No new DB code, no inference. Compound `rank_areas` is one `signal_values` INNER JOIN per signal (plus matching `signal_percentiles` LEFT JOIN), all parameters bound through `query(text, params)` — no SQL injection surface. `find_insights` is a single ORDER BY scan over a pre-materialised peer-relative-z derived signal (heavy peer math runs OFFLINE in `refresh:peers` + `derive:signals`). `find_forecast` is one Postgres `regr_slope`/`regr_intercept`/`regr_r2`/`regr_syy` aggregate over `signal_timeseries` + JS-side projection — no pre-computation. `find_peers` does two SQL round-trips per request. All endpoints behind `OGA_SIGNALS_API` + `requireApiAccess` (or `guardSignals` for insights/forecast). 404 when flag off.

**Lineage.** Every response echoes the executed plan plus `plan_source` so any answer is replayable as a programmatic call — that IS the audit-safety contract (ADR 0017). Forecast meta exposes `n_observations` / `r2` / `slope_per_month` / `intercept` / `residual_stderr` / `latest_observed_period` so callers can re-compute textbook CIs themselves. Insights expose signed `peer_relative_z` + `abs_z`. Peers expose `distance` + `n_dims_used`. `X-Engine-Version` header stamps every response. `peer_assignments` rows carry `computed_at` + `engine_version`. AI eval corpus (`eval/cases.ts`) and 92.9% baseline are version-controlled in-repo.

**RBAC + Levers interplay.** Three Levers integrations:
1. **Custom Signal Bundles** — when `?bundle=` or `body.bundle` is set, `resolveBundleForCaller` fetches the org's whitelist; AFTER planning/execution, `planSignalsOutsideBundle` walks the typed plan and returns 422 `bundle_signal_not_allowed` if any referenced signal_key is outside (caveat: `get_area` and `score_area` plan ops currently bypass — v1 gap, ADR 0034).
2. **Peer Cohorts** — `/v1/peers` accepts `body.cohort_id`; `getCohort` resolves org's named LSOA subset and constrains candidate set inside `buildPeersSql`.
3. **Methodology Pinning** — every response sets `X-Engine-Version` via `effectiveEngineVersionForCaller(orgId, userId)` so a pinned org sees deterministic methodology across runs.

White-label + IP allowlist (AR-200) apply to the API key, not the surface.

**Rate limits / quota.** Standard `requireApiAccess` metering: `api.query.executed` (tagged with op + plan_source + bundle), `api.peers.queried`, `api.insights.queried`, `api.forecast.queried`. Suggested per-IP rate limit on `/v1/query` is LOWER than other surfaces because NL mode burns LLM credits; programmatic `{plan}` mode is free of that cost. `/v1/peers`, `/v1/insights`, `/v1/forecast` are pure SQL — heavier per-call DB work but no LLM.

## 4.4 Endpoints

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

## 4.5 Compound grammar

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

## 4.6 ICP narratives

### CRE / site selection ⭐
**Problem:** A retail or site-selection team has to screen hundreds of candidate catchments at once against compound criteria: affordable footprint, rising demographic momentum, low crime, deprivation profile that matches the brand's customer. Today they paste together ONS extracts, Land Registry, and a crime spreadsheet, then re-rank by hand. Each refresh of the criteria means rebuilding the join. Adding a new constraint means a new spreadsheet.

**Why this product:** `POST /v1/query` with a compound `rank_areas` plan answers all of that in one typed call: `signals[]` up to 8 constraints, AND-joined on the server, `sort_by` any of them, country/LAD scope, limit. `find_peers` narrows a shortlist to "areas like our best-performing store" in one call (k-NN over normalised signals, ~840k peer_assignments rows over 42k LSOAs × k=20). `find_insights` flags catchments where one signal is unusually high or low vs their peer group. The plan grammar IS the API — they can codify their screening as a versioned JSON object and replay it monthly.

**Their value:** Hundreds of catchment screens compress into one round trip. Criteria are version-controlled JSON, not a spreadsheet. The shortlist is reproducible: every result echoes the executed plan so a colleague can paste it back and get the same answer.

**Sales line:** Screen the whole UK against your compound site criteria in one typed call, then ask for the peer set of your best-performing catchment.

### Public sector
**Problem:** Research and policy teams have to defend every number they publish. A black-box AI score is unusable — they need to point at the methodology, the inputs, and the SQL. They also need the analysis to be reproducible next quarter when the data refreshes.

**Why this product:** Every Intelligence response echoes the executed plan and `plan_source` (`'client'` for programmatic, `'nl'` for planner-derived), so any answer is replayable as a programmatic call — that IS the audit-safety contract. Forecast meta exposes `n_observations`, `r2`, `slope_per_month`, `intercept`, `residual_stderr`, `latest_observed_period`; insights expose signed `peer_relative_z` + `abs_z`; peers expose `distance` + `n_dims_used`. No inference inside the executor — it dispatches a Zod-validated plan to deterministic Postgres queries. The 14-case curated corpus and the 92.9% planner-accuracy baseline are version-controlled in-repo (ADR 0026).

**Their value:** Methodology defensibility. The team can point at a published ADR, a Zod schema, and the SQL that produced every row. The "AI" is constrained to picking the query, never to setting the numbers.

**Sales line:** An AI query plane where the AI is the interface, not the answer — every row traces to deterministic SQL and a published methodology.

### Lender
**Problem:** A regulated lender needs an answer they can defend to a model risk committee. "Our planner uses AI" is a non-starter unless it's measurable, version-pinned, and auditable. They also can't have the methodology silently change between two quarterly portfolio runs.

**Why this product:** Three guarantees together: (1) the 92.9% planner-accuracy baseline on the **14-case curated corpus** is published with its methodology (ADR 0026, `eval/cases.ts`, `eval/compare.ts` — Wilson 95% CI roughly 70-99%), (2) the executed plan + `plan_source` ride in every response so model risk team can replay any NL answer as a deterministic `{plan}` POST, (3) the `X-Engine-Version` header honours methodology pinning per org (Levers AR-197) so two runs at the same pin return the same numbers. `find_forecast` exposes `r2` / `residual_stderr` / `n_observations` so the lender can filter on quality before acting on a projection.

**Their value:** Auditable AI-assisted screening. Compliance story is "here's the corpus, here's the accuracy number, here's the version we ran under, here's the plan that produced this row" — not "the LLM told us."

**Sales line:** AI-assisted area queries with a published accuracy number, a typed plan you can replay, and a methodology-pin header so quarterly runs are deterministic.

### InsureTech
**Problem:** An underwriter needs to comp a risk postcode against its true peer group — not "national average", not "same town", but areas with similar demographic and built-environment signatures. They also need to spot catchments drifting away from that peer norm before the loss ratio tells them.

**Why this product:** `find_peers` gives a stable, symmetric similarity metric (Euclidean dimension-mean-squared over normalised signals in `[0,1]`, bounded, robust to missing dimensions) — same definition of "peer" used by peer-relative-z derived signals. `find_insights` then ranks LSOAs by `ABS(peer_relative_z)` on `crime.total_12m_peer_relative_z` or `property.median_price_peer_relative_z` so the underwriter scans for "unusually high crime vs its peer group" rather than absolute terms — the right signal for relative risk. `cohort_id` (Levers AR-198) lets the org pin a custom peer set when the global graph isn't tight enough.

**Their value:** A relative-risk lens, not just absolute. Underwriter can defend a flag as "this catchment is 3.8 stddev from its peer group on crime", with the peer set itself materialised and inspectable.

**Sales line:** Peer-relative anomaly screening over a materialised similarity graph — comp risk against a real peer group, not a postcode-district average.

### PropTech
**Problem:** Listing platforms and property search products want to surface "areas like this one" tiles and answer ad-hoc natural-language queries from users ("cheap places to buy where prices are rising and crime is low"). They don't want to build a query planner, an AI ops stack, or a peer-graph cache. They want the answer to feel like the platform's own without taking on the methodology debt.

**Why this product:** `POST /v1/query` takes the user's free-text question, the planner translates it through the SAME deterministic executor used in programmatic mode, response carries the executed plan back — so PropTech can either render the rows directly OR pre-stage a common set of queries as `{plan}` bodies (no LLM cost per page-load). `find_peers` is the "similar areas" tile in one call. NL is a secondary mode on top of a programmatic plane, not the only mode.

**Their value:** Two surfaces (NL for ad-hoc, `{plan}` for high-traffic) over one executor. No internal planner to maintain, no LLM-cost-per-pageview unless they want it.

**Sales line:** One typed API behind both your "similar areas" tile and your natural-language area search.

## 4.7 Demo strategy

**Endpoint:** `POST /v1/query` with `{question}`

**Why this endpoint:** The showstopper. The whole pitch — typed plan grammar, AI as interface not answer, every result traces to deterministic SQL — collapses into one widget: paste a natural-language question, watch the planner emit a typed plan, see the rows that came out of the database, copy the plan and replay as a programmatic call. No other surface lands the dual-mode framing as viscerally. The 6 plan ops mean a small curated prompt list can demo the full surface.

**Response shape user sees:** Two panels side by side. **Left:** the executed plan JSON (`plan_source: 'nl'`). **Right:** typed results — for `rank_areas`, an AreaResult table; for `find_peers`, a peers list with distance + n_dims_used; for `find_forecast`, projected points with lower_bound/upper_bound and r2/n_observations. Below: "copy as cURL" showing the equivalent programmatic `{plan}` body. Visual punch line: **AI picked the query, the database produced the answer, and here's how to replay it without AI.**

**Postcode allowlist:** `M1 1AE, SW1A 1AA, EC1A 1BB, B1 1AA, L1 8JQ, LS1 1UR, NE1 1AD, BS1 4ST, G1 1XL, CF10 1EP` plus a **curated NL-prompt allowlist** (10–15 prompts from the eval corpus, e.g. "most deprived LSOAs in Manchester", "cheapest places to buy in England", "England areas under 250k AND rising YoY AND low crime", "areas similar to M1 1AE in England", "forecast median house price in M1 1AE next 12 months", "England LSOAs with anomalously high crime vs peers |z| >= 2").

**Rate-limit suggestion:** 3 requests / 60s per IP for `/v1/query` NL mode (lower than other surfaces — each call burns Anthropic LLM credit; proxy should also enforce curated prompt allowlist). 10 requests / 60s for `{plan}` mode demos (no LLM cost). 10 requests / 60s for standalone `/v1/peers`, `/v1/insights`, `/v1/forecast` demos.

## 4.8 Methodology proof

- `/methodology §9` (Intelligence query plane — 6 plan ops + dual input mode).
- `/methodology §10` (Confidence — n_observations, r2, residual_stderr, abs_z, n_dims_used surfaced per response).
- **ADR 0017** — Intelligence v1: typed query plane. Plan grammar IS the API; planner vs executor separation; AiProvider seam; 422 with raw LLM output on invalid plan.
- **ADR 0019** — Multi-signal compound `rank_areas`. signals[] 1..8, filter operators, AND semantics via INNER JOIN, sort_by refinement. ~70-80% of ICP screening questions unlocked with no new endpoint.
- **ADR 0023** — `POST /v1/peers` (k-NN over normalised signals). Euclidean dimension-mean-squared, symmetric, bounded `[0,1]`, min_signals HAVING guard.
- **ADR 0024** — Peer-relative derived signals + `POST /v1/insights`. peer_assignments materialised (~840k rows), 2k-target chunking around Neon 5min HTTP cap.
- **ADR 0025** — `POST /v1/forecast` (linear projection). Postgres `regr_*`, constant-width CI `±2 · residual_stderr` (NOT widening), explicit non-claims (no ARIMA / Holt-Winters / Prophet / seasonality / outlier filtering, one signal one LSOA).
- **ADR 0026** — AI eval harness. 14-case curated corpus, comparePlans subset deep-diff, **92.9% baseline against claude-sonnet-4-20250514**, Wilson 95% CI ~70-99%, gated CLI behind `OGA_EVAL_PLAN`. Marketing copy MUST say "92.9% on a 14-case curated corpus" not "92.9% planner accuracy".

## 4.9 Gotchas

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

---

# § 5 — Build order

The 4 product pages depend on shared infrastructure. PR order:

| # | PR | What | Depends on |
|---|---|---|---|
| 1 | **Demo proxy backend** | `apps/web/src/app/api/demo/v1/[...path]/route.ts` — Next.js Route Handler that server-side proxies a curated set of read endpoints to apps/api with a system demo key (env var, never exposed). Per-IP rate limit (token bucket in memory or Vercel KV). Postcode allowlist + body-param clamping enforced in proxy. Curated NL-prompt allowlist for `/v1/query`. | none |
| 2 | **`<TryItPanel />` shared component** | `apps/web/src/app/design-v2/_shared/try-it-panel.tsx` + co-located CSS. Generic widget: accepts an endpoint + a curated set of pre-filled inputs + a response renderer. Reused on all 4 product pages. | PR 1 |
| 3 | **`/products/signals`** | Brand v3 marketing page. Hero + 5 sections (primitive, under the hood, endpoints, ICP narratives, CTA) + inline `<TryItPanel />` on `GET /v1/area`. | PRs 1-2 |
| 4 | **`/products/scores`** | Same template. `<TryItPanel />` on `POST /v1/score` with preset toggle + custom weights demo. | PRs 1-2 |
| 5 | **`/products/monitor`** | Same template. `<TryItPanel />` on pre-seeded demo portfolio + `POST /changes`. | PRs 1-2 |
| 6 | **`/products/intelligence`** | Same template. `<TryItPanel />` on `POST /v1/query` with curated NL prompts. Flagship. | PRs 1-2 |

After PR 6 ships:
- Nav Products mega-menu: 4 disabled "Coming soon" pills flip to real links
- Footer Products column: same
- Homepage § 03 product cards: same
- `/docs` § 01 product cards: optionally add secondary "See product" link

Each PR follows the iteration loop: build → `npm run dev` → Pedro localhost approval → commit → PR + CI → squash-merge.
