"use client";

import React from "react";
import Link from "next/link";
import { Styles } from "./styles";
import { Nav } from "./nav";
import { Footer } from "./footer";
import { Mark } from "./mark";

/* ═══════════════════════════════════════════════════════════════
   ErrorShell · bespoke error page layout for 404 / 500 / generic.
   Massive Fraunces error number with italic chartreuse digit.
   ═══════════════════════════════════════════════════════════════ */

export function ErrorShell({
  code, title, sub, primaryCta, secondaryCta, quickLinks,
}: {
  code: string;
  title: React.ReactNode;
  sub: React.ReactNode;
  primaryCta: { label: string; href?: string; onClick?: () => void };
  secondaryCta?: { label: string; href?: string; onClick?: () => void };
  quickLinks?: { label: string; href: string }[];
}) {
  // Split the code into an array of chars so we can italicise + colour the middle digit
  const chars = code.split("");
  const accentIdx = chars.length === 3 ? 1 : Math.max(0, chars.length - 1);

  return (
    <div className="aiq">
      <Styles />
      <Nav />

      <section style={{
        position: "relative",
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        padding: "80px 0 100px",
        overflow: "hidden",
        minHeight: "64vh",
        display: "flex", alignItems: "center",
      }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        }}>
          <div style={{
            position: "absolute", top: -200, left: "50%",
            transform: "translateX(-50%)",
            width: 860, height: 560,
            background: "radial-gradient(ellipse at center, rgba(212,243,58,0.16) 0%, rgba(212,243,58,0) 62%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(10,77,58,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 45%, transparent 85%)",
          }} />
        </div>

        <div style={{
          width: "100%", maxWidth: 880, margin: "0 auto",
          padding: "0 40px",
          position: "relative", zIndex: 1,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.24em", textTransform: "uppercase",
            color: "var(--text-2)",
            display: "inline-flex", alignItems: "center", gap: 9,
            marginBottom: 28,
          }}>
            <span aria-hidden style={{
              width: 6, height: 6, borderRadius: 6, background: "#b42318",
              boxShadow: "0 0 0 3px rgba(239,68,68,0.18)",
            }} />
            Status · HTTP {code}
          </div>

          <div style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(120px, 18vw, 220px)",
            lineHeight: 0.92, letterSpacing: "-0.04em",
            color: "var(--ink-deep)",
            margin: "0 0 8px",
            display: "inline-flex", alignItems: "baseline", gap: 0,
          }}>
            {chars.map((ch, i) => (
              <span
                key={i}
                style={i === accentIdx ? {
                  fontStyle: "italic",
                  color: "var(--ink)",
                  position: "relative",
                  display: "inline-block",
                } : undefined}
              >
                {ch}
                {i === accentIdx && (
                  <span aria-hidden style={{
                    position: "absolute", left: "8%", right: "8%", bottom: "12%",
                    height: 12, background: "var(--signal)",
                    opacity: 0.88,
                    zIndex: -1,
                  }} />
                )}
              </span>
            ))}
          </div>

          <h1 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(26px, 3.4vw, 36px)", lineHeight: 1.1,
            letterSpacing: "-0.016em", color: "var(--ink-deep)",
            margin: "18px 0 12px",
          }}>{title}</h1>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
            lineHeight: 1.55, color: "var(--text-2)",
            margin: "0 auto 32px", maxWidth: "50ch",
          }}>{sub}</p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <CtaButton {...primaryCta} primary />
            {secondaryCta && <CtaButton {...secondaryCta} />}
          </div>

          {quickLinks && quickLinks.length > 0 && (
            <div style={{
              marginTop: 40,
              display: "flex", gap: 22, justifyContent: "center", flexWrap: "wrap",
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-3)",
            }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Mark size={14} />
                Try instead
              </span>
              {quickLinks.map((l) => (
                <Link key={l.href} href={l.href} style={{
                  color: "var(--text-2)", textDecoration: "none",
                  transition: "color 140ms ease",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-deep)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-2)")}
                >{l.label}</Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function CtaButton({ label, href, onClick, primary }: {
  label: string; href?: string; onClick?: () => void; primary?: boolean;
}) {
  const style: React.CSSProperties = primary ? {
    fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: "var(--signal-ink)", background: "var(--signal)",
    padding: "14px 22px", borderRadius: 999, textDecoration: "none",
    border: "1px solid var(--ink-deep)",
    display: "inline-flex", alignItems: "center", gap: 9,
    cursor: "pointer",
    transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
    boxShadow: "0 1px 0 rgba(6,42,30,0.04)",
  } : {
    fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
    letterSpacing: "0.14em", textTransform: "uppercase",
    color: "var(--ink)", background: "transparent",
    padding: "14px 22px", borderRadius: 999, textDecoration: "none",
    border: "1px solid var(--border)",
    display: "inline-flex", alignItems: "center", gap: 9,
    cursor: "pointer",
    transition: "border-color 140ms ease, background 140ms ease",
  };
  const inner = (
    <>
      {label}
      <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
    </>
  );
  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (primary) {
      e.currentTarget.style.transform = "translateY(-1px)";
      e.currentTarget.style.boxShadow = "0 6px 16px rgba(6,42,30,0.12)";
    } else {
      e.currentTarget.style.borderColor = "var(--ink)";
      e.currentTarget.style.background = "var(--bg-off)";
    }
  };
  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (primary) {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 0 rgba(6,42,30,0.04)";
    } else {
      e.currentTarget.style.borderColor = "var(--border)";
      e.currentTarget.style.background = "transparent";
    }
  };
  if (href) {
    return (
      <Link href={href} style={style}
        onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} style={style}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {inner}
    </button>
  );
}
