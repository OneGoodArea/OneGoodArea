"use client";

/* AR-276 /dashboard/org/presets.

   Custom scoring presets — a named per-org weight configuration that
   wraps one of the 4 built-in base profiles (moving, business,
   investing, research) with overridden dimension weights. Pass the
   saved preset's slug as `preset_id` on POST /v1/score to invoke
   it; the API resolves the saved weights and routes through v2's
   scoring engine unchanged. preset_id is mutually exclusive with
   inline `preset` / `weights` — passing both 422s preset_id_conflict.

   Distinct from /dashboard/scores (the read-only product page that
   lists built-in profiles + saved presets as a catalog). This is the
   admin-side CRUD surface.

   Sections:
     1. Saved presets list — name + slug badge + base profile chip +
        dimension count + Edit/Delete actions (admin+).
     2. Empty state explaining the 4 built-ins still work without one.

   Modals (create/edit/delete) follow the AR-274 Bundles vocabulary. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell, AppCard } from "../_shared/app-shell";
import { Modal } from "../_shared/dashboard/modal";
import { PresetsIcon } from "../_shared/dashboard/nav-icons";
import { CATEGORY_GLYPH } from "../_shared/dashboard/category-glyphs";
import { SCORING_PROFILES, type ProfileSlug } from "@/lib/scoring-profiles";
import type { SignalCategory } from "@onegoodarea/contracts";
import "./client.css";

type Role = "owner" | "admin" | "member";
type BasePreset = ProfileSlug;

interface Preset {
  id: string;
  org_id: string;
  slug: string;
  name: string;
  base_preset: BasePreset;
  weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

interface LoadedData {
  presets: Preset[];
  orgId: string | null;
  callerRole: Role | null;
}

const ROLE_RANK: Record<Role, number> = { member: 1, admin: 2, owner: 3 };
function hasAtLeastRole(actual: Role | null, required: Role): boolean {
  return actual !== null && ROLE_RANK[actual] >= ROLE_RANK[required];
}

/* Dimension keys per base preset. Duplicated from apps/api's
   PRESET_DIMENSION_KEYS deliberately — moving it into a shared
   package costs more in build coupling than the literal does in
   maintenance. If you change apps/api's keys, update this too. */
const BASE_PRESET_DIMENSIONS: Record<BasePreset, readonly string[]> = {
  moving: ["safety_crime", "schools_education", "transport_commute", "daily_amenities", "cost_of_living"],
  business: ["foot_traffic_demand", "competition_density", "transport_access", "local_spending_power", "commercial_costs"],
  investing: ["price_growth", "rental_yield", "regeneration_infrastructure", "tenant_demand", "risk_factors"],
  research: ["safety_crime", "transport_links", "amenities_services", "demographics_economy", "environment_quality"],
};

/* Map every dimension key to the dominant signal category — used to
   render a category glyph next to each weights-table row. Where a
   dimension spans multiple categories (e.g. risk_factors mixes flood
   + crime, tenant_demand mixes deprivation + property), we pick the
   most representative one for the visual cue. */
const DIMENSION_TO_CATEGORY: Record<string, SignalCategory> = {
  // moving
  safety_crime: "crime",
  schools_education: "schools",
  transport_commute: "transport",
  daily_amenities: "amenities",
  cost_of_living: "property",
  // business
  foot_traffic_demand: "amenities",
  competition_density: "amenities",
  transport_access: "transport",
  local_spending_power: "deprivation",
  commercial_costs: "property",
  // investing
  price_growth: "property",
  rental_yield: "property",
  regeneration_infrastructure: "property",
  tenant_demand: "deprivation",
  risk_factors: "environment",
  // research
  transport_links: "transport",
  amenities_services: "amenities",
  demographics_economy: "deprivation",
  environment_quality: "environment",
};

const DIMENSION_LABELS: Record<string, string> = {
  // moving
  safety_crime: "Safety & Crime",
  schools_education: "Schools & Education",
  transport_commute: "Transport & Commute",
  daily_amenities: "Daily Amenities",
  cost_of_living: "Cost of Living",
  // business
  foot_traffic_demand: "Foot traffic & demand",
  competition_density: "Competition density",
  transport_access: "Transport access",
  local_spending_power: "Local spending power",
  commercial_costs: "Commercial costs",
  // investing
  price_growth: "Price growth",
  rental_yield: "Rental yield",
  regeneration_infrastructure: "Regeneration & infrastructure",
  tenant_demand: "Tenant demand",
  risk_factors: "Risk factors",
  // research
  transport_links: "Transport links",
  amenities_services: "Amenities & services",
  demographics_economy: "Demographics & economy",
  environment_quality: "Environment quality",
};

/* Reasonable starting weights when a user picks a base preset without
   a template. Equal-thirds-ish distribution that sums to ~100 — the
   API normalises, but the visual starting point reads as "tunable". */
const DEFAULT_WEIGHTS_FOR: Record<BasePreset, Record<string, number>> = {
  moving: { safety_crime: 25, schools_education: 20, transport_commute: 20, daily_amenities: 15, cost_of_living: 20 },
  business: { foot_traffic_demand: 25, competition_density: 15, transport_access: 20, local_spending_power: 25, commercial_costs: 15 },
  investing: { price_growth: 25, rental_yield: 20, regeneration_infrastructure: 20, tenant_demand: 20, risk_factors: 15 },
  research: { safety_crime: 20, transport_links: 20, amenities_services: 20, demographics_economy: 20, environment_quality: 20 },
};

export default function PresetsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Preset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Preset | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/me/scoring-presets");
      if (!res.ok) {
        setError("Couldn't load presets.");
        return;
      }
      const json = (await res.json()) as {
        presets: Preset[];
        org_id: string | null;
        caller_role: Role | null;
      };
      setData({
        presets: json.presets,
        orgId: json.org_id,
        callerRole: json.caller_role,
      });
      setError(null);
    } catch {
      setError("Network error loading presets.");
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
        <div className="oga-pre__placeholder" />
      </AppShell>
    );
  }
  if (!session?.user) {
    router.push("/sign-in?callbackUrl=/dashboard/org/presets");
    return null;
  }

  const callerCanManage = hasAtLeastRole(data?.callerRole ?? null, "admin");

  return (
    <AppShell>
      <div className="oga-pre">
        <header className="oga-pre__product">
          <span className="oga-pre__product-mark" aria-hidden>
            <PresetsIcon width={56} height={56} />
          </span>
          <div className="oga-pre__product-text">
            <span className="oga-pre__product-eyebrow">Org</span>
            <h2 className="oga-pre__product-title">Scoring presets</h2>
            <p className="oga-pre__product-tagline">
              Define your own dimension weights as a named preset, slug it,
              share it across your org. Pass the slug as <code>preset_id</code>
              {" "}on any <code>/v1/score</code> call instead of inline
              {" "}<code>preset</code> + <code>weights</code>.
            </p>
          </div>
        </header>

        <HowItWorks />

        {callerCanManage ? (
          <div className="oga-pre__toolbar">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="oga-pre__primary-btn"
            >
              + Create preset
            </button>
          </div>
        ) : null}

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} />
        ) : data ? (
          <AppCard title={`Saved presets · ${data.presets.length}`} noPad>
            <PresetsList
              presets={data.presets}
              callerCanManage={callerCanManage}
              onEdit={setEditTarget}
              onDelete={setDeleteTarget}
            />
          </AppCard>
        ) : null}
      </div>

      <PresetFormModal
        open={createOpen}
        initial={null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      <PresetFormModal
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
    <section className="oga-pre__how" aria-labelledby="oga-pre-how-title">
      <div className="oga-pre__how-steps">
        <h3 id="oga-pre-how-title" className="oga-pre__how-title">
          How presets work
        </h3>
        <ol className="oga-pre__how-list">
          <li>
            <span className="oga-pre__how-step">1</span>
            <div>
              <strong>Pick a base profile.</strong> One of the four built-in
              workflows (Residential origination, Commercial site selection,
              Investment underwrite, Research baseline). The base picks the
              dimension set.
            </div>
          </li>
          <li>
            <span className="oga-pre__how-step">2</span>
            <div>
              <strong>Set dimension weights.</strong> Override the defaults.
              Positive numbers; the engine normalises so the relative weight
              is what matters.
            </div>
          </li>
          <li>
            <span className="oga-pre__how-step">3</span>
            <div>
              <strong>
                Reference by slug on <code>/v1/score</code>.
              </strong>{" "}
              Pass <code>preset_id=slug</code> in the body. The engine
              resolves your saved weights server-side. Mutually exclusive
              with inline <code>preset</code> / <code>weights</code>; pass
              both and you get <code>422 preset_id_conflict</code>.
            </div>
          </li>
        </ol>
      </div>
      <div className="oga-pre__how-code">
        <span className="oga-pre__how-code-label">Usage</span>
        <pre className="oga-pre__how-code-block">{`curl -X POST https://onegoodarea.onrender.com/v1/score \\
  -H "Authorization: Bearer oga_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "area": "SW1A 1AA",
    "preset_id": "<your-slug>"
  }'`}</pre>
      </div>
    </section>
  );
}

/* ── Loading + error ────────────────────────────────────────────────── */

function Loading() {
  return (
    <div className="oga-pre__loading">
      <span aria-hidden className="oga-pre__loading-spinner" />
      Loading presets
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return <div className="oga-pre__error">{error}</div>;
}

/* ── Presets list ───────────────────────────────────────────────────── */

function PresetsList({
  presets,
  callerCanManage,
  onEdit,
  onDelete,
}: {
  presets: Preset[];
  callerCanManage: boolean;
  onEdit: (p: Preset) => void;
  onDelete: (p: Preset) => void;
}) {
  if (presets.length === 0) {
    return (
      <div className="oga-pre__empty">
        <p className="oga-pre__empty-title">No saved presets yet.</p>
        <p className="oga-pre__empty-body">
          {callerCanManage
            ? "Use + Create preset above to define your first custom weight configuration. The four built-in profiles (moving, business, investing, research) still work for /v1/score calls in the meantime."
            : "An admin or owner can create one. The four built-in profiles still work for /v1/score calls without one."}
        </p>
      </div>
    );
  }
  return (
    <ul className="oga-pre__list">
      {presets.map((p) => {
        const profile = SCORING_PROFILES.find((sp) => sp.slug === p.base_preset);
        return (
          <li key={p.id} className="oga-pre__row">
            <div className="oga-pre__row-meta">
              <span className="oga-pre__row-name">{p.name}</span>
              <code className="oga-pre__row-slug">{p.slug}</code>
            </div>
            <span className="oga-pre__row-base" title={profile?.name}>
              {profile?.name ?? p.base_preset}
            </span>
            <span className="oga-pre__row-count">
              {Object.keys(p.weights).length} dimension
              {Object.keys(p.weights).length === 1 ? "" : "s"}
            </span>
            <span className="oga-pre__row-updated">
              Updated {formatDate(p.updated_at)}
            </span>
            {callerCanManage ? (
              <div className="oga-pre__row-actions">
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className="oga-pre__ghost-btn"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(p)}
                  className="oga-pre__danger-btn"
                >
                  Delete
                </button>
              </div>
            ) : (
              <span className="oga-pre__row-actions" aria-hidden />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ── Create / Edit modal ────────────────────────────────────────────── */

function PresetFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Preset | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [basePreset, setBasePreset] = useState<BasePreset>("moving");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base: BasePreset = initial?.base_preset ?? "moving";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(initial?.name ?? "");
    setBasePreset(base);
    setWeights(initial?.weights ?? { ...DEFAULT_WEIGHTS_FOR[base] });
    setBusy(false);
    setErr(null);
  }, [open, initial]);

  /* When the user changes the base preset, reset the weights to the new
     base's defaults so they're never editing keys the API would reject. */
  function changeBase(next: BasePreset) {
    setBasePreset(next);
    setWeights({ ...DEFAULT_WEIGHTS_FOR[next] });
  }

  function setWeight(key: string, raw: string) {
    const n = Number(raw);
    if (raw === "" || Number.isNaN(n)) {
      setWeights((prev) => ({ ...prev, [key]: 0 }));
      return;
    }
    setWeights((prev) => ({ ...prev, [key]: Math.max(0, n) }));
  }

  const trimmedName = name.trim();
  const dimensionKeys = BASE_PRESET_DIMENSIONS[basePreset];
  const totalWeight = dimensionKeys.reduce((s, k) => s + (weights[k] ?? 0), 0);
  const hasAnyWeight = totalWeight > 0;
  const livePreviewSlug = initial?.slug ?? (trimmedName ? slugifyClient(trimmedName) : "<your-slug>");
  const canSubmit = trimmedName.length > 0 && hasAnyWeight && !busy;

  const requirementHint = busy
    ? "Saving…"
    : trimmedName.length === 0 && !hasAnyWeight
      ? "Add a name and at least one positive weight."
      : trimmedName.length === 0
        ? "Add a name."
        : !hasAnyWeight
          ? "Set at least one positive weight."
          : `${dimensionKeys.length} dimensions · saves as ${livePreviewSlug}`;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        name: trimmedName,
        base_preset: basePreset,
        /* Drop zero weights — the API expects positive numbers and the
           server normalises the rest. */
        weights: Object.fromEntries(
          Object.entries(weights).filter(([, v]) => v > 0),
        ),
      };
      const res = initial
        ? await fetch(`/api/me/scoring-presets/${initial.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/me/scoring-presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
        setErr(messageForPresetError(body?.code, body?.error));
        return;
      }
      onSaved();
    } catch {
      setErr("Network error saving preset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => (busy ? null : onClose())}
      title={initial ? "Edit preset" : "Create preset"}
      size="lg"
      closeOnBackdrop={!busy}
      footer={
        <div className="oga-pre__modal-footer">
          <span className="oga-pre__modal-hint" role="status">
            {requirementHint}
          </span>
          <div className="oga-pre__modal-footer-buttons">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="oga-pre__modal-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="oga-pre__modal-primary"
            >
              {busy ? "Saving…" : initial ? "Save changes" : "Create preset"}
            </button>
          </div>
        </div>
      }
    >
      <p className="oga-pre__modal-intro">
        {initial
          ? "Update the preset. Any /v1/score call passing preset_id with this slug picks up the change on the next request."
          : "Define a weight configuration and save it under a slug. Pass that slug as preset_id on /v1/score to invoke it. preset_id is mutually exclusive with inline preset / weights."}
      </p>

      <label className="oga-pre__modal-field">
        <span className="oga-pre__modal-field-label">Preset name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Family-first Manchester"
          maxLength={200}
          autoFocus
          className="oga-pre__modal-input"
        />
        <span className="oga-pre__modal-field-helper">
          Slug will be{" "}
          <code className="oga-pre__inline-code">{livePreviewSlug}</code>,
          derived from the name
        </span>
      </label>

      <div className="oga-pre__modal-field">
        <span className="oga-pre__modal-field-label">Base profile</span>
        <div className="oga-pre__base-picker">
          {SCORING_PROFILES.map((profile) => {
            const isActive = basePreset === profile.slug;
            const Glyph = profile.Glyph;
            return (
              <label
                key={profile.slug}
                className="oga-pre__base-option"
                data-checked={isActive}
              >
                <input
                  type="radio"
                  name="base-preset"
                  checked={isActive}
                  onChange={() => changeBase(profile.slug)}
                  className="oga-pre__base-radio"
                />
                <span className="oga-pre__base-glyph" aria-hidden>
                  <Glyph />
                </span>
                <div className="oga-pre__base-text">
                  <span className="oga-pre__base-name">{profile.name}</span>
                  <span className="oga-pre__base-use">{profile.use}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="oga-pre__modal-field">
        <span className="oga-pre__modal-field-label">
          Dimension weights · total {Math.round(totalWeight)}
        </span>
        <ul className="oga-pre__weights">
          {dimensionKeys.map((key) => {
            const category = DIMENSION_TO_CATEGORY[key];
            const Glyph = category ? CATEGORY_GLYPH[category] : null;
            return (
              <li key={key} className="oga-pre__weight-row">
                <span className="oga-pre__weight-glyph" aria-hidden>
                  {Glyph ? <Glyph /> : null}
                </span>
                <label className="oga-pre__weight-label" htmlFor={`weight-${key}`}>
                  {DIMENSION_LABELS[key] ?? key}
                </label>
                <code className="oga-pre__weight-key">{key}</code>
                <input
                  id={`weight-${key}`}
                  type="number"
                  min={0}
                  step={1}
                  value={weights[key] ?? 0}
                  onChange={(e) => setWeight(key, e.target.value)}
                  className="oga-pre__weight-input"
                />
              </li>
            );
          })}
        </ul>
        <span className="oga-pre__modal-field-helper">
          Server normalises so relative weights are what matter. Drop a
          weight to 0 to exclude that dimension from your composite.
        </span>
      </div>

      {hasAnyWeight ? (
        <div className="oga-pre__modal-preview">
          <span className="oga-pre__modal-field-label">Preview</span>
          <pre className="oga-pre__modal-preview-code">{`POST /v1/score
{
  "area": "SW1A 1AA",
  "preset_id": "${livePreviewSlug}"
}`}</pre>
        </div>
      ) : null}

      {err ? (
        <p className="oga-pre__modal-error" role="alert">{err}</p>
      ) : null}
    </Modal>
  );
}

/* ── Delete confirmation ────────────────────────────────────────────── */

function ConfirmDelete({
  target,
  onClose,
  onDone,
}: {
  target: Preset | null;
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
      const res = await fetch(`/api/me/scoring-presets/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setErr(body?.error ?? "Couldn't delete preset. Try again.");
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
      title="Delete preset"
      size="sm"
      surface="dark"
      closeOnBackdrop={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="oga-pre__modal-secondary oga-pre__modal-secondary--on-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="oga-pre__modal-danger"
          >
            {busy ? "Deleting…" : "Delete preset"}
          </button>
        </>
      }
    >
      {target ? (
        <>
          <p className="oga-pre__modal-body oga-pre__modal-body--on-dark">
            <strong>{target.name}</strong> will be removed from your org.
            Any <code className="oga-pre__modal-code">/v1/score</code> call
            passing <code className="oga-pre__modal-code">preset_id={target.slug}</code>{" "}
            will start returning <strong>404 preset_not_found</strong> on
            the next request. This can&apos;t be undone.
          </p>
          {err ? (
            <p className="oga-pre__modal-error" role="alert">{err}</p>
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

function messageForPresetError(code: string | undefined, fallback: string | undefined): string {
  switch (code) {
    case "slug_taken":
      return "A preset with that name (slug) already exists in your org. Pick a different name.";
    case "unknown_weight_keys":
      return fallback ?? "One or more weight keys don't belong to the chosen base profile.";
    case "admin_required":
      return "Only admins and owners can manage presets.";
    default:
      return fallback ?? "Couldn't save the preset. Try again.";
  }
}
