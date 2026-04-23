/* AiqIcon — bespoke 11-icon set for design-v2. 28×28 viewBox, 1.5px forest
   stroke, chartreuse accent dot. Use this for ALL design-v2 marketing pages;
   do not import Lucide or any other icon library in design-v2. */

import type React from "react";

export type IconName =
  | "buyer" | "renter" | "investor" | "agent" | "operator" | "researcher"
  | "data" | "intent" | "read" | "map" | "api";

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
  }
}
