# Plan 016 — Dashboard redesign (AR-217)

**Status:** LOCKED 2026-06-05. Phase 0 sub-tickets queued under AR-217.
**Jira Epic:** [AR-217 Dashboard redesign — Brand v3 altitude + 4-product API + Levers UI + Welcome flow](https://podnex.atlassian.net/browse/AR-217)
**Source spec:** [docs/DESIGN/dashboard-proposal.md](../docs/DESIGN/dashboard-proposal.md) (Mac read-only proposal 2026-06-01, 416 lines, pricing-agnostic)
**Recon basis:** 5-agent workflow (api / adrs / dashboard-state / brand-v3 / auth-flow), 2026-06-05.
**Branch root:** `feat/AR-217-*` (per-sub-ticket sub-branches).
**Author:** Claude (Pedro's session, 2026-06-05).

---

## 1. Objective

Build the authenticated dashboard at Brand v3 altitude as the elite-grade workspace for the 4 products (Signals / Scores / Monitor / Intelligence) and the 7 Levers capabilities (Members, Bundles, Presets, Cohorts, Methodology, White-label, IP allowlist), with an immaculate sign-up → /welcome → dashboard flow.

The dashboard must:
- Read entirely from `/v1/me` for entitlements + org context + RBAC + IP allowlist (the spine).
- Surface every product through a playground UI with **"Show the curl"** on every query (Stripe + Linear pattern).
- Enforce RBAC client-side AND server-side per ADR 0033.
- Land new users on `/welcome` (NEW) → first AreaProfile → ICP-aware suggestion.
- Read at Brand v3 altitude — no light-touch migrations, no `.aiq` legacy classes.

## 2. Scope summary

| Bucket | Today | After AR-217 |
|---|---|---|
| Dashboard routes | 8 (5 Brand v3, 3 light-touch) | 22 (all Brand v3) |
| Sidebar sections | 1 flat list (6 items) | 4 grouped sections (Dashboard / Products / Org & Levers / Account) |
| Org switcher | none | sidebar top dropdown |
| `/welcome` flow | none | 3-step skippable post-verification (intent + postcode + role) |
| Levers UI | none | 7 admin/owner-gated pages |
| Webhooks UI | none | full CRUD UI + signing-secret reveal-once |
| Public demo | none | `/playground` (read-only, IP rate-limited) |
| Brand v3 primitives | marketing-grade | extended with 16 dashboard primitives |

## 3. Recon findings (the basis for this plan)

### 3.1 API — 100% ready (zero gaps)

Every endpoint the proposal needs exists in `apps/api`. Confirmed by recon:

- **`GET /v1/me`** returns: `plan`, `plan_name`, `generation`, `api_access`, `mcp_access`, `reports_per_month`, `used_this_month`, `limit_this_month`, `engine_version`, `addons[]`, `mcp_calls_this_month`, `org: {id, slug, name, display_name, brand_url, role}`, `key: {allowed_ip_cidrs[]}`. This is the spine.
- **Signals product:** `GET /v1/area`, `GET /v1/signals/:category`, `GET /v1/areas` (compound rank), `POST /v1/peers`, `POST /v1/insights`, `POST /v1/forecast`.
- **Scores product:** `POST /v1/score` (preset_id OR preset OR custom weights).
- **Monitor product:** `POST/GET/DELETE /v1/portfolios`, `POST /v1/portfolios/:id/areas`, `POST /v1/portfolios/:id/enrich`, `POST /v1/portfolios/:id/changes`.
- **Intelligence product:** `POST /v1/query` (programmatic `{plan}` OR NL `{question}`).
- **Levers:** `/v1/orgs` CRUD + members + bundles + presets + cohorts + methodology + (white-label via PATCH /v1/orgs/:id) + (IP allowlist via api-keys table).
- **Webhooks:** `POST/GET/DELETE /v1/webhooks` (report.created + score.changed).
- **Auth:** `/auth/register`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`, `/settings/password`.

All product endpoints dark-flagged behind `signalsApiEnabled` config — **confirm flag is ON in production** before Phase 2 ships.

### 3.2 ADRs — 17 dashboard-relevant ADRs

Encoded constraints (full list in §11):

- **ADR 0017** (Intelligence v1): dashboard query interface uses typed plan grammar; NL inputs translate to plans via AiProvider, validated with Zod, executed deterministically. Plans echo `plan_source` for auditability.
- **ADR 0019** (compound rank_areas): UI must validate `sort_by` signal appears in signals list; AND semantics across rows.
- **ADR 0023** (peers): Euclidean distance over normalized values; UI supports optional signal subset, country/LAD scope, min_signals threshold.
- **ADR 0024** (insights): UI ranks by `|z|` with optional `min_abs_z`; all z-scores materialized offline.
- **ADR 0025** (forecast): response includes r-squared, slope, residual_stderr — UI surfaces confidence band.
- **ADR 0027-0028** (Levers tenancy + orgs): every dashboard data op scopes to org context; signup auto-creates personal org.
- **ADR 0029** (bundles): bundle whitelist gates `/v1/area`, `/v1/areas`, `/v1/query` — UI validates `signal_keys` at write.
- **ADR 0030** (presets): UI validates weights against `base_preset`'s dimension set.
- **ADR 0031** (methodology pin): **owner-only mutation**; admins see read-only.
- **ADR 0032** (cohorts): UI scope-picker for `/v1/peers`; target can be outside cohort.
- **ADR 0033** (RBAC): three-tier (member read-only / admin daily-Levers / owner methodology+grant); typed 403 codes (`admin_required`, `owner_required`, `cannot_grant_owner`, `cannot_remove_owner_as_admin`).
- **ADR 0034** (white-label + IP allowlist): UI surfaces `org.display_name` (falls back to `org.name`); IP allowlist gated 403 distinct from 401.

### 3.3 Dashboard state — 14 routes missing

**Keepable (5 pages, EXISTS_BRAND_V3):** `/dashboard`, `/dashboard/billing`, `/api-usage`, `/settings`, `/admin`. Plus `AppShell` + primitives (`AppCard`, `StatCell`, `PrimaryCta`, `GhostCta`, `appRag`).

**Rewrite candidates (3 pages, EXISTS_LIGHT_TOUCH):** `/report`, `/report/[id]`, `/compare`. Explicitly flagged in source comments as "wiped by dashboard restructure."

**Missing (14 routes):** `/dashboard/activity`, `/dashboard/signals`, `/dashboard/scores`, `/dashboard/monitor`, `/dashboard/intelligence`, `/dashboard/org/{members,bundles,presets,cohorts,methodology,branding,security}`, `/dashboard/webhooks`, plus `/welcome` and `/playground` (auth-adjacent).

### 3.4 Brand v3 — 16 dashboard primitives missing

Marketing surface is rich (~2552 lines `components.css`, AR-211 product primitives extracted). But dashboard-specific primitives don't exist yet:

1. **Data table** — sortable columns, striped rows, hover state, empty/loading variants
2. **Modal / overlay** — dark backdrop, centered card, close, keyboard escape
3. **Dropdown menu** — trigger + floating panel, keyboard nav, dark/light variants
4. **Org switcher** — list + role badge + "Create new org" + active marker
5. **Form group** — label + input + error + help text, all Brand v3 tokens
6. **Toast notification** — corner-anchored, auto-dismiss, RAG palette
7. **Breadcrumb trail** — home > section > page with arrow separators
8. **Code block with copy button** — full-width monospace + copy affordance (variant of `.oga-code-panel`)
9. **Stats card** — metric label + large number + sparkline + delta%
10. **Tabs (generic horizontal)** — for dashboard route segments (Intelligence sub-tabs etc.)
11. **Tooltip** — small label popup on hover with dark variant
12. **Pagination controls** — prev/next + numbered, disabled states
13. **Empty state illustration** — generic placeholder with brand SVG + centered text + CTA link
14. **Filter builder** — compound `rank_areas` chain (signal picker + operator + value, AND rows)
15. **Chart shell** — D3/Recharts container with Brand v3 axes/legend tokens (line, bar, sparkline)
16. **Sidebar nav primitive** — vertical link list with active state, icon + label, nested submenu

### 3.5 Auth + signup — 3 gaps

- `/welcome` route does not exist
- Sign-up form does NOT capture `?from=<source>` query param
- `users.intent` column does not exist (intent only lives on `saved_areas`)
- `users.signup_source` column does not exist
- Post-verification redirects to `/sign-in` prompt (not auto-login → `/welcome` → `/dashboard`)

## 4. Decisions — LOCKED 2026-06-05

Pedro: *"I will trust you, worst case scenario we work on it again."* Recommendations locked.

| # | Decision | Locked |
|---|---|---|
| D1 | Sandbox model | **Model B: sandbox-as-tier.** Single key prefix `oga_*`. One Levers config per org. Webhook subscriptions shared across the org. Migration to Model A is mechanical if customer demand surfaces later. |
| D2 | /welcome flow steps | **All three (intent + postcode + role), all skippable.** Intent shapes dashboard from arrival. First postcode is the moment of magic. Role determines landing surface. |
| D3 | Org switcher placement | **Sidebar top.** Stripe pattern. Multi-tenancy is the spine — keep it in the spine of the chrome. |
| D4 | Intelligence sub-tabs vs separate pages | **Sub-tabs.** Intelligence is ONE product. Sub-tabs keeps cohesion; separate pages bloat the sidebar. |
| D5 | /playground Neon cost budget | **Deferred to Phase 2 spike.** Hard rate-limit (5/min, 30/hr) + cached responses should bound it. Cap locked when Phase 2 kicks off. |

## 5. Phasing

Six phases (proposal's 5 + a Phase 0 for the gating primitives + DB migrations). Phases 1 + 2 are the launch bar; Phase 3 unblocks Monitor; Phase 4 unblocks vertical pack productization (Lender Pack / PropTech Pack); Phase 5 is polish.

```
Phase 0 — Foundation                    (week 1)
Phase 1 — Chrome + spine                (week 2-3)
Phase 2 — Product playgrounds           (week 4-6)
Phase 3 — Monitor + webhooks            (week 7-8)
Phase 4 — Levers UI                     (week 9-10)
Phase 5 — Polish + onboarding           (week 11-12)
```

Each phase = N sub-tickets (each own AR-key, each own branch + PR). Per-PR conventional commit; no commit to main; for UI work, no commit without Pedro's localhost approval.

---

## 6. Phase 0 — Foundation (gating)

**Goal:** make Phase 1+ possible. DB migrations + Brand v3 primitives the dashboard will compose with.

### 6.1 Sub-tickets — RE-SCOPED 2026-06-05 (hybrid plan)

**Pedro pushed back** on the original 20-ticket scope as too far from actual dashboard surfaces. Hybrid plan locked: pages-first by default, only genuinely high-reuse primitives extract upfront. Per AR-211 pattern: extract on second use, not pre-emptive.

**Phase 0 final scope: 7 primitives + 1 ADR (8 tickets).** Branches use the sub-ticket key (`feat/AR-XXX-slug`, matches Marcos's convention).

**Active Phase 0 (7 primitives + ADR):**

| Ref | Jira | Primitive | Why upfront | Branch | ~Diff |
|---|---|---|---|---|---|
| A2 | [AR-219](https://podnex.atlassian.net/browse/AR-219) | `<FormGroup>` (label+input+error+help) | Used by every form in Phase 1-5 (~8+ surfaces) | `feat/AR-219-form-group` | ~250 |
| A3 | [AR-220](https://podnex.atlassian.net/browse/AR-220) | `<Modal>` (focus trap, escape, sizes) | Delete confirms, create dialogs (~5+ surfaces) | `feat/AR-220-modal` | ~300 |
| A4 | [AR-221](https://podnex.atlassian.net/browse/AR-221) | `<DropdownMenu>` (keyboard nav, dark/light) | Org switcher + row actions + sort selectors (~6+ surfaces) | `feat/AR-221-dropdown-menu` | ~350 |
| A5 | [AR-222](https://podnex.atlassian.net/browse/AR-222) | `<Toast>` (corner-anchored, RAG palette) | Every form needs success/error feedback | `feat/AR-222-toast` | ~250 |
| A11 | [AR-228](https://podnex.atlassian.net/browse/AR-228) | `<Tabs>` (horizontal generic) | Intelligence sub-tabs (D4 locked) + others | `feat/AR-228-tabs` | ~250 |
| A13 | [AR-230](https://podnex.atlassian.net/browse/AR-230) | `<DataTable>` (sortable, striped, empty/loading) | 10+ tabular surfaces across Levers + Monitor + Intelligence + Activity | `feat/AR-230-data-table` | ~800 |
| A16 | [AR-233](https://podnex.atlassian.net/browse/AR-233) | `<Sidebar>` (extract from AppShell) | Spine — consumed everywhere via AppShell | `feat/AR-233-sidebar-primitive` | ~400 |
| A20 | [AR-237](https://podnex.atlassian.net/browse/AR-237) | ADR 0037 — primitives extraction + AR-211 rule | Documents the 7 + the extract-on-second-use convention | `feat/AR-237-adr-0037-dashboard-primitives` | ~150 |

**Deferred (closed as "extract on second use"):** AR-223 Tooltip · AR-224 Breadcrumb · AR-225 Pagination · AR-226 StatsCard · AR-227 EmptyState · AR-229 CodeBlock · AR-231 FilterBuilder · AR-232 ChartShell. Per AR-211 pattern: build inline on first consumer page, extract to `_shared/dashboard/` only when a second page wants it. A new AR-key gets created at extraction time (never reuse closed keys).

**Re-tagged to later phases:** AR-218 DB migrations → Phase 1 first ticket · AR-234 OrgSwitcher → Phase 1 (feature, composes Phase 0 primitives) · AR-235 Activity endpoint → Phase 1 · AR-236 Production flag → Phase 2 first ticket.

**Dependencies:** A11/A13/A16/A20 are independent. A20 (ADR) ships LAST after the primitives are real. Phase 1 OrgSwitcher (AR-234) blocked on A3 + A4 + A16.

**Per-ticket loop:** branch off main → atomic conventional commits → push → PR → CI green → (UI) localhost approval → Claude flags PR ready + posts link → **Pedro says "merge it"** → Claude squash-merges + sync local + write `docs/DESIGN/DASHBOARD/AR-XXX_slug.md` work-log + transition Jira to Done.

### 6.2 Phase 0 acceptance

- DB columns live, migration idempotent.
- 16 Brand v3 dashboard primitives shipped (CSS + React) and demoed on `/_dev/dashboard-primitives`.
- Activity feed endpoint live.
- Product API flags ON.
- ADR 0037 (Brand v3 dashboard primitives extraction) committed.

---

## 7. Phase 1 — Chrome + spine

**Goal:** the dashboard chrome reads as the new sidebar + org switcher + redesigned Home, and new users get `/welcome`.

### 7.1 Sub-tickets

| Sub-ticket | Scope | Branch |
|---|---|---|
| **AR-217-B1** Sidebar reorganization | Rebuild `AppShell` sidebar into 4 sections (Dashboard / Products / Org & Levers / Account). RBAC visibility (Org & Levers visible only when user is admin+ of non-personal org). | `feat/AR-217-B1-sidebar-restructure` |
| **AR-217-B2** Org switcher | Top-of-sidebar dropdown. Shows current org + role badge, lists all orgs from `GET /v1/orgs`, "Create new org" CTA. Reuses `<DropdownMenu>` + `<OrgSwitcher>` from Phase 0. | `feat/AR-217-B2-org-switcher` |
| **AR-217-B3** Sign-up source capture | Add `?from=<source>` to every CTA on marketing + ICP pages. Capture in sign-up form; persist to `users.signup_source` via `/auth/register`. | `feat/AR-217-B3-signup-source-capture` |
| **AR-217-B4** /welcome flow | NEW route at `/welcome`. 3 skippable steps: (1) intent picker (5 ICP cards, pre-selected from `signup_source`), (2) first postcode (`AreaProfile` loads live, M1 1AE default), (3) role picker (engineer / analyst / explorer). Persists to `users.intent`. Post-verification redirects here, not to `/sign-in`. | `feat/AR-217-B4-welcome-flow` |
| **AR-217-B5** /dashboard Home redesign | Replace current reports list. Top strip (plan badge + quota bar + adaptive Upgrade CTA reading `/v1/me`). 3-card grid: Last query / What changed / Suggested next move (ICP-aware via `users.intent`). Recent activity feed (latest 10 events). | `feat/AR-217-B5-home-redesign` |
| **AR-217-B6** Route renaming + redirects | Move `/api-usage` reference under "Account" section; keep route as-is (no breaking change). `/dashboard/billing` already correct. Add 301 redirects for any moved routes. | `feat/AR-217-B6-route-redirects` |

### 7.2 Phase 1 acceptance

- New sidebar with 4 sections + org switcher live in production.
- New user signs up → verifies email → lands on `/welcome` → completes intent + postcode + role → arrives on `/dashboard` with prepopulated first AreaProfile + ICP-aware Suggested-next-move.
- Old `/dashboard` reports list removed (reports move to `/dashboard/scores` in Phase 2).
- Every page reads entitlements from `/v1/me`. No hardcoded plan names.
- Brand v3 altitude on every redesigned page.

---

## 8. Phase 2 — Product playgrounds (the launch bar)

**Goal:** the 4 products are surfaced through best-in-class playgrounds with "Show the curl" on every query.

### 8.1 Sub-tickets

| Sub-ticket | Scope | Branch |
|---|---|---|
| **AR-217-C1** /dashboard/signals | Single-area mode: postcode input → `AreaProfile` + signal catalog with per-signal time-series. Cross-area mode: compound `rank_areas` filter builder (`<FilterBuilder>`) → ranked table. "Show the curl" on every call. | `feat/AR-217-C1-signals-playground` |
| **AR-217-C2** /dashboard/scores | Migrate `/report` generator here. Add preset picker (moving / business / investing / research), custom-weight sliders per dimension, saved preset list (`/v1/orgs/:id/presets`), score breakdown w/ per-dimension confidence. | `feat/AR-217-C2-scores-playground` |
| **AR-217-C3** /dashboard/intelligence (4 sub-tabs) | Query builder (visual compound `rank_areas`) / NL (chat input → `POST /v1/query`, shows resolved plan BEFORE result + "Replay as programmatic plan") / Peers (target + signal subset + cohort + k) / Insights (signal picker peer-relative-z + min_abs_z) / Forecast (target + signal + window + horizon, line chart + confidence band). | `feat/AR-217-C3-intelligence-playground` |
| **AR-217-C4** /playground (public, read-only) | NEW route. IP rate-limited (5/min, 30/hr). 3 pre-loaded queries (area lookup, compound rank, forecast). Per-query: JSON response + UI render + "Sign up to run this with your data" CTA. "Show the curl" affordance. Service-account key + cached responses for scrape resistance. | `feat/AR-217-C4-public-playground` |
| **AR-217-C5** "Show the curl" pattern | Extract reusable `<ShowCurl>` component from C1/C2/C3 usage. Renders equivalent curl with masked API key + copy-to-clipboard. Wire into every query interface across the dashboard. | `feat/AR-217-C5-show-the-curl` |

### 8.2 Phase 2 acceptance

- Each of the 4 products has a usable playground at `/dashboard/{signals,scores,monitor,intelligence}`.
- NL Intelligence shows the resolved plan BEFORE the result on every query (ADR 0017 audit-replayability visible).
- "Show the curl" works on every query across the dashboard.
- `/playground` ships and converts (signup CTA on every result).
- ADR 0038 (Show the curl pattern + Intelligence audit-replayable UI rules) committed.

---

## 9. Phase 3 — Monitor + webhooks

**Goal:** portfolios + change detection + webhook subscriptions are usable in UI.

### 9.1 Sub-tickets

| Sub-ticket | Scope | Branch |
|---|---|---|
| **AR-217-D1** /dashboard/monitor — Portfolios sub-view | List portfolios (`GET /v1/portfolios`); detail page with areas, last-enriched date, enrichment scores, change history. Actions: add areas (`POST /v1/portfolios/:id/areas`), enrich (`POST /v1/portfolios/:id/enrich`), delete. Reuse `<DataTable>` + `<Modal>`. | `feat/AR-217-D1-portfolios-ui` |
| **AR-217-D2** /dashboard/monitor — Changes feed | Stream of detected changes across all portfolios (`POST /v1/portfolios/:id/changes` per portfolio). Filter by signal, threshold_pct, date range. Each change links to context. Material-move gating (min_transactions per ADR 0013). | `feat/AR-217-D2-changes-feed` |
| **AR-217-D3** /dashboard/webhooks | Full CRUD UI for webhook subscriptions (`POST/GET/DELETE /v1/webhooks`). Topic selector (`report.created`, `score.changed`), delivery URL, signing secret reveal-once on creation, last delivery status, retry queue (when Phase 2 retry cron ships separately). | `feat/AR-217-D3-webhooks-ui` |

### 9.2 Phase 3 acceptance

- User can create + enrich + monitor portfolios from UI without curl.
- Material price moves de-noised per ADR 0013 (min_transactions default 8) — UI displays the rule visibly.
- Webhook secrets revealed once at creation, then masked forever.

---

## 10. Phase 4 — Levers UI (vertical pack unblocker)

**Goal:** the 7 Levers capabilities are admin/owner-managed from UI. RBAC enforced client-side (UI gate) + server-side (API gate per ADR 0033).

### 10.1 Sub-tickets

| Sub-ticket | Scope | Branch |
|---|---|---|
| **AR-217-E1** /dashboard/org/members | List members + role badges. Add by user ID (later by email when invite flow ships). Remove member. Last-owner guard surfaced as UI affordance (button disabled + tooltip explaining). Admin+ gated. | `feat/AR-217-E1-members-ui` |
| **AR-217-E2** /dashboard/org/bundles | List + create + edit + delete bundles. Signal-key picker (full `SUPPORTED_SIGNALS` catalog). Preview response shape when `?bundle=` is applied. Admin+ gated. | `feat/AR-217-E2-bundles-ui` |
| **AR-217-E3** /dashboard/org/presets | List + CRUD presets. `base_preset` picker, weight sliders, validation error states for unknown weight keys (ADR 0030). Admin+ gated. | `feat/AR-217-E3-presets-ui` |
| **AR-217-E4** /dashboard/org/cohorts | List + CRUD cohorts. LSOA picker (paste list / upload CSV / pick from `/v1/areas` results). Cohort-size meter against 10,000-LSOA cap. Admin+ gated. | `feat/AR-217-E4-cohorts-ui` |
| **AR-217-E5** /dashboard/org/methodology | Single dropdown of `SUPPORTED_ENGINE_VERSIONS`. **Owner-only mutation** (admins see read-only per ADR 0031). Confirm dialog on change. Activity event surfaces in feed. | `feat/AR-217-E5-methodology-ui` |
| **AR-217-E6** /dashboard/org/branding | `display_name` + `brand_url` editor. Live preview of `/v1/me` rebrand surface. "Reset to defaults" button. Admin+ gated. | `feat/AR-217-E6-white-label-ui` |
| **AR-217-E7** /dashboard/org/security | Per-key IP allowlist editor (CIDR list per ADR 0034). Add/remove. Live status: "Your current IP is X.Y.Z.W. It IS / NOT allowed." Security-review checkbox per ADR 0034. Admin+ gated. | `feat/AR-217-E7-ip-allowlist-ui` |
| **AR-217-E8** RBAC enforcement sweep | Audit every Phase 4 page's client-side gate against the API's typed 403 codes (`admin_required`, `owner_required`, `cannot_grant_owner`, `cannot_remove_owner_as_admin`). Surface 403 errors as in-UI banners, not generic toasts. | `feat/AR-217-E8-rbac-sweep` |

### 10.2 Phase 4 acceptance

- All 7 Levers capabilities live in UI with correct admin/owner gating.
- Server-side 403 + client-side gate are NEVER out of sync (admin tries to pin methodology → button missing AND API 403 with `owner_required`).
- ADR 0039 (Levers UI RBAC enforcement strategy) committed.

---

## 11. Phase 5 — Polish + onboarding

**Goal:** ICP-aware Getting Started + activity feed + empty states + mobile + a11y.

### 11.1 Sub-tickets

| Sub-ticket | Scope | Branch |
|---|---|---|
| **AR-217-F1** Getting Started checklist | Persistent panel on `/dashboard` for users with < 10 API calls OR < 5 days old. ICP-aware items driven by `users.intent`. Checked items disappear; panel disappears when all done. Linear / Vercel pattern. | `feat/AR-217-F1-getting-started` |
| **AR-217-F2** Activity feed | Dedicated `/dashboard/activity` page (paginated). Already on Home (latest 10); this is the full history. Filter by event type, date range, user/key. | `feat/AR-217-F2-activity-page` |
| **AR-217-F3** Empty states | Every section gets a bespoke empty state (illustration + headline + CTA). No generic placeholders. Use `<EmptyState>` primitive. | `feat/AR-217-F3-empty-states` |
| **AR-217-F4** Mobile responsive sweep | Every dashboard route works on 375px (iPhone SE). Sidebar collapses to drawer (already wired in AppShell); data tables scroll horizontally; modals full-screen on mobile. | `feat/AR-217-F4-mobile-sweep` |
| **AR-217-F5** Accessibility audit | Axe + manual keyboard-only test pass. All interactive elements reachable, focus-trapped where appropriate, ARIA labels on all icon-only buttons. WCAG 2.1 AA target. | `feat/AR-217-F5-a11y-audit` |

### 11.2 Phase 5 acceptance

- Lighthouse a11y score ≥ 95 on every dashboard route.
- Every empty state is bespoke + on-brand.
- Mobile drawer + responsive tables work on every page at 375px.

---

## 12. Hard rules (apply across every phase)

1. **Plan-agnostic dashboard.** Read entitlements from `/v1/me`. Never hardcode plan names or prices in dashboard components. `/dashboard/billing` is the ONLY place that names plans.
2. **No invented quotas in copy.** Empty states say "the free tier" abstractly until pricing locks. Verify against `apps/web/src/lib/stripe.ts` `PLANS` before writing any specific number.
3. **Audit-replayable Intelligence visible in the UI.** Every NL query MUST show the resolved plan BEFORE the result. Every result MUST have a "Show the curl" button. This is the deterministic-AI story.
4. **Levers RBAC enforced client-side AND server-side.** Per ADR 0033. UI gates the wrong-role user from the affordance; the API gates them on the request. Never client-side-only.
5. **Brand v3 throughout.** No `.aiq` legacy. No light-touch migrations. Every page rotates surfaces (cream / cream-quiet / graphite-dark — at least one DARK section per page).
6. **No commit to main, ever.** Per-PR per-sub-ticket. Branch off `main`, work on the branch, PR to `main`.
7. **No merge to main without Pedro's explicit approval — no exceptions.** Locked 2026-06-05: *"never in main before i approve"*. Even with green CI, Claude does NOT squash-merge autonomously on this Epic. Sequence per PR: CI green → (for UI) Pedro localhost approval → Claude flags PR is ready + posts link → Pedro says "merge it" → Claude squash-merges + syncs local + transitions Jira to Done. This OVERRIDES the standing GitHub-ownership delegation (which lets Claude auto-merge non-load-bearing PRs); for AR-217 every merge is load-bearing.
8. **Every sub-ticket gets a fresh AR-key under AR-217.** Branch named `feat/AR-217-XN-short-slug` where XN is the sub-ticket suffix (A1, A2, B1, etc.). Per-ticket Jira lifecycle: In Progress + scope comment when starting → PR link comment when PR opens → merge recap + transition to Done when Pedro approves the merge.
9. **No inline styles in TSX.** Co-located `.css` files only. Marcos's rule.
10. **No backend imports in frontend files.** apps/web reads from `/v1/me` and other endpoints over HTTP. Never imports apps/api directly.
11. **Every UI action wires to a real backend.** No mocked states. localStorage is theme + sidebar collapse only. Any not-yet-wired control is disabled with explicit "Not wired" indicator.
12. **No marketing claims that outrun what is built.** No "predictive confidence" until calibrated model ships, no "regional benchmark" until regional percentile scopes exist, no "Monitor 10,000+ areas" until async enrichment ships, no "AI explains this area" until `/v1/analyze` ships (deferred by ADR 0017).
13. **No em dashes in user-facing copy.** Use periods, commas, or rewrite.

## 13. ADRs to write during AR-217

| Number | Subject | Phase |
|---|---|---|
| **0037** | Brand v3 dashboard primitives extraction (the 7 + extract-on-second-use rule) | Phase 0 |
| **0038** | "Show the curl" pattern + Intelligence audit-replayable UI rules | Phase 2 |
| **0039** | Levers UI RBAC enforcement strategy (client + server gate parity) | Phase 4 |
| **0040** | Welcome flow + signup_source + users.intent (DB migration record) | Phase 1 |

ADRs committed alongside the code that introduces the decision, per feedback-recording-discipline.

---

## 17. Pricing flexibility (when real pricing lands)

The current pricing in the dashboard is **cosmetic only** — inherited from the previous design. Real pricing has NOT been decided. The dashboard architecture is designed so that whenever pricing locks, implementation is trivial.

**What stays in `/v1/me` (the spine):**
- `plan`, `plan_name`, `generation`
- `api_access`, `mcp_access`
- `reports_per_month`, `used_this_month`, `limit_this_month`
- `addons[]`
- `mcp_calls_this_month`

**Every dashboard component reads from `/v1/me`.** No component hardcodes:
- A plan name (e.g. never `if (plan === "starter")`)
- A price (e.g. never `<p>£49/mo</p>`)
- A quota number (e.g. never `"100 calls / month"`)

**Quota bar** = `used / limit` straight from API response. **Upgrade CTA** = adapts based on `/v1/me.plan` (the API tells the UI what plan to suggest, not the UI deciding).

**When pricing lands, the ONLY files that change:**
1. `apps/web/src/lib/stripe.ts` — the `PLANS` map (tier definitions + Stripe price IDs + apiAccess/quotas)
2. `apps/web/src/app/dashboard/billing/page.tsx` — billing display tiles (Phase 1 ticket, will be plan-agnostic shell)
3. `apps/web/src/app/pricing/page.tsx` — public marketing pricing
4. Stripe products created via existing `scripts/create-stripe-prices.ts`

**Files unchanged by pricing decisions:** every Phase 0-5 ticket above. Zero refactor.

**Empty-state copy convention:** until pricing locks, every empty state that mentions tiers/quotas uses abstract language ("the free tier", "your current plan", "your monthly quota"). Concrete numbers only AFTER pricing locks AND only on the billing surface.

---

## 18. Scalability + separation of concerns (Pedro's "super scalable, NOT hardcoded backend in web" rule)

The dashboard is **strictly UI**. No backend code, no DB calls, no domain logic. Anchored by these architectural rules:

### Where each kind of code lives

| Kind of code | Lives in | Imported by |
|---|---|---|
| HTTP route handlers | `apps/api/src/modules/<domain>/` | Fastify boot only |
| Database access | `apps/api/src/infrastructure/db/` repos | apps/api modules only |
| Domain logic (scoring, signals, intelligence) | `apps/api/src/modules/<domain>/` | apps/api routes |
| API contracts (DTOs) | `packages/contracts/src/*` | apps/web + apps/api (both) |
| Frontend pages (RSC + clients) | `apps/web/src/app/**/page.tsx` + `client.tsx` | Next.js routing |
| Frontend BFF proxies | `apps/web/src/app/api/**/route.ts` | Next.js routing |
| Frontend utilities (id, logger, with-auth, stripe, etc.) | `apps/web/src/lib/` | frontend only |
| **Dashboard primitives** | `apps/web/src/app/design-v2/_shared/dashboard/` | client components only |
| Brand v3 CSS | `apps/web/src/styles/brand/` | global stylesheet import |

### Forbidden imports (enforced by ESLint guard + code review)

- ❌ Client components importing from `apps/api/*`
- ❌ Client components importing from `apps/web/src/lib/db-*` (server-only)
- ❌ Dashboard primitives importing data-fetching code
- ❌ Dashboard primitives knowing about Stripe / Anthropic / Neon / any external provider
- ❌ Dashboard primitives knowing about plans, pricing, or quotas (they just render what's passed in as props)

### Data flow (one direction)

```
apps/api (Fastify) ──HTTP──> apps/web Server Component / BFF route ──props──> Client Component ──props──> <Primitive>
```

Primitives are **pure UI** — typed props in, JSX out, callbacks for events. They:
- Don't fetch data (consumer fetches, passes via props)
- Don't import server-only code
- Don't know what backend exists
- Could theoretically render the same way against a mock, a real API, or a Storybook story

### Why this scales

- **Backend can move** (apps/api could deploy on Render, OCI, AWS, anywhere) — frontend doesn't care, it talks HTTP
- **Frontend can move** (apps/web could deploy on Vercel, Cloudflare, anywhere) — backend doesn't care
- **API contracts are typed** (Zod in `packages/contracts`) — frontend + backend never drift
- **Primitives can be tested in isolation** (no DB, no network, no mocks needed beyond their typed props)
- **Pages can be tested in isolation** (mock the API call, render the page with fake data, assert UI behavior)
- **Pricing change** = change `stripe.ts` + 2 display pages. Dashboard primitives unchanged.
- **Plan tier add/remove** = change `stripe.ts` PLANS map. Dashboard primitives unchanged.
- **New product launch** = new endpoint in apps/api + new page in apps/web. Existing primitives reused.

### ESLint guard

Phase 0 adds (if not already present) an ESLint rule that forbids client components from importing:
- `apps/api/**`
- `apps/web/src/lib/db-*`
- `apps/web/src/lib/server/**`
- Any file matching `*-server.ts`

This catches drift at lint time, not at code-review time.

## 14. Tests + gates (per PR)

Every PR must pass before squash-merge:
- `npm test -w @onegoodarea/api`
- `npm test -w @onegoodarea/web`
- `npm test -w @onegoodarea/contracts`
- `npm run typecheck`
- `npm run lint`

UI work additionally needs Pedro's localhost approval per feedback-design-bar.

New components in Phase 0 get unit tests (keyboard nav, focus trap, click handlers).
New pages in Phase 1-5 get integration tests for the happy path (load + interaction + API call).
RBAC pages in Phase 4 get tests for member / admin / owner role gates.

## 15. Memory updates (per phase)

After each phase merges:
- Update `project_dashboard_redesign_pending.md` → rename to `project_AR-217_dashboard_redesign.md` and track phase state.
- Update `MEMORY.md` active-workstreams table.
- Update `ARCHITECTURE.md` §9 phase status table.

## 16. Risks

| Risk | Mitigation |
|---|---|
| Phase 0 primitives take longer than 1 week | Ship in 2 sub-batches (CSS first, React after). Phase 1 can start on the subset that's done. |
| Pricing lands during Phase 2-3 | Dashboard is pricing-agnostic by design; only `/dashboard/billing` and empty-state copy change. No structural rework. |
| Async portfolio enrichment ships during Phase 3 | Monitor section adds a "Run history" sub-view; rest of the section unchanged. |
| `/playground` rate-limit insufficient against scrape | Add per-postcode cache + WAF rules + raise limit cautiously. Worst case: gate behind a CAPTCHA. |
| Brand v3 primitive design takes multiple iterations with Pedro | Build minimum-viable primitive first, get localhost approval, iterate to v2 in same branch. Don't ship until Pedro's "ship it." |
| Levers RBAC client/server drift | AR-217-E8 RBAC sweep ticket explicitly audits this. Every typed 403 code has a matching client gate. |

## 17. Open questions for Pedro

1. **D1-D5** in §4 — please lock.
2. **Sub-ticket creation:** I'll create all Phase 0 sub-tickets (AR-217-A1 through A5) when you give the green light on D1-D4. Phases 1-5 sub-tickets get created at the start of each phase, not all up front.
3. **Activity events endpoint:** the proposal references `users.recent_activity` but recon found `activity_events` table populated by `trackEvent` calls. AR-217-A4 confirms / adds the read endpoint. OK?
4. **Public playground service account:** do we want a separate service-account API key for `/playground` traffic so it's quota-trackable, or should it use a special un-metered key with internal rate-limit only?
5. **MCP dashboard section:** the proposal flagged this as a Phase 4 or 5 candidate. Defer to Phase 5 polish, or punt to a follow-up Epic?
