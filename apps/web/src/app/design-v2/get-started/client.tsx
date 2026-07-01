"use client";

/* AR-249 [AR-248-A] /get-started entry — email-first single-page sign-up + sign-in.

   Per the AR-248 onboarding proposal (locked 2026-06-08):
   - Single URL, no separate /login vs /register
   - Email-first: type email, click Continue, we check existence
   - If existing account -> password-only sign-in form (NextAuth credentials)
   - If new account -> password + GDPR consent -> register -> auto-
     signin -> /welcome (AR-253: dropped the "check your email" verify
     gate per proposal section 2 "verification REQUIRED to write data but NOT
     required to enter the dashboard". Verification email still sends
     in background; the reminder + resend live on /welcome.)
   - NO OAuth buttons (proposal lock — email + password only for v1)
   - ?source=... URL param captured to cookie + included on register
     for users.signup_source attribution

   Re-uses AuthShell + form primitives from _shared/auth-shell so the
   visual treatment matches the rest of the auth surface. Legacy
   /sign-in and /sign-up routes stay live for backward compat; a
   separate cleanup ticket retires them once /get-started is the
   canonical surface. */

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthShell,
  AuthTitle,
  FormField,
  AuthInput,
  AuthError,
  AuthSubmit,
  AuthFooterLink,
} from "../_shared/auth-shell";
import {
  readSignupSourceCookie,
  writeSignupSourceCookie,
} from "@/lib/signup-source";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import "./get-started.css";

/* ============================================================
   Top-level wrapper with Suspense for useSearchParams
   ============================================================ */

export default function GetStartedClient() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div />
        </AuthShell>
      }
    >
      <GetStartedForm />
    </Suspense>
  );
}

/* ============================================================
   Form
   ============================================================ */

type Step = "email" | "credentials";
type Mode = "signin" | "signup";

function GetStartedForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [step, setStep] = useState<Step>("email");
  const [mode, setMode] = useState<Mode>("signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* signup_source: capture from URL on mount, write to cookie so it
     survives navigation; fall back to existing cookie if no ?source
     param this visit. Sent with the register POST so the server can
     write users.signup_source. */
  useEffect(() => {
    const sourceParam = searchParams.get("source");
    if (sourceParam) {
      writeSignupSourceCookie(sourceParam);
    }
  }, [searchParams]);

  const handleContinueFromEmail = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleaned = email.trim().toLowerCase();
    if (!cleaned || !cleaned.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleaned }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many attempts. Please try again in a minute.");
        } else {
          setError("We couldn't check that email. Try again.");
        }
        setLoading(false);
        return;
      }
      const data = (await res.json()) as {
        exists: boolean;
        provider?: string;
      };
      /* OAuth-rooted accounts: legacy /sign-in still supports Google;
         /get-started doesn't. Steer Google users back to /sign-in; for
         GitHub-rooted accounts (AR-415 removed the provider) surface a
         support-migration message rather than a dead-end. */
      if (data.exists && data.provider && data.provider !== "credentials") {
        if (data.provider === "github") {
          setError(
            "This email signed up with GitHub. GitHub sign-in has been removed — contact support@onegoodarea.com to migrate your account.",
          );
        } else if (data.provider === "google") {
          setError(
            "This email signed up with Google. Use the Google button on the legacy sign-in page.",
          );
        } else {
          setError(
            "This email signed up with a social provider. Use the sign-in page.",
          );
        }
        setLoading(false);
        return;
      }
      setMode(data.exists ? "signin" : "signup");
      setStep("credentials");
      setLoading(false);
    } catch {
      setError("We couldn't reach the server. Retry, or contact support if this persists.");
      setLoading(false);
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("That password didn't match. Try again or reset it.");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Retry, or contact support if this persists.");
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!consentChecked) {
      setError("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
      /* Read the freshest cookie value at submit time — it may have
         been set by the useEffect that ran on mount with this visit's
         ?source param, OR may carry an attribution from an earlier
         visit. */
      const signupSource = readSignupSourceCookie();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          signup_source: signupSource,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; message?: string };
        /* email_taken means the user existed by the time we hit
           register even though check-email said new — concurrent
           registration race, or a stale check-email response. Treat
           as "switch to sign-in" rather than a hard error. */
        if (data.error === "email_taken") {
          setError(
            "An account with this email already exists. Use your password.",
          );
          setMode("signin");
          setPassword("");
        } else if (data.error === "email_oauth") {
          setError(data.message || "This account uses social sign-in.");
        } else {
          setError(data.message || "Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }

      /* AR-253: auto-signin immediately after register so the user
         lands in /welcome with a session. Proposal section 2 explicitly
         drops the email-verify gate at this step — verification is
         only required to write data, not to enter the dashboard. The
         verification email still sends in background; the reminder
         + resend live on /welcome. The credentials provider doesn't
         gate on email_verified (apps/web/src/lib/auth.ts authorize),
         so this signIn succeeds for a freshly-registered user.

         If signIn fails (shouldn't happen — we just wrote the row
         with this exact password — but defensive), surface the
         error inline. The user can retry sign-in via the email step. */
      const signInResult = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError(
          "Your account was created, but automatic sign-in failed. Use the sign-in form on this page.",
        );
        setMode("signin");
        setLoading(false);
        return;
      }
      router.push("/welcome");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Retry, or contact support if this persists.");
      setLoading(false);
    }
  };

  const resetToEmailStep = () => {
    setStep("email");
    setMode("signup");
    setPassword("");
    setConsentChecked(false);
    setError("");
  };

  const stepLabel = useMemo(() => {
    if (step === "email") return "Step 1 of 2";
    if (step === "credentials") return "Step 2 of 2";
    return undefined;
  }, [step]);

  /* ============================================================
     Email step + credentials step share the form shell
     ============================================================ */

  return (
    <AuthShell>
      <AuthTitle
        eyebrow={stepLabel}
        title={
          step === "email"
            ? "Get started."
            : mode === "signin"
              ? "Welcome back."
              : "Create your account."
        }
        sub={
          step === "email"
            ? "Sign in or create a free Sandbox account. 35 API calls a month for evaluation. No card to start."
            : mode === "signin"
              ? "Pick up where you left off. Your API keys, portfolios, and saved scoring presets are waiting."
              : "Name your workspace next and you're in. We'll send a verification link to your inbox — verify whenever you're ready to make your first API call."
        }
      />

      {step === "credentials" ? (
        <div className="oga-get-started__email-row">
          <span className="oga-get-started__email-row-label">Continuing as</span>
          <code className="oga-get-started__email-row-value">{email}</code>
          <button
            type="button"
            onClick={resetToEmailStep}
            className="oga-get-started__email-row-link"
          >
            Use a different email
          </button>
        </div>
      ) : null}

      {step === "email" ? (
        <form onSubmit={handleContinueFromEmail} noValidate>
          <FormField label="Email">
            <AuthInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
          </FormField>

          {error && <AuthError>{error}</AuthError>}

          <AuthSubmit loading={loading}>
            Continue
            <span aria-hidden>→</span>
          </AuthSubmit>
        </form>
      ) : mode === "signin" ? (
        <form onSubmit={handleSignIn} noValidate>
          <FormField
            label="Password"
            rightLabel={
              <Link
                href="/forgot-password"
                className="oga-auth-field__hint-link"
              >
                Forgot?
              </Link>
            }
          >
            <AuthInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              autoFocus
            />
          </FormField>

          {error && <AuthError>{error}</AuthError>}

          <AuthSubmit loading={loading}>
            Sign in
            <span aria-hidden>→</span>
          </AuthSubmit>
        </form>
      ) : (
        <form onSubmit={handleSignUp} noValidate>
          <FormField label="Password">
            <AuthInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </FormField>

          <div className="oga-auth-meta">Minimum 8 characters</div>

          <label className="oga-get-started__consent">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              required
              className="oga-get-started__consent-input"
            />
            <span>
              I agree to the <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </span>
          </label>

          {error && <AuthError>{error}</AuthError>}

          <AuthSubmit loading={loading}>
            Create account
            <span aria-hidden>→</span>
          </AuthSubmit>
        </form>
      )}

      {step === "email" ? (
        <AuthFooterLink
          label="Trouble signing in?"
          href="/forgot-password"
          linkLabel="Send a reset link"
        />
      ) : null}
    </AuthShell>
  );
}
