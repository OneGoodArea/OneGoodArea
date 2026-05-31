# AR-204 — Brand v3 app-wide redesign + re-narrative

> Living doc. Updated after every iteration (every section / PR / decision).
> Jira: [AR-204](https://podnex.atlassian.net/browse/AR-204).
> Branch: `feat/AR-204-app-redesign` (off main at `e9f927b`).
> Started: 2026-05-30.

---

## 1. The mission

Redesign every page in apps/web to:

1. Reflect the system we actually built — signal-first primitive, 4 composable products, the moat clock, deterministic + auditable engine, Levers per-org config.
2. Use the Plotted (Brand v3) design vocabulary consistently across every page.
3. Use the same narrative language everywhere — phrases grounded in the ADR trail, never invented marketing claims.
4. Connect every dot — each page knows what it IS, who it's FOR (ICP-aware), which API endpoints back it, what real example queries appear as proof.

---

## 2. The grasp — what OneGoodArea actually is (4 sentences)

A data + intelligence infrastructure layer for UK property workflows. The unit of value is a signal — a measured, sourced, normalized, percentiled, time-stamped attribute of a UK area at LSOA × month grain. Everything above signals is composition: Scores are configurable aggregates (frozen engine v2.0.2, deterministic), Monitor is portfolios + monthly change detection over time-series, Intelligence is the typed query plane where AI emits the plan and the database answers. The moat is the immutable monthly snapshot — un-backfillable history that gets cheaper to compete with us every month.

**Anti-narratives we explicitly reject:**

- Not a postcode report.
- Not a chatbot.
- Not a consumer site.
- Not a "predictive AI" with unbounded claims.

---

## 3. Dual-mode product framing (every marketing page reflects this)

**Mode 1 — API-first integration (primary B2B):** the client's product / system / notebook calls our API. We are infrastructure underneath their workflow. Examples by ICP:

- PropTech embed: listing page calls `GET /v1/area?postcode=...` and shows score on every listing
- InsureTech MGA: rating engine calls `POST /v1/score` with custom weights, underwrites in 200ms
- Lender underwriter: loan-origination calls `POST /v1/query` with rank_areas filters, pre-screens loanable areas
- CRE platform: site-search backend calls `POST /v1/peers`, finds 20 LSOAs similar to a target
- Public sector analyst: notebook hits `POST /v1/insights`, flags peer-relative anomalies

**Mode 2 — Dashboard control plane:** the client signs in to OneGoodArea to configure how the API behaves and to monitor what it does. Not to view reports as primary workflow. Lives in dashboard:

- API keys, quota, billing
- Levers per-org config that the API honors: custom signal bundles, custom scoring presets, methodology pinning, peer cohorts, white-label, IP allowlist, members + RBAC
- Monitor portfolios + webhooks
- Audit + receipts

Optional: dashboard also has product surfaces as web UIs (`/area/[postcode]`, `/compare`, `/playground`) for evaluators / researchers / small teams who haven't integrated yet.

**Every marketing page leads with API**, shows the dashboard as control, and acknowledges dashboard-as-product for evaluators.

---

## 4. The 10 core phrases (vocabulary anchored in ADRs)

These appear consistently across every page. Never reworded.

| # | Phrase | ADR |
|---|---|---|
| 1 | Signal-first infrastructure | 0001 |
| 2 | Deterministic preserved; engine version stamped | 0008, 0017, 0031 |
| 3 | Monthly time-series moat; un-backfillable history | 0010 |
| 4 | Country-scoped percentiles | 0005 |
| 5 | LSOA × month grain, postcode resolution via ONS spine | 0002, 0006 |
| 6 | 92.9% planner accuracy baseline (14-case corpus) | 0026 |
| 7 | Confidence per dimension, source-driven | 0001 |
| 8 | Org-level methodology pinning, owner approval to change | 0031 |
| 9 | Three-tier RBAC: member / admin / owner | 0033 |
| 10 | Peer-relative, not global-rank | 0024 |

## 5. Things we never claim

- "AI generates the number / score / forecast." Wrong. AI emits the plan; the database executes.
- "Real-time", "live", "instant insights." Wrong. Monthly cadence at finest.
- "Postcode-level signals." Wrong. LSOA grain. Postcode is the resolution mechanism, not the unit.
- "Chatbot", "ask me anything", "AI assistant." Wrong. The query plane is typed; NL is a sugar over JSON.
- Specific quota or tier numbers. **Pricing is undecided.** Never invent.
- "Real-time", "fastest", "most accurate", "best-in-class". Adjectives without measurement.
- "Crime by category" / "violent-crime breakout." Gap documented in ADR 0016.
- "Address-level scoring." LSOA grain is the floor.
- Em dashes in user-facing copy. House rule.
- **"7 sources" across marketing pages — NO EXCEPTIONS.** Source COUNT (the number 7) and source NAMES appear only on `/methodology` and in API responses (`source_snapshots`). Marketing pages say *"multiple sources"* or *"public-record sources"* generically. The methodology page enumerates them in full. Bridge CTAs to /methodology should say "Explore the methodology" — NOT "See the 7 sources" or "Explore all 7 sources." (Pedro reinforced this after I broke the rule in section 5's CTA on 2026-05-30.)
- **"Try a postcode" / "Try our tool"** anywhere on B2B marketing. Consumer-tool framing reads wrong for our positioning. Use *"Get an API key"* / *"See it in action"* / *"Build with [X]"* instead.

---

## 6. Architectural hygiene rules (Marcos's preference, locked)

Applied to every new file in AR-204:

| Rule | Concrete enforcement |
|---|---|
| No inline `style={{ ... }}` in TSX | Every visual lives in a `.css` file. Where dynamic values are needed, set a CSS custom property via `style={{ "--bar-width": "60%" }}` and let CSS apply it. |
| CSS files only for styling | `import "./about.css"` next to `about/client.tsx` is acceptable (file import, not code mixing). No styled-components, no styled-jsx, no Tailwind for design tokens (utilities like `flex`/`gap-4` allowed for trivial helpers; design tokens use `oga-*` classes). |
| No backend imports in frontend files | apps/web files do NOT import from apps/api directly. HTTP boundary only. New code calls `/api/...` (Next route → proxy to apps/api). |
| Co-located CSS | `apps/web/src/app/design-v2/about/about.css` lives next to `client.tsx`. Shared / cross-page styles stay in `styles/brand/*.css`. |
| Existing inline-style pages get rewritten on touch | When I redesign a page, every existing `style={{...}}` gets extracted into the CSS file. No new inline styles introduced; old ones strip out as part of the redesign. |

---

## 7. Hard rule — every UI action wires to real backend

No mocked states. No UI-only persistence. No "we'll wire it up later." Every form field, every Levers card, every dashboard interaction calls a real apps/api endpoint and reads/writes the database.

Concretely:

- **Signup steps persist immediately as the user progresses** (not a single big submit at the end):
  - Step 1 → `POST /v1/auth/register` creates user + auto-org per ADR 0028
  - Step 2 → `PATCH /v1/orgs/:id` writes display_name + brand_url (ADR 0034) + ICP + size profile
  - Step 3 → `PUT /v1/orgs/:id/methodology` writes the pin (ADR 0031)
  - Step 4 → `POST /v1/orgs/:id/members` for the optional invite (ADR 0028)
  - Step 5 → `POST /v1/keys` for the API key + optional `PATCH` with `allowed_ip_cidrs` (ADR 0034)
- **Dashboard CRUD** hits real endpoints — no UI-only forms:
  - Org management: `/v1/orgs/:id` + `/v1/orgs/:id/members` (CRUD)
  - API keys: `/v1/keys` + `/v1/keys/:id` (create / rotate / revoke / set allowed_ip_cidrs)
  - Portfolios: `/v1/portfolios` + `/v1/portfolios/:id` + `/enrich` + `/changes`
  - Levers: `/v1/orgs/:id/bundles|presets|cohorts|methodology|members` — all real tables (signal_bundles, scoring_presets, peer_cohorts, org_methodology_pins, org_members)
- **Demo widgets on marketing pages** call `/api/demo/v1/*` which proxies to apps/api (rate-limited per IP, postcode-allowlisted). Same response shapes as production. The user sees real engine output, not a mock.
- **Optimistic UI is allowed** for snappy feedback, but always with rollback on backend error. Never silent.
- **localStorage is for theme + sidebar collapse only.** All product state — orgs, keys, portfolios, bundles, presets, pins, members — lives in the database.

What this means for the iteration loop: when I show a section on localhost, the wiring is real. If clicking "Create API key" generates a key, it's persisted in `api_keys`. If I haven't wired a control yet, the button is **disabled with a clear "Not wired" indicator** — never a fake working state.

This is also why each page PR includes a wiring check at the end: every interactive element either calls a real endpoint or is explicitly stubbed-disabled. Backend test coverage in apps/api already validates the endpoints themselves (868 tests); web-side, integration tests verify the call gets made for critical surfaces (signup steps, key creation, Levers config saves).

## 8. Three page templates — every page is one of these

### Template A — Marketing page
Used by: `/`, `/about`, `/business`, `/methodology`, `/pricing` (parked), `/products/*`, `/playground`, `/blog`, `/changelog`, `/help`.

Composition: Nav → Hero (light or dark by design) → 4-6 numbered sections (alternating shell tones cream / white / dark) → CTA → Footer. Each section follows the header pattern: numbered eyebrow + rule-mark + h2 + lead + body. One section per page carries an `.oga-sample-card` or `.oga-code-panel` (the page's "proof of real"). One section carries an `.oga-coverage__stats`-style strip with measured numbers from ADRs. Cross-linking footer band points to relevant adjacent pages.

### Template B — Product surface
Used by: `/area/[slug]`, `/report/[id]`, `/compare`, in-dashboard product views.

Composition: Nav → Surface header (area name, intent badge, score + dims) → data sections (signals table, time-series, peers, insights, forecast) → audit footer. Lead element is the `.oga-sample-card` blown up to full surface (the page IS the sample card). Every data block carries `engine_version`, `fetch_mode`, `confidence`, `last_updated period` — the audit trail is part of the page, not hidden. Cross-link to the API endpoint backing it (collapsible "See the query plan").

### Template C — App-shell page
Used by: `/dashboard`, `/billing`, `/api-usage`, `/settings`, `/sign-*` (light-shell variant).

Composition: App shell (sidebar + main) → page header (mono eyebrow + h3 + lead) → functional sections (forms, tables, configurators). Sidebar carries: org switcher, quota strip, 4-product navigation, Levers admin, account. Forms use `.oga-btn-*` + `.oga-nav-search`-style inputs. Settings sub-pages share row+detail pattern (read state left, edit/CRUD right).

---

## 9. Design vocabulary (Plotted motifs from `styles/brand/`)

Already in the codebase; every redesign uses these.

| Motif | Class | Purpose |
|---|---|---|
| Dot field | `.oga-bg-dots`, `-faint`, `-dense`, `-loose`, `-on-dark` | Section backgrounds, masked to fade edges |
| Fade masks | `.oga-fade-right/left/top/bottom/vignette/edges` | Layered on dot fields |
| Rule-mark divider | `.oga-rule-mark` (line + 29-dot mark + line + optional label) | Section dividers — replaces all generic `<hr>` |
| Section shells | `.oga-section-hero` (cream + faded dots), `-quiet` (white + corner mark watermark), `-dark` (graphite + top-right dot fade) | Three repeating tones |
| Eyebrow | `.oga-eyebrow` (Geist Mono, 11px, 0.22em tracking, uppercase) + numbered pattern | Above every section title |
| Section header pattern | numbered eyebrow + line + h2 + lead | Every titled section |
| Buttons | `.oga-btn-primary`, `-secondary`, `-ghost` | All CTAs, no exceptions |
| Status pills | `.oga-status-red/amber/yellow/green` with `.oga-status` chip | Confidence states, live/soon chips, fetch_mode badges |
| Status dot | `.oga-status-dot` (6px pulse) | Live data indicators |
| Sample card | `.oga-sample-card` (glassmorphism, hairline corner ticks, score + dims + sources + foot) | Wherever a real engine response is shown |
| Code panel | `.oga-code-panel` (specimen-mount with corner ticks, line numbers, token-colored syntax) | Query plans, API requests/responses |
| Defensible row | `.oga-defensible__row` (zigzag, numbered, bespoke viz on alternating side) | Methodology explanations |
| Stats strip | `.oga-coverage__stats` (4-col, hairline-bordered, mono labels) | Proof-of-real-data numbers |
| Tabbed featured panel | `.oga-built__tabs` + `.oga-built__panel` (auto-cycling 6s) | Multiple variants of one thing |
| Plotted mark watermark | `.oga-bg-mark` + position variants | Corner ornaments |
| Distribution-bus + spec-sheet columns | `.oga-integration__bus` + `.oga-integration__grid` | "One engine, multiple outputs" diagrams |
| Trace ledger | `.oga-trace` (mono timestamps + events + citations, animated fade-in) | Audit story, score provenance |

Type scale (Geist sans + Geist Mono only): display 4.5rem · h1 3rem · h2 2.25rem · h3 1.625rem · h4 1.25rem · lead 1.125rem · body 1rem · label 0.8125rem · eyebrow 0.6875rem.
Spacing (4px base): `--oga-1` through `--oga-9` (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96).

---

## 10. Demo strategy (zero-account interaction)

Three surfaces let an evaluator confirm "this is real" without signing up:

| # | Surface | Where |
|---|---|---|
| 1 | Inline `<TryItPanel>` widget — user types a postcode, sees a real `/v1/area`/`/v1/score`/`/v1/peers` response (rate-limited per IP, postcode-allowlisted to a curated safe set: M1 1AE, EC1A 1BB, SW1A 1AA, etc.) | Every product page |
| 2 | `/playground` page — full Intelligence query plane interactive: pick a preset NL question or write your own, see the executed plan + result | New top-level route, linked from nav + `/products/intelligence` |
| 3 | Embedded loops of the dashboard — 10-15s screen recordings showing Levers configurator, API key page, Monitor portfolio change feed | Inline in `/products/*` |

Demo backend = new route `apps/web/src/app/api/demo/v1/[...path]/route.ts` — Next.js proxy. Server-side hits apps/api with a system demo key (env var, never exposed). Per-IP rate limit. Postcode allowlist enforced in the proxy (returns 422 with explicit list for anything else). Same response shapes as production.

---

## 11. Sign-up flow (5-step Stripe pattern)

| Step | Asks | Backend |
|---|---|---|
| 1. Credentials | Email, password (or Google), display name, country | `POST /v1/auth/register` (exists). Auto-creates personal org per ADR 0028. |
| 2. Org profile | Org name, public display name, brand URL, what your business does (PropTech embed · InsureTech MGA · Lender · CRE · Public sector · Research · Other), team size | `PATCH /v1/orgs/:id` with `display_name` + `brand_url` (ADR 0034). ICP + size in `org_profile`. |
| 3. How you'll use it | Primary use case (Signals · Scores · Monitor · Intelligence · All), job-to-be-done, methodology pin (Pin to current / Always-latest) | Store preference. `PUT /v1/orgs/:id/methodology` (ADR 0031). |
| 4. Team *(skippable)* | Invite first teammate by email + role | `POST /v1/orgs/:id/members` (ADR 0028). |
| 5. First API key + first call | Generate key, optional IP allowlist, copy + acknowledge shown-once. Then a "Your first call" card with a real curl using their actual key. | `POST /v1/keys` (exists) + optional `PATCH` with `allowed_ip_cidrs` (ADR 0034). |

Tier selection is NOT in signup. Free/sandbox default until `/billing`. Pricing tier decision is parked.

Each step writes to backend as user progresses (not single submit). If they bail at step 3, account + org from steps 1-2 persists. Resume on next sign-in.

---

## 12. Build order — PR-by-PR

One PR per shared component or per page. Internal section commits inside a page PR are fine; per-section PRs is too granular.

| PR | What | Status | Notes |
|---|---|---|---|
| 1 | Nav + 4 dot-composed product icons + Docs dropdown | Pending | First. Touches every page. |
| 2 | Demo proxy backend (`/api/demo/v1/*`) + rate limit + postcode allowlist | Pending | Server-side only, no UI |
| 3 | `<TryItPanel>` shared component | Pending | Reused by every product page |
| 4 | `/products/signals` — sets product page template | Pending | First product page |
| 5 | `/products/scores` | Pending | Same pattern |
| 6 | `/products/monitor` | Pending | Same pattern + dashboard screen-recording loop |
| 7 | `/products/intelligence` + `/playground` | Pending | Intelligence's flagship demo |
| 8 | `/about` | Pending | Why-we-exist + dual-mode framing |
| 9 | `/business` | Pending | B2B sales surface (links to /products/*) |
| 10 | `/methodology` | Pending | Trust + auditability (deterministic + version pinning) |
| 11 | `/sign-up` 5-step flow | Pending | Largest single PR after product pages |
| 12 | `/sign-in`, `/verify`, `/reset-password` | Pending | Auth-shell siblings, one PR |
| 13 | Footer redesign | Pending | Can land late since current footer works |
| 14 | App-shell sidebar (org switcher, quota strip, 4-product nav) | Pending | Touches every authenticated page |
| 15 | `/dashboard` landing | Pending | Tightly coupled to app-shell + first-key reward state |
| 16+ | `/api-usage`, `/billing`, `/settings` (Levers + RBAC + white-label + IP allowlist), `/area/[slug]`, `/report/[id]`, `/compare`, long tail (`/docs`, `/blog`, `/changelog`, `/help`) | Pending | One PR per page or per cohesive group |

`/pricing` BLOCKED until pricing structure decided.

---

## 13. Iteration loop (per section, per PR, every time)

1. **Build** a section (Nav, hero, product card, etc.) — write the CSS + TSX, no inline styles
2. **`npm run dev`** running on apps/web
3. **Pedro looks** on localhost
4. **Yes or iterate** — if iterate, repeat; if yes, commit
5. After section commits, before merge or anything else:
   - **Update memory** (this doc + memory topic file if needed)
   - **Update this doc's change log** below
   - **Update Jira AR-204** with a comment summarizing the change
   - **Pause and ask Pedro before merging**
6. CI green → squash-merge → fetch main → start next section

Hard rules:
- No commit-to-main, ever. Branch + PR + CI + squash-merge.
- No commit without Pedro's localhost approval.
- No invented numbers; verify against ADRs + apps/api code.
- No em dashes in user-facing copy.

---

## 14. Change log (updated after every section)

| Date | Section / PR | What changed | Status |
|---|---|---|---|
| 2026-05-30 | Doc creation | Initial AR-204 redesign brief written (this doc) | Locked |
| 2026-05-30 | Locked decisions | 17 decisions ratified by Pedro across 3 proposal rounds (templates, vocabulary, demo, hygiene, signup, build order, per-PR granularity) | Locked |
| 2026-05-30 | "Every UI action wires to real backend" rule added | Reiterated by Pedro mid-session. Lock #18: no mocked states, no UI-only persistence, no "wire it later"; localStorage is theme + sidebar collapse only; not-yet-wired controls render disabled with explicit "Not wired" indicator. Captured in redesign doc §7 + memory + Jira AR-204. | Locked |
| 2026-05-30 | **PR 1 — Nav redesign** | New `product-icons.tsx` with 4 dot-composed SVG icons (Signals 3×3 matrix, Scores ascending arc, Monitor sine wave, Intelligence hub-and-spoke). New co-located `nav.css` (zero inline styles). Rewritten `nav.tsx`: Products mega-menu with 4 product rows each rendered DISABLED with "Coming soon" pill (per wiring rule — never a fake link), Docs dropdown (API reference + MCP server NEW badge + Changelog, real routes), Methodology + Pricing direct links, Sign in text link, Get started primary CTA. Mobile drawer mirrors with Products / Methodology+Pricing / Docs sections. Surface-aware theme inversion preserved. Stripped orphaned `.aiq-nav-*` @media rules from `globals.css` (zero consumers post-rewrite). Localhost-approved by Pedro. Levers question answered (lives in /settings/*, NOT in Products menu). | ✅ MERGED `9de475c` |
| 2026-05-30 | Locked decisions (PR 2 homepage prep) | 5 more decisions ratified by Pedro for the homepage redesign (PR 2). #19: "multiple sources" rule across marketing pages — specific count/names live only on `/methodology`. #20: Kill "Try a postcode" CTA framing. #21: Section 3 replaced with **"The 4 products"** card grid. #22: Section 4 drops MCP, adds **Query plane (NL + JSON)** as the new 4th integration column. #23: ICP cards in Section 2 + product cards in Section 3 link to disabled "Coming soon" pills (dedicated `/icps/<icp>` and `/products/<name>` pages don't exist yet — wiring rule). | Locked |
| 2026-05-30 | **PR 2 — Homepage redesign** — STARTED | Branch `feat/AR-204-homepage` off main `9de475c`. Multi-commit per section. **Order revised mid-session per Pedro**: section 3 first (4 products replace defensible) → hero (Pedro "not a fan; surprise me") → section 2 → section 5 → section 4 → section 6 → footer. Lock #24: every icon / illustration must be EXTREMELY custom to OGA branding (bespoke dot-and-hairline diagrams that visually tell the product's value prop, not generic glyphs). | In progress |
| 2026-05-30 | Section 3 — "The 4 products" — built + approved | New `products-section.tsx` + co-located `products-section.css` (zero inline styles). Dark graphite surface keeps homepage rhythm. 2×2 card grid w/ 1px hairlines. Each card: bespoke product icon (redesigned v2 — Signals = 5×5 scatter w/ 8 surfaced dots, Scores = 6 inputs converging via hairlines to apex, Monitor = wave + off-wave delta w/ ring + dashed tick, Intelligence = query traversal graph w/ ambient nodes), endpoint chip, 3 capabilities, "Coming soon" pill (wiring rule). Swapped into homepage replacing `<DefensibleSection />`. | ✅ Approved + committed `388a836` |
| 2026-05-30 | Nav Docs dropdown — bespoke icons | New `docs-icons.tsx` with 3 dot-and-hairline diagrams in the Plotted vocabulary: ApiReference = paired `{ }` braces of dots + 3 content dots, McpServer = client cluster + protocol bridge + enlarged endpoint w/ halo, Changelog = vertical timeline w/ entry dots + horizontal hairlines for each entry's description. Wired into `nav.tsx` Docs panel (desktop dropdown) + mobile drawer. New `.oga-nav__item--docs` + `.oga-nav__item-text-single` CSS variants. | ✅ Approved + committed `f8c5f72` |
| 2026-05-30 | Hero — iteration attempts | Tried two new directions Pedro rejected: (1) full rewrite w/ "Signals are the product" thesis + breathing brand mark + system state strip — "insanely shit, go back". (2) Original hero + per-workflow ICP icons beside each rotating word — "don't like it, remove icons". **Final state**: original rotating-workflow hero preserved, only the 7-source "Sourced from" foot strip removed (per "multiple sources" rule) + the legacy inline-style arrow margins replaced w/ the `.oga-btn` flex-gap. | ✅ Approved + committed `08d78b3` |
| 2026-05-30 | Section 2 — BuiltFor expansion | Per-workflow body copy tightened, **all specific source names stripped** (Environment Agency, Police.uk, IMD, BTL operators) per the multiple-sources rule. Added a mono **endpoint chip** per workflow (real API call: `POST /v1/score`, `GET /v1/area`, `POST /v1/query`, `POST /v1/portfolios/:id/changes`). Replaced "See the integration →" with **"Build for [icp] →" disabled CTA + "Coming soon" pill** per wiring rule — each workflow links to a future `/icps/<slug>` page (lenders · insurers · cre · portfolio-teams · public-sector). Tab strip + auto-cycle + bespoke dot visuals preserved. Components.css gains `.oga-built__panel-endpoint`, `.oga-built__panel-endpoint-verb`, `.oga-built__panel-cta`, `.oga-built__panel-cta-pill`; `.oga-built__panel-link` now supports disabled state. | ✅ Approved + committed `2b7cff3` |
| 2026-05-30 | Levers callout in section 3 — REJECTED | Tried a "Composable per-org" band below the 4-product grid; Pedro: "looks quite shit, like we just added it last minute, doesn't fit." Reverted. Levers gets a proper home on /settings + possibly /methodology in later PRs where it has natural context. | ❌ Reverted (no commit) |
| 2026-05-30 | Section 4 — Integration reskin | **Full re-skin from the legacy 4-column spec-sheet to a code-first tabbed featured panel.** Pedro: "the weakest section on the page; needs a re-skin." Now: 4 tabs (REST · Bulk · Query plane · Webhooks) each with bespoke dot-and-hairline glyph (left) + method/name stack (right). Featured panel below = real curl + JSON response in the existing `.oga-code-panel` vocabulary (corner ticks, line numbers, token-coloured syntax via inline tokenizer — strings / numbers / comments / HTTP verbs / header keys). Right column: surface name + body + docs CTA. Auto-cycles every 9s. MCP dropped. `/v1/area` (was `/v1/report`). `signal.changed` (was `report.created`). New co-located `integration-section.css`; legacy `.oga-integration*` rules in components.css left orphaned for Workstream 4 cleanup. | ✅ Approved + committed `f187a4a` |
| 2026-05-30 | Section 5 — Coverage reskin with real world geography | Replaced my hand-placed dots ("looks so shit") with **real Natural Earth 110m geography** via `world-atlas` + `topojson-client` + `d3-geo` (Equal Earth projection — area-accurate, not Mercator-bloated). All countries render as hairline outlines at 0.28 opacity; UK identified by ISO 826, filled + stroked at full opacity, surrounded by a pulsing double halo ring. Stats strip: 1.8M postcodes · 43,916 LSOAs · Monthly snapshots · v2.0.2 engine. **CTA fixed mid-iteration**: Pedro caught me breaking my own "no 7 sources on marketing" rule with "Explore the 7 sources" — changed to "Explore the methodology" + hardened the rule in §5 with "NO EXCEPTIONS." UK label/pin tick removed (overlapped neighbouring countries). Em-dash in sub copy removed (period + new sentence). New co-located `world-map.tsx` + `world-map.css`. Deps added: `world-atlas`, `topojson-client`, `d3-geo`, plus `@types/*`. | ✅ Approved + committed `60ee1c5` |
| 2026-05-30 | Section 6 — CTA rewrite | Title bookends hero positioning ("Build on the data layer underneath UK property workflows."). Sub adopts dual-mode framing ("API plus a dashboard control plane..."), drops "scoring areas this afternoon" marketing-claim energy. Primary CTA "Get an API key" (matches hero); secondary "Read the methodology" (was "Browse the docs"). Foot strip stripped of "7 public sources" + "42,640 neighbourhoods" → "1.8M postcodes · 43,916 LSOAs · monthly snapshots" (matches §5 stats). Legacy inline-style arrow margins removed (Marcos rule — .oga-btn flex-gap handles spacing). | ✅ Approved + committed `8c06866` |
| 2026-05-30 | Footer — full reorg + social row | Column reorg: Brand · Products (4 products, all "Soon" pill — wiring rule, `/products/<slug>` not built yet) · Docs (API ref, MCP server, Methodology, Changelog) · Company (About · Business · Pricing · Help · Blog · Contact). Tagline updated to v3 positioning. Brand-cell CTA "Try a postcode" → "Get an API key" (consumer-tool framing dropped). Social row: bespoke monochrome silhouettes for **X** (`https://x.com/onegoodarea`), **LinkedIn** (`https://www.linkedin.com/company/onegoodarea`), **Email** (mailto:) — multicolor Gmail clashed with Plotted's two-color system, used envelope silhouette instead. **GitHub removed.** All inline styles in footer.tsx stripped (Marcos rule) — new co-located `footer.css` carries all visuals, new `social-icons.tsx` for the 3 brand glyphs. **WorldMap bug fix folded in**: some Natural Earth features lack an `id` (Antarctica, small islands), causing `key=""` duplicate-key React warning — switched to stable array-index keys. | ✅ Approved on localhost, awaiting commit |
| 2026-05-30 | **PR 3 — `--oga-green` → `--oga-ink` rename (Workstream 4 piece 2)** | Pure find-replace across `tokens.css` + `components.css` + `backgrounds.css` + `globals.css` + `wordmark.tsx` + `mark.tsx` + `design-test/page.tsx`. The variable held warm dark graphite (#1A1C1F) since forest green was scrapped 2026-05-18; the `--oga-green` name had been kept "for minimal-blast-radius refactor, rename later." This is that later. 7 vars renamed (-95/-80/-50/-30/-10/-06 tints). No behavioural change. | ✅ MERGED `c7b66f5` (PR #79) |
| 2026-05-30 | **Methodology + docs reskin workstream — branch start** | Branch `feat/AR-204-methodology-docs-reskin` off main `c7b66f5`. Multi-agent recon completed (5 agents, 398k tokens, 35 ADRs + 13 page files + ~70 API endpoints mapped). Delta doc written at `docs/DESIGN/AR-204-methodology-docs-delta.md`. Pedro locked recommendations: (D1) methodology rewrite to 4-product model, (D2) OpenAPI both-tracks — Brand v3 wrapper reskin + honest placeholder now, regenerate-from-Fastify as follow-up ticket, (D3) /docs index now + per-surface sub-pages as follow-up PRs in this branch, (D4) public `/docs/levers` page in this workstream, (D5) kill pricing table on `/docs/mcp` and link to /pricing. Per-page PRs within the same branch. | Locked |
| 2026-05-30 | **PR A — `/methodology` full rewrite** | Total rewrite (1,326 LOC inline-style Fraunces-themed page → 14-section Brand v3 client.tsx + co-located `methodology.css` ~1,030 LOC). New IA: Signal primitive → Data sources (7) → Store + fetch modes → Normalization → Time-series moat (DARK) → Derived signals → Scoring presets → Peers/Insights/Forecast → Intelligence query plane (DARK) → Confidence → Versioning → **Per-organisation methodology (Levers — added mid-iteration after Pedro caught it as missing)** → Scope → Audit artefacts → Final CTA (DARK). 4 Levers cards (bundles + scoring presets + methodology pinning + peer cohorts), each with RBAC pill + endpoint + honest note + ADR ref. Hero with engine state side-card driven by `METHODOLOGY_VERSIONS` registry (v2.0.2, released 2026-05-14). Every claim traced to ADR (0001-0035). Real Signal JSON sample in §1; real NL→typed-plan example in §9. Stats strips on §4, §5, §9 (33,755 England LSOAs · 24mo prices × 35,606 LSOAs · 626k+ history rows · 85,280 deprivation snapshots · 92.9% planner accuracy on 14-case corpus). 10 core phrases from §4 all hit. Scope cards "Roadmap" not "Planned" (clarifies Levers cohorts ship today; only per-cohort percentile recompute is the planned step). Zero inline styles. Geist + Geist Mono. `.oga-root` wrapper. | ✅ MERGED `db0dd67` (PR #80, 2 commits) |
| 2026-05-30 | **Strategic check — exposure audit** | Pedro asked whether /methodology + /docs/api-reference put us in an inferior position by exposing too much. My take: not over-exposed. The moat is operational + temporal (un-backfillable monthly snapshots since 2024), not informational. Public-record sources are already public; the pipeline + surface is the product, not the source list. ICP (regulated buyers) demands methodology transparency per PRA SS1/23 — hiding it kills enterprise sales. The 92.9% eval baseline is moat-building (we're the only vendor publishing a falsifiable accuracy claim), not moat-exposing. Levers endpoints exposed = procurement table-stakes. Trade-offs flagged: (a) exact derived-signal formulas — lean keep for audit; (b) "~840k peer assignments" detail — lean trim to "materialized over all UK LSOAs"; (c) ADR repo public links — strongest engineering-credibility signal, lean keep but flag as the genuine trade-off. Recommendation: ship as-is, optionally trim (b) in a follow-up. Pedro: ship as-is. | Locked |
| 2026-05-30 | **PR B — `/docs/api-reference` reskin (Track B per delta doc)** | Killed the Scalar embed of the broken v2.0.0 spec (5 of ~70 endpoints documented; every path used legacy `/api/v1/` prefix vs Fastify's `/v1/`; auth still said `aiq_`). Replaced with honest Brand v3 page + co-located `api-reference.css`. 4 sections: § 1 "What the previous spec got wrong" (2-col callout: stale/wrong on the 5 docs'd vs ~65 missing); § 2 surface map (6 cards: Signals 4ep · Scores 1ep · Monitor 7ep · Intelligence 4ep · Levers ~25ep · Reports-legacy 3ep — each with representative endpoint list + "Coming soon" pill on docs/<surface> link per wiring rule); § 3 "What you can use today" (4 tiles: Methodology live · ADR repo · Live route schemas · OpenAPI snapshot download); § 4 Track A roadmap card (regenerate from Fastify schemas, separate ticket). HTTP verb colour-coding via status palette (GET green · POST/PATCH amber · PUT yellow · DELETE red). Final CTA dark. The `@scalar/api-reference-react` import dropped from this file (package stays installed). Honest hero pill "API reference · being regenerated". | ✅ Approved on localhost, committing |
| 2026-05-31 | **PR E — `/docs` index reskin (last docs page)** | Total rewrite (1,260 LOC Fraunces inline-styled single-endpoint guide → Brand v3 index w/ co-located `docs.css`). Per Pedro's locked D3 (option c) the page is the four-product TOC; per-surface sub-pages ship as later PRs and render disabled with "Coming soon" pills (wiring rule). IA: Hero (cream w/ engine state side-card driven by `METHODOLOGY_VERSIONS` v2.0.2 / released 2026-05-14) → § 01 The 4 products (DARK, 2×2 grid w/ bespoke dot-composed product icons reused from Nav: Signals/Scores/Monitor/Intelligence — each card lists 4 capabilities + primary endpoint chip + disabled "Docs Soon" pill) → § 02 Levers (cream, 4-col grid of 8 capabilities with RBAC pill per card: orgs · bundles · presets · methodology pin · cohorts · full RBAC · white-label · IP allowlist) → § 03 Reference (white, 6 tiles: API reference regenerating · MCP live · Methodology live · Changelog live · OpenAPI snapshot regenerating · Webhooks soon-disabled) → § 04 Quickstart (DARK, 3 numbered steps + canonical `.oga-code-panel` with real `oga_` curl against `GET /v1/area`) → § 05 Code examples (cream, tabbed cURL/Node/Python/Go on the same `/v1/area` read) → CTA (DARK). Pre-build workflow ran first: 6 parallel agents read ADRs 0001-0035 + AR-204 redesign + methodology-docs delta (381k tokens, 106s) and returned structured fact-packs so every claim on the page traces first-hand to an ADR or apps/api code path. No "7 sources", no `aiq_`, no em dashes, no fake links. Shared `<CodePanel />` component built in this file for both code blocks (corner ticks + `__header` + `__body` + per-line `__num` for parity with /methodology). | ✅ Approved on localhost |
| 2026-05-31 | **docs/DESIGN folder reorg** | Created `docs/DESIGN/` folder following the existing ALL-CAPS pattern. `git mv` of both AR-204 design briefs (`AR-204-app-redesign.md`, `AR-204-methodology-docs-delta.md`) preserved history. New `docs/DESIGN/README.md` + nav-hub updates (INDEX.md "Design (visual + narrative)" section, README.md audience door). Memory paths bumped (`MEMORY.md` + `project_AR-204_redesign.md`). | ✅ Shipped on `feat/AR-204-product-pages` branch |
| 2026-05-31 | **Product-pages spec pack (recon)** | Deep per-surface spec pack for the 4 product marketing pages compiled to `docs/DESIGN/AR-204-product-pages-spec-pack.md` (932 LOC). 4 parallel recon agents read ADRs 0001-0035 in full + apps/api Fastify routes + packages/contracts Zod schemas + sample tests (407k subagent tokens, ~14min). Per surface: thesis · primitive contract (10-20 fields w/ Zod source) · under the hood · every endpoint w/ full request/response/status/RBAC + sample I/O · compound grammar · 5 ICP narratives in Pedro's voice (problem → why → value → sales line) · demo strategy · methodology proof · gotchas. ICP lead map: PropTech leads Signals, Lender leads Scores, InsureTech leads Monitor, CRE leads Intelligence. Build order locked: demo proxy → TryItPanel → Signals → Scores → Monitor → Intelligence. Pedro pivoted at start: Signals page goes FIRST without demo widget (placeholder per wiring rule); demo widget infra ships as later PR. | ✅ Locked |
| 2026-05-31 | **PR F — `/products/signals` page (first product page)** | Built then **rewritten v2** after Pedro's "templated" feedback on v1. v1 was 8 identical eyebrow+h2+lead+card-grid sections — rejected. v2 IA: centred icon-forward hero (standard `SignalsIcon` at 132px, no eyebrow row crowding it, single H1 + lead + 2 CTAs); § 01 **Live specimen** (DARK) — 5 postcode chips (M1 1AE · EC1A 1BB · B1 1AA · EH1 1YZ · CF10 1EP, covering England core, City of London, Birmingham, Scotland fallback, Wales WIMD), each renders a prebaked AreaProfile visualised as a real product surface w/ corner-ticked card, geo resolution rail, signal rows w/ percentile bars + confidence dots + source attribution, meta footer (fetch_mode · engine_version · observed_period), JSON toggle, and a clear `fetch_mode + Falls back to live` legend explaining the Scotland case; § 02 **Anatomy of a Signal** (cream) — bespoke SVG diagram, central SIGNAL pill w/ 8 hairlines pulling to labelled callouts (key, category, observed_period, normalized_value, percentile, confidence, source, direction); § 03 **Seven categories** (DARK) — constellation SVG (9×5 ambient dot field + 7 surfaced category dots w/ faint connector hairlines) + annotated list; § 04 **Endpoints** (cream) — single tabbed specimen panel for 3 endpoints (no longer 3 stacked cards); § 05 **Built for** (cream) — 5 ICPs in EQUAL weight (no Lead badge per Pedro), each w/ bespoke 120px dot-and-hairline micro-illustration (PropTech = listing card w/ signal overlay; Insurer = risk-gradient dot field; Lender = portfolio scatter w/ trend; CRE = ranked stack; Public sector = LSOA grid w/ focal); CTA (DARK). Hard rules upheld: no `aiq_`, no em dashes, no "7 sources" listed (lives only on /methodology), no fake links, zero inline styles. Pedro fixes applied mid-iteration: icon centring (kept standard SignalsIcon, removed crowding eyebrow row) + clearer "Falls back to live" rendering w/ explanation legend. After approval, link wiring flipped on: Nav Products mega-menu `signals` slot → live; Footer Products column Signals row → live; Homepage § 03 Signals card → live link. Other 3 products stay disabled w/ Soon pill until their pages land. | ✅ MERGED `c3ee74d` (PR #86) |
| 2026-05-31 | **PR G — `/products/scores` page (second product page)** | Same skeleton as Signals, **Scores-specific bespoke illustrations**. IA: centred icon-forward hero (`ScoresIcon` at 132px, workflow-language lead) → § 01 **Live specimen** (DARK) — TWO-axis picker (postcode × scoring-profile chip rows), specimen card shows big 0-100 score number on left + meta column on right (area / preset / area_type / weights_source / engine_version), 5 dimension breakdown rows w/ raw score + weight bar + "contributes X" + per-dim confidence dot, JSON toggle, three-row legend explaining `preset` / `weights_source` / `engine_version` semantics; § 02 **Four scoring profiles** (cream) — 4-column grid w/ bespoke 36px glyphs per profile (Residential = house, Commercial = storefront, Investment = upward-trend dots, Research = balanced pentagon), each card shows workflow name + `preset: <slug>` API-parameter chip + use-case + its 5 dimensions; § 03 **Anatomy / Pipeline** (DARK) — horizontal SVG flow diagram (5 source dots → fetchAreaSources → computeScores [accented frozen-v2 engine box] → applyWeights [optional caller-weights dashed-box dropping in] → 62/100 response chip), 3 numbered notes below; § 04 **Endpoints** (cream) — tabbed panel, 3 tabs: POST `/v1/score` primary, POST `/v1/report` legacy (metered), POST `/v1/orgs/:id/presets` Levers CRUD; § 05 **Built for** (cream) — 5 ICPs, **Lender leads** (per spec pack), each w/ bespoke 120px viz (Lender = versioned ledger w/ focal stamp; Insurer = 5 dials [configurable weights]; PropTech = 4 audience badges 2×2; CRE = 5 stacked dim bars; Public sector = stamped methodology document); CTA (DARK). **Wording reframe mid-iteration**: Pedro caught the v1 leaning hard on consumer-tool naming ("moving / business / investing / research" as preset NAMES). Reframed to **workflow language** everywhere except where the slug is literally the API parameter. Slugs render only inside `code` chips. **Em-dash sweep**: caught 14 em dashes in user-facing strings (1 in /signals aria-label + 13 in /scores legend, endpoint descriptions, ICP narratives) — all swept to colon / period / comma / parentheses per house rule. **Prebaked specimen data is illustrative, NOT live API output**; foot note honest about this; logged as outstanding follow-up to replace w/ real prod responses once dashboard ships + Pedro can mint an `oga_` key through the proper flow. Link wiring flipped on for Scores: Nav, Footer, Homepage § 03. | ✅ MERGED `1ecd5be` (PR #87) |
| 2026-05-31 | **PR H — `/products/monitor` page (third product page)** | Same skeleton as Signals + Scores, **Monitor-specific bespoke treatment**. IA: centred icon-forward hero (`MonitorIcon` at 132px, lead introduces portfolios + signed change-detection + sample gate); § 01 **Live specimen** (DARK) — **THREE knobs** instead of postcode chips: `baseline` (previous/first), `threshold_pct` (0/5/10), `min_transactions` (0/8). Demo "lender book" portfolio summary strip w/ 4 LSOA chips + areas_checked + material_count counts. ChangeReport rows show signal_key / area / geo_code / period_from → period_to / value_from → value_to / signed pct change w/ ▲/▼ arrow (green/red). Toggle `min_transactions: 0` to surface a 47%-on-2-sales noisy row; flip back to 8, it drops silently w/ honest "X sub-threshold moves dropped" empty state. Webhook envelope preview below specimen w/ HMAC-SHA256 signature header (deterministic delivery id, no Math.random per the hydration bug). Three-row legend explains `baseline` / `threshold_pct` / `min_transactions` + static-signal honesty. JSON toggle. Honest "demo data, illustrative" foot note; § 02 **What gets watched** (cream) — 3-card grid w/ bespoke 80px viz per card: price-move line chart, crime-trend bars, derived-YoY parallel arcs. Tells the story "Monitor diffs the time-series store; static signals never trigger"; § 03 **Pipeline** (DARK) — 4-step horizontal SVG: Portfolio (4 LSOA dots) → Enrich (cap 50, concurrency 5) → **Detect moves** (accented box, threshold + sample gate) w/ `signal_timeseries` store dropping in from below → Webhook (HMAC-SHA256 signed). 4 numbered notes below; § 04 **Endpoints** (cream) — 5 tabs: POST `/v1/portfolios`, `/areas`, `/enrich`, `/changes` (primary), `/webhooks`; § 05 **Built for** (cream) — 5 ICPs, **InsureTech leads** per spec pack, each w/ bespoke 120px viz (Insurer = book grid w/ focal change pulse halo; Lender = LTV scatter w/ drift arrow; PropTech = dashboard w/ mover row arrow; CRE = watchlist w/ focal star + connector; Public sector = LSOA grid w/ 2 highlighted movers connected by dashed line); CTA (DARK). **Two fixes during iteration:** (a) hydration mismatch on the webhook delivery id `Math.random()` → replaced w/ deterministic `wd_a8s2k4m9q`. (b) Pedro caught the long-standing layout.tsx React warning "Scripts inside React components are never executed when rendering on the client" — **migrated all 3 `<script dangerouslySetInnerHTML>` blocks in `apps/web/src/app/layout.tsx` to `<Script>` from `next/script` w/ `strategy="beforeInteractive"`** (theme bootstrap + 2 JSON-LD structured-data blocks). Identical runtime behaviour, warning silenced site-wide. Link wiring flipped on for Monitor: Nav, Footer, Homepage § 03. | ✅ Approved on localhost |

(Append a row per iteration as we go.)
