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

## 14. Change log

One line per shipped change. Full detail (rationale, iteration notes,
per-section IA) lives in the linked PRs and git history — this table is the
index, not the story.

| Date | PR / Section | Summary | Status / commit |
|---|---|---|---|
| 2026-05-30 | Doc + decisions | AR-204 brief written; 18 decisions locked incl. "every UI action wires to a real backend" | Locked |
| 2026-05-30 | PR 1 — Nav | Products mega-menu (disabled+"Coming soon" per wiring rule), Docs dropdown, bespoke product icons | ✅ `9de475c` |
| 2026-05-30 | PR 2 — Homepage | 4-product grid, hero, BuiltFor, coverage map (Natural Earth geo), CTA, footer + social row | ✅ `388a836`…`8c06866` |
| 2026-05-30 | PR 3 — Token rename | `--oga-green` → `--oga-ink` find-replace, no behaviour change | ✅ `c7b66f5` (#79) |
| 2026-05-30 | PR A — `/methodology` | Full Brand v3 rewrite, 14-section IA, every claim ADR-traced | ✅ `db0dd67` (#80) |
| 2026-05-30 | PR B — `/docs/api-reference` | Killed stale Scalar embed; honest surface-map page | ✅ (localhost-approved) |
| 2026-05-31 | PR E — `/docs` index | 4-product TOC rewrite; per-surface subpages deferred (wiring rule) | ✅ (localhost-approved) |
| 2026-05-31 | DESIGN folder reorg | Moved AR-204 briefs into `docs/DESIGN/` + README | ✅ |
| 2026-05-31 | Spec pack (recon) | Per-surface product-page spec compiled (see `AR-204-product-pages-spec-pack.md`) | ✅ Locked |
| 2026-05-31 | PR F — `/products/signals` | First product page (v2 after "templated" feedback); links wired live | ✅ `c3ee74d` (#86) |
| 2026-05-31 | PR G — `/products/scores` | Second product page; workflow-language reframe | ✅ `1ecd5be` (#87) |
| 2026-05-31 | PR H — `/products/monitor` | Third product page; sample-gate + signed-webhook specimen | ✅ `86573e2` (#88) |
| 2026-05-31 | PR I — `/products/intelligence` | Flagship product page; all 4 products now live | ✅ `229370c` (#90) |
| 2026-05-31 | PR J — `/business` | Buyer-centric B2B revamp, 5 per-ICP sections | ✅ `653a65f` (#91) |
| 2026-05-31 | PR K — `/for/proptech` | First ICP page (sets template); homepage §2 re-cut to 5 ICPs | ✅ `502d04e` (#92) |
| 2026-05-31 | PR L — `/for/lenders` | Second ICP page (model-risk/compliance heavy) | ✅ `bf8aae0` (#93) |
| 2026-05-31 | PR M — `/for/insurance` | Third ICP page (actuarial audit + drift) | ✅ `7e3611a` (#94) |
| 2026-05-31 | PR N — `/for/cre` | Fourth ICP page (site selection / compound rank) | ✅ `7049965` (#95) |
| 2026-05-31 | PR O — `/for/public-sector` | Fifth + final ICP page; all "Soon" pills gone | ✅ `883806b` (#96) |
| 2026-06-01 | PR P — Hero rotator | Rotator repurposed into 5 navigable `/for/<slug>` links | ✅ `28d94f0` (#98) |
| 2026-06-01 | PR Q — `/about` | Full rewrite; 5-section IA, no founder/roadmap | ✅ (localhost-approved) |

Rejected/reverted experiments (Levers callout in homepage §3; two hero
directions) are omitted here — see PR history if needed.
