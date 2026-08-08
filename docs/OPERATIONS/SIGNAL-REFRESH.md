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
| Ofsted | `refresh:ofsted` | State-funded school inspections into `ofsted_schools`. Resolves the latest gov.uk CSV, geocodes via postcodes.io, reloads with provenance (see below) |
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

The containerized pipeline (below) keeps the archive in the `refresh-cache`
volume instead of deleting it after each run.

## Ofsted (auto-resolved on the cron)

`refresh:ofsted` needs no local file. gov.uk has no stable "latest CSV" URL
(the filename is dated monthly), so the job reads the index page and picks the
"latest inspections as at <date>" CSV, geocodes postcodes via postcodes.io,
and upserts `ofsted_schools`, then deletes any school not in the latest file.
Every row carries an `updated_at` stamp and a `source_snapshots` row is written.

Override the source with an explicit URL if needed:

```bash
DATABASE_URL=... npm run refresh:ofsted -w @onegoodarea/api -- "https://assets.publishing.service.gov.uk/.../file.csv"
```

## Freshness and provenance

Each source refresh writes a row to `source_snapshots` (source, ingested_at,
row_count, notes). To check when a source last updated:

```sql
SELECT ingested_at, row_count, notes
FROM source_snapshots
WHERE source = 'Police.uk street-level crime'  -- or 'Ofsted state-funded school inspections'
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

## Local containerized refresh (AR-766)

The cron pipeline also runs locally in containers, against the compose stack
(postgres + neon-compat-proxy via `NEON_FETCH_ENDPOINT`) instead of prod Neon.
The `signal-refresh` compose service builds the tooling-only `refresh` stage of
`container/api/Containerfile` (no source COPY), then runs
`apps/api/scripts/signal-refresh.sh`, which mirrors the cron steps above and
reuses the shared `.github/scripts/retry.sh` wrapper.

```bash
# One-shot: boots postgres + neon-proxy, then runs the full pipeline
make signal-refresh

# Rebuild just the tooling image (needed after Containerfile / manifest changes)
make signal-refresh-build
```

How it's wired:

- The host repo root is bind-mounted at `/app`, so scripts and
  `.github/scripts/retry.sh` resolve from the host (hot-reload — no rebuild for
  code changes).
- An anonymous `/app/node_modules` volume shadows the mount with the image's
  Linux-installed deps (devcontainer pattern), so the Windows-generated
  lockfile never pollutes Linux runs.
- The ~1.6GB police.uk `latest.zip` is downloaded once and cached in the named
  `refresh-cache` volume (`/cache`), unlike the cron which deletes the archive
  after each run. Delete the volume to force a fresh download:
  `make stack-clean` (also drops all named volumes), or
  `podman volume rm onegoodarea_refresh-cache`.

Environment: `DATABASE_URL` (local Postgres), `NEON_FETCH_ENDPOINT`
(neon-compat-proxy), `REFRESH_CACHE_DIR` (default `/cache`). Set
`OGA_SIGNALS_API`/`OGA_SIGNALS_STORE_READ`/`CRON_SECRET` as needed for the
api service; the refresh job itself only needs the DB + Neon-fetch endpoint.

## Troubleshooting

See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) for common failure modes
(network timeouts, schema mismatches, partial loads).
