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