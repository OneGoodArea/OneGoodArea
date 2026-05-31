# AR-204 — Methodology + docs reskin delta doc

> **Status:** decisions-pending. Recon complete (35 ADRs, 13 page files, ~70 API endpoints mapped, OpenAPI spec checked).
> Don't start writing until Pedro locks the 5 cross-cutting decisions at the bottom.

---

## TL;DR — how big the gap actually is

Today, a buyer landing on www.onegoodarea.com/methodology, /docs, or /docs/api-reference sees a product from ~April 2026:

- **One endpoint** (`POST /api/v1/report`) → AI-narrated single-postcode report. Five sub-scores.
- **Seven data sources** fetched live per request.
- **Four intents**: moving / business / investing / research.

What the system actually is, as of 2026-05-30:

- **~70 endpoints** across 11 modules on a Fastify backend at `apps/api` (not Next.js Route Handlers any more).
- **4 products** sitting on shared infrastructure: **Signals** (typed primitive over a persisted store), **Scores** (deterministic composites), **Monitor** (portfolios + change detection), **Intelligence** (typed query plane with NL planner).
- **Levers** (multi-tenancy): org CRUD, custom signal bundles, custom scoring presets, methodology pinning, peer cohorts, RBAC (owner/admin/member), white-label, per-key IP allowlist.
- **Two stores** behind /v1/area: live fetchers (deprivation, prices, crime) AND a persisted signal store (`signal_values` ~hundreds of thousands of rows, `signal_timeseries` 24 months of monthly history per LSOA).
- **Derived signals** computed in-DB: YoY, rolling YoY, 6m momentum, 24m trend slope, peer-relative z.
- **Eval-measured** planner accuracy: 92.9% on a 14-case curated corpus (ADR 0026).

This is not a reskin. **The content is materially wrong everywhere except /docs/mcp.** Below: per-page verdict.

---

## Page 1 — `/methodology`

**File:** `apps/web/src/app/design-v2/methodology/client.tsx` (long-form, ~30 sections, sidebar TOC scrollspy, all inline-styled)

**Current narrative:** "OneGoodArea scores a UK postcode. 7 public sources fetched in parallel per request, 5 dimensions per intent, AI narrates around frozen numbers."

### What's still true

- The deterministic + AI-separates-from-numbers framing.
- Confidence rubric (HIGH/MEDIUM/LOW/NONE).
- The four intents (moving / business / investing / research) — but they're now the four **scoring presets** (ADR 0008), not the only mental model.
- Methodology versioning + `X-Engine-Version` header (ADR 0031 extends this org-wide).
- IMD 2025 (England), WIMD 2019 (Wales), SIMD 2020 (Scotland) — confirmed.
- Land Registry Price Paid (England & Wales only) — confirmed; **but** the wording "Postcode district grain" is now wrong — we serve LSOA grain from the store (ADR 0012).
- Police.uk crime — but now the **store** is the truth (ADR 0015, 0016), not the live API per request.
- Scope-NOT statements (not an AVM, not credit decisioning, Tier 3 enrichment).
- MAUP + ecological fallacy disclosures.
- Fair-lending note (FCA / CONC / SS1-23).

### What's outdated or wrong

- **"Fetched in parallel at time of request"** — false for deprivation, prices, crime. Those are store-served (ADR 0004, 0012, 0016) with live fetch as fallback. Refresh jobs are CLI-invoked at deploy or cron. `meta.fetch_mode` returns `store`, `live`, or `hybrid` on every response.
- **"Police.uk last 3 months"** — false. Crime is now the bulk police.uk archive at LSOA × month grain, trailing 12 months (`crime.total_12m`), plus a monthly history series (ADR 0015, 0016).
- **"33,755 LSOAs"** for England — correct (2021), but the page misses that we now hold 24 months of monthly history for prices across 35,606 E&W LSOAs (ADR 0011, 0014).
- **Intent table presents 5 dimensions per intent** — true for `/v1/report` (the v2 engine). But Scores v3 (ADR 0008) is a separate endpoint where the dimension set per preset is fixed AND callers can pass `weights` (overrides) AND now `preset_id` (saved org preset, ADR 0030). The page doesn't mention any of this.
- **"Same postcode, same score, every time"** — still true, but now stronger: every `signal_value` and timeseries row carries `source_snapshot_id` + `engine_version` for full lineage (ADR 0002).
- **OG metadata: "7 live UK data sources"** — should be "deterministic UK area intelligence layer" or similar product-level statement; "7 sources" is implementation detail per the locked rule in `docs/DESIGN/AR-204-app-redesign.md`.

### What's missing entirely (and material)

1. **The Signal primitive.** The whole story rests on Signal as the public primitive (ADR 0001). Methodology page never mentions it. Reports, scores, peers, insights, forecasts are all surfaces composed on top.
2. **Time-series append (the moat clock).** `signal_timeseries` is immutable per `observed_period`, monthly cron, currently 24 months of prices + 12+ months of crime (ADR 0010, 0011, 0014, 0015). This is the differentiator vs Hometrack/CACI.
3. **Normalization at the store level.** `PERCENT_RANK()` per scope, percentiles 0–100 persisted to `signal_percentiles`, `normalized_value` 0–1 on every value, computed nationally within country (ADR 0005). 85,280 rows on first pass.
4. **Derived signals.**
   - `property.price_change_pct_yoy` — count-weighted calendar-year YoY (ADR 0018). 35,570 rows on prod.
   - `crime.total_12m_change_pct_yoy` (lower-is-better) + `property.transaction_count_change_pct_yoy` — rolling-12-month-sum vs prior-12 (ADR 0020).
   - `crime.monthly_count_trend_slope_24m` + `property.transaction_count_trend_slope_24m` — Postgres `regr_slope` over 24-month synthetic monthly index, min 18 observations (ADR 0021).
   - `property.median_price_change_pct_6m` + `crime.total_6m_change_pct` — 6m vs prior 6m (ADR 0022).
   - `crime.total_12m_peer_relative_z` + `property.median_price_peer_relative_z` — peer-relative z-scores using a materialized peer graph (ADR 0024).
5. **Peers (k-NN).** Euclidean distance over normalized signal vectors, dimension-mean-squared (not summed), default k=20, min 3 overlapping signals. Materialized peer graph: ~42k LSOAs × 20 = 840k assignments (ADR 0023, 0024).
6. **Insights (anomaly screening).** Rank LSOAs by `ABS(peer_relative_z)` for a derived signal; default k=50, max 500 (ADR 0024).
7. **Forecast.** Linear regression over `signal_timeseries` window (default 24m), horizon default 12 months, constant ±2·residual_stderr CI band. **NOT a learned model, not ARIMA/Prophet** — be honest about what it is (ADR 0025).
8. **The Intelligence query plane.** Typed JSON plan grammar (6 ops: `rank_areas` / `get_area` / `score_area` / `find_peers` / `find_insights` / `find_forecast`). NL → plan via Anthropic; programmatic skips the LLM entirely. 92.9% planner accuracy on a 14-case eval corpus (ADR 0017, 0019, 0023-0026).
9. **Levers (org-level controls).** Custom signal bundles, custom scoring presets, methodology pinning per org, peer cohorts, RBAC, white-label, IP allowlist (ADR 0027-0034). For regulator-facing buyers, **methodology pinning** is a headline (engine version locked at the org level, exposed via `X-Engine-Version` response header). For Levers admin pages, see separate doc page (TBD).
10. **Eval harness.** 92.9% planner accuracy on 14 cases against `claude-sonnet-4-20250514`. By-op breakdown: get_area / score_area / find_peers / find_insights / find_forecast all 100%; rank_areas 75%. The harness measures the planner seam, not the model (ADR 0026).

### Verdict — REWRITE not reskin

Proposed new IA:

```
Hero: "How OneGoodArea computes a UK area's signals, scores, and trends."
       (Eyebrow: Methodology · v2.0.2)

§ 1  What we mean by "Signal"
       — the public primitive, value | normalized_value | percentile | confidence,
         lineage stamps (source_snapshot_id + engine_version), null-with-reason

§ 2  Where the data comes from   [the "7 sources" section — only here, never on marketing]
       — IMD 2025 (England), WIMD 2019 (Wales), SIMD 2020 (Scotland), Land Registry PPD (E&W),
         Police.uk bulk archive, Postcodes.io for geocoding, Ofsted (England),
         Environment Agency (live), OpenStreetMap (live amenity counts via Overpass)
       — per source: cadence, grain, coverage, refresh job, last refresh

§ 3  How we store it
       — the signal store (geo_entities, geo_lookup, source_snapshots, signals,
         signal_values, signal_percentiles, signal_timeseries)
       — read-through, hybrid fetch_mode, live fallback
       — refresh jobs are deploy/cron, never request-path

§ 4  Normalization
       — PERCENT_RANK() per scope (today: national-within-country)
       — direction-agnostic normalized_value 0-1; percentile 0-100
       — IMD/WIMD/SIMD never compared across the border

§ 5  Time-series — the moat
       — append-only, immutable per observed_period
       — 24 months of prices × 35,606 LSOAs; 12+ months of crime
       — corrections surface as the next period's value, never overwrite history

§ 6  Derived signals
       — YoY (count-weighted calendar year), rolling-12 YoY, 6m momentum,
         24m trend slope, peer-relative z
       — each: methodology, window, minObservations, what it's null on

§ 7  Scoring (the four presets)
       — moving / business / investing / research
       — 5 dimensions per preset, deterministic, weights re-aggregated outside the frozen v2 engine
       — preset + custom weights + preset_id (saved org preset)
       — confidence per dimension + aggregate

§ 8  Peers, insights, forecasts
       — peers: k-NN, Euclidean over normalized, default k=20, min 3 overlapping dims
       — insights: rank LSOAs by |peer-relative z|
       — forecast: linear regression over signal_timeseries window; NOT a learned model

§ 9  The Intelligence query plane
       — 6 plan ops, typed JSON grammar
       — programmatic {plan} skips the LLM; NL {question} routes through the planner
       — measured: 92.9% on a 14-case curated corpus

§ 10 Confidence
       — per-signal confidence rubric (HIGH/MEDIUM/LOW/NONE) for /v1/report
       — sample-size gating on monitor change detection (default min 8 transactions)
       — eval-measured for the planner

§ 11 Reproducibility + methodology versioning
       — engine_version stamped on every response (body + X-Engine-Version header)
       — METHODOLOGY_VERSIONS registry + supported set
       — Levers: per-org methodology pinning (owner-only)
       — semver convention (MAJOR/MINOR/PATCH)

§ 12 Scope + limitations
       — NOT an AVM, NOT credit decisioning, NOT individual-property
       — LSOA/postcode grain today; address-level (UPRN) on roadmap (AR-134)
       — MAUP + ecological fallacy disclosures
       — fair-lending caveat (FCA/CONC/SS1-23)

§ 13 What we publish for audit
       — public methodology page (this), public changelog, OpenAPI spec, ADR repo, eval harness
```

This is ~13 sections vs the current ~11; rebalances heavily toward signals + store + time-series.

---

## Page 2 — `/docs` (index)

**File:** `apps/web/src/app/design-v2/docs/client.tsx` (long-form REST API guide for a single endpoint, ~10 sections)

**Current narrative:** "Quickstart for `POST /api/v1/report`. Bearer auth. JSON. Drop-in widget. Generate a client from /openapi.json."

### What's outdated or wrong

- **Endpoint is wrong.** Lists `POST https://www.onegoodarea.com/api/v1/report`. The live endpoint is `POST /v1/report` on `apps/api` (no `/api` prefix) — the spec page reflects a Next.js-era layout that no longer exists. Until the apps/api production host is wired into a public domain (e.g. `api.onegoodarea.com`), URLs probably need to be relative or marked TBD.
- **Auth prefix.** Says `aiq_` 48-char hex. Code has migrated to `oga_` (validateApiKey + 401 messages + `/v1/me` all reference `oga_`).
- **"One endpoint. One verb."** False. There are ~70.
- **Rate limit 30/min** — verify against `apps/api/src/modules/reports/routes.ts` (probably still correct for `/v1/report`, but other surfaces have different limits — `/v1/batch` is 5/min per ADR memory).
- **Widget HTML snippet** — verify against current `widget.js` location.
- **Sample response uses `areaiq_score`** as a field name and `aiq_your_api_key`. Both probably need to update (need to grep code for actual report field names).
- **OpenAPI spec section** — see Page 3.

### What's missing

The page treats /v1/report as the API. It needs to be re-positioned as the **landing page for 4 product surfaces + Levers admin**. Proposed shape:

```
Hero: "Build on UK area intelligence."

§ 1 — Pick your surface
   Signals     — typed catalog of area signals      → /docs/signals
   Scores      — deterministic composite scoring    → /docs/scores
   Monitor     — portfolios + change detection      → /docs/monitor
   Intelligence — typed query plane + NL planner    → /docs/intelligence

§ 2 — Levers (multi-tenant admin)
   orgs, bundles, presets, methodology pinning, cohorts, RBAC, white-label → /docs/levers

§ 3 — Reference
   OpenAPI 3.0 interactive reference                → /docs/api-reference
   MCP server (Claude Desktop, Cursor, …)            → /docs/mcp
   Webhooks                                          → /docs/webhooks
   Authentication + key management                   → /docs/auth
   Changelog                                         → /changelog

§ 4 — Quickstart
   "Sign up → get an oga_ key → call /v1/area" (3 steps)

§ 5 — Code examples
   cURL, Node, Python, Go (pinned to /v1/area as the simplest example)
```

This means /docs grows from one page (current) to one index + ~8 sub-pages. **Big scope expansion.** Pedro: do we do the sub-pages now, or keep /docs as a single denser index that links to the OpenAPI ref for everything else? (See decisions below.)

### Verdict — REWRITE

Inline-styles need extracting either way per Marcos's rule.

---

## Page 3 — `/docs/api-reference` (Scalar embed of OpenAPI 3.0 spec)

**File:** `apps/web/src/app/docs/api-reference/client.tsx` — Scalar widget themed with brand colours, plus a custom branded header strip.
**Source spec:** `apps/web/public/openapi.json` (info.version: "2.0.2")

### The fundamental problem

The OpenAPI spec is **structurally wrong AND massively incomplete.**

- **Documents 5 endpoints. Backend has ~70.** That's ~7% coverage.
- **Every path prefix is wrong.** Spec: `/api/v1/...`. Reality on Fastify apps/api: `/v1/...` (no `/api` prefix; that was Next.js Route Handlers, pre-decoupling).
- **Auth prefix wrong.** `BearerAuth.bearerFormat = aiq_<48-char hex>`. Reality: `oga_`.
- **Engine-version enum hardcoded** to `["2.0.0", "2.0.1", "2.0.2"]` in the `X-Engine-Version` header parameter. The supported set lives in `apps/api/src/modules/reports/methodology.ts` and may have moved on.
- **info.version "2.0.2"** is the methodology engine version, not the API spec semver. Confusing — should split.

The Scalar embed itself works fine. The spec it renders is misleading buyers about what the API does.

### Two-track fix

**Track A — Regenerate the OpenAPI spec from Fastify route schemas (the right way).**
- apps/api uses Fastify schema definitions per route already (Zod-derived). Adding `@fastify/swagger` + `@fastify/swagger-ui` would publish a live spec at `apps/api/openapi.json` derived from those schemas. Spec stays in sync with code automatically.
- Big-ish project: ~1-3 days. Needs decisions: where is the spec hosted? does apps/web fetch it from apps/api at build time? what's the URL? what about the dark-flag-gated endpoints (do we publish them with an `x-availability` extension)?
- Auth: apply `oga_` prefix consistently in `securitySchemes`.
- Engine version param: read from `getSupportedEngineVersions()` at build time (or document as freeform with a `pattern`).
- Whole-system project, not a docs reskin. Suggest a separate ticket (AR-205 or similar).

**Track B — Reskin the Scalar wrapper page only; replace the spec with a placeholder note.**
- The wrapper page (sticky header, back link, download button) gets the Plotted treatment in line with the rest of AR-204.
- Until Track A lands, replace the Scalar embed with an honest "We're rebuilding the spec — interactive reference returning soon. Endpoints + schemas are documented per-surface at /docs/signals, /docs/scores, /docs/monitor, /docs/intelligence" block.
- 1-2 days.

**Recommended sequencing:** Track B first as part of the AR-204 reskin (cosmetic + honest placeholder), Track A as a separate follow-up ticket. **Pedro: agree?**

---

## Page 4 — `/docs/mcp`

**File:** `apps/web/src/app/docs/mcp/client.tsx`

**Current narrative:** "Add the @onegoodarea/mcp-server npm package to Claude Desktop or Cursor. Four tools. Free on Growth + Enterprise, £29/mo add-on otherwise."

### What's still true

- MCP server distributed as npm package, spawned over stdio.
- Compatible clients (Claude Desktop, Cursor, Windsurf).
- Config paths (macOS / Windows / Cursor).
- 4 tools: `score_postcode`, `compare_postcodes`, `methodology_for`, `engine_version`.

### What needs updating

- **API key prefix.** `aiq_` → `oga_` everywhere (sample env vars, config blocks).
- **Pricing table.** Numbers were hardcoded in the page (Sandbox £0, Starter £49, Build £149, Scale £499, Growth £1,499, Enterprise from £4,999, MCP add-on £29). Per `feedback_no_invented_claims.md` rule: verify against `apps/web/src/lib/stripe.ts` (or wherever it lives now post-decoupling) BEFORE shipping. Alternatively: kill the pricing table here and link to `/pricing` — Pedro has pricing parked anyway.
- **Tools list.** Verify against current MCP server code: do the four tools match? Has anything been added (e.g. peers/insights/forecast as MCP tools)? Probably out of scope for this reskin — note as a follow-up if so.
- **Env var name `OOGA_API_KEY`.** Verify against MCP server code — `OOGA_` or `OGA_`?

### Verdict — REVISE + RESKIN

Smallest of the 5 pages. ~30% content change + ~100% style extraction (kill inline `style={{}}`).

---

## Page 5 — `/changelog`

**File:** `apps/web/src/app/design-v2/changelog/client.tsx`

**Current narrative:** "36 updates across 4 months. Jan-April 2026. April features: confidence per dim, methodology versioning, OpenAPI 3.0 spec, time-series re-scoring infra."

### What needs adding

**Whole of May 2026 is missing.** Per memory + ADR repo, the following landed in May:

- **Signal-first restructure** (monorepo split: apps/web + apps/api + packages/contracts; backend moved to Fastify; ~691 tests; squash-merged 2026-05-27).
- **Intelligence Increment 2** (2026-05-?): multi-signal compound `rank_areas` grammar (`signals[]` + `sort_by`, AND semantics, 11 filter ops including percentile_*). ADR 0019.
- **Intelligence Increment 3 + 3a + 3b**: rolling-12 YoY signals, 24m trend-slope signals, 6m momentum signals. ADRs 0020, 0021, 0022.
- **Intelligence Increment 6** (k-NN peers, `/v1/peers`). ADR 0023.
- **Intelligence Increment 7** (peer-relative z + `/v1/insights`, materialized peer graph ~840k assignments). ADR 0024.
- **Intelligence Increment 8** (`/v1/forecast`, linear projection). ADR 0025.
- **Intelligence Increment 9** (AI eval harness, 92.9% baseline). ADR 0026.
- **Levers epic — 8 increments**:
  - AR-193 Levers Foundation (orgs, org_members, org-aware auth). ADR 0027.
  - AR-194 Org CRUD endpoints + signup auto-org. ADR 0028.
  - AR-195 Custom signal bundles. ADR 0029.
  - AR-196 Custom scoring presets. ADR 0030.
  - AR-197 Per-org methodology pinning. ADR 0031.
  - AR-198 Per-org peer cohorts. ADR 0032.
  - AR-199 Full RBAC (owner / admin / member). ADR 0033.
  - AR-200 White-label + per-key IP allowlist. ADR 0034.
- **Plan 008 / AR-201**: production container parity (Podman/Docker, multi-image, env split). ADR 0035.
- **Brand v3 (Plotted) reskin** (AR-150 epic, AR-204 application): homepage, nav, products mega-menu.

That's ~17 May entries.

### Also wrong in earlier months

- April "Repositioned as infrastructure" entry references "lenders, insurers, PropTech platforms" — superseded by v3 positioning. Should be updated to "underneath UK property workflows" framing.
- April "Time-series re-scoring infrastructure" entry — this was AR-132 and its mention of `report_history` is correct, BUT the bigger time-series story now is `signal_timeseries` per ADR 0010. May entry needs to clarify this is a separate, granular moat.

### Verdict — APPEND May + RESKIN

Same Plotted layout. Inline styles need extracting.

---

## Cross-cutting issues — apply to every page

### 1. Inline styles violate Marcos's rule

Every page in this batch (methodology, docs, docs/api-reference, docs/mcp, changelog) is 100% `style={{...}}` inline objects. Per `CLAUDE.md` Engineering Philosophy + memory's `feedback_design_taste.md` + the locked AR-204 rule: **NO inline `style={{}}` in TSX. CSS files only.**

Each page reskin needs a colocated `.css` file (e.g. `methodology.css`, `docs.css`, `docs-api-reference.css`, `docs-mcp.css`, `changelog.css`). This is significant work but it's already the rule for AR-204.

### 2. The `oga_` / `aiq_` prefix

Code uses `oga_` (validateApiKey, 401 messages, /v1/me). Marketing copy still says `aiq_` in docs + mcp pages. Marketing must match code.

(Aside: the `aiq-*` CSS class prefix + `aiq-theme` localStorage key stay per memory 2026-05-08 — only the API-key prefix needs to change in copy.)

### 3. "7 sources" rule

Per locked rule in `docs/DESIGN/AR-204-app-redesign.md`: NO "7 sources" anywhere except `/methodology` itself + API responses (`source_snapshots`). Currently `/methodology` mentions it in `<meta description>` for SEO too — needs to move to a product-level statement.

### 4. Brand v3 design vocabulary

All five pages already use the Plotted CSS-var system (`--bg`, `--signal`, `--ink`, etc.) and Fraunces serif for headlines. Visual reskin work is small relative to content rewrite work.

### 5. The Scalar `/docs/api-reference` is on a different design idiom

It's the Scalar widget themed with brand colours. The branded header strip on top is Brand v3. Recommendation: keep that pattern — only the wrapper (header strip + intro) gets touched in this reskin; the Scalar body stays as-is.

---

## Decisions Pedro needs to make BEFORE I start writing

These are blocking — different answers produce very different work:

### D1 — `/methodology` IA: rewrite or refresh?

- **(a) Rewrite to the 4-product mental model** (13 sections as proposed above) — honest about Signal as the primitive, time-series as the moat, peers/insights/forecast as derived surfaces, eval-measured planner. Big lift (~2-3 days of copy).
- **(b) Refresh in place** — keep the single-report narrative skeleton, update outdated numbers, add an "Intelligence + time-series + Levers" appendix section. Smaller lift (~1 day), but the page still reads like a single-report product.
- **Recommendation: (a).** Memory + positioning v3 say the system IS now 4 products + a typed AI plane. Buyers reading the current page get a story that's a model-year behind reality.

### D2 — OpenAPI spec: regenerate now, or placeholder + ship later?

- **(a) Track A — regenerate from Fastify schemas now.** Right way; takes ~1-3 days; needs hosting + URL decisions; separate ticket.
- **(b) Track B — placeholder + reskin wrapper only.** Honest "rebuilding the reference, see per-surface docs" message; ~1 day; defers Track A.
- **(c) Both** — Track B now, Track A as a follow-up ticket (AR-205?).
- **Recommendation: (c).** Track A is a real engineering project; Track B is the AR-204 reskin scope.

### D3 — `/docs`: index-only, or index + per-surface sub-pages?

- **(a) Index only** — `/docs` becomes a TOC linking to /docs/api-reference (the Scalar embed) + /docs/mcp + /changelog + future sub-pages. Per-surface docs deferred.
- **(b) Index + per-surface sub-pages** — `/docs/signals`, `/docs/scores`, `/docs/monitor`, `/docs/intelligence` — each a long-form guide with examples. ~3-5 new pages.
- **(c) Index now, sub-pages as separate follow-up PRs** within this same workstream.
- **Recommendation: (c).** Index gives the new mental model immediately; sub-pages can flow PR-by-PR like the homepage sections.

### D4 — Levers visibility: public docs page or sales-only?

The Levers epic (orgs, bundles, presets, methodology pinning, cohorts, RBAC, white-label, IP allowlist) is fully shipped on main. Two questions:
- (a) Is there a public `/docs/levers` page? Or is Levers exposed only to org admins via dashboard + sales conversations?
- (b) Methodology pinning specifically is a regulator-facing audit feature — buyers will want to read about it. Where does that live: on `/methodology` (under the versioning section) or on `/docs/levers`?
- **Recommendation:** methodology pinning gets a section on `/methodology` (§11 Reproducibility). The rest of Levers gets a single `/docs/levers` page in this workstream. RBAC + IP allowlist + white-label go on the same page.

### D5 — `/docs/mcp` pricing table: verify or remove?

- (a) Keep the pricing table; verify £49/£149/£499/£1,499/£4,999/£29 against current Stripe + replace any drift.
- (b) Kill the pricing table; replace with "see /pricing".
- **Recommendation: (b).** Pedro has pricing parked per memory; current numbers may not be the final structure; less risk of inventing.

---

## Proposed PR order within this branch

Assuming Pedro picks the recommendations above:

1. **PR A — `/methodology` rewrite + reskin.** Biggest of the five. ~2-3 days.
2. **PR B — `/docs` (index) rewrite + reskin** to 4-product TOC. ~1 day.
3. **PR C — `/docs/api-reference` reskin wrapper + honest placeholder body.** ~0.5 day.
4. **PR D — `/docs/mcp` content refresh + reskin.** ~0.5 day.
5. **PR E — `/changelog` append May 2026 entries + reskin.** ~1 day.
6. **(Optional PR F — `/docs/levers` new page).** ~1 day.

Each PR: iteration loop (build → npm run dev → Pedro approves on localhost → commit), CI green, squash-merge to main. Same as the homepage workstream.

---

## Sources

- Recon workflow `wf_70c8be3d-7e2` — 5 agents, 398k tokens, full output at `tasks/w1x5uriit.output`.
- ADRs 0001-0035 (`docs/adr/`).
- Page content at `apps/web/src/app/design-v2/{methodology,docs,changelog}/client.tsx` + `apps/web/src/app/docs/{api-reference,mcp}/client.tsx`.
- Live API surface from `apps/api/src/modules/**/routes.ts` + `apps/api/src/app.ts`.
- OpenAPI spec at `apps/web/public/openapi.json` (info.version "2.0.2").
- Memory: `project_signal_first_pivot.md`, `project_levers_progress.md`, `project_AR-204_redesign.md`, `feedback_no_invented_claims.md`.
