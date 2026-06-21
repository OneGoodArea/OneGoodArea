# Operations

Runbooks for everyday tasks. If you're operating OneGoodArea (deploying, refreshing data, debugging prod), start here.

## Documents

| File | When to read |
|---|---|
| [`LOCAL-SETUP.md`](./LOCAL-SETUP.md) | First clone — get the apps running on your machine in <5 minutes |
| [`CONTAINERS-SETUP.md`](./CONTAINERS-SETUP.md) | What the containers are prepared for |
| [`DATABASE-MIGRATIONS.md`](./DATABASE-MIGRATIONS.md) | Adding/modifying a table; running migrations on prod Neon |
| [`SIGNAL-REFRESH.md`](./SIGNAL-REFRESH.md) | Running the monthly cron jobs (deprivation, prices, crime, time-series) |
| [`COVERAGE.md`](./COVERAGE.md) | Running code coverage, reading reports, understanding thresholds |
| [`MONITORING.md`](./MONITORING.md) | Health checks, error tracking, observability |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | When something's broken in prod — known issues + fixes |

## Related

- [`docs/ARCHITECTURE/DEPLOYMENTS.md`](../ARCHITECTURE/DEPLOYMENTS.md) — the deploy topology (Render + Vercel + Neon)
- [`docs/ARCHITECTURE/DATA-LAYER.md`](../ARCHITECTURE/DATA-LAYER.md) — what the refresh jobs write to
- [`docs/ENGINEERING/`](../ENGINEERING/) — code-style + testing strategy
