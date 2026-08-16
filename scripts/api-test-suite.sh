#!/usr/bin/env bash

################################################################################
# OneGoodArea API Test Suite  (AR-849: dynamic endpoints)
#
# Discovers and tests the live API by generating a plan from $DOMAIN/docs/json
# (the OpenAPI document Fastify builds from the Zod route schemas) merged with
# the curated scripts/api-test-manifest.json, then running every endpoint with
# curl. No endpoint list is hardcoded here — add/adjust routes in the manifest
# or they are auto-caught from OpenAPI.
#
# Usage:
#   ./scripts/api-test-suite.sh DOMAIN [API_KEY] [SESSION_COOKIE] [CRON_SECRET]
#
# Examples:
#   ./scripts/api-test-suite.sh localhost:8080
#   ./scripts/api-test-suite.sh https://onegoodarea.onrender.com
#   ./scripts/api-test-suite.sh https://localhost:8080 oga_test1234... session_jwt...
#
# Environment variables (fallbacks):
#   OGA_API_KEY              - API Bearer token (oga_...)
#   OGA_SESSION_TOKEN        - Session bridge JWT (Bearer)
#   OGA_ADMIN_SESSION_TOKEN  - Admin bridge JWT for a superuser (Bearer)
#   OGA_CRON_SECRET          - CRON_SECRET Bearer token
#
# In a container (make scripts-api-test-suite) this also regenerates the plan
# via node first; on a host without node it falls back to the container runner.
#
################################################################################

# NOTE: do NOT set -e here. This script is safe to `source` (the final block
# uses `return` when sourced so it never kills the caller), and `set -e` would
# persist into the caller's shell and abort it on the first non-zero command —
# including the non-zero `return` on a failing run. The suite is designed to
# run every endpoint and report, so an early abort is unwanted anyway.

# Resolve own location so cwd does not matter (host checkout or container /work).
SUITE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SUITE_DIR/.." && pwd)"

# === Configuration ===
DOMAIN="${1:-localhost:8080}"
API_KEY="${2:-${OGA_API_KEY:-}}"
SESSION_TOKEN="${3:-${OGA_SESSION_TOKEN:-}}"
ADMIN_SESSION="${OGA_ADMIN_SESSION_TOKEN:-}"
CRON_SECRET="${4:-${OGA_CRON_SECRET:-}}"

# Normalize domain: add scheme if missing
if [[ ! "$DOMAIN" =~ ^https?:// ]]; then
  DOMAIN="http://$DOMAIN"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# === Helper Functions ===

test_endpoint() {
  local method=$1
  local path=$2
  local auth=$3
  local body=$4
  local description=$5

  TOTAL=$((TOTAL + 1))

  # Build curl command
  local cmd="curl -s -w '\n%{http_code}' -X $method '$DOMAIN$path'"

  case $auth in
    "API")
      if [ -z "$API_KEY" ]; then
        echo -e "${YELLOW}⊘ SKIPPED${NC} $method $path (auth: $auth) - missing API_KEY"
        SKIPPED=$((SKIPPED + 1))
        return
      fi
      cmd="$cmd -H 'Authorization: Bearer $API_KEY'"
      ;;
    "Session")
      if [ -z "$SESSION_TOKEN" ]; then
        echo -e "${YELLOW}⊘ SKIPPED${NC} $method $path (auth: $auth) - missing SESSION_TOKEN"
        SKIPPED=$((SKIPPED + 1))
        return
      fi
      cmd="$cmd -H 'Authorization: Bearer $SESSION_TOKEN'"
      ;;
    "Admin")
      if [ -z "$ADMIN_SESSION" ]; then
        echo -e "${YELLOW}⊘ SKIPPED${NC} $method $path (auth: $auth) - missing ADMIN_SESSION"
        SKIPPED=$((SKIPPED + 1))
        return
      fi
      cmd="$cmd -H 'Authorization: Bearer $ADMIN_SESSION'"
      ;;
    "CRON")
      if [ -z "$CRON_SECRET" ]; then
        echo -e "${YELLOW}⊘ SKIPPED${NC} $method $path (auth: $auth) - missing CRON_SECRET"
        SKIPPED=$((SKIPPED + 1))
        return
      fi
      cmd="$cmd -H 'Authorization: Bearer $CRON_SECRET'"
      ;;
  esac

  cmd="$cmd -H 'Content-Type: application/json'"

  if [ -n "$body" ]; then
    cmd="$cmd -d '$body'"
  fi

  # Execute and capture status
  local output=$(eval "$cmd")
  local http_code=$(echo "$output" | tail -n 1)

  # Check for success (2xx) or known error (4xx)
  if [[ $http_code =~ ^[24] ]]; then
    echo -e "${GREEN}✓ $http_code${NC} $method $path ${BLUE}($auth)${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ $http_code${NC} $method $path ${BLUE}($auth)${NC}"
    FAILED=$((FAILED + 1))
  fi
}

print_section() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
}

# Generate the plan from $DOMAIN/docs/json + the curated manifest.
# Prefers a local node; falls back to the container runner (make scripts-run)
# when node is unavailable on the host.
generate_plan() {
  mkdir -p "$REPO_ROOT/.artifacts"
  if command -v node >/dev/null 2>&1; then
    ( cd "$REPO_ROOT" && DOMAIN="$DOMAIN" node scripts/gen-api-test-plan.mjs )
    return $?
  fi
  if command -v make >/dev/null 2>&1 && command -v docker >/dev/null 2>&1; then
    ( cd "$REPO_ROOT" && DOMAIN="$DOMAIN" make scripts-run SCRIPT=gen-api-test-plan.mjs )
    return $?
  fi
  echo -e "${RED}ERROR${NC}: node not found; install node or docker+make to generate the plan" >&2
  return 1
}

# === Run ===

echo -e "${BLUE}OneGoodArea API Test Suite${NC}"
echo "Domain: $DOMAIN"
echo "Auth tokens: API=$([ -n "$API_KEY" ] && echo "✓" || echo "✗") Session=$([ -n "$SESSION_TOKEN" ] && echo "✓" || echo "✗") Admin=$([ -n "$ADMIN_SESSION" ] && echo "✓" || echo "✗") CRON=$([ -n "$CRON_SECRET" ] && echo "✓" || echo "✗")"

print_section "Generate Plan"
if ! generate_plan; then
  echo -e "${RED}ERROR${NC}: plan generation failed" >&2
  RESULT=1
  if [ "${BASH_SOURCE[0]}" != "$0" ]; then return "$RESULT"; fi
  exit "$RESULT"
fi

PLAN_SH="$REPO_ROOT/.artifacts/api-test-plan.sh"
if [ ! -f "$PLAN_SH" ]; then
  echo -e "${RED}ERROR${NC}: generated plan not found at $PLAN_SH" >&2
  RESULT=1
  if [ "${BASH_SOURCE[0]}" != "$0" ]; then return "$RESULT"; fi
  exit "$RESULT"
fi

# Source the generated plan; it issues print_section() + test_endpoint() calls.
source "$PLAN_SH"

# === Summary ===
echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total:  $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
# Single source of truth: skipped = total - passed - failed. Keeps the
# summary correct even when a block bumps TOTAL without calling
# test_endpoint (e.g. missing admin token). (AR-847)
SKIPPED=$((TOTAL - PASSED - FAILED))
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"

RESULT=0
if [ "$FAILED" -ne 0 ]; then
  RESULT=1
fi

# When sourced (`source scripts/api-test-suite.sh`), use `return` so the
# caller's shell stays open — `exit` would terminate it. When run standalone
# (./scripts/api-test-suite.sh) the script is a child process, so `exit` only
# sets its own exit code and control returns to the caller's shell. The result
# code (0 pass / 1 any failure) is preserved for CI and scripted callers.
if [ "${BASH_SOURCE[0]}" != "$0" ]; then
  return "$RESULT"
fi
exit "$RESULT"
