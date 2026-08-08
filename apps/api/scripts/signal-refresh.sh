#!/usr/bin/env bash
# Containerized signal-refresh orchestrator (AR-766).
#
# Mirrors .github/workflows/signal-refresh.yml step-for-step, but runs against
# the LOCAL compose stack (postgres + neon-compat-proxy) via NEON_FETCH_ENDPOINT
# instead of prod Neon. The host repo root is bind-mounted at /app, so the
# shared .github/scripts/retry.sh is reachable here.
#
# Env:
#   DATABASE_URL        local Postgres DSN (see the compose service)
#   NEON_FETCH_ENDPOINT local neon-compat-proxy /sql endpoint
#   REFRESH_CACHE_DIR   where the police.uk archive lives (default: /cache)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
retry="$ROOT/.github/scripts/retry.sh"
cache_dir="${REFRESH_CACHE_DIR:-/cache}"
archive_dir="$cache_dir/archive"

# 1. Migrate (idempotent DDL)
bash "$retry" npm run migrate -w @onegoodarea/api
# 2. Deprivation (England/Wales/Scotland IMD; static, re-runs no-op)
bash "$retry" npm run refresh:deprivation -w @onegoodarea/api
# 3. Prices (HM Land Registry, current year)
bash "$retry" npm run refresh:prices -w @onegoodarea/api -- "$(date -u +%Y)"
# 4. Crime (police.uk latest archive, cached across runs). The ~1.6GB
#    latest.zip is downloaded once and kept in REFRESH_CACHE_DIR; delete that
#    dir (or the named volume) to force a fresh download.
if [ ! -d "$archive_dir" ] || [ "$(find "$archive_dir" -name '*-street.csv' 2>/dev/null | wc -l)" -eq 0 ]; then
  mkdir -p "$cache_dir"
  echo "signal-refresh: downloading police.uk latest.zip ..."
  curl -fSL --retry 3 --retry-delay 15 -o "$cache_dir/latest.zip" https://data.police.uk/data/archive/latest.zip
  unzip -q -o "$cache_dir/latest.zip" -d "$archive_dir"
  rm -f "$cache_dir/latest.zip"
else
  echo "signal-refresh: reusing cached police.uk archive in $archive_dir"
fi
bash "$retry" npm run refresh:crime -w @onegoodarea/api -- "$archive_dir"
# 5. Ofsted (auto-resolves the latest gov.uk inspections CSV)
bash "$retry" npm run refresh:ofsted -w @onegoodarea/api
# 6. First derive pass: YoY / 6m / trend-slope (peer-relative-z no-ops while
#    peer_assignments is empty)
bash "$retry" npm run derive:signals -w @onegoodarea/api
bash "$retry" npm run normalize:signals -w @onegoodarea/api
# 7. Refresh peer assignments (k-NN off the normalized vectors)
bash "$retry" npm run refresh:peers -w @onegoodarea/api
# 8. Second derive pass: peer-relative-z signals
bash "$retry" npm run derive:signals -w @onegoodarea/api
bash "$retry" npm run normalize:signals -w @onegoodarea/api
# 9. Append time-series (the moat clock — un-backfillable history)
bash "$retry" npm run timeseries:append -w @onegoodarea/api
