/* AR-233 (Dashboard redesign Epic AR-217): generic dashboard sidebar primitive.

   Extracted from AppShell — the sidebar markup was inlined there.
   Phase 0 closes this out as a reusable primitive so Phase 1 can
   reorganize the sidebar content (4 sections + org switcher + RBAC
   visibility) without touching the chrome.

   Composition model:
   - Sidebar owns: the dark surface, mobile drawer behaviour
     (Escape key, body scroll lock, backdrop), sections rendering.
   - Consumer owns: open state (controlled — same pattern as <Modal>),
     the sections array (icons + labels + active state computed via
     usePathname), the top slot (org switcher, wordmark + close),
     the bottom slot (theme toggle, user chip).

   Why slots instead of baking org switcher / user chip into the
   primitive: these things change shape per page / per consumer
   (sidebar, public marketing wordmark, in-modal sidebar, etc.).
   Keeping the primitive concerned only with structure + drawer
   behaviour means it composes cleanly with future variations.

   Items support optional nested children (depth 2 max per Jira).
   The current AppShell doesn't use nesting, but Phase 1's "Org &
   Levers" group has a Settings sub-tree planned.

   Brand v3 altitude: dark surface (data-oga-surface="dark") with
   warm-white text + soft-warm hover signature matching the rest of
   the dashboard primitives. Hairline-only separation between groups.

   Out of scope (per Jira):
   - Reorganizing actual sidebar content (Phase 1 AR-217-B1)
   - Collapsed-but-pinned variant (current AppShell already collapsible
     to drawer; pinning is a Phase 1+ feature) */

"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import "./sidebar.css";

/* ============================================================
   Types
   ============================================================ */

export interface SidebarItem {
  /** Display label. */
  label: string;
  /** Destination href. Rendered via next/link. */
  href: string;
  /** Optional 16px leading icon. ReactNode so consumers wire their
      own glyphs (the existing dashboard uses NavIconDark per IconName;
      future surfaces may use different sets). */
  icon?: ReactNode;
  /** Active state. Consumer computes — typically by comparing
      next/navigation usePathname() against href. The primitive does
      NOT call usePathname so it stays framework-route-agnostic at
      this level. */
  active?: boolean;
  /** Optional trailing badge (count, NEW, status). */
  badge?: ReactNode;
  /** Optional nested children. Renders as an indented sub-list under
      this item. Depth 2 max — children's children are ignored. */
  children?: SidebarItem[];
}

export interface SidebarSection {
  /** Mono-caps group label rendered above the section's items. */
  label: string;
  /** Items in the section. Render order is preserved. */
  items: SidebarItem[];
}

export interface SidebarProps {
  /** Sections in render order. */
  sections: SidebarSection[];
  /** Slot rendered at the top of the sidebar — typically the wordmark
      + close button on mobile, later the org switcher. */
  top?: ReactNode;
  /** Slot rendered at the bottom — theme toggle, user chip. */
  bottom?: ReactNode;
  /** Controls mobile drawer visibility. Desktop layouts ignore this
      (the sidebar is always visible as a sticky left column). */
  open?: boolean;
  /** Fired when the user dismisses the drawer (Escape, backdrop click,
      or clicking a nav item — consumers wire their own dismissal). */
  onClose?: () => void;
  /** AR-252: desktop icon-only collapse. When true the sidebar shrinks
      to ~60px showing icons only — labels, group eyebrows, and the
      verbose top/bottom slot contents collapse. Mobile (≤880px) ignores
      this and uses the drawer behaviour instead. Consumer manages
      state + persistence (typically localStorage). */
  collapsed?: boolean;
  /** Toggles desktop collapse — wires the floor-of-the-sidebar button
      to the consumer's setState + persistence. Omit to hide the
      toggle entirely (some surfaces don't want collapse). */
  onToggleCollapsed?: () => void;
  /** Accessible label for the <aside>. Defaults to "Sidebar
      navigation". */
  "aria-label"?: string;
}

/* ============================================================
   Component
   ============================================================ */

export function Sidebar({
  sections,
  top,
  bottom,
  open = false,
  onClose,
  collapsed = false,
  onToggleCollapsed,
  "aria-label": ariaLabel = "Sidebar navigation",
}: SidebarProps) {
  /* Mobile drawer behaviour:
     - Escape closes the drawer
     - Body scroll locks while open
     Both lifted from the previous AppShell implementation. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const classes = ["oga-sidebar"];
  if (open) classes.push("oga-sidebar--open");
  if (collapsed) classes.push("oga-sidebar--collapsed");

  return (
    <>
      {open ? (
        <div
          className="oga-sidebar__backdrop"
          onClick={onClose}
          aria-hidden
        />
      ) : null}
      <aside
        className={classes.join(" ")}
        data-oga-surface="dark"
        data-collapsed={collapsed ? "true" : "false"}
        aria-label={ariaLabel}
      >
        {top ? <div className="oga-sidebar__top">{top}</div> : null}

        <nav className="oga-sidebar__body">
          {sections.map((section, sectionIdx) => (
            <SidebarGroup
              key={`${section.label}-${sectionIdx}`}
              section={section}
              onItemClick={onClose}
            />
          ))}
          <div className="oga-sidebar__spacer" />
        </nav>

        {bottom ? <div className="oga-sidebar__bottom">{bottom}</div> : null}

        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="oga-sidebar__collapse-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              {/* Chevron pointing right when collapsed (= "expand"),
                  left when expanded (= "collapse"). */}
              <path
                d={collapsed ? "M5 3 L9 7 L5 11" : "M9 3 L5 7 L9 11"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </aside>
    </>
  );
}

/* ============================================================
   Group — labelled section of nav items
   ============================================================ */

interface SidebarGroupProps {
  section: SidebarSection;
  onItemClick?: () => void;
}

function SidebarGroup({ section, onItemClick }: SidebarGroupProps) {
  return (
    <div className="oga-sidebar__group">
      <div className="oga-sidebar__group-label">{section.label}</div>
      <ul className="oga-sidebar__list">
        {section.items.map((item, i) => (
          <li key={`${item.href}-${i}`}>
            <SidebarLink item={item} onClick={onItemClick} />
            {item.children && item.children.length > 0 ? (
              <ul className="oga-sidebar__sublist">
                {item.children.map((child, j) => (
                  <li key={`${child.href}-${j}`}>
                    <SidebarLink item={child} onClick={onItemClick} nested />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Single link — used for top-level + nested items
   ============================================================ */

interface SidebarLinkProps {
  item: SidebarItem;
  onClick?: () => void;
  nested?: boolean;
}

function SidebarLink({ item, onClick, nested }: SidebarLinkProps) {
  const classes = ["oga-sidebar__link"];
  if (item.active) classes.push("oga-sidebar__link--active");
  if (nested) classes.push("oga-sidebar__link--nested");

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={classes.join(" ")}
      aria-current={item.active ? "page" : undefined}
      /* AR-252: native browser tooltip on hover for collapsed mode.
         The custom CSS tooltip fought a chain of overflow contexts
         (.oga-sidebar__body needs overflow-y:auto for long nav, but
         that forces overflow-x to clip too — even with overflow-x:
         visible attempts) and never escaped reliably. title= is
         ugly-by-default but actually works, doesn't break scroll,
         and respects the user's OS-level tooltip preferences. */
      title={item.label}
    >
      {item.icon ? (
        <span aria-hidden className="oga-sidebar__link-icon">
          {item.icon}
        </span>
      ) : null}
      <span className="oga-sidebar__link-label">{item.label}</span>
      {item.badge ? (
        <span className="oga-sidebar__link-badge">{item.badge}</span>
      ) : null}
    </Link>
  );
}
