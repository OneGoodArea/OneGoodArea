"use client";

/* AR-251 [AR-248-C] /welcome — minimal one-step onboarding.

   Pedro 2026-06-09 final decision: intent picker dropped. The
   product is the API + MCP; the dashboard is admin/maintenance.
   Picking workflow at signup doesn't change anything in their actual
   product experience (they specify preset per /v1/score call) — it
   only generates analytics for us at the cost of friction for them.

   Onboarding therefore is:
   - Company name (becomes workspace via /v1/orgs)
   - Submit -> /dashboard

   That's the whole flow. Intent capture can happen passively from
   first-call preset usage OR via a dismissible dashboard nudge later.

   Session email comes from the server component (page.tsx) so we
   don't need useSession + SessionProvider in this tree. */

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  AuthShell,
  AuthTitle,
  FormField,
  AuthInput,
  AuthError,
} from "../_shared/auth-shell";
import "./welcome.css";

interface WelcomeClientProps {
  /** Email from the server-side session; null if the user isn't
      signed in (preview / unauthed direct visit). */
  initialEmail: string | null;
  /** users.email_verified at page render. When false we show a
      dismissable banner reminding the user to verify so they can
      unlock writes. Defaults to true on the unauthed preview path
      so we never show the nudge when we don't know the user. */
  initialEmailVerified: boolean;
}

export default function WelcomeClient({
  initialEmail,
  initialEmailVerified,
}: WelcomeClientProps) {
  const router = useRouter();

  const [userTypedCompany, setUserTypedCompany] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [verifyBannerOpen, setVerifyBannerOpen] = useState(
    !initialEmailVerified,
  );
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResendVerification() {
    if (resending || resent || !initialEmail) return;
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: initialEmail }),
      });
      setResent(true);
    } catch {
      /* Silent fail — banner stays in "Resend" state so user can retry. */
    } finally {
      setResending(false);
    }
  }

  const defaultCompanyName = useMemo(() => {
    /* Auto-org seed: capitalised email local-part if we have one,
       otherwise "Untitled workspace". Always editable in the input;
       backend has its own fallback if the user blanks it out. */
    const local = initialEmail?.split("@")[0];
    if (local) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return "Untitled workspace";
  }, [initialEmail]);

  const companyName = userTypedCompany ?? defaultCompanyName;

  async function handleFinish() {
    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          /* intents intentionally omitted — picker retired in
             AR-251 final. Endpoint already treats it as optional. */
          workspace_name: companyName.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(
          data.error ||
            "We couldn't save your setup. Try again, or contact support.",
        );
        setSubmitting(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setSubmitError("Network error saving your setup. Retry shortly.");
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleFinish();
  }

  return (
    <AuthShell>
      <div className="oga-welcome">
        <header className="oga-welcome__header">
          <span className="oga-welcome__brand-eyebrow">
            <span className="oga-welcome__brand-dot" aria-hidden />
            Welcome
          </span>
          <button
            type="button"
            className="oga-welcome__skip"
            onClick={handleFinish}
            disabled={submitting}
          >
            Skip for now
          </button>
        </header>

        {verifyBannerOpen && initialEmail ? (
          <div className="oga-welcome__verify-banner" role="status">
            <div className="oga-welcome__verify-banner-body">
              <strong>Verify your email to make API calls.</strong>
              <span>
                We sent a link to <code>{initialEmail}</code>. Verifying isn
                &apos;t required to explore — it unlocks writes.
              </span>
            </div>
            <div className="oga-welcome__verify-banner-actions">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending || resent}
                className="oga-welcome__verify-banner-link"
              >
                {resending ? "Sending…" : resent ? "Resent ✓" : "Resend"}
              </button>
              <button
                type="button"
                onClick={() => setVerifyBannerOpen(false)}
                aria-label="Dismiss"
                className="oga-welcome__verify-banner-dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="oga-welcome__step-wrap">
            <AuthTitle
              eyebrow="One quick thing"
              title="Name your workspace."
              sub="This becomes your organisation in OneGoodArea — where your API keys, portfolios, scoring presets, and signal bundles live. You can rename it any time."
            />

            <FormField label="Company name">
              <AuthInput
                type="text"
                value={companyName}
                onChange={(e) => setUserTypedCompany(e.target.value)}
                placeholder="Acme Property Holdings"
                autoComplete="organization"
                required
                autoFocus
              />
            </FormField>
          </div>

          {submitError ? <AuthError>{submitError}</AuthError> : null}

          <div className="oga-welcome__actions">
            <span />
            <button
              type="submit"
              className="oga-btn oga-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Finishing…" : "Open dashboard"}
              <span aria-hidden>→</span>
            </button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
