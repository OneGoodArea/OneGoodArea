# ADR 0012 — Serve property (prices) from the store on `/v1/area`

- **Status:** Accepted
- **Date:** 2026-05-26
- **Context refs:** ADR 0004 (deprivation store-read), 0011 (prices ingest); MASTER section 3.

## Context

ADR 0011 ingested prices into the store, but `/v1/area` (and `/v1/score`) still
fetched property **live** per request. This is the store-read flip for property,
mirroring the deprivation flip (ADR 0004): serve the persisted, normalized price
from the store, fall back to live on a miss.

Two wrinkles property has that deprivation didn't:
1. **Grain differs.** The live fetcher returns a **postcode-district** median;
   the store holds an **LSOA** figure. So this is not byte-identical like
   deprivation was — it is a deliberate, finer-grained (and normalized) value.
2. **Quality.** The store's monthly value for one LSOA is often 1-5 sales
   (noisy). Serving a single month as "the median price" would be poor.

## Decision

- **Robust current value.** `bucketsToRows` now writes `signal_values` as the
  **median over the whole window's sales** per LSOA (a true median of all the
  period's raw prices) + the **total** transaction count, with `observed_period`
  = the window (e.g. `"2025-01 to 2025-12"`). The monthly `signal_timeseries`
  rows are unchanged (granular history). So the served/normalized headline is
  robust; the moat stays granular.
- **Shared store-read.** `fetchAreaSources` (used by **both** Signals and Scores)
  reads property from the store behind `OGA_SIGNALS_STORE_READ` when present,
  skipping the live fetch. `store-reader.readPropertyFromStore` reconstructs the
  `PropertyPriceData` fields the mapper + engine actually read (median, count,
  postcode_area, period); unused fields are safe-filled.
- **Provenance + normalization.** `fetch_mode = "hybrid"` when deprivation **or**
  property is store-backed; `getAreaProfile` enriches the property signals with
  their stored `normalized_value` + national `percentile`. Consistent now,
  because the served value **is** the normalized value.
- **Append exclusion.** The monthly append job (ADR 0010) now excludes
  `property.%` — prices write their own monthly history and their
  `signal_values` is a window aggregate, not a single monthly observation.

## Consequences

**Positive**
- Prices are now **served + normalized + percentiled** on `/v1/area`, at LSOA
  grain. Verified on prod: E01000002 £925k / 98th pctile (38 sales);
  E01005207 £207k / 24th pctile (15 sales).
- Signals and Scores describe an area with the **same** property number
  (coherent), and both benefit from the store (one less live call).

**Negative / accepted**
- **Behavior change for store-backed scoring** (gated by the flag): property
  grain shifts district→LSOA, and `price_change_pct` (YoY) is **null** from the
  store for now, so the engine's price-trend reasoning is skipped for store-backed
  areas. Blast radius = the standalone `apps/api` (pre-launch, ~no consumers);
  the live consumer site still runs the monolith. The golden master is
  unaffected (engine inputs are fixed in tests).
- Scotland (and any LSOA with no sales) **misses → live fallback** (Land Registry
  is England & Wales only).

## Alternatives considered

- **Serve the latest single month** as current. Rejected — noisy at LSOA grain.
- **Reader-side trailing-window aggregation** (leave `signal_values` monthly,
  aggregate at read time). Rejected — it would break the link between the served
  value and its stored normalization/percentile (you'd normalize one figure and
  serve another). Ingest-time window median keeps them identical.
- **Flip Signals but not Scores.** Rejected — `/v1/area` and `/v1/score` should
  report the same price for the same area; the shared `fetchAreaSources` gives
  that for free.
- **YoY from the store now.** Deferred — a clean cross-year design over the
  monthly series (backfill 2024+) is a follow-up; null is honest until then.
