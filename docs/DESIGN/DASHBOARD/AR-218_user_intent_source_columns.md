# AR-218 — users.intent + signup_source + role_preference columns

**Status:** Done
**Merged:** `16d6c04` via PR [#131](https://github.com/OneGoodArea/OneGoodArea/pull/131) on 2026-06-05
**Phase:** 0 (Foundation — first AR-217 sub-ticket to ship)
**Branch (deleted post-merge):** `feat/AR-218-user-intent-source-columns`

## What shipped

The schema foundation for the immaculate sign-up → /welcome → dashboard user flow that the dashboard proposal designs for. Three nullable columns added to `users` — none with consumers yet, but every one of them gates a Phase 1 sub-ticket:

- **`users.intent`** (TEXT NULL) — captures which of the 5 ICPs the user is here for. Written by `/welcome` Step 1 (intent picker, 5 ICP cards). Validated against {`proptech`, `lenders`, `insurance`, `cre`, `public-sector`} via `UserIntentSchema` at write time. Shapes the dashboard from arrival onward (ICP-aware "Suggested next move" card, future Getting Started checklist).
- **`users.signup_source`** (TEXT NULL) — captures the marketing surface that referred the user. Written by `POST /auth/register` from the `?from=<slug>` query param on the sign-up CTA. Free-form (validated as a non-empty trimmed string ≤ 64 chars) because the marketing pages own the slug taxonomy. Enables funnel attribution per ICP page.
- **`users.role_preference`** (TEXT NULL) — captures how the user will use the product. Written by `/welcome` Step 3 (3-card picker). Validated against {`engineer`, `analyst`, `explorer`} via `UserRolePreferenceSchema`. Determines arrival page on each visit (engineer → `/api-usage`, analyst → `/dashboard/intelligence`, explorer → `/dashboard`).

All three are nullable. Existing users have NULL until they revisit `/welcome` (Phase 1 prompts them).

Also shipped: the implementation plan for the whole AR-217 Epic ([`plan/016_dashboard_redesign_ar217.md`](../../plan/016_dashboard_redesign_ar217.md)) and the per-ticket work-log scaffold at [`docs/DESIGN/DASHBOARD/README.md`](./README.md). These are Epic-level setup that happened to ship in the first sub-ticket's PR.

## Files

- `apps/api/src/infrastructure/db/schema.ts` — added 3 `ADD COLUMN IF NOT EXISTS` lines to the `users` migration block
- `apps/web/src/lib/db-schema.ts` — mirrored the 3 ALTERs in `ensureUsersTable` for legacy compat
- `apps/web/src/lib/db-types.ts` — `UserRow` interface extended with `intent`, `signup_source`, `role_preference` (all `string | null`)
- `packages/contracts/src/users.ts` (new) — `USER_INTENTS`, `USER_ROLE_PREFERENCES` const arrays; `UserIntentSchema`, `SignupSourceSchema`, `UserRolePreferenceSchema`, `UserSchema` Zod schemas; `isUserIntent`, `isUserRolePreference` runtime guards; `User`, `UserIntent`, `UserRolePreference` types
- `packages/contracts/src/index.ts` — re-export `./users`
- `apps/api/tests/infrastructure/db/migrate.test.ts` — new assertion verifying all 3 ADD COLUMN statements present in the users migration
- `packages/contracts/tests/users.test.ts` (new) — 23 tests covering Zod parse / null / unknown / non-string / runtime guards / full UserSchema (strict mode)
- `plan/016_dashboard_redesign_ar217.md` (new) — the AR-217 Epic implementation plan
- `docs/DESIGN/DASHBOARD/README.md` (new) — per-ticket work-log convention

## Decisions

- **Three columns shipped together, not two-then-one.** Initial scope was `intent` + `signup_source` only; Pedro pushed mid-PR to triple-check we were designing for the immaculate user flow holistically. Realised `role_preference` was the missing third onboarding signal and added it before the migration commit landed. Avoids a follow-up migration later.
- **Validation in Zod at the application layer, not DB CHECK constraints.** Both `intent` and `role_preference` are validated against fixed enums, but the validation lives in `@onegoodarea/contracts` — not in the migration. Lets the taxonomies evolve (add a new ICP, add a new role) without a schema change. Same pattern as `signal_bundles.signal_keys` (validated against `SUPPORTED_SIGNALS` at the app layer).
- **All three columns nullable.** Expand-only migration (existing users unaffected). They re-prompt on next dashboard visit when /welcome is wired in Phase 1.
- **`UserSchema` strict + no `password_hash`.** The Zod read shape mirrors what clients receive from `/v1/me` and BFF proxies; `password_hash` is server-only and never surfaced.
- **`signup_source` free-form, not enum.** Marketing pages own the slug taxonomy (`lenders`, `proptech`, `homepage`, `for-cre`, etc.) and that taxonomy will evolve more often than the contract layer should be touched. Validation is just "trimmed, 1-64 chars".

No ADR for this change — it's a small schema addition with no architectural novelty (mirrors the existing `users.email_verified`, `api_keys.allowed_ip_cidrs`, etc. ADD COLUMN patterns). ADR 0037 (Brand v3 dashboard primitives) is the first ADR for the Epic, lands after primitives ship.

## Tests

- `apps/api/tests/infrastructure/db/migrate.test.ts`: +1 test (verifies the 3 ADD COLUMN statements present). Existing idempotency test covers `IF NOT EXISTS`.
- `packages/contracts/tests/users.test.ts` (new): 23 tests across 5 describe blocks — `UserIntentSchema`, `isUserIntent`, `UserRolePreferenceSchema`, `isUserRolePreference`, `SignupSourceSchema`, `UserSchema`. Covers valid values, null (skipper case), unknown values, non-string/non-null, runtime guards, full UserSchema parse, strict mode rejection of extra fields, invalid email rejection.

**Gates at merge:** apps/api 869/869 · apps/web 306/306 · contracts 80/80 (23 new) · typecheck clean · lint 0 errors. CI all green (Build, Lint, Test, Typecheck, Security audit, Vercel deploy preview).

## Pedro's localhost approval

- Date: 2026-06-05
- Notes: N/A for this ticket — backend-only DB migration + types + Zod, no UI surface to look at. Tests are the gate for backend work per `feedback_design_bar.md`. Pedro reviewed the PR scope + gave verbal "merge it" approval, then "use --admin" when the new branch-protection review-requirement blocked the standard merge.

## Production migration status

**Not yet applied to prod Neon.** The migration ships in code; `apps/api/src/infrastructure/db/migrate.ts` runs against `DATABASE_URL` via `npm run migrate -w @onegoodarea/api` and will execute next time the migrator is invoked (Render auto-deploy or manual run). Idempotent (`ADD COLUMN IF NOT EXISTS`) so safe to re-run.

Smoke test post-migration:
```bash
DATABASE_URL=postgres://... npx tsx apps/api/src/infrastructure/db/migrate.ts
# expect: ✓ users (5 statements)  (was 2 before AR-218)
psql $DATABASE_URL -c "\d users"
# expect: intent | text | nullable
#         signup_source | text | nullable
#         role_preference | text | nullable
```

## Process note

Merge was performed with `gh pr merge --admin` because branch protection on `main` now requires a review (Marcos added this since the last merge — wasn't in place when `feedback_operations_loop.md` was written). Pedro's explicit verbal approval ("sure" → "use --admin") satisfied AR-217 Hard Rule #7 (no merge without Pedro's approval). For future PRs in this Epic: either Pedro approves on the PR's GitHub web UI before merge, or admin-override is used when he gives verbal approval. The branch protection review requirement should probably be revisited at some point but that's a separate ticket.

## Follow-ups

- Run `npm run migrate -w @onegoodarea/api` against prod Neon (Render deploy will trigger this automatically on the next apps/api push; or Pedro can run manually).
- `/welcome` flow ticket (Phase 1) will consume `UserIntentSchema` + `UserRolePreferenceSchema` for write validation; this is the first downstream consumer.
- Sign-up form ticket (Phase 1, AR-217-B3 in plan) will capture `?from=<slug>` and write `signup_source` on `POST /auth/register`.
- Eventually: backfill `intent` for existing users by prompting them on next dashboard visit (handled in Phase 5 polish, not a migration).
