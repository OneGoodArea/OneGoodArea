# Plan 027 — Docs accuracy sweep

**Status:** Epic 1 in flight (AR-354)
**JIRA Epics:** AR-354 (triage), Epic 2 key TBD
**Owner:** Pedro / Claude
**Started:** 2026-06-25
**Structure locked:** 2026-06-25

## Purpose

Pedro flagged three things in the marketing/docs surfaces:

1. `/docs` landing is orphaned from the main nav. The `Docs▾` dropdown
   skips straight to `/docs/api-reference` and `/docs/mcp`. The 792-line
   landing index page only renders if a user types the URL or follows
   an inline body link (terms, methodology footer, help, api-ref back
   button).
2. `/docs/api-reference` advertises six product surfaces, each tagged
   "Coming soon" with `docsHref` pointing at routes that do not exist
   (`/docs/signals`, `/docs/scores`, `/docs/monitor`, `/docs/intelligence`,
   `/docs/levers`). Body copy admits this is the next wave of work.
3. Wider concern: every docs-adjacent page should reflect exactly what
   OneGoodArea ships today. Engine v2.0.2, four products, ~70 endpoints,
   real auth schemes, real event taxonomy, real surfaces. No invented
   capabilities, no stale claims, no marketing softener language for
   things that don't exist.

This plan figures out how to do that sweep cleanly without bundling
two distinct kinds of work into one epic.

## Known issues (pre-audit, surfaced 2026-06-25)

- **Orphan nav**: `apps/web/src/app/design-v2/_shared/nav.tsx:60-62`
  DocsPanel has only `/docs/api-reference` and `/docs/mcp`. No link to
  `/docs` itself.
- **Coming-soon teases**: `apps/web/src/app/docs/api-reference/client.tsx:200-247`
  shows six surface cards, each tagged "Coming soon".
- **Live 404**: `apps/web/src/app/design-v2/methodology/client.tsx:1214`
  links to `/docs/levers` — that route does not exist.
- **MCP doc vs MCP rebuild**: `/docs/mcp` (357 LOC) documents MCP
  capability that per memory is being redone regardless. Risk of
  stale-on-arrival.

## Pages in scope for accuracy sweep

| Page | LOC | Why |
|---|---|---|
| `/docs` (landing) | 792 | Four-product TOC, levers section, reference, quickstart, examples. Engine version stamp. |
| `/docs/api-reference` | 374 | Surface counts, endpoint examples, "what works today" claims. |
| `/docs/mcp` | 357 | Currently-shipped MCP behaviour. Rebuild looms. |
| `/methodology` | ~1500 | Engine version, dimensions, intents, data sources, levers footer link. |
| `/changelog` | TBD | Product changelog entries. |
| `/help` | TBD | Help center entry, links into /docs. |
| `/terms` | TBD | Legal references to docs surface. |

Plus inbound surfaces that link into docs (dashboard home cards,
dashboard product pages, sign-up flow, marketing product pages).

## Structure (locked, Option A)

Two epics, sequential. Triage first because the landmines are low-risk
high-visibility fixes. Accuracy sweep second because each page audit
is its own substantive piece of work.

### Epic 1 — Docs triage landmines (AR-354)

Bit by bit, one ticket per landmine, one PR per ticket. Reviewable
diffs in isolation.

| Key | # | Ticket title | Surface | Diff |
|---|---|---|---|---|
| AR-355 | T1 | Add /docs landing to main nav | `nav.tsx` | small |
| AR-356 | T2 | Fix broken /docs/levers link from /methodology | `methodology/client.tsx:1214` | tiny |
| AR-357 | T3 | Add MCP-rebuild banner to /docs/mcp | `docs/mcp/client.tsx` | small |
| AR-358 | T4 | Restructure /docs/api-reference "Coming soon" cards | `docs/api-reference/client.tsx` | medium |

### Epic 2 — Docs accuracy sweep

One story per page. Each story is *audit + fix in the same PR* — the
audit produces no separate artefact, just the diff that fixes
what it found. Surfaces:

| # | Page | Treatment |
|---|---|---|
| S1 | `/docs` landing | Verify every fact against current state, refresh |
| S2 | `/docs/api-reference` | Re-audit post-T4 restructure |
| S3 | `/docs/mcp` | Audit; treatment depends on MCP rebuild status |
| S4 | `/methodology` | Verify dimensions, intents, data sources, version registry tie-in |
| S5 | `/changelog` | Verify entries align with shipped commits |
| S6 | Inbound links | `/help`, `/terms`, dashboard cards — quick sweep for stale claims |

## Steps

1. ✅ **Lock the structure** — Option A confirmed 2026-06-25.
2. Create Epic 1 in Jira + child tickets T1-T4.
3. Execute T1 → T2 → T3 → T4 each as its own branch + PR + merge cycle.
   (Pedro's standard cadence: small PR, CI green, squash-merge --admin,
   sync main, Jira to Done.)
4. After Epic 1 lands: pause, sanity check what landed, then create
   Epic 2 + stories S1-S6.
5. Execute Epic 2 story by story. Treatment for `/docs/mcp` (S3)
   re-decided just before that story kicks off, depending on the
   state of the MCP rebuild at that point.

## Out of scope (explicitly)

- The MCP rebuild itself.
- The dashboard restructure (already shipped).
- Pricing page restructure (separate, deferred).
- Any change to the engine, the API, or the OpenAPI spec itself.
  This is a docs-side accuracy pass only.

## Open questions

1. Structure: A, B, or C?
2. Are help / terms in scope, or strictly the `/docs/*` and
   `/methodology` + `/changelog` cluster?
3. MCP page treatment given the rebuild?
4. Coming-soon cards on api-reference — kill, restructure, or build out?
5. Should this run as one of Pedro's "polish & MCP" track items, or
   is it a separate stream?
