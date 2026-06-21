# ADR 0037 — Brand v3 dashboard primitives extraction

- **Status:** Accepted
- **Date:** 2026-06-06
- **Context refs:** AR-217 (Dashboard redesign Epic), supersedes the Phase 0
  plan locked in `plan/016_dashboard_redesign_ar217.md`. Sits above the
  Phase 1+ dashboard surfaces that will consume these primitives
  (`AR-217-B1` Sidebar reorganization → `AR-217-B5` Home redesign →
  Levers UI pages → Monitor + Intelligence playgrounds). Sits below
  ADR 0036 (AR-204 close-out + the `.aiq` cascade strip) which finished
  the marketing-side Brand v3 reskin.

## Context

The marketing and product pages migrated to Brand v3 cleanly in AR-204
(11 sub-tickets, closed by ADR 0036). The authenticated dashboard
surfaces did not — they kept rendering through `AppShell` plus a handful
of single-page primitives (`AppCard`, `StatCell`, `PrimaryCta`, `GhostCta`,
`appRag`) that covered the legacy 8 pages (`/dashboard`,
`/dashboard/billing`, `/api-usage`, `/settings`, `/admin`, `/report`,
`/report/[id]`, `/compare`).

AR-217's dashboard redesign needs 22 routes (up from 8) at Brand v3
altitude: 5 keepable + 3 rewrite candidates + 14 new routes covering
the 4-product playground (Signals / Scores / Monitor / Intelligence),
the Levers admin surface (Members / Bundles / Presets / Cohorts /
Methodology / Branding / Security), Webhooks, `/welcome`, `/playground`.

The recon for the redesign identified 16 dashboard-specific primitives
that did not exist in the Brand v3 system:

1. Data table — sortable + striped + hover + empty/loading
2. Modal / overlay — dark backdrop, focus trap, escape
3. Dropdown menu — trigger + floating panel, keyboard nav
4. Org switcher — list + role badge + create action
5. Form group — label + input + error + help
6. Toast notification — corner-anchored, auto-dismiss
7. Breadcrumb trail
8. Code block with copy button
9. Stats card — metric + delta + sparkline
10. Tabs (generic horizontal)
11. Tooltip
12. Pagination
13. Empty-state illustration
14. Filter builder (compound `rank_areas` chain)
15. Chart shell
16. Sidebar nav primitive (extracted from `AppShell`)

Building each per-page would mean N duplicate implementations diverging
over time. Each missing primitive blocks multiple Phase 1+ surfaces.

The question this ADR records the answer to: which of these become
**proper primitives shipped at Brand v3 altitude before Phase 1 starts**,
which are deferred, and what conventions govern future additions?

## Decision

### 1. Ship 7 primitives in Phase 0 ("the foundation")

Seven primitives carry the most reuse weight across Phase 1–5 surfaces.
These are the **gating primitives** — Phase 1 can't start until they
land:

| AR | Primitive | Location | Public surface |
|---|---|---|---|
| [AR-219](https://podnex.atlassian.net/browse/AR-219) | `<FormGroup>` + `<Input>` + `<Textarea>` + `<Select>` | `_shared/dashboard/form-group.tsx` | Every form: Levers CRUD, `/welcome`, Webhooks, IP allowlist, Settings |
| [AR-220](https://podnex.atlassian.net/browse/AR-220) | `<Modal>` (native `<dialog>`, focus trap, 3 sizes, dark variant) | `_shared/dashboard/modal.tsx` | Delete confirms, create dialogs, reveal-once secrets, "Show the curl" panels |
| [AR-221](https://podnex.atlassian.net/browse/AR-221) | `<DropdownMenu>` (keyboard nav, soft-warm hover, dark variant) | `_shared/dashboard/dropdown-menu.tsx` | Org switcher, user menu, row actions, sort selectors |
| [AR-222](https://podnex.atlassian.net/browse/AR-222) | `<ToastProvider>` + `useToast()` + dot-field motif | `_shared/dashboard/toast.tsx` | Every form success/error, API-key-copied, webhook-delivered, RBAC 403 surfacing |
| [AR-228](https://podnex.atlassian.net/browse/AR-228) | `<Tabs>` (underline + pill, roving tabindex, dark variant) | `_shared/dashboard/tabs.tsx` | Intelligence sub-tabs (D4 locked), Settings sections, Monitor sub-views, filter strips |
| [AR-230](https://podnex.atlassian.net/browse/AR-230) | `<DataTable>` (sort + loading + empty + error + sticky header + dark variant) | `_shared/dashboard/data-table.tsx` | Levers (members / bundles / presets / cohorts / IP allowlist), Monitor (portfolios / changes feed / webhooks), Signals (ranked `rank_areas` results), Activity feed |
| [AR-233](https://podnex.atlassian.net/browse/AR-233) | `<Sidebar>` (sections + nested + top/bottom slots + mobile drawer + graphite gradient + dot-field) | `_shared/dashboard/sidebar.tsx` | The dashboard left-rail; consumed by `AppShell`. Phase 1 swaps in the 4-section sitemap without touching the chrome. |

All 7 are co-located under **`apps/web/src/app/design-v2/_shared/dashboard/`**.
This directory is deliberately separate from `_shared/` (which holds
marketing-and-public primitives like `Wordmark`, `Mark`, `HeroPlotted`,
`ProductsSection`, `IntegrationSection`, `ProductFinalCta`,
`CoverageSection`, `BuiltForSection`, `CtaSection`, `Footer`, `Nav`).
The split signals: "marketing primitives" vs "dashboard primitives" —
different consumers, different surfaces, different rotation cadence.

Each primitive is:

- **Generic typed.** Row / item / value types flow through every renderer
  via `TRow` / `TItem` generics. No `any` leakage in the public surface.
- **Controlled by default.** `open` + `onClose` (Modal, Sidebar, Tabs),
  `activeId` + `onChange` (Tabs), `sortState` + `onSortChange` (DataTable).
  Internal state is the fallback (uncontrolled DataTable sort, uncontrolled
  Tabs activeId), never the default.
- **Accessible by construction.** WAI-ARIA patterns followed verbatim
  (Modal native `<dialog>`, Tabs roving tabindex, DataTable `aria-sort`,
  Sidebar `aria-current="page"`, Toast `aria-live` polite/assertive by
  variant, DropdownMenu focus return on close).
- **Dark surface variant** where the consumer surface needs one. The
  dark vocabulary is consistent across primitives (see §4).

### 2. Defer 8 primitives via "extract-on-second-use" (AR-211 convention)

Eight primitives are NOT shipped in Phase 0. Each closed as deferred in
Jira:

- AR-223 Tooltip
- AR-224 Breadcrumb
- AR-225 Pagination
- AR-226 StatsCard
- AR-227 EmptyState
- AR-229 CodeBlock
- AR-231 FilterBuilder
- AR-232 ChartShell

These are **built inline on the first consumer page** when needed, then
**extracted to `_shared/dashboard/`** when a second consumer wants the
same shape. The pattern was set by AR-211 during the marketing reskin
(`ProductFinalCta` was inlined in `/products/signals` then extracted
when `/products/scores` + `/products/monitor` + `/products/intelligence`
each wanted the same closing CTA shape) and has been validated across
the Phase 0 work.

Rule: when extraction happens, a new AR-key is created — closed deferred
keys are never reused. This keeps the Jira trail intact ("this primitive
was extracted because…").

### 3. Canonical-asset discipline — never invent

Pedro flagged this twice in Phase 0 (AR-228 Tabs + AR-233 Sidebar): the
showcase and consumer code reinvented icons + stubbed wordmarks inline
instead of using the existing canonical sets.

The rule, recorded in memory under `feedback_icons_and_canonical_assets.md`:

- **Icons.** Audit existing sets before adding any glyph. The canonical
  sets today:
  - `_shared/icons.tsx` — `AiqIcon` 28×28 line glyphs (general-purpose: buyer / renter / investor / agent / operator / researcher / data / intent / read / map / api / repeat / share / watchlist / fresh / pdf / compare / key / gauge / cache / dash / widget / support / billing)
  - `_shared/product-icons.tsx` — `SignalsIcon` / `ScoresIcon` / `MonitorIcon` / `IntelligenceIcon` — bespoke dot-and-hairline 32×32 diagrams (the 4 products)
  - `_shared/docs-icons.tsx` — `ApiReferenceIcon` / `McpServerIcon` / `ChangelogIcon`
  - `_shared/app-shell.tsx` — `NavIconDark` 16×16 sidebar glyphs (dash / read / map / compare / api / key / billing); **exported as of AR-233** so the showcase + future Phase 1 surfaces consume the same set
- **Wordmark.** Always use the `<Wordmark>` component from `_shared/wordmark.tsx`.
  Never substitute a text stub like `"OneGoodArea"` in a `<span>`.
- **Bespoke Tabs-set icons** (~20 functions for Query / NL / Peers / Insights /
  Forecast / Profile / Members / API keys / Webhooks / Billing / Portfolios /
  Cohorts / Bundles / Compare / Exports / Changes / Alerts + Presets) are
  currently inlined in the dashboard-primitives showcase. **Open follow-up:**
  promote to a single `_shared/dashboard/dashboard-nav-icons.tsx` set before
  Phase 1 ships sidebar consumers. Tracked separately; not gating ADR
  acceptance.

### 4. Shared dark-surface vocabulary

Three primitives ship a dark variant (`<DataTable>` `surface="dark"`,
`<Sidebar>` baseline, `<DropdownMenu>` via `[data-oga-surface="dark"]`).
They share **one recipe** so the visual reads as a single material across
the dashboard:

- **Graphite gradient** `#1F2125 → #1A1C1F` for surface fills
- **Edge-lit material recipe** — inset top + side highlight at warm-white
  6% / 3% so panels read as layered material, not flat washes
- **Hairline borders** at warm-white 10–12% opacity
- **Soft-warm hover** `rgba(250, 248, 244, 0.05)` shared with `.oga-dropdown__item`
  + `/about` page card recipe
- **Warm-white-tinted scrollbar** (`scrollbar-color: rgba(250, 248, 244, 0.18) transparent`)
- **Dot-field motif** (Sidebar + Toast) — the exact `.oga-section-dark` recipe
  used on every dark editorial surface across the site (product page final
  CTAs, `/methodology`, `/about`, `/docs/api-reference`): 14px grid at
  warm-white 0.10 opacity, mask `radial-gradient(ellipse at top right,
  black 0%, transparent 70%)` so dots cluster densest at one corner

This vocabulary is the dark counterpart to the homepage `.oga-code-panel`
recipe (warm-white gradient + deeper material shadow + corner specimen
ticks) used by light surfaces — together they're the two altitudes Brand
v3 dashboard primitives ship at.

### 5. RTL + jsdom infra now in place; component tests required

AR-230 installed React Testing Library + jsdom into `apps/web` (Vitest 4,
`environmentMatchGlobs` deprecated → `@vitest-environment jsdom` pragma
per file, setup at `tests/setup-rtl.ts` for `@testing-library/jest-dom`
matchers + `afterEach` cleanup).

From AR-230 onward, every Phase 0+ primitive ships with component tests
covering the acceptance criteria from its Jira ticket. Phase 0 tally:

- AR-230 DataTable — 11 tests
- AR-233 Sidebar — 12 tests

Earlier Phase 0 primitives (AR-219–AR-228) were verified via typecheck +
visual showcase only — RTL didn't exist yet. **Follow-up:** retrofit
component tests for FormGroup / Modal / DropdownMenu / Toast / Tabs as
they ship into real consumers in Phase 1. Not gating ADR acceptance.

### 6. Localhost-first iteration loop (documented separately)

The Phase 0 work also validated the iteration loop documented in memory
under `feedback_operations_loop.md`:

1. Brief Pedro on scope before code (sometimes deferred for trivial
   tickets per his standing delegation)
2. Build the primitive + showcase
3. Run gates locally (typecheck + lint + tests)
4. Dev server up; Pedro verifies on `localhost:3000/admin/dashboard-primitives`
5. Iterate until approved (Phase 0 average: 1–5 cycles per primitive;
   AR-233 hit 5)
6. Atomic commits (work log carry-forward + primitive + tests + showcase
   + any refactor as separate commits)
7. Push + open PR with structured description (Summary / Test plan /
   Iteration log)
8. Jira comment with PR link + gates + iteration log
9. Watch CI (7 checks: Build / Lint / Test / Typecheck / Security audit /
   Vercel preview / Vercel deploy)
10. Squash-merge with `gh pr merge --squash --admin --delete-branch` per
    Pedro's standing delegation
11. Sync local main
12. Write `docs/DESIGN/DASHBOARD/AR-XXX_<slug>.md` work log
13. Jira merge recap + transition to Done
14. Mark task complete; start the next ticket

The pattern carries forward into Phase 1+.

## Consequences

### Enables

- **Phase 1 unblocks immediately.** AR-217-B1 (Sidebar reorganization)
  passes a different `sections` array into `<Sidebar>` — no chrome
  changes. AR-217-B2 (OrgSwitcher) composes into Sidebar's `top` slot.
  AR-217-E1–E7 (Levers UI) consumes `<FormGroup>` + `<Modal>` + `<DataTable>`
  + `<DropdownMenu>` + `<Toast>`. Compose, don't reinvent.
- **Visual consistency by default.** New surfaces inherit the Brand v3
  altitude (warm-white gradient + dot-field, graphite gradient + edge-lit
  material, soft-warm hover, tabular-nums, mono caps headers, hairline
  separation) without re-deciding.
- **Accessibility cost paid once.** Focus trap, roving tabindex, `aria-sort`,
  `aria-current`, keyboard activation, body scroll lock — all baked into
  the primitive. Consumer pages get them for free.
- **Component tests possible.** RTL infra removed the "we can't unit-test
  React components in apps/web" blocker. Phase 1 logic-heavy components
  (FilterBuilder, OrgSwitcher, the live-NL-query interface, the IP
  allowlist editor) ship with real test coverage.
- **Pricing-agnostic.** No primitive bakes in a quota number, a plan tier
  name, or a price. The dashboard's `top strip` (plan badge + quota bar)
  consumes `/v1/me` at render time; primitive surface stays clean.

### Costs

- **A new directory to learn.** `_shared/dashboard/` is now a real surface.
  Phase 1+ contributors need to know to look there before reinventing.
  Mitigated by: this ADR + the `docs/DESIGN/DASHBOARD/` work logs +
  `/admin/dashboard-primitives` showcase visible in dev.
- **Two competing icon vocabularies today.** Tabs-bespoke (inlined in
  showcase) + NavIconDark (exported from app-shell). Follow-up to
  canonicalize before Phase 1 ships sidebar consumers (see §3).
- **Dark-surface upgrade rippled to existing pages.** AR-233 deliberately
  upgraded the real `/dashboard` sidebar from flat `var(--oga-ink)` to
  graphite gradient + dot-field per Pedro's explicit ask. The Jira spec's
  "no visual regression" rule was overridden. Flagged in AR-233's PR
  description + work log; not unwound.
- **Discipline required around invented assets.** The icon + wordmark
  rule (§3) needs to be enforced by reviewers + by the iterating-with-
  Pedro loop. Memory pillar (`feedback_icons_and_canonical_assets.md`)
  + showcase comments help; but the rule will be tested on every new
  consumer page.

### Future supersession criteria

This ADR is superseded when:

- A primitive's API shape changes in a backward-incompatible way (a new
  ADR with the new shape, this one marked Superseded but kept for trail)
- The `_shared/dashboard/` location moves (e.g. extracted to a package)
- The dark-surface vocabulary (§4) is redesigned wholesale

Adding a new primitive does NOT supersede this ADR. New primitives are
documented in their own work log + AR sub-ticket. This ADR documents the
foundation set.

## Alternatives considered

### A. Use a third-party UI library (Radix, shadcn, Headless UI, MUI)

Rejected. The Brand v3 altitude is specific:

- Warm-white gradient + corner specimen ticks on light surfaces
  (`.oga-code-panel` recipe)
- Graphite gradient + edge-lit material + dot-field motif on dark
  surfaces (this ADR §4)
- Geist sans / mono at specific weights + letter-spacings (e.g. mono caps
  at 0.14em for DataTable headers, 0.24em for sidebar group labels)
- Soft-warm hover signature (`rgba(26, 28, 31, 0.04)`) shared across
  dropdown items + table rows + sidebar links + `/about` cards

Off-the-shelf libraries ship with their own design vocabularies that
would either fight Brand v3 or require so much override CSS that we'd be
reimplementing the primitive anyway. Worse: third-party patterns assume
their own type systems, render layers (Portal libs, popper.js, etc.),
and dependency footprints — a tax we don't need given the dashboard is
a closed surface served by one codebase.

shadcn (copy + own the code) was closest to acceptable. Rejected because
its Tailwind-class vocabulary diverges from our CSS-tokens-and-classnames
approach (Brand v3 lives in `_shared/styles/brand/*.css`, not in Tailwind
utility classes), and the rotation cadence on shadcn upstream changes
fast enough that adopting a snapshot now would create a fork-management
problem later.

### B. Use Radix primitives as accessibility skeletons + skin in Brand v3

Considered. Radix solves the WAI-ARIA pattern implementations (focus
trap, roving tabindex, dismissal, return focus) at a high quality level.
Wrapping Radix headless primitives in Brand v3 CSS would have been
faster than reimplementing.

Rejected because:

1. The native `<dialog>` element + a small focus-trap helper gives us
   Modal at far less surface area than `@radix-ui/react-dialog`
2. WAI-ARIA Tabs roving tabindex is ~30 lines of code in `<Tabs>` and
   reads more clearly than a Radix wrapper
3. The DataTable composition (sort + loading + empty + error + responsive
   columns + interactive-child guard) doesn't have a Radix equivalent —
   would need custom anyway
4. Each Radix primitive is a dependency we'd version-pin, security-audit,
   and renderer-test against React 19 + Next.js 16. The 7 primitives
   shipping in Phase 0 took ~2700 LOC; the Radix wrappers would have
   added a similar amount of glue plus the dependency surface.

Net: we ship the same accessibility quality with less indirection, at a
cost of writing the focus-management + keyboard-nav code ourselves (cost
paid once per primitive in Phase 0; reused forever).

### C. Inline primitives per page + extract later

The pattern AR-211 set: build inline first, extract on second use. The
8 deferred primitives (§2) take this path. Why not all 16?

Rejected for the 7 foundation primitives because they each unblock
multiple Phase 1 surfaces immediately:

- `<FormGroup>` unblocks 8+ Phase 1+ surfaces; building 8 inline forms
  would diverge badly
- `<DataTable>` unblocks 10+ tabular surfaces
- `<Sidebar>` is consumed by every authenticated page (the chrome)
- `<Modal>` + `<DropdownMenu>` + `<Toast>` + `<Tabs>` each have
  3–6 immediate Phase 1 consumers

For the deferred 8, the math goes the other way: Tooltip, Breadcrumb,
Pagination, etc. have 1–2 likely Phase 1 consumers, so the inline-then-
extract path costs less than building-now-then-iterating-against-no-real-
consumer.

### D. Build the 16 primitives across Phases 1–5 instead of in a Phase 0

Considered. Would have unblocked Phase 1 sooner (no foundation week
before real dashboard pages start landing).

Rejected because:

- Page-driven primitive extraction is how the marketing surfaces got
  built; the lesson there (AR-211) was that the first inline build is
  often subtly wrong and gets reworked on extraction. For dashboard
  surfaces with shared visual + accessibility requirements (Modal focus
  trap, DataTable sort semantics, Sidebar drawer behaviour) the rework
  cost is higher than the upfront-design cost.
- Phase 0 forces every primitive into the `/admin/dashboard-primitives`
  showcase — Pedro can iterate the visual + interaction on each one
  before they ship into real consumer pages. The iteration cycles on
  Phase 0 (some primitives took 5 cycles) would have been worse if
  surfaced for the first time inside a half-built Levers UI page.

## Sub-ticket trail

Phase 0 work shipped under AR-217 as 8 sub-tickets:

| AR | Phase 0 slot | PR | Squash on main | Date |
|---|---|---|---|---|
| [AR-218](https://podnex.atlassian.net/browse/AR-218) | A1 (DB columns; re-tagged out of Phase 0 then re-included) | #131 | `16d6c04` | 2026-06-05 |
| [AR-219](https://podnex.atlassian.net/browse/AR-219) | A2 — FormGroup | #132 | `67ba231` | 2026-06-05 |
| [AR-220](https://podnex.atlassian.net/browse/AR-220) | A3 — Modal | #133 | `6069447` | 2026-06-05 |
| [AR-221](https://podnex.atlassian.net/browse/AR-221) | A4 — DropdownMenu | #134 | `f761bad` | 2026-06-05 |
| [AR-222](https://podnex.atlassian.net/browse/AR-222) | A5 — Toast | #135 | `a76a724` | 2026-06-05 |
| [AR-228](https://podnex.atlassian.net/browse/AR-228) | A11 — Tabs | #136 | `24b8dc9` | 2026-06-05 |
| [AR-230](https://podnex.atlassian.net/browse/AR-230) | A13 — DataTable (+ RTL infra) | #137 | `296cb83` | 2026-06-06 |
| [AR-233](https://podnex.atlassian.net/browse/AR-233) | A16 — Sidebar | #138 | `2aa67ed` | 2026-06-06 |
| [AR-237](https://podnex.atlassian.net/browse/AR-237) | A20 — this ADR | — | — | 2026-06-06 |

Deferred (8 tickets closed as deferred per §2):

- [AR-223](https://podnex.atlassian.net/browse/AR-223) Tooltip
- [AR-224](https://podnex.atlassian.net/browse/AR-224) Breadcrumb
- [AR-225](https://podnex.atlassian.net/browse/AR-225) Pagination
- [AR-226](https://podnex.atlassian.net/browse/AR-226) StatsCard
- [AR-227](https://podnex.atlassian.net/browse/AR-227) EmptyState
- [AR-229](https://podnex.atlassian.net/browse/AR-229) CodeBlock
- [AR-231](https://podnex.atlassian.net/browse/AR-231) FilterBuilder
- [AR-232](https://podnex.atlassian.net/browse/AR-232) ChartShell

Re-tagged into Phase 1:

- [AR-234](https://podnex.atlassian.net/browse/AR-234) OrgSwitcher (composes
  `<DropdownMenu>` + `<Sidebar>` top slot)
- AR-235 Activity endpoint (data, not primitive)
- AR-236 Production flag (deploy, not primitive)
