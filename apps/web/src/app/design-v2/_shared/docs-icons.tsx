/* Docs icons — 4 bespoke dot-and-hairline diagrams in the Plotted
   vocabulary, same approach as product-icons.tsx. Each icon is a
   miniature illustration of the doc's value prop:

   - DocsHomeIcon: stacked index — 4 leading dots paired with
     horizontal hairlines of varying widths. Reads "table of
     contents / index of docs." Added AR-355.
   - ApiReferenceIcon: paired braces ({ }) of dots with content dots
     between — the SPEC. Reads "structured contract."
   - McpServerIcon: client cluster on the left, OGA endpoint on the
     right (enlarged + halo ring), thin protocol bridge between with
     a midpoint dot. Reads "client connects via MCP to our server."
   - ChangelogIcon: vertical timeline w/ entry dots + horizontal
     hairlines on the right for each entry's description. Reads
     "release log over time."

   24x24 viewBox; nav docs dropdown sizes them at 18-20px.
   currentColor everywhere — inverts on dark surfaces.
   AR-204 PR 2, extended in AR-355. */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
};

/* ---------- Docs home — stacked index ----------
   Four entry rows. Each row is a leading dot + a horizontal
   hairline of varying width. Reads as a table of contents.
   No vertical timeline (that's ChangelogIcon's vocabulary). */
export function DocsHomeIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <g fill="currentColor">
        <circle cx="4" cy="5"  r="1.0" />
        <circle cx="4" cy="10" r="1.0" />
        <circle cx="4" cy="15" r="1.0" />
        <circle cx="4" cy="20" r="1.0" />
      </g>
      <g stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
        <line x1="8" y1="5"  x2="20" y2="5"  />
        <line x1="8" y1="10" x2="18" y2="10" strokeOpacity="0.75" />
        <line x1="8" y1="15" x2="19" y2="15" strokeOpacity="0.75" />
        <line x1="8" y1="20" x2="16" y2="20" strokeOpacity="0.55" />
      </g>
    </svg>
  );
}

/* ---------- API reference — { content } ----------
   Left + right braces composed of dots that curve in toward the
   middle. Three content dots between them, the center one
   highlighted (the "spec" focal point). */
export function ApiReferenceIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <g fill="currentColor">
        {/* Left brace { */}
        <circle cx="6"  cy="4"  r="0.95" />
        <circle cx="4"  cy="8"  r="0.95" />
        <circle cx="3"  cy="12" r="1.4" />
        <circle cx="4"  cy="16" r="0.95" />
        <circle cx="6"  cy="20" r="0.95" />
        {/* Right brace } */}
        <circle cx="18" cy="4"  r="0.95" />
        <circle cx="20" cy="8"  r="0.95" />
        <circle cx="21" cy="12" r="1.4" />
        <circle cx="20" cy="16" r="0.95" />
        <circle cx="18" cy="20" r="0.95" />
        {/* Content dots */}
        <circle cx="9"  cy="12" r="0.9" opacity="0.55" />
        <circle cx="12" cy="12" r="1.2" />
        <circle cx="15" cy="12" r="0.9" opacity="0.55" />
      </g>
    </svg>
  );
}

/* ---------- MCP server — client → protocol → endpoint ----------
   Left: cluster of 5 client dots (the AI tools using MCP).
   Middle: hairline bridge w/ a small midpoint dot (the protocol).
   Right: enlarged endpoint dot with a halo ring (our MCP server). */
export function McpServerIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Protocol bridge */}
      <line x1="9" y1="12" x2="18" y2="12" stroke="currentColor" strokeOpacity="0.42" strokeWidth="0.7" />
      <g fill="currentColor">
        {/* Client cluster (left) */}
        <circle cx="3" cy="7"  r="0.95" />
        <circle cx="3" cy="12" r="1.0" />
        <circle cx="3" cy="17" r="0.95" />
        <circle cx="6" cy="9"  r="0.95" />
        <circle cx="6" cy="15" r="0.95" />
        {/* Protocol midpoint dot */}
        <circle cx="13.5" cy="12" r="1.0" />
        {/* OGA endpoint (right) — enlarged + halo ring */}
        <circle cx="20" cy="12" r="2.0" />
        <circle cx="20" cy="12" r="3.2" fill="none" stroke="currentColor" strokeOpacity="0.42" strokeWidth="0.55" />
      </g>
    </svg>
  );
}

/* ---------- Changelog — versioned timeline ----------
   Vertical hairline timeline w/ three entry dots (latest enlarged).
   Each entry has 2 horizontal hairlines to the right of varying
   widths representing the release description. */
export function ChangelogIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      {/* Timeline line */}
      <line x1="5" y1="3" x2="5" y2="21" stroke="currentColor" strokeOpacity="0.32" strokeWidth="0.7" />
      {/* Entry markers */}
      <g fill="currentColor">
        <circle cx="5" cy="6"  r="1.5" />
        <circle cx="5" cy="12" r="1.1" />
        <circle cx="5" cy="18" r="1.1" />
      </g>
      {/* Entry description lines (two per entry, varying widths) */}
      <g stroke="currentColor" strokeWidth="0.7">
        <g strokeOpacity="0.5">
          <line x1="10" y1="5" x2="20" y2="5" />
          <line x1="10" y1="11" x2="18" y2="11" />
          <line x1="10" y1="17" x2="19" y2="17" />
        </g>
        <g strokeOpacity="0.32">
          <line x1="10" y1="7.5" x2="17" y2="7.5" />
          <line x1="10" y1="13.5" x2="15" y2="13.5" />
          <line x1="10" y1="19.5" x2="16" y2="19.5" />
        </g>
      </g>
    </svg>
  );
}

export const DOCS_ICONS = {
  "docs-home": DocsHomeIcon,
  "api-reference": ApiReferenceIcon,
  "mcp": McpServerIcon,
  "changelog": ChangelogIcon,
} as const;
