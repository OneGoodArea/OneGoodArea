# Infrastructure & Deployment

## Topology

```
┌────────────────────────┐         ┌──────────────────────────┐
│  apps/web (Next.js 16) │         │  apps/api (Fastify)      │
│  • Consumer site       │         │  • Standalone backend    │
│  • Vercel auto-deploy  │         │  • Render auto-deploy    │
└──────────┬─────────────┘         └────────────┬─────────────┘
           │                                    │
           │       ┌──────────────────────┐     │
           └──────►│   Neon Postgres      │◄────┘
                   │   (shared today)     │
                   └──────────────────────┘
                           ▲
                  ┌────────┴───────────┐
                  │ GitHub Actions cron │
                  │ signal-refresh.yml  │
                  └─────────────────────┘
```

## Components

| Component | Host | Notes |
|---|---|---|
| **apps/web** | Vercel (`one-good-area-stable`) | Next.js 16, React 19, Tailwind 4, NextAuth v5, Stripe |
| **apps/api** | Render (`onegoodarea.onrender.com`) | Fastify, OCI image, esbuild→`dist/server.cjs`. Free tier (sleeps after 15 min) |
| **Neon Postgres** | Neon (LAUNCH plan) | ~29 tables. Shared by apps/web + apps/api today |
| **packages/contracts** | N/A (npm package) | Pure TypeScript + Zod. `strict()` on every object |

## Auth modes

- **API key:** `Authorization: Bearer oga_…` (SHA-256 hashed, prefix-shown). Legacy `aiq_` keys still validate.
- **Session JWT:** apps/web mints HS256 JWT (shared `AUTH_SECRET`); apps/api verifies signature only.

All Intelligence + Signals/Scores/Monitor endpoints are behind `OGA_SIGNALS_API` flag. Off → 404.

## GitHub

https://github.com/OneGoodArea/OneGoodArea — public, `main` branch, CI on every push.

## See also

- [`DEPLOYMENTS.md`](./DEPLOYMENTS.md) — deployment topology details
- [`CONTAINERS.md`](./CONTAINERS.md) — cross-platform container workflow
