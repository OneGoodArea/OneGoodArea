"use client";

/* AR-254: shared verify-email reminder banner.

   First lived inline on /welcome (AR-253). Lifted here so /dashboard
   Home uses the same surface the user sees the same dismissable
   nudge wherever they land while email_verified=FALSE. One copy,
   one resend action, one design.

   Session-scoped dismiss: hiding the banner with × hides it for this
   render only. Navigating back shows it again until the user actually
   verifies. Intentional the underlying state (email_verified) is
   the real toggle, not local UI sentiment. */

import { useState } from "react";

interface VerifyBannerProps {
  email: string;
  /** Defaults to /api/auth/resend-verification (existing endpoint).
      Override only if the consumer needs a different rate-limit or
      audit channel. */
  resendEndpoint?: string;
}

export default function VerifyBanner({
  email,
  resendEndpoint = "/api/auth/resend-verification",
}: VerifyBannerProps) {
  const [open, setOpen] = useState(true);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (!open) return null;

  async function handleResend() {
    if (resending || resent) return;
    setResending(true);
    try {
      await fetch(resendEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
    } catch {
      /* Silent fail banner stays in "Resend" state so user can retry. */
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="oga-verify-banner" role="status">
      <div className="oga-verify-banner__body">
        <strong>Verify your email to make API calls.</strong>
        <span>
          We sent a link to <code>{email}</code>. Verifying isn&apos;t required
          to explore. It unlocks writes.
        </span>
      </div>
      <div className="oga-verify-banner__actions">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resent}
          className="oga-verify-banner__link"
        >
          {resending ? "Sending…" : resent ? "Resent ✓" : "Resend"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Dismiss"
          className="oga-verify-banner__dismiss"
        >
          ×
        </button>
      </div>
      <style>{`
        .oga-verify-banner {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: var(--oga-bg-warm, #FAF8F4);
          border: 1px solid var(--oga-ink-10);
          border-left: 2px solid #b07d3a;
          border-radius: 3px;
          font-size: 13.5px;
          line-height: 1.45;
          color: var(--oga-fg);
          margin-bottom: 24px;
        }
        .oga-verify-banner__body {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1 1 auto;
          min-width: 0;
        }
        .oga-verify-banner__body strong {
          font-weight: 600;
          color: var(--oga-ink);
        }
        .oga-verify-banner__body code {
          font-family: var(--oga-font-mono);
          font-size: 12.5px;
          background: rgba(26, 28, 31, 0.05);
          padding: 1px 5px;
          border-radius: 2px;
        }
        .oga-verify-banner__actions {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          flex: 0 0 auto;
        }
        .oga-verify-banner__link {
          appearance: none;
          background: transparent;
          border: none;
          padding: 4px 6px;
          font-family: var(--oga-font-mono);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--oga-ink);
          cursor: pointer;
          border-radius: 2px;
          transition: background 120ms ease;
        }
        .oga-verify-banner__link:hover:not(:disabled) {
          background: rgba(26, 28, 31, 0.06);
        }
        .oga-verify-banner__link:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .oga-verify-banner__dismiss {
          appearance: none;
          background: transparent;
          border: none;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          font-size: 18px;
          line-height: 1;
          color: var(--oga-ink-50);
          cursor: pointer;
          border-radius: 2px;
          transition: color 120ms ease, background 120ms ease;
        }
        .oga-verify-banner__dismiss:hover {
          color: var(--oga-ink);
          background: rgba(26, 28, 31, 0.06);
        }
      `}</style>
    </div>
  );
}
