# AR-221 — &lt;DropdownMenu&gt;

**Status:** Done
**Merged:** `f761bad` via PR [#134](https://github.com/OneGoodArea/OneGoodArea/pull/134) on 2026-06-05
**Phase:** 0 (Foundation — third dashboard primitive to ship)
**Branch (deleted post-merge):** `feat/AR-221-dropdown-menu`

## What shipped

The trigger + floating-panel primitive. Used everywhere the dashboard needs a click-to-reveal action list: the org switcher (AR-234), the user menu in the sidebar, row actions on every data table, sort selectors, filter chips.

**Component (`apps/web/src/app/design-v2/_shared/dashboard/dropdown-menu.tsx`):**
- `<DropdownMenu trigger items align? triggerLabel? triggerClassName? header? />`
- Uncontrolled internal state — most consumers want fire-and-forget; controlled mode can be added if a real consumer needs it.
- Items + dividers via a discriminated union: `DropdownItem | DropdownDivider`. `DropdownDivider` can optionally carry a `label` to become an editorial section header ("Session", "Recent", etc.).
- Optional `header` prop renders a mono eyebrow at the top of the panel — gives the menu identity ("Switch organisation", "Account") instead of a naked list.
- Full keyboard navigation: arrow keys, Home/End, Escape (closes + returns focus to trigger), Enter/Space (on trigger to open), Tab (closes naturally).
- Click outside the wrapper closes the menu.
- `aria-haspopup`, `aria-expanded`, `aria-controls`, `role="menu"`, `role="menuitem"`, `role="separator"` all wired.
- Disabled items + dividers are skipped during keyboard nav.

**Item shape (`DropdownItem`):**
- `label` (required), `icon?` (16px slot), `onClick`, `disabled?`, `danger?` (renders red), `shortcut?` (right-aligned mono hint like "⌘K")

**Bespoke styling (the second-attempt iteration after Pedro flagged the light version felt generic):**
- Editorial header at top of panel: mono uppercase, muted, hairline rule under
- Soft-warm hover signature: `bg 0.04 + hairline border 0.08` on light, `bg 0.06 + border 0.10` on dark — matches the `/about` contact card recipe
- Edge-lit panel surface: `1px inset highlight` on the top edge + layered ambient shadow — same recipe as `.oga-btn` from Brand v3
- Editorial padding (10px vertical) for breathing room without cramping
- 200ms ease transitions throughout
- Danger items render in `--oga-status-red` with red-tinted bg on hover

**Dark surface variant** via `[data-oga-surface="dark"]` — graphite-ink panel, warm-white text, same soft-warm hover progression. Used inside the sidebar.

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/dropdown-menu.tsx` (new) — Component + types (DropdownItem, DropdownDivider, DropdownEntry, DropdownAlign)
- `apps/web/src/app/design-v2/_shared/dashboard/dropdown-menu.css` (new) — All visual styling, light + dark, edge-lit panel recipe, soft-warm hover signature, divider styling, header eyebrow
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added 5 light variants + 2 dark variants (including the org-switcher pattern AR-234 will consume)
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added showcase-only trigger utility classes
- `docs/DESIGN/DASHBOARD/AR-220_modal.md` — Carried forward from previous ticket

## Decisions

- **Uncontrolled by default, no controlled mode in v1.** Most consumers want fire-and-forget (click trigger → click item → action runs → menu closes). If a consumer later needs to programmatically open/close, we add `open` / `onOpenChange` then. YAGNI for now.
- **Items + dividers as a discriminated union, not separate `items` + `dividers` props.** Keeps the consumer's intent declarative — `[item, item, divider, item]` reads top-to-bottom matching the visual order. Position is implicit.
- **Optional `header` eyebrow.** First pass had no header. Pedro flagged that the light version felt generic vs the dark variant. Editorial header adds identity to the menu (not just a naked list) and matches the eyebrow rhythm from `/about` and `/products/*`.
- **Edge-lit panel recipe.** Same `box-shadow` recipe as `.oga-btn`: `1px inset highlight on top + layered ambient shadow underneath`. Pulls the "edge-lit material" Brand v3 button vocabulary into the dropdown panel — consistent with the rest of the design system.
- **Soft-warm hover signature.** Initial hover was a flat 0.06 ink bg. Pedro pointed at the `/about` contact card hover (0.04 → 0.06 bg, 0.12 → 0.28 border, 200ms ease) — that's the OneGoodArea hover progression. Adopted that recipe: 0.04 bg + 0.08 hairline border on light, 0.06 bg + 0.10 border on dark.
- **State updates in handlers, not effects.** First version called `setState` inside a `useEffect`, which triggered the `setState-in-effect` lint warning ("cascading renders"). Restructured so `focusIndex` updates happen in the trigger click/key handlers; the effect only does DOM-side-effect work (calling `.focus()` on the matching ref). Cleaner pattern + no cascades.
- **No `useToast`-style global state.** The dropdown is local UI; consumers wire each instance. Compare to Toast (AR-222) which will need a provider + global stack.

No ADR — extracting a UI primitive is mechanical. ADR 0037 at end of Phase 0 documents all 7 together.

## Tests

No unit tests for the component (apps/web has no RTL setup). Keyboard navigation + click-outside logic is type-checked and visually verified via the 7 showcase variants. RTL gets installed when AR-230 DataTable ships.

**Gates at merge:** apps/api 869/869 · apps/web 306/306 · contracts 80/80 · typecheck clean · lint 0 errors. CI all green.

## Pedro's localhost approval

- Date: 2026-06-05
- Notes: First attempt — clean dropdown with basic 0.06 hover. Pedro flagged the LIGHT version felt generic vs the dark one ("drop down menu on dark is cool, both should be a bit more bespoke"). Iteration: added editorial `header` prop, divider support with optional labels, edge-lit panel (inset highlight + layered shadow), soft-warm hover progression matching the `/about` contact card recipe, refined padding rhythm. Second attempt: approved ("cool").
- Iteration cycles: 1

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:
- AR-234 OrgSwitcher (Phase 1) — uses the dark variant with the exact org-switcher pattern in the showcase
- User menu at the bottom of the sidebar (Phase 1)
- Row actions on every data table that ships in Phase 3 onwards
- Sort selectors on tables across the Levers UI (Phase 4)

## Process note

Merged with `gh pr merge --admin`. Pedro's "cool" + delegation "merge when CI is green and start the other straight after merge, whatever u think is best" satisfied AR-217 Hard Rule #7.

## Follow-ups

- AR-222 `<Toast>` is the next ticket (independent; starting immediately per Pedro's delegation).
- When AR-234 OrgSwitcher ships in Phase 1, it will be the first real consumer of DropdownMenu. If anything in the API needs tweaking based on that integration, file a follow-up ticket.
- When AR-230 DataTable lands, install RTL + add component tests for DropdownMenu's keyboard navigation + click-outside detection.
