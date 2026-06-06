# AR-243 — &lt;Breadcrumb&gt;

**Status:** Done
**Merged:** `a9de830` via PR [#146](https://github.com/OneGoodArea/OneGoodArea/pull/146) on 2026-06-06
**Phase:** 0.5 (Foundation — 6th of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-243-breadcrumb`

## What shipped

Navigation trail primitive for nested routes — Levers settings sub-pages, Monitor portfolio detail, Intelligence saved-query detail. 3+ planned Phase 4–5 consumers.

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/breadcrumb.tsx`):**

```ts
interface BreadcrumbItem {
  label: string;
  href?: string;       // omit on the current page
  icon?: ReactNode;    // canonical glyph only (no invented inline icons)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;        // default "/"
  surface?: "light" | "dark";
  "aria-label"?: string;
}
```

**Behaviour:**
- Items with `href` render as `<Link>`; the **last item always renders as a non-link `<span>` with `aria-current="page"`** regardless of whether `href` is provided (matches the convention that breadcrumbs end at the current page).
- **Default separator is `/`** — reads as a path, fits the infrastructure altitude, distinguishes from the `→` arrows used for CTAs elsewhere. Consumers override with any ReactNode (chevron `›`, dot `·`, custom glyph).
- **Consumer composes the chain explicitly per page.** We do NOT auto-derive from `usePathname` — keeps labels dynamic + localised + state-aware (portfolio names, saved query titles, etc.).
- **Responsive collapse below 640px:** middle items (`data-position="middle"`) hide, an ellipsis placeholder appears between the first and last items. Chain reads "first / … / current".

**Icon discipline (added 2026-06-06 per Pedro feedback):**
- Optional `icon?` slot on each `BreadcrumbItem`. Consumer composes canonical glyphs from existing sets only:
  - **`NavIconDark`** — sidebar nav set (`dash`, `read`, `map`, `compare`, `api`, `key`, `billing`)
  - **Product icons** — `SignalsIcon`, `ScoresIcon`, `MonitorIcon`, `IntelligenceIcon` from `_shared/product-icons.tsx`
  - **Tabs-set bespoke** — `MembersIcon`, `BundlesIcon`, `PresetsIcon`, `CohortsIcon`, `WebhookIcon`, `PortfolioIcon`, `KeyIcon`, `BillingIcon`, `CompareIcon`, etc.
- **NEW canonical asset added this ticket:** `OrgIcon` — institutional silhouette (pediment + 4 columns). Reads as "the organisation" — the container of members + bundles + presets + cohorts. Added to the Tabs-set bespoke set because "Org" appears across every Phase 4 Levers breadcrumb and no canonical glyph existed.
- Resource-name leaf items (portfolio names, saved query titles) typically omit the icon since no canonical glyph exists for those concepts.
- Icons render at 12×12 inside a `aria-hidden` wrapper with `currentColor` so they inherit link / current-state colour.

**Brand v3 visual treatment:**
- **Mono caps eyebrow** at 0.10em letter-spacing — same family as `.oga-eyebrow` + Pagination + DataTable headers
- **Soft-warm hover** on links (`rgba(26, 28, 31, 0.04)` bg + ink colour lift) — same signature as `.oga-dropdown__item` + DataTable row + Tabs
- **Current page** reads at full ink; parent items at `--oga-fg-muted` so the current page is the visual anchor
- **Separators** at 30% ink opacity — present but not loud
- **Light + dark surface variants** via `data-surface`. Dark inverts to warm-white opacities for links, separators, ellipsis, and current page.

**Accessibility:**
- `<nav>` wrapper with configurable `aria-label` (default "Breadcrumb")
- `aria-current="page"` on the last item
- Icons `aria-hidden="true"` (decorative-only)
- Native `<a>` via next/link for keyboard navigation
- Focus-visible 1.5px ink outline + 2px offset on every link (warm-white on dark)

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/breadcrumb.tsx` (new, ~135 lines) — `Breadcrumb` component + types + icon slot wiring
- `apps/web/src/app/design-v2/_shared/dashboard/breadcrumb.css` (new, ~150 lines) — Mono caps chain, soft-warm hover, separator, icon slot, ellipsis collapse, light + dark variants
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `BreadcrumbSection` (8 light variants) + `BreadcrumbDarkSection` (2 dark variants). Also added the new bespoke `OrgIcon` to the Tabs-set canonical glyphs.
- `apps/web/tests/unit/breadcrumb.test.tsx` (new, ~240 lines) — 17 RTL component tests

## Decisions

- **Promoted from deferred — Phase 0.5 batch.** Originally deferred via extract-on-second-use per AR-211 convention. Pedro promoted to Phase 0.5 (2026-06-06) — 3+ Phase 4–5 consumers (Levers settings tree, Monitor detail pages, Intelligence saved-query detail) need a consistent wayfinding trail.
- **Last item is always current.** Even if a consumer passes `href` on the last item, the primitive treats it as the current page (no link, `aria-current="page"`). Avoids the case where a breadcrumb's last item is a "self-link" — bad UX, fights screen-reader expectations.
- **No auto-derive from pathname.** Consumer maps explicitly. Reasons:
  1. Labels are often dynamic (portfolio name, query title) and require state lookups the primitive shouldn't know about
  2. Localisation needs explicit label control
  3. The chain may not be 1:1 with the URL hierarchy (e.g. `/dashboard/org/members` may want to show `Dashboard / Org / Members` but `/dashboard/intelligence/saved/q3-cohort` may want richer labels)
- **`/` separator over `›` or `→`.** The slash reads as a path — fits the infrastructure-grade editorial vocabulary the dashboard uses. The right chevron `›` is also acceptable (offered as a showcase variant) and reads more like a wayfinding affordance. The arrow `→` is available but flagged as "use sparingly" because it conflicts with the action-CTA arrow vocabulary used elsewhere (StatsCard action, Pagination Prev/Next).
- **Icons added on Pedro's iteration feedback.** First cut shipped without an icon slot. Pedro: *"shouldn't they have icons as well?"* Added optional `icon?` to `BreadcrumbItem`. Then Pedro: *"why does org not have one?"* — bespoke `OrgIcon` added to the canonical Tabs-set. This is the **canonical-icon discipline working as intended**: when a concept appears across multiple primitives and lacks a glyph, we ADD a glyph to the canonical set rather than inventing inline ones per primitive.
- **OrgIcon shape — pediment + 4 columns.** Reads as "institution" / "organisation" / "the container of people + resources". Chosen over alternatives (group-of-people = conflicts with `MembersIcon`; building silhouette = too literal; corporate flag = generic). The columns reference how an organisation contains structure. Will be consumed by both Breadcrumb (Org node) AND Sidebar's "Org & Levers" section header when Phase 1 reorganises the sidebar (AR-217-B1).
- **Resource-name items omit icons.** "Acme — High street retail" (portfolio name), "Q3 cohort comparison" (saved query), "Lender bundle" (bundle name) — no canonical glyph exists for specific named resources, so they ship without icons. **Consistency means using a real canonical icon or none, not inventing one per resource.**
- **Responsive collapse hides middle items via CSS, not JS.** Below 640px viewport width, `@media` rule sets `display: none` on items with `data-position="middle"` and unhides the ellipsis placeholder. No JS measurement, no observer; just a viewport-width breakpoint. Less code, more predictable.
- **Ellipsis placeholder renders unconditionally for `items.length > 2`** but hides via CSS until the viewport collapses. Means there's no layout shift when the screen size crosses 640px — the ellipsis is always reserved in the DOM, just visible-or-not.
- **Inner label span for icon + label flex layout.** When icons were added, the link/current containers became `inline-flex` with gap. The label needed to be wrapped in its own `<span>` so the flex children are predictable. This changed the RTL test selectors (`screen.getByText("Members")` now returned the inner span, not the outer `.oga-breadcrumb__current`). 3 tests updated to query by class instead.

## Tests

17 RTL component tests at `apps/web/tests/unit/breadcrumb.test.tsx`:

1. Renders nothing when items is empty
2. Renders the chain in order
3. Renders items with href as `<a>` links
4. Renders the last item without href as a span with `aria-current="page"`
5. Treats the last item as current even if it has an href
6. Renders the default `/` separator
7. Renders a custom separator when provided
8. Places `aria-label="Breadcrumb"` on the nav by default
9. Uses a custom `aria-label` when provided
10. Flags item positions via `data-position` (first / middle / last)
11. Renders the ellipsis placeholder only when `items.length > 2`
12. Does not render a separator after the last item
13. Applies the dark surface variant via `data-surface`
14. Defaults to the light surface
15. Renders a single-item chain as just the current page
16. Renders an optional icon when provided on an item
17. Omits the icon slot when no icon is provided

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **418/418** (was 401; +17 new) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-06
- Iteration cycles: 1 (2 feedback exchanges)
  1. **v1** — primitive without icon support. Pedro: *"shouldn't they have icons as well?"*
  2. **v2 patches** — added optional `icon?` to `BreadcrumbItem`, wired canonical icons (NavIconDark / product-icons / Tabs-set bespoke) into every showcase variant. Pedro: *"why does org not have one?"*
  3. **v3 (shipped)** — added bespoke `OrgIcon` (institutional pediment + 4 columns) to the Tabs-set canonical glyphs; wired into every showcase variant where "Org" appears (light + dark sections + custom-separator variant). Pedro: *"perfect, very happy with it. We move on."*

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:

- **Phase 4 Levers UI** — every settings sub-page (`/dashboard/org/members`, `/bundles`, `/presets`, `/cohorts`, `/methodology`, `/branding`, `/security`)
- **Phase 3 Monitor** — portfolio detail pages (`/dashboard/monitor/portfolios/[id]`)
- **Phase 5 Intelligence** — saved-query detail pages

The new `OrgIcon` will also be consumed by AR-217-B1 (Sidebar reorganisation) for the "Org & Levers" section header.

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 4 commits on the branch (AR-242 work log carry-forward + primitive + tests + showcase). Branch deleted on merge.

## Follow-ups

- **`<JumpToPage>` for ultra-deep chains** — defer until a real consumer needs it. The 640px collapse + ellipsis covers the realistic depths in the planned consumer pages.
- **Dropdown for collapsed items** — out of scope per Jira. The ellipsis currently shows visually but isn't interactive. If a consumer needs the middle items reachable at narrow widths, extract as a follow-up.
- **OrgIcon canonical promotion** — currently inlined alongside the other Tabs-set bespoke glyphs in `dashboard-primitives/client.tsx`. When the two icon vocabularies get canonicalized into `_shared/dashboard/dashboard-nav-icons.tsx` (follow-up tracked in `feedback_icons_and_canonical_assets.md`), OrgIcon moves with them.
- **AR-244 `<FilterBuilder>`** is next (7th of 8 Phase 0.5 primitives).
