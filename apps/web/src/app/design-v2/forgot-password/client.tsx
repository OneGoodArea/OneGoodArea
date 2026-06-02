"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AuthShell,
  AuthTitle,
  FormField,
  AuthInput,
  AuthError,
  AuthSubmit,
  AuthStatusIcon,
} from "../_shared/auth-shell";

const STEPS = [
  "Open the email from OneGoodArea",
  "Click the password reset link",
  "Choose a new password and sign in",
];

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (sent) {
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
                If an account exists for{" "}
                <code className="oga-auth-code">{email}</code>, we just sent
                a password reset link.
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
            Link expires in 1 hour · Check your spam folder
          </div>

          <Link href="/sign-in" className="oga-auth-pill">
            Back to sign in
            <span aria-hidden>→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthTitle
        eyebrow="Forgot your password"
        title="Reset it in one email."
        sub="Enter the email you signed up with. We'll send a link that lets you choose a new password."
      />

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

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading}>
          Send reset link
          <span aria-hidden>→</span>
        </AuthSubmit>
      </form>

      <div className="oga-auth-back-row">
        <Link href="/sign-in" className="oga-auth-back-link">
          <span aria-hidden>←</span> Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
