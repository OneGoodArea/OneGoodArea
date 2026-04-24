"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

type EntryType = "feature" | "fix" | "improvement";

interface ChangelogEntry {
  type: EntryType;
  title: string;
  description?: string;
}

interface ChangelogMonth {
  month: string;
  entries: ChangelogEntry[];
}

const BADGE_STYLES: Record<EntryType, { color: string; bg: string }> = {
  feature: { color: "var(--neon-green)", bg: "var(--neon-green-dim)" },
  fix: { color: "var(--neon-amber)", bg: "var(--neon-amber-dim)" },
  improvement: { color: "var(--accent)", bg: "var(--accent-dim)" },
};

const CHANGELOG: ChangelogMonth[] = [
  {
    month: "March 2026",
    entries: [
      {
        type: "feature",
        title: "Ofsted school inspection ratings",
        description:
          "Reports now include Ofsted ratings for nearby schools in England. Each school shown with its rating and distance. School quality factors into the Schools and Education score. Visible on reports and in PDF exports.",
      },
      {
        type: "feature",
        title: "IMD 2025 deprivation data",
        description:
          "English deprivation data upgraded from IMD 2019 to IMD 2025. Now covers 33,755 neighbourhoods using the latest census boundaries.",
      },
      {
        type: "feature",
        title: "Blog",
        description:
          "New /blog section with data-driven posts on UK areas, property investment, and home buying.",
      },
      {
        type: "feature",
        title: "Dark and light theme toggle",
        description:
          "Switch between dark and light mode from the navbar. Warm off-white palette in light mode. Persists across sessions.",
      },
      {
        type: "feature",
        title: "HM Land Registry integration",
        description:
          "Real sold prices from the Land Registry Price Paid API. Median price, YoY trends, property type breakdown, tenure split, and price range.",
      },
      {
        type: "feature",
        title: "Property Market panel on reports",
        description:
          "New report section with local property market data. Available on Pro plans and above.",
      },
      {
        type: "feature",
        title: "Data freshness badges",
        description:
          "Colour-coded badges on every report showing the source and age of each data point.",
      },
      {
        type: "fix",
        title: "Geocode accuracy for place names",
        description:
          "Searching by city name now correctly resolves to the city, not a small suburb with the same name.",
      },
      {
        type: "feature",
        title: "32 UK area pages",
        description:
          "Programmatic SEO pages for 32 UK cities with real scored data.",
      },
      {
        type: "feature",
        title: "Saved areas and watchlist",
        description:
          "Save areas from reports, view them on a dashboard grid, and export as CSV.",
      },
      {
        type: "feature",
        title: "PDF export",
        description:
          "Download any report as a branded PDF with Property Market and Schools data included. Starter plans and above.",
      },
      {
        type: "feature",
        title: "Share buttons and email delivery",
        description:
          "One-click sharing to WhatsApp, LinkedIn, X, or copy link. Reports emailed automatically with score summary.",
      },
      {
        type: "feature",
        title: "B2B landing page and API pricing",
        description:
          "Dedicated /business page with capabilities and use cases. API tiers from £49/mo to £499/mo.",
      },
      {
        type: "feature",
        title: "Embeddable widget",
        description:
          "Drop a single script tag on any page to show OneGoodArea scores. No API key needed.",
      },
      {
        type: "feature",
        title: "Interactive API playground",
        description:
          "Live playground on the docs page with curated postcodes, score visualisation, and raw JSON toggle.",
      },
      {
        type: "feature",
        title: "Area-type aware scoring",
        description:
          "Urban, suburban, and rural areas scored against different benchmarks for fair comparison.",
      },
    ],
  },
  {
    month: "February 2026",
    entries: [
      {
        type: "feature",
        title: "Deterministic scoring engine",
        description:
          "16 scoring functions, 4 intent profiles, transparent reasoning strings. Same postcode, same score, every time.",
      },
      {
        type: "feature",
        title: "Live Stripe payments",
        description:
          "4-tier credit model with checkout, billing portal, and webhook handling.",
      },
      {
        type: "feature",
        title: "Email verification",
        description:
          "Branded verification emails with token-based flow via Resend.",
      },
      {
        type: "feature",
        title: "Activity tracking and admin dashboard",
        description:
          "Custom analytics with no third-party tools.",
      },
      {
        type: "improvement",
        title: "Landing page redesign",
        description:
          "Terminal-style hero, competitive differentiation section, LSOA granularity messaging.",
      },
    ],
  },
  {
    month: "January 2026",
    entries: [
      {
        type: "feature",
        title: "Interactive report display",
        description:
          "Radar chart, collapsible sections, score context bar, and RAG colour coding.",
      },
      {
        type: "feature",
        title: "Public REST API",
        description:
          "Bearer auth, API key management, and full documentation with code examples.",
      },
      {
        type: "feature",
        title: "Area comparison",
        description:
          "Side-by-side scoring of two locations with dimensional breakdown.",
      },
      {
        type: "feature",
        title: "Pricing and plans",
        description:
          "4-tier credit-based model with comparison table and Stripe integration.",
      },
      {
        type: "feature",
        title: "Core platform launch",
        description:
          "Dashboard, auth (NextAuth v5), Neon Postgres, AI-narrated reports, deployment to Vercel.",
      },
    ],
  },
];

function Badge({ type }: { type: EntryType }) {
  const style = BADGE_STYLES[type];
  return (
    <span
      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 shrink-0"
      style={{ color: style.color, background: style.bg }}
    >
      {type}
    </span>
  );
}

function MonthSection({ group, defaultOpen }: { group: ChangelogMonth; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const featureCount = group.entries.filter(e => e.type === "feature").length;
  const fixCount = group.entries.filter(e => e.type === "fix").length;
  const improvementCount = group.entries.filter(e => e.type === "improvement").length;

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 cursor-pointer group"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-[14px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {group.month}
          </h2>
          <div className="flex items-center gap-1.5">
            {featureCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                {featureCount} feature{featureCount !== 1 ? "s" : ""}
              </span>
            )}
            {fixCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-amber)", background: "var(--neon-amber-dim)" }}>
                {fixCount} fix{fixCount !== 1 ? "es" : ""}
              </span>
            )}
            {improvementCount > 0 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>
                {improvementCount}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className="transition-transform duration-200"
          style={{
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div className="pt-1">
          {group.entries.map((entry, i) => (
            <div
              key={i}
              className="py-3 flex items-start gap-3"
              style={{
                borderBottom:
                  i < group.entries.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <div className="mt-0.5">
                <Badge type={entry.type} />
              </div>
              <div>
                <div
                  className="text-[13px] font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {entry.title}
                </div>
                {entry.description && (
                  <div
                    className="text-[11px] mt-0.5 leading-relaxed"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {entry.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ChangelogPage() {
  const totalEntries = CHANGELOG.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Changelog" }]}>
        <Link
          href="/report"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Try it
          <ArrowRight size={11} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1
            className="text-[22px] font-semibold tracking-tight mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Changelog
          </h1>
          <p
            className="text-[13px]"
            style={{ color: "var(--text-secondary)" }}
          >
            New features, fixes, and improvements shipped to OneGoodArea.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {totalEntries} updates across {CHANGELOG.length} months
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {CHANGELOG.map((group, i) => (
            <MonthSection key={group.month} group={group} defaultOpen={i === 0} />
          ))}
        </div>
      </main>

      <Footer maxWidth="800px" />
    </div>
  );
}
