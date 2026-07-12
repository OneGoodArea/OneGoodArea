# Plan 038 — Engine version reset to clean 1.0.0 + lineage scrub

**Status:** Skeleton (planning). Steps to be detailed and approved one at a time.
**JIRA:** AR-448 (Backlog)
**Branch:** `feat/AR-448-engine-version-reset` (off `main`)
**Owner:** Pedro / Claude
**Started:** 2026-07-08

## Purpose

OGA has months of history: a B2C past and an engine that iterated 1.x to
2.0.2. At public launch, an enterprise client should see a clean first
release, no visible "what was v1?", no stale B2C copy. Rebaseline the
engine/methodology version to a single clean **1.0.0** and remove the
lineage tells, so everything reads as one aligned, mature v1.0.

## Guardrails (non-negotiable)

- **No behaviour change.** Same input gives the same numbers. Scoring
  math, SQL, weights, confidence formulas, endpoints are untouched. This
  is a labelling + copy change, not a logic change.
- **Single source of truth preserved.** Version still flows from the
  `METHODOLOGY_VERSIONS` registry (contracts) through the resolver and the
  v3-cutover seam in `engine/version.ts`. We rebaseline the starting
  point, we do not replace the versioning system.
- **Nothing breaks.** The scoring golden-master test is version-free, so
  scores are safe by construction. Every hardcoded version assertion moves
  in lockstep; all suites, typecheck, build, a local visual review, and a
  post-deploy curl must be green.

## Scope

**In:** the engine/methodology version string and its history; the
supported pin window; the OpenAPI + MCP static snapshots; the
`/v1/meta` `phase` lineage tell; stale B2C copy ("AI narrates only",
reports-era language); all version assertions in tests and test-case docs.

**Out (leave alone):** the `/v1` API path prefix; package/dependency
versions; the `design-v2` / `brand-v3` internal directory names; and any
scoring logic.

## Steps (high level, detail each on approval)

1. **Confirm single source of truth + open items.** Verify
   `apps/web/src/lib/methodology-versions.ts` is a re-export not a second
   registry; confirm whether `/changelog` is registry-driven or
   hand-written; check `org_methodology_pins` for any test rows referencing
   old versions.
2. **Rewrite the methodology registry** (`packages/contracts/src/methodology.ts`)
   to a single clean `1.0.0` entry describing the current deterministic
   engine (no reports, no "AI narrates only").
3. **Reset the supported window + EOL logic** in
   `apps/api/src/modules/engine/version.ts` to `["1.0.0"]`; retire the
   1.x-as-EOL concept while keeping the v3 seam intact.
4. **Update hardcoded version strings outside the registry:**
   `apps/web/public/openapi.json` (version + enum + examples),
   `mcp/src/methodology-data.ts` `ENGINE` snapshot + `mcp/README.md`,
   the stale comment in `apps/api/src/routes/me.ts`.
5. **Scrub the lineage tell:** the `/v1/meta` `phase: "1-reports-vertical"`
   string in `apps/api/src/routes/system.ts` (+ its type in
   `packages/contracts/src/index.ts`).
6. **Copy alignment sweep:** marketing/docs surfaces for outdated B2C
   prose; align to the current deterministic-infrastructure story.
7. **Update test assertions in lockstep** across api / contracts / web /
   mcp (version.test.ts, signals/scoring/intelligence/methodology tests,
   proxy/code-block/openapi/methodology-versions web tests, mcp tool tests).
8. **Update docs** referencing the version (`docs/test-cases/*.md` headers,
   architecture docs).
9. **Verify nothing breaks:** all four test suites green, typecheck +
   build, local `npm run dev -w web` visual review of `/methodology` and
   `/changelog`, then post-deploy curl of `/v1/meta`, `/v1/score`,
   `/v1/area`, `/openapi.json`.

## Step 1 findings (2026-07-08)

- SINGLE SOURCE OF TRUTH confirmed: `apps/web/src/lib/methodology-versions.ts`
  is a re-export shim from `@onegoodarea/contracts` (AR-352). No second
  registry. The `/methodology` page and product pages render from the
  registry, so they auto-update on the rewrite.
- `/changelog` (`design-v2/changelog/client.tsx`) is HAND-WRITTEN (its own
  `CHANGELOG` array), buyer-facing, and narrates pre-launch history. Needs
  a manual edit in Step 6 plus a call on launch-forward vs keep-history.
- `org_methodology_pins` row check deferred to a runtime DB query at
  execution time (expected empty pre-customer).

## Open questions

- (Resolved) Scheme: clean `1.0.0`. Confirmed 2026-07-08.
- Step 6: trim `/changelog` to launch-forward, or keep the shipped history?
