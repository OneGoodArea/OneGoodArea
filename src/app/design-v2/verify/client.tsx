"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Styles } from "../_shared/styles";
import {
  AuthShell, AuthTitle, AuthStatusIcon,
} from "../_shared/auth-shell";

/* NOTE: this is a DESIGN PREVIEW page. The real email-verification flow
   (DB token check + send-welcome-email) lives at `/verify` as a server
   component. Here we show both visual states so Pedro can review the UI,
   toggled via `?state=success` or `?state=failure`. At promotion time,
   the real /verify server component can render either of these client
   components based on its DB result. */

export default function VerifyClient() {
  return (
    <>
      <Styles />
      <Suspense fallback={<AuthShell><div /></AuthShell>}>
        <VerifyInner />
      </Suspense>
    </>
  );
}

function VerifyInner() {
  const searchParams = useSearchParams();
  const state = (searchParams.get("state") || "success") as "success" | "failure";

  return (
    <AuthShell>
      {state === "success" ? <SuccessState /> : <FailureState />}

      <PreviewToggle current={state} />
    </AuthShell>
  );
}

function SuccessState() {
  return (
    <div style={{ textAlign: "center" }}>
      <AuthStatusIcon tone="success">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 12 L11 15 L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </AuthStatusIcon>
      <AuthTitle
        title={<>Email <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>verified.</em></>}
        sub="Your account is ready. Sign in to score your first postcode — three reports a month are on us."
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/design-v2/sign-in" style={primaryCta}>
          Sign in
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </Link>
        <Link href="/design-v2" style={ghostCta}>
          Explore first
        </Link>
      </div>
    </div>
  );
}

function FailureState() {
  return (
    <div style={{ textAlign: "center" }}>
      <AuthStatusIcon tone="danger">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7 V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      </AuthStatusIcon>
      <AuthTitle
        title={<>Verification <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>failed.</em></>}
        sub="This verification link is invalid, has expired, or has already been used. Create your account again to get a fresh link."
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/design-v2/sign-up" style={primaryCta}>
          Sign up again
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </Link>
        <a href="mailto:hello@area-iq.co.uk?subject=Verification help" style={ghostCta}>
          Contact support
        </a>
      </div>
    </div>
  );
}

/* Tiny toggle so Pedro can flip between states on the preview. Hidden in
   the design review, removed from the eventual promotion render. */
function PreviewToggle({ current }: { current: "success" | "failure" }) {
  return (
    <div style={{
      marginTop: 48, paddingTop: 24,
      borderTop: "1px dashed var(--border)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
      letterSpacing: "0.22em", textTransform: "uppercase",
      color: "var(--text-3)",
    }}>
      <span>Preview state:</span>
      <Link href="?state=success" style={{
        padding: "3px 8px", borderRadius: 2,
        background: current === "success" ? "var(--signal)" : "transparent",
        color: current === "success" ? "var(--signal-ink)" : "var(--text-2)",
        textDecoration: "none",
        border: `1px solid ${current === "success" ? "var(--ink-deep)" : "var(--border)"}`,
      }}>Success</Link>
      <Link href="?state=failure" style={{
        padding: "3px 8px", borderRadius: 2,
        background: current === "failure" ? "var(--signal)" : "transparent",
        color: current === "failure" ? "var(--signal-ink)" : "var(--text-2)",
        textDecoration: "none",
        border: `1px solid ${current === "failure" ? "var(--ink-deep)" : "var(--border)"}`,
      }}>Failure</Link>
    </div>
  );
}

const primaryCta: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: "var(--signal-ink)", background: "var(--signal)",
  padding: "12px 22px", borderRadius: 999, textDecoration: "none",
  border: "1px solid var(--ink-deep)",
  display: "inline-flex", alignItems: "center", gap: 9,
};

const ghostCta: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
  letterSpacing: "0.14em", textTransform: "uppercase",
  color: "var(--ink)", background: "transparent",
  padding: "12px 22px", borderRadius: 999, textDecoration: "none",
  border: "1px solid var(--border)",
  display: "inline-flex", alignItems: "center", gap: 9,
};
