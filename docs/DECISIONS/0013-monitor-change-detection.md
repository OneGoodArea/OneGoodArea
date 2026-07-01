# ADR 0013 — Monitor change detection (`signal.changed`)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0009 (Monitor v1), 0010 (timeseries append), 0011 (prices); MASTER section 4, section 5.

## Context

Monitor v1 (ADR 0009) could track + enrich a book of areas but could not detect
change — it had no history to diff. Now that the time-series accrues and **moves**
(prices, ADR 0011), the moat clock (ADR 0010) can pay off: surface the material
moves in a portfolio and alert on them. This is the Monitor depth.

## Decision

- **Pure diff core** (`change-detection.ts`):
  - `diffSeries` — compare a (signal, geo) series' latest period to a **baseline**
    (`"previous"` = the prior period, or `"first"` = the oldest in range) →
    delta, `pct_change`, `direction` (up/down/flat), `material` (|pct| >=
    threshold). Sorts points; null when < 2 periods (so static signals like
    deprivation produce nothing).
  - `buildChanges` — area-centric, material-only (one row per (area, signal) that
    moved); areas sharing an LSOA each get their own row.
- **I/O orchestration** `detectPortfolioChanges(userId, id, opts)`: ownership via
  `getPortfolio` → resolve areas → LSOA (live geocode, bounded concurrency) →
  read the store (`readTimeseriesForLsoas`) → diff → fire `signal.changed`
  webhooks for material changes (existing webhook infra). All I/O is injectable
  (run / geocode / fire) so the logic is unit-tested without DB or network.
- **`signal.changed`** added to `SUPPORTED_EVENT_TYPES`.
- **Endpoint** `POST /v1/portfolios/:id/changes` (`baseline`, `threshold_pct`,
  `emit`), behind `OGA_SIGNALS_API` + `requireApiAccess`, user-scoped.

## Consequences

**Positive**
- Monitor now **detects change + alerts** — the moat clock delivers product value.
  Proven on prod: a 4-area portfolio surfaced 7 material price moves
  (baseline=first, threshold=5%).
- Correct + configurable; static signals are silent, moving signals bite.

**Negative / accepted**
- **Signal quality, not logic:** single-LSOA *monthly* medians ride on tiny
  samples (often 1-3 sales), so month-over-month moves are noisy (a 47% swing on
  2 sales). The detector is right; **production alerting should gate on sample
  size, use longer windows, or diff the robust annual figure / YoY** — signal
  tuning, deferred (it improves as periods accrue + ADR 0011's annual figure
  gains cross-year history).
- **`signal.changed` only.** `score.changed` (recompute the composite per
  historical period) is deferred — it needs per-period scoring.
- Historical normalized/percentile change isn't surfaced (`signal_timeseries`
  stores raw + null normalized for prices); raw value + pct is the meaningful part.
- Detection is **on-demand** (the endpoint). A scheduled auto-detect cron lands
  when the workflow runs from `main`.

## Alternatives considered

- **`score.changed` now.** Rejected — needs scoring per historical period (a
  bigger build); signal-level change is the useful primitive first.
- **Persist change events to a table.** Rejected for the MVP — compute-on-demand
  from the time-series is simpler and the corpus is the source of truth.
- **Normalize at read time to de-noise.** Deferred — the honest fix is
  sample-size gating + longer/annual windows, tracked as the next increment.
