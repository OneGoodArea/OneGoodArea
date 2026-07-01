# Plan 034 — docs/ directory cleanup

**Status:** In progress
**JIRA:** AR-431
**Branch:** rearrange-dirs
**Owner:** Pedro / Claude
**Started:** 2026-07-01

## Purpose

Clean up the internal `docs/` markdown directory so it holds only
**summarized references and decisions with reasoning** — no "romances/
books", no non-document files, no oversized multi-section docs, and no
stale/mismarked deprecations. Every large doc gets split into smaller
linked docs; every DEPRECATED marker is verified.

This is distinct from **Plan 027** (docs accuracy sweep), which covers
the customer-facing `/docs/*` web pages under `apps/web`. Plan 034 is
purely the repo `docs/` folder.

## Findings basis

Four read-only audits (DECISIONS, TESTING+test-cases, DESIGN, core dirs)
produced the concrete file list below. Key product context: **reports
(AR-324) and the widget (AR-379) were killed**; the API is now
`/v1`+MCP-centric — so a lot of the test material tests dead surfaces.

## Decisions locked (2026-07-01)

- Genuinely-superseded `DEPRECATED-*` files → **move to `docs/ARCHIVE/`**
  (not deleted; git already keeps history, ARCHIVE keeps them findable).
- Non-document files (`.http`, `.mjs`) → **move to top-level `scripts/`**
  (already the home of `api-test-suite.sh`, `check-*.mjs`).
- `test-plan.md` (3000L) → **archive + rebuild fresh** per-surface test
  docs against the current `/v1`+MCP product.
- Workflow: write this plan, then implement in the same session; one
  logical change per commit.

## Steps

### Phase A — Structural moves (mechanical)

1. Create `docs/ARCHIVE/` with a short README explaining what it is.
2. Move non-docs to top-level `scripts/`:
   - `docs/TESTING/scripts/e2e-2026-07-01.mjs` → `scripts/`
   - `docs/TESTING/http/area-iq-api-tests.http` → `scripts/http/`
     (keep the REST Client copy; move the redundant httpyac variant too
     but flag it in the http README).
   - Remove now-empty `docs/TESTING/scripts/` and `docs/TESTING/http/`.
3. Move genuinely-superseded deprecated files → `docs/ARCHIVE/`:
   - `TESTING/manual/DEPRECATED-tests-automated.md` (1891)
   - `TESTING/manual/DEPRECATED-test-plan-pathways.md` (1474)
   - `TESTING/manual/DEPRECATED-qa-browser-test-plan.md` (242)
   - `test-cases/DEPRECATED-auth-test-cases-{NOT-TESTED,updated,NOK}.md`
   - `OPERATIONS/DEPRECATED-CONTAINERS-SETUP.md` (26, typo dup)
   - `DESIGN/DEPRECATED-AR-204-methodology-docs-delta.md` (401, shipped)
4. Move disposable dated run-logs → `docs/ARCHIVE/`:
   - `TESTING/api-end-to-end-2026-06-08.md`
   - `TESTING/api-end-to-end-2026-06-12.md`
   - `TESTING/icp-end-to-end-2026-06-30.md`

### Phase B — Rescue wrongly-marked deprecated files

5. `DESIGN/DEPRECATED-dashboard-proposal.md` → rename back to
   `dashboard-proposal.md` (still the live source spec; phases 1–5
   unbuilt). Fix inbound links in `DECISIONS/0036`, `ARCHITECTURE/
   DATA-SOURCES.md`, `plan/016`, `DASHBOARD/README`, `DESIGN/README`.
6. `docs/DEPRECATED-CONTAINERS-local-dev-setup.md` → move to
   `OPERATIONS/LOCAL-CONTAINERS.md`, un-deprecate, make it the local
   compose-stack SSOT. Fix compose-filename refs elsewhere.
7. `ENGINEERING/DEPRECATED-CODE-STYLE.md` → rename back to
   `CODE-STYLE.md`; add to `ENGINEERING/README`; fixes the live links
   from `GETTING-STARTED.md` and `TESTING-STRATEGY.md`.
8. `DESIGN/DEPRECATED-AR-248-onboarding-proposal.md` → fix the
   deprecation reason (real cause = superseded 4-intent taxonomy vs
   shipped 5-ICP model), keep deprecated → ARCHIVE.

### Phase C — Split / compress the "books"

9. `DESIGN/AR-204-product-pages-spec-pack.md` (932) → split into
   `spec-signals.md`, `spec-scores.md`, `spec-monitor.md`,
   `spec-intelligence.md` + index; compress 20 ICP narratives to a
   one-line-per-ICP table.
10. `DESIGN/AR-204-app-redesign.md` (295) → collapse §14 change-log to
    one-line rows (date · PR · what shipped · SHA).
11. `ARCHITECTURE/DATA-SOURCES.md` (190) → keep the current-state table
    as reference; move the roadmap/strategy essay to a new ADR.
12. `DECISIONS/0037` (400) → strip the ops runbook + sub-ticket/commit
    trail; keep the durable decisions. Split if still multi-decision.
13. `DECISIONS/0034` (231) → split white-label vs IP-allowlist.
14. `DECISIONS/0027`–`0034` → strip "Proven on prod" QA runbooks +
    transient test-count status lines (recurring cruft).
15. `TESTING/manual/completed-test-tickets.md` &
    `TESTING/bugs/bugs-to-solve.md` → compress ticket-prose to tables.
16. `DESIGN/DASHBOARD/` component logs → trim repeated Process-note /
    Pedro-approval boilerplate (esp. `AR-230_data_table.md`).

### Phase D — Fix links, indexes, logs

17. Fix broken links: `adr/` → `DECISIONS/` (GLOSSARY, PROD-CONTAINER-
    CHECKLIST, CONTAINERS), `dashboard-proposal` path, `container-
    compose.yml` → `compose/compose.yml`, GLOSSARY "35" → "37" ADRs.
18. `DECISIONS/DECISION-LOG.md` → add 0035/0036/0037; fix duplicate
    "See also" link.
19. `DECISIONS/README.md` → shorten multi-line title column to one line.
20. `DESIGN/DASHBOARD/README.md` → populate the Index (17 logs);
    `DESIGN/README.md` → add a `DASHBOARD/` link.
21. `DECISIONS/0002` → add "extended by" note listing later schema ADRs
    (0024/0027/0029/0030/0031/0032/0034) so the "7 tables" claim isn't
    read as current.
22. `TESTING/README.md` vs `TESTING/manual/TESTS-README.md` → resolve
    the single-source-of-truth contradiction; drop dangling
    `tests-automated.md` pointer.

### Phase E — Rebuild fresh test docs

23. Establish `docs/test-cases/*.md` (per-surface, "Engine vX") as the
    testing SSOT. Archive `test-plan.md` + `tests-manual.md` +
    `TESTS-README.md` to `docs/ARCHIVE/`.
24. Build fresh per-surface test docs against the current `/v1`+MCP
    surface (auth, keys, billing/usage, areas/query, scores, monitor,
    intelligence, MCP). This is the substantive deliverable and may run
    as its own follow-up if scope grows.

## Out of scope

- The customer-facing `/docs/*` web pages (Plan 027 / AR-354).
- Any engine / API / OpenAPI changes.
- Rewriting ADR reasoning content (only trimming cruft, not decisions).

## Commit strategy

One logical change per commit, roughly per step / step-group:
moves (A), rescues (B), each split (C), link+index fixes (D), test
rebuild (E). Keep diffs reviewable.
