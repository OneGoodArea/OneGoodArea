# ADR 0015 — Crime into the store (police.uk bulk archive, LSOA-native)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0006 (geo spine), 0011 (prices), 0013 (change detection); MASTER §3.

## Context

The third store source and the second **dynamic** one (crime accrues monthly,
like prices). The live fetcher queries police.uk per lat/lng (point-based, "near
this point"). For the store we want **LSOA grain** — and the police.uk **bulk
archive** carries an `LSOA code` on every crime row, so aggregation is native (no
spatial point-in-polygon needed). The archive is a large multi-file download
(like NSPL): not in git.

## Decision

- **`refresh/crime.ts`** walks a directory (or a single file) of police
  `*-street.csv` files, streams each, and aggregates **count per (LSOA, month)**.
- **Store model mirrors prices (ADR 0011):**
  - `signal_timeseries`: `crime.monthly_count` per (LSOA, YYYY-MM) — the moat series.
  - `signal_values` (current): `crime.total_12m` (trailing-12-month total) +
    `crime.monthly_rate` (per-month average), which **match `area-profile.ts`** so
    a store-served crime signal equals a live-served one.
- **Self-normalizes** `crime.total_12m` (within country). The append job now
  excludes `crime.%` (crime manages its own monthly history; its `signal_values`
  is a window aggregate).
- **NSPL pattern for the data:** the loader + a committed `seed/police-sample.csv`
  + unit tests ship now (parsing/aggregation proven, and the file-streaming path
  smoke-tested on the sample). The **prod load runs when the archive is
  downloaded** from data.police.uk/data and passed to `refresh:crime <dir>`.

## Consequences

**Positive**
- A second dynamic source is ready; crime moves every month, so change detection
  (ADR 0013) will genuinely bite on it once loaded.
- LSOA-native aggregation — no boundary geometry needed.
- Same refresh/store/normalize pattern as prices = proven, consistent.

**Negative / accepted**
- **Prod load + serve are pending the archive download** (the loader is proven by
  tests + a real-format sample, not yet on prod data). The crime store-read flip
  (a `readCrimeFromStore` mirroring property, ADR 0012) follows once data lands.
- **No cron step yet** — the archive isn't in CI, so a cron `refresh:crime` would
  fail; it waits for a data path (hosted archive or a download step).

## Alternatives considered

- **police.uk API per lat/lng.** Rejected for the store — the street-level API
  doesn't return LSOA, so it would need point-in-polygon against boundaries we
  don't hold. The bulk archive carries LSOA natively.
- **Skip crime for now.** Rejected — it's the cleanest dynamic source after
  prices and the one most likely to move month to month (the change-detection
  payoff).
