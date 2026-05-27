# ADR 0011 — HM Land Registry prices into the store (the first dynamic + backfilled source)

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0002 (schema), 0003 (refresh), 0005 (normalization), 0006 (geo spine), 0010 (timeseries append); MASTER §3, §7.

## Context

The store had one source (deprivation), which is **static** — its time-series can't
move. The moat clock (ADR 0010) only delivers value once a **dynamic** source
accrues real history. Prices are the highest-value property signal for every ICP
(PropTech / lenders / insurers) and, crucially, HM Land Registry Price Paid is a
**published historical archive** — so unlike live-captured signals it can be
**backfilled** with real monthly history immediately (the "un-backfillable"
caveat in ADR 0010 only applies to signals with no authoritative past).

## Decision

- **`refresh/prices.ts`** ingests HM Land Registry Price Paid into the store at
  **LSOA × month** grain. Pipeline: stream the PP CSV (no header) → parse
  (price, month, postcode) → map postcode → LSOA via the ONS spine (`geo_lookup`)
  → bucket prices by `(LSOA, YYYY-MM)` → **median price** + **transaction count**
  per bucket.
- **Signal keys match `area-profile.ts`** (`property.median_price`,
  `property.transaction_count`) so a store-served price is identical to a
  live-served one (precondition for a later serve-from-store flip).
- **Filtering for a clean residential median:** PPD category A (standard market
  sales only), residential property types (D/S/T/F, excludes O), non-deleted
  records, positive prices.
- **Writes both halves of the store:** the **latest month per LSOA** →
  `signal_values` (current); **every month** → `signal_timeseries` (the backfilled
  history). The timeseries write is **DO UPDATE** (`upsertSignalTimeseries`) —
  the archive is authoritative and adds late-registered sales to past months, so
  re-running corrects history. This is deliberately distinct from the append job
  (ADR 0010), which is DO NOTHING because live signals have no authoritative past.
- **Self-normalizes** (`normalizeSignals`, generalized out of the deprivation
  job) — `property.median_price` gets national-within-country percentiles.
- **Coverage: England & Wales only** (Land Registry's remit; Scotland prices are
  Registers of Scotland, a separate source — out of scope, like deprivation is
  per-country).
- **Memory-safe at scale:** streams the file (never buffered whole) and builds
  the E&W postcode→LSOA map by keyset pagination (no giant single result set).
- **Cron:** added `refresh:prices` for the current year to the monthly workflow
  (`migrate → refresh:deprivation → normalize → refresh:prices → timeseries:append`).

## Consequences

**Positive**
- The corpus now **moves**: proven on prod — 718,534 standard residential sales
  (2025) → 35,606 E&W LSOAs × 12 months → 71,212 current values + 626,022 history
  rows; all `property.median_price` normalized + percentiled. A real per-LSOA
  monthly price series now exists (e.g. City of London E01000002 at the 99th
  percentile nationally).
- Unblocks **Monitor change detection** (something real to diff) and the
  **trainable models** (a moving series to learn on).
- The store now serves **two** sources; the refresh pattern is proven reusable.

**Negative / accepted**
- **Not yet served on `/v1/area`** — area-profile still fetches property live;
  the store-read flip for `property.*` is the next increment (mirrors the
  deprivation `OGA_SIGNALS_STORE_READ` path in ADR 0004).
- Sparse LSOA-months (few sales) give noisy medians — encoded in `confidence`
  (scales with transaction count), not hidden.
- Cron runs the current-year file monthly; late registrations posted to a prior
  year after the rollover need a periodic full-year (or monthly-update file)
  re-run — noted, not automated yet.

## Alternatives considered

- **Stage raw transactions in a temp table + median in SQL** (`percentile_cont`).
  Rejected for the first cut — ~1M staging inserts per run is far more DB traffic
  than streaming + in-app aggregation, which writes only the ~35k×12 aggregates.
- **Crime first** (police.uk). Deferred — crime aggregation to LSOA wants the
  bulk monthly archive (a large download, like NSPL was), whereas prices fetch a
  single yearly CSV in-job and are cleanly postcode-keyed to the spine we already
  loaded. Prices was the higher value/effort source to do first.
