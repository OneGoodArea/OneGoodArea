# AR-245 — &lt;ChartShell&gt;

**Status:** Done
**Merged:** `c68bc30` via PR [#148](https://github.com/OneGoodArea/OneGoodArea/pull/148) on 2026-06-07
**Phase:** 0.5 (Foundation — **8th and FINAL** promoted-from-deferred primitive)
**Branch (deleted post-merge):** `feat/AR-245-chart-shell`

## What shipped

Three chart variants in one primitive — `line` (single/multi-series + optional confidence band), `bar`, `sparkline` (no axes, inline use). Pure SVG; no D3, no Recharts, no Chart.js.

**Planned consumers (2–3 Phase 2+):**
- Forecast confidence band per ADR 0025 — `POST /v1/forecast` (line + band)
- Insights peer-relative-z chart per ADR 0024 (line)
- `/api-usage` page (bar — daily)
- Sparkline variant slots into StatsCard when AR-217-B5 wires the `/dashboard` Home top strip

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/chart-shell.tsx`):**

```ts
interface ChartPoint { x: string | number; y: number; series?: string; }
interface ChartSeries { key: string; label: string; color?: string; }

interface ChartShellProps {
  variant: "line" | "bar" | "sparkline";
  data: ChartPoint[];
  series?: ChartSeries[];                          // multi-series colour + legend
  confidenceBand?: { lower; upper };               // line only
  xAxis?: { label?, format? };
  yAxis?: { label?, format?, domain? };
  height?: number;                                 // default 280 (line/bar), 48 (sparkline)
  surface?: "light" | "dark";
  // editorial header
  eyebrow?: string; title?: string; caption?: string;
  raw?: boolean;                                   // bypass surface container
}
```

## Decisions

- **Pure SVG, no chart library.** D3 / Recharts / Chart.js each add 50–150 KB and pull in dependencies that don't compose with the Brand v3 vocabulary. For three modest variants with a known feature set (no pan/zoom/animations) the SVG math is ~100 LoC.

- **`niceTicks(min, max, count)` algorithm.** Replaces naive `min + step*i` tick generation. Naive math produced floating-point artifacts like `1473.14999999999` and `250.890000001` that stringified as 12-digit labels, overflowing the y-axis column out of frame on the left. niceTicks picks values rounded to `{1, 2, 5} × 10^k` steps so labels stay short and readable: API usage (1290–2104 range) gets `[1250, 1500, 1750, 2000, 2250]`; Forecast (102–244 range) gets `[100, 150, 200, 250]`.

- **`yDomain` snaps to niceTicks first/last.** Without this the chart fits the padded data range exactly but tick labels (which extend slightly past for nice rounding) would render outside the visible plot area. Snapping the domain to `[ticks[0], ticks[ticks.length - 1]]` keeps the chart top + bottom edges aligned with the rounded gridline labels.

- **`formatNumber` trims trailing zeros.** `(2000 / 1000).toFixed(1)` is `"2.0"` — trimmed to `"2"`. Keeps labels at minimum visual width without losing precision when it's actually needed (e.g. `1.5k` stays).

- **Y-axis label column: absolutely positioned 48px on the left, plot has matching `margin-left: 48px`.** Iterated through:
  1. SVG `<text>` labels — stretched non-uniformly by `preserveAspectRatio="none"`, the bug Pedro flagged first
  2. HTML overlay with percentage positioning — overflowed at narrow widths because label width could exceed the percentage-based space
  3. CSS Grid `grid-template-columns: 44px 1fr` — stretch-height edge cases at some widths still left labels touching the chart
  4. **(shipped)** Absolutely-positioned column + matching plot margin — physically separated by a CSS margin (not a grid track or percentage); no overlap possible regardless of label content width or container width

- **`pad.bottom: 56`** (generous). The bottom y-axis label sits at the baseline, and x-axis labels sit in the bottom-padding band. With `pad.bottom: 36` (initial) the two clustered in the same vertical strip and crowded each other (`"1.2k"` on top of `"Jun 06"`). Bumping to 56 gives clean breathing room.

- **X-axis labels anchored via `bottom: 10px`** (not `top: baselinePct + 4px`). Fixed pixel offset from the container bottom keeps x-labels in their own dedicated zone, independent of container height or chart proportions.

- **INK-first series palette via CSS custom properties.** `--oga-chart-series-1: var(--oga-ink)` (light) / `var(--oga-white)` (dark). Default series rotate through ink + muted ink shades. **Status colours (green/amber/red) are reserved for status semantics** — data shouldn't co-opt them, otherwise green starts meaning "this line" in some places and "good" in others. Consumers pass `series[i].color` explicitly when they actually want a status-keyed line (e.g. `var(--oga-status-green)` for an "actually-green" metric).

- **Confidence band: muted ink wash + ink stroke**, not status-green. Same reasoning — green means status. The band reads as quiet uncertainty.

- **Editorial header (eyebrow + title + caption) as optional props.** When the chart is a standalone card (Forecast page, Insights detail), it carries its own header. When it's embedded in a wider layout, consumer passes nothing and the chart renders without the editorial chrome.

- **`raw` prop bypasses the surface container.** Sparkline defaults to `raw=true` since it's always embedded in another card. Consumers can opt other variants out of the container for tile-body embedding (`/dashboard` Home).

- **Surface container vocabulary inherited from the family.** Warm-white gradient + edge-lit material (light) / graphite gradient + top-right glow (dark) + bottom-left warm-grey radial accent (light). Same recipe as DataTable + EmptyState + StatsCard + CodeBlock + FilterBuilder. Light + dark surface signature now consistent across every dashboard primitive.

- **No D3 / Recharts / Chart.js.** Hard rule per Jira. Dependencies on those charting libraries would balloon the bundle and conflict with the Brand v3 typography + colour vocabulary.

## Bundled stand-alone fixes

This PR also shipped two stand-alone defects discovered during AR-245 localhost review:

1. **`fix(form-group)`: dark `<Select>` background tiling chevron.** The dark variant used `background: rgba(...)` (shorthand) which silently reset `background-repeat` to its default `repeat`. Combined with the chevron `background-image` from the base `.oga-fg__select` rule, the chevron SVG tiled across the entire select field as a wavy/zigzag pattern. Changed to `background-color:` (long-hand) so the base rule's `background-repeat: no-repeat` survives the cascade.

2. **`fix(filter-builder)`: long value overflows the cell.** HTML `<input>` elements have a default `min-width` of intrinsic content size — grid + flex parents respect that, even with `width: 100%` the input can grow past its allocated track. Adding `min-width: 0` to both the value-wrap AND the input lets the cell shrink past the input's intrinsic content size. A typed `999999999` no longer pushes the row out of frame.

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/chart-shell.tsx` (new, ~590 lines) — Component + types + niceTicks + formatNumber + scaleX/scaleY + buildLinePath + buildBandPath
- `apps/web/src/app/design-v2/_shared/dashboard/chart-shell.css` (new, ~330 lines) — Container + editorial header + axes + gridlines + line/bar/band/sparkline + tooltip + crosshair + legend + light/dark variants
- `apps/web/src/app/design-v2/_shared/dashboard/form-group.css` — `[data-oga-surface="dark"]` Select/Input fix
- `apps/web/src/app/design-v2/_shared/dashboard/filter-builder.css` — value-wrap + input `min-width: 0`
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — `ChartShellSection` (5 light variants) + `ChartShellDarkSection` (2 dark variants) + mock data catalogs
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.css` — `.oga-prim-spark-wrap` utility (220px narrow wrapper for the sparkline demo)
- `apps/web/tests/unit/chart-shell.test.tsx` (new, ~260 lines) — 19 RTL component tests

## Tests

19 RTL component tests:

1. Line chart renders a single SVG `<path>` + one circle per data point
2. Bar chart renders one rect per data point
3. Sparkline renders the path but no axes / gridlines / point circles
4. Confidence band renders as a closed SVG path (ends with `Z`) under the line
5. Confidence band omitted when not provided
6. Y-axis gridlines: one per tick
7. Consumer's `yAxis.format` function applied to tick labels
8. `yAxis.domain` override honoured (exercises niceTicks + trimZeros formatting)
9. Multi-series mode renders a legend with one item per series
10. Single-series mode omits the legend
11. Sparkline variant omits the legend
12. Tooltip + crosshair render on mouse-move over the SVG
13. Sparkline doesn't render a tooltip on hover
14. Tooltip dismisses on mouseleave
15. Default heights (280 line/bar, 48 sparkline) reflected in viewBox
16. Custom height prop honoured
17. Dark surface variant via `data-surface`
18. `aria-label` exposed on the chart SVG with `role="img"`

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **455/455** (was 436; +19 new) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-06 → 2026-06-07
- Iteration cycles: 4
  1. **v1** — basic SVG chart with status-green default + dot-field motif on dark. Pedro: *"hm think it could be better genuinely.. like a lot more in brand"*
  2. **v2** — surface container + editorial header + ink-first palette + dot-field replaced with quiet top-right glow. Pedro: *"a lot better, happy with it"*
  3. **v3** — y-axis label positioning fixes. Pedro: *"the side numbers are overlapping with the chart itself"* → iterated through SVG-text / HTML overlay / Grid / abs-positioned column approaches
  4. **v4 (shipped)** — niceTicks algorithm replaces naive floating-point tick math + pad.bottom bumped + x-labels anchored to container bottom. Pedro: *"okay, let's leave like this for now and move on"*

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumers (all Phase 2+):

- **Phase 2 Forecast** — `<ChartShell variant="line" confidenceBand={...}>` for the 12-month projected revenue trend with 95% confidence band
- **Phase 2 Insights peer-relative-z** — `<ChartShell variant="line" series={...}>` for subject-vs-peer comparisons
- **`/api-usage` page** — `<ChartShell variant="bar">` for daily call counts
- **Phase 1 AR-217-B5** `/dashboard` Home top strip — `<ChartShell variant="sparkline" raw>` embedded inside `<StatsCard>` for trend mini-chart

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 5 commits on the branch (AR-244 work log carry-forward + form-group/filter-builder defect fixes + primitive + tests + showcase). Branch deleted on merge.

## Follow-ups

- **Polish #203: Breadcrumb icon coverage** — Pedro flagged that resource-level Breadcrumb items (`Lender bundle`, `Saved queries`, `Lender pack`) don't have icons. Need to add icons where the concept has a canonical glyph (Saved queries → QueryIcon; Lender bundle → BundlesIcon; etc.). **To address BEFORE building the dashboard.**
- **Polish #204: FilterBuilder dropdown z-index / overflow** — when a DropdownMenu opens near the bottom of the FilterBuilder card it overlaps with the next showcase section, making clicks difficult. Investigate stacking context. **To address BEFORE building the dashboard.**
- **Future: pan / zoom interactivity** — out of scope per Jira. Wait for a consumer that needs it.
- **Future: animated transitions on data change** — out of scope per Jira.
- **Future: legend interactivity (click to hide series)** — out of scope per Jira.
- **Future: stacked bars / pie / donut / radar / scatter** — separate primitives if needed.

---

# Phase 0.5 closes — 8/8 primitives shipped

| Ticket | Primitive | Merged |
|---|---|---|
| AR-238 | `<EmptyState>` | 2026-06-06 |
| AR-239 | `<Tooltip>` | 2026-06-06 |
| AR-240 | `<CodeBlock>` (Show the curl) | 2026-06-06 |
| AR-241 | `<StatsCard>` | 2026-06-06 |
| AR-242 | `<Pagination>` | 2026-06-06 |
| AR-243 | `<Breadcrumb>` + `OrgIcon` | 2026-06-06 |
| AR-244 | `<FilterBuilder>` (compound rank_areas) | 2026-06-06 |
| AR-245 | `<ChartShell>` (line + bar + sparkline) | 2026-06-07 |

**Next: 2 polish items before the dashboard build, then Phase 1 starts (AR-217-B1 Sidebar reorganisation).**
