#!/bin/bash

################################################################################
# OneGoodArea API Test Suite
# 
# Tests all 73 endpoints with curl, using parameterized domain and auth tokens.
#
# Usage:
#   ./scripts/api-test-suite.sh DOMAIN [API_KEY] [SESSION_COOKIE] [CRON_SECRET]
#
# Examples:
#   ./scripts/api-test-suite.sh localhost:8080
#   ./scripts/api-test-suite.sh onegoodarea.co.uk
#   ./scripts/api-test-suite.sh https://localhost:8080 oga_test1234... session_jwt...
#
# Environment variables (fallbacks):
#   OGA_API_KEY         - API Bearer token (oga_...)
#   OGA_SESSION_TOKEN   - Session JWT cookie value
#   OGA_CRON_SECRET     - CRON_SECRET Bearer token
#
################################################################################

set -e

# === Configuration ===
DOMAIN="${1:-localhost:8080}"
API_KEY="${2:-${OGA_API_KEY:-}}"
SESSION_TOKEN="${3:-${OGA_SESSION_TOKEN:-}}"
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
      cmd="$cmd -H 'Cookie: next-auth.session-token=$SESSION_TOKEN'"
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

# === Tests ===

echo -e "${BLUE}OneGoodArea API Test Suite${NC}"
echo "Domain: $DOMAIN"
echo "Auth tokens: API=$([ -n "$API_KEY" ] && echo "✓" || echo "✗") Session=$([ -n "$SESSION_TOKEN" ] && echo "✓" || echo "✗") CRON=$([ -n "$CRON_SECRET" ] && echo "✓" || echo "✗")"

print_section "Health & Meta"
test_endpoint "GET" "/health" "Public" "" "Liveness probe"
test_endpoint "GET" "/v1/meta" "Public" "" "Service metadata"

print_section "Signals (3)"
test_endpoint "GET" "/v1/area?postcode=SW1A1AA" "API" "" "Get area profile"
test_endpoint "GET" "/v1/signals/deprivation?area=SW1A1AA" "API" "" "Get signal category"
test_endpoint "GET" "/v1/areas?signal=crime&country=England" "API" "" "Cross-area query"

print_section "Scores (1)"
test_endpoint "POST" "/v1/score" "API" '{"area":"SW1A1AA","preset":"moving"}' "Score an area"

print_section "Monitor Portfolio (7) [OGA_SIGNALS_API=true]"
test_endpoint "POST" "/v1/portfolios" "API" '{"name":"Test Portfolio"}' "Create portfolio"
test_endpoint "GET" "/v1/portfolios" "API" "" "List portfolios"
test_endpoint "GET" "/v1/portfolios/pf_test123" "API" "" "Get portfolio (will 404)"
test_endpoint "POST" "/v1/portfolios/pf_test123/areas" "API" '{"postcodes":["SW1A1AA"]}' "Add areas to portfolio"
test_endpoint "POST" "/v1/portfolios/pf_test123/enrich" "API" "" "Enrich portfolio"
test_endpoint "POST" "/v1/portfolios/pf_test123/changes" "API" "" "Detect changes"
test_endpoint "DELETE" "/v1/portfolios/pf_test123" "API" "" "Delete portfolio"

print_section "Intelligence (4) [OGA_SIGNALS_API=true]"
test_endpoint "POST" "/v1/query" "API" '{"question":"Find areas with high crime"}' "Query (NL)"
test_endpoint "POST" "/v1/peers" "API" '{"area":"SW1A1AA"}' "Find peers (k-NN)"
test_endpoint "POST" "/v1/insights" "API" '{"area":"SW1A1AA"}' "Anomaly screening"
test_endpoint "POST" "/v1/forecast" "API" '{"area":"SW1A1AA","signal":"deprivation"}' "Forecast"

print_section "Legacy Report API (6)"
test_endpoint "POST" "/v1/report" "API" '{"area":"SW1A1AA","intent":"moving"}' "Generate report (API key)"
test_endpoint "POST" "/v1/batch" "API" '[{"area":"SW1A1AA","intent":"moving"}]' "Batch reports"
test_endpoint "GET" "/v1/me" "API" "" "Get caller (API key)"
test_endpoint "GET" "/me/reports" "Session" "" "List reports (Session)"
test_endpoint "POST" "/report" "Session" '{"area":"SW1A1AA","intent":"moving"}' "Generate report (Session/Dashboard)"
test_endpoint "DELETE" "/report/report_123" "Session" "" "Delete report"

print_section "Webhooks (3)"
test_endpoint "POST" "/v1/webhooks" "API" '{"event":"signal.changed","url":"https://example.com/webhook"}' "Create webhook"
test_endpoint "GET" "/v1/webhooks" "API" "" "List webhooks"
test_endpoint "DELETE" "/v1/webhooks/wh_123" "API" "" "Delete webhook"

print_section "Orgs: CRUD (4)"
test_endpoint "POST" "/v1/orgs" "API" '{"name":"Test Org"}' "Create org"
test_endpoint "GET" "/v1/orgs" "API" "" "List orgs"
test_endpoint "GET" "/v1/orgs/org_123" "API" "" "Get org"
test_endpoint "PATCH" "/v1/orgs/org_123" "API" '{"name":"Updated"}' "Update org"

print_section "Orgs: Members (3)"
test_endpoint "GET" "/v1/orgs/org_123/members" "API" "" "List members"
test_endpoint "POST" "/v1/orgs/org_123/members" "API" '{"email":"user@example.com","role":"member"}' "Invite member"
test_endpoint "DELETE" "/v1/orgs/org_123/members/user_456" "API" "" "Remove member"

print_section "Orgs: Bundles (5)"
test_endpoint "POST" "/v1/orgs/org_123/bundles" "API" '{"name":"Bundle","signals":["crime","deprivation"]}' "Create bundle"
test_endpoint "GET" "/v1/orgs/org_123/bundles" "API" "" "List bundles"
test_endpoint "GET" "/v1/orgs/org_123/bundles/bnd_123" "API" "" "Get bundle"
test_endpoint "PATCH" "/v1/orgs/org_123/bundles/bnd_123" "API" '{"name":"Updated"}' "Update bundle"
test_endpoint "DELETE" "/v1/orgs/org_123/bundles/bnd_123" "API" "" "Delete bundle"

print_section "Orgs: Presets (5)"
test_endpoint "POST" "/v1/orgs/org_123/presets" "API" '{"name":"Preset","weights":{"crime":0.5}}' "Create preset"
test_endpoint "GET" "/v1/orgs/org_123/presets" "API" "" "List presets"
test_endpoint "GET" "/v1/orgs/org_123/presets/pre_123" "API" "" "Get preset"
test_endpoint "PATCH" "/v1/orgs/org_123/presets/pre_123" "API" '{"name":"Updated"}' "Update preset"
test_endpoint "DELETE" "/v1/orgs/org_123/presets/pre_123" "API" "" "Delete preset"

print_section "Orgs: Methodology (3)"
test_endpoint "GET" "/v1/orgs/org_123/methodology" "API" "" "Get methodology pin"
test_endpoint "PUT" "/v1/orgs/org_123/methodology" "API" '{"version":"2"}' "Pin methodology"
test_endpoint "DELETE" "/v1/orgs/org_123/methodology" "API" "" "Clear methodology"

print_section "Orgs: Cohorts (5)"
test_endpoint "POST" "/v1/orgs/org_123/cohorts" "API" '{"name":"Cohort","criteria":{}}' "Create cohort"
test_endpoint "GET" "/v1/orgs/org_123/cohorts" "API" "" "List cohorts"
test_endpoint "GET" "/v1/orgs/org_123/cohorts/coh_123" "API" "" "Get cohort"
test_endpoint "PATCH" "/v1/orgs/org_123/cohorts/coh_123" "API" '{"name":"Updated"}' "Update cohort"
test_endpoint "DELETE" "/v1/orgs/org_123/cohorts/coh_123" "API" "" "Delete cohort"

print_section "Stripe (5)"
test_endpoint "POST" "/stripe/webhook" "Public" '{"type":"charge.succeeded","data":{}}' "Stripe webhook"
test_endpoint "POST" "/stripe/portal" "Session" "" "Create portal session"
test_endpoint "POST" "/stripe/cancel" "Session" "" "Cancel subscription"
test_endpoint "POST" "/stripe/checkout" "Session" '{"plan":"pro"}' "Create checkout"
test_endpoint "POST" "/stripe/addon-checkout" "Session" '{"addon":"mcp"}' "Create addon checkout"

print_section "Auth: Credentials (4) [Public, IP Rate-Limited]"
test_endpoint "POST" "/auth/register" "Public" '{"email":"test@example.com","password":"Test1234"}' "Register"
test_endpoint "POST" "/auth/resend-verification" "Public" '{"email":"test@example.com"}' "Resend verification"
test_endpoint "POST" "/auth/forgot-password" "Public" '{"email":"test@example.com"}' "Forgot password"
test_endpoint "POST" "/auth/reset-password" "Public" '{"token":"xyz","password":"NewPass1234"}' "Reset password"

print_section "Account Dashboard: API Usage (4)"
test_endpoint "GET" "/usage" "Session" "" "Get usage dashboard"
test_endpoint "GET" "/keys/usage" "Session" "" "Get key usage"
test_endpoint "GET" "/keys" "Session" "" "List API keys"
test_endpoint "POST" "/keys" "Session" '{"name":"Test Key"}' "Create API key"

print_section "Account Dashboard: Settings (3)"
test_endpoint "GET" "/settings/subscription" "Session" "" "Get subscription"
test_endpoint "POST" "/settings/password" "Session" '{"currentPassword":"old","newPassword":"New1234"}' "Change password"
test_endpoint "DELETE" "/settings/delete-account" "Session" "" "Delete account"

print_section "Account Dashboard: API Keys & Watchlist (2)"
test_endpoint "DELETE" "/keys/key_123" "Session" "" "Revoke API key"
test_endpoint "GET" "/watchlist" "Session" "" "List watchlist"

print_section "Account Dashboard: Watchlist (2)"
test_endpoint "POST" "/watchlist" "Session" '{"postcode":"SW1A1AA","label":"My Area"}' "Save area"
test_endpoint "DELETE" "/watchlist/area_123" "Session" "" "Remove area"

print_section "Public: Tracking & Widget (3)"
test_endpoint "POST" "/track" "Public" '{"path":"/report","referrer":"https://google.com"}' "Track pageview"
test_endpoint "GET" "/widget?postcode=SW1A1AA&intent=moving" "Public" "" "Get widget (cached)"
test_endpoint "OPTIONS" "/widget" "Public" "" "Widget CORS preflight"

print_section "Cron (1)"
test_endpoint "GET" "/cron/rescore?dry_run=true&limit=5" "CRON" "" "Rescore (dry run)"

# === Summary ===
echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo "Total:  $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo -e "Skipped: ${YELLOW}$SKIPPED${NC}"

if [ $FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi
