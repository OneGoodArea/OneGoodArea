# Data layer — the persisted signal store

The moat. A 7-table Postgres schema on Neon that holds every signal value, normalized score, percentile, and monthly time-series snapshot at LSOA (Lower Super Output Area) grain across England, Wales, and Scotland.

## Why a store

The pre-restructure architecture fetched every dataset live per request — slow + brittle + no history. The store-backed architecture means:
- **Deterministic reads** — same input, same output, same byte
- **Time-series moat** — monthly snapshots accumulate; old answers stay reproducible forever
- **Cheap cross-area queries** — `GET /v1/areas` can rank 43k LSOAs by signal in one SQL query
- **Audit replay** — every score response can cite the exact `signal_value` rows that produced it

## Schema (7 tables)

| Table | What it holds |
|---|---|
| `geo_entities` | The geo spine — every LSOA / MSOA / LAD with name + country |
| `geo_lookup` | 1,806,062 postcodes → LSOA mapping from ONS NSPL |
| `source_snapshots` | Provenance — every source × release_period that was loaded |
| `signals` | Catalog of signal keys (e.g. `property.median_price`, `crime.total_12m`) |
| `signal_values` | The current value per `(geo_code, signal_key)` — `raw_value`, `normalized_value`, `observed_period`, `source` |
| `signal_percentiles` | Percentile rank (0-100) per signal within country scope |
| `signal_timeseries` | Historical monthly snapshots — immutable per `(geo_code, signal_key, observed_period)` |

## Data sources loaded

| Source | Coverage | Status |
|---|---|---|
| ONS NSPL | Geo spine: 1.8M postcodes, 43,916 LSOAs | Loaded |
| IMD 2025 / WIMD 2019 / SIMD 2020 | Deprivation E+W+S | 85,280 store rows + percentiles |
| HM Land Registry | E&W LSOA × month median price + count + YoY | 24 months loaded |
| Police.uk | LSOA × month × category crime | 1.2M rows × 36 months loaded |
| OpenStreetMap | Amenities + transport | Live fetch (store migration pending) |
| Environment Agency | Flood zones + active warnings | Live fetch |
| Ofsted | School inspection ratings (England) | 19,770 schools indexed |

## Refresh jobs

Each source has a `refresh:<source>` CLI under `apps/api/scripts/`. Cron runs them monthly via `.github/workflows/signal-refresh.yml`. See [`docs/OPERATIONS/SIGNAL-REFRESH.md`](../OPERATIONS/SIGNAL-REFRESH.md).

## Read path

Production code reads via `fetchAreaSources()` in `apps/api/src/modules/signals/` — a read-through layer that prefers the store but falls back to live fetch per source. The `OGA_SIGNALS_STORE_READ` env flag gates which sources read from store vs live.

## See also

- [`SYSTEM-OVERVIEW.md`](./SYSTEM-OVERVIEW.md) section 4 — full schema + moat clock rationale
- [`PRODUCTS.md`](./PRODUCTS.md) — what each product reads from the store
- ADRs 0002-0010 in [`docs/adr/`](../adr/) — every schema decision documented
