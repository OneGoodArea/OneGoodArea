# Data sources — current state

How OneGoodArea sources the seven authoritative UK public datasets that
feed the signal store, and where each sits today (in the store on
auto-refresh / in the store but stale / live-fetched per request).

> Companion to [`DATA-LAYER.md`](./DATA-LAYER.md) (the schema) and
> [`DATA-SOURCES-ROADMAP.md`](./DATA-SOURCES-ROADMAP.md) (the proposed
> direction). This doc is the current state + the decision frame.

## The frame: when does a source belong in the store?

Four questions decide it for each source:

1. **Update cadence of the source itself?** Static (IMD), monthly (prices, crime), quarterly (OSM), real-time (active flood warnings).
2. **Needed for cross-area queries?** Anything `rank_areas` filters or sorts by MUST be in `signal_values`. Live-fetch serves one-area lookups but can't rank all LSOAs in a region.
3. **Cost of live fetch?** Rate limits, latency, reliability, third-party uptime.
4. **Does history matter?** If yes it needs `signal_timeseries` to accrue — time-series is the moat clock.

A source belongs in the store when cadence is controllable, it's needed
cross-area, fetch cost isn't negligible, or history matters. It stays live
when it's genuinely real-time, or used only for fine-grained per-area
custom queries that wouldn't fit pre-computed signals.

## Three buckets — current state

| Source | Bucket | What's in DB | What's live | Auto-refresh? |
|---|---|---|---|---|
| Postcodes.io geocoding | **Hybrid** | NSPL spine: `geo_lookup` (1.8M postcodes → LSOA/MSOA/LAD/region/country/lat/lng), `geo_entities` | Per-postcode metadata not in NSPL (urban/rural, ward) | NSPL: manual on ONS boundary release |
| Police.uk crime | **In store, stale** | `signal_values` + `signal_timeseries` (1.2M rows / 36 months / 35,724 LSOAs) | No live fallback (ADR 0015) | **No** (archive ~3.9GB, not in CI) |
| Deprivation (IMD/WIMD/SIMD) | **Auto-refreshed** | `signal_values` + `signal_percentiles` (85,280 rows; per-country normalized) | n/a | Yes (monthly cron; no-op until reissue) |
| HM Land Registry prices | **Auto-refreshed (partial)** | `signal_values` + `signal_timeseries` (24 months) | n/a | Yes (current year only; prior-year late registrations miss) |
| OpenStreetMap amenities + transport | **Live only** | Nothing | Overpass API per request | n/a |
| Environment Agency flood | **Live only** | Nothing | EA flood-monitoring API per request | n/a |
| Ofsted schools (England) | **In store, stale** | `ofsted_schools` (seeded once; queried per request via lat/lng + 1.5km haversine) | n/a | **No** (one-time seed) |

Of the 7 sources: 3 are properly in the auto-refresh cron (deprivation,
prices, derived signals over both), 3 are in the store but stale (NSPL
spine, crime, Ofsted), 1 is fully live-fetch (OSM), and 1 is split (flood —
zones quasi-static, warnings real-time). The structural shape is mostly
right; the implementation has gaps — see the
[roadmap](./DATA-SOURCES-ROADMAP.md).

## How to apply

When evaluating any new data source, run the four-question frame above. If
it belongs in the store, follow the refresh-job pattern proven by prices
and crime ([`0003-source-refresh-jobs.md`](../DECISIONS/0003-source-refresh-jobs.md)
is the template). If it stays live, document why in the source's header.

The strategic frame: **the data layer is the product**. Every live-fetched
source is one that can't be ranked across, can't accrue history, and can't
be normalized into the percentile system.

## References

- [`DATA-SOURCES-ROADMAP.md`](./DATA-SOURCES-ROADMAP.md) — the ingest roadmap + priorities
- [`DATA-LAYER.md`](./DATA-LAYER.md) — the schema and storage shape
- [`../OPERATIONS/SIGNAL-REFRESH.md`](../OPERATIONS/SIGNAL-REFRESH.md) — operational runbook for the cron
- [`../DECISIONS/0003-source-refresh-jobs.md`](../DECISIONS/0003-source-refresh-jobs.md) — refresh-job pattern
