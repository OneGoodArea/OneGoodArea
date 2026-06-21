"use client";

/* AR-250 [AR-248-B] /auth/magic-link client.

   Runs once on mount: pulls ?token from the URL, fires
   signIn("magic-link", { token }) via NextAuth, and either redirects
   to /dashboard on success or shows a failure state. Visual recipe
   mirrors the existing /verify client — same AuthShell, same
   AuthStatusIcon + AuthTitle primitives. */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthShell,
  AuthTitle,
  AuthStatusIcon,
} from "../_shared/auth-shell";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export default function MagicLinkClient() {
  return (
    <Suspense
      fallback={
        <AuthShell>
          <div />
        </AuthShell>
      }
    >
      <MagicLinkInner />
    </Suspense>
  );
}

type ViewState = "signing-in" | "failure";

function MagicLinkInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

  /* Initial state reflects whether a token is present in the URL.
     Avoids the react-hooks/set-state-in-effect lint by sidestepping
     the need to flip "signing-in" -> "failure" on the no-token path
     inside the effect — same constraint pattern we used on AR-247's
     DropdownMenu portal effect. */
  const [view, setView] = useState<ViewState>(
    token ? "signing-in" : "failure",
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await signIn("magic-link", {
          token,
          redirect: false,
        });
        if (cancelled) return;
        if (result?.error || result?.ok === false) {
          setView("failure");
          return;
        }
        /* Success — router push and refresh so the session populates
           before the new page renders. */
        router.push(callbackUrl);
        router.refresh();
      } catch {
        if (!cancelled) setView("failure");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, callbackUrl, router]);

  if (view === "failure") {
    return (
      <AuthShell>
        <div className="oga-auth-center">
          <AuthStatusIcon tone="danger">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M12 7 V13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16.5" r="1" fill="currentColor" />
            </svg>
          </AuthStatusIcon>
          <AuthTitle
            title="Link expired or invalid."
            sub="This sign-in link has expired, has already been used, or is invalid. Request a fresh one from the sign-in page."
          />
          <div className="oga-auth-actions">
            <Link href="/get-started" className="oga-auth-pill">
              Request a new link
              <span aria-hidden>→</span>
            </Link>
            <a
              href="mailto:operation@onegoodarea.co.uk?subject=Magic%20link%20help"
              className="oga-auth-pill oga-auth-pill--ghost"
            >
              Contact support
            </a>
          </div>
        </div>
      </AuthShell>
    );
  }

  /* "signing-in" — short-lived state. AuthStatusIcon with spinner-ish
     graphic. We don't render a separate spinner primitive; the loading
     glyph + copy is enough at this scale. */
  return (
    <AuthShell>
      <div className="oga-auth-center">
        <AuthStatusIcon tone="info">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="1.6"
            />
            <path
              d="M21 12 A9 9 0 0 0 12 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </AuthStatusIcon>
        <AuthTitle
          title="Signing you in."
          sub="One moment — verifying your link and bringing you into your dashboard."
        />
      </div>
    </AuthShell>
  );
}
