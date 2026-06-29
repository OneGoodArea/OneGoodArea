"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard } from "../_shared/app-shell";
import { Modal } from "../_shared/dashboard/modal";
import "./api-usage.css";

/* /api-usage — Brand v3 rewrite (AR-204 close-out 6/15).

   API keys + monthly usage + daily bar chart + last-request time.
   Real endpoint preserved: /api/keys/usage.
   Non-API users redirected to /pricing.

   Per the dashboard proposal (PR #104), this page will gain per-key
   IP allowlist editor + per-key activity feed in a later extension.
   This PR is just the token migration + visual cleanup. */

type DailyData = { day: string; count: number };
type ApiKeyInfo = {
  id: string;
  key_preview: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  /* AR-385: per-key training-data opt-out flag. TRUE = the customer
     has opted out of training-data capture for this key. FALSE =
     default, queries may be used to improve OneGoodArea's AI. */
  training_optout: boolean;
};
type UsageData = {
  totalRequests: number;
  requestsThisMonth: number;
  monthlyLimit: number;
  dailyData: DailyData[];
  lastRequestAt: string | null;
  keys: ApiKeyInfo[];
};

export default function ApiUsageClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* AR-265: one-time-reveal for a newly created key. The full key
     comes back from POST /api/keys; subsequent reads only return
     the preview. Persisting it client-side until the user explicitly
     dismisses prevents the standard "I missed copying" trap. */
  const [newKey, setNewKey] = useState<string | null>(null);
  /* Create modal state. createName is the staged name input;
     creatingInFlight covers the brief window between submit and the
     fetched usage refresh. */
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("Default");
  const [creatingInFlight, setCreatingInFlight] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /* Revoke modal state. Carries the key the user clicked Revoke on,
     until they either confirm (DELETE) or cancel (clear state). */
  const [revokeTarget, setRevokeTarget] = useState<
    { id: string; preview: string } | null
  >(null);
  const [revokingInFlight, setRevokingInFlight] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  /* AR-289: per-org scoping. Read the active org from the same
     localStorage key the OrgSwitcher writes (oga-active-org-id). When
     set, pass ?org=<id> so the chart + stats restrict to that org.
     null / undefined → no param → lifetime user-wide totals (the
     previous behaviour, what solo users still see). */
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("oga-active-org-id");
  });

  const fetchUsage = useCallback(async () => {
    try {
      const url = activeOrgId
        ? `/api/keys/usage?org=${encodeURIComponent(activeOrgId)}`
        : "/api/keys/usage";
      const res = await fetch(url);
      if (res.status === 403) {
        // 403 from membership gate too — fall back to user-wide (drop the org param).
        if (activeOrgId) {
          setActiveOrgId(null);
          return; // useEffect will refetch
        }
        router.push("/pricing");
        return;
      }
      if (!res.ok) {
        setError("Failed to load usage data");
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router, activeOrgId]);

  /* AR-289: keep activeOrgId in sync when the user switches org.
     Two paths:
       - `storage` event fires from OTHER tabs (cross-tab sync).
       - `oga:active-org-changed` custom event fires from the
         OrgSwitcher on SAME-tab switch — dispatched alongside the
         localStorage.setItem in switchTo / onCreated. */
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "oga-active-org-id") {
        setActiveOrgId(e.newValue);
      }
    }
    function onSameTabSwitch(e: Event) {
      const detail = (e as CustomEvent<{ orgId?: string }>).detail;
      setActiveOrgId(detail?.orgId ?? null);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("oga:active-org-changed", onSameTabSwitch);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("oga:active-org-changed", onSameTabSwitch);
    };
  }, []);

  const openCreateModal = useCallback(() => {
    setCreateName("Default");
    setCreateError(null);
    setCreateOpen(true);
  }, []);

  const submitCreate = useCallback(async () => {
    const trimmed = createName.trim() || "Default";
    setCreatingInFlight(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setCreateError(body?.error ?? "Couldn't create key. Try again.");
        return;
      }
      const json = (await res.json()) as { key?: { key?: string } };
      const plaintext = json.key?.key;
      if (plaintext) setNewKey(plaintext);
      setCreateOpen(false);
      await fetchUsage();
    } catch {
      setCreateError("Network error creating key.");
    } finally {
      setCreatingInFlight(false);
    }
  }, [createName, fetchUsage]);

  const requestRevoke = useCallback((keyId: string, preview: string) => {
    setRevokeError(null);
    setRevokeTarget({ id: keyId, preview });
  }, []);

  const submitRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    setRevokingInFlight(true);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/keys/${revokeTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setRevokeError("Couldn't revoke the key. Try again.");
        return;
      }
      setRevokeTarget(null);
      await fetchUsage();
    } catch {
      setRevokeError("Network error revoking key.");
    } finally {
      setRevokingInFlight(false);
    }
  }, [revokeTarget, fetchUsage]);

  /* AR-385: per-key training-data opt-out toggle. Optimistic UI — flip
     immediately, refetch in the background, rollback on error. Live-
     applied, no save button. Takes effect on the next request from any
     client using this key. */
  const toggleTrainingOptout = useCallback(
    async (keyId: string, nextValue: boolean) => {
      // Optimistic: patch local state first.
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          keys: prev.keys.map((k) =>
            k.id === keyId ? { ...k, training_optout: nextValue } : k,
          ),
        };
      });
      try {
        const res = await fetch(`/api/keys/${keyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ training_optout: nextValue }),
        });
        if (!res.ok) {
          // Rollback on failure.
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              keys: prev.keys.map((k) =>
                k.id === keyId ? { ...k, training_optout: !nextValue } : k,
              ),
            };
          });
        }
      } catch {
        // Same rollback path for network errors.
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            keys: prev.keys.map((k) =>
              k.id === keyId ? { ...k, training_optout: !nextValue } : k,
            ),
          };
        });
      }
    },
    [],
  );

  useEffect(() => {
    // Valid: fetch usage on session change. setState calls happen inside
    // fetchUsage after the async fetch resolves, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.user) fetchUsage();
  }, [session, fetchUsage]);

  if (status === "loading") {
    return (
      <AppShell>
        <div className="oga-api-usage__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/api-usage");
    return null;
  }

  return (
    <AppShell>
      <div className="oga-api-usage">
        <header className="oga-api-usage__product">
          <span className="oga-api-usage__product-mark" aria-hidden>
            <UsageMark />
          </span>
          <div className="oga-api-usage__product-text">
            <span className="oga-api-usage__product-eyebrow">Account</span>
            <h2 className="oga-api-usage__product-title">API usage</h2>
            <p className="oga-api-usage__product-tagline">
              Monthly quota, daily traffic, and the keys your code calls with.
              Keys are SHA-256 hashed at rest — copy the full value when you
              create one, treat it like a password from then on.
            </p>
          </div>
        </header>

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : (
          data && (
            <Content
              data={data}
              newKey={newKey}
              onOpenCreate={openCreateModal}
              onRequestRevoke={requestRevoke}
              onDismissNewKey={() => setNewKey(null)}
              onToggleTrainingOptout={toggleTrainingOptout}
            />
          )
        )}
      </div>

      {/* AR-265: create-key modal. Light surface (this isn't destructive,
          just a name input). Pressing Enter inside the input submits. */}
      <Modal
        open={createOpen}
        onClose={() => (creatingInFlight ? null : setCreateOpen(false))}
        title="Create API key"
        size="sm"
        closeOnBackdrop={!creatingInFlight}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              disabled={creatingInFlight}
              className="oga-api-usage__modal-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitCreate}
              disabled={creatingInFlight}
              className="oga-api-usage__modal-primary"
            >
              {creatingInFlight ? "Creating…" : "Create key"}
            </button>
          </>
        }
      >
        <p className="oga-api-usage__modal-body">
          Name the key so you can tell it apart later. Use something like the
          environment or service it belongs to: <em>Production</em>,{" "}
          <em>Staging worker</em>, <em>Local dev</em>.
        </p>
        {/* AR-385: training-data disclosure at point of creation. Plain,
            neutral, no marketing fluff. Customer makes an informed choice
            here and can flip it anytime in the key list below. */}
        <p className="oga-api-usage__modal-body oga-api-usage__modal-body--meta">
          By default, queries made with this key may be used to improve
          OneGoodArea&apos;s AI. You can toggle this off anytime on this page
          (per-key &quot;Training&quot; switch). Read the full{" "}
          <a href="/legal/data-policy" target="_blank" rel="noopener">
            data policy
          </a>
          .
        </p>
        <label className="oga-api-usage__modal-field">
          <span className="oga-api-usage__modal-field-label">Key name</span>
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creatingInFlight) {
                e.preventDefault();
                submitCreate();
              }
            }}
            placeholder="Default"
            maxLength={100}
            autoFocus
            className="oga-api-usage__modal-input"
          />
        </label>
        {createError ? (
          <p className="oga-api-usage__modal-error" role="alert">
            {createError}
          </p>
        ) : null}
      </Modal>

      {/* AR-265: revoke confirmation modal. Dark surface to escalate
          the destructive moment; the surface change carries the
          weight, copy stays plain. */}
      <Modal
        open={revokeTarget !== null}
        onClose={() => (revokingInFlight ? null : setRevokeTarget(null))}
        title="Revoke API key"
        size="sm"
        surface="dark"
        closeOnBackdrop={false}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRevokeTarget(null)}
              disabled={revokingInFlight}
              className="oga-api-usage__modal-secondary oga-api-usage__modal-secondary--on-dark"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitRevoke}
              disabled={revokingInFlight}
              className="oga-api-usage__modal-danger"
            >
              {revokingInFlight ? "Revoking…" : "Revoke key"}
            </button>
          </>
        }
      >
        {revokeTarget ? (
          <>
            <p className="oga-api-usage__modal-body oga-api-usage__modal-body--on-dark">
              Anything calling{" "}
              <code className="oga-api-usage__modal-code">
                {revokeTarget.preview}
              </code>{" "}
              will start returning <strong>401 Unauthorized</strong> on the
              next request. This can&apos;t be undone.
            </p>
            <p className="oga-api-usage__modal-body oga-api-usage__modal-body--on-dark">
              Check the &quot;Used&quot; column on the keys list to confirm
              whether anything still depends on this key.
            </p>
            {revokeError ? (
              <p className="oga-api-usage__modal-error" role="alert">
                {revokeError}
              </p>
            ) : null}
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}

function Loading() {
  return (
    <div className="oga-api-usage__loading">
      <span aria-hidden className="oga-api-usage__loading-spinner" />
      Loading usage data
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-api-usage__error">{error}</div>;
}

/* AR-288 interactive daily chart.

   30 bars representing the last 30 days. Each bar is focusable
   (keyboard) + responds to hover; selecting one floats a tooltip
   above the bars with the full date + exact request count. The
   tooltip lives in the chart container (NOT positioned per-bar)
   so it sits above the bars without overflowing the card. */
function DailyChart({
  dailyData,
  maxDaily,
}: {
  dailyData: DailyData[];
  maxDaily: number;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx === null ? null : dailyData[activeIdx];
  const total = dailyData.reduce((s, d) => s + d.count, 0);

  return (
    <AppCard title="Last 30 days" note={`Peak · ${maxDaily} req · Total · ${total} req`}>
      <div className="oga-api-usage__chart-wrap">
        <div
          className="oga-api-usage__chart"
          onMouseLeave={() => setActiveIdx(null)}
        >
          {dailyData.map((d, i) => {
            const h = Math.max(
              (d.count / maxDaily) * 100,
              d.count === 0 ? 2 : 8,
            );
            const isActive = i === activeIdx;
            const baseClass = d.count === 0
              ? "oga-api-usage__bar oga-api-usage__bar--empty"
              : "oga-api-usage__bar";
            return (
              <button
                type="button"
                key={d.day}
                className={
                  isActive
                    ? `${baseClass} oga-api-usage__bar--active`
                    : baseClass
                }
                style={{ height: `${h}%` }}
                onMouseEnter={() => setActiveIdx(i)}
                onFocus={() => setActiveIdx(i)}
                onBlur={() => setActiveIdx(null)}
                aria-label={`${formatDay(d.day)} — ${d.count} request${d.count === 1 ? "" : "s"}`}
              />
            );
          })}
        </div>

        {active ? (
          <div
            className="oga-api-usage__tooltip"
            /* Position the tooltip horizontally over the active bar.
               activeIdx / (length - 1) gives a 0..1 progression; we
               clamp the centre so the tooltip doesn't overflow the
               left or right edges of the chart container. */
            style={{
              left: `${Math.min(
                Math.max((activeIdx! / Math.max(dailyData.length - 1, 1)) * 100, 8),
                92,
              )}%`,
            }}
          >
            <span className="oga-api-usage__tooltip-day">{formatDay(active.day)}</span>
            <span className="oga-api-usage__tooltip-count">
              {active.count.toLocaleString()} request{active.count === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </div>
      <div className="oga-api-usage__chart-axis">
        <span>{formatDay(dailyData[0]?.day || "")}</span>
        <span>today</span>
      </div>
    </AppCard>
  );
}

function Content({
  data,
  newKey,
  onOpenCreate,
  onRequestRevoke,
  onDismissNewKey,
  onToggleTrainingOptout,
}: {
  data: UsageData;
  newKey: string | null;
  onOpenCreate: () => void;
  onRequestRevoke: (keyId: string, preview: string) => void;
  onDismissNewKey: () => void;
  onToggleTrainingOptout: (keyId: string, nextValue: boolean) => void;
}) {
  const pct = Math.min((data.requestsThisMonth / data.monthlyLimit) * 100, 100);
  const tone: "strong" | "moderate" | "weak" =
    pct >= 90 ? "weak" : pct >= 70 ? "moderate" : "strong";
  const maxDaily = Math.max(...data.dailyData.map((d) => d.count), 1);

  return (
    <>
      {/* Quota headline */}
      <AppCard noPad>
        <div className="oga-api-usage__stats">
          <QuotaBlock
            label="This month"
            value={`${data.requestsThisMonth}`}
            divider={`/ ${data.monthlyLimit}`}
            tone={tone}
            pct={pct}
          />
          <SimpleBlock
            label="All-time requests"
            value={data.totalRequests.toLocaleString()}
          />
          <SimpleBlock label="Last request" value={formatTimestamp(data.lastRequestAt)} />
        </div>
      </AppCard>

      {/* Daily chart — interactive: hover/focus a bar to see the
          full date + exact count, keyboard accessible (each bar is
          a button-shaped focusable element). AR-288. */}
      <DailyChart dailyData={data.dailyData} maxDaily={maxDaily} />

      {/* Keys */}
      <AppCard
        title={`API keys · ${data.keys.length}`}
        noPad
      >
        <div className="oga-api-usage__keys-head">
          <p className="oga-api-usage__keys-blurb">
            Bearer tokens for the REST API. Use any one as
            <code className="oga-api-usage__inline-code">
              Authorization: Bearer ...
            </code>
            on /v1 calls. Keys are shown in full once at creation only.
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="oga-api-usage__create-btn"
          >
            + Create key
          </button>
        </div>

        {newKey ? (
          <NewKeyReveal value={newKey} onDismiss={onDismissNewKey} />
        ) : null}

        {data.keys.length === 0 ? (
          <div className="oga-api-usage__empty">
            No keys yet. Click <strong>+ Create key</strong> above to generate
            your first one.
          </div>
        ) : (
          <ul className="oga-api-usage__keys">
            {data.keys.map((k) => (
              <li key={k.id} className="oga-api-usage__key">
                <div className="oga-api-usage__key-left">
                  <code className="oga-api-usage__key-preview">{k.key_preview}</code>
                  <span className="oga-api-usage__key-name">{k.name}</span>
                </div>
                <div className="oga-api-usage__key-right">
                  <span className="oga-api-usage__key-meta">
                    {k.last_used_at
                      ? `Used ${formatTimestamp(k.last_used_at)}`
                      : "Never used"}
                  </span>
                  {/* AR-385: per-key training-capture toggle. Live-applied
                      via optimistic UI; effective on next request. Off = the
                      customer has opted out of their queries being used to
                      improve OneGoodArea's AI. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!k.training_optout}
                    onClick={() => onToggleTrainingOptout(k.id, !k.training_optout)}
                    className="oga-api-usage__training-toggle"
                    data-on={k.training_optout ? "false" : "true"}
                    title={
                      k.training_optout
                        ? "Training capture is OFF. Click to opt back in."
                        : "Training capture is ON. Click to opt out."
                    }
                  >
                    <span className="oga-api-usage__training-toggle-label">Training</span>
                    <span className="oga-api-usage__training-toggle-state">
                      {k.training_optout ? "OFF" : "ON"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestRevoke(k.id, k.key_preview)}
                    className="oga-api-usage__revoke-btn"
                    aria-label={`Revoke key ${k.key_preview}`}
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AppCard>

    </>
  );
}

function QuotaBlock({
  label,
  value,
  divider,
  tone,
  pct,
}: {
  label: string;
  value: string;
  divider: string;
  tone: "strong" | "moderate" | "weak";
  pct: number;
}) {
  return (
    <div className="oga-api-usage__block" data-tone={tone}>
      <div className="oga-api-usage__block-head">
        <span className="oga-api-usage__block-label">{label}</span>
        <span className="oga-api-usage__block-pct">{Math.round(pct)}%</span>
      </div>
      <div className="oga-api-usage__block-value-row">
        <span className="oga-api-usage__block-value">{value}</span>
        <span className="oga-api-usage__block-divider">{divider}</span>
      </div>
      <div className="oga-api-usage__block-bar">
        <div
          className="oga-api-usage__block-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SimpleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="oga-api-usage__block oga-api-usage__block--simple">
      <span className="oga-api-usage__block-label">{label}</span>
      <span className="oga-api-usage__block-simple-value">{value}</span>
    </div>
  );
}

/* AR-278: mark for the product-style header. Reuses the exact "api"
   path data from NavIconDark (the sidebar's API keys & usage glyph),
   scaled from 16x16 to 56x56 inside the 64x64 boxed mark so the
   sidebar item and the page header line up visually. */
function UsageMark() {
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
      <path d="M10 4 C7 4 7.5 8 7.5 11 C7.5 12.8 5.5 14 5.5 14 C5.5 14 7.5 15.2 7.5 17 C7.5 20 7 24 10 24" />
      <path d="M18 4 C21 4 20.5 8 20.5 11 C20.5 12.8 22.5 14 22.5 14 C22.5 14 20.5 15.2 20.5 17 C20.5 20 21 24 18 24" />
      <circle cx="14" cy="14" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(day: string): string {
  if (!day) return "";
  return new Date(day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/* AR-265: one-time reveal of the just-created key. Standard pattern:
   the plaintext value comes back exactly once from POST /api/keys, the
   user copies it, the panel dismisses, the row joins the regular keys
   list with only its prefix visible thereafter. No way to retrieve the
   plaintext again after dismiss. */
function NewKeyReveal({
  value,
  onDismiss,
}: {
  value: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="oga-api-usage__newkey" role="status">
      <div className="oga-api-usage__newkey-head">
        <span className="oga-api-usage__newkey-label">New key</span>
        <p className="oga-api-usage__newkey-hint">
          Copy this now. We hash it at rest, the full value won&apos;t be
          shown again. Treat it like a password.
        </p>
      </div>
      <div className="oga-api-usage__newkey-row">
        <code className="oga-api-usage__newkey-value">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="oga-api-usage__newkey-copy"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="oga-api-usage__newkey-dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
