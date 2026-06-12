"use client";

/* AR-281 /dashboard/webhooks.

   Outbound webhook subscriptions. Each subscription points at one of
   YOUR HTTPS endpoints + a non-empty list of event types. Deliveries
   are signed with HMAC-SHA256 (Stripe-style "t=<unix>.<body>") using
   a per-subscription secret. The secret is returned ONCE on create
   and never recoverable after the reveal panel is dismissed — same
   pattern as API keys.

   This is the MVP on top of the existing apps/api contract (POST/
   GET/DELETE /v1/webhooks). Rotate-secret, replay-failed, and per-
   subscription delivery log are filed as follow-up tickets. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard } from "../_shared/app-shell";
import { Modal } from "../_shared/dashboard/modal";
import { WebhookIcon } from "../_shared/dashboard/nav-icons";
import "./client.css";

const SUPPORTED_EVENTS = [
  { id: "report.created",  label: "Report created",  blurb: "An AI-narrated area report finished generation." },
  { id: "score.changed",   label: "Score changed",   blurb: "A monitored postcode's composite score moved past your threshold." },
  { id: "signal.changed",  label: "Signal changed",  blurb: "An individual signal value crossed a material change threshold." },
] as const;
type WebhookEventType = (typeof SUPPORTED_EVENTS)[number]["id"];

interface Subscription {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  status: string;
  created_at: string;
  last_success_at: string | null;
  last_failure_at: string | null;
}

export default function WebhooksClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Subscription | null>(null);
  const [newSecret, setNewSecret] = useState<{ secret: string; subscription: Subscription } | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/me/webhooks");
      if (!res.ok) {
        setError("Couldn't load webhooks.");
        return;
      }
      const json = (await res.json()) as { subscriptions: Subscription[] };
      setSubscriptions(json.subscriptions);
      setError(null);
    } catch {
      setError("Network error loading webhooks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.user) reload();
  }, [session, reload]);

  if (status === "loading") {
    return (
      <AppShell>
        <div className="oga-wh__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/dashboard/webhooks");
    return null;
  }

  return (
    <AppShell>
      <div className="oga-wh">
        <header className="oga-wh__product">
          <span className="oga-wh__product-mark" aria-hidden>
            <WebhookIcon width={56} height={56} />
          </span>
          <div className="oga-wh__product-text">
            <span className="oga-wh__product-eyebrow">Account</span>
            <h2 className="oga-wh__product-title">Webhooks</h2>
            <p className="oga-wh__product-tagline">
              Subscribe your own HTTPS endpoints to area-quality events.
              Every delivery is signed with HMAC-SHA256 using a per-
              subscription secret you verify on receipt. Failures retry
              with exponential backoff.
            </p>
          </div>
        </header>

        <HowItWorks />

        <div className="oga-wh__toolbar">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="oga-wh__primary-btn"
          >
            + Add webhook
          </button>
        </div>

        {newSecret ? (
          <SecretReveal
            secret={newSecret.secret}
            subscription={newSecret.subscription}
            onDismiss={() => setNewSecret(null)}
          />
        ) : null}

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : subscriptions ? (
          <AppCard title={`Subscriptions · ${subscriptions.length}`} noPad>
            <SubscriptionsList
              subscriptions={subscriptions}
              onRevoke={setRevokeTarget}
            />
          </AppCard>
        ) : null}
      </div>

      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(secret, subscription) => {
          setCreateOpen(false);
          setNewSecret({ secret, subscription });
          reload();
        }}
      />

      <RevokeModal
        target={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onDone={() => {
          setRevokeTarget(null);
          reload();
        }}
      />
    </AppShell>
  );
}

/* ── How it works ───────────────────────────────────────────────────── */

function HowItWorks() {
  return (
    <section className="oga-wh__how" aria-labelledby="oga-wh-how-title">
      <div className="oga-wh__how-steps">
        <h3 id="oga-wh-how-title" className="oga-wh__how-title">
          How webhooks work
        </h3>
        <ol className="oga-wh__how-list">
          <li>
            <span className="oga-wh__how-step">1</span>
            <div>
              <strong>Add an HTTPS endpoint.</strong> One of your own
              services. Public reachable, returns 2xx within 10 seconds.
            </div>
          </li>
          <li>
            <span className="oga-wh__how-step">2</span>
            <div>
              <strong>Pick the events.</strong> We send a POST whenever
              one fires. You can subscribe to multiple events per endpoint.
            </div>
          </li>
          <li>
            <span className="oga-wh__how-step">3</span>
            <div>
              <strong>Verify the signature.</strong> Each delivery carries
              <code>X-OneGoodArea-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code>.
              Recompute HMAC-SHA256 of <code>t.body</code> with your secret
              and constant-time-compare.
            </div>
          </li>
        </ol>
      </div>
      <div className="oga-wh__how-code">
        <span className="oga-wh__how-code-label">Verify (Node.js)</span>
        <pre className="oga-wh__how-code-block">{`import crypto from "node:crypto";

app.post("/webhooks/oga", express.raw(), (req, res) => {
  const sig = req.headers["x-onegoodarea-signature"];
  const [tPart, v1Part] = sig.split(",");
  const t = tPart.split("=")[1];
  const v1 = v1Part.split("=")[1];
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(\`\${t}.\${req.body.toString()}\`)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) {
    return res.status(400).end();
  }
  // body is verified — do your thing.
  res.status(200).end();
});`}</pre>
      </div>
    </section>
  );
}

/* ── One-time secret reveal panel ──────────────────────────────────── */

function SecretReveal({
  secret,
  subscription,
  onDismiss,
}: {
  secret: string;
  subscription: Subscription;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="oga-wh__secret" role="status">
      <div className="oga-wh__secret-head">
        <span className="oga-wh__secret-label">New webhook secret</span>
        <p className="oga-wh__secret-hint">
          Copy this now — we won&apos;t show it again. Use it to verify the
          HMAC-SHA256 signature on every delivery to{" "}
          <code className="oga-wh__inline-code">{subscription.url}</code>.
        </p>
      </div>
      <div className="oga-wh__secret-row">
        <code className="oga-wh__secret-value">{secret}</code>
        <button type="button" onClick={copy} className="oga-wh__secret-copy">
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button type="button" onClick={onDismiss} className="oga-wh__secret-dismiss">
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ── Loading + error ────────────────────────────────────────────────── */

function Loading() {
  return (
    <div className="oga-wh__loading">
      <span aria-hidden className="oga-wh__loading-spinner" />
      Loading webhooks
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-wh__error">{error}</div>;
}

/* ── Subscriptions list ─────────────────────────────────────────────── */

function SubscriptionsList({
  subscriptions,
  onRevoke,
}: {
  subscriptions: Subscription[];
  onRevoke: (s: Subscription) => void;
}) {
  if (subscriptions.length === 0) {
    return (
      <div className="oga-wh__empty">
        <p className="oga-wh__empty-title">No webhooks yet.</p>
        <p className="oga-wh__empty-body">
          Use + Add webhook above to subscribe an endpoint to OneGoodArea
          events. Until then, nothing fires.
        </p>
      </div>
    );
  }
  return (
    <ul className="oga-wh__list">
      {subscriptions.map((s) => (
        <li key={s.id} className="oga-wh__row">
          <div className="oga-wh__row-meta">
            <span className="oga-wh__row-url">{s.url}</span>
            <span className="oga-wh__row-meta-line">
              {s.events.map((e) => (
                <span key={e} className="oga-wh__event-chip">{e}</span>
              ))}
            </span>
          </div>
          <div className="oga-wh__row-stats">
            <DeliveryStat label="Last success" iso={s.last_success_at} tone="ok" />
            <DeliveryStat label="Last failure" iso={s.last_failure_at} tone="warn" />
          </div>
          <div className="oga-wh__row-actions">
            <button
              type="button"
              onClick={() => onRevoke(s)}
              className="oga-wh__danger-btn"
              aria-label={`Revoke ${s.url}`}
            >
              Revoke
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DeliveryStat({
  label,
  iso,
  tone,
}: {
  label: string;
  iso: string | null;
  tone: "ok" | "warn";
}) {
  return (
    <div className="oga-wh__stat" data-tone={tone}>
      <span className="oga-wh__stat-label">{label}</span>
      <span className="oga-wh__stat-value">{iso ? formatRelative(iso) : "—"}</span>
    </div>
  );
}

/* ── Create modal ───────────────────────────────────────────────────── */

function CreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (secret: string, subscription: Subscription) => void;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<Set<WebhookEventType>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl("");
    setEvents(new Set());
    setBusy(false);
    setErr(null);
  }, [open]);

  function toggleEvent(eventId: WebhookEventType) {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  const trimmedUrl = url.trim();
  const httpsOk = trimmedUrl.startsWith("https://");
  const canSubmit = httpsOk && events.size > 0 && !busy;

  const hint = busy
    ? "Saving…"
    : !trimmedUrl
      ? "Add an HTTPS endpoint URL."
      : !httpsOk
        ? "URL must start with https://"
        : events.size === 0
          ? "Pick at least one event to subscribe to."
          : `${events.size} event${events.size === 1 ? "" : "s"} selected.`;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/me/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl, events: Array.from(events) }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(body?.error ?? "Couldn't add webhook. Try again.");
        return;
      }
      const body = (await res.json()) as { secret: string; subscription: Subscription };
      onCreated(body.secret, body.subscription);
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose())}
      title="Add webhook"
      size="lg"
      closeOnBackdrop={!busy}
      footer={
        <div className="oga-wh__modal-footer">
          <span className="oga-wh__modal-hint" role="status">{hint}</span>
          <div className="oga-wh__modal-footer-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="oga-wh__modal-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="oga-wh__modal-primary"
            >
              {busy ? "Saving…" : "Add webhook"}
            </button>
          </div>
        </div>
      }
    >
      <p className="oga-wh__modal-intro">
        Point at one of your own HTTPS endpoints. We&apos;ll POST a signed
        JSON payload whenever a subscribed event fires. The signing secret
        is shown ONCE after you save — copy it then.
      </p>

      <label className="oga-wh__modal-field">
        <span className="oga-wh__modal-field-label">Endpoint URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/webhooks/oga"
          maxLength={2048}
          autoFocus
          inputMode="url"
          className="oga-wh__modal-input"
        />
        <span className="oga-wh__modal-field-helper">
          Must use https://. Reject privates, localhost, and link-local
          ranges. Returns 2xx within 10 seconds or we retry.
        </span>
      </label>

      <div className="oga-wh__modal-field">
        <span className="oga-wh__modal-field-label">
          Events · {events.size} of {SUPPORTED_EVENTS.length} selected
        </span>
        <ul className="oga-wh__event-list">
          {SUPPORTED_EVENTS.map((e) => {
            const checked = events.has(e.id);
            return (
              <li key={e.id} className="oga-wh__event-item">
                <label className="oga-wh__event-label" data-checked={checked}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEvent(e.id)}
                    className="oga-wh__event-checkbox"
                  />
                  <div className="oga-wh__event-text">
                    <span className="oga-wh__event-name">{e.label}</span>
                    <code className="oga-wh__event-id">{e.id}</code>
                    <span className="oga-wh__event-blurb">{e.blurb}</span>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {err ? <p className="oga-wh__modal-error" role="alert">{err}</p> : null}
    </Modal>
  );
}

/* ── Revoke modal ───────────────────────────────────────────────────── */

function RevokeModal({
  target,
  onClose,
  onDone,
}: {
  target: Subscription | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusy(false);
      setErr(null);
    }
  }, [target]);

  async function submit() {
    if (!target) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/me/webhooks/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(body?.error ?? "Couldn't revoke webhook. Try again.");
        return;
      }
      onDone();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={target !== null}
      onClose={() => (busy ? null : onClose())}
      title="Revoke webhook"
      size="sm"
      surface="dark"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-wh__modal-secondary oga-wh__modal-secondary--on-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="oga-wh__modal-danger"
          >
            {busy ? "Revoking…" : "Revoke webhook"}
          </button>
        </>
      }
    >
      {target ? (
        <>
          <p className="oga-wh__modal-body oga-wh__modal-body--on-dark">
            We&apos;ll stop firing events to{" "}
            <code className="oga-wh__modal-code">{target.url}</code>{" "}
            immediately. Pending retries are dropped. The signing secret is
            invalidated. This can&apos;t be undone.
          </p>
          {err ? <p className="oga-wh__modal-error" role="alert">{err}</p> : null}
        </>
      ) : null}
    </Modal>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return "just now";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
