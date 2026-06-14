"use client";

/* AR-234 [AR-217-A17] OrgSwitcher.

   Sits in the top slot of the sidebar (below the wordmark), Stripe-
   style. Trigger button shows the current org's display name + the
   caller's role badge. Clicking opens a dropdown with two sections:
     1. Switch organisation, the orgs the user belongs to.
     2. Account, the email display + Settings / Help / Sign out
        actions.

   The Account section replaces the bottom-of-sidebar UserChip from
   AR-204 / AR-252. Stripe pattern: one menu, two sections, less
   chrome at the bottom of the sidebar. Pedro asked for this
   consolidation 2026-06-09.

   "Active org" is a local UX preference here (localStorage-backed),
   not yet a server-side context. The API itself routes by api-key
   org_id; surfacing a session-level override is a future Phase 1
   enhancement (see [[project-plans-008-009-010]]). For now the
   switcher's job is visible org context + a way to read which
   memberships exist.

   "Create new org" is intentionally NOT in this commit. The data
   model + endpoint exist (POST /v1/orgs in apps/api) but plumbing
   the session-auth web BFF + the modal flow is its own ticket. */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  type DropdownEntry,
} from "./dropdown-menu";
import { Modal } from "./modal";
import "./org-switcher.css";

export type OrgRole = "owner" | "admin" | "member";

export interface OrgSummary {
  id: string;
  slug: string;
  name: string;
  display_name: string | null;
  role: OrgRole;
}

const ACTIVE_ORG_KEY = "oga-active-org-id";

export interface OrgSwitcherProps {
  /** Signed-in user's email, displayed as a muted item in the Account
      section of the dropdown. Passed in from AppShell which already
      reads the session, so OrgSwitcher itself doesn't need useSession. */
  userEmail?: string | null;
}

export function OrgSwitcher({ userEmail }: OrgSwitcherProps) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  /* AR-307: when /api/orgs fails (most often 401 from a stale/expired
     session), the switcher must NOT stay in the loading placeholder
     forever. Track the failure so we can render a minimal Account-only
     menu that still lets the user sign out + re-auth. */
  const [loadError, setLoadError] = useState<"unauthorized" | "other" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orgs", { cache: "no-store" });
      if (!res.ok) {
        setLoadError(res.status === 401 ? "unauthorized" : "other");
        setOrgs([]);
        return;
      }
      const data = (await res.json()) as { orgs: OrgSummary[] };
      setOrgs(data.orgs);
      setLoadError(null);
      const stored =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_ORG_KEY)
          : null;
      const resolved =
        (stored && data.orgs.find((o) => o.id === stored)?.id) ||
        data.orgs[0]?.id ||
        null;
      setActiveId(resolved);
    } catch {
      setLoadError("other");
      setOrgs([]);
    }
  }, []);

  /* Fetch + initial active-org resolution. localStorage holds the
     last-chosen org if any; falls back to the first org in the list
     (oldest member-of, per the API's ORDER BY created_at ASC). */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function switchTo(orgId: string) {
    setActiveId(orgId);
    try {
      window.localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      /* private mode / disabled storage */
    }
  }

  /* AR-285: after a successful create, refresh the list, set the new
     org as active in localStorage, close the modal. Caller stays on
     the same page — no full reload, no router push. The page reads
     its data via /api/me/org which resolves the primary org per
     session, so the next route-level read will see the new org if
     this becomes the user's primary; for now we just visually
     promote it in the switcher. */
  const onCreated = useCallback(
    async (newId: string) => {
      await load();
      setActiveId(newId);
      try {
        window.localStorage.setItem(ACTIVE_ORG_KEY, newId);
      } catch {
        /* private mode / disabled storage */
      }
      setCreateOpen(false);
    },
    [load],
  );

  /* Loading state: render a compact placeholder so the sidebar layout
     is stable on first paint (no hop when orgs arrive). */
  if (orgs === null) {
    return (
      <div className="oga-org-switcher oga-org-switcher--loading" aria-hidden>
        <span className="oga-org-switcher__avatar" />
        <span className="oga-org-switcher__skeleton" />
      </div>
    );
  }

  /* AR-307: session-load failure. Render a minimal Account-only menu
     so the user can sign out / sign in again even when /api/orgs 401s
     (stale cookie, expired session, deploy drift). Without this we'd
     hide the switcher entirely on the fresh-DB branch below — but on
     a 401 the user IS signed in client-side and needs a way out. */
  if (loadError === "unauthorized") {
    return (
      <DropdownMenu
        header="Account"
        align="start"
        triggerLabel="Account menu"
        triggerClassName="oga-org-switcher__trigger"
        trigger={
          <span className="oga-org-switcher__trigger-row">
            <span className="oga-org-switcher__avatar" aria-hidden>?</span>
            <span className="oga-org-switcher__labels">
              <span className="oga-org-switcher__name">Session expired</span>
              <span className="oga-org-switcher__role">Sign in again</span>
            </span>
          </span>
        }
        items={[
          ...(userEmail ? [{ label: userEmail, onClick: () => {}, disabled: true }] : []),
          { label: "Sign in again", onClick: () => router.push("/sign-in") },
          {
            label: "Sign out",
            onClick: () => { signOut({ callbackUrl: "/" }); },
            danger: true,
          },
        ]}
      />
    );
  }

  /* No orgs (data model not provisioned yet, or schema absent on a
     fresh DB): render nothing rather than an empty switcher. Account
     actions remain accessible via the page-level user menu when that
     edge case lands; for shipped users (auto-org from AR-249) this
     branch is unreachable. */
  if (orgs.length === 0) return null;

  const active = orgs.find((o) => o.id === activeId) ?? orgs[0];
  const activeLabel = active.display_name || active.name;

  /* Build the two-section dropdown. Switch-organisation rows first,
     then a divider + Account section (email display, Settings, Help,
     Sign out). Sign out is marked danger so the DropdownMenu renders
     it in status red. */
  const items: DropdownEntry[] = [
    ...orgs.map((o) => ({
      label: o.display_name || o.name,
      onClick: () => switchTo(o.id),
      icon: (
        <span className="oga-org-switcher__item-avatar" aria-hidden>
          {avatarLetter(o)}
        </span>
      ),
      shortcut: roleLabel(o.role),
    })),
    /* AR-285: "+ New organisation" — opens the create modal. Plus-
       glyph icon distinguishes it from real org rows; pressing it
       closes the dropdown via DropdownMenu's onClick contract and
       hands off to the controlled modal state. */
    {
      label: "New organisation",
      onClick: () => setCreateOpen(true),
      icon: (
        <span className="oga-org-switcher__item-avatar oga-org-switcher__item-avatar--add" aria-hidden>
          +
        </span>
      ),
    },
    { divider: true as const, label: "Account" },
    ...(userEmail
      ? [
          {
            label: userEmail,
            onClick: () => {
              /* No-op, the email row is display-only. */
            },
            disabled: true,
          },
        ]
      : []),
    {
      label: "Settings",
      onClick: () => router.push("/settings"),
    },
    {
      label: "Help",
      onClick: () => router.push("/help"),
    },
    {
      label: "Sign out",
      onClick: () => {
        signOut({ callbackUrl: "/" });
      },
      danger: true,
    },
  ];

  return (
    <>
      <DropdownMenu
        header="Switch organisation"
        align="start"
        triggerLabel={`Switch organisation — currently ${activeLabel}`}
        triggerClassName="oga-org-switcher__trigger"
        trigger={
          <span className="oga-org-switcher__trigger-row">
            <span className="oga-org-switcher__avatar" aria-hidden>
              {avatarLetter(active)}
            </span>
            <span className="oga-org-switcher__labels">
              <span className="oga-org-switcher__name">{activeLabel}</span>
              <span className="oga-org-switcher__role">{roleLabel(active.role)}</span>
            </span>
            <span className="oga-org-switcher__chevron" aria-hidden>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 4l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        }
        items={items}
      />
      <CreateOrgModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />
    </>
  );
}

function avatarLetter(o: OrgSummary): string {
  const source = o.display_name || o.name || o.slug || "?";
  return source.charAt(0).toUpperCase();
}

function roleLabel(role: OrgRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
  }
}

/* ── Create-org modal (AR-285) ─────────────────────────────────────

   Two fields: name (required) + slug (optional override). Slug shows
   a live preview derived from the name so a user can see what the
   server will pick. POST /api/orgs returns the created row + the
   caller's role; the parent OrgSwitcher then refreshes the list and
   promotes the new org to active. */

const SLUG_REGEX = /^[a-z0-9-]{2,60}$/;

function slugifyPreview(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function CreateOrgModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (newId: string) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Reset state every time the modal re-opens so a previously-typed
     name doesn't linger after a cancel. The setState chain is bounded
     (4 fields, no cascading derived state) so the rule's
     "cascading renders" concern doesn't apply. */
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("");
      setSlug("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const derivedSlug = slug.trim().length > 0 ? slug : slugifyPreview(name);
  const slugInvalid = slug.trim().length > 0 && !SLUG_REGEX.test(slug);
  const nameInvalid = name.trim().length === 0 || name.length > 200;
  const canSubmit = !submitting && !nameInvalid && !slugInvalid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = { name: name.trim() };
      if (slug.trim().length > 0) body.slug = slug.trim();
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => null)) as
        | { org?: { id: string }; error?: string; code?: string }
        | null;
      if (res.status === 409) {
        setError("That slug is already taken. Try a different one.");
        return;
      }
      if (!res.ok || !payload?.org?.id) {
        setError(payload?.error ?? `Couldn't create (HTTP ${res.status}).`);
        return;
      }
      await onCreated(payload.org.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New organisation"
      size="sm"
      footer={
        <div className="oga-org-create__actions">
          <button
            type="button"
            className="oga-org-create__btn oga-org-create__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="oga-org-create-form"
            className="oga-org-create__btn oga-org-create__btn--ink"
            disabled={!canSubmit}
          >
            {submitting ? "Creating…" : "Create organisation"}
          </button>
        </div>
      }
    >
      <form id="oga-org-create-form" onSubmit={submit} className="oga-org-create">
        <p className="oga-org-create__intro">
          You become the owner. You can change the name, slug, branding,
          and logo later from{" "}
          <span className="oga-org-create__inline">Organisation</span>{" "}
          in the dashboard.
        </p>

        <label className="oga-org-create__field">
          <span className="oga-org-create__label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Property"
            maxLength={200}
            autoFocus
            className="oga-org-create__input"
            required
          />
          {nameInvalid && name.length > 0 ? (
            <span className="oga-org-create__hint oga-org-create__hint--err">
              Name must be 1-200 characters.
            </span>
          ) : (
            <span className="oga-org-create__hint">
              The canonical record name. Shown in the dashboard chrome.
            </span>
          )}
        </label>

        <label className="oga-org-create__field">
          <span className="oga-org-create__label">Slug (optional)</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={derivedSlug || "acme-property"}
            maxLength={60}
            className="oga-org-create__input oga-org-create__input--mono"
          />
          {slugInvalid ? (
            <span className="oga-org-create__hint oga-org-create__hint--err">
              Slug must be 2-60 chars: lowercase letters, digits, hyphens.
            </span>
          ) : (
            <span className="oga-org-create__hint">
              URL identifier. Leave empty to derive from the name
              ({derivedSlug ? <code>{derivedSlug}</code> : "auto"}).
            </span>
          )}
        </label>

        {error ? <p className="oga-org-create__error">{error}</p> : null}
      </form>
    </Modal>
  );
}
