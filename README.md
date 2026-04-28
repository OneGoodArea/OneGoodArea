[![CI](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml/badge.svg)](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml)
![GitHub commits since latest release (branch)](https://img.shields.io/github/commits-since/:user/:repo/latest/:branch)


# OneGoodArea

**An intelligence report for every UK postcode.**

Type a place. Pick why you're looking. Seven public datasets do the rest. OneGoodArea scores 42,640 UK neighbourhoods across four intents (moving home, opening a business, property investing, market research) and renders the full picture in a single editorial report.

**Live at [area-iq.co.uk](https://www.area-iq.co.uk)**

---

## What it does

Enter a UK postcode or area name, pick your intent, and get a fully scored report sourced from seven live UK datasets. Every dimension is computed from real numbers using fixed formulas, then narrated by the engine. The same inputs always produce the same scores.

## What makes it different

- **Intent-driven scoring.** "Good for raising a family" and "good for opening a coffee shop" weight different dimensions of the same area. Four intents, five dimensions each, weights summing to 100.
- **Reproducible numbers.** Scoring formulas are deterministic. Same postcode, same intent, same scores. Narrative prose varies; the maths does not.
- **Context-aware benchmarks.** A village with one school is well served. A city with one school is not. Reports auto-classify the area as urban, suburban, or rural and benchmark against the right peer group.
- **Transparent.** Every dimension shows the data, the source, and the freshness window behind it. No black boxes, no proprietary indices, no vague star ratings.

## Tech stack

| Layer        | Tech |
|--------------|------|
| Framework    | Next.js 16, React 19, TypeScript |
| Styling      | Tailwind 4, design tokens scoped to `.aiq` wrapper, `globals.css` |
| Typography   | Fraunces (display), Inter (body), Geist Mono (labels) |
| Database     | Neon Postgres |
| Auth         | NextAuth v5 (Google OAuth + credentials, PBKDF2-SHA256) |
| Payments     | Stripe (consumer plans + API plans, webhook idempotency) |
| AI           | Anthropic Claude (narration only, never scoring) |
| Email        | Resend (verification, report delivery, password reset) |
| Errors       | Sentry (client + server + edge) |
| CI/CD        | GitHub Actions, Vercel auto-deploy from `main` |

## Data sources

| Source | Coverage |
|--------|----------|
| [Postcodes.io](https://postcodes.io) | Geocoding, LSOA mapping, area classification |
| [Police.uk](https://data.police.uk) | Street-level crime, 12 months rolling, by category |
| [IMD 2025 / WIMD 2019 / SIMD 2020](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025) | Deprivation indices, 33,755 LSOAs (England, Wales, Scotland) |
| [OpenStreetMap (Overpass)](https://www.openstreetmap.org) | Schools, transport, healthcare, retail, parks, amenities |
| [Environment Agency](https://environment.data.gov.uk) | Flood risk zones and active warnings |
| [HM Land Registry](https://landregistry.data.gov.uk) | Price Paid SPARQL, real sold prices, YoY change, transaction volume |
| [Ofsted](https://www.gov.uk/government/organisations/ofsted) | School inspection ratings, 19,770 English schools, quality-weighted |

Estyn (Wales) and Education Scotland integration planned.

Reports are cached server-side for 24 hours per `area:intent` pair; identical requests return the same report without re-fetching upstream APIs.

## Architecture

```
User input
  → Geocode (Postcodes.io)
  → Fetch in parallel from 7 sources
  → Classify area type (urban / suburban / rural)
  → Score 5 dimensions for the chosen intent (deterministic, weights sum to 100)
  → Narrate with Claude (numbers passed in, never recomputed)
  → Cache for 24h, persist to Postgres
  → Render report (web), email (Resend), or JSON (REST API)
```

Scoring lives in `src/lib/scoring-engine.ts`. Five scoring functions per intent across four intents, plus three area-type benchmark profiles. Scores are enforced server-side after AI generation, so the model can never override computed values.

## Features

**Reports**
- Four intents (moving, business, investing, research), five weighted dimensions each
- Property Market panel (median price, YoY, transaction volume, price by property type)
- Schools panel (Ofsted distribution + top-rated schools, quality-weighted)
- Side-by-side area comparison
- PDF export (branded layout)
- Email delivery via Resend
- Watchlist + CSV export
- Social sharing (WhatsApp, LinkedIn, X, copy link)
- Dynamic OG images per report and per area page

**Public surfaces**
- 32 programmatic SEO area pages with real engine output
- Editorial blog with JSON-LD
- Methodology, changelog, help, business, pricing, docs, about

**Developer platform**
- REST API with Bearer auth (`aiq_<48-hex>`), PBKDF2-hashed keys
- Embeddable widget (`/api/widget`, cache-only, CORS, rate-limited per origin)
- API usage dashboard with 30-day chart
- Interactive playground in `/docs`

**Account + billing**
- NextAuth v5 (Google OAuth + credentials)
- Email verification, password reset, account deletion
- Stripe checkout, webhook, customer portal, plan changes with proration
- Adaptive CTAs based on plan state

**Admin**
- Traffic analytics (pageviews, devices, countries, referrers)
- Conversion funnels, MRR tracking, activity feed

**Platform**
- Dark / light theme with `data-theme` token swap, persistent via localStorage
- 24h report cache (Postgres `report_cache`)
- Sliding-window rate limiter (Neon-backed)
- Sentry error monitoring
- GitHub Actions CI (lint, typecheck, build, test)
- Health endpoint at `/api/health`

## Project structure

```
src/
├── app/
│   ├── page.tsx                    Landing page
│   ├── layout.tsx                  Root layout, fonts, theme-restore script
│   ├── report/                     Generator + SSR report pages
│   ├── dashboard/                  User report history
│   ├── compare/                    Side-by-side area comparison
│   ├── api-usage/                  API key management + usage charts
│   ├── admin/                      Admin analytics
│   ├── pricing/                    Pricing
│   ├── docs/                       API documentation
│   ├── methodology/                Scoring methodology
│   ├── about/                      About
│   ├── blog/                       Blog index + post template
│   ├── area/[slug]/                Programmatic SEO area pages
│   ├── changelog/                  Release history
│   ├── help/                       FAQ + contact
│   ├── settings/                   Account + subscription
│   ├── sign-in/ & sign-up/         Auth (NextAuth v5 catch-all routes)
│   ├── forgot-password/            Password reset flow
│   ├── verify/                     Email verification
│   ├── terms/ & privacy/           Legal
│   ├── design-v2/                  Internal preview namespace (noindex, rollback)
│   ├── design-v2/_shared/          Shared marketing components (nav, footer, styles, icons)
│   ├── api/
│   │   ├── report/                 Report generation
│   │   ├── v1/report/              Public REST API
│   │   ├── widget/                 Embeddable widget endpoint (cache-only)
│   │   ├── keys/                   API key CRUD
│   │   ├── stripe/                 Checkout, webhook, portal, cancel
│   │   ├── settings/               Password, delete, subscription
│   │   ├── watchlist/              Watchlist CRUD
│   │   ├── auth/                   NextAuth handler
│   │   ├── track/                  Pageview tracking
│   │   └── health/                 Health probe
│   ├── error.tsx                   Error boundary
│   ├── not-found.tsx               404
│   ├── opengraph-image.tsx         Default OG
│   ├── icon.tsx                    Favicon (concentric rings + chartreuse pin)
│   └── globals.css                 Design tokens (loaded in head, no FOUC)
├── lib/
│   ├── scoring-engine.ts           Scoring functions, intent compositions, benchmarks
│   ├── generate-report.ts          Fetch → score → narrate pipeline
│   ├── data-sources/               Postcodes, Police, Deprivation, OSM, Flood, Land Registry, Ofsted
│   ├── auth.ts                     NextAuth config
│   ├── db.ts                       Neon client
│   ├── db-schema.ts                Table definitions, ensureTable guards
│   ├── db-types.ts                 Typed row helpers
│   ├── stripe.ts                   Stripe client, plan config
│   ├── stripe-types.ts             Type-safe casts
│   ├── crypto.ts                   PBKDF2-SHA256 (Edge-compatible)
│   ├── config.ts                   Centralised env config
│   ├── logger.ts                   Structured logger
│   ├── with-auth.ts                Auth wrapper for API routes
│   ├── errors.ts                   AppError + isAppError
│   ├── id.ts                       generateId helper
│   ├── usage.ts                    Usage + quota tracking
│   ├── email.ts                    Resend templates (OneGoodArea brand)
│   ├── rate-limit.ts               Sliding window (Neon-backed)
│   ├── validation.ts               Input sanitisation
│   ├── pdf-export.ts               Programmatic PDF
│   ├── api-keys.ts                 API key CRUD
│   ├── activity.ts                 Event tracking
│   └── rag.ts                      Score → RAG band mapping
├── components/
│   ├── full-navbar.tsx             Pre-rebrand navbar (kept for legacy refs)
│   ├── footer.tsx                  Pre-rebrand footer (kept for legacy refs)
│   ├── score-ring.tsx              Shared primitives
│   ├── stat-card.tsx
│   ├── terminal-card.tsx
│   ├── pageview-tracker.tsx
│   └── (etc.)
└── instrumentation.ts              Sentry init
```

The marketing surface (nav, footer, design tokens, icon set) lives in `src/app/design-v2/_shared/`. Every public route renders a v2 client; the bare `/design-v2/*` preview routes are kept noindex as a rollback path.

## Local development

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
npm install
```

Create `.env.local`:

```env
# Auth
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=

# AI
ANTHROPIC_API_KEY=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=

# Errors (optional in dev)
NEXT_PUBLIC_SENTRY_DSN=
```

```bash
npm run dev
```

Tests: `npm test` (Vitest, 60+ unit + integration tests across scoring engine, validation, stripe-types, crypto, config, id).

Typecheck: `npx tsc --noEmit`.

Build: `npx next build`.

## Licence

All rights reserved. This codebase is publicly visible for portfolio and reference purposes. It is not open source and may not be copied, modified, or distributed without written permission.
