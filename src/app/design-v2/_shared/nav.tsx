"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { ThemeDot } from "./theme-dot";

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
    <nav
      className={scrolled ? "aiq-nav-scrolled" : "aiq-nav-top"}
      style={{
        position: "sticky", top: 0, zIndex: 50,
        backdropFilter: scrolled ? "blur(14px) saturate(160%)" : "none",
        borderBottom: `1px solid ${scrolled ? "var(--border)" : "transparent"}`,
        transition: "all 220ms ease",
      }}
    >
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

/* ThemeDot moved to _shared/theme-dot.tsx so it's usable by both the
   marketing Nav and the app-shell sidebar. */
