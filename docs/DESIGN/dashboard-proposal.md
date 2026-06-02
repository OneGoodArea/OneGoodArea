# Dashboard + user-flow proposal

**Status:** Proposal. Not yet locked. Reviewable.
**Author session:** Mac (read-only analysis environment, 2026-06-01).
**Scope:** the authenticated app surface from sign-up through arrival, including a Stripe-class sandbox/playground story, an org switcher and Levers config UI, the four product playgrounds, and ICP-aware onboarding. Builds on the AR-204 Brand v3 reskin already shipped on the marketing + auth surfaces.

**Pricing dependency:** pricing structure is NOT yet finalized. This proposal is deliberately pricing-agnostic. Every reference to "tiers" or "quota" reads from `/v1/me` entitlements at runtime; the dashboard does NOT bake in a hardcoded pricing matrix. When pricing lands, the billing surface changes; the rest of the dashboard does not.

---

## What this doc is

A pre-implementation design brief for the next major epic after AR-204. AR-204 rebuilt the marketing and auth surfaces (5 ICP pages, 4 product pages, Brand v3 across `/methodology`, `/docs/*`, homepage, nav, sign-up, sign-in). Every CTA on those pages converges on `/sign-up`. The authenticated dashboard is now the gap. This doc proposes the structure, the user flow, and the build order to close it.

It explicitly does NOT:
- Pick the visual design beyond the Brand v3 tokens AR-204 locked
- Define pricing (deferred; see `Pricing dependency` above)
- Cover the pre-sales / contact-sales / Enterprise-handshake flow (separate proposal)
- Cover internationalization (out of scope; OGA is UK-only)

---

## Reference points

- **35 ADRs (0001-0035).** Full architectural picture. Levers tenancy complete (orgs, RBAC, custom bundles, scoring presets, peer cohorts, methodology pinning, white-label, IP allowlist). All 6 Intelligence surfaces shipped. AI eval at 92.9% on a 14-case Anthropic corpus.
- **AR-204 design brief** (`AR-204-app-redesign.md`). Brand v3 vocabulary, CTA conventions, demo strategy on marketing surfaces.
- **Existing dashboard.** `/dashboard`, `/api-usage`, `/settings`, `/dashboard/billing`. Built on `AppShell` (240px sidebar, dark mode, primary/secondary nav). No Levers UI, no Intelligence query interface, no webhooks UI, no org switcher.
- **API spine.** `GET /v1/me` returns plan, entitlements, engine_version, addons, org context, role, IP allowlist. Every dashboard page reads from this; the page should never hardcode plan IDs.

---

## The headline decision: sandbox model

The model needs to be picked but the decision can wait until pricing lands. Two viable shapes; recommendation is at the bottom.

### Model A — Full Stripe-style test/live separation

Every org has two environments. Keys are prefixed `oga_test_*` / `oga_live_*`. Dashboard top-left toggle persists in URL via `?env=test`. Test mode has separate webhooks (separate signing secret), separate quota counter, separate Levers config (bundles, presets, methodology pin, cohorts, IP allowlist), separate API keys list. Test mode is free up to a fair-use cap regardless of plan.

**Pros**
- Familiar to anyone who has integrated Stripe
- Clean separation between prototyping and production
- Integration teams can develop against test without burning live quota
- Webhook signing-secret rotation has a safe practice ground

**Cons**
- Doubles the dashboard surface (every config page needs an env scope)
- Doubles the data model (every Levers table needs an `environment` column)
- Doubles webhooks plumbing
- Doubles the marketing copy and docs explaining the difference
- For v1 this is real cost without proportional return: OGA data is identical across modes (it is public UK data); only billing and quota differ

### Model B — Sandbox-as-tier, no test/live separation

The lowest paid (or free) plan tier IS the prototyping environment. New users land there automatically. Upgrade when they hit the wall. Keys carry one prefix (`oga_*`). One set of Levers config per org. Webhook subscriptions are shared across the org (not duplicated per environment).

**Pros**
- Zero new engineering for the environment toggle
- Uses the plan tier that pricing already needs to define
- Matches the underlying reality that data is the same in either mode
- One mental model; one set of keys; one Levers config to maintain

**Cons**
- No first-class "test webhooks" path (mitigated by per-key IP allowlist plus customers running separate webhook URLs in their own stack)
- Customers conditioned by Stripe will ask "where is test mode" and need explicit documentation explaining the difference

### Recommendation

**Ship Model B as v1.** Document explicitly: "OneGoodArea data is real UK data. There is no test/production data split. Use the free/sandbox tier to prototype without burning your live quota. Upgrade when you need more." Migration path to Model A is mechanical if customer demand surfaces later: add `environment` column to api_keys + webhook_subscriptions + Levers tables; introduce `oga_test_*` prefix; ship the top-left toggle. Don't ship Model A speculatively.

---

## Sign-up to arrival flow

Five steps. Steps 4 and 5 do not exist yet and are the largest opportunity.

### Step 1 — Sign-up trigger

Every ICP and product page already routes to `/sign-up`. Add one detail: append `?from=<source>` (e.g., `/sign-up?from=lenders` from the lenders ICP page). One-line change in `apps/web` nav and CTA components. Unlocks ICP-aware onboarding without changing the sign-up form.

### Step 2 — Sign-up form

Email + password OR Google + GitHub OAuth (already wired). Brand v3 `AuthShell`. After submit:

- Backend creates user (`POST /auth/register`)
- ADR 0028 auto-creates the personal org
- Verification email sent
- **NEW:** store `signup_source` on the user record from `?from=<source>` if present
- Show the "Check your inbox" state with resend option (already exists)

### Step 3 — Email verification

User clicks the link. `/verify` token-gates the verification. On success: redirect to `/welcome` (NEW) instead of `/dashboard`.

### Step 4 — `/welcome` flow (NEW)

The single most important page in the entire flow. Three short steps, all skippable.

**Step 4.1 — Pick your intent.** "What brings you to OneGoodArea?" Five cards mirroring the ICPs: PropTech, Lenders, Insurance, Site Selection, Public Sector. `signup_source` from Step 1 pre-selects the right card if known. Selection updates `users.intent` and shapes the dashboard from this point on.

**Step 4.2 — Pick a postcode you care about.** Pre-filled with M1 1AE (the canonical example across the ADRs) and four other suggestions. The user can type their own. The system loads the `AreaProfile` live and shows the signal catalog while they watch. First "moment of magic."

**Step 4.3 — Pick how you'll use the API.** Three radio buttons:
- "I am the integration engineer" → arrival lands them on the API Keys section
- "I am the analyst querying through the UI" → arrival lands them on Intelligence Playground
- "I am exploring" → arrival lands them on `/dashboard` overview

Each step is skippable. Default flow is "exploring," landing on `/dashboard`.

### Step 5 — Arrival on `/dashboard`

Three things pre-populated:
- The user's first `AreaProfile` (from Step 4.2) appears in their Recent section
- Their personal org is auto-named "<email-local-part> workspace"
- A "Getting started" panel prompts the next ICP-aware action

Users who skip the welcome flow entirely (or arrive via OAuth without the new flow being wired yet) see the empty-state dashboard with three "First moves" cards: "Look up an area," "Get your API key," "Read the methodology."

---

## The dashboard sitemap

Sidebar reorganized into four sections. Existing `AppShell` chrome stays. Sidebar items expand significantly.

```
Dashboard
├── Home                        [/dashboard]                  EXISTS, redesign
├── Recent activity             [/dashboard/activity]         NEW (from activity_events)

Products
├── Signals                     [/dashboard/signals]          NEW playground
├── Scores                      [/dashboard/scores]           NEW playground (extend /report)
├── Monitor                     [/dashboard/monitor]          Extend (portfolios + alerts + webhooks)
├── Intelligence                [/dashboard/intelligence]     NEW (query plane: rank, peers, insights, forecast)

Org & Levers (visible only when user is admin+ of a non-personal org)
├── Members                     [/dashboard/org/members]      NEW
├── Signal bundles              [/dashboard/org/bundles]      NEW
├── Scoring presets             [/dashboard/org/presets]      NEW
├── Peer cohorts                [/dashboard/org/cohorts]      NEW
├── Methodology pin             [/dashboard/org/methodology]  NEW (owner-only)
├── White-label                 [/dashboard/org/branding]     NEW (owner-only)
├── IP allowlist                [/dashboard/org/security]     NEW

Account
├── API keys & usage            [/api-usage]                  EXISTS, extend
├── Webhooks                    [/dashboard/webhooks]         NEW
├── Billing                     [/dashboard/billing]          EXISTS
├── Settings                    [/settings]                   EXISTS
```

Top of sidebar: **org switcher** dropdown (NEW). Shows current org + role badge, lists all orgs the user is a member of, "Create new org" CTA at the bottom. Spine of the multi-tenant UX. Currently has no UI despite Levers shipping the data model.

---

## Section-by-section design

### Home (`/dashboard`)

Three rows.

**Row 1 — Top strip.** Plan badge + quota bar + "Upgrade" CTA (CTA copy adapts based on `/v1/me.plan`; specific plan names + prices read from `/v1/me`, never hardcoded). Already exists; keep the shape, decouple from any specific plan name.

**Row 2 — Three cards in a grid:**
- **Last query.** Most recent `/v1/query`, `/v1/area`, or report execution. Result preview + "Run again" button.
- **What changed.** Pull from `signal.changed` webhooks fired against the user's portfolios. Empty state: "Connect a portfolio to get change alerts."
- **Suggested next move.** ICP-aware (`users.intent`): Lenders see "Build a portfolio of postcodes you underwrite"; PropTech sees "Try the Intelligence query plane"; CRE sees "Find peers of an existing site"; Insurance sees "Run /v1/insights on your high-claim postcodes"; Public Sector sees "Generate a deprivation case study."

**Row 3 — Recent activity.** From `activity_events` (already populated by `trackEvent` calls throughout the API). Latest 10 events with click-through.

This replaces the current "Reports list / Watchlist / Stats grid" home. Reports move into `/dashboard/scores`. Watchlist becomes `/dashboard/monitor`.

### Signals playground (`/dashboard/signals`)

Two modes.

**Single-area mode.** Postcode input box. Returns the full `AreaProfile`. Signal catalog renders as a list with each signal's value, normalized value, percentile, confidence, source, methodology version. Click any signal to see its time-series chart (from `signal_timeseries`).

**Cross-area mode.** Compound `rank_areas` interface (per ADR 0019). Filter builder, up to 8 signals (the ADR cap). Each filter row: signal picker, operator (`lt`/`lte`/`gt`/`gte`/`between`, plus the `percentile_*` variants), value. AND semantics across rows. Sort selector, limit, country, LAD scope. Results render as a ranked table.

Most-asked-for surface from ICP buyers per the gap analysis. Zero UI today.

### Scores playground (`/dashboard/scores`)

Migrate the existing `/report` generator here. Add:

- A **preset picker** (moving / business / investing / research) with a custom-weight slider per dimension for the active preset
- A **saved preset list** (from `/v1/orgs/:id/presets`) with "Save current weights as preset" affordance
- A **score breakdown** showing each dimension's contribution + confidence + reasoning

The configurable-scoring story the methodology page promises but the dashboard doesn't deliver today.

### Monitor (`/dashboard/monitor`)

Replaces the Watchlist concept. Three sub-views:

**Portfolios.** List of portfolios, each with area count and last-enriched date. Click into one: areas, enrichment scores, change history. Actions: add areas, enrich, configure change-detection thresholds, set up `signal.changed` webhook.

**Changes feed.** Stream of detected changes across all portfolios. Becomes the proactive alert surface once async enrichment ships (it is on the priorities list).

**Webhook subscriptions.** Zero UI today per the gap analysis. Topic selector, delivery URL, signing secret display, last delivery status, retry queue. Could also live under Account → Webhooks; either location works.

### Intelligence (`/dashboard/intelligence`)

Five sub-tabs.

**Query builder.** Visual builder for `rank_areas` singular and compound. Shares the cross-area UI from Signals.

**Natural language.** Chat-like input. Sends to `POST /v1/query` with `{ question }`. Renders:
- The resolved `plan + plan_source` (the planner's typed output) BEFORE the result, so the user understands what query ran
- The executed results
- "Replay as programmatic plan" button converting the response into a `{ plan: ... }` curl example

This is the audit-replayable Intelligence story made visible in the UI.

**Peers.** `POST /v1/peers` interface. Target picker (postcode or geo_code), optional signal subset, optional cohort scope (if the org has cohorts), `k` slider. Results render as a ranked list with `distance` + `n_dims_used` per peer.

**Insights.** `POST /v1/insights` interface. Signal picker (peer-relative-z signals only per ADR 0024), optional country/LAD scope, `min_abs_z` threshold. Results render as a ranked anomaly list.

**Forecast.** `POST /v1/forecast` interface. Target picker, signal picker, window slider (default 24m), horizon slider (default 12m). Results render as a line chart with confidence band.

Every tab has a **"Show the curl"** button that produces the equivalent API call. Dashboard-as-developer-onboarding-tool pattern. Linear does this; Stripe does not. Killer for our developer-shaped buyers.

### Org & Levers section

Seven pages, one per ADR 0028-0034 capability. All are admin+ guarded per ADR 0033's RBAC matrix. Owners see everything; admins see everything except methodology pin (owner-only per ADR 0031) and ownership grants (owner-only per ADR 0033).

**Members.** List, role badges, add member by user ID (later by email when invite flow ships per ADR 0028), remove member. Last-owner guard surfaced as a UI affordance not just an error.

**Signal bundles.** List + create + edit + delete. Signal-key picker with the full `SUPPORTED_SIGNALS` catalog. Preview the response shape when `?bundle=` is applied.

**Scoring presets.** List + create + edit + delete. Preset picker for `base_preset`, weight sliders, validation error states for unknown weight keys (per ADR 0030).

**Peer cohorts.** List + create + edit + delete. LSOA code picker (paste a list, upload a CSV, or pick from `/v1/areas` results). Cohort-size meter against the 10,000-LSOA cap.

**Methodology pin.** Single dropdown of supported engine versions. Owner-only (admins see read-only). Confirm dialog on change. Activity event already exists per ADR 0031.

**White-label.** `display_name` + `brand_url` editor. Live preview of how `/v1/me` would surface the rebrand. "Reset to defaults" button.

**IP allowlist.** Per-key CIDR list. Add/remove. Live status: "Your current IP is X.Y.Z.W. It IS allowed / NOT allowed." Security-review checkbox surface per ADR 0034.

### Account section

- **API keys & usage** (`/api-usage`) — extend the existing page. Add: per-key IP allowlist editor (currently SQL-only per ADR 0034), per-key activity feed, last-used IP and user-agent.
- **Webhooks** (`/dashboard/webhooks`) — see Monitor section above; pick one location.
- **Billing** (`/dashboard/billing`) — keep existing. Will change shape when pricing lands.
- **Settings** (`/settings`) — keep existing. Add an "Org membership" row showing which orgs the user belongs to and their role in each.

---

## The demo experience (pre-signup)

Nothing exists today between the landing pages and `/sign-up`. The buyer reads marketing copy and must commit to a sign-up before seeing the product. That is a conversion-funnel mistake.

### Proposal: public `/playground` route

Read-only. IP-rate-limited (e.g., 5 calls/minute, hard cap 30/hour). Three default queries pre-loaded:

1. "Show me M1 1AE's full signal catalog" → `GET /v1/area?postcode=M1 1AE`
2. "Rank the most-deprived LSOAs in Manchester" → `POST /v1/query` with compound `rank_areas`
3. "Forecast property prices in M1 1AE for 12 months" → `POST /v1/forecast`

Each query renders with the API response visible (formatted JSON on one side, a UI rendering on the other) and a "Sign up to run this with your data" CTA. The "Show the curl" button produces the equivalent API call for engineers.

**Cost.** A small new public route + a service-account API key with hard rate-limit + a few cached responses to defend against scrape attacks. Engineering: under a week.

**Strategic value.** Carto cannot ship this surface inside their consumer experience because they do not own the dataset. The playground is a Carto-resistant marketing surface for free.

**Quoting the 92.9% measured eval accuracy** next to the playground: "Our NL planner gets 92.9% of curated ICP questions structurally correct against the Anthropic provider. Try it yourself."

Add `/playground` as a secondary homepage hero CTA ("Try it now" alongside "Get started"). Add it to every ICP page footer.

---

## Onboarding state (existing and new users)

The existing dashboard has no onboarding. New users land in an empty state with a "Generate your first report" CTA. That worked when reports were the only product. With four products + six Intelligence surfaces + Levers, it does not.

### Proposal: persistent "Getting started" panel on `/dashboard`

Visible for users with fewer than 10 API calls or fewer than 5 days of account age. ICP-aware checklist driven by `users.intent`:

**For Lenders:**
- [ ] Run your first AreaProfile lookup
- [ ] Build a portfolio of postcodes you underwrite
- [ ] Pin your methodology version
- [ ] Set up `signal.changed` webhooks

**For Insurance:**
- [ ] Run your first peer-similarity query
- [ ] Try `/v1/insights` on `crime.total_12m_peer_relative_z`
- [ ] Create a peer cohort of your high-claim postcodes

**For PropTech:**
- [ ] Generate an API key
- [ ] Read the methodology
- [ ] Try a forecast for a market you cover

**For Site Selection:**
- [ ] Run a compound `rank_areas` query
- [ ] Find peers of a successful existing site
- [ ] (Soon) Explore the Snowflake / AWS Marketplace listing

**For Public Sector:**
- [ ] Generate a report for a deprivation case study
- [ ] Read the methodology with ONS code citations
- [ ] Configure white-label for your council brand

Each item links to the relevant dashboard section. Checked items disappear from the panel; the panel disappears entirely once all items are done. Linear / Vercel pattern.

---

## Implementation phasing

Five phases. Each lands in a named PR set.

### Phase 1 — Chrome and spine (week 1-2)
- `/welcome` flow (3 steps, skippable)
- Sidebar reorganized to the new sitemap
- Org switcher in sidebar top
- `signup_source` capture
- Home page redesigned (top strip + 3 cards + activity feed)
- Existing dashboard pages re-pointed to new sidebar locations

### Phase 2 — Playgrounds (week 3-5)
- `/dashboard/signals` (single-area + cross-area)
- `/dashboard/scores` (migrate report generator + preset/weights UI)
- `/dashboard/intelligence` (5 sub-tabs)
- Public `/playground` route (read-only demo)
- "Show the curl" button across every query interface

### Phase 3 — Levers UI (week 6-8)
- Members, Signal bundles, Scoring presets, Peer cohorts, Methodology pin, White-label, IP allowlist
- RBAC enforcement client-side

### Phase 4 — Monitor + webhooks (week 9-10)
- Portfolio detail rebuild
- Changes feed
- Webhook subscriptions UI
- Per-portfolio change-detection threshold config

### Phase 5 — Polish + onboarding (week 11-12)
- ICP-aware Getting-started checklist
- Activity feed
- Empty states across every section
- Mobile responsive sweep
- Accessibility audit

Phases 1 and 2 are the launch bar. Phase 3 unblocks vertical pack productization (Lender Pack, PropTech Pack). Phases 4 and 5 are quality-of-life polish.

---

## Vocabulary (this proposal uses these words)

| Term | Meaning |
|---|---|
| **Welcome flow** | 3-step skippable post-verification onboarding at `/welcome` |
| **Playground** | Public read-only demo route at `/playground` (pre-signup) |
| **Sandbox / test mode** | The not-yet-decided model (A or B) for prototyping environment |
| **Org switcher** | Top-of-sidebar dropdown for the multi-tenant UX |
| **Getting started panel** | ICP-aware checklist that lives on `/dashboard` for new users |
| **Show the curl** | Button across every query interface that produces the equivalent API call |
| **Spine of the dashboard** | `GET /v1/me` (every page reads from it) |
| **Plan-agnostic** | The dashboard reads entitlements from `/v1/me`, never hardcoding plan IDs or prices |

---

## Hard rules

These survive even when pricing changes or design taste shifts.

1. **Plan-agnostic dashboard.** Read entitlements from `/v1/me`. Never hardcode plan names or prices in dashboard components. The billing surface (`/dashboard/billing`) is the one place that names plans; the rest of the app reads capability flags.
2. **No invented quotas in copy.** Marketing-grade copy ("35 free calls a month") only appears on the billing surface, only after pricing is locked, and only sourced from `/v1/me`. Empty states say "the free tier" abstractly.
3. **Audit-replayable Intelligence is visible in the UI.** Every NL query MUST show the resolved plan before the result. Every result MUST have a "Show the curl" button. This is the deterministic-AI story; it cannot leak into "chatbot output, trust me."
4. **Levers RBAC enforced client-side AND server-side.** UI gates the wrong-role user from the affordance; the API gates them on the request. Never client-side-only.
5. **No marketing claims that outrun what is built.** The Hard Rules in `docs/pricing.md §6` apply to dashboard copy too: no "predictive confidence" until the calibrated model ships, no "regional benchmark" until regional percentile scopes exist, no "Monitor 10,000+ areas" until async enrichment ships, no "AI explains this area" until `/v1/analyze` ships (it remains deferred by design per ADR 0017).
6. **The plan grammar is visible.** The Intelligence section must show users that NL queries are translated to typed plans. The plan IS the API; surface it.
7. **Brand v3 throughout.** No mixing of AIQ-namespace legacy styles into new dashboard pages. The `.oga-root` wrapper and the Plotted tokens are the only design system.

---

## Open decisions

These need Pedro's call before Phase 1 starts in earnest:

1. **Pricing structure.** Blocks the billing surface redesign and the empty-state copy. Doesn't block Phases 1-5 structurally, only the wording. Recommend locking pricing in parallel with Phase 1 build.
2. **Sandbox model.** Model A (Stripe-style test/live) or Model B (sandbox-as-tier). Recommendation: B for launch. Decision can wait until pricing is locked because it changes the data model.
3. **`/playground` data risk.** A public read-only playground costs API calls per visitor. Acceptable in the Neon cost budget? Hard rate-limit + cached responses keep it bounded.
4. **Welcome flow steps.** All three (intent / postcode / role) or just intent? Recommendation: all three, skippable.
5. **ICP-aware dashboard.** Does the home page meaningfully change based on `users.intent`, or is it the same dashboard with different "Suggested next move" copy? Recommendation: latter for v1 (less branching engineering).
6. **Org switcher placement.** Top of sidebar (proposed) or top nav? Stripe puts it top-left.
7. **Intelligence sub-tabs vs separate pages.** Sub-tabs (proposed) keep "Intelligence is one product" coherent. Alternative: dedicated `/dashboard/peers`, `/dashboard/insights`, `/dashboard/forecast` pages. Tradeoff: deep-linking vs. sidebar noise.
8. **MCP dashboard section.** Currently MCP is a billing toggle. With MCP-first distribution as the top advancement move, should there be a dedicated `/dashboard/mcp` page (MCP server URL, session count, last-used assistant, MCP usage by tool)? Recommendation: yes, in Phase 4 or 5.
9. **Async-enrich UI placement.** Monitor section assumes async portfolio enrichment ships (it is on the priorities list). If it ships before this dashboard work, Monitor gets a "Run history" sub-view. If it ships after, the Monitor section is built for the sync caps initially.

---

## Out of scope

- Pre-sales / contact-sales / Enterprise-handshake flow (separate proposal)
- Visual design beyond Brand v3 tokens (typography weights, spacing, color usage)
- Page-level copywriting (handled in implementation; subject to the Hard Rules in `docs/pricing.md §6`)
- Mobile experience details beyond Brand v3 responsive defaults
- Internationalization (OGA is UK-only)
- The actual database migrations for `users.intent` and `users.signup_source` columns (engineering work for Phase 1)
- API endpoints that don't exist yet but are referenced (e.g., `/v1/me.recent_activity`); the dashboard reads from existing endpoints, and if any new ones are needed, they get their own ADRs

---

## Change log

Update this section after each PR in the dashboard workstream.

| Date | PR | Phase | Change |
|---|---|---|---|
| 2026-06-01 | (proposal) | — | Initial proposal drafted on Mac read-only session; pricing-agnostic by design |
