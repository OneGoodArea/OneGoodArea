# Authentication — Test Cases

> **Source:** https://www.onegoodarea.com/ (Engine v2.0.2)
> **Auth pages:** `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify`
> **Last updated:** 2026-06-19

## Scope

Covers the full authentication lifecycle on OneGoodArea: sign-up (email + OAuth), email verification, sign-in (credentials + OAuth), session management, forgot/reset password, and error/edge cases. Does **not** cover post-authentication dashboard behaviour (see `dashboard-test-cases.md`).

### Source files validated against

| Layer | File |
|-------|------|
| Sign-in UI | `apps/web/src/app/design-v2/sign-in/client.tsx` |
| Sign-up UI | `apps/web/src/app/design-v2/sign-up/client.tsx` |
| Forgot password UI | `apps/web/src/app/design-v2/forgot-password/client.tsx` |
| Reset password UI | `apps/web/src/app/design-v2/reset-password/client.tsx` |
| Verify UI | `apps/web/src/app/design-v2/verify/client.tsx` |
| Shared auth shell | `apps/web/src/app/design-v2/_shared/auth-shell.tsx` |
| Auth config (NextAuth) | `apps/web/src/lib/auth.ts` |
| Register API | `apps/web/src/app/api/auth/register/route.ts` |
| Forgot password API | `apps/web/src/app/api/auth/forgot-password/route.ts` |
| Reset password API | `apps/web/src/app/api/auth/reset-password/route.ts` |
| Resend verification API | `apps/web/src/app/api/auth/resend-verification/route.ts` |

### Auth providers

- **Google OAuth** — automatic account creation, email verified = `TRUE`
- **GitHub OAuth** — automatic account creation, email verified = `TRUE`
- **Email + Password (Credentials)** — requires email verification before sign-in

---

## 1. Sign-Up — Email + Password

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **REG-01** | Sign-up page renders correctly | 1. Navigate to `/sign-up` | Two-column layout: left = brand panel (dark), right = form (cream). Title: "Start your free Sandbox." CTA: "Create account". |
| **REG-02** | Successful email registration | 1. Navigate to `/sign-up`<br>2. Enter valid email + password (≥8 chars)<br>3. Click "Create account" | POST `/api/auth/register` returns 200. UI transitions to success state: "Check your email." with 3-step checklist. Verification email sent. |
| **REG-03** | Registration shows verification steps | 1. Complete registration<br>2. Observe success screen | Ordered list: (1) Open the email from OneGoodArea, (2) Click the verification link, (3) Sign in and make your first API call. Link expiration note: "Link expires in 24 hours · Check your spam folder". |
| **REG-04** | "Didn't receive it? Resend" button | 1. On verification success screen<br>2. Click "Didn't receive it? Resend" | POST `/api/auth/resend-verification` called. Button text changes to "Sending…" then "Verification email resent ✓". |
| **REG-05** | Resend disabled after success | 1. Click "Didn't receive it? Resend"<br>2. Wait for "Verification email resent ✓"<br>3. Try clicking again | Button remains disabled after successful resend. |
| **REG-06** | Resend rate-limited (max 3/hour) | 1. Resend verification email 3 times within 1 hour<br>2. Attempt 4th resend | API returns 429 with error "Too many requests. Please try again later." |
| **REG-07** | "Go to sign in" link on verification screen | 1. Complete registration<br>2. Click "Go to sign in" | Navigates to `/sign-in`. |
| **REG-08** | Email already registered (credentials) | 1. Register with an email that already exists<br>2. Observe error | Error: "An account with this email already exists. Try signing in instead." (error code: `email_taken`, status 409). |
| **REG-09** | Email linked to Google account | 1. Register with an email already linked via Google OAuth<br>2. Observe error | Error: "This email is linked to a Google account. Try signing in with Google instead." (error code: `email_oauth`, status 409). |
| **REG-10** | Email linked to GitHub account | 1. Register with an email already linked via GitHub OAuth<br>2. Observe error | Error: "This email is linked to a GitHub account. Try signing in with GitHub instead." (error code: `email_oauth`, status 409). |
| **REG-11** | Empty email submission | 1. Click "Create account" with empty email field | Form validation prevents submission via `required` attribute; API also returns 400 "Email is required" if bypassed. |
| **REG-12** | Empty password submission | 1. Enter email only, leave password blank<br>2. Click "Create account" | Form validation prevents submission via `required` attribute; API returns 400 "Password must be at least 8 characters" if bypassed. |
| **REG-13** | Password too short (<8 chars) | 1. Enter email + password of 7 characters<br>2. Click "Create account" | Client-side `minLength={8}` prevents submission; API returns 400 "Password must be at least 8 characters" if bypassed. |
| **REG-14** | Password exactly 8 characters | 1. Enter email + password of exactly 8 characters<br>2. Click "Create account" | Registration succeeds. No client or server rejection. |
| **REG-15** | Invalid email format | 1. Enter "not-an-email" as email<br>2. Click "Create account" | Browser-native `type="email"` validation prevents submission. |
| **REG-16** | Registration rate-limited by IP | 1. Submit `/api/auth/register` repeatedly from same IP<br>2. Observe after hitting limit | API returns 429 "Too many attempts. Please try again later." |
| **REG-17** | User name auto-derived from email | 1. Register with `john.smith@example.com`<br>2. Check database | `name` field = `john.smith` (everything before `@`). |
| **REG-18** | Password is hashed (not stored in plain text) | 1. Register a new account<br>2. Inspect `password_hash` in users table | Value is a PBKDF2 hash, not the plain-text password. |
| **REG-19** | Terms and privacy links present | 1. Navigate to `/sign-up`<br>2. Observe fine print at bottom of form | "By signing up, you agree to our Terms and Privacy Policy." Both are linked (`/terms`, `/privacy`). |

---

## 2. Sign-Up — OAuth (Google & GitHub)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **OAUTH-01** | Sign-up page shows OAuth buttons | 1. Navigate to `/sign-up`<br>2. Observe OAuth section | Two buttons above "or with email" divider: "Continue with Google" (colored G icon), "Continue with GitHub" (GitHub icon). |
| **OAUTH-02** | Google OAuth sign-up creates account | 1. Click "Continue with Google"<br>2. Authenticate with a Google account not previously registered | Account created automatically. `provider = 'google'`, `email_verified = TRUE`. Redirected to `/dashboard`. |
| **OAUTH-03** | GitHub OAuth sign-up creates account | 1. Click "Continue with GitHub"<br>2. Authenticate with a GitHub account not previously registered | Account created automatically. `provider = 'github'`, `email_verified = TRUE`. Redirected to `/dashboard`. |
| **OAUTH-04** | OAuth sign-up stores name and image | 1. Sign up via Google/GitHub<br>2. Check database | `name` and `image` fields populated from the OAuth provider profile. |
| **OAUTH-05** | OAuth re-sign-in updates name/image | 1. Sign in via Google with account that has changed display name<br>2. Check database | `name` and `image` fields updated to match current provider profile. |
| **OAUTH-06** | OAuth sign-up skips email verification | 1. Sign up via Google/GitHub<br>2. Check `email_verified` | `email_verified = TRUE`. No verification email sent. |
| **OAUTH-07** | OAuth email conflict — same email already registered via credentials | 1. Register via email (`alice@example.com`)<br>2. Sign up via Google with same `alice@example.com`<br>3. Observe | NextAuth links the OAuth identity to the existing account rather than creating a duplicate. |
| **OAUTH-08** | OAuth sign-up redirects to `/dashboard` | 1. Complete Google or GitHub sign-up<br>2. Observe redirect | `callbackUrl = "/dashboard"`. User lands on dashboard. |

---

## 3. Email Verification

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **VER-01** | Verification email is sent on registration | 1. Register a new email account<br>2. Check inbox | Email from OneGoodArea with verification link arrives. Contains a unique token. |
| **VER-02** | Successful email verification | 1. Click verification link from email<br>2. Observe verify page | `/verify?token=...` page renders. Success state: "Email verified." with "Sign in" and "Explore first" buttons. |
| **VER-03** | Verification link with invalid/missing token | 1. Navigate to `/verify?token=invalid` or `/verify`<br>2. Observe | Failure state: "Verification failed." with message about invalid/expired/used link. Links: "Sign up again", "Contact support". |
| **VER-04** | Verification link expired (>24 hours) | 1. Wait 24+ hours after registration<br>2. Click the verification link | Token expires at `created_at + 24 hours`. Failure state shown. |
| **VER-05** | Verification link already used | 1. Verify email successfully<br>2. Click the same verification link again | Failure state shown. Token marked `used = TRUE` on first use. |
| **VER-06** | Verification token marked as used after success | 1. Verify email<br>2. Check `email_verification_tokens` table | `used` column = `TRUE` for the consumed token. |
| **VER-07** | Old unused tokens invalidated on resend | 1. Register, get verification email<br>2. Click "Didn't receive it? Resend"<br>3. Try the original verification link | Original link is invalid (all unused tokens for that user set `used = TRUE` on resend). |
| **VER-08** | Verification success has "Explore first" link | 1. Verify email successfully<br>2. Observe options | Two buttons: "Sign in" and "Explore first" (ghost style). "Explore first" links to `/`. |
| **VER-09** | Unverified user cannot sign in | 1. Register but don't verify email<br>2. Attempt sign-in with credentials | NextAuth `authorize()` returns `null`. Sign-in fails. (Behaviour depends on whether a check for `email_verified` is active in the authorize flow.) |

---

## 4. Sign-In — Email + Password

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SIGNIN-01** | Sign-in page renders correctly | 1. Navigate to `/sign-in` | Two-column layout. Title: "Sign in." Subtitle: "Pick up where you left off..." OAuth buttons, "or with email" divider, email + password fields, "Forgot?" link, "Sign in" button, "New here? Create an account" footer. |
| **SIGNIN-02** | Successful sign-in with valid credentials | 1. Enter registered + verified email and correct password<br>2. Click "Sign in" | `signIn("credentials")` succeeds. Redirected to `callbackUrl` (default `/dashboard`). `router.refresh()` called. |
| **SIGNIN-03** | Invalid email (not registered) | 1. Enter an email that does not exist in the system<br>2. Enter any password<br>3. Click "Sign in" | Error: "Invalid email or password." User remains on `/sign-in`. Form is not cleared. |
| **SIGNIN-04** | Invalid password for registered email | 1. Enter correct email but wrong password<br>2. Click "Sign in" | Error: "Invalid email or password." User remains on `/sign-in`. Form is not cleared. |
| **SIGNIN-05** | Empty email field | 1. Leave email blank, enter any password<br>2. Click "Sign in" | Browser-native `required` validation prevents submission. |
| **SIGNIN-06** | Empty password field | 1. Enter email, leave password blank<br>2. Click "Sign in" | Browser-native `required` validation prevents submission. |
| **SIGNIN-07** | Sign-in preserves callback URL | 1. Navigate to `/dashboard` while logged out (gets redirected to `/sign-in?callbackUrl=%2Fdashboard`)<br>2. Sign in with valid credentials | After sign-in, redirected to `/dashboard`. |
| **SIGNIN-08** | Loading state during sign-in | 1. Enter valid credentials<br>2. Click "Sign in" | Button shows spinner while request is in flight. Button is disabled. |
| **SIGNIN-09** | Error state clears on new submission | 1. Trigger an error (e.g., wrong password)<br>2. Observe error message<br>3. Modify email/password and submit again | Error message cleared before new request starts (`setError("")` at top of `handleSubmit`). |
| **SIGNIN-10** | Network error during sign-in | 1. Simulate network failure during `signIn()` call<br>2. Observe | Error: "Something went wrong. Please try again." |
| **SIGNIN-11** | Sign-in with OAuth-only account via credentials | 1. User has a Google/GitHub-only account (no `password_hash`)<br>2. Attempt credentials sign-in with that email | `authorize()` returns `null`. Error: "Invalid email or password." |
| **SIGNIN-12** | Legacy SHA-256 password transparently rehashed | 1. Have a user with legacy SHA-256 `password_hash`<br>2. Sign in successfully | Password transparently rehashed to PBKDF2 (`needsRehash` = true). Background update runs asynchronously. |
| **SIGNIN-13** | "New here? Create an account" footer link | 1. On `/sign-in`<br>2. Click "Create an account" | Navigates to `/sign-up`. |
| **SIGNIN-14** | "Forgot?" link next to password field | 1. On `/sign-in`<br>2. Click "Forgot?" | Navigates to `/forgot-password`. |

---

## 5. Sign-In — OAuth (Google & GitHub)

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SIGNIN-OAUTH-01** | Sign-in page shows OAuth buttons | 1. Navigate to `/sign-in`<br>2. Observe OAuth section | "Continue with Google" and "Continue with GitHub" buttons rendered above the divider. |
| **SIGNIN-OAUTH-02** | Google sign-in — existing account | 1. Click "Continue with Google"<br>2. Authenticate with a previously-linked Google account | Sign-in succeeds. Redirected to `callbackUrl` (default `/dashboard`). |
| **SIGNIN-OAUTH-03** | GitHub sign-in — existing account | 1. Click "Continue with GitHub"<br>2. Authenticate with previously-linked GitHub account | Sign-in succeeds. Redirected to `callbackUrl`. |
| **SIGNIN-OAUTH-04** | OAuth sign-in with callback URL preserved | 1. Navigate to protected page while logged out<br>2. Click OAuth button from sign-in page<br>3. Complete OAuth flow | `callbackUrl` from search params is passed to `signIn(provider, { callbackUrl })`. User lands on the originally requested page. |
| **SIGNIN-OAUTH-05** | OAuth error handling | 1. Simulate OAuth provider error<br>2. Observe | Error: "OAuth error. Please try again." |
| **SIGNIN-OAUTH-06** | `auth.signin` tracking event fired | 1. Sign in via any provider<br>2. Check activity log | `trackEvent("auth.signin", userId, { provider })` called. |

---

## 6. Forgot Password

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **FW-01** | Forgot password page renders correctly | 1. Navigate to `/forgot-password` | Title: "Reset it in one email." Subtitle explains flow. Email field + "Send reset link" button. "← Back to sign in" link. |
| **FW-02** | Request password reset for existing account | 1. Enter registered email<br>2. Click "Send reset link" | POST `/api/auth/forgot-password`. Always returns `{ ok: true }`. UI transitions to success state: "Check your email." with 3-step checklist. |
| **FW-03** | Forgot password success shows steps | 1. Request password reset<br>2. Observe success screen | Ordered list: (1) Open the email, (2) Click the password reset link, (3) Choose a new password and sign in. "Link expires in 1 hour · Check your spam folder". |
| **FW-04** | Always returns success to prevent email enumeration | 1. Enter an email that does **not** exist<br>2. Click "Send reset link" | Same success response (`{ ok: true }`). No indication whether email exists. No email is actually sent. |
| **FW-05** | Forgot password for OAuth-only account | 1. Enter email of a Google/GitHub-only user (no `password_hash`)<br>2. Click "Send reset link" | API returns `{ ok: true }` (success response) but no reset email is sent because the user has no password to reset. |
| **FW-06** | Reset token rate-limited (max 3/hour) | 1. Request password reset 3 times within 1 hour for same email<br>2. Attempt 4th request | API returns `{ ok: true }` (success, no enumeration) but 4th token is not created. |
| **FW-07** | Old unused tokens invalidated on new request | 1. Request password reset<br>2. Request another password reset before using the first link<br>3. Try the first reset link | First link is invalid (all unused tokens set `used = TRUE`). |
| **FW-08** | Empty email submission | 1. Click "Send reset link" with empty field | Browser-native `required` validates. API returns 400 "Email is required" if bypassed. |
| **FW-09** | "Back to sign in" link works | 1. On `/forgot-password`<br>2. Click "← Back to sign in" | Navigates to `/sign-in`. |
| **FW-10** | "Back to sign in" on success screen | 1. After requesting reset<br>2. Click "Back to sign in" | Navigates to `/sign-in`. |

---

## 7. Reset Password

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **RESET-01** | Reset password page — missing token | 1. Navigate to `/reset-password` (no token param) | Error state: "Invalid reset link." with message "This password reset link is missing a token, has expired, or has already been used." Button: "Request a new link →". |
| **RESET-02** | Reset password page — valid token | 1. Navigate to `/reset-password?token=valid_token` | Title: "Choose a new password." Subtitle: "Minimum 8 characters." Two fields: "New password" + "Confirm password". Button: "Reset password". |
| **RESET-03** | Successful password reset | 1. Navigate to `/reset-password?token=valid_token`<br>2. Enter new password (≥8 chars)<br>3. Enter matching confirm password<br>4. Click "Reset password" | POST `/api/auth/reset-password`. Success state: "Password updated." with check icon. "Sign in" link. Token marked `used = TRUE`. |
| **RESET-04** | Password too short (<8 chars) | 1. Enter password of 7 characters<br>2. Click "Reset password" | Client-side check: "Password must be at least 8 characters." API also returns 400 if bypassed. |
| **RESET-05** | Passwords do not match | 1. Enter "Password123" in New password<br>2. Enter "Password456" in Confirm password<br>3. Click "Reset password" | Client-side check: "Passwords don't match." |
| **RESET-06** | Expired token (>1 hour) | 1. Use a reset link older than 1 hour<br>2. Submit new password | API returns 400: "This reset link has expired. Please request a new one." |
| **RESET-07** | Already-used token | 1. Reset password successfully<br>2. Use the same link again | API returns 400: "This reset link has already been used." |
| **RESET-08** | Invalid/malformed token | 1. Navigate to `/reset-password?token=fake_or_invalid`<br>2. Submit new password | API returns 400: "Invalid or expired reset link." |
| **RESET-09** | Successful reset → "Sign in" link | 1. Complete password reset<br>2. Click "Sign in" | Navigates to `/sign-in`. User can now sign in with new password. |
| **RESET-10** | Missing token → "Request a new link" | 1. On "Invalid reset link" screen<br>2. Click "Request a new link" | Navigates to `/forgot-password`. |
| **RESET-11** | Same password as old password | 1. Reset password to the same value as current<br>2. Observe | Password is updated (no same-as-old check exists). Hash is computed and stored. |

---

## 8. Session Management

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SESS-01** | JWT session strategy used | 1. Sign in<br>2. Inspect auth behaviour | Session strategy = `"jwt"`. No database session table used. |
| **SESS-02** | Session persists across requests | 1. Sign in<br>2. Navigate to multiple pages (`/dashboard`, `/settings`, `/compare`) | User remains authenticated. No re-prompt for credentials. |
| **SESS-03** | Session contains user ID | 1. Sign in<br>2. Inspect `session.user.id` | `token.userId` mapped to `session.user.id` via JWT callback. |
| **SESS-04** | Protected routes redirect unauthenticated users | 1. Without signing in, navigate to `/dashboard`, `/report`, `/compare`, `/admin`, or `/settings` | Redirected to `/sign-in?callbackUrl=<requested_path>`. |
| **SESS-05** | Public pages accessible without auth | 1. Without signing in, navigate to `/`, `/pricing`, `/methodology`, `/sign-in`, `/sign-up`, `/forgot-password` | Pages render normally. No redirect. |
| **SESS-06** | Session expiry — JWT maxAge | 1. Sign in<br>2. Wait for JWT to expire (NextAuth default: 30 days)<br>3. Navigate to protected route | Redirected to `/sign-in`. |
| **SESS-07** | Sign out clears session | 1. Sign in<br>2. Click "Sign out" (from sidebar user chip or settings)<br>3. Observe | `signOut({ callbackUrl: "/" })` called. Session destroyed. Redirected to `/`. Subsequent navigation to `/dashboard` redirects to `/sign-in`. |
| **SESS-08** | `newUser` redirects to `/report` | 1. Create brand-new account via credentials (first sign-in after verification)<br>2. Observe redirect | NextAuth `pages.newUser = "/report"`. User redirected to `/report` on first sign-in after account creation. |

---

## 9. Auth Shell / Layout

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SHELL-01** | Auth pages use two-column layout | 1. Navigate to any auth page (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify`) | Left: brand panel (dark surface) with wordmark, tagline, and footer links. Right: form column (cream surface). |
| **SHELL-02** | Brand panel shows correct content | 1. Observe left panel on any auth page | Wordmark (links to `/`), eyebrow "OneGoodArea", headline "The data and intelligence layer underneath UK property workflows.", lead paragraph about 4 products + Sandbox free tier. Footer: "← Back to site", "Pricing", "About". |
| **SHELL-03** | "Back to site" link works | 1. Click "← Back to site" in brand panel footer | Navigates to `/`. |
| **SHELL-04** | "Pricing" link in brand panel | 1. Click "Pricing" in brand panel footer | Navigates to `/pricing`. |
| **SHELL-05** | "About" link in brand panel | 1. Click "About" in brand panel footer | Navigates to `/about`. |
| **SHELL-06** | Responsive — mobile stacks vertically | 1. Resize viewport to ≤720px<br>2. Observe auth page layout | Brand panel collapses or stacks above the form. Form takes full width. |
| **SHELL-07** | Form column is scrollable on overflow | 1. Fill form with long content or use small viewport<br>2. Observe | Form column has internal scroll (`overflow-y: auto`). Brand panel remains fixed. |

---

## 10. Auth Pages — SEO & Indexing

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SEO-01** | Sign-in page excluded from search engines | 1. Check `/robots.txt` | `/sign-in` is **not** explicitly disallowed — only `/dashboard`, `/admin`, `/settings`, `/compare`, `/verify`, `/forgot-password`, `/reset-password`, `/api-usage` are. (Notably, `/sign-in` and `/sign-up` are public and crawlable.) |
| **SEO-02** | Canonical URLs set | 1. Inspect `<head>` of `/sign-in` and `/sign-up` | `canonical: "https://www.onegoodarea.com/sign-in"` and `"https://www.onegoodarea.com/sign-up"`. |
| **SEO-03** | Page titles set | 1. Inspect `<title>` tag | `/sign-in`: "Sign in \| OneGoodArea". `/sign-up`: "Sign up \| OneGoodArea". |

---

## 11. Security

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **SEC-01** | Forgot password prevents email enumeration | 1. Request password reset for registered email<br>2. Request password reset for unregistered email<br>3. Compare responses | Both return identical `{ ok: true }` response. No timing difference in UI/API. |
| **SEC-02** | Resend verification prevents email enumeration | 1. Resend verification for registered email<br>2. Resend verification for unregistered email<br>3. Compare responses | Both return `{ ok: true }`. No indication of user existence. |
| **SEC-03** | Registration rate-limited by IP | 1. Submit many registration attempts from same IP<br>2. Observe | After hitting `RATE_LIMITS.authRegister` limit, API returns 429. |
| **SEC-04** | Password reset rate-limited per email | 1. Request password reset 4 times in 1 hour for the same email<br>2. Observe | 4th request is silently dropped (returns `{ ok: true }` but no token created). |
| **SEC-05** | Verification resend rate-limited per email | 1. Resend verification 4 times in 1 hour<br>2. Observe | 4th request returns 429 "Too many requests." |
| **SEC-06** | Passwords required to be ≥8 characters | 1. Attempt to register / reset with password <8 chars<br>2. Observe | Registration: 400. Reset: 400. Both client-side and server-side enforced. |
| **SEC-07** | Password reset token single-use | 1. Reset password with a valid token<br>2. Attempt to reuse the same token | Second attempt returns 400 "This reset link has already been used." |
| **SEC-08** | Password reset token expires in 1 hour | 1. Wait >1 hour after requesting reset<br>2. Use the reset link | API returns 400 "This reset link has expired. Please request a new one." |
| **SEC-09** | Verification token expires in 24 hours | 1. Wait >24 hours after registration<br>2. Use the verification link | Failure state shown on `/verify`. |
| **SEC-10** | Old unused tokens invalidated on new request | 1. Request password reset<br>2. Request another reset without using first<br>3. Try first token | First token is invalid (marked `used = TRUE`). |
| **SEC-11** | No plain-text password storage | 1. Inspect `password_hash` column<br>2. Compare with input password | Never matches plain text. Hash function: PBKDF2 via `hashPassword()`. |
| **SEC-12** | Credentials sent via HTTPS only | 1. Inspect network requests during sign-in/sign-up<br>2. Observe protocol | All requests use HTTPS. No credentials sent over plain HTTP. |

---

## 12. Error States & Edge Cases

| ID | Test Case | Steps | Expected Result |
|---|---|---|---|
| **EDGE-01** | Form submission with noValidate — client-side only | 1. Observe `<form noValidate>` attribute on sign-in/sign-up | Browser native validation is disabled; custom error messages are used (`AuthError` component). |
| **EDGE-02** | Double-submit prevention on sign-in | 1. Click "Sign in" rapidly multiple times<br>2. Observe | Button disabled (`loading` state) after first click. Spinner shown. Only one request sent. |
| **EDGE-03** | Double-submit prevention on sign-up | 1. Click "Create account" rapidly multiple times<br>2. Observe | Button disabled after first click. Only one `/api/auth/register` request sent. |
| **EDGE-04** | Double-submit prevention on forgot password | 1. Click "Send reset link" rapidly multiple times<br>2. Observe | Button disabled after first click. |
| **EDGE-05** | Server error (500) on register | 1. Simulate database failure during registration<br>2. Observe | Error: "Something went wrong. Please try again." |
| **EDGE-06** | Server error (500) on forgot password | 1. Simulate database failure during forgot password<br>2. Observe | API returns 500 "Something went wrong." |
| **EDGE-07** | Server error (500) on reset password | 1. Simulate database failure during reset<br>2. Observe | API returns 500 "Something went wrong." |
| **EDGE-08** | Network timeout during OAuth redirect | 1. Start OAuth flow<br>2. Simulate network loss before provider redirect completes | OAuth error or browser timeout. User can retry. |
| **EDGE-09** | Browser back button after sign-in | 1. Sign in<br>2. Press browser back button | Should not return to `/sign-in` with form data. Ideally redirects forward to `/dashboard`. |
| **EDGE-10** | Concurrent sign-in from multiple tabs | 1. Sign in in tab A<br>2. Switch to tab B (which shows `/sign-in`)<br>3. Observe | Tab B may still show stale state until refreshed. No conflict. |

---

## Test Environment Notes

- **Base URL:** https://www.onegoodarea.com/
- **Auth library:** NextAuth.js v5 (App Router)
- **Session strategy:** JWT (not database sessions)
- **Password hashing:** PBKDF2 with transparent SHA-256 → PBKDF2 migration
- **Rendering:** Client components wrapped in `<Suspense>` for `useSearchParams()`
- **Browser targets:** Chromium (latest), Firefox (latest), Safari (latest)
- **API endpoints:**
  - `POST /api/auth/register` — email registration
  - `POST /api/auth/forgot-password` — request password reset
  - `POST /api/auth/reset-password` — execute password reset
  - `POST /api/auth/resend-verification` — resend verification email
  - `GET /api/auth/[...nextauth]` — NextAuth handler (sign-in/sign-out/callback)
