# 078 — Showcase: Price changes tab (forecast, YoY, sales) + named portfolio

**Purpose:** Add a "Price changes" tab to the PropTech showcase that surfaces the
forecast line for `property.median_price` (via `POST /v1/forecast`), the YoY
price change (`property.price_change_pct` signal), and the recent-sales table
(currently living in the Signals tab). Separately, let the Portfolio tab create
a portfolio with a user-chosen name instead of the hardcoded "Demo portfolio".

**Linked Jira:**
- Story: AR-786 (AR Sprint 8)

**Dependency:** AR-758 landed the showcase module + transactions BFF; AR-764
renamed Monitor→Portfolio and added POST /changes. The forecast endpoint
(`POST /v1/forecast`) exists in `apps/api/src/routes/intelligence.ts:474` and
supports `property.median_price`.

## Scope

### In scope
- `apps/web/src/lib/showcase/types.ts` — `ForecastPoint`/`ForecastResult` types.
- `apps/web/src/lib/showcase/api.ts` — `getForecast()` (POST /v1/forecast,
  proptech UA).
- `apps/web/src/app/api/showcase/forecast/route.ts` — BFF proxy; 404 →
  `{ forecast: null }` so a data-less area degrades gracefully.
- `apps/web/src/modules/showcase-proptech/constants.ts` — add `"price"` TabId
  + tab label/blurb.
- `apps/web/src/modules/showcase-proptech/PriceChangesTab.tsx` — YoY stat,
  static-SVG forecast line, recent-sales table.
- `apps/web/src/modules/showcase-proptech/SignalsTab.tsx` — drop the recent
  sales section (moves to Price changes tab).
- `apps/web/src/modules/showcase-proptech/ProptechShowcase.tsx` + `page.tsx` —
  wire the new tab; fetch forecast server-side with signals/score/transactions.
- `apps/web/src/modules/showcase-proptech/PortfolioTab.tsx` — name input on
  create (replace `DEMO_PORTFOLIO_NAME`); reuse the existing POST /portfolios
  `name` support in the BFF.
- `apps/web/src/modules/showcase-proptech/proptech.css` — `.prx-price*` styles.
- Unit tests mirroring `showcase-proptech-constants.test.ts`.

### Explicitly out of scope
- No API changes: /v1/forecast, /v1/area, /v1/area/transactions untouched.
- No ChartShell reuse (design-v2 is app-route-scoped, not a module import);
  the tab ships its own small static SVG.
- No portfolio rename endpoint (create-time naming only).

## Decisions
- **Forecast degradation:** forecast 404/error → the tab shows YoY + sales and
  a "forecast not available for this area" hint; it never blocks the other
  price data.
- **Recent sales:** moved from Signals to Price changes tab (single home for
  property price data).

## Verification (containers — docker)
- `make build-web-test-image` + `make web-test-container` — web unit tests green.
- `make app-lint` + `make app-typecheck`.

## Rollback
- `git revert <sha>` per commit; all changes are additive in the showcase
  module + one new BFF route.
