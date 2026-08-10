#!/usr/bin/env bash
# Lightweight structured logger + curl flags for the signal-refresh pipeline.
#
# Bash companion to apps/api/src/modules/tracking/structured-logger.ts (AR-792).
# Mirrors the same level set + rank ordering so shell and TS logs behave the same
# when mixed in a single pipeline output:
#
#   trace(0) < debug(1) < verbose(2) < info(3) < warn(4) < error(5)
#
# Env:
#   OGA_LOG_LEVEL        one of the levels above (default: info).
#   FORCE_COLOR / NO_COLOR   color control (same as picocolors: FORCE_COLOR forces
#                            ANSI on even when not a TTY; NO_COLOR disables).
#
# Sourced by signal-refresh.sh, retry.sh, and .github/workflows/signal-refresh.yml.

# Guard against double-sourcing WITHIN the same shell only. Deliberately NOT
# exported: each `bash "$retry"` / workflow step is a fresh process that must
# re-source and get the function definitions. An exported guard would be
# inherited by child shells and short-circuit their source, leaving log_*
# undefined there.
[ "${OGA_LOGGING_SOURCED:-0}" = "1" ] && return 0 2>/dev/null || true
OGA_LOGGING_SOURCED=1

# --- level resolution -------------------------------------------------------
oga_log_levels=(trace debug verbose info warn error)
_oga_level_rank() {
  local level="$1" i
  for i in "${!oga_log_levels[@]}"; do
    [ "${oga_log_levels[$i]}" = "$level" ] && { echo "$i"; return 0; }
  done
  echo 3
}

_oga_chosen="${OGA_LOG_LEVEL:-info}"
case "$_oga_chosen" in
  trace|debug|verbose|info|warn|error) ;;
  *) _oga_chosen="info" ;;
esac
_oga_log_level_rank="$(_oga_level_rank "$_oga_chosen")"

# --- color detection (mirrors picocolors) -----------------------------------
# picocolors: color supported when FORCE_COLOR set and NO_COLOR unset.
_oga_use_color=0
[ -n "${FORCE_COLOR:-}" ] && [ -z "${NO_COLOR:-}" ] && _oga_use_color=1

# ANSI color codes (empty when color disabled).
if [ "$_oga_use_color" = "1" ]; then
  _OGAC_GRAY=$'\033[90m'
  _OGAC_CYAN=$'\033[36m'
  _OGAC_BLUE=$'\033[34m'
  _OGAC_GREEN=$'\033[32m'
  _OGAC_YELLOW=$'\033[33m'
  _OGAC_RED=$'\033[31m'
  _OGAC_RESET=$'\033[0m'
else
  _OGAC_GRAY="" _OGAC_CYAN="" _OGAC_BLUE="" _OGAC_GREEN=""
  _OGAC_YELLOW="" _OGAC_RED="" _OGAC_RESET=""
fi

_oga_color() {
  case "$1" in
    trace)   printf '%s' "$_OGAC_GRAY"   ;;
    debug)   printf '%s' "$_OGAC_CYAN"   ;;
    verbose) printf '%s' "$_OGAC_BLUE"   ;;
    info)    printf '%s' "$_OGAC_GREEN"  ;;
    warn)    printf '%s' "$_OGAC_YELLOW" ;;
    error)   printf '%s' "$_OGAC_RED"    ;;
    *)       printf '%s' "" ;;
  esac
}

# Internal: emit one line if its rank >= configured level rank.
_oga_emit() {
  local level="$1" rank target
  shift
  target="$(_oga_level_rank "$level")"
  case "$level" in
    trace) rank=0;; debug) rank=1;; verbose) rank=2;;
    info) rank=3;; warn) rank=4;; error) rank=5;;
    *) rank="$_oga_log_level_rank"; level="info" ;;
  esac
  if [ "$rank" -ge "$_oga_log_level_rank" ]; then
    local color reset ts prefix
    color="$(_oga_color "$level")"
    reset="$_OGAC_RESET"
    ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    prefix="[$ts] [$level]"
    if [ "$_oga_use_color" = "1" ]; then
      printf '%s%s%s\n' "$color" "$prefix $*" "$reset" >&2
    else
      printf '%s %s\n' "$prefix" "$*" >&2
    fi
  fi
}

log_trace()   { _oga_emit trace   "$*"; }
log_debug()   { _oga_emit debug   "$*"; }
log_verbose() { _oga_emit verbose "$*"; }
log_info()    { _oga_emit info    "$*"; }
log_warn()    { _oga_emit warn    "$*"; }
log_error()   { _oga_emit error   "$*"; }

# Flags for curl that keep it quiet unless OGA_LOG_LEVEL is debug-or-louder.
# In verbose/debug we let curl print progress; otherwise silence it.
curl_quiet_flags() {
  if [ "$_oga_log_level_rank" -le 1 ]; then
    printf '%s' ""
  else
    printf '%s' "-s"
  fi
}
