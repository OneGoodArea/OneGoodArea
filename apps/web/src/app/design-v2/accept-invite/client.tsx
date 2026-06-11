"use client";

/* AR-272 /accept-invite client.

   Flow:
   1. Read ?token from the URL.
   2. If no session, redirect to /sign-in?callbackUrl=/accept-invite?token=...
      so the user lands back here once authenticated. The invitee can
      sign up first and accept second — the email never has to match
      an existing account, only the eventual signed-in one.
   3. POST /api/invitations/[token]/accept. Branch on response codes:
      - 200 → succeeded, route to /dashboard after a brief success state.
      - 403 email_mismatch → wrong account signed in; offer sign-out.
      - 410 expired / revoked / already_accepted → terminal message.
      - 404 → "Link no longer valid."
      - 401 → re-redirect to /sign-in (session expired mid-flow).

   Visual recipe mirrors /verify: AuthShell wrap, AuthStatusIcon + SVG,
   AuthTitle for the headline, oga-auth-actions for the CTA. */

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthShell,
  AuthTitle,
  AuthStatusIcon,
} from "../_shared/auth-shell";

type FailedCode =
  | "invitation_not_found"
  | "invitation_expired"
  | "invitation_revoked"
  | "invitation_already_accepted"
  | "email_mismatch"
  | "network";

type ViewState =
  | { kind: "loading" }
  | { kind: "no-token" }
  | { kind: "redirecting-to-signin" }
  | { kind: "accepting" }
  | { kind: "success"; orgName: string }
  | { kind: "failed"; code: FailedCode };

const FAILED_CODES: ReadonlySet<FailedCode> = new Set([
  "invitation_not_found",
  "invitation_expired",
  "invitation_revoked",
  "invitation_already_accepted",
  "email_mismatch",
  "network",
]);

function asFailedCode(value: unknown): FailedCode {
  return typeof value === "string" && FAILED_CODES.has(value as FailedCode)
    ? (value as FailedCode)
    : "network";
}

export default function AcceptInviteClient() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div />
        </AuthShell>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { data: session, status } = useSession();
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  const accept = useCallback(async () => {
    if (!token) return;
    setView({ kind: "accepting" });
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      if (res.status === 200) {
        const body = (await res.json()) as { org_name?: string };
        setView({ kind: "success", orgName: body.org_name ?? "your team" });
        setTimeout(() => router.push("/dashboard"), 1600);
        return;
      }
      if (res.status === 401) {
        const callback = encodeURIComponent(`/accept-invite?token=${token}`);
        router.push(`/sign-in?callbackUrl=${callback}`);
        return;
      }
      const body = (await res.json().catch(() => null)) as { code?: unknown } | null;
      setView({ kind: "failed", code: asFailedCode(body?.code) });
    } catch {
      setView({ kind: "failed", code: "network" });
    }
  }, [token, router]);

  /* The effect decides the next state once the session loads. It only
     setState's synchronously on terminal client-side branches (no-token,
     redirecting). The accept() call manages its own state transitions. */
  useEffect(() => {
    if (status === "loading") return;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView({ kind: "no-token" });
      return;
    }
    if (!session?.user) {
      setView({ kind: "redirecting-to-signin" });
      const callback = encodeURIComponent(`/accept-invite?token=${token}`);
      router.push(`/sign-in?callbackUrl=${callback}`);
      return;
    }
    /* accept() sets state inside its async body, not synchronously here. */
    accept();
  }, [status, session, token, accept, router]);

  return (
    <AuthShell>
      <div className="oga-auth-center">
        <ViewRenderer view={view} signedInEmail={session?.user?.email ?? null} />
      </div>
    </AuthShell>
  );
}

function ViewRenderer({
  view,
  signedInEmail,
}: {
  view: ViewState;
  signedInEmail: string | null;
}) {
  if (view.kind === "loading" || view.kind === "redirecting-to-signin") {
    return (
      <>
        <AuthStatusIcon tone="info">{spinnerSvg()}</AuthStatusIcon>
        <AuthTitle title="Checking your invitation…" />
      </>
    );
  }

  if (view.kind === "accepting") {
    return (
      <>
        <AuthStatusIcon tone="info">{spinnerSvg()}</AuthStatusIcon>
        <AuthTitle title="Joining your team…" />
      </>
    );
  }

  if (view.kind === "no-token") {
    return (
      <>
        <AuthStatusIcon tone="danger">{warningSvg()}</AuthStatusIcon>
        <AuthTitle
          title="This link is missing an invitation token."
          sub="Open the link from your email instead. If you typed the URL by hand, there's no way for us to look it up."
        />
        <div className="oga-auth-actions">
          <Link href="/dashboard" className="oga-auth-pill">
            Go to the dashboard <span aria-hidden>→</span>
          </Link>
        </div>
      </>
    );
  }

  if (view.kind === "success") {
    return (
      <>
        <AuthStatusIcon tone="success">{checkSvg()}</AuthStatusIcon>
        <AuthTitle
          title={`You've joined ${view.orgName}.`}
          sub="Redirecting you to the dashboard…"
        />
      </>
    );
  }

  return (
    <>
      <AuthStatusIcon tone="danger">{warningSvg()}</AuthStatusIcon>
      <AuthTitle title={titleFor(view.code)} sub={bodyFor(view.code, signedInEmail)} />
      <div className="oga-auth-actions">
        {view.code === "email_mismatch" ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: window.location.href })}
            className="oga-auth-pill"
          >
            Sign in with a different account <span aria-hidden>→</span>
          </button>
        ) : (
          <Link href="/dashboard" className="oga-auth-pill">
            Go to the dashboard <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </>
  );
}

function titleFor(code: FailedCode): string {
  switch (code) {
    case "invitation_not_found":
      return "This invitation link isn't valid.";
    case "invitation_expired":
      return "This invitation has expired.";
    case "invitation_revoked":
      return "This invitation was revoked.";
    case "invitation_already_accepted":
      return "This invitation was already accepted.";
    case "email_mismatch":
      return "This invitation is for a different email.";
    case "network":
      return "Something went wrong.";
  }
}

function bodyFor(code: FailedCode, signedInEmail: string | null): string {
  switch (code) {
    case "invitation_not_found":
      return "The link might be incomplete, or the invitation was revoked. Ask the person who invited you to send a new one.";
    case "invitation_expired":
      return "Invitations are valid for 7 days. Ask the person who invited you to send a fresh one.";
    case "invitation_revoked":
      return "The admin revoked this invitation. Ask them to send a new one if you still need access.";
    case "invitation_already_accepted":
      return "Someone already joined the org with this invitation. If that was you, the team is in your dashboard.";
    case "email_mismatch":
      return signedInEmail
        ? `You're signed in as ${signedInEmail}, but this invitation was sent to a different email. Sign out and back in with the right account.`
        : "Sign out and sign back in with the email this invitation was sent to.";
    case "network":
      return "We couldn't reach the server. Try again, or refresh the page.";
  }
}

function spinnerSvg() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity="0.25" />
      <path
        d="M21 12 A9 9 0 0 1 12 21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function checkSvg() {
  return (
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
  );
}

function warningSvg() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7 V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}
