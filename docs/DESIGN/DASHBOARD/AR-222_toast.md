# AR-222 — &lt;Toast&gt; + ToastProvider + useToast

**Status:** Done
**Merged:** `a76a724` via PR [#135](https://github.com/OneGoodArea/OneGoodArea/pull/135) on 2026-06-05
**Phase:** 0 (Foundation — fourth dashboard primitive to ship)
**Branch (deleted post-merge):** `feat/AR-222-toast`

## What shipped

Non-blocking notification stack — corner-anchored bottom-right, newest on top, auto-dismiss with hover-pause. Used everywhere an action wants quiet feedback: preset saved, API key copied, member removed, webhook delivered, 403 admin required, IP not allowed, methodology pin changed.

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/toast.tsx`):**
- `<ToastProvider>` wraps the app (or a section). Renders `ToastViewport` via React portal to `document.body` so toasts sit above any z-index stacking context.
- `useToast()` hook returns `{ toast, dismiss, dismissAll }`. Throws if called outside the provider.
- `toast(opts)` returns the toast's id for programmatic dismiss.

**API:** `{ variant?, title, body?, duration?, action? }`
- `variant`: `"success" | "info" | "warning" | "error"` (default `"info"`)
- `duration`: ms before auto-dismiss; `0` disables (sticky); default 5000
- `action`: `{ label, onClick }` — right-aligned button; clicking fires handler + dismisses

**Behaviour:**
- Corner-anchored bottom-right (configurable position deferred)
- Newest on top; max 5 visible; older evict
- **Hover pauses the timer** (Linear-style UX — full duration after resume)
- Focus pauses too (keyboard users get the same affordance)
- Escape on a focused toast dismisses it
- Click X to dismiss
- `aria-live="assertive"` + `role="alert"` for warning/error; `aria-live="polite"` + `role="status"` for success/info

**Visual treatment (Brand v3):**
- Warm-white card with hairline border + 3px left-edge accent in the status color
- Edge-lit material shadow recipe matching `.oga-btn` + `.oga-dropdown`
- Card body stays neutral so the status color doesn't dominate the message
- Variant icons in the status color (16px SVG glyphs)
- **Dot-field motif** on the right portion of each card — same recipe as `.oga-hero-dark__field` from the homepage hero (radial-gradient circles, 14px grid, mask fade to transparent at ~55% from the right). Subtle ambient texture; pointer-events:none so it never blocks interactions
- Slide-in animation from the right + fade; reduced-motion respected
- Dark surface variant via `[data-oga-surface="dark"]`: graphite-ink card, warm-white text, dot-field with white dots

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/toast.tsx` (new) — ToastProvider, useToast hook, ToastViewport (portal), ToastCard, ToastIcon variants, types
- `apps/web/src/app/design-v2/_shared/dashboard/toast.css` (new) — All visual styling, light + dark, dot-field motif, edge-lit shadow, variant accents, animation
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Wrapped in `<ToastProvider>`, added 7 demo variants
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added `.oga-prim-button-row` utility for the stack-test variant
- `docs/DESIGN/DASHBOARD/AR-221_dropdown_menu.md` — Carried forward from previous ticket

## Decisions

- **Context + hook over a global singleton.** `useToast()` requires a `<ToastProvider>` ancestor. This is annoying for prototypes but correct for SSR + testing — no module-level state, no React-tree-orphan toasts, explicit composition.
- **Portal to `document.body` (not a designated container).** Toasts must visually escape every z-index stacking context (modals, dropdowns, sticky headers). Document body is the simplest universal escape hatch.
- **Mounted-on-effect SSR safety.** Without this, the server renders `null` and the client immediately renders the portal, causing hydration mismatch. The mounted flag delays the portal mount until the first client effect — server + client first paint match. The single `setMounted(true)` is annotated with a targeted `eslint-disable` since the lint rule can't distinguish it from a cascading update.
- **Variant icons inline, not via an icon library.** 4 SVG glyphs (circle-check, triangle-exclaim, circle-x, circle-i) at 16px. Brand-consistent + dependency-free. Custom icons can drop in by exposing a slot if needed later.
- **Stacking limit at max=5.** Hard cap; older toasts evict. Without a cap, a buggy consumer that fires toasts in a tight loop would tank the page. 5 visible is plenty for any real use case.
- **Hover + focus both pause.** Common gap in toast libraries is that keyboard users can't pause to read. We pause on focus too so the same affordance is available.
- **Dot-field motif added on second iteration.** First version had a clean card. Pedro asked for the homepage hero's dot motif on the toast cards — adopted the `.oga-hero-dark__field` recipe (radial-gradient at 0.10 ink opacity, 14px grid, mask fade to transparent at ~55% from the right). Subtle ambient texture that connects the toast to the rest of the OneGoodArea visual vocabulary.

No ADR — extracting a UI primitive is mechanical. ADR 0037 at the end of Phase 0 will document all 7 primitives together.

## Tests

No unit tests for the component (apps/web has no RTL setup). Timer logic, hover-pause, stacking, dismiss-all are type-checked and visually verified via the 7 showcase variants. RTL gets installed when AR-230 DataTable ships.

**Gates at merge:** apps/api 869/869 · apps/web 306/306 · contracts 80/80 · typecheck clean · lint 0 errors. CI all green.

## Pedro's localhost approval

- Date: 2026-06-05
- Notes: First version approved as a clean baseline. Pedro asked for the dot-field motif from the homepage hero added to the toast cards — adopted the `.oga-hero-dark__field` recipe with a left-fading mask. Second attempt approved ("yeah, go on"). Then approved final commit + merge under Pedro's standing delegation ("merge when CI is green and start the other straight after merge").
- Iteration cycles: 1 (dot-field added)

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:
- Every form-saving success/error feedback (Phase 1+)
- "API key copied" / "Webhook signing secret revealed" reveal-once flows (Phase 1+)
- 403 RBAC error surfacing across the Levers UI (Phase 4)
- Bulk async outcomes ("Enriching 47 areas... done") in Monitor (Phase 3)

The app's root layout will eventually wrap everything in `<ToastProvider>` so any page can fire toasts. Until then, each dev page that needs toasts wraps its own client.

## Process note

Merged with `gh pr merge --admin` per Pedro's delegation. Same pattern as AR-218-221.

## Follow-ups

- AR-228 `<Tabs>` is the next ticket (independent of Toast, starting immediately per Pedro's delegation).
- When the app's root client layout exists in Phase 1, mount `<ToastProvider>` there once so the whole authenticated app can fire toasts from anywhere.
- When AR-230 `<DataTable>` lands, install RTL + add component tests for the timer logic + hover-pause.
