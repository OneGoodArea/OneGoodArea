# ADR 0022 — Intelligence Increment 3 follow-up: 6-month short-horizon momentum derived signals

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0018 (derived signals + write-only refresh),
  ADR 0019 (compound query grammar), ADR 0020 (rolling-12-month YoY),
  ADR 0021 (trend slope).

## Context

ADR 0020 shipped 12-month YoY signals; ADR 0021 shipped 24-month trend
slopes. Both are *long-horizon* views — they tell you what happened over
the last year (YoY) or where the smoothed trajectory is heading
(24-month regression).

ICP screening for "rising areas" often needs a **shorter horizon**: a
market or crime shift that started 4-6 months ago hasn't yet rotated
into the trailing 12-month sum and won't move YoY much. A 6-month delta
catches it.

Pedro: *"6m sounds reasonable."* That's the window. Interpretation:
**latest 6-month window vs prior 6-month window** (12 months total
span). Same shape as the YoY signals, just compressed.

## Decision

**Two new parameterized SQL builders** for N-month delta signals,
mirroring the two YoY builders (which are 12-month specializations of
the same shapes):

- `buildCountWeightedMedianDeltaSql({windowMonths, sourceKeyValue,
  sourceKeyCount, derivedKey, minPriorValue?, confidenceReason,
  engineVersion?})` — for median values that need count-weighting (a
  median is not a sum, so a single low-volume month with a wild median
  would dominate a naïve average; weighting by transaction count fixes
  that). Mirrors `buildPropertyYoYSql` but parameterized for window
  length.
- `buildRollingSumDeltaSql({windowMonths, sourceKey, derivedKey,
  minPriorSum?, confidenceReason, engineVersion?})` — for count series
  where the per-window value is just `SUM(raw_value)`. Mirrors
  `buildRollingSumYoYSql` but parameterized for window length.

Both follow the same per-LSOA `ROW_NUMBER() DESC` ranking pattern, clip
to rows 1..N (latest) vs N+1..2N (prior), require `latest_months = N
AND prior_months = N` (strict full windows on both sides), require
denominators > 0 / prior > `minPriorSum`. INSERT ... ON CONFLICT DO
UPDATE for idempotency. `observed_period` stamps as `'<N>m
<prior_start>..<prior_end> -> <latest_start>..<latest_end>'`.

**Two new signals registered with windowMonths=6:**

| Derived key                              | Builder                              | Source(s)                                                    | Direction        |
|------------------------------------------|--------------------------------------|---------------------------------------------------------------|------------------|
| `property.median_price_change_pct_6m`    | `buildCountWeightedMedianDeltaSql`   | `property.median_price` × `property.transaction_count` (weight) | neutral          |
| `crime.total_6m_change_pct`              | `buildRollingSumDeltaSql`            | `crime.monthly_count`                                          | lower_is_better  |

Each gets a `DERIVED_SIGNALS` catalog entry, `DERIVED_NORMALIZE_KEYS`
membership, and a `SUPPORTED_SIGNALS` entry in the planner. The new
specs go in `COUNT_WEIGHTED_DELTA_SPECS` and `ROLLING_SUM_DELTA_SPECS`
respectively. `runDerivations` loops them after the trend-slope loop.

Still WRITE-ONLY — matches ADR 0018's separation between derive and
normalize.

## Consequences

**Positive**

- Both signals queryable through `/v1/query` IMMEDIATELY via the
  compound grammar (ADR 0019). ICP screens that previously had to lean
  on YoY can now combine short + long horizons in one typed plan
  (e.g. "price YoY > 0 AND price 6m delta > 0" filters out areas that
  were rising YoY but have since stalled).
- Window length is **parameterized.** Shipping a future 3m / 9m /
  custom window is one entry per spec list + one `DERIVED_SIGNALS` row
  + one `DERIVED_NORMALIZE_KEYS` line + one `SUPPORTED_SIGNALS` line.
  No new SQL.
- Count-weighting on the median delta preserves the same defensible
  pattern as the existing property YoY — a low-volume month's median
  contributes less, dampening LSOA-grain noise.
- Confidence stamped at 0.85 (same as YoY) — short-horizon doesn't make
  the metric less trustworthy, it just answers a different question.

**Negative / accepted**

- A 6-month window leaves room for seasonality contamination
  (e.g. autumn vs spring property markets). True seasonal adjustment
  would require multi-year decomposition; deferred. For ICP screening
  this is acceptable — the metric is descriptive ("did the area's
  price move?") not predictive.
- Strict full-N-on-both-sides guard means LSOAs with <12 months of
  continuous history get no row. Acceptable — comparing a half-window
  to a full one is misleading.
- The legacy `buildPropertyYoYSql` and `buildRollingSumYoYSql` are
  **not refactored** onto the new parameterized shape. The two YoY
  builders ship a slightly different observed_period label (`YoY ...`
  vs `<N>m ...`) and one of them (property YoY) is calendar-year-keyed
  via `substr(observed_period, 1, 4)` rather than rolling-window-keyed
  via `ROW_NUMBER`. Unifying them is mechanical but not load-bearing;
  defer until a third use case appears.
- Property 6m delta will produce notably fewer rows than property YoY
  because of the strict 12-months-of-continuous-data requirement;
  acceptable (and identical in spirit to volume YoY shipping 1,174
  rows for the same reason).

## Alternatives considered

- **3m / 6m / 12m all at once.** Rejected — Pedro asked for 6m
  specifically. Easy to add 3m later via one spec entry; over-shipping
  windows would clutter the catalog without an ICP question on the
  other end.
- **Latest 3m vs 3m-from-6m-ago (a 6m gap with 3m windows).** Rejected
  — that's a different question (point-spread momentum). The natural
  reading of "6m delta" is "what happened over the last 6 months",
  which the latest-6m-vs-prior-6m structure answers.
- **Seasonal adjustment in v1.** Rejected — adds methodology weight
  without a measured value. Easy to layer later if ICP feedback
  demands it.
- **Refactor buildPropertyYoYSql / buildRollingSumYoYSql into the new
  parameterized builders with `windowMonths: 12` and a label
  override.** Rejected for now — the YoY builders have proven SQL and
  their own snapshots/tests; touching them risks regressions for no
  current ICP value. Unify after another use case lands.
- **`property.transaction_count_change_pct_6m` (volume 6m delta).**
  Rejected for this commit — volume YoY + trend slope already cover
  the momentum question. The price 6m delta is the higher-value gap
  to fill.
