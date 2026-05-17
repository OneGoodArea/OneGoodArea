[![CI](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml/badge.svg)](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/OneGoodArea/OneGoodArea?style=plastic)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fwww.onegoodarea.com&style=plastic)
![GitHub repo size](https://img.shields.io/github/repo-size/OneGoodArea/OneGoodArea)
![Vercel](https://vercelbadge.vercel.app/api/OneGoodArea/OneGoodArea)
# OneGoodArea

**The deterministic UK location intelligence layer.**

One scoring engine. Four intents (origination, site selection, investment, reference). Five weighted dimensions per intent. Seven authoritative UK public datasets. Source-attributed reasoning, version-pinned methodology, confidence reported per dimension. Built for regulated buyers who need a number they can ship to a model risk register.

**Live at [onegoodarea.com](https://www.onegoodarea.com)** · API ref: [`/openapi.json`](https://www.onegoodarea.com/openapi.json) · Methodology: [`/methodology`](https://www.onegoodarea.com/methodology)

---

## Category

Intent-driven UK area intelligence. Same engine, four reweighted models — origination scoring is not site selection is not investment is not reference. The dimensions are constant; the weights and reasoning change per intent. The methodology document tells you exactly why.

## What makes it different

- **Intent-driven scoring.** Most location intelligence vendors ship one score. We ship four reweighted models of the same engine, one per decision type. The composition is documented; the weights are public.
- **Deterministic numbers.** Scoring formulas are fixed. Same postcode, same intent, same scores. AI narrates the result; it cannot override the maths. Server-side score lock after AI response.
- **Confidence per dimension.** Every dimension reports HIGH / MEDIUM / LOW / NONE confidence based on data freshness and completeness. Insurance underwriters can't buy a black-box score; this is the answer.
- **Version-pinned methodology.** Every report stamps the engine version. Customers can pin to a specific version for procurement / FCA model risk register compliance.
- **Source-attributed reasoning.** Every dimension cites the upstream public dataset that drove the number. No proprietary indices, no opaque composites.
- **API-first.** OpenAPI 3.0 spec, interactive reference, MCP server for AI workflows.

## Audiences

- **Mortgage lenders** — origination scoring, portfolio risk enrichment
- **Property insurers** — area risk per postcode (flood, crime, environment)
- **PropTech platforms** — embed kit, white-label scoring inside their products
- **Retail and CRE site selection** — programmatic location evaluation at scale

Consumer surfaces (blog, area pages, /report) exist as an awareness funnel only.

## Tech stack

| Layer        | Tech |
|--------------|------|
| Framework    | Next.js 16, React 19, TypeScript |
| Styling      | Tailwind 4, design tokens in `globals.css` |
| Typography   | Fraunces (display), Inter (body), Geist Mono (labels) |
| Database     | Neon Postgres |
| Auth         | NextAuth v5 (Google OAuth + Credentials, PBKDF2-SHA256 password hashing) |
| Payments     | Stripe (idempotent webhooks, 6-tier pricing + add-on architecture) |
| AI narration | Server-side LLM call, narration only — never alters scoring values |
| Email        | Resend (transactional, branded templates) |
| Errors       | Sentry (client + server + edge runtimes) |
| Observability| `/api/health`, structured logger, request-scoped trace IDs |
| CI/CD        | GitHub Actions (lint + typecheck + tests), Vercel auto-deploy from `main` |

## Data sources

| Source | Coverage |
|--------|----------|
| [Postcodes.io](https://postcodes.io) | Geocoding, LSOA mapping, urban/suburban/rural classification |
| [Police.uk](https://data.police.uk) | Street-level crime, 12 months rolling, categorised |
| [IMD 2025 / WIMD 2019 / SIMD 2020](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025) | Deprivation indices, 33,755 LSOAs across England, Wales, Scotland |
| [OpenStreetMap (Overpass)](https://www.openstreetmap.org) | Schools, transport, healthcare, retail, parks, amenities |
| [Environment Agency](https://environment.data.gov.uk) | Flood risk zones and active warnings |
| [HM Land Registry](https://landregistry.data.gov.uk) | Price Paid SPARQL — real sold prices, YoY change, transaction volume |
| [Ofsted](https://www.gov.uk/government/organisations/ofsted) | School inspection ratings, 19,770 English schools, quality-weighted |

Estyn (Wales) and Education Scotland integration on roadmap.

Reports cached server-side for 24 hours per `area:intent` pair. Cache hits don't count against API quota.

## Engine architecture

```
Request
  → Geocode (Postcodes.io)
  → Parallel fetch from 7 data sources
  → Classify area type (urban / suburban / rural)
  → Score 5 dimensions for the chosen intent (deterministic, weights sum to 100)
  → Compute confidence per dimension (HIGH / MEDIUM / LOW / NONE)
  → Aggregate weighted score + report-level confidence
  → Narrate (numbers passed in, never recomputed)
  → Server-side score enforcement (AI cannot drift the numbers)
  → Stamp engine_version + cache 24h
  → Return JSON / render web / email / PDF
```

Scoring lives in `src/lib/scoring-engine.ts` (16 functions, 4 intent compositions). Methodology versions registered in `src/lib/methodology-versions.ts`. Current engine version: `2.0.0`.

## Surfaces

**Public API**
- REST: `POST /api/v1/report` (Bearer auth, OpenAPI 3.0 documented at `/openapi.json`)
- Interactive reference: `/docs/api-reference` (Scalar embed)
- Widget: `GET /api/widget` (CORS, cache-only, 60/hr per origin)
- Entitlement check: `GET /api/v1/me`
- Time-series re-scoring cron: `/api/cron/rescore`

**MCP server** (Model Context Protocol)
- Separate npm package: `@onegoodarea/mcp-server` (`mcp/` directory)
- Four tools: `score_postcode`, `compare_postcodes`, `methodology_for`, `engine_version`
- For Claude Desktop, Cursor, and any MCP-compatible client

---

## Development & Local Test Environment

OneGoodArea provides a fully containerized local test environment that mimics the production stack (including Neon Postgres, AI models, and email services) without incurring costs or requiring external API keys (except for Stripe Test Mode).

### **Quick Start**

The project uses a **Full-Lifecycle Makefile** as the primary entry point.

1.  **Start the environment:**
    ```bash
    make up
    ```
    *This will build the containers, initialize the database schema, and start all mock services.*

2.  **Access the services:**
    - **App:** [http://localhost:3000](http://localhost:3000)
    - **Email Mock (MailHog):** [http://localhost:8025](http://localhost:8025)
    - **API Mock (Prism):** [http://localhost:4010](http://localhost:4010)
    - **Database Proxy (Neon):** localhost:55433

### **Common Commands**

| Command | Description |
| :--- | :--- |
| `make help` | Show all available targets. |
| `make up` | Start containers and mocks. |
| `make down` | Stop all containers. |
| `make logs` | Tail container logs. |
| `make reset` | Wipe the database and re-initialize schema. |
| `make ci` | Run lint, typecheck, and tests (same as GitHub Actions). |
| `make test-api` | Run functional API tests against local environment. |

### **Mocking Strategy**
- **Database:** A local Postgres container with a `database-proxy` that mimics the Neon HTTP SQL API.
- **AI:** Calls to Anthropic are redirected to a local `ai-mock` service.
- **Email:** Resend calls are intercepted and forwarded to MailHog.
- **External APIs:** Calls to `postcodes.io` are mocked via Prism.

---
- Install docs at `/docs/mcp`

**Web product**
- Generator + permanent SSR report pages
- Side-by-side area comparison
- PDF export, email delivery, watchlist + CSV export
- 32 programmatic SEO area pages
- Editorial blog with JSON-LD

**Customer dashboard**
- Report history, watchlist, API key management
- API usage charts with 30-day rolling window
- In-app billing surface at `/dashboard/billing` (plan selection, MCP add-on, current plan strip)

**Admin**
- Traffic analytics (pageviews, devices, countries, referrers)
- Conversion funnels, MRR tracking, activity feed

## Pricing (v2)

| Tier       | Price/mo | Calls/mo | Effective £/call |
|------------|----------|----------|------------------|
| Sandbox    | £0       | 35       | —                |
| Starter    | £49      | 1,500    | £0.033           |
| Build      | £149     | 6,000    | £0.025           |
| Scale      | £499     | 25,000   | £0.020           |
| Growth     | £1,499   | 100,000  | £0.015           |
| Enterprise | from £4,999 | from 250,000 | from £0.020 (negotiated) |

MCP server access: £29/mo add-on (free on Growth + Enterprise). Annual prepay 17% off on Build / Scale / Growth.

## Local development

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

Required env vars (see `.env.example` for full list):

```env
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
```

```bash
npm test                # 224 tests across scoring engine, validation, stripe-types, crypto, config, id, methodology versions, MCP server, OpenAPI spec
npx tsc --noEmit        # typecheck
npx next build          # production build
```

## Repository structure

```
src/
├── app/
│   ├── page.tsx                    Marketing landing (renders design-v2 client)
│   ├── layout.tsx                  Root layout, fonts, theme-restore script
│   ├── design-v2/                  Marketing + app design system (canonical source for nav, footer, shared components)
│   │   └── _shared/                Wordmark, Mark, Nav, Footer, AppShell, AuthShell, Icons, LoadingStates
│   ├── report/                     Generator + SSR report pages
│   ├── dashboard/                  User dashboard
│   │   └── billing/                In-app billing surface
│   ├── compare/                    Side-by-side area comparison
│   ├── api-usage/                  API key management
│   ├── admin/                      Admin analytics
│   ├── pricing/                    Pricing
│   ├── docs/                       API documentation + MCP install + interactive reference
│   ├── methodology/                Scoring methodology (procurement artifact)
│   ├── about/                      About
│   ├── blog/                       Editorial blog
│   ├── area/[slug]/                Programmatic SEO area pages
│   ├── changelog/                  Release history
│   ├── help/                       FAQ + contact
│   ├── settings/                   Account + subscription
│   ├── sign-in/ & sign-up/         NextAuth catch-all routes
│   ├── forgot-password/            Password reset flow
│   ├── verify/                     Email verification
│   ├── terms/ & privacy/           Legal
│   ├── api/
│   │   ├── v1/                     Public REST API (`/report`, `/me`)
│   │   ├── widget/                 Embeddable widget endpoint (cache-only)
│   │   ├── cron/rescore/           Time-series re-scoring (Vercel Cron)
│   │   ├── stripe/                 Checkout, addon-checkout, webhook, portal, cancel
│   │   ├── keys/                   API key CRUD
│   │   ├── auth/                   NextAuth handler + register + verification
│   │   ├── settings/               Password, delete, subscription
│   │   ├── report/, watchlist/, usage/, track/, health/
│   ├── opengraph-image.tsx, icon.tsx
│   └── globals.css
├── lib/
│   ├── scoring-engine.ts           16 scoring functions, 4 intent compositions, confidence rubric
│   ├── generate-report.ts          Fetch → score → narrate → enforce → stamp pipeline
│   ├── methodology-versions.ts     Typed registry of engine releases (current: v2.0.0)
│   ├── data-sources/               Postcodes, Police, Deprivation, OSM, Flood, Land Registry, Ofsted
│   ├── top-postcodes.ts            Seed list for time-series cron
│   ├── auth.ts, crypto.ts, with-auth.ts
│   ├── stripe.ts, stripe-types.ts  V1 legacy + V2 active plans, MCP add-on
│   ├── usage.ts, api-keys.ts       Quota + entitlement helpers
│   ├── email.ts, pdf-export.ts     Branded transactional outputs
│   ├── db.ts, db-schema.ts, db-types.ts
│   ├── rate-limit.ts, validation.ts, errors.ts, id.ts, logger.ts, config.ts
│   ├── activity.ts, report-cache.ts, rag.ts
└── instrumentation.ts              Sentry init

mcp/                                @onegoodarea/mcp-server package (separate tsconfig)
scripts/                            Stripe utilities, data seeding, cron
public/openapi.json                 OpenAPI 3.0 spec
```

## Status

- Engine v2.0.0 LIVE — confidence per dimension + version stamping on every report
- Pricing v2 LIVE on Stripe — 6 tiers + MCP add-on
- Design system shipped — design-v2 promoted to whole-site production
- OpenAPI 3.0 spec served at `/openapi.json` with Scalar interactive reference
- MCP server v0.2.0 built and tested, npm publish pending
- 224 tests across two packages, CI green

## License

See [`LICENSE`](./LICENSE). Source-available for portfolio and audit reference. Not open source. Commercial use requires written permission.
