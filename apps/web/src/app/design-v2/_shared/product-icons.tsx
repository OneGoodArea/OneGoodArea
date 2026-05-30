/* Product icons — 4 dot-composed SVGs in the Plotted vocabulary.
   Every icon is made of circles + (where needed) thin lines, so each
   product visually reads as "made of signals" — reinforcing the
   signal-first thesis on every nav glance.

   Uses currentColor on fills + strokes so the icons invert on dark
   surfaces automatically. 24x24 viewBox; size via the parent's
   font-size or explicit width/height.

   AR-204 PR 1. */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true,
};

/* Signals — 3x3 dot matrix, center slightly larger. "Many measured,
   normalized signals." */
export function SignalsIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="5"  cy="5"  r="1.4" />
      <circle cx="12" cy="5"  r="1.4" />
      <circle cx="19" cy="5"  r="1.4" />
      <circle cx="5"  cy="12" r="1.4" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="19" cy="12" r="1.4" />
      <circle cx="5"  cy="19" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
      <circle cx="19" cy="19" r="1.4" />
    </svg>
  );
}

/* Scores — 5 dots ascending diagonally with a larger terminus.
   "Composition into a single number." */
export function ScoresIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="4"  cy="20" r="1.3" />
      <circle cx="9"  cy="16" r="1.4" />
      <circle cx="13" cy="12" r="1.5" />
      <circle cx="17" cy="8"  r="1.7" />
      <circle cx="21" cy="4"  r="2.4" />
    </svg>
  );
}

/* Monitor — sine-wave of dots across the X axis, one slightly larger
   (the "alert"). "Time-series rhythm; watch it move." */
export function MonitorIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="3"  cy="12" r="1.3" />
      <circle cx="7"  cy="7"  r="1.4" />
      <circle cx="11" cy="12" r="1.4" />
      <circle cx="15" cy="17" r="2.1" />
      <circle cx="19" cy="12" r="1.4" />
      <circle cx="21" cy="9"  r="1.2" />
    </svg>
  );
}

/* Intelligence — hub-and-spoke: 1 central node + 4 satellites
   connected by hairline edges. "Queries traverse signals." */
export function IntelligenceIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <line x1="6"  y1="6"  x2="12" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      <line x1="18" y1="6"  x2="12" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      <line x1="6"  y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      <line x1="18" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.45" />
      <circle cx="6"  cy="6"  r="1.4" />
      <circle cx="18" cy="6"  r="1.4" />
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="6"  cy="18" r="1.4" />
      <circle cx="18" cy="18" r="1.4" />
    </svg>
  );
}

export const PRODUCT_ICONS = {
  signals: SignalsIcon,
  scores: ScoresIcon,
  monitor: MonitorIcon,
  intelligence: IntelligenceIcon,
} as const;
