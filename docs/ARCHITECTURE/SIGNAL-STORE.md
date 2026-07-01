# Signal Store — the moat

The persisted signal store on Neon Postgres is the core asset. Everything downstream (Signals, Scores, Monitor, Intelligence) reads from it.

## Tables

Source: `apps/api/src/infrastructure/db/schema.ts`

| Table | Rows | What it holds |
|---|---:|---|
| `geo_lookup` | 1,806,062 | NSPL postcode→LSOA→MSOA→LAD→region spine |
| `geo_entities` | 43,916 | LSOA metadata (name, country) |
| `signals` | ~20 | Catalog: one row per signal key with label/unit/direction/source |
| `signal_values` | ~280k | Current value per (signal_key, geo). Raw + normalised + percentile + confidence |
| `signal_percentiles` | ~280k | National-within-country percentile rank |
| `signal_timeseries` | ~1.5M+ | Append-only history. Crime: 1.2M monthly rows. Property: 35k × 24 months |
| `peer_assignments` | 675,080 | Materialised k-NN graph (33,754 English LSOAs × 20 peers) |
| `source_snapshots` | ~10 | Provenance of each refresh run |
| `portfolios` + `portfolio_areas` | per-user | Monitor product storage |

## Derived signals (9)

Computed in-DB from time-series during the monthly cron:

| Key | Direction | What it is |
|---|---|---|
| `property.price_change_pct_yoy` | neutral | Calendar-year YoY count-weighted median sale price change |
| `property.median_price_change_pct_6m` | neutral | Latest 6m vs prior 6m |
| `property.transaction_count_change_pct_yoy` | neutral | Trailing 12m transaction volume YoY |
| `property.transaction_count_trend_slope_24m` | neutral | regr_slope over 24m monthly transaction volume |
| `property.median_price_peer_relative_z` | neutral | Z-score of price vs k-NN peer set |
| `crime.total_12m_change_pct_yoy` | lower_is_better | Trailing 12m crime sum YoY |
| `crime.total_6m_change_pct` | lower_is_better | Latest 6m vs prior 6m |
| `crime.monthly_count_trend_slope_24m` | lower_is_better | regr_slope over 24m monthly crime |
| `crime.total_12m_peer_relative_z` | lower_is_better | Z-score of crime vs peer set |

All 9 are queryable through `/v1/query rank_areas` as ordinary signals.

## Monthly cron

`.github/workflows/signal-refresh.yml` — fires `0 4 1 * *` (04:00 UTC on the 1st):

```
migrate → refresh:deprivation → refresh:prices → derive:signals (non-peer)
→ normalize:signals → refresh:peers → derive:signals (peer-relative)
→ normalize:signals → timeseries:append
```

Every step is idempotent (`ON CONFLICT DO UPDATE` / `DO NOTHING`). Re-running is safe.

## See also

- [`DATA-LAYER.md`](./DATA-LAYER.md) — schema rationale + data sources
- [`DATA-SOURCES.md`](./DATA-SOURCES.md) — ingest strategy per source
- ADRs 0002-0010 in [`DECISIONS/`](../DECISIONS/) — every schema decision
