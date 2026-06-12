/* AR-252 [AR-217-B1] Shared canonical glyphs for sidebar / breadcrumb / tabs.

   These six icons originated inline inside
   apps/web/src/app/design-v2/admin/dashboard-primitives/client.tsx
   as the "Tabs-set bespoke" glyphs (AR-228 + AR-243). They got pulled
   out here when the AR-252 sidebar reorg needed to use them in a
   real consumer (the AppShell sidebar nav) — at which point we
   crossed the second-use threshold from the AR-211 extract-on-
   second-use convention, and inline duplication started to look like
   the trap we caught ourselves in around scoring-profiles.

   Vocabulary: 14×14 viewBox, hairline strokes at 1.2-1.3px,
   currentColor everywhere so the consumer controls hue via CSS. Same
   editorial line-art family as NavIconDark (`dash`, `read`, `api`,
   `key`, `billing` — those live in app-shell.tsx) and the product
   icons (Signals / Scores / Monitor / Intelligence — in product-
   icons.tsx). Don't invent new icons; pick from this set, the
   NavIconDark set, the product-icons set, or AiqIcon. See
   [[feedback-icons-and-canonical-assets]]. */

import type { ReactElement } from "react";

export function MembersIcon({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
} = {}): ReactElement {
  /* viewBox stays 14x14 — width/height props scale the rendered glyph
     for product-header use (e.g. width={56}) without re-cutting the
     SVG paths. Default arg lets existing callers (sidebar, sample
     dashboards) keep their no-prop call shape. */
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 11.5c.6-1.7 2-2.7 3.5-2.7s2.9 1 3.5 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 11.5c.4-1.4 1.5-2.2 2.7-2.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function WebhookIcon({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
} = {}): ReactElement {
  /* Mirrors GlyphWebhooks (homepage section 04) at tab scale: source
     node on the left emitting concentric arcs outward to a subscriber
     dot on the right. Compressed from the 3-arc + pulse hero to 2
     arcs + no animation at 14×14. viewBox stays 14x14; width/height
     scale for AR-281 product-header use. */
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="3.5" cy="7" r="1.6" fill="currentColor" />
      <path d="M5.5 4.5a3.2 3.2 0 0 1 0 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7.5 3a5 5 0 0 1 0 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      <circle cx="11" cy="7" r="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function CohortsIcon({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
} = {}): ReactElement {
  /* Three intersecting circles — cohort overlap. viewBox stays 14x14;
     width/height scale for AR-277 product-header use. */
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="9" cy="5" r="2.8" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function BundlesIcon({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
} = {}): ReactElement {
  /* Stack of three layers — same vocabulary the signal-bundles ADR
     uses when it talks about a bundle as a composition of signals.
     viewBox stays 14x14; width/height scale the rendered glyph for
     product-header use (AR-274) without re-cutting the paths. */
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5l5.5 2.5L7 6.5 1.5 4 7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 7L7 9.5 12.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1.5 10L7 12.5 12.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function OrgIcon({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
} = {}): ReactElement {
  /* Institutional silhouette — pediment + 4 columns. Reads as "the
     organisation" (the container of members + bundles + presets etc.).
     Added 2026-06-06 for AR-243 because "Org" appears in breadcrumb
     chains across Phase 4 Levers pages and no canonical glyph
     existed yet; reused here as the Org & Levers sidebar section
     header. AR-284 made it scalable for the /dashboard/org product
     header at 56x56. */
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      {/* Roof / pediment */}
      <path d="M1.5 4.5L7 1.5L12.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Floor line */}
      <path d="M1.5 12.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {/* Columns */}
      <path d="M3 5v7.5M5.5 5v7.5M8.5 5v7.5M11 5v7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function PresetsIcon({
  width = 14,
  height = 14,
}: {
  width?: number;
  height?: number;
} = {}): ReactElement {
  /* Three horizontal sliders with knobs at different positions —
     "tunable weight configuration", which is what a scoring preset
     is (composition of per-dimension weights). viewBox stays 14x14;
     width/height scale for AR-276 product-header use. */
  return (
    <svg width={width} height={height} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="4" cy="3.5" r="1.4" fill="currentColor" />
      <circle cx="9" cy="7" r="1.4" fill="currentColor" />
      <circle cx="6" cy="10.5" r="1.4" fill="currentColor" />
    </svg>
  );
}
