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

max="${RETRY_MAX:-3}"
delay="${RETRY_DELAY:-30}"
attempt=1

while true; do
  "$@" && exit 0
  code=$?
  if [ "$attempt" -ge "$max" ]; then
    echo "retry: '$*' failed after $attempt attempts (exit $code)" >&2
    exit "$code"
  fi
  echo "retry: '$*' failed (exit $code); attempt $attempt/$max, retrying in ${delay}s ..." >&2
  sleep "$delay"
  attempt=$((attempt + 1))
done
