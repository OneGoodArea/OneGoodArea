"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { ThemeDot } from "./theme-dot";

/* Nav - structure mirrors the live product nav (Business / API / Pricing /
   About / Theme / Dashboard/Sign In). Dressed in the design-v2 language:
   Fraunces wordmark, mono small-caps links, chartreuse slide-in underline on
   hover, bespoke theme dot, hairline dividers. Mobile hamburger + drawer at
   <=720px (matches the existing rule hiding the desktop links). */

const LINKS: { label: string; href: string }[] = [
  { label: "Business", href: "/business" },
  { label: "API",      href: "/docs" },
  { label: "Pricing",  href: "/pricing" },
  { label: "About",    href: "/about" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();
  const isSignedIn = !!session;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const ctaHref = isSignedIn ? "/dashboard" : "/sign-in";
  const ctaLabel = isSignedIn ? "Dashboard" : "Sign In";

  return (
    <>
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
          <Wordmark href="/" size={22} />
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
            {LINKS.map((l) => (
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
            href={ctaHref}
            className="aiq-nav-cta-desktop"
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
            {ctaLabel}
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>

          <button
            type="button"
            className="aiq-nav-mobile-btn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            style={{
              display: "none",
              width: 40, height: 40, padding: 0,
              alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border)",
              background: "var(--bg-off)",
              borderRadius: 4, cursor: "pointer",
              color: "var(--ink-deep)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="aiq-nav-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <aside
        className={`aiq-nav-drawer${drawerOpen ? " aiq-drawer-open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24,
        }}>
          <Wordmark href="/" size={20} />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              width: 36, height: 36, padding: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border)",
              background: "var(--bg-off)",
              borderRadius: 4, cursor: "pointer",
              color: "var(--ink-deep)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav style={{
          display: "flex", flexDirection: "column",
          borderTop: "1px solid var(--border)",
        }}>
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setDrawerOpen(false)}
              style={{
                padding: "16px 4px",
                borderBottom: "1px solid var(--border)",
                fontFamily: "var(--display)", fontSize: 22, fontWeight: 400,
                color: "var(--ink-deep)", letterSpacing: "-0.01em",
                textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              {l.label}
              <span aria-hidden style={{
                fontFamily: "var(--sans)", fontSize: 16, color: "var(--text-3)",
              }}>→</span>
            </Link>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{
          marginTop: 28, paddingTop: 24,
          borderTop: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.2em", textTransform: "uppercase",
            color: "var(--text-2)",
          }}>
            Theme
            <ThemeDot />
          </div>

          <Link
            href={ctaHref}
            onClick={() => setDrawerOpen(false)}
            style={{
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "14px 20px", borderRadius: 999, textDecoration: "none",
              border: "1px solid var(--ink-deep)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              gap: 10,
            }}
          >
            {ctaLabel}
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 14 }}>→</span>
          </Link>
        </div>
      </aside>
    </>
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
