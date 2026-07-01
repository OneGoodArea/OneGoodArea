# Signals API — Test Cases

> **Source:** OneGoodArea API (Engine v2.0.2)
> **Endpoints:** `GET /v1/area`, `GET /v1/signals/:category`, `GET /v1/areas`
> **Last updated:** 2026-07-01

## Scope

Covers the three read endpoints of the Signals product: the full area profile (`GET /v1/area`), per-category signals (`GET /v1/signals/:category`), and the cross-area ranking query (`GET /v1/areas`). Includes the shared Bearer-auth / rate-limit / plan gate (`requireApiAccessWithOrg`), input validation, area resolution, the `fetch_mode` provenance behaviour (live / hybrid / store), country scoping, cross-area ranking + filters, and the org bundle whitelist (`?bundle=`). Does **not** cover scoring (see `scores-test-cases.md`) or authentication UI (see `auth-test-cases.md`).

All three endpoints are hard-gated by the `signalsApiEnabled` config flag; when it is off, every route returns `404 { "error": "Not found" }` before any auth runs.

### Source files validated against

| Layer | File |
|-------|------|
| Route handlers | `apps/api/src/routes/signals.ts` |
| Profile orchestration | `apps/api/src/modules/signals/index.ts` |
| Signal mapper (pure) | `apps/api/src/modules/signals/area-profile.ts` |
| Store reader | `apps/api/src/modules/signals/store-reader.ts` |
| Cross-area query | `apps/api/src/modules/signals/query.ts` |
| Source input structs | `apps/api/src/modules/signals/inputs.ts` |
| Bearer auth / gate | `apps/api/src/shared/auth-api.ts` |
| Bundle resolver | `apps/api/src/shared/bundles.ts` |
| Location validator | `apps/api/src/infrastructure/validation/validator.ts` |
| Signal / AreaProfile contracts | `packages/contracts/src/signals.ts` |

### Auth gate (`requireApiAccessWithOrg`)

Order of checks, each short-circuiting with the response shown:

1. **Missing / malformed `Authorization` header** → `401 { "error": "Missing API key. Use: Authorization: Bearer oga_..." }`
2. **Invalid / revoked key** → `401 { "error": "Invalid or revoked API key" }`
3. **IP allowlist mismatch** (key has non-empty `allowed_ip_cidrs`) → `403 { "error": "Request IP is not in the key's allowlist.", "code": "ip_not_allowed" }`
4. **Per-key rate limit exceeded** (`apiReport` budget: 30 req/min) → `429 { "error": "Too many requests. Rate limit: 30 requests per minute." }` (rate-limit headers set on reply)
5. **Plan without API access** → `403 { "error": "API access not available on your current plan. Upgrade at /pricing." }`

On success the handler receives `{ userId, orgId, trainingOptout }`.

---

## 1. `GET /v1/area` — Area profile

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **AREA-01** | Happy path by postcode | 1. `GET /v1/area?postcode=SW1A 1AA` with a valid Bearer key on an API-enabled plan | `200`. Body `{ geo, signals[], meta }`. `geo` carries `query, postcode, latitude, longitude, lsoa, msoa, admin_district, region, country, area_type`. `meta` carries `engine_version`, `generated_at` (ISO), `sources[]`, `fetch_mode`. Response header `X-Engine-Version` is set. |
| **AREA-02** | Happy path by place name | 1. `GET /v1/area?area=Clapham` | `200`. `geo.postcode` is `null` (query is not a full postcode); `geo.query` echoes `Clapham`. |
| **AREA-03** | `area` takes precedence over `postcode` | 1. `GET /v1/area?area=Clapham&postcode=SW1A 1AA` | The handler resolves `rawArea` from `area` first, then `postcode`. `Clapham` is used. |
| **AREA-04** | Stable signal catalog with null coverage | 1. Profile any area lacking a source (e.g. no Ofsted schools in range) | The signal is still present with `value: null`, `confidence: 0`, and a `confidence_reason` explaining the gap (never silently omitted). Same signal keys returned for every area. |
| **AREA-05** | `sources` lists only contributing datasets | 1. Inspect `meta.sources` | Contains only sources that produced at least one non-null signal (deduped). |
| **AREA-06** | `fetch_mode = live` (default) | 1. Profile an area with the signal store read disabled / no stored rows | `meta.fetch_mode` = `"live"`. All signals fetched per request. |
| **AREA-07** | `fetch_mode = hybrid` (store-backed sources) | 1. Profile an England postcode whose LSOA (2021 code) has stored deprivation/property/crime rows, store-read enabled | `meta.fetch_mode` = `"hybrid"`. Store-backed signals are additively enriched with `normalized_value`, `percentile`, and `regional_percentile`. |
| **AREA-08** | Scotland / Wales fall back to live | 1. Profile a Scotland (SIMD) or Wales (WIMD) postcode | Deprivation uses 2011 LSOA codes that don't match the 2021 `geo.lsoa`, so those sources miss the store and are served live. `fetch_mode` stays `"live"` unless another source is store-backed. |
| **AREA-09** | Deprivation source label by country | 1. Inspect the deprivation signal's `source` | `S…` code → `"SIMD 2020"`, `W…` → `"WIMD 2019"`, else `"IMD 2025"`. |
| **AREA-10** | Property confidence scales with sample | 1. Profile an area with property data | `confidence` = 0.9 (≥30 txns), 0.6 (≥10), or 0.4 (<10); `confidence_reason` states the transaction count. |
| **AREA-11** | Crime fetch failure vs. definitive zero | 1. Profile an area where police.uk fetch fails (null summary) | Crime signals `value: null`, `confidence: 0`, reason "police.uk request failed for this area; try again shortly." (distinct from a real zero count). |
| **AREA-12** | Missing location param | 1. `GET /v1/area` with no `area` and no `postcode` | `400 { "error": "Please enter a location" }`. |
| **AREA-13** | Location too long | 1. `GET /v1/area?area=<101+ chars>` | `400 { "error": "Location is too long (max 100 characters)" }`. |
| **AREA-14** | Malformed location — injection chars | 1. `GET /v1/area?area=<script>` or `?area=SELECT * FROM x` or a value containing `--`/`;` | `400 { "error": "Location contains invalid characters" }`. |
| **AREA-15** | Unknown / unresolvable area | 1. `GET /v1/area?area=Zzzxyq` (valid chars, cannot geocode) | `404 { "error": "Could not resolve area \"Zzzxyq\". Provide a UK postcode or place name." }`. |
| **AREA-16** | Missing API key | 1. `GET /v1/area?postcode=SW1A 1AA` with no `Authorization` header | `401 { "error": "Missing API key. Use: Authorization: Bearer oga_..." }`. |
| **AREA-17** | Invalid / revoked key | 1. Send `Authorization: Bearer oga_invalid` | `401 { "error": "Invalid or revoked API key" }`. |
| **AREA-18** | IP not in allowlist | 1. Use a key with an `allowed_ip_cidrs` that excludes the caller IP | `403 { "code": "ip_not_allowed" }`. |
| **AREA-19** | Rate limited | 1. Exceed 30 requests/minute for one key | `429 { "error": "Too many requests. Rate limit: 30 requests per minute." }`. |
| **AREA-20** | Plan without API access | 1. Valid key on a plan lacking API access | `403 { "error": "API access not available on your current plan. Upgrade at /pricing." }`. |
| **AREA-21** | Endpoint disabled | 1. With `signalsApiEnabled` off, call `GET /v1/area?...` | `404 { "error": "Not found" }` (returned before auth). |
| **AREA-22** | Bundle filter (`?bundle=`) whitelists signals | 1. `GET /v1/area?postcode=SW1A 1AA&bundle=<valid bundle id>` for the caller's org | `200`. `signals[]` restricted to the bundle's `signal_keys`; `meta.sources` recomputed from the surviving non-null signals. |
| **AREA-23** | Bundle not found | 1. `GET /v1/area?...&bundle=nope` | `404 { "error": "Bundle not found in your org." }`. |
| **AREA-24** | Bundle with no resolvable org context | 1. Legacy key with `org_id = NULL` and no owner org, `?bundle=` set | `422 { "error": "Cannot apply bundle filter: caller has no resolvable org context.", "code": "no_org_context" }`. |

---

## 2. `GET /v1/signals/:category` — Signals by category

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SIG-01** | Happy path | 1. `GET /v1/signals/crime?area=SW1A 1AA` | `200 { geo, signals[], meta }` where every returned signal has `category = "crime"`. |
| **SIG-02** | Each valid category resolves | 1. Call with `crime`, `deprivation`, `property`, `schools`, `amenities`, `transport`, `environment` | Each returns `200` with only that category's signals. |
| **SIG-03** | `meta.sources` scoped to category | 1. Inspect `meta.sources` in the response | Contains only sources of the returned (non-null) category signals, deduped. |
| **SIG-04** | Unknown category | 1. `GET /v1/signals/weather?area=SW1A 1AA` | `400 { "error": "Unknown signal category \"weather\". Valid categories: crime, deprivation, property, schools, amenities, transport, environment." }`. |
| **SIG-05** | Missing / malformed location | 1. `GET /v1/signals/crime` (no area) | `400 { "error": "Please enter a location" }`; injection input → "Location contains invalid characters". |
| **SIG-06** | Unresolvable area | 1. `GET /v1/signals/crime?area=Zzzxyq` | `404 { "error": "Could not resolve area \"Zzzxyq\". Provide a UK postcode or place name." }`. |
| **SIG-07** | `X-Engine-Version` reflects the profile | 1. Inspect the response header | Set from `profile.meta.engine_version` (this endpoint stamps the engine's own version, not the org pin — unlike `/v1/area` and `/v1/areas`). |
| **SIG-08** | `postcode` alias accepted | 1. `GET /v1/signals/property?postcode=M1 1AE` | Resolves via `postcode` when `area` is absent. |
| **SIG-09** | Auth gate enforced | 1. Call with missing / invalid key, over rate limit, or no API-access plan | `401` / `429` / `403` per the shared gate (see header section). |
| **SIG-10** | Endpoint disabled | 1. `signalsApiEnabled` off | `404 { "error": "Not found" }`. |

---

## 3. `GET /v1/areas` — Cross-area ranking query

Backed by the persisted store (`signal_values` + `signal_percentiles`); ranks LSOAs by one signal with optional country/LAD scope, percentile/value filters, sort, and limit. Country is scoped by LSOA code prefix (`E`/`W`/`S`).

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **AREAS-01** | Happy path | 1. `GET /v1/areas?signal=deprivation.imd_decile` | `200 { signal, count, areas[] }`. Each area: `{ geo_type, geo_code, value, normalized_value, percentile }`. `count === areas.length`. `X-Engine-Version` header set. |
| **AREAS-02** | Missing `signal` | 1. `GET /v1/areas` (no signal) | `400 { "error": "Missing required ?signal= (a signal key, e.g. deprivation.imd_decile)." }`. |
| **AREAS-03** | Country filter (case-insensitive) | 1. `GET /v1/areas?signal=deprivation.imd_decile&country=england` (or `ENGLAND`, `England`) | `200`; only England LSOAs (`geo_code LIKE 'E%'`). Wales → `W%`, Scotland → `S%`. |
| **AREAS-04** | Invalid country | 1. `GET /v1/areas?signal=...&country=Ireland` | `400 { "error": "country must be one of: England, Wales, Scotland (case-insensitive)." }`. |
| **AREAS-05** | Percentile filter out of range | 1. `GET /v1/areas?signal=...&max_percentile=150` | `400 { "error": "max_percentile must be a number 0-100." }` (same for `min_percentile`). |
| **AREAS-06** | Value filter non-numeric | 1. `GET /v1/areas?signal=...&min_value=abc` | `400 { "error": "min_value must be a number." }` (same for `max_value`). |
| **AREAS-07** | Default sort + ordering | 1. `GET /v1/areas?signal=...` with no `sort` | Sort defaults to `percentile` (ascending, `NULLS LAST`). Results ordered accordingly. |
| **AREAS-08** | Explicit sort values | 1. Call with `sort=percentile_desc`, `value`, or `value_desc` | Ordering follows the requested column/direction; an unrecognised `sort` silently falls back to `percentile`. |
| **AREAS-09** | Default and capped limit | 1. Call with no `limit`; then `limit=5000` | Default limit = 100; requested limits are capped at 1000 (`AREAS_LIMIT_MAX`). |
| **AREAS-10** | Invalid limit | 1. `GET /v1/areas?signal=...&limit=0` (or `-1`, `2.5`) | `400 { "error": "limit must be a positive integer." }`. |
| **AREAS-11** | Scope filter | 1. Call with `scope=regional` then `scope=national` (default) | Percentile filters + ranking use the matching `signal_percentiles.scope` column; invalid value → `400 { "error": "scope must be one of: national, regional." }`. |
| **AREAS-12** | LAD scope | 1. `GET /v1/areas?signal=...&lad=<lad_code>` | Restricts to LSOAs whose `geo_lookup.lad_code` matches. |
| **AREAS-13** | De-duplication by area | 1. Query a signal that has multiple periods per LSOA | Each `geo_code` appears once (first occurrence, honouring `ORDER BY`). |
| **AREAS-14** | Bundle gate — signal in bundle | 1. `GET /v1/areas?signal=<key in bundle>&bundle=<id>` | `200` (gate passes; the ranking signal must be whitelisted). |
| **AREAS-15** | Bundle gate — signal not in bundle | 1. `GET /v1/areas?signal=<key NOT in bundle>&bundle=<id>` | `422 { "error": "Signal \"<key>\" is not in bundle <id>.", "code": "bundle_signal_not_allowed" }`. |
| **AREAS-16** | Bundle not found / no org context | 1. `?bundle=nope`; then legacy key with no org | `404 "Bundle not found in your org."`; `422 { "code": "no_org_context" }`. |
| **AREAS-17** | Auth gate enforced | 1. Missing / invalid key, rate-limited, or no API-access plan | `401` / `429` / `403` per the shared gate. |
| **AREAS-18** | Endpoint disabled | 1. `signalsApiEnabled` off | `404 { "error": "Not found" }`. |
| **AREAS-19** | Empty result set | 1. Query filters that match no rows (e.g. `min_value` above every value) | `200 { signal, count: 0, areas: [] }`. |

---

## Test Environment Notes

- **Auth:** Bearer API key (`Authorization: Bearer oga_...`); resolved via `requireApiAccessWithOrg`.
- **Rate limit:** per-key `apiReport` budget, 30 requests/minute → `429`.
- **Signal shape (contracts):** `key`, `category`, `label`, `value` (`number|string|null`), `unit`, `direction` (`higher_is_better|lower_is_better|neutral`), `confidence` (0–1), `confidence_reason`, `source`, `observed_period`; plus optional `normalized_value`, `percentile`, `regional_percentile` (present only on store-backed + normalized signals).
- **Categories:** `crime, deprivation, property, schools, amenities, transport, environment` (OpenStreetMap feeds both `amenities` and `transport`).
- **`fetch_mode`:** `live` (all fetched per request), `store` (all from the persisted store), `hybrid` (mixed during source-by-source migration).
- **Engine version:** `2.0.2` (`METHODOLOGY_VERSION`). `/v1/area` and `/v1/areas` stamp the caller's org pin (or latest); `/v1/signals/:category` stamps the profile's own engine version.
</content>
</invoke>
