# Plan 007: Documentation Organization & Navigation Structure

**Date:** 2026-05-28  
**Plan Number:** 007  
**Status:** Draft / Awaiting Approval  
**Prepared for:** Team review + implementation roadmap

---

## 🚨 RED LINE — GOLDEN RULE (Rule 7 from CLAUDE.md)

### **NEVER modify `main` or `master` directly. ALWAYS create a dedicated feature branch first.**

**Non-negotiable during ALL implementation phases:**

1. **Before ANY code changes:** `git checkout -b docs/documentation-organization` (or appropriate feature branch)
2. **Every commit:** Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer
3. **Before merge:** Create a PR against `main`, get review, squash-merge with Conventional Commit title
4. **Branch naming:** `docs/documentation-organization` or `chore/test-artifacts-restructure` per `CLAUDE.md`

**If this rule is violated again, the entire work reverts + restarts on a proper branch.**

---

## 1. Problem Statement

OneGoodArea has **two separate organization issues:**

### 1.1 Documentation Scattered Across 8+ Locations

Makes it difficult for newcomers and auditors to build a mental model:

- **System architecture** → `docs/SYSTEM-OVERVIEW.md` (excellent but monolithic, 200+ lines)
- **Architectural decisions** → `docs/adr/0001-0034.md` (34 ADRs, no index)
- **Engineering rules** → `CLAUDE.md` + `.antigravitycli/instructions.md` (duplicated)
- **Workflow rules** → `CLAUDE.md` (hidden from main nav)
- **Implementation plans** → `plan/` directory (ad-hoc, not indexed)
- **Deployment** → `docs/DEPLOY.md` (exists but may drift from reality)
- **Local dev** → `README.md` (buries dev setup in 217-line file)
- **API reference** → Scattered `/v1/*` across code; Scalar renders at `/docs/api-reference`

**Current discovery pattern:**
1. New developer reads README → incomplete, branches to multiple files
2. Operator needs "how to refresh signals" → must grep across `scripts/`, `docs/`, `apps/api/src/`
3. B2B evaluator needs API docs → finds `/docs/api-reference` on live site, but no local markdown
4. Stakeholder wants to understand design decisions → must read 34 ADRs unsorted

### 1.2 Test Artifacts & Resources Misplaced at Repo Root

**Current state:**
- `test-reports/` (428KB) — Generated JUnit XML + JSON from vitest runs
- `tests_files/` (312KB) — Manual test documentation (.md) + HTTP test files (.http)
- `.gitignore` line 27 references `/test_reports` (lowercase, one underscore)—doesn't match `tests_files`

**Problems:**
- Generated artifacts live in repo root, cluttering the structure
- Not consistently ignored (only one directory referenced in `.gitignore`)
- Test documentation + resources are mixed in one folder
- No workspace-scoped test organization (unlike docs, apps, packages)
- `vitest.config.ts` doesn't specify output paths for reports; they may end up in root by default

---

## 1.3 Proposed Fix for Test Artifacts

**Desired structure:**
```
tests/                              [NEW: Top-level test resources]
├── README.md                       [Test strategy + how-to]
├── manual/                         [Manual test plans + documentation]
│   ├── TESTS-README.md
│   ├── test-plan.md
│   ├── qa-browser-test-plan.md
│   └── ...other .md files
├── http/                           [HTTP test files for API testing]
│   ├── area-iq-api-tests.http
│   └── ...other .http files
└── bugs/                           [Known issues tracking]
    └── bugs-to-solve.md

.artifacts/                         [NEW: Generated test/build artifacts (ignored)]
├── test-reports/                  [Generated JUnit, JSON, coverage reports]
│   ├── junit_*.xml
│   ├── results_*.json
│   └── coverage/
└── (other build outputs in future)

apps/api/
├── vitest.config.ts               [Updated to output to ../.artifacts/test-reports/api/]
├── src/test/
│   ├── setup.ts
│   └── fixtures/
└── ...

apps/web/
├── vitest.config.ts               [Updated to output to ../.artifacts/test-reports/web/]
├── src/tests/
└── ...

.gitignore                          [Updated]
├── /.artifacts/
├── /tests/manual/ (optional if using git-lfs)
```

**Actions required:**
- [ ] Create `tests/` directory hierarchy for resources + documentation
- [ ] Create `.artifacts/` directory (git-ignored) for generated files
- [ ] Update `vitest.config.ts` in both `apps/api` and `apps/web` to output to `.artifacts/test-reports/{api|web}/`
- [ ] Update `.gitignore` to ignore `/.artifacts/` cleanly
- [ ] Move existing test files from `test-reports/` → `.artifacts/test-reports/` (will be regenerated)
- [ ] Move existing test resources from `tests_files/` → `tests/`
- [ ] Delete old directories (no longer needed)
- [ ] Commit restructuring + config changes

**Outcome:** Clean repo root, test outputs out of git, resources properly organized + searchable.

---

## 2. Proposed Solution: Three-Tier Documentation Hierarchy

Reorganize `docs/` as **tier + topic**, each tier with its own README, following these principles:

### 2.1 Searchability First
- All docs named with **consistent intent** (UPPER-SNAKE-CASE): `GETTING-STARTED`, `LOCAL-SETUP`, `SIGNAL-REFRESH` (not `setup`, `start`, `refresh`)
- One job per doc: each file answers ONE question completely
- No file > 80 lines; link out for related topics
- Create `docs/HOME/INDEX.md` and `docs/HOME/GLOSSARY.md` for phrase search

### 2.2 Audience-Aware Navigation
- Top-level `docs/HOME/README.md` branches by role: "I'm a developer → see GETTING-STARTED"; "I'm an operator → see OPERATIONS"
- Each tier has its own `README.md` (e.g., `docs/ARCHITECTURE/README.md`, `docs/OPERATIONS/README.md`)
- Breadcrumb links throughout

### 2.3 Live Documentation
- Every doc references the code it describes (e.g., `apps/api/src/modules/intelligence/planner.ts`)
- ADRs link to follow-up ADRs (dependency chain)
- Cron jobs link to actual scripts

### 2.4 Backward Compatibility
- Keep `SYSTEM-OVERVIEW.md` unchanged (live prod snapshot; stakeholder trust)
- Move files → old links still work via git history
- Add "See updated guidance at X" to outdated docs

---

## 3. New Directory Structure

```
docs/
├── README.md                          [ROOT: Triage by audience + quick-start]
├── GETTING-STARTED.md                 [NEW: 5-min onboard]
├── CLAUDE.md                          [source of truth]
├── GLOSSARY.md                        [NEW: Searchable domain terms + cross-references]
├── INDEX.md                           [NEW: "How do I X?" → document map]
│
├── ARCHITECTURE/                      [NEW: System design, products, data layer, deployments]
│   ├── README.md                      [Overview + TOC of all architecture docs]
│   ├── SYSTEM-OVERVIEW.md             [EXISTING: Keep unchanged — mental model snapshot]
│   ├── PRODUCTS.md                    [NEW: Extract §3 from SYSTEM-OVERVIEW]
│   ├── DATA-LAYER.md                  [NEW: Signal store + time-series + schema]
│   ├── QUERY-PLANE.md                 [NEW: Intelligence layer + typed grammar]
│   └── DEPLOYMENTS.md                 [MOVE from DEPLOY.md: Render + Vercel architecture]
│
├── OPERATIONS/                        [NEW: Runbooks for everyday tasks]
│   ├── README.md                      [Index of operational tasks]
│   ├── LOCAL-SETUP.md                 [NEW: Develop locally (moved from README)]
│   ├── DATABASE-MIGRATIONS.md         [NEW: How to run/write migrations]
│   ├── SIGNAL-REFRESH.md              [NEW: Cron jobs — deprivation, property, crime, timeseries]
│   ├── MONITORING.md                  [NEW: Health checks, error handling, observability]
│   └── TROUBLESHOOTING.md             [NEW: Common issues + solutions]
│
├── API-REFERENCE/                     [NEW: API organized by product + examples]
│   ├── README.md                      [Quick reference + structure]
│   ├── ENDPOINTS-BY-PRODUCT.md        [Signals, Scores, Monitor, Intelligence]
│   ├── AUTHENTICATION.md              [API keys, JWT, session auth]
│   ├── ERRORS.md                      [Error codes + handling patterns]
│   └── EXAMPLES.md                    [cURL / Node / Python snippets per product]
│
├── DECISIONS/                         [REORGANIZED: ADRs + index]
│   ├── README.md                      [NEW: ADR index by category + timeline]
│   ├── 0001-*.md through 0034-*.md    [EXISTING: No changes]
│   └── DECISION-LOG.md                [NEW: Timeline of major decisions]
│
├── ENGINEERING/                       [NEW: Code-level guidance]
│   ├── README.md                      [Philosophy + quality gates]
│   ├── CODE-STYLE.md                  [Extracted from CLAUDE.md]
│   ├── TESTING-STRATEGY.md            [Test counts, fixtures, patterns]
│   ├── GOLDEN-TESTS.md                [Scoring engine golden-tests + pattern]
│   └── PERFORMANCE.md                 [Benchmarks, optimization notes]
│
├── DEPLOY.md                          [DEPRECATED: "See ARCHITECTURE/DEPLOYMENTS.md"]
├── adr/                               [EXISTING: Keep folder structure]
│   ├── 0001-*.md
│   ├── ...
│   ├── 0034-*.md
│   └── README.md                      [NEW: ADR index by category]
│
└── (other existing files unchanged)
```

---

## 4. File Content Sketches (What Moves Where)

### 4.1 Extract from Current README (217 lines)
- **Lines 47–69:** Repo layout → `docs/ARCHITECTURE/README.md`
- **Lines 73–87:** Stack table → `docs/ARCHITECTURE/SYSTEM-OVERVIEW.md` already has this; link to it
- **Lines 148–193:** Local dev → `docs/OPERATIONS/LOCAL-SETUP.md`
- **Lines 105–116:** API surface → `docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md`
- **Lines 89–102:** Data sources → `docs/ARCHITECTURE/DATA-LAYER.md`
- **Lines 17–44:** "Why it's different" + "Audiences" → `docs/HOME/GETTING-STARTED.md`

### 4.2 Extract from CLAUDE.md & .antigravitycli/instructions.md
- **Line 18 (CLAUDE.md):** Plan storage rule → `CLAUDE.md` (already captured)
- **Lines 1–16 (CLAUDE.md):** Interaction model → `docs/ENGINEERING/CODE-STYLE.md` (philosophy)
- **Lines 20–30:** Tooling priority → `docs/ENGINEERING/CODE-STYLE.md`
- **Lines 35–47:** Git rules → `CLAUDE.md`
- **Lines 51–66:** Safety rules → `docs/ENGINEERING/CODE-STYLE.md` (Safety section)
- **Lines 70–78:** Engineering philosophy → `docs/ENGINEERING/CODE-STYLE.md`
- **Duplicate in .antigravitycli:** Mark as deprecated; link to CLAUDE.md

### 4.3 New GLOSSARY.md (Searchable)
Terms: LSOA, MSOA, LAD, ONS, NSPL, IMD, moat, percentile, confidence, signal_store, golden-test, engine_version, deterministic, RBAC, Levers, time-series, CRON_SECRET, OpenAPI

Example entry:
```markdown
## LSOA (Lower Super Output Area)
UK census geography: ~1,500 people per LSOA; 43,916 across England, Wales, Scotland.
Used as the atomic grain for OneGoodArea's signal store.
See: [ONS NSPL spine](https://geoportal.statistics.gov.uk)
```

### 4.4 New INDEX.md (Phrase Search)
```markdown
| Question | Answer |
|----------|--------|
| How do I develop locally? | [docs/OPERATIONS/LOCAL-SETUP.md](./OPERATIONS/LOCAL-SETUP.md) |
| How do I refresh signals? | [docs/OPERATIONS/SIGNAL-REFRESH.md](./OPERATIONS/SIGNAL-REFRESH.md) |
| What's the signal store schema? | [docs/ARCHITECTURE/DATA-LAYER.md](./ARCHITECTURE/DATA-LAYER.md) |
| How does the query planner work? | [docs/ARCHITECTURE/QUERY-PLANE.md](./ARCHITECTURE/QUERY-PLANE.md) |
| What are the products? | [docs/ARCHITECTURE/PRODUCTS.md](./ARCHITECTURE/PRODUCTS.md) |
| ...etc (50+ entries) | |
```

---

## 5. Implementation Phases

### Phase 0: Test Artifact Restructuring (2–3 hours) — **PREREQUISITE**
- [ ] **create-.artifacts-dir:** Create `.artifacts/` directory (git-ignored)
- [ ] **create-tests-dir:** Create `tests/` directory with `manual/`, `http/`, `bugs/` subdirs
- [ ] **move-test-resources:** Move `.md` + `.http` files from `tests_files/` → `tests/`
- [ ] **update-vitest-api:** Modify `apps/api/vitest.config.ts` to output to `../../.artifacts/test-reports/api/`
- [ ] **update-vitest-web:** Modify `apps/web/vitest.config.ts` to output to `../../.artifacts/test-reports/web/`
- [ ] **update-.gitignore:** Add `/.artifacts/`, update `/test_reports` → fix reference
- [ ] **remove-old-dirs:** Delete `test-reports/` + `tests_files/` (artifacts will regenerate; docs now in `tests/`)
- [ ] **verify-runs:** Run `npm test` and confirm reports output to `.artifacts/test-reports/`

**Why first:** Cleaning up root directory makes doc org easier; avoids confusion in new structure.

### Phase 1: Audit & Plan (1–2 hours)
- [ ] **audit-docs:** List all docs, identify duplicates, broken links, outdated content
- [ ] **term-inventory:** Collect glossary terms + definitions
- [ ] **audience-personas:** Map "who reads what" (developer vs operator vs stakeholder)
- [ ] **confirm-scope:** Confirm with Pedro: glossary source of truth? API reference live or local? Docsite?

### Phase 2: Create New Tiers (4–6 hours)
- [ ] **create-arch-tier:** `docs/ARCHITECTURE/` + extract PRODUCTS, DATA-LAYER, QUERY-PLANE
- [ ] **create-ops-tier:** `docs/OPERATIONS/` + move LOCAL-SETUP, add migrations/refresh runbooks
- [ ] **create-api-tier:** `docs/API-REFERENCE/` + organize endpoints by product

### Phase 3: Create Index & Glossary (2–3 hours)
- [ ] **create-glossary:** `docs/HOME/GLOSSARY.md` (50+ terms, grep-friendly)
- [ ] **create-index:** `docs/HOME/INDEX.md` (phrase search map)

### Phase 4: Restructure & Rewrite (3–4 hours)
- [ ] **rewrite-readme:** Simplify `docs/HOME/README.md` to navigation + quick-start
- [ ] **update-engineering-docs:** Extract CLAUDE.md → `docs/ENGINEERING/CODE-STYLE.md`
- [ ] **add-deprecation-notices:** Mark old docs with "See X for updated guidance"

### Phase 5: Validate & Publish (2–3 hours)
- [ ] **link-audit:** Grep for broken markdown links, test resolution
- [ ] **deadlink-scan:** Find docs referencing old file paths/APIs
- [ ] **test-onboard:** Fresh clone, follow GETTING-STARTED → LOCAL-SETUP; measure friction
- [ ] **git-commit:** Create `docs/` branch, commit per tier, squash-merge with clear title

**Total effort:** Phase 0 (2–3h) + Phases 1–5 (~16–20h) = **~20–25 hours**; can be parallelized within each phase.

---

## 6. Naming Convention

All docs use **UPPER-SNAKE-CASE** for consistency:
- ✅ `GETTING-STARTED.md`, `LOCAL-SETUP.md`, `SIGNAL-REFRESH.md`
- ❌ `getting_started.md`, `setup.md`, `refresh.md`

Cross-references: `[See CLAUDE.md](../CLAUDE.md)` or `[See docs/OPERATIONS/LOCAL-SETUP](./OPERATIONS/LOCAL-SETUP.md)`

---

## 7. Open Questions for Pedro

Before starting Phase 0, confirm:

1. **Test output locations:** Should workspace-scoped reports live in `.artifacts/test-reports/{api|web}/` or all in one `.artifacts/test-reports/`?
2. **Coverage reports:** Should `coverage/` be in `.artifacts/` or published separately to a doc site?
3. **HTTP test files:** Should these live in `tests/http/` or inside each workspace (apps/api/tests/http/)?
4. **Manual test docs:** Keep in `tests/manual/` or move to `docs/TESTING/`?

---

## Original Open Questions (Documentation)

5. **Glossary:** Should it be one searchable doc, or inline where terms first appear?
6. **API reference:** Is Scalar doc at `/docs/api-reference` the source of truth, or should we have markdown versions in repo?
7. **Audience priority:** Which persona matters most? (New dev / Operator / B2B evaluator / Board?)
8. **Docsite:** Future plan to migrate to Docusaurus/Nextra, or keep as git markdown?
9. **Live sync:** Auto-generate anything (ADR index, glossary) or hand-written?
10. **Timeline:** Implement all phases at once, or one tier per sprint?

---

## 8. Win Conditions

- ✅ **Discoverability:** `grep -r "how to X" docs/ | head -3` → answer found in <2 files
- ✅ **Onboarding:** Fresh contributor starts at `docs/HOME/GETTING-STARTED.md`, finds everything in breadcrumbs
- ✅ **Audit trail:** ADRs + decision log make reasoning transparent; linked to code
- ✅ **Ops clarity:** Operator finds "how to refresh signals" + exact command in <1 minute
- ✅ **API clarity:** API docs live next to examples; no "figure it out from code"
- ✅ **Glossary:** Domain terms searchable + defined once; consistent use everywhere
- ✅ **Maintenance:** New docs/ADRs/runbooks update one file each; TOC auto-stays fresh

---

## 9. Dependencies & Constraints

- **No deletions:** Move files, don't delete. Keep git history.
- **Backward compat:** Old doc links still work (git history + README redirects)
- **Live snapshot:** SYSTEM-OVERVIEW.md is the source of truth for deployed state; don't refactor
- **Code references:** All docs must cite actual file paths; grep to verify before committing
- **One branch:** Create `docs/` branch; all changes PR-based, reviewed before merge

---

## 10. Notes & Assumptions

- Assumes Neon Postgres, Render (api), Vercel (web), GitHub Actions CI, Sentry monitoring
- SYSTEM-OVERVIEW.md is up-to-date as of 2026-05-27; restructure should not change its content
- ADRs 0001–0034 are correct and complete; no need to edit, only index
- CLAUDE.md is the source of truth for engineering rules; `.antigravitycli/instructions.md` is a duplicate that should be deprecated
