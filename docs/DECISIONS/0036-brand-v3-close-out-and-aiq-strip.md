# ADR 0036 — AR-204 close-out and the `.aiq` cascade strip

- **Status:** Accepted
- **Date:** 2026-06-03
- **Context refs:** AR-204 (Brand v3 app-wide redesign), supersedes the
  Workstream-3 close-out plan tracked in
  `memory/project_AR-204_redesign.md`. Sits above the homepage / marketing
  / docs PRs that landed earlier in the epic and below the (future)
  dashboard redesign + signal-first restructure (task #172).

## Context

AR-204 set out to bring the entire OneGoodArea web surface onto Brand v3
(Plotted) — a graphite-ink + warm-white + Geist sans/mono system anchored
in `src/styles/brand/tokens.css`, `backgrounds.css` and `components.css`.

The migration ran in two phases. The first phase rewrote the public
marketing + product + docs surfaces from scratch on Brand v3
(homepage, `/products/*`, `/for/*`, `/about`, `/business`, `/methodology`,
`/changelog`, `/help`, `/blog`, `/terms`, `/privacy`, the docs index).
The second phase — this close-out sweep — covered the 15 remaining
shells + app surfaces still rendering through the legacy `.aiq` cascade
in `apps/web/src/app/globals.css` (loading/error shells, the app shell,
auth shell, pricing, and the `/api-usage`, `/settings`, `/billing`,
`/admin`, `/compare`, `/report`, `/report/[id]`, `/area/[slug]`,
`/dashboard` surfaces), then stripped the `.aiq` block itself.

The legacy block under `.aiq` in `globals.css` aliased a parallel token
namespace (`--ink/--ink-deep/--signal/--signal-ink/--signal-dim/--bg/
--bg-off/--bg-ink/--border/--border-dim/--text/--text-2/--text-3/--text-4
/--display/--sans/--mono`) onto the `--oga-*` namespace, plus several
hundred lines of `.aiq-*` responsive overrides, animations
(`@keyframes aiq-fade-up / aiq-pulse-dot / aiq-ring-pulse / aiq-caret /
aiq-scan / aiq-source-run / aiq-rotate-in / aiq-spin / aiq-skeleton`),
and a `.aiq-force-light` light-mode lock. It existed as a temporary
bridge during the Brand v3 reskin so design-v2 pages could be migrated
page-by-page without breaking the rest of the site.

## Decision

### 1. Strip the entire `.aiq` block from `globals.css`

`apps/web/src/app/globals.css` shrinks from 952 lines to 159 lines.
Everything from the `OneGoodArea design-v2 tokens, animations,
responsive rules` section header onward is removed. What remains:

- Tailwind import + legacy Bloomberg-terminal-era tokens still consumed
  by `src/lib/rag.ts`, `src/components/toast.tsx`, `src/app/docs/playground.tsx`
- Neon RAG palette (`--neon-green/-amber/-red` + `*-dim` + `*-glow`) +
  `.neon-*-glow` text-shadow utilities + `.neon-dot`
- `html` / `body` baseline rules + `::selection`
- `@keyframes toastIn / toastOut` (consumed by `toast.tsx`)
- Scrollbar styling

### 2. Migrate the last three legacy-token holdouts

Three files were still reading `var(--ink/--signal/--text-N/--display/
--sans/--mono)` and would have rendered broken once the `.aiq` block
went away:

- **`apps/web/src/app/design-v2/_shared/app-shell.tsx`** — drops the
  intentional `aiq` back-compat className on the outer wrapper. That
  back-compat was added in PR #110 to keep 8 still-legacy wrapped
  pages working; all 8 have since migrated (PRs #112–#123).

- **`apps/web/src/app/design-v2/_shared/mcp-addon-section.tsx`** —
  full token swap to `--oga-*`. Drops the chartreuse accent dot glow
  on the active status badge and the chartreuse left-border on the
  install-help card; both became plain ink moments under Brand v3.

- **`apps/web/src/app/design-v2/_shared/icons.tsx`** — all hardcoded
  `var(--ink)` and `var(--signal)` references replaced with
  `currentColor`. Callers control colour via CSS; icons inherit
  cleanly into ink-on-light or white-on-DARK surfaces without per-icon
  overrides.

### 3. Establish "no light-touch migrations" as a durable rule

Mid-sweep (during the `/area/[slug]` migration), Pedro flagged a visible
quality gap between the full-rewrite marketing pages (`/about`,
`/methodology`, `/products/*`) and the light-touch retiring pages
(`/compare`, `/report`, `/report/[id]`, `/area/[slug]`). The original
plan had been to do token-swap-only on the retiring pages — drop
`.aiq` + inline styles, preserve layout — on the basis that the
dashboard redesign epic would replace them shortly. The result read
as "old design wearing the new fonts."

The rule we're saving (in `memory/feedback_no_light_touch_migrations.md`)
is: every page that ships to production must read at full Brand v3
altitude — editorial hero, surface rotation (graphite-dark + cream +
cream-quiet), proper typographic hierarchy and pacing, brand voice in
microcopy — even if it retires soon. "Light-touch" stays available
only for shared shells with a frozen public API contract, or
trivial-surface pages (legal/terms/privacy).

### 4. `/dashboard` 14/15 is explicitly known-temporary

The `/dashboard` migration in PR #123 ships at Brand v3 visual altitude
but keeps the existing IA (UsageStrip + 4-up stats + Watchlist +
ApiKeys + MCP + Reports list). Pedro confirmed at merge: *"as long as
memory knows it's all going to change and be absolutely re-skinned."*
The next epic (task #172) restructures the entire dashboard around the
4-product API (Signals / Scores / Monitor / Intelligence) per
`docs/DESIGN/dashboard-proposal.md`. The 14/15 ship existed only to
clear the `.aiq` cascade so this ADR could land.

### 5. Co-located CSS is the established convention

Every page migrated in this sweep ships with a sibling `<page>.css`
file (e.g. `dashboard/dashboard.css`, `area/[slug]/area-slug.css`,
`report/report.css`). The rule from `feedback_design_taste.md` + the
no-inline-styles directive in the AR-204 redesign doc is now load-bearing
across the entire site:

- No design declarations in TSX `style={{}}` blocks except where the
  value is genuinely runtime (RAG colour from `appRag()`, bar width
  from a score percentage, grid-template-columns derived from a count).
- Co-located keyframes per page (`@keyframes oga-spin-*` /
  `oga-pulse-*` / `oga-fade-up-*`) so animations survive cascade-level
  edits.
- `data-tone="strong|moderate|weak"` attribute selectors for RAG
  semantics, not inline colour strings.

## Consequences

- **`globals.css` is now 83% smaller** and contains zero design-v2
  Brand v3 tokens. The Brand v3 system lives in
  `src/styles/brand/*.css` exclusively.
- **No more `.aiq-*` classNames or `aiq` parent class** anywhere in
  `src` (verified via grep before merge). The `aiq_` underscore prefix
  on API key IDs is unrelated and retained.
- **No more legacy token aliases.** `var(--ink/--signal/--text-N/
  --display/--sans/--mono)` resolve to `unset` outside the deleted
  cascade; the migrated callers all use `var(--oga-*)`.
- **The next epic (dashboard redesign + signal-first restructure)** is
  no longer blocked by the legacy cascade. It can replace `/dashboard`
  surfaces freely without worrying about `.aiq` token inheritance.
- **AR-204 closes here.** The durable rules — every shipped page reads
  at full Brand v3 altitude, and the co-located-CSS convention — are
  recorded in sections 3 and 5 above.
