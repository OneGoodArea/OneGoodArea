# Plan 035 — Extract hard-coded values into per-module constants (AR-433)

**Status:** Ready to implement
**JIRA:** [AR-433](https://podnex.atlassian.net/browse/AR-433)
**Branch:** `refactor/AR-433-per-module-constants`
**Depends on:** AR-205 / AR-317 (env centralisation — already merged)
**Scope:** ~12 commits, one per module group
**Est. time:** 60-90 mins

---

## Getting started

```bash
git checkout main && git pull
git checkout -b refactor/AR-433-per-module-constants
```

---

## Purpose

Remove all hard-coded magic numbers, strings, URLs, timeouts, and configuration values scattered across backend modules. Replace them with per-module `constants.ts` files containing named, typed constants.

**NOT** a global constants class. Each module owns its own constants file. Shared values (like ArcGIS URLs used by two modules) go in the module that is the primary consumer, and the other module imports from there.

---

## Conventions

1. **File naming:** `constants.ts` at the module root (e.g., `modules/playground/constants.ts`)
2. **Export style:** Named `export const` with `as const` for literal unions
3. **Grouping:** Constants grouped by category within the file (TIMEOUTS, LIMITS, URLS, etc.)
4. **No re-exports:** Each module imports directly from the constants file it needs
5. **Naming:** `SCREAMING_SNAKE_CASE` for all constants
6. **Types:** Use `as const` assertions, derive types where needed

---

## Commits

### Commit 1: `refactor(config): add shared constants for duplicated values`

**File:** `apps/api/src/infrastructure/config/constants.ts` (NEW)

**Purpose:** House values currently duplicated between `config/index.ts` and other modules.

**Constants to extract:**

```typescript
// --- Stripe Price IDs (move defaults here, config/index.ts imports) ---
export const STRIPE_PRICE_ID_DEFAULTS = {
  developer: "price_1TQrWc0oI5PvXSlpqAlXQaG8",
  business: "price_1TQrWd0oI5PvXSlpFeLRBkAt",
  growth: "price_1TQrWd0oI5PvXSlpSB3yrjxx",
  starterV2: "price_1TQsJ10oI5PvXSlpvLLYjjBg",
  build: "price_1TQsJL0oI5PvXSlpPL5qXBaI",
  buildAnnual: "price_1TQsJL0oI5PvXSlpRQK8ZfDI",
  scale: "price_1TQsJe0oI5PvXSlpAkOGfgrf",
  scaleAnnual: "price_1TQsJe0oI5PvXSlprLyH5Lfg",
  growthV2: "price_1TQsJ10oI5PvXSlpSvWzjC7w",
  growthV2Annual: "price_1TQsJ10oI5PvXSlpGkr8TnG8",
  enterprise: "price_1TQsJe0oI5PvXSlpHCsKdgKA",
  mcpAddon: "price_1TQsJ10oI5PvXSlpBHmvxdJL",
} as const;

// --- PLAN_PRICES_GBP (move from config/index.ts) ---
export const PLAN_PRICES_GBP: Record<string, number> = {
  starter: 29,
  pro: 79,
  developer: 49,
  business: 249,
  growth: 499,
  starter_v2: 49,
  build: 149,
  scale: 499,
  growth_v2: 1499,
  enterprise: 4999,
} as const;

// --- POSTCODE_REGEX (canonical, used by postcodes.ts and executor.ts) ---
export const POSTCODE_REGEX = /[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}/i;

// --- Superuser emails ---
export const SUPERUSER_EMAILS = ["ptengelmann@gmail.com"] as const;

// --- App URLs ---
export const APP_URL_DEFAULT = "https://www.onegoodarea.com";
export const EMAIL_FROM = "OneGoodArea <noreply@onegoodarea.com>";

// --- API version ---
export const API_VERSION = "1.0.0";

// --- Default server config ---
export const DEFAULT_PORT = 8080;
export const DEFAULT_HOST = "0.0.0.0";
```

**Update `config/index.ts`:**
- Import `STRIPE_PRICE_ID_DEFAULTS`, `PLAN_PRICES_GBP`, `SUPERUSER_EMAILS`, `APP_URL_DEFAULT`, `EMAIL_FROM`, `DEFAULT_PORT`, `DEFAULT_HOST` from `./constants`
- Remove the hard-coded values from `getConfig()` and static exports, replace with imports
- Remove `SUPERUSER_EMAILS`, `APP_URL`, `EMAIL_FROM`, `PLAN_PRICES_GBP` exports (they now live in `constants.ts`)

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes
- [ ] `grep -r "SUPERUSER_EMAILS\|PLAN_PRICES_GBP\|EMAIL_FROM\|APP_URL_DEFAULT" apps/api/src --include="*.ts" | grep -v "config/constants" | grep -v "config/index"` = only import statements

---

### Commit 2: `refactor(playground): extract constants for rate-limit, session, turnstile, whitelist`

**File:** `apps/api/src/modules/playground/constants.ts` (NEW)

**Constants to extract:**

```typescript
// --- Rate limiting ---
export const RATE_LIMIT_DEFAULTS = {
  cookieTotal: 30,
  cookieNl: 3,
  ipDaily: 60,
  globalDaily: 5000,
} as const;

export const DAY_WINDOW_SECONDS = 60 * 60 * 24; // 86400

// --- Session ---
export const COOKIE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
export const MIN_SECRET_LENGTH = 32;

// --- Turnstile ---
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_TIMEOUT_MS = 5000;

// --- Whitelist byte limits ---
export const KB = 1024;

export const WHITELIST_LIMITS = {
  getArea: { body: 2 * KB, response: 128 * KB },
  postScore: { body: 2 * KB, response: 64 * KB },
  peers: { body: 2 * KB, response: 128 * KB },
  areas: { response: 256 * KB },
  insights: { body: 2 * KB, response: 256 * KB },
  forecast: { body: 2 * KB, response: 64 * KB },
  query: { body: 1 * KB, response: 256 * KB },
} as const;

// --- Proxy ---
export const PROXY_TIMEOUT_MS = 45_000;
export const DEFAULT_FALLBACK_PORT = 8080;
```

**Files to update:**
- `modules/playground/rate-limit.ts` — replace lines 19-22, 51 with imports from `./constants`
- `modules/playground/session.ts` — replace lines 27, 47 with imports
- `modules/playground/turnstile.ts` — replace lines 55, 58 with imports
- `modules/playground/whitelist.ts` — replace `KB` and all byte limits with imports
- `routes/playground.ts` — replace `process.env` reads (lines 153, 165, 229, 231, 237) with `getConfig()` imports; replace timeout (179) and fallback port (165) with constants

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes
- [ ] No `process.env` reads remain in `routes/playground.ts`

---

### Commit 3: `refactor(signals/data-sources): extract constants for openstreetmap`

**File:** `apps/api/src/modules/signals/data-sources/openstreetmap.constants.ts` (NEW)

**Constants to extract:**

```typescript
export const OVERPASS = {
  queryTimeoutSeconds: 10,
  fetchTimeoutMs: 8000,
  cacheTtlMs: 5 * 60 * 1000,
  cacheMax: 1000,
  coordPrecision: 1000,
  maxHighlights: 12,
} as const;

export const OVERPASS_MIRROR_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
] as const;

export const USER_AGENT = "OneGoodArea/1.0 (+https://www.onegoodarea.com)";

// Per-category search radii in metres
export const CATEGORY_RADII: Record<string, number> = {
  schools: 1500,
  parks: 1000,
  shops: 1000,
  healthcare: 1500,
  transport: 1000,
  restaurants: 1500,
  gyms: 2000,
  libraries: 500,
} as const;
```

**Files to update:**
- `modules/signals/data-sources/openstreetmap.ts` — replace lines 50-55, 113-121, 128, 140-142, 315 with imports

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes

---

### Commit 4: `refactor(signals/data-sources): extract constants for flood`

**File:** `apps/api/src/modules/signals/data-sources/flood.constants.ts` (NEW)

**Constants to extract:**

```typescript
export const FLOOD = {
  timeoutMs: 5000,
  cacheTtlMs: 5 * 60 * 1000,
  cacheMax: 1000,
  coordPrecision: 1000,
  areasRadiusKm: 3,
  warningsRadiusKm: 5,
  defaultSeverity: 4,
} as const;
```

**Files to update:**
- `modules/signals/data-sources/flood.ts` — replace lines 28-31, 89, 93, 114 with imports

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes

---

### Commit 5: `refactor(signals/data-sources): extract constants for postcodes`

**File:** `apps/api/src/modules/signals/data-sources/postcodes.constants.ts` (NEW)

**Constants to extract:**

```typescript
export const POSTCODES = {
  timeoutMs: 5_000,
  placeCacheTtlMs: 60 * 60 * 1000,
  placeCacheMax: 5000,
  bulkLimit: 100,
  placesLimit: 10,
  reverseGeocodeLimit: 1,
  maxAmbiguousCandidates: 5,
} as const;

// Place type ranking weights (used for scoring candidates)
export const PLACE_TYPE_RANKING: Record<string, number> = {
  // copy from lines 275-279
} as const;
```

**Files to update:**
- `modules/signals/data-sources/postcodes.ts` — replace lines 70, 104-106, 302, 337, 433, 275-279 with imports
- `modules/intelligence/executor.ts` — replace `POSTCODE_REGEX` (line 37) with import from `infrastructure/config/constants`

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes
- [ ] `POSTCODE_REGEX` only defined in one place (`config/constants.ts`)

---

### Commit 6: `refactor(signals/data-sources): extract constants for deprivation`

**File:** `apps/api/src/modules/signals/data-sources/deprivation.constants.ts` (NEW)

**Constants to extract:**

```typescript
export const DEPRIVATION = {
  totalEngland: 33755,
  totalWales: 1909,
  totalScotland: 6976,
  fetchTimeoutMs: 10000,
} as const;

export const ARCGIS_URLS = {
  england: "https://services1.arcgis.com/...",
  wales: "https://services1.arcgis.com/...",
  scotland: "https://services1.arcgis.com/...",
} as const;
```

**Files to update:**
- `modules/signals/data-sources/deprivation.ts` — replace lines 16-18, 24, 31, 61, 67, 95, 101 with imports
- `modules/signals/refresh/deprivation.ts` — replace lines 86, 100, 114 with imports from `../data-sources/deprivation.constants` (eliminate duplication)

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes
- [ ] ArcGIS URLs only defined in one place

---

### Commit 7: `refactor(signals/data-sources): extract constants for police, land-registry, ofsted`

**File:** `apps/api/src/modules/signals/data-sources/external-apis.constants.ts` (NEW)

**Constants to extract:**

```typescript
// --- Police.uk ---
export const POLICE = {
  dataLagMonths: 3,
  fetchTimeoutMs: 10000,
  topStreetsLimit: 5,
} as const;

// --- Land Registry ---
export const LAND_REGISTRY = {
  lookbackMonths: 24,
  sparqlLimit: 1500,
  sparqlTimeoutMs: 30000,
  sparqlEndpoint: "http://landregistry.data.gov.uk/landregistry/query",
  csvDownloadUrlTemplate: "http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp${year}.csv",
} as const;

// --- Ofsted ---
export const OFSTED = {
  boundingBoxDeltaLat: 0.0135,
  boundingBoxDeltaLon: 0.0215,
  earthRadiusKm: 6371,
  maxDistanceKm: 1.5,
  maxSchoolsDisplayed: 10,
} as const;
```

**Files to update:**
- `modules/signals/data-sources/police.ts` — replace lines 38, 63, 132
- `modules/signals/data-sources/land-registry.ts` — replace lines 47, 67, 69, 76
- `modules/signals/data-sources/ofsted.ts` — replace lines 36-37, 60, 62, 113
- `modules/signals/refresh/prices.ts` — replace line 234 with import from `land-registry.constants`

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes

---

### Commit 8: `refactor(billing): extract constants for plans and webhooks`

**File:** `apps/api/src/modules/billing/constants.ts` (NEW)

**Constants to extract:**

```typescript
export const PLAN_CATALOG = {
  starter: { price: 2900, quota: 10_000 },
  pro: { price: 7900, quota: 10_000 },
  developer: { price: 4900, quota: 1_500 },
  business: { price: 24900, quota: 6_000 },
  growth: { price: 49900, quota: 25_000 },
  starterV2: { price: 4900, quota: 1_500 },
  build: { price: 14900, quota: 6_000 },
  buildAnnual: { price: 14900, quota: 6_000 },
  scale: { price: 49900, quota: 25_000 },
  scaleAnnual: { price: 49900, quota: 25_000 },
  growthV2: { price: 149900, quota: 100_000 },
  growthV2Annual: { price: 149900, quota: 100_000 },
  enterprise: { price: 499900, quota: 250_000 },
} as const;

export const OVERAGE = {
  pencePerCall: 5,
  softCapHeadroomPct: 25,
} as const;

export const MCP_ADDON_PRICE_PENCE = 2900;

// --- Webhooks ---
export const WEBHOOK = {
  deliveryTimeoutMs: 5000,
  secretPrefix: "whsec_",
  userAgent: "OneGoodArea-Webhooks/1.0",
  responseSnippetLimit: 500,
  errorLogSnippetLimit: 200,
} as const;
```

**Files to update:**
- `modules/billing/plans.ts` — replace all hard-coded prices, quotas, overage values, and Stripe price ID fallbacks with imports from `./constants`
- `modules/webhooks/index.ts` — replace lines 23, 24, 237, 247, 333 with imports

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes
- [ ] No duplicate price values between `plans.ts` and `config/index.ts`

---

### Commit 9: `refactor(intelligence): extract constants for planner and executor`

**File:** `apps/api/src/modules/intelligence/constants.ts` (NEW)

**Constants to extract:**

```typescript
export const INTELLIGENCE = {
  defaultAreasLimit: 100,
  defaultK: 20,
  defaultWindowMonths: 24,
  defaultHorizonMonths: 12,
  promptPriceExampleGbp: 250_000,
} as const;

export const PROMPT_RANGES = {
  limit: { min: 1, max: 1000, default: 100 },
  k: { min: 1, max: 200, default: 20 },
  maxAreas: { min: 1, max: 500, default: 50 },
  windowMonths: { min: 6, max: 120, default: 24 },
  horizonMonths: { min: 1, max: 60, default: 12 },
} as const;
```

**Files to update:**
- `modules/intelligence/planner.ts` — replace lines 66, 84, 118, 128, 135-136, 155 with imports
- `modules/intelligence/executor.ts` — replace lines 37, 63 with imports

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes

---

### Commit 10: `refactor(engine): extract constants for AI providers`

**File:** `apps/api/src/modules/engine/constants.ts` (NEW)

```typescript
export const ENGINE = {
  anthropicMaxTokens: 4096,
} as const;
```

**Files to update:**
- `modules/engine/ai/anthropic-provider.ts` — replace line 33 with import

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes

---

### Commit 11: `refactor(infrastructure): extract constants for idempotency, monitor, orgs, store`

**File:** `apps/api/src/infrastructure/constants.ts` (NEW)

```typescript
export const IDEMPOTENCY = {
  ttlHours: 24,
  minKeyLength: 1,
  maxKeyLength: 255,
} as const;

export const PORTFOLIO = {
  addMax: 200,
  enrichMax: 50,
  enrichConcurrency: 5,
} as const;

export const INVITATION = {
  ttlMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export const CRIME = {
  trailingMonths: 12,
} as const;

export const SIGNALS_REFRESH = {
  deprivationPageSize: 2000,
  deprivationMaxIterations: 1000,
  deprivationConfidence: 0.9,
  postcodeLsaoPageSize: 50000,
} as const;

export const AUTH_MESSAGES = {
  rateLimitExceeded: "30 requests per minute",
} as const;
```

**Files to update:**
- `infrastructure/idempotency.ts` — replace lines 13-15
- `modules/monitor/portfolio.ts` — replace lines 20-22
- `modules/orgs/invitations.ts` — replace line 37
- `modules/signals/store-reader.ts` — replace line 294
- `modules/signals/refresh/deprivation.ts` — replace lines 138, 143, 207
- `modules/signals/refresh/prices.ts` — replace line 209
- `shared/auth-api.ts` — replace line 54
- `shared/auth-either.ts` — replace line 50

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes

---

### Commit 12: `refactor(app): extract app-level constants and fix remaining env reads`

**Changes:**
- `app.ts` — replace `"1.0.0"` (line 42) with import from `infrastructure/config/constants`; replace `process.env.API_PUBLIC_URL` (line 45) with `getConfig()` call
- `infrastructure/db/client.ts` — replace `process.env.NEON_FETCH_ENDPOINT` (line 30) with `getConfig()` call (add field to `ApiConfig` if missing)
- `modules/playground/turnstile.ts` — replace `process.env.TURNSTILE_SECRET_KEY` (line 38) with `getConfig()` call
- `modules/playground/session.ts` — replace `process.env.PLAYGROUND_COOKIE_SECRET` (line 46) with `getConfig()` call

**Validation:**
- [ ] `npm run typecheck -w @onegoodarea/api` passes
- [ ] Final grep: `grep -r "process\.env\." apps/api/src --include="*.ts" | grep -v "config/index" | grep -v "config/constants"` = only `getConfig()` import lines (zero direct reads)

---

## Final validation (after all 12 commits)

- [ ] `npm run typecheck -w @onegoodarea/api` passes clean
- [ ] `npm run build -w @onegoodarea/api` succeeds
- [ ] `npm test -w @onegoodarea/api` passes (no regressions)
- [ ] Zero `process.env.*` reads outside `infrastructure/config/`:
  ```bash
  grep -r "process\.env\." apps/api/src --include="*.ts" \
    | grep -v "config/index" \
    | grep -v "config/constants" \
    | grep -v "getConfig()" \
    | wc -l  # should be 0
  ```
- [ ] Zero duplicated constant values (spot-check: ArcGIS URLs, POSTCODE_REGEX, Stripe prices)

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import path errors | Compile failure | Each module is self-contained; copy paths from working examples |
| Breaking module behavior | Runtime errors | Logic unchanged; only value source moves |
| Divergent constant copies | Silent bugs | Each value defined exactly once; grep validation at end |
| `getConfig()` circular import | Runtime error | `config/constants.ts` has no imports from `config/index.ts` |

---

## Step status

- [ ] Commit 1: infrastructure/config/constants.ts + config/index.ts cleanup
- [ ] Commit 2: modules/playground/constants.ts
- [ ] Commit 3: signals/data-sources/openstreetmap.constants.ts
- [ ] Commit 4: signals/data-sources/flood.constants.ts
- [ ] Commit 5: signals/data-sources/postcodes.constants.ts
- [ ] Commit 6: signals/data-sources/deprivation.constants.ts
- [ ] Commit 7: signals/data-sources/external-apis.constants.ts
- [ ] Commit 8: modules/billing/constants.ts + webhooks
- [ ] Commit 9: modules/intelligence/constants.ts
- [ ] Commit 10: modules/engine/constants.ts
- [ ] Commit 11: infrastructure/constants.ts
- [ ] Commit 12: app.ts + remaining process.env cleanup
