# API Test Suite

Complete curl-based test coverage for all 73 OneGoodArea API endpoints.

## Usage

```bash
./scripts/api-test-suite.sh DOMAIN [API_KEY] [SESSION_TOKEN] [CRON_SECRET]
```

## Arguments

- **DOMAIN** (required): Target API domain
  - `localhost:8080` — local dev
  - `onegoodarea.co.uk` — production
  - `onegoodarea.com` — staging
  - `https://localhost:8080` — explicit scheme
  - Scheme defaults to `http://` if omitted

- **API_KEY** (optional): Bearer token for API endpoints (format: `oga_...`)
  - Falls back to `$OGA_API_KEY` environment variable

- **SESSION_TOKEN** (optional): JWT session cookie for session-authenticated endpoints
  - Falls back to `$OGA_SESSION_TOKEN` environment variable

- **CRON_SECRET** (optional): Bearer token for cron endpoints
  - Falls back to `$OGA_CRON_SECRET` environment variable

## Examples

### Local dev (minimal)
```bash
./scripts/api-test-suite.sh localhost:8080
```
Tests only public endpoints; skips authenticated endpoints.

### With API key (local)
```bash
./scripts/api-test-suite.sh localhost:8080 oga_test1234567890...
```
Tests public + API-authenticated endpoints.

### With all auth (local)
```bash
./scripts/api-test-suite.sh localhost:8080 \
  "oga_test1234567890..." \
  "eyJhbGciOiJIUzI1NiIs..." \
  "cron_secret_xyz123"
```
Tests all endpoints.

### Using environment variables
```bash
export OGA_API_KEY="oga_test1234..."
export OGA_SESSION_TOKEN="eyJhbGciOiJIUzI1NiIs..."
export OGA_CRON_SECRET="cron_secret_xyz"

./scripts/api-test-suite.sh https://onegoodarea.co.uk
```

### Production
```bash
./scripts/api-test-suite.sh https://onegoodarea.co.uk $PROD_API_KEY $PROD_SESSION $PROD_CRON
```

## Getting Auth Tokens

### API Key

**Option A: Via CLI (quickest)**
```bash
make bootstrap-test-key
```
Creates a disposable test API key. Customize with:
```bash
make bootstrap-test-key BOOTSTRAP_EMAIL=mytest@example.com BOOTSTRAP_PLAN=sandbox
```

**Option B: Via API (programmatic)**
1. Register a test user:
   ```bash
   curl -X POST http://localhost:8080/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"TestPass1234"}'
   ```
2. Create API key via `/keys` endpoint (requires session token; see Session Token below)

**Option C: Dashboard UI**
1. Login to dashboard → `/dashboard`
2. Navigate to **API Keys** → **Create Key**
3. Copy the key (format: `oga_...`)

```bash
export OGA_API_KEY="oga_..."
```

### Session Token

**Option A: Via API (programmatic)**
```bash
# Step 1: Register a test user
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass1234"}'

# Step 2: Login and capture cookies
curl -c /tmp/cookies.txt -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass1234"}'

# Step 3: Extract session token
SESSION=$(grep next-auth.session-token /tmp/cookies.txt | awk '{print $7}')
export OGA_SESSION_TOKEN="$SESSION"
```

**Option B: Dashboard UI**
1. Login to dashboard (sets cookie)
2. Retrieve from browser dev tools:
   ```javascript
   // In browser console
   document.cookie.split(';').find(c => c.includes('next-auth.session-token'))
   ```
3. Or extract from network tab (Application → Cookies → `next-auth.session-token`)

```bash
export OGA_SESSION_TOKEN="eyJhbGciOi..."
```

### CRON Secret

**Option A: From local environment**
```bash
grep CRON_SECRET apps/api/.env.local | cut -d= -f2
```

**Option B: From deployment**
Available in the deployment environment as `CRON_SECRET` env var.

```bash
export OGA_CRON_SECRET="cron_secret_value"
```

### Quick Setup: Get All Tokens at Once

```bash
#!/bin/bash
# Create test user and get all tokens

set -e

# 1. Bootstrap API key
echo "Creating API key..."
API_KEY=$(make bootstrap-test-key BOOTSTRAP_EMAIL=testuser@test.com 2>/dev/null | grep -oP 'oga_\w+' | head -1)

# 2. Register & login to get session
echo "Creating test user..."
curl -s -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"TestPass1234"}' > /dev/null

echo "Getting session token..."
curl -s -c /tmp/cookies.txt -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@test.com","password":"TestPass1234"}' > /dev/null

SESSION=$(grep next-auth.session-token /tmp/cookies.txt | awk '{print $7}')

# 3. Get CRON secret from env
CRON=$(grep CRON_SECRET apps/api/.env.local | cut -d= -f2)

# 4. Export for test suite
export OGA_API_KEY="$API_KEY"
export OGA_SESSION_TOKEN="$SESSION"
export OGA_CRON_SECRET="$CRON"

echo ""
echo "✓ API_KEY: ${API_KEY:0:10}..."
echo "✓ SESSION_TOKEN: ${SESSION:0:20}..."
echo "✓ CRON_SECRET: ${CRON:0:10}..."
echo ""
echo "Ready to run tests:"
echo "  ./scripts/api-test-suite.sh localhost:8080"
```

Save as `scripts/setup-test-tokens.sh` and run:
```bash
chmod +x scripts/setup-test-tokens.sh
source scripts/setup-test-tokens.sh
./scripts/api-test-suite.sh localhost:8080
```

## Output Format

- **✓ CODE** — Success (2xx) or expected error (4xx)
- **✗ CODE** — Unexpected error (5xx)
- **⊘ SKIPPED** — Auth token missing; endpoint cannot be tested

## Test Categories (73 endpoints)

1. **Health & Meta** (2) — liveness & service info
2. **Signals** (3) — area data, cross-area queries
3. **Scores** (1) — composite scoring
4. **Monitor** (7) — portfolio CRUD + enrichment
5. **Intelligence** (4) — query, peers, insights, forecast
6. **Orgs** (25) — org management, bundles, presets, methodology, cohorts
7. **Legacy Report API** (6) — report generation, history
8. **Webhooks** (3) — subscription CRUD
9. **Stripe** (5) — payments & subscriptions
10. **Auth** (4) — register, password reset
11. **Account Dashboard** (9) — API keys, usage, settings, watchlist
12. **Tracking & Widget** (3) — analytics, cached embeds
13. **Cron** (1) — time-series re-scoring

## Notes

- **Dark-flagged endpoints** (Monitor, Intelligence) require `OGA_SIGNALS_API=true` flag set on the API
- **Rate-limited endpoints** may fail if called too frequently
- **Test data** (org IDs, etc.) uses placeholder IDs like `org_123` — expect 404s where appropriate
- **Public endpoints** are always tested regardless of auth tokens
- **Skipped endpoints** indicate missing auth — not a test failure

## Continuous Integration

```bash
#!/bin/bash
set -e

DOMAIN="${DOMAIN:-http://localhost:8080}"
API_KEY="${OGA_API_KEY}"
SESSION="${OGA_SESSION_TOKEN}"
CRON="${OGA_CRON_SECRET}"

./scripts/api-test-suite.sh "$DOMAIN" "$API_KEY" "$SESSION" "$CRON"

echo "All tests passed!"
```

## Troubleshooting

**"permission denied"**
```bash
chmod +x ./scripts/api-test-suite.sh
```

**"curl: command not found"**
Install curl:
```bash
# macOS
brew install curl

# Ubuntu/Debian
sudo apt-get install curl

# Fedora/RHEL
sudo dnf install curl
```

**"Too many requests"**
Some endpoints are rate-limited. Wait a few minutes and retry.

**All endpoints skipped (missing auth)**
Use the quick setup script to generate all tokens:
```bash
source <(curl -s https://raw.githubusercontent.com/onegoodarea/api/main/scripts/setup-test-tokens.sh)
./scripts/api-test-suite.sh localhost:8080
```

Or manually set tokens:
```bash
export OGA_API_KEY="oga_..."
export OGA_SESSION_TOKEN="eyJ..."
export OGA_CRON_SECRET="cron_..."
./scripts/api-test-suite.sh localhost:8080
```

<!-- AR-379: /widget endpoint removed 2026-06-29 (plan/030). Cache
     infrastructure deleted. Future embeddable surface is a clean rebuild
     on the v2 signal-first stack, not a resurrection of this code path. -->

## Related

- [ENDPOINTS-BY-PRODUCT.md](docs/API-REFERENCE/ENDPOINTS-BY-PRODUCT.md) — Complete endpoint reference
- [Makefile](Makefile) — `make bootstrap-test-key` to create a test API key
