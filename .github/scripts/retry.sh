#!/usr/bin/env bash
# Retry a command with backoff, for the signal-refresh cron.
#
# The Neon serverless HTTP driver occasionally throws a transient ETIMEDOUT or
# "fetch failed" on long, heavy queries (a network-level blip, not a query
# error). Every refresh step is idempotent (ON CONFLICT), so re-running a
# failed step is safe. Tune with RETRY_MAX / RETRY_DELAY.
#
#   bash .github/scripts/retry.sh npm run normalize:signals -w @onegoodarea/api
set -uo pipefail

# Log-level + color helpers (OGA_LOG_LEVEL, see logging.sh).
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"

max="${RETRY_MAX:-3}"
delay="${RETRY_DELAY:-30}"
attempt=1

while true; do
  "$@" && exit 0
  code=$?
  if [ "$attempt" -ge "$max" ]; then
    log_error "retry: '$*' failed after $attempt attempts (exit $code)"
    exit "$code"
  fi
  log_warn "retry: '$*' failed (exit $code); attempt $attempt/$max, retrying in ${delay}s ..."
  sleep "$delay"
  attempt=$((attempt + 1))
done
