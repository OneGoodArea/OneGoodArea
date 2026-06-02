"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AuthShell,
  AuthTitle,
  FormField,
  AuthInput,
  AuthError,
  AuthSubmit,
  AuthStatusIcon,
} from "../_shared/auth-shell";

export default function ResetPasswordClient() {
  return (
    <Suspense fallback={<AuthShell><div /></AuthShell>}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell>
        <div className="oga-auth-center">
          <AuthStatusIcon tone="danger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M8 8 L16 16 M16 8 L8 16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </AuthStatusIcon>
          <AuthTitle
            title="Invalid reset link."
            sub="This password reset link is missing a token, has expired, or has already been used."
          />
          <Link href="/forgot-password" className="oga-auth-pill">
            Request a new link
            <span aria-hidden>→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell>
        <div className="oga-auth-center">
          <AuthStatusIcon tone="success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M8 12 L11 15 L16 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </AuthStatusIcon>
          <AuthTitle
            title="Password updated."
            sub="You can now sign in with your new password."
          />
          <Link href="/sign-in" className="oga-auth-pill">
            Sign in
            <span aria-hidden>→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthTitle
        eyebrow="Password reset"
        title="Choose a new password."
        sub="Minimum 8 characters. Make it something you'll remember."
      />

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="New password">
          <AuthInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="Confirm password">
          <AuthInput
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading}>
          Reset password
          <span aria-hidden>→</span>
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
