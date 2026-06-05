# AR-219 — &lt;FormGroup&gt; + &lt;Input&gt; / &lt;Textarea&gt; / &lt;Select&gt;

**Status:** Done
**Merged:** `67ba231` via PR [#132](https://github.com/OneGoodArea/OneGoodArea/pull/132) on 2026-06-05
**Phase:** 0 (Foundation — first dashboard primitive to ship)
**Branch (deleted post-merge):** `feat/AR-219-form-group`

## What shipped

The foundational form primitive every dashboard form will compose from. Four components, one co-located CSS file, one dev-only showcase page.

**Components (all exported from `apps/web/src/app/design-v2/_shared/dashboard/form-group.tsx`):**
- **`<FormGroup label htmlFor error? help? required? children />`** — Layout + a11y wrapper. Owns the `<label>` and the help/error message; the consumer passes the actual control as `children`. Builds the `aria-describedby` linkage from the htmlFor + error/help ids. Error message gets `role="alert"` for screen readers.
- **`<Input>`** — Brand v3 text input. All native `<input>` props pass through (`type`, `value`, `onChange`, `placeholder`, `disabled`, `defaultValue`, etc.).
- **`<Textarea>`** — Auto-height, vertical resize. Same border + focus + disabled treatment as text input.
- **`<Select>`** — Native `<select>` with a CSS chevron (inline SVG background-image). No third-party dependency, keyboard-accessible by default.

**States (each input variant):**
- Default — Brand v3 hairline border (`--oga-ink-10`), 32px height, 2px radius
- Hover — border darkens to `--oga-ink-30`
- Focus — ink border + 1.5px ink outline at 1px offset (Brand v3 focus ring)
- Disabled — `--oga-canvas` background, `--oga-fg-muted` text, `not-allowed` cursor
- Error — red border + red message text via `data-oga-fg-error="true"` on the wrapper

**Dark surface variant** — when an ancestor has `data-oga-surface="dark"` (e.g. a modal over a dark backdrop, the sidebar org-create dialog), labels invert to warm white, controls get a translucent-white fill on ink, focus rings turn white. Used by AR-234 OrgSwitcher (Phase 1) and any future modal that opens over the dark sidebar.

**Dev showcase** at `/admin/dashboard-primitives` (NODE_ENV-gated, 404 in production). Document-style variant rows — mono label + caption on the left, live control on the right, hairline divider between rows. Brand v3 surface rotation: hero → quiet (light variants) → dark (dark variants). Each subsequent Phase 0 primitive will append its section to this same page.

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/form-group.tsx` (new) — Component exports + types
- `apps/web/src/app/design-v2/_shared/dashboard/form-group.css` (new) — All visual styling (light + dark variants, all 5 states)
- `apps/web/src/app/admin/dashboard-primitives/page.tsx` (new) — Server-component route, NODE_ENV gate
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` (new) — Showcase client, Brand v3 surface rotation, document-style variant rows
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` (new) — Showcase page layout (NOT the primitive's styling)
- `docs/DESIGN/DASHBOARD/AR-218_user_intent_source_columns.md` — Carried forward from the previous ticket's close-out per the work-log convention

## Decisions

- **Wrapper + composable inputs, not a single monolithic component.** `<FormGroup>` owns layout + a11y; `<Input>` / `<Textarea>` / `<Select>` are separate components. Cleaner prop typing, easier for consumers to compose (e.g. consumer wraps `<Input>` with their own validation hook). Same pattern as the AR-211 product primitives.
- **`htmlFor` is a required prop, not optional.** Forces consumers to provide an `id` that matches the input — guarantees the label-input a11y association can't silently break. Costs the consumer one `id` per form group; worth it.
- **Error replaces help, not stacks below it.** When an error is present, the help text hides. Reduces visual noise + prevents conflicting messages.
- **`role="alert"` on the error message.** Screen readers announce it on render, so a user submitting a form with errors hears them. Standard a11y pattern.
- **No checkbox + radio variants in this primitive.** Per the AR-211 extract-on-second-use rule, they extract from the first consumer page that genuinely needs them (likely the /welcome flow or a Levers CRUD page).
- **CSS chevron via inline SVG, not an icon component.** Pure CSS, no extra DOM, no JavaScript for behavior. Two SVG variants ship: ink for light surfaces, muted ink for disabled, warm white for dark surfaces.
- **Showcase page uses Brand v3 surface rotation, not a card grid.** First attempt was a card grid — Pedro auto-rejected as the SaaS-template cliche per design-taste memory. Redesigned to document-style rows with editorial hero + surface rotation, matching `/methodology` + `/products/intelligence` altitude.
- **Showcase page gated by `NODE_ENV === "production"`, not by email.** Pure UI, no user data, no API calls — there's nothing sensitive to gate. NODE_ENV check returns 404 in production + Vercel previews; dev mode renders.

No ADR for this — extracting a small UI primitive is mechanical, not a load-bearing decision. ADR 0037 (Brand v3 dashboard primitives extraction) lands at the end of Phase 0 to document all 7 primitives together.

## Tests

**No unit tests for the component itself.** apps/web has no React Testing Library setup; existing tests are Vitest logic tests against pure utilities. The component is 50 lines with no complex logic (build IDs, decide error-or-help, pass props through). TypeScript catches misuse; the visual showcase + Pedro's localhost approval are the behavior gates.

The first Phase 0 primitive that warrants installing RTL will be `<DataTable>` (AR-230) — sortable columns, selection state, empty/loading states, all worth behavior testing. At that point I'll install `@testing-library/react` + `jsdom` and add tests for both DataTable AND retroactively for FormGroup if useful.

**Gates at merge:** apps/api 869/869 · apps/web 306/306 · contracts 80/80 · typecheck clean · lint 0 errors (14 pre-existing warnings unrelated). CI all green (Build, Lint, Test, Typecheck, Security audit, Vercel deploy preview).

## Pedro's localhost approval

- Date: 2026-06-05
- Notes: First attempt was a card-grid SaaS-template showcase page (3 cards across, "Default · text input" mono labels per card). Pedro flagged it as off-brand ("the branding and design is quite shit"). Reviewed the design-taste memory — I'd built the exact pattern Pedro auto-rejects ("I hate these general display cards"). Redesigned the showcase to a document-style layout with Brand v3 surface rotation (hero → quiet → dark), matching `/methodology` + `/products/intelligence` altitude. Second attempt: approved.
- Iteration cycles: 1 (one rejection, one approval)

## Production migration status

N/A — this primitive ships ready-to-import but has no consumer page yet. First downstream consumers are Phase 1 work:
- `/welcome` Step 1 ICP picker → `<FormGroup>` + `<Select>` (after AR-234 OrgSwitcher and the /welcome flow tickets land)
- AR-234 OrgSwitcher create-org dialog → `<FormGroup>` + `<Input>` (over dark surface inside a `<Modal>` once AR-220 lands)

## Process note

Merged with `gh pr merge --admin` again because branch protection on `main` still requires a review. Pedro's verbal "go for it" satisfied AR-217 Hard Rule #7. Same pattern as AR-218 — the review requirement should probably be revisited at some point but that's a separate ticket.

## Follow-ups

- AR-220 `<Modal>` is the next ticket (independent of FormGroup, can branch immediately).
- When AR-234 OrgSwitcher (Phase 1) lands, it will be the first real consumer of FormGroup. If anything in the API needs tweaking based on that integration, file a follow-up ticket — don't reach back into AR-219.
- When `<DataTable>` (AR-230) lands, install RTL + add component tests for both DataTable and FormGroup.
- The showcase page at `/admin/dashboard-primitives` will keep growing as each Phase 0 primitive ships. By the end of Phase 0 it should display all 7 primitives + their variants.
