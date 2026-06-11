"use client";

/* AR-277 /dashboard/org/cohorts.

   A cohort is a named comparison set of postcodes (or LSOA/MSOA codes)
   the org wants to benchmark against. Plugs into /v1/peers, /v1/score,
   and the dashboard's comparison views. Reference by slug on the API.

   Modal twist vs Bundles/Presets: cohorts can hold up to 10,000
   entries, so the create/edit modal is built around a bulk-paste
   textarea. Paste a CSV column, a newline-separated list, or comma-
   separated values; the client parses, normalises (uppercase + strip
   spaces), dedupes, and renders as chip rows you can remove one at
   a time. Live count + dedupe stat visible at all times. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard } from "../_shared/app-shell";
import { Modal } from "../_shared/dashboard/modal";
import { CohortsIcon } from "../_shared/dashboard/nav-icons";
import "./client.css";

type Role = "owner" | "admin" | "member";

const COHORT_MAX = 10_000;

interface Cohort {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  geo_codes: string[];
  created_at: string;
  updated_at: string;
}

interface LoadedData {
  cohorts: Cohort[];
  orgId: string | null;
  callerRole: Role | null;
}

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };
function hasAtLeastRole(actual: Role | null, required: Role): boolean {
  return actual !== null && ROLE_RANK[actual] >= ROLE_RANK[required];
}

export default function CohortsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Cohort | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cohort | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/me/org/cohorts");
      if (!res.ok) {
        setError("Couldn't load cohorts.");
        return;
      }
      const json = (await res.json()) as {
        cohorts: Cohort[];
        org_id: string | null;
        caller_role: Role | null;
      };
      setData({ cohorts: json.cohorts, orgId: json.org_id, callerRole: json.caller_role });
      setError(null);
    } catch {
      setError("Network error loading cohorts.");
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
        <div className="oga-coh__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/dashboard/org/cohorts");
    return null;
  }

  const callerCanManage = hasAtLeastRole(data?.callerRole ?? null, "admin");

  return (
    <AppShell>
      <div className="oga-coh">
        <header className="oga-coh__product">
          <span className="oga-coh__product-mark" aria-hidden>
            <CohortsIcon width={56} height={56} />
          </span>
          <div className="oga-coh__product-text">
            <span className="oga-coh__product-eyebrow">Org</span>
            <h2 className="oga-coh__product-title">Peer cohorts</h2>
            <p className="oga-coh__product-tagline">
              A cohort is a named comparison set. Benchmark an area against
              postcodes that resemble it on the dimensions you care about,
              not the national average. Reference by slug on{" "}
              <code>/v1/peers</code> and <code>/v1/score</code>.
            </p>
          </div>
        </header>

        <HowItWorks />

        {callerCanManage ? (
          <div className="oga-coh__toolbar">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="oga-coh__primary-btn"
            >
              + Create cohort
            </button>
          </div>
        ) : null}

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : data ? (
          <AppCard title={`Cohorts · ${data.cohorts.length}`} noPad>
            <CohortsList
              cohorts={data.cohorts}
              callerCanManage={callerCanManage}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          </AppCard>
        ) : null}
      </div>

      <CohortFormModal
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      <CohortFormModal
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

function HowItWorks() {
  return (
    <section className="oga-coh__how" aria-labelledby="oga-coh-how-title">
      <div className="oga-coh__how-steps">
        <h3 id="oga-coh-how-title" className="oga-coh__how-title">
          How cohorts work
        </h3>
        <ol className="oga-coh__how-list">
          <li>
            <span className="oga-coh__how-step">1</span>
            <div>
              <strong>Curate a comparison set.</strong> Up to 10,000 postcodes
              or LSOA/MSOA codes. Paste a CSV column from your spreadsheet
              and we&apos;ll normalise + dedupe.
            </div>
          </li>
          <li>
            <span className="oga-coh__how-step">2</span>
            <div>
              <strong>Save with a slug.</strong> The slug becomes the cohort
              identifier you reference from your code.
            </div>
          </li>
          <li>
            <span className="oga-coh__how-step">3</span>
            <div>
              <strong>
                Reference on <code>/v1/peers</code> and{" "}
                <code>/v1/score</code>.
              </strong>{" "}
              The engine benchmarks against your cohort instead of the
              national or area-type baseline.
            </div>
          </li>
        </ol>
      </div>
      <div className="oga-coh__how-code">
        <span className="oga-coh__how-code-label">Usage</span>
        <pre className="oga-coh__how-code-block">{`curl -X POST 'https://onegoodarea.onrender.com/v1/peers?cohort=<your-slug>' \\
  -H "Authorization: Bearer oga_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "area": "SW1A 1AA" }'`}</pre>
      </div>
    </section>
  );
}

/* ── Loading + error ────────────────────────────────────────────────── */

function Loading() {
  return (
    <div className="oga-coh__loading">
      <span aria-hidden className="oga-coh__loading-spinner" />
      Loading cohorts
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-coh__error">{error}</div>;
}

/* ── Cohorts list ───────────────────────────────────────────────────── */

function CohortsList({
  cohorts,
  callerCanManage,
  onEdit,
  onDelete,
}: {
  cohorts: Cohort[];
  callerCanManage: boolean;
  onEdit: (c: Cohort) => void;
  onDelete: (c: Cohort) => void;
}) {
  if (cohorts.length === 0) {
    return (
      <div className="oga-coh__empty">
        <p className="oga-coh__empty-title">No cohorts yet.</p>
        <p className="oga-coh__empty-body">
          {callerCanManage
            ? "Use + Create cohort above to define your first comparison set. Until then, /v1/peers and /v1/score fall back to the area-type baseline (urban / suburban / rural)."
            : "An admin or owner can curate the first one. Until then, /v1/peers + /v1/score benchmark against the area-type baseline."}
        </p>
      </div>
    );
  }
  return (
    <ul className="oga-coh__list">
      {cohorts.map((c) => (
        <li key={c.id} className="oga-coh__row">
          <div className="oga-coh__row-meta">
            <span className="oga-coh__row-name">{c.name}</span>
            <code className="oga-coh__row-slug">{c.slug}</code>
          </div>
          <span className="oga-coh__row-count">
            {c.geo_codes.length.toLocaleString()} entr
            {c.geo_codes.length === 1 ? "y" : "ies"}
          </span>
          <span className="oga-coh__row-updated">
            Updated {formatDate(c.updated_at)}
          </span>
          {callerCanManage ? (
            <div className="oga-coh__row-actions">
              <button
                type="button"
                onClick={() => onEdit(c)}
                className="oga-coh__ghost-btn"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(c)}
                className="oga-coh__danger-btn"
              >
                Delete
              </button>
            </div>
          ) : (
            <span className="oga-coh__row-actions" aria-hidden />
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Create / Edit modal (bulk-paste centred) ───────────────────────── */

function CohortFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Cohort | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  /* `raw` is the user's textarea content. We parse + dedupe to derive
     `entries` (the canonical chip list) on every keystroke via useMemo.
     Editing chips happens via the textarea — removing a chip just
     pops it out of the parsed list. */
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(initial?.name ?? "");
    setRaw((initial?.geo_codes ?? []).join("\n"));
    setBusy(false);
    setErr(null);
  }, [open, initial]);

  const { entries, duplicatesRemoved, tooMany } = useMemo(() => parseEntries(raw), [raw]);

  function removeEntry(target: string) {
    const next = entries.filter((e) => e !== target);
    setRaw(next.join("\n"));
  }

  const trimmedName = name.trim();
  const livePreviewSlug = initial?.slug ?? (trimmedName ? slugifyClient(trimmedName) : "<your-slug>");
  const canSubmit = trimmedName.length > 0 && entries.length > 0 && !tooMany && !busy;

  const requirementHint = busy
    ? "Saving…"
    : tooMany
      ? `Cap is ${COHORT_MAX.toLocaleString()} entries — paste fewer.`
      : trimmedName.length === 0 && entries.length === 0
        ? "Add a name and at least one entry."
        : trimmedName.length === 0
          ? "Add a name."
          : entries.length === 0
            ? "Paste at least one postcode or LSOA code."
            : `${entries.length.toLocaleString()} entries${
                duplicatesRemoved ? ` · ${duplicatesRemoved.toLocaleString()} duplicate${duplicatesRemoved === 1 ? "" : "s"} removed` : ""
              } · saves as ${livePreviewSlug}`;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = { name: trimmedName, geo_codes: entries };
      const res = initial
        ? await fetch(`/api/me/org/cohorts/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/me/org/cohorts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(messageForCohortError(body?.code, body?.error));
        return;
      }
      onSaved();
    } catch {
      setErr("Network error saving cohort.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose())}
      title={initial ? "Edit cohort" : "Create cohort"}
      size="lg"
      closeOnBackdrop={!busy}
      footer={
        <div className="oga-coh__modal-footer">
          <span className="oga-coh__modal-hint" role="status">
            {requirementHint}
          </span>
          <div className="oga-coh__modal-footer-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="oga-coh__modal-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="oga-coh__modal-primary"
            >
              {busy ? "Saving…" : initial ? "Save changes" : "Create cohort"}
            </button>
          </div>
        </div>
      }
    >
      <p className="oga-coh__modal-intro">
        {initial
          ? "Update the comparison set. Any /v1/peers or /v1/score call passing this cohort slug picks up the change on the next request."
          : "Save a comparison set under a slug. Reference it as ?cohort=<slug> on /v1/peers or /v1/score to benchmark against your subset instead of the area-type baseline."}
      </p>

      <label className="oga-coh__modal-field">
        <span className="oga-coh__modal-field-label">Cohort name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. North London BTR comparables"
          maxLength={200}
          autoFocus
          className="oga-coh__modal-input"
        />
        <span className="oga-coh__modal-field-helper">
          Slug will be{" "}
          <code className="oga-coh__inline-code">{livePreviewSlug}</code>,
          derived from the name
        </span>
      </label>

      <div className="oga-coh__modal-field">
        <span className="oga-coh__modal-field-label">
          Entries · {entries.length.toLocaleString()}{" "}
          {entries.length === 1 ? "postcode" : "postcodes / area codes"}
          {duplicatesRemoved
            ? ` · ${duplicatesRemoved.toLocaleString()} duplicate${
                duplicatesRemoved === 1 ? "" : "s"
              } removed`
            : ""}
        </span>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`Paste from a spreadsheet column. Newlines or commas both work.\nSW1A 1AA\nM1 1AE\nE01000001`}
          rows={8}
          className="oga-coh__paste"
        />
        {tooMany ? (
          <span className="oga-coh__modal-cap-warn">
            Over the {COHORT_MAX.toLocaleString()} entry cap. Trim before
            saving.
          </span>
        ) : (
          <span className="oga-coh__modal-field-helper">
            We uppercase and strip spaces. Duplicates removed. Cap{" "}
            {COHORT_MAX.toLocaleString()} per cohort.
          </span>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="oga-coh__modal-field">
          <span className="oga-coh__modal-field-label">Preview</span>
          <ChipList entries={entries} onRemove={removeEntry} />
        </div>
      ) : null}

      {err ? (
        <p className="oga-coh__modal-error" role="alert">{err}</p>
      ) : null}
    </Modal>
  );
}

/* Show only the first N chips by default, with a "show all" toggle so
   a 10,000-entry cohort doesn't try to render 10,000 DOM nodes on
   every keystroke. */
function ChipList({
  entries,
  onRemove,
}: {
  entries: string[];
  onRemove: (entry: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const PREVIEW_LIMIT = 200;
  const visible = showAll ? entries : entries.slice(0, PREVIEW_LIMIT);
  const hiddenCount = entries.length - visible.length;
  return (
    <>
      <ul className="oga-coh__chips">
        {visible.map((e) => (
          <li key={e} className="oga-coh__chip">
            <code className="oga-coh__chip-text">{e}</code>
            <button
              type="button"
              onClick={() => onRemove(e)}
              className="oga-coh__chip-remove"
              aria-label={`Remove ${e}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="oga-coh__chip-more"
        >
          Show {hiddenCount.toLocaleString()} more
        </button>
      ) : null}
    </>
  );
}

/* ── Delete confirmation ────────────────────────────────────────────── */

function ConfirmDelete({
  target,
  onClose,
  onDone,
}: {
  target: Cohort | null;
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
      const res = await fetch(`/api/me/org/cohorts/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(body?.error ?? "Couldn't delete cohort. Try again.");
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
      title="Delete cohort"
      size="sm"
      surface="dark"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-coh__modal-secondary oga-coh__modal-secondary--on-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="oga-coh__modal-danger"
          >
            {busy ? "Deleting…" : "Delete cohort"}
          </button>
        </>
      }
    >
      {target ? (
        <>
          <p className="oga-coh__modal-body oga-coh__modal-body--on-dark">
            <strong>{target.name}</strong> ({target.geo_codes.length.toLocaleString()}{" "}
            entries) will be removed from your org. Any{" "}
            <code className="oga-coh__modal-code">/v1/peers</code> or{" "}
            <code className="oga-coh__modal-code">/v1/score</code> call passing{" "}
            <code className="oga-coh__modal-code">cohort={target.slug}</code>{" "}
            will start returning <strong>404 cohort_not_found</strong> on the
            next request. This can&apos;t be undone.
          </p>
          {err ? (
            <p className="oga-coh__modal-error" role="alert">{err}</p>
          ) : null}
        </>
      ) : null}
    </Modal>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

/* Parse the bulk-paste textarea into a deduped, normalised list of
   geo codes. Split on any of: comma, newline, tab, semicolon, or
   runs of whitespace. Uppercase + strip internal spaces (so a paste
   of "sw1a 1aa" becomes "SW1A1AA"). Postcodes are accepted either
   spaced or unspaced; we normalise to the unspaced form for
   storage. LSOAs (E01...) get a free pass through the same path. */
function parseEntries(raw: string): {
  entries: string[];
  duplicatesRemoved: number;
  tooMany: boolean;
} {
  const seen = new Set<string>();
  const out: string[] = [];
  let dups = 0;
  for (const tok of raw.split(/[\s,;]+/)) {
    const norm = tok.replace(/\s+/g, "").toUpperCase();
    if (norm.length === 0) continue;
    if (norm.length > 20) continue;
    if (seen.has(norm)) {
      dups++;
      continue;
    }
    seen.add(norm);
    out.push(norm);
  }
  return {
    entries: out,
    duplicatesRemoved: dups,
    tooMany: out.length > COHORT_MAX,
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function slugifyClient(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "<your-slug>"
  );
}

function messageForCohortError(code: string | undefined, fallback: string | undefined): string {
  switch (code) {
    case "slug_taken":
      return "A cohort with that name (slug) already exists in your org. Pick a different name.";
    case "admin_required":
      return "Only admins and owners can manage cohorts.";
    default:
      return fallback ?? "Couldn't save the cohort. Try again.";
  }
}
