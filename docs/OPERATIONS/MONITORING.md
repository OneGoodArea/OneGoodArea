# Monitoring

What to watch in production.

## Health checks

| Surface | Endpoint | What it tells you |
|---|---|---|
| `apps/api` (Render) | `GET https://onegoodarea.onrender.com/health` | `{status:"ok"}` if the Fastify process is up + DB reachable |
| `apps/web` (Vercel) | `GET https://www.onegoodarea.com/api/health` | Same shape (legacy route, still live) |

Both should return 200 in <500ms. Render free-tier instances sleep after 15 minutes idle — first request after sleep takes 30-60s cold start.

## Error tracking

Sentry is wired into both apps (`apps/web/src/instrumentation.ts`, `apps/api/src/...`). Errors propagate to the project at sentry.io. Configure via `SENTRY_DSN` env var per app.

Known low-priority noise to filter:
- Vercel function cold starts emit a single timeout warning on free tier — safe to ignore
- Render free tier sleep wakeup occasionally exceeds the configured idle threshold — safe to ignore

## Structured logging

Both apps log via the structured logger in `apps/api/src/modules/tracking/structured-logger.ts`. Format: `{level, timestamp, message, ctx?}`. Render console + Vercel runtime logs both surface these.

## Key business metrics

| Metric | Where to check |
|---|---|
| API calls per user / month | `/api/v1/me` → `used_this_month` + `limit_this_month` |
| Active subscriptions | `subscriptions` table |
| Webhooks delivered vs failed | `webhook_deliveries` table — `status` field |
| Activity events | `activity_events` table — `event` field |
| Stripe revenue | Stripe Dashboard |

## What to do when something breaks

See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).
