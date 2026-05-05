"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Styles } from "../_shared/styles";
import {
  AuthShell, AuthTitle, FormField, AuthInput, AuthError,
  AuthSubmit, Divider, OAuthButtons, AuthFooterLink,
} from "../_shared/auth-shell";

export default function SignInClient() {
  return (
    <>
      <Styles />
      <Suspense fallback={<AuthShell><div /></AuthShell>}>
        <SignInForm />
      </Suspense>
    </>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try { await signIn(provider, { callbackUrl }); }
    catch { setError("OAuth error. Please try again."); }
  };

  return (
    <AuthShell>
      <AuthTitle
        eyebrow="Welcome back"
        title={<>Sign <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>in.</em></>}
        sub="Pick up where you left off. Your reports, API keys, and watchlist are waiting."
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

        <FormField
          label="Password"
          rightLabel={
            <Link href="/forgot-password" style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--ink)", textDecoration: "none",
              borderBottom: "1px solid var(--border)", paddingBottom: 1,
            }}>
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
          />
        </FormField>

        {error && <AuthError>{error}</AuthError>}

        <div style={{ marginTop: 8 }}>
          <AuthSubmit loading={loading}>
            Sign in
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </AuthSubmit>
        </div>
      </form>

      <AuthFooterLink
        label="New here?"
        href="/sign-up"
        linkLabel="Create an account"
      />
    </AuthShell>
  );
}
