# Troubleshooting

Common production issues + fixes.

## "Cannot connect to DATABASE_URL"

- Verify the env var is set on Render (apps/api) + Vercel (apps/web) + matches Neon's connection string format
- Neon free tier may auto-suspend an idle DB — first request takes ~5s to wake
- Check `?sslmode=require` is in the connection string

## API returns 401 unexpectedly

- Levers AR-200 added IP allowlist enforcement — a key may have `allowed_ip_cidrs` set. Returns **403 `ip_not_allowed`**, not 401. Check by hitting `/v1/me` and inspecting the `key.allowed_ip_cidrs` field.
- Legacy `aiq_` keys still validate (no prefix gate). If a known key fails, check `api_keys.revoked = FALSE`.

## Signal refresh job hangs

- HM Land Registry SPARQL endpoint times out under load. Retry after 30 minutes.
- Police.uk archive ZIPs sometimes corrupt mid-download. Re-fetch from data.police.uk.
- OpenStreetMap Overpass has aggressive rate limits — use `OGA_OSM_REQUESTS_PER_SECOND=0.5` env to throttle.

## Vitest emits FAIL but no test details

- Usually a module-resolution error before any test runs. Check the path that failed in the error output.
- Common cause after plan 006 (test/src separation): missed import path rewrite. Tests should use `@/` alias for production imports.

## Vercel deploy shows old content

- Plan 006 split apps/web from repo root into `apps/web/`. Vercel Root Directory must be set to `apps/web`. Install command override: `cd ../.. && npm install --no-audit --no-fund`. Build command: `cd ../.. && npm run build -w @onegoodarea/web`.

## Render container fails to start

- Migration may be incomplete. Run `npm run migrate -w @onegoodarea/api` against prod first.
- The Dockerfile uses esbuild to bundle apps/src/server.ts → dist/server.cjs. If build fails, check the build logs for esbuild errors.

## See also

- [`MONITORING.md`](./MONITORING.md) — what to watch
- [`DATABASE-MIGRATIONS.md`](./DATABASE-MIGRATIONS.md) — migration workflow
- [`SIGNAL-REFRESH.md`](./SIGNAL-REFRESH.md) — refresh job mechanics
