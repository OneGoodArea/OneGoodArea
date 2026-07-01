# Fresh Install — Database Bootstrap & Initial Load

**Date:** 2026-06-21
**Context:** Audit of how tables are created and initial data is loaded when the app is deployed to a new set of containers against a fresh Postgres instance.

---

## Two separate bootstrap paths

The `apps/web` (Next.js) and `apps/api` (Fastify) apps use **different, incompatible strategies** for table creation.

### apps/web — Lazy, per-request

Tables are created **on first use** by individual `ensure*Table()` functions in `apps/web/src/lib/db-schema.ts`. Each module imports only the function it needs:

| Function | Called by |
|---|---|
| `ensureUsersTable()` | `auth.ts` |
| `ensureActivityTable()` | `activity.ts` (`trackEvent()`) |
| `ensureApiKeysTable()` | `api-keys.ts` |
| `ensureWatchlistTable()` | `app/api/watchlist/route.ts` |
| `ensureWebhookEventsTable()` | `webhooks.ts` |
| `ensureWebhookSubscriptionsTable()` | `webhooks.ts` |
| `ensureWebhookDeliveriesTable()` | `webhooks.ts` |
| `ensureReportCacheTable()` | (defined, unused directly) |
| `ensureIdempotencyRecordsTable()` | `idempotency.ts` |
| `ensureSubscriptionAddonsTable()` | `usage.ts` |
| `ensureMcpUsageTable()` | `usage.ts` |

There **is** an `ensureAllTables()` that runs all 10 in parallel, but **nothing calls it** — it's dead code.

**Behavior on fresh deploy:** The first HTTP request that touches a given table will run `CREATE TABLE IF NOT EXISTS` inline. If two concurrent first requests hit different tables, you get a DDL stampede. There's a race condition if two requests both call `ensureActivityTable()` simultaneously (no mutex, no advisory lock).

### apps/api — Manual CLI only

The API has an ordered, idempotent migration registry in `apps/api/src/infrastructure/db/schema.ts` (`MIGRATIONS[]` array, ~22 migrations) and a standalone runner in `apps/api/src/infrastructure/db/migrate.ts`.

Tables are created **only when you manually run**:

```bash
npm run migrate -w @onegoodarea/api
```

The API server (`server.ts` → `buildApp()`) **does not call `runMigrations()`**. There is no startup hook, no Docker entrypoint, no init container.

**Behavior on fresh deploy:** The API boots against an empty database. The first request to any route will crash with a missing-table error.

---

## Container entrypoints

### API (`container/api/Containerfile`)

```dockerfile
CMD ["node", "apps/api/dist/server.cjs"]
```

No migration step. The `migrate.ts` script is not bundled into `dist/` — it only exists in the build stage and is discarded before the runtime stage.

### Web (`container/web/Containerfile`)

```dockerfile
CMD ["node", "apps/web/server.js"]
```

No explicit setup. Table creation happens lazily on first request (see above).

---

## What initial data exists after bootstrap

| Data | Source | Trigger |
|---|---|---|
| Superuser (`ptengelmann@gmail.com`) | `ALTER TABLE users ... is_superuser = TRUE` | During `runMigrations()` — idempotent, only if no superuser exists |
| Test API key | `scripts/mint-ephemeral-key.mjs` | Manual: `make bootstrap-test-key` |
| `runtime_bootstrap_marker` (test only) | `apps/web/tests/db/bootstrap/001-bootstrap.sql` | Docker `postgres-test` entrypoint (`/docker-entrypoint-initdb.d/`) |
| Signal data (deprivation, crime, prices, peers) | `npm run refresh:*` scripts | Manual one-offs |
| Orgs, subscriptions, reports, bundles, presets, cohorts | Application code | On user action |

**There is no seed script for production.** A fresh deploy to a new Postgres is a blank canvas — all data is user-generated or created by manual refresh scripts.

---

## Gaps & Risks

### 1. API won't work on fresh deploy
If someone runs `docker compose up -d api web` against a new Postgres, the API serves 500s on every route until someone manually runs `npm run migrate`.

### 2. No production seed
There is no way to pre-create a default org, a sandbox plan mapping in Stripe metadata, or a test API key that works on first deploy. Every new environment starts completely empty.

### 3. logger.ts is duplicated
`apps/web/src/lib/logger.ts` and `apps/api/src/modules/tracking/structured-logger.ts` are ~90% identical copy-paste. The API version has `redactSecrets()` (URI password masking); the web version does not — a potential credential leak vector in Vercel logs.

### 4. ensureAllTables() is dead code
Defined in `apps/web/src/lib/db-schema.ts` but never called. Either call it at startup or delete it to avoid confusion.

### 5. No DDL mutex on the web side
Two concurrent requests could both call `ensureActivityTable()` and race on the same `CREATE TABLE IF NOT EXISTS` — harmless in Postgres (the second is a no-op), but wasteful.

---

## Recommended fix

### Short-term (make boot safe)

1. **Call `runMigrations()` at API startup** — in `apps/api/src/server.ts`, before `app.listen()`:

```ts
import { runMigrations } from "./infrastructure/db/migrate";
await runMigrations();
```

Migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`), so this is safe to run on every boot with zero cost after the first run.

2. **Call `ensureAllTables()` at web startup** — in `apps/web/src/instrumentation.ts` or a root layout server component.

### Medium-term (operational maturity)

3. **Create a `seed.ts` script** that inserts the minimum viable dataset for a new environment (default org, Stripe product/price sync, a bootstrap API key).

4. **Deduplicate `logger.ts`** into `packages/contracts` so both apps share one implementation with `redactSecrets()`.

5. **Add a request_logs table** backed by an `onResponse` hook in both apps for structured request observability without external services.

---

## Verification checklist for a new deploy

- [ ] Postgres is healthy (`pg_isready`)
- [ ] Run `npm run migrate -w @onegoodarea/api` (until automated — see recommendation)
- [ ] Verify all routes respond 200/401 (not 500) via `/health`
- [ ] Run `make bootstrap-test-key` for a test API key (if needed)
- [ ] Run signal refresh scripts if the environment needs data
