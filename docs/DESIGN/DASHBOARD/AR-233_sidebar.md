# AR-233 — &lt;Sidebar&gt;

**Status:** Done
**Merged:** `2aa67ed` via PR [#138](https://github.com/OneGoodArea/OneGoodArea/pull/138) on 2026-06-06
**Phase:** 0 (Foundation — **seventh and last** dashboard primitive)
**Branch (deleted post-merge):** `feat/AR-233-sidebar-primitive`

## What shipped

Generic dashboard sidebar primitive extracted from the existing `AppShell`. Phase 1 can now reorganize the dashboard sitemap (4 sections + org switcher + RBAC visibility per AR-217-B1) without touching the chrome itself — the structure is a primitive.

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/sidebar.tsx`):**
- Generic typed API: `SidebarSection[]` containing `SidebarItem[]`, each with optional `icon` / `badge` / `active` / `children`
- Controlled drawer (`open` + `onClose`) — same pattern as `<Modal>`. Sidebar owns Escape + body-scroll-lock + backdrop click; consumer drives the open state from a hamburger / link click
- `top` + `bottom` slots so consumers compose the chrome pieces (wordmark + close, theme toggle + user chip) while the primitive owns the structure
- Nested children (depth 2 max) render as an indented sub-list under their parent

**API:**
```ts
interface SidebarItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;          // consumer computes via usePathname
  badge?: ReactNode;
  children?: SidebarItem[];  // depth 2 max
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

interface SidebarProps {
  sections: SidebarSection[];
  top?: ReactNode;
  bottom?: ReactNode;
  open?: boolean;
  onClose?: () => void;
  "aria-label"?: string;
}
```

**Visual treatment (Brand v3 dark surface upgrade):**
- **Graphite gradient** (`#1F2125 → #1A1C1F`) — replaces the previous flat `var(--oga-ink)`. Same vocabulary as `<DataTable>` dark variant + `.oga-code-panel`.
- **Edge-lit material recipe** — inset top + side highlight at warm-white 6% / 3% so the panel reads as a layered surface, not a flat wash
- **Dot-field motif** via `::before` pseudo-element. **Exact same recipe as `.oga-section-dark`** (the recipe used on every dark editorial section across the site — product page final CTAs, `/methodology`, `/about`, `/docs/api-reference`): 14px grid at warm-white 0.10 opacity, mask `radial-gradient(ellipse at top right, black 0%, transparent 70%)` so dots cluster densest at one corner and fade across the surface. `pointer-events: none` + `z-index: 0` behind the slots (which sit at `z-index: 1`)
- **Warm-white-tinted scrollbar** matching the DataTable dark variant
- **Hairline-only group separation**; soft-warm hover signature shared with `.oga-dropdown__item`
- **Active item**: white background, ink text (inverted) — preserved verbatim from the prior AppShell implementation
- Nested sub-list: indented 14px, anchored by a 1px warm-white-10% vertical hairline on the left edge

**Accessibility:**
- `<aside>` with `aria-label` (defaults to "Sidebar navigation")
- `aria-current="page"` on the active link
- Escape closes the drawer (when open); body scroll locks while drawer is open
- Backdrop is a sibling element with `aria-hidden`; clicks dismiss

**Mobile drawer** (below 880px):
- Sidebar lifts off the page into a fixed-position 280px-wide column
- Slides in from the left with a 220ms cubic-bezier(0.2, 0.7, 0.2, 1) transform
- Translucent backdrop with `backdrop-filter: blur(2px)`
- Any click on a nav link auto-dismisses (drawer pattern)

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/sidebar.tsx` (new, ~190 lines) — `Sidebar` component + `SidebarGroup` + `SidebarLink` + types
- `apps/web/src/app/design-v2/_shared/dashboard/sidebar.css` (new, ~270 lines) — All visual treatment: graphite gradient + dot-field + edge-lit material + scrollbar + responsive drawer + nested sub-list
- `apps/web/src/app/design-v2/_shared/app-shell.tsx` — Refactored to consume `<Sidebar>` primitive. Builds `sections` from existing `PRIMARY`/`SECONDARY` nav arrays with active computed via `usePathname`. Composes `<Wordmark>` + close button into the top slot and `<SidebarThemeRow>` + `<UserChip>` into the bottom slot. **Exports `NavIconDark`** so the showcase + future Phase 1 surfaces consume the canonical 16x16 sidebar glyph set instead of reinventing.
- `apps/web/src/app/design-v2/_shared/app-shell.css` — Removed the now-dead `.oga-app__sidebar*` and `.oga-app__nav-*` rules (their replacements live in `_shared/dashboard/sidebar.css` under `.oga-sidebar*`). Kept `.oga-app__sidebar-close` because AppShell composes that button into the sidebar's top slot.
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `SidebarShowcaseSection` (3 variants) + new `PresetsIcon` bespoke glyph; imports `NavIconDark` from `app-shell`, real `<Wordmark>` from `_shared/wordmark`, product icons from `_shared/product-icons`
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added `.oga-prim-sidebar-frame` (260px × 460/560px preview container so the sticky-positioned sidebar renders inline within doc rows) + `.oga-prim-sidebar-userchip` + `.oga-prim-sidebar-close` showcase utility classes
- `apps/web/tests/unit/sidebar.test.tsx` (new) — 12 RTL component tests
- `docs/DESIGN/DASHBOARD/AR-230_data_table.md` — Carried forward from the previous ticket (work-log convention)

## Decisions

- **Extract scope is structural only.** Sidebar content (the actual nav items rendered) stays in AppShell — the primitive doesn't bake in PRIMARY/SECONDARY arrays. Phase 1 AR-217-B1 swaps in the 4-section sitemap (Dashboard / Products / Org & Levers / Account) by changing what AppShell passes into `<Sidebar>` — without touching the primitive.
- **Controlled drawer over uncontrolled.** Consumer owns `open` state. Same pattern as `<Modal>`. The hamburger button lives in AppShell's `MobileTopbar`; it needs to trigger the drawer, so the open state has to be lifted there. Pure-uncontrolled would require ref forwarding + an imperative `.open()` API — more surface area, no clear benefit.
- **Top + bottom as ReactNode slots.** The chrome pieces (wordmark + close button + theme toggle + user chip) vary per consumer surface. Slots over baked-in behaviour means the primitive composes cleanly with future variations (org switcher in Phase 1, alternate brand surfaces, in-modal sidebars).
- **`next/link` under the hood, framework-route-agnostic active computation.** The primitive renders `<Link>` for navigation (this is a Next.js dashboard) but does NOT call `usePathname`. Consumer computes `active: boolean` per item via its own pathname comparison. Keeps the primitive testable + framework-agnostic at the active-state level.
- **No content reorganization in this ticket.** The Jira spec explicitly says "Sidebar content stays in AppShell for now; Phase 1 AR-217-B1 reorganizes the actual content; this ticket is purely the extraction." Followed verbatim.
- **Visual upgrade IS in scope despite "no visual regression" rule.** First localhost cut preserved the prior flat `var(--oga-ink)` background per the Jira rule. Pedro looked and said "boring, not on brand." Upgraded to: (a) graphite gradient matching DataTable dark + `.oga-code-panel`, (b) dot-field motif matching `.oga-section-dark` (the recipe used across every dark editorial surface on the site), (c) edge-lit material recipe with inset highlights. The real `/dashboard` sidebar gets the same upgrade — the rule is overridden by explicit ask. Flagged in the commit + PR + this log so reviewers know to expect the change on existing authenticated pages.
- **Dot-field anchored at top-right.** Pedro referenced `/products/signals` "Build on the typed UK area-data layer" CTA — that surface uses `.oga-section-dark` which applies the dot field with `mask: radial-gradient(ellipse at top right, black 0%, transparent 70%)`. Matched verbatim so the sidebar reads as part of the same vocabulary family.
- **Canonical icons only in the showcase.** First showcase pass invented 5 new inline glyphs (SidebarHashIcon, SidebarDashIcon, etc.) — second mistake of this kind in two tickets (first was Tabs). Pedro called it out: "WTF ARE THOSE ICONS! a few chats ago I said I want consistency across icons, each product has its own icon, go to the tabs and you will see some other icons." Fixed by switching to: real `<Wordmark>` for the top slot; `NavIconDark` for dash/map/api/etc; bespoke Tabs-set icons (CompareIcon, BillingIcon, KeyIcon, WebhookIcon, MembersIcon, BundlesIcon, CohortsIcon) for concepts that already had bespoke versions; new `PresetsIcon` (3 sliders with knobs — visual of "tunable weight composition") for the one concept that didn't exist in either set; the canonical product icons (SignalsIcon, ScoresIcon, MonitorIcon, IntelligenceIcon) for the Phase 1 Products group preview. **Memory rule added under `feedback_icons_and_canonical_assets.md`** to prevent a third repeat.

## Tests

12 RTL component tests at `apps/web/tests/unit/sidebar.test.tsx`:

1. Renders all sections with their group labels
2. Renders every top-level item as a link with the right href
3. Marks active items with `aria-current="page"`
4. Renders nested children as a sub-list under their parent
5. Renders the badge slot when provided
6. Renders both top + bottom slots
7. Calls `onClose` on Escape when open
8. Does NOT call `onClose` on Escape when closed
9. Renders backdrop when open; backdrop click fires `onClose`
10. Locks body scroll while open; restores on close
11. Fires `onClose` when a sidebar link is clicked (drawer auto-dismiss)
12. Uses a custom `aria-label` on the aside when provided

Mocks `next/link` with a plain anchor so click + keyboard events land where RTL expects them.

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **329/329** (was 317; +12 new) · CI all 7 checks green (Build / Lint / Test / Typecheck / Security audit / Vercel preview / Vercel deploy).

## Pedro's localhost approval

- Date: 2026-06-06
- Notes: 5 iteration cycles, the most of any Phase 0 primitive:
  1. **First cut** (preserved-behaviour extraction) — Pedro: "WTF ARE THOSE ICONS!" + "boring, not on brand" + "youre not even using the right font for the logo nor the icon logo" + "look at api reference page, look at our product page show bespoke they are"
  2. **Canonical-assets fix** — switched to real `<Wordmark>`, `NavIconDark` for sidebar nav, product icons for the Phase 1 Products preview. Memory rule added to prevent reinventing icons going forward.
  3. **Tabs ↔ Sidebar consistency** — Pedro: "look at webhooks on the tabs, is it the same? No. Also Compare, not the same. Also cohorts, members, bundles, presets, etc why dont they have it?" Swapped the 4 conflicting NavIconDark refs to bespoke Tabs-set versions (CompareIcon, BillingIcon, KeyIcon, WebhookIcon); added bespoke icons on all 4 nested children (MembersIcon + BundlesIcon + new PresetsIcon + CohortsIcon).
  4. **Dark surface upgrade** — Pedro: "its so boring the background on this side bar, let's give the same effect as the datatable on the dark background." Upgraded to graphite gradient + edge-lit material + warm-white-tinted scrollbar matching DataTable dark.
  5. **Dot-field motif** — first attempt: full-coverage vignette with top/bottom fade. Pedro: "not all over the background, the same way we do it in /products/signals" + referenced the "Build on the typed UK area-data layer" CTA. Switched to the exact `.oga-section-dark` recipe (14px grid, radial-gradient ellipse mask at top-right) — approved: "okay perfect! Ready to do it."

## Production migration status

Active on every authenticated page (8 surfaces: `/dashboard`, `/dashboard/billing`, `/api-usage`, `/settings`, `/admin`, `/report`, `/report/[id]`, `/compare`) — they all consume AppShell which now renders through `<Sidebar>`. The visual upgrade (gradient + dot-field) ships live on all 8.

Phase 1+ consumers will pass different `sections` arrays into the same primitive:
- **AR-217-B1** Sidebar reorganization — 4 sections (Dashboard / Products / Org & Levers / Account) with RBAC visibility
- **AR-217-B2** OrgSwitcher — composes into the `top` slot above the wordmark
- **AR-217-E1**–**E7** Levers pages — same sidebar, different active items

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. Same pattern as AR-218–230. Branch deleted on merge. 5 atomic commits (work log carry-forward + primitive + AppShell refactor + tests + showcase).

## Follow-ups

- **Two icon vocabularies need canonicalizing.** Today: bespoke Tabs-set icons inlined in `client.tsx` (~20 functions) + `NavIconDark` exported from `app-shell.tsx` (~7 names). Should extract into a single `_shared/dashboard/dashboard-nav-icons.tsx` set so future Phase 1+ surfaces consume one source of truth. Memory rule added under `feedback_icons_and_canonical_assets.md`. **Open as a separate ticket before Phase 1 ships any new sidebar consumers.**
- **AR-237 ADR 0037** is the next and final Phase 0 ticket — consolidates all 7 primitives + the extract-on-second-use convention + the canonical-icon discipline.
- Phase 1 (`AR-217-B1` Sidebar reorganization) is the first ticket to actually pass a new `sections` array into the primitive. Will test the Phase 1 preview rendered in this showcase as a live consumer.
