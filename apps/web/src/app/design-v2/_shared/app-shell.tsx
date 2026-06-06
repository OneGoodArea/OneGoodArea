"use client";

import { useEffect, useState, type ReactNode, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { type IconName } from "./icons";
import { Sidebar, type SidebarSection } from "./dashboard/sidebar";
import "./app-shell.css";

/* AppShell — authenticated-surface chrome (AR-204 close-out 5/15).

   Brand v3 rewrite. Replaces the legacy .aiq + Fraunces +
   chartreuse-glow + JS-driven hover spaghetti.

   Surface plan:
     Sidebar (left)        DARK    sidebar nav + user chip + theme row
     Main (right)          cream   page header + content slot

   IMPORTANT: the 8 wrapped pages (/dashboard, /billing, /api-usage,
   /settings, /admin, /report, /report/[id], /compare) still carry
   legacy inline styles + tokens internally. The wrapping aiq
   className lets those .aiq tokens cascade until each page is
   individually migrated in the next sweep steps (or wiped by the
   dashboard restructure per docs/DESIGN/dashboard-proposal.md).

   Public API preserved: AppShell, AppCard, StatCell, PrimaryCta,
   GhostCta, appRag. Same prop signatures so all 8 callers compile
   without modification. */

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Dashboard",  icon: "dash",    exact: true },
  { href: "/report",    label: "New report", icon: "map" },
  { href: "/compare",   label: "Compare",    icon: "compare" },
];

const SECONDARY: NavItem[] = [
  { href: "/api-usage",         label: "API + usage", icon: "api" },
  { href: "/dashboard/billing", label: "Billing",     icon: "billing" },
  { href: "/settings",          label: "Settings",    icon: "key" },
];

/* ============================================================
   AppShell — the outer chrome
   ============================================================ */

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  /* Compose the existing nav arrays into the SidebarSection shape the
     <Sidebar> primitive expects. Active state is derived here (the
     primitive doesn't know about next/navigation). Phase 1 AR-217-B1
     will replace this with the new 4-section sitemap; this ticket
     preserves the current 2-section content (Main + Account). */
  const sections: SidebarSection[] = [
    {
      label: "Main",
      items: PRIMARY.map((item) => ({
        label: item.label,
        href: item.href,
        icon: <NavIconDark name={item.icon} />,
        active: isItemActive(pathname, item),
      })),
    },
    {
      label: "Account",
      items: SECONDARY.map((item) => ({
        label: item.label,
        href: item.href,
        icon: <NavIconDark name={item.icon} />,
        active: isItemActive(pathname, item),
      })),
    },
  ];

  return (
    <div className="oga-root oga-app" data-drawer-open={drawerOpen ? "true" : undefined}>
      <Sidebar
        sections={sections}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        top={
          <>
            <Wordmark href="/dashboard" size={20} tone="dark" />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="oga-app__sidebar-close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </>
        }
        bottom={
          <>
            <SidebarThemeRow />
            <UserChip
              name={session?.user?.name || null}
              email={session?.user?.email || null}
            />
          </>
        }
      />
      <main className="oga-app__main">
        <MobileTopbar title={title} onMenu={() => setDrawerOpen(true)} />
        {(title || actions) && (
          <PageHeader title={title} subtitle={subtitle} actions={actions} />
        )}
        <div className="oga-app__content">{children}</div>
      </main>
    </div>
  );
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/* ============================================================
   Mobile top bar — hamburger + wordmark + page title
   ============================================================ */

function MobileTopbar({
  title,
  onMenu,
}: {
  title?: string;
  onMenu: () => void;
}) {
  return (
    <div className="oga-app__topbar">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="oga-app__topbar-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <Wordmark href="/dashboard" size={18} />
      {title && (
        <>
          <span aria-hidden className="oga-app__topbar-sep" />
          <span className="oga-app__topbar-title">{title}</span>
        </>
      )}
    </div>
  );
}

/* Nav icons for the dark sidebar — also exported so the
   dashboard-primitives showcase + future Phase 1 surfaces consume
   the same canonical set instead of reinventing 16x16 glyphs. */
export { NavIconDark };

/* Nav icons for the dark sidebar. currentColor everywhere so the
   active / hover states drive the colour from CSS. */
function NavIconDark({ name }: { name: IconName }) {
  const common: SVGProps<SVGSVGElement> = {
    width: 16,
    height: 16,
    viewBox: "0 0 28 28",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "dash":
      return (
        <svg {...common}>
          <path d="M4 23 H24" />
          <rect x="6" y="16" width="4" height="6" />
          <rect x="12" y="12" width="4" height="10" />
          <rect x="18" y="7" width="4" height="15" fill="currentColor" />
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
          <circle cx="14" cy="11.5" r="2.2" fill="currentColor" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="9" height="14" />
          <rect x="15" y="7" width="9" height="14" />
        </svg>
      );
    case "api":
      return (
        <svg {...common}>
          <path d="M10 4 C7 4 7.5 8 7.5 11 C7.5 12.8 5.5 14 5.5 14 C5.5 14 7.5 15.2 7.5 17 C7.5 20 7 24 10 24" />
          <path d="M18 4 C21 4 20.5 8 20.5 11 C20.5 12.8 22.5 14 22.5 14 C22.5 14 20.5 15.2 20.5 17 C20.5 20 21 24 18 24" />
          <circle cx="14" cy="14" r="1.4" fill="currentColor" />
        </svg>
      );
    case "key":
      return (
        <svg {...common}>
          <circle cx="9" cy="11" r="4" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" />
          <path d="M13 11 L23 11" />
          <path d="M20 11 L20 13.5" />
          <path d="M17 11 L17 13" />
        </svg>
      );
    case "billing":
      return (
        <svg {...common}>
          <rect x="4" y="8" width="20" height="13" rx="1.5" />
          <path d="M4 12.5 H24" />
          <rect x="6" y="16" width="6" height="2.4" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="5" />
        </svg>
      );
  }
}

/* ============================================================
   Sidebar theme row (light/dark toggle)
   ============================================================ */

function SidebarThemeRow() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Valid mount-time pattern: hydrate from localStorage / data-theme
    // on first client render only. Runs once, no cascade because deps
    // array is empty.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    try {
      localStorage.setItem("aiq-theme", next);
    } catch {
      /* ignore */
    }
  }

  if (!mounted) return <div className="oga-app__theme-placeholder" />;

  const isDark = theme === "dark";
  const nextLabel = isDark ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="oga-app__theme"
    >
      <span className="oga-app__theme-left">
        <span aria-hidden className="oga-app__theme-glyph">
          {isDark ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span>Theme</span>
      </span>
      <span className="oga-app__theme-next">
        {nextLabel}
        <span aria-hidden>→</span>
      </span>
    </button>
  );
}

/* ============================================================
   User chip + sign-out menu
   ============================================================ */

function UserChip({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const display = name || email || "Account";
  const initial = (name || email || "?").slice(0, 1).toUpperCase();
  return (
    <div className="oga-app__user">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={open ? "oga-app__user-btn oga-app__user-btn--open" : "oga-app__user-btn"}
      >
        <span aria-hidden className="oga-app__user-avatar">
          {initial}
        </span>
        <span className="oga-app__user-name">{display}</span>
        <span aria-hidden className="oga-app__user-chevron">▼</span>
      </button>

      {open && (
        <div className="oga-app__user-menu">
          {email && <div className="oga-app__user-email">{email}</div>}
          <MenuLink href="/settings" label="Settings" onClick={() => setOpen(false)} />
          <MenuLink href="/help" label="Help" onClick={() => setOpen(false)} />
          <button
            type="button"
            onClick={() => {
              signOut({ callbackUrl: "/" });
            }}
            className="oga-app__user-signout"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="oga-app__user-menu-link">
      {label}
    </Link>
  );
}

/* ============================================================
   Page header (cream, sits above content)
   ============================================================ */

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="oga-app__header">
      <div className="oga-app__header-titles">
        {title && (
          <div className="oga-app__header-title-row">
            <span aria-hidden className="oga-app__header-mark" />
            <h1 className="oga-app__header-title">{title}</h1>
          </div>
        )}
        {subtitle && <p className="oga-app__header-sub">{subtitle}</p>}
      </div>
      {actions && <div className="oga-app__header-actions">{actions}</div>}
    </header>
  );
}

/* ============================================================
   Reusable primitives for app pages (exported)
   ============================================================ */

export function AppCard({
  title,
  note,
  children,
  noPad,
}: {
  title?: string;
  note?: string;
  children: ReactNode;
  noPad?: boolean;
}) {
  return (
    <div className="oga-app-card">
      {(title || note) && (
        <div className="oga-app-card__head">
          {title && <div className="oga-app-card__title">{title}</div>}
          {note && <div className="oga-app-card__note">{note}</div>}
        </div>
      )}
      <div className={noPad ? "oga-app-card__body oga-app-card__body--nopad" : "oga-app-card__body"}>
        {children}
      </div>
    </div>
  );
}

export function StatCell({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "strong" | "moderate" | "weak";
}) {
  return (
    <div className="oga-app-stat" data-accent={accent ?? "strong"}>
      <div className="oga-app-stat__label">
        <span aria-hidden className="oga-app-stat__dot" />
        {label}
      </div>
      <div className="oga-app-stat__value">{value}</div>
      {hint && <div className="oga-app-stat__hint">{hint}</div>}
    </div>
  );
}

export function PrimaryCta({
  children,
  href,
  onClick,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = "oga-app-cta oga-app-cta--primary";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function GhostCta({
  children,
  href,
  onClick,
  danger,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const className = danger
    ? "oga-app-cta oga-app-cta--ghost oga-app-cta--danger"
    : "oga-app-cta oga-app-cta--ghost";
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

/* ============================================================
   RAG helper (same palette as /area)
   ============================================================ */

export type AppRagTone = "strong" | "moderate" | "weak";

export function appRag(score: number): {
  tone: AppRagTone;
  fg: string;
  bg: string;
  dot: string;
  label: string;
} {
  if (score >= 70) {
    return {
      tone: "strong",
      fg: "var(--oga-fg)",
      bg: "rgba(26, 28, 31, 0.06)",
      dot: "var(--oga-fg)",
      label: "Strong",
    };
  }
  if (score >= 45) {
    return {
      tone: "moderate",
      fg: "#6E5300",
      bg: "#FFF4D1",
      dot: "#D49900",
      label: "Moderate",
    };
  }
  return {
    tone: "weak",
    fg: "#A01B00",
    bg: "#FFE8E2",
    dot: "#D13A1E",
    label: "Weak",
  };
}
