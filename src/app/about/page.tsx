import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | AreaIQ",
  description: "The story behind AreaIQ — why we built transparent, intent-driven area intelligence for the UK.",
};

const milestones = [
  { date: "Jan 2025", label: "Idea validated", desc: "Researched the gap in UK area intelligence tools" },
  { date: "Feb 2025", label: "MVP built", desc: "5 real-time data sources, AI-powered reports" },
  { date: "Mar 2025", label: "Scoring engine", desc: "Deterministic scoring replaced AI-generated scores" },
  { date: "Mar 2025", label: "Public launch", desc: "Live at area-iq.co.uk with Stripe payments" },
];

const dataSources = [
  { name: "Postcodes.io", desc: "Geocoding, LSOA mapping, area classification" },
  { name: "Police.uk", desc: "Street-level crime data, categories, trends" },
  { name: "IMD 2019", desc: "Deprivation indices across 32,844 LSOAs" },
  { name: "OpenStreetMap", desc: "Schools, transport, healthcare, shops, parks" },
  { name: "Environment Agency", desc: "Flood risk zones and active warnings" },
];

const principles = [
  {
    title: "Transparent by default",
    desc: "Every score shows the data behind it. No black boxes. You can see exactly why an area scored 72 for safety or 45 for transport.",
  },
  {
    title: "Deterministic, not vibes",
    desc: "Scores are computed from real data using fixed formulas. The same postcode will always produce the same score. AI explains the numbers, it does not generate them.",
  },
  {
    title: "Intent matters",
    desc: "A great area for a family is not the same as a great area for a restaurant. We weight dimensions differently based on your goal: moving, business, investing, or research.",
  },
  {
    title: "Context-aware",
    desc: "A village with one school and a bus stop is not the same as a city with one school and a bus stop. We detect area type and benchmark accordingly: urban, suburban, or rural.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "About" }]}>
        <Link
          href="/report"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          Try it
          <ArrowRight size={11} />
        </Link>
      </Navbar>

      <main className="flex-1 max-w-[800px] w-full mx-auto px-6 py-12">

        {/* ── Header ── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Logo size="default" />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Area intelligence that shows its working
          </h1>
          <p className="text-[15px] leading-relaxed max-w-[640px]" style={{ color: "var(--text-secondary)" }}>
            AreaIQ scores any UK location using real government data. No guesswork, no paywalled PDFs,
            no vague "desirability" ratings. Just transparent, structured intelligence that helps you
            make better decisions about where to live, invest, or open a business.
          </p>
        </div>

        {/* ── The Problem ── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            The Problem
          </h2>
          <div className="border p-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
              When you search for area information in the UK, you get one of two things: Rightmove's basic
              "local area" tab with a few stats, or expensive property data platforms charging hundreds per month
              for raw spreadsheets.
            </p>
            <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
              Neither tells you what actually matters. Neither adjusts for your intent. And none of them explain
              their methodology or show you the data behind their scores.
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              We built AreaIQ to fix that. One search, one scored report, every data point explained.
            </p>
          </div>
        </section>

        {/* ── Principles ── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            How We Think
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
            {principles.map((p) => (
              <div key={p.title} className="p-5" style={{ background: "var(--bg-elevated)" }}>
                <h3 className="text-[13px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  {p.title}
                </h3>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Data Sources ── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            Data Sources
          </h2>
          <div className="border" style={{ borderColor: "var(--border)" }}>
            {dataSources.map((src, i) => (
              <div
                key={src.name}
                className="px-5 py-3 flex items-center justify-between border-b last:border-b-0"
                style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--bg)" : "var(--bg-elevated)" }}
              >
                <span className="text-[12px] font-mono font-medium" style={{ color: "var(--neon-green)" }}>
                  {src.name}
                </span>
                <span className="text-[11px] text-right" style={{ color: "var(--text-tertiary)" }}>
                  {src.desc}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-mono mt-3" style={{ color: "var(--text-tertiary)" }}>
            All data is fetched in real time. No caching, no stale datasets. Your report reflects the latest available information.
          </p>
        </section>

        {/* ── Timeline ── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            Timeline
          </h2>
          <div className="space-y-0">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="text-[11px] font-mono w-20 shrink-0" style={{ color: "var(--text-tertiary)" }}>
                  {m.date}
                </span>
                <div>
                  <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                    {m.label}
                  </span>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Founder ── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            Built by
          </h2>
          <div className="border p-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="flex items-start gap-4">
              <div
                className="w-12 h-12 shrink-0 flex items-center justify-center text-[16px] font-mono font-bold"
                style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                PT
              </div>
              <div>
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  Pedro Tengelmann
                </h3>
                <p className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--text-tertiary)" }}>
                  Software engineer and product builder based in the UK. Built AreaIQ to solve a problem
                  I kept running into: making location decisions without reliable, structured data.
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  Every feature exists because it solves a real problem. No vanity metrics, no filler pages,
                  no features that exist just to fill a pricing table.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="mb-12">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            Mission
          </h2>
          <div className="border-l-2 pl-5 py-1" style={{ borderColor: "var(--neon-green)" }}>
            <p className="text-[16px] font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
              Make area intelligence accessible, transparent, and useful for every UK location decision.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border p-8 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <h2 className="text-[18px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Try it yourself
          </h2>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-tertiary)" }}>
            Enter any UK postcode or area name. See the score, the data, and the reasoning.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/report"
              className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
              style={{ background: "var(--text-primary)", color: "var(--bg)" }}
            >
              Generate a Report
              <ArrowRight size={12} />
            </Link>
            <Link
              href="/methodology"
              className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Read the Methodology
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
