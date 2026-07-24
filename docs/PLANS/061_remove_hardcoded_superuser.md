# Plan 061 — Remove hardcoded superuser email

**Jira:** AR-607
**Branch:** `AR-607-remove-hardcoded-superuser`
**Risk:** Low
**Worktree:** `../OneGoodArea-AR-607-remove-hardcoded-superuser`

---

## Purpose

Remove the hardcoded `ptengelmann@gmail.com` from all source code. Replace with a `SEED_SUPERUSER_EMAIL` Makefile variable that flows through compose into the API container, where `schema.ts` reads it at boot. DB column `is_superuser` remains the sole runtime truth.

---

## Steps

### Step 1: Makefile + compose plumbing

- Add `SEED_SUPERUSER_EMAIL ?= ptengelmann@gmail.com` to Makefile
- Add `SEED_SUPERUSER_EMAIL: ${SEED_SUPERUSER_EMAIL}` to `compose/compose.yml` api.environment
- Commit: `Add SEED_SUPERUSER_EMAIL variable to Makefile and compose`

### Step 2: Simplify isSuperuser() to pure DB lookup

- `apps/api/src/modules/usage/index.ts`: remove `SUPERUSER_EMAILS` import
- Replace `isSuperuser()` body with pure DB query (SELECT is_superuser FROM users WHERE id = $1)
- Commit: `Simplify isSuperuser to pure DB lookup, remove email fallback`

### Step 3: Replace hardcoded backfill with env-driven seed in schema.ts

- `apps/api/src/infrastructure/db/schema.ts`: delete hardcoded self-healing backfill (lines 54-62)
- Add new idempotent migration: `UPDATE users SET is_superuser = TRUE WHERE email = <SEED_SUPERUSER_EMAIL> AND is_superuser = FALSE`
- Keep `ALTER TABLE ... ADD COLUMN IF NOT EXISTS is_superuser`
- Commit: `Replace hardcoded backfill with env-driven superuser seed`

### Step 4: Remove SUPERUSER_EMAILS from config files

- `apps/api/src/infrastructure/config/index.ts`: delete `SUPERUSER_EMAILS` export
- `apps/web/src/lib/config.ts`: delete `SUPERUSER_EMAILS` export
- Commit: `Remove SUPERUSER_EMAILS from API and web config`

### Step 5: Clean up web config test

- `apps/web/tests/unit/config.test.ts`: remove `SUPERUSER_EMAILS` import and describe block
- Commit: `Remove SUPERUSER_EMAILS test block`

---

## Verification

1. `git grep ptengelmann` — zero results in *.ts, *.tsx, *.js
2. `git grep SUPERUSER_EMAILS` — zero results
3. `make stack-up-min` — boots, seed runs, ptengelmann gets is_superuser = TRUE
4. `make stack-clean && make stack-up-min` — fresh DB, seed still works
5. `npm run lint` + `npm run typecheck` + `npm test` — all clean

---

## Consequence

After merge, to make someone a superuser locally: set `SEED_SUPERUSER_EMAIL=their@email.com` in the Makefile (or env) and reboot the stack. In production: `UPDATE users SET is_superuser = TRUE WHERE email = '...';` — no code changes needed.
