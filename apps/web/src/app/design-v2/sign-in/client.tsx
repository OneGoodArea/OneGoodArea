"use client";

import { Suspense, useState, type FormEvent } from "react";
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
  Divider,
  OAuthButtons,
  AuthFooterLink,
} from "../_shared/auth-shell";

export default function SignInClient() {
  return (
    <Suspense fallback={<AuthShell><div /></AuthShell>}>
      <SignInForm />
    </Suspense>
  );
}

/* Sanitize the ?callbackUrl=... param to prevent open redirect after
   sign-in: only allow same-origin relative paths (must start with a
   single "/", reject "//evil.com/..." which would resolve to
   https://evil.com). Falls back to /dashboard for anything else.
   Same pattern as /get-started; fix landed in AR-249 sweep. */
function safeCallbackUrl(raw: string | null): string {
  const FALLBACK = "/dashboard";
  if (!raw) return FALLBACK;
  if (!raw.startsWith("/")) return FALLBACK;
  if (raw.startsWith("//")) return FALLBACK;
  return raw;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
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
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError("OAuth error. Please try again.");
    }
  };

  return (
    <AuthShell>
      <AuthTitle
        eyebrow="Welcome back"
        title="Sign in."
        sub="Pick up where you left off. Your API keys, portfolios, and saved scoring presets are waiting."
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
          />
        </FormField>

        {error && <AuthError>{error}</AuthError>}

        <AuthSubmit loading={loading}>
          Sign in
          <span aria-hidden>→</span>
        </AuthSubmit>
      </form>

      <AuthFooterLink
        label="New here?"
        href="/sign-up"
        linkLabel="Create an account"
      />
    </AuthShell>
  );
}
