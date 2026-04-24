"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /changelog
   Reverse-chronological release list with editorial timeline.
   Content ported from live /changelog; OneGoodArea throughout.
   ═══════════════════════════════════════════════════════════════ */

type EntryType = "feature" | "fix" | "improvement";

type Entry = { type: EntryType; title: string; description?: string };
type Month = { month: string; entries: Entry[] };

const CHANGELOG: Month[] = [
  {
    month: "March 2026",
    entries: [
      { type: "feature", title: "Ofsted school inspection ratings", description: "Reports now include Ofsted ratings for nearby schools in England. Each school shown with its rating and distance. School quality factors into the Schools and Education score. Visible on reports and in PDF exports." },
      { type: "feature", title: "IMD 2025 deprivation data",       description: "English deprivation data upgraded from IMD 2019 to IMD 2025. Now covers 33,755 neighbourhoods using the latest census boundaries." },
      { type: "feature", title: "Blog",                              description: "New /blog section with data-driven posts on UK areas, property investment, and home buying." },
      { type: "feature", title: "Dark and light theme toggle",      description: "Switch between dark and light mode from the navbar. Warm off-white palette in light mode. Persists across sessions." },
      { type: "feature", title: "HM Land Registry integration",     description: "Real sold prices from the Land Registry Price Paid API. Median price, YoY trends, property type breakdown, tenure split, and price range." },
      { type: "feature", title: "Property Market panel on reports", description: "New report section with local property market data. Available on Pro plans and above." },
      { type: "feature", title: "Data freshness badges",            description: "Colour-coded badges on every report showing the source and age of each data point." },
      { type: "fix",     title: "Geocode accuracy for place names", description: "Searching by city name now correctly resolves to the city, not a small suburb with the same name." },
      { type: "feature", title: "32 UK area pages",                  description: "Programmatic SEO pages for 32 UK cities with real scored data." },
      { type: "feature", title: "Saved areas and watchlist",        description: "Save areas from reports, view them on a dashboard grid, and export as CSV." },
      { type: "feature", title: "PDF export",                        description: "Download any report as a branded PDF with Property Market and Schools data included. Starter plans and above." },
      { type: "feature", title: "Share buttons and email delivery", description: "One-click sharing to WhatsApp, LinkedIn, X, or copy link. Reports emailed automatically with score summary." },
      { type: "feature", title: "B2B landing page and API pricing", description: "Dedicated /business page with capabilities and use cases. API tiers from £49/mo to £499/mo." },
      { type: "feature", title: "Embeddable widget",                 description: "Drop a single script tag on any page to show OneGoodArea scores. No API key needed." },
      { type: "feature", title: "Interactive API playground",       description: "Live playground on the docs page with curated postcodes, score visualisation, and raw JSON toggle." },
      { type: "feature", title: "Area-type aware scoring",          description: "Urban, suburban, and rural areas scored against different benchmarks for fair comparison." },
    ],
  },
  {
    month: "February 2026",
    entries: [
      { type: "feature",     title: "Reproducible scoring engine", description: "Scoring functions, four intent profiles, transparent reasoning strings. Same postcode, same score, every time." },
      { type: "feature",     title: "Live Stripe payments",        description: "Credit-based model with checkout, billing portal, and webhook handling." },
      { type: "feature",     title: "Email verification",          description: "Branded verification emails with token-based flow via Resend." },
      { type: "feature",     title: "Activity tracking and admin", description: "Custom analytics with no third-party tools." },
      { type: "improvement", title: "Landing page refresh",        description: "Terminal-style hero, competitive differentiation section, LSOA granularity messaging." },
    ],
  },
  {
    month: "January 2026",
    entries: [
      { type: "feature", title: "Interactive report display", description: "Radar chart, collapsible sections, score context bar, and RAG colour coding." },
      { type: "feature", title: "Public REST API",             description: "Bearer auth, API key management, and full documentation with code examples." },
      { type: "feature", title: "Area comparison",             description: "Side-by-side scoring of two locations with dimensional breakdown." },
      { type: "feature", title: "Pricing and plans",           description: "Credit-based model with comparison table and Stripe integration." },
      { type: "feature", title: "Core platform launch",        description: "Dashboard, auth (NextAuth v5), Neon Postgres, AI-narrated reports, deployment to Vercel." },
    ],
  },
];

export default function ChangelogClient() {
  const total = CHANGELOG.reduce((sum, g) => sum + g.entries.length, 0);
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero total={total} months={CHANGELOG.length} />
      <Timeline />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero({ total, months }: { total: number; months: number }) {
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
        maxWidth: 900, margin: "0 auto", padding: "100px 40px 48px",
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
          Changelog
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 60px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 16px", maxWidth: "22ch",
        }}>
          What we&apos;ve <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>shipped.</em>
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          margin: "0 0 18px", maxWidth: "58ch",
        }}>
          New features, fixes, and improvements. OneGoodArea gets better every month; this is the written record.
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
          <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: "var(--signal)" }} />
          {total} updates · {months} months
        </div>
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 100px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ position: "relative" }}>
          <div aria-hidden style={{
            position: "absolute", left: 11, top: 12, bottom: 12,
            width: 1, background: "var(--border)",
          }} />
          {CHANGELOG.map((m, i) => (
            <MonthBlock key={m.month} month={m} openByDefault={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MonthBlock({ month, openByDefault }: { month: Month; openByDefault: boolean }) {
  const [open, setOpen] = useState(openByDefault);
  const counts = month.entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <section style={{
      paddingBottom: open ? 36 : 20,
      paddingTop: 4,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr",
        gap: 28, alignItems: "start",
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 18 }}>
          <span aria-hidden style={{
            width: 11, height: 11, borderRadius: 11,
            background: "var(--signal)",
            border: "2px solid var(--ink-deep)",
            boxShadow: "0 0 0 4px var(--bg)",
          }} />
        </div>
        <div>
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 16, padding: "14px 0",
              background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
                letterSpacing: "-0.014em", color: "var(--ink-deep)",
              }}>{month.month}</span>
              <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                {counts.feature > 0     && <CountChip tone="feature"     n={counts.feature}     label={`feature${counts.feature     !== 1 ? "s" : ""}`} />}
                {counts.fix > 0         && <CountChip tone="fix"         n={counts.fix}         label={`fix${counts.fix             !== 1 ? "es" : ""}`} />}
                {counts.improvement > 0 && <CountChip tone="improvement" n={counts.improvement} label={`improvement${counts.improvement !== 1 ? "s" : ""}`} />}
              </span>
            </div>
            <span aria-hidden style={{
              width: 26, height: 26, flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid var(--border)", borderRadius: "50%",
              color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 14,
              background: open ? "var(--signal-dim)" : "transparent",
              transform: open ? "rotate(45deg)" : "rotate(0deg)",
              transition: "transform 240ms cubic-bezier(0.16,1,0.3,1), background 140ms",
            }}>+</span>
          </button>

          <div style={{
            maxHeight: open ? 9999 : 0, overflow: "hidden",
            transition: "max-height 360ms cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{ paddingTop: 10 }}>
              {month.entries.map((e, i) => (
                <EntryRow key={i} entry={e} isLast={i === month.entries.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountChip({ tone, n, label }: {
  tone: EntryType; n: number; label: string;
}) {
  const bg = tone === "feature" ? "var(--signal-dim)" : tone === "fix" ? "#FFE8E2" : "#FFF4D1";
  const fg = tone === "feature" ? "var(--ink-deep)"   : tone === "fix" ? "#A01B00" : "#6E5300";
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
      letterSpacing: "0.2em", textTransform: "uppercase",
      color: fg, background: bg,
      padding: "3px 7px", borderRadius: 2,
    }}>{n} {label}</span>
  );
}

function EntryRow({ entry, isLast }: { entry: Entry; isLast: boolean }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "104px 1fr",
      gap: 18, alignItems: "start",
      padding: "16px 0",
      borderBottom: isLast ? "none" : "1px solid var(--border-dim)",
    }}>
      <TypeBadge type={entry.type} />
      <div>
        <div style={{
          fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
          letterSpacing: "-0.012em", color: "var(--ink-deep)",
          lineHeight: 1.25, marginBottom: entry.description ? 6 : 0,
        }}>{entry.title}</div>
        {entry.description && (
          <p style={{
            fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
            lineHeight: 1.55, color: "var(--text-2)",
            letterSpacing: "-0.003em",
            margin: 0, maxWidth: "62ch",
          }}>{entry.description}</p>
        )}
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: EntryType }) {
  const map = {
    feature:     { bg: "var(--signal-dim)", fg: "var(--ink-deep)", dot: "var(--ink)",  label: "Feature"     },
    fix:         { bg: "#FFE8E2",           fg: "#A01B00",          dot: "#D13A1E",     label: "Fix"         },
    improvement: { bg: "#FFF4D1",           fg: "#6E5300",          dot: "#D49900",     label: "Improvement" },
  } as const;
  const s = map[type];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      justifySelf: "start",
      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.18em", textTransform: "uppercase",
      color: s.fg, background: s.bg,
      padding: "4px 9px", borderRadius: 2,
    }}>
      <span aria-hidden style={{
        width: 5, height: 5, borderRadius: 5, background: s.dot,
      }} />
      {s.label}
    </span>
  );
}

function FinalCta() {
  return (
    <section style={{
      background: "var(--bg-off)",
      padding: "100px 0 120px",
    }}>
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1.06,
          letterSpacing: "-0.018em", color: "var(--ink-deep)",
          margin: "0 0 14px",
        }}>
          Something <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
          }}>missing?</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          margin: "0 auto 28px", maxWidth: "52ch",
        }}>
          Drop us a note and tell us what you&apos;d like to see next. Most items on this page started as an email.
        </p>
        <a href="mailto:hello@area-iq.co.uk?subject=Feature request" style={{
          fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--signal-ink)", background: "var(--signal)",
          padding: "13px 22px", borderRadius: 999, textDecoration: "none",
          border: "1px solid var(--ink-deep)",
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          Request a feature
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        </a>
      </div>
    </section>
  );
}
