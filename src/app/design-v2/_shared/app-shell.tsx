"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { AiqIcon, type IconName } from "./icons";

/* ═══════════════════════════════════════════════════════════════
   AppShell · authenticated-surface chrome for design-v2.
   Left sidebar with bespoke nav + user chip. Dense component rules
   for tables, forms, stats. Same brand tokens (Fraunces / Inter /
   Geist Mono / chartreuse / forest ink), tighter spacing.
   ═══════════════════════════════════════════════════════════════ */

type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

const PRIMARY: NavItem[] = [
  { href: "/dashboard",  label: "Dashboard",  icon: "dash",       exact: true },
  { href: "/dashboard",  label: "Reports",    icon: "read" },
  { href: "/report",     label: "New report", icon: "map" },
  { href: "/compare",    label: "Compare",    icon: "compare" },
];

const SECONDARY: NavItem[] = [
  { href: "/api-usage",  label: "API + usage", icon: "api" },
  { href: "/settings",   label: "Settings",    icon: "key" },
];

export function AppShell({
  title, subtitle, actions, children,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  return (
    <div className="aiq aiq-app-shell" style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      background: "var(--bg-off)",
    }}>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {drawerOpen && (
        <div
          className="aiq-mobile-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}
      <main className="aiq-app-main" style={{
        minHeight: "100vh",
        background: "var(--bg-off)",
        display: "flex", flexDirection: "column",
        position: "relative",
      }}>
        <MobileTopbar title={title} onMenu={() => setDrawerOpen(true)} />
        {/* Ambient chartreuse wash at top of every app page */}
        <div aria-hidden style={{
          position: "absolute", top: -200, right: -140,
          width: 560, height: 500,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.16) 0%, rgba(212,243,58,0) 60%)",
          pointerEvents: "none", zIndex: 0,
        }} />
        {(title || actions) && (
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
        )}
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

/* Mobile top-bar - hidden on desktop via CSS (.aiq-mobile-topbar). Shows the
   hamburger, OneGoodArea mini wordmark, and the current page title so the
   user always knows where they are while the sidebar is off-canvas. */
function MobileTopbar({ title, onMenu }: { title?: string; onMenu: () => void }) {
  return (
    <div className="aiq-mobile-topbar" style={{ display: "none" }}>
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        style={{
          width: 40, height: 40, padding: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border)",
          background: "var(--bg-off)",
          borderRadius: 4, cursor: "pointer",
          color: "var(--ink-deep)",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <Wordmark href="/dashboard" size={18} />
      {title && (
        <>
          <span aria-hidden style={{
            width: 1, height: 16, background: "var(--border)",
            margin: "0 4px",
          }} />
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--text-2)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{title}</span>
        </>
      )}
    </div>
  );
}

/* ─────── Sidebar ─────── */

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  return (
    <aside
      className={`aiq-app-sidebar${open ? " aiq-sidebar-open" : ""}`}
      style={{
        background: "var(--bg-ink)",
        borderRight: "1px solid var(--ink-deep)",
        padding: "26px 20px 22px",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Soft chartreuse glow in the corner */}
      <div aria-hidden style={{
        position: "absolute", top: -120, right: -80,
        width: 240, height: 240,
        background: "radial-gradient(circle, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 62%)",
        pointerEvents: "none",
      }} />

      <div style={{
        marginBottom: 34, position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <Wordmark href="/dashboard" size={20} tone="dark" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="aiq-sidebar-close"
          style={{
            display: "none",
            width: 34, height: 34, padding: 0,
            alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 4, cursor: "pointer",
            color: "#FFFFFF",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, overflowY: "auto" }}>
        <NavGroup label="Main" items={PRIMARY} onItemClick={onClose} />
        <div style={{ height: 22 }} />
        <NavGroup label="Account" items={SECONDARY} onItemClick={onClose} />

        <div style={{ flex: 1 }} />

        <SidebarThemeRow />
        <UserChip name={session?.user?.name || null} email={session?.user?.email || null} />
      </div>
    </aside>
  );
}

function NavGroup({ label, items, onItemClick }: { label: string; items: NavItem[]; onItemClick?: () => void }) {
  const pathname = usePathname();
  return (
    <div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.24em", textTransform: "uppercase",
        color: "rgba(255,255,255,0.4)", marginBottom: 10, paddingLeft: 10,
      }}>{label}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.label}>
              <NavLink item={item} active={active} onClick={onItemClick} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        padding: "9px 10px",
        fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: active ? 600 : 500,
        color: active ? "var(--signal-ink)" : hover ? "#FFFFFF" : "rgba(255,255,255,0.72)",
        background: active ? "var(--signal)" : hover ? "rgba(255,255,255,0.06)" : "transparent",
        borderRadius: 4, textDecoration: "none",
        letterSpacing: "-0.005em",
        position: "relative",
        transition: "background 140ms ease, color 140ms ease",
      }}
    >
      <span aria-hidden style={{ flexShrink: 0, display: "inline-flex", color: active ? "var(--ink-deep)" : "inherit" }}>
        <NavIconDark name={item.icon} active={active} />
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

/* Nav icons for the dark sidebar. White stroke on the signal-chartreuse
   active state flips to ink-deep; inactive state is white @72%. */
function NavIconDark({ name, active }: { name: IconName; active: boolean }) {
  const stroke = active ? "var(--ink-deep)" : "rgba(255,255,255,0.82)";
  const accent = active ? "var(--ink-deep)" : "var(--signal)";
  const common: React.SVGProps<SVGSVGElement> = {
    width: 16, height: 16, viewBox: "0 0 28 28", fill: "none",
    stroke, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round",
  };
  switch (name) {
    case "dash":
      return (
        <svg {...common}>
          <path d="M4 23 H24" />
          <rect x="6"  y="16" width="4" height="6" />
          <rect x="12" y="12" width="4" height="10" />
          <rect x="18" y="7"  width="4" height="15" fill={accent} stroke={stroke} />
        </svg>
      );
    case "read":
      return (
        <svg {...common}>
          <path d="M4 7 L14 9 L24 7 V22 L14 20 L4 22 Z" />
          <path d="M14 9 V20" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M14 4 C9.5 4 6 7 6 11.5 C6 17.5 14 24 14 24 S22 17.5 22 11.5 C22 7 18.5 4 14 4 Z" />
          <circle cx="14" cy="11.5" r="2.2" fill={accent} stroke={stroke} />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="9" height="14" />
          <rect x="15" y="7" width="9" height="14" fill={active ? "transparent" : "rgba(212,243,58,0.12)"} stroke={stroke} />
        </svg>
      );
    case "api":
      return (
        <svg {...common}>
          <path d="M10 4 C7 4 7.5 8 7.5 11 C7.5 12.8 5.5 14 5.5 14 C5.5 14 7.5 15.2 7.5 17 C7.5 20 7 24 10 24" />
          <path d="M18 4 C21 4 20.5 8 20.5 11 C20.5 12.8 22.5 14 22.5 14 C22.5 14 20.5 15.2 20.5 17 C20.5 20 21 24 18 24" />
          <circle cx="14" cy="14" r="1.4" fill={accent} stroke="none" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle cx="9" cy="11" r="4" />
          <circle cx="9" cy="11" r="1.2" fill={accent} stroke="none" />
          <path d="M13 11 L23 11" />
          <path d="M20 11 L20 13.5" />
          <path d="M17 11 L17 13" />
        </svg>
      );
    default:
      // Fallback: a simple dot
      return <svg {...common}><circle cx="14" cy="14" r="5" /></svg>;
  }
}

/* Labeled theme switcher row · sits in the sidebar above the user chip.
   Clearly visible even if the small ThemeDot was being missed. */
function SidebarThemeRow() {
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

  if (!mounted) return <div style={{ height: 42, marginBottom: 8 }} />;

  const isDark = theme === "dark";
  const nextLabel = isDark ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 11, padding: "9px 12px 9px 10px",
        marginBottom: 8,
        background: hover ? "rgba(212,243,58,0.1)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hover ? "rgba(212,243,58,0.35)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: 4, cursor: "pointer",
        color: hover ? "var(--signal)" : "rgba(255,255,255,0.82)",
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.16em", textTransform: "uppercase",
        transition: "background 140ms ease, border-color 140ms ease, color 140ms ease",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden style={{
          width: 22, height: 22, flexShrink: 0,
          border: `1px solid ${hover ? "rgba(212,243,58,0.45)" : "rgba(255,255,255,0.18)"}`,
          borderRadius: 3,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: hover ? "rgba(212,243,58,0.18)" : "transparent",
          color: "currentColor",
        }}>
          {isDark ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
                stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span>Theme</span>
      </span>
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 600,
        letterSpacing: "0.2em", color: "var(--signal)",
        display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        {nextLabel}
        <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 11 }}>→</span>
      </span>
    </button>
  );
}

function UserChip({ name, email }: { name: string | null; email: string | null }) {
  const [open, setOpen] = useState(false);
  const display = name || email || "Account";
  const initial = (name || email || "?").slice(0, 1).toUpperCase();
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 11,
          padding: "9px 10px",
          background: open ? "rgba(255,255,255,0.08)" : "transparent",
          border: `1px solid ${open ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)"}`,
          borderRadius: 4, cursor: "pointer",
          fontFamily: "var(--sans)", fontSize: 13,
          color: "#FFFFFF", textAlign: "left",
          transition: "background 140ms ease, border-color 140ms ease",
        }}
      >
        <span aria-hidden style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "var(--signal)",
          color: "var(--signal-ink)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600,
          flexShrink: 0,
          border: "1px solid var(--ink-deep)",
        }}>{initial}</span>
        <span style={{
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontWeight: 500, color: "#FFFFFF",
        }}>{display}</span>
        <span aria-hidden style={{
          fontFamily: "var(--mono)", fontSize: 9,
          color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 200ms ease",
        }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          boxShadow: "0 12px 32px -8px rgba(0,0,0,0.28)",
          overflow: "hidden",
          zIndex: 40,
        }}>
          {email && (
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border-dim)",
              fontFamily: "var(--mono)", fontSize: 10.5,
              color: "var(--text-3)",
              letterSpacing: "0.02em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{email}</div>
          )}
          <MenuLink href="/settings" label="Settings" onClick={() => setOpen(false)} />
          <MenuLink href="/help"     label="Help"     onClick={() => setOpen(false)} />
          <button
            onClick={() => { signOut({ callbackUrl: "/" }); }}
            style={{
              width: "100%", textAlign: "left",
              padding: "10px 14px",
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "#A01B00", background: "transparent",
              border: "none", cursor: "pointer",
              borderTop: "1px solid var(--border-dim)",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, label, onClick }: {
  href: string; label: string; onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "block", padding: "10px 14px",
        fontFamily: "var(--sans)", fontSize: 13, color: "var(--ink-deep)",
        textDecoration: "none",
      }}
    >{label}</Link>
  );
}

/* ─────── Page header ─────── */

function PageHeader({ title, subtitle, actions }: {
  title?: string; subtitle?: string; actions?: React.ReactNode;
}) {
  return (
    <header style={{
      padding: "30px 40px 26px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      gap: 24, flexWrap: "wrap",
      position: "relative", zIndex: 2,
    }}>
      <div>
        {title && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span aria-hidden style={{
              width: 4, height: 28, background: "var(--signal)",
              borderRadius: 2, flexShrink: 0,
            }} />
            <h1 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(26px, 3vw, 34px)", lineHeight: 1.08,
              letterSpacing: "-0.016em", color: "var(--ink-deep)",
              margin: 0,
            }}>{title}</h1>
          </div>
        )}
        {subtitle && (
          <p style={{
            fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
            color: "var(--text-2)", letterSpacing: "-0.003em",
            margin: "8px 0 0 16px", maxWidth: "64ch", lineHeight: 1.5,
          }}>{subtitle}</p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}

/* ─────── Reusable primitives for app pages ─────── */

export function AppCard({
  title, note, children, noPad,
}: {
  title?: string; note?: string; children: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      background: "var(--bg)",
      borderRadius: 4,
      boxShadow: "0 1px 0 rgba(6,42,30,0.02), 0 12px 28px -18px rgba(6,42,30,0.14)",
      position: "relative",
      overflow: "hidden",
    }}>
      {(title || note) && (
        <div style={{
          padding: "12px 22px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(to right, var(--bg-off), var(--bg))",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 14, flexWrap: "wrap",
          position: "relative",
        }}>
          <span aria-hidden style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: 3, background: "var(--signal)",
          }} />
          {title && (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--ink-deep)",
            }}>
              {title}
            </div>
          )}
          {note && (
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.14em",
              color: "var(--text-3)",
            }}>{note}</div>
          )}
        </div>
      )}
      <div style={noPad ? undefined : { padding: "22px 24px" }}>
        {children}
      </div>
    </div>
  );
}

export function StatCell({
  label, value, hint, accent,
}: {
  label: string; value: React.ReactNode; hint?: string; accent?: "strong" | "moderate" | "weak";
}) {
  const accentColor = accent === "strong" ? "var(--ink-deep)"
    : accent === "moderate" ? "#6E5300"
    : accent === "weak" ? "#A01B00"
    : "var(--ink-deep)";
  const accentDot = accent === "strong" ? "var(--ink)"
    : accent === "moderate" ? "#D49900"
    : accent === "weak" ? "#D13A1E"
    : "var(--signal)";
  return (
    <div style={{
      padding: "20px 22px",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", gap: 8,
      background: "var(--bg)",
      position: "relative",
    }}>
      <span aria-hidden style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 2, background: accentDot, opacity: 0.5,
      }} />
      <div style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)",
        display: "inline-flex", alignItems: "center", gap: 7,
      }}>
        <span aria-hidden style={{
          width: 4, height: 4, borderRadius: 4, background: accentDot,
        }} />
        {label}
      </div>
      <div style={{
        fontFamily: "var(--display)", fontSize: 30, fontWeight: 500,
        letterSpacing: "-0.02em", color: accentColor,
        lineHeight: 1,
      }}>{value}</div>
      {hint && (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em",
          color: "var(--text-3)",
        }}>{hint}</div>
      )}
    </div>
  );
}

export function PrimaryCta({ children, href, onClick, disabled }: {
  children: React.ReactNode; href?: string; onClick?: () => void; disabled?: boolean;
}) {
  const style: React.CSSProperties = {
    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: "var(--signal-ink)", background: "var(--signal)",
    padding: "10px 18px", borderRadius: 999, textDecoration: "none",
    border: "1px solid var(--ink-deep)",
    display: "inline-flex", alignItems: "center", gap: 9,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    e.currentTarget.style.transform = "translateY(-1px)";
    e.currentTarget.style.boxShadow = "0 6px 14px rgba(6,42,30,0.12)";
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  };
  if (href) return <Link href={href} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</Link>;
  return <button type="button" onClick={onClick} disabled={disabled} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</button>;
}

export function GhostCta({ children, href, onClick, danger }: {
  children: React.ReactNode; href?: string; onClick?: () => void; danger?: boolean;
}) {
  const style: React.CSSProperties = {
    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: danger ? "#A01B00" : "var(--ink)",
    background: "transparent",
    padding: "10px 18px", borderRadius: 999, textDecoration: "none",
    border: `1px solid ${danger ? "rgba(160,27,0,0.35)" : "var(--border)"}`,
    display: "inline-flex", alignItems: "center", gap: 9,
    cursor: "pointer",
    transition: "border-color 140ms ease, background 140ms ease",
  };
  const onEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = danger ? "#A01B00" : "var(--ink)";
    e.currentTarget.style.background = danger ? "rgba(239,68,68,0.06)" : "var(--bg-off)";
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = danger ? "rgba(160,27,0,0.35)" : "var(--border)";
    e.currentTarget.style.background = "transparent";
  };
  if (href) return <Link href={href} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</Link>;
  return <button type="button" onClick={onClick} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</button>;
}

/* ─────── RAG helper (same palette as /area) ─────── */

export type AppRagTone = "strong" | "moderate" | "weak";
export function appRag(score: number): { tone: AppRagTone; fg: string; bg: string; dot: string; label: string } {
  if (score >= 70) return { tone: "strong",   fg: "var(--ink-deep)", bg: "var(--signal-dim)", dot: "var(--ink)",  label: "Strong"   };
  if (score >= 45) return { tone: "moderate", fg: "#6E5300",          bg: "#FFF4D1",            dot: "#D49900",     label: "Moderate" };
  return              { tone: "weak",     fg: "#A01B00",          bg: "#FFE8E2",            dot: "#D13A1E",     label: "Weak"     };
}
