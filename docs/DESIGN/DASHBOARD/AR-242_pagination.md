# AR-242 — &lt;Pagination&gt;

**Status:** Done
**Merged:** `b879426` via PR [#145](https://github.com/OneGoodArea/OneGoodArea/pull/145) on 2026-06-06
**Phase:** 0.5 (Foundation — 5th of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-242-pagination`

## What shipped

Pagination controls primitive. Composes ABOVE/BELOW `<DataTable>` for paginated server-side surfaces. DataTable deliberately doesn't bake pagination in — the model differs per consumer — so this primitive sits next to it.

**Two pagination flavours in one primitive** via the `mode` discriminator. No client-side pagination logic: the primitive renders controls only; the consumer slices its data.

**Planned consumers (2–3):**
- `/dashboard/activity` (Phase 5) — cursor-based per ADR 0024
- Monitor changes feed — offset-based per portfolio
- Future: exports list, audit log, anything paginated

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/pagination.tsx`):**

```ts
type PaginationProps = CursorPaginationProps | PagePaginationProps;

interface CursorPaginationProps {
  mode: "cursor";
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  indicator?: ReactNode;       // optional middle label
  prevLabel?: string;          // default "Newer"
  nextLabel?: string;          // default "Older"
  surface?: "light" | "dark";
  "aria-label"?: string;
}

interface PagePaginationProps {
  mode: "page";
  page: number;                // 1-indexed
  totalPages: number;
  onChange: (page: number) => void;
  surface?: "light" | "dark";
  "aria-label"?: string;
}
```

**Behaviour:**

- **Cursor mode** — Prev / Next buttons with optional indicator slot. Consumer drives `hasPrev` / `hasNext` from the API response. Default labels are "Newer" / "Older" (read well for activity feeds); consumers showing chronological list views can pass "Prev" / "Next".

- **Page mode** — Prev arrow + numbered pages + Next arrow. Out-of-range `page` prop is clamped (`page=99` with `totalPages=5` → renders page 5 as active). Long ranges collapse via the **page-range math** (`getPageRange`, exported as a pure helper for independent unit testing):

  - `totalPages <= 7` → render every page contiguously
  - Otherwise → `[1, "...", current-1, current, current+1, "...", last]`. Always shows first + last so navigation to extremes is one click. Adjacent pages around the current page provide context. Ellipsis fills the gaps.

  Examples:
  ```
  totalPages=5,  current=3   → [1, 2, 3, 4, 5]
  totalPages=12, current=2   → [1, 2, 3, "…", 12]      (no leading ellipsis)
  totalPages=12, current=7   → [1, "…", 6, 7, 8, "…", 12]
  totalPages=12, current=11  → [1, "…", 10, 11, 12]    (no trailing ellipsis)
  totalPages=100, current=50 → [1, "…", 49, 50, 51, "…", 100]
  ```

**Accessibility:**
- `<nav>` wrapper with configurable `aria-label` (default "Pagination")
- `aria-current="page"` on the active page button
- `aria-label` on every button describes its role ("Previous page", "Next page", "Page 7")
- Disabled state on Prev/Next + page buttons (cursor mode by `hasPrev`/`hasNext` flags; page mode by computed `canPrev`/`canNext`)
- Ellipsis nodes are `aria-hidden` (visual-only)
- Focus-visible 1.5px ink outline + 2px offset on every control (warm-white on dark)

**Visual treatment (Brand v3):**
- Mono caps labels at 0.10em letter-spacing (matches the rest of the dashboard editorial typography — Eyebrows, DataTable headers, etc.)
- Soft-warm hover signature shared with `.oga-dropdown__item` + DataTable row + `.oga-tabs__tab` (`rgba(26, 28, 31, 0.04)` bg + ink colour lift)
- **Active page** (page mode only) inverts to ink-filled with warm-white text + inset top highlight — same recipe as Sidebar's active nav link
- `tabular-nums` on page buttons + cursor indicator so digits line up across states
- Hairline borders at 10% / 18% opacity (default / hover)
- 3px border-radius — refined chip feel
- 30px min button height for touch-target compliance

**Dark surface variant** via `surface="dark"`:
- All borders + text invert to warm-white at appropriate opacities
- Active page becomes warm-white-filled with ink text (the inversion mirrors DataTable sort indicators on dark)

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/pagination.tsx` (new, ~200 lines) — Component + types + page-range helper
- `apps/web/src/app/design-v2/_shared/dashboard/pagination.css` (new, ~165 lines) — All visual treatment, both modes, both surface variants
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `PaginationSection` (9 light variants) + `PaginationDarkSection` (2 dark variants)
- `apps/web/tests/unit/pagination.test.tsx` (new, ~250 lines) — 23 RTL tests across 4 describe blocks

## Decisions

- **Discriminated union over two separate primitives.** `mode: "cursor" | "page"` discriminates between the two flavours. Both render with the same surface treatment (mono caps, soft-warm hover, focus ring), share visual vocabulary, and a consumer that switches data modes (e.g. an activity feed that paginates but later adds total counts) can swap the prop without changing the import.
- **Custom `prevLabel` / `nextLabel` on cursor mode.** "Newer" / "Older" reads correctly for chronological reverse-order feeds (newest first, which is the Activity feed pattern). For chronological forward-order feeds (oldest first), consumers pass `prevLabel="Prev" nextLabel="Next"`.
- **Page-range math as a pure exported helper.** `getPageRange(current, totalPages)` is independently unit-testable (5 dedicated tests) and could be reused if a consumer wants custom rendering. Internal to the component, the same helper drives the rendered list.
- **Clamping out-of-range `page` props.** `page=99` with `totalPages=5` renders page 5 as active rather than crashing or rendering an empty pill. Consumers passing dynamic page values from URL params or stale state get safe behaviour.
- **No "jump to page" input in v1.** Out of scope per Jira. Most paginated dashboard surfaces have <20 pages where the ellipsis-truncated row covers the navigation need. If a consumer ships with hundreds of pages and users complain, add `<JumpToPage>` as a separate primitive (extract-on-second-use convention).
- **Native `<button>` everywhere, no `role="button"` on divs.** Enter + Space activate per HTML default. Disabled state via the native `disabled` attribute (semantic + screen-reader announced). Means no JavaScript needed for keyboard support — the platform handles it.
- **No prev/next buttons in cursor mode beyond the two primary actions.** No "jump to start" or "jump to end" — cursor-based APIs don't typically know the total range. The indicator slot fills that context need.
- **30px min height + tabular-nums on the page numbers.** Digit-width consistency across `[1] [9] [10] [99]` so the row doesn't jitter as the active page changes. Visually proportional to the 30px DataTable row height.
- **Active page on dark inverts.** Light's ink-filled active state would be invisible on dark; mirroring the DataTable sort-indicator inversion (warm-white-filled with ink text) keeps the contrast loud.
- **No portal, no positioning logic.** Pagination renders inline below/above a DataTable (or wherever the consumer puts it). The simple `<nav>` + flex layout is enough — no measurement, no auto-flip, no overflow handling needed (consumers wrap in a container if they need overflow).

## Tests

23 RTL tests at `apps/web/tests/unit/pagination.test.tsx` across 4 describe blocks:

**`getPageRange` pure-function tests (5):**
1. Returns all pages when total ≤ 7
2. Collapses with leading ellipsis when current is past the front
3. Collapses with trailing ellipsis when current is near the front
4. Collapses with both ellipses when current is in the middle
5. Scales correctly for huge ranges (50 of 100)

**Cursor mode (7):**
6. Renders Newer / Older with default labels
7. Uses custom `prevLabel` / `nextLabel` when provided
8. Disables Prev when `hasPrev=false`
9. Disables Next when `hasNext=false`
10. Fires `onPrev` on Newer click
11. Fires `onNext` on Older click
12. Renders the optional indicator slot

**Page mode (8):**
13. Renders all pages when `totalPages` is small
14. Marks current with `aria-current` + `data-active`
15. Renders ellipsis nodes for long ranges
16. Disables Prev on first page + Next on last
17. Fires `onChange` with the right page on page click
18. Fires `onChange(page - 1)` on Prev / `onChange(page + 1)` on Next
19. Clamps out-of-range `page` prop into the valid range

**Surface (3):**
20. Renders dark surface via `data-surface`
21. Defaults to light surface
22. Uses custom `aria-label` on `<nav>`

(Test counts: 5 + 7 + 8 + 3 = 23.)

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **401/401** (was 378; +23 new) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-06
- Iteration cycles: 0 — Pedro approved on the first cut ("yeah perfect").

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:

- **Phase 5 `/dashboard/activity`**: cursor-based pagination per ADR 0024. Will pass `hasPrev` / `hasNext` from the API response and use the indicator slot for the date range.
- **Phase 3 Monitor changes feed**: offset-based page mode with `totalPages` from the API response.
- **Future**: exports list, audit log, anything paginated.

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 4 commits on the branch (AR-241 work log carry-forward + primitive + tests + showcase). Branch deleted on merge.

## Follow-ups

- **`<JumpToPage>` input** — defer until a consumer with >100 pages needs it. Extract-on-second-use convention.
- **Items-per-page selector** — out of scope for this primitive. Consumers compose inline (e.g. a `<Select>` next to the Pagination row).
- **Infinite scroll variant** — separate primitive when a consumer needs it; the cursor mode already covers most "load more" use cases via the indicator slot.
- **AR-243 `<Breadcrumb>`** is next (6th of 8 Phase 0.5 primitives).
