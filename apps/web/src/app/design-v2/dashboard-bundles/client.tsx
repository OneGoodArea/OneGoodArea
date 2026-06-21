"use client";

/* AR-274 /dashboard/org/bundles.

   Same operational pattern as Members (AR-273): product-style header,
   list card with row actions, brand modals for create / edit / delete.

   A bundle is a curated subset of normalised signal keys. Once saved,
   pass ?bundle=<id> on /v1/score or /v1/query and the engine restricts
   the calculation to that subset. One source of truth: change the
   bundle, every consumer picks it up on the next call.

   Sections:
     1. Bundles list — name, slug badge, signal count chip, last
        updated, Edit + Delete actions gated by caller role.
     2. Empty state when none saved.

   Modals:
     - Create / Edit — name input + signal picker grouped by category
       (uses SIGNAL_CATALOGUE from @onegoodarea/contracts).
     - Delete — dark surface, danger-styled confirm. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard } from "../_shared/app-shell";
import { Modal } from "../_shared/dashboard/modal";
import { BundlesIcon } from "../_shared/dashboard/nav-icons";
import { SIGNAL_CATALOGUE, type SignalCatalogueEntry } from "@onegoodarea/contracts";
import "./client.css";

type Role = "owner" | "admin" | "member";

interface Bundle {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  signal_keys: string[];
  created_at: string;
  updated_at: string;
}

interface LoadedData {
  bundles: Bundle[];
  orgId: string | null;
  callerRole: Role | null;
}

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };
function hasAtLeastRole(actual: Role | null, required: Role): boolean {
  return actual !== null && ROLE_RANK[actual] >= ROLE_RANK[required];
}

/* Group catalogue entries by category once — the modal renders the
   same grouped tree on every open, no need to redo the partition. */
const SIGNALS_BY_CATEGORY: Array<{
  category: string;
  entries: SignalCatalogueEntry[];
}> = (() => {
  const groups = new Map<string, SignalCatalogueEntry[]>();
  for (const sig of SIGNAL_CATALOGUE) {
    const list = groups.get(sig.category) ?? [];
    list.push(sig);
    groups.set(sig.category, list);
  }
  return Array.from(groups, ([category, entries]) => ({ category, entries }));
})();

export default function BundlesClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bundle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/me/org/bundles");
      if (!res.ok) {
        setError("Couldn't load bundles.");
        return;
      }
      const json = (await res.json()) as {
        bundles: Bundle[];
        org_id: string | null;
        caller_role: Role | null;
      };
      setData({
        bundles: json.bundles,
        orgId: json.org_id,
        callerRole: json.caller_role,
      });
      setError(null);
    } catch {
      setError("Network error loading bundles.");
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
        <div className="oga-bndl__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/dashboard/org/bundles");
    return null;
  }

  const callerCanManage = hasAtLeastRole(data?.callerRole ?? null, "admin");

  return (
    <AppShell>
      <div className="oga-bndl">
        <header className="oga-bndl__product">
          <span className="oga-bndl__product-mark" aria-hidden>
            <BundlesIcon width={56} height={56} />
          </span>
          <div className="oga-bndl__product-text">
            <span className="oga-bndl__product-eyebrow">Org</span>
            <h2 className="oga-bndl__product-title">Signal bundles</h2>
            <p className="oga-bndl__product-tagline">
              Curate the subset of normalised signals your org cares about,
              save as a named bundle, and route every <code>/v1/score</code>,
              {" "}<code>/v1/query</code>, <code>/v1/area</code>, and
              {" "}<code>/v1/areas</code> call through it by default. When
              the bundle changes, every consumer in your stack picks it up.
            </p>
          </div>
        </header>

        <HowItWorks />

        {callerCanManage ? (
          <div className="oga-bndl__toolbar">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="oga-bndl__primary-btn"
            >
              + Create bundle
            </button>
          </div>
        ) : null}

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : data ? (
          <AppCard title={`Bundles · ${data.bundles.length}`} noPad>
            <BundlesList
              bundles={data.bundles}
              callerCanManage={callerCanManage}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          </AppCard>
        ) : null}
      </div>

      <BundleFormModal
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      <BundleFormModal
        open={editTarget !== null}
        initial={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          reload();
        }}
      />

      <ConfirmDelete
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={() => {
          setDeleteTarget(null);
          reload();
        }}
      />
    </AppShell>
  );
}

/* ── How it works panel ─────────────────────────────────────────────── */

/* Editorial explainer below the header. Lays out the bundle-gate model
   in three steps + a code sample so an enterprise admin landing on this
   page understands what they're configuring before clicking anything.
   Modelled on Stripe's "explain the capability first" pattern. */
function HowItWorks() {
  return (
    <section className="oga-bndl__how" aria-labelledby="oga-bndl-how-title">
      <div className="oga-bndl__how-steps">
        <h3 id="oga-bndl-how-title" className="oga-bndl__how-title">
          How bundles work
        </h3>
        <ol className="oga-bndl__how-list">
          <li>
            <span className="oga-bndl__how-step">1</span>
            <div>
              <strong>Curate a subset.</strong> Pick the signals your workflow
              cares about from the 19 available across 7 categories.
            </div>
          </li>
          <li>
            <span className="oga-bndl__how-step">2</span>
            <div>
              <strong>Save with a slug.</strong> The slug becomes the gate
              identifier you reference from your code.
            </div>
          </li>
          <li>
            <span className="oga-bndl__how-step">3</span>
            <div>
              <strong>
                Pass <code>?bundle=slug</code> on <code>/v1/score</code>,
                {" "}<code>/v1/query</code>, <code>/v1/area</code>, or
                {" "}<code>/v1/areas</code>.
              </strong>{" "}
              The engine restricts the calculation to your subset. On
              <code>/v1/score</code>, dimensions whose signals aren&apos;t
              in the bundle collapse to 0-confidence and the composite
              score reflects only the surviving dimensions. Change the
              bundle, every consumer picks it up on the next call.
            </div>
          </li>
        </ol>
      </div>
      <div className="oga-bndl__how-code">
        <span className="oga-bndl__how-code-label">Usage</span>
        <pre className="oga-bndl__how-code-block">{`curl -X POST 'https://onegoodarea.onrender.com/v1/score?bundle=<your-slug>' \\
  -H "Authorization: Bearer oga_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "area": "SW1A 1AA",
    "preset": "moving"
  }'`}</pre>
      </div>
    </section>
  );
}

/* ── Loading + error ────────────────────────────────────────────────── */

function Loading() {
  return (
    <div className="oga-bndl__loading">
      <span aria-hidden className="oga-bndl__loading-spinner" />
      Loading bundles
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-bndl__error">{error}</div>;
}

/* ── Bundles list ───────────────────────────────────────────────────── */

function BundlesList({
  bundles,
  callerCanManage,
  onEdit,
  onDelete,
}: {
  bundles: Bundle[];
  callerCanManage: boolean;
  onEdit: (b: Bundle) => void;
  onDelete: (b: Bundle) => void;
}) {
  if (bundles.length === 0) {
    return (
      <div className="oga-bndl__empty">
        <p className="oga-bndl__empty-title">No bundles yet.</p>
        <p className="oga-bndl__empty-body">
          {callerCanManage
            ? "Use + Create bundle above to curate your first signal subset. Until then, /v1/score, /v1/query, and the area endpoints run against all 19 signals by default."
            : "An admin or owner in your org will need to curate the first one. Until then, your /v1/* calls run against all 19 signals by default."}
        </p>
      </div>
    );
  }
  return (
    <ul className="oga-bndl__list">
      {bundles.map((b) => (
        <li key={b.id} className="oga-bndl__row">
          <div className="oga-bndl__row-meta">
            <span className="oga-bndl__row-name">{b.name}</span>
            <code className="oga-bndl__row-slug">{b.slug}</code>
          </div>
          <span className="oga-bndl__row-count">
            {b.signal_keys.length} signal{b.signal_keys.length === 1 ? "" : "s"}
          </span>
          <span className="oga-bndl__row-updated">
            Updated {formatDate(b.updated_at)}
          </span>
          {callerCanManage ? (
            <div className="oga-bndl__row-actions">
              <button
                type="button"
                onClick={() => onEdit(b)}
                className="oga-bndl__ghost-btn"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(b)}
                className="oga-bndl__danger-btn"
              >
                Delete
              </button>
            </div>
          ) : (
            <span className="oga-bndl__row-actions" aria-hidden />
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Create / Edit modal ────────────────────────────────────────────── */

function BundleFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Bundle | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(initial?.name ?? "");
    setSelected(new Set(initial?.signal_keys ?? []));
    setBusy(false);
    setErr(null);
  }, [open, initial]);

  function toggleKey(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCategory(entries: SignalCatalogueEntry[]) {
    const allSelected = entries.every((e) => selected.has(e.key));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const e of entries) {
        if (allSelected) next.delete(e.key);
        else next.add(e.key);
      }
      return next;
    });
  }

  const trimmedName = name.trim();
  const livePreviewSlug = initial?.slug ?? (trimmedName ? slugifyClient(trimmedName) : "<your-slug>");
  const canSubmit = trimmedName.length > 0 && selected.size > 0 && !busy;

  /* Helper text under the action row. Tells the user what's missing
     instead of leaving them staring at a greyed-out button. */
  const requirementHint = busy
    ? "Saving…"
    : trimmedName.length === 0 && selected.size === 0
      ? "Add a name and select at least one signal."
      : trimmedName.length === 0
        ? "Add a name."
        : selected.size === 0
          ? "Select at least one signal."
          : `${selected.size} signal${selected.size === 1 ? "" : "s"} selected · saves as ${livePreviewSlug}`;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        name: trimmedName,
        signal_keys: Array.from(selected),
      };
      const res = initial
        ? await fetch(`/api/me/org/bundles/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/me/org/bundles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(messageForBundleError(body?.code, body?.error));
        return;
      }
      onSaved();
    } catch {
      setErr("Network error saving bundle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose())}
      title={initial ? "Edit bundle" : "Create bundle"}
      size="lg"
      closeOnBackdrop={!busy}
      footer={
        <div className="oga-bndl__modal-footer">
          <span className="oga-bndl__modal-hint" role="status">
            {requirementHint}
          </span>
          <div className="oga-bndl__modal-footer-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="oga-bndl__modal-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="oga-bndl__modal-primary"
            >
              {busy ? "Saving…" : initial ? "Save changes" : "Create bundle"}
            </button>
          </div>
        </div>
      }
    >
      <p className="oga-bndl__modal-intro">
        {initial
          ? "Update the curated subset. Any /v1/score, /v1/query, /v1/area, or /v1/areas call passing this bundle slug picks up the change on the next request."
          : "Curate a subset and save it under a slug. Pass that slug as ?bundle=<slug> on /v1/score, /v1/query, /v1/area, or /v1/areas to restrict the engine to your subset."}
      </p>

      <label className="oga-bndl__modal-field">
        <span className="oga-bndl__modal-field-label">Bundle name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Property safety subset"
          maxLength={200}
          autoFocus
          className="oga-bndl__modal-input"
        />
        <span className="oga-bndl__modal-field-helper">
          Slug will be{" "}
          <code className="oga-bndl__inline-code">{livePreviewSlug}</code>
          {initial ? " (locked, can&apos;t be changed after creation)" : ", derived from the name"}
        </span>
      </label>

      <div className="oga-bndl__modal-field">
        <span className="oga-bndl__modal-field-label">
          Signals · {selected.size} of {SIGNAL_CATALOGUE.length} selected
        </span>
        <SignalPicker selected={selected} onToggleKey={toggleKey} onToggleCategory={toggleCategory} />
      </div>

      {selected.size > 0 ? (
        <div className="oga-bndl__modal-preview">
          <span className="oga-bndl__modal-field-label">Preview</span>
          <pre className="oga-bndl__modal-preview-code">{`POST /v1/score?bundle=${livePreviewSlug}
{
  "area": "SW1A 1AA",
  "preset": "moving"
}`}</pre>
        </div>
      ) : null}

      {err ? (
        <p className="oga-bndl__modal-error" role="alert">{err}</p>
      ) : null}
    </Modal>
  );
}

/* Client-side slug derivation that mirrors the server's slugify().
   Kept in sync with the route handler — if the server changes its
   normalisation rules, update this too. */
function slugifyClient(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "<your-slug>";
}

function SignalPicker({
  selected,
  onToggleKey,
  onToggleCategory,
}: {
  selected: Set<string>;
  onToggleKey: (key: string) => void;
  onToggleCategory: (entries: SignalCatalogueEntry[]) => void;
}) {
  return (
    <div className="oga-bndl__picker">
      {SIGNALS_BY_CATEGORY.map(({ category, entries }) => {
        const allSelected = entries.every((e) => selected.has(e.key));
        const someSelected = !allSelected && entries.some((e) => selected.has(e.key));
        return (
          <div key={category} className="oga-bndl__picker-group">
            <div className="oga-bndl__picker-group-head">
              <span className="oga-bndl__picker-category">{category}</span>
              <button
                type="button"
                onClick={() => onToggleCategory(entries)}
                className="oga-bndl__picker-toggle"
                aria-label={`${allSelected ? "Unselect" : "Select"} all ${category} signals`}
              >
                {allSelected ? "Unselect all" : someSelected ? "Select rest" : "Select all"}
              </button>
            </div>
            <ul className="oga-bndl__picker-list">
              {entries.map((e) => {
                const isChecked = selected.has(e.key);
                return (
                  <li key={e.key} className="oga-bndl__picker-item">
                    <label className="oga-bndl__picker-label" data-checked={isChecked}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleKey(e.key)}
                        className="oga-bndl__picker-checkbox"
                      />
                      <div className="oga-bndl__picker-text">
                        <span className="oga-bndl__picker-name">{e.label}</span>
                        <code className="oga-bndl__picker-key">{e.key}</code>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ── Delete confirmation ────────────────────────────────────────────── */

function ConfirmDelete({
  target,
  onClose,
  onDone,
}: {
  target: Bundle | null;
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
      const res = await fetch(`/api/me/org/bundles/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(body?.error ?? "Couldn't delete bundle. Try again.");
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
      title="Delete bundle"
      size="sm"
      surface="dark"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-bndl__modal-secondary oga-bndl__modal-secondary--on-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="oga-bndl__modal-danger"
          >
            {busy ? "Deleting…" : "Delete bundle"}
          </button>
        </>
      }
    >
      {target ? (
        <>
          <p className="oga-bndl__modal-body oga-bndl__modal-body--on-dark">
            <strong>{target.name}</strong> will be removed from your org. Any
            API call passing <code className="oga-bndl__modal-code">bundle={target.slug}</code> will
            start returning <strong>404 bundle_not_found</strong> on the next
            request. This can&apos;t be undone.
          </p>
          {err ? (
            <p className="oga-bndl__modal-error" role="alert">{err}</p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function messageForBundleError(code: string | undefined, fallback: string | undefined): string {
  switch (code) {
    case "slug_taken":
      return "A bundle with that name (slug) already exists in your org. Pick a different name.";
    case "unknown_signal_keys":
      return fallback ?? "One or more signal keys aren't in the catalogue.";
    case "admin_required":
      return "Only admins and owners can manage bundles.";
    default:
      return fallback ?? "Couldn't save the bundle. Try again.";
  }
}
