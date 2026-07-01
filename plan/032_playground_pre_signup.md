# Plan 032: Public /playground (pre-signup interactive surface)

**JIRA:** TBD (open once plan is signed off)

**Status:** brainstorming / interactive planning. Nothing implemented yet.

**Owner:** Pedro (product), Claude (implementation)

---

## Purpose (one sentence)

Ship a public interactive surface at `www.onegoodarea.com/playground` where prospects, ICP evaluators, and devs can run real queries against the full public API before signing up, hitting live prod, with generous but bounded rate limits.

## Why now

- **Confirmed 2026-07-01:** the dashboard is admin + docs + canned fixtures. Zero live API queries anywhere in `/dashboard/*`.
- **No interactive surface exists anywhere** on the web app, pre- or post-signup. Customers use their code. Prospects have nothing to click.
- **Conversion funnel gap:** today an evaluator either curls (dev-hostile UI) or installs MCP (high friction). Playground closes both gaps.
- **Marketing story win:** static /methodology + example blocks (AR-410 shipped today) already prove specific claims. A live playground turns "we have this" into "click here, prove it yourself."

## Non-goals

- Not a query builder for authenticated users. Post-signup users use their code. Playground is pre-signup.
- Not a full IDE with saved workspaces, request history, folders. That's Postman. Keep it small.
- Not a chatbot. NL query is optional (gated) but the interface is REST-first.
- Not admin. No auth, no billing, no webhooks in the playground surface.

## Constraints + risks (worth aligning on)

- **Anthropic cost.** `/v1/query` NL uses claude-sonnet-4-6. Anonymous unlimited access is a burn-your-budget vector. Either gate hard (max N NL calls per demo session) or exclude from v1.
- **OSM cold latency.** `/v1/area` on a fresh LSOA can take 4-8s (AR-406 mirror race). Bad first impression. Fix: whitelist "pre-warmed" postcodes for chip buttons; allow arbitrary but flag cold-cache.
- **Bot traffic.** `/playground` will be indexed and scraped. Need per-IP rate-limit + optional Cloudflare Turnstile before demo-token issue.
- **Rate limit design.** Our per-key limit is 30 req/min. Playground demo keys need their own bucket separate from real customer keys, plus a global playground-wide cap so an attacker can't rotate cookies to DDoS the demo layer.
- **Positioning risk.** A polished playground could feel like "the product is a UI" — the opposite of the current "your code USES OneGoodArea" line. Copy must be careful: playground is a *demo*, not the *product*.
- **Data honesty.** Every response must be REAL production data. No mocked scores. Users pasting responses into pitch decks needs to be safe.

## Proposed shape (v1)

Two-pane page at `/playground`. No auth wall. Cookie-issued demo token on first interaction.

- **Left pane: query picker + minimal form.**
  - Tab bar: `Area` / `Score` / `Peers` / `Rank` / `Insights` / `Forecast` / `NL Query` (last one gated).
  - Under each tab: 2-3 form fields (postcode, preset, scope, etc.).
  - Chip row above form: pre-canned "known-good" examples with warm caches.
  - "Run" button.
- **Right pane: HTTP preview + response.**
  - Top: curl command they'd run in real code (with `YOUR_KEY` placeholder).
  - Middle: JSON response with syntax highlight + latency chip + cache-hit indicator.
  - Bottom: "Copy as curl" + "Sign up to save" CTA.
- **Persistent footer strip:** "You've made N queries · Sign up for a free sandbox key (no credit card)".
- **After N queries (5?):** modal CTA. Not blocking; just visible.

Every button that runs a query posts to `/api/playground/proxy` on the web BFF, which:
1. Reads or issues a demo cookie
2. Consults the demo-token rate limiter
3. Forwards to the real `/v1/*` endpoint with a system-injected demo key
4. Returns the response verbatim

## Endpoint coverage (all safe reads)

Included:
- `GET /v1/area?postcode=`
- `POST /v1/score` (any preset)
- `POST /v1/peers` (postcode target)
- `GET /v1/areas` (with `?scope=national|regional`)
- `POST /v1/insights` (signal_key)
- `POST /v1/forecast` (postcode + signal_key)
- `POST /v1/query` (NL) - GATED, max 3 per demo session

Excluded (destructive / cost / auth-required):
- `POST /v1/portfolios/*` (creates rows)
- `POST /v1/orgs/*` (creates rows)
- `POST /v1/webhooks/*` (creates subscriptions)
- `/auth/*`, `/stripe/*` (mutate accounts)
- `/v1/report`, `/v1/portfolios/:id/enrich` (charges usage — already dead post AR-324 but worth stating)
- `/me/*` (session-auth only)

## Phasing

**Phase 1 - Skeleton (target: 1-2 days)**
- Page + layout + tab bar (visual only, no queries yet)
- Demo-token cookie issue + rate-limit plumbing on the BFF
- 3 endpoints wired: `/v1/area`, `/v1/score`, `/v1/peers`
- Chip row with 5 pre-warmed postcodes
- Copy-as-curl button

**Phase 2 - Coverage (target: 1 day)**
- Add `/v1/areas` + scope selector
- Add `/v1/insights` + `/v1/forecast`
- URL-share (query state encoded in `?q=...`)
- Signup CTA modal at N=5

**Phase 3 - NL query gated (target: half day)**
- Add `/v1/query` NL tab
- Hard cap: 3 calls per demo cookie lifetime, tracked on the BFF
- Explicit "AI planning is an expensive path — try direct queries first"

**Phase 4 - Marketing polish (target: half day)**
- Analytics events (session, endpoint, first-query-to-signup funnel)
- Meta tags for /playground indexability
- Prewarming worker: cron that hits the whitelist postcodes hourly so demo latency stays sub-second

Total: ~4-5 days of focused work, plus review + verify at each phase.

## Answered questions (2026-07-01)

1. **Auth:** anonymous cookie + rate-limit. No email gate.
2. **NL query in v1:** yes, with aggressive cost controls (see below).
3. **Path:** `/playground` on the root domain.
4. **Prewarming:** yes, spend the small extra prod API budget for snappy first impression.
5. **Bot mitigation:** Cloudflare Turnstile from day 1. Free, 15-min setup, stops 99% of scripted abuse.

## NL cost control (the ChatGPT-tier answer)

Combining three techniques gets a 1000-NL-queries/day surface to roughly $6/month, not $540:

1. **Response caching by prompt fingerprint.** Normalize NL input (lowercase, strip punctuation, collapse whitespace). Cache planner output JSON for 24h. Demo prompts repeat — "safest areas in Manchester" gets asked 100x/day; only the first call hits Anthropic. Rough estimate: 80% cache hit rate.
2. **Model tiering.** Playground uses claude-haiku-4-5 for the planner. ~5× cheaper than Sonnet 4.6 per token. Logged-in users continue on Sonnet.
3. **Anthropic prompt caching.** The planner system prompt is large and static. Anthropic offers 90% cached-input discount. Enable for playground calls.

Plus hard per-cookie cap of 3 NL queries lifetime, and prompt input truncated to 200 chars.

**Estimated daily cost at 1000 NL queries/day (unique or repeat):**
- ~800 cache hits: $0
- ~200 Haiku calls with 90% cached system prompt: ~$0.20
- Total: ~$6/mo

If we see abuse spike this, drop the per-cookie cap to 1, or gate NL behind Turnstile v2 challenge.

## Other cost/safety controls

- **Global daily NL budget:** $10/day hard ceiling with alert at $7. Automatic shutoff on breach.
- **Per-IP daily NL cap:** 10/day. Cookie rotation defeated by IP tracking.
- **Prewarm worker:** cron every 15 min hits the chip-postcode whitelist (SW1A 1AA, M1 1AE, EC1A 1BB, Newcastle, Edinburgh EH1 1AA) with `/v1/area` + `/v1/score` to keep the amenity + flood + score caches warm. ~30 requests/15 min = negligible cost.
- **Turnstile check** before the demo-token cookie is issued. One-time; token good for 24h.

## Next step (per Pedro's workflow rules)

Phase 1 detail — the small increments to build the skeleton. To be filled in on next interactive turn.

## What's OUT of scope for this plan

- MCP tools playground (they're stdio, not HTTP — a separate epic).
- Post-signup workbench inside `/dashboard/*` (the "Try a postcode" idea from your 06-13 note). If we want that too, it deserves its own plan file because it changes the dashboard's positioning.
- Multi-language SDK examples (Python, TypeScript, Go). "Copy as curl" is the v1 baseline; SDK snippets are a Phase 5+ polish.
