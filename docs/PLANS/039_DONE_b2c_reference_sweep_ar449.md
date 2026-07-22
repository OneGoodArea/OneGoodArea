# Plan 039 — B2C / old-reference copy sweep

**Status:** Skeleton (planning). Judgment calls flagged below.
**JIRA:** AR-449 (Backlog -> In Progress)
**Branch:** `feat/AR-449-b2c-sweep` (off `main`, TBD)
**Owner:** Pedro / Claude
**Started:** 2026-07-08

## Purpose

Follows AR-448 (engine reset to 1.0.0) and #338 (docs aligned). Remove the
remaining B2C-era and pre-launch references so the whole product reads as a
clean 1.0.0 launch, no reports lineage, no "AI narrates", no stale versions.

## Targets found (scoping grep)

**Mechanical (safe to just do):**
1. Marketing pages `design-v2/products/{scores,intelligence}`, `dashboard-signals`:
   any "AI narrates"-style copy -> accurate deterministic framing.
2. `apps/api/src/modules/engine/version.ts` comment block: still describes the
   old v2.x / 1.x-EOL / v3 scheme -> rewrite for the 1.0.0 baseline.
3. `docs/test-cases/*.md` headers "Engine v2.0.2" -> 1.0.0; scripts
   (`scripts/http/api-tests.http`, `scripts/e2e-2026-07-01.mjs`) version refs.

**Judgment calls (need Pedro):**
4. `apps/web/public/openapi.json` still documents the REMOVED `/api/v1/report`
   and `/api/v1/batch` endpoints (killed in AR-324) with "AI-generated
   narrative" copy. The public spec advertises endpoints that 404. Rip them
   out and re-anchor the spec on the live `/v1/*` products? (Also updates
   `apps/web/tests/unit/openapi.test.ts`, which asserts `/api/v1/report`.)
   Bigger job.
5. `apps/web/src/app/design-v2/changelog/client.tsx` (hand-written): trim to
   launch-forward, or keep the pre-launch history?
6. Dead web-side AI provider code `apps/web/src/lib/ai/providers/*`
   (mock/anthropic/types) + `mock-ai-provider.test.ts`: B2C report-narration
   zombie. Delete?

**Out of scope (keep as history):** `docs/PLANS/*`, `docs/DECISIONS/*` (ADRs),
`docs/ARCHIVE/*`, dependency versions in lockfiles/package.json.

## Guardrails

- No behaviour change. Keep all suites green.
- Local-first visual check on any customer-facing web copy before push.
- Historical records are not rewritten.
