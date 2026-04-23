"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import {
  AuthShell, AuthTitle, FormField, AuthInput, AuthError,
  AuthSubmit, AuthStatusIcon,
} from "../_shared/auth-shell";

export default function ForgotPasswordClient() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
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
      <>
        <Styles />
        <AuthShell>
          <div style={{ textAlign: "center" }}>
            <AuthStatusIcon tone="success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M4 8 L12 3 L20 8 V20 H4 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M4 8 L12 13 L20 8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </AuthStatusIcon>
            <AuthTitle
              title={<>Check <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>your email.</em></>}
              sub={<>If an account exists for <code style={{
                fontFamily: "var(--mono)", fontSize: 13.5, color: "var(--ink-deep)",
                background: "var(--bg-off)", padding: "1px 6px", borderRadius: 2,
                border: "1px solid var(--border)",
              }}>{email}</code>, we just sent a password reset link.</>}
            />

            <ol style={{
              listStyle: "none", padding: 0, margin: "18px 0 22px",
              border: "1px solid var(--border)",
              textAlign: "left",
            }}>
              {[
                "Open the email from OneGoodArea",
                "Click the password reset link",
                "Choose a new password and sign in",
              ].map((step, i) => (
                <li key={i} style={{
                  padding: "12px 16px",
                  borderBottom: i < 2 ? "1px solid var(--border-dim)" : "none",
                  display: "flex", alignItems: "center", gap: 14,
                  fontFamily: "var(--sans)", fontSize: 14,
                  color: "var(--text-2)",
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--signal)", color: "var(--signal-ink)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
                    flexShrink: 0,
                  }}>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 22,
            }}>
              Link expires in 1 hour · Check your spam folder
            </div>

            <Link href="/design-v2/sign-in" style={{
              fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "12px 22px", borderRadius: 999, textDecoration: "none",
              border: "1px solid var(--ink-deep)",
              display: "inline-flex", alignItems: "center", gap: 9,
            }}>
              Back to sign in
              <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
            </Link>
          </div>
        </AuthShell>
      </>
    );
  }

  return (
    <>
      <Styles />
      <AuthShell>
        <AuthTitle
          eyebrow="Forgot your password"
          title={<>Reset it <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>in one email.</em></>}
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
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </AuthSubmit>
        </form>

        <div style={{
          marginTop: 28, textAlign: "center",
        }}>
          <Link href="/design-v2/sign-in" style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "var(--text-2)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <span aria-hidden>←</span> Back to sign in
          </Link>
        </div>
      </AuthShell>
    </>
  );
}
