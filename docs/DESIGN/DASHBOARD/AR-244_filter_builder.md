# AR-244 — &lt;FilterBuilder&gt;

**Status:** Done
**Merged:** `fbecd37` via PR [#147](https://github.com/OneGoodArea/OneGoodArea/pull/147) on 2026-06-06
**Phase:** 0.5 (Foundation — 7th of 8 promoted-from-deferred primitives)
**Branch (deleted post-merge):** `feat/AR-244-filter-builder`

## What shipped

Bespoke compound `rank_areas` filter builder per ADR 0019. Only Phase 2 consumer: the Signals playground cross-area mode at `/dashboard/signals` (AR-217-C1). Iteration expected when the real consumer wires it into the live `/v1/signals` catalog + `/v1/areas` response.

**Composition (`apps/web/src/app/design-v2/_shared/dashboard/filter-builder.tsx`):**

```ts
interface FilterClause {
  signalKey: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq";
  value: number;
}

interface FilterBuilderProps {
  signals: FilterSignal[];   // { key, label, category, unit? }
  value: FilterClause[];
  onChange: (next: FilterClause[]) => void;
  sortBy?: string;
  onSortByChange?: (key: string | undefined) => void;
  sortOrder?: "asc" | "desc";
  onSortOrderChange?: (order: "asc" | "desc") => void;
  surface?: "light" | "dark";
}
```

**Behaviour:**
- **Controlled.** Consumer owns the clause array and sort state. The primitive renders the UI + computes the next state + fires the relevant handler.
- **AND semantics across rows.** No OR, no nested parens, no multi-value operators — v1 scope per Jira.
- **`sortBy` validation per ADR 0019:** sort_by must reference a signal_key present in the clauses. If a consumer passes a sortBy that doesn't appear in clauses, the UI shows the "No sort" sentinel as the picker label (the consumer's stale state isn't surfaced).
- **Auto-clear sortBy when its clause is removed.** If the user removes the clause whose signal was the active sort, `onSortByChange?.(undefined)` fires alongside `onChange`.
- **Add condition picks the next unused signal.** Each signal can only appear in one clause; the `+ Add condition` button picks the first signal not already in use. Disabled when every signal is in use.
- **Per-row signal picker disables signals used by other clauses.** Prevents duplicates from being selected (the v1 rank_areas grammar treats duplicate signal_keys as ambiguous).

**Picker components — DropdownMenu-backed, NOT native `<select>`:**

This was the load-bearing visual decision after Pedro feedback. Four custom pickers (`SignalPicker`, `OperatorPicker`, `SortByPicker`, `SortOrderPicker`) all use the same pattern:

1. **Trigger button** styled to mimic a `<select>` control — hairline border, chevron right, selected label left, soft-warm hover, focus-visible ring
2. **On click → `<DropdownMenu>` opens** with the full Brand v3 vocabulary: warm-white gradient panel on light or graphite gradient on dark, edge-lit material shadow, soft-warm hover at 6% ink/white, Geist typography, optional eyebrow header, hairline dividers with category labels (Deprivation / Property / Crime)

Resolves the load-bearing feedback that the OS-rendered native `<select>` popup could never match Brand v3 — even with `color-scheme: dark` + explicit option styling, the OS popup uses generic typography, generic scrollbars, generic spacing. The dropdown couldn't read as part of the dashboard family.

**Brand v3 visual treatment:**
- **Container:** warm-white gradient (`#FFFFFF → #FAF8F4`) on light, graphite gradient (`#1F2125 → #1A1C1F`) on dark — same vocabulary as DataTable + EmptyState + StatsCard + CodeBlock
- **Light asymmetric accent:** bottom-left radial-gradient warm-grey wash (`rgba(26, 28, 31, 0.045)` fading to transparent) — same signature as StatsCard light. On-brand counterpart to the dark variant's top-right glow.
- **Dark asymmetric accent:** top-right radial-gradient warm-white glow (`rgba(250, 248, 244, 0.04)`). **Replaced the dot-field motif** from v1 which read as moiré "waves" on a card crowded with form controls (per Pedro: *"there's like waves on it impossible to read"*). Same asymmetric character without the busy texture.
- **`color-scheme: dark`** on the dark variant + `data-oga-surface="dark"` on the root so child Inputs inherit their dark variants from FormGroup CSS
- **Section labels** (Where / Sort by) in mono caps eyebrow at 0.14em letter-spacing
- **Hairline AND divider** between clause rows — `1px` warm-grey line each side of a mono caps "AND" label
- **"+ Add condition"** in mono caps with dashed border that goes solid on hover; disabled when every signal is in use
- **× remove button** — hairline border that flips to status-red on hover

**Bonus pre-merge fix:** `[data-oga-surface="dark"] .oga-fg__select` now sets `color-scheme: dark` + explicit `option`/`optgroup` styling in `form-group.css`. Benefits every other Select-on-dark consumer (FormGroup dark showcase, future Modal-on-dark forms, sidebar org-create dialog). Discovered during AR-244 testing of native Selects before the DropdownMenu pivot.

## Files

- `apps/web/src/app/design-v2/_shared/dashboard/filter-builder.tsx` (new, ~470 lines) — `FilterBuilder` + `SignalPicker` + `OperatorPicker` + `SortByPicker` + `SortOrderPicker` + helpers
- `apps/web/src/app/design-v2/_shared/dashboard/filter-builder.css` (new, ~330 lines) — Container + section + clause row + AND divider + remove button + add button + sort row + picker trigger + light/dark variants
- `apps/web/src/app/design-v2/_shared/dashboard/form-group.css` — `[data-oga-surface="dark"] .oga-fg__select` enhanced with `color-scheme: dark` + explicit `option`/`optgroup` styling (cross-primitive fix)
- `apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx` — Added `FilterBuilderSection` (2 light variants) + `FilterBuilderDarkSection` (1 dark variant). Mock `FB_SIGNALS` catalog reflecting real `/v1/signals` shape: deprivation (IMD decile, income score, employment score), property (median price £, YoY change %, transactions), crime (percentile, change %).
- `apps/web/tests/unit/filter-builder.test.tsx` (new, ~310 lines) — 18 RTL tests using the open-trigger-then-click-menuitem pattern for the DropdownMenu pickers

## Decisions

- **Bespoke nature documented up front.** Jira explicitly flagged this as a niche primitive (1 real consumer = Phase 2 Signals playground) with iteration expected. Built with reasonable defaults driven by the ADR 0019 grammar shape; may evolve when the real `/v1/signals` catalog drives it.
- **DropdownMenu over native `<select>`.** The visual quality of OS-rendered popups can't match Brand v3 — typography, scrollbars, spacing are all browser/OS-controlled. Even with `color-scheme: dark` + explicit `option` colour overrides, the popup still reads as a generic dropdown. Wrapping `<DropdownMenu>` in custom picker components (one trigger button per dropdown, opens a Brand v3-styled menu on click) gets us the full editorial vocabulary on the popup. Cost: 4 small subcomponents (~60 lines each) and a slight loss of native screen-reader semantics. Trade was worth it for the visual quality bar.
- **Sort signal options drawn from `clauses`, not `signals`.** ADR 0019 specifies sort_by must reference a signal present in the query. The Sort By picker only lists labels from the current `value` array. The consumer can't accidentally pick a non-clause signal — and if their stale sortBy points to one, the picker falls back to "No sort" until they re-pick.
- **`+ Add condition` picks the next unused signal automatically.** Cuts a click for the common path. Consumers can override by immediately re-picking, but the default behaviour avoids forcing a signal pick on every add.
- **Light asymmetric accent in the bottom-left corner.** Same signature as StatsCard light — radial-gradient warm-grey wash from the bottom-left. Pairs with the dark variant's top-right glow so light + dark both have an asymmetric corner character on this primitive (and across the family: light = bottom-left ink-tinted, dark = top-right warm-white-tinted is becoming the consistent pattern).
- **Dot-field removed from dark.** The motif works on Sidebar + DataTable + EmptyState + StatsCard + CodeBlock where there's breathing room around content. On FilterBuilder — a card crowded with picker triggers, input fields, dividers — the dot pattern read as moiré "waves" behind the controls. Replaced with a quiet top-right warm-white radial glow.
- **`color-scheme: dark` propagation.** Setting it on the FilterBuilder root means child Inputs (still native HTML inputs from FormGroup) get the dark-mode browser hints — scrollbars on overflowing number inputs render dark, etc. Belt-and-suspenders with the FormGroup CSS that handles the visible styling.
- **The FormGroup fix stays even though FilterBuilder doesn't need it.** The bug was real for every Select-on-dark consumer. Future Modal-on-dark forms, the planned sidebar org-create dialog, and the existing FormGroup dark showcase all benefit. Belongs in form-group.css regardless of FilterBuilder's pivot.

## Tests

18 RTL component tests at `apps/web/tests/unit/filter-builder.test.tsx`:

1. Renders both section labels (Where / Sort by)
2. Shows empty-state copy when no clauses
3. Fires onChange with a new clause when "+ Add condition" clicked
4. Picks the next unused signal when adding a clause
5. Disables "+ Add condition" when every signal is in use
6. Renders one row per clause with signal + operator + value pickers (trigger label text)
7. Fires onChange with the updated operator when picked from the dropdown
8. Fires onChange with the new value (as a number) when the value input changes
9. Fires onChange (removing the clause) when × clicked
10. Clears sortBy if the removed clause was the sort signal
11. Renders the unit hint inside the value cell when the signal has one
12. Offers sort options drawn from clauses present in value (ADR 0019)
13. Treats sortBy as cleared when it doesn't reference a clause signal
14. Fires onSortByChange with the new key when a sort option is picked
15. Fires onSortByChange with undefined when "— No sort —" is picked
16. Disables the sort direction picker when sortBy is cleared
17. Fires onSortOrderChange when a direction is picked from the dropdown
18. Applies the dark surface variant via `data-surface` attribute

Picker tests use the userEvent.setup() + click-trigger-then-click-menuitem pattern since the new pickers are button + DropdownMenu, not native `<select>`.

**Gates at merge:** typecheck clean · lint 0 errors (14 pre-existing warnings) · web tests **436/436** (was 418; +18 new) · CI all 7 checks green.

## Pedro's localhost approval

- Date: 2026-06-06
- Iteration cycles: 1 (multiple feedback exchanges)
  1. **v1** — native `<Select>` + dot-field motif on dark. Pedro: *"I like it but kinda, i mean the white is okay and readable, just not in our branding as much. The black is unreadable, there's like waves on it impossible to read. and the dropdown is white on white"*
  2. **v2 patches** — dropped the dot-field, added `color-scheme: dark` + explicit option styling. Pedro: *"i hate it, it's not on brand at all"* + provided screenshot showing the OS-rendered popup still using generic typography + scrollbars + spacing
  3. **v3 (shipped)** — replaced all four pickers (signal, operator, sortBy, sortOrder) with custom DropdownMenu-backed components. Full Brand v3 vocabulary on the popup. Light variant got the StatsCard-family bottom-left warm-grey accent. Pedro: *"this is awesome"*

## Production migration status

N/A — primitive ships ready-to-import. First downstream consumer:

- **Phase 2 AR-217-C1** `/dashboard/signals` cross-area mode — the Signals playground will wire FilterBuilder into the live `/v1/signals/:category` catalog (signals prop) + `/v1/areas` rank response. Real signal catalog will drive iteration on category grouping, label ergonomics, and possibly extending the operator set.

## Process note

Merged with `gh pr merge --admin` per Pedro's standing delegation. 5 commits on the branch (AR-243 work log carry-forward + FormGroup dark-popup fix + primitive + tests + showcase). Branch deleted on merge.

## Follow-ups

- **OR semantics + nested clauses** — explicitly out of scope per ADR 0019 v1. If Phase 2 consumer needs them, separate ticket; will require a redesign of the row structure.
- **Multi-value operators** (in, between) — same story; defer until a consumer asks.
- **Free-text fuzzy signal search** — the basic dropdown picker is fine for a ~10-signal catalog. If `/v1/signals` grows to 50+, add an inline filter input at the top of the SignalPicker dropdown.
- **OS-popup workaround → unused option styling.** The `form-group.css` `[data-oga-surface="dark"] .oga-fg__select option` + `optgroup` rules now exist but FilterBuilder bypassed them by pivoting to DropdownMenu. They still protect every other Select-on-dark consumer — but if no consumer uses native Select on dark long-term, the rules could be trimmed in a future cleanup.
- **AR-245 `<ChartShell>`** is next (8th and FINAL Phase 0.5 primitive). After it ships, Phase 0.5 closes and Phase 1 (`AR-217-B1` Sidebar reorganisation) starts.
