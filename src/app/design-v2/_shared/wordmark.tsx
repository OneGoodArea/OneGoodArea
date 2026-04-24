"use client";

import React from "react";
import Link from "next/link";
import { Mark } from "./mark";

/* ═══════════════════════════════════════════════════════════════
   Wordmark · single source of truth for the OneGoodArea logo.
   - Same proportions, same typography, same italic+chartreuse
     accent on "Good" everywhere.
   - `size` scales Mark + font proportionally.
   - `tone` only changes when the surface demands it:
       "light" (default): forest-ink on white / cream · the norm.
       "dark":  white ink on ink-deep / dark backgrounds.
   - `href` wraps the mark in a Link when provided; otherwise
     renders a plain span so it can sit inside other links.
   ═══════════════════════════════════════════════════════════════ */

export type WordmarkTone = "light" | "dark";

type WordmarkProps = {
  size?: number;            // Font-size in px; Mark scales to ~92% of this
  tone?: WordmarkTone;
  href?: string;
  className?: string;
};

export function Wordmark({
  size = 22, tone = "light", href, className,
}: WordmarkProps) {
  // Mark scales proportionally. 22px font → 22px mark; 26px font → ~24px mark.
  const markSize = Math.round(size * 1.0);

  const ink     = tone === "dark" ? "#FFFFFF"                          : "var(--ink-deep)";
  const inkGood = tone === "dark" ? "var(--signal)"                    : "var(--ink)";
  const under   = "var(--signal)";

  const content = (
    <span
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.46),
        textDecoration: "none", lineHeight: 1,
      }}
    >
      <Mark size={markSize} tone={tone} />
      <span style={{
        fontFamily: "var(--display)",
        fontSize: size,
        fontWeight: 400,
        letterSpacing: "-0.02em",
        color: ink,
        lineHeight: 1,
      }}>
        One<span style={{
          fontStyle: "italic",
          color: inkGood,
          borderBottom: `2px solid ${under}`,
          margin: "0 1px",
          paddingBottom: 1,
        }}>Good</span>Area
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "inline-block" }}>
        {content}
      </Link>
    );
  }
  return content;
}
