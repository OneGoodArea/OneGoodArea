# AreaIQ

**Transparent, intent-driven area intelligence for the UK.**

Score any UK location using real government data. No guesswork, no paywalled PDFs, no vague ratings. Just structured intelligence that helps you make better decisions about where to live, invest, or open a business.

**Live at [area-iq.co.uk](https://www.area-iq.co.uk)**

---

## What it does

Enter a UK postcode or area name, choose your intent (moving, investing, business, or research), and get a fully scored report powered by 5 live government data sources.

Every score is deterministic. AI narrates the results but never generates the numbers.

## What makes it different

- **Deterministic scoring.** 16 scoring functions compute every number from real data using fixed formulas. Same postcode, same scores. Every time.
- **Intent-driven.** "Good for a family" and "good for a restaurant" are completely different questions. The engine weights dimensions differently based on your goal.
- **Context-aware.** A village with one school is well-served. A city with one school is not. The system auto-detects area type (urban, suburban, rural) and benchmarks accordingly.
- **Transparent.** Every score shows the data behind it. No black boxes.

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind 4, Geist fonts |
| Database | Neon Postgres |
| Auth | NextAuth v5 (Google OAuth, credentials) |
| Payments | Stripe (4-tier credit model) |
| AI | Claude Sonnet API (narration only) |
| Email | Resend (verification, report delivery) |
| Hosting | Vercel (CI/CD from main) |

## Data sources

| Source | Data |
|--------|------|
| [Postcodes.io](https://postcodes.io) | Geocoding, LSOA mapping, area classification |
| [Police.uk](https://data.police.uk) | Street-level crime data, categories, trends |
| [IMD 2025](https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025) | Deprivation indices across 33,755 LSOAs |
| [OpenStreetMap](https://www.openstreetmap.org) | Schools, transport, healthcare, shops, parks |
| [Environment Agency](https://environment.data.gov.uk) | Flood risk zones and active warnings |

All data is fetched in real time. No caching, no stale datasets.

## Architecture

```
User input
  → Geocode (Postcodes.io)
  → Fetch data in parallel (5 APIs)
  → Classify area type (urban / suburban / rural)
  → Compute scores (16 deterministic functions, contextual benchmarks)
  → AI narrates the pre-computed scores (Claude Sonnet)
  → Scored report with full transparency
```

The scoring engine (`src/lib/scoring-engine.ts`) contains 16 scoring functions, 4 intent compositions, and 3 area-type benchmark profiles. Scores are enforced server-side after AI generation, so the AI can never override computed values.

## Features

- **Report generation** with real-time data from 5 government APIs
- **Deterministic scoring engine** with 16 functions and 4 intent profiles
- **Area-type benchmarks** (urban, suburban, rural) to eliminate bias
- **Side-by-side comparison** of two areas
- **PDF export** with branded dark design
- **Email report delivery** after generation
- **Social sharing** (WhatsApp, LinkedIn, X, copy link)
- **REST API** with Bearer auth, rate limiting, API key management
- **API usage dashboard** with 30-day request chart
- **Stripe payments** with 4-tier credit-based pricing
- **Admin analytics** with conversion funnels and MRR tracking
- **GDPR-compliant auth** with Google OAuth and email verification
- **Input validation** and sanitisation against injection
- **Error boundaries** with branded terminal-style error pages
- **SEO** with sitemap, robots.txt, JSON-LD structured data, dynamic OG images
- **Onboarding flow** for new users with suggested postcodes

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── report/                     # Report generator + SSR report pages
│   ├── dashboard/                  # User report history
│   ├── compare/                    # Side-by-side area comparison
│   ├── api-usage/                  # API usage dashboard (Business)
│   ├── admin/                      # Admin analytics
│   ├── pricing/                    # Pricing page
│   ├── docs/                       # API documentation
│   ├── methodology/                # Scoring methodology
│   ├── about/                      # About page
│   ├── settings/                   # User settings
│   ├── sign-in/ & sign-up/        # Auth pages
│   ├── terms/ & privacy/          # Legal pages
│   ├── api/
│   │   ├── report/                 # Report generation endpoint
│   │   ├── v1/report/              # Public REST API
│   │   ├── keys/                   # API key management
│   │   ├── stripe/                 # Checkout, webhook, portal, cancel
│   │   ├── settings/               # Password, delete account, subscription
│   │   └── auth/                   # NextAuth handler
│   ├── error.tsx                   # Error boundary
│   ├── not-found.tsx               # Custom 404
│   └── globals.css                 # Design system
├── lib/
│   ├── scoring-engine.ts           # 16 deterministic scoring functions
│   ├── generate-report.ts          # Data fetch → score → AI narrate
│   ├── data-sources/               # Postcodes, Police, IMD, OSM, Flood
│   ├── auth.ts                     # NextAuth config
│   ├── db.ts                       # Neon Postgres client
│   ├── stripe.ts                   # Stripe client + plan config
│   ├── usage.ts                    # Usage tracking
│   ├── email.ts                    # Resend email templates
│   ├── rate-limit.ts               # Sliding window rate limiter
│   ├── validation.ts               # Input sanitisation
│   ├── pdf-export.ts               # Programmatic PDF generation
│   ├── api-keys.ts                 # API key CRUD
│   └── activity.ts                 # Event tracking + analytics
└── components/
    ├── navbar.tsx                   # Shared navbar
    ├── footer.tsx                   # Shared footer
    ├── report-view.tsx              # Report display component
    ├── user-button.tsx              # Auth dropdown
    └── toast.tsx                    # Toast notification system
```

## Local development

```bash
git clone https://github.com/ptengelmann/AreaIQ-.git
cd AreaIQ-
npm install
```

Create `.env.local`:

```env
# Auth
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

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

# App
NEXTAUTH_URL=http://localhost:3000
```

```bash
npm run dev
```

## Licence

All rights reserved. This codebase is publicly visible for portfolio and reference purposes. It is not open source and may not be copied, modified, or distributed without written permission.
