# Product spec — Monitor

> Part of [AR-204 product-pages spec pack](./AR-204-product-pages-spec-pack.md).

## Thesis

Monitor is OneGoodArea's third product: save a book of areas, bulk-enrich them with deterministic scores, then on demand diff their stored time-series to detect material moves and fire signed webhooks. You create a portfolio, add up to 200 areas per call, bulk-enrich up to 50 at a time (concurrency 5), and `POST /v1/portfolios/:id/changes` to surface the (area, signal) pairs that moved beyond a threshold across the time-series corpus. Price moves are sample-size gated (default 8 transactions in both periods) so a 47% swing on 2 sales does not earn an alert. When something material happens, a Stripe-style HMAC-SHA256 signed payload lands on your registered HTTPS endpoint. Portfolios are scoped to the api-key's user today (org-scoping lands with Levers), and the only event the change-detector actually emits today is `signal.changed`. See ADRs 0009, 0013, 0014.

## Primitive contract

Three typed shapes land on the wire: **Portfolio** / **PortfolioDetail** (tracked book + areas), **ChangeReport** (result of change-detection run, with material `SignalChange` rows), **WebhookSubscription** (signing secret + event filter). All Zod-validated in `@onegoodarea/contracts`.

**Zod source:** `packages/contracts/src/portfolios.ts`

| Field | Type | Description | Example |
|---|---|---|---|
| `Portfolio.id` | string | `pf_`-prefixed id. | `pf_8s2k4m9q` |
| `Portfolio.name` | string | Trimmed, max 200 chars. | `"UK lender book Q2"` |
| `Portfolio.area_count` | number? | Joined at list time. | `42` |
| `PortfolioDetail.areas[].area` | string | Area as added (postcode, place, LSOA code). | `"M1 1AE"` |
| `PortfolioDetail.areas[].label` | `string \| null` | Optional caller label. | `"Asset #142"` |
| `ChangeReport.portfolio_id` | string | Portfolio described. | `pf_8s2k4m9q` |
| `ChangeReport.baseline` | `'previous' \| 'first'` | What "from" means. | `"previous"` |
| `ChangeReport.threshold_pct` | number | `|pct_change|` must clear; default 5. | `5` |
| `ChangeReport.min_transactions` | number | Sample-size gate for price moves; default 8, 0 disables. | `8` |
| `ChangeReport.areas_checked` | number | Areas resolved to LSOA and diffed. | `42` |
| `ChangeReport.material_count` | number | (area, signal) pairs that moved ≥ threshold. | `7` |
| `ChangeReport.changes[]` | `SignalChange[]` | Material rows only. | `[{...}]` |
| `SignalChange.signal_key` | string | Catalog key. | `"property.median_price"` |
| `SignalChange.period_from / period_to` | string | YYYY-MM for monthly. | `"2025-01" / "2025-12"` |
| `SignalChange.value_from / value_to` | `number \| null` | Raw values. | `200000 / 260000` |
| `SignalChange.pct_change` | `number \| null` | Rounded to 2dp; null when baseline is 0/absent. | `30` |
| `SignalChange.direction` | `'up' \| 'down' \| 'flat'` | Sign of move. | `"up"` |
| `SignalChange.material` | boolean | `|pct_change| >= threshold_pct`. | `true` |
| `WebhookSubscription.url` | string | Public HTTPS endpoint. No localhost / RFC 1918. | `"https://api.example.com/oga/hook"` |
| `WebhookSubscription.events` | `string[]` | Subset of `['report.created', 'score.changed', 'signal.changed']`. | `["signal.changed"]` |
| `WebhookSubscription.secret` | string | Returned ONCE; `whsec_` prefix; HMAC-SHA256. | `"whsec_3a2c...e9"` |

## Under the hood

**Store or compute?** Hybrid. The book itself (portfolios + portfolio_areas) is persisted; bulk enrich is synchronous fan-out over `scoreArea` (concurrency 5, cap 50, per-area failures captured as `error` strings); change detection is computed on demand by reading `signal_timeseries` for resolved LSOAs and diffing in memory via the pure `diffSeries`/`buildChanges` core. Static signals (e.g. deprivation, single stored period) silently produce nothing. Whole signal surface gated by `OGA_SIGNALS_API` via `guardSignals`; a failed gate returns 404, not 401.

**Lineage.** Every change row carries `period_from` / `period_to` / `value_from` / `value_to` + resolved `geo_code`. `X-Engine-Version` header set on enrich + changes responses. Webhook envelopes signed Stripe-style: `t=<unix-seconds>.<raw-json-body>` HMAC-SHA256, sent as `X-OneGoodArea-Signature: t=<ts>,v1=<hex>`, alongside `X-OneGoodArea-Event` + `X-OneGoodArea-Delivery` headers. Delivery row persisted in `webhook_deliveries` (status / http_status / attempts / response_body snippet) so failures are auditable.

**RBAC + Levers interplay.** **Portfolios are scoped to api-key's `user_id` today** — ownership enforced by WHERE clause on every query. NO `org_id` on portfolios yet. The Levers epic re-scopes when org tenancy + RBAC land (ADR 0009 explicitly defers it). Custom signal bundles, methodology pinning, peer cohorts do NOT modify Monitor today.

**Rate limits / quota.** Hard caps in code (NOT plan-quota):
- `PORTFOLIO_ADD_MAX = 200` areas per add call
- `PORTFOLIO_ENRICH_MAX = 50` areas per enrich call (`ENRICH_CONCURRENCY = 5` in-flight)
- `CHANGE_AREA_MAX = 100` areas per change-detection call
- `DEFAULT_THRESHOLD_PCT = 5`, `DEFAULT_MIN_TRANSACTIONS = 8`
- `WEBHOOK_DELIVERY_TIMEOUT_MS = 5000` (5s POST timeout)
- Failed webhook rows recorded for retry cron

Each call meters `api.portfolio.created` / `api.portfolio.areas_added` / `api.portfolio.enriched` / `api.portfolio.changes_checked` against caller's plan via `requireApiAccess`.

## Endpoints

### `POST /v1/portfolios`
Create empty book. Body: `name` (string, ≤200). 201 with `{ id, name, area_count: 0 }`. 400 missing/oversized name · 401 · 404 (flag off). RBAC: any-API-key.

### `GET /v1/portfolios`
List caller's portfolios. Response: `{ portfolios: Portfolio[] }` sorted by `created_at` desc, joined `area_count`.

### `GET /v1/portfolios/:id`
Fetch one with all areas. `PortfolioDetail: { id, name, area_count, areas: PortfolioArea[] }`. 404 not owned / doesn't exist.

### `DELETE /v1/portfolios/:id`
Soft cascade (manual — no FK constraints). 200 `{ deleted: true }`.

### `POST /v1/portfolios/:id/areas`
Add areas (dedup on `(portfolio_id, area)`, cap 200/call). Body: `areas: Array<{ area: string; label?: string|null }>` (1..200). 200 `{ added: number }` — duplicates silently skipped via `ON CONFLICT DO NOTHING`.

### `POST /v1/portfolios/:id/enrich`
Bulk-score every tracked area. Synchronous, cap 50, concurrency 5. Per-area failures captured. Body: `preset?` (`moving`/`business`/`investing`/`research`, default `research`). 200 `{ count, results: PortfolioEnrichItem[] }` — each `{ area, label, score: ScoreResult|null, error: string|null }`. `X-Engine-Version` stamped.

### `POST /v1/portfolios/:id/changes`
Detect material moves + fire `signal.changed` webhooks. On-demand, no cron. Body fields all optional:
- `baseline`: `'previous'` (default) or `'first'`
- `threshold_pct`: number ≥0, default `DEFAULT_THRESHOLD_PCT = 5`
- `min_transactions`: number ≥0, default `DEFAULT_MIN_TRANSACTIONS = 8`; BOTH periods need ≥N transactions for price moves; 0 disables
- `emit`: boolean, default true

Response: `ChangeReport` with material-only rows. Status: 200 (material_count may be 0 — also signal) · 400 invalid args · 404 not owned.

**Sample curl:**
```
curl -X POST https://api.onegoodarea.com/v1/portfolios/pf_8s2k4m9q/changes \
  -H 'Authorization: Bearer oga_live_...' \
  -H 'Content-Type: application/json' \
  -d '{"baseline":"first","threshold_pct":5,"min_transactions":8}'
```

### Webhooks: `POST /v1/webhooks` · `GET /v1/webhooks` · `DELETE /v1/webhooks/:id`

- **POST** body: `url` (public HTTPS, no `http://`/`localhost`/`127.0.0.1`/`0.0.0.0`/`::1`/`10.x`/`192.168.x`/`169.254.x`/`172.16-31.x`), `events: string[]` (subset of `SUPPORTED_EVENT_TYPES = ['report.created', 'score.changed', 'signal.changed']`; unknowns silently filtered). Response 201: `{ id, url, events, secret: 'whsec_...', created_at }`. **Save the secret — never returned again.**
- **GET** lists active subscriptions (secret omitted).
- **DELETE** soft-deletes (status → `'revoked'`).

## Compound grammar — `POST /v1/portfolios/:id/changes` body

All fields optional:

```
{
  "baseline":         "previous" | "first",   // default "previous"
                                              // "previous" = latest vs prior period
                                              // "first" = latest vs oldest in stored range
  "threshold_pct":    number >= 0,            // default 5. |pct_change| clears this to be material
  "min_transactions": number >= 0,            // default 8. BOTH periods need >= N transactions
                                              // for a price move (property.median_price) to count.
                                              // 0 disables. Applied only to signals with a backing
                                              // count series (today: property.median_price gated
                                              // by property.transaction_count). Other signals ungated.
  "emit":             boolean                 // default true. Fire signal.changed webhooks
}
```

Server-side caps: `CHANGE_AREA_MAX = 100` areas resolved per call. Sample series themselves (e.g. `property.transaction_count`) are NEVER emitted as `signal.changed` — they are gating inputs, not alert subjects.

## ICP value (compressed)

| ICP | One-line value |
|---|---|
| InsureTech ⭐ | Sign up the insured-location book as a portfolio; get HMAC-signed `signal.changed` alerts (signal_key, periods, values, pct_change) when a tracked LSOA moves materially, with sample-size gating so 2-sale noise never fires. |
| Lender | Store the book once, bulk-enrich on intake, then run change-detection; `baseline='first'` shows cumulative drift since onboarding, `baseline='previous'` month-on-month — every move auditable row-by-row to prove "we knew on date X". |
| PropTech | Attach a portfolio per customer book, call `/changes` on a cadence; UI-shaped rows (per area·signal, period/value/pct_change/direction) feed a "movers this month" panel + webhooks — ship portfolio intelligence without a data team. |
| CRE / site selection | A watchlist is a portfolio; `baseline='first'` + tunable `threshold_pct` surface which candidate LSOAs have moved enough to retrigger underwriting, with static signals correctly staying silent. |
| Public sector | Track priority LSOAs; `ChangeReport` stamps baseline + threshold_pct + min_transactions inside the artifact, and honest gating (single-period signals produce nothing, small samples filtered) yields a lineage-stamped, defensible change record. |

## Demo strategy

**Endpoint:** `POST /v1/portfolios/:demoId/changes` (proxied as `/api/demo/v1/portfolios/:demoId/changes`)

**Why this endpoint:** Monitor is stateful — a real demo would need create-portfolio + add-areas + (wait for time-series) + changes, which is hostile in a marketing widget. The honest play is a **PRE-SEEDED demo portfolio** (e.g. "Demo portfolio: 4 inner-Manchester LSOAs") maintained server-side by the demo proxy. The TryItPanel renders a frozen portfolio summary + an "Run change detection" button calling `POST /changes` with the body the user can edit (baseline, threshold_pct, min_transactions). Feels read-only (no portfolio mutation in widget), exercises the actual diff core against real time-series data, shows the sample-size gate live by toggling min_transactions between 0 and 8.

**Response shape user sees:** A `ChangeReport` JSON pane (baseline, threshold_pct, min_transactions, areas_checked, material_count) plus a small table of `SignalChange` rows (signal_key, area, period_from → period_to, value_from → value_to, pct_change %, direction arrow). Toggling min_transactions 0→8 visibly drops noisy rows. "No material changes" is the honest empty case — annotate "Nothing moved past your threshold + sample gate."

**Postcode allowlist:** Not postcode-based. Fixed portfolio ids — allowlist to `pf_demo_manchester_inner, pf_demo_city_of_london, pf_demo_birmingham_central`. Block any other portfolio id. Body params parsed and clamped: `baseline ∈ {previous, first}`, `threshold_pct ∈ [0, 50]`, `min_transactions ∈ [0, 50]`, `emit` FORCED to `false` (no webhooks fire from demo).

**Rate-limit suggestion:** 5 requests / 60s per IP. Daily ceiling 200/day/IP.

## Methodology proof

- `/methodology` change-detection section — diff core (`diffSeries`/`buildChanges`), baseline modes, sample-size gate.
- **ADR 0009** — Monitor v1: portfolios + bulk enrich, user-scoped, 50-area sync cap, deferred org-scoping.
- **ADR 0013** — Monitor change detection (`signal.changed`): pure diff core, on-demand endpoint, static signals correctly silent, `score.changed` deferred.
- **ADR 0014** — Property YoY + change-detection de-noising: sample-size gate, transaction_count as gate-not-alert, 2-year backfill makes YoY work.
- `/methodology` Webhooks section — Stripe-style HMAC-SHA256, X-OneGoodArea-Signature, public-HTTPS-only, 3-event catalog.
- Unit test `apps/api/tests/modules/monitor/change-detection.test.ts` — diff core tested without DB or network.

## Gotchas

1. Portfolios are scoped to api-key's `user_id` today, NOT org. Org-scoping deferred to Levers (ADR 0009).
2. Bulk enrich is SYNCHRONOUS, cap 50, concurrency 5. Lender book of thousands can't be enriched in one call today. Async `portfolio_runs` is next increment, not shipped.
3. Change detection is ON-DEMAND only. NO scheduled auto-detect cron today. ADR 0013 names cron as future increment.
4. Supported event catalog is EXACTLY 3 events: `report.created`, `score.changed`, `signal.changed`. There is **NO** `portfolio.changed`. Do not invent.
5. Of the 3 catalog events, change-detection ONLY fires `signal.changed` today. `score.changed` is in `SUPPORTED_EVENT_TYPES` but NOT emitted by Monitor (requires per-period composite scoring, deferred). `report.created` fired by Reports, not Monitor.
6. Static signals (deprivation IMD, single-period catalog) produce ZERO change rows. `diffSeries` returns null when <2 periods.
7. Price move sample-size gating defaults `min_transactions=8` in BOTH periods. Below that, silently dropped. Set `min_transactions: 0` to disable — expect noise.
8. `property.transaction_count` is a SAMPLE signal (gates `property.median_price`), NEVER itself a change subject. A "2 sales became 1" move will never fire.
9. Webhook destinations must be PUBLIC HTTPS. Rejects http://, localhost, 127.0.0.1, 0.0.0.0, ::1, RFC 1918, link-local.
10. Webhook signing secret (`whsec_...`) returned ONCE. Storing it is caller's job.
11. `WEBHOOK_DELIVERY_TIMEOUT_MS = 5000` — 5s timeout. Slow receivers recorded as failures.
12. `CHANGE_AREA_MAX = 100` — change detection only resolves + diffs first 100 areas in a portfolio per call. No pagination yet.
13. `X-Engine-Version` stamped on enrich + changes, but headline `ScoreResult.median_price` is annual median while `pct_change` is computed on volume-weighted monthly aggregate (ADR 0014) — two slightly different central measures. Documented, not invented away.
