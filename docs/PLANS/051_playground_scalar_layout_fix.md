# Plan 051: Fix Playground Scalar layout — restore sidebar & fix scroll (/playground)

## Purpose (one sentence)

Restore the missing Scalar "Menu" sidebar and fix the non-scrolling docs pane on
`/playground`, both caused by the `layout: "classic"` + `showSidebar: false`
Scalar config, made visible by the recent Nav integration (AR-554/AR-555).

## JIRA

- Epic parent: **AR-441** (Playground → /playground Scalar surface).
- Story: **AR-555** — reopened (To Do, resolution cleared) and description
  rewritten to cover this fix (was previously Done, shipped the Nav integration
  that exposed this regression).
- Subtasks created under AR-555, one per plan step:

  | Step | Subtask | Working title |
  |---|---|---|
  | 51.1 | **AR-556** | Switch Scalar layout to "modern" to restore sidebar rendering |
  | 51.2 | **AR-557** | Fix scroll: stop fighting Scalar's page-scroll model |
  | 51.3 | **AR-558** | Responsive/regression pass across breakpoints (with Nav present) |
  | 51.4 | **AR-559** | Add regression test locking Scalar layout/showSidebar config |

- Planning branch: `plan/playground-scalar-layout-fix` (no JIRA number, per
  branch-naming convention). Implementation branch: `fix/AR-555-playground-scalar-layout`.
- Execution: short-lived branch cut directly off `main` (not a worktree) — small
  enough not to need Plan 047's worktree/wave workflow. `main` itself is never
  edited directly.
- **Sprint:** AR-555 is in **AR Sprint 6** (active, ends 2026-07-25); subtasks
  inherit the parent's sprint automatically (Jira: subtasks can't be assigned a
  sprint independently). Satisfies CLAUDE.md's sprint requirement.

## Steps (titles only — detailed interactively, one at a time)

| Step | Working title |
|---|---|
| 51.1 | Switch Scalar `layout: "classic"` → `"modern"` to restore sidebar rendering |
| 51.2 | Fix scroll: bound Scalar's content pane height under `modern` layout |
| 51.3 | Responsive/regression pass (mobile + desktop, with Nav present) |
| 51.4 | Tests (see Test Gates — TBD) |

---

## Context / root cause (verified)

- `apps/web/src/modules/developer-surface/index.tsx:61-62` sets
  `showSidebar: false` + `layout: "classic"` in the Scalar `configuration` object
  (introduced in commit `bcdad08`, attempting to fix an unrelated scroll issue).
- **Sidebar:** Scalar's compiled source only renders the sidebar block when
  `layout === "modern"` — `classic` mode has no sidebar branch at all, regardless
  of `showSidebar`.
- **Scroll:** in `classic` mode, Scalar's own CSS forces `.references-layout {
  min-height: 100dvh }` and `.references-rendered { height: initial !important;
  max-height: initial !important }` — i.e. unbounded growth, no internal scroll
  container. The app's `customCss` override in the same file (lines ~63) loses
  the specificity/`!important` fight against Scalar's scoped rules. Ancestor
  wrappers (`developer-surface.css`, `.developer-surface` / `.developer-surface__scalar`)
  use `overflow: hidden`, so the excess is clipped instead of scrolling.
- **Why it surfaced now:** before AR-554/555, `.developer-surface` was a plain
  `height: 100vh` div that happened to roughly match Scalar's forced
  `min-height: 100dvh`, masking the conflict. AR-554 added `<Nav>` above it;
  AR-555 changed `.developer-surface` to `flex: 1` (sharing 100vh with Nav) — the
  Scalar pane now gets less than 100vh while still internally demanding ≥100dvh,
  and the deficit is clipped rather than scrolled.

## Decisions (confirmed)

1. Layout: switch to `layout: "modern"`.
2. JIRA: reuse **AR-555**, reopened and rewritten by the user (manual Jira step —
   no tool access here).
3. Execution: short-lived branch off `main`, no worktree; `main` never edited
   directly.

---

## Step 51.1 — Switch Scalar `layout: "classic"` → `"modern"` (detailed)

**File:** `apps/web/src/modules/developer-surface/index.tsx`

```diff
-            showSidebar: false,
-            layout: "classic",
+            showSidebar: true,
+            layout: "modern",
```

Kept explicit (`showSidebar: true` rather than deleting the line) to match this
file's existing style of spelling out every Scalar flag rather than relying on
defaults.

**Why this is the whole step:** confirmed in Scalar's compiled source
(`ApiReference.vue.script.js`) that the sidebar-rendering branch is gated purely
on `layout === "modern"`; no other config in this file affects it. This is a
one-line-intent change (two lines touched), isolated from the scroll fix so each
lands as its own reviewable commit per repo convention.

**Expected outcome after this step alone:**
- Sidebar/Menu reappears on `/playground`.
- The scroll/clipping bug is **not** fixed yet — `layout: "modern"` changes
  Scalar's DOM/class structure (adds `.references-navigation`, mobile header,
  `--refs-sidebar-width` grid column) out from under the `customCss` overrides
  and `developer-surface.css` rules that were written against `classic`'s
  structure. Expected and tracked as Step 51.2 — do not try to fix scroll in
  this commit.

**Not touched in this step (deferred to 51.2):**
- `customCss` block in the same file (lines ~63) — its `.references-rendered`
  / `.scalar-app.scalar-api-reference` selectors target `classic`-era structure
  and need re-verifying against `modern`'s actual rendered DOM.
- `developer-surface.css` `.developer-surface` / `.developer-surface__scalar`
  `overflow: hidden` rules.

**Manual verification for this step:**
- Run web dev server, open `/playground`, confirm the Menu sidebar (endpoint
  list) renders on the left.
- No test suite currently asserts on Scalar's `layout`/`showSidebar` config or
  DOM structure (confirmed via grep across `apps/web` test/spec files) — no
  existing tests to update for this step.

---

## Step 51.2 — Fix scroll: stop fighting Scalar's page-scroll model (detailed)

**Root cause, confirmed by reading Scalar's shipped CSS (`vue-styles.css`) and
compiled component source directly** (not just the `classic`-mode bug from
51.1's investigation — this is a deeper architectural mismatch that affects
`modern` too):

- Scalar's `.references-layout` always sets `min-height: 100dvh` (both layouts).
  Its internal sticky elements — sidebar cards, code-example panels
  (`.endpoints-card`, `.operation-example-card`, `.examples`) — use
  `position: sticky; top: calc(var(--refs-viewport-offset) + 24px)` and
  `max-height: calc(var(--refs-viewport-height) - ...)`. This is the standard
  "page scrolls, sidebar/panels stick within it" pattern — Scalar expects to be
  embedded directly in a scrolling page, **not** wrapped in a fixed-height,
  `overflow: hidden` app-shell div.
- Our code currently does the opposite: `.developer-surface` and
  `.developer-surface__scalar` (`developer-surface.css`) both use
  `overflow: hidden` inside a `.playground-layout { height: 100vh }` shell. This
  clips Scalar's content instead of letting the page scroll — the customCss
  hacks added in commit `bcdad08` (`height: 100% !important` /
  `overflow-y: auto !important`) were fighting this same mismatch and lost, per
  Step 51.1's cascade-specificity analysis.
- Scalar exposes an official hook for exactly our situation (a custom header —
  the marketing `<Nav>` — sitting above it): `--scalar-custom-header-height`,
  which feeds into `--refs-header-height` → `--refs-viewport-offset` /
  `--refs-viewport-height`, the values its sticky elements size against. Nav's
  sticky footprint is a constant `52px` (`.oga-nav__row` in
  `design-v2/_shared/nav.css:123`; the announcement bar above it is a separate,
  non-sticky sibling per `nav.tsx:107-113`, so once scrolled it contributes 0px).

**Fix — let the page scroll; tell Scalar how much header sits above it:**

`apps/web/src/modules/developer-surface/developer-surface.css`:
```diff
 .developer-surface {
   display: flex;
   flex-direction: column;
   flex: 1;
   min-height: 0;
-  overflow: hidden;
 }

 .playground-layout {
-  height: 100vh;
+  min-height: 100vh;
   display: flex;
   flex-direction: column;
 }
```
```diff
 .developer-surface__scalar {
   flex: 1;
   min-height: 0;
-  overflow: hidden;
+
+  /* Nav (design-v2/_shared/nav.css .oga-nav__row) is sticky at 52px above this
+     surface — feed it to Scalar's supported custom-header-height hook so its
+     internal sticky sidebar/example panels offset correctly instead of
+     overlapping Nav. */
+  --scalar-custom-header-height: 52px;

   /* Map Scalar CSS vars to brand tokens */
```

`apps/web/src/modules/developer-surface/index.tsx` — remove the now-obsolete
(and actively harmful) scroll hack from `customCss`:
```diff
               a[href*="scalar.com"],
               a[href*="github.com/scalar"],
               .references-renderer-footer,
               .references-footer,
               [class*="info-block"] a { display: none !important; }
-
-              /* Fix right panel scrolling - target embedded Scalar container */
-              .developer-surface__scalar .scalar-app.scalar-api-reference {
-                height: 100% !important;
-                min-height: auto !important;
-              }
-              .developer-surface__scalar .references-rendered {
-                overflow-y: auto !important;
-              }
             `,
```
Also update the file's top comment (line ~24, "customCss: hides Scalar branding
links as defense-in-depth") — drop the stale "fix scrolling" framing tied to the
removed rules.

**UX consequence to flag (not a bug, a behavior change worth confirming):** the
branded local header (`.developer-surface__header` — "OneGoodArea / API
Playground" bar, from Plan 049.1) is not `position: sticky`. Today it happens to
stay visible only because content is clipped and nothing scrolls. Once the page
scrolls normally, this local header will scroll away with the content, leaving
just the global `<Nav>` stuck at top. I think that's fine (Nav already carries
the home link/branding this local header duplicates) — flag if you'd rather make
it sticky too.

**Manual verification for this step:**
- Dev server, `/playground`: scroll the page — Nav stays stuck at top; Menu
  sidebar and docs content scroll normally with no clipping; code-example panel
  keeps its own sticky/scroll behavior without visually overlapping Nav.
- Confirm no other route reuses `.playground-layout` / `.developer-surface` /
  `.developer-surface__scalar` classes (grep confirms these are scoped to
  `apps/web/src/app/playground/page.tsx` and the `developer-surface` module
  only) — safe to change without cross-page regressions.

---

## Step 51.3 — Responsive/regression pass (detailed)

**Nature of this step:** primarily manual verification, not new code — read Scalar's
mobile component source (`MobileHeader.vue.script.js`) to confirm the 51.2 fix
already covers mobile correctly, then QA across breakpoints. Only write code here
if that QA turns up a real break; nothing is pre-guessed.

**Confirmed by reading `MobileHeader.vue.script.js` (the `modern`-layout mobile
header/sidebar-toggle component):**
- Scalar's own mobile "Menu" toggle bar (separate from `<Nav>`'s hamburger) is
  `sticky top-(--scalar-custom-header-height,0)` — it reads the **exact same**
  CSS var set in Step 51.2 (`--scalar-custom-header-height: 52px`). So the fix
  already staged in 51.2 is what correctly stacks Scalar's mobile menu button
  below Nav, not something new needed here.
- On mobile, tapping that button expands the sidebar into an overlay with its
  own `overflow-y-auto` — self-contained, independent of our page-scroll changes.
- Desktop sidebar is `lg:hidden`/`hidden lg:flex` (Scalar's own Tailwind-based
  breakpoint, bundled in its prebuilt CSS — not controlled by our app's Tailwind
  config). `<Nav>`'s own hamburger breakpoint is `max-width: 720px`
  (`nav.css:578`). These two breakpoints are **not guaranteed to match exactly**
  — there may be a narrow width band (roughly 720–1024px) where Nav shows full
  desktop nav while Scalar has already switched to its mobile toggle, or vice
  versa. This is intrinsic to Scalar's shipped bundle, not something we control;
  flag during QA rather than trying to force the breakpoints to align.

**Known independent-but-adjacent interaction to sanity-check, not fix
preemptively:** `<Nav>`'s mobile drawer sets `document.body.style.overflow =
"hidden"` while open (`nav.tsx:100`) to lock background scroll, then restores it
on close. Before this plan, the page never scrolled anyway (that was the bug);
after 51.2, the page is the real scroll owner, so this lock/restore becomes
load-bearing for the first time. Also check z-index stacking if a user opens
Nav's drawer while Scalar's mobile menu happens to be open: `.oga-nav__drawer` /
`.oga-nav__backdrop` are z-index 55/60 (`nav.css:425,447`) vs Scalar's expanded
mobile sidebar at z-50 — Nav's drawer would render on top, which is acceptable
(not a crash, just draw order), but confirm it visually.

**Manual QA checklist for this step (dev server, `/playground`):**
- **Desktop (≥1024px):** sidebar + Nav both visible; scroll the page — Nav
  stays pinned, sidebar and content scroll correctly, no overlap (repeats
  51.2's check at this breakpoint specifically).
- **Narrow desktop / tablet band (~721–1024px):** watch for the Nav-vs-Scalar
  breakpoint mismatch called out above; note anything visually broken.
- **Mobile (≤720px):** Nav collapses to hamburger + drawer (body scroll locks
  while open, restores on close); Scalar's own "Open Menu" toggle appears
  directly under Nav and opens/closes its sidebar overlay correctly; page still
  scrolls normally with both closed.
- **After the pass:** if anything is actually broken, write it up as a new
  sub-step (51.3a, etc.) with the specific fix — do not speculate further here.

---

## Step 51.4 — Tests (detailed)

**Scope decision (confirmed with user):** no Playwright/browser e2e exists
anywhere in this repo (verified: no `playwright.config.*`, no dependency in any
`package.json`; `e2e/` at repo root only has a legacy `.mjs` script for the
retired rate-limit feature). Adding one is a separate, bigger scope decision —
out of scope here. Visual/functional proof (sidebar renders, page scrolls) stays
manual QA, already covered in 51.2/51.3. This step adds one cheap, high-value
regression test instead: lock the Scalar **config** so this exact regression
class (someone flips `layout`/`showSidebar` back) fails CI immediately.

**New file:** `apps/web/tests/unit/developer-surface.test.tsx`
(`// @vitest-environment jsdom`, RTL + `vi.mock`, matching the existing pattern
in `tests/unit/breadcrumb.test.tsx`.)

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { DeveloperSurface } from "@/modules/developer-surface";

let capturedConfig: Record<string, unknown> | undefined;

vi.mock("@scalar/api-reference-react", () => ({
  ApiReferenceReact: (props: { configuration: Record<string, unknown> }) => {
    capturedConfig = props.configuration;
    return null;
  },
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("<DeveloperSurface> Scalar config (AR-555)", () => {
  it("uses modern layout with the sidebar enabled", () => {
    render(<DeveloperSurface />);
    expect(capturedConfig?.layout).toBe("modern");
    expect(capturedConfig?.showSidebar).not.toBe(false);
  });
});
```

Note: `apps/web/src/modules/developer-surface/index.tsx` is **not** excluded
from the coverage config (`vitest.config.ts` only excludes `src/app/**`), so
this test also counts toward the existing 70%/70%/60%/70% thresholds rather
than being pure overhead.

**Verification for this step:**
- `cd apps/web && npm test -- developer-surface` — new test passes.
- `npm run typecheck` — clean.
- Confirm the test actually fails against the pre-fix config (`layout:
  "classic"`, `showSidebar: false`) before 51.1 lands, to prove it's a real
  regression guard and not a tautology — check this by running it against the
  branch state before the 51.1 commit.

---

## Out of scope

- Scalar branding/CTA lockdown (049), spec sync (046/048) — untouched by this fix.
