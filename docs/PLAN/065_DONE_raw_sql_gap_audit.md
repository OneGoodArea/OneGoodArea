# AR-666: Raw SQL Gap Audit

**Status:** Complete
**Date:** 2026-08-03
**Jira:** AR-666 (Foundation: raw SQL gap audit — enumerate raw `sql` call sites that bypass `row()`/`rows()`)

## Summary

The AR-664 fix added `Date` → ISO string normalization inside the `row()`/`rows()` helpers
(`apps/api/src/infrastructure/db/types.ts`). It only covers queries that route through those
helpers. Any raw `await sql` SELECT that reads a `timestamptz` column directly from the Neon
driver bypasses the fix and relies on Fastify's implicit `Date.toJSON()` serialization on the
wire — functionally OK today, but outside the explicit ISO contract AR-631 is establishing, and
a latent trap for downstream code that treats the field as a string.

## Audit Method

- Counted raw `await sql` call sites (`apps/api/src`, non-test): **169** across **30** files
- Counted `row()`/`rows()`/`typedRows()` call sites: **74**
- For each raw SELECT reading a timestamp column, checked whether the result is passed through
  `row()`/`rows()`/`typedRows()` and/or an explicit `isoOrNull()`/`.toISOString()` boundary.

## Confirmed Gap Sites (raw SQL reading timestamps, no helper, no explicit ISO boundary)

All gap sites are in `apps/api/src/routes/me.ts`.

| File:Line | Endpoint | Timestamp fields read | Module | Recommended action |
|---|---|---|---|---|
| `routes/me.ts:251-268` | `GET /me/portfolios` (portfolio rows) | `created_at`, `updated_at` | me (dashboard portfolios) | Wrap result in `rows<>()` (AR-664 helper) so `created_at`/`updated_at` normalize to ISO; add to the relevant AR-631 module subtask |
| `routes/me.ts:275-280` | `GET /me/portfolios` (areas join) | `created_at` | me (dashboard portfolios) | Wrap result in `rows<>()`; `created_at` is read but only `id/area/label` are emitted, so low risk |
| `routes/me.ts:691-699` | `GET /me/dashboard` (primary API key) | `last_used_at` | me (dashboard) | Wrap result in `rows<>()`; `last_used_at` is emitted in `primaryKey` response |
| `routes/me.ts:869-875` | `GET /watchlist` | `created_at` | me (watchlist) | Wrap result in `rows<>()`; `created_at` is emitted in response |
| `routes/me.ts:894-903` | `POST /watchlist` (RETURNING) | `created_at` | me (watchlist) | Wrap result in `rows<>()`; `created_at` is emitted in `201` response |

## Screened Sites — Confirmed NOT Gaps

Screened every other raw `await sql` site; the following read timestamps but were confirmed
safe (explicit boundary present):

| File | Fields | Why it's OK |
|---|---|---|
| `routes/api-keys.ts:81-193` | `created_at`, `last_used_at` | All four stat queries + key list go through `row<>()`/`rows<>()` **and** explicit `isoOrNull()` |
| `modules/admin/index.ts:55-143, 445-496, 650-674` | `created_at`, `last_seen`, `event_ts` | Uses `typedRows<>()` + `isoOrNull()` (AR-628 boundary already in place) |
| `modules/webhooks/index.ts:160-182, 271-282` | `created_at`, `last_success_at`, `last_failure_at` | `rows<>()` + explicit `.toISOString()` mapping |
| `modules/orgs/bundles.ts`, `presets.ts`, `cohorts.ts`, `methodology.ts` | `created_at`, `updated_at` | All read via `rows<>()` |
| `modules/monitor/portfolio.ts:34-49` | `created_at` | `rows<>()` |
| `modules/activity/index.ts:44-53` | `created_at` | `rows<>()` |
| `infrastructure/db/dal/repositories/*` (org, api-key, user, org-invitation) | `created_at`, `updated_at`, `last_used_at`, `expires_at`, `accepted_at`, `revoked_at` | All wrapped in `rows<>()` |
| `routes/auth.ts:233-248, 347-360` | `expires_at` | `row<>()` (then `new Date(iso)` compare) |
| `routes/me.ts:766-772` | `current_period_end` | Selected but unused (only `stripe_subscription_id` passed through `row<>()`) |
| `routes/stripe.ts:99-110` | `current_period_end` | Selected but unused; `row<>()` for used fields |
| `modules/signals/data-sources/ofsted.ts:39-46` | `inspection_date` | `TEXT` column (schema.ts:611), not a timestamp |
| `modules/usage/index.ts`, `tiers/strategies/plan-based.ts` | `user_type`, `tier` | Strings, not timestamps |

Timestamp columns used only in `WHERE`/`ORDER BY`/`GROUP BY` (never read into response) were
also screened and are not gaps (e.g. `api-keys.ts:131-142`, `usage/index.ts`, `admin/index.ts`
funnel queries, `rate-limit.ts`, `idempotency.ts`, `me.ts:324`, `me.ts:374`).

## Conclusion

- **5 gap sites**, all in `routes/me.ts` (`/me/portfolios`, `/me/dashboard`, `/watchlist`).
  None is a correctness bug today (Fastify serializes `Date` → ISO on the wire), but all should
  be routed through `rows<>()` when their module lands in an AR-631 subtask.
- No gap sites elsewhere; admin and DAL repositories already carry explicit ISO boundaries.
