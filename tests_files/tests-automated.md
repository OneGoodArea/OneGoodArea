# AreaIQ — Automated Test Suite

> Tests that can be executed automatically via API/database calls without manual UI interaction.
> These tests use HTTP requests, database queries, and webhook simulations.
> Can be run in CI/CD pipelines.

---

### PATH_AUTH_001 — Register (happy path)

```
PATH_AUTH_001:
TEST_CASES:

  PATH_AUTH_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User is unauthenticated (no session cookie)
      - Email does not exist in users table
      - IP has made 0 requests in the last 60 seconds
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "newuser@example.com", "password": "Secure123!" }
      2. Capture HTTP response status and body.
      3. Query DB: SELECT id, email, email_verified, password_hash FROM users WHERE email = 'newuser@example.com'.
      4. Query DB: SELECT token, used, expires_at FROM email_verification_tokens WHERE user_id = <returned_id>.
      5. Verify outgoing email was queued/sent to newuser@example.com.
    EXPECTED RESULT:
      - HTTP 200 { ok: true }
      - DB row: email_verified = FALSE, password_hash starts with 'pbkdf2:'
      - Verification token row exists, used = FALSE, expires_at ≈ NOW() + 24h
      - One verification email dispatched to newuser@example.com

  PATH_AUTH_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User is unauthenticated
      - Email does not exist
      - IP has made exactly 4 requests in the last 60 seconds (boundary: 5 allowed)
    STEPS:
      1. Simulate 4 prior requests from same test IP (or configure rate-limit counter in test DB/Redis to 4).
      2. Send POST /api/auth/register with body:
           { "email": "boundary@example.com", "password": "Exactly8!" }
         (password is exactly 8 characters — minimum valid length)
      3. Capture HTTP response status and body.
      4. Query DB for new user row.
    EXPECTED RESULT:
      - HTTP 200 { ok: true } (5th attempt is still within limit)
      - User row created, email_verified = FALSE
      - Password length accepted (8 chars = minimum)

  PATH_AUTH_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User is unauthenticated
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "notanemail", "password": "short" }
         (email invalid, password < 8 chars)
      2. Capture HTTP response status and body.
      3. Query DB: confirm no new row in users for email 'notanemail'.
    EXPECTED RESULT:
      - HTTP 400 with error message referencing invalid email and/or password too short
      - No DB row inserted

  PATH_AUTH_001_TC04:
    TYPE: failure
    PRECONDITIONS:
      - User is unauthenticated
      - Email 'taken@example.com' already exists in users table (credentials provider)
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "taken@example.com", "password": "ValidPass1!" }
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 409 with error indicating email already in use (not email_oauth variant)
      - No duplicate row inserted

EVIDENCE:
  - Screenshot: Response body for each TC
  - Log: server logs showing rate-limit counter increments (TC02)
  - DB verification: SELECT * FROM users WHERE email = '<test_email>' after each TC
  - DB verification: SELECT * FROM email_verification_tokens WHERE user_id = '<id>'
  - Email log / mailer stub output confirming email dispatch (TC01)
```

---

### PATH_AUTH_002 — Register with OAuth email (failure)

```
PATH_AUTH_002:
TEST_CASES:

  PATH_AUTH_002_TC01:
    TYPE: failure
    PRECONDITIONS:
      - User is unauthenticated
      - Email 'oauth@example.com' exists in users table with provider = 'google' (or 'github')
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "oauth@example.com", "password": "ValidPass1!" }
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 409 with error code/message 'email_oauth' (or similar, indicating OAuth account exists)
      - No new user row created, existing OAuth row unchanged

  PATH_AUTH_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Email 'oauth@example.com' exists with BOTH google and github providers (if multi-provider supported)
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "oauth@example.com", "password": "ValidPass1!" }
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 409 email_oauth regardless of number of OAuth providers on account

  PATH_AUTH_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Email does not exist at all
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "nooauth@example.com", "password": "ValidPass1!" }
    EXPECTED RESULT:
      - HTTP 200 { ok: true } — confirms 409 is NOT returned for non-OAuth emails

  PATH_AUTH_002_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Email 'github@example.com' exists in users table with provider = 'github'
    STEPS:
      1. Send POST /api/auth/register with body:
           { "email": "github@example.com", "password": "ValidPass1!" }
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 409 email_oauth (GitHub OAuth path also triggers 409, not just Google)

EVIDENCE:
  - Screenshot: Response body for each TC
  - DB verification: SELECT provider FROM users WHERE email = '<oauth_email>' to confirm provider field
  - Log: server log confirming the 409 branch was reached
```

---

### PATH_AUTH_003 — Register rate limit (security)

```
PATH_AUTH_003:
TEST_CASES:

  PATH_AUTH_003_TC01:
    TYPE: security
    PRECONDITIONS:
      - User is unauthenticated
      - Test IP has made 0 prior requests in the last 60 seconds
    STEPS:
      1. Send 5 sequential POST /api/auth/register requests from the same IP with distinct emails and valid payloads.
      2. Send a 6th POST /api/auth/register from the same IP.
      3. Capture HTTP response status for request 6.
      4. Query DB: confirm no user row was created for the 6th request's email.
    EXPECTED RESULT:
      - Requests 1–5: HTTP 200 or other non-429 codes (depending on email uniqueness)
      - Request 6: HTTP 429
      - No DB row inserted for the 6th email

  PATH_AUTH_003_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Test IP has made exactly 5 requests in the last 60 seconds
    STEPS:
      1. Configure rate-limit counter to 5 for test IP.
      2. Send the next POST /api/auth/register.
      3. Capture status code.
    EXPECTED RESULT:
      - HTTP 429 (limit is 5 req/min; 6th request hits limit)

  PATH_AUTH_003_TC03:
    TYPE: security
    PRECONDITIONS:
      - Test IP was rate-limited (counter = 5 in current window)
    STEPS:
      1. Advance system clock or wait 61 seconds (or reset rate-limit window in test environment).
      2. Send POST /api/auth/register with a fresh valid email.
      3. Capture status code.
    EXPECTED RESULT:
      - HTTP 200 { ok: true } — rate limit resets after 60s window

  PATH_AUTH_003_TC04:
    TYPE: security
    PRECONDITIONS:
      - Two different IPs (IP-A and IP-B), each with 0 prior requests
    STEPS:
      1. Send 5 POST /api/auth/register requests from IP-A.
      2. Send 1 POST /api/auth/register from IP-B with a valid fresh email.
      3. Capture status for the IP-B request.
    EXPECTED RESULT:
      - IP-B request returns HTTP 200 { ok: true } — rate limit is per-IP, not global

EVIDENCE:
  - Screenshot: HTTP 429 response body for TC01 request 6
  - Log: rate-limit counter state before and after TC01
  - DB verification: SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '10s' (should not include 6th email)
  - Network capture: confirm no DB write headers/queries executed on 429 path
```

---

### PATH_AUTH_004 — Credentials sign-in (happy)

```
PATH_AUTH_004:
TEST_CASES:

  PATH_AUTH_004_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User 'signin@example.com' exists, provider = 'credentials', email_verified = TRUE
      - Valid PBKDF2 password_hash stored for password 'ValidPass1!'
    STEPS:
      1. POST to NextAuth credentials endpoint (e.g. /api/auth/callback/credentials) with:
           { "email": "signin@example.com", "password": "ValidPass1!" }
      2. Capture HTTP response status, Set-Cookie header (session JWT).
      3. Verify redirect target is /report or the callbackUrl if provided.
      4. Query DB: SELECT * FROM activity_events WHERE user_id = '<id>' AND event = 'auth.signin' ORDER BY created_at DESC LIMIT 1.
    EXPECTED RESULT:
      - HTTP 200 or redirect (NextAuth flow) with valid session JWT in cookie
      - Redirect destination: /report (default) or specified callbackUrl
      - activity_events row: event = 'auth.signin'

  PATH_AUTH_004_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User exists, password_hash was created with old PBKDF2 iteration count (needsRehash = TRUE scenario)
    STEPS:
      1. Manually insert a user with a password_hash flagged as needing rehash (lower iteration count).
      2. POST credentials sign-in with correct password.
      3. After sign-in completes, query DB for updated password_hash.
    EXPECTED RESULT:
      - Sign-in succeeds (HTTP 200 / redirect)
      - DB password_hash updated to new PBKDF2 iteration count (background upgrade completed)

  PATH_AUTH_004_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User 'signin@example.com' exists
    STEPS:
      1. POST credentials sign-in with:
           { "email": "signin@example.com", "password": "WrongPassword!" }
      2. Capture HTTP response.
    EXPECTED RESULT:
      - Authentication fails — no session cookie issued
      - HTTP error response (NextAuth returns 401 or error redirect)
      - No activity_events row for 'auth.signin' created

  PATH_AUTH_004_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User is authenticated and provides callbackUrl=/dashboard
    STEPS:
      1. POST credentials sign-in with valid credentials and callbackUrl=/dashboard.
      2. Follow redirect.
    EXPECTED RESULT:
      - Redirect goes to /dashboard, not default /report

EVIDENCE:
  - Screenshot: Session cookie in browser DevTools after TC01
  - Screenshot: Redirect URL in network tab
  - Log: Background rehash task triggered (TC02)
  - DB verification: SELECT event, created_at FROM activity_events WHERE event='auth.signin'
  - DB verification: SELECT password_hash FROM users WHERE email='signin@example.com' before/after TC02
```

---

### PATH_AUTH_006 — Email verification token (happy)

```
PATH_AUTH_006:
TEST_CASES:

  PATH_AUTH_006_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User exists with email_verified = FALSE
      - Valid unused token exists in email_verification_tokens: used=FALSE, expires_at > NOW()
    STEPS:
      1. GET /verify?token=<valid_token>
      2. Capture HTTP response (redirect or rendered page).
      3. Query DB: SELECT email_verified FROM users WHERE id = '<user_id>'.
      4. Query DB: SELECT used FROM email_verification_tokens WHERE token = '<valid_token>'.
      5. Verify welcome email dispatched.
    EXPECTED RESULT:
      - Success page rendered (HTTP 200 or redirect to success URL)
      - users.email_verified = TRUE
      - email_verification_tokens.used = TRUE
      - Welcome email sent to user's address

  PATH_AUTH_006_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Token expires_at = NOW() + 1 second (about to expire, still valid)
    STEPS:
      1. GET /verify?token=<near_expiry_token> immediately.
      2. Query DB after response.
    EXPECTED RESULT:
      - Email verified successfully (token still valid at time of request)
      - email_verified = TRUE, token.used = TRUE

  PATH_AUTH_006_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Token exists but expires_at < NOW() (expired)
    STEPS:
      1. GET /verify?token=<expired_token>
      2. Capture rendered page.
    EXPECTED RESULT:
      - Failure page rendered (not success page)
      - users.email_verified remains FALSE
      - Token NOT marked as used

  PATH_AUTH_006_TC04:
    TYPE: edge
    PRECONDITIONS:
      - No token query param provided
    STEPS:
      1. GET /verify (no token param)
      2. Capture HTTP response.
    EXPECTED RESULT:
      - Redirect to / (root)
      - No DB changes

EVIDENCE:
  - Screenshot: Success page (TC01), failure page (TC03), redirect (TC04)
  - DB verification: SELECT email_verified FROM users WHERE id='<id>' before/after TC01
  - DB verification: SELECT used FROM email_verification_tokens WHERE token='<token>'
  - Email log: Welcome email captured in mailer stub (TC01)
```

---

### PATH_AUTH_008 — Forgot password (happy)

```
PATH_AUTH_008:
TEST_CASES:

  PATH_AUTH_008_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User 'forgotpw@example.com' exists, provider='credentials', password_hash NOT NULL
      - No forgot-password requests in last 1 hour
    STEPS:
      1. POST /api/auth/forgot-password with body:
           { "email": "forgotpw@example.com" }
      2. Capture HTTP response.
      3. Query DB: SELECT * FROM password_reset_tokens WHERE user_id = '<id>' ORDER BY created_at DESC LIMIT 1.
      4. Verify reset email dispatched.
    EXPECTED RESULT:
      - HTTP 200 (always)
      - Old tokens invalidated (used = TRUE)
      - New token: used = FALSE, expires_at ≈ NOW() + 1h
      - Reset email sent

  PATH_AUTH_008_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User has sent 2 forgot-password requests in the last hour (limit is 3/hour)
    STEPS:
      1. Configure rate-limit counter to 2 for this email.
      2. POST /api/auth/forgot-password.
      3. Capture response.
    EXPECTED RESULT:
      - HTTP 200, new token created, email dispatched (3rd request still within limit)

  PATH_AUTH_008_TC03:
    TYPE: security
    PRECONDITIONS:
      - Email 'ghost@example.com' does NOT exist in DB
    STEPS:
      1. POST /api/auth/forgot-password with body:
           { "email": "ghost@example.com" }
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 (anti-enumeration)
      - No DB writes, no email sent

  PATH_AUTH_008_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User 'oauthonly@example.com' exists with provider='google', NO password_hash
    STEPS:
      1. POST /api/auth/forgot-password with body:
           { "email": "oauthonly@example.com" }
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 (anti-enumeration maintained)
      - No token created, no email sent (OAuth accounts cannot reset credentials password)

EVIDENCE:
  - Screenshot: HTTP 200 response body for all TCs
  - DB verification: SELECT * FROM password_reset_tokens WHERE user_id='<id>'
  - Email log: Reset email captured (TC01, TC02); none captured (TC03, TC04)
  - Log: Rate-limit counter state (TC02)
```

---

### PATH_AUTH_009 — Reset password (happy)

```
PATH_AUTH_009:
TEST_CASES:

  PATH_AUTH_009_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Valid unused password reset token in DB: used=FALSE, expires_at > NOW()
      - Associated user has credentials provider
    STEPS:
      1. POST /api/auth/reset-password with body:
           { "token": "<valid_token>", "password": "NewSecure99!" }
      2. Capture HTTP response.
      3. Query DB: SELECT password_hash FROM users WHERE id = '<user_id>'.
      4. Query DB: SELECT used FROM password_reset_tokens WHERE token = '<valid_token>'.
    EXPECTED RESULT:
      - HTTP 200 { ok: true }
      - password_hash updated (new PBKDF2 hash)
      - token.used = TRUE

  PATH_AUTH_009_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Token expires_at = NOW() + 5 seconds (boundary — just valid)
    STEPS:
      1. POST /api/auth/reset-password immediately with valid token and new password.
    EXPECTED RESULT:
      - HTTP 200 { ok: true }, password updated

  PATH_AUTH_009_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Token exists but expired (expires_at < NOW())
    STEPS:
      1. POST /api/auth/reset-password with expired token and body:
           { "token": "<expired_token>", "password": "NewSecure99!" }
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 4xx error (token invalid/expired)
      - password_hash NOT updated

  PATH_AUTH_009_TC04:
    TYPE: failure
    PRECONDITIONS:
      - Token was already used (used = TRUE)
    STEPS:
      1. POST /api/auth/reset-password with already-used token.
    EXPECTED RESULT:
      - HTTP 4xx error
      - password_hash NOT updated again (replay prevented)

EVIDENCE:
  - Screenshot: HTTP 200 response for TC01, error responses for TC03/TC04
  - DB verification: SELECT password_hash FROM users (compare before/after TC01)
  - DB verification: SELECT used, expires_at FROM password_reset_tokens WHERE token='<token>'
```

---

### PATH_AUTH_010 — Middleware auth guard (security)

```
PATH_AUTH_010:
TEST_CASES:

  PATH_AUTH_010_TC01:
    TYPE: security
    PRECONDITIONS:
      - No session cookie / JWT present (unauthenticated browser or API client)
    STEPS:
      1. Send GET /report (no Authorization or session cookie).
      2. Capture HTTP response status and Location header.
      3. Repeat for: /dashboard, /compare, /settings, /api-usage, /admin.
    EXPECTED RESULT:
      - Each request: HTTP 302 redirect
      - Location header: /sign-in?callbackUrl=<original_path> for each respective path

  PATH_AUTH_010_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Session cookie present but JWT is expired
    STEPS:
      1. Craft or obtain an expired JWT and set it as session cookie.
      2. Send GET /dashboard.
      3. Capture redirect target.
    EXPECTED RESULT:
      - HTTP 302 redirect to /sign-in?callbackUrl=/dashboard

  PATH_AUTH_010_TC03:
    TYPE: security
    PRECONDITIONS:
      - Session cookie present with a tampered/invalid JWT signature
    STEPS:
      1. Set a session cookie with a manually modified JWT (e.g. alter payload bytes).
      2. Send GET /settings.
      3. Capture redirect.
    EXPECTED RESULT:
      - HTTP 302 redirect to /sign-in?callbackUrl=/settings
      - No protected content served

  PATH_AUTH_010_TC04:
    TYPE: happy
    PRECONDITIONS:
      - Valid authenticated session (correct JWT)
    STEPS:
      1. Sign in to obtain a valid session cookie.
      2. Send GET /dashboard.
      3. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 — dashboard page served (no redirect)

EVIDENCE:
  - Screenshot: Browser redirect chain for TC01 (DevTools Network tab)
  - Screenshot: Location header value for each guarded path
  - Log: Middleware log entries for each guarded path request
  - Note: Verify callbackUrl encoding is correct (URL-encoded path)
```

---

### PATH_REPORT_001 — Report generation (cache hit, happy)

```
PATH_REPORT_001:
TEST_CASES:

  PATH_REPORT_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated with valid JWT, within monthly quota
      - A cached report exists for the same location+intent key
      - User rate-limit counter < 10/60s
    STEPS:
      1. POST /api/report with body:
           { "location": "London, UK", "intent": "moving" }
         (Include Authorization: Bearer <jwt> header)
      2. Capture HTTP response status, body (id, report fields).
      3. Query DB: SELECT id, location, created_at FROM reports WHERE user_id='<id>' ORDER BY created_at DESC LIMIT 1.
      4. Query DB: SELECT event FROM activity_events WHERE user_id='<id>' AND event='cache_hit' ORDER BY created_at DESC LIMIT 1.
      5. Confirm report email dispatched to user's email address.
    EXPECTED RESULT:
      - HTTP 200 { id: <uuid>, report: { ... } }
      - New row in reports table with correct user_id and location
      - activity_events row: event = 'cache_hit'
      - Report email sent (awaited before response)

  PATH_REPORT_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User is at exactly 9 requests/60s (1 below rate limit)
    STEPS:
      1. Configure rate-limit counter to 9 for test user.
      2. POST /api/report with valid cached location.
      3. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 (10th request allowed)

  PATH_REPORT_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User JWT is missing or invalid
    STEPS:
      1. POST /api/report without Authorization header (or with invalid token).
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized
      - No report created, no cache lookup performed

  PATH_REPORT_001_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User authenticated, within quota, cache HIT for location
      - intent value is 'investing' (alternate intent)
    STEPS:
      1. POST /api/report with body:
           { "location": "London, UK", "intent": "investing" }
      2. Capture response.
      3. Verify activity_events event = 'cache_hit' recorded with intent='investing'.
    EXPECTED RESULT:
      - HTTP 200, cache_hit event recorded, report returned with investing-specific data

EVIDENCE:
  - Screenshot: HTTP 200 response body showing id and report object
  - DB verification: SELECT * FROM reports WHERE id='<returned_id>'
  - DB verification: SELECT event FROM activity_events WHERE event='cache_hit'
  - Email log: Report email dispatch confirmation
  - Request ID: Capture X-Request-Id header from response
```

---

### PATH_REPORT_002 — Report generation (cache miss, full pipeline, happy)

```
PATH_REPORT_002:
TEST_CASES:

  PATH_REPORT_002_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated, within monthly quota, rate-limit counter < 10
      - No cached report for the given location+intent key
      - All 6 external APIs (police.uk, IMD, OSM, FloodRisk, LandRegistry, Ofsted) returning valid mocked data
      - Anthropic (Claude Sonnet) mock returns valid JSON report
    STEPS:
      1. POST /api/report with body:
           { "location": "Manchester, UK", "intent": "moving" }
      2. Capture HTTP response status and body.
      3. Query DB: SELECT id, location FROM reports WHERE user_id='<id>' ORDER BY created_at DESC LIMIT 1.
      4. Query DB: SELECT event FROM activity_events WHERE event='report.generated' ORDER BY created_at DESC LIMIT 1.
      5. Check cache store: confirm report was written (fire-and-forget setCachedReport).
    EXPECTED RESULT:
      - HTTP 200 { id, report } with all dimensions, scores, data_freshness, property_data, schools_data populated
      - Report row in DB
      - activity_events event = 'report.generated'
      - Cache entry set asynchronously

  PATH_REPORT_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - All 6 external APIs return minimal but valid responses (empty arrays / minimal data)
    STEPS:
      1. Configure API mocks to return minimal valid responses.
      2. POST /api/report with a location not in cache.
      3. Capture and validate response structure.
    EXPECTED RESULT:
      - HTTP 200, report generated with low scores (minimal data)
      - All required response fields present (none null/undefined that shouldn't be)

  PATH_REPORT_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Anthropic API mock returns malformed JSON (non-parseable string, no markdown fence)
    STEPS:
      1. Configure Anthropic mock to return plain text with no JSON.
      2. POST /api/report with a fresh location.
      3. Capture HTTP response.
    EXPECTED RESULT:
      - System attempts markdown fence fallback parse
      - If still unparseable: HTTP 500 or graceful error
      - No partial/corrupt report saved

  PATH_REPORT_002_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Anthropic mock returns JSON wrapped in markdown code fence: ```

---

### PATH_REPORT_003 — Report with unresolvable location (edge)

```
PATH_REPORT_003:
TEST_CASES:

  PATH_REPORT_003_TC01:
    TYPE: edge
    PRECONDITIONS:
      - User authenticated, within quota
      - geocodeArea mock returns null for given location
      - All 6 external API mocks return null (no data for unresolvable location)
    STEPS:
      1. POST /api/report with body:
           { "location": "XYZZY_NONEXISTENT_PLACE_123", "intent": "moving" }
      2. Capture HTTP response.
      3. Verify report.area_type field in response.
      4. Verify report score values.
    EXPECTED RESULT:
      - HTTP 200 (report still generated)
      - area_type = 'suburban' (default fallback)
      - All scores approximately 50 (neutral defaults)
      - LLM narrates from general knowledge only
      - Report saved to DB

  PATH_REPORT_003_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - geocodeArea returns null but 1 out of 6 data sources returns partial data (partially resolvable)
    STEPS:
      1. Configure mocks: geocodeArea=null, only LandRegistry mock returns data, others null.
      2. POST /api/report.
      3. Inspect scores.
    EXPECTED RESULT:
      - HTTP 200
      - Scores derived from partial data where available; others default to ~50

  PATH_REPORT_003_TC03:
    TYPE: failure
    PRECONDITIONS:
      - geocodeArea mock throws a network error (not just null)
    STEPS:
      1. Configure geocodeArea mock to throw an exception.
      2. POST /api/report.
      3. Capture response.
    EXPECTED RESULT:
      - System handles exception gracefully
      - Either HTTP 500 with structured error, or falls back to null geocode path (same as TC01)

  PATH_REPORT_003_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Valid location but Ofsted data returns null (single source unavailable)
    STEPS:
      1. Configure all mocks to return data except Ofsted (returns null).
      2. POST /api/report.
      3. Inspect schools_data in response.
    EXPECTED RESULT:
      - HTTP 200, report generated
      - schools_data = null or empty array (gracefully handled)
      - Other dimensions scored normally

EVIDENCE:
  - Screenshot: Response body showing area_type='suburban' and scores ≈50 (TC01)
  - Log: geocodeArea null path log entry (TC01)
  - DB verification: SELECT area_type, scores FROM reports WHERE id='<id>'
```

---

### PATH_REPORT_004 — Monthly quota exceeded (failure)

```
PATH_REPORT_004:
TEST_CASES:

  PATH_REPORT_004_TC01:
    TYPE: failure
    PRECONDITIONS:
      - User authenticated
      - Monthly report count equals plan limit (e.g., free plan limit = 3, user has 3 reports this month)
    STEPS:
      1. POST /api/report with body:
           { "location": "Leeds, UK", "intent": "moving" }
      2. Capture HTTP response status and body.
      3. Query DB: confirm no new report row created.
    EXPECTED RESULT:
      - HTTP 403 { error: "limit_reached", used: <n>, limit: <n>, plan: "free" }
      - No new report row in DB
      - No external API calls made

  PATH_REPORT_004_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User has used exactly limit-1 reports this month (one slot remaining)
    STEPS:
      1. POST /api/report (should succeed — one slot left).
      2. Immediately POST /api/report again.
      3. Capture status of second request.
    EXPECTED RESULT:
      - First: HTTP 200
      - Second: HTTP 403 limit_reached

  PATH_REPORT_004_TC03:
    TYPE: edge
    PRECONDITIONS:
      - User is on business plan (high limit) and is exactly at limit
    STEPS:
      1. Set monthly report count to business plan limit.
      2. POST /api/report.
    EXPECTED RESULT:
      - HTTP 403 { error: "limit_reached", plan: "business", used: <n>, limit: <n> }

  PATH_REPORT_004_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Superuser (email in SUPERUSER list) with report count at 999
    STEPS:
      1. POST /api/report as superuser.
      2. Capture response.
    EXPECTED RESULT:
      - HTTP 200 — superusers bypass quota check (if applicable per implementation)
      - TEST GAP: Confirm whether superusers are quota-exempt

EVIDENCE:
  - Screenshot: HTTP 403 response body with used/limit/plan fields
  - DB verification: SELECT COUNT(*) FROM reports WHERE user_id='<id>' AND created_at > date_trunc('month', NOW())
  - Log: canGenerateReport returning {allowed:false}
```

---

### PATH_REPORT_005 — Input injection attempt (security)

```
PATH_REPORT_005:
TEST_CASES:

  PATH_REPORT_005_TC01:
    TYPE: security
    PRECONDITIONS:
      - User authenticated, within quota
    STEPS:
      1. POST /api/report with body:
           { "location": "<script>alert('xss')</script>London", "intent": "moving" }
      2. Capture HTTP response status and body.
      3. Query DB: confirm no report row created.
    EXPECTED RESULT:
      - HTTP 400 with validation error
      - No DB write, no external API calls

  PATH_REPORT_005_TC02:
    TYPE: security
    PRECONDITIONS:
      - User authenticated, within quota
    STEPS:
      1. POST /api/report with body:
           { "location": "'; DROP TABLE users; --", "intent": "moving" }
      2. Capture HTTP response.
      3. Query DB: confirm users table still exists and has correct row count.
    EXPECTED RESULT:
      - HTTP 400 validation error
      - DB tables intact (SQL injection not executed)

  PATH_REPORT_005_TC03:
    TYPE: security
    PRECONDITIONS:
      - User authenticated, within quota
    STEPS:
      1. POST /api/report with body:
           { "location": "SELECT * FROM users --", "intent": "moving" }
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 400 validation error (SQL keywords in location rejected)

  PATH_REPORT_005_TC04:
    TYPE: security
    PRECONDITIONS:
      - User authenticated, within quota
    STEPS:
      1. POST /api/report with body:
           { "location": "London", "intent": "<img src=x onerror=alert(1)>" }
         (injection in intent field)
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 400 validation error (intent field also validated / sanitized)

EVIDENCE:
  - Screenshot: HTTP 400 responses for all TCs
  - Log: validateLocationInput / validateIntent rejection log entries
  - DB verification: SELECT COUNT(*) FROM users (unchanged after TC02 SQL injection attempt)
  - DB verification: No new report row after any TC
```

---

### PATH_REPORT_006 — Report rate limit (security)

```
PATH_REPORT_006:
TEST_CASES:

  PATH_REPORT_006_TC01:
    TYPE: security
    PRECONDITIONS:
      - User authenticated
      - 10 requests already made in last 60 seconds by this userId
    STEPS:
      1. Configure rate-limit counter to 10 for test userId.
      2. POST /api/report.
      3. Capture HTTP response status and headers.
    EXPECTED RESULT:
      - HTTP 429
      - Response headers include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

  PATH_REPORT_006_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Exactly 9 requests in last 60s (1 below limit)
    STEPS:
      1. Configure rate-limit counter to 9 for test userId.
      2. POST /api/report.
    EXPECTED RESULT:
      - HTTP 200 (10th request allowed)
      - X-RateLimit-Remaining: 0 in response headers

  PATH_REPORT_006_TC03:
    TYPE: security
    PRECONDITIONS:
      - User rate-limited (counter = 10)
    STEPS:
      1. Wait 61 seconds (or reset rate-limit window in test environment).
      2. POST /api/report.
    EXPECTED RESULT:
      - HTTP 200 (rate limit window reset)

  PATH_REPORT_006_TC04:
    TYPE: security
    PRECONDITIONS:
      - Two different authenticated users, User A has counter = 10, User B has counter = 0
    STEPS:
      1. POST /api/report as User B.
    EXPECTED RESULT:
      - HTTP 200 for User B — rate limit is per-userId, not global

EVIDENCE:
  - Screenshot: HTTP 429 response with X-RateLimit-* headers (TC01)
  - Log: Rate-limit middleware log showing userId counter
  - DB verification: No new report row for TC01 request
```

---

### PATH_REPORT_007 — Fetch report by ID (happy)

```
PATH_REPORT_007:
TEST_CASES:

  PATH_REPORT_007_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - Report with id='<report_id>' exists in DB owned by this user
    STEPS:
      1. GET /api/report/<report_id> with Authorization header.
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 200 with full report data object

  PATH_REPORT_007_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Report id is a valid UUID format but does not exist in DB
    STEPS:
      1. GET /api/report/00000000-0000-0000-0000-000000000000
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 404

  PATH_REPORT_007_TC03:
    TYPE: failure
    PRECONDITIONS:
      - No session / JWT missing
    STEPS:
      1. GET /api/report/<report_id> without Authorization header.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized

  PATH_REPORT_007_TC04:
    TYPE: security
    PRECONDITIONS:
      - User A authenticated; report_id owned by User B
    STEPS:
      1. GET /api/report/<user_b_report_id> authenticated as User A.
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 404 (WHERE user_id=A predicate returns no row — no data leak)

EVIDENCE:
  - Screenshot: HTTP 200 response body (TC01)
  - Screenshot: HTTP 404 response (TC02, TC04)
  - DB verification: SELECT user_id FROM reports WHERE id='<report_id>' (confirm ownership check)
```

---

### PATH_REPORT_008 — Delete report (happy)

```
PATH_REPORT_008:
TEST_CASES:

  PATH_REPORT_008_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - Report with id='<report_id>' exists, owned by this user
    STEPS:
      1. DELETE /api/report/<report_id> with Authorization header.
      2. Capture HTTP response.
      3. Query DB: SELECT id FROM reports WHERE id = '<report_id>'.
    EXPECTED RESULT:
      - HTTP 200 { ok: true }
      - DB row deleted (query returns no rows)

  PATH_REPORT_008_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Report id is valid UUID format but does not exist
    STEPS:
      1. DELETE /api/report/00000000-0000-0000-0000-000000000000
    EXPECTED RESULT:
      - HTTP 404 (RETURNING id returns no rows)

  PATH_REPORT_008_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User authenticated
      - Report exists but is owned by a different user
    STEPS:
      1. DELETE /api/report/<other_user_report_id>
    EXPECTED RESULT:
      - HTTP 404 (WHERE user_id predicate protects against cross-user deletion)
      - Report still present in DB

  PATH_REPORT_008_TC04:
    TYPE: failure
    PRECONDITIONS:
      - No session / JWT missing
    STEPS:
      1. DELETE /api/report/<report_id> without Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized

EVIDENCE:
  - Screenshot: HTTP 200 response (TC01), HTTP 404 (TC02, TC03)
  - DB verification: SELECT * FROM reports WHERE id='<report_id>' before/after DELETE (TC01)
```

---

### PATH_REPORT_009 — IDOR attempt on report fetch (security)

```
PATH_REPORT_009:
TEST_CASES:

  PATH_REPORT_009_TC01:
    TYPE: security
    PRECONDITIONS:
      - User A authenticated (userId=A)
      - Report id='<report_b_id>' exists in DB with user_id=B
    STEPS:
      1. GET /api/report/<report_b_id> authenticated as User A.
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 404 (not 200, not 403)
      - Response body does NOT contain any of User B's report data
      - No information leakage about report existence

  PATH_REPORT_009_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User A attempts to access their own report (correct ownership)
    STEPS:
      1. GET /api/report/<report_a_id> authenticated as User A.
    EXPECTED RESULT:
      - HTTP 200 with report data (valid IDOR guard does not block owner)

  PATH_REPORT_009_TC03:
    TYPE: security
    PRECONDITIONS:
      - User A attempts DELETE on User B's report
    STEPS:
      1. DELETE /api/report/<report_b_id> as User A.
    EXPECTED RESULT:
      - HTTP 404 — no deletion, no data leak

  PATH_REPORT_009_TC04:
    TYPE: security
    PRECONDITIONS:
      - Unauthenticated request targeting a known report ID
    STEPS:
      1. GET /api/report/<known_report_id> with no session.
    EXPECTED RESULT:
      - HTTP 401 (auth check before DB lookup — no report data returned)

EVIDENCE:
  - Screenshot: HTTP 404 response body for TC01 (no report fields visible)
  - Log: DB query log showing WHERE user_id='A' predicate applied
  - DB verification: SELECT * FROM reports WHERE id='<report_b_id>' (row still present after TC03)
```

---

### PATH_API_001 — API key report generation (happy)

```
PATH_API_001:
TEST_CASES:

  PATH_API_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User has a valid, non-revoked API key starting with 'aiq_'
      - User is on developer/business/growth plan (hasApiAccess = TRUE)
      - Monthly quota not exceeded
      - Rate-limit counter for key < 30/60s
    STEPS:
      1. POST /api/v1/report with header:
           Authorization: Bearer aiq_<valid_key>
         Body: { "location": "Bristol, UK", "intent": "moving" }
      2. Capture HTTP response status and body.
      3. Query DB: SELECT event FROM activity_events WHERE event = 'api.report.generated' ORDER BY created_at DESC LIMIT 1.
    EXPECTED RESULT:
      - HTTP 200 { id, report }
      - activity_events row: event = 'api.report.generated'

  PATH_API_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - API key rate-limit counter = 29 (1 below limit)
    STEPS:
      1. POST /api/v1/report with valid key.
    EXPECTED RESULT:
      - HTTP 200 (30th request within limit)

  PATH_API_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User on free plan (hasApiAccess = FALSE)
      - Valid non-revoked API key
    STEPS:
      1. POST /api/v1/report with:
           Authorization: Bearer aiq_<free_plan_key>
    EXPECTED RESULT:
      - HTTP 403 (hasApiAccess returns false — API not available on free plan)

  PATH_API_001_TC04:
    TYPE: failure
    PRECONDITIONS:
      - Valid API key, correct plan, but monthly quota exceeded
    STEPS:
      1. Set monthly report count to plan limit for test user.
      2. POST /api/v1/report.
    EXPECTED RESULT:
      - HTTP 403 { error: "limit_reached", used, limit, plan }

EVIDENCE:
  - Screenshot: HTTP 200 response with id and report object
  - DB verification: SELECT event FROM activity_events WHERE event='api.report.generated'
  - Log: validateApiKey and hasApiAccess execution trace
```

---

### PATH_API_002 — Missing/malformed Authorization header (security)

```
PATH_API_002:
TEST_CASES:

  PATH_API_002_TC01:
    TYPE: security
    PRECONDITIONS:
      - No Authorization header present
    STEPS:
      1. POST /api/v1/report with body { "location": "London", "intent": "moving" } — NO Authorization header.
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 401 immediately (no DB lookup, no processing)

  PATH_API_002_TC02:
    TYPE: security
    PRECONDITIONS:
      - Authorization header present but uses wrong scheme
    STEPS:
      1. POST /api/v1/report with header:
           Authorization: Basic dXNlcjpwYXNz
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 401 (non-Bearer format rejected immediately)

  PATH_API_002_TC03:
    TYPE: security
    PRECONDITIONS:
      - Authorization header: 'Bearer' with no value after it
    STEPS:
      1. POST /api/v1/report with header:
           Authorization: Bearer
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 401

  PATH_API_002_TC04:
    TYPE: security
    PRECONDITIONS:
      - Authorization header present with valid Bearer format but key does NOT start with 'aiq_'
    STEPS:
      1. POST /api/v1/report with header:
           Authorization: Bearer sk_live_randomstring
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 401 (key format invalid — aiq_ prefix required)

EVIDENCE:
  - Screenshot: HTTP 401 response body for each TC
  - Log: Middleware rejecting at header validation stage (no DB query logs)
```

---

### PATH_API_003 — Revoked API key (security)

```
PATH_API_003:
TEST_CASES:

  PATH_API_003_TC01:
    TYPE: security
    PRECONDITIONS:
      - API key 'aiq_revokedkey123' exists in api_keys table with revoked = TRUE
    STEPS:
      1. POST /api/v1/report with header:
           Authorization: Bearer aiq_revokedkey123
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 401 (validateApiKey returns null for revoked key)
      - No report generated, no quota consumed

  PATH_API_003_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Key was revoked 1 second ago (just revoked)
    STEPS:
      1. POST /api/v1/report with just-revoked key.
    EXPECTED RESULT:
      - HTTP 401 (revocation is immediate)

  PATH_API_003_TC03:
    TYPE: edge
    PRECONDITIONS:
      - Key is valid and not revoked
    STEPS:
      1. POST /api/v1/report with valid key.
      2. DELETE /api/keys/<key_id> to revoke it.
      3. POST /api/v1/report with same key again.
    EXPECTED RESULT:
      - First request: HTTP 200
      - Third request: HTTP 401 (revocation takes effect immediately)

  PATH_API_003_TC04:
    TYPE: security
    PRECONDITIONS:
      - Key 'aiq_nonexistent' does NOT exist in api_keys table at all
    STEPS:
      1. POST /api/v1/report with:
           Authorization: Bearer aiq_nonexistent_key_9999
    EXPECTED RESULT:
      - HTTP 401 (key not found in DB — same path as revoked)

EVIDENCE:
  - Screenshot: HTTP 401 response for TC01
  - DB verification: SELECT revoked FROM api_keys WHERE key = 'aiq_revokedkey123'
  - Log: validateApiKey returning null for revoked/nonexistent key
```

---

### PATH_BILLING_003 — Webhook: checkout.session.completed (happy)

```
PATH_BILLING_003:
TEST_CASES:

  PATH_BILLING_003_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Valid Stripe webhook signature (test secret)
      - Event type: 'checkout.session.completed'
      - Metadata contains user_id and plan
      - Event not previously processed (not in webhook_events table)
    STEPS:
      1. POST /api/stripe/webhook with Stripe-Signature header and checkout.session.completed payload.
      2. Capture HTTP response.
      3. Query DB: SELECT plan, status FROM subscriptions WHERE user_id = '<user_id>'.
      4. Query DB: SELECT event, processed_at FROM webhook_events WHERE stripe_event_id = '<event_id>'.
      5. Query DB: SELECT event FROM activity_events WHERE event = 'plan.upgraded'.
    EXPECTED RESULT:
      - HTTP 200 { received: true }
      - subscriptions row upserted with correct plan
      - webhook_events row: processed
      - activity_events: event = 'plan.upgraded'

  PATH_BILLING_003_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Valid webhook with checkout.session.completed
      - subscriptions row does NOT yet exist (new subscriber, no row)
    STEPS:
      1. POST webhook payload for new subscriber.
    EXPECTED RESULT:
      - HTTP 200, new subscriptions row created (upsert)

  PATH_BILLING_003_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Stripe-Signature header is missing
    STEPS:
      1. POST /api/stripe/webhook without Stripe-Signature header.
    EXPECTED RESULT:
      - HTTP 400 "Invalid signature"
      - No DB writes

  PATH_BILLING_003_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Valid webhook but missing metadata (no user_id in session metadata)
    STEPS:
      1. POST webhook with empty metadata.
    EXPECTED RESULT:
      - HTTP 500 or 400 with structured error — no silent failure
      - TEST GAP: Confirm error handling for missing metadata (Risk: Medium)

EVIDENCE:
  - Screenshot: HTTP 200 { received: true } response (TC01)
  - DB verification: SELECT * FROM subscriptions WHERE user_id='<id>' after TC01
  - DB verification: SELECT * FROM webhook_events WHERE stripe_event_id='<id>'
  - Log: Stripe signature verification log entry
```

---

### PATH_BILLING_004 — Webhook: customer.subscription.updated (happy)

```
PATH_BILLING_004:
TEST_CASES:

  PATH_BILLING_004_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Valid Stripe webhook signature
      - Event type: 'customer.subscription.updated'
      - Existing subscriptions row for this user
    STEPS:
      1. POST /api/stripe/webhook with customer.subscription.updated payload.
      2. Capture HTTP response.
      3. Query DB: SELECT status, current_period_start, current_period_end FROM subscriptions WHERE user_id='<id>'.
    EXPECTED RESULT:
      - HTTP 200 { received: true }
      - subscriptions row updated: status and period dates reflect new subscription state

  PATH_BILLING_004_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Subscription status changes from 'active' to 'past_due'
    STEPS:
      1. POST webhook with status='past_due' in subscription object.
    EXPECTED RESULT:
      - HTTP 200, subscriptions.status = 'past_due'

  PATH_BILLING_004_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Invalid Stripe signature
    STEPS:
      1. POST webhook with tampered payload.
    EXPECTED RESULT:
      - HTTP 400 "Invalid signature"

  PATH_BILLING_004_TC04:
    TYPE: edge
    PRECONDITIONS:
      - No existing subscription row for this customer
    STEPS:
      1. POST customer.subscription.updated for a customer ID with no matching subscriptions row.
    EXPECTED RESULT:
      - HTTP 200 (idempotent handling) OR upsert creates new row
      - TEST GAP: Confirm upsert vs update-only behavior (Risk: Low)

EVIDENCE:
  - Screenshot: HTTP 200 response (TC01)
  - DB verification: SELECT status, current_period_end FROM subscriptions WHERE user_id='<id>'
  - Log: Webhook handler execution path for subscription.updated event
```

---

### PATH_BILLING_005 — Webhook: customer.subscription.deleted (happy)

```
PATH_BILLING_005:
TEST_CASES:

  PATH_BILLING_005_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Valid Stripe webhook signature
      - Event type: 'customer.subscription.deleted'
      - Existing subscriptions row with plan='growth' and active stripe_subscription_id
    STEPS:
      1. POST /api/stripe/webhook with customer.subscription.deleted payload.
      2. Capture HTTP response.
      3. Query DB: SELECT plan, status, stripe_subscription_id FROM subscriptions WHERE user_id='<id>'.
    EXPECTED RESULT:
      - HTTP 200 { received: true }
      - subscriptions row: plan = 'free', status = 'active', stripe_subscription_id = NULL

  PATH_BILLING_005_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User was on highest paid plan (business) before deletion
    STEPS:
      1. POST webhook for user on business plan.
    EXPECTED RESULT:
      - DB: plan = 'free', stripe_subscription_id = NULL regardless of previous plan

  PATH_BILLING_005_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Invalid Stripe signature
    STEPS:
      1. POST webhook with tampered Stripe-Signature.
    EXPECTED RESULT:
      - HTTP 400 "Invalid signature"

  PATH_BILLING_005_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User already on free plan (no active subscription) when deletion event arrives
    STEPS:
      1. POST customer.subscription.deleted for user already on free plan.
    EXPECTED RESULT:
      - HTTP 200 (idempotent — SET free again is harmless)
      - DB: plan = 'free', stripe_subscription_id = NULL (no error)

EVIDENCE:
  - Screenshot: HTTP 200 response (TC01)
  - DB verification: SELECT plan, status, stripe_subscription_id FROM subscriptions (before/after)
  - Log: Webhook handler log for subscription.deleted path
```

---

### PATH_BILLING_006 — Webhook with invalid signature (security)

```
PATH_BILLING_006:
TEST_CASES:

  PATH_BILLING_006_TC01:
    TYPE: security
    PRECONDITIONS:
      - Stripe webhook secret configured in environment
    STEPS:
      1. POST /api/stripe/webhook with a valid-format Stripe-Signature header but wrong signing secret.
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 400 with body "Invalid signature"
      - No DB writes

  PATH_BILLING_006_TC02:
    TYPE: security
    PRECONDITIONS:
      - Valid payload but no Stripe-Signature header at all
    STEPS:
      1. POST /api/stripe/webhook without Stripe-Signature header.
    EXPECTED RESULT:
      - HTTP 400 "Invalid signature"

  PATH_BILLING_006_TC03:
    TYPE: security
    PRECONDITIONS:
      - Stripe-Signature header with correct format but expired timestamp (>5 min old)
    STEPS:
      1. POST /api/stripe/webhook with Stripe-Signature containing timestamp = NOW() - 6 minutes.
    EXPECTED RESULT:
      - HTTP 400 (Stripe timestamp tolerance check fails — replay attack prevented)

  PATH_BILLING_006_TC04:
    TYPE: security
    PRECONDITIONS:
      - Attacker sends request with completely fabricated JSON body and guessed signature
    STEPS:
      1. POST /api/stripe/webhook with arbitrary JSON body and fake Stripe-Signature.
    EXPECTED RESULT:
      - HTTP 400 "Invalid signature"
      - No DB changes

EVIDENCE:
  - Screenshot: HTTP 400 response body "Invalid signature" for each TC
  - Log: constructEvent exception caught and logged
  - DB verification: No new rows in webhook_events table after any of these TCs
```

---

### PATH_BILLING_007 — Duplicate webhook event (concurrency)

```
PATH_BILLING_007:
TEST_CASES:

  PATH_BILLING_007_TC01:
    TYPE: edge
    PRECONDITIONS:
      - Valid Stripe webhook signature
      - Event 'evt_001' already recorded in webhook_events table as processed
    STEPS:
      1. POST /api/stripe/webhook with the same stripe_event_id ('evt_001') for the second time.
      2. Capture HTTP response and body.
      3. Query DB: SELECT COUNT(*) FROM subscriptions (verify no duplicate updates).
    EXPECTED RESULT:
      - HTTP 200 { received: true, deduplicated: true }
      - No DB writes to subscriptions or activity_events

  PATH_BILLING_007_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Two simultaneous POST requests with the same stripe_event_id (concurrent delivery)
    STEPS:
      1. Fire two concurrent POST requests with event_id='evt_concurrent'.
      2. Capture both HTTP responses.
      3. Query DB: SELECT COUNT(*) FROM webhook_events WHERE stripe_event_id='evt_concurrent'.
    EXPECTED RESULT:
      - Exactly one of the two: HTTP 200 { received: true }
      - Other: HTTP 200 { received: true, deduplicated: true } OR both succeed with exactly 1 DB row

  PATH_BILLING_007_TC03:
    TYPE: happy
    PRECONDITIONS:
      - First time this event_id is sent
    STEPS:
      1. POST webhook with event_id='evt_new_001'.
    EXPECTED RESULT:
      - HTTP 200 { received: true } (no deduplicated field — first processing)
      - DB row inserted in webhook_events

  PATH_BILLING_007_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Event processed 24 hours ago (old event re-delivered)
    STEPS:
      1. POST webhook with stripe_event_id that has a webhook_events row 24h old.
    EXPECTED RESULT:
      - HTTP 200 { received: true, deduplicated: true }
      - No duplicate processing regardless of event age

EVIDENCE:
  - Screenshot: HTTP 200 { received: true, deduplicated: true } response body (TC01)
  - DB verification: SELECT COUNT(*) FROM webhook_events WHERE stripe_event_id='evt_001' (should be 1)
  - Log: isEventAlreadyProcessed returning TRUE log entry
```

---

### PATH_KEYS_001 — Create API key (happy)

```
PATH_KEYS_001:
TEST_CASES:

  PATH_KEYS_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - User is on developer/business/growth plan (hasApiAccess = TRUE)
    STEPS:
      1. POST /api/keys with body:
           { "name": "My Test Key" }
         Include Authorization header.
      2. Capture HTTP response status and body.
      3. Query DB: SELECT id, name, revoked FROM api_keys WHERE user_id = '<id>' ORDER BY created_at DESC LIMIT 1.
    EXPECTED RESULT:
      - HTTP 200 { key: { id, key: 'aiq_<48-char-hex>', name: 'My Test Key' } }
      - DB row: revoked = FALSE
      - Full key value shown ONLY in this response (not retrievable again)
      - key starts with 'aiq_'

  PATH_KEYS_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User already has maximum allowed API keys (if limit exists)
    STEPS:
      1. Create keys up to the limit.
      2. Attempt to create one more.
    EXPECTED RESULT:
      - HTTP 400 or 422 if limit exists, OR HTTP 200 if no limit
      - TEST GAP: Confirm whether per-user key count limit exists (Risk: Low)

  PATH_KEYS_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User on free plan (hasApiAccess = FALSE)
    STEPS:
      1. POST /api/keys with body: { "name": "Free Key" }.
    EXPECTED RESULT:
      - HTTP 403 (hasApiAccess check fails for free plan users)
      - No DB row created

  PATH_KEYS_001_TC04:
    TYPE: failure
    PRECONDITIONS:
      - No session / JWT missing
    STEPS:
      1. POST /api/keys without Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized

EVIDENCE:
  - Screenshot: HTTP 200 response body showing full key value (TC01)
  - DB verification: SELECT id, name, revoked FROM api_keys WHERE user_id='<id>'
  - Note: Document that full key value is only shown once (screenshot is the only record)
```

---

### PATH_KEYS_002 — Revoke API key (happy)

```
PATH_KEYS_002:
TEST_CASES:

  PATH_KEYS_002_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - API key with id='<key_id>' exists in api_keys owned by this user, revoked=FALSE
    STEPS:
      1. DELETE /api/keys/<key_id> with Authorization header.
      2. Capture HTTP response.
      3. Query DB: SELECT revoked FROM api_keys WHERE id = '<key_id>'.
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - api_keys.revoked = TRUE

  PATH_KEYS_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Key was already revoked (revoked = TRUE)
    STEPS:
      1. DELETE /api/keys/<already_revoked_key_id>.
    EXPECTED RESULT:
      - HTTP 200 { success: true } (idempotent) OR HTTP 404
      - TEST GAP: Confirm behavior on double-revoke (Risk: Low)

  PATH_KEYS_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Key ID does not exist in DB
    STEPS:
      1. DELETE /api/keys/00000000-0000-0000-0000-000000000000.
    EXPECTED RESULT:
      - HTTP 404

  PATH_KEYS_002_TC04:
    TYPE: security
    PRECONDITIONS:
      - User A authenticated; key_id owned by User B
    STEPS:
      1. DELETE /api/keys/<user_b_key_id> as User A.
    EXPECTED RESULT:
      - HTTP 404 (WHERE user_id predicate prevents cross-user revocation)
      - api_keys.revoked for User B's key remains FALSE

EVIDENCE:
  - Screenshot: HTTP 200 { success: true } (TC01)
  - DB verification: SELECT revoked FROM api_keys WHERE id='<key_id>' before/after DELETE (TC01)
  - DB verification: SELECT revoked FROM api_keys WHERE id='<user_b_key_id>' after TC04 (still FALSE)
```

---

### PATH_WIDGET_003 — CORS preflight (happy)

```
PATH_WIDGET_003:
TEST_CASES:

  PATH_WIDGET_003_TC01:
    TYPE: happy
    PRECONDITIONS:
      - No session required (public endpoint)
    STEPS:
      1. OPTIONS /api/widget with headers:
           Origin: https://example.com
           Access-Control-Request-Method: GET
           Access-Control-Request-Headers: Content-Type
      2. Capture HTTP response status and headers.
    EXPECTED RESULT:
      - HTTP 204 No Content
      - Headers present: Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers

  PATH_WIDGET_003_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Origin header from a different domain
    STEPS:
      1. OPTIONS /api/widget with Origin: https://another-domain.co.uk.
    EXPECTED RESULT:
      - HTTP 204 with CORS headers (widget is public — all origins allowed, or check allowed list)

  PATH_WIDGET_003_TC03:
    TYPE: edge
    PRECONDITIONS:
      - No Origin header (direct server-to-server call)
    STEPS:
      1. OPTIONS /api/widget without Origin header.
    EXPECTED RESULT:
      - HTTP 204 (preflight still handled)
      - TEST GAP: Confirm CORS behavior when Origin header absent (Risk: Low)

  PATH_WIDGET_003_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Access-Control-Request-Method: POST (non-allowed method requested)
    STEPS:
      1. OPTIONS /api/widget with Access-Control-Request-Method: POST.
    EXPECTED RESULT:
      - HTTP 204 with Access-Control-Allow-Methods NOT including POST (only GET allowed)
      - TEST GAP: Confirm exact allowed methods list (Risk: Low)

EVIDENCE:
  - Screenshot: HTTP 204 response headers showing CORS headers (TC01)
  - Note: Verify Access-Control-Allow-Origin value matches policy (wildcard vs specific domains)
```

---

### PATH_TRACK_001 — Pageview tracking (happy)

```
PATH_TRACK_001:
TEST_CASES:

  PATH_TRACK_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Page path is a valid trackable path (e.g., '/dashboard')
      - x-vercel-ip-country header available
      - User-Agent header present
    STEPS:
      1. POST /api/track with body:
           { "path": "/dashboard", "referrer": "https://google.com", "sessionId": "sess_abc123" }
         Include headers: User-Agent: 'Mozilla/5.0 (iPhone; ...)', x-vercel-ip-country: 'GB'
      2. Capture HTTP response.
      3. Query DB: SELECT * FROM pageviews WHERE path='/dashboard' ORDER BY created_at DESC LIMIT 1.
    EXPECTED RESULT:
      - HTTP 200 { ok: true }
      - pageviews row: path='/dashboard', country='GB', device='mobile', referrer='https://google.com'

  PATH_TRACK_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Path is exactly '/api/something' (should be skipped)
    STEPS:
      1. POST /api/track with body:
           { "path": "/api/some-route", "sessionId": "sess_001" }
      2. Query DB: confirm no pageviews row for this path.
    EXPECTED RESULT:
      - HTTP 200 { ok: true } (always 200)
      - No DB insert (paths starting with /api are skipped)

  PATH_TRACK_001_TC03:
    TYPE: edge
    PRECONDITIONS:
      - referrer is an internal URL (same domain)
    STEPS:
      1. POST /api/track with body:
           { "path": "/report", "referrer": "https://areaiq.app/dashboard", "sessionId": "sess_002" }
      2. Query DB for the row.
    EXPECTED RESULT:
      - HTTP 200 { ok: true }
      - pageviews row: referrer = NULL or empty (internal referrers cleaned to null)

  PATH_TRACK_001_TC04:
    TYPE: edge
    PRECONDITIONS:
      - DB error occurs during INSERT
    STEPS:
      1. Configure DB mock to throw error on pageviews INSERT.
      2. POST /api/track.
      3. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 { ok: true } (errors swallowed silently — tracking never blocks the client)
      - Error logged server-side but not propagated to response

EVIDENCE:
  - Screenshot: HTTP 200 { ok: true } for each TC
  - DB verification: SELECT * FROM pageviews WHERE path='/dashboard' ORDER BY created_at DESC (TC01)
  - DB verification: SELECT COUNT(*) FROM pageviews WHERE path LIKE '/api/%' = 0 (TC02)
  - Log: Error swallowed log entry (TC04)
```

---

### PATH_HEALTH_001 — Health check OK (happy)

```
PATH_HEALTH_001:
TEST_CASES:

  PATH_HEALTH_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Application running normally, DB connection healthy
    STEPS:
      1. GET /api/health (no auth required).
      2. Capture HTTP response status, body, and response time.
    EXPECTED RESULT:
      - HTTP 200
      - Body: { status: "ok", timestamp: "<ISO8601>", database: "connected" }
      - Response time < 500ms (reasonable SLA)

  PATH_HEALTH_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - DB is under high load but still responsive (slow query)
    STEPS:
      1. Simulate DB latency of 400ms.
      2. GET /api/health.
    EXPECTED RESULT:
      - HTTP 200 { status: "ok", database: "connected" } (still returns OK if SELECT 1 succeeds)

  PATH_HEALTH_001_TC03:
    TYPE: edge
    PRECONDITIONS:
      - Multiple simultaneous health check requests (load balancer scenario)
    STEPS:
      1. Send 10 concurrent GET /api/health requests.
    EXPECTED RESULT:
      - All 10: HTTP 200 { status: "ok" } (health endpoint is stateless and fast)

  PATH_HEALTH_001_TC04:
    TYPE: edge
    PRECONDITIONS:
      - Request includes Authorization header (test that auth is NOT required)
    STEPS:
      1. GET /api/health without any auth headers.
    EXPECTED RESULT:
      - HTTP 200 (no auth required for health check — publicly accessible)

EVIDENCE:
  - Screenshot: HTTP 200 response body with all fields (TC01)
  - Log: SELECT 1 query execution (TC01)
  - Response time measurement for TC01 and TC02
```

---

### PATH_HEALTH_002 — Health check degraded (failure)

```
PATH_HEALTH_002:
TEST_CASES:

  PATH_HEALTH_002_TC01:
    TYPE: failure
    PRECONDITIONS:
      - DB is unreachable (connection refused or timeout)
    STEPS:
      1. Stop/mock DB to make it unreachable.
      2. GET /api/health.
      3. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 503 Service Unavailable
      - Body: { status: "degraded", database: "unreachable" }
      - timestamp present in response

  PATH_HEALTH_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - DB connection times out after threshold (e.g., 5s timeout, query takes 6s)
    STEPS:
      1. Configure DB mock to delay SELECT 1 by 6 seconds.
      2. GET /api/health.
    EXPECTED RESULT:
      - HTTP 503 (timeout treated as unreachable)

  PATH_HEALTH_002_TC03:
    TYPE: edge
    PRECONDITIONS:
      - DB returns an error response (e.g., authentication failed, wrong credentials)
    STEPS:
      1. Configure DB with wrong credentials.
      2. GET /api/health.
    EXPECTED RESULT:
      - HTTP 503 { status: "degraded", database: "unreachable" }

  PATH_HEALTH_002_TC04:
    TYPE: edge
    PRECONDITIONS:
      - DB recovers mid-test (intermittent availability)
    STEPS:
      1. Take DB offline, send GET /api/health → expect 503.
      2. Bring DB back online, send GET /api/health again → expect 200.
    EXPECTED RESULT:
      - First request: HTTP 503
      - Second request: HTTP 200 { status: "ok", database: "connected" } (auto-recovery)

EVIDENCE:
  - Screenshot: HTTP 503 response body (TC01)
  - Log: DB connection error / exception caught (TC01)
  - Monitoring: Verify downstream alerting would trigger on 503 response
```

---

