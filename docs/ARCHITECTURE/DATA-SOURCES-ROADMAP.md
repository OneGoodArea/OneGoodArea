# Data sources — ingest roadmap

Forward-looking plan to move every source onto the store at its native
cadence. Current state and the decision frame live in
[`DATA-SOURCES.md`](./DATA-SOURCES.md); this doc is the proposed direction
(not all locked — see [Open decisions](#open-decisions)).

**One sentence:** every source belongs in the store except genuinely
real-time data; the refresh runs at the cadence the source itself updates.

## Per-source actions

| Source | Action | Notes |
|---|---|---|
| Postcodes.io geocoding | **Keep hybrid** | NSPL spine carries the load-bearing fields; live-fetch the metadata tail (urban/rural, ward). Absorb into NSPL columns only if a field becomes a cross-area filter. |
| Police.uk crime | **Fix the operational gap** | Data is in the store (1.2M rows / 36 months); it just isn't on the cron because the archive is ~3.9GB. Add `refresh:crime`. Highest ROI. |
| Deprivation (IMD/WIMD/SIMD) | **No change** | In store, on cron, no-op until reissue. Within-country percentile discipline (ADR 0005) stays. |
| HM Land Registry prices | **Close the late-registration gap** | `refresh:prices` only fetches the current year (ADR 0011); late registrations to prior years miss after rollover. Re-fetch prior year too. |
| OpenStreetMap amenities + transport | **Into the store, quarterly, live fallback** | Largest commercial gap — compound queries can't filter "near strong transport". Needs a product call on what "strong transport" means at LSOA grain first. |
| Environment Agency flood | **Split by cadence** | Flood zones → store, annual refresh. Active warnings → stay live (hour-to-hour), short 15–30min cache. |
| Ofsted schools | **Add to monthly cron** | `ofsted_schools` is seeded once, never refreshed. Add `refresh:ofsted` (public bulk download, upsert by URN). |

Crime and prices each have an implementation choice — for crime, a GHA
download step (simpler, ship first) vs a hosted S3 mirror (faster, ~$/mo);
for prices, run both years every month (idempotent, simplest) vs a
conditional Jan–Mar prior-year step. Recommend the simpler option first
in both cases.

## Target cron

The monthly cron grows to:

```
migrate
→ refresh:deprivation                  (static; no-op until reissue)
→ refresh:prices (current + prior year)
→ refresh:crime                        (NEW — download archive + load)
→ refresh:ofsted                       (NEW — Ofsted bulk download monthly)
→ derive:signals (non-peer) → normalize:signals
→ refresh:peers
→ derive:signals (peer-relative) → normalize:signals
→ timeseries:append
```

Plus two off-cadence schedules:

```yaml
- cron: "0 5 1 */3 *"   # Quarterly: refresh:osm-transport
- cron: "0 5 1 1 *"     # Annually:  refresh:flood-zones
```

Live-fetch stays correct for exactly three things: Postcodes.io metadata,
OSM custom-radius amenity queries, and active flood warnings.

## Priority order

| # | Work | Why | Cost |
|---|---|---|---|
| 1 | Crime auto-refresh (GHA download) | Data already in store; gap is purely operational | 1–2 days |
| 2 | Prices late-year refresh | One-line workflow change; closes a known accuracy gap (ADR 0011) | 1 hour |
| 3 | Ofsted auto-refresh | Mechanical; table already exists | 2–3 days |
| 4 | Flood zones into store + warning live-cache | Insurer Pack unblocker | 1 week |
| 5 | OSM transport into store | Needs product call; largest scope; unblocks Site Selection Pack | 2–3 weeks |
| 6 | Postcodes.io NSPL column expansion | Reactive — only if a metadata field becomes cross-area-critical | n/a |

## Operational improvements (independent of source work)

1. **Per-source freshness monitoring** — a `data_freshness` panel (per
   [`dashboard-proposal.md`](../DESIGN/dashboard-proposal.md)) + Slack alert
   when a refresh fails or a source goes stale beyond its cadence.
2. **Public `GET /v1/data-freshness`** — per-source `last_refreshed_at`,
   `expected_cadence`, `freshness_status`, so auditors can self-serve.
3. **Refresh job error envelope** — wrap each refresh `continue-on-error`
   with a final reporting step so one source's failure doesn't block the
   rest.

## What this unlocks

- **Commercial:** compound multi-signal queries across all 7 categories;
  crime freshness defensible; Insurer + Site Selection Packs unblocked.
- **Operational:** lower `/v1/area` latency (store-served, fewer per-request
  hops); store-read becomes the default, live-fetch the exception.
- **Technical:** each new source is the same proven shape (refresh job +
  store-reader + catalog entry + normalize spec); `fetch_mode` shifts from
  `hybrid` to `store` non-breakingly (wire-stamped since ADR 0001).

## Open decisions

1. **Crime archive:** GHA download step vs hosted S3 mirror. (Recommend A first.)
2. **OSM transport definition** — what counts as "strong transport" at LSOA grain?
3. **Flood signal naming** — boolean any-zone vs % area in zone vs distance to nearest.
4. **Active-warning cache TTL** — likely 15–30 min.
5. **Freshness alert threshold** — 35 / 45 days? Defines the dashboard SLA promise.

## References

- [`DATA-SOURCES.md`](./DATA-SOURCES.md) — current state + the decision frame
- [`DATA-LAYER.md`](./DATA-LAYER.md) — schema and storage shape
- [`../OPERATIONS/SIGNAL-REFRESH.md`](../OPERATIONS/SIGNAL-REFRESH.md) — cron runbook
- [`../DECISIONS/0003-source-refresh-jobs.md`](../DECISIONS/0003-source-refresh-jobs.md) — refresh-job pattern (the template)
- [`../DECISIONS/0011-prices-into-store.md`](../DECISIONS/0011-prices-into-store.md) · [`0015-crime-into-store.md`](../DECISIONS/0015-crime-into-store.md) · [`0018-derived-signals-and-write-only-refresh.md`](../DECISIONS/0018-derived-signals-and-write-only-refresh.md)
