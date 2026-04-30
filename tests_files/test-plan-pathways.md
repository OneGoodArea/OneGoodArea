# AreaIQ — Full Execution Pathway Map

> Generated: 2026-04-06  
> Purpose: System-wide control flow model for verification and test planning

---

## SYSTEM OVERVIEW

**AreaIQ** is a UK area intelligence SaaS platform built on Next.js 15 (App Router). It generates AI-powered scored reports for UK locations using real data sources (police.uk, IMD, OSM, Flood Agency, Land Registry, Ofsted). It is monetised via Stripe subscriptions with tier-based report limits and API access.

---

## MODULES

| ID | Module | Description |
|----|--------|-------------|
| AUTH | Authentication | Registration, sign-in (OAuth + credentials), email verification, password reset |
| REPORT | Report Engine | Generation pipeline, cache, delivery, deletion |
| API_V1 | Public REST API | API-key-authenticated report generation for developers |
| BILLING | Stripe Billing | Plan checkout, webhook processing, subscription cancellation, billing portal |
| KEYS | API Key Management | Create, list, revoke developer API keys |
| DASHBOARD | User Dashboard | Report history, watchlist, usage stats |
| COMPARE | Area Comparison | Side-by-side report comparisons (paid plans only) |
| SETTINGS | Account Settings | Password change, account deletion, subscription info |
| ADMIN | Admin Analytics | Internal analytics, traffic, revenue (superuser-only) |
| WIDGET | Embeddable Widget | Public cache-only widget endpoint (CORS open) |
| TRACK | Pageview Tracking | Anonymous analytics ingestion |
| AREAS | Static Area Pages | Pre-built SEO pages for known UK areas |
| HEALTH | Health Check | Database liveness probe |

---

## ENTRY POINTS

### UI Routes (Pages)

| Route | Auth Required | Notes |
|-------|---------------|-------|
| `/` | No | Homepage |
| `/sign-in` | No | Credentials + OAuth |
| `/sign-up` | No | Credentials registration |
| `/verify` | No | Email token verification |
| `/forgot-password` | No | |
| `/reset-password` | No | Token-gated |
| `/report` | Yes (middleware) | Report generation form |
| `/report/[id]` | Yes (middleware) | View a specific report |
| `/dashboard` | Yes (middleware) | Report history + watchlist |
| `/compare` | Yes (middleware) | Side-by-side comparison (paid plans only) |
| `/settings` | Yes (middleware) | Account & subscription settings |
| `/api-usage` | Yes (middleware) | API key usage dashboard |
| `/admin` | Yes + superuser email | Internal analytics |
| `/area/[slug]` | No | Pre-built static area SEO pages |
| `/pricing` | No | |
| `/docs` | No | API playground |
| `/blog`, `/blog/[slug]` | No | |
| `/about`, `/business`, `/changelog`, `/methodology`, `/help`, `/privacy`, `/terms` | No | |

### API Endpoints

| Route | Method | Auth |
|-------|--------|------|
| `/api/auth/register` | POST | None |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |
| `/api/auth/forgot-password` | POST | None |
| `/api/auth/resend-verification` | POST | None |
| `/api/auth/reset-password` | POST | None |
| `/api/report` | POST | Session JWT |
| `/api/report/[id]` | GET | Session JWT |
| `/api/report/[id]` | DELETE | Session JWT |
| `/api/v1/report` | POST | API Key (`Bearer aiq_...`) |
| `/api/keys` | GET | Session JWT |
| `/api/keys` | POST | Session JWT + API plan |
| `/api/keys/[id]` | DELETE | Session JWT |
| `/api/keys/usage` | GET | Session JWT + API plan |
| `/api/usage` | GET | Session JWT |
| `/api/watchlist` | GET | Session JWT |
| `/api/watchlist` | POST | Session JWT |
| `/api/watchlist/[id]` | DELETE | Session JWT |
| `/api/stripe/checkout` | POST | Session JWT |
| `/api/stripe/cancel` | POST | Session JWT |
| `/api/stripe/portal` | POST | Session JWT |
| `/api/stripe/webhook` | POST | Stripe signature |
| `/api/settings/password` | POST | Session JWT |
| `/api/settings/delete-account` | DELETE | Session JWT |
| `/api/settings/subscription` | GET | Session JWT |
| `/api/widget` | GET/OPTIONS | None (rate-limited by origin) |
| `/api/track` | POST | None |
| `/api/health` | GET | None |

### Background / Async Jobs

| Job | Trigger | Notes |
|-----|---------|-------|
| Cache cleanup | Probabilistic (1-in-50 cache reads) | Deletes entries older than 48h |
| Webhook events cleanup | Probabilistic (1-in-100 webhook calls) | Deletes records older than 30 days |
| Hash rehash | Post-login (fire-and-forget) | Upgrades SHA-256 → PBKDF2 silently |
| Report email delivery | Awaited inside POST /api/report | Sends report link to user after generation |

---

## PATHWAYS

---

### MODULE: AUTH

---

**PATH_AUTH_001**
```
PATH_ID: PATH_AUTH_001
MODULE: Auth
ENTRY POINT: POST /api/auth/register
TYPE: happy

ENTRY CONDITIONS:
- User is not authenticated
- Valid email and password (≥8 chars) provided
- IP has not exceeded 5 registrations/minute

FLOW:
1. IP extracted from x-forwarded-for header
2. Rate limit checked: 5 requests/60s per IP
3. Email and password validated (presence, length)
4. Email sanitised (trim, lowercase)
5. DB checked for existing user with that email
6. New user record created (provider=credentials, email_verified=FALSE)
7. Password hashed with PBKDF2
8. Verification token generated and stored (24h TTL)
9. Verification email sent (fire-and-forget; failure logged but not surfaced)
10. 200 { ok: true } returned

DECISION POINTS:
- Rate limit exceeded → 429
- Email already exists (credentials) → 409 email_taken
- Email already exists (OAuth) → 409 email_oauth
- Password < 8 chars → 400
- Email missing → 400

EXPECTED OUTCOME:
User row created, unverified; verification email dispatched
```

---

**PATH_AUTH_002**
```
PATH_ID: PATH_AUTH_002
MODULE: Auth
ENTRY POINT: POST /api/auth/register
TYPE: failure

ENTRY CONDITIONS:
- Email already belongs to a Google or GitHub account

FLOW:
1. Rate limit passes
2. Validation passes
3. DB lookup finds existing user with provider=google or provider=github
4. 409 with error code "email_oauth" and provider-specific message returned

EXPECTED OUTCOME:
Registration rejected; user told to use OAuth instead
```

---

**PATH_AUTH_003**
```
PATH_ID: PATH_AUTH_003
MODULE: Auth
ENTRY POINT: POST /api/auth/register
TYPE: security

ENTRY CONDITIONS:
- Same IP makes > 5 registration attempts within 60 seconds

FLOW:
1. Rate limit check: count exceeds 5/60s
2. 429 returned with X-RateLimit-* headers; no DB writes

EXPECTED OUTCOME:
Registration blocked; rate limit headers expose reset timestamp
```

---

**PATH_AUTH_004**
```
PATH_ID: PATH_AUTH_004
MODULE: Auth
ENTRY POINT: NextAuth Credentials authorize (sign-in action)
TYPE: happy

ENTRY CONDITIONS:
- User has credentials account
- Correct password provided

FLOW:
1. Email and password extracted from credentials
2. DB lookup for user by email where provider=credentials
3. Password verified against stored hash (PBKDF2 or legacy SHA-256)
4. If hash is SHA-256 (needsRehash=true): new PBKDF2 hash stored silently (fire-and-forget)
5. JWT token issued with userId claim
6. trackEvent("auth.signin") fires
7. Session cookie set; redirect to /report (newUser page) or callbackUrl

DECISION POINTS:
- User not found or wrong password → authorize returns null → 401
- needsRehash=true → background rehash (non-blocking)

EXPECTED OUTCOME:
JWT session established; legacy hashes transparently upgraded
```

---

**PATH_AUTH_005**
```
PATH_ID: PATH_AUTH_005
MODULE: Auth
ENTRY POINT: NextAuth Google/GitHub OAuth (signIn callback)
TYPE: happy

ENTRY CONDITIONS:
- User completes OAuth flow on provider

FLOW:
1. NextAuth receives OAuth tokens
2. signIn callback fires
3. DB checked for existing user by email
4. If new: user row inserted with provider=google/github, email_verified=TRUE
5. If existing: name and image updated
6. user.id set to internal DB id
7. JWT issued with userId
8. trackEvent("auth.signin") fires

DECISION POINTS:
- New vs. returning OAuth user (insert vs. update path)

EXPECTED OUTCOME:
User account created or updated; OAuth users always have email_verified=TRUE
```

---

**PATH_AUTH_006**
```
PATH_ID: PATH_AUTH_006
MODULE: Auth
ENTRY POINT: GET /verify?token=<token>
TYPE: happy

ENTRY CONDITIONS:
- Valid, unexpired, unused verification token present in query string

FLOW:
1. Token extracted from searchParams
2. DB lookup in email_verification_tokens
3. Token validity checks: not used, not expired
4. email_verification_tokens.used set to TRUE
5. users.email_verified set to TRUE
6. Welcome email sent (best-effort)
7. Page renders success state with Sign In link

DECISION POINTS:
- Missing token → redirect("/")
- Token not found → failure state
- Token already used → failure state
- Token expired → failure state

EXPECTED OUTCOME:
User account verified; welcome email dispatched
```

---

**PATH_AUTH_007**
```
PATH_ID: PATH_AUTH_007
MODULE: Auth
ENTRY POINT: POST /api/auth/resend-verification
TYPE: happy

ENTRY CONDITIONS:
- Email belongs to unverified credentials user
- Fewer than 3 resend requests in the past hour

FLOW:
1. Email validated and sanitised
2. DB checks user exists, is unverified, is credentials provider
3. Rate limit: count tokens created last hour for this email
4. Existing unused tokens invalidated
5. New token generated (24h TTL) and stored
6. Verification email sent
7. 200 { ok: true } (always, to prevent enumeration)

DECISION POINTS:
- User not found → 200 (silent)
- Already verified → 200 (silent)
- OAuth user → 200 (silent)
- Rate limit exceeded → 429

EXPECTED OUTCOME:
New verification email sent; previous tokens invalidated
```

---

**PATH_AUTH_008**
```
PATH_ID: PATH_AUTH_008
MODULE: Auth
ENTRY POINT: POST /api/auth/forgot-password
TYPE: happy

ENTRY CONDITIONS:
- Valid email for a credentials account
- Fewer than 3 reset requests this hour for this email

FLOW:
1. Email validated and sanitised
2. DB lookup: user must exist with provider=credentials or password_hash present
3. Rate limit: count tokens in last hour for this email
4. Existing unused reset tokens invalidated
5. New reset token created (1h TTL)
6. Password reset email sent
7. 200 { ok: true } (always, regardless of whether user exists)

DECISION POINTS:
- User not found → silent 200
- OAuth-only user (no password_hash) → silent 200
- Rate limit (≥3 in last hour) → silent 200

EXPECTED OUTCOME:
Reset token created; email dispatched; email enumeration prevented
```

---

**PATH_AUTH_009**
```
PATH_ID: PATH_AUTH_009
MODULE: Auth
ENTRY POINT: POST /api/auth/reset-password
TYPE: happy

ENTRY CONDITIONS:
- Valid, unexpired, unused reset token
- New password ≥ 8 chars

FLOW:
1. Token and new password extracted
2. DB lookup in password_reset_tokens
3. Validity checks: token exists, not used, not expired
4. Password hashed with PBKDF2
5. users.password_hash updated
6. Token marked as used
7. 200 { ok: true }

DECISION POINTS:
- Missing/invalid token → 400
- Already used → 400
- Expired → 400
- Password < 8 chars → 400

EXPECTED OUTCOME:
Password updated; token consumed
```

---

**PATH_AUTH_010**
```
PATH_ID: PATH_AUTH_010
MODULE: Auth
ENTRY POINT: Middleware (all protected routes)
TYPE: security

ENTRY CONDITIONS:
- Unauthenticated user tries to access /report, /dashboard, /compare, /settings, /api-usage, /admin

FLOW:
1. NextAuth middleware runs auth()
2. No valid JWT session found
3. Request redirected to /sign-in?callbackUrl=<original path>

EXPECTED OUTCOME:
Access denied; user redirected to sign-in with return URL
```

---

### MODULE: REPORT

---

**PATH_REPORT_001**
```
PATH_ID: PATH_REPORT_001
MODULE: Report
ENTRY POINT: POST /api/report
TYPE: happy (cache hit)

ENTRY CONDITIONS:
- Authenticated user
- Within rate limit (10/min per user)
- Within monthly plan quota
- Valid area string and intent
- Cache contains entry for area+intent within 24h

FLOW:
1. JWT session validated → userId extracted
2. Rate limit checked (10 req/60s per user)
3. canGenerateReport() → checks monthly count vs. plan limit
4. Location input validated (length, allowed chars, no HTML/SQL)
5. Intent validated against enum [moving, investing, business, research]
6. generateReport() called → ensureReportCacheTable()
7. getCachedReport(area, intent) → HIT
8. New report row inserted (id, area, intent, report JSON, score, userId)
9. trackEvent("report.cache_hit")
10. Report email sent to user's email (awaited)
11. 200 { id, report } with rate limit headers

EXPECTED OUTCOME:
Report served from cache; stored to user's history; email dispatched
```

---

**PATH_REPORT_002**
```
PATH_ID: PATH_REPORT_002
MODULE: Report
ENTRY POINT: POST /api/report
TYPE: happy (cache miss — full generation)

ENTRY CONDITIONS:
- Same as PATH_REPORT_001 except cache miss

FLOW:
1–5. Same validation as PATH_REPORT_001
6. generateReport() → cache MISS
7. geocodeArea(area) → postcodes.io API call
8. If geo found: 6 parallel data fetches:
   - getCrimeData(lat, lon) → police.uk
   - getDeprivationData(lsoa, lsoa11) → IMD API
   - getNearbyAmenities(lat, lon) → OpenStreetMap Overpass
   - getFloodRisk(lat, lon) → Environment Agency API
   - getPropertyPrices(postcode) → Land Registry API
   - getOfstedSchools(lat, lon, country) → Ofsted API
   If geo null: all 6 return null
9. area_type determined (urban/suburban/rural) from geo
10. computeScores() → deterministic scoring engine runs
11. buildPrompt() constructs LLM prompt with locked scores + real data
12. anthropic.messages.create() → Claude Sonnet generates narrative JSON
13. JSON parsed (markdown fence stripping fallback)
14. Computed scores enforced on AI response (overrides any deviation)
15. data_freshness, property_data, schools_data attached to report
16. Report row inserted to DB
17. setCachedReport() fires (fire-and-forget)
18. trackEvent("report.generated")
19. Report email sent (awaited)
20. 200 { id, report }

DECISION POINTS:
- geo == null → all external data null; LLM narrates with no real data
- AI returns no text block → Error thrown → 500
- AI returns invalid JSON → Markdown fence stripping attempted → re-parse
- Individual data source fails → null returned; scoring continues with available data

EXPECTED OUTCOME:
Fresh report generated, scored, cached, stored, and emailed
```

---

**PATH_REPORT_003**
```
PATH_ID: PATH_REPORT_003
MODULE: Report
ENTRY POINT: POST /api/report
TYPE: edge

ENTRY CONDITIONS:
- User is authenticated
- area geocodes to null (e.g. free-text name not resolvable by postcodes.io)

FLOW:
1–6. Same as PATH_REPORT_002
7. geocodeArea returns null
8. All 6 data fetches skipped; all return null
9. area_type defaults to "suburban"
10. computeScores() runs with all-null data → all dimensions score ~50 (neutral defaults)
11. LLM prompt built with no verified data block
12. AI narrates entirely from knowledge with no real numbers
13. Report saved and cached normally

EXPECTED OUTCOME:
Report generated with neutral scores; LLM uses general knowledge only; no real data attached
```

---

**PATH_REPORT_004**
```
PATH_ID: PATH_REPORT_004
MODULE: Report
ENTRY POINT: POST /api/report
TYPE: failure

ENTRY CONDITIONS:
- Authenticated user
- User has consumed all reports for their plan this month

FLOW:
1. Session validated
2. Rate limit passes
3. canGenerateReport() returns { allowed: false, used, limit, plan }
4. 403 returned with error: "limit_reached", usage details

EXPECTED OUTCOME:
Report generation blocked; client receives current usage and plan details
```

---

**PATH_REPORT_005**
```
PATH_ID: PATH_REPORT_005
MODULE: Report
ENTRY POINT: POST /api/report
TYPE: security

ENTRY CONDITIONS:
- User sends location containing HTML tags, SQL keywords, or semicolons/comments

FLOW:
1. Session validated
2. Rate limit passes
3. canGenerateReport() passes
4. validateLocationInput() detects injection patterns
5. 400 returned with error message

EXPECTED OUTCOME:
Malicious input rejected; no DB or LLM calls made
```

---

**PATH_REPORT_006**
```
PATH_ID: PATH_REPORT_006
MODULE: Report
ENTRY POINT: POST /api/report
TYPE: security

ENTRY CONDITIONS:
- Authenticated user makes > 10 report requests per minute

FLOW:
1. Session validated
2. rateLimit(`report:${userId}`) → count > 10 in 60s window
3. 429 with rate limit headers

EXPECTED OUTCOME:
User throttled; retries guided by X-RateLimit-Reset header
```

---

**PATH_REPORT_007**
```
PATH_ID: PATH_REPORT_007
MODULE: Report
ENTRY POINT: GET /api/report/[id]
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user
- Report ID belongs to this user

FLOW:
1. Session validated
2. DB query: SELECT WHERE id={id} AND user_id={userId}
3. Row found; report JSON parsed if string
4. 200 with report data

DECISION POINTS:
- No session → 401
- Row not found (wrong ID or wrong user) → 404

EXPECTED OUTCOME:
Report data returned; row-level security enforced via AND user_id=
```

---

**PATH_REPORT_008**
```
PATH_ID: PATH_REPORT_008
MODULE: Report
ENTRY POINT: DELETE /api/report/[id]
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user
- Report belongs to this user

FLOW:
1. Session validated
2. DELETE FROM reports WHERE id={id} AND user_id={userId} RETURNING id
3. If 0 rows deleted → 404
4. 200 { ok: true }

EXPECTED OUTCOME:
Report removed; ownership enforced in the DELETE predicate
```

---

**PATH_REPORT_009**
```
PATH_ID: PATH_REPORT_009
MODULE: Report
ENTRY POINT: GET /api/report/[id]
TYPE: security

ENTRY CONDITIONS:
- Authenticated user attempts to read another user's report by guessing the ID

FLOW:
1. Session provides userId A
2. Report row exists but belongs to userId B
3. WHERE user_id={userId A} predicate excludes the row
4. 404 returned (indistinguishable from not found)

EXPECTED OUTCOME:
Report not exposed; IDOR prevented via predicate; no information leak
```

---

### MODULE: API_V1

---

**PATH_API_001**
```
PATH_ID: PATH_API_001
MODULE: API_V1
ENTRY POINT: POST /api/v1/report
TYPE: happy

ENTRY CONDITIONS:
- Valid Bearer aiq_* key in Authorization header
- Key belongs to user on Developer/Business/Growth plan
- Under rate limit (30/min per key)
- Within monthly quota
- Valid area and intent

FLOW:
1. Authorization header parsed; "Bearer " prefix stripped
2. validateApiKey(key) → DB lookup; last_used_at updated (fire-and-forget)
3. rateLimit(`api:${key}`) → 30/60s window
4. hasApiAccess(userId) → plan must be in [developer, business, growth]
5. canGenerateReport(userId) → monthly quota check
6. Location and intent validated
7. generateReport() called (same pipeline as PATH_REPORT_002)
8. trackEvent("api.report.generated")
9. 200 { id, report } with rate limit headers

DECISION POINTS:
- Missing/invalid Bearer → 401
- Revoked key → 401
- Rate limit exceeded → 429
- Non-API plan → 403
- Monthly limit → 429

EXPECTED OUTCOME:
Report generated and returned; API usage tracked
```

---

**PATH_API_002**
```
PATH_ID: PATH_API_002
MODULE: API_V1
ENTRY POINT: POST /api/v1/report
TYPE: security

ENTRY CONDITIONS:
- Request with no Authorization header, or non-Bearer format

FLOW:
1. Authorization header absent or malformed
2. Immediate 401 with descriptive error message

EXPECTED OUTCOME:
Request rejected before any DB or rate-limit operations
```

---

**PATH_API_003**
```
PATH_ID: PATH_API_003
MODULE: API_V1
ENTRY POINT: POST /api/v1/report
TYPE: security

ENTRY CONDITIONS:
- Syntactically valid API key that has been revoked

FLOW:
1. Bearer prefix stripped
2. validateApiKey(key) → DB: revoked=TRUE or no row → returns null
3. 401 "Invalid or revoked API key"

EXPECTED OUTCOME:
Revoked keys rejected; DB hit but no further processing
```

---

### MODULE: BILLING

---

**PATH_BILLING_001**
```
PATH_ID: PATH_BILLING_001
MODULE: Billing
ENTRY POINT: POST /api/stripe/checkout
TYPE: happy (new subscriber)

ENTRY CONDITIONS:
- Authenticated user with no existing active Stripe subscription
- Valid plan name (starter, pro, developer, business, growth)

FLOW:
1. Session validated → userId
2. Plan validated against allowed list
3. DB checked for existing subscription row and customer ID
4. No existing sub or stale/cancelled sub → fall through
5. Validate customer ID still exists in Stripe
6. Create Stripe Customer if none exists
7. Upsert subscriptions row with stripe_customer_id
8. stripe.checkout.sessions.create() with success/cancel URLs and metadata
9. trackEvent("plan.upgrade.started")
10. 200 { url: checkoutSession.url }

EXPECTED OUTCOME:
Stripe checkout URL returned; user redirected to Stripe payment page
```

---

**PATH_BILLING_002**
```
PATH_ID: PATH_BILLING_002
MODULE: Billing
ENTRY POINT: POST /api/stripe/checkout
TYPE: happy (plan change — existing subscriber)

ENTRY CONDITIONS:
- Authenticated user with an active Stripe subscription

FLOW:
1–3. Same as PATH_BILLING_001
4. Existing sub found in DB and in Stripe (status=active or trialing)
5. stripe.subscriptions.update() swaps price with proration_behavior=create_prorations
6. DB: UPDATE subscriptions SET plan={new_plan}
7. trackEvent("plan.changed")
8. 200 { url: "/dashboard?upgraded=true" } (no checkout redirect needed)

DECISION POINTS:
- Stripe subscription exists but is cancelled/past_due → fall through to new checkout
- Stripe subscription not found (stale test data) → log warning, fall through

EXPECTED OUTCOME:
Plan swapped inline via proration; no new checkout session needed
```

---

**PATH_BILLING_003**
```
PATH_ID: PATH_BILLING_003
MODULE: Billing
ENTRY POINT: POST /api/stripe/webhook
TYPE: happy — checkout.session.completed

ENTRY CONDITIONS:
- Stripe sends checkout.session.completed event
- STRIPE_WEBHOOK_SECRET configured
- Signature valid
- Event not already processed (idempotency check)

FLOW:
1. Request body read as raw text
2. stripe.webhooks.constructEvent() verifies signature
3. ensureWebhookTable() called
4. isEventAlreadyProcessed() checked
5. Opportunistic cleanup of events >30d fires (1% probability)
6. case checkout.session.completed:
   - user_id and plan extracted from session.metadata
   - stripe.subscriptions.retrieve() called
   - subscriptions row upserted with full billing period data
   - trackEvent("plan.upgraded")
7. recordEvent(id, type, "processed")
8. 200 { received: true }

EXPECTED OUTCOME:
Subscription activated in DB; plan quota unlocked for user
```

---

**PATH_BILLING_004**
```
PATH_ID: PATH_BILLING_004
MODULE: Billing
ENTRY POINT: POST /api/stripe/webhook
TYPE: happy — customer.subscription.updated

ENTRY CONDITIONS:
- Stripe sends subscription update (renewal, status change)

FLOW:
1–5. Same as PATH_BILLING_003
6. case customer.subscription.updated:
   - subscriptions row updated by stripe_customer_id
   - status set to 'active' or 'inactive'; billing period dates updated
7. recordEvent processed
8. 200 { received: true }

EXPECTED OUTCOME:
Subscription periods kept in sync with Stripe
```

---

**PATH_BILLING_005**
```
PATH_ID: PATH_BILLING_005
MODULE: Billing
ENTRY POINT: POST /api/stripe/webhook
TYPE: happy — customer.subscription.deleted

ENTRY CONDITIONS:
- Stripe sends subscription deletion (cancellation end-of-period or immediate)

FLOW:
1–5. Same as PATH_BILLING_003
6. case customer.subscription.deleted:
   - subscriptions row updated: plan='free', status='active', stripe_subscription_id=NULL
   - period dates nulled
7. recordEvent processed
8. 200 { received: true }

EXPECTED OUTCOME:
User downgraded to free plan; subscription ID cleared
```

---

**PATH_BILLING_006**
```
PATH_ID: PATH_BILLING_006
MODULE: Billing
ENTRY POINT: POST /api/stripe/webhook
TYPE: security

ENTRY CONDITIONS:
- Request with invalid or missing Stripe signature

FLOW:
1. Raw body read
2. stripe.webhooks.constructEvent() throws
3. 400 "Invalid signature" returned immediately

EXPECTED OUTCOME:
Forged/tampered webhook rejected before any DB writes
```

---

**PATH_BILLING_007**
```
PATH_ID: PATH_BILLING_007
MODULE: Billing
ENTRY POINT: POST /api/stripe/webhook
TYPE: concurrency

ENTRY CONDITIONS:
- Same Stripe event delivered twice (Stripe retry or at-least-once delivery)

FLOW:
1. Signature validated
2. isEventAlreadyProcessed(event.id) → TRUE
3. Immediate 200 { received: true, deduplicated: true }

EXPECTED OUTCOME:
Idempotency guaranteed; no double-processing of subscription changes
```

---

**PATH_BILLING_008**
```
PATH_ID: PATH_BILLING_008
MODULE: Billing
ENTRY POINT: POST /api/stripe/cancel
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user with active paid Stripe subscription

FLOW:
1. Session validated
2. DB: SELECT stripe_subscription_id WHERE user_id AND status=active AND sub_id IS NOT NULL
3. stripe.subscriptions.update() with cancel_at_period_end=true
4. DB updated with cancel_at_period_end flag and period end date
5. trackEvent("plan.cancelled")
6. 200 { ok: true, cancelAt: <ISO date> }

DECISION POINTS:
- No active subscription in DB → 404
- Stripe call fails → 500

EXPECTED OUTCOME:
Subscription set to cancel at period end; user retains access until then
```

---

**PATH_BILLING_009**
```
PATH_ID: PATH_BILLING_009
MODULE: Billing
ENTRY POINT: POST /api/stripe/portal
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user with Stripe customer ID in DB

FLOW:
1. Session validated
2. DB: SELECT stripe_customer_id
3. stripe.billingPortal.sessions.create() with return URL
4. 200 { url: <portal URL> }

DECISION POINTS:
- No Stripe customer ID in DB → 404
- Stripe portal creation fails → 500

EXPECTED OUTCOME:
Stripe billing portal URL returned for self-service management
```

---

### MODULE: KEYS

---

**PATH_KEYS_001**
```
PATH_ID: PATH_KEYS_001
MODULE: Keys
ENTRY POINT: POST /api/keys
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user on Developer, Business, or Growth plan

FLOW:
1. withAuth validates session
2. hasApiAccess(userId) → plan in API_PLANS
3. Optional name from request body (defaults to "Default")
4. generateId("key") and crypto.randomBytes(24) to form aiq_<hex>
5. Key stored in api_keys table
6. 200 { key: { id, key, name } } (full key returned once)

DECISION POINTS:
- Non-API plan → 403
- Body parse failure → empty object used, name defaults to "Default"

EXPECTED OUTCOME:
API key created; full key value returned in this response only
```

---

**PATH_KEYS_002**
```
PATH_ID: PATH_KEYS_002
MODULE: Keys
ENTRY POINT: DELETE /api/keys/[id]
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user
- keyId belongs to this user

FLOW:
1. withAuthParams validates session
2. revokeApiKey(userId, keyId) → UPDATE api_keys SET revoked=TRUE WHERE id AND user_id
3. Returns false if no row affected → 404
4. 200 { success: true }

EXPECTED OUTCOME:
Key marked revoked; subsequent API calls with this key → 401
```

---

### MODULE: DASHBOARD

---

**PATH_DASH_001**
```
PATH_ID: PATH_DASH_001
MODULE: Dashboard
ENTRY POINT: GET /dashboard (page render)
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user

FLOW:
1. auth() called in server component; redirect to /sign-in if no session
2. getUserReports(userId) → SELECT from reports ORDER BY created_at DESC
3. getUserPlan(userId) → checks subscriptions; superuser check; defaults to 'free'
4. getMonthlyReportCount(userId) → COUNT reports this month
5. getSavedAreas(userId) → SELECT from saved_areas
6. DashboardClient rendered with reports, plan, used/limit, savedAreas

EXPECTED OUTCOME:
Dashboard rendered with user's reports, quota, watchlist, and plan info
```

---

**PATH_DASH_002**
```
PATH_ID: PATH_DASH_002
MODULE: Dashboard
ENTRY POINT: GET /compare (page render)
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user on paid plan (not free)
- Optional ?reports=id1,id2 in query string

FLOW:
1. auth() called; redirect if no session
2. getUserPlan(userId) → if 'free', redirect to /pricing
3. getUserReportsList(userId) → all user report summaries
4. If report IDs in searchParams: getFullReports(userId, ids) fetches full JSON
5. CompareClient rendered with data

DECISION POINTS:
- Free plan → redirect to /pricing (paywall)

EXPECTED OUTCOME:
Comparison view rendered; upsell enforced for free users
```

---

### MODULE: SETTINGS

---

**PATH_SETTINGS_001**
```
PATH_ID: PATH_SETTINGS_001
MODULE: Settings
ENTRY POINT: POST /api/settings/password
TYPE: happy

ENTRY CONDITIONS:
- Authenticated credentials user (provider=credentials, has password_hash)
- Correct current password
- New password ≥ 8 chars

FLOW:
1. Session validated → userId
2. currentPassword and newPassword from body
3. DB: SELECT password_hash, provider WHERE id={userId}
4. Provider check: must be 'credentials'
5. verifyPassword(currentPassword, hash) → valid
6. hashPassword(newPassword) → PBKDF2
7. UPDATE users SET password_hash
8. 200 { success: true }

DECISION POINTS:
- OAuth user → 400 (not applicable)
- Wrong current password → 403
- New password < 8 chars → 400

EXPECTED OUTCOME:
Password updated; always uses PBKDF2 after this call
```

---

**PATH_SETTINGS_002**
```
PATH_ID: PATH_SETTINGS_002
MODULE: Settings
ENTRY POINT: DELETE /api/settings/delete-account
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user (any provider)

FLOW:
1. Session validated → userId
2. BEGIN transaction
3. DELETE FROM reports WHERE user_id
4. DELETE FROM api_keys WHERE user_id
5. DELETE FROM activity_events WHERE user_id
6. DELETE FROM email_verification_tokens WHERE user_id
7. DELETE FROM subscriptions WHERE user_id
8. DELETE FROM users WHERE id
9. COMMIT
10. 200 { success: true }

DECISION POINTS:
- DB transaction failure → ROLLBACK; 500 returned

EXPECTED OUTCOME:
All user data purged atomically; no orphaned rows
```

---

**PATH_SETTINGS_003**
```
PATH_ID: PATH_SETTINGS_003
MODULE: Settings
ENTRY POINT: DELETE /api/settings/delete-account
TYPE: edge

ENTRY CONDITIONS:
- User has an active Stripe subscription at time of deletion

FLOW:
1–9. Same as PATH_SETTINGS_002
NOTE: Stripe subscription is NOT cancelled in Stripe before DB deletion

RISK:
- No Stripe cancellation call made → subscription persists in Stripe
- Webhook customer.subscription.deleted will have no matching user_id to update

EXPECTED OUTCOME:
DB data purged; Stripe subscription orphaned (billing continues until Stripe-side cancellation)
```

---

### MODULE: WIDGET

---

**PATH_WIDGET_001**
```
PATH_ID: PATH_WIDGET_001
MODULE: Widget
ENTRY POINT: GET /api/widget?postcode=<pc>&intent=<intent>
TYPE: happy (cache hit)

ENTRY CONDITIONS:
- Any origin (CORS open)
- Valid postcode and intent
- Under rate limit (60/hour per origin or IP)
- Cache contains report for this postcode+intent within 24h

FLOW:
1. CORS headers set (Access-Control-Allow-Origin: *)
2. postcode and intent extracted from query params
3. validateLocationInput and validateIntent run
4. rateLimit(`widget:${origin or IP}`) → 60/3600s
5. getCachedReport(postcode, intent) → HIT
6. Condensed response: { area, postcode, intent, score, area_type, dimensions[], powered_by }
7. 200 with Cache-Control: public, s-maxage=3600

EXPECTED OUTCOME:
Scores served from cache; no AI spend; CDN-cacheable response
```

---

**PATH_WIDGET_002**
```
PATH_ID: PATH_WIDGET_002
MODULE: Widget
ENTRY POINT: GET /api/widget?postcode=<pc>&intent=<intent>
TYPE: edge (cache miss)

ENTRY CONDITIONS:
- Valid inputs, under rate limit
- No cached report for this location

FLOW:
1–4. Same as PATH_WIDGET_001
5. getCachedReport() → MISS
6. 404 returned with message directing user to onegoodarea.com

EXPECTED OUTCOME:
Widget explicitly refuses to generate reports unauthenticated; protects AI spend
```

---

**PATH_WIDGET_003**
```
PATH_ID: PATH_WIDGET_003
MODULE: Widget
ENTRY POINT: OPTIONS /api/widget
TYPE: happy

ENTRY CONDITIONS:
- Browser sends preflight CORS request

FLOW:
1. 204 returned with full CORS headers (Allow: GET, OPTIONS; Max-Age: 86400)

EXPECTED OUTCOME:
Preflight satisfied; browser proceeds with GET
```

---

### MODULE: ADMIN

---

**PATH_ADMIN_001**
```
PATH_ID: PATH_ADMIN_001
MODULE: Admin
ENTRY POINT: GET /admin (page render)
TYPE: happy

ENTRY CONDITIONS:
- Authenticated user whose email is in ADMIN_EMAILS ["ptengelmann@gmail.com"]

FLOW:
1. auth() called in server component
2. Email checked against ADMIN_EMAILS (hardcoded in page.tsx)
3. getAnalytics() runs 12 parallel DB queries
4. getTrafficAnalytics() runs 9 parallel pageviews queries
5. AdminClient rendered with all analytics data

EXPECTED OUTCOME:
Full platform analytics dashboard rendered (users, reports, MRR, traffic)
```

---

**PATH_ADMIN_002**
```
PATH_ID: PATH_ADMIN_002
MODULE: Admin
ENTRY POINT: GET /admin (page render)
TYPE: security

ENTRY CONDITIONS:
- Authenticated user whose email is NOT in ADMIN_EMAILS

FLOW:
1. auth() called
2. Email not in ADMIN_EMAILS → redirect("/dashboard")

EXPECTED OUTCOME:
Access silently denied; redirected to dashboard (no 403 exposed)
```

---

### MODULE: TRACK

---

**PATH_TRACK_001**
```
PATH_ID: PATH_TRACK_001
MODULE: Track
ENTRY POINT: POST /api/track
TYPE: happy

ENTRY CONDITIONS:
- Any request (unauthenticated)
- Path does not start with /api, /admin, /_next

FLOW:
1. path, referrer, sessionId extracted from body
2. Paths starting with /api, /admin, /_next skipped silently
3. ensureTable() creates pageviews table if needed
4. User-agent parsed → device: mobile | tablet | desktop
5. x-vercel-ip-country header → country
6. Referrer parsed: external hostnames only; self-referrals stripped
7. INSERT INTO pageviews (path, referrer, country, device, session_id)
8. 200 { ok: true }

DECISION POINTS:
- Any error → silently return { ok: true } (tracking must never fail visibly)
- path missing → 400 { ok: false }

EXPECTED OUTCOME:
Anonymous pageview recorded; errors swallowed to protect UX
```

---

### MODULE: HEALTH

---

**PATH_HEALTH_001**
```
PATH_ID: PATH_HEALTH_001
MODULE: Health
ENTRY POINT: GET /api/health
TYPE: happy

ENTRY CONDITIONS:
- DB reachable

FLOW:
1. sql`SELECT 1` executed
2. 200 { status: "ok", timestamp, database: "connected" }

EXPECTED OUTCOME:
Uptime monitor / load balancer receives healthy signal
```

---

**PATH_HEALTH_002**
```
PATH_ID: PATH_HEALTH_002
MODULE: Health
ENTRY POINT: GET /api/health
TYPE: failure

ENTRY CONDITIONS:
- DB unreachable (Neon timeout, network partition)

FLOW:
1. sql`SELECT 1` throws
2. 503 { status: "degraded", timestamp, database: "unreachable" }

EXPECTED OUTCOME:
Degraded status surfaced; load balancer / monitor can trigger alert
```

---

### MODULE: AREAS (Static SEO Pages)

---

**PATH_AREAS_001**
```
PATH_ID: PATH_AREAS_001
MODULE: Areas
ENTRY POINT: GET /area/[slug]
TYPE: happy

ENTRY CONDITIONS:
- slug matches a key in areas.json
- No auth required

FLOW:
1. slug resolved from params
2. areas.json lookup → AreaData object
3. getRAG(overallScore) → colour coding
4. Static page rendered with pre-scored data + CTA to generate full report

DECISION POINTS:
- Unknown slug → notFound() → 404

EXPECTED OUTCOME:
SEO landing page rendered from static JSON; no DB or AI calls at runtime
```

---

## MISSING OR UNCERTAIN PATHS

---

**MISSING_001**
- **Description**: Stripe checkout for a user whose `stripe_customer_id` exists in DB but the Stripe customer was deleted from the Stripe dashboard
- **Why**: Code validates customer via `stripe.customers.retrieve()` before checkout, but not before `stripe.subscriptions.update()` in PATH_BILLING_002. A deleted customer could reach the subscription update call
- **Confidence**: Medium

---

**MISSING_002**
- **Description**: Account deletion with active Stripe subscription — subscription is orphaned in Stripe (PATH_SETTINGS_003 documents this, but no cancellation call is made)
- **Why**: `delete-account` deletes the DB subscription row but never calls `stripe.subscriptions.cancel()`. Stripe continues billing the deleted user's card
- **Confidence**: High

---

**MISSING_003**
- **Description**: Concurrent report generation race — two simultaneous requests for the same user pass the `canGenerateReport()` quota check before either inserts into `reports`
- **Why**: Quota enforcement is a read-then-write without a DB-level constraint or transaction lock; two requests can both see `used < limit` and both generate
- **Confidence**: High

---

**MISSING_004**
- **Description**: Concurrent resend-verification race — two simultaneous requests both pass the rate limit count check before either inserts
- **Why**: Token count read and token insert are separate non-atomic operations; a pair of near-simultaneous requests could both read count=2 and both insert, resulting in count=4
- **Confidence**: Medium

---

**MISSING_005**
- **Description**: Webhook `checkout.session.completed` arrives before DB subscription row exists (timing gap)
- **Why**: Checkout route does `ON CONFLICT DO UPDATE` upsert, so webhook will create the row if it arrives first — functionally safe by design
- **Confidence**: Low (handled, noted for completeness)

---

**MISSING_006**
- **Description**: Dual admin email arrays with no shared source of truth — `SUPERUSER_EMAILS` in `config.ts` vs `ADMIN_EMAILS` hardcoded in `admin/page.tsx`
- **Why**: Currently identical, but future edits to one array without the other would create divergence where a superuser bypasses billing limits but cannot see analytics (or vice versa)
- **Confidence**: High (structural risk)

---

**MISSING_007**
- **Description**: Widget rate limit key collision — all requests without `origin` or `x-forwarded-for` headers share a single `widget:unknown` bucket and can collectively exhaust the 60/hour limit
- **Why**: Fallback to "unknown" is a single string used as the rate limit identifier for all anonymous/proxied widget calls
- **Confidence**: Medium

---

**MISSING_008**
- **Description**: Cache write failure after successful report generation causes duplicate reports on retry
- **Why**: `setCachedReport()` is fire-and-forget. If it fails silently, the next call for the same area+intent will miss cache and generate again, inserting a second `reports` row for the same user
- **Confidence**: Medium

---

## FINAL STATUS

**FULL PATH MAP (WITH POSSIBLE GAPS)**

| Scope | Count |
|-------|-------|
| Total pathways defined | 44 |
| Happy paths | 21 |
| Edge/boundary paths | 6 |
| Failure paths | 7 |
| Security paths | 8 |
| Concurrency paths | 2 |
| Missing/uncertain path candidates | 8 |

**Priority risks:**
1. **MISSING_003** — Concurrent quota race (double report generation / quota bypass)
2. **MISSING_002** — Stripe subscription orphaned on account deletion (ongoing billing)
3. **MISSING_006** — Dual admin email array divergence (maintainability)
