"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { ThemeDot } from "./theme-dot";

/* Nav — Plotted brand v3 (AR-152).

   Layout: Wordmark left, Beta chip, flex spacer, Title Case nav items,
   ThemeDot, primary CTA. 64px tall, sticky, 1px hairline bottom border.
   Two-color, no chartreuse, no blur. Mobile hamburger preserved.

   Pricing entry is a dropdown so MCP server gets a top-level surface
   alongside API pricing (AR-148 IA preserved). */

type NavChild = { label: string; href: string; badge?: string };
type NavEntry = { label: string; href: string; children?: NavChild[] };

/* Center-of-nav items — Methodology moves to the right CTA cluster
   so it sits beside Get Started as a distinct secondary action. */
const LINKS: NavEntry[] = [
  { label: "Business",    href: "/business" },
  { label: "API",         href: "/docs" },
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

/* Mobile drawer still shows all six routes */
const MOBILE_LINKS: NavEntry[] = [
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
  const [overDarkHero, setOverDarkHero] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();
  const isSignedIn = !!session;

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 8);
      // Nav adopts dark surface when its bottom edge is still over a
      // .oga-hero-dark element. Recomputes on every scroll so the nav
      // flips back to light when the user scrolls past the hero.
      const hero = document.querySelector(".oga-hero-dark") as HTMLElement | null;
      if (!hero) { setOverDarkHero(false); return; }
      const rect = hero.getBoundingClientRect();
      setOverDarkHero(rect.bottom > 60);
    };
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    window.addEventListener("resize", fn);
    return () => {
      window.removeEventListener("scroll", fn);
      window.removeEventListener("resize", fn);
    };
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

  const ctaHref = isSignedIn ? "/dashboard" : "/sign-up";
  const ctaLabel = isSignedIn ? "Dashboard" : "Get started";

  return (
    <>
      <nav
        className={scrolled ? "oga-nav-glass" : ""}
        data-oga-surface={overDarkHero ? "dark" : undefined}
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: scrolled ? undefined : "transparent",
          borderBottom: scrolled ? undefined : "1px solid transparent",
          transition: "background var(--oga-dur) var(--oga-ease), border-color var(--oga-dur) var(--oga-ease), color var(--oga-dur) var(--oga-ease)",
        }}
      >
        <div className="aiq-nav-row" style={{
          maxWidth: 1320, margin: "0 auto", padding: "0 28px 0 56px",
          height: 52, display: "flex", alignItems: "center", gap: 12,
          color: "var(--oga-fg)",
        }}>
          <Wordmark href="/" size={18} />

          <div style={{ flex: 1 }} />

          <div className="aiq-nav-links" style={{
            display: "flex", alignItems: "center", gap: 2,
          }}>
            {LINKS.map((l) => (
              l.children
                ? <NavDropdown key={l.label} entry={l} />
                : <NavLink key={l.label} href={l.href} label={l.label} />
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div className="aiq-nav-cluster aiq-nav-cta-desktop" style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Link href="/methodology" className="oga-btn oga-btn-secondary">
              Methodology
            </Link>
            <Link href={ctaHref} className="oga-btn oga-btn-primary">
              {ctaLabel}
            </Link>
            <span aria-hidden style={{
              width: 1, height: 20, background: "var(--oga-border)",
              marginLeft: 4, marginRight: 4,
            }} />
            <ThemeDot />
          </div>

          <button
            type="button"
            className="aiq-nav-mobile-btn"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            style={{
              display: "none",
              width: 38, height: 38, padding: 0,
              alignItems: "center", justifyContent: "center",
              border: "1px solid var(--oga-border)",
              background: "transparent",
              borderRadius: "var(--oga-radius-md)",
              cursor: "pointer",
              color: "var(--oga-fg)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
        style={{ color: "var(--oga-fg)", background: "var(--oga-bg)" }}
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
              border: "1px solid var(--oga-border)",
              background: "transparent",
              borderRadius: "var(--oga-radius-md)", cursor: "pointer",
              color: "var(--oga-fg)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav style={{
          display: "flex", flexDirection: "column",
          borderTop: "1px solid var(--oga-border)",
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
                    borderBottom: "1px solid var(--oga-border)",
                    fontFamily: "var(--oga-font-sans)", fontSize: 20, fontWeight: 500,
                    color: "var(--oga-fg)", letterSpacing: "-0.012em",
                    textDecoration: "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  {l.label}
                  <span aria-hidden style={{
                    fontFamily: "var(--oga-font-sans)", fontSize: 16, color: "var(--oga-fg-muted)",
                  }}>{"→"}</span>
                </Link>
              )
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{
          marginTop: 28, paddingTop: 24,
          borderTop: "1px solid var(--oga-border)",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div className="oga-label" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            Theme
            <ThemeDot />
          </div>

          <Link
            href={ctaHref}
            onClick={() => setDrawerOpen(false)}
            className="oga-btn oga-btn-lg oga-btn-primary"
            style={{ justifyContent: "center", width: "100%" }}
          >
            {ctaLabel}
          </Link>
        </div>
      </aside>
    </>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="oga-nav-link">{label}</Link>
  );
}

/* Desktop dropdown — trigger link still navigates to entry.href on click,
   so touch (no hover) still gets to the primary destination. Hover or
   keyboard focus opens the panel; ESC or click-outside closes it. */
function NavDropdown({ entry }: { entry: NavEntry }) {
  const [open, setOpen] = useState(false);
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
  function handleEnter() { cancelClose(); setOpen(true); }
  function handleLeave() { scheduleClose(); }

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
        className="oga-nav-link"
        data-active={open ? "true" : "false"}
      >
        {entry.label}
        <span aria-hidden style={{
          fontSize: 9,
          marginLeft: 2,
          transform: open ? "translateY(-1px) rotate(180deg)" : "translateY(-1px) rotate(0deg)",
          transition: "transform var(--oga-dur) var(--oga-ease)",
        }}>{"▾"}</span>
      </Link>

      <div
        role="menu"
        aria-hidden={!open}
        style={{
          position: "absolute",
          top: "calc(100% + 4px)", left: 0,
          minWidth: 240,
          background: "var(--oga-bg)",
          border: "1px solid var(--oga-border)",
          borderRadius: "2px",
          boxShadow: "var(--oga-shadow-md)",
          padding: 6,
          opacity: open ? 1 : 0,
          transform: open ? "translateY(0)" : "translateY(-4px)",
          pointerEvents: open ? "auto" : "none",
          transition: "opacity var(--oga-dur) var(--oga-ease), transform var(--oga-dur) var(--oga-ease)",
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
        fontFamily: "var(--oga-font-sans)", fontSize: 14, fontWeight: 500,
        color: "var(--oga-fg)",
        background: itemHover ? "var(--oga-green-06)" : "transparent",
        borderRadius: "2px", textDecoration: "none",
        letterSpacing: "-0.005em",
        transition: "background var(--oga-dur-fast) var(--oga-ease)",
      }}
    >
      <span>{child.label}</span>
      {child.badge && (
        <span style={{
          fontFamily: "var(--oga-font-mono)", fontSize: 9, fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--oga-status-green)",
          padding: "3px 7px 2px",
          border: "1px solid var(--oga-status-green)",
          background: "var(--oga-status-green-bg)",
          borderRadius: "var(--oga-radius-pill)",
        }}>{child.badge}</span>
      )}
    </Link>
  );
}

/* Mobile drawer — expandable group. Tapping the parent toggles open;
   children render indented underneath. */
function MobileNavGroup({ entry, onNavigate }: { entry: NavEntry; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--oga-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "16px 4px",
          fontFamily: "var(--oga-font-sans)", fontSize: 20, fontWeight: 500,
          color: "var(--oga-fg)", letterSpacing: "-0.012em",
          textDecoration: "none",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        {entry.label}
        <span aria-hidden style={{
          fontFamily: "var(--oga-font-sans)", fontSize: 16, color: "var(--oga-fg-muted)",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform var(--oga-dur) var(--oga-ease)",
        }}>{"→"}</span>
      </button>
      <div style={{
        maxHeight: open ? 200 : 0,
        overflow: "hidden",
        transition: "max-height var(--oga-dur-slow) var(--oga-ease)",
      }}>
        <div style={{ padding: "0 4px 14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {entry.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onNavigate}
              style={{
                padding: "10px 0",
                fontFamily: "var(--oga-font-sans)", fontSize: 15, fontWeight: 500,
                color: "var(--oga-fg)", textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}
            >
              <span>{child.label}</span>
              {child.badge && (
                <span style={{
                  fontFamily: "var(--oga-font-mono)", fontSize: 9, fontWeight: 500,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "var(--oga-status-green)",
                  padding: "3px 7px 2px",
                  border: "1px solid var(--oga-status-green)",
                  background: "var(--oga-status-green-bg)",
                  borderRadius: "var(--oga-radius-pill)",
                }}>{child.badge}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
