"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Styles } from "../_shared/styles";
import {
  AuthShell, AuthTitle, FormField, AuthInput, AuthError,
  AuthSubmit, Divider, OAuthButtons, AuthFooterLink, AuthStatusIcon,
} from "../_shared/auth-shell";

export default function SignUpClient() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending]   = useState(false);
  const [resent, setResent]         = useState(false);

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
    } catch { /* silent fail */ }
    finally { setResending(false); }
  }, [email, resending, resent]);

  const handleSubmit = async (e: React.FormEvent) => {
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
          setError("An account with this email already exists. Try signing in instead.");
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
    try { await signIn(provider, { callbackUrl: "/dashboard" }); }
    catch { setError("OAuth error. Please try again."); }
  };

  if (registered) {
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
              sub={<>We sent a verification link to <code style={{
                fontFamily: "var(--mono)", fontSize: 13.5, color: "var(--ink-deep)",
                background: "var(--bg-off)", padding: "1px 6px", borderRadius: 2,
                border: "1px solid var(--border)",
              }}>{email}</code></>}
            />

            <ol style={{
              listStyle: "none", padding: 0, margin: "18px 0 24px",
              border: "1px solid var(--border)",
              textAlign: "left",
            }}>
              {[
                "Open the email from OneGoodArea",
                "Click the verification link",
                "Sign in and generate your first report",
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
              color: "var(--text-3)", marginBottom: 18,
            }}>
              Link expires in 24 hours · Check your spam folder
            </div>

            <button
              onClick={handleResend}
              disabled={resending || resent}
              style={{
                fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: resent ? "var(--ink-deep)" : "var(--ink)",
                background: "transparent", border: "none",
                padding: "4px 0", marginBottom: 22, cursor: "pointer",
                borderBottom: `1px solid ${resent ? "var(--ink-deep)" : "var(--border)"}`,
                opacity: resending ? 0.6 : 1,
              }}
            >
              {resending ? "Sending…" : resent ? "Verification email resent ✓" : "Didn't receive it? Resend"}
            </button>

            <div>
              <Link href="/sign-in" style={{
                fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--signal-ink)", background: "var(--signal)",
                padding: "12px 22px", borderRadius: 999, textDecoration: "none",
                border: "1px solid var(--ink-deep)",
                display: "inline-flex", alignItems: "center", gap: 9,
              }}>
                Go to sign in
                <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
              </Link>
            </div>
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
          eyebrow="Create an account"
          title={<>Start with a <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>single postcode.</em></>}
          sub="Three reports a month are free. No card, no timer, no trial."
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

          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 14,
          }}>
            Minimum 8 characters
          </div>

          {error && <AuthError>{error}</AuthError>}

          <AuthSubmit loading={loading}>
            Create account
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </AuthSubmit>
        </form>

        <AuthFooterLink
          label="Already have an account?"
          href="/sign-in"
          linkLabel="Sign in"
        />

        <div style={{
          marginTop: 20, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          By signing up, you agree to our{" "}
          <Link href="/terms" style={{
            color: "var(--text-2)", textDecoration: "none",
            borderBottom: "1px solid var(--border)",
          }}>Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" style={{
            color: "var(--text-2)", textDecoration: "none",
            borderBottom: "1px solid var(--border)",
          }}>Privacy Policy</Link>.
        </div>
      </AuthShell>
    </>
  );
}
