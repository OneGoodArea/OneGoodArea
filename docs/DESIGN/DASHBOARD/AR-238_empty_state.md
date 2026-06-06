# AR-238 — &lt;EmptyState&gt;

**Status:** Done
**Merged:** `5154043` via PR [#140](https://github.com/OneGoodArea/OneGoodArea/pull/140) on 2026-06-06
**Phase:** 0.5 (Foundation — 1st of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-238-empty-state`

## What shipped

Generic empty-state primitive for every list page in the dashboard. Vertical stack: optional icon → mono-caps title → optional supporting body → optional primary + secondary actions. Composes both standalone (full page) AND inside other primitives (notably `<DataTable emptyState={...}>`).

**Planned consumers (8+):** Members list, Bundles, Presets, Cohorts, Portfolios, Activity feed, Webhooks list, Signals ranked results, IP allowlist.

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/empty-state.tsx`):**

```ts
interface EmptyStateAction {
  label: string;
  href?: string;        // renders <Link>
  onClick?: () => void; // renders <button>
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  surface?: "light" | "dark";
}
```

Actions accept `href` (renders `<Link>`) OR `onClick` (renders `<button>`) so the primitive serves both navigation-shaped CTAs ("Invite member") and command-shaped CTAs ("Create new preset" → opens modal).

**Visual treatment (Brand v3):**
- **Light surface:** warm-white gradient (`#FFFFFF → #FAF8F4`) + edge-lit material recipe (inset top highlight + 28px ambient shadow) — same vocabulary as `.oga-code-panel` + DataTable light surface.
- **Dark surface** via `surface="dark"` prop or `[data-oga-surface="dark"]` ancestor: graphite gradient (`#1F2125 → #1A1C1F`) + edge-lit material + **dot-field motif** anchored at top-right (the exact `.oga-section-dark` recipe: 14px grid, warm-white 0.10 opacity, radial-gradient ellipse mask). Matches Sidebar + DataTable dark.
- Mono-caps title at 12px / 0.14em letter-spacing (matches DataTable header recipe + EmptyState's standalone default placeholder copy).
- Generous editorial padding (`clamp(40px, 6vw, 64px)` vertical) + soft text colors (44ch max body width).
- Icons: canonical sets only — no invented inline glyphs per [[feedback-icons-and-canonical-assets]].

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/empty-state.tsx` (new, ~125 lines) — `EmptyState` component + `ActionButton` helper + types
- `apps/web/src/app/design-v2/_shared/dashboard/empty-state.css` (new, ~125 lines) — Light + dark surface vocabulary, dot-field motif, icon/title/body/action styling
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `EmptyStateSection` (5 light variants) + `EmptyStateDarkSection` (2 dark variants). No new showcase utility classes needed — all variants compose with existing `.oga-btn` + the canonical bespoke icon set already inlined for Tabs.
- `apps/web/tests/unit/empty-state.test.tsx` (new) — 9 RTL component tests

## Decisions

- **Promoted from deferred — Phase 0.5 batch.** Originally one of 8 primitives deferred via extract-on-second-use per AR-211 convention. Re-evaluated 2026-06-06 (Pedro: "let's just do them") — EmptyState has 8+ planned consumers, and inline-then-extract would have risked 8 divergent designs. Shipping upfront pays the consistency cost once.
- **Actions are not buttons — they're action objects.** The `action` prop is `{ label, href?, onClick? }`. If `href` is provided, renders `<Link>`. If only `onClick`, renders `<button>`. This avoids the "primary CTA is sometimes a link, sometimes a button" branching consumers would otherwise have to do.
- **Two actions max, no array.** Primary + optional secondary. Three actions in an empty state reads as menu, not as guidance. If a real consumer needs more, they compose multiple primitives.
- **Icon is a ReactNode slot, not a name.** Consumer picks the canonical icon — `<MembersIcon />`, `<PortfolioIcon />`, `<NavIconDark name="dash" />`, `<SignalsIcon />`, etc. Primitive stays icon-vocabulary-agnostic. **Hard rule:** consumer MUST use a canonical set — no invented inline glyphs (per the AR-228/AR-233 memory pillar).
- **Composes inside `<DataTable emptyState>`.** Showcase variant 5 proves this: same `<EmptyState>` is passed directly into `<DataTable emptyState={...}>` and renders correctly in the table's body. This is the canonical pattern Phase 1+ Levers pages will use.
- **No default icon.** If `icon` is omitted, the slot doesn't render — restrained, no placeholder. Default empty state inside DataTable (when no `emptyState` prop passed at all) is the small "No results" placeholder DataTable already ships internally.

## Tests

9 RTL component tests at `apps/web/tests/unit/empty-state.test.tsx`:

1. Renders title only when no other props provided
2. Renders body text when provided
3. Renders icon when provided (via `data-testid`)
4. Renders primary action as `<Link>` when `href` provided
5. Renders primary action as `<button>` when `onClick` provided (no `href`)
6. Renders both primary AND secondary actions
7. Applies dark surface variant via `data-surface` attribute
8. Does NOT render an actions container when neither action provided
9. Fires the link `onClick` handler when an href action is clicked

Mocks `next/link` so click handlers land where RTL expects them (same pattern as Sidebar tests).

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **338/338** (was 329; +9 new) · CI all 7 checks green (Build / Lint / Test / Typecheck / Security audit / Vercel preview / Vercel deploy).

## Pedro's localhost approval

- Date: 2026-06-06
- Notes: Approved first cut ("yeah perfect"). All five showcase light variants + two dark variants read at the right altitude on first pass — no design iteration needed. Canonical-icon discipline held (every glyph from the existing bespoke Tabs-set already in client.tsx).
- Iteration cycles: 0

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers (per Phase 1+ plan):

- **Phase 1 (immediate):** AR-217-B4 `/welcome` flow uses an EmptyState shape on the post-verification landing if no profile exists yet
- **Phase 4 Levers UI:** Members / Bundles / Presets / Cohorts / IP allowlist all need EmptyState as the first-visit surface
- **Phase 3 Monitor:** Portfolios list, Changes feed (empty period), Webhooks list
- **Phase 5 Activity:** the Activity feed empty state

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 3 atomic commits (primitive / tests / showcase). No work-log carry-forward needed at the START of this branch — AR-237 was the ADR itself and the ADR file is its own deliverable, no separate work log required.

**Render context:** AR-237's deploy timed out on 2026-06-06 due to a Render port-scan flake (the cached Docker image identical to AR-228/230/233 which all deployed fine; failed deploy ran on a `srv-*-hibernate-*` pod). Pedro triggered a manual redeploy from the Render dashboard — succeeded. No code or config change needed. Diagnostic captured in conversation log; not memorialized further since it was a platform flake, not a recurring issue.

## Follow-ups

- **AR-239 `<Tooltip>`** is next (2nd of 8 Phase 0.5 primitives).
- 7 Phase 0.5 primitives remaining: Tooltip / CodeBlock / StatsCard / Pagination / Breadcrumb / FilterBuilder / ChartShell.
- After all 8 ship (Phase 0.5 complete), Phase 1 starts with `AR-217-B1` Sidebar reorganization (the first real dashboard page work).
