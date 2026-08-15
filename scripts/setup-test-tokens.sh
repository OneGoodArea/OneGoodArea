#!/bin/bash

################################################################################
# Setup Test Tokens
#
# Programmatically creates all auth tokens needed for API testing.
# Registers a test user, creates API key, extracts session token,
# promotes user to superadmin, and extracts admin session token.
#
# Usage:
#   source scripts/setup-test-tokens.sh
#   ./scripts/api-test-suite.sh localhost:8080
#
# This script is designed to be SOURCED so the OGA_* tokens it exports land in
# your current shell. When sourced, it must never call `exit` (that would kill
# the shell that ran it) — see the failure path below.
#
# Environment:
#   API_DOMAIN - API endpoint (default: http://localhost:8080)
#   TEST_EMAIL - Test user email (default: testuser+$(date +%s)@test.com)
#
################################################################################

# NOTE: do NOT set -e here. This script is meant to be sourced, and `set -e`
# would persist into the caller's shell and abort it on the first non-zero
# command. Every fallible call below already guards with `|| echo ""`, so the
# explicit failure path at the end is the only hard stop.

API_DOMAIN="${API_DOMAIN:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-testuser+$(date +%s)@test.com}"
TEST_PASSWORD="TestPass1234"

# Load local runtime config (.env.local.test, gitignored) if present so host-run
# scripts (bootstrap-test-key, promote-superuser, mint-session-token) get the DB
# connection + auth secret without manual exports.
if [ -f ".env.local.test" ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local.test
  set +a
fi

# Local container stack defaults (compose/compose.override.yml). Override any of
# these in .env.local.test if your stack differs.
export DATABASE_URL="${DATABASE_URL:-postgres://oga_user:oga_test_password_local@localhost:55432/oga_local}"
export NEON_FETCH_ENDPOINT="${NEON_FETCH_ENDPOINT:-http://localhost:55433/sql}"
AUTH_SECRET="${AUTH_SECRET:-replace-me}"

echo "Setting up test tokens..."
echo "API: $API_DOMAIN"
echo "User: $TEST_EMAIL"
echo ""

# === 1. Bootstrap API Key ===
echo "Step 1/5: Creating API key..."
API_KEY=$(make scripts-bootstrap-test-key ARGS="--email $TEST_EMAIL --plan sandbox" 2>/dev/null | grep -oP 'oga_\w+' | head -1 || echo "")

if [ -z "$API_KEY" ]; then
  echo "⚠ Could not bootstrap API key via make. Trying direct DB approach..."
  echo "Run 'make scripts-bootstrap-test-key' manually and set OGA_API_KEY"
  API_KEY=""
else
  echo "✓ API_KEY: ${API_KEY:0:15}..."
fi

# === 2. Register Test User ===
echo "Step 2/5: Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_DOMAIN/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "email_taken"; then
  echo "⚠ User already exists; using existing account"
elif echo "$REGISTER_RESPONSE" | grep -q "ok"; then
  echo "✓ User registered"
else
  echo "✗ Failed to register user"
  echo "$REGISTER_RESPONSE"
  if [ "${BASH_SOURCE[0]}" != "$0" ]; then
    return 1
  fi
  exit 1
fi

# === 3. Get Session Token ===
echo "Step 3/5: Getting session token (bridge JWT)..."

# The API authenticates browser-user (Session/Admin) calls via a short-lived
# bridge JWT signed with AUTH_SECRET (apps/api/src/shared/auth-session.ts) — it
# does NOT issue next-auth cookies. Mint the JWT directly for the test user.
SESSION=$(AUTH_SECRET="$AUTH_SECRET" DATABASE_URL="$DATABASE_URL" NEON_FETCH_ENDPOINT="$NEON_FETCH_ENDPOINT" \
  node scripts/mint-session-token.mjs --email "$TEST_EMAIL" 2>/dev/null | tail -1 || echo "")

if [ -z "$SESSION" ]; then
  echo "⚠ Could not mint session token. Check DATABASE_URL / AUTH_SECRET (see .env.local.test.example)."
  SESSION=""
else
  echo "✓ SESSION_TOKEN: ${SESSION:0:20}..."
fi

# === 4. Promote to Superuser ===
echo "Step 4/5: Promoting to superuser..."

ADMIN_SESSION=""
PROMOTE_DB_URL="${DATABASE_URL:-}"

if [ -n "$PROMOTE_DB_URL" ]; then
  PROMOTE_OUTPUT=$(NEON_FETCH_ENDPOINT="$NEON_FETCH_ENDPOINT" DATABASE_URL="$PROMOTE_DB_URL" node scripts/promote-superuser.mjs --email "$TEST_EMAIL" 2>&1 || echo "")
  if echo "$PROMOTE_OUTPUT" | grep -q "✓"; then
    echo "$PROMOTE_OUTPUT"

    # Admin authorization is DB-driven (isSuperuser reads user_type from the DB
    # for the JWT's sub), so the same session JWT works for admin routes.
    ADMIN_SESSION="$SESSION"

    if [ -n "$ADMIN_SESSION" ]; then
      echo "✓ ADMIN_SESSION_TOKEN: ${ADMIN_SESSION:0:20}..."
    else
      echo "⚠ Could not mint admin session token"
    fi
  else
    echo "⚠ Could not promote to superuser"
    echo "  Set DATABASE_URL and NEON_FETCH_ENDPOINT to enable admin endpoint testing"
  fi
else
  echo "⚠ DATABASE_URL not set; skipping superuser promotion"
  echo "  Set DATABASE_URL and NEON_FETCH_ENDPOINT to enable admin endpoint testing"
fi

# === 5. Get CRON Secret ===
echo ""
echo "Step 5/5: Loading CRON secret..."
CRON=""
if [ -f "apps/api/.env.local" ]; then
  CRON=$(grep -oP 'CRON_SECRET=\K.+' apps/api/.env.local || echo "")
fi
# Local stack uses CRON_SECRET=replace-me (compose.yml); fall back to it when no
# apps/api/.env.local exists.
CRON="${CRON:-replace-me}"
if [ -n "$CRON" ]; then
  echo "✓ CRON_SECRET: ${CRON:0:15}..."
fi

# === Export ===
echo ""
echo "Exporting environment variables..."

if [ -n "$API_KEY" ]; then
  export OGA_API_KEY="$API_KEY"
  echo "  export OGA_API_KEY='$API_KEY'"
fi

if [ -n "$SESSION" ]; then
  export OGA_SESSION_TOKEN="$SESSION"
  echo "  export OGA_SESSION_TOKEN='$SESSION'"
fi

if [ -n "$ADMIN_SESSION" ]; then
  export OGA_ADMIN_SESSION_TOKEN="$ADMIN_SESSION"
  echo "  export OGA_ADMIN_SESSION_TOKEN='$ADMIN_SESSION'"
fi

if [ -n "$CRON" ]; then
  export OGA_CRON_SECRET="$CRON"
  echo "  export OGA_CRON_SECRET='$CRON'"
fi

echo ""
echo "✅ Ready to test!"
echo ""
echo "Run tests:"
echo "  ./scripts/api-test-suite.sh $API_DOMAIN"
echo ""
echo "Or save tokens to a file:"
echo "  source <(scripts/setup-test-tokens.sh)"
