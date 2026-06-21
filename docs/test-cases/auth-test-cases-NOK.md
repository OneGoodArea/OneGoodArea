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

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|
| **REG-02** | Successful email registration | 1. Navigate to `/sign-up`<br>2. Enter valid email + password (≥8 chars)<br>3. Click "Create account" | POST `/api/auth/register` returns 200. UI transitions to success state: "Check your email." with 3-step checklist. Verification email sent. |NOK
| **REG-03** | Registration shows verification steps | 1. Complete registration<br>2. Observe success screen | Ordered list: (1) Open the email from OneGoodArea, (2) Click the verification link, (3) Sign in and make your first API call. Link expiration note: "Link expires in 24 hours · Check your spam folder". |NOK
| **REG-04** | "Didn't receive it? Resend" button | 1. On verification success screen<br>2. Click "Didn't receive it? Resend" | POST `/api/auth/resend-verification` called. Button text changes to "Sending…" then "Verification email resent ✓". |NOK
| **REG-05** | Resend disabled after success | 1. Click "Didn't receive it? Resend"<br>2. Wait for "Verification email resent ✓"<br>3. Try clicking again | Button remains disabled after successful resend. |NOK
| **REG-06** | Resend rate-limited (max 3/hour) | 1. Resend verification email 3 times within 1 hour<br>2. Attempt 4th resend | API returns 429 with error "Too many requests. Please try again later." |NOK
| **REG-07** | "Go to sign in" link on verification screen | 1. Complete registration<br>2. Click "Go to sign in" | Navigates to `/sign-in`. |NOK
| **REG-19** | Terms and privacy links present | 1. Navigate to `/sign-up`<br>2. Observe fine print at bottom of form | "By signing up, you agree to our Terms and Privacy Policy." Both are linked (`/terms`, `/privacy`). |NOK

---

## 2. Sign-Up — OAuth (Google & GitHub)

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|
| **OAUTH-02** | Google OAuth sign-up creates account | 1. Click "Continue with Google"<br>2. Authenticate with a Google account not previously registered | Account created automatically. `provider = 'google'`, `email_verified = TRUE`. Redirected to `/dashboard`. |NOK
| **OAUTH-03** | GitHub OAuth sign-up creates account | 1. Click "Continue with GitHub"<br>2. Authenticate with a GitHub account not previously registered | Account created automatically. `provider = 'github'`, `email_verified = TRUE`. Redirected to `/dashboard`. |NOK

---

## 3. Email Verification

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

---

## 4. Sign-In — Email + Password

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|
| **SIGNIN-09** | Error state clears on new submission | 1. Trigger an error (e.g., wrong password)<br>2. Observe error message<br>3. Modify email/password and submit again | Error message cleared before new request starts (`setError("")` at top of `handleSubmit`). |NOK
| **SIGNIN-14** | "Forgot?" link next to password field | 1. On `/sign-in`<br>2. Click "Forgot?" | Navigates to `/forgot-password`. |NOK

---

## 5. Sign-In — OAuth (Google & GitHub)

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|
| **SIGNIN-OAUTH-03** | GitHub sign-in — existing account | 1. Click "Continue with GitHub"<br>2. Authenticate with previously-linked GitHub account | Sign-in succeeds. Redirected to `callbackUrl`. |NOK

---

## 6. Forgot Password

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|
| **FW-03** | Forgot password success shows steps | 1. Request password reset<br>2. Observe success screen | Ordered list: (1) Open the email, (2) Click the password reset link, (3) Choose a new password and sign in. "Link expires in 1 hour · Check your spam folder". |NOK

---

## 7. Reset Password

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

---

## 8. Session Management

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

---

## 9. Auth Shell / Layout

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

---

## 10. Auth Pages — SEO & Indexing

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

---

## 11. Security

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

---

## 12. Error States & Edge Cases

| ID | Test Case | Steps | Expected Result | Status |
|---|---|---|---|---|

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
