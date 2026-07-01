# OneGoodArea — System Overview

**OneGoodArea is the data and intelligence layer underneath UK property workflows: deterministic signals, configurable scoring, portfolio monitoring, and a typed AI query plane over monthly area time-series.**

Four composable products — **Signals**, **Scores**, **Monitor**, **Intelligence** — over a persisted signal store at LSOA grain covering England, Wales, and Scotland. Backend (`apps/api`) is Fastify on Render. Frontend (`apps/web`) is Next.js on Vercel. AI planner: **92.9% measured accuracy**. AI never sets the numbers; the DB does.

---

## Where we came from vs where we are

**Before:** monolith Next.js, no persisted store, no cross-area query, no time-series, no tenancy. AI = narrative paragraph.

**Today:** monorepo (`apps/web` + `apps/api` + `packages/contracts`), persisted signal store (7 tables, 1.8M postcodes, 43k LSOAs), cross-area query, monthly time-series (the moat clock), 9 derived signals, typed query plane with measured accuracy.

Consumer site still uses `apps/web`'s own DB path. New API infrastructure behind `OGA_SIGNALS_API` dark flag. BFF cutover deferred.

---

## Architecture — read in this order

1. [`PRODUCTS.md`](./PRODUCTS.md) — the 4 products and what they do
2. [`SIGNAL-STORE.md`](./SIGNAL-STORE.md) — the data layer (tables, derived signals, monthly cron)
3. [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md) — where things run (Vercel, Render, Neon)
4. [`CODE-ORG.md`](./CODE-ORG.md) — code structure + key entry points
5. [`PRINCIPLES.md`](./PRINCIPLES.md) — the non-negotiable rules

## Deep dives

- [`DATA-LAYER.md`](./DATA-LAYER.md) — schema rationale
- [`DATA-SOURCES.md`](./DATA-SOURCES.md) — ingest strategy per source
- [`QUERY-PLANE.md`](./QUERY-PLANE.md) — Intelligence layer grammar
- [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) — deploy topology
- [`CONTAINERS.md`](./CONTAINERS.md) — container workflow

## Full endpoint catalog

76 routes across all products: see [`API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`](../API-REFERENCE/ENDPOINTS-BY-PRODUCT.md)

## Quick test

```bash
KEY="oga_..."
curl -H "Authorization: Bearer $KEY" "https://onegoodarea.onrender.com/v1/area?postcode=M1 1AE"
```

Mint a key: `node scripts/mint-ephemeral-key.mjs`. More examples: [`API-REFERENCE/EXAMPLES.md`](../API-REFERENCE/EXAMPLES.md).

## ICP

PropTech embeds → InsureTech/MGAs → Mid-tier lenders → Retail/CRE → Public sector.

Pricing: Sandbox £0 → Starter £49 → Build £149 → Scale £499 → Growth £1,499 → Enterprise £4,999+.

## Decisions

[`DECISIONS/`](../DECISIONS/) — 37 ADRs. [`DECISIONS/DECISION-LOG.md`](../DECISIONS/DECISION-LOG.md) — chronological timeline.

---

*Baseline: 2026-05-27. Commit `369c7b9` via PR #60.*
