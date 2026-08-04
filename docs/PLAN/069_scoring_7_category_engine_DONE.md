# Plan 069: Scoring engine 1.1 — seven category dimensions + interactive showcase weights

## Purpose
Redesign the deterministic scoring engine so all 7 signal categories (crime, deprivation, property, schools, amenities, transport, environment) become weighting dimensions for every preset, versioned as methodology **1.1.0**. Property stays intent-aware (affordability / cost / growth+yield / neutral). Then make the proptech showcase scores interactive with client-side weight sliders.

## Linked Jira
- Epic: **AR-689** (Scoring engine 1.1: seven category dimensions + interactive showcase weights)
- Story A — Engine & contracts: **AR-690** (subtasks AR-693..AR-699)
- Story B — Docs & versioning UI: **AR-691** (subtasks AR-700..AR-702)
- Story C — Showcase interactive weights: **AR-692** (subtasks AR-703..AR-706)

## Design (locked)
Every preset exposes the same 7 dimension keys; intent is expressed by scorer composition + weights:

| key | moving | business | investing | research |
|---|---|---|---|---|
| crime | scoreSafety | scoreSafety | scoreSafety | scoreSafety |
| deprivation | scoreDemographics | scoreSpendingPower | scoreDemographics | scoreDemographics |
| property | scoreCostOfLiving | scoreCommercialCosts | blend(PriceGrowth, RentalYield) | scoreCostOfLiving |
| schools | scoreSchools | scoreSchools | scoreSchools | scoreSchools |
| amenities | scoreAmenities | scoreAmenities | scoreAmenities | scoreAmenities |
| transport | scoreTransport | scoreTransport | scoreTransport | scoreTransport |
| environment | scoreEnvironment | scoreEnvironment | scoreEnvironment | scoreEnvironment |

Default weights (sum 100): moving 20/10/20/20/10/15/5 · business 5/15/15/5/25/20/15 · investing 10/10/30/5/15/15/15 · research 15/15/14/14/14/14/14 (crime/deprivation/property/schools/amenities/transport/environment).

Versioning: `METHODOLOGY_VERSIONS` gains a 1.1.0 entry (newest last); `SUPPORTED_ENGINE_VERSIONS = ["1.0.0","1.1.0"]`; golden snapshot re-baselined (approved engine change, diff reviewed).

## Git workflow
- Single worktree: `.worktrees/AR-689-scoring-7-categories` from `origin/main`.
- One branch + one PR per story, linked in Jira:
  - `feat/AR-690-scoring-engine-7-categories` → commits per subtask AR-693..AR-699 → PR A
  - `feat/AR-691-methodology-docs-versioning` → commits per subtask AR-700..AR-702 → PR B
  - `feat/AR-692-showcase-interactive-weights` → commits per subtask AR-703..AR-706 → PR C
- Each subtask = one small imperative commit. Never touch main.
- Push each branch, open PR, link PR in Jira, after merge transition story Done, sync worktree with main.

## Verification (containers only)
- `make app-lint` && `make app-typecheck` (containers)
- `make build-test-images` after source changes
- `make test-all-container` (api + web)
- Golden diff reviewed before commit; drift-guard tests: exact 7 keys per preset, identical across presets, weights sum 100.

## Docs deliverables
- This plan (renamed `069_..._DONE.md` after merge)
- ADR 0038 (`docs/DECISIONS/0038-scores-seven-category-model.md`) — renumbered from 0009 to avoid colliding with the existing `0009-monitor-portfolios.md`
- Methodology page version sidebar + changelog 1.1.0 entry

## AR-698 audit note (verification only — no code change)
Read-only audit confirmed there are **no legacy `scoring_presets` rows to migrate** for the 1.1.0 seven-category change:

- No SQL seed or migration anywhere references `scoring_presets`; `apps/api/seed/` contains only CSV data samples (nspl, police).
- The table is created and indexed at boot in `apps/api/src/infrastructure/db/schema.ts` (`scoring_presets`, `scoring_presets_org_idx`).
- Rows are written only at runtime when an org saves a preset — INSERT/UPDATE/DELETE in `apps/api/src/modules/orgs/presets.ts` — and deleted with the org in `org-repository.ts`.
- Preset weights therefore live in code (`PRESET_DIMENSION_KEYS` / `DEFAULT_WEIGHTS`), so the seven-category engine ships with no data cleanup or backfill.
