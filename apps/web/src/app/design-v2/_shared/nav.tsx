"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { ThemeDot } from "./theme-dot";

/* Nav - structure mirrors the live product nav (Business / API / Pricing /
   About / Theme / Dashboard/Sign In). Dressed in the design-v2 language:
   Fraunces wordmark, mono small-caps links, chartreuse slide-in underline on
   hover, bespoke theme dot, hairline dividers. Mobile hamburger + drawer at
   <=720px (matches the existing rule hiding the desktop links).

   AR-148: Pricing entry is a dropdown (hover on desktop, expandable group
   in mobile drawer) so MCP server gets a top-level discovery surface
   alongside the regular API pricing page. */

type NavChild = { label: string; href: string; badge?: string };
type NavEntry = { label: string; href: string; children?: NavChild[] };

const LINKS: NavEntry[] = [
  { label: "Business",    href: "/business" },
  { label: "API",         href: "/docs" },
  { label: "Methodology", href: "/methodology" },
  {
    label: "Pricing",
    href: "/pricing",
    children: [
      { label: "API pricing", href: "/pricing" },
      { label: "MCP server",  href: "/docs/mcp", badge: "NEW" },
    ],
  },
  { label: "About",       href: "/about" },
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
              l.children
                ? <NavDropdown key={l.label} entry={l} />
                : <NavLink key={l.label} href={l.href} label={l.label} />
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
            l.children
              ? <MobileNavGroup key={l.label} entry={l} onNavigate={() => setDrawerOpen(false)} />
              : (
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
                  }}>{"→"}</span>
                </Link>
              )
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

/* Desktop dropdown · trigger link still navigates to entry.href on click,
   so users on touch (no hover) can still get to the primary destination.
   Hover or keyboard focus on the wrapper opens the panel; ESC or
   click-outside closes it. */
function NavDropdown({ entry }: { entry: NavEntry }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }
  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function handleEnter() {
    cancelClose();
    setOpen(true);
    setHover(true);
  }
  function handleLeave() {
    setHover(false);
    scheduleClose();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  /* Wrapper is inline-flex so it has no inline strut / line-box — its height
     is exactly the trigger Link's height, and the navbar's flex-row centers
     it identically to bare <Link> siblings (NavLink). Without inline-flex,
     the span's default line-box adds strut-baseline space and pushes the
     text down vs. adjacent items. */
  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", lineHeight: 1 }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Link
        href={entry.href}
        aria-haspopup="menu"
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: hover || open ? "var(--ink-deep)" : "var(--text-2)",
          textDecoration: "none", position: "relative",
          paddingBottom: 6, transition: "color 140ms ease",
          display: "inline-block",
        }}
      >
        {entry.label}
        <span aria-hidden style={{
          marginLeft: 5,
          fontFamily: "var(--mono)", fontSize: 8,
          display: "inline-block",
          transform: open ? "translateY(-1px) rotate(180deg)" : "translateY(-1px) rotate(0deg)",
          transition: "transform 200ms ease",
          color: "currentColor",
          verticalAlign: "middle",
        }}>{"▾"}</span>
        <span aria-hidden style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          height: 2, background: "var(--signal)",
          transform: hover || open ? "scaleX(1)" : "scaleX(0)",
          transformOrigin: "left center",
          transition: "transform 260ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </Link>

      <div
        role="menu"
        aria-hidden={!open}
        style={{
          position: "absolute",
          top: "calc(100% + 10px)", left: -14,
          minWidth: 240,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          boxShadow: "0 16px 40px -12px rgba(6,42,30,0.18), 0 2px 6px rgba(6,42,30,0.06)",
          padding: 6,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-4px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease, transform 200ms cubic-bezier(0.16,1,0.3,1)",
          zIndex: 60,
        }}
      >
        {entry.children!.map((child) => (
          <NavDropdownItem key={child.href} child={child} />
        ))}
      </div>
    </span>
  );
}

function NavDropdownItem({ child }: { child: NavChild }) {
  const [itemHover, setItemHover] = useState(false);
  return (
    <Link
      href={child.href}
      role="menuitem"
      onMouseEnter={() => setItemHover(true)}
      onMouseLeave={() => setItemHover(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "10px 12px",
        fontFamily: "var(--sans)", fontSize: 14, fontWeight: 500,
        color: itemHover ? "var(--ink-deep)" : "var(--ink)",
        background: itemHover ? "var(--bg-off)" : "transparent",
        borderRadius: 3, textDecoration: "none",
        letterSpacing: "-0.005em",
        transition: "background 140ms ease, color 140ms ease",
      }}
    >
      <span>{child.label}</span>
      {child.badge && (
        <span style={{
          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--signal-ink)", background: "var(--signal)",
          padding: "3px 7px 2px", borderRadius: 2,
          border: "1px solid var(--ink-deep)",
        }}>{child.badge}</span>
      )}
    </Link>
  );
}

/* Mobile drawer · expandable group. Tapping the parent toggles the group
   open. Children render indented underneath. */
function MobileNavGroup({ entry, onNavigate }: { entry: NavEntry; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "16px 4px",
          fontFamily: "var(--display)", fontSize: 22, fontWeight: 400,
          color: "var(--ink-deep)", letterSpacing: "-0.01em",
          textDecoration: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        {entry.label}
        <span aria-hidden style={{
          fontFamily: "var(--sans)", fontSize: 16, color: "var(--text-3)",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 200ms ease",
        }}>{"→"}</span>
      </button>
      <div style={{
        maxHeight: open ? 200 : 0,
        overflow: "hidden",
        transition: "max-height 280ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ padding: "0 4px 14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {entry.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              style={{
                padding: "10px 0",
                fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500,
                color: "var(--ink)", textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}
            >
              <span>{child.label}</span>
              {child.badge && (
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  color: "var(--signal-ink)", background: "var(--signal)",
                  padding: "3px 7px 2px", borderRadius: 2,
                  border: "1px solid var(--ink-deep)",
                }}>{child.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
