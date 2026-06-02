# Local setup

Use the Makefile for the common path: `make setup`, `make dev`, `make migrate`, `make bootstrap-test-key`, `make test`, `make typecheck`, and `make lint`.

## Prerequisites

- Node.js 22+ (matches the Render container)
- npm 10+
- A Postgres `DATABASE_URL`
- An Anthropic API key

## Start

```bash
git clone https://github.com/OneGoodArea/OneGoodArea.git
cd OneGoodArea
make setup
```

`make setup` runs a clean install and scaffolds `apps/web/.env.local` and `apps/api/.env.local` from their `.env.example` files if they do not already exist.

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

Full templates at `apps/web/.env.example` and `apps/api/.env.example`.

## Run

```bash
make dev
OGA_SIGNALS_API=true make dev-signals
```

The web app is deployed separately; this local flow is API-only.

## Database + keys

```bash
make migrate
make bootstrap-test-key
```

`make bootstrap-test-key` prints a disposable `oga_...` key and a temp password for the test user.

## Gates

```bash
make test
make typecheck
make lint
```

## Refresh signal data

```bash
make refresh-deprivation
make refresh-property
make refresh-crime CRIME_ARCHIVE_DIR=<police-archive-folder>
```

See [`SIGNAL-REFRESH.md`](../../docs/OPERATIONS/SIGNAL-REFRESH.md) for the full refresh list.
