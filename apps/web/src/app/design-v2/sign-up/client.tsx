"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  AuthShell,
  AuthTitle,
  FormField,
  AuthInput,
  AuthError,
  AuthSubmit,
  Divider,
  OAuthButtons,
  AuthFooterLink,
  AuthStatusIcon,
} from "../_shared/auth-shell";

const STEPS = [
  "Open the email from OneGoodArea",
  "Click the verification link",
  "Sign in and make your first API call",
];

export default function SignUpClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = useCallback(async () => {
    if (resending || resent) return;
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      setResent(true);
    } catch {
      /* silent fail */
    } finally {
      setResending(false);
    }
  }, [email, resending, resent]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (data.error === "email_taken") {
          setError(
            "An account with this email already exists. Try signing in instead.",
          );
        } else if (data.error === "email_oauth") {
          setError(data.message);
        } else {
          setError(data.message || "Something went wrong. Please try again.");
        }
        setLoading(false);
        return;
      }
      setLoading(false);
      setRegistered(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setError("OAuth error. Please try again.");
    }
  };

  if (registered) {
    return (
      <AuthShell>
        <div className="oga-auth-center">
          <AuthStatusIcon tone="success">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M4 8 L12 3 L20 8 V20 H4 Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M4 8 L12 13 L20 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </AuthStatusIcon>

          <AuthTitle
            title="Check your email."
            sub={
              <>
                We sent a verification link to{" "}
                <code className="oga-auth-code">{email}</code>
              </>
            }
          />

          <ol className="oga-auth-steps">
            {STEPS.map((step, i) => (
              <li key={step} className="oga-auth-steps__item">
                <span aria-hidden className="oga-auth-steps__num">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="oga-auth-meta">
            Link expires in 24 hours · Check your spam folder
          </div>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resent}
            className="oga-auth-link-btn"
          >
            {resending
              ? "Sending…"
              : resent
                ? "Verification email resent ✓"
                : "Didn't receive it? Resend"}
          </button>

          <div>
            <Link href="/sign-in" className="oga-auth-pill">
              Go to sign in
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthTitle
        eyebrow="Create an account"
        title="Start your free Sandbox."
        sub="35 API calls a month for evaluation. Free forever, no card, no timer, no trial."
      />

      <OAuthButtons onProvider={handleOAuth} />
      <Divider label="or with email" />

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Email">
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
          />
        </FormField>

        <FormField label="Password">
          <AuthInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>

        <div className="oga-auth-meta">Minimum 8 characters</div>

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading}>
          Create account
          <span aria-hidden>→</span>
        </AuthSubmit>
      </form>

      <AuthFooterLink
        label="Already have an account?"
        href="/sign-in"
        linkLabel="Sign in"
      />

      <div className="oga-auth-fineprint">
        By signing up, you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </div>
    </AuthShell>
  );
}
