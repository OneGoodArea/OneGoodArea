# ADR 0025 — Intelligence Increment 8: `POST /v1/forecast` (linear time-series projection)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0010 (timeseries:append — the moat clock that makes
  this possible), ADR 0017 (query plane), ADR 0021 (trend-slope derive —
  same x = year*12 + month synthetic month index), ADR 0023 (peers — the
  target-resolution shape we re-use here), [[product-architecture-mental-model]]
  (Intelligence surface #4 of 6).

## Context

`signal_timeseries` is now a real moat asset — monthly snapshots of crime
counts, property median prices, transaction volumes, etc., per LSOA. The
natural question on top of it: *"what is this signal likely to be N months
from now at this LSOA?"*

This is the 4th of the 6 Intelligence surfaces per the product mental
model. After this surface lands, the only remaining surface is the AI
eval harness (surface #6), which measures the others rather than adding
capability.

For v1, the cheapest defensible methodology is **linear-regression
extrapolation** of the trailing window. Same synthetic month index as
the trend-slope derive (ADR 0021), so slope is in raw-value-per-month
and projections come back in the source signal's native units.

## Decision

### Endpoint

`POST /v1/forecast` behind `OGA_SIGNALS_API` + `requireApiAccess`.

```jsonc
{
  "target": { "geo_code": "..." } | { "postcode": "..." } | { "area": "..." },
  "signal_key": "<any signal with a monthly time-series>",
  "window_months": 24,    // optional; min 6, max 120
  "horizon_months": 12    // optional; max 60
}
```

Response:

```jsonc
{
  "target": { "geo_code": "E01..." },
  "signal_key": "property.median_price",
  "points": [
    { "observed_period": "2026-06", "projected_value": 218500, "lower_bound": 215300, "upper_bound": 221700 },
    ...   // horizon_months entries
  ],
  "meta": {
    "generated_at": "2026-05-27T...",
    "scope": "postcode=M1 1AE -> lsoa=E01034129",
    "window_months": 24,
    "horizon_months": 12,
    "n_observations": 23,
    "r2": 0.71,
    "slope_per_month": 1250.4,
    "intercept": ...,
    "residual_stderr": 1620,
    "latest_observed_period": "2026-05"
  }
}
```

### Methodology

**Pure SQL stats query** returns Postgres `regr_slope` / `regr_intercept`
/ `regr_r2` / `regr_syy` / `COUNT(*)` / `MAX(observed_period)` /
`MAX(synthetic_x)` over the trailing `window_months` of
`signal_timeseries` for the target (signal_key, geo_code). No JS-side
regression — Postgres's aggregates do it correctly.

**JS projects the points:**

```
for i in 1..horizon_months:
  x_pred           = latest_x + i
  y_pred           = intercept + slope * x_pred
  observed_period  = addMonths(latest_observed_period, i)
  lower_bound      = y_pred - K * residual_stderr
  upper_bound      = y_pred + K * residual_stderr
```

with `K = 2` (≈95% under normal-residual assumption) and

```
residual_stderr = SQRT( (1 - r2) * variance(y) )
variance(y)     = regr_syy / NULLIF(n - 1, 0)    -- sample variance
```

If `r2` is null or `variance(y)` is negative/undefined, `residual_stderr`
falls back to null and the CI collapses to the point estimate.

### `find_forecast` plan op

Symmetric with `find_peers` and `find_insights`. Added to
`QueryPlanSchema`; the executor's `find_forecast` branch dispatches
through the SAME `parseForecastInput` + `runForecast` used by the
endpoint. One implementation, two surfaces.

### Defaults

- `window_months` default = **24** (enough to span seasonality once + a
  year of trend). Min 6 (rejects too-short fits); max 120.
- `horizon_months` default = **12** (a year ahead — most ICP-actionable
  horizon for property + crime). Max 60 (5 years; far-horizon CIs are
  meaningless under v1's constant-band methodology).
- `K = 2` confidence band; not configurable in v1.

## Consequences

**Positive**

- **Time-series projection becomes a query-time capability** with no
  pre-computation: 1 SQL round-trip, JS math, sub-second response.
- **One forecast definition across the surface.** Direct endpoint OR
  composed via `/v1/query find_forecast`. NL can ask "forecast median
  price for M1 1AE next 12 months" and get a typed plan.
- **Native units.** Projections are in the source signal's units
  (£ for prices, count for crime/transactions). No normalization
  involved — callers want raw forecast values.
- **Cross-validates with trend slope (ADR 0021).** A signal whose
  `*_trend_slope_24m` is positive must produce a forecast that rises
  over the horizon — both consume the same regression on the same
  window. Effectively a sanity check across the Intelligence surface.
- **Uses Postgres-native regression aggregates** (`regr_slope`,
  `regr_intercept`, `regr_r2`, `regr_syy`) — battle-tested, no
  custom math, no FFI to a stats library. Same primitives the
  trend-slope derive uses (ADR 0021).

**Negative / accepted**

- **Constant-width CI.** The `lower_bound`/`upper_bound` band does NOT
  widen with horizon distance. A statistically correct extrapolation
  band would scale by `sqrt(1 + 1/n + (x_pred - x_mean)^2 / Sxx)`. v1
  uses the simpler residual-stderr band because:
  (a) the math is small, auditable, and reasonable for short horizons;
  (b) far-horizon CIs are dominated by model-mis-specification error
  (the linear assumption itself) rather than estimation error, so the
  textbook formula is also not "right"; (c) caveat is documented in
  this ADR + the response's `residual_stderr` is exposed so callers
  who want correct bands can re-compute.
- **Linear-only.** No seasonality, no nonlinear trend, no ARIMA / Holt-
  Winters. For property prices over 24-36 months at LSOA grain, linear
  is a defensible first approximation — markets do bend, but a one-year
  ahead projection from a two-year window is the right order of
  approximation. Seasonal/nonlinear variants land later if a measured
  ICP need surfaces.
- **Noisy at LSOA grain for property median price.** Same caveat as
  ADR 0021's deferred property median-price trend slope: monthly LSOA
  medians at low sample sizes vary wildly. The forecast IS still
  defensible (regression smooths over the window) but `r2` will be
  low for many LSOAs; the response surfaces `r2` so callers can filter
  on quality. Peer-aware smoothing is now unblocked by ADR 0024 — a
  future refinement will refit forecasts on the peer-smoothed series.
- **No outlier filtering.** A single anomalous month skews the fit.
  Acceptable for v1; an outlier-robust variant (Theil-Sen, M-estimators)
  is a future refinement.
- **One signal at a time.** Multi-signal joint forecasting (e.g.
  "price will rise but only because volume is collapsing") is a
  whole separate problem (VAR / state-space). Out of scope.
- **One LSOA at a time.** No batch forecasting endpoint. Callers
  that want N LSOAs make N requests. With per-request cost in the
  tens of ms, this is fine up to thousands of LSOAs; a batch endpoint
  can land later if needed.
- **No pre-computation.** Unlike peer_assignments / peer-relative-z
  (which are materialized because per-request computation would be
  O(N²)), forecast is O(window_months) per request — trivially fast,
  no benefit from offline batch. The response always reflects the
  freshest time-series.

## Alternatives considered

- **ARIMA / Holt-Winters / Prophet.** Rejected for v1 — each adds
  methodology weight (parameter selection, seasonality detection,
  trend dampening) without a measured ICP need. Linear is the floor;
  add complexity when a customer asks why the line doesn't bend.
- **JS-side regression instead of Postgres regr_* aggregates.**
  Rejected — Postgres already has battle-tested aggregates and we
  keep the SQL → stats path symmetric with ADR 0021's trend-slope
  derive. Less code, faster, no JS stats dependency.
- **Theil-Sen / median-of-pairwise-slopes.** Robust to outliers but
  the implementation in pure SQL is non-trivial. Deferred until
  outlier sensitivity becomes a measured problem.
- **Pre-compute forecast for every (signal, LSOA) pair offline.**
  Rejected — forecast is configurable per request (window_months,
  horizon_months), and the compute cost is already tiny. Storage
  would explode (many windows × many horizons × many signals × 42k
  LSOAs) without speed benefit.
- **Include the historical fit points in the response.** Rejected —
  callers can fetch the time-series separately via the (planned)
  `/v1/signals/{category}/timeseries` route. The forecast response
  stays focused on projection.
- **Bundle confidence bands per the textbook extrapolation formula.**
  Rejected for v1 (see Negative above). The current
  `residual_stderr` + scalars in `meta` give callers everything they
  need to compute their own bands; v1 ships a simple constant band as
  the default + transparent metadata.
