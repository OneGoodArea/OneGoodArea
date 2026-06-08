# AR-246 — Phase 0.5 Polish

**Status:** Done
**Merged:** `f5f174c` via PR [#151](https://github.com/OneGoodArea/OneGoodArea/pull/151) on 2026-06-07
**Phase:** 0.5 → 1 (polish bundle between primitive batch and dashboard build)
**Branch (deleted post-merge):** `feat/AR-246-phase-0-5-polish`

## What shipped

Two small polish items Pedro flagged after Phase 0.5 closed and before the dashboard build starts.

### Polish 1: Breadcrumb showcase icon coverage on resource leaves

Pedro: *"I noticed Lender bundle doesn't have emojis, and if it was Monitor/Signals/Intelligence bundle it wouldn't have it either. Saved queries / Lender pack also don't have icons. It has to be fixed for each product etc."*

**Revised icon discipline:** resource-level leaf items get the icon of their TYPE — same concept means same icon regardless of whether it's the category page or a specific resource page. The original Breadcrumb (AR-243) discipline said "leaf is resource name, no icon". Pedro pushed back — the canonical-icon vocabulary should be applied as broadly as possible.

Updated 4 showcase variants:
- **Intelligence chain:** `Saved queries` → QueryIcon · `Lender pack` → QueryIcon · `Q3 cohort comparison` → CohortsIcon
- **Bundles chain:** `Lender bundle` → BundlesIcon
- **Monitor portfolio chain (light):** `Acme — High street retail` → PortfolioIcon
- **Monitor portfolio chain (dark, chevron separator):** `BrightStar — Lender pack` → PortfolioIcon

All icons come from existing canonical sets (`Tabs-set bespoke` + `product-icons.tsx`). No invented inline glyphs per [[feedback-icons-and-canonical-assets]].

### Polish 2: FilterBuilder DropdownMenu was being click-blocked by subsequent sections

Pedro: *"the dropdown from FilterBuilder still so bad on top of other things, that when you click on something it clicks on something else, cos the filters is on top of things"*

**Root cause:** `<DropdownMenu>` rendered its panel inline as a sibling of the trigger. `.oga-filter-builder` had `isolation: isolate;` which creates a stacking context. The panel's `z-index: 60` applied ONLY within that trapped context — when the panel extended past the bottom of the card, the next showcase section (paint order later) sat OVER it, click-blocking it and visually overlapping.

**Two-part fix:**

1. **`<DropdownMenu>` now renders its panel via React Portal into `document.body`.** Escapes every parent stacking context — `isolation: isolate`, `transform`, `filter`, `will-change`, `opacity`, anything that creates one. The panel renders at the root stacking context where its `z-index: 9999` beats any unrelated page chrome.
   - Position computed from `triggerRef.current.getBoundingClientRect()` in viewport coords (`position: fixed`).
   - Reposition handlers on `resize` + `scroll` (capture phase — catches scrolls on ANY ancestor) keep the panel anchored to the trigger as the page moves rather than closing on scroll.
   - `useLayoutEffect` runs before paint so the panel sits in the right spot from the first frame (no flash).

2. **Removed `isolation: isolate` from `.oga-filter-builder`.** Belt + suspenders alongside the portal change; even without the portal the panel could escape this specific stacking context.

**Backwards-compatible:** every existing `<DropdownMenu>` consumer (org switcher, user menu, FilterBuilder pickers, DataTable row actions, sort selectors) gets the portal behavior for free. No API change. The trigger button + click-outside detection + keyboard nav still work as before.

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/dropdown-menu.tsx` — Added `createPortal` + position state + `useLayoutEffect` to track viewport coords from the trigger. Panel JSX wrapped in `createPortal(..., document.body)`.
- `apps/web/src/app/design-v2/_shared/dashboard/dropdown-menu.css` — New `.oga-dropdown__panel--portal` modifier that switches `position: absolute` → `fixed`, bumps `z-index: 60` → `9999`, resets `right` / `bottom` inherited from the non-portal `data-align` rules.
- `apps/web/src/app/design-v2/_shared/dashboard/filter-builder.css` — Removed `isolation: isolate` from the root. Also moved `overflow: hidden` → `border-radius: inherit` on the `::before` accent (carried from a fix earlier in the loop; the accent self-clips to the rounded card edge so the parent no longer needs `overflow: hidden`, which was also clipping the dropdown).
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Updated 4 Breadcrumb showcase variants to wire canonical icons on resource-level leaves.

## Decisions

- **React Portal over manually-managed z-index.** A z-index bump alone wouldn't help — the panel was inside a trapped stacking context, so its z-index applied only within the trap. The proper fix for ANY dropdown that might appear inside a styled card is to render it at the document body level. This is the standard pattern across React UI libraries (Radix, Mantine, MUI, etc.).
- **`position: fixed` with viewport coords, not absolute + body parent.** The portal renders into `document.body`, but `position: absolute` on a body child positions relative to the document (which scrolls). With `position: fixed` + viewport coords from `getBoundingClientRect()` + scroll-capture listener, the panel stays anchored to the trigger as the user scrolls or resizes.
- **Reposition rather than close on scroll.** A common dropdown pattern is to CLOSE on outside scroll. We chose to REPOSITION instead — the trigger stays visible, so the panel should stay open and anchored. Less surprising for the user.
- **`useLayoutEffect` over `useEffect`** for the position math. Layout effect runs before paint, so the panel renders at the correct position on the first frame. With `useEffect` there would be a brief flash where the panel renders at 0,0 then jumps to the correct spot.
- **No state reset in the layout effect.** The first version reset `setPanelPosition(null)` synchronously when `open` flipped to false. ESLint's `react-hooks/set-state-in-effect` flagged this as cascading-renders. The fix is to just not reset — stale `panelPosition` is fine because the render gate is `{open && panelPosition}`, so the portal stays unmounted while `open=false`. Next open recomputes.
- **Revised icon discipline (Polish 1).** The original AR-243 work log said "resource-name items omit icons since no canonical glyph exists for those concepts." Pedro pushed back: same concept = same icon, whether it's the category listing OR a specific resource instance. Updated the discipline. The new rule: a resource leaf gets the icon of its TYPE. Only items where the concept itself has no canonical glyph (free-form text labels, headings without a clear type) ship without icons.

## Stacked-merge handoff

While this branch was open, Marcos (Pedro's dad) merged two PRs to `main`:
- **PR #149** — AR-215 Makefile redesign (compose-down target, COVERAGE.md cleanup)
- **PR #150** — `middleware.ts → proxy.ts` rename for Next.js 16 convention + container fixes

Both touched scope orthogonal to AR-246 (Makefile / containers / `apps/web/src/middleware.ts`). Rebased twice during the loop; zero conflicts. The bigger lesson: trust the merge-tier separation between Marcos's ops/infra work and Pedro/AI design work — different folders, low conflict risk.

## Tests

No new tests — both changes are visual / structural:
- Polish 1 is showcase-only (no new primitive surface area)
- Polish 2 doesn't change the DropdownMenu's public API or behavior; existing dropdown-menu tests (covered by the AR-221 suite) continue to pass

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **455/455 passing** (no change vs main) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-07
- Iteration cycles: 2 (overflow:hidden fix didn't solve the click-block issue → switched to portal)
  1. **v1** — removed `overflow: hidden` from FilterBuilder + added `border-radius: inherit` on ::before. Pedro: *"mate the dropdwon from filterbuilder still so bad on top of other thngs, that when u click on something it clicks on somethign else"*
  2. **v2 (shipped)** — diagnosed `isolation: isolate` as the real culprit + switched DropdownMenu to portal rendering. Pedro: *"yeah it's better"*

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 3 commits on the branch:
- AR-245 work log carry-forward
- Polish 1 (Breadcrumb showcase icons)
- Polish 2 (DropdownMenu portal + FilterBuilder isolation removal)

Branch deleted on merge. Rebased twice mid-loop onto Marcos's two main merges; both clean.

## Follow-ups

- **Browser-edge collision handling on DropdownMenu** — the original AR-221 noted this was deferred ("every dashboard surface that uses this has predictable container widths"). With the portal change, the panel CAN now extend past the viewport edge if the trigger is near the right/bottom. Worth revisiting when a real consumer hits the case — add `clientWidth/clientHeight` bounds checks to the position math.
- **Panel exit animation** — currently the portal panel unmounts immediately when `open` flips to false. The original inline version had an animation; portal panel uses the same CSS animation on mount but no exit transition. Acceptable for v1; revisit if the snap feels jarring.
- **Phase 1 starts next: AR-217-B1 Sidebar reorganisation + dashboard rebuild.** The 8 Phase 0.5 primitives + 2 polish items are all in main and ready to consume.
