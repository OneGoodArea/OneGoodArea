# Database migrations

The Neon Postgres schema is managed via an explicit migration registry — no auto-sync, no ORM-generated migrations. Each statement is **idempotent** (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, ON CONFLICT clauses) so re-running is always safe.

## Where they live

`apps/api/src/infrastructure/db/schema.ts` — the ordered registry. Each migration is `{ name, statements: string[] }`.

## Run locally

```bash
npm run migrate -w @onegoodarea/api
```

The CLI in `apps/api/src/infrastructure/db/migrate.ts` walks the registry, runs each statement against `DATABASE_URL`, and reports applied count.

## Run on prod

Render's container build does NOT auto-run migrations. Two options:

1. **GitHub Actions cron** (recommended) — `.github/workflows/signal-refresh.yml` runs migrations as part of the monthly refresh.
2. **One-shot from your laptop** — set `DATABASE_URL` to prod Neon, run `npm run migrate -w @onegoodarea/api`. Idempotent, safe.

## Add a new migration

1. Append a new `{ name, statements }` entry to the `MIGRATIONS` array in `schema.ts`. Position matters — order = execution order.
2. Statement-level rules:
   - `CREATE TABLE IF NOT EXISTS …` (never `CREATE TABLE`)
   - `ALTER TABLE … ADD COLUMN IF NOT EXISTS …`
   - For backfill UPDATEs, gate with `WHERE <col> IS NULL` so re-runs are no-ops
3. Add tests in `apps/api/tests/infrastructure/db/migrate.test.ts` — table-exists assertions + the idempotency-pattern audit.
4. Re-run gates. Commit. Open PR.

## Expand-contract for breaking changes

Renames + NOT NULL adds are NEVER atomic in the same migration. Pattern:

1. **Expand** — add the new column nullable, write to both, code reads from either
2. **Backfill** — separate migration populates the new column
3. **Contract** — separate migration drops the old column / flips NOT NULL

See ADR 0027 (Levers Foundation) for a worked example — `api_keys.org_id` added nullable, backfilled, then will go NOT NULL once observed clean.

## See also

- ADR 0002-0010 — every schema decision documented
- [`docs/ARCHITECTURE/DATA-LAYER.md`](../ARCHITECTURE/DATA-LAYER.md) — what tables exist + why
