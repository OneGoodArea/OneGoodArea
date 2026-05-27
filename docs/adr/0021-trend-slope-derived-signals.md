# ADR 0021 — Intelligence Increment 3 follow-up: trend-slope derived signals (`regr_slope`)

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0018 (derived signals + write-only refresh),
  ADR 0019 (compound query grammar), ADR 0020 (rolling-12-month YoY).

## Context

ADR 0020 shipped YoY derived signals — a two-point comparison (latest
12-month window vs prior 12-month window). YoY answers "is this signal
higher or lower than a year ago?" but is **endpoint-sensitive**: an
anomalously high or low month at either end can flip the sign of the YoY
even if the underlying trend hasn't changed.

Trend slope answers the complementary question — **"what is the smoothed
direction of this signal over the last N months, using every observation?"**
A regression slope is anchored in ALL the data, not just two endpoints, so
it's more robust to monthly noise (which is real at LSOA grain).

This is the second a-la-carte signal from the AR-185 close-out follow-up
list (the others — 3m/6m short-horizon momentum and peer-relative
percentile — are still deferred for the reasons noted there).

## Decision

**Parameterized SQL builder for linear-regression trend slope:**
`buildRegrSlopeSql({sourceKey, derivedKey, windowMonths, minObservations,
confidenceReason, engineVersion?})` in
`apps/api/src/modules/signals/refresh/derive.ts`:

- **CTE 1 — `ranked`**: per-LSOA rows for the source signal_key from
  `signal_timeseries`, ranked DESC by `observed_period`. `y = raw_value`
  (`::float8`); `x = year*12 + month` (synthetic integer month index built
  from the `YYYY-MM` observed_period via `substr` + `::int`). Restricted to
  monthly periods + non-null values.
- **CTE 2 — `slope`**: `regr_slope(y, x)` over the trailing `windowMonths`
  observations per LSOA. `HAVING COUNT(*) >= minObservations` rejects
  sparse series — a slope from 3 points is noise. Also `HAVING regr_slope
  IS NOT NULL` filters out degenerate-x series (all observations in the
  same month, which would zero the denominator inside `regr_slope`).
- `INSERT ... SELECT` into `signal_values` keyed on the configured
  `derivedKey`, rounded to 6 decimal places, with `ON CONFLICT DO UPDATE`
  for idempotency. `observed_period` records `'slope <start>..<end>
  (n=<count>)'` so each row is self-describing.

**Units.** `x` is a month index (one unit per calendar month) and `y` is
the raw value, so **slope's units are `raw_value per month`.** For
`crime.monthly_count_trend_slope_24m`, that's `crimes / month / month`
(reading: "the monthly crime count is changing by N crimes each month, on
average, over the last 24 months"). Multiply by 12 for annualized
direction.

**Two new signals registered:**

| Derived key                                       | Source key (timeseries)        | Window | minObs | Direction         |
|---------------------------------------------------|--------------------------------|:------:|:------:|-------------------|
| `crime.monthly_count_trend_slope_24m`             | `crime.monthly_count`          |   24   |   18   | lower_is_better   |
| `property.transaction_count_trend_slope_24m`      | `property.transaction_count`   |   24   |   18   | neutral           |

Each gets a `DERIVED_SIGNALS` catalog entry (`unit: rate_per_month`), a
`DERIVED_NORMALIZE_KEYS` membership (so the unified `normalize:signals`
job picks them up), and a `SUPPORTED_SIGNALS` entry in the planner.

`runDerivations` loops over `TREND_SLOPE_SPECS` after the rolling-YoY
loop. Still WRITE-ONLY (no normalize — matches ADR 0018's separation).

## Consequences

**Positive**

- Both signals queryable through `/v1/query` IMMEDIATELY via the compound
  grammar (ADR 0019). ICP screens now compose smoothed-direction
  constraints, not just two-point deltas. E.g.: "rising volume + falling
  crime trend + affordable price" becomes one typed plan.
- Smoothed direction is more robust to monthly noise than YoY at LSOA grain
  (every observation contributes; outliers are dampened by the fit).
- Adding the next trend-slope signal is **one entry in `TREND_SLOPE_SPECS`
  + one `DERIVED_SIGNALS` row + one `DERIVED_NORMALIZE_KEYS` line + one
  `SUPPORTED_SIGNALS` line.** No new SQL.
- `minObservations: 18` (out of a 24-month window) is conservative
  enough to reject LSOAs with sparse history while still admitting the
  vast majority of areas. `regr_slope IS NOT NULL` HAVING filter defends
  against degenerate-x series.
- Confidence is stamped at 0.8 (one notch below YoY at 0.85) — a trend
  slope over noisy LSOA-grain monthly counts is informative but not as
  crisp as a two-point trailing-12m comparison.

**Negative / accepted**

- `property.median_price_trend_slope_24m` is **deferred.** LSOA monthly
  median prices are very noisy at small sample sizes (an LSOA with 1-2
  sales per month has a wildly variable monthly median). A regression slope
  over those noisy estimates can be misleading. Better path: smooth the
  price series first (peer-aware smoothing or a count-weighted rolling
  median), which lives alongside `/v1/peers` in Increment 6.
- Units are `raw_value per month`. For most callers this is fine for
  ranking and filter thresholds. We do NOT convert to annualized %
  inside the derive — that interpretation choice belongs to the consumer,
  and the raw slope is the most general primitive.
- The synthetic month index (`year*12 + month`) is monotonic and step-
  uniform per actual calendar month. That's exactly what regression needs.
  It doesn't handle missing months specially — gaps just mean a wider gap
  in `x` for adjacent observations, which is correct (a slope from
  Mar-2025 to May-2025 spans 2 month-units of `x`, not 1, so the per-month
  rate is right).
- We do NOT also compute `regr_intercept`, `regr_r2`, etc. in this
  increment — the slope alone is what ICP screening calls for. R² could
  land later as a quality signal in its own right.

## Alternatives considered

- **EWMA / exponentially weighted moving average instead of regression.**
  Rejected for v1 — EWMA gives a smoothed *level*, not a *direction*. The
  question "is this trending up or down?" maps more cleanly to a
  regression slope.
- **Slope per day or per year instead of per month.** Rejected — month is
  the natural cadence of the time-series; converting after the fact
  introduces nothing but cosmetic units.
- **Compute slope on the rolling-12-month sum (which is itself smoothed)
  instead of monthly counts.** Rejected — the rolling-12m sum has 11
  months of overlap between consecutive points, so its regression slope
  has very high autocorrelation and underestimates uncertainty. Slope on
  the underlying monthly counts is the cleaner primitive.
- **Property median-price trend slope in this commit.** Rejected — see
  above; LSOA monthly medians are too noisy without first smoothing,
  which is properly an Increment 6 problem.
