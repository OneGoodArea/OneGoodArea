# Signal refresh

The signal store is the moat. A monthly GitHub Actions cron keeps it fresh.

## What runs when

`.github/workflows/signal-refresh.yml` runs at 04:00 UTC on the 1st of each
month (and on manual `workflow_dispatch`), against prod Neon via the
`DATABASE_URL` Actions secret. The ordered steps:

| Step | npm script | What it does |
|---|---|---|
| Migrate | `migrate` | Idempotent DDL |
| Deprivation | `refresh:deprivation` | England IMD 2025 + Wales WIMD 2019 + Scotland SIMD 2020 (static; re-runs no-op) |
| Prices | `refresh:prices -- <year>` | HM Land Registry price paid, current year, at LSOA x month |
| Crime | `refresh:crime -- <dir>` | Police.uk street-level crime at LSOA x month. The archive is downloaded in the step (see below) |
| Derive + normalize | `derive:signals`, `normalize:signals` | First pass: YoY, rolling trends, then percentiles within country scope |
| Peers | `refresh:peers` | k-NN peer assignments off the normalized vectors |
| Derive + normalize | `derive:signals`, `normalize:signals` | Second pass: peer-relative-z, then re-normalize |
| Time-series | `timeseries:append` | Appends the monthly snapshot to `signal_timeseries` (the moat clock) |

One-shot, not on the cron: `load:geo` loads the ONS NSPL postcode spine; re-run
only when ONS releases a new NSPL.

All jobs are idempotent; re-running on the same `observed_period` is a no-op.

## Crime archive (auto-downloaded on the cron)

The `refresh:crime` CLI takes a directory of police.uk street CSVs. The cron
step fetches them itself: it downloads the stable rolling ~36-month snapshot
from `https://data.police.uk/data/archive/latest.zip` (~1.6GB), unzips it to a
temp directory (`<YYYY-MM>/<YYYY-MM>-<force>-street.csv`), runs the refresh,
then deletes the archive to reclaim runner disk. Police.uk publishes with a
~2-month lag, so the latest month present trails real time by about two months.

To run it by hand against a local archive:

```bash
DATABASE_URL=... npm run refresh:crime -w @onegoodarea/api -- <police-archive-folder>
```

## Freshness and provenance

Each source refresh writes a row to `source_snapshots` (source, ingested_at,
row_count, notes). To check when crime last updated:

```sql
SELECT ingested_at, row_count, notes
FROM source_snapshots
WHERE source = 'Police.uk street-level crime'
ORDER BY ingested_at DESC
LIMIT 1;
```

## How to run the other jobs

Each job is an npm script in `apps/api`:

```bash
DATABASE_URL=... npm run refresh:deprivation -w @onegoodarea/api
DATABASE_URL=... npm run refresh:prices -w @onegoodarea/api -- 2026
DATABASE_URL=... npm run derive:signals -w @onegoodarea/api
DATABASE_URL=... npm run normalize:signals -w @onegoodarea/api
DATABASE_URL=... npm run timeseries:append -w @onegoodarea/api
```

## Troubleshooting

See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) for common failure modes
(network timeouts, schema mismatches, partial loads).
