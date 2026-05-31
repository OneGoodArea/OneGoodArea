[![CI](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml/badge.svg)](https://github.com/OneGoodArea/OneGoodArea/actions/workflows/ci.yml)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/OneGoodArea/OneGoodArea?style=plastic)
![Website](https://img.shields.io/website?url=https%3A%2F%2Fwww.onegoodarea.com&style=plastic)
![GitHub repo size](https://img.shields.io/github/repo-size/OneGoodArea/OneGoodArea)
[![SafeSkill 50/100](https://img.shields.io/badge/SafeSkill-50%2F100_Use%20with%20Caution-orange)](https://safeskill.dev/scan/onegoodarea-onegoodarea)
![Vercel](https://vercelbadge.vercel.app/api/OneGoodArea/OneGoodArea)

# OneGoodArea

**The data and intelligence layer underneath UK property workflows.**

Deterministic signals · configurable scoring · portfolio monitoring · a typed AI query plane over monthly area time-series. Built for regulated buyers — mortgage lenders, insurers, MGAs, PropTech embeds — who need numbers they can ship to a model risk register.

**Live:** [onegoodarea.com](https://www.onegoodarea.com) · **API:** `https://onegoodarea.onrender.com` · **Interactive API ref:** [/docs/api-reference](https://www.onegoodarea.com/docs/api-reference)

---

## Start here

📖 **All documentation lives in [`docs/`](./docs/)**. The navigation backbone:

- **[`docs/README.md`](./docs/README.md)** — audience-based door (developer / operator / B2B / decision-history / search)
- **[`docs/GETTING-STARTED.md`](./docs/GETTING-STARTED.md)** — 5-minute orientation
- **[`docs/INDEX.md`](./docs/INDEX.md)** — "How do I X?" → which doc to read
- **[`docs/GLOSSARY.md`](./docs/GLOSSARY.md)** — domain terms (LSOA, NSPL, IMD, Levers, …)

## Run locally

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
npm install
npm run dev -w @onegoodarea/web       # http://localhost:3000
npm run dev -w @onegoodarea/api       # http://localhost:4000
```

Full setup + env vars in [`docs/OPERATIONS/LOCAL-SETUP.md`](./docs/OPERATIONS/LOCAL-SETUP.md).

## What's inside

| Path | What's there |
|---|---|
| `apps/web/` | Next.js app (Vercel) — consumer site + dashboard |
| `apps/api/` | Fastify backend (Render) — the four products + Levers (~76 routes) |
| `packages/contracts/` | Zod schemas + types shared by web + api |
| `docs/` | All architecture / ops / API ref / decisions documentation |
| `plan/` | Implementation plans (006 test/prod separation, 007 docs reorg, 008 prod parity, …) |
| `.github/` | CI workflows, signal-refresh cron |

## Stack

Fastify + Node 22 + TypeScript · Next.js 16 + React 19 + Tailwind 4 · Neon Postgres · Anthropic Claude (planner + narrator, deterministic floor) · Stripe (6 tiers + MCP add-on) · NextAuth v5 + HS256 JWT bridge · Render (api) + Vercel (web) · Sentry · GitHub Actions

Test counts: apps/api 868 / apps/web 306 + 8 skipped / contracts 57 — see [`docs/ENGINEERING/TESTING-STRATEGY.md`](./docs/ENGINEERING/TESTING-STRATEGY.md).

## Status

**4 of 4 products live** + **6 of 6 Intelligence surfaces shipped** (baseline 92.9% planner accuracy on a 14-case curated corpus) + **Levers epic feature-complete** (8 commits AR-193..AR-200, 8 ADRs 0027-0034) + **34 ADRs total**. See [`docs/DECISIONS/DECISION-LOG.md`](./docs/DECISIONS/DECISION-LOG.md) for the full timeline.

## License

All rights reserved. Proprietary software. No license is granted to use, copy, modify, or distribute. Commercial use requires written permission.
