# AR-220 — &lt;Modal&gt;

**Status:** Done
**Merged:** `6069447` via PR [#133](https://github.com/OneGoodArea/OneGoodArea/pull/133) on 2026-06-05
**Phase:** 0 (Foundation — second dashboard primitive to ship)
**Branch (deleted post-merge):** `feat/AR-220-modal`

## What shipped

The focused overlay primitive. Used anywhere the dashboard needs to take over the screen for a single interaction — delete confirmations, create dialogs, reveal-once secrets, "Show the curl" panel, methodology pin change.

**Component (`apps/web/src/app/design-v2/_shared/dashboard/modal.tsx`):**
- `<Modal open onClose title size? children footer? closeOnBackdrop? surface? />`
- Built on the native `<dialog>` element, which provides for free: focus trap, escape key handling, body scroll lock, top-layer positioning, `aria-modal` semantics
- Controlled component — consumer owns the `open` boolean; `useEffect` synchronises with `dialog.showModal()` / `dialog.close()`
- Backdrop click closes by default; `closeOnBackdrop={false}` for destructive confirmations where the user must explicitly cancel
- Escape key fires the native `cancel` event; we `preventDefault` + call `onClose` so consumers can intercept (e.g. "are you sure?" guard)
- `surface="dark"` flips the card to graphite-ink with warm-white text — used to escalate destructive moments ("Revoke API key", "Delete org"); the surface change carries the gravity

**Sizes:**
- `sm` — 400px max-width — quick yes/no confirmations
- `md` — 560px max-width (default) — standard dialogs with a title + body + footer
- `lg` — 720px max-width — richer content like code blocks ("Show the curl"), multi-section dialogs

**Behaviour:**
- Smooth open/close animation (opacity + scale, 200ms Brand v3 ease)
- Backdrop is graphite-ink at 60% opacity with 2px blur (`::backdrop` pseudo-element)
- Body scrolls independently if content exceeds `100vh - padding`
- Focus trapped inside the dialog while open; Tab cycles within, Escape closes
- `aria-labelledby` wired to a `useId()`-generated id on the title
- `prefers-reduced-motion: reduce` respected — transitions disabled when set

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/modal.tsx` (new) — Component + types
- `apps/web/src/app/design-v2/_shared/dashboard/modal.css` (new) — All visual styling (light + dark, all sizes, reduced-motion)
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `<ModalSection>` with 6 demo variants
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added `oga-prim-code` / `oga-prim-pre` / `oga-prim-form-stack` showcase-only utility classes
- `docs/DESIGN/DASHBOARD/AR-219_form_group.md` — Carried forward from previous ticket per work-log convention

## Decisions

- **Native `<dialog>` element, not a custom div + portal.** Modern browser support (Chrome 37+, Firefox 98+, Safari 15.4+) is solid; we get focus trap + escape + body scroll lock + top-layer for free; less code + fewer edge cases than rolling our own. The only thing we own is the controlled-state synchronisation effect + the backdrop-click detection.
- **`useId()` for the title id, not a consumer-supplied prop.** The title id only matters for the `aria-labelledby` linkage to the dialog itself; consumers shouldn't have to manage it. React's `useId()` gives a stable unique id per mount that survives SSR.
- **`surface` prop with `"light" | "dark"` instead of a `dark: boolean` flag.** Forward-compatible if we ever add more variants ("dim" / "warm"). Matches the `data-oga-surface` attribute convention from the rest of the design system.
- **No stacked modals.** Per the ticket scope: one modal at a time. Stacking modals is an antipattern (the user loses context); if we genuinely need stacking later, that's a separate primitive.
- **Backdrop click closes by default (configurable opt-out).** Most modals want this; the few destructive-confirmation cases ("Delete this org and all data?") set `closeOnBackdrop={false}`.
- **Escape preventDefault + onClose, not just letting the dialog auto-close.** Gives consumers an interception point — they can show an "are you sure?" confirm-before-closing pattern if needed.
- **No animation library.** Pure CSS opacity + transform with `var(--oga-dur)` and `var(--oga-ease)`. Reduced-motion respected via `@media (prefers-reduced-motion: reduce)`.

No ADR for this — extracting a UI primitive isn't a load-bearing decision. ADR 0037 (Brand v3 dashboard primitives) at the end of Phase 0 will document all 7 primitives together.

## Tests

**No unit tests.** apps/web has no React Testing Library setup; the component's logic is mostly delegated to the native `<dialog>` (focus trap, escape, scroll lock all handled by the browser). The bits we own are the useEffect synchronisation + the backdrop-click detection (`target === dialogRef.current`), both of which type-check and are visually verified via the 6 showcase variants.

**Gates at merge:** apps/api 869/869 · apps/web 306/306 · contracts 80/80 · typecheck clean · lint 0 errors. CI all green (Build, Lint, Test, Typecheck, Security audit, Vercel deploy preview).

## Pedro's localhost approval

- Date: 2026-06-05
- Notes: First render approved on the second attempt for AR-219 (card-grid showcase) but Modal showcase followed that same document-style pattern, so first attempt held. Pedro flagged a separate design conversation mid-PR about the dashboard's overall bespoke quality, referencing the `/about` page's "What we believe" and "Talk to us" sections — the soft warm-white tints (0.04 bg, 0.12 border) + hover progression (0.06 bg, 0.28 border) + 200ms ease transitions. Confirmed that bespoke craft lands in Phase 1+ page compositions (DataTable row hovers, Home stat cards, activity feed entries, etc.), not in the Modal primitive itself (which is utility chrome — Modals look like Modals on purpose).
- Iteration cycles: 0 (no design rework needed for Modal specifically)

## Production migration status

N/A — primitive ships ready-to-import but has no real consumer yet. First downstream consumers in Phase 1+:
- AR-234 OrgSwitcher "Create new org" dialog → composes `<Modal>` + `<FormGroup>` + `<Input>` (the "with form" showcase variant validates this pattern early)
- Phase 4 Levers UI: delete-confirmation modals across Members, Bundles, Presets, Cohorts, Methodology pin, IP allowlist
- Phase 2 Intelligence "Show the curl" panel
- Phase 1 reveal-once secrets (API key on creation, webhook signing secret)

## Process note

Merged with `gh pr merge --admin` again because branch protection on `main` still requires a review. Pedro's verbal "go" satisfied AR-217 Hard Rule #7. Same pattern as AR-218 and AR-219.

## Follow-ups

- AR-221 `<DropdownMenu>` is the next ticket (independent of Modal, can branch immediately). Will follow the same showcase + commit + PR pattern.
- When AR-230 `<DataTable>` lands, install RTL + add component tests for Modal's controlled-state synchronisation + backdrop-click detection.
- AR-234 OrgSwitcher (Phase 1) will be the first real consumer of Modal. If anything in the API needs tweaking based on that integration, file a follow-up ticket — don't reach back into AR-220.
