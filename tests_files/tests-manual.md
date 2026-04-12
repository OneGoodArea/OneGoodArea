# AreaIQ — Manual Test Suite

> Tests requiring manual UI interaction, visual inspection, or browser-based verification.
> These tests involve:
> - Navigating UI pages
> - Clicking buttons and form interactions
> - Visual regression checks
> - OAuth flow verification
> - Stripe dashboard interactions
> - Manual billing operations

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

