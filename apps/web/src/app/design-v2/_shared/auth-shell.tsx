"use client";

import type { ReactNode, InputHTMLAttributes } from "react";
import Link from "next/link";
import { Wordmark } from "./wordmark";
import "./auth-shell.css";

/* AuthShell — two-column auth layout (AR-204 close-out sweep 4/15).

   Brand v3 rewrite. Replaces the legacy .aiq + Fraunces +
   chartreuse-glow + JS mouseenter/leave button-state spaghetti.

   Locked surface plan (per the surface-rotation rule):
     Left  — Brand panel  (DARK)  wordmark + headline + lead + footer links
     Right — Form column  (cream) eyebrow + title + form fields + CTAs

   Public API unchanged: AuthShell, AuthTitle, FormField, AuthInput,
   AuthError, AuthSubmit, Divider, OAuthButtons, AuthFooterLink,
   AuthStatusIcon all accept the same props as before. Lets all 5
   callers (/sign-in, /sign-up, /verify, /forgot-password,
   /reset-password) drop their <Styles /> import in a single follow
   without changing their auth-shell usage. */

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="oga-root oga-auth">
      <BrandPanel />
      <main className="oga-auth__form">
        <div className="oga-auth__form-inner">{children}</div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      className="oga-section-dark oga-auth__brand"
      data-oga-surface="dark"
    >
      <div className="oga-auth__brand-top">
        <Wordmark href="/" size={24} />
      </div>

      <div className="oga-auth__brand-body">
        <div className="oga-auth__brand-eyebrow">
          <span className="oga-auth__brand-eyebrow-dot" aria-hidden />
          <span>OneGoodArea</span>
        </div>
        <h2 className="oga-auth__brand-title">
          The data and intelligence layer underneath UK property workflows.
        </h2>
        <p className="oga-auth__brand-lead">
          Four products on one engine: Signals, Scores, Monitor, and a typed
          AI query plane. Methodology version-pinned per organisation. Sandbox
          is free, 35 API calls a month, no card to start.
        </p>
      </div>

      <div className="oga-auth__brand-foot">
        <Link href="/" className="oga-auth__brand-back">
          <span aria-hidden>←</span> Back to site
        </Link>
        <span className="oga-auth__brand-sep" aria-hidden />
        <Link href="/pricing" className="oga-auth__brand-link">
          Pricing
        </Link>
        <Link href="/about" className="oga-auth__brand-link">
          About
        </Link>
      </div>
    </aside>
  );
}

/* ============================================================
   Form column primitives
   ============================================================ */

export function AuthTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="oga-auth-title">
      {eyebrow && (
        <div className="oga-auth-title__eyebrow">
          <span className="oga-auth-title__eyebrow-dot" aria-hidden />
          <span>{eyebrow}</span>
        </div>
      )}
      <h1 className="oga-auth-title__h1">{title}</h1>
      {sub && <p className="oga-auth-title__sub">{sub}</p>}
    </header>
  );
}

export function FormField({
  label,
  children,
  rightLabel,
}: {
  label: string;
  children: ReactNode;
  rightLabel?: ReactNode;
}) {
  return (
    <div className="oga-auth-field">
      <div className="oga-auth-field__row">
        <label className="oga-auth-field__label">{label}</label>
        {rightLabel}
      </div>
      {children}
    </div>
  );
}

export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="oga-auth-input" />;
}

export function AuthError({ children }: { children: ReactNode }) {
  return <div className="oga-auth-error">{children}</div>;
}

export function AuthSubmit({
  loading,
  disabled,
  children,
}: {
  loading?: boolean;
  /* Independent disable signal — used by /welcome to gate Continue
     until the step's input is satisfied (e.g. an intent card picked,
     workspace name typed). Loading still disables on its own. */
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="oga-auth-submit"
      data-loading={loading ? "true" : undefined}
    >
      {loading ? <span className="oga-auth-spinner" aria-hidden /> : children}
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="oga-auth-divider">
      <span className="oga-auth-divider__rule" aria-hidden />
      <span className="oga-auth-divider__label">{label}</span>
      <span className="oga-auth-divider__rule" aria-hidden />
    </div>
  );
}

export function OAuthButtons({
  onProvider,
}: {
  onProvider: (p: "google" | "github") => void;
}) {
  return (
    <div className="oga-auth-oauth">
      <OAuthButton
        provider="google"
        label="Continue with Google"
        onClick={() => onProvider("google")}
      />
      <OAuthButton
        provider="github"
        label="Continue with GitHub"
        onClick={() => onProvider("github")}
      />
    </div>
  );
}

function OAuthButton({
  provider,
  label,
  onClick,
}: {
  provider: "google" | "github";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="oga-auth-oauth__btn"
    >
      {provider === "google" ? (
        <svg
          className="oga-auth-oauth__icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      ) : (
        <svg
          className="oga-auth-oauth__icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      )}
      {label}
    </button>
  );
}

export function AuthFooterLink({
  label,
  href,
  linkLabel,
}: {
  label: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="oga-auth-foot-link">
      {label}{" "}
      <Link href={href} className="oga-auth-foot-link__link">
        {linkLabel}
      </Link>
    </div>
  );
}

/* Status icon — used by /verify-success, /reset-success, error flows. */
export function AuthStatusIcon({
  tone,
  children,
}: {
  tone: "success" | "danger" | "info";
  children: ReactNode;
}) {
  return (
    <div className="oga-auth-status" data-tone={tone}>
      {children}
    </div>
  );
}

