# AR-239 — &lt;Tooltip&gt;

**Status:** Done
**Merged:** `3247acc` via PR [#141](https://github.com/OneGoodArea/OneGoodArea/pull/141) on 2026-06-06
**Phase:** 0.5 (Foundation — 2nd of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-239-tooltip`

## What shipped

Short non-blocking explanations for hover + focus surfaces across the dashboard. Wrapper API — `<Tooltip content="...">{trigger}</Tooltip>`.

**Planned consumers (5+):**
- RBAC reason on disabled buttons ("Last-owner guard. Promote someone first.")
- Signal descriptions ("Within-country percentile (0–1).")
- Methodology pin warnings ("Owner-only. Pinned to engine v2.0.2.")
- Status hovers ("02:42 BST · 200 OK · 142ms")
- Webhook signing secret reveal ("Reveal-once. Cannot show again.")

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/tooltip.tsx`):**

```ts
interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: "top" | "bottom";    // default "top"
  surface?: "dark" | "light";       // default "dark"
  delay?: number;                    // ms before show on hover; default 250
}
```

**Behaviour:**
- **Hover delay (250ms default)** for mouse users; **immediate show on focus** for keyboard users (no artificial wait for an interaction they didn't request)
- **Dismisses on:** blur, mouse-leave, Escape key
- **Auto-flips placement** when near viewport edges via `useLayoutEffect` (measures + sets resolvedPlacement before paint, so no one-frame flicker of the wrong side)
- **`role="tooltip"`** on the panel, **`aria-describedby`** wired on the trigger wrapper (only when open — vacant when closed so screen readers don't announce empty descriptions)
- Children wrapped in an `inline-flex` span (no `React.cloneElement` — cleaner for custom-component triggers)

**Visual treatment (Brand v3 — v3 after 2 iteration cycles):**
- **Typography:** Geist mono 11px, 0.01em letter-spacing — reads as editorial / technical / on-brand for the B2B infrastructure dashboard
- **Geometry:** 420px max-width with `white-space: nowrap` by default. Short labels stay single-line (Linear/Vercel/Stripe pattern); long content wraps past 420px via `word-wrap`. Padding 6×11px, border-radius 5px.
- **Surface:** **flat solid** (`rgba(26, 28, 31, 0.96)` dark / `rgba(255, 255, 255, 0.97)` light) — gradients on a small tooltip surface read as muddy noise; flat solid is the correct vocabulary at this scale.
- **Modern depth:** `backdrop-filter: blur(6px)` for the frosted-glass feel + layered shadow (`0 1px 0 inset` top highlight + `0 4px 12px` ambient drop + `0 8px 24px -4px` extended ambient).
- **6px rotated-square arrow** via `::after` pseudo-element. Inherits the panel's `background` + `border-color` so it reads as part of the same surface (not a separately-drawn triangle with no border). Flips between top + bottom placement automatically.
- **Fast fade-in (120ms opacity-only animation).** No slide — slide on hover-open feels sluggish.
- **Light variant** (`surface="light"`) for use on dark scaffolding pages — same flat-solid + arrow + blur recipe, inverted palette.

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/tooltip.tsx` (new, ~165 lines) — Component + types + delay/timer state + placement auto-flip
- `apps/web/src/app/design-v2/_shared/dashboard/tooltip.css` (new, ~120 lines) — All visual treatment, both variants, arrow, animation
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `TooltipSection` (6 light variants) + `TooltipDarkSection` (2 dark variants) + `InfoGlyph` inline helper for the canonical "hover for context" affordance
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added 7 `.oga-prim-tooltip-*` utility classes (label-row, eyebrow, info-wrap, cursor-default, sentence, underline + light/dark variants) to replace inline styles in the showcase
- `apps/web/tests/unit/tooltip.test.tsx` (new, ~185 lines) — 10 RTL component tests using `vi.useFakeTimers` for the hover-delay path

## Decisions

- **Wrapper API over `cloneElement`.** Children prop is wrapped in an `inline-flex` span that handles all events. Cleaner than `React.cloneElement(children, { onMouseEnter, ... })` for custom-component triggers that may not pass through event props or that own their own event handlers. The wrapper is `display: inline-flex` so layout doesn't reflow around the trigger.
- **Focus skips the delay, hover uses it.** Keyboard users tabbing through a form shouldn't wait 250ms for an explanation tooltip — they explicitly requested focus. Mouse users hovering at speed don't want a flash of tooltips on their way past — hence the delay. The implementation tracks the show-timer as a `useRef` so blur/mouse-leave can cancel a pending show.
- **No portal in v1.** Absolute positioning relative to the inline-flex wrapper handles every planned dashboard surface fine. If a real consumer hits `overflow: hidden` clipping (e.g. inside a Modal body), extract a portal variant then. Same convention as Toast (which DOES use a portal because it sits above modals).
- **No third-party positioning library.** popperjs / floating-ui solve a much more complex problem (collision detection across N axes, flip + shift + slide modifiers, virtual references). Tooltip needs top-or-bottom auto-flip — a 20-line `useLayoutEffect` with `getBoundingClientRect()` covers it. Avoids the dependency footprint + bundle cost + version-pin maintenance.
- **`useLayoutEffect` not `useEffect`.** Measurement + state update must complete before browser paint, otherwise the user sees the tooltip on the wrong side for one frame. `useLayoutEffect` runs synchronously after DOM mutation but before paint, which is the correct semantic.
- **No reset on close.** The original implementation reset `resolvedPlacement` to the consumer's preferred placement when `open` flipped to false. The lint rule (`react-hooks/set-state-in-effect`) caught this as a cascading-render risk. Removed: when closed the panel doesn't render at all, so any stale `resolvedPlacement` is invisible. Next open's `useLayoutEffect` re-measures + corrects with the before-paint timing guarantee.
- **Mono not sans for the panel typography.** Initial cut used Geist sans 12.5px — Pedro flagged the v1 as "horrible." Switched to mono 11px in v2 and the editorial feel landed. Mono is also more space-efficient per character for the technical-label content tooltips actually carry.
- **Flat solid not gradient.** v1 used a `linear-gradient(180deg, #1F2125, #1A1C1F)` (the same recipe used by DataTable dark + Sidebar). At tooltip scale (22×420px) a gradient reads as muddy noise, not material. Flat `rgba(26, 28, 31, 0.96)` solid + 6px backdrop blur is the correct vocabulary.
- **Backdrop blur for modern depth.** Pedro's "more modern" feedback led to `backdrop-filter: blur(6px)`. Picks up content scrolling underneath which gives the panel a real material feel (vs a flat unmoored rectangle).
- **6px arrow as rotated-square ::after.** A CSS-triangle (`border-color` trick) has no border — it would float next to a panel that has one. The rotated-square approach inherits the panel's `background` + `border-color` so the arrow IS part of the panel surface. Half-hidden behind the panel body so only the tip shows.
- **CI caught the lint error my local didn't.** Initial commit had `setResolvedPlacement(placement)` inside the `if (!open)` early-return branch — local `npm run lint` passed (probably stale rule cache) but CI flagged it. Fixed by removing the unnecessary reset. Pattern noted: trust CI's lint result, not just local pre-push verification.

## Tests

10 RTL component tests at `apps/web/tests/unit/tooltip.test.tsx`:

1. Renders the trigger child but no tooltip panel initially
2. Shows the tooltip on focus (no delay path)
3. Hides the tooltip on blur
4. Dismisses the tooltip when Escape is pressed
5. Uses the hover delay before showing on mouse enter (uses `vi.useFakeTimers` + `advanceTimersByTime`)
6. Hides on mouse leave AND cancels any pending show timer
7. Wires `aria-describedby` from the trigger wrapper to the tooltip when open
8. Does NOT have `aria-describedby` when the tooltip is closed
9. Applies the light surface variant via `data-surface` attribute
10. Defaults to dark surface variant

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **348/348** (was 338; +10 new) · CI all 7 checks green after the lint-fix push (`bd6d25e`).

## Pedro's localhost approval

- Date: 2026-06-06
- Iteration cycles: 2
  1. **v1** — sans 12.5px, graphite gradient, edge-lit material recipe, slide-in animation, 280px max-width → Pedro: *"horrible tooltip"*
  2. **v2** — mono 11px, flat solid, hairline border, 220px max-width, 6px rotated-square arrow, 120ms fade → Pedro: *"better, but i dont get why its so narrow upwards, why dont we make it go to the side a bit more, and a bit more modern"*
  3. **v3 (shipped)** — kept mono + arrow + fast fade from v2; widened max-width 220 → 420px; `white-space: nowrap` by default (single-line tooltips); border-radius 3 → 5px; `backdrop-filter: blur(6px)` + layered shadow (`0 1px 0 inset` + `0 4px 12px` + `0 8px 24px -4px`) → Pedro: *"yep that's a lot better"*

Also flagged in conversation: my self-diagnosis between v1 → v2 correctly identified the major issues before Pedro confirmed. Saved one iteration cycle.

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:

- **Phase 4 Levers UI:** Members page (last-owner-guard tooltip), Methodology page (owner-only mutation warning), IP allowlist (current-IP-status hover)
- **Phase 3 Monitor:** Webhook delivery status hover, change threshold info glyph
- **Phase 2 Signals playground:** signal description info glyphs next to every signal in the rank_areas filter builder
- **Phase 1 `/dashboard` Home top strip:** plan badge tooltip showing entitlement details

## Process note

- Branch + commits per the established loop. 4 commits on this branch (work-log carry-forward + primitive + tests + showcase + 1 fix commit after the CI lint failure).
- Merged with `gh pr merge --admin` per Pedro's standing delegation. Branch deleted on merge.
- **Render deploy:** auto-deploy triggered on the squash to main. Pedro will redeploy from dashboard if a Render port-scan flake recurs (same pattern as AR-237).

## Follow-ups

- **Portal variant** when a real consumer hits `overflow: hidden` clipping (e.g. Modal embedded tooltips). New AR-key at extraction time per the AR-211 convention.
- **Touch long-press** behaviour is explicitly out of scope per the Jira ticket. Mobile users currently see no tooltip on touch — fine for v1; revisit when a real mobile consumer needs it.
- **Rich content** (lists / multiple paragraphs / inline icons) explicitly out of scope. Single-string content keeps the primitive focused. If a consumer needs more, use `<DropdownMenu>` or `<Modal>`.
- **AR-240 `<CodeBlock>`** is next (3rd of 8 Phase 0.5 primitives).
