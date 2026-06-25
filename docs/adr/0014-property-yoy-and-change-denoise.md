# ADR 0014 — Property YoY from the store + change-detection de-noising

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0011 (prices), 0012 (property store-read), 0013 (change detection); MASTER section 4, section 7.

## Context

Two honest gaps were left open by ADR 0012/0013:
1. **Property YoY** (`price_change_pct`) was served as `null` from the store — it
   needed cross-year history, which didn't exist (only 2025 was loaded).
2. **Change detection was noisy** — single-LSOA *monthly* medians ride on tiny
   samples, so a 2-sale month produced 47% "moves" that aren't signal.

Both are now addressable: a 2024 backfill gives two years of monthly history.

## Decision

- **Two years backfilled** (2024 + 2025) on prod, so `signal_timeseries` holds
  24 monthly points per LSOA; the current `signal_values` stays the latest year
  (2025).
- **YoY from the store** (`computeYoY`, pure): group the monthly (median, count)
  points by calendar year, form a **transaction-count-weighted** annual figure
  per year (volume weighting stops a 1-sale month dominating), compare the two
  most recent years. `readPropertyFromStore` now serves `price_change_pct` +
  `prior_median` from this; null when < 2 years. The **headline `median_price`
  stays the true annual median** from `signal_values` (the YoY % is the
  cross-year trend on the volume-weighted aggregate — a defensible, documented
  split).
- **Sample-size gating** (`buildChanges`, `minTransactions`, default **8**): a
  price move is only material if **both** periods had >= N transactions, using
  the `property.transaction_count` series. This filters the small-sample noise.
- **Count series are sample inputs, not alert subjects** — `property.transaction_count`
  is used to gate, never itself emitted as a `signal.changed` (a "2 sales became
  1" move is noise, not an alert). Exposed as `min_transactions` on the endpoint.

## Consequences

**Positive**
- YoY served + proven on prod: City of London +18.5% (£911k→£925k), Manchester
  +16.6% (£169k→£207k). The engine's price-trend reasoning works for store-backed
  areas again.
- Change detection de-noised + proven: a city-centre portfolio went from 3
  material moves (no gate) to 0 (gate >= 8) — its LSOAs have < 8 sales/month, so
  the moves were noise. Higher-volume areas' real moves survive.
- 24 months of history deepens the moat.

**Negative / accepted**
- The YoY % is computed on a volume-weighted mean-of-monthly-medians, while the
  headline is a true annual median — two slightly different central measures.
  Acceptable for a trend %; a single unified annual-median-per-year (stored) is a
  future refinement.
- A high `min_transactions` can suppress real moves in genuinely low-volume rural
  LSOAs — it is a tunable, defaulted conservatively, not a hard rule.

## Alternatives considered

- **Store an annual median per year** (a yearly `signal_timeseries` row) for
  exact YoY. Rejected for now — mixing annual + monthly period keys pollutes the
  monthly series that change detection reads; the read-time aggregate is simpler.
- **Normalize/smooth instead of gating.** Gating on the real sample size is the
  most honest de-noise (it says "we don't have enough sales to call this"), and
  it composes with longer baselines later.
