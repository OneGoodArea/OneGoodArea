"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wordmark } from "./wordmark";

/* Footer · IA mirrors the live product footer (Areas · Business · API ·
   Methodology · Pricing · About · Blog · Changelog · Help · Terms · Privacy)
   grouped into three editorial columns. Visual language matches the nav:
   Fraunces wordmark, mono small-caps headers, chartreuse slide-in underline. */

export function Footer() {
  const productLinks: { label: string; href: string }[] = [
    { label: "Areas",        href: "/area/london" },
    { label: "Methodology",  href: "/design-v2/methodology" },
    { label: "Changelog",    href: "/changelog" },
    { label: "Blog",         href: "/blog" },
  ];
  const businessLinks: { label: string; href: string }[] = [
    { label: "For business", href: "/design-v2/business" },
    { label: "API",          href: "/design-v2/docs" },
    { label: "Pricing",      href: "/design-v2/pricing" },
  ];
  const companyLinks: { label: string; href: string }[] = [
    { label: "About",   href: "/design-v2/about" },
    { label: "Help",    href: "/help" },
    { label: "Contact", href: "mailto:hello@area-iq.co.uk" },
  ];
  const legalLinks: { label: string; href: string }[] = [
    { label: "Terms",   href: "/design-v2/terms" },
    { label: "Privacy", href: "/design-v2/privacy" },
  ];
  const socialLinks: { label: string; href: string }[] = [
    { label: "Email",    href: "mailto:hello@area-iq.co.uk" },
    { label: "GitHub",   href: "https://github.com/ptengelmann/AreaIQ-" },
    { label: "LinkedIn", href: "#" },
    { label: "X",        href: "#" },
  ];

  return (
    <footer style={{
      background: "var(--bg-off)",
      borderTop: "1px solid var(--border)",
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
              <Wordmark href="/design-v2" size={26} />
            </div>
            <p style={{
              fontFamily: "var(--display)", fontSize: 19, fontWeight: 400,
              fontStyle: "italic", lineHeight: 1.32,
              color: "var(--ink)", letterSpacing: "-0.012em",
              margin: "0 0 26px", maxWidth: "28ch",
            }}>
              An intelligence report for every UK postcode.
            </p>
            <Link href="/design-v2" style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--ink-deep)", textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 8,
              borderBottom: "1px solid var(--ink-deep)", paddingBottom: 3,
              transition: "gap 160ms ease",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.gap = "12px")}
              onMouseLeave={(e) => (e.currentTarget.style.gap = "8px")}
            >
              Try a postcode
              <span aria-hidden>→</span>
            </Link>
          </div>

          <FooterColumn title="Product"  links={productLinks} />
          <FooterColumn title="Business" links={businessLinks} />
          <FooterColumn title="Company"  links={companyLinks} />
        </div>

        <div className="aiq-footer-bottom" style={{
          borderTop: "1px solid var(--border)",
          paddingTop: 26,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 20, flexWrap: "wrap",
        }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: 16, flexWrap: "wrap",
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--text-3)",
            }}>© 2026 OneGoodArea · Built in the UK</span>
            <span aria-hidden style={{
              width: 1, height: 10, background: "var(--border)",
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
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.24em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 22,
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
      fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
      color: hover ? "var(--ink-deep)" : "var(--text)",
      textDecoration: "none", letterSpacing: "-0.005em",
      position: "relative" as const, paddingBottom: 3,
      transition: "color 140ms ease",
      display: "inline-block",
    },
  };
  const inner = (
    <>
      {label}
      <span aria-hidden style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: 1.5, background: "var(--signal)",
        transform: hover ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left center",
        transition: "transform 260ms cubic-bezier(0.16,1,0.3,1)",
      }} />
    </>
  );
  return isExternal
    ? <a href={href} {...shared}>{inner}</a>
    : <Link href={href} {...shared}>{inner}</Link>;
}

function FooterMiniLink({ href, label }: { href: string; label: string }) {
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");
  const shared = {
    style: {
      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.2em", textTransform: "uppercase" as const,
      color: "var(--text-2)", textDecoration: "none",
      transition: "color 120ms",
    },
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) =>
      (e.currentTarget.style.color = "var(--ink)"),
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) =>
      (e.currentTarget.style.color = "var(--text-2)"),
  };
  return isExternal
    ? <a href={href} {...shared}>{label}</a>
    : <Link href={href} {...shared}>{label}</Link>;
}
