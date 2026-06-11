import type { ReactNode } from "react";
import type { SignalCategory } from "@onegoodarea/contracts";

/* AR-276: shared category glyphs.

   Lifted verbatim from dashboard-signals/client.tsx (AR-259) so the
   /dashboard/org/presets weights table can render the same icons next
   to each dimension as the signals catalogue does for its 7 categories.
   Same brand vocabulary: 22x22 in a 24x24 viewBox, currentColor strokes
   1.4-1.6px, dot-and-line geometric without decorative flourishes.

   Adding a new SignalCategory? Add a row here and every consumer picks
   it up. */

export const CATEGORY_GLYPH: Record<SignalCategory, () => ReactNode> = {
  crime: () => (
    /* Crosshair + emphasised centre dot: a single observed
       incident on a watch grid. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  ),
  deprivation: () => (
    /* Stepped bars rising left to right: deciles 1-10 collapsed
       into a 4-step indicator. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3"  y="16" width="3" height="5"  fill="currentColor" />
      <rect x="8"  y="13" width="3" height="8"  fill="currentColor" />
      <rect x="13" y="9"  width="3" height="12" fill="currentColor" />
      <rect x="18" y="4"  width="3" height="17" fill="currentColor" />
    </svg>
  ),
  property: () => (
    /* House silhouette: roof triangle + body rectangle. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 11L12 4l9 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="5.5"
        y="10"
        width="13"
        height="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="10.5" y="14" width="3" height="6" fill="currentColor" />
    </svg>
  ),
  schools: () => (
    /* Pediment + columns: institutional silhouette. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8L12 3l9 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 21h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 9v12M9 9v12M15 9v12M19 9v12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  ),
  amenities: () => (
    /* Three loose clusters of dots: density of nearby POIs. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <g fill="currentColor">
        <circle cx="5"  cy="5"  r="1.4" />
        <circle cx="8"  cy="4"  r="1.4" />
        <circle cx="6"  cy="8"  r="1.4" />
        <circle cx="18" cy="16" r="1.4" />
        <circle cx="20" cy="19" r="1.4" />
        <circle cx="16" cy="19" r="1.4" />
        <circle cx="17" cy="6"  r="1.4" />
        <circle cx="20" cy="9"  r="1.4" />
        <circle cx="17" cy="10" r="1.4" />
        <circle cx="5"  cy="17" r="1.4" />
        <circle cx="7"  cy="20" r="1.4" />
      </g>
    </svg>
  ),
  transport: () => (
    /* Horizontal route with two stops: a line connecting two
       circles. Reads as a transit segment. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="7"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="var(--oga-bg-warm, #FAF8F4)"
      />
      <circle
        cx="17"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="var(--oga-bg-warm, #FAF8F4)"
      />
      <circle cx="7"  cy="12" r="1"   fill="currentColor" />
      <circle cx="17" cy="12" r="1"   fill="currentColor" />
    </svg>
  ),
  environment: () => (
    /* Three stacked wave lines: water / flood domain. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 7c2.5-2 5-2 7.5 0S14.5 9 17 7s5-2 5-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 13c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 19c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};
