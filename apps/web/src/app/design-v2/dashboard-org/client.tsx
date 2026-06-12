"use client";

/* AR-284 /dashboard/org settings.

   Landing surface for the org itself — peer to the existing
   /dashboard/org/{members,bundles,presets,cohorts} pages, which
   manage children of the org. This one manages the org record.

   Sections:
     1. Identity — name (canonical), display name (override shown
        in chrome), slug (URL identifier with a warning hint).
     2. Branding — logo URL (paste-in for v1; Vercel Blob upload
        is a follow-up), homepage URL (white-label "Powered by X").
     3. Audit footer — created / updated timestamps.

   Role gating mirrors the apps/api PATCH /v1/orgs/:id contract:
   owner + admin can edit; member is read-only. The BFF enforces
   the same gate server-side (the UI just hides the controls so a
   member doesn't see disabled inputs they can't use).

   No save-on-blur — explicit "Save changes" button at the bottom
   of the form, enabled only when dirty + valid. PATCH sends only
   the diff (fields that actually changed) so an idle update never
   overwrites an unrelated field. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AppCard } from "../_shared/app-shell";
import { OrgIcon } from "../_shared/dashboard/nav-icons";
import "./client.css";

type Role = "owner" | "admin" | "member";

interface OrgRecord {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  brand_url: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface LoadedData {
  org: OrgRecord;
  callerRole: Role;
}

/* Editable string-field form state. Stored as strings (empty = null
   for nullable fields) so the inputs read/write through a single
   shape; the PATCH builder normalises empty → null at submit time. */
interface FormState {
  name: string;
  display_name: string;
  slug: string;
  logo_url: string;
  brand_url: string;
}

const SLUG_REGEX = /^[a-z0-9-]{2,60}$/;
const URL_REGEX = /^https?:\/\/[^\s]+$/i;

function orgToForm(org: OrgRecord): FormState {
  return {
    name: org.name,
    display_name: org.display_name ?? "",
    slug: org.slug,
    logo_url: org.logo_url ?? "",
    brand_url: org.brand_url ?? "",
  };
}

export default function OrgSettingsClient() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

function Body() {
  const router = useRouter();
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/me/org", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/get-started?callbackUrl=/dashboard/org");
        return;
      }
      if (!res.ok) {
        setError(`Couldn't load organisation (HTTP ${res.status}).`);
        return;
      }
      const body = (await res.json()) as { org: OrgRecord | null; caller_role: Role | null };
      if (!body.org || !body.caller_role) {
        setError("You aren't a member of any organisation.");
        return;
      }
      setData({ org: body.org, callerRole: body.caller_role });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) return <LoadingShell />;
  if (error) return <ErrorShell error={error} onRetry={load} />;
  if (!data) return null;

  return <Loaded data={data} onSaved={(org) => setData({ ...data, org })} />;
}

function Loaded({
  data,
  onSaved,
}: {
  data: LoadedData;
  onSaved: (org: OrgRecord) => void;
}) {
  const { org, callerRole } = data;
  const canEdit = callerRole === "owner" || callerRole === "admin";

  const [form, setForm] = useState<FormState>(() => orgToForm(org));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const original = useMemo(() => orgToForm(org), [org]);

  const dirty = useMemo(() => {
    return (
      form.name         !== original.name         ||
      form.display_name !== original.display_name ||
      form.slug         !== original.slug         ||
      form.logo_url     !== original.logo_url     ||
      form.brand_url    !== original.brand_url
    );
  }, [form, original]);

  const errors = useMemo<Partial<Record<keyof FormState, string>>>(() => {
    const out: Partial<Record<keyof FormState, string>> = {};
    if (form.name.trim().length === 0) out.name = "Name is required.";
    if (form.name.length > 200) out.name = "Name must be 200 characters or fewer.";
    if (form.display_name.length > 200) out.display_name = "Display name must be 200 characters or fewer.";
    if (!SLUG_REGEX.test(form.slug)) {
      out.slug = "Slug must be 2-60 chars, lowercase letters, digits, and hyphens.";
    }
    if (form.logo_url.length > 0 && (!URL_REGEX.test(form.logo_url) || form.logo_url.length > 2000)) {
      out.logo_url = "Logo URL must be a valid http(s) URL up to 2000 chars.";
    }
    if (form.brand_url.length > 0 && (!URL_REGEX.test(form.brand_url) || form.brand_url.length > 500)) {
      out.brand_url = "Homepage URL must be a valid http(s) URL up to 500 chars.";
    }
    return out;
  }, [form]);

  const valid = Object.keys(errors).length === 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaveOk(false);
    setSaveError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || !valid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const patch = buildPatch(form, original);
      const res = await fetch("/api/me/org", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409) {
        setSaveError("That slug is already taken. Try a different one.");
        return;
      }
      if (res.status === 403) {
        setSaveError("You don't have permission to edit this organisation.");
        return;
      }
      if (!res.ok || !body || typeof body !== "object" || !body.org) {
        setSaveError(
          (body && typeof body.error === "string" ? body.error : null) ??
            `Couldn't save (HTTP ${res.status}).`,
        );
        return;
      }
      onSaved(body.org as OrgRecord);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2400);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="oga-org">
      <header className="oga-org__product">
        <span className="oga-org__product-mark" aria-hidden>
          {org.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={org.logo_url} alt="" className="oga-org__product-img" />
          ) : (
            <OrgIcon width={36} height={36} />
          )}
        </span>
        <div className="oga-org__product-text">
          <span className="oga-org__product-eyebrow">Organisation</span>
          <h2 className="oga-org__product-title">{org.display_name || org.name}</h2>
          <p className="oga-org__product-tagline">
            Identity + white-label settings for this organisation. Members
            see this as read-only; admins and owners can edit. Changes apply
            immediately across the dashboard and embeds.
          </p>
          <p className="oga-org__product-roleline">
            You are <code>{callerRole}</code>.
            {!canEdit ? <span> Editing is restricted to admin and owner.</span> : null}
          </p>
        </div>
      </header>

      <form onSubmit={save} className="oga-org__form">
        <AppCard
          title="Identity"
          note="The canonical record for this organisation. Display name overrides the customer-facing label in the dashboard chrome and embeds; slug rotates the URL identifier."
        >
          <Field
            label="Name"
            hint="Required. The canonical record name; shown to admins."
            error={errors.name}
            disabled={!canEdit}
          >
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              disabled={!canEdit}
              maxLength={200}
              className="oga-org-input"
            />
          </Field>

          <Field
            label="Display name"
            hint="Optional override. Leave empty to fall back to Name."
            error={errors.display_name}
            disabled={!canEdit}
          >
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              disabled={!canEdit}
              maxLength={200}
              placeholder={org.name}
              className="oga-org-input"
            />
          </Field>

          <Field
            label="Slug"
            hint="URL identifier. Lowercase letters, digits, hyphens. Changing this rotates URLs and may break integrations that hard-coded the previous slug."
            error={errors.slug}
            disabled={!canEdit}
          >
            <input
              type="text"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              disabled={!canEdit}
              maxLength={60}
              className="oga-org-input oga-org-input--mono"
            />
          </Field>
        </AppCard>

        <AppCard
          title="Branding"
          note="White-label fields. Logo appears in the dashboard chrome (sidebar org switcher, this page). Homepage URL powers the 'Powered by' link on embeds. Paste any image URL for v1; uploads are a follow-up."
        >
          <Field
            label="Logo URL"
            hint="Optional. Square image works best. Paste an https URL pointing to your logo (PNG, JPG, SVG)."
            error={errors.logo_url}
            disabled={!canEdit}
          >
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => update("logo_url", e.target.value)}
              disabled={!canEdit}
              maxLength={2000}
              placeholder="https://example.com/logo.png"
              className="oga-org-input oga-org-input--mono"
            />
            {form.logo_url && URL_REGEX.test(form.logo_url) ? (
              <div className="oga-org-preview" aria-hidden>
                <span className="oga-org-preview__label">Preview</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logo_url} alt="" className="oga-org-preview__img" />
              </div>
            ) : null}
          </Field>

          <Field
            label="Homepage URL"
            hint="Optional. The 'Powered by' link on embeds points here."
            error={errors.brand_url}
            disabled={!canEdit}
          >
            <input
              type="url"
              value={form.brand_url}
              onChange={(e) => update("brand_url", e.target.value)}
              disabled={!canEdit}
              maxLength={500}
              placeholder="https://example.com"
              className="oga-org-input oga-org-input--mono"
            />
          </Field>
        </AppCard>

        {canEdit ? (
          <div className="oga-org__actions">
            {saveError ? <span className="oga-org__save-error">{saveError}</span> : null}
            {saveOk ? <span className="oga-org__save-ok">Saved ✓</span> : null}
            <button
              type="submit"
              className="oga-org-btn oga-org-btn--ink"
              disabled={!dirty || !valid || saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : null}

        <footer className="oga-org__audit">
          <span>
            Created <time dateTime={org.created_at}>{formatTimestamp(org.created_at)}</time>
          </span>
          <span>·</span>
          <span>
            Updated <time dateTime={org.updated_at}>{formatTimestamp(org.updated_at)}</time>
          </span>
          <span>·</span>
          <code>{org.id}</code>
        </footer>
      </form>
    </div>
  );
}

/* Build a minimal PATCH body — only fields that actually changed go
   on the wire. Empty string in a nullable field maps to explicit
   null (the schema accepts null but rejects empty strings). */
function buildPatch(form: FormState, original: FormState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (form.name !== original.name) out.name = form.name;
  if (form.slug !== original.slug) out.slug = form.slug;
  if (form.display_name !== original.display_name) {
    out.display_name = form.display_name === "" ? null : form.display_name;
  }
  if (form.logo_url !== original.logo_url) {
    out.logo_url = form.logo_url === "" ? null : form.logo_url;
  }
  if (form.brand_url !== original.brand_url) {
    out.brand_url = form.brand_url === "" ? null : form.brand_url;
  }
  return out;
}

function Field({
  label,
  hint,
  error,
  disabled,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={disabled ? "oga-org-field oga-org-field--disabled" : "oga-org-field"}>
      <label className="oga-org-field__label">{label}</label>
      {children}
      {error ? <p className="oga-org-field__error">{error}</p> : hint ? (
        <p className="oga-org-field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

function formatTimestamp(s: string): string {
  try {
    return new Date(s).toLocaleString("en-GB", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function LoadingShell() {
  return (
    <div className="oga-org oga-org--loading">
      <div className="oga-org__loading-bar" />
      <p>Loading organisation…</p>
    </div>
  );
}

function ErrorShell({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="oga-org oga-org--error">
      <h2 className="oga-org__product-title">Couldn&apos;t load</h2>
      <p>{error}</p>
      <button type="button" onClick={onRetry} className="oga-org-btn oga-org-btn--ghost">
        Retry
      </button>
    </div>
  );
}
