# Plan 059: Remove home icon from playground DeveloperSurface header

## Purpose

Remove the custom house SVG icon + "OneGoodArea" text linking to `/` from the
DeveloperSurface header in `/playground`. The Nav bar already provides site
navigation; this duplicate home button is unnecessary.

## JIRA

- **AR-606** — Task: "Remove home icon from playground DeveloperSurface header"

## Changes

### 59.1 — Remove home icon from DeveloperSurface

**File:** `apps/web/src/modules/developer-surface/index.tsx`
- Remove `import Link from "next/link"` (line 3) — no longer used
- Remove the `<Link href="/" ...>` block (lines 34-40): house SVG + `<span>OneGoodArea</span>`
- Keep `<span className="developer-surface__label">API Playground</span>`

### 59.2 — Remove dead CSS

**File:** `apps/web/src/modules/developer-surface/developer-surface.css`
- Remove `.developer-surface__home` and `.developer-surface__home:hover` rules (lines 30-44)

### 59.3 — Add regression test

**File:** `apps/web/tests/unit/developer-surface.test.tsx`
- Add test: `it("does not render a home link to /")` — asserts no `<a href="/">` in rendered output

## Verification

```bash
make web-test-container
```

## Git

- **Branch:** `docs/plans-multi-sprint` (long-lived planning branch)
- **Commit:** `docs: add plan 059 + remove playground home icon (AR-606)`
- **PR:** → `main`
