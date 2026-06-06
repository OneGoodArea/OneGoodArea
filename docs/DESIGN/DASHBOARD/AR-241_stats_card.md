# AR-241 — &lt;StatsCard&gt;

**Status:** Done
**Merged:** `85c5c1a` via PR [#144](https://github.com/OneGoodArea/OneGoodArea/pull/144) on 2026-06-06
**Phase:** 0.5 (Foundation — 4th of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-241-stats-card`

## What shipped

Metric tile primitive for the `/dashboard` Home top strip + every consumer surface that renders metric summaries. Generalises the existing `StatCell` from AppShell with progress bar, trend delta, inline action slot, and dark variant.

**Planned consumers (2–3):**
- **`/dashboard` Home top strip** (Phase 1 — AR-217-B5): plan badge + quota bar + adaptive Upgrade CTA reading from `/v1/me`
- **`/api-usage` page**: metric tiles for API + MCP usage breakdown
- **`/dashboard/billing` summary**: plan + next billing date + usage tiles

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/stats-card.tsx`):**

```ts
interface StatsCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: { value: string; trend: "up" | "down" | "neutral" };
  progress?: { current: number; max: number };
  accent?: "strong" | "moderate" | "weak";
  action?: { label: string; href?: string; onClick?: () => void };
  surface?: "light" | "dark";
}
```

**Behaviour:**
- **Label** in mono caps at 0.22em letter-spacing with a colored accent dot (same recipe as legacy `StatCell`)
- **Value** in Geist sans 26px, weight 500, -0.02em letter-spacing — dominant element with `tabular-nums` so numbers align in a 3-card strip
- **Hint** in mono caps at 0.14em — supporting context below the value
- **Delta** inline at the value baseline (right-aligned via `justify-content: space-between`) — up = green `↑`, down = red `↓`, neutral = muted `→`. `data-trend` attribute drives the colour palette.
- **Progress bar** with `role="progressbar"` + `aria-valuemin/max/now`. Fill width via CSS custom property (`--oga-stats-card-pct`) set on the fill element's style — same dynamic-value-via-style pattern DataTable uses for `--oga-dt-cols`. Capped at 100%, floored at 0%.
- **Action** accepts `href` (renders `<Link>`) OR `onClick` (renders `<button>`) — same pattern as EmptyState. Mono caps label with translating arrow on hover.

**Accent palette (matches existing StatCell `appRag`):**

| Accent | Light dot + value | Dark value (lifted for legibility) |
|---|---|---|
| `strong` (default) | ink | warm-white |
| `moderate` | amber `#d49900` / `#6e5300` | `#E8B763` |
| `weak` | red `#d13a1e` / `#a01b00` | `#E87A65` |

**Brand v3 visual treatment:**
- **Light:** warm-white gradient (`#FFFFFF → #FAF8F4`) + edge-lit material recipe (inset top highlight + deep ambient shadow). Same vocabulary as `.oga-code-panel` + DataTable + EmptyState + CodeBlock light.
- **Light asymmetric accent (signature):** bottom-left radial-gradient warm-grey wash (`rgba(26,28,31,0.045)` fading to transparent). The light counterpart to the dark variant's dot-field at top-right — gives the card the same "calibrated instrument" asymmetric character without competing with the content. Resolves first-cut feedback that the white variant wasn't as on-brand as black.
- **Dark:** graphite gradient (`#1F2125 → #1A1C1F`) + dot-field motif anchored at top-right (the `.oga-section-dark` recipe — 14px grid, warm-white 0.10 opacity, radial-gradient ellipse mask). Same recipe as Sidebar + DataTable + EmptyState + CodeBlock dark.

**Overflow-defensive layout** (after first-cut feedback that content broke out of the card in tight columns):
- Card has `overflow: hidden` + `min-width: 0` so it shrinks gracefully in tight grid layouts
- Value-row uses `flex-wrap: wrap` so delta can wrap below the value in very narrow columns
- Value has `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — extreme content clips with ellipsis rather than breaking layout
- Delta has `flex-shrink: 0 + white-space: nowrap` — glyph + number always stay together

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/stats-card.tsx` (new, ~165 lines) — `StatsCard` + `ActionButton` helper + types
- `apps/web/src/app/design-v2/_shared/dashboard/stats-card.css` (new, ~250 lines) — All visual treatment: label + dot + value + delta + progress + action + 3 accents + light asymmetric accent + dark dot-field
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `StatsCardSection` (9 light variants) + `StatsCardDarkSection` (2 dark variants). The `Variant` component now takes a `wide?: boolean` prop to drop the showcase's 480px max-width for variants that need realistic surface width.
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — Added `.oga-prim-stats-strip` (3-col CSS Grid, stacks to 1-col below 720px) + `.oga-prim-doc__demo--wide` (max-width: none override)
- `apps/web/tests/unit/stats-card.test.tsx` (new, ~190 lines) — 16 RTL component tests

## Decisions

- **Promoted from deferred — Phase 0.5 batch.** Originally deferred via extract-on-second-use per AR-211 convention. Pedro promoted to Phase 0.5 (2026-06-06) — borderline extract-vs-inline (2-3 consumers) but ship now to keep visual consistency across the top strip + usage page + billing summary.
- **Generalisation over replacement.** The legacy `StatCell` in AppShell stays for now (still exported, still used in any pre-Phase-1 code paths). When `/dashboard` Home redesign ships in Phase 1 (AR-217-B5), consumers switch to `<StatsCard>`. Eventually `StatCell` can be deleted; not in this ticket's scope.
- **Action object, not separate button/link props.** `action: { label, href?, onClick? }` — same shape as `EmptyState`. If `href` is provided, renders `<Link>`; if only `onClick`, renders `<button>`. Avoids the "primary CTA is sometimes a link, sometimes a button" branching consumers would otherwise have to do.
- **Progress fill width via CSS custom property + `style` prop.** Not a styling decision in TSX — the rule that fills width lives in `stats-card.css` (`width: var(--oga-stats-card-pct, 0%)`). The TSX just flows a numeric value through. Same dynamic-value-via-style pattern DataTable already uses for `--oga-dt-cols`. Reviewed against the no-inline-styles rule; this is a value-flowing-into-CSS pattern, not a style-declaration-bypass.
- **Light variant's bottom-left accent.** First cut had the same warm-white gradient + edge-lit material as the other light primitives (DataTable, EmptyState, CodeBlock) — Pedro flagged it as less on-brand than the dark variant which has the dot-field motif. Added a bottom-left radial-gradient warm-grey wash as the **asymmetric on-brand signature** for light surfaces. The vocabulary now has matching asymmetric accents at opposite corners across the two surface variants (top-right dot-field on dark, bottom-left warm-grey on light) — same "calibrated instrument" character on both.
- **Value at 26px not 30px.** First cut used the legacy `StatCell`'s 30px value. Pedro flagged the overflow in narrow showcase columns. Reduced to 26px — still dominant, less crowding. The `/dashboard` Home will have ~360px per card in a 3-card strip; 26px sans at that width breathes correctly.
- **No sparkline.** Out of scope per Jira — defer to `<ChartShell>` consumption when that primitive ships (AR-245). StatsCard stays text-only for v1.
- **`tabular-nums` on the whole card, not just the value.** Numbers in the hint and the delta also line up. Without it, "12,847" in value + "of 50,000" in hint would have inconsistent digit widths.
- **`wide` prop on `<Variant>` is a showcase concern, not a primitive concern.** The 480px max-width on doc-row demo cells is a showcase choice (most primitives look right at that width). The 3-card strip variant needs the full doc-row width to render realistically (~480-560px) so each tile gets ~150-180px which is closer to real `/dashboard` Home proportions. New `wide` prop opts a variant out of the cap.

## Tests

16 RTL component tests at `apps/web/tests/unit/stats-card.test.tsx`:

1. Renders label + value
2. Renders hint when provided
3. Renders delta with the correct trend glyph (`↑` for up + green color)
4. Down trend renders `↓` + `data-trend="down"`
5. Neutral trend renders `→` + `data-trend="neutral"`
6. Progress bar exposes `role="progressbar"` + correct `aria-valuemin/max/now`
7. Progress fill width computed from current/max as CSS custom property
8. Progress fill caps at 100% when current > max
9. Progress fill floors at 0% when current < 0
10. Action renders as `<Link>` when `href` provided
11. Action renders as `<button>` when only `onClick` provided (click fires `onClick`)
12. `data-accent` attribute reflects the `accent` prop (`"moderate"`)
13. Default accent is `"strong"` when omitted
14. `data-surface` attribute reflects the `surface` prop (`"dark"`)
15. No action row when `action` is not provided
16. No `progressbar` role when `progress` is not provided

Mocks `next/link` with a plain anchor (same pattern as Sidebar, EmptyState tests).

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **378/378** (was 362; +16 new) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-06
- Iteration cycles: 1
  1. **v1** — 30px sans value + flex no-wrap + standard warm-white-gradient light surface. Pedro: *"i like how black is very on brand, but white still isn't that much. I can also see on the black one and the white one this: API calls this month / 12,847 / ↑ / +8% / of 50,000 included goes out of the card"*
  2. **v2 (shipped)** — value 30 → 26px; padding 20×22 → 18×20; value-row gets `flex-wrap` + value gets ellipsis + delta gets `flex-shrink: 0`; card gets `overflow: hidden + min-width: 0`; light variant gets a bottom-left radial-gradient warm-grey accent (the light counterpart to dark's dot-field at top-right); 3-card strip variants in the showcase get `wide={true}` so the cells drop the 480px max-width → Pedro: *"Yeah a lot better. Happy with it."*

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers:

- **Phase 1 AR-217-B5** `/dashboard` Home redesign: top strip with `<StatsCard>` × 3 (Plan / API calls / Webhook deliveries) reading from `/v1/me`
- **`/api-usage` page** (Phase 1 follow-up): API + MCP usage breakdown tiles
- **`/dashboard/billing` summary** (Phase 1 follow-up): plan + next billing + usage summary

When those ship, the legacy `StatCell` in AppShell can be deleted.

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 3 atomic commits (primitive / tests / showcase). Branch deleted on merge.

**Carry-forward convention note:** AR-241's branch started clean off main (no work-log carry-forward) because AR-240's work log shipped via a standalone docs-only PR ([#143](https://github.com/OneGoodArea/OneGoodArea/pull/143)) after Pedro paused work between tickets. From here, the convention resumes: AR-241's work log lands as the first commit on AR-242's branch.

## Follow-ups

- **Sparkline integration** — when `<ChartShell>` (AR-245) ships, add an optional `sparkline?: ChartShellProps` slot to StatsCard. Out of scope here.
- **Real-time updates** — consumer drives via state (re-render on prop change). Animation on value change deferred to v2.
- **Drop legacy `StatCell`** — keep both exported for now. Delete when AR-217-B5 lands and all consumers migrate.
- **AR-242 `<Pagination>`** is next (5th of 8 Phase 0.5 primitives).
