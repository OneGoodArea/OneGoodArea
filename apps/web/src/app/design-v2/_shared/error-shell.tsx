"use client";

import Link from "next/link";
import { Nav } from "./nav";
import { Footer } from "./footer";
import "./error-shell.css";

/* ErrorShell — bespoke error-page layout (404 / 500 / generic).
   Brand v3 rewrite (AR-204 close-out sweep 2/16).

   Replaces the legacy Fraunces + chartreuse-underline accent + JS
   mouseenter/leave button-state spaghetti with a single DARK hero
   section, mono status pill, huge sans-display code number, H2
   title, lead, CTA pair, and an optional quick-links row.

   Public API simplified: title + sub are now plain strings (the
   legacy ReactNode shape only existed so callers could pass the
   inline-styled <em> chartreuse-underline hack, which Brand v3
   doesn't use). All 4 callers updated. */

type Cta = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function ErrorShell({
  code,
  title,
  sub,
  primaryCta,
  secondaryCta,
  quickLinks,
}: {
  code: string;
  title: string;
  sub: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
  quickLinks?: { label: string; href: string }[];
}) {
  return (
    <div className="oga-root oga-error">
      <Nav />

      <section
        className="oga-section-dark oga-error-hero"
        data-oga-surface="dark"
      >
        <div className="oga-error-hero__inner">
          <div className="oga-error-hero__status">
            <span className="oga-error-hero__status-dot" aria-hidden />
            <span>HTTP {code}</span>
          </div>

          <div className="oga-error-hero__code" aria-hidden>
            {code}
          </div>

          <h1 className="oga-error-hero__title">{title}</h1>
          <p className="oga-error-hero__lead">{sub}</p>

          <div className="oga-error-hero__cta">
            <CtaButton {...primaryCta} primary />
            {secondaryCta && <CtaButton {...secondaryCta} />}
          </div>

          {quickLinks && quickLinks.length > 0 && (
            <div className="oga-error-hero__quicklinks">
              <span className="oga-error-hero__quicklinks-label">
                Try instead
              </span>
              {quickLinks.map((l) => {
                const external = l.href.startsWith("mailto:") || l.href.startsWith("http");
                return external ? (
                  <a
                    key={l.href}
                    href={l.href}
                    className="oga-error-hero__quicklink"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="oga-error-hero__quicklink"
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CtaButton({ label, href, onClick, primary }: Cta & { primary?: boolean }) {
  const className = primary
    ? "oga-btn oga-btn-primary oga-error-hero__btn"
    : "oga-btn oga-btn-secondary oga-error-hero__btn";

  const inner = (
    <>
      {label}
      <span aria-hidden>→</span>
    </>
  );

  if (href) {
    const external = href.startsWith("mailto:") || href.startsWith("http");
    if (external) {
      return (
        <a href={href} className={className}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
