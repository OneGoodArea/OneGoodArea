"use client";

import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AppShell, AppCard, PrimaryCta, GhostCta } from "../_shared/app-shell";
import "./settings.css";

/* /settings — Brand v3 rewrite (AR-204 close-out 7/15).

   Account info, password change, subscription, delete account.
   All real endpoints preserved: /api/settings/password,
   /api/settings/subscription, /api/settings/delete-account,
   /api/stripe/cancel, /api/stripe/portal.

   Per the dashboard proposal (PR #104), this page will later gain
   an "Org membership" row showing the user's orgs + role in each.
   This PR is just the token migration + visual cleanup. */

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
      <AppShell title="Settings">
        <div className="oga-settings__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/settings");
    return null;
  }

  return (
    <AppShell title="Settings" subtitle="Account, password, subscription, data.">
      <div className="oga-settings">
        <AccountInfo
          name={session.user.name || null}
          email={session.user.email || null}
        />
        <Subscription
          sub={subscription}
          loading={subLoading}
          onRefresh={fetchSubscription}
        />
        <PasswordChange />
        <DangerZone />
      </div>
    </AppShell>
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
   Subscription
   ============================================================ */
function Subscription({
  sub,
  loading,
  onRefresh,
}: {
  sub: Subscription | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  async function cancel() {
    setCancelError(null);
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || "Failed to cancel subscription");
        return;
      }
      setCancelSuccess(true);
      setShowConfirm(false);
      await onRefresh();
    } catch {
      setCancelError("Something went wrong");
    } finally {
      setCancelLoading(false);
    }
  }

  const planName = sub?.planName || "Free";
  const isFree = !sub || sub.plan === "free";
  const cancelsAt = sub?.cancelAt
    ? new Date(sub.cancelAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <AppCard title="Subscription">
      {loading ? (
        <LoadingRow label="Loading subscription…" />
      ) : (
        <>
          <div className="oga-settings__sub-row">
            <div>
              <div className="oga-settings__sub-plan">{planName}</div>
              {cancelsAt && (
                <div className="oga-settings__sub-cancels">
                  Cancels on {cancelsAt}
                </div>
              )}
            </div>
            <div className="oga-settings__sub-actions">
              {isFree ? (
                <PrimaryCta href="/pricing">Upgrade plan</PrimaryCta>
              ) : (
                <>
                  <GhostCta onClick={openPortal}>
                    {portalLoading ? "Opening…" : "Manage billing"}
                  </GhostCta>
                  {!sub?.cancelAt && sub?.hasStripeSubscription && (
                    <GhostCta onClick={() => setShowConfirm(true)} danger>
                      Cancel
                    </GhostCta>
                  )}
                </>
              )}
            </div>
          </div>

          {showConfirm && (
            <div className="oga-settings__alert oga-settings__alert--danger">
              <div className="oga-settings__alert-title">
                Cancel your subscription?
              </div>
              <p className="oga-settings__alert-body">
                You&rsquo;ll keep access to the Service until the end of your
                current billing period. No more charges after that.
              </p>
              {cancelError && (
                <div className="oga-settings__alert-error">{cancelError}</div>
              )}
              <div className="oga-settings__alert-actions">
                <GhostCta onClick={cancel} danger>
                  {cancelLoading ? "Cancelling…" : "Yes, cancel"}
                </GhostCta>
                <GhostCta onClick={() => setShowConfirm(false)}>
                  Keep subscription
                </GhostCta>
              </div>
            </div>
          )}

          {cancelSuccess && (
            <div className="oga-settings__alert oga-settings__alert--success">
              Subscription cancelled. You&rsquo;ll keep access until your
              billing period ends.
            </div>
          )}
        </>
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
          Deletes your account, reports, monitored postcodes, and API keys.
          Cannot be undone. Your Stripe subscription is cancelled separately
          via the billing portal.
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
