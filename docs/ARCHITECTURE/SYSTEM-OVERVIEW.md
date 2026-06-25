# OneGoodArea — System Overview

**As of:** 2026-05-27 (signal-first restructure merged to main as commit `369c7b9` via PR #60)

**Audience:** anyone joining or auditing the project — Pedro, Marcos, future contributors, evaluators. This document is the single-page mental model of what OneGoodArea IS, what it does, how the code is organised, what runs where, and what the data layer + intelligence layer actually contain.

It is the post-restructure snapshot. The structure described here is the one that's live in production today. Earlier shapes (consumer postcode-report monolith, AreaIQ branding, pre-monorepo layout) are noted in the "Where we came from" section but are not the current state.

---

## 1. The one-paragraph version

**OneGoodArea is the data and intelligence layer underneath UK property workflows: deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series.** Concretely, that's 4 composable products — **Signals** (the raw normalised data), **Scores** (configurable composite scoring with custom weights), **Monitor** (portfolios + change-detection + alerts), and **Intelligence** (typed queries, peers, anomaly detection, forecasts, plus a measured-accuracy AI planner) — over a persisted signal store at LSOA (Lower Super Output Area) grain covering England, Wales, and Scotland. Backend (`apps/api`) is a standalone Fastify service deployed on Render. Frontend (`apps/web`) is a Next.js app on Vercel that today still serves the consumer-facing postcode-report site at https://www.onegoodarea.com. The Intelligence layer's AI is a typed query planner with **92.9% measured accuracy** on a 14-case curated NL→plan corpus — not a chatbot, not narrative; AI never sets the numbers, the DB does.

The old framing — "structured, scored, source-backed area intelligence" — was accurate but undersold the system. With the moat clock running, peer graphs materialised, and a typed query plane with measured accuracy, OneGoodArea is now a *data layer + intelligence layer*, not a smarter report card.

---

## 2. Where we came from vs where we are

### Before (early 2026, "AreaIQ")
- **Monolith Next.js app** at the repo root. Every API route lived in `src/app/api/*`. Every DB write went through `src/lib/db.ts`. The product was "ask for a postcode, get back a 0-100 score + AI-narrated report" — Crystal Roof / StreetCheck shape.
- **No persisted store** for the raw signals. Every request fetched live from 7 sources (postcodes.io, Police.uk, IMD, OSM, Environment Agency, HM Land Registry, Ofsted), composed them, returned a one-time report.
- **No cross-area query** — you could only ask about one postcode at a time. "Most deprived LSOAs in Manchester" wasn't expressible.
- **No time-series** — every request reflected only the live state. No trend, no momentum, no "what's changed."
- **No tenancy** — single-user; every API key was Pedro's.
- **AI surface = narrative.** The LLM wrote the summary paragraph of the report. AI was a presenter, not an analytical engine.

### Today (May 2026, "OneGoodArea")
- **Monorepo** with `apps/web` (Next.js, Vercel) + `apps/api` (Fastify, Render) + `packages/contracts` (shared Zod DTOs). Decoupled deployable units.
- **Persisted signal store** on Neon Postgres: 7 tables holding deprivation, prices, crime, derived signals, time-series snapshots, percentiles, peer assignments. 1.8M postcodes resolved via the ONS geo spine. 43,916 LSOAs covered.
- **Cross-area query** is a first-class primitive: `GET /v1/areas?signal=...&country=...&max_percentile=10&...` — "give me the 100 most-deprived LSOAs in England" is one call.
- **Time-series is real.** Crime: 1.2M monthly rows over 36 months. Property: 35,652 LSOAs × 24 months from HM Land Registry. The **monthly `timeseries:append` cron is the moat clock** — every month un-snapshotted is moat that can never be recovered.
- **9 derived signals** computed in-DB from the time-series: 3 YoY (price, transaction volume, crime), 2 trend slopes (crime, volume), 2 6m short-horizon momentum signals (price, crime), and 2 peer-relative z-scores (price, crime). Each is queryable through the same `/v1/query` grammar as any raw signal.
- **Intelligence is a typed query plane**, not a chatbot. The LLM emits a JSON plan that validates against a Zod-strict grammar; the deterministic executor runs it against the DB. The AI never sets numbers — it picks which query to run. Measured accuracy: 92.9%.
- **4 composable products** rather than one report endpoint. See section 3.

### What didn't change at the merge
- The consumer-facing site at `www.onegoodarea.com` still uses `apps/web`'s own DB access path (`src/lib/*`). All the new `apps/api` infrastructure is **behind a `OGA_SIGNALS_API` dark flag** (404 when off) so consumer users see no behaviour change today. The "BFF cutover" — pointing `apps/web` at `apps/api` over HTTP — is a separate, future workstream.
- The consumer DB schema (users, api_keys, subscriptions, report_cache, etc., 19 tables) is **untouched**. The restructure only **adds** tables (signal store + monitor + peer_assignments).

---

## 3. The 4 products

OneGoodArea is sold (or will be sold) as four named products, each addressing a different B2B intent. They share the same store and contracts; they differ in which endpoints + UI surfaces they expose.

### 3.1 Signals — "give me the data"

The wedge product. Addressable, normalised area data with confidence + provenance per signal.

| Endpoint | What it does |
|---|---|
| `GET /v1/area?postcode=M1 1AE` | Full profile for an area: every signal we have, normalised value, percentile, confidence, source. |
| `GET /v1/signals/{category}?area=...` | Category-scoped view (e.g. just `property` or just `crime`). |
| `GET /v1/areas?signal=...&country=England&max_percentile=10` | Cross-area filter+rank. "Most deprived LSOAs in England" = one call. |

ICP: PropTech embeds (data feed for their own UX), insurer/lender enrichment, retail/CRE site selection feeds, public-sector analytics.

### 3.2 Scores — "give me a defensible number"

The composite-scoring primitive. Configurable weights on top of normalised signals; presets for common use-cases (moving, business, investing, research) plus arbitrary custom weights.

| Endpoint | What it does |
|---|---|
| `POST /v1/score {area, preset}` | Score one area with a preset weighting. |
| `POST /v1/score {area, weights}` | Score with arbitrary per-dimension weights. |

The scoring engine itself (v2) is **frozen** in `apps/api/src/modules/reports/scoring-engine/v2.ts` with golden-master tests guarding byte-identical output. Engine version is stamped on every response (`X-Engine-Version`); a customer can pin a version for reproducibility.

ICP: anyone who needs "give me one number per area" but with audit-defensibility (regulated buyers).

### 3.3 Monitor — "watch my portfolio"

Tracked area books with change-detection and webhooks. Enterprise retention + lock-in product.

| Endpoint | What it does |
|---|---|
| `POST /v1/portfolios` | Create a portfolio. |
| `POST /v1/portfolios/:id/areas` | Add areas (up to PORTFOLIO_ADD_MAX). |
| `POST /v1/portfolios/:id/enrich` | Bulk-enrich every area with the full signal set. |
| `POST /v1/portfolios/:id/changes` | Diff the time-series against a baseline → material moves → fire `signal.changed` webhook. Configurable threshold + min sample size for de-noising. |

The change-detection logic is pure (`diffSeries` / `buildChanges`) with injectable I/O — unit-tested + proven on prod (4-area portfolio → 7 material price moves).

ICP: lenders re-watching their book quarterly, insurers monitoring exposure shifts, BTR funds tracking their estate.

### 3.4 Intelligence — "ask questions"

The smart query + insight plane over the moat. Six surfaces, ALL live:

| Surface | Endpoint | What it does |
|---|---|---|
| 1. Query plane | `POST /v1/query` | Typed JSON plan grammar. Programmatic (`{plan}`) skips the LLM entirely; NL (`{question}`) calls the planner. Compound `rank_areas` grammar lets one plan AND-filter on multiple signals. |
| 2. Peers | `POST /v1/peers` | k-NN over normalised signals. "Areas like M1 1AE in England, k=20." Distance = Euclidean dim-mean-squared. |
| 3. Insights | `POST /v1/insights` | Anomaly screening. Ranks LSOAs by `\|peer-relative z-score\|` on a chosen signal. "Which English LSOAs are >2σ above their peer group on crime?" |
| 4. Forecast | `POST /v1/forecast` | Linear time-series projection on a signal at one LSOA. 12-month median price projection, with confidence interval. |
| 5. MCP query tools | (deprioritised — not shipped this round) | Exposes the surface to MCP clients. |
| 6. AI eval harness | CLI `npm run eval:intelligence` | Golden NL→plan corpus, structural comparison, measured accuracy. **Baseline 92.9% on 14 cases against `claude-sonnet-4-20250514`.** |

The non-negotiable principle: **AI is interface + planner; AI NEVER sets the numbers.** The LLM picks which JSON plan to emit; the deterministic executor (`apps/api/src/modules/intelligence/executor.ts`) runs it against the DB; results trace to clickable store rows. This is what makes the product saleable to regulated buyers — a measured accuracy + audit-replayable plan, not a vibes-based chatbot.

Each Intelligence surface ALSO composes through `/v1/query` via a corresponding plan op (`find_peers`, `find_insights`, `find_forecast`), so the planner can produce any of them from NL — one implementation, two ways to call it.

---

## 4. The signal store — the moat

### Tables (in `apps/api/src/infrastructure/db/schema.ts`)

| Table | Rows on prod | What it holds |
|---|---:|---|
| `geo_lookup` | 1,806,062 | NSPL postcode→LSOA→MSOA→LAD→region spine. |
| `geo_entities` | 43,916 | LSOA metadata (name, country, etc.). |
| `signals` (catalog) | ~20 | One row per signal key: `deprivation.imd_decile`, `property.median_price`, etc. With label/unit/direction/source. |
| `signal_values` | ~280k | CURRENT value per (signal_key, geo). Raw + normalised + percentile + confidence + engine_version. |
| `signal_percentiles` | ~280k | National-within-country percentile rank per (signal_key, geo). |
| `signal_timeseries` | ~1.5M+ | Append-only history. The moat clock. crime: 1.2M monthly. property: 35k × 24mo. |
| `peer_assignments` | 675,080 | Materialised k-NN graph (33,754 English LSOAs × 20 peers each). |
| `source_snapshots` | ~10 | Provenance of each refresh run. |
| `portfolios` + `portfolio_areas` | per-user | Monitor product storage. |

### 9 derived signals (computed in-DB from the time-series)

The derive jobs run as part of the monthly cron. Each is a parameterised SQL builder; adding the next derived signal is one spec entry.

| Key | Direction | What it is |
|---|---|---|
| `property.price_change_pct_yoy` | neutral | Calendar-year YoY count-weighted median sale price change |
| `property.median_price_change_pct_6m` | neutral | Latest 6m count-weighted median vs prior 6m |
| `property.transaction_count_change_pct_yoy` | neutral | Trailing 12m transaction volume YoY |
| `property.transaction_count_trend_slope_24m` | neutral | regr_slope over 24m monthly transaction volume |
| `property.median_price_peer_relative_z` | neutral | Z-score of price vs the LSOA's k-NN peer set |
| `crime.total_12m_change_pct_yoy` | lower_is_better | Trailing 12m crime sum YoY |
| `crime.total_6m_change_pct` | lower_is_better | Latest 6m crime sum vs prior 6m |
| `crime.monthly_count_trend_slope_24m` | lower_is_better | regr_slope over 24m monthly crime |
| `crime.total_12m_peer_relative_z` | lower_is_better | Z-score of crime vs peer set |

All 9 are queryable through `/v1/query rank_areas` as ordinary signals (raw or normalised, with `between` / `percentile_*` / sort). Compound queries can AND-filter on any combination of them — e.g. "England, price ≤ £300k AND priceYoY > 0 AND crime trend slope < 0 AND |priceZ| > 2" is one typed plan.

### The monthly cron (`.github/workflows/signal-refresh.yml`)

Fires `0 4 1 * *` (04:00 UTC on the 1st). Chain:

```
migrate → refresh:deprivation → refresh:prices → derive:signals (non-peer)
→ normalize:signals → refresh:peers (the similarity graph) → derive:signals (peer-relative)
→ normalize:signals → timeseries:append
```

Every step is idempotent (`ON CONFLICT DO UPDATE` / `DO NOTHING`); re-running is safe. The `DATABASE_URL` GH Actions secret is required for the cron to authenticate to Neon — set 2026-05-27 post-merge.

---

## 5. Infrastructure & deployment

### Topology

```
┌────────────────────────┐         ┌──────────────────────────┐
│  apps/web (Next.js 16) │         │  apps/api (Fastify)      │
│  • Consumer site       │         │  • Standalone backend    │
│  • Today: own DB path  │         │  • Behind OGA_SIGNALS_API│
│  • Vercel auto-deploy  │         │  • Render auto-deploy    │
└──────────┬─────────────┘         └────────────┬─────────────┘
           │                                    │
           │       ┌──────────────────────┐     │
           └──────►│   Neon Postgres      │◄────┘
                   │   (shared today)     │
                   └──────────────────────┘
                           ▲
                           │
                  ┌────────┴───────────┐
                  │ GitHub Actions cron │
                  │ signal-refresh.yml  │
                  └─────────────────────┘
```

### apps/web — Next.js consumer site
- **Host:** Vercel project `one-good-area-stable`.
- **Build:** Root Directory = `apps/web`; Install Command = `cd ../.. && npm install --no-audit --no-fund`; Build Command = `cd ../.. && npm run build -w @onegoodarea/web` (monorepo workspace install pattern).
- **Stack:** Next.js 16, React 19, Tailwind 4, NextAuth v5, Stripe.
- **State:** today serves the consumer-facing postcode-report site. Authenticates users via NextAuth (cookie sessions). Reads DB directly via `src/lib/db.ts`. Generates reports inline.
- **Future (BFF cutover, not in this merge):** apps/web will mint a short-lived HS256 JWT (shared `AUTH_SECRET`), proxy to apps/api via `INTERNAL_API_URL`, and remove its own DB access. apps/api becomes the sole DB writer.

### apps/api — Fastify standalone backend
- **Host:** Render at https://onegoodarea.onrender.com (free tier; sleeps after 15 min idle).
- **Build:** OCI image (`container/api/Containerfile`); `esbuild` bundles `src/server.ts` → `dist/server.cjs` at build time; production runs `node dist/server.cjs` (fast boot, low memory — important on free tier's 0.1 CPU/512 MB).
- **Auth modes:**
  - Programmatic: `Authorization: Bearer oga_…` API keys (SHA-256 hashed, prefix-shown). Legacy `aiq_` keys still validate for back-compat.
  - Session (browser): apps/web mints an HS256 JWT (shared `AUTH_SECRET`); apps/api only verifies the signature, no DB session lookup.
- **All Intelligence + Signals/Scores/Monitor endpoints are behind `OGA_SIGNALS_API` flag.** Off → 404. On → live.
- **Verified live** via the 401 fingerprint: `POST /v1/portfolios/x/changes` with no key returns `{"error":"Missing API key. Use: Authorization: Bearer oga_..."}` from main as of 2026-05-27.

### Neon Postgres
- Shared DB today (apps/web reads via src/lib/db.ts; apps/api uses its own infrastructure/db/client.ts; both go to the same Neon connection string).
- 19 consumer tables + 7 signal-store tables + 2 monitor tables + 1 peer_assignments = ~29 application tables.
- On the LAUNCH plan ($20 alert advised).

### packages/contracts
- Pure TypeScript + Zod. NO Node-only APIs (it's imported by the browser bundle).
- Single source of truth for every shared DTO: `Signal`, `AreaProfile`, `ScoreResult`, `PeersRequest`, `QueryPlan` (discriminated union over the 6 ops), `ForecastResponse`, etc.
- `strict()` on every object — unknown fields rejected, never silently coerced. This is what makes the API contract a contract.

### GitHub repo
- https://github.com/OneGoodArea/OneGoodArea
- **Public** as of 2026-05-27. Default branch: `main`. Branch protection enforces CI gates.
- Active branches: `main`, `feat/levers` (next workstream).
- CI: `.github/workflows/ci.yml` — Lint / Typecheck / Test / Build / Security audit. Node 22. Cross-platform monorepo handled with `npm install --no-audit --no-fund` (the Linux-only optional-deps in the lock file would break `npm ci`).
- Cron: `.github/workflows/signal-refresh.yml` — monthly signal refresh.

---

## 6. Complete API endpoint catalog

Every route registered in `apps/api/src/app.ts`. Auth-mode legend:
- **API key**: `Authorization: Bearer oga_...` (legacy `aiq_` also valid).
- **Session JWT**: minted by apps/web, verified by apps/api (the BFF bridge — today these endpoints exist on apps/api but are still served by apps/web's own copies until the BFF cutover lands).
- **CRON_SECRET**: shared secret header.
- **Stripe sig**: Stripe-signed webhook payload.
- **Public**: no auth required.

The 🔒 **dark-flag** column marks endpoints gated by `OGA_SIGNALS_API` (404 when the env flag is off; these are the post-restructure additions and the heart of the 4 products).

### 6.1 Health + meta (public)

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| GET | `/health` | Public | — | Liveness probe; returns `{status:"ok"}`. |
| GET | `/v1/meta` | Public | — | Methodology version + engine info for clients that pin engine_version. |

### 6.2 Signals product

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| GET | `/v1/area?postcode=...` | API key | 🔒 | Full signal profile for one area (every signal + normalised value + percentile + confidence + source). |
| GET | `/v1/signals/:category?area=...` | API key | 🔒 | Category-scoped signals (`property`, `crime`, `deprivation`, etc.). |
| GET | `/v1/areas?signal=...&country=...` | API key | 🔒 | Cross-area filter+rank. "Most deprived LSOAs in England" = one call. |

### 6.3 Scores product

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/score` | API key | 🔒 | Score one area: `{area, preset}` or `{area, weights}`. Returns dimension breakdown + composite + engine_version. |

### 6.4 Monitor product

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/portfolios` | API key | 🔒 | Create a portfolio (book of tracked areas). |
| GET | `/v1/portfolios` | API key | 🔒 | List portfolios owned by caller. |
| GET | `/v1/portfolios/:id` | API key | 🔒 | Get one portfolio + member areas. |
| DELETE | `/v1/portfolios/:id` | API key | 🔒 | Delete a portfolio. |
| POST | `/v1/portfolios/:id/areas` | API key | 🔒 | Add areas to a portfolio (bulk, up to `PORTFOLIO_ADD_MAX`). |
| POST | `/v1/portfolios/:id/enrich` | API key | 🔒 | Bulk-enrich every area with the full signal set. |
| POST | `/v1/portfolios/:id/changes` | API key | 🔒 | Diff time-series vs baseline, return material moves, fire `signal.changed` webhooks. |

### 6.5 Intelligence product

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/query` | API key | 🔒 | Typed query plane. `{plan}` programmatic OR `{question}` NL → planner. Compound `rank_areas` AND-filters supported. |
| POST | `/v1/peers` | API key | 🔒 | k-NN over normalised signals: areas like this one. |
| POST | `/v1/insights` | API key | 🔒 | Anomaly screening: rank LSOAs by `|peer-relative z|` on a chosen signal. |
| POST | `/v1/forecast` | API key | 🔒 | Linear regression projection for one (signal, area) over N months. |

### 6.6 Levers (per-org configuration — AR-192 epic)

The Levers surface is the "fully configurable per client" layer. Every customer (every API key) belongs to an `org`; org owners + admins configure scoped behaviour. None of these endpoints are behind `OGA_SIGNALS_API` — they're always-on. Mutations follow the role matrix in ADR 0033 (member read, admin Levers mutations, owner-only on methodology pin + chain-of-authority).

#### Orgs + members (AR-194, ADR 0028)

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/orgs` | API key | — | Create an org; caller becomes owner. |
| GET | `/v1/orgs` | API key | — | List orgs the caller is a member of (with role). |
| GET | `/v1/orgs/:id` | API key | — | Get one org (404 if not a member). |
| PATCH | `/v1/orgs/:id` | API key | — | Rename / re-slug / set white-label `display_name` + `brand_url` (admin+). |
| GET | `/v1/orgs/:id/members` | API key | — | List members + roles. |
| POST | `/v1/orgs/:id/members` | API key | — | Add a member (admin+; owner-only to grant the `owner` role). |
| DELETE | `/v1/orgs/:id/members/:userId` | API key | — | Remove a member; self-removal allowed for any role. Owner-role members can only be removed by an owner. Last-owner guard always applies. |

#### Custom signal bundles (AR-195, ADR 0029)

A bundle is a named per-org whitelist of signal keys. When a caller passes `?bundle=<id>` on `/v1/area`, `/v1/areas`, or `/v1/query`, results are filtered to the bundle's signal set. Default behaviour without the param is unchanged.

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/orgs/:id/bundles` | API key | — | Create bundle `{name, signal_keys[]}` (admin+). 400 on unknown signal keys. |
| GET | `/v1/orgs/:id/bundles` | API key | — | List org's bundles. |
| GET | `/v1/orgs/:id/bundles/:bundleId` | API key | — | Get one bundle. |
| PATCH | `/v1/orgs/:id/bundles/:bundleId` | API key | — | Rename / change signal_keys (admin+). |
| DELETE | `/v1/orgs/:id/bundles/:bundleId` | API key | — | Remove (admin+). |

#### Custom scoring presets (AR-196, ADR 0030)

A preset is a saved `{base_preset, weights}` bundle. `POST /v1/score` accepts an optional `preset_id` to use the saved weights (mutually exclusive with explicit `preset` / `weights`). The deterministic engine is reused untouched.

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/orgs/:id/presets` | API key | — | Create preset `{name, base_preset, weights}` (admin+). 400 on weight keys not in the chosen base_preset's dim set. |
| GET | `/v1/orgs/:id/presets` | API key | — | List presets. |
| GET | `/v1/orgs/:id/presets/:presetId` | API key | — | Get one. |
| PATCH | `/v1/orgs/:id/presets/:presetId` | API key | — | Update any subset (admin+); changing base_preset re-validates weights. |
| DELETE | `/v1/orgs/:id/presets/:presetId` | API key | — | Remove (admin+). |

#### Methodology pinning (AR-197, ADR 0031)

One row per org. When set, the pin becomes the `X-Engine-Version` stamp for every product-endpoint response from the org's keys (unless a per-request `X-Engine-Version` header overrides). Compliance/audit anchor — kept owner-only.

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| GET | `/v1/orgs/:id/methodology` | API key | — | `{engine_version, pinned}`. |
| PUT | `/v1/orgs/:id/methodology` | API key | — | Set the pin (owner-only). Validates against `SUPPORTED_ENGINE_VERSIONS`. |
| DELETE | `/v1/orgs/:id/methodology` | API key | — | Clear the pin (owner-only); responses fall back to latest. |

#### Peer cohorts (AR-198, ADR 0032)

A cohort is a named per-org subset of LSOA codes. `POST /v1/peers` accepts an optional `cohort_id` to filter the candidate set via `buildPeersSql`'s new `cohortGeoCodes` `ANY($n::text[])` branch. Query-time filtering on the existing global k-NN graph; no materialised per-org graph yet.

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/orgs/:id/cohorts` | API key | — | Create cohort `{name, geo_codes[]}` (admin+; max 10,000 codes). |
| GET | `/v1/orgs/:id/cohorts` | API key | — | List cohorts. |
| GET | `/v1/orgs/:id/cohorts/:cohortId` | API key | — | Get one. |
| PATCH | `/v1/orgs/:id/cohorts/:cohortId` | API key | — | Update name / slug / geo_codes (admin+). |
| DELETE | `/v1/orgs/:id/cohorts/:cohortId` | API key | — | Remove (admin+). |

#### White-label + IP allowlist (AR-200, ADR 0034)

No new endpoints — both features add columns to existing tables and surface them on existing routes.

- **White-label:** `orgs.display_name` + `orgs.brand_url` set via `PATCH /v1/orgs/:id` (admin+); read on `/v1/me.org`. Null `display_name` falls back to `name` at the consumer.
- **IP allowlist:** `api_keys.allowed_ip_cidrs TEXT[]` (empty = no restriction). Enforced inside `validateApiKey` via the pure `ipMatchesCidrs` helper (IPv4 prefix matching by integer mask, IPv6 exact-equality fallback, OR-semantics, skip-bad-cidr defensive). A non-matching request IP returns **403 `ip_not_allowed`** distinct from the 401 invalid-key path. Read the current allowlist on `/v1/me.key.allowed_ip_cidrs`. Management endpoint deferred — column settable via SQL today.

#### Full RBAC (AR-199, ADR 0033)

Cross-cutting refactor (no new endpoints). Promoted `admin` from "exists but ignored" to a real mutator role:
- **member+**: all GET endpoints in section 6.6.
- **admin+**: PATCH org, member CRUD (non-owner targets only), bundles, presets, cohorts.
- **owner-only**: methodology pin PUT/DELETE, granting the `owner` role, removing an `owner` member, last-owner-guard.

Typed 403 codes: `admin_required`, `owner_required`, `cannot_grant_owner`, `cannot_remove_owner_as_admin`.

### 6.7 Legacy report API (pre-restructure, still live)

These pre-date the 4-product restructure but remain the primary live surface today + are how the existing consumer site generates reports.

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/report` | API key | — | Generate a full report (score + AI narrative). The v1 consumer surface. |
| POST | `/v1/batch` | API key | — | Batch up to `BATCH_MAX_ITEMS` reports per call. |
| GET | `/v1/me` | API key | — | Caller's plan + entitlements + quota + (AR-200) `org` block (id/slug/name/display_name/brand_url/role) + `key.allowed_ip_cidrs`. |
| GET | `/me/reports` | API key | — | List the caller's recent reports. |

### 6.8 Webhooks (subscription management)

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/v1/webhooks` | API key | — | Create a webhook subscription (`signal.changed`, etc.). |
| GET | `/v1/webhooks` | API key | — | List caller's active subscriptions. |
| DELETE | `/v1/webhooks/:id` | API key | — | Revoke a subscription. |

### 6.9 Stripe billing

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/stripe/webhook` | Stripe sig | — | Stripe event handler (subscription state, payment success/fail). |
| POST | `/stripe/portal` | Session JWT | — | Create Stripe Customer Portal session for self-serve plan management. |
| POST | `/stripe/checkout` | Session JWT | — | Create main-plan checkout session. |
| POST | `/stripe/addon-checkout` | Session JWT | — | Create add-on checkout session (e.g. MCP add-on). |
| POST | `/stripe/cancel` | Session JWT | — | Cancel the active subscription. |

### 6.10 Account dashboard (session JWT — BFF cutover not yet flipped)

These endpoints exist in apps/api but the consumer site at www.onegoodarea.com still serves them via apps/web's own copies (`src/lib/db.ts` direct access). The BFF cutover flips the routing.

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| GET | `/usage` | Session JWT | — | Caller's usage counters this period. |
| GET | `/settings/subscription` | Session JWT | — | Current subscription state for the dashboard. |
| GET | `/keys/usage` | Session JWT | — | Per-API-key usage stats. |
| GET | `/keys` | Session JWT | — | List caller's API keys. |
| POST | `/keys` | Session JWT | — | Create a new API key (returns plaintext ONCE; SHA-256 hashed at rest). |
| DELETE | `/keys/:id` | Session JWT | — | Revoke an API key. |
| GET | `/report/:id` | Session JWT | — | Fetch a saved report (dashboard view). |
| DELETE | `/report/:id` | Session JWT | — | Delete a saved report. |
| POST | `/settings/password` | Session JWT | — | Change password. |
| DELETE | `/settings/delete-account` | Session JWT | — | Self-serve account deletion. |
| POST | `/report` | Session JWT | — | Generate report (apps/web session-auth flow; idempotency-wrapped). |
| GET | `/watchlist` | Session JWT | — | Caller's saved areas (dashboard widget). |
| POST | `/watchlist` | Session JWT | — | Save an area. |
| DELETE | `/watchlist/:id` | Session JWT | — | Remove a saved area. |

### 6.11 Auth credentials (no auth on request; sets cookie / issues token)

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/auth/register` | Public | — | Email + password sign-up; sends verification email. |
| POST | `/auth/resend-verification` | Public | — | Re-send the verification email. |
| POST | `/auth/forgot-password` | Public | — | Request a password-reset token. |
| POST | `/auth/reset-password` | Public | — | Consume a reset token + set new password. |

### 6.12 Site helpers + cron

| Method | Path | Auth | Dark? | What it does |
|---|---|---|---|---|
| POST | `/track` | Public | — | Analytics event ingest (page views, conversions). |
| GET | `/widget` | Public | — | Iframe-able widget HTML for embeds. |
| GET | `/cron/rescore` | CRON_SECRET | — | Legacy in-app cron: re-score every cached report. Gated by header secret. |

### Tally

**76 routes total** in `apps/api/src/app.ts`. Of these:
- **14 behind `OGA_SIGNALS_API`** — the 4 products' surfaces (Signals + Scores + Monitor + Intelligence). The post-restructure additions; 404 today on any deploy where the flag is off.
- **25 Levers endpoints** (AR-192 epic) — orgs/members + bundles + presets + methodology pin + peer cohorts. Always-on; role-gated per ADR 0033.
- **37 already-live** — legacy report API, webhooks, Stripe billing, account dashboard, auth credentials, tracking, cron. These pre-date the restructure and were ported into `apps/api` verbatim from the apps/web monolith.

The cron job in `.github/workflows/signal-refresh.yml` is a separate execution surface (not a route in `apps/api`); it runs the refresh/derive/normalize/timeseries pipeline directly against Neon via `npx tsx ...` CLI scripts.

For external/sales documentation, the OpenAPI spec at `apps/web/public/openapi.json` (served at `/openapi.json` and rendered by Scalar at `/docs/api-reference`) is the customer-facing reference — but it is intentionally NOT updated with the dark-flagged endpoints until they leave the flag, so "no invented claims" stays honoured. The spec lists Reports / Webhooks / Account; the 4-product surfaces become spec'd when they go GA.

---

## 7. Code organisation (where things live)

### Top-level

```
/
├── apps/
│   ├── web/                  Next.js 16 consumer app (Vercel)
│   │   ├── src/app/          App-router routes
│   │   ├── src/components/   Shared React components
│   │   ├── src/lib/          DB, auth, stripe, helpers (DIRECT DB access today)
│   │   └── package.json      
│   └── api/                  Fastify backend (Render)
│       ├── src/server.ts     Entrypoint
│       ├── src/app.ts        All route registrations
│       ├── src/infrastructure/
│       │   ├── config/       env config + getConfig()
│       │   ├── db/           Neon client + schema migrations registry
│       │   ├── email/        Resend / Mailhog providers
│       │   ├── errors/       AppError types
│       │   ├── idempotency.ts
│       │   ├── rate-limit.ts
│       │   ├── utils/        id generators
│       │   └── validation/
│       └── src/modules/
│           ├── api-keys/         oga_ key lifecycle (SHA-256)
│           ├── auth/             session-token (JWT verify), credentials, crypto
│           ├── billing/          stripe + plans
│           ├── intelligence/     /v1/query — planner + executor + eval harness
│           │   ├── planner.ts    NL → JSON plan
│           │   ├── executor.ts   plan → DB result (dispatch)
│           │   ├── index.ts      runQuery orchestrator
│           │   └── eval/         golden corpus + comparison + CLI
│           ├── monitor/          portfolios + change detection
│           ├── reports/          legacy /v1/report + scoring-engine/v2 (frozen)
│           ├── scoring/          v3 scoring (presets + custom weights)
│           ├── signals/          THE SIGNAL LAYER
│           │   ├── area-profile.ts        Build a profile from sources
│           │   ├── data-sources/          7 live sources (postcodes, police, etc.)
│           │   ├── store-reader.ts        Read normalised values from the store
│           │   ├── query.ts               /v1/areas + buildAreasQuery
│           │   ├── peers.ts               /v1/peers + findPeers
│           │   ├── insights.ts            /v1/insights + findInsights
│           │   ├── forecast.ts            /v1/forecast + runForecast
│           │   └── refresh/               Monthly refresh jobs
│           │       ├── deprivation.ts     IMD pull
│           │       ├── prices.ts          HM Land Registry pull
│           │       ├── crime.ts           Police.uk archive
│           │       ├── geo-spine.ts       NSPL postcode→geo loader
│           │       ├── derive.ts          9 derived signals
│           │       ├── normalize.ts       Percentile + normalised_value
│           │       ├── normalize-all.ts   Unified normalize step
│           │       ├── peers-refresh.ts   k-NN materialisation
│           │       └── timeseries.ts      Monthly append (moat clock)
│           ├── usage/            quotas + entitlements
│           └── webhooks/         signal.changed delivery
├── packages/
│   └── contracts/                Zod DTOs (shared)
├── docs/
│   ├── adr/                      26 ADRs documenting every load-bearing decision
│   ├── DEPLOY.md
│   └── SYSTEM-OVERVIEW.md        ← this document
├── .github/
│   └── workflows/                CI + signal-refresh cron
├── scripts/                      Prove-on-prod helpers (mint/revoke key, etc.)
└── package.json                  Monorepo workspaces root
```

### ADRs — the "why" record

`docs/adr/` holds 26 short ADRs (0001-0026), one per load-bearing decision. Read these in order for the historical reasoning behind the architecture; they're the single best entry point into "why did we do it this way."

A few load-bearing highlights:
- **0001** — Signal as the public primitive (the strategic reframe from report-as-product to data-as-product).
- **0002** — The 7-table signal store schema.
- **0005** — Normalisation methodology (national-within-country percentiles).
- **0007** — Cross-area query design.
- **0010** — Monthly time-series append — the moat clock.
- **0017** — Intelligence v1 query plane (planner/executor split).
- **0023** — Peers k-NN distance metric (Euclidean dim-mean-squared).
- **0024** — Peer-relative z-score derived signals + insights.
- **0026** — AI eval harness methodology + the 92.9% baseline.

---

## 8. Methodology principles (the non-negotiables)

These are the rules that everything in the codebase obeys. They are also what makes the product saleable to regulated buyers.

### 7.1 AI never sets the numbers
The LLM emits a JSON plan that validates against `QueryPlanSchema`. The deterministic executor runs the plan against the DB. The LLM is a query-router, not a calculator. Invalid plans are REJECTED with a typed error (HTTP 422), never silently re-interpreted. This is enforced via `QueryPlanSchema.strict()` on every object — unknown fields rejected.

### 7.2 Deterministic core, audit-replayable
Every Intelligence response echoes the executed plan + `plan_source` (`"client"` for programmatic, `"nl"` for natural-language). A consumer can audit exactly what ran and replay any NL query as a `{plan}` programmatic call to verify reproducibility.

### 7.3 Engine version is pinned
Every score response stamps `X-Engine-Version: 2.0.0`. Customers can pin via `X-Engine-Version` request header for reproducibility. v2 is frozen with golden-master tests in `apps/api/src/modules/reports/scoring-engine/v2.ts`.

### 7.4 Idempotency everywhere
Every refresh job uses `ON CONFLICT DO UPDATE` / `DO NOTHING`. Every migration is `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`. The monthly cron is safe to re-run on the same day.

### 7.5 Confidence + provenance per signal
Every `signal_values` row carries `confidence` (0.0-1.0) + `confidence_reason` (human-readable) + `source_snapshot_id` (which refresh run) + `engine_version`. Nothing is bare; everything is attributable.

### 7.6 Strangler-fig + dark flags
Every new endpoint is behind `OGA_SIGNALS_API` (404 when off). The consumer site's runtime is unchanged at every merge until an explicit cutover. New tables only — no destructive ALTERs on live tables.

### 7.7 No invented claims
Marketing copy, /pricing, /docs cannot reference a tier or quota or feature that doesn't exist in code. Verified against `src/lib/stripe.ts` PLANS + `src/lib/usage.ts` quotas before any number lands in user-visible copy.

---

## 9. ICP positioning (who buys it)

Per the strategy docs (gitignored at repo root) + the post-restructure refinement (2026-05-27): **"the data and intelligence layer underneath UK property workflows: deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series."** The earlier "decision-grade area intelligence layer" framing remains true but undersells what shipped; use the four-products-named version externally. ICP ranked by closeable-this-year ACV:

1. **PropTech embeds** — the wedge. They want raw signals to feed their own UX + pricing. Land via Signals API.
2. **InsureTech / MGAs** — comp + monitoring at portfolio level. Land via Signals + Monitor.
3. **Mid-tier lenders** — catchment risk, portfolio drift. Land via Monitor + Intelligence (peer-relative anomalies = real underwriting signal).
4. **Retail / CRE** — site selection at scale. Compound `rank_areas` queries.
5. **Public sector** — research + planning. Lower urgency.

The product line maps cleanly: **Signals** is the wedge (cheapest, fastest land), **Scores** is the on-ramp for buyers who want one number, **Monitor** is the retention + expansion product, **Intelligence** is the moat showing up as differentiation (peer-relative anomalies, forecasts, NL queries with measured accuracy).

The pricing v2 tiers (live on Stripe today): Sandbox £0 / Starter £49 / Build £149 / Scale £499 / Growth £1,499 / Enterprise £4,999+ — with an MCP add-on £29/mo. The Levers workstream (next) is what unlocks Enterprise — per-org tenancy + custom signal bundles + presets + RBAC + white-label.

---

## 10. What's deferred (and why)

These items are tracked in memory + ADRs as deliberately deferred. They are NOT bugs; they are not-yet:

| Item | Why deferred | Where it'll live |
|---|---|---|
| **Levers / per-org tenancy** | The whole tenancy story is its own epic — orgs/members/RBAC/scope_key/white-label. Pedro chose to do it as a separate branch after the restructure ships. | `feat/levers` (next workstream) |
| **BFF cutover** (apps/web → apps/api over HTTP) | Adds a JWT-bridge integration risk on top of an already big restructure. Deploy-gated; the merge to main intentionally does NOT include this. | A separate branch when apps/api is on a customer-grade host. |
| **Hosting upgrade for apps/api** | Free Render tier sleeps after 15 min; not customer-grade. Will move to Render Starter ($7/mo, no sleep) or Cloud Run (scale-to-zero, gentler cold start). | Ops decision, no code change. |
| **Resend DNS for onegoodarea.com** | SPF + DKIM + MX records at IONOS. Until done, ALL email sends fail (verification, password reset, report delivery). | IONOS UI; ops task. |
| **Property median-price trend slope** (smoothed) | The non-smoothed version is too noisy at LSOA grain. Needs peer-aware smoothing (which the just-shipped peer_assignments unlocks). | One commit on a future branch, post-Levers. |
| **Aggregate op + OR/nested filters** (Increment 4) | The compound `rank_areas` AND-grammar covers ~70-80% of ICP screening. OR/aggregate is the next 10%. Single commit when prioritised. | Separate branch. |
| **Execution-level AI eval** | Plan-level eval (this baseline) catches planner errors. Execution-level catches data-correctness regressions. Needs reference data design. | Separate branch. |
| **Spatial / contiguity ops** ("areas adjacent to LSOAs with X") | Needs boundary geometry data which we don't yet have. | Increment 10. |
| **Methodology RAG + /v1/analyze** | The narrative explanation surface is explicitly deferred so v1 stays infrastructure-shaped, not chatbot-shaped. | Future, courtesy layer. |
| **MCP coverage** | Distribution channel, not capability. Deprioritised until the surface is rich. | Future. |
| **Address-level granularity (AR-134)** | UPRN-level scoring beats LSOA for insurers + lenders. Procurement-gated. | Future, ~1 week + £. |
| **Marketing pages + /pricing sweep** | After Levers, when there's the full Enterprise story to advertise. | Separate branch. |

---

## 11. How to test it — hands-on guide for Pedro + Marcos

The consumer site at https://www.onegoodarea.com is the surface most users see today. To exercise the **new API infrastructure** directly, you need an API key.

### 10.1 Mint a key (one-time per session)

```powershell
# from repo root, with apps/web/.env.local containing DATABASE_URL
$env:DATABASE_URL = (Get-Content apps/web/.env.local | Select-String '^DATABASE_URL=').ToString().Split('=', 2)[1].Trim('"', "'")
node scripts/mint-ephemeral-key.mjs
# prints: {"keyId":"key_...","key":"oga_..."}
# copy the key value
```

To revoke when done:
```powershell
node scripts/revoke-ephemeral-key.mjs <keyId>
```

(These scripts are designed for ad-hoc testing only — they bypass the normal `/api/keys` POST endpoint and go direct to the DB.)

### 10.2 Signals product

```powershell
# Set the key once:
$KEY = "oga_..."

# Full area profile (raw signals, normalised values, percentiles, confidence)
curl.exe -s -H "Authorization: Bearer $KEY" "https://onegoodarea.onrender.com/v1/area?postcode=M1 1AE" | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Cross-area: 5 most-deprived LSOAs in Manchester
curl.exe -s -H "Authorization: Bearer $KEY" "https://onegoodarea.onrender.com/v1/areas?signal=deprivation.imd_decile&lad=E08000003&sort=value&limit=5" | ConvertFrom-Json

# Cross-area: 5 cheapest LSOAs in England
curl.exe -s -H "Authorization: Bearer $KEY" "https://onegoodarea.onrender.com/v1/areas?signal=property.median_price&country=England&sort=value&limit=5" | ConvertFrom-Json
```

### 10.3 Scores product

```powershell
# Score M1 1AE for the investing preset
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/score" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"area":"M1 1AE","preset":"investing"}' | ConvertFrom-Json

# Score SW1A 1AA with custom weights
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/score" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"area":"SW1A 1AA","weights":{"affordability":60,"safety":40}}' | ConvertFrom-Json
```

### 10.4 Monitor product

```powershell
# Create a portfolio
$PORT = curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/portfolios" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"name":"Demo portfolio"}' | ConvertFrom-Json
$PID = $PORT.id

# Add some areas
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/portfolios/$PID/areas" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"areas":["M1 1AE","SW1A 1AA","B1 1BB","LS1 4AP"]}'

# Bulk-enrich (returns full signals for every area)
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/portfolios/$PID/enrich" `
  -H "Authorization: Bearer $KEY" | ConvertFrom-Json | ConvertTo-Json -Depth 8

# Detect material moves vs the previous time-series period
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/portfolios/$PID/changes" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"baseline":"previous","threshold_pct":5}' | ConvertFrom-Json
```

### 10.5 Intelligence — query plane

```powershell
# Programmatic plan (zero LLM): "cheapest 5 LSOAs in England"
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/query" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"plan":{"op":"rank_areas","params":{"signal":"property.median_price","country":"England","sort":"value","limit":5}}}' | ConvertFrom-Json

# Compound plan: "England, price <= 250k AND price YoY > 0 AND crime in bottom 50%, sort by YoY desc, top 5"
$body = '{"plan":{"op":"rank_areas","params":{"signals":[{"key":"property.median_price","filter":{"lte":250000}},{"key":"property.price_change_pct_yoy","filter":{"gt":0}},{"key":"crime.total_12m","filter":{"percentile_lte":50}}],"sort_by":{"signal":"property.price_change_pct_yoy","mode":"value","direction":"desc"},"country":"England","limit":5}}}'
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/query" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" -d $body | ConvertFrom-Json

# NL: "most deprived LSOAs in Manchester"
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/query" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"question":"most deprived LSOAs in Manchester"}' | ConvertFrom-Json
```

### 10.6 Intelligence — peers

```powershell
# Areas similar to M1 1AE (Manchester), in England, top 10
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/peers" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"target":{"postcode":"M1 1AE"},"country":"England","k":10}' | ConvertFrom-Json
```

### 10.7 Intelligence — insights (anomaly screening)

```powershell
# English LSOAs anomalously high on crime vs their peer group
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/insights" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"signal_key":"crime.total_12m_peer_relative_z","country":"England","min_abs_z":2,"k":10}' | ConvertFrom-Json
```

### 10.8 Intelligence — forecast

```powershell
# 12-month forecast of median price at M1 1AE
curl.exe -s -X POST "https://onegoodarea.onrender.com/v1/forecast" `
  -H "Authorization: Bearer $KEY" -H "content-type: application/json" `
  -d '{"target":{"postcode":"M1 1AE"},"signal_key":"property.median_price","horizon_months":12}' | ConvertFrom-Json
```

### 10.9 Intelligence — AI eval harness (the 92.9% number)

```powershell
# Reproduce the baseline locally (needs ANTHROPIC_API_KEY env)
$env:OGA_EVAL_PLAN = "true"
$env:ANTHROPIC_API_KEY = "sk-ant-..."
npm run eval:intelligence -w @onegoodarea/api
```

Prints a markdown report with overall accuracy %, by-op breakdown, per-case PASS/FAIL with the first mismatching path on failures.

---

## 12. Quality bar (the operating loop)

Every change to the codebase follows the same loop, documented in memory at `feedback_working_process.md`:

1. **Orient** — read MEMORY.md + topic file + relevant ADRs + 3 strategy docs (if product/arch work).
2. **Jira** — Story under the active epic (signal-first restructure ran under AR-169 then merged to main; Levers ran under AR-192 and is feature-complete on `feat/levers`). Transition In Progress at start; progress comments; Done at the merge gate.
3. **Branch** — feature branch off main (never commit to main directly). Atomic conventional commits with Co-Authored-By trailer.
4. **Build discipline** — strangler-fig + additive behind dark flags; ADR for every load-bearing decision; Zod contracts for every DTO; no invented claims.
5. **Gates green** — `npm test -w @onegoodarea/api` + root `typecheck` + `lint`. Counts reported before every commit.
6. **Prove on prod** — every increment runs against prod Neon (via live Render) before moving on. Methodology + result captured in the Jira comment.
7. **Docs + memory** — `ARCHITECTURE.md` updated at phase milestones; memory topic files updated after every task.
8. **Push + PR + squash-merge** — CI green; squash-merge via web UI; main stays clean.

Test counts on `feat/levers` HEAD: **apps/api 868 / packages/contracts 57 / apps/web 306 / typecheck clean / lint 0 errors / 20 known pre-existing apps/web warnings**.

---

## 13. The one-sentence position

**OneGoodArea is the data and intelligence layer underneath UK property workflows: deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series** — sold as 4 composable products, audit-defensible by construction, with the math always run by the database and AI confined to picking the question.

Use this as the one-line you lead with. Reserve "structured, scored, source-backed area intelligence" for the bottom of the page; it's accurate but it's the v1 framing — the system now has the moat clock, the peer graphs, and the measured-accuracy query plane, none of which that phrase captures.

---

*Document baseline: 2026-05-27. Restructure landed as commit `369c7b9` via PR #60. Next workstream: Levers (per-org tenancy) on branch `feat/levers`.*
