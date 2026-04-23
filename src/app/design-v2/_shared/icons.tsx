/* AiqIcon — bespoke 11-icon set for design-v2. 28×28 viewBox, 1.5px forest
   stroke, chartreuse accent dot. Use this for ALL design-v2 marketing pages;
   do not import Lucide or any other icon library in design-v2. */

import type React from "react";

export type IconName =
  | "buyer" | "renter" | "investor" | "agent" | "operator" | "researcher"
  | "data" | "intent" | "read" | "map" | "api"
  | "repeat" | "share" | "watchlist" | "fresh" | "pdf" | "compare"
  | "key" | "gauge" | "cache" | "dash" | "widget" | "support";

export function AiqIcon({ name, size = 26 }: { name: IconName; size?: number }) {
  const s = size;
  const common: React.SVGProps<SVGSVGElement> = {
    width: s, height: s, viewBox: "0 0 28 28", fill: "none",
    stroke: "var(--ink)", strokeWidth: 1.5,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  const accent = "var(--signal)";
  switch (name) {
    case "buyer":
      return (
        <svg {...common}>
          <path d="M4 14 L14 5 L24 14 V23 H4 Z" />
          <rect x="11.5" y="16" width="5" height="7" fill={accent} stroke="none" />
          <rect x="11.5" y="16" width="5" height="7" />
        </svg>
      );
    case "renter":
      return (
        <svg {...common}>
          <circle cx="10" cy="14" r="4.2" />
          <circle cx="10" cy="14" r="1" fill="var(--ink)" stroke="none" />
          <path d="M14.2 14 L23.5 14" />
          <path d="M20 14 L20 17.5" />
          <path d="M17 14 L17 16.5" />
          <circle cx="22" cy="14" r="1.2" fill={accent} stroke="none" />
        </svg>
      );
    case "investor":
      return (
        <svg {...common}>
          <path d="M4 22 L10 14 L14 18 L22 6" />
          <path d="M16 6 H22 V12" />
          <circle cx="22" cy="6" r="1.2" fill={accent} stroke="none" />
        </svg>
      );
    case "agent":
      return (
        <svg {...common}>
          <path d="M4 6 H24 V18 H15 L10 22 V18 H4 Z" />
          <circle cx="10" cy="12" r="1" fill={accent} stroke="none" />
          <circle cx="14" cy="12" r="1" fill="var(--ink)" stroke="none" />
          <circle cx="18" cy="12" r="1" fill="var(--ink)" stroke="none" />
        </svg>
      );
    case "operator":
      return (
        <svg {...common}>
          <path d="M4 9 L14 5 L24 9 V24 H4 Z" />
          <path d="M4 12 H24" />
          <path d="M11 24 V16 H17 V24" />
          <rect x="11" y="16" width="6" height="2" fill={accent} stroke="none" />
        </svg>
      );
    case "researcher":
      return (
        <svg {...common}>
          <rect x="6" y="4" width="16" height="20" rx="1" />
          <path d="M9 10 H19" />
          <path d="M9 14 H19" />
          <path d="M9 18 H15" />
          <circle cx="17" cy="18" r="1.4" fill={accent} stroke="none" />
        </svg>
      );
    case "data":
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="9" />
          <path d="M10 14.3 L13 17.3 L19 11" stroke={accent} strokeWidth="2.2" />
        </svg>
      );
    case "intent":
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="9" />
          <circle cx="14" cy="14" r="5" />
          <circle cx="14" cy="14" r="1.6" fill={accent} stroke="none" />
        </svg>
      );
    case "read":
      return (
        <svg {...common}>
          <path d="M4 7 L14 9 L24 7 V22 L14 20 L4 22 Z" />
          <path d="M14 9 V20" />
          <path d="M7 11 L11 11.8" />
          <path d="M7 14 L11 14.8" />
          <path d="M17 11.8 L21 11" stroke={accent} />
          <path d="M17 14.8 L21 14" stroke={accent} />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M14 4 C9.5 4 6 7 6 11.5 C6 17.5 14 24 14 24 S22 17.5 22 11.5 C22 7 18.5 4 14 4 Z" />
          <circle cx="14" cy="11.5" r="2.4" fill={accent} stroke="none" />
        </svg>
      );
    case "api":
      return (
        <svg {...common}>
          <path d="M10 4 C7 4 7.5 8 7.5 11 C7.5 12.8 5.5 14 5.5 14 C5.5 14 7.5 15.2 7.5 17 C7.5 20 7 24 10 24" />
          <path d="M18 4 C21 4 20.5 8 20.5 11 C20.5 12.8 22.5 14 22.5 14 C22.5 14 20.5 15.2 20.5 17 C20.5 20 21 24 18 24" />
          <circle cx="14" cy="14" r="1.6" fill={accent} stroke="none" />
        </svg>
      );
    case "repeat":
      // two opposed curved arrows — same answer every time
      return (
        <svg {...common}>
          <path d="M7 9 A 8 8 0 0 1 21 9" />
          <path d="M21 9 L18.5 9 M21 9 L21 11.5" />
          <path d="M21 19 A 8 8 0 0 1 7 19" stroke={accent} />
          <path d="M7 19 L9.5 19 M7 19 L7 16.5" stroke={accent} />
        </svg>
      );
    case "share":
      // three-node share glyph
      return (
        <svg {...common}>
          <path d="M10.5 12.6 L17.5 8.2" />
          <path d="M10.5 15.4 L17.5 19.8" />
          <circle cx="8"  cy="14" r="2.4" />
          <circle cx="20" cy="7"  r="2.4" fill={accent} stroke="var(--ink)" />
          <circle cx="20" cy="21" r="2.4" />
        </svg>
      );
    case "watchlist":
      // star outline with chartreuse centre — saved area
      return (
        <svg {...common}>
          <path d="M14 4 L16.4 10.3 L23 11.2 L18 15.6 L19.3 22.2 L14 18.8 L8.7 22.2 L10 15.6 L5 11.2 L11.6 10.3 Z" />
          <circle cx="14" cy="13.5" r="1.7" fill={accent} stroke="none" />
        </svg>
      );
    case "fresh":
      // clock with chartreuse tick at 12 — data freshness
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="9" />
          <path d="M14 9 L14 14 L18 14" />
          <circle cx="14" cy="5" r="1.3" fill={accent} stroke="none" />
        </svg>
      );
    case "pdf":
      // document with corner fold + lines
      return (
        <svg {...common}>
          <path d="M7 4 H18 L22 8 V24 H7 Z" />
          <path d="M18 4 V8 H22" />
          <path d="M10 13 H19" />
          <path d="M10 17 H19" />
          <path d="M10 21 H15" stroke={accent} />
        </svg>
      );
    case "compare":
      // two side-by-side docs, right one chartreuse-accented
      return (
        <svg {...common}>
          <rect x="4"  y="7" width="9" height="14" />
          <path d="M7 11 H10" />
          <path d="M7 14 H10" />
          <path d="M7 17 H9" />
          <rect x="15" y="7" width="9" height="14" />
          <path d="M18 11 H21" stroke={accent} />
          <path d="M18 14 H21" stroke={accent} />
          <path d="M18 17 H20" stroke={accent} />
        </svg>
      );
    case "key":
      // keyhead + stem + teeth — API key management
      return (
        <svg {...common}>
          <circle cx="9" cy="11" r="4" />
          <circle cx="9" cy="11" r="1.3" fill={accent} stroke="none" />
          <path d="M13 11 L23 11" />
          <path d="M20 11 L20 14" />
          <path d="M17 11 L17 13.5" />
        </svg>
      );
    case "gauge":
      // semicircle + chartreuse needle — rate limit
      return (
        <svg {...common}>
          <path d="M5 18 A 9 9 0 0 1 23 18" />
          <path d="M9.4 11.2 L9.4 12.8" />
          <path d="M14 9 L14 10.6" />
          <path d="M18.6 11.2 L18.6 12.8" />
          <path d="M14 18 L19.5 11.5" stroke={accent} strokeWidth="2" />
          <circle cx="14" cy="18" r="1.4" fill="var(--ink)" stroke="none" />
        </svg>
      );
    case "cache":
      // database cylinder, top disk chartreuse-tinted — response cache
      return (
        <svg {...common}>
          <ellipse cx="14" cy="7" rx="8" ry="2.3" fill={accent} fillOpacity="0.22" />
          <ellipse cx="14" cy="7" rx="8" ry="2.3" />
          <path d="M6 7 V21 C 6 22.5 10 23.3 14 23.3 C 18 23.3 22 22.5 22 21 V7" />
          <path d="M6 14 C 6 15.3 10 16.1 14 16.1 C 18 16.1 22 15.3 22 14" />
        </svg>
      );
    case "dash":
      // ascending bars, tallest chartreuse — usage dashboard
      return (
        <svg {...common}>
          <path d="M4 23 H24" />
          <rect x="6"  y="16" width="4" height="6" />
          <rect x="12" y="12" width="4" height="10" />
          <rect x="18" y="7"  width="4" height="15" fill={accent} stroke="var(--ink)" />
        </svg>
      );
    case "widget":
      // outer page + inner chartreuse widget block — drop-in widget
      return (
        <svg {...common}>
          <rect x="4" y="5" width="20" height="18" rx="0.8" />
          <path d="M4 10 H24" />
          <circle cx="7"  cy="7.5" r="0.6" fill="var(--ink)" stroke="none" />
          <circle cx="9.2" cy="7.5" r="0.6" fill="var(--ink)" stroke="none" />
          <rect x="7" y="13" width="14" height="7" fill={accent} stroke="var(--ink)" />
        </svg>
      );
    case "support":
      // circle with chartreuse star — priority support
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="9" />
          <path d="M14 9 L15.3 12.3 L18.8 12.6 L16.1 14.9 L16.9 18.4 L14 16.6 L11.1 18.4 L11.9 14.9 L9.2 12.6 L12.7 12.3 Z" fill={accent} stroke="var(--ink)" strokeWidth="1" />
        </svg>
      );
  }
}
