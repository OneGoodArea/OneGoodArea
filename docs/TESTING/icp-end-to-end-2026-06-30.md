# ICP end-to-end test — 2026-06-30

**Why:** walk OneGoodArea as each of the 4 ICPs (lender / insurer / investor / retailer) across the full product surface — public API, MCP via Claude Code, marketing site, onboarding — to surface bugs and rough edges before customer launch. Closes the test set started 2026-06-12 with everything shipped since (AR-324 reports kill, AR-362 MCP epic, AR-374 announcement bar, AR-375/376/377 training corpora, AR-378 cache pin, AR-379 widget kill, AR-380/385 — the customer-ready data policy surface, AR-383 planner hotfix, AR-384 auto-migrations).

---

## STATUS as of 2026-07-01 (post-audit fix sweep)

Six PRs shipped against this audit doc in a single morning session. The audit went from 13 open findings (3 🚨, 4 🔴, 6 ⚠️) to **2 genuine remaining issues** (+ a few cosmetic/research-grade items deferred).

| Finding | Status | PR | Notes |
|---|---|---|---|
| #1 NL `/v1/query` 500 on `score_area` | ✅ FIXED upstream | AR-383 hotfix (yesterday) | Anthropic model retirement; planner now uses env-configurable model. |
| #2 invalid postcode 14.9s latency | ✅ FIXED | AR-390 | `timedFetch()` AbortController + LSOA validation. Re-tested: `BAD` returns 404 in 0.27s. |
| #3 `find_areas` duplicate rows | ✅ FIXED | AR-391 cosmetics batch | JS-side dedupe by `geo_code` in `queryAreas` + `queryAreasCompound` honoring SQL `ORDER BY`. |
| #4 error message shape clarity (peers / forecast / insights) | ✅ FIXED | AR-391 | `signal` → `signal_key` friendly catch + nested-`target` hint + worked-example transform in suffix error. |
| #5 case-sensitive country names | ✅ FIXED | AR-391 cosmetics batch | `parseAreasQuery` + `parseInsightsInput` + `peers` all normalize Title-case. |
| #6 4s score latencies | 🔴 OPEN | — | Needs profiling pass. Not a correctness bug. |
| #7 plan/029 + plan/031 surfaces live | ✅ CONFIRMED | — | Re-checked — `/v1/me.training_optout`, `/legal/data-policy`, footer link all still live. |
| #8 AR-134 Jira state vs `/methodology` drift | 🟡 OPEN | — | One-line Jira fix; haven't done it yet. Will batch with `/methodology` edit. |
| #9 `/docs` "Honest placeholder" copy | ✅ FIXED | AR-391 | Copy rewritten + status `regen` → `live`. |
| #10 `watch_portfolio` false-failure | ✅ FIXED | AR-386 | Return shape aligned (`{added, portfolio}`), MCP client + formatter updated, `@oga-mcp/server@1.0.3` published to npm. |
| #11 Safety & Crime dim ↔ signal layer mismatch | 🔴 OPEN | — | **The last big open finding.** Period attribution (3mo vs 12mo) + confidence (40% vs 60%) disagree on the same M1 1AE data point. Engine-internal investigation required. |
| #12 `methodology_for` "Used in intents" drift | ✅ FIXED | AR-391 | Derived from non-zero weights at render time. |
| #13 `get_signals_by_category(schools)` granularity gap | 🟡 OPEN | — | Either expose per-school breakdown or document `_ks2` / `_ks4` suffixes in tool description. Deferred. |
| 2026-06-12 carry-over: arbitrary `user_id` in `/v1/orgs/:id/members` | ✅ FIXED | AR-388 | FK to `users(id)` + 404 on unknown user. |
| 2026-06-12 carry-over: date format drift on org endpoints | ✅ FIXED | AR-389 | `toIso()` defensive helper for Date / number / string. |
| `/v1/area?postcode=BAD` returns Scotland (place-name fallback) | ✅ FIXED | AR-387 + AR-390 | postcodes.io `/places` schema drift fixed + LSOA validation rejects results with no real UK LSOA. |
| Members dashboard "Invite member" CTA missing | ✅ FIXED | AR-388 | `/v1/orgs/:id/members` now returns `{members, org_id, caller_role}` so the UI gate works. |

**Remaining substantive work:** #11 (Safety & Crime mismatch). #6 (latency) and #13 (schools granularity) are quality-of-life, not correctness.

---

**Setup:**
- API base: `https://onegoodarea.onrender.com` (Render prod)
- Web: `https://www.onegoodarea.com` (Vercel prod)
- Auth: dedicated test key `oga_4e9e...` (revoked after E2E completes; calls visible in `/admin` as `e2e-test-2026-06-30`)
- Test plane: live prod database (Neon)
- Date: 2026-06-30
- Caller: ptengelmann@gmail.com (business legacy plan, owner of `org_user_1772941953664_qber`)

**Legend:**
- ✅ works as expected, matches contract
- ⚠️ works but drifted from contract / slow / shape off / confusing
- 🔴 broken / wrong / 500
- 🚨 latency or correctness disaster
- 🚧 dependency-blocked
- ⏭️ deliberately skipped (destructive or out of scope)

---

## 🚨 TOP-LEVEL FINDINGS (read first)

1. **🔴 `/v1/query` 500s on every NL question that translates to `score_area`.** Tested: `"score Manchester for moving"`, `"score Birmingham"`. Both 500. The same place names work via direct `/v1/score`, and NL questions that compile to `rank_areas` (`"safest areas in Manchester for families"`) succeed. **The breakage is specifically in NL→`score_area` execution.** This bug is on top of the AR-383 hotfix from last night — that fix was the model retirement; this is a different path.

2. **🚨 LATENCY: invalid postcodes still burn 15 seconds + return Scotland.** `GET /v1/area?postcode=BAD` returned `{country: "Scotland", lsoa: null}` after **14.9s**. Identical to finding #3 in `api-end-to-end-2026-06-12.md` — this regression survived 18 days of shipping. Place-name geocoding fallback isn't gated by sanity checks.

3. **⚠️ `/v1/query` returns duplicate rows.** First two NL-query results both `geo_code: E01033664`. Claude Code surfaced the same duplication this morning when scoring family areas. The executor isn't deduping across windowed signal joins.

4. **⚠️ Confusing API contracts — error messages don't show shape.** Three endpoints (`/v1/peers`, `/v1/forecast`, `/v1/insights`) reject obvious-looking payloads with errors that don't reveal the correct shape:
   - `/v1/peers` + `{postcode: ...}` → "Missing 'target'" — but `target` is a nested object: `{target: {postcode: ...}}`. Error should say so.
   - `/v1/insights` rejects `signal` — wants `signal_key` (with `_peer_relative_z` suffix). Error mentions the suffix but not the field rename.
   - `/v1/query` with `{plan: {...}}` and a slightly-wrong plan shape returns `"(root): Invalid input"` — root-level not useful for debugging.

5. **⚠️ Case-sensitive country names.** `country: "ENGLAND"` 400s with "country must be one of: England, Wales, Scotland." Developer-hostile, easy to fix (uppercase normalize on parse).

6. **⚠️ Score latencies sit at 2.6-6.5s.** `/v1/score?area=M1+1AE` averaged ~4s across 4 presets. `/v1/score?area=Newcastle` (place name, not postcode) took 6.5s. These are slow for B2B API expectations even though the engine is doing real work — worth a perf pass once correctness is right.

7. **✅ Plan/029 + plan/031 surfaces all genuinely live in prod.** `/v1/me` returns `training_optout: false` (AR-385 confirmed); `/legal/data-policy` renders cleanly from the repo MD; footer "Data Policy" link present; announcement bar (AR-374) still on home; brief composer (AR-363) returns full server-composed brief with 4 recommendations + 6 sources + per-dim reasoning.

8. **🟡 Jira ↔ marketing drift.** `/methodology` page commits to "Address-level scoring via OS AddressBase Premium + UPRN is on the roadmap (AR-134)" — but **AR-134 is marked Done in Jira** while the feature isn't shipped (its own description still reads "Status: Not started. Blocked on Pedro's procurement decision"). One of the two states is wrong.

9. **⚠️ `/docs` API Reference tile reads "Honest placeholder today; the OpenAPI spec is being regenerated from the Fastify route schemas."** OpenAPI spec actually exists (shipped AR-297). Either finish the regeneration or kill the disclaimer.

10. **🔴 `watch_portfolio` MCP tool reports false-failure on success.** Contract mismatch: `apps/api POST /v1/portfolios/:id/areas` returns `{added: <count>}`, MCP api-client expects `OogaPortfolioDetail`, formatter dereferences `.areas.length` on `undefined`. Throws → tool reports failure → user retries → duplicate populated portfolio. Both writes were genuine; the failure is purely cosmetic. **High-priority hotfix** — any customer using `watch_portfolio` today gets confused + creates orphans. Two orphans cleaned up this session.

11. **🔴 Dimension ↔ signal layer mismatch on Safety & Crime.** For M1 1AE, the score dimension says "4 crimes over 3 months, confidence 40%, trend rising"; the underlying signal says "Recorded crimes (12 months): 4, confidence 60%". The same raw number (4) is attributed to different periods (3mo vs 12mo) AND different confidences (40% vs 60%) depending on which layer you read. Critical for any audit-trail or lender-brief use case — these are mutually-exclusive readings of the same data point.

12. **⚠️ `methodology_for` tool: header says "Used in intents: moving, research" but weights table lists all 4 presets** (moving 25%, business 15%, investing 15%, research 20%). Either header or weights table is wrong; both can't be true.

13. **⚠️ `get_signals_by_category(schools)` returns just `{count, good_or_outstanding_%}` — but `score_postcode` reasoning surfaces the per-school breakdown ("2 Outstanding, 8 Good, 1 RI")**. The engine has finer-grained school data internally; the signals catalog hides it. Worth either exposing it or documenting the granularity gap.

---

## 0. Smoke / pre-flight

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `/health` | GET | 200 | 0.10s | ✅ `{"status":"ok"}` |
| `/v1/meta` | GET | 200 | 0.09s | ✅ `{service: "onegoodarea-api", phase: "1-reports-vertical", intents: [moving, business, investing, research]}` — `intents` array unchanged from 2026-06-12, but the legacy `phase: "1-reports-vertical"` is now stale (post-AR-324 kill of reports). Cosmetic. |
| `/v1/me` (unauth) | GET | 401 | 0.07s | ✅ Clean message: `"Missing API key. Use: Authorization: Bearer oga_..."` |
| `/v1/me` (bad token) | GET | 401 | 0.14s | ✅ `"Invalid or revoked API key"` |
| `/v1/me` (auth) | GET | 200 | 0.36s | ✅ business legacy plan; mcp_access=true; api_calls_per_month=50000; engine_version=2.0.2; **`key.training_optout: false`** — AR-385 confirmed in prod |

---

## 1. Account + meta

Session-auth endpoints (`/me/reports`, `/me/activity`, `/usage`, `/watchlist`, `/keys`) intentionally not retested via API-key auth — they 401 by design for API callers (`session_auth_required` semantic). Same finding as 2026-06-12.

---

## 2. Signals + area (read endpoints)

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `/v1/area?postcode=SW1A 1AA` | GET | 200 | 1.74s | ✅ Full signals envelope returned. `geo: {lsoa: E01004736, country: England, area_type: suburban}`. |
| `/v1/area?postcode=M1 1AE` | GET | 200 | 0.98s | ✅ Same shape, Manchester. |
| `/v1/area?postcode=BAD` | GET | 200 | **14.9s** | 🚨 Returns `country: "Scotland"`, `postcode: null`, `lsoa: null`. Geocoder falls back to place-name search → coords near Skye → labels as Scotland → returns a "valid" envelope. Identical bug to 2026-06-12 finding #3. |
| `/v1/signals/crime?postcode=M1 1AE` | GET | 200 | 1.00s | ✅ |
| `/v1/signals/schools` | GET | 200 | 0.88s | ✅ |
| `/v1/signals/amenities` | GET | 200 | 0.87s | ✅ |
| `/v1/signals/transport` | GET | 200 | 0.90s | ✅ |
| `/v1/signals/property` | GET | 200 | 0.80s | ✅ |
| `/v1/signals/deprivation` | GET | 200 | 1.13s | ✅ |
| `/v1/signals/environment` | GET | 200 | 1.07s | ✅ |
| `/v1/areas?signal=...&country=England&max_percentile=10` | GET | 200 | 0.93s | ✅ Returns ranked LSOAs (signal-first surface). |

---

## 3. Scoring (Scores product)

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `/v1/score` `{area: "M1 1AE", preset: "moving"}` | POST | 200 | 1.24s (first) / 4.45s (later) | ✅ Score 69, 5 dims, X-Engine-Version: 2.0.2 |
| `/v1/score?explain=true` | POST | 200 | 0.95s | ✅ Full brief: `summary` + `recommendations[4]` + `data_sources[6]` + all 5 dims with reasoning + confidence. AR-363 confirmed live. |
| `/v1/score` preset=`moving` | POST | 200 | 4.45s | ✅ |
| `/v1/score` preset=`business` | POST | 200 | 4.63s | ✅ |
| `/v1/score` preset=`investing` | POST | 200 | 2.65s | ✅ |
| `/v1/score` preset=`research` | POST | 200 | 4.51s | ✅ |
| `/v1/score` `{area: "Newcastle"}` (place name) | POST | 200 | 6.54s | ⚠️ Returns a valid Newcastle score — but the place-name geocoder takes 6.5s. Should be sub-second after the first call (likely caches city centroids). |

**Finding 6 above:** average score latency is 4s. Worth a perf pass post-correctness.

---

## 4. Intelligence (Query / Peers / Insights / Forecast)

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `/v1/query` `{plan: ...}` with outdated shape | POST | 400 | 0.24s | ⚠️ `"(root): Invalid input"` — error doesn't point at the offending field |
| `/v1/query` NL `"safest areas in Manchester for families"` | POST | 200 | 2.62s | ✅ Emits `rank_areas` plan; returns results — **but duplicate `geo_code` rows** (E01033664 appears twice). |
| `/v1/query` NL `"score Manchester for moving"` | POST | **500** | 2.84s | 🔴 Internal Server Error. The planner emits a `score_area` plan that the executor can't run. |
| `/v1/query` NL `"score Birmingham"` | POST | **500** | 1.62s | 🔴 Same as above. Reproducible across multiple `score_area`-bound questions. |
| `/v1/peers` `{postcode: ...}` (flat) | POST | 400 | 0.26s | ⚠️ Confusing: "Missing 'target'" — doesn't tell you `target` is a nested object |
| `/v1/peers` `{target: {postcode: "SW1A 1AA"}, k: 5}` | POST | 200 | 0.80s | ✅ Target resolves to E01004736; 12 signal dims used; 5 peers returned with distance + n_dims_used |
| `/v1/insights` `{signal: ..., country: "ENGLAND"}` | POST | 400 | 0.13s | ⚠️ Field is `signal_key` (not `signal`), and country is case-sensitive ("England") |
| `/v1/insights` `{signal_key: "crime.total_12m_peer_relative_z", country: "England"}` | POST | 200 | 0.30s | ✅ Returns top-k insights by z-score |
| `/v1/forecast` `{target: {postcode: "M1 1AE"}, signal_key: ...}` | POST | 200 | 0.20s | ✅ Returns 6 projected points with lower/upper bounds |

---

## 5. Monitor (Portfolios + changes)

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `POST /v1/portfolios {name: ...}` | POST | 201 | 0.24s | ✅ Returns `{id, name, area_count: 0}` — **field is `id`, not `portfolio_id`**. MCP api-client uses `portfolio_id`; contract mismatch worth aligning. |
| `POST /v1/portfolios/:id/areas {areas: [{postcode: ...}]}` | POST | 400 | 0.20s | ⚠️ Rejects `postcode` — wants `{area: ...}` per area object. Inconsistent with `/v1/peers` and `/v1/forecast` which accept `{postcode}` inside `target`. |
| `POST /v1/portfolios/:id/areas {areas: [{area: ...}]}` | POST | 200 | 0.22s | ✅ `{added: 2}` |
| `POST /v1/portfolios/:id/changes {probe: true}` | POST | 200 | 2.62s | ✅ Returns scope + per-area material changes. 1 material crime change detected for M1 1AE. |
| `GET /v1/portfolios/:id/changes` | GET | 404 | 0.07s | ⚠️ Method is POST, not GET. Existing 2026-06-12 doc didn't catch this; was confused while testing. Worth at least exposing `GET` for read-only probe semantics OR rejecting with a typed `method_not_allowed`. |
| `DELETE /v1/portfolios/:id` | DELETE | 200 | 0.18s | ✅ `{deleted: true}` |
| `GET /v1/portfolios` | GET | 200 | 0.15s | ✅ |

---

## 6. Webhooks

| Endpoint | Method | Status | Latency | Result |
|---|---|---|---|---|
| `GET /v1/webhooks` | GET | 200 | 0.15s | ✅ `{subscriptions: []}` — empty, as expected |

Subscription creation + delivery flow not exercised (would need a real test URL to receive signed payloads). Marked ⏭️ for this E2E.

---

## 7. Marketing + public surface

All 12 public pages return 200 in <0.5s. Content checks:

| Page | HTTP | Bytes | Result |
|---|---|---|---|
| `/` | 200 | (HTML) | ✅ Announcement bar (`oga-announce` link to `/docs/mcp`) present — AR-374 still live |
| `/pricing` | 200 | 237 KB | ✅ Loads |
| `/docs` | 200 | 73 KB | ✅ |
| `/docs/mcp` | 200 | 69 KB | ✅ Mentions `/legal/data-policy` |
| `/docs/api-reference` | 200 | 72 KB | ✅ |
| `/methodology` | 200 | 63 KB | ✅ |
| `/changelog` | 200 | 101 KB | ✅ |
| `/sign-up` | 200 | 70 KB | ✅ |
| `/sign-in` | 200 | 23 KB | ✅ |
| `/legal/data-policy` | 200 | 23 KB | ✅ AR-385 confirmed live — page contains "Data Policy", "training_optout", "365 days", "opt out", "api-usage" |
| `/terms` | 200 | 62 KB | ✅ Loads (lawyer-grade clause for training-data use NOT yet present — known follow-up) |
| `/privacy` | 200 | 63 KB | ✅ Loads (same — training clause pending) |

**Footer link** to `/legal/data-policy` present on home — AR-385 confirmed.

### 7.1 Promise / placeholder language sweep

Grep across all 12 public pages for `(coming soon | on the roadmap | placeholder | tbd | under construction | will be | upcoming)`. Filtering out legitimate uses (HTML input `placeholder=`, legal copy "your data will be processed", marketing positioning like "richer than a competitor's roadmap"):

| Page | Phrase | Context | Finding |
|---|---|---|---|
| `/docs` | "Honest placeholder today; the OpenAPI spec is being regenerated from the Fastify route schemas." | API Reference tile on docs index | ⚠️ Reads as "the API docs aren't ready" to a prospect. The OpenAPI spec actually exists (we shipped it AR-297) — either finish the regeneration, or remove the disclaimer. |
| `/methodology` | "Regional and per-cohort recompute on the roadmap" | Normalization scope section | ⚠️ Honest commitment that needs follow-through. |
| `/methodology` | "Per-cohort percentile recompute (scope=peer_group) is on the roadmap" | Levers section | ⚠️ Same as above. |
| `/methodology` | "Address-level scoring via OS AddressBase Premium + UPRN is on the roadmap (AR-134)" | Scope section | 🟡 **AR-134 is marked DONE in Jira but the feature isn't shipped.** The Jira body says "Status: Not started. Blocked on Pedro's procurement decision." Either roll back the Jira state or close the methodology page commitment. |
| `/methodology` | "Roadmap" status pills on two normalization scope cards | Region scope + Peer-group scope | ✅ These are EXPECTED status badges; documenting them as future work is correct UX. Honest disclosure, not a placeholder. |
| `/pricing` | "Roadmap items don't appear here" | Pricing table lead | ✅ This is the OPPOSITE problem — explicitly says pricing reflects only shipped features. Honest, good. |
| `/` (home) | "richer area context than a competitor's roadmap" | Marketing copy | ✅ Positioning, not a promise. |
| `/sign-up` | HTML `placeholder="you@example.com"` | Input field | ✅ Legitimate UX hint, not a TODO. |

**Two real actions surface here:**

1. **Reconcile AR-134's Jira state vs the methodology page.** Either AR-134 isn't actually done (Jira state wrong), or address-level scoring shipped (page needs update). Both can't be true.
2. **Fix or remove the "Honest placeholder" line in `/docs`.** Reads bad to a prospect. The OpenAPI spec exists.

---

## 8. MCP via Claude Code

All 11 tools exercised via Claude Code session against the test key (`oga_4e9e...`, version 1.0.2).

| # | Tool | Result | Finding |
|---|---|---|---|
| 1 | `engine_version` | ✅ | Returns 2.0.2 + release notes. Clean. |
| 2 | `methodology_for(safety_crime)` | ⚠️ | Works, BUT internal inconsistency: header says "Used in intents: moving, research" while weights table shows all 4 presets (moving 25%, research 20%, business 15%, investing 15%). Either the header is wrong or the weights table is overstating coverage. |
| 3 | `score_postcode(SW1A 1AA, moving)` | ✅ | 44/100, medium confidence. 5 dims with reasoning. AR-363 brief composer working through MCP. |
| 4 | `compare_postcodes([M1 1AE, SW1A 1AA], investing)` | ✅ | M1 1AE 44 vs SW1A 1AA 20. Both flagged low confidence (correct disclosure). |
| 5 | `get_area_signals(M1 1AE)` | ✅ | Full 7-category catalog. Confidence varies (90% deprivation/schools/flood, 60% crime, 40% property, 0% amenities + transport — OSM coverage gap on city-centre coords, same as 2.0.2 release notes flagged). |
| 6 | `get_signals_by_category(M1 1AE, schools)` | ⚠️ | Works, but **the per-school breakdown that appears in `score_postcode` reasoning ("2 Outstanding, 8 Good, 1 RI") is NOT exposed via the signals catalog** — only the count + good/outstanding percentage. The engine has the granularity; the signals surface hides it. |
| 7 | `find_areas("safest low-deprivation areas in Manchester")` | 🔴 | NL planner → `rank_areas`. Returned **4 rows where ranks 1-2 are the same LSOA (E01005173) and ranks 3-4 are the same (E01033673)**. Confirms the duplicate-rows bug seen via direct `/v1/query`. Effectively 2 results from a `limit: 50` request — extreme thinness from compound filter on sparse data. |
| 8 | `find_peers(SW1A 1AA, k=5)` | ✅ | 5 peers in 0.086-0.127 distance band. Tight cluster, 11-12 dims used per peer. Returns LSOA codes only — no place-name resolution exposed. |
| 9 | `watch_portfolio(name, [M1 1AE, SW1A 1AA])` | 🔴 | **REAL PRODUCTION BUG.** Tool reports failure ("Cannot read properties of undefined (reading 'length')") and tells caller to retry. Both portfolio AND areas actually wrote to DB successfully. Claude retried → second populated portfolio created. **Two orphan portfolios left behind, each with 2 areas.** Bug located: `apps/api POST /v1/portfolios/:id/areas` returns `{added: <count>}`, but `mcp/src/api-client.ts addPortfolioAreas` types the response as `OogaPortfolioDetail`, then `mcp/src/tools/watch-portfolio.ts formatPortfolioSetup` does `added.areas.length` on what's actually `{added: 2}` → undefined.length → crash. Contract mismatch between apps/api response shape and MCP api-client types. **Cleaned up both orphans via curl during this session.** |
| 10 | `get_portfolio_changes(orphan-pf-1)` | ✅ + ✅ | Worked correctly against the "failed" portfolio — proving the watch_portfolio reported failure was a lie. Found 1 material change for M1 1AE (1→2 crimes month-on-month, +100% — flagged correctly as material despite being absolute-noise). This tool's correctness is what surfaced the watch_portfolio bug — the probe revealed the supposedly-empty portfolio was populated. |
| 11 | `area_brief(M1 1AE, lender)` | ⚠️ | **DATA-LAYER MISMATCH discovered.** Safety & Crime dimension says: "4 crimes over **3 months**… confidence 40%, trend rising". The underlying signal layer says: "Recorded crimes (**12 months**): 4… confidence 60%". **Period attribution (3mo vs 12mo) AND confidence (40% vs 60%) disagree between the dimension layer and the signal layer.** For a lender brief this is critical — "4 crimes in 3 months rising" vs "4 crimes in 12 months" tell different risk stories. Confidence number to surface to the caller is also unclear. |

### Boot-log capture state (AR-385)

> Claude Code hides MCP stderr in its UI by default. Pedro didn't paste the boot log this session — could not directly confirm the new `Training-data capture: ON` line lands in Claude Code's view. Tested separately: invoking `npx @oga-mcp/server@1.0.2` standalone with `OOGA_API_KEY` set would print it to terminal stderr. AR-385's MCP-side guarantee is "the line is printed"; visibility depends on the wrapping client. Recommended follow-up: spot-check Cursor + Claude Desktop too — they may surface stderr differently.

---

## 9. ICP-perspective overlay

Each ICP re-read against the full findings list. **What blocks them, what works for them, what they'd say in a procurement call.**

### 🏦 Lender (mortgage origination, underwriting in the loop)

**What works:** `area_brief(lender)` produces a usable shape — overall score, per-dim risk, recommendations, data sources. Brief-composer training (AR-377) is genuinely capturing lender queries today, so the model will improve from real usage.

**What blocks a lender deal:**
- **🔴 Finding #11 — the dim-vs-signal mismatch on Safety & Crime is a deal-breaker.** No credit team can sign a vendor where the same data point reads as "4 crimes / 3 months" or "4 crimes / 12 months" depending on which API field you query. This is audit-trail catastrophic — different lender analysts would draw opposite conclusions from the same data.
- **🚨 Finding #6 — 4-second score latencies block synchronous underwriting flows.** Acceptable for batch portfolio review, fatal for an in-app application page.
- **⚠️ Finding #1 — the NL planner's `score_area` 500.** A lender's data team isn't going to chat with the planner. But a customer success demo would.
- **🟡 Finding #8 — address-level scoring on the roadmap.** A real lender will ask "can you score individual properties, not just postcodes?" The methodology page says yes, on the roadmap. AR-134 Jira says Done. Reality says no. This is a procurement-killer until reconciled — lenders WILL ask.

**Net:** the brief surface is right, the data layer needs reconciliation, the latency needs work, and address-level scoring is the real-world ceiling on contract size.

### 🏠 Insurer (property risk, portfolio monitoring, claim reserves)

**What works:** Insurers think in portfolios, not single addresses. `/v1/portfolios/:id/changes` returning per-signal direction + threshold + period is exactly the right shape. `get_portfolio_changes` worked correctly in the MCP path (despite `watch_portfolio` lying about its sibling).

**What blocks an insurer deal:**
- **🔴 Finding #10 — `watch_portfolio` false-failure → duplicate populated portfolios.** Insurers will run this on hundreds of portfolios per region. Two orphans per attempt × hundreds of attempts = data hygiene nightmare. **Highest-priority hotfix in this entire E2E for the insurer ICP.**
- **⚠️ Flood signals are high-confidence and present** (10 areas / 0 warnings for M1 1AE). That's exactly the data an insurer wants. ✅
- **🟡 Material change threshold defaults (5% / 8 transactions) are aggressive.** "1 → 2 crimes" registers as material (+100%). For insurance this would trigger alert fatigue. Worth a per-customer threshold tuning surface.

**Net:** the monitor product is closest to ready of all 4 ICPs. Watch_portfolio bug is the only real blocker.

### 💰 Investor (BTL / commercial / portfolio acquisition)

**What works:** `compare_postcodes(investing)` did its job — M1 1AE 44 vs SW1A 1AA 20 with explicit yield/growth reasoning. Investors think comparatively, and that's the shape. `find_peers` for "where else looks like my best investment" is fast + tight + reliable.

**What blocks an investor deal:**
- **⚠️ Finding #4 + #5 — `/v1/insights` + `/v1/forecast` need `signal_key` with the `_peer_relative_z` suffix, country case-sensitive.** Investors are sophisticated but not infinitely patient. A first-day developer hitting these endpoints will burn 20 minutes. Worth either a `/v1/signals/catalog` discovery surface or a smarter error message.
- **⚠️ Finding #3 — `find_areas` duplicate rows.** Investor wants "top 10 areas matching X" — getting 2 unique results from a `limit: 50` query, then duplicated to look like 4, is misleading.
- **🟡 Finding #13 — schools data is shallow via the signals catalog.** Investor evaluating BTL wants "which schools are in this catchment, individually" not "67% are good or outstanding". Engine has the per-school breakdown; signals layer doesn't expose it.

**Net:** the data is there. The discoverability + de-dupe + signal-catalog UX needs work.

### 🛒 Retailer (site selection, store placement, demographic targeting)

**What works:** `find_peers` is the killer surface for this ICP. "Find me 5 areas like my best-performing store" → 12-dim distance ranking, sub-second, tight cluster (all distances 0.086-0.127). This is production-ready as of today.

**What blocks a retailer deal:**
- **⚠️ Finding #5 — `find_peers` returns LSOA codes only.** Retailer wants neighborhood names, postcodes, council areas — not `E01002819`. Need a place-name resolution helper, OR have `find_peers` enrich its response with `admin_district` and a representative postcode.
- **🟡 Finding #13 — amenities + transport coverage gaps on city centres.** Retailer's #1 query is "is there foot traffic here". With OSM returning 0% confidence on amenities/transport for M1 1AE (literal Piccadilly), the engine is silent on the question that matters most. This is the gap engine 2.0.2 targeted — needs ongoing attention.

**Net:** `find_peers` is a real product for retailers TODAY. The gap is post-result enrichment (place names) and the OSM coverage problem. Both fixable.

### Cross-ICP synthesis

| Finding | Lender | Insurer | Investor | Retailer |
|---|---|---|---|---|
| #1 NL `score_area` 500 | 🟡 demo risk | — | — | — |
| #2 invalid-postcode 15s latency | 🟡 frontend issue | — | — | — |
| #3 find_areas duplicate rows | — | — | 🔴 misleads ranking | 🟡 |
| #6 4s score latencies | 🔴 underwriting blocker | 🟡 | 🟡 | — |
| #8 AR-134 address-level drift | 🔴 procurement blocker | — | 🟡 | — |
| #10 watch_portfolio false-failure | — | 🔴 critical | — | — |
| #11 crime period-attribution mismatch | 🔴 deal-breaker | 🟡 | 🟡 | — |
| OSM coverage gaps | — | 🟡 | — | 🔴 retailer-critical |

**Priority sort for fixes before customer launch:**

1. **#10 watch_portfolio** — one-line fix in MCP api-client OR apps/api response shape. Blocks insurer demo.
2. **#11 crime dim-vs-signal mismatch** — root cause in engine. Blocks lender demo + erodes trust across all ICPs.
3. **#6 score latency** — 4s is fine for batch / async; fatal for any synchronous UI flow. Worth a profile + cache pass.
4. **#8 AR-134 Jira state** — 1-minute Jira fix (revert to In Progress) OR a methodology page edit (drop the AR-134 reference).
5. **#1 NL `score_area` 500** — bug in apps/api executor. Not blocking, but visible.
6. **#2 invalid-postcode latency** — geocoder needs early rejection on garbage input.
7. **#5 case-sensitive country** — uppercase normalize on parse. 1-line fix.
8. **#3 find_areas duplicate rows** — executor dedupe needed.

---

## Append: known regressions from 2026-06-12

| 2026-06-12 finding | 2026-06-30 status |
|---|---|
| 🚨 Render prod is STALE (AR-283 not live) | ✅ FIXED — AR-384 auto-migrations on container boot |
| 🚨 SECURITY: `POST /v1/orgs/:id/members` accepts arbitrary user_id | 🚧 Not re-tested this pass — open from 2026-06-12 |
| 🚨 LATENCY: invalid place names take 15-30s | 🚨 Still broken — `/v1/area?postcode=BAD` takes 14.9s (finding #2 above) |
| ⚠️ Date format drift on org endpoints | 🚧 Not re-tested this pass |
| ⚠️ Bundle scoping by API-key org | ✅ Documented behavior; not a regression |
