"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Styles } from "../_shared/styles";
import { AppShell, AppCard, PrimaryCta, GhostCta } from "../_shared/app-shell";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /settings
   Account info, password change, subscription, delete account.
   All real endpoints preserved: /api/settings/password,
   /api/settings/subscription, /api/settings/delete-account,
   /api/stripe/cancel, /api/stripe/portal.
   ═══════════════════════════════════════════════════════════════ */

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
    } catch {}
    finally { setSubLoading(false); }
  }, []);

  useEffect(() => {
    if (session?.user) fetchSubscription();
  }, [session, fetchSubscription]);

  if (status === "loading") {
    return (
      <>
        <Styles />
        <AppShell title="Settings"><div style={{ padding: 40 }} /></AppShell>
      </>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/settings");
    return null;
  }

  return (
    <>
      <Styles />
      <AppShell title="Settings" subtitle="Account, password, subscription, data.">
        <div style={{
          padding: "28px 40px 64px",
          display: "flex", flexDirection: "column", gap: 22,
          maxWidth: 820,
        }}>
          <AccountInfo name={session.user.name || null} email={session.user.email || null} />
          <Subscription sub={subscription} loading={subLoading} onRefresh={fetchSubscription} />
          <PasswordChange />
          <DangerZone />
        </div>
      </AppShell>
    </>
  );
}

/* ─────── Account info ─────── */

function AccountInfo({ name, email }: { name: string | null; email: string | null }) {
  const initial = (name || email || "?").slice(0, 1).toUpperCase();
  return (
    <AppCard title="Account">
      <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div aria-hidden style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "var(--signal-dim)",
          border: "1px solid var(--ink-deep)",
          color: "var(--ink-deep)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--display)", fontSize: 24, fontWeight: 500,
          flexShrink: 0,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {name && (
            <div style={{
              fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
              letterSpacing: "-0.012em", color: "var(--ink-deep)",
              marginBottom: 4,
            }}>{name}</div>
          )}
          {email && (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
              letterSpacing: "0.02em",
              color: "var(--text-2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{email}</div>
          )}
        </div>
      </div>
    </AppCard>
  );
}

/* ─────── Subscription ─────── */

function Subscription({ sub, loading, onRefresh }: {
  sub: Subscription | null; loading: boolean; onRefresh: () => Promise<void>;
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
    } finally { setPortalLoading(false); }
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
    } catch { setCancelError("Something went wrong"); }
    finally { setCancelLoading(false); }
  }

  const planName = sub?.planName || "Free";
  const isFree = !sub || sub.plan === "free";
  const cancelsAt = sub?.cancelAt ? new Date(sub.cancelAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <AppCard title="Subscription">
      {loading ? (
        <LoadingRow label="Loading subscription…" />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{
                fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
                letterSpacing: "-0.014em", color: "var(--ink-deep)",
                lineHeight: 1.2,
              }}>{planName}</div>
              {cancelsAt && (
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                  letterSpacing: "0.12em",
                  color: "#A01B00", marginTop: 6,
                }}>Cancels on {cancelsAt}</div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {isFree ? (
                <PrimaryCta href="/pricing">Upgrade plan</PrimaryCta>
              ) : (
                <>
                  <GhostCta onClick={openPortal}>
                    {portalLoading ? "Opening…" : "Manage billing"}
                  </GhostCta>
                  {!sub?.cancelAt && sub?.hasStripeSubscription && (
                    <GhostCta onClick={() => setShowConfirm(true)} danger>Cancel</GhostCta>
                  )}
                </>
              )}
            </div>
          </div>

          {showConfirm && (
            <div style={{
              marginTop: 18,
              padding: "14px 18px",
              background: "rgba(239,68,68,0.05)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 4,
            }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
                color: "#A01B00", marginBottom: 6,
              }}>Cancel your subscription?</div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 13.5,
                color: "var(--text-2)", lineHeight: 1.55,
                margin: "0 0 14px", maxWidth: "62ch",
              }}>
                You&apos;ll keep access to the Service until the end of your current billing period. No more charges after that.
              </p>
              {cancelError && (
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 12,
                  color: "#A01B00", marginBottom: 12,
                }}>{cancelError}</div>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <GhostCta onClick={cancel} danger>
                  {cancelLoading ? "Cancelling…" : "Yes, cancel"}
                </GhostCta>
                <GhostCta onClick={() => setShowConfirm(false)}>Keep subscription</GhostCta>
              </div>
            </div>
          )}

          {cancelSuccess && (
            <div style={{
              marginTop: 18,
              padding: "12px 18px",
              background: "var(--signal-dim)",
              border: "1px solid var(--ink-deep)",
              borderRadius: 4,
              fontFamily: "var(--sans)", fontSize: 13.5,
              color: "var(--ink-deep)",
            }}>
              Subscription cancelled. You&apos;ll keep access until your billing period ends.
            </div>
          )}
        </>
      )}
    </AppCard>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
      letterSpacing: "0.14em", color: "var(--text-3)",
      display: "inline-flex", alignItems: "center", gap: 10,
    }}>
      <span aria-hidden style={{
        width: 14, height: 14, borderRadius: "50%",
        border: "1.6px solid currentColor", borderTopColor: "transparent",
        display: "inline-block", animation: "aiq-spin 800ms linear infinite",
      }} />
      {label}
    </div>
  );
}

/* ─────── Password change ─────── */

function PasswordChange() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirmPw) return setError("New passwords don't match.");

    setLoading(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to change password"); return; }
      setSuccess(true);
      setCurrent(""); setNext(""); setConfirmPw("");
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <AppCard title="Change password">
      <form onSubmit={submit} noValidate>
        <SettingsField label="Current password">
          <SettingsInput type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </SettingsField>
        <SettingsField label="New password">
          <SettingsInput type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
        </SettingsField>
        <SettingsField label="Confirm new password">
          <SettingsInput type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required minLength={8} autoComplete="new-password" />
        </SettingsField>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--text-3)", marginTop: -6, marginBottom: 14,
        }}>Minimum 8 characters</div>

        {error && (
          <div style={{
            fontFamily: "var(--mono)", fontSize: 12,
            color: "#A01B00", background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.25)",
            padding: "10px 14px", borderRadius: 4, marginBottom: 14,
          }}>{error}</div>
        )}
        {success && (
          <div style={{
            fontFamily: "var(--sans)", fontSize: 13.5,
            color: "var(--ink-deep)",
            background: "var(--signal-dim)",
            border: "1px solid var(--ink-deep)",
            padding: "10px 14px", borderRadius: 4, marginBottom: 14,
          }}>Password updated.</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "10px 18px", borderRadius: 999,
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 9,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
          }}
          onMouseEnter={(e) => {
            if (loading) return;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 14px rgba(6,42,30,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {loading ? "Updating…" : "Update password"}
          {!loading && <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>}
        </button>
      </form>
    </AppCard>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", marginBottom: 6,
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-2)",
      }}>{label}</label>
      {children}
    </div>
  );
}

function SettingsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width: "100%", height: 42,
        padding: "0 14px",
        fontFamily: "var(--sans)", fontSize: 14,
        color: "var(--ink-deep)", background: "var(--bg)",
        border: `1px solid ${focused ? "var(--ink)" : "var(--border)"}`,
        borderRadius: 4, outline: "none",
        transition: "border-color 140ms, box-shadow 140ms",
        boxShadow: focused ? "0 0 0 3px rgba(212,243,58,0.22)" : "none",
      }}
    />
  );
}

/* ─────── Danger zone ─────── */

function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/settings/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete account");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <div style={{
      border: "1px solid rgba(239,68,68,0.35)",
      borderRadius: 4, background: "var(--bg)",
    }}>
      <div style={{
        padding: "14px 22px",
        borderBottom: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.05)",
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "#A01B00",
        display: "inline-flex", alignItems: "center", gap: 9,
        width: "100%", boxSizing: "border-box",
      }}>
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: "#D13A1E" }} />
        Danger zone
      </div>
      <div style={{ padding: "22px 24px" }}>
        <div style={{
          fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
          letterSpacing: "-0.012em", color: "var(--ink-deep)",
          marginBottom: 8,
        }}>Delete your account</div>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
          color: "var(--text-2)", lineHeight: 1.55,
          margin: "0 0 18px", maxWidth: "64ch",
        }}>
          Deletes your account, reports, watchlist, and API keys. Cannot be undone. Your Stripe subscription is cancelled separately via the billing portal.
        </p>
        {!showConfirm ? (
          <GhostCta onClick={() => setShowConfirm(true)} danger>Delete account</GhostCta>
        ) : (
          <div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 13.5,
              color: "var(--text-2)", marginBottom: 10,
            }}>
              Type <strong style={{ color: "#A01B00", fontFamily: "var(--mono)" }}>DELETE</strong> to confirm.
            </div>
            <SettingsInput
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            {error && (
              <div style={{
                fontFamily: "var(--mono)", fontSize: 12,
                color: "#A01B00", marginTop: 12,
              }}>{error}</div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <GhostCta onClick={deleteAccount} danger>
                {loading ? "Deleting…" : "Yes, delete my account"}
              </GhostCta>
              <GhostCta onClick={() => { setShowConfirm(false); setConfirmText(""); }}>Cancel</GhostCta>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
