# ADR 0020 — Intelligence Increment 3: parameterized rolling-12-month YoY derived signals

- **Status:** Accepted
- **Date:** 2026-05-27
- **Context refs:** ADR 0011 (prices into store), ADR 0015 (crime into store),
  ADR 0018 (derived signals + write-only refresh), ADR 0019 (compound query
  grammar), [[product-architecture-mental-model]] (capability: trainable
  models / corpus is moat), MASTER section 6.

## Context

ADR 0018 shipped the derived-signals layer with one signal:
`property.price_change_pct_yoy` (count-weighted calendar-year YoY). Pedro's
direction for Increment 3 was "more derived signals — each one becomes
queryable through /v1/query immediately, no executor change." The compound
grammar from ADR 0019 makes the *next* derived signal unlock an entirely new
class of ICP question — e.g. "areas where prices ARE rising AND crime is
falling" is now a single typed plan.

Crime and property-volume are the obvious next two: both are monthly counts
already in `signal_timeseries`, both have well-defined ICP value (crime
trend = underwriter / risk signal; transaction volume YoY = market activity
signal), and both fit a single common pattern — **trailing 12-month sum
vs trailing 12-month sum 12 months prior**. Different from the calendar-year
count-weighted approach the price YoY uses (price is a median that must be
weighted by sales; counts just sum).

## Decision

**Extract a parameterized SQL builder** for the rolling-12-month sum YoY
shape, and use it for the two new signals.

`buildRollingSumYoYSql({sourceKey, derivedKey, confidenceReason,
engineVersion?, minPriorSum?})` in
`apps/api/src/modules/signals/refresh/derive.ts`:

- **CTE 1 — `ranked`**: per-LSOA rows for the source signal_key from
  `signal_timeseries`, ranked DESC by `observed_period` (latest = rn 1).
  Restricted to monthly periods (regex `^[0-9]{4}-[0-9]{2}$`) and
  non-null raw values.
- **CTE 2 — `windows`**: per-LSOA `latest_12m` (rn 1..12 sum) +
  `prior_12m` (rn 13..24 sum) + period markers (start/end of each window).
- **CTE 3 — `yoy`**: filter to LSOAs with `latest_months = 12 AND
  prior_months = 12 AND prior_12m > minPriorSum` (default `> 0`),
  compute `(latest - prior) / prior * 100`.
- `INSERT ... SELECT` into `signal_values` keyed on the configured
  `derivedKey`, with `ON CONFLICT (signal_key, geo_type, geo_code) DO
  UPDATE` for idempotency.

Two new signals registered:

| Derived key                                       | Source key (timeseries)        | Direction         |
|---------------------------------------------------|--------------------------------|-------------------|
| `crime.total_12m_change_pct_yoy`                  | `crime.monthly_count`          | lower_is_better   |
| `property.transaction_count_change_pct_yoy`       | `property.transaction_count`   | neutral           |

Each gets a `DERIVED_SIGNALS` catalog entry, a `DERIVED_NORMALIZE_KEYS`
membership (so `normalize:signals` picks them up automatically), and a
`SUPPORTED_SIGNALS` entry in the planner (so NL questions can target them).

`runDerivations` orchestrates: catalog upsert → existing
`buildPropertyYoYSql` → loop over `ROLLING_YOY_SPECS` calling
`buildRollingSumYoYSql` for each. Still WRITE-ONLY (no normalize call —
matches ADR 0018's separation).

## Consequences

**Positive**

- Two new ICP-grade derived signals queryable through `/v1/query` IMMEDIATELY
  via the compound grammar (ADR 0019). E.g.: "England LSOAs with rising
  prices AND falling crime AND high transaction volume" becomes one typed
  plan.
- Adding the next rolling-YoY signal is **one entry in `ROLLING_YOY_SPECS`
  + one `DERIVED_SIGNALS` row + one `DERIVED_NORMALIZE_KEYS` line + one
  `SUPPORTED_SIGNALS` line.** No new SQL.
- The `latest_months = 12 AND prior_months = 12` guard is conservative —
  LSOAs missing any month in either window are excluded, so the YoY signal
  is always over comparable like-for-like windows.
- `prior_12m > 0` (or `> minPriorSum`) avoids divide-by-zero AND avoids
  computing wildly noisy percentages off tiny samples.
- Confidence is stamped at 0.85 (matches the existing derived-signal
  confidence) with a human-readable `confidence_reason` for transparency.

**Negative / accepted**

- The rolling 12-month structure is **different** from the existing
  calendar-year count-weighted `buildPropertyYoYSql`. We deliberately did
  NOT retrofit price YoY to the rolling pattern in this commit:
  count-weighting matters for medians (a single-month median is noisy; the
  count-weighted annual median absorbs the noise) but does NOT matter for
  sums (12 monthly counts always sum the same regardless of weighting).
  Mixing the two is conceptually correct. Future cleanup can either keep
  both or unify both behind a richer parameterized builder.
- The 12-month strict window means LSOAs with <24 months of history get no
  derived value. Acceptable: every consumer of YoY expects a full year of
  prior baseline, and the alternative (partial windows) introduces
  unreliable comparisons.
- `minPriorSum` is currently 0 by default. We could default to a higher
  threshold (e.g. 5 crimes / 5 transactions) to de-noise low-volume LSOAs,
  but the current decision is to emit and let downstream filtering (the
  compound query plan, ranking, etc.) decide what to ignore.
- Engine version is interpolated as a SQL string literal from a constant in
  our own code. Single quotes in any user-configurable spec field are
  defensively escaped via the same pattern as `buildPropertyYoYSql`.

## Alternatives considered

- **Calendar-year YoY (same shape as price YoY).** Rejected for counts:
  early in a new year, a current calendar-year sum is incomplete and
  comparing it to a complete prior year is misleading. Rolling 12-month
  always compares full years and stays fresh.
- **Point-to-point YoY (`latest_month - month_12_ago`).** Rejected:
  single-month counts at LSOA grain are very noisy (crime varies seasonally;
  transactions cluster around bank holidays). Rolling sums smooth this.
- **One bespoke SQL builder per signal.** Rejected — the two new signals
  share the EXACT same structure; duplicating the SQL would be premature
  copy-paste. The parameterized builder is the leverage point that makes
  future rolling YoY signals trivial to add.
- **3m/6m short-horizon momentum, trend slope (linear regression in SQL),
  peer-relative percentile.** Deferred. 3m/6m needs a window-length
  conversation with Pedro (ICP intent: PropTech wants "rising areas" with
  what cadence?). Trend slope is non-trivial in SQL and earns its own ADR.
  Peer-relative percentile depends on the (future) peer-group capability —
  it gets a clean home alongside `/v1/peers` (Increment 6).
