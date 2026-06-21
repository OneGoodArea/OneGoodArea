# AR-228 — &lt;Tabs&gt;

**Status:** Done
**Merged:** `24b8dc9` via PR [#136](https://github.com/OneGoodArea/OneGoodArea/pull/136) on 2026-06-06
**Phase:** 0 (Foundation — fifth dashboard primitive to ship)
**Branch (deleted post-merge):** `feat/AR-228-tabs`

## What shipped

Horizontal tab strip primitive at Brand v3 altitude. The component renders **only** the strip — consumers render panel content based on `activeId`. Keeps the primitive focused; consumers keep control over layout, lazy mounting, URL syncing, and transitions.

Used (planned) for:
- Intelligence sub-tabs (Query / Natural language / Peers / Insights / Forecast — D4 locked)
- Settings page sections (Profile / Members / API keys / Webhooks / Billing)
- Monitor sub-views (Portfolios / Changes feed / Webhooks / Alerts)
- Any surface that needs to switch between related-but-distinct panels

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/tabs.tsx`):**
- Controlled API: `<Tabs items activeId onChange variant? aria-label?>`
- `TabItem` interface: `{ id, label, icon?, badge?, disabled? }`
- Two visual variants via `variant`: `"underline"` (default) or `"pill"`

**Accessibility (WAI-ARIA Tabs pattern):**
- `role="tablist"` on the container, `role="tab"` on each button
- `aria-selected` reflects active state; `aria-controls` points at `${id}-panel`
- **Roving tabindex** — only the active tab is `tabIndex=0`; others are `tabIndex=-1`
- Arrow keys (`ArrowLeft` / `ArrowRight`) move focus + activate the next selectable tab
- `Home` jumps to the first selectable tab; `End` jumps to the last
- Disabled tabs are **skipped** by keyboard navigation (`moveFocus` advances past them, wrapping if needed)
- `aria-label` on the tablist is optional but encouraged for screen readers
- Focus ring (1.5px ink outline + 2px offset) follows the Brand v3 focus-visible recipe

**Visual treatment (Brand v3):**
- Geist sans 14px medium; `--oga-ink` active, `--oga-fg-muted` inactive
- Soft-warm hover signature on inactive tabs matches `.oga-dropdown__item` + `/about` page card recipe
- **Underline variant:** hairline bottom border on the strip; 2px ink line draws under the active tab (warm-white on dark)
- **Pill variant:** active tab gets a small ink-tinted rounded bg with the edge-lit material shadow recipe (same as `.oga-btn` + `.oga-dropdown__panel`)
- **Badges:** mono 10.5px digits in a pill; active tab inverts the badge (ink bg, white digit) to match the underline emphasis
- **Icons:** optional 16px slot, inherits `currentColor` so colour follows tab state
- Horizontal scroll on narrow widths (`overflow-x: auto`, hidden scrollbar)
- **Dark surface variant** via `[data-oga-surface="dark"]`: inactive text desaturates to 55% warm-white; active accents lift to warm-white; pill bg uses translucent warm-white wash

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/tabs.tsx` (new) — `Tabs` component, `TabItem` / `TabsProps` / `TabsVariant` types
- `apps/web/src/app/design-v2/_shared/dashboard/tabs.css` (new) — Underline + pill variants, dark surface treatment, badge styling, scroll behaviour
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `TabsSection` (light, 6 variants) + `TabsDarkSection` (dark, 2 variants); 17 inline 14×14 icons for the tab labels
- `docs/DESIGN/DASHBOARD/AR-222_toast.md` — Carried forward from the previous ticket (work-log convention)

## Decisions

- **Strip-only primitive — no panel rendering.** The component is just the strip. Consumers render panels based on `activeId`. Keeps the API focused and lets each surface choose its own layout / lazy-loading / URL-sync strategy without the primitive prescribing one. Roving tabindex still works because the tabs themselves form the focus group; the panel association is declared through `aria-controls` so a future page that wants to wire keyboard focus into the panel can do so.
- **Two variants, not three.** Underline for editorial / page-level segments (Intelligence sub-tabs, Settings sections); pill for compact filter strips and view-mode toggles. A vertical-tabs variant is explicitly **out of scope** per the Jira spec — if it ships, it'll be a separate `<VerticalTabs>` primitive.
- **Roving tabindex over "all tabs are tabbable".** WAI-ARIA Authoring Practices recommends roving tabindex for tabs so the Tab key escapes the strip after one stop, not after every tab in a long strip. Arrow keys move focus + activate together (single-tab pattern); a "manual activation" version would require holding focus without firing onChange — punted to YAGNI.
- **Wrap-around arrow nav with disabled-skipping.** `moveFocus` wraps from end to start and skips disabled tabs. The `safety` counter caps the loop at `items.length` iterations so an all-disabled list doesn't infinite-loop.
- **Bespoke 14×14 line icons per tab in the showcase.** Pedro asked for per-tab icons after the first localhost showing. Built 17 inline glyphs at 14×14 viewBox with 1.3px stroke — consistent with the existing showcase inline icons (`ChevronIcon`, `MoreIcon`, `GridIcon`, etc.). Where the concept overlaps with the `AiqIcon` set (`key`, `billing`, `compare`), the silhouette mirrors the higher-altitude icon so the visual idea reads the same across hero and dashboard surfaces.
- **Hero glyphs don't drop down to tab scale.** The homepage `GlyphWebhooks` (section 04 IntegrationSection) is a 100×100 hero illustration with three concentric pulse arcs. At 14×14 it would smudge and the pulse animation would distract. Instead, the inline `WebhookIcon` mirrors the same **visual grammar** — source dot left + arcs emitting outward + subscriber dot right — compressed to inline scale. Same idea, different vocabulary.
- **Pill range strips stay label-only.** Period filters ("1Y / 6M / 3M / 1M") and the dark range strip didn't get icons. Adding glyphs next to two-character range labels would be visual noise — the label *is* the data.
- **Showcase composes both surface variants.** Two sections (`TabsSection` quiet + `TabsDarkSection` dark) follow the same rhythm as FormGroup and DropdownMenu showcases. Surface rotation reads hero → quiet → dark → quiet → quiet → dark → quiet → quiet → dark per `feedback_design_bar.md`.

No ADR — extracting a UI primitive is mechanical. ADR 0037 at the end of Phase 0 will document all 7 primitives together.

## Tests

No unit tests for the component (apps/web has no RTL setup yet). Roving tabindex, arrow-key nav, Home/End jumps, disabled-skip, and variant switching are type-checked and visually verified via the 8 showcase variants. RTL gets installed when AR-230 `<DataTable>` ships and component tests for keyboard behaviour land then.

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests 306/306 · CI all 7 checks green (Build / Lint / Test / Typecheck / Security audit / Vercel preview · Vercel deploy).

## Pedro's localhost approval

- Date: 2026-06-05
- Notes: First version (no per-tab icons) approved as a clean baseline. Pedro then asked for an icon on every tab, consistent with existing icons where they exist. Built 17 bespoke inline glyphs covering Intelligence / Settings / Monitor / Portfolio views. Pedro then asked specifically about the homepage section 04 webhook glyph (`GlyphWebhooks`) — discussed why dropping a 100×100 hero illustration into a 14×14 tab slot smudges, and instead redesigned the inline `WebhookIcon` to mirror the hero glyph's visual grammar at tab scale (source dot + arcs + subscriber dot). Pedro: "all good, I think we can keep going."
- Iteration cycles: 2 (icons added, then WebhookIcon refined to mirror hero glyph)

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:
- Intelligence sub-tabs (Phase 5, AR-XXX — query / NL / peers / insights / forecast switcher)
- Settings page sections (Phase 4 / Levers UI — profile / members / API keys / webhooks / billing)
- Monitor sub-views (Phase 3 — portfolios / changes feed / webhooks / alerts)
- Any compact filter strip on a card or panel (pill variant)

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. Same pattern as AR-218–222. Branch deleted on merge.

One iteration cycle on the Jira spec: the spec asked for branch `feat/AR-217-A11-tabs` but I used `feat/AR-228-tabs` to match the convention recent tickets have all followed (`feat/AR-<key>-<slug>` per AR-218–222). Flagged in the Jira PR comment for transparency.

## Follow-ups

- AR-230 `<DataTable>` is the next ticket (largest primitive in Phase 0; will trigger RTL install for component testing).
- When the app's root client layout exists in Phase 1, the Tabs primitive will be wired into the actual Intelligence page (replacing whatever placeholder strip is there today).
- The pre-existing NextAuth `ClientFetchError` (`/api/auth/session` returning HTML instead of JSON) showing in the dev console on `/admin/dashboard-primitives` is unrelated to AR-228 — flagged for a separate follow-up ticket if it surfaces on real authenticated dashboard pages.
- AR-237 ADR 0037 will cover the full Phase 0 primitive set: FormGroup / Modal / DropdownMenu / Toast / Tabs / DataTable / Sidebar.
