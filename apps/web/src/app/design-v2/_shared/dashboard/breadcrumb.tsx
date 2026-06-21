/* AR-243 (Dashboard redesign Epic AR-217 — Phase 0.5): breadcrumb navigation primitive.

   Used by the Levers settings sub-pages + Monitor + Settings nested
   routes — anywhere the dashboard goes more than one level deep.

   Planned consumers (3+ Phase 4-5):
   - /dashboard/org/members, /bundles, /presets, /cohorts,
     /methodology, /branding, /security — all show
     "Dashboard / Org / Members" etc.
   - /dashboard/monitor/portfolios/[id] — shows
     "Dashboard / Monitor / Portfolios / Acme — High street retail"
   - /dashboard/intelligence/[query-id] — saved-query detail pages

   Composition model:
   - items: BreadcrumbItem[] — array of { label, href? }. Items with
     href render as <Link>; items without (typically the last,
     "current page") render as a plain span with aria-current="page".
   - The consumer computes the chain explicitly — we do NOT
     auto-derive from usePathname. Out of scope per Jira: per-route
     mapping happens in the consumer page where breadcrumb labels
     can be localised + dynamic-state-aware (e.g. portfolio name).
   - Separator defaults to "/" — reads as a path, fits the
     infrastructure-grade editorial vocabulary, distinguishes from
     "→" arrows used for CTAs elsewhere. Consumers can override with
     ReactNode (chevron, dot, custom glyph).

   Brand v3 visual:
   - Mono caps eyebrow at 0.10em letter-spacing — same family as
     .oga-eyebrow + pagination + DataTable headers
   - Soft-warm hover signature on linked items
   - Current page reads in ink (full opacity), parent items at muted
     opacity (so the current page is the visual anchor)
   - Separator at 30% ink opacity — present but not loud
   - Responsive collapse below 640px: middle items hide, ellipsis
     placeholder appears so the chain reads "first / … / current"
   - Light + dark surface variants via data-surface */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import "./breadcrumb.css";

/* ============================================================
   Types
   ============================================================ */

export interface BreadcrumbItem {
  /** Display label (visible text). */
  label: string;
  /** Destination href. If omitted, the item renders as a non-link
      span with aria-current="page" — used for the final "current
      page" entry. Intermediate items typically have an href. */
  href?: string;
  /** Optional leading icon. Pass a canonical icon from the existing
      sets — NavIconDark (dash/map/api/key/billing), product-icons
      (SignalsIcon/ScoresIcon/MonitorIcon/IntelligenceIcon), or the
      Tabs-set bespoke glyphs (MembersIcon/BundlesIcon/etc.) — never
      invent inline glyphs. [[feedback-icons-and-canonical-assets]]
      Resource-name leaf items (portfolio names, saved query titles)
      typically omit the icon since no canonical glyph exists. */
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  /** Chain in order from root → current. The consumer composes
      this explicitly per page (we don't auto-derive from
      usePathname — keeps labels dynamic + localised). */
  items: BreadcrumbItem[];
  /** Separator between items. Defaults to "/". */
  separator?: ReactNode;
  /** Surface variant. Defaults to "light". */
  surface?: "light" | "dark";
  /** Accessible label for the <nav>. Defaults to "Breadcrumb". */
  "aria-label"?: string;
}

/* ============================================================
   Component
   ============================================================ */

export function Breadcrumb({
  items,
  separator = "/",
  surface = "light",
  "aria-label": ariaLabel = "Breadcrumb",
}: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className="oga-breadcrumb"
      data-surface={surface}
      aria-label={ariaLabel}
    >
      <ol className="oga-breadcrumb__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const isFirst = i === 0;
          /* Middle items hide at narrow widths via CSS; flag them
             with a data attribute so the collapse rules can target
             them without :nth-child math. First + last always
             stay visible. */
          const isMiddle = !isFirst && !isLast;

          return (
            <li
              key={`${item.label}-${i}`}
              className="oga-breadcrumb__item"
              data-position={isFirst ? "first" : isLast ? "last" : "middle"}
            >
              {item.href && !isLast ? (
                <Link href={item.href} className="oga-breadcrumb__link">
                  {item.icon ? (
                    <span aria-hidden="true" className="oga-breadcrumb__icon">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className="oga-breadcrumb__current"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon ? (
                    <span aria-hidden="true" className="oga-breadcrumb__icon">
                      {item.icon}
                    </span>
                  ) : null}
                  <span>{item.label}</span>
                </span>
              )}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="oga-breadcrumb__separator"
                  data-after={isMiddle ? "middle" : "regular"}
                >
                  {separator}
                </span>
              ) : null}
            </li>
          );
        })}
        {/* Ellipsis placeholder — only renders visually at narrow
            widths when middle items collapse. Hidden by default,
            displayed via the CSS media query below 640px. */}
        {items.length > 2 ? (
          <li
            className="oga-breadcrumb__ellipsis"
            aria-hidden="true"
          >
            <span className="oga-breadcrumb__ellipsis-glyph">…</span>
            <span className="oga-breadcrumb__separator" data-after="ellipsis">
              {separator}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
