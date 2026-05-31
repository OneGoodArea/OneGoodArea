"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { SignalsIcon, ScoresIcon, MonitorIcon, IntelligenceIcon } from "./product-icons";
import { ApiReferenceIcon, McpServerIcon, ChangelogIcon } from "./docs-icons";
import "./nav.css";

/* Marketing nav — Brand v3 Plotted (AR-204 PR 1).

   Structure:
     [Wordmark] — — — Products▾  Methodology  Docs▾  Pricing — — — Sign in  Get started
                  └─ mega-menu                  └─ list                  └─ when signed out
                                                                          (Dashboard when signed in)

   Products dropdown surfaces the 4 composable products (Signals /
   Scores / Monitor / Intelligence) with dot-composed icons. Each
   product page lives at /products/<slug>; until those pages ship,
   each row renders as a DISABLED button with a "Coming soon" pill —
   per AR-204 rule: any not-yet-wired control is disabled with an
   explicit indicator, never a fake working state.

   Docs dropdown links straight to existing routes (API Reference,
   MCP Server, Changelog).

   Methodology + Pricing are direct top-level links.

   Mobile drawer shows the same sections expanded. No inline styles
   anywhere — all visual styling lives in ./nav.css. Marcos's rule. */

type ProductSlug = "signals" | "scores" | "monitor" | "intelligence";

interface ProductLink {
  slug: ProductSlug;
  title: string;
  sub: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /* Set to true once the page exists at /products/<slug>. While
     false, the row renders disabled + "Coming soon". */
  ready: boolean;
}

const PRODUCTS: ProductLink[] = [
  { slug: "signals",      title: "Signals",      sub: "Raw normalized data per LSOA",   icon: SignalsIcon,      ready: true  },
  { slug: "scores",       title: "Scores",       sub: "Configurable 0–100 composite",  icon: ScoresIcon,       ready: true  },
  { slug: "monitor",      title: "Monitor",      sub: "Portfolios + change alerts",    icon: MonitorIcon,      ready: true  },
  { slug: "intelligence", title: "Intelligence", sub: "Typed query plane (NL + JSON)", icon: IntelligenceIcon, ready: true  },
];

interface DocsLink {
  label: string;
  href: string;
  badge?: "NEW";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const DOCS: DocsLink[] = [
  { label: "API reference", href: "/docs/api-reference",                icon: ApiReferenceIcon },
  { label: "MCP server",    href: "/docs/mcp",          badge: "NEW",   icon: McpServerIcon },
  { label: "Changelog",     href: "/changelog",                         icon: ChangelogIcon },
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
        className={`oga-nav${scrolled ? " oga-nav-glass" : ""}`}
        data-oga-surface={overDarkHero ? "dark" : undefined}
      >
        <div className="oga-nav__row">
          <Wordmark href="/" size={18} />

          <div className="oga-nav__spacer" />

          <div className="oga-nav__center">
            <NavDropdown label="Products" panelKind="products">
              <ProductsPanel />
            </NavDropdown>

            <Link href="/methodology" className="oga-nav__link">
              Methodology
            </Link>

            <NavDropdown label="Docs" panelKind="docs">
              <DocsPanel />
            </NavDropdown>

            <Link href="/pricing" className="oga-nav__link">
              Pricing
            </Link>
          </div>

          <div className="oga-nav__spacer" />

          <div className="oga-nav__right">
            {!isSignedIn && (
              <Link href="/sign-in" className="oga-nav__signin">
                Sign in
              </Link>
            )}
            <Link href={ctaHref} className="oga-btn oga-btn-primary">
              {ctaLabel}
            </Link>
          </div>

          <button
            type="button"
            className="oga-nav__burger"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      <div
        className="oga-nav__backdrop"
        data-open={drawerOpen ? "true" : "false"}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <aside
        className="oga-nav__drawer"
        data-open={drawerOpen ? "true" : "false"}
        aria-hidden={!drawerOpen}
      >
        <div className="oga-nav__drawer-head">
          <Wordmark href="/" size={20} />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="oga-nav__drawer-close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="oga-nav__drawer-section">
          <div className="oga-nav__drawer-section-head">Products</div>
          {PRODUCTS.map((p) => (
            <MobileProductRow key={p.slug} product={p} onNavigate={() => setDrawerOpen(false)} />
          ))}
        </div>

        <div className="oga-nav__drawer-section">
          <Link
            href="/methodology"
            onClick={() => setDrawerOpen(false)}
            className="oga-nav__drawer-link"
          >
            Methodology
            <span aria-hidden className="oga-nav__drawer-link-arrow">→</span>
          </Link>
          <Link
            href="/pricing"
            onClick={() => setDrawerOpen(false)}
            className="oga-nav__drawer-link"
          >
            Pricing
            <span aria-hidden className="oga-nav__drawer-link-arrow">→</span>
          </Link>
        </div>

        <div className="oga-nav__drawer-section">
          <div className="oga-nav__drawer-section-head">Docs</div>
          {DOCS.map((d) => {
            const Icon = d.icon;
            return (
              <Link
                key={d.href}
                href={d.href}
                onClick={() => setDrawerOpen(false)}
                className="oga-nav__drawer-link oga-nav__drawer-product"
              >
                <span className="oga-nav__drawer-product-icon"><Icon /></span>
                <span className="oga-nav__drawer-product-text">
                  <span className="oga-nav__drawer-product-title">{d.label}</span>
                </span>
                {d.badge ? (
                  <span className="oga-nav__item-pill oga-nav__item-pill--new">{d.badge}</span>
                ) : (
                  <span aria-hidden className="oga-nav__drawer-link-arrow">→</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="oga-nav__drawer-spacer" />

        <div className="oga-nav__drawer-foot">
          {!isSignedIn && (
            <Link
              href="/sign-in"
              onClick={() => setDrawerOpen(false)}
              className="oga-btn oga-btn-lg oga-btn-secondary"
            >
              Sign in
            </Link>
          )}
          <Link
            href={ctaHref}
            onClick={() => setDrawerOpen(false)}
            className="oga-btn oga-btn-lg oga-btn-primary"
          >
            {ctaLabel}
          </Link>
        </div>
      </aside>
    </>
  );
}

/* ---------- Dropdown shell ---------- */

function NavDropdown({
  label,
  panelKind,
  children,
}: {
  label: string;
  panelKind: "products" | "docs";
  children: React.ReactNode;
}) {
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
      className="oga-nav__dropdown-wrap"
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={() => scheduleClose()}
    >
      <button
        type="button"
        className="oga-nav__trigger"
        data-open={open ? "true" : "false"}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
      >
        {label}
        <span aria-hidden className="oga-nav__trigger-caret">▾</span>
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        data-open={open ? "true" : "false"}
        className={`oga-nav__dropdown oga-nav__dropdown--${panelKind}`}
      >
        {children}
      </div>
    </span>
  );
}

/* ---------- Products mega-menu panel ---------- */

function ProductsPanel() {
  return (
    <>
      {PRODUCTS.map((p) => {
        const Icon = p.icon;
        if (!p.ready) {
          /* Coming soon — disabled button, explicit indicator, NEVER a
             fake link. AR-204 wiring rule. */
          return (
            <button
              key={p.slug}
              type="button"
              role="menuitem"
              aria-disabled="true"
              disabled
              className="oga-nav__item oga-nav__item--product"
            >
              <span className="oga-nav__item-icon"><Icon /></span>
              <span className="oga-nav__item-text">
                <span className="oga-nav__item-title">{p.title}</span>
                <span className="oga-nav__item-sub">{p.sub}</span>
              </span>
              <span className="oga-nav__item-pill oga-nav__item-pill--soon">Coming soon</span>
            </button>
          );
        }
        return (
          <Link
            key={p.slug}
            href={`/products/${p.slug}`}
            role="menuitem"
            className="oga-nav__item oga-nav__item--product"
          >
            <span className="oga-nav__item-icon"><Icon /></span>
            <span className="oga-nav__item-text">
              <span className="oga-nav__item-title">{p.title}</span>
              <span className="oga-nav__item-sub">{p.sub}</span>
            </span>
          </Link>
        );
      })}
    </>
  );
}

/* ---------- Docs dropdown panel ---------- */

function DocsPanel() {
  return (
    <>
      {DOCS.map((d) => {
        const Icon = d.icon;
        return (
          <Link
            key={d.href}
            href={d.href}
            role="menuitem"
            className="oga-nav__item oga-nav__item--docs"
          >
            <span className="oga-nav__item-icon"><Icon /></span>
            <span className="oga-nav__item-text-single">{d.label}</span>
            {d.badge && (
              <span className="oga-nav__item-pill oga-nav__item-pill--new">{d.badge}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}

/* ---------- Mobile drawer product row ---------- */

function MobileProductRow({ product, onNavigate }: { product: ProductLink; onNavigate: () => void }) {
  const Icon = product.icon;
  if (!product.ready) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="oga-nav__drawer-link oga-nav__drawer-product"
      >
        <span className="oga-nav__drawer-product-icon"><Icon /></span>
        <span className="oga-nav__drawer-product-text">
          <span className="oga-nav__drawer-product-title">{product.title}</span>
          <span className="oga-nav__drawer-product-sub">{product.sub}</span>
        </span>
        <span className="oga-nav__item-pill oga-nav__item-pill--soon">Soon</span>
      </button>
    );
  }
  return (
    <Link
      href={`/products/${product.slug}`}
      onClick={onNavigate}
      className="oga-nav__drawer-link oga-nav__drawer-product"
    >
      <span className="oga-nav__drawer-product-icon"><Icon /></span>
      <span className="oga-nav__drawer-product-text">
        <span className="oga-nav__drawer-product-title">{product.title}</span>
        <span className="oga-nav__drawer-product-sub">{product.sub}</span>
      </span>
      <span aria-hidden className="oga-nav__drawer-link-arrow">→</span>
    </Link>
  );
}
