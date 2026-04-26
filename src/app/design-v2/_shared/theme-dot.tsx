"use client";

import React, { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   ThemeDot · 28x28 bespoke theme toggle.
   Writes data-theme to <html> so the whole site flips. Shared
   between the marketing Nav and the app-shell sidebar via `tone`.
   - tone="light": forest border, bg-off surface, hover goes chartreuse.
   - tone="dark":  white-alpha border on dark surface, chartreuse hover.
   ═══════════════════════════════════════════════════════════════ */

export function ThemeDot({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored =
      (typeof window !== "undefined" && localStorage.getItem("aiq-theme")) ||
      document.documentElement.getAttribute("data-theme") ||
      "light";
    setTheme(stored === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("aiq-theme", next); } catch {}
  }

  if (!mounted) return <span style={{ width: 28, height: 28, flexShrink: 0 }} />;

  const isDark = theme === "dark";
  const sidebarDark = tone === "dark";

  const border = sidebarDark
    ? (hover ? "rgba(212,243,58,0.55)" : "rgba(255,255,255,0.18)")
    : (hover ? "var(--ink)"            : "var(--border)");
  const bg = sidebarDark
    ? (hover ? "rgba(212,243,58,0.12)" : "rgba(255,255,255,0.05)")
    : (hover ? "var(--signal-dim)"     : "var(--bg-off)");
  const iconColor = sidebarDark
    ? (hover ? "var(--signal)"         : "#FFFFFF")
    : "var(--ink-deep)";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        width: 28, height: 28, borderRadius: 3,
        border: `1px solid ${border}`,
        background: bg,
        color: iconColor,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0, flexShrink: 0,
        transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
      }}
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
