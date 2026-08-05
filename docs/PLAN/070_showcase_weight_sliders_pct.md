# Plan 070: Showcase weight sliders — percentage scale, remove number input, running total

## Purpose
Fix the showcase scoring weight sliders so they reflect the true 0-100 percentage scale from the API, remove the redundant number input (source of desync), and display a running weight total (Σ) below the sliders.

## Linked Jira
- Epic: **AR-689** (Scoring engine 1.1: seven category dimensions + interactive showcase weights)
- Story: **AR-707** (Showcase: weight sliders use 0-100 percentage scale, remove number input, show running total)
  - Subtask **AR-708**: WeightInput component — 0-100 slider, remove number input, show %, drop product prop
  - Subtask **AR-709**: ShowcaseScoring — clamp weights to [0,100], add running total, remove product prop
  - Subtask **AR-710**: Tests — % display, running total, reset restores 100%

## Root cause
API returns weights as 0-100 percentages (presets sum to 100; aggregation `Σ(score×weight)/Σ(weight)` in `score.ts:169`), but `weight-input.tsx` slider is hardcoded `max="10"` while the number box has no max → slider stops at 10 while the box can go higher, causing desync.

## Design
- `weight-input.tsx`: remove number input + `textValue` state; slider `min="0" max="100" step="1"`; header shows `{Math.round(value)}%`; label `weight %`; drop unused `product` prop.
- `ShowcaseScoring.tsx`: clamp `updateWeight` to `[0,100]`; add `totalWeight` `useMemo`; render `Total weight: {totalWeight}%` under sliders; remove `product` prop from WeightInput call.
- Tests: `%` display, running total (crime 20→50 ⇒ 130%), reset restores defaults + 100%.
- Aggregation is already weight-agnostic (`|| 1` guard for all-zero), so any total Σ is safe.

## Git workflow
- Worktree: `.worktrees/AR-707-showcase-weight-pct` from `origin/main`.
- Branch: `feat/AR-707-showcase-weight-pct` in the worktree.
- 3 commits (one per subtask), human author (`marcos.tengelmann@gmail.com`), push, PR → Jira link.
- After merge: transition story + subtasks Done (31), rename plan to `070_..._DONE.md`.

## Verification
- `make app-typecheck` (containers)
- `make app-lint` (containers)
- Vitest in `apps/web` (all green, including 9 existing + 3 new tests)