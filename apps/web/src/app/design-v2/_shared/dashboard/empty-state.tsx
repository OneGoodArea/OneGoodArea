/* AR-238 (Dashboard redesign Epic AR-217 — Phase 0.5): generic empty-state primitive.

   Every list page in the dashboard surfaces a bespoke empty state
   rather than a generic "no results" placeholder: Members list,
   Bundles, Presets, Cohorts, Portfolios, Activity feed, Webhooks,
   Signals results, IP allowlist. 8+ planned consumers.

   Composition model:
   - Vertical stack: optional icon → title → optional body → optional
     primary action + optional secondary action
   - Surface variants: light (warm-white gradient matching .oga-code-panel)
     or dark (graphite gradient matching .oga-data-table[data-surface=
     "dark"] + .oga-sidebar)
   - Composes BOTH standalone (full page) AND inside other primitives
     (DataTable's emptyState prop)
   - Actions accept href (renders <Link>) OR onClick (renders <button>)
     so the same primitive serves navigation-shaped CTAs ("Invite member")
     and command-shaped CTAs ("Create new preset" → opens modal)

   Brand v3 altitude — editorial restraint. Centered text, mono caps
   title in 0.14em letter-spacing (matches the DataTable header recipe),
   restrained body text, primary + secondary buttons inherit the
   .oga-btn family. Optional icon slot accepts canonical icons
   (NavIconDark / AiqIcon / product-icons) — NEVER invent inline glyphs
   here. [[feedback-icons-and-canonical-assets]] */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import "./empty-state.css";

/* ============================================================
   Types
   ============================================================ */

export interface EmptyStateAction {
  /** Button / link label. */
  label: string;
  /** If provided, renders as a <Link>. */
  href?: string;
  /** If provided, renders as a <button>. */
  onClick?: () => void;
}

export interface EmptyStateProps {
  /** Optional icon slot at the top. Pass a canonical icon from
      _shared/icons.tsx / _shared/product-icons.tsx / app-shell's
      NavIconDark — never invent inline glyphs. */
  icon?: ReactNode;
  /** Short headline. Mono caps treatment. */
  title: string;
  /** Optional supporting line below the title. */
  body?: string;
  /** Optional primary action. Renders as the primary .oga-btn. */
  action?: EmptyStateAction;
  /** Optional secondary action. Renders as the secondary .oga-btn. */
  secondaryAction?: EmptyStateAction;
  /** Surface variant. Defaults to inheriting from data-oga-surface
      ancestor; pass explicitly to override. */
  surface?: "light" | "dark";
}

/* ============================================================
   Component
   ============================================================ */

export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  surface,
}: EmptyStateProps) {
  return (
    <div className="oga-empty-state" data-surface={surface ?? undefined}>
      <div className="oga-empty-state__inner">
        {icon ? (
          <span className="oga-empty-state__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <p className="oga-empty-state__title">{title}</p>
        {body ? <p className="oga-empty-state__body">{body}</p> : null}
        {action || secondaryAction ? (
          <div className="oga-empty-state__actions">
            {action ? <ActionButton action={action} variant="primary" /> : null}
            {secondaryAction ? (
              <ActionButton action={secondaryAction} variant="secondary" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   Action — renders <Link> if href, <button> if onClick
   ============================================================ */

interface ActionButtonProps {
  action: EmptyStateAction;
  variant: "primary" | "secondary";
}

function ActionButton({ action, variant }: ActionButtonProps) {
  const className = variant === "primary"
    ? "oga-btn oga-btn-primary"
    : "oga-btn oga-btn-secondary";

  if (action.href) {
    return (
      <Link href={action.href} className={className} onClick={action.onClick}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}
