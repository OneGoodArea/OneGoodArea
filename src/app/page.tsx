"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowRight, MapPin, TrendingUp, Building2, Search, ChevronRight, Zap, Home as HomeIcon, Users, Briefcase, Crosshair, Calculator, MessageSquareText, Code, Copy, Check, Globe, Key, BarChart3, Shield } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

/* ── Widget Code Snippet with Copy ── */
function WidgetCodeSnippet() {
  const [copied, setCopied] = useState(false);
  const snippet = `<div
  data-areaiq-postcode="SW1A 1AA"
  data-areaiq-intent="moving"
></div>

<script src="https://www.area-iq.co.uk/widget.js"></script>`;

  function handleCopy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-8 flex flex-col justify-center" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          HTML
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 transition-colors cursor-pointer"
          style={{ color: copied ? "var(--neon-green)" : "var(--text-tertiary)", background: "var(--bg-active)" }}
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="text-[12px] font-mono p-5 overflow-x-auto leading-relaxed"
        style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
      >
        {snippet}
      </pre>
      <div className="mt-4 flex items-center gap-4">
        <Link href="/docs#embed" className="text-[11px] font-mono flex items-center gap-1.5 transition-colors hover:opacity-80" style={{ color: "var(--neon-green)" }}>
          Full docs <ArrowRight size={10} />
        </Link>
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          Dark and light themes available
        </span>
      </div>
    </div>
  );
}

/* ── Animated Score Ring ── */
function HeroScoreRing({ score, label, size = 100 }: { score: number; label: string; size?: number }) {
  const [mounted, setMounted] = useState(false);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "var(--neon-green)" : score >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
  const glow = score >= 70 ? "neon-green-glow" : score >= 45 ? "neon-amber-glow" : "neon-red-glow";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="score-ring" width={size} height={size}>
          <circle className="score-ring-track" cx={size / 2} cy={size / 2} r={radius} />
          <circle
            className="score-ring-fill"
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? offset : circumference}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[24px] font-mono font-bold ${glow}`} style={{ color }}>
            {mounted ? score : 0}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-mono mt-2" style={{ color: "var(--text-tertiary)" }}>{label}</span>
    </div>
  );
}

/* ── Animated Counter ── */
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

/* ── Typing Effect ── */
function TypingText({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const text = texts[index];
    if (!deleting && charIndex < text.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 60);
      return () => clearTimeout(t);
    } else if (!deleting && charIndex === text.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    } else if (deleting && charIndex > 0) {
      const t = setTimeout(() => setCharIndex((c) => c - 1), 30);
      return () => clearTimeout(t);
    } else if (deleting && charIndex === 0) {
      setDeleting(false);
      setIndex((i) => (i + 1) % texts.length);
    }
  }, [charIndex, deleting, index, texts]);

  return (
    <span>
      {texts[index].slice(0, charIndex)}
      <span className="animate-blink" style={{ color: "var(--accent)" }}>|</span>
    </span>
  );
}

/* ── Mock Sub-Score Bar ── */
function MockBar({ label, score, weight, delay }: { label: string; score: number; weight: number; delay: number }) {
  const [mounted, setMounted] = useState(false);
  const color = score >= 70 ? "var(--neon-green)" : score >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
  const dim = score >= 70 ? "var(--neon-green-dim)" : score >= 45 ? "var(--neon-amber-dim)" : "var(--neon-red-dim)";
  const glow = score >= 70 ? "neon-green-glow" : score >= 45 ? "neon-amber-glow" : "neon-red-glow";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{label}</span>
          <span className="text-[8px] font-mono px-1" style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}>{weight}%</span>
        </div>
        <span className={`text-[11px] font-mono font-semibold ${glow}`} style={{ color }}>{mounted ? score : 0}</span>
      </div>
      <div className="h-1 w-full" style={{ background: dim }}>
        <div className="h-full transition-all duration-700 ease-out" style={{ width: mounted ? `${score}%` : "0%", background: color }} />
      </div>
    </div>
  );
}

/* ── Data Source Badge ── */
function SourceBadge({ name, live }: { name: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
      {live && <span className="w-1.5 h-1.5 rounded-full neon-dot" style={{ color: "var(--neon-green)", background: "var(--neon-green)" }} />}
      <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{name}</span>
    </div>
  );
}

/* ── Hero Terminal ── */
function HeroTerminal() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = [300, 800, 1100, 1300, 1500, 1700, 1900, 2300, 2600, 2800, 3000, 3200, 3400, 3800];
    const timers = delays.map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const sources = [
    { name: "Police.uk", result: "23 crimes/month" },
    { name: "ONS IMD 2019", result: "Decile 7 of 10" },
    { name: "OpenStreetMap", result: "42 amenities nearby" },
    { name: "Env. Agency", result: "Flood risk: LOW" },
    { name: "Postcodes.io", result: "51.462°N, 0.138°W" },
  ];

  const scores: { label: string; score: number }[] = [
    { label: "Safety", score: 72 },
    { label: "Transport", score: 88 },
    { label: "Amenities", score: 81 },
    { label: "Demographics", score: 68 },
    { label: "Environment", score: 62 },
  ];

  return (
    <div className="border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      {/* Chrome */}
      <div
        className="px-3.5 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <span className="text-[9px] font-mono tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          areaiq
        </span>
      </div>

      {/* Body — fixed height prevents layout shift during animation */}
      <div className="p-4 font-mono text-[11px] h-[340px] overflow-hidden">
        {/* Command */}
        {step >= 1 && (
          <div className="mb-3 leading-relaxed">
            <span style={{ color: "var(--neon-green)" }}>→ </span>
            <span style={{ color: "var(--text-tertiary)" }}>report </span>
            <span style={{ color: "var(--accent)" }}>&quot;Clapham, SW4&quot;</span>
            <span style={{ color: "var(--text-tertiary)" }}> --intent </span>
            <span style={{ color: "var(--neon-amber)" }}>moving</span>
          </div>
        )}

        {/* Sources header */}
        {step >= 2 && (
          <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            Fetching live data
          </div>
        )}

        {/* Source lines */}
        {sources.map((src, i) =>
          step >= 3 + i ? (
            <div key={src.name} className="flex items-center gap-2 py-[3px]">
              <span className="w-3 text-center" style={{ color: "var(--neon-green)" }}>✓</span>
              <span className="w-[100px] shrink-0 truncate" style={{ color: "var(--text-secondary)" }}>{src.name}</span>
              <span style={{ color: "var(--text-tertiary)" }}>{src.result}</span>
            </div>
          ) : null
        )}

        {/* Scores header */}
        {step >= 8 && (
          <div className="text-[9px] uppercase tracking-wider mt-4 mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            Intelligence scores
          </div>
        )}

        {/* Score bars */}
        {scores.map((s, i) => {
          if (step < 9 + i) return null;
          const color = s.score >= 70 ? "var(--neon-green)" : s.score >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
          const dim = s.score >= 70 ? "var(--neon-green-dim)" : s.score >= 45 ? "var(--neon-amber-dim)" : "var(--neon-red-dim)";
          return (
            <div key={s.label} className="flex items-center gap-2 py-[3px]">
              <span className="w-[88px] shrink-0 text-[10px]" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
              <div className="flex-1 h-[5px]" style={{ background: dim }}>
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ width: `${s.score}%`, background: color, boxShadow: `0 0 4px ${color}` }}
                />
              </div>
              <span className="w-[20px] text-right text-[10px] font-semibold" style={{ color }}>{s.score}</span>
            </div>
          );
        })}

        {/* Final score */}
        {step >= 14 && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-semibold tracking-wider" style={{ color: "var(--text-primary)" }}>
              AREAIQ SCORE
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold neon-green-glow" style={{ color: "var(--neon-green)" }}>74</span>
              <span
                className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
                style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
              >
                Strong
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [activeIntent, setActiveIntent] = useState(0);

  const intentData = [
    {
      label: "Moving", icon: MapPin, area: "Clapham, London",
      scores: [
        { label: "Safety & Crime", score: 72, weight: 25 },
        { label: "Schools & Education", score: 68, weight: 20 },
        { label: "Transport & Commute", score: 88, weight: 20 },
        { label: "Daily Amenities", score: 81, weight: 15 },
        { label: "Cost of Living", score: 45, weight: 20 },
      ],
      overall: 69,
    },
    {
      label: "Business", icon: Building2, area: "Clapham, London",
      scores: [
        { label: "Foot Traffic & Demand", score: 84, weight: 30 },
        { label: "Competition Density", score: 42, weight: 20 },
        { label: "Transport & Access", score: 88, weight: 15 },
        { label: "Local Spending Power", score: 76, weight: 20 },
        { label: "Commercial Costs", score: 38, weight: 15 },
      ],
      overall: 67,
    },
    {
      label: "Investing", icon: TrendingUp, area: "Clapham, London",
      scores: [
        { label: "Price Growth", score: 71, weight: 25 },
        { label: "Rental Yield", score: 58, weight: 25 },
        { label: "Regeneration", score: 65, weight: 20 },
        { label: "Tenant Demand", score: 82, weight: 15 },
        { label: "Risk Factors", score: 61, weight: 15 },
      ],
      overall: 67,
    },
    {
      label: "Research", icon: Search, area: "Clapham, London",
      scores: [
        { label: "Safety & Crime", score: 72, weight: 20 },
        { label: "Transport Links", score: 88, weight: 20 },
        { label: "Amenities & Services", score: 81, weight: 20 },
        { label: "Demographics", score: 74, weight: 20 },
        { label: "Environment", score: 69, weight: 20 },
      ],
      overall: 77,
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveIntent((i) => (i + 1) % 4), 5000);
    return () => clearInterval(t);
  }, []);

  const current = intentData[activeIntent];

  return (
    <div className="min-h-screen bg-grid">
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-[10px] font-mono px-1.5 py-0.5 border" style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
              BETA
            </span>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/docs" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>API</Link>
            <Link href="/methodology" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Methodology</Link>
            <Link href="/pricing" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Pricing</Link>
            <Link href="/about" className="hidden sm:block text-[11px] font-mono uppercase tracking-wide transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>About</Link>
            <Link href="/report" className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide" style={{ background: "var(--text-primary)", color: "var(--bg)" }}>
              Launch App <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_400px] gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="inline-block w-1.5 h-1.5 rounded-full neon-dot" style={{ color: "var(--neon-green)", background: "var(--neon-green)" }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  5 live data sources &bull; UK coverage
                </span>
              </div>
              <h1 className="text-[32px] md:text-[46px] font-semibold tracking-tight leading-[1.06] mb-5" style={{ color: "var(--text-primary)" }}>
                Area intelligence<br />for{" "}
                <span style={{ color: "var(--accent)" }}>
                  <TypingText texts={["moving home", "opening a business", "property investing", "market research"]} />
                </span>
              </h1>
              <p className="text-[15px] leading-relaxed mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
                Enter any UK neighbourhood or postcode. Get a scored intelligence report grounded in real government data: crime stats, deprivation indices, amenities, flood risk. In seconds, not hours.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Link href="/report" className="h-12 px-8 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide transition-colors" style={{ background: "var(--text-primary)", color: "var(--bg)" }}>
                  Generate a Report <ArrowRight size={13} />
                </Link>
                <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  Free, no card required
                </span>
              </div>
            </div>

            {/* Hero illustration — Terminal */}
            <div className="hidden md:block animate-fade-in-up">
              <HeroTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* ── Data Sources Strip ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <span className="text-[9px] font-mono uppercase tracking-wider shrink-0" style={{ color: "var(--text-tertiary)" }}>
              Powered by real data
            </span>
            <div className="flex flex-wrap gap-2">
              <SourceBadge name="Police.uk" live />
              <SourceBadge name="ONS / IMD 2019" live />
              <SourceBadge name="OpenStreetMap" live />
              <SourceBadge name="Environment Agency" live />
              <SourceBadge name="Postcodes.io" live />
            </div>
          </div>
          <div className="mt-2 text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            Analysed at LSOA level (~1,500 residents) &middot; 1-2km radius queries &middot; Updated in real time
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>How It Works</div>
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-10" style={{ color: "var(--text-primary)" }}>
            From postcode to intelligence in seconds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
            {[
              {
                step: "01", title: "Enter a location",
                desc: "Any UK postcode, neighbourhood, or area name",
                visual: (
                  <div className="border px-3 py-2 flex items-center gap-2 mt-3" style={{ borderColor: "var(--border-hover)", background: "var(--bg)" }}>
                    <MapPin size={12} style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>Shoreditch, London</span>
                  </div>
                ),
              },
              {
                step: "02", title: "Choose your intent",
                desc: "Moving, business, investing, or research",
                visual: (
                  <div className="grid grid-cols-2 gap-1 mt-3">
                    {["Moving", "Business", "Investing", "Research"].map((i, idx) => (
                      <div key={i} className="px-2 py-1.5 text-center text-[9px] font-mono uppercase" style={{ background: idx === 0 ? "var(--accent-dim)" : "var(--bg)", color: idx === 0 ? "var(--accent)" : "var(--text-tertiary)", border: `1px solid ${idx === 0 ? "var(--accent)" : "var(--border)"}` }}>
                        {i}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                step: "03", title: "Real data is fetched",
                desc: "5 UK APIs queried in parallel: crime, deprivation, amenities, flood risk, geocoding",
                visual: (
                  <div className="space-y-1 mt-3">
                    {["police.uk", "ONS IMD", "OpenStreetMap", "Env. Agency", "postcodes.io"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full" style={{ background: "var(--neon-green)", animationDelay: `${i * 200}ms` }} />
                        <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                step: "04", title: "AI analyses & scores",
                desc: "Claude synthesises all data into a weighted, actionable report",
                visual: (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative w-10 h-10">
                      <svg className="score-ring" width={40} height={40}>
                        <circle className="score-ring-track" cx={20} cy={20} r={17} />
                        <circle className="score-ring-fill" cx={20} cy={20} r={17} stroke="var(--neon-green)" strokeDasharray={106.8} strokeDashoffset={26.7} style={{ filter: "drop-shadow(0 0 4px var(--neon-green))" }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-mono font-bold neon-green-glow" style={{ color: "var(--neon-green)" }}>74</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-medium" style={{ color: "var(--text-primary)" }}>AreaIQ Score</div>
                      <div className="text-[9px] font-mono" style={{ color: "var(--neon-green)" }}>Strong</div>
                    </div>
                  </div>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="p-6" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-[11px] font-mono mb-2" style={{ color: "var(--accent)" }}>{item.step}</div>
                <div className="text-[14px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                {item.visual}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intent Showcase — Interactive ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Intent-Driven Intelligence
          </div>
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Same area. Different intent. Different intelligence.
          </h2>
          <p className="text-[14px] mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
            A family moving and an investor evaluating the same postcode need completely different data. AreaIQ adapts scoring dimensions and weights to your purpose.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-px" style={{ background: "var(--border)" }}>
            {/* Intent selector */}
            <div style={{ background: "var(--bg-elevated)" }}>
              {intentData.map((intent, i) => {
                const Icon = intent.icon;
                const isActive = i === activeIntent;
                return (
                  <button
                    key={intent.label}
                    onClick={() => setActiveIntent(i)}
                    className="w-full px-5 py-4 flex items-center gap-3 border-b transition-colors text-left"
                    style={{ borderColor: "var(--border)", background: isActive ? "var(--bg-active)" : "transparent" }}
                  >
                    <Icon size={14} style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }} />
                    <span className="text-[12px] font-medium" style={{ color: isActive ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {intent.label}
                    </span>
                    {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: "var(--accent)" }} />}
                  </button>
                );
              })}
            </div>

            {/* Score visualization */}
            <div className="p-6" style={{ background: "var(--bg-elevated)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{current.area}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5" style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>{current.label}</span>
              </div>
              <div className="text-[11px] font-mono mb-5" style={{ color: "var(--text-tertiary)" }}>
                5 weighted dimensions · score reflects suitability for this specific intent
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <HeroScoreRing score={current.overall} label="Overall" size={100} />
                <div className="flex-1 w-full space-y-3">
                  {current.scores.map((s, i) => (
                    <MockBar key={`${activeIntent}-${s.label}`} label={s.label} score={s.score} weight={s.weight} delay={i * 100} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px -mx-6" style={{ background: "var(--border)" }}>
            {[
              { value: 5, suffix: "", label: "Live data sources" },
              { value: 32844, suffix: "", label: "LSOAs covered" },
              { value: 4, suffix: "", label: "Intent types" },
              { value: 100, suffix: "%", label: "UK coverage" },
            ].map((stat) => (
              <div key={stat.label} className="px-6 py-8 text-center" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-[28px] md:text-[36px] font-mono font-bold tracking-tight neon-green-glow" style={{ color: "var(--neon-green)" }}>
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Uses AreaIQ ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Who Uses AreaIQ</div>
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Built for anyone making location decisions
          </h2>
          <p className="text-[14px] mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
            From first-time buyers to property funds. Hours of research, reduced to seconds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
            {[
              { icon: HomeIcon, title: "Home Buyers", desc: "Evaluate safety, school catchments, and commute times before choosing where to live." },
              { icon: TrendingUp, title: "Property Investors", desc: "Compare rental yields, price growth, and regeneration potential across areas." },
              { icon: Users, title: "Estate Agents", desc: "Create data-backed area briefings for client viewings and property listings." },
              { icon: Briefcase, title: "Business Owners", desc: "Assess foot traffic, competition, and local spending power before opening." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-5" style={{ background: "var(--bg-elevated)" }}>
                  <Icon size={16} className="mb-3" style={{ color: "var(--accent)" }} />
                  <div className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why AreaIQ ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Why AreaIQ</div>
          <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
            Not another postcode lookup tool
          </h2>
          <p className="text-[14px] mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
            Crystal Roof, StreetCheck, and PropertyData show you raw stats. AreaIQ scores, weighs, and explains them for your specific use case.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
            {[
              {
                icon: Crosshair,
                title: "Intent-Driven Scoring",
                desc: "Same area, different scores depending on whether you're moving, investing, or opening a business. Competitors give one generic view.",
              },
              {
                icon: Calculator,
                title: "Deterministic Methodology",
                desc: "Scores computed from real government data using transparent formulas. Same postcode, same score, every time. Not AI guesses.",
              },
              {
                icon: MessageSquareText,
                title: "AI-Powered Narrative",
                desc: "Data tells you the numbers. AI explains what they mean for your specific situation. Scored dimensions plus plain-English recommendations.",
              },
              {
                icon: Code,
                title: "Developer API",
                desc: "REST API with Bearer auth. Embed area intelligence into property platforms, CRM tools, and relocation apps. No competitor offers this.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-5" style={{ background: "var(--bg-elevated)" }}>
                  <Icon size={16} className="mb-3" style={{ color: "var(--accent)" }} />
                  <div className="text-[13px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison Feature ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-10">
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Compare Areas</div>
            <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
              Side-by-side intelligence comparison
            </h2>
            <p className="text-[14px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Deciding between two areas? Compare them directly across every dimension, with clear winner indicators and AI-generated insights.
            </p>
          </div>

          {/* Full-width comparison card */}
          <div className="border max-w-[800px] mx-auto" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Area Comparison</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>MOVING</span>
            </div>
            <div className="p-6">
              {/* Score headers */}
              <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="text-center p-4 border" style={{ borderColor: "var(--neon-green-dim)", background: "rgba(0,255,136,0.02)" }}>
                  <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--neon-green)" }}>Winner</div>
                  <div className="text-[36px] font-mono font-bold neon-green-glow leading-none" style={{ color: "var(--neon-green)" }}>78</div>
                  <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--text-primary)" }}>Clapham</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>SW4, London</div>
                </div>
                <div className="text-center p-4 border" style={{ borderColor: "var(--border)" }}>
                  <div className="h-[17px] mb-2" />
                  <div className="text-[36px] font-mono font-bold neon-amber-glow leading-none" style={{ color: "var(--neon-amber)" }}>62</div>
                  <div className="text-[13px] font-semibold mt-2" style={{ color: "var(--text-primary)" }}>Brixton</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>SW2, London</div>
                </div>
              </div>

              {/* Dimension rows */}
              <div className="space-y-2.5">
                {[
                  { label: "Safety & Crime", a: 74, b: 52 },
                  { label: "Schools", a: 68, b: 58 },
                  { label: "Transport", a: 82, b: 85 },
                  { label: "Amenities", a: 79, b: 72 },
                  { label: "Cost of Living", a: 45, b: 62 },
                  { label: "Environment", a: 71, b: 54 },
                ].map((row) => {
                  const colorA = row.a >= 70 ? "var(--neon-green)" : row.a >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
                  const colorB = row.b >= 70 ? "var(--neon-green)" : row.b >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
                  const dimA = row.a >= 70 ? "var(--neon-green-dim)" : row.a >= 45 ? "var(--neon-amber-dim)" : "var(--neon-red-dim)";
                  const dimB = row.b >= 70 ? "var(--neon-green-dim)" : row.b >= 45 ? "var(--neon-amber-dim)" : "var(--neon-red-dim)";
                  const winner = row.a > row.b ? "a" : row.b > row.a ? "b" : "tie";
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{row.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono font-semibold" style={{ color: colorA }}>{row.a}{winner === "a" && " ✓"}</span>
                          <span className="text-[11px] font-mono font-semibold" style={{ color: colorB }}>{row.b}{winner === "b" && " ✓"}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 h-[5px]" style={{ background: dimA }}>
                          <div className="h-full" style={{ width: `${row.a}%`, background: colorA, boxShadow: `0 0 4px ${colorA}` }} />
                        </div>
                        <div className="flex-1 h-[5px]" style={{ background: dimB }}>
                          <div className="h-full" style={{ width: `${row.b}%`, background: colorB, boxShadow: `0 0 4px ${colorB}` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Insight */}
              <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: "var(--accent)" }}>AI Insight</div>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  Clapham scores higher on safety and schools, making it stronger for families. Brixton edges ahead on transport links and cost of living, offering better value for young professionals.
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  <span className="neon-green-glow" style={{ color: "var(--neon-green)" }}>Clapham</span> wins 4/6 dimensions
                </span>
                <Link href="/compare" className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--accent)" }}>
                  Try comparison <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── API Section ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Code block */}
            <div className="border order-2 md:order-1" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
              <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5" style={{ color: "var(--bg)", background: "var(--neon-green)" }}>POST</span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>/api/v1/report</span>
              </div>
              <pre className="p-4 text-[11px] font-mono leading-relaxed overflow-x-auto" style={{ color: "var(--text-secondary)" }}>
{`curl -X POST /api/v1/report \\
  -H "Authorization: Bearer aiq_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "area": "Shoreditch",
    "intent": "business"
  }'`}
              </pre>
              <div className="px-4 py-2 border-t flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--neon-green)" }} />
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>200 OK &bull; ~12s</span>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} style={{ color: "var(--accent)" }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>REST API</span>
              </div>
              <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
                Embed intelligence<br />into any product
              </h2>
              <p className="text-[14px] leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
                Property listings. CRM tools. Relocation platforms. Insurance risk models. One API call returns a complete area intelligence report with scored dimensions and real data.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["Property Sites", "Franchise Tools", "Relocation", "Insurance", "Marketing"].map((use) => (
                  <span key={use} className="text-[9px] font-mono uppercase tracking-wider px-2 py-1 border" style={{ color: "var(--text-tertiary)", borderColor: "var(--border)" }}>
                    {use}
                  </span>
                ))}
              </div>
              <Link href="/docs" className="inline-flex items-center gap-2 text-[12px] font-mono font-medium" style={{ color: "var(--accent)" }}>
                Read the docs <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-20">
          <div className="text-center mb-10">
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Pricing</div>
            <h2 className="text-[22px] md:text-[28px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
              Start free. Scale when ready.
            </h2>
            <p className="text-[14px] max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
              Every plan includes all 5 data sources, all intent types, and full scored reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px max-w-[1100px] mx-auto" style={{ background: "var(--border)" }}>
            {[
              {
                tier: "Free", price: "£0", period: "forever", reports: "3 reports / month",
                desc: "Individual exploration",
                features: ["All 5 data sources", "All intent types", "Weighted scoring", "Shareable URLs"],
                cta: "Get Started", ctaStyle: { background: "var(--bg-active)", color: "var(--text-primary)" },
              },
              {
                tier: "Starter", price: "£29", period: "/month", reports: "20 reports / month",
                desc: "Freelance agents & landlords",
                features: ["Everything in Free", "Area comparison", "Report history", "Billing management"],
                cta: "Get Started", ctaStyle: { background: "var(--bg-active)", color: "var(--text-primary)" },
              },
              {
                tier: "Pro", price: "£79", period: "/month", reports: "75 reports / month",
                desc: "Agencies & active investors",
                features: ["Everything in Starter", "75 reports per month", "Bulk area analysis", "Email support"],
                cta: "Upgrade to Pro", ctaStyle: { background: "var(--text-primary)", color: "var(--bg)" },
                highlight: true,
              },
              {
                tier: "Developer", price: "£49", period: "/month", reports: "100 API reports / month",
                desc: "Solo devs & PropTech builders",
                features: ["REST API access", "API key management", "Full documentation", "Usage dashboard"],
                cta: "Start Building", ctaStyle: { background: "var(--bg-active)", color: "var(--text-primary)" },
              },
            ].map((item) => (
              <div key={item.tier} className="p-6 flex flex-col" style={{ background: item.highlight ? "var(--bg-active)" : "var(--bg-elevated)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{item.tier}</span>
                  {item.highlight && (
                    <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>Popular</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-mono font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{item.price}</span>
                  <span className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>{item.period}</span>
                </div>
                <div className="text-[11px] font-mono mb-1" style={{ color: "var(--neon-green)" }}>{item.reports}</div>
                <div className="text-[11px] mb-5" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                <div className="space-y-2 mb-6 flex-1">
                  {item.features.map((f) => (
                    <div key={f} className="text-[11px] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                      <span className="text-[9px]" style={{ color: "var(--neon-green)" }}>&#10003;</span>
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href={item.tier === "Free" ? "/report" : "/pricing"}
                  className="h-9 flex items-center justify-center text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
                  style={item.ctaStyle}
                >
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Embed Widget ── */}
      <section className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--neon-green)" }}>
              Embed
            </div>
            <h2 className="text-[26px] md:text-[34px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
              Add area scores to any website
            </h2>
            <p className="text-[14px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              One script tag. No API key. No setup fee. Scores appear in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
            {/* Widget Preview */}
            <div className="p-8 flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
              <div style={{ maxWidth: 340, width: "100%" }}>
                {/* Static widget mockup */}
                <div className="border overflow-hidden" style={{ borderColor: "var(--border)", borderRadius: 6, background: "var(--bg)" }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[11px] font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>AreaIQ</span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Shoreditch, E1 6AN</span>
                  </div>
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="29" fill="none" stroke="var(--neon-green)" strokeOpacity="0.1" strokeWidth="3" />
                        <circle cx="32" cy="32" r="29" fill="none" stroke="var(--neon-green)" strokeWidth="3"
                          strokeDasharray={`${2 * Math.PI * 29}`}
                          strokeDashoffset={`${2 * Math.PI * 29 * (1 - 82 / 100)}`}
                          strokeLinecap="round"
                          transform="rotate(-90 32 32)" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[20px] font-mono font-bold" style={{ color: "var(--neon-green)", lineHeight: 1 }}>82</span>
                        <span className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Good</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 flex-1">
                      {[
                        { label: "Safety", score: 76 },
                        { label: "Transport", score: 91 },
                        { label: "Schools", score: 74 },
                        { label: "Amenities", score: 88 },
                        { label: "Environment", score: 81 },
                      ].map((d) => (
                        <div key={d.label} className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{d.label}</span>
                          <span className="text-[11px] font-mono font-semibold" style={{ color: d.score >= 70 ? "var(--neon-green)" : d.score >= 40 ? "var(--neon-amber)" : "var(--neon-red)" }}>
                            {d.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>Powered by AreaIQ</span>
                    <span className="text-[9px] font-semibold" style={{ color: "var(--neon-green)" }}>View full report →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Snippet */}
            <WidgetCodeSnippet />
          </div>
        </div>
      </section>

      {/* ── B2B / Platform ── */}
      <section className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
              For platforms
            </div>
            <h2 className="text-[26px] md:text-[34px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
              Area intelligence for your product
            </h2>
            <p className="text-[14px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
              Embed scored area data into property portals, CRMs, relocation tools, and investment platforms. REST API or drop-in widget.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
            {[
              {
                icon: Key,
                title: "REST API",
                desc: "POST a postcode, get a scored report back. Full JSON response with 5 dimensions, AI narrative, and reasoning.",
              },
              {
                icon: Globe,
                title: "Embed widget",
                desc: "One script tag on your page. No API key needed. Score card renders automatically with your postcode.",
              },
              {
                icon: Shield,
                title: "Deterministic scoring",
                desc: "Same postcode, same intent, same scores. Every time. 16 scoring functions with transparent methodology.",
              },
              {
                icon: BarChart3,
                title: "Usage dashboard",
                desc: "Track API calls, monitor usage by key, view 30-day trends. All self-serve from your dashboard.",
              },
            ].map((item) => (
              <div key={item.title} className="p-6" style={{ background: "var(--bg-elevated)" }}>
                <item.icon size={16} style={{ color: "var(--accent)" }} />
                <div className="text-[13px] font-semibold mt-3 mb-2" style={{ color: "var(--text-primary)" }}>
                  {item.title}
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mt-px" style={{ background: "var(--border)" }}>
            {[
              {
                label: "Estate agents",
                desc: "Show area scores on every listing. Help buyers understand the neighbourhood before they visit.",
              },
              {
                label: "Property portals",
                desc: "Enrich search results with area intelligence. Differentiate from Rightmove and Zoopla.",
              },
              {
                label: "Investment platforms",
                desc: "Screen areas at scale for yield, safety, and growth potential. 500+ reports per month.",
              },
            ].map((item) => (
              <div key={item.label} className="p-5" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--neon-green)" }}>
                  {item.label}
                </div>
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/docs"
              className="h-10 px-6 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
              style={{ background: "var(--text-primary)", color: "var(--bg)" }}
            >
              API Documentation <ArrowRight size={12} />
            </Link>
            <Link
              href="/pricing"
              className="h-10 px-6 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
              style={{ background: "var(--bg-active)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              View API Pricing <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section>
        <div className="max-w-[1200px] mx-auto px-6 py-20 md:py-28 text-center">
          <h2 className="text-[26px] md:text-[34px] font-semibold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Stop Googling. Start knowing.
          </h2>
          <p className="text-[14px] mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            15 browser tabs, 3 spreadsheets, 2 hours of research. Or one AreaIQ report.
          </p>
          <Link href="/report" className="inline-flex h-12 px-10 items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide" style={{ background: "var(--text-primary)", color: "var(--bg)" }}>
            Generate Your First Report <ArrowRight size={13} />
          </Link>
          <div className="mt-4 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            Free · 3 reports/month · no card required
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo size="sm" variant="footer" />
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>&copy; 2026</span>
          </div>
          <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1">
            <Link href="/docs" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>API Docs</Link>
            <Link href="/pricing" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Pricing</Link>
            <Link href="/methodology" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Methodology</Link>
            <Link href="/about" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>About</Link>
            <Link href="/changelog" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Changelog</Link>
            <Link href="/help" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Help</Link>
            <Link href="/terms" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Terms</Link>
            <Link href="/privacy" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Privacy</Link>
            <Link href="/report" className="text-[10px] font-mono transition-colors hover:opacity-80" style={{ color: "var(--text-tertiary)" }}>Generate Report</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
