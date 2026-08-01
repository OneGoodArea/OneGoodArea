/* ICP icons - 5 bespoke dot-and-hairline diagrams in the Plotted
   vocabulary, same approach as product-icons.tsx and docs-icons.tsx.
   Each is a miniature illustration of what we do for that buyer, not a
   generic glyph:

   - PropTech: a location pin surrounded by area-context dots ("area
     context attached to a place").
   - Lenders: a sealed score above a versioned register bar ("a
     stamped, pinned, defensible number").
   - Insurers: a portfolio cluster with one node drifted off + halo
     ("a book, one area moved materially").
   - CRE: a descending ranked path pulled from an ambient universe
     ("rank the field, surface a shortlist").
   - Public Sector: a figure cited to sources, written to a record line
     ("sourced, dated, on the record").

   Dot-and-hairline only - same vocabulary as the brand mark. 24x24
   viewBox; the nav dropdown sizes them ~20px. currentColor everywhere
   so they invert on dark surfaces. */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
};

/* ---------- PropTech - location pin + area context ---------- */
export function ProptechIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Ambient area-context dots around the location */}
      <g fill="currentColor" opacity="0.45">
        <circle cx="5"  cy="7"  r="1.0" />
        <circle cx="19" cy="7"  r="1.0" />
        <circle cx="5"  cy="16" r="1.0" />
        <circle cx="19" cy="16" r="1.0" />
      </g>
      {/* Pin stem */}
      <line x1="12" y1="10.5" x2="12" y2="18" stroke="currentColor" strokeWidth="1.0" strokeOpacity="0.55" strokeLinecap="round" />
      <g fill="currentColor">
        {/* Pin head + halo */}
        <circle cx="12" cy="8.5" r="2.1" />
        <circle cx="12" cy="8.5" r="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6" />
        {/* Pin base */}
        <circle cx="12" cy="19" r="1.0" />
      </g>
    </svg>
  );
}

/* ---------- Lenders - sealed score over a versioned register ---------- */
export function LendersIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Version register bar + ticks */}
      <line x1="6.5" y1="17.5" x2="17.5" y2="17.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <g fill="currentColor" opacity="0.5">
        <circle cx="9"  cy="20" r="0.85" />
        <circle cx="12" cy="20" r="0.85" />
        <circle cx="15" cy="20" r="0.85" />
      </g>
      {/* Anchor from the score to the register */}
      <line x1="12" y1="11.5" x2="12" y2="16" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.35" strokeDasharray="1 1.6" />
      {/* The sealed score */}
      <g fill="currentColor">
        <circle cx="12" cy="9" r="2.2" />
        <circle cx="12" cy="9" r="3.6" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

/* ---------- Insurers - portfolio cluster with a drifted node ---------- */
export function InsuranceIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Direction of the material move */}
      <line x1="15.5" y1="10" x2="18" y2="7" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" strokeLinecap="round" />
      <g fill="currentColor">
        {/* Insured book cluster */}
        <circle cx="6"  cy="10" r="1.2" />
        <circle cx="11" cy="8"  r="1.2" />
        <circle cx="7"  cy="15" r="1.2" />
        <circle cx="12" cy="14" r="1.2" />
        <circle cx="15" cy="11" r="1.2" />
        {/* The material move: drifted + halo */}
        <circle cx="19" cy="6" r="2.0" />
        <circle cx="19" cy="6" r="3.3" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

/* ---------- CRE - ranked shortlist from an ambient universe ---------- */
export function CreIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* The universe of candidates */}
      <g fill="currentColor" opacity="0.3">
        <circle cx="6"  cy="6"  r="0.9" />
        <circle cx="17" cy="5"  r="0.9" />
        <circle cx="21" cy="10" r="0.9" />
        <circle cx="5"  cy="13" r="0.9" />
        <circle cx="9"  cy="20" r="0.9" />
        <circle cx="20" cy="19" r="0.9" />
      </g>
      {/* The ranked path */}
      <g stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round">
        <line x1="6"  y1="8"  x2="12" y2="12" />
        <line x1="12" y1="12" x2="18" y2="16" />
      </g>
      <g fill="currentColor">
        {/* Rank 1, emphasized */}
        <circle cx="6"  cy="8"  r="2.0" />
        <circle cx="6"  cy="8"  r="3.3" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.6" />
        <circle cx="12" cy="12" r="1.3" />
        <circle cx="18" cy="16" r="1.3" />
      </g>
    </svg>
  );
}

/* ---------- Public Sector - a figure cited to sources, on the record ---------- */
export function PublicSectorIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Citations from sources into the figure */}
      <g stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.45" strokeLinecap="round">
        <line x1="5"  y1="6"    x2="11" y2="9"    />
        <line x1="19" y1="6"    x2="13" y2="9"    />
        <line x1="5"  y1="12.5" x2="11" y2="10.5" />
      </g>
      <g fill="currentColor" opacity="0.55">
        <circle cx="5"  cy="6"    r="1.0" />
        <circle cx="19" cy="6"    r="1.0" />
        <circle cx="5"  cy="12.5" r="1.0" />
      </g>
      {/* The published figure */}
      <g fill="currentColor">
        <circle cx="12" cy="10" r="2.0" />
        <circle cx="12" cy="10" r="3.3" fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6" />
      </g>
      {/* The record / FOI line */}
      <circle cx="6" cy="19" r="0.9" fill="currentColor" opacity="0.6" />
      <line x1="9" y1="19" x2="18" y2="19" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

export const ICP_ICONS = {
  proptech: ProptechIcon,
  lenders: LendersIcon,
  insurance: InsuranceIcon,
  cre: CreIcon,
  "public-sector": PublicSectorIcon,
} as const;
