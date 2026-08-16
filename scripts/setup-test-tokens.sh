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

# --- Logging helpers ----------------------------------------------------------
# Every step logs three things: what is running (STEP), which branch/path was
# taken (PATH), and the outcome (OK/WARN/FAIL).
_step() { echo; echo "──────── $1 ────────"; }
_path() { echo "  · path: $1"; }
_ok()   { echo "  ✓ $1"; }
_warn() { echo "  ⚠ $1"; }
_fail() { echo "  ✗ $1"; }
_hint() { echo "  → $1"; }

API_DOMAIN="${API_DOMAIN:-http://localhost:8080}"
TEST_EMAIL="${TEST_EMAIL:-testuser+$(date +%s)@test.com}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass1234}"

# Load local runtime config (.env.local.test, gitignored) if present so host-run
# scripts (bootstrap-test-key, promote-superuser, mint-session-token) get the DB
# connection + auth secret without manual exports.
if [ -f ".env.local.test" ]; then
  _path ".env.local.test present -> sourcing overrides"
  set -a
  # shellcheck disable=SC1091
  source .env.local.test
  set +a
else
  _path "no .env.local.test -> using local-stack defaults"
fi

# Local container stack defaults (compose/compose.override.yml). Override any of
# these in .env.local.test if your stack differs.
export DATABASE_URL="${DATABASE_URL:-postgres://oga_user:oga_test_password_local@localhost:55432/oga_local}"
export NEON_FETCH_ENDPOINT="${NEON_FETCH_ENDPOINT:-http://localhost:55433/sql}"
AUTH_SECRET="${AUTH_SECRET:-replace-me}"

echo "──────── Setup test tokens ────────"
echo "  API_DOMAIN           API endpoint                             : $API_DOMAIN"
echo "  TEST_EMAIL           Test user email (created on first run)   : $TEST_EMAIL"
echo "  TEST_PASSWORD        Test user password                       : ${TEST_PASSWORD:0:4}... (${#TEST_PASSWORD} chars)"
echo "  DATABASE_URL         Postgres DSN for DB scripts              : postgres://***@${DATABASE_URL#*@}"
echo "  NEON_FETCH_ENDPOINT  Neon fetch proxy for DB scripts          : $NEON_FETCH_ENDPOINT"
echo "  AUTH_SECRET          Signs the bridge JWT (must match api)    : ${AUTH_SECRET:0:3}... (${#AUTH_SECRET} chars)"
echo ""
echo "  Override any of these as env vars or in .env.local.test."

# === 1. Bootstrap API Key ===
_step "1/5 — Bootstrap API key"
echo "  Running: make scripts-bootstrap-test-key --email $TEST_EMAIL --plan sandbox"
BOOTSTRAP_OUTPUT=$(make scripts-bootstrap-test-key ARGS="--email $TEST_EMAIL --plan sandbox" 2>&1 || echo "")
API_KEY=$(echo "$BOOTSTRAP_OUTPUT" | grep -oP 'oga_\w+' | head -1 || echo "")

if [ -z "$API_KEY" ]; then
  _path "make bootstrap failed -> no key generated"
  _fail "API key not created (see output below)"
  echo "$BOOTSTRAP_OUTPUT" | sed 's/^/  | /' | grep -v '^  | $'
  _hint "Run 'make scripts-bootstrap-test-key' manually and set OGA_API_KEY"
else
  _path "make bootstrap succeeded -> key extracted"
  _ok "API_KEY: ${API_KEY:0:15}..."
fi

# === 2. Register Test User ===
_step "2/5 — Register test user"
echo "  Running: POST $API_DOMAIN/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST "$API_DOMAIN/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "email_taken"; then
  _path "POST /auth/register -> email_taken (existing account)"
  _warn "User already exists; using existing account"
elif echo "$REGISTER_RESPONSE" | grep -q "ok"; then
  _path "POST /auth/register -> ok (new account created)"
  _ok "User registered: $TEST_EMAIL"
else
  _path "POST /auth/register -> unexpected response"
  _fail "Failed to register user"
  echo "  $REGISTER_RESPONSE"
  if [ "${BASH_SOURCE[0]}" != "$0" ]; then
    return 1
  fi
  exit 1
fi

# === 3. Get Session Token ===
_step "3/5 — Session token (bridge JWT)"
echo "  Running: node scripts/mint-session-token.mjs --email $TEST_EMAIL"

# The API authenticates browser-user (Session/Admin) calls via a short-lived
# bridge JWT signed with AUTH_SECRET (apps/api/src/shared/auth-session.ts) — it
# does NOT issue next-auth cookies. Mint the JWT directly for the test user.
MINT_OUTPUT=$(AUTH_SECRET="$AUTH_SECRET" DATABASE_URL="$DATABASE_URL" NEON_FETCH_ENDPOINT="$NEON_FETCH_ENDPOINT" \
  node scripts/mint-session-token.mjs --email "$TEST_EMAIL" 2>&1 || echo "")
SESSION=$(echo "$MINT_OUTPUT" | tail -1)

if [ -z "$SESSION" ]; then
  _path "mint-session-token -> no token returned"
  _warn "Could not mint session token. Check DATABASE_URL / AUTH_SECRET (see .env.local.test.example)."
  [ -n "$MINT_OUTPUT" ] && echo "$MINT_OUTPUT" | tail -3 | sed 's/^/  | /'
  SESSION=""
else
  _path "mint-session-token -> token issued"
  _ok "SESSION_TOKEN: ${SESSION:0:20}..."
fi

# === 4. Promote to Superuser ===
_step "4/5 — Promote to superuser"

ADMIN_SESSION=""
PROMOTE_DB_URL="${DATABASE_URL:-}"

if [ -n "$PROMOTE_DB_URL" ]; then
  echo "  Running: node scripts/promote-superuser.mjs --email $TEST_EMAIL"
  PROMOTE_OUTPUT=$(NEON_FETCH_ENDPOINT="$NEON_FETCH_ENDPOINT" DATABASE_URL="$PROMOTE_DB_URL" node scripts/promote-superuser.mjs --email "$TEST_EMAIL" 2>&1 || echo "")
  if echo "$PROMOTE_OUTPUT" | grep -q "✓"; then
    _path "promote-superuser -> OK (isSuperuser now true in DB)"
    _ok "User promoted to superuser"
    echo "$PROMOTE_OUTPUT" | sed 's/^/  | /' | grep -v '^  | $'

    # Admin authorization is DB-driven (isSuperuser reads user_type from the DB
    # for the JWT's sub), so the same session JWT works for admin routes.
    ADMIN_SESSION="$SESSION"

    if [ -n "$ADMIN_SESSION" ]; then
      _path "admin token -> reuses session JWT (DB-driven auth)"
      _ok "ADMIN_SESSION_TOKEN: ${ADMIN_SESSION:0:20}..."
    else
      _warn "Could not mint admin session token"
    fi
  else
    _path "promote-superuser -> failed"
    _fail "Could not promote to superuser"
    echo "$PROMOTE_OUTPUT" | sed 's/^/  | /' | grep -v '^  | $'
    _hint "Set DATABASE_URL and NEON_FETCH_ENDPOINT to enable admin endpoint testing"
  fi
else
  _path "DATABASE_URL not set -> skipped"
  _warn "Superuser promotion skipped (no DATABASE_URL)"
  _hint "Set DATABASE_URL and NEON_FETCH_ENDPOINT to enable admin endpoint testing"
fi

# === 5. Get CRON Secret ===
_step "5/5 — CRON secret"
CRON=""
if [ -f "apps/api/.env.local" ]; then
  CRON=$(grep -oP 'CRON_SECRET=\K.+' apps/api/.env.local || echo "")
  if [ -n "$CRON" ]; then
    _path "apps/api/.env.local -> CRON_SECRET found"
  else
    _path "apps/api/.env.local -> CRON_SECRET absent, falling back to default"
  fi
else
  _path "no apps/api/.env.local -> using local-stack default"
fi
# Local stack uses CRON_SECRET=replace-me (compose.yml); fall back to it when no
# apps/api/.env.local exists.
CRON="${CRON:-replace-me}"
_ok "CRON_SECRET: ${CRON:0:15}..."

# === Export ===
_step "Export"
if [ -n "$API_KEY" ]; then
  export OGA_API_KEY="$API_KEY"
  _ok "export OGA_API_KEY='${API_KEY:0:15}...'"
fi

if [ -n "$SESSION" ]; then
  export OGA_SESSION_TOKEN="$SESSION"
  _ok "export OGA_SESSION_TOKEN='${SESSION:0:15}...'"
fi

if [ -n "$ADMIN_SESSION" ]; then
  export OGA_ADMIN_SESSION_TOKEN="$ADMIN_SESSION"
  _ok "export OGA_ADMIN_SESSION_TOKEN='${ADMIN_SESSION:0:15}...'"
fi

if [ -n "$CRON" ]; then
  export OGA_CRON_SECRET="$CRON"
  _ok "export OGA_CRON_SECRET='${CRON:0:15}...'"
fi

echo
echo "──────── Summary ────────"
[ -n "$API_KEY" ]        && _ok "OGA_API_KEY              ${API_KEY:0:15}..."        || _warn "OGA_API_KEY              NOT SET"
[ -n "$SESSION" ]        && _ok "OGA_SESSION_TOKEN        ${SESSION:0:15}..."        || _warn "OGA_SESSION_TOKEN        NOT SET"
[ -n "$ADMIN_SESSION" ]  && _ok "OGA_ADMIN_SESSION_TOKEN  ${ADMIN_SESSION:0:15}..."  || _warn "OGA_ADMIN_SESSION_TOKEN  NOT SET"
[ -n "$CRON" ]           && _ok "OGA_CRON_SECRET          ${CRON:0:15}..."           || _warn "OGA_CRON_SECRET          NOT SET"

echo ""
echo "✅ Ready to test!"
echo ""
echo "Run tests:"
echo "  ./scripts/api-test-suite.sh $API_DOMAIN"
echo ""
echo "Or save tokens to a file:"
echo "  source <(scripts/setup-test-tokens.sh)"
