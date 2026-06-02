# Data sources — strategy, current state, and roadmap

How OneGoodArea sources the seven authoritative UK public datasets that feed the signal store. Where each source sits today (in the store on auto-refresh / in the store but stale / live-fetched per request), what the proposed end state is, and the priority order to get there.

> Companion to [`DATA-LAYER.md`](./DATA-LAYER.md) which describes the schema. This document covers the ingest strategy across all sources, not the storage shape.

## The frame: when does a source belong in the store?

Four questions decide it for each source:

1. **What's the update cadence of the source itself?** Static (IMD), monthly (prices, crime), quarterly (OSM infrastructure), real-time (active flood warnings).
2. **Is it needed for cross-area queries?** Anything that `rank_areas` filters or sorts by MUST be in `signal_values`. Live-fetch can serve one-area lookups but cannot answer "rank all LSOAs in Manchester."
3. **What's the cost of live fetch?** Rate limits, latency, reliability, dependency on a third-party uptime.
4. **Does history matter?** If yes, it needs to be in `signal_timeseries` to accrue. Time-series is the moat clock.

A source belongs in the store when the answers are "anything cadence we control" + "yes (cross-area)" + (anything except "negligible") + (anything except "no"). A source stays live when it is genuinely real-time, or when it is used only for fine-grained per-area custom queries that wouldn't fit pre-computed signals.

## Three buckets — current state

| Source | Bucket | What's in DB | What's live | Auto-refresh? |
|---|---|---|---|---|
| Postcodes.io geocoding | **Hybrid** | NSPL spine: `geo_lookup` (1.8M postcodes → LSOA/MSOA/LAD/region/country/lat/lng) and `geo_entities` | Per-postcode metadata not in NSPL (urban/suburban/rural, ward) | NSPL: manual on ONS boundary release |
| Police.uk crime | **In store, stale** | `signal_values` + `signal_timeseries` (1.2M rows / 36 months / 35,724 LSOAs) | Per ADR 0015: no live fallback for store reads | **No** (archive is ~3.9GB, not in CI) |
| Deprivation (IMD/WIMD/SIMD) | **Auto-refreshed** | `signal_values` + `signal_percentiles` (85,280 rows; per-country normalized) | n/a | Yes (monthly cron; no-op until reissue) |
| HM Land Registry prices | **Auto-refreshed (partial)** | `signal_values` + `signal_timeseries` (24 months) | n/a | Yes (current year only; prior-year late registrations miss) |
| OpenStreetMap amenities + transport | **Live only** | Nothing | Overpass API per request | n/a |
| Environment Agency flood | **Live only** | Nothing | EA flood-monitoring API per request | n/a |
| Ofsted schools (England) | **In store, stale** | `ofsted_schools` (seeded once; queried per request via lat/lng + 1.5km haversine) | n/a | **No** (one-time seed) |

Of the 7 sources, 3 are properly in the auto-refresh cron (deprivation, prices, derived signals over both), 3 are in the store but stale (NSPL spine, crime, Ofsted), 1 is fully live-fetch (OSM), and 1 is split (flood — zones are quasi-static, warnings are real-time).

The structural shape is mostly right. The implementation has gaps.

## Per-source strategy

### 1. Postcodes.io geocoding — KEEP HYBRID

The NSPL spine in `geo_lookup` already covers the load-bearing data: postcode → LSOA / MSOA / LAD / region / country / lat / lng. Live postcodes.io calls remain for fields NSPL does not carry cleanly (urban/suburban/rural classification, parliamentary constituency, ward names).

**Action:** keep live-fetch for the metadata tail. If urban/suburban/rural becomes a cross-area filter (e.g. "rural LSOAs in Wales"), extend NSPL columns absorbed into `geo_lookup`. NSPL boundary refresh remains manual on each ONS release (~biannual).

### 2. Police.uk crime — FIX THE OPERATIONAL GAP

Data is already in the store with proven volumes (1.2M rows, 36 months, 35,724 LSOAs). Per ADR 0015 the gap is purely operational: the police.uk bulk archive isn't in CI because it's ~3.9GB.

**Action:** add `refresh:crime` to the monthly cron. Two viable implementations:

- **Option A: GHA download step.** Add a step before `refresh:crime` that downloads the archive from `data.police.uk/data` directly. Archive download is slow but free; the GHA runner has the disk and bandwidth. One extra job step.
- **Option B: Hosted S3 mirror.** OneGoodArea maintains a monthly-refreshed S3 bucket with the unpacked archive; the cron pulls from there. Faster, predictable, costs a few dollars a month for storage and egress.

Recommend **Option A first** as the simpler ship, then move to Option B if download reliability becomes a problem. Either way this is the single highest-leverage refresh job to ship because the data is already in the store, just aging.

### 3. Deprivation — NO CHANGE

In the store, on the cron, no-op until IMD/WIMD/SIMD reissue. The cron run does the right thing on a new release date. The within-country percentile discipline (ADR 0005) refuses cross-GB percentile computation by design.

### 4. HM Land Registry prices — CLOSE THE LATE-REGISTRATION GAP

ADR 0011's "Negative / accepted" section: `refresh:prices` only fetches `$(date -u +%Y)`. Late registrations to prior years silently miss after rollover.

**Action:** during January through March of each new year, also re-fetch the prior year. Two viable implementations:

- **Conditional:** add a GHA step that runs `refresh:prices` with prior year only in months 01-03
- **Always:** run both years every month and accept the redundant work (idempotent, cheap)

Recommend the always-run approach: simpler workflow, no conditional logic, negligible cost given the idempotent upsert pattern.

### 5. OpenStreetMap — INTO THE STORE, QUARTERLY CADENCE, LIVE FALLBACK

OSM amenities and transport is the largest current commercial gap. Compound multi-signal queries cannot include "near strong transport" because transport isn't in the store.

**Action:** build `refresh:osm` following the prices/crime template:

- New derived signals (illustrative, subject to product call): `transport.stations_within_1km`, `transport.distance_to_nearest_station_m`, `amenities.school_count_within_1km`, `amenities.retail_count_within_1km`, `amenities.healthcare_count_within_1km`
- Refresh cadence: **quarterly**, not monthly. Transport infrastructure and amenity geography don't move meaningfully month-to-month at LSOA grain. Quarterly keeps data fresh enough and respects Overpass rate limits.
- Keep live-fetch as a fallback for one-area requests with custom radii (e.g. "amenities within 500m of this specific postcode") that don't fit the pre-computed signals.

**Requires a product call first:** what counts as "strong transport" at LSOA grain? Distance to nearest station? Station count within 1km? Network density? Pick a defensible definition before engineering.

### 6. Environment Agency flood — SPLIT INTO TWO MODES

Flood data has two genuinely different cadences. Forcing both into the same pattern is wrong.

**Action:**

- **Flood zones into the store.** Zone boundaries update ~annually. Build `refresh:flood-zones`, schedule annually or on EA release. Derived signals: `flood.zone_3_pct_lsoa`, `flood.zone_2_pct_lsoa`, `flood.any_zone_lsoa` (boolean).
- **Active flood warnings stay live-fetched.** Warnings change hour-to-hour during weather events; pre-computing them would be wrong. Live calls to `environment.data.gov.uk/flood-monitoring` per request, with a short cache (15-30 minutes) to absorb burst traffic.

### 7. Ofsted — ADD TO MONTHLY CRON

Ofsted publishes new inspection data monthly. The `ofsted_schools` table is in the DB but seeded once and never refreshed.

**Action:** add `refresh:ofsted` to the monthly cron. Ofsted publishes a public bulk download; the refresh job downloads it, parses, upserts by URN. Mechanical work following the existing refresh template. Plus new derived signals like `schools.outstanding_within_2km`, `schools.average_rating_within_2km`, queryable by `rank_areas`.

## The unified proposal

**One sentence:** every source belongs in the store except genuinely real-time data; the refresh runs at the cadence the source itself updates.

Concretely, the monthly cron grows to:

```
migrate
→ refresh:deprivation                  (static; no-op until reissue)
→ refresh:prices (current + prior year)
→ refresh:crime                        (NEW — download archive + load)
→ refresh:ofsted                       (NEW — Ofsted bulk download monthly)
→ derive:signals (non-peer)
→ normalize:signals
→ refresh:peers
→ derive:signals (peer-relative)
→ normalize:signals
→ timeseries:append
```

Plus two additional cron schedules for sources with different cadences:

```yaml
- cron: "0 5 1 */3 *"   # Quarterly: refresh:osm-transport
- cron: "0 5 1 1 *"     # Annually:  refresh:flood-zones
```

Live-fetch remains correct for exactly three things:

- Postcodes.io metadata (urban/suburban/rural until absorbed into NSPL)
- OSM custom-radius amenity queries (the fine-grained tail)
- Active flood warnings (genuinely real-time)

## Priority order

| Priority | Work | Why this slot | Cost |
|---|---|---|---|
| 1 | Crime auto-refresh (Option A: GHA download step) | Data already in store; gap is purely operational. Largest ROI per hour of work | 1-2 days |
| 2 | Prices late-year refresh | One-line workflow change; closes a known accuracy gap per ADR 0011 | 1 hour |
| 3 | Ofsted auto-refresh | Mechanical; data structurally already supported via `ofsted_schools` | 2-3 days |
| 4 | Flood zones into store + active-warning live cache | Insurer Pack unblocker; flood signal becomes filterable in compound queries | 1 week |
| 5 | OSM transport into store | Needs product call first; largest engineering scope; unblocks Site Selection Pack | 2-3 weeks |
| 6 | Postcodes.io NSPL column expansion | Only if a metadata field becomes cross-area-critical | n/a (reactive) |

After all six land, the auto-refresh story is complete: every source either refreshes on its native cadence or stays live for the right reason.

## Operational improvements (independent of per-source work)

Three operational changes should ship regardless of source-coverage work:

1. **Per-source freshness monitoring.** A `data_freshness` panel in the dashboard (per `docs/DESIGN/dashboard-proposal.md`) and an internal Slack alert when a refresh job fails or any source's `source_snapshots.ingested_at` goes stale beyond its expected cadence. Today a silent cron failure goes unnoticed until someone notices the data isn't moving.

2. **Public `data_freshness` endpoint.** `GET /v1/data-freshness` returning per-source `last_refreshed_at`, `expected_cadence`, `freshness_status`. Auditors and compliance teams need to point at it for "when was your crime data last updated?" without a sales call.

3. **Refresh job error envelope.** Currently a failed step exits non-zero and the whole workflow stops. For independent sources (flood vs Ofsted vs prices) one source's transient failure shouldn't block the others. Wrap each refresh in `continue-on-error: true` with an explicit final reporting step so partial-success runs are visible and recoverable.

## What this gets us

**Commercial:**

- Compound multi-signal queries become possible across all seven signal categories (currently blocked by 4 of 7 being live-fetch only or stale)
- The crime drift gap closes; auditors can defend the crime numbers' freshness
- Insurer Pack and Site Selection Pack unblock at the data layer (flood + transport become filterable)

**Operational:**

- Latency on `/v1/area` drops because more data is store-served (no Overpass / EA hops per request)
- The store-read path becomes the default; live-fetch becomes the exception

**Technical:**

- The refresh-job pattern (write-only, idempotent, chunked, parameterized SQL builder) is proven by prices and crime. Each new source is the same shape: refresh job + store-reader + catalog entry + normalize spec
- The `fetch_mode` field shifts from `hybrid` to `store` for more queries; the contract change is non-breaking because it was wire-stamped from day one (ADR 0001)

## Open decisions

1. **Police.uk archive: Option A (GHA download step) vs Option B (hosted S3 mirror)?** Recommend A first, B if reliability becomes a problem.
2. **OSM transport definition.** What counts as "strong transport" at LSOA grain? Needs a product call before engineering.
3. **Flood signal naming.** `flood.zone_3_pct_lsoa` proposed but the actuarial team may have specific preferences (boolean any-zone, percentage area in zone, distance to nearest zone).
4. **Live-fetch cache TTL for active flood warnings.** Likely 15-30 minutes; tighter = more EA load, looser = staler alerts.
5. **Freshness threshold for alerting.** If `refresh:prices` hasn't run in 35 days, alert? 45? Defines the SLA promise on the dashboard freshness panel.

## How to apply

When evaluating any new data source (or proposed addition to an existing source), run the four-question frame at the top of this document. If it should be in the store, follow the refresh-job pattern proven by prices and crime (`docs/adr/0003-source-refresh-jobs.md` is the template). If it should stay live, document why in the source's file header.

The strategic frame stays the same: **the data layer is the product**. Every source that's live-fetched is a source that can't be ranked across, can't accrue history, and can't be normalized into the percentile system. Closing the gap from 3 sources in the auto-refresh cron to 7 is the largest commercial unlock available without new product capability.

## References

- [`DATA-LAYER.md`](./DATA-LAYER.md) — the schema and storage shape
- [`docs/OPERATIONS/SIGNAL-REFRESH.md`](../OPERATIONS/SIGNAL-REFRESH.md) — operational runbook for the cron
- [`docs/adr/0003-source-refresh-jobs.md`](../adr/0003-source-refresh-jobs.md) — refresh-job pattern
- [`docs/adr/0011-prices-into-store.md`](../adr/0011-prices-into-store.md) — prices ingest + the late-registration gap
- [`docs/adr/0015-crime-into-store.md`](../adr/0015-crime-into-store.md) — crime ingest + the no-cron gap
- [`docs/adr/0018-derived-signals-and-write-only-refresh.md`](../adr/0018-derived-signals-and-write-only-refresh.md) — write-only refresh, the operational discipline
