[![CI](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml/badge.svg)](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/OneGoodArea/OneGoodArea?style=plastic)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fwww.onegoodarea.com&style=plastic)
![GitHub repo size](https://img.shields.io/github/repo-size/OneGoodArea/OneGoodArea)
![Vercel](https://vercelbadge.vercel.app/api/OneGoodArea/OneGoodArea)

# OneGoodArea

**The data and intelligence layer underneath UK property workflows.**

Deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series. Built for regulated buyers — mortgage lenders, insurers, MGAs, PropTech embeds — who need numbers they can ship to a model risk register.

**Live:** [onegoodarea.com](https://www.onegoodarea.com) · **API ref:** [`/docs/api-reference`](https://www.onegoodarea.com/docs/api-reference) · **System overview:** [`docs/SYSTEM-OVERVIEW.md`](docs/SYSTEM-OVERVIEW.md)

---

## What it is

OneGoodArea is **four composable products** sitting on a persisted signal store + a typed query plane:

1. **Signals** — `GET /v1/area` / `/v1/areas` / `/v1/signals/:category`. The atomic primitive: per-LSOA values + normalised + percentile + confidence + source, served from the store with live fallback.
2. **Scores** — `POST /v1/score`. Deterministic composite over 5 dimensions per intent. Frozen v2 engine, golden-tested. Preset weights or caller weights.
3. **Monitor** — `POST /v1/portfolios/*`. Portfolio CRUD + bulk enrich + change detection via the time-series moat → `signal.changed` webhooks.
4. **Intelligence** — `POST /v1/query` / `/v1/peers` / `/v1/insights` / `/v1/forecast`. Typed query plane (programmatic OR NL-planned), k-NN peers, anomaly screening, linear projection. The AI is the INTERFACE; the determinism is the floor.

**Levers** (epic AR-192) cross-cuts the four products: per-org tenancy, custom signal bundles, custom scoring presets, methodology pinning, peer cohorts, full RBAC, white-label, IP allowlist. The "fully configurable per client" half of the positioning.

## Why it's different

- **Deterministic numbers.** Scoring formulas are frozen. Same input, same output, every time. AI narrates; never overrides.
- **Confidence per signal + per dimension.** Every value reports HIGH/MEDIUM/LOW/NONE based on data freshness + completeness. Buyer-grade transparency.
- **Version-pinned methodology.** `engine_version` stamped on every response; orgs can pin a specific version for their model risk register (ADR 0031).
- **Source-attributed.** Every value cites the upstream public dataset. No proprietary indices, no opaque composites.
- **Audit-replayable AI.** `POST /v1/query` returns the executed plan + plan_source ("nl" | "client") with the response — every NL answer is reproducible as a programmatic call.
- **Typed-everything API.** Zod contracts shared between server and clients via `@onegoodarea/contracts`.

## Audiences

- **PropTech embeds** — Signals + Scores via white-label keys, `/v1/me.org.brand_url` for "Powered by X" surfaces.
- **InsureTech MGAs** — Underwriting models powered by per-org bundles + saved scoring presets pinned to a methodology version.
- **Mortgage lenders** — Origination scoring + portfolio risk enrichment via Monitor (`signal.changed` alerts).
- **Retail / CRE site selection** — Cross-area ranking via `/v1/areas` + peer cohorts within their pilot footprint.

Consumer surfaces (the report generator, programmatic area pages, blog) remain as a top-of-funnel awareness layer.

## Repository layout

This repo is an npm monorepo. Three workspaces:

```
apps/
├── web/                          Next.js 16 consumer + dashboard (renders www.onegoodarea.com)
│   ├── src/app/                  Routes (design-v2/* is the canonical UI)
│   ├── src/app/api/              Legacy /api/* routes (gradually migrating to BFF over apps/api)
│   └── src/lib/                  Direct-DB + auth helpers (BFF cutover replaces these)
├── api/                          Standalone Fastify backend deployed to Render
│   ├── src/app.ts                ~75 routes — Signals, Scores, Monitor, Intelligence, Levers, legacy
│   ├── src/modules/              signals/ scoring/ monitor/ intelligence/ orgs/ reports/ billing/ ...
│   └── src/infrastructure/       db/ rate-limit/ email/ idempotency/ utils/
packages/
└── contracts/                    Zod schemas + types shared by web + api (single source of truth)
docs/
├── SYSTEM-OVERVIEW.md            ⭐ Read this. Living architecture doc + complete API catalog.
├── DEPLOY.md                     Render + Vercel deploy notes.
└── adr/                          34 ADRs documenting every load-bearing decision (0001-0034).
mcp/                              @onegoodarea/mcp-server package
scripts/                          Stripe + seed + ops utilities
.github/workflows/                CI + signal-refresh cron
```

`apps/api` is deployed to **Render** (free tier today; container build via `/Dockerfile`); `apps/web` to **Vercel** (Root Directory `apps/web`). Neon hosts Postgres. The BFF cutover — apps/web's `src/lib/db.ts` direct access → calls into apps/api — is in progress, not yet flipped.

## Stack

| Layer | Tech |
|------|------|
| Backend | Fastify (apps/api), Node 20, TypeScript 5, Vitest |
| Frontend | Next.js 16, React 19, Tailwind 4 |
| Contracts | Zod (runtime-validated, types inferred at compile time) |
| Database | Neon Postgres (signal store + tenancy + everything else) |
| Auth | NextAuth v5 on apps/web (Google OAuth + Credentials), HS256 JWT bridge to apps/api |
| Payments | Stripe — 6 tiers + MCP add-on; idempotent webhooks |
| AI | Anthropic Claude (planner + narrator); `apps/api/src/modules/intelligence/planner.ts` is the strict typed grammar |
| Email | Resend |
| Errors | Sentry (web + api + edge) |
| CI | GitHub Actions (typecheck + lint + tests across all workspaces) |
| Deploy | Render (apps/api), Vercel (apps/web) |

## Data sources (signal store provenance)

| Source | Coverage | Status |
|--------|----------|--------|
| [Postcodes.io](https://postcodes.io) | UK postcodes → LSOA / MSOA / LAD spine | Live |
| [ONS NSPL](https://geoportal.statistics.gov.uk) | Geo spine, 1.8M postcodes, 43,916 LSOAs | Loaded into `geo_lookup` |
| [IMD 2025 / WIMD 2019 / SIMD 2020](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025) | Deprivation, England + Wales + Scotland | 85,280 store rows + percentiles |
| [HM Land Registry](https://landregistry.data.gov.uk) | Price Paid — E&W LSOA × month median + count + YoY | 24 months loaded, the first dynamic source |
| [Police.uk](https://data.police.uk) | Crime, LSOA × month × category | 1.2M rows × 36 months loaded |
| [OpenStreetMap](https://www.openstreetmap.org) | Amenities + transport | Live fetch (store migration pending) |
| [Environment Agency](https://environment.data.gov.uk) | Flood zones + active warnings | Live fetch |
| [Ofsted](https://www.gov.uk/government/organisations/ofsted) | School inspection ratings (England) | 19,770 schools indexed |

A monthly `timeseries:append` cron is the moat clock — every observation snapshot is immutable per `(geo_code, signal_key, observed_period)`. The Intelligence query plane reads against the store; the deterministic scoring engine reads via a shared fetch layer with store-backed read-through + live fallback.

## API surface (75-ish routes)

Full catalog with auth modes + dark-flag status in [`docs/SYSTEM-OVERVIEW.md` §6](docs/SYSTEM-OVERVIEW.md#6-complete-api-endpoint-catalog). Quick map:

- **Public** — `/health`, `/v1/meta`, `/widget`, `/track`
- **API key (4 products, dark-flagged behind `OGA_SIGNALS_API`)** — `/v1/area`, `/v1/areas`, `/v1/signals/:category`, `/v1/score`, `/v1/portfolios/*`, `/v1/query`, `/v1/peers`, `/v1/insights`, `/v1/forecast`
- **API key (Levers, always-on)** — 25 endpoints under `/v1/orgs/*` for org tenancy, bundles, presets, methodology, cohorts, members
- **API key (legacy + always-on)** — `/v1/report`, `/v1/batch`, `/v1/me`, `/me/reports`, `/v1/webhooks/*`
- **Session JWT (BFF bridge)** — `/usage`, `/settings/*`, `/keys/*`, `/report/*`, `/watchlist/*`, `/stripe/*`
- **Stripe sig** — `/stripe/webhook`
- **CRON_SECRET** — `/cron/rescore`
- **Public auth** — `/auth/register`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`

OpenAPI spec at [`apps/web/public/openapi.json`](apps/web/public/openapi.json), rendered by Scalar at [`/docs/api-reference`](https://www.onegoodarea.com/docs/api-reference). It deliberately omits the dark-flagged surfaces until they leave the flag (no-invented-claims rule).

## Engine architecture

```
Request
  → Geocode (Postcodes.io)
  → fetchAreaSources — store read-through, live fallback per source
  → Score 5 dimensions (frozen v2 engine, golden-tested)
  → applyWeights — preset or caller weights, deterministic aggregation
  → Confidence per dimension (HIGH/MEDIUM/LOW/NONE)
  → Stamp engine_version (org pin honoured per ADR 0031)
  → Response
```

The engine module is `apps/api/src/modules/reports/scoring-engine/v2.ts` — frozen and golden-tested (`scoring-engine.golden.test.ts.snap`). Any refactor that changes one number fails CI.

## Pricing (v2)

| Tier | Price/mo | Calls/mo |
|------|---------|---------|
| Sandbox | £0 | 35 |
| Starter | £49 | 1,500 |
| Build | £149 | 6,000 |
| Scale | £499 | 25,000 |
| Growth | £1,499 | 100,000 |
| Enterprise | from £4,999 | from 250,000 (negotiated) |

MCP add-on: £29/mo (free on Growth + Enterprise). Annual prepay 17% off on Build / Scale / Growth.

## Local development

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
npm install
```

Two apps, run from the workspace root:

```bash
npm run dev -w @onegoodarea/web        # Next on http://localhost:3000
npm run dev -w @onegoodarea/api        # Fastify on http://localhost:4000
```

Gates (the operating loop runs all three before any push):

```bash
npm test                               # all workspaces
npm run typecheck                      # tsc --noEmit across all workspaces
npm run lint                           # ESLint across apps + packages
```

Database migration (idempotent, safe to re-run):

```bash
npm run migrate -w @onegoodarea/api
```

Flag the Signals/Scores/Monitor/Intelligence surface on locally:

```bash
OGA_SIGNALS_API=true npm run dev -w @onegoodarea/api
OGA_SIGNALS_STORE_READ=true            # serve store-backed signals (deprivation/property/crime)
OGA_AI_PROVIDER=mock                   # deterministic AI for tests / local
```

Required env vars per app — see `apps/api/.env.example` + `apps/web/.env.example`.

Refresh + derive jobs (Pedro / ops only):

```bash
npm run refresh:deprivation -w @onegoodarea/api
npm run refresh:property -w @onegoodarea/api
npm run refresh:crime -w @onegoodarea/api <archive-path>
npm run timeseries:append -w @onegoodarea/api
```

## Test counts

- **apps/api**: 868+ tests across 94 files (Vitest)
- **apps/web**: 306 tests (Vitest + RTL)
- **contracts**: 57 tests (Vitest, Zod round-trip pinning)

CI green; main branch deployed.

## Status

- **4 of 4 products live** on the post-restructure surface (Signals + Scores + Monitor + Intelligence)
- **6 of 6 Intelligence surfaces shipped** — query plane, multi-signal compound `rank_areas`, derived signals (9 indicators), peers (k-NN), insights (anomaly), forecast, AI eval harness (baseline 92.9% planner accuracy on a 14-case curated corpus)
- **Signal store moat-clock running** — monthly `timeseries:append` cron; deprivation + property prices (24 months) + crime (36 months) all in store + served
- **Levers epic feature-complete** — orgs / members / bundles / presets / methodology pinning / peer cohorts / full RBAC / white-label + IP allowlist (commits AR-193..AR-200 on `feat/levers`, ADRs 0027-0034)
- **34 ADRs**, **75+ HTTP routes**, **monorepo split deployed on Render + Vercel** with auto-deploys from main
- **Engine v2 frozen** + golden-tested; methodology version pinned per response

See [`docs/SYSTEM-OVERVIEW.md`](docs/SYSTEM-OVERVIEW.md) for the full system map.

## License

All rights reserved. This is proprietary software. No license is granted to use, copy, modify, or distribute it. Commercial use requires written permission.
