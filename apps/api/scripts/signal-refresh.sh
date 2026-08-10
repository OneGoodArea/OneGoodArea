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

# Log-level + color helpers (OGA_LOG_LEVEL, see logging.sh).
# shellcheck disable=SC1091
source "$ROOT/.github/scripts/logging.sh"

# Row-count helper for the signal-refresh pipeline (AR-792): reports counts for
# the tables affected by this run, before and after, so the delta is visible in
# the persisted run log.
rowcounts="$ROOT/apps/api/scripts/row-counts.ts"
rowcounts_snap="$ROOT/data/logs/rowcounts.before.json"
rowcounts_after="$ROOT/data/logs/rowcounts.after.json"

# Persist every line of this run to a timestamped file under data/logs/ (bind-
# mounted to the host; the dir is created by the container, which runs as root,
# so host permissions on the root-owned data/ volume are no obstacle). We wrap the
# whole pipeline in _main and pipe through tee, then propagate its real exit
# code via PIPESTATUS so make detects failures.
mkdir -p "$ROOT/data/logs"
LOG_FILE="$ROOT/data/logs/signal-refresh-$(date -u +%Y%m%d-%H%M%S).log"
log_info "signal-refresh: persisting run log to $LOG_FILE"

run_pipeline() {
  log_info "signal-refresh: row counts BEFORE the pipeline (print)"
  npx tsx "$rowcounts" print
  npx tsx "$rowcounts" snapshot > "$rowcounts_snap"

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
    log_info "signal-refresh: downloading police.uk latest.zip ..."
    # shellcheck disable=SC2046
    curl $(curl_quiet_flags) -fSL --retry 3 --retry-delay 15 -o "$cache_dir/latest.zip" https://data.police.uk/data/archive/latest.zip
    unzip -q -o "$cache_dir/latest.zip" -d "$archive_dir"
    rm -f "$cache_dir/latest.zip"
  else
    log_info "signal-refresh: reusing cached police.uk archive in $archive_dir"
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

  # Report row counts AFTER the pipeline and print the delta vs the snapshot.
  log_info "signal-refresh: row counts AFTER the pipeline (print)"
  npx tsx "$rowcounts" snapshot > "$rowcounts_after"
  npx tsx "$rowcounts" print
  log_info "signal-refresh: row-count delta (after - before)"
  npx tsx "$rowcounts" diff "$rowcounts_snap" "$rowcounts_after"
  log_info "signal-refresh: pipeline complete"
}

# tee to the timestamped log, preserving run_pipeline's exit code.
if [ -t 1 ]; then
  run_pipeline 2>&1 | tee "$LOG_FILE"
else
  run_pipeline 2>&1 | tee "$LOG_FILE"
fi
exit "${PIPESTATUS[0]}"
