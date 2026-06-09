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

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  type DropdownEntry,
} from "./dropdown-menu";
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

  /* Fetch + initial active-org resolution. localStorage holds the
     last-chosen org if any; falls back to the first org in the list
     (oldest member-of, per the API's ORDER BY created_at ASC). */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/orgs", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { orgs: OrgSummary[] };
        if (cancelled) return;
        setOrgs(data.orgs);
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
        /* Network error: render the placeholder. */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function switchTo(orgId: string) {
    setActiveId(orgId);
    try {
      window.localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    } catch {
      /* private mode / disabled storage */
    }
  }

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
