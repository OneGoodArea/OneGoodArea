# 067 Showcase proptech: scores, signal values, weighting display

Status: plan (not implemented)

## Purpose

Fix two bugs and add one feature discovered during QA of the live
`/showcase/proptech` demo (AR-676/677/678/679/680/681/682).

1. **Scores section missing (bug).** The refactor in 066 accidentally
   dropped the scores section from the page. `getScores()` exists in
   `api.ts` but is unused. The scores section must be restored.
2. **All signal values show 0 (bug).** The frontend maps
   `s.percentile ?? 0` but `percentile` is absent in `live` fetch mode
   (the default). Every signal gets `score: 0`. Fix: display the actual
   `value` field instead. The `Signal` type already has `score: number`
   but the API's `value` field (the real data) is never mapped.
3. **Default weighting display (feature).** The `/v1/score` endpoint
   accepts a `preset` (e.g. `"business"`) which implies weightings.
   Show the default weights alongside signals or as a separate section
   so the demo communicates what "business" means.

## Jira

- Epic: AR-429 "Client Acquisition" (existing).
- Story: AR-426 "Showcase apps" (existing, under AR-429) — new subtasks:
  - AR-684 Restore scores section on proptech showcase page
  - AR-685 Fix signal values: display `value` instead of `percentile`
  - AR-686 Display default scoring weights on showcase page

## Steps

### AR-684: Restore scores section

1. `proptech/page.tsx`: import `getScores`, call it server-side
   alongside `getSignals`, pass scores as prop.
2. Create `ShowcaseScores.tsx` client component (or inline): render
   scores as a bar/radar similar to the old static version.
3. Place scores section below signals on the page.
4. Tests: page renders without error when scores are empty; scores
   section is visible when data is present.

### AR-685: Fix signal value display

1. `api.ts`: change `getSignals` mapping from `score: s.percentile ?? 0`
   to `score: s.value` (the actual data value from the API).
2. `types.ts`: update `Signal` type if needed (`score` is already
   `number` but `value` from API can be `number | string | null`).
   Consider making `score` display-friendly: `string | number`.
3. `ShowcaseSignals.tsx`: update `formatValue` to handle string values
   (e.g. crime rates, amenity counts) alongside numbers.
4. Tests: mapping produces correct output for live mode (percentile
   absent, value present).

### AR-686: Display default scoring weights

1. `api.ts`: add `getScoringPreset()` that fetches the preset
   weights from `/v1/score` or a dedicated endpoint. If no endpoint
   exists, hardcode the default "business" weights as a static map.
2. `ShowcaseWeights.tsx`: render a compact weights section showing each
   dimension name + its weight percentage.
3. Place between signals and scores on the page.
4. Tests: weights render correctly; empty weights handled.

## Deferred

- Performance / Overpass latency / Land Registry caching improvements
  (separate discussion).
- Interactive weight adjustment (out of scope).

## Git workflow

- Branch: `feat/AR-684-showcase-fixes` (or worktree).
- One commit per subtask, author `perez <marcos.tengelhen@gmail.com>`.
- PR per jira-github-lifecycle draft format.

## Jira closure

- Move issues To Do → In Progress when starting → link PR → Done on
  merge.
- Rename plan `067_showcase_proptech_fixes` → `067_DONE_...` once
  implemented.
