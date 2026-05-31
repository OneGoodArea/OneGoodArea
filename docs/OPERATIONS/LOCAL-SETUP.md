# Local setup

Get OneGoodArea running on your machine in 5 minutes.

## Prerequisites

- Node.js 22+ (matches the Render container)
- npm 10+
- A Neon Postgres database URL (or any Postgres with the migrations applied)
- An Anthropic API key (for the Intelligence + NL planner features)

## Install

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
npm install
```

## Env vars

Per app (`apps/web/.env.local` and `apps/api/.env.local`):

```bash
# Shared (must match between apps)
DATABASE_URL=postgres://...
AUTH_SECRET=...           # apps/web mints + apps/api verifies JWTs against this

# apps/web only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# apps/api only — usually same key
ANTHROPIC_API_KEY=sk-ant-...
```

Full templates at `apps/web/.env.example` and `apps/api/.env.example`.

## Run

Standalone API server:

```bash
npm run dev -w @onegoodarea/api        # Fastify on http://localhost:8080
```

The web app is deployed separately; this local flow is API-only.

Flag the post-restructure surface on for `apps/api`:

```bash
OGA_SIGNALS_API=true npm run dev -w @onegoodarea/api
```

## Gates (run before every commit)

```bash
npm test          # all workspaces
npm run typecheck # all workspaces
npm run lint      # apps + packages
```

## Run database migrations

```bash
npm run migrate -w @onegoodarea/api
```

Migrations are idempotent — safe to re-run. See [`DATABASE-MIGRATIONS.md`](./DATABASE-MIGRATIONS.md) for details.

## Refresh signal data (optional, takes a while)

```bash
npm run refresh:deprivation -w @onegoodarea/api
npm run refresh:property -w @onegoodarea/api
npm run refresh:crime -w @onegoodarea/api <police-archive-folder>
```

Full list in [`SIGNAL-REFRESH.md`](./SIGNAL-REFRESH.md).
