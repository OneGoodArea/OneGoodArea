"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { Wordmark } from "./wordmark";
import { XIcon, LinkedInIcon, EmailIcon } from "./social-icons";
import "./footer.css";

/* Footer — Plotted brand v3, reorganized (AR-204 PR 2 commit 8).

   Column reorg:
     Brand  |  Products  |  Docs  |  Company

   - Brand cell carries v3 positioning + "Get an API key" CTA
     (was "Try a postcode" — Pedro: consumer-tool framing).
   - Products column surfaces the 4 composable products. Each link
     points to /products/<slug>; since those pages do not exist yet
     they render disabled with a "Soon" pill (wiring rule).
   - Docs column = the real route surface (API ref, MCP server,
     Methodology, Changelog).
   - Company column = About, Business, Pricing, Help, Blog, Contact.
   - Social row: real brand-logo silhouettes for X, LinkedIn, Email.
     GitHub removed.
   - Zero inline styles (Marcos's rule). All visuals in ./footer.css. */

interface ProductLink {
  label: string;
  href: string;
  ready: boolean;
}

const PRODUCTS: ProductLink[] = [
  { label: "Signals",      href: "/products/signals",      ready: true  },
  { label: "Scores",       href: "/products/scores",       ready: true  },
  { label: "Monitor",      href: "/products/monitor",      ready: true  },
  { label: "Intelligence", href: "/products/intelligence", ready: true  },
];

const DOCS: Array<{ label: string; href: string }> = [
  { label: "API reference", href: "/docs/api-reference" },
  { label: "MCP server",    href: "/docs/mcp" },
  { label: "Methodology",   href: "/methodology" },
  { label: "Changelog",     href: "/changelog" },
];

const COMPANY: Array<{ label: string; href: string }> = [
  { label: "About",    href: "/about" },
  { label: "Business", href: "/business" },
  { label: "Pricing",  href: "/pricing" },
  { label: "Help",     href: "/help" },
  { label: "Contact",  href: "mailto:operation@onegoodarea.co.uk" },
];

const LEGAL: Array<{ label: string; href: string }> = [
  { label: "Terms",       href: "/terms" },
  { label: "Privacy",     href: "/privacy" },
  // AR-385: separate from Privacy. Privacy Policy is the lawyer doc (pending);
  // Data Policy is the practical "what we store, how to opt out" reference,
  // sourced from docs/DATA_POLICY.md.
  { label: "Data Policy", href: "/legal/data-policy" },
];

interface SocialLink {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const SOCIAL: SocialLink[] = [
  { label: "X",        href: "https://x.com/onegoodarea",              Icon: XIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/onegoodarea", Icon: LinkedInIcon },
  { label: "Email",    href: "mailto:operation@onegoodarea.co.uk",           Icon: EmailIcon },
];

export function Footer() {
  return (
    <footer className="oga-footer oga-root" data-oga-surface="dark">
      <div className="oga-footer__inner">
        <div className="oga-footer__top">
          <div className="oga-footer__brand">
            <div className="oga-footer__brand-wrap">
              <Wordmark href="/" size={24} />
            </div>
            <p className="oga-footer__tagline">
              The data and intelligence layer underneath UK property workflows.
            </p>
            <Link href="/sign-up" className="oga-btn oga-btn-sm oga-btn-secondary oga-footer__cta">
              Get an API key
              <span aria-hidden>→</span>
            </Link>
          </div>

          <FooterColumn title="Products">
            {PRODUCTS.map((p) => (
              <li key={p.label} className="oga-footer__col-item">
                {p.ready ? (
                  <Link href={p.href} className="oga-footer__link">{p.label}</Link>
                ) : (
                  <span className="oga-footer__link" aria-disabled="true">
                    {p.label}
                    <span className="oga-footer__link-pill">Soon</span>
                  </span>
                )}
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Docs">
            {DOCS.map((d) => (
              <li key={d.label} className="oga-footer__col-item">
                <Link href={d.href} className="oga-footer__link">{d.label}</Link>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Company">
            {COMPANY.map((c) => (
              <li key={c.label} className="oga-footer__col-item">
                {c.href.startsWith("mailto:") ? (
                  <a href={c.href} className="oga-footer__link">{c.label}</a>
                ) : (
                  <Link href={c.href} className="oga-footer__link">{c.label}</Link>
                )}
              </li>
            ))}
          </FooterColumn>
        </div>

        <div className="oga-footer__bottom">
          <div className="oga-footer__bottom-left">
            <span className="oga-footer__copy">© 2026 OneGoodArea · Built in the UK</span>
            <span aria-hidden className="oga-footer__mini-sep" />
            <div className="oga-footer__legal">
              {LEGAL.map((l) => (
                <Link key={l.label} href={l.href} className="oga-footer__mini-link">{l.label}</Link>
              ))}
            </div>
          </div>

          <div className="oga-footer__social">
            {SOCIAL.map((s) => {
              const Icon = s.Icon;
              const external = s.href.startsWith("http") || s.href.startsWith("mailto:");
              const className = "oga-footer__social-link";
              const inner = <Icon />;
              return external ? (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className={className}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {inner}
                </a>
              ) : (
                <Link key={s.label} href={s.href} aria-label={s.label} className={className}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="oga-footer__col-title">{title}</div>
      <ul className="oga-footer__col-list">{children}</ul>
    </div>
  );
}
