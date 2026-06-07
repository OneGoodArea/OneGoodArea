# Local setup

Use the Makefile for the common host path: `make app-setup`, `make app-build`, `make app-dev`, `make app-test`, `make app-typecheck`, and `make app-lint`.

You can use `make help` to learn what are the options

## Prerequisites

- Node.js 22+ (matches the Render container)
- npm 10+
- A Postgres `DATABASE_URL`
- An Anthropic API key

## Start

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
make app-setup
```

`make app-setup` runs a clean install and scaffolds local env files in `env/local/*.env` from their matching `.env.example` files if they do not already exist.

## Env vars

Populate the local env files:

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

# apps/api only
ANTHROPIC_API_KEY=sk-ant-...
```

Full templates at `env/local/api.env.example`, `env/local/web.env.example`, and `env/local/postgres.env.example`.

## Run

```bash
make app-dev
```

The web app is deployed separately; this local flow is API-only.

## Database + keys

```bash
make stack-up-min
make db-seed
```

This boots the minimal compose stack and seeds baseline database fixtures into the running Postgres service.

## Gates

```bash
make app-test
make app-typecheck
make app-lint
```
