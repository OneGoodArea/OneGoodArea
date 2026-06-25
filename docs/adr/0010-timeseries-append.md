# ADR 0010 — Time-series append (the moat clock)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0002 (schema), ADR 0003 (refresh); MASTER section 3, section 6.

## Context

The compounding, un-backfillable **time-series corpus** is the moat and the fuel
for every trainable model (anomaly, calibration, forecasting) and for Monitor's
change detection. `signal_timeseries` existed (ADR 0002) but was empty — nothing
learns or detects change until it accrues, and every un-snapshotted month is lost
forever. This is the gateway capability.

## Decision

- **`appendTimeseries`** copies current `signal_values` into `signal_timeseries`,
  one row per `(signal_key, geo_type, geo_code, observed_period)`, stamping
  `captured_at`. One set-based `INSERT … SELECT … ON CONFLICT DO NOTHING`
  (in-DB, fast, no row round-trip).
- **Keyed by the source's `observed_period`**, so:
  - static sources (IMD 2025) capture **once** and never duplicate until a new
    release ships a new period;
  - dynamic sources (crime/prices, monthly) accrue a **new row each period**.
- **Immutable per period** (`DO NOTHING`): a period's snapshot is captured once;
  re-running is a no-op. History is append-only.
- **Run after every refresh**, wired into the monthly GitHub Actions cron
  (`migrate → refresh → normalize → timeseries:append`). CLI `timeseries:append`.

## Consequences

**Positive**
- The moat clock is **running** — first snapshot on prod: 85,280 rows
  (IMD 2025 / SIMD 2020 / WIMD 2019). Every month now adds un-backfillable history.
- Cheap + idempotent; the same job serves static and dynamic sources correctly.
- Unblocks the entire AI/learning layer: change detection (Monitor), anomaly,
  calibration, forecasting (trainable models).

**Negative / accepted**
- Value is gated on **dynamic sources moving** — deprivation is static, so its
  series won't change until IMD reissues. The payoff lands when crime/prices enter
  the store (next).
- The append reports its delta via a before/after count (no cheap `rowCount` from
  the serverless driver on `INSERT … SELECT … ON CONFLICT`).

## Alternatives considered

- **Key history by capture month** instead of `observed_period`. Rejected — it
  would duplicate static data monthly and misrepresent when the data actually
  changed. `observed_period` is the honest key.
- **Mutable per-period rows** (DO UPDATE). Rejected — history should be
  append-only/immutable; a correction surfaces as the next period's value.
