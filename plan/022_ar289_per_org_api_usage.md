# Plan 022 — Per-org `/api-usage` scoping (AR-289)

**Status:** READY 2026-06-16. One PR, small commits.
**Jira Story:** [AR-289 Per-org scoping of /api-usage chart + stats](https://podnex.atlassian.net/browse/AR-289)
**Branch:** `feat/AR-289-per-org-api-usage-v2` (fresh from clean main; the 2026-06-14 WIP `feat/AR-289-per-org-api-usage` is rebase-rotten — that branch stays on origin for history, not used here)

---

## 1. Objective

Make the dashboard's `/api-usage` page reflect the **active org** (the one selected in OrgSwitcher) rather than the user's lifetime totals across every org they belong to.

After this:
- Solo / single-org users: zero visible change
- Multi-org users: switching the org switcher changes the chart + stats

What does NOT change: the monthly quota counter (`requestsThisMonth`). Quota is plan-scoped to the user, not the org. Same logic as AR-287.

## 2. Hard rules

- **No SQL / backend imports in apps/web** ([[feedback-no-db-in-web]]). BFF stays a thin `proxySession` one-liner with a query-string passthrough.
- **Membership gate lives on apps/api** (RBAC must be server-side per ADR 0033). 403 on cross-org attempts.
- **No em-dashes in user-facing copy.**
- **Pedro tests on localhost before push.**
- **One PR, sequential commits inside it.**

## 3. Steps (one commit each, all on one branch)

### Commit A — DB migration: add `activity_events.org_id` + index + backfill

`apps/api/src/infrastructure/db/schema.ts`, `activity_events` migration:

```sql
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS org_id TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_events_user_org_event_created
  ON activity_events (user_id, org_id, event, created_at);
-- Backfill: copy org_id from the api_keys table for legacy rows.
-- Self-healing — only touches rows where activity_events.org_id IS NULL.
-- Idempotent (the WHERE clause makes it a no-op on re-run).
UPDATE activity_events ae
   SET org_id = ak.org_id
  FROM api_keys ak
 WHERE ae.org_id IS NULL
   AND ae.user_id = ak.user_id
   AND ak.org_id IS NOT NULL;
```

### Commit B — `trackEvent` writes `org_id`

`apps/api/src/modules/tracking/activity.ts`:
- Add `orgId?: string | null` parameter at the end (optional → backwards compatible with existing call sites that don't yet pass it)
- INSERT statement writes `org_id`

### Commit C — thread `org_id` at the api.* call sites in `app.ts`

Every route that calls `trackEvent("api.X", userId, ...)` where the route also has `org_id` in scope (from `validateApiKey` result or `authenticateEither` upgrade) passes it. Routes that don't have org_id (e.g. auth/register before org exists) keep passing nothing — that's correct, those events stay org-less.

### Commit D — apps/api `GET /keys/usage` accepts `?org=<id>`

In `apps/api/src/app.ts`:
- Read `request.query.org` (typed)
- If provided: check `org_members WHERE org_id = $1 AND user_id = $2` — 403 if not a member
- Append `AND org_id = $1` to the 4 stats queries (totalRequests, requestsThisMonth, requestsByDay, lastRequest)
- The api_keys list query stays user-scoped (an API key belongs to a user, not an org-from-the-caller's-perspective — though it has its own org_id pin)
- No org param → existing behavior (lifetime / user-wide)

### Commit E — BFF + client wiring

`apps/web/src/app/api/keys/usage/route.ts`:
- Stays a thin proxy. Forward the query string through. Today it's `proxySession(req, "/keys/usage")` — change to forward `?org` if present.

`apps/web/src/app/api-usage/...` client:
- Read `localStorage.getItem("oga-active-org-id")` on mount + on focus
- Append `?org=<id>` to the fetch when present
- Refetch on OrgSwitcher change (listen via `storage` event OR a window-level event — TBD in implementation)

### Commit F — tests

- apps/api unit tests for the new `?org` filter on `GET /keys/usage`: membership pass / non-member 403 / no-param fallback
- Migration idempotency check (the test/migrate suite already enforces this — the new UPDATE has `WHERE ae.org_id IS NULL` so it self-noops)

## 4. Acceptance

1. Migration applied via `npm run migrate -w @onegoodarea/api` against prod Neon — column + index + backfill all idempotent
2. Existing rows where the user has an api_key with org_id get backfilled; rows where api_keys.org_id is null stay null and are filtered out of per-org views
3. `GET /api/keys/usage` (no param) returns the same shape as before — lifetime user-wide totals (no regression for solo users)
4. `GET /api/keys/usage?org=<your-org-id>` returns the same shape but counts only events with `org_id = <your-org-id>`
5. `GET /api/keys/usage?org=<other-user-org-id>` returns 403
6. apps/api + apps/web tsc clean, full test suite passes (currently 1,480 / 1,488 incl. skipped)
7. Pedro confirms localhost: switching the OrgSwitcher changes the chart

## 5. Non-goals

- No UI changes beyond the fetch URL — same chart, same KPI cards
- Quota counter stays user-scoped (NOT org-scoped)
- Historical events from before this migration that have null `org_id` after backfill (because their api_keys row also has null) are invisible in per-org views, by design
- `top areas` / `intent distribution` panels — those are admin, not /api-usage scope