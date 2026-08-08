# Plan 013 — Code Coverage Reporting

**JIRA:** AR-209  
**Branch:** `feat/AR-209-code-coverage`  
**Status:** PROPOSED

---

## 1. Context

Coverage infrastructure is partially in place:

| Package              | Coverage config | `test:coverage` script | Reports dir |
|----------------------|:--------------:|:---------------------:|-------------|
| `apps/web`           | ✅ v8, thresholds | ✅ `vitest run --coverage` | `.artifacts/test-reports/coverage/web` |
| `apps/api`           | ❌              | ❌                     | — |
| `packages/contracts` | ❌              | ❌                     | — |

The root `package.json` `test:coverage` script only runs `apps/web`.  
The Makefile has no coverage targets.  
`@vitest/coverage-v8` is already in root `devDependencies` (v4.1.6).  
`.artifacts/` is already gitignored.

---

## 2. Goal

Full, consistent code coverage across all three packages with:

- A single `make coverage` command that runs all packages and tells you where to find the HTML reports.
- Per-package commands (`make coverage-api`, `make coverage-web`, `make coverage-contracts`) for targeted runs.
- Sensible initial thresholds (fail loudly, but not impossibly high on day one).
- Coverage reports in `.artifacts/test-reports/coverage/{api,web,contracts}/` (consistent with existing web path and Plan 007 conventions).
- Documentation: one section in the operational docs explaining where reports live and how to read them.

---

## 3. Thresholds rationale

| Package | lines | functions | branches | statements | Rationale |
|---------|------:|----------:|---------:|-----------:|-----------|
| `apps/api` | 70 | 70 | 60 | 70 | Mirrors web. API has 575 passing tests; some modules partially covered. Start permissive, tighten per sprint. |
| `apps/web` | 70 | 70 | 60 | 70 | Already set — do not change. |
| `packages/contracts` | 90 | 90 | 80 | 90 | Contracts are pure Zod schemas; existing tests already cover most branches. Higher bar is achievable. |

`reportOnFailure: true` on all packages so you can see the coverage map even when a threshold is missed.

---

## 4. Implementation — 5 commits

### Commit 1 — `apps/api`: add coverage config and script

**File:** `apps/api/vitest.config.ts`

Add a `coverage` block inside `test`:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  reportOnFailure: true,
  reportsDirectory: "../../.artifacts/test-reports/coverage/api",
  include: ["src/**/*.ts"],
  exclude: [
    "tests/**",
    "src/**/*.d.ts",
    "src/scripts/**",   // bootstrap utilities, not business logic
    "src/infrastructure/db/migrate.ts",  // one-shot CLI runner
    "node_modules/**",
  ],
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70,
  },
},
```

**File:** `apps/api/package.json`

Add script:
```json
"test:coverage": "vitest run --coverage"
```

---

### Commit 2 — `packages/contracts`: add coverage config and script

**File:** `packages/contracts/vitest.config.ts`

Add a `coverage` block inside `test`:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  reportOnFailure: true,
  reportsDirectory: "../../.artifacts/test-reports/coverage/contracts",
  include: ["src/**/*.ts"],
  exclude: [
    "tests/**",
    "src/**/*.d.ts",
    "node_modules/**",
  ],
  thresholds: {
    lines: 90,
    functions: 90,
    branches: 80,
    statements: 90,
  },
},
```

**File:** `packages/contracts/package.json`

Add script:
```json
"test:coverage": "vitest run --coverage"
```

---

### Commit 3 — Root `package.json`: extend `test:coverage` to all workspaces

Change:
```json
"test:coverage": "npm run test:coverage -w @onegoodarea/web"
```
To:
```json
"test:coverage": "npm run test:coverage --workspaces --if-present"
```

This runs `apps/web`, `apps/api`, and `packages/contracts` in sequence.

---

### Commit 4 — Makefile: add coverage targets

Add to `Makefile` (and `.PHONY`):

```make
# --- coverage targets ---------------------------------------------------
coverage: coverage-api coverage-web coverage-contracts
	@echo ""
	@echo "  Coverage reports written to:"
	@echo "    .artifacts/test-reports/coverage/api/index.html"
	@echo "    .artifacts/test-reports/coverage/web/index.html"
	@echo "    .artifacts/test-reports/coverage/contracts/index.html"
	@echo ""

coverage-api:
	npm run test:coverage -w @onegoodarea/api

coverage-web:
	npm run test:coverage -w @onegoodarea/web

coverage-contracts:
	npm run test:coverage -w @onegoodarea/contracts
```

Add to `make help` under the `── Checks ──` section:
```
  coverage                  run coverage for all packages (api, web, contracts)
  coverage-api              coverage for apps/api only
  coverage-web              coverage for apps/web only
  coverage-contracts        coverage for packages/contracts only
```

---

### Commit 5 — Documentation

**New file:** `docs/operations/COVERAGE.md`

Content covers:
- How to run coverage (`make coverage`, `make coverage-api`, etc.)
- Where HTML reports land (`.artifacts/test-reports/coverage/{api,web,contracts}/index.html`)
- How to open: `open .artifacts/test-reports/coverage/api/index.html` (macOS) / `xdg-open ...` (Linux)
- Threshold policy (what the current minimums are and how to tighten them)
- Note: `.artifacts/` is gitignored — reports are local-only

**Update** `docs/operations/README.md` (or equivalent index) to link to `COVERAGE.md`.

---

## 5. Verification

After each commit, run the relevant `make coverage-*` target and confirm:

1. No new test failures.
2. Coverage report appears at the expected `.artifacts/` path.
3. Text summary prints to the terminal.
4. HTML report is browsable.

After Commit 4, `make coverage` runs all three in sequence and prints the path summary.

---

## 6. Out of scope

- CI upload of coverage artifacts (follow-on plan — needs CI pipeline design first).
- Coverage badges in README (after CI integration).
- Merging coverage across workspaces into a single report (monorepo merge is complex; deferred).
- Raising thresholds above the initial values set here — done incrementally per sprint.
