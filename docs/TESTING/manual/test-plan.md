# AreaIQ — Complete Executable Test Plan

> Generated from pathway map. Covers all 47 PATH_IDs.
> Each path has TC01 (base), TC02 (boundary), TC03 (invalid input), TC04 (alternative branch where applicable), plus EVIDENCE requirements.

---

## MODULE: AUTH

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

### PATH_AUTH_005 — OAuth sign-in Google/GitHub (happy)

```
PATH_AUTH_005:
TEST_CASES:

  PATH_AUTH_005_TC01:
    TYPE: happy
    PRECONDITIONS:
      - OAuth provider mock (Google) returns email 'oauthuser@gmail.com', name 'Test User', image URL
      - No existing user row for this email
    STEPS:
      1. Initiate OAuth sign-in flow via GET /api/auth/signin/google (or mock OAuth callback).
      2. Simulate OAuth callback with provider payload: { email: 'oauthuser@gmail.com', name: 'Test User', image: 'https://...' }.
      3. Capture HTTP response and session.
      4. Query DB: SELECT id, email, email_verified, provider FROM users WHERE email = 'oauthuser@gmail.com'.
      5. Query DB: SELECT event FROM activity_events WHERE user_id = '<id>' AND event = 'auth.signin'.
    EXPECTED RESULT:
      - Session JWT issued with userId
      - DB row: email_verified = TRUE, provider = 'google'
      - activity_events row: event = 'auth.signin'

  PATH_AUTH_005_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User 'oauthuser@gmail.com' already exists in DB (returning OAuth user)
    STEPS:
      1. Trigger OAuth callback with same provider payload as TC01.
      2. Query DB for the user row after sign-in.
    EXPECTED RESULT:
      - No duplicate user row created
      - name and image fields updated in DB if provider returns new values
      - Session JWT issued successfully

  PATH_AUTH_005_TC03:
    TYPE: failure
    PRECONDITIONS:
      - OAuth provider mock returns no email (email = null or undefined)
    STEPS:
      1. Simulate OAuth callback with payload missing email field.
      2. Capture sign-in result.
    EXPECTED RESULT:
      - Sign-in fails — no session issued, no DB row created
      - User redirected to error page or sign-in page with error parameter

  PATH_AUTH_005_TC04:
    TYPE: happy
    PRECONDITIONS:
      - GitHub provider mock returns email 'ghuser@github.com'
    STEPS:
      1. Initiate GitHub OAuth sign-in flow.
      2. Simulate callback with GitHub provider payload.
      3. Query DB for user row.
    EXPECTED RESULT:
      - DB row created with provider = 'github', email_verified = TRUE
      - Session issued correctly (GitHub path works same as Google)

EVIDENCE:
  - Screenshot: Session cookie / JWT after TC01
  - Screenshot: DB user row showing email_verified=TRUE, provider='google'
  - Log: signIn callback execution with provider identifier
  - DB verification: SELECT COUNT(*) FROM users WHERE email = 'oauthuser@gmail.com' (should be 1 after TC02)
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

### PATH_AUTH_007 — Resend verification (happy)

```
PATH_AUTH_007:
TEST_CASES:

  PATH_AUTH_007_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User 'unverified@example.com' exists, email_verified=FALSE, provider='credentials'
      - No resend-verification requests in last 1 hour for this user
      - Old verification token exists
    STEPS:
      1. POST /api/auth/resend-verification with body:
           { "email": "unverified@example.com" }
      2. Capture HTTP response.
      3. Query DB: SELECT used FROM email_verification_tokens WHERE user_id = '<id>' ORDER BY created_at DESC LIMIT 2.
      4. Verify new email dispatched.
    EXPECTED RESULT:
      - HTTP 200 (always, even for invalid emails — prevents enumeration)
      - Old token: used = TRUE (invalidated)
      - New token: used = FALSE, expires_at ≈ NOW() + 24h
      - Verification email sent

  PATH_AUTH_007_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User has already requested 2 resend-verifications in the last hour (limit is 3/hour)
    STEPS:
      1. Simulate 2 prior resend requests in the rate-limit window.
      2. POST /api/auth/resend-verification for the 3rd time.
      3. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 (3rd request within limit — processed successfully)
      - New token created and email sent

  PATH_AUTH_007_TC03:
    TYPE: security
    PRECONDITIONS:
      - Email 'nonexistent@example.com' does NOT exist in DB
    STEPS:
      1. POST /api/auth/resend-verification with body:
           { "email": "nonexistent@example.com" }
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 (no enumeration — same response as valid email)
      - No DB writes, no email sent

  PATH_AUTH_007_TC04:
    TYPE: failure
    PRECONDITIONS:
      - User has already requested 3 resend-verifications in the last hour (rate limit reached)
    STEPS:
      1. Configure rate-limit counter to 3 for this user/email.
      2. POST /api/auth/resend-verification.
      3. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 returned (anti-enumeration; rate limit silently enforced)
      - No new token created, no email sent

EVIDENCE:
  - Screenshot: HTTP 200 responses for all TCs
  - DB verification: SELECT * FROM email_verification_tokens WHERE user_id='<id>' ORDER BY created_at DESC
  - Email log: Stub output showing new email dispatch (TC01, TC02); no dispatch (TC03, TC04)
  - Log: Rate-limit counter state for TC02, TC04
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

## MODULE: REPORT

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
      - Anthropic mock returns JSON wrapped in markdown code fence: ```json\n{...}\n```
    STEPS:
      1. Configure Anthropic mock to return markdown-fenced JSON.
      2. POST /api/report.
      3. Capture response and verify scores.
    EXPECTED RESULT:
      - HTTP 200, report parsed correctly via markdown fence fallback
      - Computed scores enforced over LLM-suggested scores

EVIDENCE:
  - Screenshot: Full response body for TC01 showing all data sections
  - Log: 6 parallel fetch calls logged with timing (TC01)
  - Log: Anthropic API call log (TC01, TC04)
  - DB verification: SELECT * FROM reports WHERE id='<returned_id>'
  - Cache verification: Cache store entry for location+intent key
  - Request ID: Capture X-Request-Id from response
```

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

## MODULE: API_V1

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

## MODULE: BILLING

---

### PATH_BILLING_001 — New Stripe checkout (happy)

```
PATH_BILLING_001:
TEST_CASES:

  PATH_BILLING_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated (JWT valid)
      - Valid plan name (e.g., 'growth')
      - No existing active Stripe subscription for this user
      - Stripe API mock: stripe.checkout.sessions.create returns { url: 'https://checkout.stripe.com/...' }
    STEPS:
      1. POST /api/stripe/checkout with body:
           { "plan": "growth" }
         Include Authorization header.
      2. Capture HTTP response.
      3. Query DB: SELECT stripe_customer_id FROM subscriptions WHERE user_id = '<id>'.
      4. Query DB: SELECT event FROM activity_events WHERE event = 'plan.upgrade.started'.
    EXPECTED RESULT:
      - HTTP 200 { url: 'https://checkout.stripe.com/...' }
      - subscriptions row upserted with stripe_customer_id
      - activity_events: event = 'plan.upgrade.started'

  PATH_BILLING_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User has no Stripe customer ID yet (first checkout)
    STEPS:
      1. POST /api/stripe/checkout with body: { "plan": "developer" }.
    EXPECTED RESULT:
      - HTTP 200 with checkout URL
      - New Stripe customer created (validate/create flow)
      - stripe_customer_id stored in DB

  PATH_BILLING_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User authenticated, invalid plan name submitted
    STEPS:
      1. POST /api/stripe/checkout with body:
           { "plan": "platinum_ultra" }
    EXPECTED RESULT:
      - HTTP 400 or 422 (invalid plan name rejected before Stripe call)
      - No Stripe API call made, no DB write

  PATH_BILLING_001_TC04:
    TYPE: failure
    PRECONDITIONS:
      - User not authenticated (no session)
    STEPS:
      1. POST /api/stripe/checkout with body: { "plan": "growth" } — no Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized

EVIDENCE:
  - Screenshot: HTTP 200 response with checkout URL (TC01)
  - DB verification: SELECT * FROM subscriptions WHERE user_id='<id>' after TC01
  - Log: Stripe API call log (checkout session creation)
  - DB verification: activity_events for 'plan.upgrade.started'
```

---

### PATH_BILLING_002 — Plan change (existing subscriber, happy)

```
PATH_BILLING_002:
TEST_CASES:

  PATH_BILLING_002_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - Active Stripe subscription exists: status='active', stripe_subscription_id set
      - Stripe mock: stripe.subscriptions.update returns success
    STEPS:
      1. POST /api/stripe/checkout with body:
           { "plan": "business" }
      2. Capture HTTP response.
      3. Query DB: SELECT plan FROM subscriptions WHERE user_id = '<id>'.
      4. Query DB: SELECT event FROM activity_events WHERE event = 'plan.changed'.
    EXPECTED RESULT:
      - HTTP 200 { url: "/dashboard?upgraded=true" }
      - subscriptions.plan updated to 'business'
      - activity_events: event = 'plan.changed'

  PATH_BILLING_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User is upgrading from lowest paid plan to highest
    STEPS:
      1. POST /api/stripe/checkout body: { "plan": "business" } (user currently on 'developer').
    EXPECTED RESULT:
      - HTTP 200, plan updated, proration applied (validated via Stripe mock call parameters)

  PATH_BILLING_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Stripe mock throws error on stripe.subscriptions.update
    STEPS:
      1. Configure Stripe mock to throw exception.
      2. POST /api/stripe/checkout with body: { "plan": "business" }.
    EXPECTED RESULT:
      - HTTP 500 or structured error response
      - DB plan NOT updated

  PATH_BILLING_002_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User is downgrading plan (business → growth)
    STEPS:
      1. POST /api/stripe/checkout body: { "plan": "growth" } (user on 'business').
    EXPECTED RESULT:
      - HTTP 200 { url: "/dashboard?upgraded=true" }
      - plan updated to 'growth', proration handled by Stripe

EVIDENCE:
  - Screenshot: HTTP 200 response body { url: "/dashboard?upgraded=true" } (TC01)
  - DB verification: SELECT plan FROM subscriptions before/after TC01
  - Log: Stripe subscriptions.update call with new priceId and cancel_at_period_end=false
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

### PATH_BILLING_008 — Cancel subscription (happy)

```
PATH_BILLING_008:
TEST_CASES:

  PATH_BILLING_008_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - Active subscription in DB with stripe_subscription_id set
      - Stripe mock: subscriptions.update returns cancel_at timestamp
    STEPS:
      1. POST /api/stripe/cancel with Authorization header.
      2. Capture HTTP response.
      3. Query DB: SELECT cancel_at FROM subscriptions WHERE user_id = '<id>'.
      4. Query DB: SELECT event FROM activity_events WHERE event = 'plan.cancelled'.
    EXPECTED RESULT:
      - HTTP 200 { ok: true, cancelAt: <timestamp> }
      - subscriptions.cancel_at set to period-end timestamp
      - activity_events: event = 'plan.cancelled'

  PATH_BILLING_008_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Subscription period ends today (cancel_at_period_end = today)
    STEPS:
      1. POST /api/stripe/cancel.
    EXPECTED RESULT:
      - HTTP 200 { ok: true, cancelAt: <today's_timestamp> }

  PATH_BILLING_008_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User has no active subscription (free plan, no stripe_subscription_id)
    STEPS:
      1. POST /api/stripe/cancel as free-plan user.
    EXPECTED RESULT:
      - HTTP 404 or 400 (no active subscription to cancel)
      - No Stripe API call made

  PATH_BILLING_008_TC04:
    TYPE: failure
    PRECONDITIONS:
      - No session / JWT missing
    STEPS:
      1. POST /api/stripe/cancel without Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized

EVIDENCE:
  - Screenshot: HTTP 200 response with cancelAt (TC01)
  - DB verification: SELECT cancel_at FROM subscriptions WHERE user_id='<id>'
  - Log: Stripe subscriptions.update call with cancel_at_period_end=true
  - DB verification: activity_events for 'plan.cancelled'
```

---

### PATH_BILLING_009 — Billing portal (happy)

```
PATH_BILLING_009:
TEST_CASES:

  PATH_BILLING_009_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - subscriptions row has stripe_customer_id set
      - Stripe mock: billingPortal.sessions.create returns { url: 'https://billing.stripe.com/...' }
    STEPS:
      1. POST /api/stripe/portal with Authorization header.
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 200 { url: 'https://billing.stripe.com/...' }

  PATH_BILLING_009_TC02:
    TYPE: failure
    PRECONDITIONS:
      - User has no stripe_customer_id in DB (never subscribed)
    STEPS:
      1. POST /api/stripe/portal.
    EXPECTED RESULT:
      - HTTP 404 or 400 (no stripe_customer_id found)
      - No Stripe API call made

  PATH_BILLING_009_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Stripe mock throws error on billingPortal.sessions.create
    STEPS:
      1. POST /api/stripe/portal.
    EXPECTED RESULT:
      - HTTP 500 with structured error response

  PATH_BILLING_009_TC04:
    TYPE: failure
    PRECONDITIONS:
      - No session / JWT missing
    STEPS:
      1. POST /api/stripe/portal without Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized

EVIDENCE:
  - Screenshot: HTTP 200 response with portal URL (TC01)
  - Log: Stripe billingPortal.sessions.create call log
  - DB verification: SELECT stripe_customer_id FROM subscriptions WHERE user_id='<id>'
```

---

## MODULE: KEYS

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

## MODULE: DASHBOARD

---

### PATH_DASH_001 — Dashboard page (happy)

```
PATH_DASH_001:
TEST_CASES:

  PATH_DASH_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated (valid session)
      - User has 3 reports in DB
      - User has an active 'growth' plan in subscriptions
      - User has 2 saved areas
    STEPS:
      1. GET /dashboard (with valid session cookie).
      2. Capture HTTP response status.
      3. Inspect rendered HTML for: report list, plan name, monthly count, saved areas.
    EXPECTED RESULT:
      - HTTP 200
      - DashboardClient rendered with correct report list, plan='growth', monthly count, saved areas

  PATH_DASH_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User authenticated, no reports, no saved areas (new user)
    STEPS:
      1. GET /dashboard.
    EXPECTED RESULT:
      - HTTP 200, empty state rendered (no errors), plan = 'free' (default)

  PATH_DASH_001_TC03:
    TYPE: security
    PRECONDITIONS:
      - No session (unauthenticated)
    STEPS:
      1. GET /dashboard without session cookie.
    EXPECTED RESULT:
      - HTTP 302 redirect to /sign-in?callbackUrl=/dashboard (middleware guard)

  PATH_DASH_001_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User email is in SUPERUSER list
    STEPS:
      1. GET /dashboard as superuser.
    EXPECTED RESULT:
      - HTTP 200
      - getUserPlan returns 'business' for superuser regardless of subscriptions row

EVIDENCE:
  - Screenshot: Dashboard page rendered with all sections visible (TC01)
  - Screenshot: Empty state (TC02)
  - Screenshot: Redirect to /sign-in (TC03)
  - Log: getUserPlan returning 'business' for superuser (TC04)
```

---

### PATH_DASH_002 — Compare page (happy + paywall)

```
PATH_DASH_002:
TEST_CASES:

  PATH_DASH_002_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated, on 'growth' plan (paid)
      - User has 2+ reports to compare
    STEPS:
      1. GET /compare (with valid session cookie).
      2. Capture HTTP response.
      3. Inspect rendered CompareClient component.
    EXPECTED RESULT:
      - HTTP 200, CompareClient rendered with user's reports list

  PATH_DASH_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User on paid plan but has 0 reports
    STEPS:
      1. GET /compare.
    EXPECTED RESULT:
      - HTTP 200, CompareClient rendered in empty state (no errors)

  PATH_DASH_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User authenticated but on 'free' plan
    STEPS:
      1. GET /compare as free-plan user.
    EXPECTED RESULT:
      - HTTP 302 redirect to /pricing (paywall enforced)

  PATH_DASH_002_TC04:
    TYPE: security
    PRECONDITIONS:
      - Unauthenticated user
    STEPS:
      1. GET /compare without session.
    EXPECTED RESULT:
      - HTTP 302 redirect to /sign-in?callbackUrl=/compare

EVIDENCE:
  - Screenshot: CompareClient rendered (TC01)
  - Screenshot: Redirect to /pricing (TC03)
  - Screenshot: Redirect to /sign-in (TC04)
  - DB verification: SELECT plan FROM subscriptions WHERE user_id='<id>' (TC01 vs TC03)
```

---

## MODULE: SETTINGS

---

### PATH_SETTINGS_001 — Change password (happy)

```
PATH_SETTINGS_001:
TEST_CASES:

  PATH_SETTINGS_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated, provider='credentials', email_verified=TRUE
      - Current password = 'OldPass123!'
    STEPS:
      1. POST /api/settings/password with body:
           { "currentPassword": "OldPass123!", "newPassword": "NewSecure99!" }
         Include Authorization header.
      2. Capture HTTP response.
      3. Query DB: SELECT password_hash FROM users WHERE id = '<id>'.
      4. Attempt sign-in with new password to confirm change.
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - password_hash updated in DB (new PBKDF2 hash)
      - Sign-in with new password succeeds

  PATH_SETTINGS_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - New password is exactly 8 characters (minimum valid length)
    STEPS:
      1. POST /api/settings/password with:
           { "currentPassword": "OldPass123!", "newPassword": "Exactly8" }
    EXPECTED RESULT:
      - HTTP 200 { success: true }, password updated

  PATH_SETTINGS_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - User authenticated, credentials provider
    STEPS:
      1. POST /api/settings/password with:
           { "currentPassword": "WrongPassword!", "newPassword": "NewSecure99!" }
    EXPECTED RESULT:
      - HTTP 400 or 401 (verifyPassword fails)
      - password_hash NOT updated

  PATH_SETTINGS_001_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User authenticated, provider='google' (OAuth user, no password_hash)
    STEPS:
      1. POST /api/settings/password with any body.
    EXPECTED RESULT:
      - HTTP 400 or 403 (must be credentials provider to change password)
      - No DB change

EVIDENCE:
  - Screenshot: HTTP 200 { success: true } (TC01)
  - DB verification: SELECT password_hash FROM users WHERE id='<id>' before/after TC01
  - Log: hashPassword (PBKDF2) execution log (TC01)
```

---

### PATH_SETTINGS_002 — Delete account (happy)

```
PATH_SETTINGS_002:
TEST_CASES:

  PATH_SETTINGS_002_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated
      - User has: 2 reports, 1 api_key, 3 activity_events, 1 email_verification_token, 1 subscription row
      - No active Stripe subscription (free plan user)
    STEPS:
      1. DELETE /api/settings/delete-account with Authorization header.
      2. Capture HTTP response.
      3. Query DB for each table: reports, api_keys, activity_events, email_verification_tokens, subscriptions, users WHERE user_id = '<id>'.
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - All 6 tables: 0 rows remaining for this user_id
      - Transaction was committed atomically

  PATH_SETTINGS_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User has no associated data (fresh account, no reports, no keys, etc.)
    STEPS:
      1. DELETE /api/settings/delete-account.
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - users row deleted (even with empty foreign key tables)

  PATH_SETTINGS_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - No session / JWT missing
    STEPS:
      1. DELETE /api/settings/delete-account without Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized
      - No DB changes

  PATH_SETTINGS_002_TC04:
    TYPE: failure
    PRECONDITIONS:
      - DB transaction fails mid-execution (e.g., simulate FK constraint error)
    STEPS:
      1. Configure DB mock to throw error during transaction.
      2. DELETE /api/settings/delete-account.
    EXPECTED RESULT:
      - HTTP 500 with error response
      - Transaction rolled back — no partial deletion (all-or-nothing)

EVIDENCE:
  - Screenshot: HTTP 200 { success: true } (TC01)
  - DB verification: SELECT COUNT(*) FROM users WHERE id='<id>' = 0 after TC01
  - DB verification: SELECT COUNT(*) FROM reports WHERE user_id='<id>' = 0 after TC01
  - Log: Transaction COMMIT log entry (TC01)
```

---

### PATH_SETTINGS_003 — Delete account with active Stripe subscription (edge)

```
PATH_SETTINGS_003:
TEST_CASES:

  PATH_SETTINGS_003_TC01:
    TYPE: edge
    PRECONDITIONS:
      - User authenticated
      - Active Stripe subscription: stripe_subscription_id = 'sub_active_123', status='active', plan='growth'
    STEPS:
      1. DELETE /api/settings/delete-account with Authorization header.
      2. Capture HTTP response.
      3. Query DB: confirm user row deleted.
      4. Query Stripe (or mock): confirm subscription 'sub_active_123' is still active in Stripe (NOT cancelled).
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - User and all associated DB rows deleted
      - Stripe subscription 'sub_active_123' is ORPHANED in Stripe (no cancellation call made — by design)

  PATH_SETTINGS_003_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Subscription is in 'cancel_at_period_end' state (already scheduled to cancel)
    STEPS:
      1. DELETE /api/settings/delete-account.
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - DB deleted; Stripe subscription still in cancel_at_period_end state (no extra call)

  PATH_SETTINGS_003_TC03:
    TYPE: security
    PRECONDITIONS:
      - Active subscription, no session
    STEPS:
      1. DELETE /api/settings/delete-account without Authorization.
    EXPECTED RESULT:
      - HTTP 401 Unauthorized
      - No DB deletion, Stripe subscription untouched

  PATH_SETTINGS_003_TC04:
    TYPE: edge
    PRECONDITIONS:
      - User has active subscription and many reports/keys
    STEPS:
      1. DELETE /api/settings/delete-account.
      2. Verify Stripe portal access no longer possible (customer ID gone from DB).
    EXPECTED RESULT:
      - HTTP 200 { success: true }
      - All DB rows deleted including subscriptions row (stripe_customer_id reference gone)
      - NOTE: Known design gap — Stripe subscription orphaned (log this as known issue)

EVIDENCE:
  - Screenshot: HTTP 200 response (TC01)
  - DB verification: SELECT * FROM users WHERE id='<id>' (should return 0 rows)
  - Stripe dashboard / mock verification: subscription 'sub_active_123' still present (TC01)
  - Log: Absence of Stripe cancellation API call in server logs (TC01)
  - TEST GAP: No Stripe cancellation on account delete. Risk: HIGH (billing continues after account deletion)
```

---

## MODULE: WIDGET

---

### PATH_WIDGET_001 — Widget embed (cache hit, happy)

```
PATH_WIDGET_001:
TEST_CASES:

  PATH_WIDGET_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - Cached report exists for postcode='SW1A1AA' and intent='moving'
      - Request origin is an allowed CORS origin (or any origin for public widget)
      - Rate-limit counter < 60/3600s for this origin/IP
    STEPS:
      1. GET /api/widget?postcode=SW1A1AA&intent=moving
         Include Origin header: https://example.com
      2. Capture HTTP response status, body, and headers.
    EXPECTED RESULT:
      - HTTP 200
      - Response body: { area, postcode, intent, score, area_type, dimensions[], powered_by }
      - Headers: Access-Control-Allow-Origin, Cache-Control: public, s-maxage=3600
      - No fields outside the condensed schema returned

  PATH_WIDGET_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Rate-limit counter = 59 (1 below limit of 60/3600s)
    STEPS:
      1. Configure rate-limit counter to 59 for test origin/IP.
      2. GET /api/widget?postcode=SW1A1AA&intent=moving.
    EXPECTED RESULT:
      - HTTP 200 (60th request within limit)

  PATH_WIDGET_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Intent parameter is invalid
    STEPS:
      1. GET /api/widget?postcode=SW1A1AA&intent=INVALID_INTENT
    EXPECTED RESULT:
      - HTTP 400 with validation error message

  PATH_WIDGET_001_TC04:
    TYPE: failure
    PRECONDITIONS:
      - Rate-limit counter = 60 (at limit)
    STEPS:
      1. Configure rate-limit counter to 60.
      2. GET /api/widget?postcode=SW1A1AA&intent=moving.
    EXPECTED RESULT:
      - HTTP 429 Too Many Requests

EVIDENCE:
  - Screenshot: HTTP 200 response body with all condensed fields (TC01)
  - Screenshot: Response headers showing CORS and Cache-Control (TC01)
  - Log: Cache hit log entry (TC01)
  - Log: Rate-limit counter state (TC02, TC04)
```

---

### PATH_WIDGET_002 — Widget embed (cache miss, edge)

```
PATH_WIDGET_002:
TEST_CASES:

  PATH_WIDGET_002_TC01:
    TYPE: edge
    PRECONDITIONS:
      - No cached report exists for postcode='E1W1AB' and intent='moving'
    STEPS:
      1. GET /api/widget?postcode=E1W1AB&intent=moving
      2. Capture HTTP response status and body.
    EXPECTED RESULT:
      - HTTP 404 with body containing "No cached data available"
      - No report generated on demand (widget is cache-only)

  PATH_WIDGET_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - Cache entry exists but is expired (stale)
    STEPS:
      1. Set up an expired cache entry for postcode='N11AA'.
      2. GET /api/widget?postcode=N11AA&intent=moving.
    EXPECTED RESULT:
      - HTTP 404 (expired cache treated as miss)
      - TEST GAP: Confirm whether expired cache returns 404 or stale data (Risk: Low)

  PATH_WIDGET_002_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Postcode parameter missing
    STEPS:
      1. GET /api/widget?intent=moving (no postcode).
    EXPECTED RESULT:
      - HTTP 400 (postcode required — validation error)

  PATH_WIDGET_002_TC04:
    TYPE: failure
    PRECONDITIONS:
      - Postcode format invalid (e.g., too short or non-UK format)
    STEPS:
      1. GET /api/widget?postcode=INVALID&intent=moving
    EXPECTED RESULT:
      - HTTP 400 (postcode validation fails)

EVIDENCE:
  - Screenshot: HTTP 404 response body "No cached data available..." (TC01)
  - Log: getCachedReport returning null/miss log entry (TC01)
  - Log: Validation error log entries (TC03, TC04)
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

## MODULE: ADMIN

---

### PATH_ADMIN_001 — Admin analytics page (happy)

```
PATH_ADMIN_001:
TEST_CASES:

  PATH_ADMIN_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - User authenticated with email in ADMIN_EMAILS environment variable list
      - DB has sufficient data for analytics queries (at least 1 user, 1 report, etc.)
    STEPS:
      1. GET /admin with valid session cookie (admin user).
      2. Capture HTTP response status.
      3. Inspect rendered AdminClient for: user counts, report counts, traffic analytics.
    EXPECTED RESULT:
      - HTTP 200
      - AdminClient rendered with analytics data from all 12+9 DB queries

  PATH_ADMIN_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - DB tables are empty (no data yet — fresh deployment)
    STEPS:
      1. GET /admin as admin user with empty DB.
    EXPECTED RESULT:
      - HTTP 200, AdminClient renders with zero-value stats (no 500 errors from empty result sets)

  PATH_ADMIN_001_TC03:
    TYPE: security
    PRECONDITIONS:
      - Unauthenticated user
    STEPS:
      1. GET /admin without session.
    EXPECTED RESULT:
      - HTTP 302 redirect to /sign-in?callbackUrl=/admin

  PATH_ADMIN_001_TC04:
    TYPE: edge
    PRECONDITIONS:
      - One of the 21 parallel DB queries throws an error
    STEPS:
      1. Configure DB mock to fail one analytics query.
      2. GET /admin as admin user.
    EXPECTED RESULT:
      - Either: HTTP 200 with partial data (graceful degradation) OR HTTP 500 with error
      - TEST GAP: Confirm error handling for partial analytics query failure (Risk: Medium)

EVIDENCE:
  - Screenshot: Admin page with analytics data (TC01)
  - Screenshot: Admin page with zero-value stats (TC02)
  - Log: 21 parallel DB query execution times (TC01)
  - Log: Redirect to /sign-in for unauthenticated (TC03)
```

---

### PATH_ADMIN_002 — Admin page unauthorized (security)

```
PATH_ADMIN_002:
TEST_CASES:

  PATH_ADMIN_002_TC01:
    TYPE: security
    PRECONDITIONS:
      - User authenticated, email NOT in ADMIN_EMAILS list
    STEPS:
      1. GET /admin with valid session (non-admin user).
      2. Capture HTTP response.
    EXPECTED RESULT:
      - HTTP 302 redirect to /dashboard
      - No admin data returned

  PATH_ADMIN_002_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - User email almost matches an ADMIN_EMAIL (e.g., 'admin@example.com ' with trailing space)
    STEPS:
      1. GET /admin with email 'admin@example.com ' (trailing space).
    EXPECTED RESULT:
      - HTTP 302 redirect to /dashboard (whitespace-padded email does NOT match)

  PATH_ADMIN_002_TC03:
    TYPE: security
    PRECONDITIONS:
      - User authenticated with email that is a subdomain of an admin email (e.g., admin@evil.example.com vs admin@example.com)
    STEPS:
      1. GET /admin with email 'admin@evil.example.com'.
    EXPECTED RESULT:
      - HTTP 302 redirect to /dashboard (exact match required)

  PATH_ADMIN_002_TC04:
    TYPE: security
    PRECONDITIONS:
      - Unauthenticated user (no session)
    STEPS:
      1. GET /admin without session.
    EXPECTED RESULT:
      - HTTP 302 redirect to /sign-in?callbackUrl=/admin (middleware catches before admin check)

EVIDENCE:
  - Screenshot: Redirect to /dashboard for authenticated non-admin (TC01)
  - Log: admin check: email not in ADMIN_EMAILS log entry (TC01)
  - DB verification: Confirm no admin data queries executed for non-admin user
```

---

## MODULE: TRACK

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

## MODULE: HEALTH

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

## MODULE: AREAS

---

### PATH_AREAS_001 — Static area SEO page (happy)

```
PATH_AREAS_001:
TEST_CASES:

  PATH_AREAS_001_TC01:
    TYPE: happy
    PRECONDITIONS:
      - areas.json contains an entry with slug='london'
      - Application served with static data
    STEPS:
      1. GET /area/london
      2. Capture HTTP response status and rendered HTML.
      3. Inspect page for: area name, pre-computed scores, SEO meta tags.
    EXPECTED RESULT:
      - HTTP 200
      - Static page rendered with correct area data from areas.json
      - SEO meta tags present (title, description)

  PATH_AREAS_001_TC02:
    TYPE: boundary
    PRECONDITIONS:
      - areas.json contains an entry with slug that has a hyphen (e.g., 'west-london')
    STEPS:
      1. GET /area/west-london
    EXPECTED RESULT:
      - HTTP 200, page rendered correctly (slug with hyphens handled)

  PATH_AREAS_001_TC03:
    TYPE: failure
    PRECONDITIONS:
      - Slug 'unknownplace999' does NOT exist in areas.json
    STEPS:
      1. GET /area/unknownplace999
      2. Capture HTTP response status.
    EXPECTED RESULT:
      - HTTP 404 (Next.js notFound() called)
      - 404 page rendered

  PATH_AREAS_001_TC04:
    TYPE: security
    PRECONDITIONS:
      - Slug contains path traversal attempt
    STEPS:
      1. GET /area/../admin
      2. GET /area/%2e%2e%2fadmin
    EXPECTED RESULT:
      - HTTP 404 (slug not found in areas.json) OR HTTP 400 (invalid slug format)
      - No admin content served

EVIDENCE:
  - Screenshot: HTTP 200 area page with correct content (TC01)
  - Screenshot: HTTP 404 page (TC03)
  - Log: notFound() called for unknown slug (TC03)
  - Source inspection: Verify areas.json contains slug='london' for TC01 baseline
```

---

## TRACEABILITY TABLE

| PATH_ID           | TEST_IDs                                                          |
|-------------------|-------------------------------------------------------------------|
| PATH_AUTH_001     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_002     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_003     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_004     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_005     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_006     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_007     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_008     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_009     | TC01, TC02, TC03, TC04                                            |
| PATH_AUTH_010     | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_001   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_002   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_003   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_004   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_005   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_006   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_007   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_008   | TC01, TC02, TC03, TC04                                            |
| PATH_REPORT_009   | TC01, TC02, TC03, TC04                                            |
| PATH_API_001      | TC01, TC02, TC03, TC04                                            |
| PATH_API_002      | TC01, TC02, TC03, TC04                                            |
| PATH_API_003      | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_001  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_002  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_003  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_004  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_005  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_006  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_007  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_008  | TC01, TC02, TC03, TC04                                            |
| PATH_BILLING_009  | TC01, TC02, TC03, TC04                                            |
| PATH_KEYS_001     | TC01, TC02, TC03, TC04                                            |
| PATH_KEYS_002     | TC01, TC02, TC03, TC04                                            |
| PATH_DASH_001     | TC01, TC02, TC03, TC04                                            |
| PATH_DASH_002     | TC01, TC02, TC03, TC04                                            |
| PATH_SETTINGS_001 | TC01, TC02, TC03, TC04                                            |
| PATH_SETTINGS_002 | TC01, TC02, TC03, TC04                                            |
| PATH_SETTINGS_003 | TC01, TC02, TC03, TC04                                            |
| PATH_WIDGET_001   | TC01, TC02, TC03, TC04                                            |
| PATH_WIDGET_002   | TC01, TC02, TC03, TC04                                            |
| PATH_WIDGET_003   | TC01, TC02, TC03, TC04                                            |
| PATH_ADMIN_001    | TC01, TC02, TC03, TC04                                            |
| PATH_ADMIN_002    | TC01, TC02, TC03, TC04                                            |
| PATH_TRACK_001    | TC01, TC02, TC03, TC04                                            |
| PATH_HEALTH_001   | TC01, TC02, TC03, TC04                                            |
| PATH_HEALTH_002   | TC01, TC02, TC03, TC04                                            |
| PATH_AREAS_001    | TC01, TC02, TC03, TC04                                            |

**Total paths covered: 47 / 47**
**Total test cases: 188**

---

## TEST GAPS

| # | PATH_ID           | Missing Information / Ambiguity                                                                              | Risk Level |
|---|-------------------|--------------------------------------------------------------------------------------------------------------|------------|
| 1 | PATH_SETTINGS_003 | No Stripe cancellation call on account deletion — orphaned subscription in Stripe. Behaviour by design?      | HIGH       |
| 2 | PATH_BILLING_003  | Behavior when webhook metadata is missing (no user_id) — silent fail vs structured error unknown             | MEDIUM     |
| 3 | PATH_ADMIN_001    | Behavior when one of 21 parallel analytics queries fails — partial render vs 500 not specified               | MEDIUM     |
| 4 | PATH_REPORT_004   | Whether superusers are exempt from quota checks not confirmed in pathway spec                                 | MEDIUM     |
| 5 | PATH_KEYS_001     | Per-user API key count limit not specified — whether a maximum exists is unknown                             | LOW        |
| 6 | PATH_KEYS_002     | Behavior on double-revoke (DELETE already-revoked key) — 200 idempotent vs 404 not specified                 | LOW        |
| 7 | PATH_BILLING_004  | Upsert vs update-only behavior for subscription.updated when no existing subscriptions row                   | LOW        |
| 8 | PATH_WIDGET_002   | Whether expired cache returns 404 or stale data not specified                                                | LOW        |
| 9 | PATH_WIDGET_003   | Exact CORS allowed-origins list and behavior without Origin header not specified                             | LOW        |
| 10| PATH_WIDGET_003   | Exact allowed HTTP methods for CORS not specified (GET only? GET + OPTIONS?)                                 | LOW        |

---

## FINAL STATUS

| Metric                        | Value   |
|-------------------------------|---------|
| Total PATH_IDs in spec        | 47      |
| PATH_IDs covered              | 47      |
| PATH_IDs skipped              | 0       |
| Total test cases generated    | 188     |
| Test cases per path (avg)     | 4       |
| Blocking gaps                 | 0       |
| Non-blocking gaps             | 10      |
| HIGH risk gaps                | 1       |
| MEDIUM risk gaps              | 3       |
| LOW risk gaps                 | 6       |

**Coverage: 100% of defined paths covered.**
**All gaps are non-blocking. No paths were skipped or redefined.**
