"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Styles } from "./styles";
import { Nav } from "./nav";
import { Footer } from "./footer";

/* ═══════════════════════════════════════════════════════════════
   LegalShell · long-form legal/policy layout with sticky sidebar
   scrollspy TOC. Shared across /terms and /privacy.
   ═══════════════════════════════════════════════════════════════ */

export type LegalSection = { id: string; label: string };

export function LegalShell({
  eyebrow, title, lastUpdated, intro, sections, children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  children: React.ReactNode;
}) {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <LegalHero eyebrow={eyebrow} title={title} lastUpdated={lastUpdated} intro={intro} />
      <LegalBody sections={sections}>{children}</LegalBody>
      <LegalFoot />
      <Footer />
    </div>
  );
}

function LegalHero({ eyebrow, title, lastUpdated, intro }: {
  eyebrow: string; title: React.ReactNode; lastUpdated: string; intro: React.ReactNode;
}) {
  return (
    <section style={{
      position: "relative",
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: -220, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 520,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 1000, margin: "0 auto",
        padding: "92px 40px 56px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.24em", textTransform: "uppercase",
          color: "var(--text-2)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 22,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--signal)",
            animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
          }} />
          {eyebrow}
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 18px", maxWidth: "24ch",
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.58, color: "var(--text-2)",
          letterSpacing: "-0.003em",
          margin: "0 0 20px", maxWidth: "62ch",
        }}>
          {intro}
        </p>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "7px 11px",
          border: "1px solid var(--border)", borderRadius: 2,
          background: "var(--bg-off)",
        }}>
          <span aria-hidden style={{
            width: 5, height: 5, borderRadius: 5, background: "var(--signal)",
          }} />
          Last updated · {lastUpdated}
        </div>
      </div>
    </section>
  );
}

function LegalBody({ sections, children }: {
  sections: LegalSection[]; children: React.ReactNode;
}) {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 120px",
    }}>
      <div className="aiq-legal-wrap" style={{
        maxWidth: 1240, margin: "0 auto", padding: "0 40px",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 72, alignItems: "start",
      }}>
        <LegalSidebar sections={sections} />
        <article style={{ minWidth: 0, maxWidth: 760 }}>
          {children}
        </article>
      </div>
    </section>
  );
}

function LegalSidebar({ sections }: { sections: LegalSection[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0% -55% 0%", threshold: [0, 0.25, 0.5] }
    );
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [sections]);

  return (
    <aside className="aiq-legal-sidebar" style={{
      position: "sticky", top: 96, alignSelf: "start",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 16,
      }}>Contents</div>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {sections.map((s, i) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} style={{
                display: "inline-flex", alignItems: "baseline", gap: 10,
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.04em",
                color: isActive ? "var(--ink-deep)" : "var(--text-2)",
                textDecoration: "none",
                padding: "6px 0 6px 8px",
                borderLeft: isActive ? "2px solid var(--signal)" : "2px solid transparent",
                transition: "color 140ms ease, border-color 140ms ease",
              }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10,
                  color: "var(--text-3)", fontVariantNumeric: "tabular-nums",
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/* ─────── Article primitives ─────── */

export function LegalSection({ id, n, title, children }: {
  id: string; n: number; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{
      scrollMarginTop: 88,
      padding: "36px 0 40px",
      borderBottom: "1px solid var(--border-dim)",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 10,
      }}>§ {String(n).padStart(2, "0")}</div>
      <h2 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: "clamp(24px, 2.8vw, 30px)", lineHeight: 1.12,
        letterSpacing: "-0.014em", color: "var(--ink-deep)",
        margin: "0 0 18px",
      }}>{title}</h2>
      <div style={{
        fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
        lineHeight: 1.66, color: "var(--text-2)",
        letterSpacing: "-0.003em",
      }}>
        {children}
      </div>
    </section>
  );
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 14px" }}>{children}</p>
  );
}

export function LegalEmph({ children }: { children: React.ReactNode }) {
  return (
    <strong style={{
      fontWeight: 600, color: "var(--ink-deep)",
      background: "var(--signal-dim)",
      padding: "1px 5px", borderRadius: 2,
    }}>{children}</strong>
  );
}

export function LegalMail() {
  return (
    <a href="mailto:hello@onegoodarea.com" style={{
      color: "var(--ink-deep)", textDecoration: "none",
      borderBottom: "1px solid var(--ink-deep)", paddingBottom: 1,
      fontFamily: "var(--mono)", fontSize: 14,
    }}>
      hello@onegoodarea.com
    </a>
  );
}

function LegalFoot() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 72px",
    }}>
      <div style={{
        maxWidth: 1000, margin: "0 auto", padding: "0 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 24, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 8,
          }}>Questions</div>
          <div style={{
            fontFamily: "var(--display)", fontSize: 22, fontWeight: 400,
            letterSpacing: "-0.012em", color: "var(--ink-deep)",
            margin: 0,
          }}>
            Drop us a line at <LegalMail />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/terms" style={pillLink}>Terms</Link>
          <Link href="/privacy" style={pillLink}>Privacy</Link>
          <Link href="/help" style={pillLink}>Help</Link>
        </div>
      </div>
    </section>
  );
}

const pillLink: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
  letterSpacing: "0.18em", textTransform: "uppercase",
  color: "var(--ink-deep)",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  padding: "8px 14px", borderRadius: 999,
  textDecoration: "none",
};
