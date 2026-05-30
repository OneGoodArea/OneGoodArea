/* Product icons — 4 bespoke dot-composed diagrams in the Plotted
   vocabulary. Each icon is a miniature illustration of the product's
   value prop, not a generic glyph:

   - Signals: a field of measured points (5x5 scatter with selected
     dots emphasized — "many normalized signals, some surfaced")
   - Scores: many inputs converging to a single apex ("composition
     into one number"; hairlines from inputs to the apex)
   - Monitor: a time-series wave along a horizontal axis with one
     dot off-wave + a deviation indicator ("tracking over time,
     watching for material change")
   - Intelligence: a query graph with traversal — multiple nodes,
     connecting hairlines forming a path, one terminal dot enlarged
     ("queries traverse signals, arriving at a result")

   Every shape is dot-and-hairline only — same vocabulary as the
   29-dot brand mark + .oga-rule-mark divider + .oga-bg-dots motif.
   currentColor everywhere so they invert on dark surfaces.

   viewBox 32x32 (was 24); cards size them at 36–44px for presence.
   AR-204 PR 1 v2. */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 32,
  height: 32,
  viewBox: "0 0 32 32",
  fill: "none",
  "aria-hidden": true,
};

/* ---------- Signals ----------
   5×5 dot scatter (25 dots). 7 of them are emphasized (larger radius)
   forming an asymmetric constellation — reads as "many normalized
   signals with some surfaced." Small dots r=1.0, large dots r=1.8. */
export function SignalsIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <g fill="currentColor">
        {/* Base 5x5 scatter at low opacity for ambient field */}
        <g opacity="0.42">
          <circle cx="5"  cy="5"  r="1" />
          <circle cx="11" cy="5"  r="1" />
          <circle cx="21" cy="5"  r="1" />
          <circle cx="27" cy="5"  r="1" />
          <circle cx="5"  cy="11" r="1" />
          <circle cx="21" cy="11" r="1" />
          <circle cx="5"  cy="16" r="1" />
          <circle cx="27" cy="16" r="1" />
          <circle cx="11" cy="21" r="1" />
          <circle cx="21" cy="21" r="1" />
          <circle cx="27" cy="21" r="1" />
          <circle cx="5"  cy="27" r="1" />
          <circle cx="11" cy="27" r="1" />
          <circle cx="21" cy="27" r="1" />
        </g>
        {/* Surfaced signals — full opacity, larger */}
        <circle cx="16" cy="5"  r="1.6" />
        <circle cx="11" cy="11" r="1.6" />
        <circle cx="27" cy="11" r="1.6" />
        <circle cx="16" cy="16" r="2.2" />
        <circle cx="11" cy="21" r="1.6" />
        <circle cx="5"  cy="21" r="1.6" />
        <circle cx="16" cy="27" r="1.6" />
        <circle cx="27" cy="27" r="1.6" />
      </g>
    </svg>
  );
}

/* ---------- Scores ----------
   Six inputs (small dots arranged along the bottom + sides) converge
   via hairlines to one enlarged apex dot at the top — visual of
   "many inputs composing into one number." Hairlines at 0.32 opacity
   so dots dominate; apex dot r=2.4 vs inputs r=1.2. */
export function ScoresIcon(props: IconProps) {
  const apex = { x: 16, y: 5 };
  const inputs = [
    { x: 4,  y: 26 },
    { x: 9,  y: 28 },
    { x: 14, y: 27 },
    { x: 18, y: 27 },
    { x: 23, y: 28 },
    { x: 28, y: 26 },
  ];
  return (
    <svg {...baseProps} {...props}>
      <g stroke="currentColor" strokeOpacity="0.32" strokeWidth="0.7">
        {inputs.map((p, i) => (
          <line key={i} x1={p.x} y1={p.y} x2={apex.x} y2={apex.y} />
        ))}
      </g>
      <g fill="currentColor">
        {inputs.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.2" />
        ))}
        <circle cx={apex.x} cy={apex.y} r="2.4" />
      </g>
    </svg>
  );
}

/* ---------- Monitor ----------
   Horizontal axis line (the time-series) with 7 dots forming a wave.
   One dot is OFF the wave (the material change) + a small vertical
   tick indicator below it — visual of "tracking over time, watching
   for a delta." Axis at 0.4 opacity, wave dots at full, off-wave
   dot enlarged. */
export function MonitorIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Time axis */}
      <line x1="2" y1="24" x2="30" y2="24" stroke="currentColor" strokeOpacity="0.32" strokeWidth="0.7" />
      {/* Wave dots (typical pattern) */}
      <g fill="currentColor">
        <circle cx="4"  cy="20" r="1.3" />
        <circle cx="9"  cy="16" r="1.3" />
        <circle cx="14" cy="13" r="1.3" />
        <circle cx="19" cy="17" r="1.3" />
        {/* Off-wave dot — the material change. Larger + with a ring */}
        <circle cx="22" cy="6"  r="2.2" />
        <circle cx="22" cy="6"  r="3.6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="0.6" />
        <circle cx="27" cy="14" r="1.3" />
      </g>
      {/* Vertical tick under the change point — links the dot to the axis */}
      <line x1="22" y1="11" x2="22" y2="22" stroke="currentColor" strokeOpacity="0.30" strokeWidth="0.6" strokeDasharray="1 1.5" />
    </svg>
  );
}

/* ---------- Intelligence ----------
   Query graph: a starting node (top-left), hairlines traversing
   through 3 intermediate nodes, terminating at a larger result node
   (bottom-right). Other ambient nodes sit unconnected to suggest
   "the universe is queryable; you traversed THIS path." */
export function IntelligenceIcon(props: IconProps) {
  const start  = { x: 5,  y: 7  };
  const mid1   = { x: 14, y: 11 };
  const mid2   = { x: 11, y: 21 };
  const mid3   = { x: 21, y: 17 };
  const result = { x: 27, y: 26 };
  const ambient = [
    { x: 26, y: 8  },
    { x: 5,  y: 17 },
    { x: 17, y: 27 },
  ];
  return (
    <svg {...baseProps} {...props}>
      {/* Ambient unconnected nodes */}
      <g fill="currentColor" opacity="0.38">
        {ambient.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.0" />
        ))}
      </g>
      {/* Query traversal — hairlines connecting the path */}
      <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="0.7" fill="none">
        <line x1={start.x}  y1={start.y}  x2={mid1.x} y2={mid1.y} />
        <line x1={mid1.x}   y1={mid1.y}   x2={mid2.x} y2={mid2.y} />
        <line x1={mid2.x}   y1={mid2.y}   x2={mid3.x} y2={mid3.y} />
        <line x1={mid3.x}   y1={mid3.y}   x2={result.x} y2={result.y} />
      </g>
      {/* Path nodes */}
      <g fill="currentColor">
        <circle cx={start.x}  cy={start.y}  r="1.4" />
        <circle cx={mid1.x}   cy={mid1.y}   r="1.4" />
        <circle cx={mid2.x}   cy={mid2.y}   r="1.4" />
        <circle cx={mid3.x}   cy={mid3.y}   r="1.4" />
        {/* Result — enlarged, with a halo ring */}
        <circle cx={result.x} cy={result.y} r="2.4" />
        <circle cx={result.x} cy={result.y} r="3.8" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

export const PRODUCT_ICONS = {
  signals: SignalsIcon,
  scores: ScoresIcon,
  monitor: MonitorIcon,
  intelligence: IntelligenceIcon,
} as const;
