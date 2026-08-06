# 071 — Showcase: Terminated Postcode (404) Scenario

**Purpose:** When a user enters a terminated postcode (e.g. NW1 8TQ, terminated May 1994) in the showcase, the API returns 404. The showcase should display a clear error state instead of silently showing empty results.

**Linked Jira:**
- Epic: AR-711
- Story: AR-712
- Tasks: AR-713, AR-714, AR-715, AR-716, AR-717

**Branch:** `feat/showcase-terminated-postcode` (created from `main`)

## High-Level Steps

1. **AR-713** — Update `api.ts` to surface HTTP status codes from API errors
2. **AR-714** — Update `ShowcaseSignals` to handle 404 with terminated-postcode messaging
3. **AR-715** — Update `ShowcaseScoring` to handle 404 with matching error state
4. **AR-716** — Update `proptech/page.tsx` error handling to pass error details through
5. **AR-717** — Verify with NW1 8TQ and other terminated postcodes

## Git Workflow
- Branch: `feat/showcase-terminated-postcode` (already created)
- Commits: one per task, prefixed with `AR-71x:`
- PR: open from `feat/showcase-terminated-postcode` → `main`

## Jira Workflow
- Epic AR-711: `TO DO` → `In Progress` during implementation → `Done` when all tasks complete
- Story AR-712: `TO DO` → `In Progress` during implementation → `Done` when all tasks complete
- Tasks AR-713–717: `TO DO` → `In Progress` during implementation → `Done` when complete

---

## Follow-up: code audit & gap closure (2026-08-05)

**Context:** AR-712 acceptance criteria were verified against `main` (after PR #489/#459
merged). The 404 state renders on the server-rendered initial load, but two real gaps
remained. This section records what was audited and the agreed fix.

**Audit findings (all confirmed on current `main`):**
- AR-713 (`apps/web/src/lib/showcase/api.ts:8-17,32-35`): `ApiError` carries `status`+`body`, thrown on `!res.ok` — complete.
- AR-716 (`apps/web/src/app/showcase/proptech/page.tsx`): catches `ApiError` server-side, passes `apiError` prop — complete.
- AR-714/AR-715: both read `apiError.body?.terminated` (dead branch — the API never returns `terminated`).
- API 404 shape: `/v1/area` (`routes/signals.ts:77`) and `/v1/score` (`routes/scoring.ts:155`) return `{ error: "Could not resolve area…" }` only.
- Interactive gap: `ShowcaseScoring.tsx:38-42` re-fetches client-side via `/api/showcase/score`, but the BFF `apps/web/src/app/api/showcase/score/route.ts:15-19` swallows every error to `502 { error: "Failed to fetch scores." }`, and the client throws generic `Error(res.statusText)`. So a client-side postcode/preset change loses the 404 "Postcode not found" state entirely.

**Decision (2026-08-05):** Keep AC#3's termination-year message. Termination data IS
available at runtime via postcodes.io's dedicated endpoint — `GET /terminated_postcodes/:postcode`
returns `{ year_terminated, month_terminated, … }` for postcodes in the ONS terminated
dataset (verified live for AB1 0AA → 1996/6). The public instance's `/postcodes/:postcode`
404 body does NOT carry the `terminated` object (docs claim it; live test shows a bare 404),
so the dedicated endpoint is the source of truth. No DB/loader change is needed — `geo-spine.ts`
still skips `doterm` rows, which is fine because the lookup is at request time. The existing
frontend `apiError.body?.terminated` branches become reachable (not dead code). Scope:

1. **API** — `apps/api/src/modules/signals/data-sources/postcodes.ts`: add `lookupTerminatedPostcode(postcode)` hitting `/terminated_postcodes/:postcode` (reuse `timedFetch`, 5s bound). In `routes/signals.ts` (`/v1/area`) and `routes/scoring.ts` (`/v1/score`), when the area fails to resolve AND the query is postcode-shaped (`POSTCODE_REGEX`), call it and append `terminated: { year_terminated, month_terminated }` to the 404 body.
2. **BFF passthrough** — `apps/web/src/app/api/showcase/score/route.ts`: catch `ApiError` and forward its `status` + body instead of collapsing to `502 { error: "Failed to fetch scores." }`.
3. **Client fetch** — `apps/web/src/components/showcase/ShowcaseScoring.tsx`: on `!res.ok`, parse the body and surface an `ApiError`-shaped state so a client-side 404 renders the same terminated/"Postcode not found" block as the server path (replaces the generic `Error(res.statusText)`).
4. **Verify** — `ShowcaseSignals.tsx` / `ShowcaseScoring.tsx` terminated branches now render for known-terminated postcodes (e.g. AB1 0AA, terminated 1996).

**Git workflow (follow-up):**
- Branch: `fix/AR-711-712-showcase-404-bff` from `main`
- Commits: one per logical change, prefixed `AR-712:`
- PR: `fix/AR-711-712-showcase-404-bff` → `main`