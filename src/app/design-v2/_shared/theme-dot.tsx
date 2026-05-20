"use client";

import React, { useEffect, useState } from "react";

/* ThemeDot — 28x28 surface toggle (AR-152 Plotted).

   Writes BOTH `data-theme` on <html> (existing design-v2 system, kept
   per memory) AND `data-oga-surface` on <body> (Plotted token system).
   localStorage key `aiq-theme` unchanged.

   Visual styling lives in `.oga-theme-dot` (components.css) so the
   surface-aware hover state actually flips with the body data attribute.
   Inline styles can't do that. */

export function ThemeDot({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored =
      (typeof window !== "undefined" && localStorage.getItem("aiq-theme")) ||
      document.documentElement.getAttribute("data-theme") ||
      "light";
    const next = stored === "dark" ? "dark" : "light";
    setTheme(next);
    applySurface(next);
  }, []);

  function applySurface(next: "dark" | "light") {
    document.documentElement.setAttribute("data-theme", next);
    if (next === "dark") {
      document.body.setAttribute("data-oga-surface", "dark");
    } else {
      document.body.removeAttribute("data-oga-surface");
    }
  }

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applySurface(next);
    try { localStorage.setItem("aiq-theme", next); } catch {}
  }

  if (!mounted) return <span style={{ width: 28, height: 28, flexShrink: 0 }} />;

  const isDark = theme === "dark";

  // `tone="dark"` is for perma-dark contexts (e.g. app-shell sidebar).
  // It forces white ink + alpha-white border regardless of body surface.
  // Without `tone`, the dot inherits from semantic tokens via the
  // .oga-theme-dot class and auto-flips with the body surface.
  const permaDark = tone === "dark";

  return (
    <button
      type="button"
      className="oga-theme-dot"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={permaDark ? {
        borderColor: "rgba(250,248,244,0.18)",
        color: "var(--oga-white)",
      } : undefined}
    >
      {isDark ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
