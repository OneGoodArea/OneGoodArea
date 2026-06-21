#!/bin/bash

################################################################################
# Setup Test Tokens
#
# Programmatically creates all auth tokens needed for API testing.
# Registers a test user, creates API key, and extracts session token.
#
# Usage:
#   source scripts/setup-test-tokens.sh
#   ./scripts/api-test-suite.sh localhost:8080
#
# Environment:
#   API_DOMAIN - API endpoint (default: http://localhost:8080)
#   TEST_EMAIL - Test user email (default: testuser+$(date +%s)@test.com)
#
################################################################################

set -e

API_DOMAIN="${API_DOMAIN:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-testuser+$(date +%s)@test.com}"
TEST_PASSWORD="TestPass1234"

echo "Setting up test tokens..."
echo "API: $API_DOMAIN"
echo "User: $TEST_EMAIL"
echo ""

# === 1. Bootstrap API Key ===
echo "Step 1/3: Creating API key..."
API_KEY=$(make bootstrap-test-key BOOTSTRAP_EMAIL="$TEST_EMAIL" BOOTSTRAP_PLAN=sandbox 2>/dev/null | grep -oP 'oga_\w+' | head -1 || echo "")

if [ -z "$API_KEY" ]; then
  echo "⚠ Could not bootstrap API key via make. Trying direct DB approach..."
  # Fallback: would need direct DB access
  echo "Run 'make bootstrap-test-key' manually and set OGA_API_KEY"
  API_KEY=""
else
  echo "✓ API_KEY: ${API_KEY:0:15}..."
fi

# === 2. Register Test User ===
echo "Step 2/3: Registering test user..."
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
  exit 1
fi

# === 3. Get Session Token ===
echo "Step 3/3: Getting session token..."

# Create temporary cookie jar
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

# Login and capture session cookie
curl -s -c "$COOKIE_JAR" -X POST "$API_DOMAIN/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" > /dev/null

# Extract session token
SESSION=$(grep -oP 'next-auth\.session-token\s+\K\S+' "$COOKIE_JAR" | tail -1 || echo "")

if [ -z "$SESSION" ]; then
  echo "⚠ Could not extract session token. Try logging in manually via dashboard."
  SESSION=""
else
  echo "✓ SESSION_TOKEN: ${SESSION:0:20}..."
fi

# === 4. Get CRON Secret ===
echo ""
CRON=""
if [ -f "apps/api/.env.local" ]; then
  CRON=$(grep -oP 'CRON_SECRET=\K.+' apps/api/.env.local || echo "")
  if [ -n "$CRON" ]; then
    echo "✓ CRON_SECRET: ${CRON:0:15}..."
  fi
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
