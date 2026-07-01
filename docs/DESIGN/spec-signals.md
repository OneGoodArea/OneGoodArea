# Product spec — Signals

> Part of [AR-204 product-pages spec pack](./AR-204-product-pages-spec-pack.md).

## Thesis

Signals is the deterministic, addressable UK area-data layer. For any UK postcode or place name we resolve the area down to its ONS Lower-layer Super Output Area (LSOA) and return a stable catalog of typed signals across seven categories — crime, deprivation, property, schools, amenities, transport, environment — each with a raw value, unit, direction, source, observed period, per-signal confidence and (where the persisted store backs it) a national percentile and a normalized 0-1 position. Provenance is on the wire on every response: `meta.fetch_mode` is honestly `"live"`, `"store"` or `"hybrid"` depending on which sources came from the persisted store versus a live upstream fetch. The same shape is the response of `/v1/area` (one area, all signals), `/v1/signals/:category` (one area, one category) and `/v1/areas` (rank LSOAs across a country or local authority by a single signal's value or percentile). Signals is the primitive the rest of the product composes — Scores adds weights, Monitor adds change detection, Intelligence adds the typed query plane — but the deterministic data layer is the product you buy here.

## Primitive contract

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

## Under the hood

**Store or compute?** Hybrid by design. Three sources are served from the persisted signal store (Postgres) when their LSOA row is present and `OGA_SIGNALS_STORE_READ` is enabled: **deprivation** (IMD/WIMD/SIMD), **property** (HM Land Registry, England & Wales, window-median per LSOA + monthly history), **crime** (police.uk bulk archive, trailing-12-month total + monthly time-series). The remaining four (amenities, transport, schools, environment) are fetched **live** per request from upstream APIs. Every signal goes through the same `buildAreaProfile` mapper so a store-served signal is byte-equivalent to a live-served one in shape. Store misses (e.g. Scotland prices, since HM Land Registry is E&W only) fall back to live automatically with no special-casing. See ADRs 0001/0002/0004/0011/0012/0015/0016.

**Lineage.** Every row in `signal_values` and `signal_timeseries` carries `source_snapshot_id` + `engine_version` + `boundary_version` (e.g. `"2021"` for the ONS spine). `source_snapshots` is an append-only provenance ledger (id, source, release, ingested_at, licence, checksum, row count). Every refresh job writes one row; every served value points back to one snapshot. On the wire: `meta.fetch_mode`, `meta.engine_version`, `meta.generated_at`, and the `X-Engine-Version` response header.

**RBAC + Levers interplay.** All Signals endpoints are opt-in gated through the Levers stack: `?bundle=<id>` on `/v1/area` and `/v1/areas` filters the response to the org's signal-key whitelist (AR-195); an org methodology pin overrides `meta.engine_version` + the header (AR-197); the api-key row's `allowed_ip_cidrs` (AR-200) is enforced at auth (403 `ip_not_allowed`); org white-label fields surface on `/v1/me` for branded report wrappers. With no Levers config set, behaviour is unchanged.

**Rate limits / quota.** Auth is API-key only (`Authorization: Bearer oga_...`). Per-key rate limit is **30 req/min** for the API surface. The monthly REPORT quota does NOT apply to Signals — no report is generated. Activity events: `api.area.profiled`, `api.signals.category`, `api.areas.queried`. Entire surface is dark-flagged behind `OGA_SIGNALS_API`; routes 404 like an unknown path when off, before auth. Store-read path is independently flagged via `OGA_SIGNALS_STORE_READ`.

## Endpoints

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

## Compound grammar

Single-signal grammar only on `/v1/areas`. Filters compose as AND across `country` + `lad` + one each of `min_percentile`/`max_percentile`/`min_value`/`max_value` against the named `signal`. The MULTI-signal compound grammar (`signals: [{ key, filter }, ...]` with `sort_by` and 11 filter operators) lives on `/v1/query` under Intelligence — **NOT** on `/v1/areas`. Marketing copy for Signals must not claim compound multi-signal filters here; point compound users to the Intelligence product page.

## ICP value (compressed)

| ICP | One-line value |
|---|---|
| PropTech ⭐ | Drop one `/v1/area?postcode=` call into the property-detail page and ship the seven-category catalog at LSOA grain with comparable percentiles + lineage — weeks of gov-API integration replaced by one key. |
| InsureTech | Deterministic, dated, pinnable inputs: every Signal carries `source_snapshot_id`, `engine_version`, `observed_period`, `confidence` — reproducible on actuarial audit. |
| Lender | `/v1/area` national-within-country percentiles + `/v1/areas` LSOA-grain ranking for batch screening, country-scoped so cross-border methodology lies are structurally impossible. |
| CRE / site selection | `/v1/areas` threshold-and-ranks the LSOA universe by country/LAD in one HTTP call, then `/v1/area` drills into shortlisted areas' full profile. |
| Public sector | Explicit `source` + `observed_period` + `confidence` per Signal, country-scoped percentiles (no false cross-GB comparison), methodology version stamped per response — FOI-defensible. |

## Demo strategy

**Endpoint:** `GET /v1/area?postcode={postcode}`

**Why this endpoint:** It is the canonical one-shot proof of the product. One query param resolves to a full seven-category catalog with lineage and (where store-backed) percentiles — the entire pitch of "Signals is the typed UK area-data layer" is visible in a single JSON payload. No body to construct, no auth-fail edge cases beyond a curated postcode allowlist, no compound grammar to teach. `/v1/areas` would be a stronger differentiator demo but requires three more decisions from the user (signal key, country, threshold) and would feel like a search box instead of "feel the primitive".

**Response shape user sees:** Formatted JSON pane showing the resolved `geo` block (postcode → LSOA → admin_district → country → urban/suburban/rural), the seven-category `signals[]` catalog with value + unit + direction + percentile + confidence + source + observed_period on each row, and the `meta` block. Pretty-print highlights `percentile`, `confidence`, `source` to draw eye to lineage and normalisation.

**Postcode allowlist:** `M1 1AE, EC1A 1BB, SW1A 1AA, B1 1AA, LS1 4DT, CF10 1EP, EH1 1YZ, G1 1XW, BS1 4ST, NE1 5DW`

**Rate-limit suggestion:** 5 req / 60s per IP at the demo proxy; hard cap 50 / 24h per IP. The real `/v1/area` limit is 30/min per API key — the demo proxy is intentionally tighter.

## Methodology proof

- `/methodology section 3` (the persisted signal store) — store-backed percentiles vs live-fetched (ADRs 0002, 0004).
- `/methodology section 5` (Normalisation) — country-scoped percentile rule (ADR 0005). No cross-GB deprivation comparison.
- `/methodology section 6` (ONS geo spine) — LSOA addressability + postcode → LSOA/LAD/region (ADR 0006).
- `/methodology section 10` (time-series + moat clock) — `signal_timeseries` monthly history (ADR 0010), powers derived signals like `property.price_change_pct_yoy` (ADR 0018).
- `/methodology section 11-12` (property store flip) + `section 15-16` (crime store flip) — explain hybrid `fetch_mode` (ADRs 0011/0012/0015/0016).

## Gotchas

1. Do NOT claim every response is served from the store. `fetch_mode` is `live`, `store` or `hybrid` per response.
2. Do NOT claim postcode-grain addressability. Canonical grain is LSOA (~42k UK areas).
3. Do NOT enumerate source names on marketing copy (AR-204 section 5 rule). Seven categories are public; specific attributions live on `/methodology` and on the `source` field at runtime.
4. Do NOT claim live-API-per-request universally — that was v1; three sources are store-backed when LSOA coverage exists.
5. Do NOT claim Scotland prices. HM Land Registry is E&W only; Scotland LSOAs fall back to live (may have no value).
6. Do NOT claim Wales/Scotland deprivation store-read parity with England. England IMD 2025 uses 2021 LSOA codes; WIMD 2019 / SIMD 2020 use 2011 codes that store-miss and fall back to live.
7. Do NOT claim multi-signal compound filtering on `/v1/areas` — that lives on `/v1/query` under Intelligence.
8. Do NOT claim region-scoped ranking on `/v1/areas` — only `country` and `lad` supported today.
9. Do NOT claim calibrated outcome-based confidence. v1 is availability/sample based; calibrated is Phase 7.
10. Do NOT forget the dark flags. Entire surface behind `OGA_SIGNALS_API`; routes 404 like unknown paths when off. Store-read independently gated by `OGA_SIGNALS_STORE_READ`. Both must be on in prod.
11. Do NOT promise unauthenticated access. Every endpoint requires Bearer `oga_...` + API access on plan.
12. Do NOT enumerate pricing or quotas — pricing parked per AR-204. Quote rate limit (30/min/key) only because it's fixed in code.
