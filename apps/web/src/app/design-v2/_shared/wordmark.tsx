"use client";

import React from "react";
import Link from "next/link";
import { Mark } from "./mark";

/* Wordmark — Plotted brand v3 (AR-152).

   The MARK dominates. Text "onegoodarea" sits next to it at smaller
   size. Mark scales independently of text via the markSize prop or
   defaults to 1.6x the text size (min 32px so the dot grid always
   renders crisp). On hover (when href is provided), the mark gently
   rotates 6deg — bespoke interaction tied to the brand's grid form. */

export type WordmarkTone = "light" | "dark";

type WordmarkProps = {
  size?: number;
  markSize?: number;
  tone?: WordmarkTone;
  href?: string;
  className?: string;
  interactive?: boolean;
};

export function Wordmark({
  size = 21,
  markSize,
  tone,
  href,
  className,
  interactive,
}: WordmarkProps) {
  const resolvedMarkSize = markSize ?? Math.max(Math.round(size * 2), 40);
  const color =
    tone === "dark" ? "var(--oga-white)" :
    tone === "light" ? "var(--oga-ink)" :
    "currentColor";

  const isInteractive = interactive ?? Boolean(href);

  const content = (
    <span
      className={`${className ?? ""} oga-wordmark${isInteractive ? " oga-wordmark-interactive" : ""}`}
      style={{
        display: "inline-flex", alignItems: "center",
        gap: Math.round(size * 0.5),
        textDecoration: "none", lineHeight: 1,
        color,
      }}
    >
      <Mark size={resolvedMarkSize} tone={tone} className="oga-wordmark-mark" />
      <span style={{
        fontFamily: "var(--oga-font-sans)",
        fontSize: size,
        fontWeight: 500,
        letterSpacing: "-0.022em",
        color: "currentColor",
        lineHeight: 1,
      }}>
        onegoodarea
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
