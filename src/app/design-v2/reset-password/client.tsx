"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Styles } from "../_shared/styles";
import {
  AuthShell, AuthTitle, FormField, AuthInput, AuthError,
  AuthSubmit, AuthStatusIcon,
} from "../_shared/auth-shell";

export default function ResetPasswordClient() {
  return (
    <>
      <Styles />
      <Suspense fallback={<AuthShell><div /></AuthShell>}>
        <ResetForm />
      </Suspense>
    </>
  );
}

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        <div style={{ textAlign: "center" }}>
          <AuthStatusIcon tone="danger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 8 L16 16 M16 8 L8 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </AuthStatusIcon>
          <AuthTitle
            title={<>Invalid <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>reset link.</em></>}
            sub="This password reset link is missing a token, has expired, or has already been used."
          />
          <Link href="/forgot-password" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "12px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            Request a new link
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell>
        <div style={{ textAlign: "center" }}>
          <AuthStatusIcon tone="success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 12 L11 15 L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </AuthStatusIcon>
          <AuthTitle
            title={<>Password <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>updated.</em></>}
            sub="You can now sign in with your new password."
          />
          <Link href="/sign-in" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "12px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            Sign in
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthTitle
        eyebrow="Password reset"
        title={<>Choose a <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>new password.</em></>}
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
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
