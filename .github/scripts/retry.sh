#!/usr/bin/env bash
# Retry a command with backoff, for the signal-refresh cron.
#
# The Neon serverless HTTP driver occasionally throws a transient ETIMEDOUT or
# "fetch failed" on long, heavy queries (a network-level blurb, not a query
# error). Every refresh step is idempotent (ON CONFLICT), so re-running a
# failed step is safe. Tune with RETRY_MAX / RETRY_DELAY.
#
# AR-792 nicety pass: npm's script banners (`> pkg@ver script`, `> tsx …`)
# fragment the structured run log when interleaved with the JSON emitter, and
# npm's own `npm error`/`npm warn` prefixes duplicate the structured
# {"level":"error"}/{"level":"warn"} records emitted by structured-logger.ts.
# For npm/npx invocations we (a) pass --silent so the banners are suppressed
# and (b) strip any residual `^npm (error|warn)` lines from stderr via process
# substitution — leaving one structured record per event and zero banner noise.
# Process substitution (NOT a pipe) preserves the command's real exit code, so
# no PIPESTATUS is required and this stays safe under `bash -c`/dash-style
# callers that only source logging.sh.
#
#   bash .github/scripts/retry.sh npm run normalize:signals -w @onegoodarea/api
set -uo pipefail

# Log-level + color helpers (OGA_LOG_LEVEL, see logging.sh).
# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/logging.sh"

max="${RETRY_MAX:-3}"
delay="${RETRY_DELAY:-30}"
attempt=1

# Snapshot the command once so each retry runs the identical argv.
cmd=("$@")

while true; do
  case "${cmd[0]:-}" in
    npm|npx)
      # Build argv with a single --silent (dedupe any pre-existing one).
      argv=()
      for a in "${cmd[@]:1}"; do
        [ "$a" = "--silent" ] && continue
        argv+=("$a")
      done
      "${cmd[0]}" --silent "${argv[@]}" 2> >(grep -vE '^npm (error|warn)( |$)' >&2)
      code=$?
      ;;
    *)
      "${cmd[@]}" 2> >(grep -vE '^npm (error|warn)( |$)' >&2)
      code=$?
      ;;
  esac

  if [ "$code" -eq 0 ]; then
    exit 0
  fi
  if [ "$attempt" -ge "$max" ]; then
    log_error "retry: '$*' failed after $attempt attempts (exit $code)"
    exit "$code"
  fi
  log_warn "retry: '$*' failed (exit $code); attempt $attempt/$max, retrying in ${delay}s ..."
  sleep "$delay"
  attempt=$((attempt + 1))
done
