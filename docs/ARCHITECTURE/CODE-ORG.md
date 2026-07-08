# Code Organisation

```
/
├── apps/
│   ├── web/                  Next.js 16 consumer app (Vercel)
│   │   ├── src/app/          App-router routes
│   │   ├── src/components/   Shared React components
│   │   └── src/lib/          DB, auth, stripe, helpers (DIRECT DB access today)
│   └── api/                  Fastify backend (Render)
│       ├── src/server.ts     Entrypoint
│       ├── src/app.ts        App bootstrap + registers the route modules
│       ├── src/routes/       Per-domain route handlers (extracted AR-286)
│       ├── src/infrastructure/
│       │   ├── config/       env config + getConfig()
│       │   ├── db/           Neon client + schema migrations registry
│       │   └── ...           email, errors, idempotency, rate-limit, validation
│       └── src/modules/
│           ├── engine/            scoring-engine/v2 (frozen) + methodology + version
│           ├── intelligence/      /v1/query: planner + executor + eval harness
│           ├── monitor/           portfolios + change detection
│           ├── scoring/           preset + custom-weight scoring (ADR 0008)
│           ├── signals/           THE SIGNAL LAYER
│           │   ├── data-sources/          live sources
│           │   ├── store-reader.ts        Read normalised values from the store
│           │   ├── peers.ts               /v1/peers + findPeers
│           │   ├── insights.ts            /v1/insights + findInsights
│           │   ├── forecast.ts            /v1/forecast + runForecast
│           │   └── refresh/               Monthly refresh jobs (the moat pipeline)
│           └── webhooks/          signal.changed delivery
├── packages/contracts/                Zod DTOs + methodology registry (shared)
├── docs/                              This documentation
├── .github/workflows/                 CI + signal-refresh cron
└── scripts/                           Prove-on-prod helpers
```

> Note: the legacy `reports/` module (v1 `/v1/report`) was removed in the
> AR-324 epic; the frozen scoring engine now lives under `modules/engine/`.

## Key entry points

| What | Where |
|---|---|
| Route handlers | `apps/api/src/routes/*.ts` (registered in `app.ts`) |
| DB schema | `apps/api/src/infrastructure/db/schema.ts` |
| Scoring engine (frozen v2) | `apps/api/src/modules/engine/scoring-engine/v2.ts` |
| Methodology + version registry | `packages/contracts/src/methodology.ts` (re-exported by `apps/api/src/modules/engine/`) |
| Intelligence planner | `apps/api/src/modules/intelligence/planner.ts` |
| Intelligence executor | `apps/api/src/modules/intelligence/executor.ts` |
| Signal store reader | `apps/api/src/modules/signals/store-reader.ts` |
| Shared DTOs | `packages/contracts/src/` |

## ADRs: the "why" record

[`docs/DECISIONS/`](../DECISIONS/) holds 37 ADRs (0001 to 0037). Key
highlights: 0001 (signal-first reframe), 0002 (7-table schema), 0005
(normalisation), 0007 (cross-area query), 0010 (moat clock), 0017 (query
plane), 0023 (peers k-NN), 0026 (AI eval), 0027 to 0034 (Levers epic).
