import type { ReactNode } from "react";

/* AR-264 Intelligence op glyphs.

   One glyph per /v1/query op. Same brand vocabulary as CATEGORY_GLYPH
   (22x22 in a 24x24 viewBox, currentColor strokes 1.4-1.6px,
   dot-and-line geometric, no decorative flourishes). Each glyph
   reads as what the op DOES, not what its category sounds like:

   - rank_areas    -> a vertical sort: stacked rows of decreasing length
   - get_area      -> a single area in focus: concentric rings on a point
   - compare_areas -> two columns side-by-side with a divider
   - score_area    -> a composite gauge: weighted arcs summing to a hub
   - find_peers    -> a target node with satellites: k-NN traversal
   - find_insights -> a bell curve with one outlier dot in the tail
   - find_forecast -> a sparkline observed-then-projected (solid -> dashed)

   The 7 union covers every op in the QueryPlanSchema today. Adding a
   new op = adding a glyph here + a catalogue entry; the dashboard
   picks it up unchanged. */

export type IntelligenceOp =
  | "rank_areas"
  | "get_area"
  | "compare_areas"
  | "score_area"
  | "find_peers"
  | "find_insights"
  | "find_forecast";

export const OP_GLYPH: Record<IntelligenceOp, () => ReactNode> = {
  rank_areas: () => (
    /* Five horizontal bars descending in length: a sorted list. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4"  width="18" height="2.4" fill="currentColor" />
      <rect x="3" y="8"  width="14" height="2.4" fill="currentColor" />
      <rect x="3" y="12" width="10" height="2.4" fill="currentColor" />
      <rect x="3" y="16" width="6"  height="2.4" fill="currentColor" />
      <rect x="3" y="20" width="3"  height="2.4" fill="currentColor" />
    </svg>
  ),
  get_area: () => (
    /* Concentric rings around a centre dot: zoom-in on one area. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.4" opacity="0.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  ),
  compare_areas: () => (
    /* Two stacked-bar columns with a hairline divider between them:
       two areas, side by side, same axes. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3"  y="13" width="3.5" height="8" fill="currentColor" />
      <rect x="7"  y="8"  width="3.5" height="13" fill="currentColor" />
      <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.2" opacity="0.4" strokeDasharray="2 2" />
      <rect x="13.5" y="10" width="3.5" height="11" fill="currentColor" />
      <rect x="17.5" y="14" width="3.5" height="7"  fill="currentColor" />
    </svg>
  ),
  score_area: () => (
    /* Three-quarter gauge arc with a centre hub: composite reading. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 16A9 9 0 1 1 20 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 14A4.5 4.5 0 0 1 15 14"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="12" cy="14" r="2" fill="currentColor" />
      <line x1="12" y1="14" x2="17" y2="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  find_peers: () => (
    /* Centre target node with four satellite peers connected by hairlines:
       k-NN over normalised signals. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <g stroke="currentColor" strokeWidth="0.8" opacity="0.5">
        <line x1="12" y1="12" x2="5"  y2="6"  />
        <line x1="12" y1="12" x2="19" y2="6"  />
        <line x1="12" y1="12" x2="5"  y2="18" />
        <line x1="12" y1="12" x2="19" y2="18" />
      </g>
      <g fill="currentColor">
        <circle cx="5"  cy="6"  r="1.6" />
        <circle cx="19" cy="6"  r="1.6" />
        <circle cx="5"  cy="18" r="1.6" />
        <circle cx="19" cy="18" r="1.6" />
      </g>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" fill="var(--oga-bg-warm, #FAF8F4)" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  ),
  find_insights: () => (
    /* Bell curve with one outlier dot in the right tail: anomaly
       screening by |z|. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 19c2.5 0 4-9 6.5-9S11 19 13 19s2.5-9 5-9 1.5 4 4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="20.5" cy="6" r="1.8" fill="currentColor" />
    </svg>
  ),
  find_forecast: () => (
    /* Sparkline: a solid observed segment then a dashed projection
       continuing up-right. The dot marks the latest observed period. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 17l3-3 3 1 3-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M12 11l3-3 3 0 3-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 2"
        fill="none"
      />
      <circle cx="12" cy="11" r="1.8" fill="currentColor" />
    </svg>
  ),
};
