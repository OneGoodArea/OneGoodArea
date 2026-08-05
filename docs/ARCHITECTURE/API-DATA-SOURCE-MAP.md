# API Data-Source Map — zero exceptions

Every endpoint in the monorepo, traced to its data source — external API (remote),
internal proxy, Postgres table, or combination. Endpoint-level granularity with
`file:line` evidence. Live as of `main` @ `a7bf646`.

Covers:
- `apps/api` Fastify backend (all routes under `routes/*.ts`)
- `apps/web` Next.js BFF (all route handlers under `app/api/**/route.ts`)
- Refresh / cron jobs (CLI + `routes/system.ts`)

---

## 1. Backend (`apps/api`) — routes to data sources

Legend:
- **External** — `fetch`/SDK to a third-party host (see §3 for remote URLs)
- **DB read** / **DB write** — `sql`/`query`/`exec` against Neon Postgres (§4 for table matrix)
- **Proxy** — forwards to apps/web or another internal service
- **None** — returns local/config-only data

Routes are listed by `routes/*.ts` file. Grouped by product surface.

### 1.1 Auth (`routes/auth.ts`)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/auth/register` | POST | DB write | `users` (insert), `email_verification_tokens` (insert) | `routes/auth.ts:10` |
| `/auth/login` | POST | DB read | `users` (password verify), `api_keys` (session key) | `routes/auth.ts:49` |
| `/auth/oauth-callback` | POST | DB read+write | `users` (upsert via Google identity), `api_keys` | `routes/auth.ts:85` |
| `/auth/check-email` | POST | DB read | `users` (SELECT email) | `routes/auth.ts:130` |
| `/auth/forgot-password` | POST | DB read+write | `users`, `password_reset_tokens` (insert); External → Resend (email) | `routes/auth.ts:155` |
| `/auth/reset-password` | POST | DB read+write | `password_reset_tokens`, `users` (update password) | `routes/auth.ts:180` |
| `/auth/verify-email` | POST | DB read+write | `email_verification_tokens`, `users` (SET email_verified) | `routes/auth.ts:210` |
| `/auth/resend-verification` | POST | DB read+write | `email_verification_tokens`; External → Resend | `routes/auth.ts:235` |
| `/auth/magic-link/request` | POST | DB read+write | `users`; External → Resend | `routes/auth.ts:258` |

### 1.2 Signals (`routes/signals.ts`)

All signals routes use `fetchAreaSources` (`modules/signals/index.ts:74`) which fans out in parallel.

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/v1/area` | GET | External + DB read | **External:** postcodes.io (geocode), police.uk (crime 12mo), Overpass×3 (amenities), EA flood, Land Registry SPARQL, ArcGIS×3 (deprivation). **DB read:** `signal_values`, `signal_timeseries`, `signal_percentiles` (crime/deprivation/property when `OGA_SIGNALS_STORE_READ=true`). Also reads `ofsted_schools` DB (school proximity) | `routes/signals.ts:25` |
| `/v1/areas` | POST | External + DB read | Same as `/v1/area`, batched (max 100 areas, concurrency 5) | `routes/signals.ts:78` |
| `/v1/forecast` | POST | DB read | `signal_timeseries` (historical trend) | `routes/signals.ts:140` |

### 1.3 Scoring (`routes/scoring.ts`)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/v1/score` | POST | External + DB read + AI | Same `fetchAreaSources` as `/v1/area`. **AI:** Anthropic/DeepSeek/OpenRouter/OpenCode (when `explain=true`). **DB write:** `brief_composer_logs` (when explain fires). **DB read:** `org_members` (scoping), `scoring_presets` (when preset_id), `score_history` (cached scores) | `routes/scoring.ts:30` |

### 1.4 Intelligence (`routes/intelligence.ts`)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/v1/query` | POST | AI + DB write | **AI:** provider chain (`generateNarrative` via `strategy-provider.ts`). **DB write:** `query_planner_logs` (training pair: NL→plan) | `routes/intelligence.ts:40` |
| `/v1/peers` | POST | External + DB read | **External:** postcodes.io (bulk admin geo). **DB read:** `peer_assignments`, `signal_values`, `signal_percentiles` | `routes/intelligence.ts:200` |
| `/v1/insights` | GET | DB read | `signal_values`, `signal_percentiles`, `peer_assignments` | `routes/intelligence.ts:350` |
| `/v1/signals/:category` | GET | DB read | `signals` (catalog), `signal_values` | `routes/intelligence.ts:480` |
| `/v1/meta` | GET | DB read | `signals` (catalog metadata) | `routes/intelligence.ts:520` |

### 1.5 Orgs (`routes/orgs.ts` + sub-routes)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/v1/orgs` | GET | DB read | `orgs`, `org_members` (DAL user-repository) | `routes/orgs.ts:40` |
| `/v1/orgs` | POST | DB write | `orgs` (insert), `org_members` (owner insert) | `routes/orgs.ts:55` |
| `/v1/orgs/:id` | GET/PATCH/DELETE | DB read+write | `orgs`, `org_members` (role validation) | `routes/orgs.ts:80` |
| `/v1/orgs/:id/members` | GET/POST | DB read+write | `org_members`, `users` (lookup) | `routes/org-members.ts` |
| `/v1/orgs/:id/members/:userId` | DELETE | DB write | `org_members` (delete) | `routes/org-members.ts` |
| `/v1/orgs/:id/bundles` | GET/POST | DB read+write | `signal_bundles` | `routes/org-bundles.ts` |
| `/v1/orgs/:id/bundles/:bundleId` | PATCH/DELETE | DB read+write | `signal_bundles` | `routes/org-bundles.ts` |
| `/v1/orgs/:id/cohorts` | GET/POST | DB read+write | `peer_cohorts` | `routes/org-cohorts.ts` |
| `/v1/orgs/:id/cohorts/:cohortId` | PATCH/DELETE | DB read+write | `peer_cohorts` | `routes/org-cohorts.ts` |
| `/v1/orgs/:id/presets` | GET/POST | DB read+write | `scoring_presets` | `routes/org-presets.ts` |
| `/v1/orgs/:id/presets/:presetId` | PATCH/DELETE | DB read+write | `scoring_presets` | `routes/org-presets.ts` |
| `/v1/orgs/:id/methodology` | GET/PATCH | DB read+write | `org_methodology_pins`; **DB read:** `org_members` | `routes/org-methodology.ts` |
| `/v1/orgs/:id/invitations` | GET/POST | DB read+write | `org_invitations`; External → Resend (invitation email) | `routes/org-members.ts` |
| `/v1/orgs/:id/invitations/:invitationId` | DELETE | DB write | `org_invitations` (revoke) | `routes/org-members.ts` |

### 1.6 Me / profile (`routes/me.ts`)

All DB tables read/written directly in this route file (no DAL wrapper).

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/me/profile` | PATCH | DB write | `users` (update name, intent, signup_source, role_preference) | `routes/me.ts:20` |
| `/me/tier` | GET | DB read | `users` (SELECT tier) | `routes/me.ts:60` |
| `/me/user-type` | GET | DB read | `users` (SELECT user_type) | `routes/me.ts:80` |
| `/me/org` | GET/PATCH | DB read+write | `orgs`, `org_members` | `routes/me.ts:100` |
| `/me/activity` | GET | DB read | `activity_events` | `routes/me.ts:140` |
| `/me/portfolios` | GET/POST | DB read+write | `portfolios`, `portfolio_areas` | `routes/me.ts:180` |
| `/me/score-usage` | GET | DB read | `activity_events`, `subscriptions`, `users` (quota calc) | `routes/me.ts:220` |
| `/me/webhooks` | GET/POST | DB read+write | `webhook_subscriptions` → delegates to `modules/webhooks/index.ts` | `routes/me.ts` |
| `/me/webhooks/:id` | DELETE | DB write | `webhook_subscriptions` | `routes/me.ts` |
| `/me/webhooks/:id/rotate-secret` | POST | DB write | `webhook_subscriptions` | `routes/me.ts` |

### 1.7 API Keys (`routes/api-keys.ts`)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/keys` | GET | DB read | `api_keys` (DAL) | `routes/api-keys.ts:10` |
| `/keys` | POST | DB write | `api_keys` (insert) | `routes/api-keys.ts:25` |
| `/keys` | DELETE | DB write | `api_keys` (revoke) | `routes/api-keys.ts:45` |
| `/keys/usage` | GET | DB read | `activity_events` (aggregated counts per day/month), `subscriptions`, `users` | `routes/api-keys.ts:65` |
| `/keys/playground` | POST | DB read+write | `api_keys` (auto-generate if none exists) | `routes/api-keys.ts:100` |

### 1.8 Billing (`routes/stripe.ts` + `modules/billing/*`)

All Stripe endpoints call `stripe.*` SDK → `api.stripe.com`.

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/stripe/checkout` | POST | External + DB read+write | **External:** Stripe SDK `checkout.sessions.create`. **DB read:** `users` (tier). **DB write:** none (webhook handles) | `routes/stripe.ts:30` |
| `/stripe/portal` | POST | External + DB read | **External:** Stripe SDK `billingPortal.sessions.create`. **DB read:** `subscriptions` | `routes/stripe.ts:55` |
| `/stripe/cancel` | POST | External + DB read+write | **External:** Stripe SDK `subscriptions.update`. **DB write:** `subscriptions` | `routes/stripe.ts:105` |
| `/stripe/addon-checkout` | POST | External + DB read+write | **External:** Stripe checkout. **DB read+write:** `subscription_addons` | `routes/stripe.ts:145` |
| `/stripe/webhook` | POST | External (inbound) + DB read+write | **Inbound:** Stripe POST. **DB read+write:** `subscriptions`, `subscription_addons`, `users` (tier promotion). **DB write:** `webhook_events` (dedupe) | `routes/stripe.ts:18` |

### 1.9 Admin (`routes/admin.ts`)

All admin endpoints are superuser-gated.

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/admin/usage` | GET | DB read | `users`, `activity_events` (api.* events aggregated), `subscriptions`, `subscription_addons`, `mcp_usage` | `routes/admin.ts:20` |
| `/admin/analytics` | GET | DB read | `pageviews` (aggregated by day, path, referrer, country, device) | `routes/admin.ts:130` |
| `/admin/audience` | GET | DB read | `users` (by tier, intent, signup_source), `activity_events`, `api_keys` | `routes/admin.ts:220` |
| `/admin/revenue` | GET | DB read | `subscriptions`, `subscription_addons` (MRR/ARR calc) | `routes/admin.ts:280` |
| `/admin/mcp-adoption` | GET | DB read | `mcp_adoption` (view over `activity_events` + `orgs` + `users`) | `routes/admin.ts:370` |
| `/admin/traffic-analytics` | GET | DB read | `pageviews` (deep analytics) | `routes/admin.ts:410` |
| `/admin/training-corpus` | GET | DB read | `query_planner_logs`, `brief_composer_logs` | `routes/admin.ts:500` |
| `/admin/users/:id/tier` | PATCH | DB write | `users` (SET tier) | `routes/admin.ts:560` |

### 1.10 System / cron (`routes/system.ts`)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/cron/rescore` | GET | External + DB read+write | Recomputes scores: calls all live data sources (crime, deprivation, amenities, flood, property, ofsted, geocode). **DB write:** `score_history` | `routes/system.ts:51` |
| `/cron/training-retention` | GET | DB write | `query_planner_logs`, `brief_composer_logs` (DELETE rows older than `TRAINING_DATA_RETENTION_DAYS`) | `routes/system.ts:93` |
| `/health` | GET | None | Returns `{ok: true}` — no DB or external call | `app.ts:80` |

### 1.11 Misc

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/contact` | POST | External + DB write | **External:** Resend (to ops inbox + confirmation to user); **DB write:** `activity_events` (track) | `routes/contact.ts:20` |
| `/watchlist` | GET/POST | DB read+write | `saved_areas` | `routes/scoring.ts` (from `/watchlist` prefix) |
| `/watchlist/:id` | DELETE | DB write | `saved_areas` | same |
| `/usage` | GET | DB read | `activity_events`, `subscriptions`, `users` (tier quota) | `routes/usage.ts` |
| `/settings/password` | POST | DB read+write | `users` (verify old password, SET new) | `routes/me.ts` |
| `/settings/delete-account` | DELETE | DB write | `users`, `api_keys`, `org_members`, `saved_areas`, `portfolios`, `subscriptions`, `subscription_addons`, `webhook_subscriptions` (cascade) | `routes/me.ts` |

### 1.12 Webhooks (`routes/webhooks.ts` — customer-facing `/v1/webhooks`)

| Endpoint | Method | Source type | Source detail | Route file |
|----------|--------|-------------|---------------|------------|
| `/v1/webhooks` | GET | DB read | `webhook_subscriptions` | `routes/webhooks.ts:11` |
| `/v1/webhooks` | POST | DB write | `webhook_subscriptions` (insert with HMAC secret) | `routes/webhooks.ts:25` |
| `/v1/webhooks/:id` | DELETE | DB write | `webhook_subscriptions` (delete) | `routes/webhooks.ts:45` |

---

## 2. Web BFF (`apps/web`) — route handlers to data sources

Every `app/api/**/route.ts` handler. Classified by source type:

| Web route | Method | Source type | Backend endpoint | Notes |
|-----------|--------|-------------|------------------|-------|
| `/api/auth/[...nextauth]` | * | **Mixed** | Several backend endpoints | **Direct DB:** `users`, `magic_link_tokens` (NextAuth adapter in `lib/auth.ts`). **External:** Google OAuth (`GOOGLE_CLIENT_ID/SECRET`). **Backend:** `/auth/register`, `/auth/login`, `/auth/oauth-callback` |
| `/api/auth/register` | POST | ProxyPublic | `POST /auth/register` | |
| `/api/auth/forgot-password` | POST | ProxyPublic | `POST /auth/forgot-password` | |
| `/api/auth/reset-password` | POST | ProxyPublic | `POST /auth/reset-password` | |
| `/api/auth/resend-verification` | POST | ProxyPublic | `POST /auth/resend-verification` | |
| `/api/auth/check-email` | POST | ProxyPublic | `POST /auth/check-email` | |
| `/api/auth/magic-link/request` | POST | ProxyPublic | `POST /auth/magic-link/request` | |
| `/api/auth/verify-email` | POST | ProxyPublic | `POST /auth/verify-email` | |
| `/api/testing/auth/login` | POST | **Direct DB** | — | `users` (SELECT/INSERT/UPDATE) — test-only |
| `/api/testing/auth/logout` | POST | Local | — | Clears cookie only |
| `/api/testing/runtime/config` | GET | Local | — | Env/file only |
| `/api/testing/runtime/dashboard` | GET | Local | — | Probes local services (no data) |
| `/api/health` | GET | ProxyPublic | `GET /health` | |
| `/api/track` | POST | ProxyPublic | `POST /track` | |
| `/api/contact` | POST | ProxyPublic | `POST /contact` | |
| `/api/onboarding/area-lookup` | GET | Backend + Local fallback | `GET /v1/area?postcode=` | Fallback demo data when no session/API fails |
| `/api/onboarding/complete` | POST | Backend | `PATCH /me/profile`, `POST /v1/orgs` | |
| `/api/keys` | GET/POST | ProxySession | `GET/POST /keys` | |
| `/api/keys/[id]` | DELETE/PATCH | ProxySession | `DELETE/PATCH /keys/:id` | |
| `/api/keys/usage` | GET | ProxySession | `GET /keys/usage` | |
| `/api/keys/playground` | POST | ProxySession | `POST /keys/playground` | |
| `/api/usage` | GET | ProxySession | `GET /usage` | |
| `/api/watchlist` | GET/POST | ProxySession | `GET/POST /watchlist` | |
| `/api/watchlist/[id]` | DELETE | ProxySession | `DELETE /watchlist/:id` | |
| `/api/me/activity` | GET | ProxySession | `GET /me/activity` | |
| `/api/me/portfolios` | GET | ProxySession | `GET /me/portfolios` | |
| `/api/me/user-type` | GET | ProxySession | `GET /me/user-type` | |
| `/api/me/score-usage` | GET | ProxySession | `GET /me/score-usage` | |
| `/api/me/org` | GET/PATCH | ProxySession | `GET/PATCH /me/org` | **Direct DB pre-query:** `org_members` (resolveOrgId in `lib/server/org.ts`) |
| `/api/me/org/bundles` | GET/POST | ProxyOrgRoute | `GET/POST /v1/orgs/:id/bundles` | |
| `/api/me/org/bundles/[id]` | PATCH/DELETE | ProxyOrgRoute | `PATCH/DELETE /v1/orgs/:id/bundles/:bundleId` | |
| `/api/me/org/members` | GET/POST | ProxyOrgRoute | `GET/POST /v1/orgs/:id/members` | |
| `/api/me/org/members/[userId]` | DELETE | callApi | `DELETE /v1/orgs/:id/members/:uid` | |
| `/api/me/org/cohorts` | GET/POST | ProxyOrgRoute | `GET/POST /v1/orgs/:id/cohorts` | |
| `/api/me/org/cohorts/[id]` | PATCH/DELETE | callApi | `PATCH/DELETE /v1/orgs/:id/cohorts/:cid` | |
| `/api/me/org/invitations` | GET/POST | ProxyOrgRoute | `GET/POST /v1/orgs/:id/invitations` | |
| `/api/me/org/invitations/[id]` | DELETE | callApi | `DELETE /v1/orgs/:id/invitations/:iid` | |
| `/api/me/scoring-presets` | GET/POST | ProxyOrgRoute | `GET/POST /v1/orgs/:id/presets` | |
| `/api/me/scoring-presets/[id]` | PATCH/DELETE | callApi | `PATCH/DELETE /v1/orgs/:id/presets/:pid` | |
| `/api/me/webhooks` | GET/POST | ProxySession | `GET/POST /me/webhooks` | |
| `/api/me/webhooks/[id]` | DELETE | ProxySession | `DELETE /me/webhooks/:id` | |
| `/api/me/webhooks/[id]/rotate-secret` | POST | ProxySession | `POST /me/webhooks/:id/rotate-secret` | |
| `/api/invitations/[token]/accept` | POST | callApi | `POST /v1/invitations/:token/accept` | |
| `/api/orgs` | GET/POST | ProxySession | `GET/POST /v1/orgs` | |
| `/api/admin/usage` | GET | ProxySession | `GET /admin/usage` | |
| `/api/admin/audience` | GET | ProxySession | `GET /admin/audience` | |
| `/api/admin/revenue` | GET | ProxySession | `GET /admin/revenue` | |
| `/api/v1/me` | GET | ProxyApiKey | `GET /v1/me` | |
| `/api/v1/webhooks` | GET/POST | ProxyApiKey | `GET/POST /v1/webhooks` | |
| `/api/v1/webhooks/[id]` | DELETE | ProxyApiKey | `DELETE /v1/webhooks/:id` | |
| `/api/stripe/webhook` | POST | ProxyStripeWebhook | `POST /stripe/webhook` | Raw body + Stripe-Signature forwarded |
| `/api/stripe/checkout` | POST | ProxySession | `POST /stripe/checkout` | |
| `/api/stripe/portal` | POST | ProxySession | `POST /stripe/portal` | |
| `/api/stripe/cancel` | POST | ProxySession | `POST /stripe/cancel` | |
| `/api/stripe/addon-checkout` | POST | ProxySession | `POST /stripe/addon-checkout` | |
| `/api/settings/password` | POST | ProxySession | `POST /settings/password` | |
| `/api/settings/delete-account` | DELETE | ProxySession | `DELETE /settings/delete-account` | |
| `/api/settings/subscription` | GET | ProxySession | `GET /settings/subscription` | |
| `/api/showcase/score` | POST | Backend (external host) | `POST /v1/score` | Via `lib/showcase/api.ts` → `onegoodarea.onrender.com` (hardcoded fallback), auth via `SHOWCASE_API_KEY` |
| `/api/openapi-spec` | GET | **Direct fetch** | — | Hits `https://onegoodarea.onrender.com/docs/json` directly |

### 2.1 Web proxy helpers

| Helper | File | Source | Details |
|--------|------|--------|---------|
| `proxySession` | `lib/server/proxy.ts` | Backend fetch | Forwards with minted JWT bridge token (`AUTH_SECRET`-HS256 signed) |
| `proxyPublic` | `lib/server/proxy.ts` | Backend fetch | Forwards unauthenticated |
| `proxyApiKey` | `lib/server/proxy.ts` | Backend fetch | Passes `Authorization: Bearer <api_key>` verbatim |
| `proxyOrgRoute` | `lib/server/proxy.ts` | Backend + Direct DB | Pre-resolves `org_id` from `org_members` via `resolveOrgId` (direct DB), then proxies |
| `callApi` | `lib/server/api-client.ts` | Backend fetch | Raw `fetch(INTERNAL_API_URL + path)` with bridge JWT |
| `proxyStripeWebhook` | `lib/server/proxy.ts` | Backend fetch | Raw body + `Stripe-Signature` forwarded |
| API base URL | `lib/server/api-client.ts:8` | `INTERNAL_API_URL` (env) | Default: `http://localhost:4000` (dev) |
| Showcase base URL | `lib/showcase/api.ts:6` | `INTERNAL_API_URL` (env) | Default: `https://onegoodarea.onrender.com` (prod) |

---

## 3. External service registry

Every third-party remote, organized by domain.

### 3.1 Live per-request (signal fanout)

| # | Service | Remote base | Endpoints | Used by modules | Fallback |
|---|---------|-------------|-----------|-----------------|----------|
| 1 | postcodes.io | `api.postcodes.io` | `/postcodes` POST bulk, `/postcodes/{postcode}` GET, `/places?q=`, `/postcodes?lon&lat`, `/{q}/autocomplete` | `signals/data-sources/postcodes.ts` | None (single source) |
| 2 | police.uk | `data.police.uk` | `/api/crimes-street/all-crime?lat=&lng=&date=` | `signals/data-sources/police.ts` | None |
| 3 | Overpass/OSM | `overpass-api.de`, `overpass.kumi.systems`, `overpass.openstreetmap.fr` | POST `/api/interpreter` (Overpass QL) | `signals/data-sources/openstreetmap.ts` | **3-mirror race** (`Promise.any`) + per-mirror 60s cooldown + `Retry-After` on 503 |
| 4 | EA Flood | `environment.data.gov.uk` | `/flood-monitoring/id/floodAreas`, `/flood-monitoring/id/floods` | `signals/data-sources/flood.ts` | Per-endpoint partial-fail (one endpoint 503 doesn't null the other) |
| 5 | Land Registry SPARQL | `landregistry.data.gov.uk` | POST `/landregistry/query` (SPARQL) | `signals/data-sources/land-registry.ts` | None |
| 6 | ArcGIS England (IMD 2025) | `services-eu1.arcgis.com/EbKcOS6EXZroSyoi` | `/LSOA_IMD2025_WGS84/FeatureServer/0/query` | `signals/data-sources/deprivation.ts` | None |
| 7 | ArcGIS Wales (WIMD 2019) | `services9.arcgis.com/3DS2hBWXSllJ5p3H` | `/WIMD_2019_Overall/FeatureServer/0/query` | `signals/data-sources/deprivation.ts` | None |
| 8 | ArcGIS Scotland (SIMD 2020) | `services.arcgis.com/XSeYKQzfXnEgju9o` | `/SG_SIMD_2020/FeatureServer/0/query` | `signals/data-sources/deprivation.ts` | None |

### 3.2 AI / LLM

| # | Service | Remote base | Model | Used by modules | Fallback |
|---|---------|-------------|-------|-----------------|----------|
| 9 | Anthropic | `api.anthropic.com` | `claude-sonnet-4-6` | `ai/anthropic-provider.ts` | Chain fallback via `strategy-provider.ts` |
| 10 | DeepSeek | `api.deepseek.com` | `deepseek-chat` | `ai/deepseek-provider.ts` | Chain fallback |
| 11 | OpenRouter | `openrouter.ai` | `deepseek/deepseek-chat-v3-0324:free` | `ai/openrouter-provider.ts` | Chain fallback |
| 12 | OpenCode Zen | `opencode.ai/zen` | `deepseek-v4-flash-free` | `ai/opencode-provider.ts` | Chain fallback |

All share a single `OpenAiCompatibleProvider` fetch path (`ai/openai-compatible-provider.ts:50`). Provider selection via `strategy-provider.ts` with fallback chains configurable per tier (`ai/config.ts`).

### 3.3 Business / infra

| # | Service | Remote base | Purpose | Used by modules |
|---|---------|-------------|---------|-----------------|
| 13 | Stripe | `api.stripe.com` | Billing, checkout, webhook inbound | `billing/stripe-client.ts`, `billing/webhook-handler.ts`, `routes/stripe.ts` |
| 14 | Resend | `api.resend.com` | Transactional email | `infrastructure/email/providers/resend-provider.ts` |
| 15 | Customer webhooks | user-supplied HTTPS URLs | Outbound event delivery (portfolio changes) | `modules/webhooks/index.ts:223` |
| 16 | Neon Postgres | `console.neon.tech` (prod), `neon-proxy:55433` (dev) | Database (excluded from "external" count — see §4) | `infrastructure/db/client.ts` |

### 3.4 Refresh / cron only (batch, not per-request)

| # | Service | Remote | Purpose | Used by modules |
|---|---------|--------|---------|-----------------|
| 17 | gov.uk Ofsted index | `gov.uk/government/statistical-data-sets/monthly-…ofsteds-school-inspections-outcomes` | Resolve latest CSV link | `signals/refresh/ofsted.ts:155` |
| 18 | gov.uk assets (CSV) | `assets.publishing.service.gov.uk/media/…/*.csv` | Download Ofsted inspections CSV | `signals/refresh/ofsted.ts:229` |
| 19 | Land Registry PP CSV | `prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-{year}.csv` | Property price data (yearly CSV) | `signals/refresh/prices.ts:240` |
| 20 | ArcGIS × 3 (bulk) | Same hosts as §3.1 #6-8 | Bulk deprivation data (paginated) | `signals/refresh/deprivation.ts:236` |

---

## 4. Postgres table matrix

All reads and writes per table, traced to `file:line`. The DB is Neon Postgres, accessed
via `@neondatabase/serverless` driver (`infrastructure/db/client.ts`).

### 4.1 User/auth tables

| Table | Readers | Writers |
|-------|---------|---------|
| `users` | `routes/auth.ts` (login, check-email, magic-link), `routes/me.ts:20-220` (profile, tier, score-usage), `routes/admin.ts:51,254,303` (usage, audience, revenue), `modules/usage/index.ts` (quota), `modules/tiers/index.ts` (tier check), `routes/stripe.ts` (checkout), `infrastructure/db/dal/repositories/user-repository.ts` | `routes/auth.ts:10,85` (register, oauth upsert), `routes/auth.ts:180` (reset password), `routes/auth.ts:210` (verify email), `routes/me.ts:20` (profile), `routes/admin.ts:560` (tier change), `routes/me.ts` (delete-account), `modules/billing/webhook-handler.ts` (stripe plan→tier) |
| `email_verification_tokens` | `routes/auth.ts:210` (verify) | `routes/auth.ts:10` (register insert) |
| `password_reset_tokens` | `routes/auth.ts:180` (verify token) | `routes/auth.ts:155` (forgot password insert) |
| `magic_link_tokens` | *(apps/web only)* `lib/auth.ts` (NextAuth authorize) | *(apps/web only)* `lib/auth.ts` (mark used) |

### 4.2 Org & tenancy tables

| Table | Readers | Writers |
|-------|---------|---------|
| `orgs` | `routes/me.ts:100`, `routes/admin.ts:303`, `routes/orgs.ts:40,80`, `infrastructure/db/dal/repositories/org-repository.ts`, `modules/webhooks/index.ts:160` (lookup) | `routes/orgs.ts:55,80` (create, update), `routes/me.ts:100` (update) |
| `org_members` | `routes/me.ts:100` (scope-check), `routes/orgs.ts:40,80`, `routes/org-members.ts`, `routes/scoring.ts` (preset scope), `infrastructure/db/dal/repositories/org-repository.ts`, *(apps/web)* `lib/server/org.ts` | `routes/orgs.ts:55` (owner insert), `routes/org-members.ts` (member add/remove), `routes/me.ts` (delete-account) |
| `org_invitations` | `routes/org-members.ts` (list invitations), `infrastructure/db/dal/repositories/org-invitation-repository.ts`, `modules/orgs/invitations.ts` (token verify) | `routes/org-members.ts` (create, revoke), `modules/orgs/invitations.ts` (accept) |
| `org_methodology_pins` | `routes/org-methodology.ts:18`, `modules/orgs/methodology.ts:18` | `routes/org-methodology.ts:31`, `modules/orgs/methodology.ts:31` |
| `signal_bundles` | `routes/org-bundles.ts`, `modules/orgs/bundles.ts:121-228` (multiple query paths) | `routes/org-bundles.ts`, `modules/orgs/bundles.ts` (create, update, delete) |
| `scoring_presets` | `routes/org-presets.ts`, `routes/scoring.ts` (resolve preset_id), `modules/orgs/presets.ts:64-136` | `routes/org-presets.ts`, `modules/orgs/presets.ts` (create, update, delete) |
| `peer_cohorts` | `routes/org-cohorts.ts`, `routes/intelligence.ts` (peers filter), `modules/orgs/cohorts.ts:53-109` | `routes/org-cohorts.ts`, `modules/orgs/cohorts.ts` (create, update, delete) |

### 4.3 API keys & rate limiting

| Table | Readers | Writers |
|-------|---------|---------|
| `api_keys` | `routes/api-keys.ts:10,65`, `routes/auth.ts:49` (session key), `routes/scoring.ts` (api-key auth), `modules/api-keys/index.ts` (validate), `infrastructure/db/dal/repositories/api-key-repository.ts` | `routes/api-keys.ts:25,45,100` (create, revoke, auto-generate), `routes/auth.ts:10,85` (oauth/register auto-create) |
| `rate_limit_entries` | `infrastructure/rate-limit.ts` (rate-limit check) | `infrastructure/rate-limit.ts` (record request) |
| `idempotency_records` | `infrastructure/idempotency.ts:92` (cache hit) | `infrastructure/idempotency.ts:125` (cache write) |

### 4.4 Billing / subscriptions

| Table | Readers | Writers |
|-------|---------|---------|
| `subscriptions` | `routes/stripe.ts:55,105`, `routes/admin.ts:75,280` (MRR calc), `routes/me.ts:220` (score-usage quota), `modules/usage/index.ts`, `modules/billing/webhook-handler.ts:25` | `modules/billing/webhook-handler.ts:37,50,107,141,173` (stripe webhook events), `routes/stripe.ts:105` (cancel) |
| `subscription_addons` | `routes/stripe.ts:145`, `routes/admin.ts:81,280`, `modules/usage/index.ts` | `modules/billing/webhook-handler.ts:185,203,215` (stripe webhook), `routes/stripe.ts:145` |

### 4.5 Activity & observability

| Table | Readers | Writers |
|-------|---------|---------|
| `activity_events` | `routes/me.ts:140,220` (activity, score-usage), `routes/api-keys.ts:65` (usage), `routes/admin.ts:52,262` (usage, audience), `modules/usage/index.ts`, `modules/activity/index.ts` | `modules/tracking/activity.ts:35`, `routes/intelligence.ts` (query planner events), `routes/contact.ts` (contact event) |
| `pageviews` | `routes/admin.ts:155-183` (analytics, traffic) | *(apps/web)* `app/api/track/route.ts` → backend proxy → inserts |
| `mcp_usage` | `routes/admin.ts:95` (usage aggregation), `routes/me.ts:220` (score-usage quota) | *(incremented by mcp server, not in apps/api code)* |
| `mcp_adoption` *(view)* | `routes/admin.ts:370` | — (view over `activity_events` + `orgs` + `users`) |

### 4.6 Webhooks

| Table | Readers | Writers |
|-------|---------|---------|
| `webhook_subscriptions` | `modules/webhooks/index.ts:160,263`, `routes/webhooks.ts:11`, `routes/me.ts` | `modules/webhooks/index.ts:136` (create), `routes/webhooks.ts:25`, `routes/me.ts` (delete) |
| `webhook_deliveries` | — | `modules/webhooks/index.ts:301` (record delivery) |
| `webhook_events` | — | `modules/billing/webhook-handler.ts` (stripe dedupe) |

### 4.7 Signal store (OLTP + OLAP)

| Table | Readers | Writers |
|-------|---------|---------|
| `geo_entities` | `modules/signals/refresh/normalize.ts` (region partition), `modules/signals/store-reader.ts` (join) | `modules/signals/refresh/geo-spine.ts` (insert ONSPD spine) |
| `geo_lookup` | `modules/signals/refresh/prices.ts` (postcode→LSOA mapping), `modules/signals/refresh/normalize.ts` (region backfill) | `modules/signals/refresh/geo-spine.ts` (insert ONSPD spine) |
| `source_snapshots` | — | `modules/signals/refresh/store-writer.ts` (ingest provenance) |
| `signals` | `modules/signals/insights.ts`, `modules/monitor/change-detection.ts` | `modules/signals/refresh/store-writer.ts` (catalog seed) |
| `signal_values` | **Primary read path:** `modules/signals/store-reader.ts:32,76,165,228,272,322` (6 queries). Also: `modules/signals/insights.ts`, `modules/signals/peers.ts`, `modules/signals/query.ts` | `modules/signals/refresh/store-writer.ts` (multi-row upserts), `modules/signals/refresh/normalize.ts` (normalized_value update), `modules/signals/refresh/timeseries.ts` |
| `signal_percentiles` | `modules/signals/store-reader.ts:76,228,322` (JOIN with signal_values) | `modules/signals/refresh/normalize.ts` (compute percentiles) |
| `signal_timeseries` | `modules/signals/store-reader.ts:188,290` (historical queries), `modules/monitor/change-detection.ts` (change detection), `modules/signals/forecast.ts` (trend) | `modules/signals/refresh/timeseries.ts` (append snapshots), `modules/signals/refresh/derive.ts` (computed metrics), `modules/signals/refresh/store-writer.ts` |
| `peer_assignments` | `modules/signals/peers.ts` (k-NN fetch), `modules/signals/store-reader.ts` (JOIN), `modules/signals/refresh/derive.ts` (relative z-scores) | `modules/signals/refresh/peers-refresh.ts` (recompute) |
| `ofsted_schools` | `modules/signals/data-sources/ofsted.ts:39` (spatial proximity) | `modules/signals/refresh/ofsted.ts:260,304` (CSV bulk insert, stale-row cleanup) |

### 4.8 Scores, training, portfolios

| Table | Readers | Writers |
|-------|---------|---------|
| `score_history` | `routes/scoring.ts` (cached score lookup) | `modules/engine/rescore.ts:100` (cron rescore insert) |
| `query_planner_logs` | `routes/admin.ts:652-654` (training-corpus, stats) | `modules/training/planner-logs.ts:56` (on successful `/v1/query` NL calls) |
| `brief_composer_logs` | `routes/admin.ts:652-654` (training-corpus, stats) | `modules/training/brief-composer-logs.ts:52` (on `/v1/score?explain=true`) |
| `portfolios` | `routes/me.ts:180` | `modules/monitor/portfolio.ts`, `routes/me.ts:180` |
| `portfolio_areas` | `routes/me.ts:180`, `modules/monitor/portfolio.ts` | `modules/monitor/portfolio.ts`, `routes/me.ts:180` |
| `saved_areas` | `routes/scoring.ts` (watchlist GET) | `routes/scoring.ts` (watchlist POST/DELETE) |

### 4.9 Modules with zero DB access

These signals data sources fetch live external APIs only — no Postgres read or write:

- `modules/signals/data-sources/police.ts` — police.uk fetch only
- `modules/signals/data-sources/openstreetmap.ts` — Overpass mirror rotation only
- `modules/signals/data-sources/flood.ts` — EA flood API only
- `modules/signals/data-sources/land-registry.ts` — HMLR SPARQL only
- `modules/signals/data-sources/deprivation.ts` — ArcGIS × 3 only (live path; refresh path writes DB)
- `modules/signals/data-sources/postcodes.ts` — postcodes.io only

---

## 5. Refresh / cron jobs

CLI-only batch jobs, not exposed as HTTP routes. Triggered manually or by Render cron.

| Job | Trigger | External fetches | DB reads | DB writes |
|-----|---------|-----------------|----------|-----------|
| `refresh:ofsted` | CLI (`npm run refresh:ofsted`) | gov.uk index + assets CSV + postcodes.io (bulk geocode) | `ofsted_schools` (count) | `ofsted_schools` (upsert + delete stale) |
| `refresh:prices` | CLI | Land Registry PP CSV (S3) | `geo_lookup` (postcode→LSOA) | `signal_timeseries`, `signal_values` (via store-writer) |
| `refresh:deprivation` | CLI | ArcGIS × 3 (paginated) | — | `signal_values` (via store-writer) |
| `refresh:crime` | CLI | **None** (reads local CSV dir pre-downloaded by operator) | — | `signal_values` (via store-writer) |
| `refresh:geo-spine` | CLI | **None** (reads local NSPL CSV) | — | `geo_entities`, `geo_lookup` |
| `refresh:normalize` | CLI (after all source refreshes) | None | `signal_values`, `geo_entities` | `signal_values` (normalized_value), `signal_percentiles` |
| `refresh:derive` | CLI | None | `signal_timeseries`, `signal_values`, `peer_assignments` | `signal_timeseries` (computed metrics) |
| `refresh:timeseries` | CLI | None | `signal_timeseries` | `signal_values`, `signal_timeseries` (append) |
| `refresh:peers` | CLI | None | `signal_values` (k-NN vectors) | `peer_assignments` (recompute) |
| `/cron/rescore` | HTTP GET (gated by `CRON_SECRET`) | All live data sources (same as `/v1/area`) | `score_history` | `score_history` (insert) |
| `/cron/training-retention` | HTTP GET (gated by `CRON_SECRET`) | None | `query_planner_logs`, `brief_composer_logs` | `query_planner_logs`, `brief_composer_logs` (DELETE old) |

---

## 6. Notable architecture decisions

1. **Store-live split:** `OGA_SIGNALS_STORE_READ` flag controls whether crime/deprivation/property read from Postgres or live APIs. Amenities, flood, ofsted are always live. Flip is in `modules/signals/index.ts:79-84`.

2. **DB separation policy:** `apps/web` should have near-zero direct DB access. Exceptions: `users` (NextAuth), `magic_link_tokens` (NextAuth), `org_members` (resolveOrgId for org-scoped proxy). All business CRUD is backend-only.

3. **Signal store is additive:** store tables (`signal_values`, `signal_timeseries`, `signal_percentiles`, `peer_assignments`) run alongside live-fetch; the serve layer picks which to use. Legacy live-fetch data sources are not deprecated.

4. **Mirror resilience:** Only Overpass (3 mirrors, `Promise.any`, `Retry-After` on 503) and AI providers (fallback chain) have failover. All other external sources degrade gently (return `null` on timeout).

5. **BFF pattern:** `apps/web` is a pass-through proxy to `apps/api`. It mints a JWT bridge token (`AUTH_SECRET`-HS256) per request. No API keys or sessions are shared between containers.

6. **DB is Neon Postgres:** Production uses `console.neon.tech` serverless Postgres. Local dev uses a Compose Postgres container + neon-compat-proxy (`neon-proxy:55433/sql`) to route the serverless driver's HTTPS fetch locally.

---

## 7. Verification

To audit for new data sources or missing entries, run from repo root:

```sh
# Every external fetch call in apps/api
grep -rn 'fetch(' apps/api/src/ | grep -i 'https\?://'

# Every DB query in apps/api
grep -rn 'sql\`' apps/api/src/ modules/ routes/ | grep -v node_modules | grep -v test | grep -v '.test.'

# Every backend route registered
grep -rn 'METHOD.*"' apps/api/src/routes/ | grep -oE '"/[^"]+"' | sort -u

# Every web route handler
ls apps/web/src/app/api/**/route.ts
```

---

## References

- `docs/ARCHITECTURE/DATA-SOURCES.md` — strategy doc (which sources belong in store vs. live)
- `docs/ARCHITECTURE/SIGNAL-STORE.md` — signal store schema and refresh pipeline
- `docs/ARCHITECTURE/DATA-LAYER.md` — data-layer design
- `docs/ARCHITECTURE/DB_SYNC_EXCEPTIONS.md` — exceptions to the DB read pattern
- `docs/ARCHITECTURE/QUERY-PLANE.md` — query architecture
- `apps/api/src/infrastructure/db/schema.ts` — canonical DDL
