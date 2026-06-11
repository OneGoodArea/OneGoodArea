"use client";

import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AppShell, AppCard, GhostCta } from "../_shared/app-shell";
import "./settings.css";

/* /settings — AR-279 polish + post-restructure content audit.

   Pre-AR-279 the page mixed account-level concerns (name, email,
   password, delete) with subscription mgmt (plan name, Stripe
   portal, cancel). After the signal-first restructure and the
   Phase 3 Levers UI, subscription mgmt belongs to the upcoming
   /dashboard/billing surface (AR-280). This page is now strictly
   ACCOUNT-LEVEL: who you are, how you authenticate, and how you
   leave. Subscription card becomes a thin summary that links out
   to /dashboard/billing for the real mgmt actions.

   Endpoints preserved untouched:
     /api/settings/password         change password
     /api/settings/subscription     read summary (plan + cancelAt)
     /api/settings/delete-account   delete account */

type Subscription = {
  plan: string;
  planName: string;
  hasStripeSubscription: boolean;
  cancelAt: string | null;
};

export default function SettingsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/subscription");
      if (res.ok) setSubscription(await res.json());
    } catch {
      /* swallow */
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    // Valid: fetch subscription on session change. setState calls
    // happen inside fetchSubscription after the async fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.user) fetchSubscription();
  }, [session, fetchSubscription]);

  if (status === "loading") {
    return (
      <AppShell>
        <div className="oga-settings__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/settings");
    return null;
  }

  return (
    <AppShell>
      <div className="oga-settings">
        <header className="oga-settings__product">
          <span className="oga-settings__product-mark" aria-hidden>
            <SettingsMark />
          </span>
          <div className="oga-settings__product-text">
            <span className="oga-settings__product-eyebrow">Account</span>
            <h2 className="oga-settings__product-title">Settings</h2>
            <p className="oga-settings__product-tagline">
              Who you are, how you authenticate, and how you leave. For
              subscription mgmt + invoices use{" "}
              <Link href="/dashboard/billing" className="oga-settings__inline-link">
                Billing
              </Link>
              . For team mgmt use{" "}
              <Link href="/dashboard/org/members" className="oga-settings__inline-link">
                Team members
              </Link>
              .
            </p>
          </div>
        </header>

        <AccountInfo
          name={session.user.name || null}
          email={session.user.email || null}
        />
        <SubscriptionSummary sub={subscription} loading={subLoading} />
        <PasswordChange />
        <DangerZone />
      </div>
    </AppShell>
  );
}

/* AR-279: mark for the product-style header. Reuses the exact "key"
   path data from NavIconDark (the sidebar's Settings glyph: a key
   silhouette), scaled from 16x16 to 56x56 inside the 64x64 boxed
   mark so the sidebar item and the page header line up visually. */
function SettingsMark() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="11" r="4" />
      <circle cx="9" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <path d="M13 11 L23 11" />
      <path d="M20 11 L20 13.5" />
      <path d="M17 11 L17 13" />
    </svg>
  );
}

/* ============================================================
   Account info
   ============================================================ */
function AccountInfo({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const initial = (name || email || "?").slice(0, 1).toUpperCase();
  return (
    <AppCard title="Account">
      <div className="oga-settings__account">
        <div aria-hidden className="oga-settings__avatar">
          {initial}
        </div>
        <div className="oga-settings__account-text">
          {name && <div className="oga-settings__account-name">{name}</div>}
          {email && <div className="oga-settings__account-email">{email}</div>}
        </div>
      </div>
    </AppCard>
  );
}

/* ============================================================
   Subscription summary (thin — real mgmt lives in /dashboard/billing)
   ============================================================ */
function SubscriptionSummary({
  sub,
  loading,
}: {
  sub: Subscription | null;
  loading: boolean;
}) {
  const planName = sub?.planName || "Sandbox";
  const cancelsAt = sub?.cancelAt
    ? new Date(sub.cancelAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <AppCard title="Plan">
      {loading ? (
        <LoadingRow label="Loading plan…" />
      ) : (
        <div className="oga-settings__sub-row">
          <div>
            <div className="oga-settings__sub-plan">{planName}</div>
            {cancelsAt ? (
              <div className="oga-settings__sub-cancels">
                Cancels on {cancelsAt}
              </div>
            ) : (
              <div className="oga-settings__sub-cancels">
                Current plan.
              </div>
            )}
          </div>
          <div className="oga-settings__sub-actions">
            <GhostCta href="/dashboard/billing">Manage in Billing</GhostCta>
          </div>
        </div>
      )}
    </AppCard>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="oga-settings__loading">
      <span aria-hidden className="oga-settings__loading-spinner" />
      {label}
    </div>
  );
}

/* ============================================================
   Password change
   ============================================================ */
function PasswordChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirmPw) {
      setError("New passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirmPw("");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard title="Change password">
      <form onSubmit={submit} noValidate>
        <SettingsField label="Current password">
          <SettingsInput
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
        </SettingsField>
        <SettingsField label="New password">
          <SettingsInput
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </SettingsField>
        <SettingsField label="Confirm new password">
          <SettingsInput
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </SettingsField>
        <div className="oga-settings__hint">Minimum 8 characters</div>

        {error && (
          <div className="oga-settings__alert oga-settings__alert--danger oga-settings__alert--inline">
            {error}
          </div>
        )}
        {success && (
          <div className="oga-settings__alert oga-settings__alert--success oga-settings__alert--inline">
            Password updated.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="oga-app-cta oga-app-cta--primary oga-settings__submit"
        >
          {loading ? "Updating…" : "Update password"}
          {!loading && <span aria-hidden>→</span>}
        </button>
      </form>
    </AppCard>
  );
}

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="oga-settings__field">
      <label className="oga-settings__field-label">{label}</label>
      {children}
    </div>
  );
}

function SettingsInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="oga-settings__input" />;
}

/* ============================================================
   Danger zone
   ============================================================ */
function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/settings/delete-account", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete account");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="oga-settings__danger">
      <div className="oga-settings__danger-head">
        <span aria-hidden className="oga-settings__danger-dot" />
        Danger zone
      </div>
      <div className="oga-settings__danger-body">
        <div className="oga-settings__danger-title">Delete your account</div>
        <p className="oga-settings__danger-text">
          Deletes your account, API keys, monitored portfolios, saved bundles,
          presets, cohorts, and your membership in any organisation. Cannot
          be undone. Your Stripe subscription is cancelled separately via{" "}
          <Link href="/dashboard/billing" className="oga-settings__inline-link">
            Billing
          </Link>
          .
        </p>
        {!showConfirm ? (
          <GhostCta onClick={() => setShowConfirm(true)} danger>
            Delete account
          </GhostCta>
        ) : (
          <div>
            <div className="oga-settings__danger-confirm">
              Type{" "}
              <strong className="oga-settings__danger-token">DELETE</strong> to
              confirm.
            </div>
            <SettingsInput
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            {error && (
              <div className="oga-settings__alert-error oga-settings__danger-error">
                {error}
              </div>
            )}
            <div className="oga-settings__danger-actions">
              <GhostCta
                onClick={deleteAccount}
                danger
              >
                {loading ? "Deleting…" : "Yes, delete my account"}
              </GhostCta>
              <GhostCta
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText("");
                }}
              >
                Cancel
              </GhostCta>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
