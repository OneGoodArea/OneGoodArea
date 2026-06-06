# AR-230 — &lt;DataTable&gt;

**Status:** Done
**Merged:** `296cb83` via PR [#137](https://github.com/OneGoodArea/OneGoodArea/pull/137) on 2026-06-06
**Phase:** 0 (Foundation — sixth dashboard primitive to ship; biggest one)
**Branch (deleted post-merge):** `feat/AR-230-data-table`

## What shipped

Generic, typed table primitive at Brand v3 altitude. The workhorse for every tabular dashboard surface (planned consumers):

- **Levers:** members, bundles, presets, cohorts, IP allowlist
- **Monitor:** portfolios, changes feed, webhooks list
- **Signals:** compound `rank_areas` ranked results
- **Activity feed** (paginated, server-sorted)

Plus, **React Testing Library + jsdom installed** as part of this ticket — first `.test.tsx` in the repo. Component tests are part of the acceptance criteria from here on.

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/data-table.tsx`):**
- Fully generic typed API: `ColumnDef<TRow>` with typed `cell` renderer + `sortAccessor`. Row type flows through every renderer + `rowKey`. No `any` leakage.
- `<DataTable>` renders only the table — no pagination, no selection. Consumer composes.

**API:**
```ts
interface ColumnDef<TRow> {
  key: string;
  header: ReactNode;
  cell: (row: TRow, index: number) => ReactNode;
  align?: "start" | "end" | "center";
  width?: string;                  // CSS grid track ("120px", "minmax(160px, 1fr)", etc.)
  sortable?: boolean;
  sortAccessor?: (row: TRow) => string | number | Date | null | undefined;
  hideBelow?: "sm" | "md";         // responsive column hiding
  headerLabel?: string;            // accessible label when `header` is non-text
}

interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  rowKey: (row: TRow) => string;
  isLoading?: boolean;
  error?: string | null;
  emptyState?: ReactNode;
  onRowClick?: (row: TRow) => void;
  sortState?: SortState;           // controlled sort (server-side path)
  onSortChange?: (next: SortState) => void;
  defaultSort?: SortState;         // uncontrolled initial sort
  caption?: string;                // visually-hidden screen reader name
  surface?: "light" | "dark";
  density?: "comfortable" | "compact";
  loadingRowCount?: number;
}
```

**Sort:**
- Default: client-side. Column flagged `sortable: true` becomes a `<button>` in the header. Click cycles asc → desc. `sortAccessor` provides the comparison value; falls back to string of the rendered cell.
- Controlled: if consumer passes BOTH `sortState` AND `onSortChange`, the primitive becomes a dumb view (server-side sort path). It does NOT re-sort the input rows; consumer feeds the already-sorted page.

**Built-in states:**
- `isLoading`: shimmering skeleton rows (count via `loadingRowCount`). Skeletons are `aria-hidden`.
- `error`: inline red message row with `role="alert"`. Body data rows are replaced; the header stays for context.
- empty (rows empty, not loading, no error): renders `emptyState` slot, or a small default placeholder.

**Row actions = a regular column.** Add a column with `align: "end"` and a `cell` that returns a `<DropdownMenu>` trigger. The primitive has an interactive-child guard: clicks that originate inside a `button | a | input | select | textarea | [role="button"]` do NOT fire `onRowClick`. Prevents the common "dropdown trigger also navigates the row" bug.

**Accessibility:**
- Native `<table>` for semantics + screen-reader support
- `aria-sort` on header cells reflects `ascending` / `descending` / `none`
- Sortable headers are `<button>` children — keyboard-activatable, with focus ring
- Visually-hidden `<caption>` gives the table a screen-reader name
- Skeleton rows are `aria-hidden` so screen readers don't announce them
- Scroll region has `role="region"` + `tabIndex=0` for keyboard scroll
- Error message has `role="alert"`

**Visual treatment (Brand v3):**
- Warm-white gradient surface (`#FFFFFF → #FAF8F4`) — same recipe as `.oga-code-panel` (homepage code surfaces).
- Deeper material drop-shadow recipe matching `.oga-code-panel`: inset top highlight + ambient 28px-blur shadow.
- Mono caps headers at **0.14em** letter-spacing (broader than the dropdown's 0.06em; matches code-panel header altitude).
- Sticky header with `backdrop-filter: blur(8px)` over scrolling content.
- **Hairline-only row separators** — no zebra striping. Editorial restraint over admin-grid density.
- Soft-warm hover signature (`rgba(26,28,31,0.03)`) shared with `.oga-dropdown__item` + `/about` page cards.
- `font-variant-numeric: tabular-nums` on the whole table so numeric columns align without monospace.
- **Custom scrollbar** in the ink palette: thin (8px), transparent track, ink-tinted thumb at 0.18 opacity that lifts to 0.30 on hover. `scrollbar-width: thin` + `scrollbar-color` for Firefox; `::-webkit-scrollbar-*` for Chromium/Safari.
- Responsive column hiding: `hideBelow="sm"` (640px) and `hideBelow="md"` (960px).
- Compact density mode: 40px row height + 9px vertical padding (vs 52px + 14px in comfortable).

**Dark surface variant** via `surface="dark"` prop or `[data-oga-surface="dark"]` ancestor:
- Graphite-ink gradient (`#1F2125 → #1A1C1F`)
- Warm-white text + 50% white inactive header labels
- Translucent warm-white (0.05) hover wash
- Warm-white active sort indicators
- Warm-white-tinted scrollbar (0.20 → 0.32 on hover)

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/data-table.tsx` (new, ~380 lines) — `DataTable` component + `HeaderCell` + `BodyRow` + `LoadingRows` + `EmptyRow` + `MessageRow` + `SortIndicator` + helpers
- `apps/web/src/app/design-v2/_shared/dashboard/data-table.css` (new, ~390 lines) — All visual treatment, light + dark, scrollbar, skeleton shimmer, responsive hiding, compact density
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `DataTableSection` (7 light variants) + `DataTableDarkSection` (2 dark variants) + 4 typed example data shapes (members, portfolios, webhooks, activity)
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added `.oga-prim-role-badge` + `.oga-prim-status-dot` + `.oga-prim-empty-state` showcase utilities; **fixed** `.oga-prim-code` dark variant (was rendering ink-on-ink → invisible on dark surfaces)
- `apps/web/tests/unit/data-table.test.tsx` (new) — 11 RTL component tests covering acceptance criteria
- `apps/web/tests/setup-rtl.ts` (new) — RTL setup: `@testing-library/jest-dom` matchers + `afterEach(cleanup)`
- `apps/web/vitest.config.ts` — Include `*.test.tsx`; setupFiles for RTL; coverage globs cover `.tsx`
- `apps/web/package.json` + `package-lock.json` — Added `@testing-library/react ^16.3.2`, `@testing-library/jest-dom ^6.9.1`, `@testing-library/user-event ^14.6.1`, `jsdom ^29.1.1` as devDependencies
- `docs/DESIGN/DASHBOARD/AR-228_tabs.md` — Carried forward from previous ticket (work-log convention)

## Decisions

- **Strip-only primitive (no pagination, no selection).** Consumer slices data + composes pagination above/below. Pagination model differs per consumer (cursor for activity feed, offset for members, none for portfolios) — coupling them into the primitive is wrong. Selection is deferred to extract-on-second-use (AR-211 convention); none of the immediate Phase 1 consumers need it.
- **Sort: client default, controlled override.** Single column at a time. Multi-sort is YAGNI for the listed surfaces.
- **Row actions = a regular column, not a special API.** Less surface area; consumer composes `DropdownMenu` in the cell. The primitive's only contribution is the interactive-child guard that stops the row click from also firing when the user clicks the dropdown trigger.
- **No virtualization.** Activity feed paginates server-side; no surface plans to render >500 rows. If a 10k-row case appears, extract `<VirtualizedDataTable>` separately rather than make every consumer pay the virtualization complexity cost.
- **CSS Grid on `<tr>` over `table-layout: fixed`.** Per-column tracks set via `--oga-dt-cols` on the table element. Gives us precise width control + responsive `hideBelow` (`display: none` cleanly removes a column from the grid track list when the cell is hidden) without resorting to width hacks. Native `<table>` stays in the DOM for screen-reader semantics.
- **Native `<table>` not `<div role="table">`.** Screen readers + browser extensions know how to navigate native tables far better than custom ARIA. The grid layout is just a CSS choice; the semantics are still `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>`.
- **Editorial Brand v3 vocabulary, not admin-grid.** First localhost showing used a plain hairline container with zebra striping — Pedro flagged it as off-brand. Rewrote to share the `.oga-code-panel` vocabulary: warm-white gradient surface, deeper material shadow, broader mono letter-spacing, hairline-only row separators. The DataTable now reads as a calibrated instrument matching the rest of the dashboard surfaces, not a generic data grid.
- **Custom scrollbar in the ink palette.** Native browser scrollbars look like Windows / macOS and break the editorial altitude. Styled thin + ink-tinted (warm-white-tinted on dark) so it picks up the same hover treatment used elsewhere.
- **One section intro frames it as "one primitive in N configurations".** Second localhost showing — Pedro was confused about what each variant was demonstrating because the captions led with the data shape (members / portfolios / webhooks). Rewrote intro + every caption to lead with the **feature** (sortable columns, loading state, row actions, etc.) with the realistic data as context only.
- **RTL install lands in this ticket, not a separate prep ticket.** The Jira ticket explicitly requires unit tests; without RTL there's no path to that. Adding it standalone would be one PR with no functional change merged just to enable the next ticket. Cleaner to bundle.
- **`@vitest-environment jsdom` pragma per file, not global jsdom.** Vitest 4 dropped `environmentMatchGlobs` from its types. Pragma approach keeps pure-logic `.test.ts` files on the faster node env and only spins up jsdom for component tests.
- **Specimen-mount corner ticks added, then removed.** Second iteration added 4 hairline corner brackets at the table corners (mirroring `.oga-code-panel__tick`). Pedro looked and said "remove the corner thingies" — removed both component spans and CSS rules. The warm-white gradient + material shadow + mono letter-spacing carry the editorial altitude on their own.

No ADR — extracting a UI primitive is mechanical. **AR-237 ADR 0037** at the end of Phase 0 will document all 7 primitives together + the extract-on-second-use convention.

## Tests

11 RTL component tests at `apps/web/tests/unit/data-table.test.tsx`:

1. Renders columns + rows from data
2. Uncontrolled sort: ascending on first click, descending on second; `aria-sort` flips accordingly
3. Numeric sort via `sortAccessor` returning a number (not lexicographic on string repr)
4. Keyboard activation: Enter on a focused sort header
5. Controlled-sort path: fires `onSortChange`, does NOT internally re-sort
6. Loading state renders skeleton rows (count matches `loadingRowCount`)
7. Empty state renders consumer-provided `emptyState` when rows is empty
8. Error state replaces the body, announces via `role="alert"`
9. `onRowClick` fires on non-interactive cell clicks
10. `onRowClick` does NOT fire when click originates inside a button (interactive-child guard)
11. Falls back to default empty state copy ("No results") when no `emptyState` prop

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **317/317** (was 306; +11 new) · CI all 7 checks green (Build / Lint / Test / Typecheck / Security audit / Vercel preview / Vercel deploy).

## Pedro's localhost approval

- Date: 2026-06-06
- Notes: First localhost showing read off-brand and confusing. Pedro flagged 4 issues:
  1. "Don't think those are on brand at all" — the visual was admin-grid-style, not Brand v3 editorial
  2. "I hate the scroll bar is actually not branded as well" — native browser scrollbar broke the altitude
  3. "On the dark theme when column and target column cannot be seen whatsoever since its white on white" — the `.oga-prim-code` showcase utility was ink-on-ink (invisible) on dark surfaces
  4. "Explain what are these for, I'm confused" — variant captions led with data shape, not feature being demonstrated

  Iteration 1 fix: rewrote CSS to Brand v3 altitude (warm-white gradient + material shadow recipe shared with `.oga-code-panel`, mono caps 0.14em letter-spacing, hairline-only row separators, no zebra striping), added specimen-mount corner ticks, styled scrollbar in ink palette (webkit + Firefox), fixed `.oga-prim-code` dark variant override, rewrote intro + every variant caption to frame it as "one primitive in N configurations".

  Iteration 2 fix: Pedro asked to drop the specimen-mount corner ticks. Removed both component spans + CSS rules.

  Final approval: "cool, let's move on."
- Iteration cycles: 3

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers (per the plan):

- Phase 1 — **AR-217-E1 /dashboard/org/members** (members list with role badges, remove-member action)
- Phase 1 — **AR-217-E2 /dashboard/org/bundles**, **E3 presets**, **E4 cohorts**, **E6 branding**, **E7 IP allowlist**
- Phase 3 — **AR-217-D1 /dashboard/monitor — Portfolios** (sortable, row actions)
- Phase 3 — **AR-217-D2 /dashboard/monitor — Changes feed** (compact density, paginated, server-sort)
- Phase 3 — **AR-217-D3 /dashboard/webhooks** (webhook subscriptions list + reveal-once secret flow)
- Phase 5 — **AR-217-F2 /dashboard/activity** (paginated activity feed, compact density)
- Phase 5 — **AR-217-C1 /dashboard/signals — Cross-area mode** (ranked `rank_areas` results table)

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. Same pattern as AR-218–228. Branch deleted on merge.

## Follow-ups

- **AR-233 `<Sidebar>`** is the next ticket (7th and last primitive; extracts from existing `AppShell`, ~400 lines).
- After AR-233: **AR-237 ADR 0037** ships — consolidates all 7 Phase 0 primitives + the extract-on-second-use rule.
- When Phase 1 starts (AR-217-B1+), the dashboard build proper kicks off.
- Selection is intentionally deferred — when a real consumer (likely Members list with bulk-remove) needs multi-select, build inline first; extract to the primitive on second use per AR-211.
- The pre-existing NextAuth `ClientFetchError` (`/api/auth/session` → HTML) is still showing in the console on `/admin/dashboard-primitives` — separate ticket if it surfaces on real authenticated pages.
