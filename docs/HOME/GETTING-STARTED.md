# Getting started

5-minute orientation for a new contributor or evaluator.

## What is OneGoodArea

The data and intelligence layer underneath UK property workflows. Four composable products on a persisted signal store + a typed AI query plane:

1. **Signals** — per-LSOA values with normalized scores, percentiles, and source attribution. The atomic primitive.
2. **Scores** — deterministic composite scoring with frozen, golden-tested engine. Preset weights or caller-supplied.
3. **Monitor** — portfolios + bulk enrichment + change detection via time-series moat → `signal.changed` webhooks.
4. **Intelligence** — typed query plane (programmatic OR NL-planned), peers k-NN, anomaly screening, linear projection. Measured 92.9% planner accuracy.

Plus **Levers** cross-cutting: per-org custom bundles, scoring presets, methodology pinning, peer cohorts, RBAC, white-label, IP allowlist.

## Why it's different

- **Deterministic numbers** — same input, same output, every time. AI narrates; never overrides
- **Confidence per signal + per dimension** — HIGH/MEDIUM/LOW/NONE based on data freshness
- **Version-pinned methodology** — `engine_version` stamped on every response; orgs can pin a specific version for their model risk register
- **Source-attributed** — every value cites the upstream public dataset
- **Audit-replayable AI** — every Intelligence response echoes the executed plan + plan_source

## Audiences

- **PropTech embeds** — white-label Signals + Scores
- **InsureTech MGAs** — underwriting models with org-saved presets + methodology pinning
- **Mortgage lenders** — origination scoring + portfolio risk enrichment via Monitor
- **Retail / CRE site selection** — cross-area ranking via `/v1/areas` + peer cohorts

## Stack

- **Backend:** Fastify (Node 22 + TypeScript) deployed to Render via Docker
- **Frontend:** Next.js 16 + React 19 + Tailwind 4 on Vercel
- **Database:** Neon Postgres (the signal store + tenancy + everything else)
- **Auth:** NextAuth v5 on apps/web (Google + credentials) + HS256 JWT bridge to apps/api
- **Payments:** Stripe — 6 tiers + MCP add-on
- **AI:** Anthropic Claude — planner + narrator (never sets numbers)
- **Errors:** Sentry across web + api + edge

## What to read next

| If you want to… | Read |
|---|---|
| Run the apps locally | [`OPERATIONS/LOCAL-SETUP.md`](../OPERATIONS/LOCAL-SETUP.md) |
| Understand the full system | [`ARCHITECTURE/SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) |
| Call the API | [`API-REFERENCE/EXAMPLES.md`](../API-REFERENCE/EXAMPLES.md) |
| Contribute code | [`/CLAUDE.md`](../../CLAUDE.md) + [`ENGINEERING/CODE-STYLE.md`](../ENGINEERING/CODE-STYLE.md) |
| Look up a term | [`GLOSSARY.md`](./GLOSSARY.md) |
| Find an answer fast | [`INDEX.md`](./INDEX.md) |

## Live

- **Site:** [onegoodarea.com](https://www.onegoodarea.com)
- **API:** `https://onegoodarea.onrender.com`
- **Interactive API ref:** [/docs/api-reference](https://www.onegoodarea.com/docs/api-reference)
- **OpenAPI spec:** [/openapi.json](https://www.onegoodarea.com/openapi.json)
