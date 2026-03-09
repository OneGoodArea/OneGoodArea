"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, ArrowRight, Mail } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        action: "register",
        redirect: false,
      });

      if (result?.error) {
        setError("Account already exists or sign up failed");
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
      await signIn(provider, { callbackUrl: "/report" });
    } catch {
      setError("OAuth error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar />

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          {registered ? (
            /* Check your email confirmation */
            <div className="text-center">
              <div
                className="w-14 h-14 mx-auto mb-5 flex items-center justify-center"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                <Mail size={24} />
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                Check your email
              </h1>
              <p className="text-[13px] mb-1" style={{ color: "var(--text-secondary)" }}>
                We sent a verification link to
              </p>
              <p className="text-[13px] font-mono font-medium mb-6" style={{ color: "var(--accent)" }}>
                {email}
              </p>
              <div
                className="text-[11px] font-mono px-4 py-3 mb-6 border text-left"
                style={{ borderColor: "var(--border)", background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}
              >
                <p className="mb-1">1. Open the email from AreaIQ</p>
                <p className="mb-1">2. Click the verification link</p>
                <p>3. Sign in and generate your first report</p>
              </div>
              <p className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                Link expires in 24 hours. Check your spam folder if you don&apos;t see it.
              </p>
              <div className="mt-6">
                <Link
                  href="/sign-in"
                  className="inline-flex h-9 px-6 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                  style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                >
                  Go to sign in <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="mb-8 text-center">
                <h1 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                  Create your account
                </h1>
                <p className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  3 free reports per month. No card required.
                </p>
              </div>

              {/* OAuth */}
              <div className="flex flex-col gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  className="h-9 w-full flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-wide border transition-colors cursor-pointer"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--bg)")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  className="h-9 w-full flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-wide border transition-colors cursor-pointer"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--bg)")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  Continue with GitHub
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-[13px] border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full h-9 px-3 text-[13px] border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  />
                </div>

                {error && (
                  <div className="text-[11px] font-mono px-3 py-2 border" style={{ color: "var(--neon-red)", borderColor: "var(--neon-red-dim)", background: "var(--neon-red-dim)" }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 w-full flex items-center justify-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <>Create account <ArrowRight size={12} /></>}
                </button>
              </form>

              {/* Footer link */}
              <div className="mt-6 text-center">
                <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  Already have an account?{" "}
                  <Link href="/sign-in" className="underline" style={{ color: "var(--accent)" }}>
                    Sign in
                  </Link>
                </span>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
