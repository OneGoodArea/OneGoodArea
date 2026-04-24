"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";

/* Nav · structure mirrors the live product nav (Business · API · Pricing ·
   About · Theme · Dashboard/Sign In). Dressed in the design-v2 language:
   Fraunces wordmark, mono small-caps links, chartreuse slide-in underline on
   hover, bespoke theme dot, hairline dividers. */

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const isSignedIn = !!session;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links: { label: string; href: string }[] = [
    { label: "Business", href: "/design-v2/business" },
    { label: "API",      href: "/design-v2/docs" },
    { label: "Pricing",  href: "/design-v2/pricing" },
    { label: "About",    href: "/design-v2/about" },
  ];

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(255,255,255,0.86)" : "transparent",
      backdropFilter: scrolled ? "blur(14px) saturate(160%)" : "none",
      borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
      transition: "all 220ms ease",
    }}>
      <div className="aiq-nav-row" style={{
        maxWidth: 1240, margin: "0 auto", padding: "0 40px",
        height: 64, display: "flex", alignItems: "center", gap: 24,
      }}>
        <Wordmark href="/design-v2" size={22} />
        <span className="aiq-nav-beta" style={{
          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink)", padding: "3px 7px 2px",
          border: "1px solid var(--border)", borderRadius: 2,
          background: "var(--bg-off)",
          display: "inline-flex", alignItems: "center", gap: 5, lineHeight: 1,
        }}>
          <span aria-hidden style={{
            width: 4, height: 4, borderRadius: 4, background: "var(--signal)",
            boxShadow: "0 0 0 1.5px rgba(212,243,58,0.28)",
          }} />
          Beta
        </span>

        <div style={{ flex: 1 }} />

        <div className="aiq-nav-links" style={{
          display: "flex", alignItems: "center", gap: 26,
        }}>
          {links.map((l) => (
            <NavLink key={l.label} href={l.href} label={l.label} />
          ))}
        </div>

        <span aria-hidden className="aiq-nav-div" style={{
          width: 1, height: 20, background: "var(--border)",
        }} />

        <ThemeDot />

        <span aria-hidden className="aiq-nav-div" style={{
          width: 1, height: 20, background: "var(--border)",
        }} />

        <Link
          href={isSignedIn ? "/design-v2/dashboard" : "/design-v2/sign-in"}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "9px 16px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 8,
            transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
            boxShadow: "0 1px 0 rgba(6,42,30,0.04)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(6,42,30,0.12)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 0 rgba(6,42,30,0.04)";
          }}
        >
          {isSignedIn ? "Dashboard" : "Sign In"}
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </Link>
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: hover ? "var(--ink-deep)" : "var(--text-2)",
        textDecoration: "none", position: "relative",
        paddingBottom: 6, transition: "color 140ms ease",
        display: "inline-block",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {label}
      <span aria-hidden style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: 2, background: "var(--signal)",
        transform: hover ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left center",
        transition: "transform 260ms cubic-bezier(0.16,1,0.3,1)",
      }} />
    </Link>
  );
}

/* Writes data-theme to <html> to align with the rest of the app's theme system.
   Design-v2 dark tokens are a separate follow-up; the button is wired today. */
function ThemeDot() {
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

  if (!mounted) return <span style={{ width: 28, height: 28 }} />;

  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{
        width: 28, height: 28, borderRadius: 3,
        border: "1px solid var(--border)",
        background: hover ? "var(--signal-dim)" : "var(--bg-off)",
        color: "var(--ink-deep)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "background 140ms ease, border-color 140ms ease",
        padding: 0,
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
