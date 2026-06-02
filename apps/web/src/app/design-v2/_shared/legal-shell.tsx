"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Nav } from "./nav";
import { Footer } from "./footer";
import "./legal-shell.css";

/* LegalShell — long-form legal / policy layout (AR-204 PR).
   Brand v3 rewrite of the legacy Fraunces + .aiq + inline-style
   shell that backed /terms and /privacy.

   Locked surface plan (per Pedro's surface-rotation rule):
     Hero       DARK    eyebrow + title + last-updated + intro
     Body       cream   sticky sidebar TOC + main content column
     ContactCta DARK    bookend match with the hero

   Sub-components exported for consumer pages to compose section
   content. Each consumer page (/terms, /privacy) supplies an
   array of {id, label} for the sidebar TOC + the body children
   as a sequence of <LegalSection> elements. */

export type LegalSection = { id: string; label: string };

const CONTACT_EMAIL = "operation@onegoodarea.co.uk";

export function LegalShell({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  children: ReactNode;
}) {
  return (
    <div className="oga-root oga-legal">
      <Nav />
      <LegalHero
        eyebrow={eyebrow}
        title={title}
        lastUpdated={lastUpdated}
        intro={intro}
      />
      <LegalBody sections={sections}>{children}</LegalBody>
      <LegalContactCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   HERO (DARK)
   ============================================================ */
function LegalHero({
  eyebrow,
  title,
  lastUpdated,
  intro,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
}) {
  return (
    <section
      className="oga-section-dark oga-legal-hero"
      data-oga-surface="dark"
    >
      <div className="oga-legal-hero__inner">
        <div className="oga-legal-hero__eyebrow oga-eyebrow oga-eyebrow--inverse">
          <span className="oga-eyebrow-dot" aria-hidden />
          <span>{eyebrow}</span>
        </div>
        <h1 className="oga-legal-hero__title">{title}</h1>
        <p className="oga-legal-hero__intro">{intro}</p>
        <div className="oga-legal-hero__updated">
          <span className="oga-legal-hero__updated-label">Last updated</span>
          <span className="oga-legal-hero__updated-value">{lastUpdated}</span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BODY (cream) — sidebar + main column
   ============================================================ */
function LegalBody({
  sections,
  children,
}: {
  sections: LegalSection[];
  children: ReactNode;
}) {
  return (
    <section className="oga-legal-body" data-oga-surface="light">
      <div className="oga-legal-body__inner">
        <aside className="oga-legal-body__aside">
          <LegalSidebar sections={sections} />
        </aside>
        <div className="oga-legal-body__main">{children}</div>
      </div>
    </section>
  );
}

/* ============================================================
   SIDEBAR — sticky TOC with scroll-spy
   ============================================================ */
function LegalSidebar({ sections }: { sections: LegalSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [sections]);

  return (
    <nav className="oga-legal-sidebar" aria-label="On this page">
      <div className="oga-legal-sidebar__eyebrow">On this page</div>
      <ol className="oga-legal-sidebar__list">
        {sections.map((s, i) => {
          const isActive = active === s.id;
          return (
            <li key={s.id} className="oga-legal-sidebar__item">
              <a
                href={`#${s.id}`}
                className={
                  isActive
                    ? "oga-legal-sidebar__link oga-legal-sidebar__link--active"
                    : "oga-legal-sidebar__link"
                }
              >
                <span className="oga-legal-sidebar__num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ============================================================
   SECTION — single numbered section in the main column
   ============================================================ */
export function LegalSectionBlock({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="oga-legal-section">
      <div className="oga-legal-section__head">
        <span className="oga-legal-section__num">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="oga-legal-section__title">{title}</h2>
      </div>
      <div className="oga-legal-section__body">{children}</div>
    </section>
  );
}

/* Backwards-compatible alias so /terms and /privacy can keep
   importing the same name they used before the rewrite. */
export { LegalSectionBlock as LegalSection };

/* ============================================================
   INLINE PRIMITIVES — paragraph, emphasis, mail, link
   ============================================================ */
export function LegalP({ children }: { children: ReactNode }) {
  return <p className="oga-legal-p">{children}</p>;
}

export function LegalEmph({ children }: { children: ReactNode }) {
  return <strong className="oga-legal-emph">{children}</strong>;
}

export function LegalMail() {
  return (
    <a className="oga-legal-link" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  );
}

export function LegalLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a
        className="oga-legal-link"
        href={href}
        target="_blank"
        rel="noreferrer noopener"
      >
        {children}
      </a>
    );
  }
  return (
    <Link className="oga-legal-link" href={href}>
      {children}
    </Link>
  );
}

/* ============================================================
   CONTACT CTA (DARK) — closing strip before Footer
   ============================================================ */
function LegalContactCta() {
  return (
    <section
      className="oga-section-dark oga-legal-cta"
      data-oga-surface="dark"
    >
      <div className="oga-legal-cta__inner">
        <h2 className="oga-legal-cta__title">
          Questions about anything on this page?
        </h2>
        <p className="oga-legal-cta__lead">
          We read everything that lands at {CONTACT_EMAIL} and we usually
          reply within one business day.
        </p>
        <div className="oga-legal-cta__buttons">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="oga-btn oga-btn-primary"
          >
            Email us
            <span aria-hidden>→</span>
          </a>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
