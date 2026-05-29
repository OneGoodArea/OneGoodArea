# Signal refresh

The signal store is the moat. Monthly cron jobs keep it fresh.

## What runs when

| Job | Cadence | What it does |
|---|---|---|
| `refresh:geo-spine` | One-shot (manual) | Loads ONS NSPL postcodes → geo_lookup. Only re-run when ONS releases a new NSPL |
| `refresh:deprivation` | Annual (when IMD updates) | England IMD 2025 + Wales WIMD 2019 + Scotland SIMD 2020 → signal_values |
| `refresh:property` | Monthly | HM Land Registry Price Paid → property median/count/YoY at LSOA × month |
| `refresh:crime` | Monthly | Police.uk bulk archive (downloaded separately) → crime totals per LSOA × month × category |
| `derive:all` | After any refresh | Recomputes derived signals (YoY, rolling trends, peer-relative z) |
| `normalize:all` | After any refresh | Recomputes percentiles + normalized values within country scope |
| `timeseries:append` | Monthly | Appends an immutable snapshot of current `signal_values` to `signal_timeseries` (the moat clock) |

## How to run

Each job is an npm script in `apps/api`:

```bash
DATABASE_URL=… npm run refresh:deprivation -w @onegoodarea/api
DATABASE_URL=… npm run refresh:property -w @onegoodarea/api
DATABASE_URL=… npm run refresh:crime -w @onegoodarea/api <police-archive-folder>
DATABASE_URL=… npm run derive:all -w @onegoodarea/api
DATABASE_URL=… npm run normalize:all -w @onegoodarea/api
DATABASE_URL=… npm run timeseries:append -w @onegoodarea/api
```

All jobs are **idempotent** — re-running on the same `observed_period` is a no-op (ON CONFLICT DO NOTHING).

## Cron wiring

`.github/workflows/signal-refresh.yml` orchestrates the monthly run on GitHub Actions. Triggered on schedule + manual `workflow_dispatch`. Uses the `DATABASE_URL` GH Actions secret.

Inputs to the manual trigger:
- `dry_run` (boolean) — load + log without writing
- `sources` (string) — comma-separated list to override default order

## Crime archive — manual step

The police.uk bulk archive is too large to download in CI. Workflow:

1. From your laptop, download the latest archive from [data.police.uk/data](https://data.police.uk/data)
2. Upload to a GH Actions artifact OR run locally with the archive folder as the `refresh:crime` arg
3. Future improvement: auto-fetch via the data.police.uk download API once they expose one

## Troubleshooting refreshes

See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) for common failure modes (network timeouts, schema mismatches, partial loads).
