# Endpoints by product

The complete catalog grouped by the four products + cross-cutting Levers + legacy report API + account/billing. See [`docs/ARCHITECTURE/SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) §6 for the deeper version with auth mode + dark-flag annotations.

## Signals

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/area?postcode=…` | Full signal profile for one area |
| GET | `/v1/signals/:category?area=…` | Category-scoped subset |
| GET | `/v1/areas?signal=…&country=…` | Cross-area filter + rank |

## Scores

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/score` | `{area, preset \| weights \| preset_id}` — deterministic composite |

## Monitor

These routes are dark-flagged behind `OGA_SIGNALS_API=true`. When the flag is
off, they 404 by design.

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/portfolios` | Create a portfolio |
| GET | `/v1/portfolios` | List caller's portfolios |
| GET | `/v1/portfolios/:id` | One portfolio + member areas |
| DELETE | `/v1/portfolios/:id` | Delete a portfolio |
| POST | `/v1/portfolios/:id/areas` | Bulk add tracked areas |
| POST | `/v1/portfolios/:id/enrich` | Full signal enrichment for every area |
| POST | `/v1/portfolios/:id/changes` | Diff vs baseline, fire `signal.changed` webhooks |

## Intelligence

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/query` | Typed query plane (programmatic OR NL) |
| POST | `/v1/peers` | k-NN over normalised signals |
| POST | `/v1/insights` | Anomaly screening by peer-relative z |
| POST | `/v1/forecast` | Linear projection for one (signal, area) |

## Levers (per-org configuration — 25 endpoints)

Org CRUD + members under `/v1/orgs/*`; per-org bundles, presets, methodology, cohorts under `/v1/orgs/:id/*`. Full catalog in [`SYSTEM-OVERVIEW.md`](../ARCHITECTURE/SYSTEM-OVERVIEW.md) §6.6.

## Legacy report API (still live)

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/report` | Full report generation (score + AI narrative) — v1 consumer entry |
| POST | `/v1/batch` | Up to `BATCH_MAX_ITEMS` reports per call |
| GET | `/v1/me` | Plan + entitlements + org branding + key allowlist |
| GET | `/me/reports` | List caller's recent reports |

## Webhooks

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/webhooks` | Create subscription (`signal.changed`, `report.created`, …) |
| GET | `/v1/webhooks` | List active subscriptions |
| DELETE | `/v1/webhooks/:id` | Revoke |

## Other

- Stripe: `/stripe/{webhook,portal,checkout,addon-checkout,cancel}`
- Auth credentials: `/auth/{register,resend-verification,forgot-password,reset-password}`
- Session-mode account dashboard: `/usage`, `/settings/*`, `/keys`, `/report/*`, `/watchlist`
- Public health + tracking: `/health`, `/v1/meta`, `/track`, `/widget`
- Cron: `/cron/rescore` (CRON_SECRET-gated)

**Total:** ~76 routes in `apps/api/src/app.ts`.
