"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wordmark } from "./wordmark";

/* Footer — Plotted brand v3 (AR-152).

   Same IA as before: Areas · Business · API · Methodology · Pricing ·
   About · Blog · Changelog · Help · Terms · Privacy across three editorial
   columns. Plotted treatment: Geist throughout, no chartreuse, no italic
   tagline. Tagline carries the new category sentence. */

export function Footer() {
  const productLinks: { label: string; href: string }[] = [
    { label: "Areas",        href: "/area/london" },
    { label: "Methodology",  href: "/methodology" },
    { label: "Changelog",    href: "/changelog" },
    { label: "Blog",         href: "/blog" },
  ];
  const businessLinks: { label: string; href: string }[] = [
    { label: "For business", href: "/business" },
    { label: "API",          href: "/docs" },
    { label: "Pricing",      href: "/pricing" },
  ];
  const companyLinks: { label: string; href: string }[] = [
    { label: "About",   href: "/about" },
    { label: "Help",    href: "/help" },
    { label: "Contact", href: "mailto:hello@onegoodarea.com" },
  ];
  const legalLinks: { label: string; href: string }[] = [
    { label: "Terms",   href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ];
  const socialLinks: { label: string; href: string }[] = [
    { label: "Email",    href: "mailto:hello@onegoodarea.com" },
    { label: "GitHub",   href: "https://github.com/OneGoodArea/OneGoodArea" },
    { label: "LinkedIn", href: "#" },
    { label: "X",        href: "#" },
  ];

  return (
    <footer className="oga-root" data-oga-surface="dark" style={{
      background: "var(--oga-bg)",
      color: "var(--oga-fg)",
      borderTop: "1px solid var(--oga-border)",
      padding: "96px 0 32px",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div className="aiq-footer-top" style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
          gap: 48,
          marginBottom: 84,
        }}>
          <div className="aiq-footer-brand">
            <div style={{ marginBottom: 24 }}>
              <Wordmark href="/" size={24} />
            </div>
            <p style={{
              fontFamily: "var(--oga-font-sans)", fontSize: 17, fontWeight: 400,
              lineHeight: 1.4,
              color: "var(--oga-fg-subtle)", letterSpacing: "-0.005em",
              margin: "0 0 26px", maxWidth: "32ch",
              textWrap: "pretty",
            }}>
              the decision-grade area intelligence layer for property workflows.
            </p>
            <Link href="/" className="oga-btn oga-btn-sm oga-btn-secondary" style={{ alignSelf: "flex-start" }}>
              Try a postcode
              <span aria-hidden style={{ marginLeft: 4 }}>→</span>
            </Link>
          </div>

          <FooterColumn title="Product"  links={productLinks} />
          <FooterColumn title="Business" links={businessLinks} />
          <FooterColumn title="Company"  links={companyLinks} />
        </div>

        <div className="aiq-footer-bottom" style={{
          borderTop: "1px solid var(--oga-border)",
          paddingTop: 26,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 20, flexWrap: "wrap",
        }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: 16, flexWrap: "wrap",
          }}>
            <span className="oga-label" style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--oga-fg-muted)",
            }}>© 2026 OneGoodArea · Built in the UK</span>
            <span aria-hidden style={{
              width: 1, height: 10, background: "var(--oga-border)",
            }} />
            <div style={{ display: "flex", gap: 14 }}>
              {legalLinks.map((l) => (
                <FooterMiniLink key={l.label} href={l.href} label={l.label} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {socialLinks.map((s) => (
              <FooterMiniLink key={s.label} href={s.href} label={s.label} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title, links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <div className="oga-label" style={{
        fontSize: 10,
        letterSpacing: "0.24em",
        color: "var(--oga-fg-muted)",
        marginBottom: 22,
      }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {links.map((l) => (
          <li key={l.label} style={{ marginBottom: 12 }}>
            <FooterColumnLink href={l.href} label={l.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterColumnLink({ href, label }: { href: string; label: string }) {
  const [hover, setHover] = useState(false);
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const shared = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      fontFamily: "var(--oga-font-sans)", fontSize: 14.5, fontWeight: 400,
      color: hover ? "var(--oga-fg)" : "var(--oga-fg-subtle)",
      textDecoration: "none", letterSpacing: "-0.005em",
      transition: "color var(--oga-dur-fast) var(--oga-ease)",
      display: "inline-block",
    },
  };
  return isExternal
    ? <a href={href} {...shared}>{label}</a>
    : <Link href={href} {...shared}>{label}</Link>;
}

function FooterMiniLink({ href, label }: { href: string; label: string }) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const shared = {
    style: {
      fontFamily: "var(--oga-font-mono)", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.2em", textTransform: "uppercase" as const,
      color: "var(--oga-fg-muted)", textDecoration: "none",
      transition: "color var(--oga-dur-fast) var(--oga-ease)",
    },
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) =>
      (e.currentTarget.style.color = "var(--oga-fg)"),
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) =>
      (e.currentTarget.style.color = "var(--oga-fg-muted)"),
  };
  return isExternal
    ? <a href={href} {...shared}>{label}</a>
    : <Link href={href} {...shared}>{label}</Link>;
}
