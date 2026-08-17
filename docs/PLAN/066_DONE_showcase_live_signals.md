# 066 Showcase proptech: live signals + reliability

Status: plan (not implemented)

## Purpose

Turn `/showcase/proptech` into a live, interactive demo and fix the
tracking + signals failures behind it. The page currently renders static
fallback data because the API calls time out.

1. Fix `POST /track` 400→500 cascade (web sends `referrer: null`, body
   schema rejects it, response schema then fails serialization).
2. Deep-fix `/v1/area` latency: server-side property (Land Registry) cache,
   Overpass mirror health/cooldown, flood EA partial-failure tolerance.
3. Raise the showcase web client timeout (5s → 60s).
4. Add "Enter PostCode" form (UK-only) driving the API via `?postcode=`.
5. Render all ~23 signals flat, grouped by category headings, with `N/A`
   placeholders + loading/error states; drop the static fallback.
6. Deferred (explicitly): `/v1/score` + scores UX. Scores section stays
   as-is.

## Jira

- Epic: AR-429 "Client Acquisition" (existing).
- Story: AR-426 "Showcase apps" (existing, under AR-429) — new subtasks:
  - AR-680 PostCode input + UK validation + `?postcode=` route param
  - AR-681 Signals flat list by category + N/A + loading/error (drop fallback)
  - AR-682 Raise showcase client timeout (5s → 60s)
- New Story (under AR-429): "API reliability: tracking + signals ingestion" — AR-676
  - AR-677 Fix `POST /track` 400/500 cascade (null referrer)
  - AR-678 Server-side property (Land Registry) cache
  - AR-679 Overpass mirror circuit breaker + flood EA partial-failure tolerance

## Steps

1. `/track` (apps/api/src/routes/me.ts): make body fields `.nullish()`,
   widen the 400 response schema so Fastify's default validation-error body
   doesn't cascade to 500; add tests (null referrer → 200 `{ok:true}`).
   Commit.
2. land-registry.ts: LRU TTL cache keyed by outcode (same pattern as
   flood/openstreetmap) + `clearPropertyCache()` for tests. Commit.
3. openstreetmap.ts: per-mirror cooldown so mirrors that just 5xx/429'd are
   skipped on the next race. flood.ts: per-request `.catch` so one EA
   endpoint failing doesn't null out the other. Tests. Commit.
4. web showcase api.ts: timeout 5000 → 60000; `getSignals(postcode)`.
   Commit.
5. proptech page: client `PostCodeForm` → `router.push(?postcode=)`; UK
   postcode regex validation; loading + error states; flat signal list
   grouped by category headings with `N/A` for null values; remove
   `fallbackSignals`; keep scores section as-is. Commit.
6. Verify: `make app-lint`, `make app-typecheck`, `make api-test-container`,
   `make web-test-container`. Push. PR (draft format per jira-github-lifecycle).

## Git workflow

- Worktree at `.worktrees/<AR-key>-<short>` (or branch — TBD by user).
- One commit per step, author `perez <marcos.tengelmann@gmail.com>`.
- Never push to `main`; PR per jira-github-lifecycle draft format.

## Jira closure

- Move issues To Do → In Progress when starting → link PR → Done on merge.
- Rename plan `066_showcase_live_signals` → `066_DONE_showcase_live_signals`
  once fully implemented.
