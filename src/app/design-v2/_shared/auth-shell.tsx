"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wordmark } from "./wordmark";

/* ═══════════════════════════════════════════════════════════════
   AuthShell · two-column auth layout for design-v2 preview.
   Left: bespoke brand panel (wordmark, italic Fraunces pitch, back link).
   Right: form card on hairline border, white bg.
   Exports shell + primitives used across sign-in/up, reset, verify.
   ═══════════════════════════════════════════════════════════════ */

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="aiq-auth-shell" style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      background: "var(--bg)",
    }}>
      <BrandPanel />
      <main style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "80px 40px", background: "var(--bg)",
        minHeight: "100vh",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="aiq-auth-brand" style={{
      background: "var(--bg-off)",
      padding: "56px 48px 40px",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      position: "relative", overflow: "hidden",
      minHeight: "100vh",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: -140, left: -140,
        width: 520, height: 520,
        background: "radial-gradient(circle, rgba(212,243,58,0.22) 0%, rgba(212,243,58,0) 60%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, alignSelf: "flex-start" }}>
        <Wordmark href="/design-v2" size={24} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)", marginBottom: 22,
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
          }} />
          UK area intelligence
        </div>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(32px, 3.8vw, 46px)", lineHeight: 1.08,
          letterSpacing: "-0.018em", color: "var(--ink-deep)",
          margin: "0 0 18px",
        }}>
          An intelligence report for{" "}
          <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 2,
          }}>every UK postcode.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
          lineHeight: 1.58, color: "var(--text-2)",
          letterSpacing: "-0.003em",
          margin: 0, maxWidth: "46ch",
        }}>
          Type a place, pick why you&apos;re looking, and seven public datasets do the rest. Three reports a month are free.
        </p>
      </div>

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.2em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>
        <Link href="/design-v2" style={{
          color: "var(--ink-deep)", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 8,
          borderBottom: "1px solid var(--ink-deep)", paddingBottom: 2,
        }}>
          ← Back to site
        </Link>
        <span aria-hidden style={{ width: 1, height: 10, background: "var(--border)" }} />
        <Link href="/design-v2/pricing" style={{
          color: "var(--text-2)", textDecoration: "none",
        }}>Pricing</Link>
        <Link href="/design-v2/about" style={{
          color: "var(--text-2)", textDecoration: "none",
        }}>About</Link>
      </div>
    </aside>
  );
}

/* ─────── Form card primitives ─────── */

export function AuthTitle({ eyebrow, title, sub }: {
  eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 34 }}>
      {eyebrow && (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)", marginBottom: 14,
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
          }} />
          {eyebrow}
        </div>
      )}
      <h1 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: 34, lineHeight: 1.08,
        letterSpacing: "-0.018em", color: "var(--ink-deep)",
        margin: "0 0 10px",
      }}>{title}</h1>
      {sub && (
        <p style={{
          fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          letterSpacing: "-0.003em",
          margin: 0,
        }}>{sub}</p>
      )}
    </div>
  );
}

export function FormField({ label, children, rightLabel }: {
  label: string; children: React.ReactNode; rightLabel?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 7,
      }}>
        <label style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)",
        }}>{label}</label>
        {rightLabel}
      </div>
      {children}
    </div>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: "100%", height: 44,
        padding: "0 14px",
        fontFamily: "var(--sans)", fontSize: 14.5,
        color: "var(--ink-deep)", background: "var(--bg)",
        border: `1px solid ${focused ? "var(--ink)" : "var(--border)"}`,
        borderRadius: 4,
        outline: "none",
        transition: "border-color 140ms ease, box-shadow 140ms ease",
        boxShadow: focused ? "0 0 0 3px rgba(212,243,58,0.22)" : "none",
        ...props.style,
      }}
    />
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 12,
      color: "#b42318",
      background: "rgba(239,68,68,0.06)",
      border: "1px solid rgba(239,68,68,0.25)",
      padding: "10px 14px", borderRadius: 4,
      marginBottom: 14,
      lineHeight: 1.45,
    }}>{children}</div>
  );
}

export function AuthSubmit({ loading, children }: {
  loading?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: "100%", height: 44,
        fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--signal-ink)", background: "var(--signal)",
        border: "1px solid var(--ink-deep)",
        borderRadius: 999,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 10,
        cursor: loading ? "default" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
        boxShadow: "0 1px 0 rgba(6,42,30,0.04)",
      }}
      onMouseEnter={(e) => {
        if (loading) return;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(6,42,30,0.12)";
      }}
      onMouseLeave={(e) => {
        if (loading) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 0 rgba(6,42,30,0.04)";
      }}
    >
      {loading ? (
        <span aria-hidden style={{
          width: 16, height: 16, borderRadius: "50%",
          border: "1.6px solid currentColor", borderTopColor: "transparent",
          display: "inline-block",
          animation: "aiq-spin 800ms linear infinite",
        }} />
      ) : children}
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      margin: "20px 0",
    }}>
      <span aria-hidden style={{ flex: 1, height: 1, background: "var(--border)" }} />
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.24em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>{label}</span>
      <span aria-hidden style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </div>
  );
}

export function OAuthButtons({ onProvider }: {
  onProvider: (p: "google" | "github") => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 6 }}>
      <OAuthButton provider="google" label="Continue with Google" onClick={() => onProvider("google")} />
      <OAuthButton provider="github" label="Continue with GitHub" onClick={() => onProvider("github")} />
    </div>
  );
}

function OAuthButton({ provider, label, onClick }: {
  provider: "google" | "github"; label: string; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 44, width: "100%",
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: "var(--ink-deep)",
        background: hover ? "var(--bg-off)" : "var(--bg)",
        border: `1px solid ${hover ? "var(--ink)" : "var(--border)"}`,
        borderRadius: 999, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      {provider === "google" ? (
        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="var(--ink-deep)" aria-hidden>
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function AuthFooterLink({ label, href, linkLabel }: {
  label: string; href: string; linkLabel: string;
}) {
  return (
    <div style={{
      marginTop: 28, textAlign: "center",
      fontFamily: "var(--sans)", fontSize: 13,
      color: "var(--text-2)",
    }}>
      {label}{" "}
      <Link href={href} style={{
        color: "var(--ink-deep)", textDecoration: "none",
        borderBottom: "1px solid var(--ink-deep)", paddingBottom: 1,
        fontWeight: 500,
      }}>
        {linkLabel}
      </Link>
    </div>
  );
}

/* ─────── Bespoke icon-halo for success / failure / pending ─────── */

export function AuthStatusIcon({ tone, children }: {
  tone: "success" | "danger" | "info"; children: React.ReactNode;
}) {
  const bg    = tone === "success" ? "var(--signal-dim)"   : tone === "danger" ? "rgba(239,68,68,0.10)" : "var(--bg-off)";
  const ink   = tone === "success" ? "var(--ink-deep)"     : tone === "danger" ? "#b42318"              : "var(--ink)";
  const ring  = tone === "success" ? "var(--ink-deep)"     : tone === "danger" ? "rgba(239,68,68,0.4)"  : "var(--border)";
  return (
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: bg, border: `1.5px solid ${ring}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: ink, marginBottom: 22,
    }}>{children}</div>
  );
}
