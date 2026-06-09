"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AuthShell,
  AuthTitle,
  AuthStatusIcon,
} from "../_shared/auth-shell";

/* /verify — DESIGN PREVIEW page. The real email-verification flow
   (DB token check + send-welcome-email) lives at /verify as a
   server component. Here we show both visual states so they can
   be reviewed, toggled via ?state=success or ?state=failure. */

export default function VerifyClient() {
  return (
    <Suspense fallback={<AuthShell><div /></AuthShell>}>
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const searchParams = useSearchParams();
  const state = (searchParams.get("state") || "success") as
    | "success"
    | "failure";
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <AuthShell>
      {state === "success" ? <SuccessState /> : <FailureState />}
      {isDev && <PreviewToggle current={state} />}
    </AuthShell>
  );
}

function SuccessState() {
  return (
    <div className="oga-auth-center">
      <AuthStatusIcon tone="success">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        title="Email verified."
        sub="Your account is ready and writes are now unlocked — the API will accept calls signed with your key. Sandbox tier includes 35 API calls a month for evaluation, no card required."
      />
      <div className="oga-auth-actions">
        {/* AR-253: dashboard is the destination, not /sign-in. If the
            user clicked verify while already signed in (post-AR-253
            primary flow), /dashboard renders. If they clicked verify
            in a fresh browser (different device, etc.), the auth
            middleware will bounce them to /sign-in automatically. */}
        <Link href="/dashboard" className="oga-auth-pill">
          Open dashboard
          <span aria-hidden>→</span>
        </Link>
        <Link href="/" className="oga-auth-pill oga-auth-pill--ghost">
          Explore first
        </Link>
      </div>
    </div>
  );
}

function FailureState() {
  return (
    <div className="oga-auth-center">
      <AuthStatusIcon tone="danger">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7 V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1" fill="currentColor" />
        </svg>
      </AuthStatusIcon>
      <AuthTitle
        title="Verification failed."
        sub="This verification link is invalid, has expired, or has already been used. Create your account again to get a fresh link."
      />
      <div className="oga-auth-actions">
        <Link href="/sign-up" className="oga-auth-pill">
          Sign up again
          <span aria-hidden>→</span>
        </Link>
        <a
          href="mailto:operation@onegoodarea.co.uk?subject=Verification%20help"
          className="oga-auth-pill oga-auth-pill--ghost"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}

function PreviewToggle({ current }: { current: "success" | "failure" }) {
  return (
    <div className="oga-auth-preview">
      <span>Preview state:</span>
      <Link
        href="?state=success"
        className={
          current === "success"
            ? "oga-auth-preview__chip oga-auth-preview__chip--active"
            : "oga-auth-preview__chip"
        }
      >
        Success
      </Link>
      <Link
        href="?state=failure"
        className={
          current === "failure"
            ? "oga-auth-preview__chip oga-auth-preview__chip--active"
            : "oga-auth-preview__chip"
        }
      >
        Failure
      </Link>
    </div>
  );
}
