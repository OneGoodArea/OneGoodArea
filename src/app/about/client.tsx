"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Database, Cpu, GitBranch, Shield, MapPin, Zap } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";

/* ── Animated counter ── */
function Counter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = performance.now();
          function tick(now: number) {
            const p = Math.min((now - start) / 1200, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(end * eased));
            if (p < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{val}{suffix}</span>;
}

/* ── Terminal log line ── */
function LogLine({ delay, prefix, text, accent }: { delay: number; prefix: string; text: string; accent?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return <div className="h-[22px]" />;

  return (
    <div className="animate-fade-in font-mono text-[11px] leading-[22px] flex">
      <span style={{ color: "var(--text-tertiary)" }}>{prefix}</span>
      <span className="ml-2" style={{ color: accent || "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}

/* ── Principle card ── */
function PrincipleCard({ icon: Icon, title, desc, index }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), index * 120);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="border p-5 transition-all duration-500"
      style={{
        borderColor: visible ? "var(--border-hover)" : "var(--border)",
        background: "var(--bg-elevated)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-7 h-7 flex items-center justify-center"
          style={{ background: "var(--neon-green-dim)" }}
        >
          <Icon size={13} style={{ color: "var(--neon-green)" }} />
        </div>
        <h3 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
        {desc}
      </p>
    </div>
  );
}

/* ── Data source row with live pulse ── */
function SourceRow({ name, desc, delay }: { name: string; desc: string; delay: number }) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLive(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0 transition-opacity duration-300"
      style={{ borderColor: "var(--border)", opacity: live ? 1 : 0.3 }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="w-1.5 h-1.5 rounded-full transition-all duration-500"
          style={{
            background: live ? "var(--neon-green)" : "var(--border)",
            boxShadow: live ? "0 0 4px var(--neon-green), 0 0 8px var(--neon-green)" : "none",
          }}
        />
        <span className="text-[12px] font-mono font-medium" style={{ color: live ? "var(--neon-green)" : "var(--text-tertiary)" }}>
          {name}
        </span>
      </div>
      <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
        {desc}
      </span>
    </div>
  );
}

/* ── Timeline node ── */
function TimelineNode({ date, label, desc, index }: { date: string; label: string; desc: string; index: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), index * 150);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className="flex gap-4 transition-all duration-500"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(-12px)" }}
    >
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5 transition-all duration-500"
          style={{
            background: visible ? "var(--neon-green)" : "var(--border)",
            boxShadow: visible ? "0 0 6px var(--neon-green)" : "none",
          }}
        />
        <div className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />
      </div>
      <div className="pb-6">
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{date}</span>
        <h4 className="text-[13px] font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{label}</h4>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{desc}</p>
      </div>
    </div>
  );
}

const principles = [
  {
    icon: Shield,
    title: "Transparent by default",
    desc: "Every score shows the data behind it. No black boxes. You see exactly why an area scored 72 for safety or 45 for transport.",
  },
  {
    icon: Cpu,
    title: "Deterministic, not vibes",
    desc: "Scores are computed from real data using fixed formulas. Same postcode, same scores. AI explains the numbers, it does not generate them.",
  },
  {
    icon: MapPin,
    title: "Intent matters",
    desc: "A great area for a family is not the same as a great area for a restaurant. We weight dimensions differently based on your goal.",
  },
  {
    icon: GitBranch,
    title: "Context-aware",
    desc: "A village with one school is not the same as a city with one school. We detect area type and benchmark accordingly: urban, suburban, or rural.",
  },
];

const milestones = [
  { date: "Jan 2025", label: "Idea validated", desc: "Researched the gap in UK area intelligence tools" },
  { date: "Feb 2025", label: "MVP built", desc: "6 real-time data sources, AI-powered reports" },
  { date: "Mar 2025", label: "Scoring engine", desc: "Deterministic scoring replaced AI-generated scores" },
  { date: "Mar 2025", label: "Public launch", desc: "Live at area-iq.co.uk with Stripe payments" },
];

const dataSources = [
  { name: "Postcodes.io", desc: "Geocoding + LSOA mapping" },
  { name: "Police.uk", desc: "Street-level crime data" },
  { name: "IMD 2025", desc: "Deprivation indices" },
  { name: "OpenStreetMap", desc: "Amenities + transport" },
  { name: "Env. Agency", desc: "Flood risk zones" },
  { name: "Land Registry", desc: "Property sold prices" },
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

      <main className="flex-1 max-w-[900px] w-full mx-auto px-6 py-16">

        {/* ── Hero ── */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-5">
            <Logo size="default" />
            <span className="text-[10px] font-mono px-2 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
              UK AREA INTELLIGENCE
            </span>
          </div>
          <h1 className="text-[36px] sm:text-[44px] font-bold tracking-tight leading-[1.1] mb-5" style={{ color: "var(--text-primary)" }}>
            We built the tool we
            <br />
            <span className="neon-green-glow" style={{ color: "var(--neon-green)" }}>couldn&apos;t find.</span>
          </h1>
          <p className="text-[15px] leading-relaxed max-w-[560px]" style={{ color: "var(--text-secondary)" }}>
            Score any UK location using real government data. No guesswork,
            no paywalled PDFs, no vague ratings. Transparent, structured
            intelligence for every location decision.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-20" style={{ background: "var(--border)" }}>
          {[
            { value: 6, suffix: "", label: "Live data sources" },
            { value: 33755, suffix: "", label: "LSOAs covered" },
            { value: 16, suffix: "", label: "Scoring functions" },
            { value: 4, suffix: "", label: "Intent profiles" },
          ].map((s) => (
            <div key={s.label} className="p-5 text-center" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-[24px] font-mono font-bold neon-green-glow" style={{ color: "var(--neon-green)" }}>
                <Counter end={s.value} suffix={s.suffix} />
              </div>
              <div className="text-[10px] font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── The problem: terminal style ── */}
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-4">
            <Terminal size={12} style={{ color: "var(--text-tertiary)" }} />
            <h2 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              The Problem
            </h2>
          </div>
          <div className="border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            <div className="px-3.5 py-2 border-b flex items-center gap-1.5" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-2 h-2 rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-2 h-2 rounded-full" style={{ background: "#28c840" }} />
            </div>
            <div className="p-5">
              <LogLine delay={200} prefix="$" text='search "area intelligence UK"' accent="var(--accent)" />
              <LogLine delay={600} prefix="→" text="Rightmove: basic stats, no scoring, no methodology" />
              <LogLine delay={1000} prefix="→" text="Crystal Roof: vague ratings, no data shown" />
              <LogLine delay={1400} prefix="→" text="PropertyData: £300/month for raw spreadsheets" />
              <LogLine delay={1800} prefix="→" text="StreetCheck: no intent-based weighting" />
              <div className="h-3" />
              <LogLine delay={2400} prefix="!" text="None adjust for intent. None show their working." accent="var(--neon-amber)" />
              <LogLine delay={3000} prefix="+" text="Solution: build it." accent="var(--neon-green)" />
            </div>
          </div>
        </section>

        {/* ── How it works: architecture ── */}
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={12} style={{ color: "var(--text-tertiary)" }} />
            <h2 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Architecture
            </h2>
          </div>
          <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="p-5">
              {/* Pipeline visualization */}
              <div className="flex flex-col sm:flex-row items-stretch gap-0">
                {[
                  { step: "01", label: "Collect", desc: "6 government APIs queried in parallel", color: "var(--accent)" },
                  { step: "02", label: "Classify", desc: "Area type detected: urban, suburban, or rural", color: "var(--neon-amber)" },
                  { step: "03", label: "Score", desc: "16 deterministic functions, contextual benchmarks", color: "var(--neon-green)" },
                  { step: "04", label: "Narrate", desc: "AI explains the numbers, never generates them", color: "var(--text-primary)" },
                ].map((p, i) => (
                  <div key={p.step} className="flex-1 flex items-stretch">
                    <div className="flex-1 p-4 border-b sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0" style={{ borderColor: "var(--border)" }}>
                      <div className="text-[10px] font-mono mb-2" style={{ color: p.color, opacity: 0.7 }}>
                        {p.step}
                      </div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                        {p.label}
                      </div>
                      <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                        {p.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                Same input = same scores. Every time. The AI layer is downstream of computation, not the source.
              </span>
            </div>
          </div>
        </section>

        {/* ── What's in a report ── */}
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={12} style={{ color: "var(--text-tertiary)" }} />
            <h2 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              What You Get
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
            {[
              "Overall AreaIQ score (0-100)",
              "5 scored dimensions with weights",
              "AI-generated narrative",
              "Actionable recommendations",
              "6 detailed analysis sections",
              "Data freshness badges",
              "Property Market data (Pro+)",
              "PDF export (Starter+)",
              "Email delivery",
              "Share (WhatsApp, LinkedIn, X)",
              "Watchlist & CSV export",
              "Deterministic scoring badge",
            ].map((item) => (
              <div key={item} className="px-4 py-3 text-[11px]" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ── Principles ── */}
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={12} style={{ color: "var(--text-tertiary)" }} />
            <h2 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Principles
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {principles.map((p, i) => (
              <PrincipleCard key={p.title} icon={p.icon} title={p.title} desc={p.desc} index={i} />
            ))}
          </div>
        </section>

        {/* ── Data sources: live feed ── */}
        <section className="mb-20">
          <div className="flex items-center gap-2 mb-4">
            <Database size={12} style={{ color: "var(--text-tertiary)" }} />
            <h2 className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Live Data Sources
            </h2>
          </div>
          <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            {dataSources.map((src, i) => (
              <SourceRow key={src.name} name={src.name} desc={src.desc} delay={300 + i * 250} />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--neon-green)", boxShadow: "0 0 4px var(--neon-green)" }}
            />
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              All fetched in real time. No caching, no stale datasets.
            </span>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section className="mb-20">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-6" style={{ color: "var(--text-tertiary)" }}>
            Timeline
          </h2>
          <div>
            {milestones.map((m, i) => (
              <TimelineNode key={i} date={m.date} label={m.label} desc={m.desc} index={i} />
            ))}
          </div>
        </section>

        {/* ── Builder ── */}
        <section className="mb-20">
          <h2 className="text-[11px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
            Built by
          </h2>
          <div className="border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <div className="p-6 flex items-start gap-5" style={{ background: "var(--bg-elevated)" }}>
              <div
                className="w-14 h-14 shrink-0 flex items-center justify-center text-[18px] font-mono font-bold"
                style={{ background: "var(--neon-green-dim)", color: "var(--neon-green)" }}
              >
                PS
              </div>
              <div>
                <h3 className="text-[16px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Pedro Serapiao
                </h3>
                <p className="text-[11px] font-mono mt-1 mb-3" style={{ color: "var(--text-tertiary)" }}>
                  Software engineer. Product builder. Based in the UK.
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  I kept running into the same problem: making location decisions without reliable,
                  structured data. Rightmove gives you vibes. PropertyData gives you spreadsheets.
                  Nothing gave you scored, transparent, intent-driven intelligence. So I built it.
                </p>
              </div>
            </div>
            <div className="px-6 py-3 border-t font-mono text-[10px]" style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-tertiary)" }}>
              Every feature exists because it solves a real problem. No vanity metrics, no filler.
            </div>
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="mb-20">
          <div
            className="border-l-2 pl-6 py-4"
            style={{ borderColor: "var(--neon-green)" }}
          >
            <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
              Mission
            </p>
            <p className="text-[20px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
              Make area intelligence accessible, transparent, and useful
              <br />
              <span style={{ color: "var(--neon-green)" }}>for every UK location decision.</span>
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="border p-10 text-center" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
          <div className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            See it in action
          </div>
          <h2 className="text-[22px] font-bold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Enter any UK postcode. Get the full picture.
          </h2>
          <p className="text-[13px] mb-8 max-w-[400px] mx-auto" style={{ color: "var(--text-tertiary)" }}>
            Score, data, methodology, reasoning. All in one report.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/report"
              className="h-10 px-6 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all"
              style={{ background: "var(--neon-green)", color: "var(--bg)" }}
            >
              Generate a Report
              <ArrowRight size={13} />
            </Link>
            <Link
              href="/methodology"
              className="h-10 px-6 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide border transition-colors"
              style={{ borderColor: "var(--border-hover)", color: "var(--text-secondary)" }}
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
