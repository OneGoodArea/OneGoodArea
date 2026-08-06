"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Wordmark } from "./wordmark";
import { SignalsIcon, ScoresIcon, MonitorIcon, IntelligenceIcon } from "./product-icons";
import { DocsHomeIcon, ApiReferenceIcon, McpServerIcon, ChangelogIcon, MethodologyIcon } from "./docs-icons";
import { ProptechIcon, LendersIcon, InsuranceIcon, CreIcon, PublicSectorIcon, EstateAgentsIcon } from "./icp-icons";
import { McpLogo } from "./editor-icons";
import { BookDemo } from "./book-demo";
import "./nav.css";

/* Marketing nav - Brand v3 Plotted (AR-204 PR 1).

   Structure:
     [Wordmark] - - - Products▾  Solutions▾  Methodology  Docs▾  Pricing - - - Sign in  Book a demo
                  └─ mega-menu   └─ ICP pages              └─ list

   Solutions dropdown surfaces the 6 buyer pages (/for/<slug>), PropTech
   featured above a divider.

   Products dropdown surfaces the 4 composable products (Signals /
   Scores / Monitor / Intelligence) with dot-composed icons. Each
   product page lives at /products/<slug>; until those pages ship,
   each row renders as a DISABLED button with a "Coming soon" pill -
   per AR-204 rule: any not-yet-wired control is disabled with an
   explicit indicator, never a fake working state.

   Docs dropdown links straight to existing routes (API Reference,
   MCP Server, Changelog).

   Methodology + Pricing are direct top-level links.

   Mobile drawer shows the same sections expanded. No inline styles
   anywhere - all visual styling lives in ./nav.css. Marcos's rule. */

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
  { slug: "scores",       title: "Scores",       sub: "Configurable 0-100 composite",  icon: ScoresIcon,       ready: true  },
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
  { label: "Docs home",     href: "/docs",                              icon: DocsHomeIcon },
  { label: "API reference", href: "/docs/api-reference",                icon: ApiReferenceIcon },
  { label: "Methodology",   href: "/methodology",                       icon: MethodologyIcon },
  { label: "MCP server",    href: "/docs/mcp",          badge: "NEW",   icon: McpServerIcon },
  { label: "Changelog",     href: "/changelog",                         icon: ChangelogIcon },
];

/* Solutions dropdown: the six buyer (ICP) pages under one menu, so the front
   door stays minimal. PropTech is featured (self-serve, the primary ICP) and
   sits above a divider; the rest are demo-led. Each row carries a bespoke ICP
   icon from icp-icons.tsx (same Plotted vocabulary as the product/docs icons). */
interface SolutionLink {
  slug: string;
  title: string;
  sub: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  featured?: boolean;
}

const SOLUTIONS: SolutionLink[] = [
  { slug: "proptech",      title: "For PropTech",      sub: "Area context on every listing",          icon: ProptechIcon,     featured: true },
  { slug: "lenders",       title: "For Lenders",       sub: "Scoring your model risk team can defend", icon: LendersIcon },
  { slug: "insurance",     title: "For Insurers",      sub: "Risk inputs and portfolio drift",         icon: InsuranceIcon },
  { slug: "cre",           title: "For CRE",           sub: "Rank every catchment in one query",       icon: CreIcon },
  { slug: "public-sector", title: "For Public Sector", sub: "Metrics that survive FOI",                icon: PublicSectorIcon },
  { slug: "estate-agents", title: "For Estate Agents", sub: "The area on the listing, before they ask", icon: EstateAgentsIcon },
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

  return (
    <>
      <AnnouncementBar />
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

            <NavDropdown label="Solutions" panelKind="solutions">
              <SolutionsPanel />
            </NavDropdown>

            <Link href="/playground" className="oga-nav__play">
              <span className="oga-nav__play-dot" aria-hidden />
              Playground
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
            {isSignedIn ? (
              <Link href="/dashboard" className="oga-btn oga-btn-primary">
                Dashboard
              </Link>
            ) : (
              <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
            )}
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
          <div className="oga-nav__drawer-section-head">Solutions</div>
          {SOLUTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.slug}
                href={`/for/${s.slug}`}
                onClick={() => setDrawerOpen(false)}
                className="oga-nav__drawer-link oga-nav__drawer-product"
              >
                <span className="oga-nav__drawer-product-icon"><Icon /></span>
                <span className="oga-nav__drawer-product-text">
                  <span className="oga-nav__drawer-product-title">{s.title}</span>
                  <span className="oga-nav__drawer-product-sub">{s.sub}</span>
                </span>
                <span aria-hidden className="oga-nav__drawer-link-arrow">→</span>
              </Link>
            );
          })}
        </div>

        <div className="oga-nav__drawer-section">
          <Link
            href="/playground"
            onClick={() => setDrawerOpen(false)}
            className="oga-nav__drawer-link"
          >
            Playground
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
          {isSignedIn ? (
            <Link
              href="/dashboard"
              onClick={() => setDrawerOpen(false)}
              className="oga-btn oga-btn-lg oga-btn-primary"
            >
              Dashboard
            </Link>
          ) : (
            <BookDemo
              className="oga-btn oga-btn-lg oga-btn-primary"
              onClick={() => setDrawerOpen(false)}
            >
              Book a demo
            </BookDemo>
          )}
        </div>
      </aside>
    </>
  );
}

/* ---------- Announcement bar ---------- */

/* Thin band above the nav. Whole bar is one link to /docs/mcp. Not
   sticky - scrolls away as the user moves down the page, leaving the
   regular nav stuck to top. Visible on every public page that mounts
   <Nav />. Copy points at the live MCP server (@oga-mcp/server@1.0.1
   on npm, e2e-proven via Claude Code, /docs/mcp documents all 11
   tools). */

function AnnouncementBar() {
  return (
    <Link href="/docs/mcp" className="oga-announce" aria-label="OneGoodArea is live as an MCP server. Read the docs.">
      <span className="oga-announce__inner">
        <span className="oga-announce__badge">NEW</span>
        <McpLogo className="oga-announce__icon" />
        <span className="oga-announce__copy oga-announce__copy--full">
          OneGoodArea is live as an MCP server. Use it inside your AI Agent.
        </span>
        <span className="oga-announce__copy oga-announce__copy--short">
          MCP server is live for Claude Desktop, Cursor, and Claude Code.
        </span>
        <span className="oga-announce__cta">
          Read the docs
          <span aria-hidden className="oga-announce__arrow">→</span>
        </span>
      </span>
    </Link>
  );
}

/* ---------- Dropdown shell ---------- */

function NavDropdown({
  label,
  panelKind,
  children,
}: {
  label: string;
  panelKind: "products" | "docs" | "solutions";
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
          /* Coming soon - disabled button, explicit indicator, NEVER a
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

/* ---------- Solutions dropdown panel ---------- */

function SolutionsPanel() {
  return (
    <>
      {SOLUTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <Fragment key={s.slug}>
            <Link
              href={`/for/${s.slug}`}
              role="menuitem"
              className={`oga-nav__item oga-nav__item--solution${s.featured ? " oga-nav__item--featured" : ""}`}
            >
              <span className="oga-nav__item-icon"><Icon /></span>
              <span className="oga-nav__item-text">
                <span className="oga-nav__item-title">{s.title}</span>
                <span className="oga-nav__item-sub">{s.sub}</span>
              </span>
            </Link>
            {s.featured && <span className="oga-nav__dropdown-sep" aria-hidden />}
          </Fragment>
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
