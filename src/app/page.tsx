"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Shield, Train, Users, Crosshair, Globe } from "lucide-react";
import Link from "next/link";

function StatusTicker() {
  const events = [
    { area: "Shoreditch, London", score: 82 },
    { area: "Austin, TX 78701", score: 74 },
    { area: "Kreuzberg, Berlin", score: 71 },
    { area: "Shibuya, Tokyo", score: 88 },
    { area: "Williamsburg, NYC", score: 76 },
    { area: "Le Marais, Paris", score: 79 },
    { area: "Södermalm, Stockholm", score: 83 },
    { area: "Fitzroy, Melbourne", score: 69 },
  ];
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const event = events[tick % events.length];
  const color = event.score >= 70 ? "var(--neon-green)" : event.score >= 45 ? "var(--neon-amber)" : "var(--neon-red)";

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full neon-dot" style={{ color: "var(--neon-green)", background: "var(--neon-green)" }} />
      <span>{event.area}</span>
      <span style={{ color: "var(--border-hover)" }}>/</span>
      <span className="neon-green-glow" style={{ color }}>{event.score}</span>
    </div>
  );
}

function NeonScore({ score }: { score: number }) {
  const color = score >= 70 ? "var(--neon-green)" : score >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
  const glowClass = score >= 70 ? "neon-green-glow" : score >= 45 ? "neon-amber-glow" : "neon-red-glow";
  return (
    <span className={`font-mono font-bold ${glowClass}`} style={{ color }}>{score}</span>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-grid">
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              AreaIQ
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 border"
              style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg-elevated)" }}
            >
              BETA
            </span>
          </div>
          <div className="flex items-center gap-6">
            <StatusTicker />
            <Link
              href="/report"
              className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
              style={{ background: "var(--text-primary)", color: "var(--bg)" }}
            >
              Launch App
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-[10px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
              AI-Powered Area Intelligence
            </div>
            <h1 className="text-[42px] font-semibold tracking-tight leading-[1.08] mb-5" style={{ color: "var(--text-primary)" }}>
              Know any area.<br />Instantly.
            </h1>
            <p className="text-[15px] leading-relaxed mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
              Enter a location and an intent. Get a scored, structured intelligence report
              with demographics, safety, transport, amenities, and actionable recommendations —
              in seconds, not hours.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/report"
                className="h-11 px-7 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide transition-colors"
                style={{ background: "var(--text-primary)", color: "var(--bg)" }}
              >
                Generate a Report
                <ArrowRight size={13} />
              </Link>
              <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                Free — no signup required
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── RAG Score Example ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-px -mx-6" style={{ background: "var(--border)" }}>
            {[
              { area: "Shoreditch, London", intent: "Business", score: 82, verdict: "Strong opportunity" },
              { area: "Peckham, London", intent: "Investing", score: 54, verdict: "Moderate risk" },
              { area: "Rural Somerset", intent: "Business", score: 28, verdict: "High risk" },
            ].map((item) => {
              const color = item.score >= 70 ? "var(--neon-green)" : item.score >= 45 ? "var(--neon-amber)" : "var(--neon-red)";
              const dimColor = item.score >= 70 ? "var(--neon-green-dim)" : item.score >= 45 ? "var(--neon-amber-dim)" : "var(--neon-red-dim)";
              const glowClass = item.score >= 70 ? "neon-green-glow" : item.score >= 45 ? "neon-amber-glow" : "neon-red-glow";
              return (
                <div key={item.area} className="px-6 py-6" style={{ background: "var(--bg-elevated)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{item.area}</div>
                      <div className="text-[10px] font-mono uppercase mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.intent}</div>
                    </div>
                    <div className={`text-[28px] font-mono font-bold ${glowClass}`} style={{ color }}>
                      {item.score}
                    </div>
                  </div>
                  <div className="h-1.5 w-full mb-2" style={{ background: dimColor }}>
                    <div className="h-full" style={{ width: `${item.score}%`, background: color }} />
                  </div>
                  <div className="text-[10px] font-mono" style={{ color }}>{item.verdict}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-8" style={{ color: "var(--text-tertiary)" }}>
            How It Works
          </div>
          <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
            {[
              { step: "01", title: "Enter an area", desc: "Type any location — a neighbourhood, postcode, city district, or address. Global coverage." },
              { step: "02", title: "Choose your intent", desc: "Moving, opening a business, investing, or general research. The same area produces different intelligence for different goals." },
              { step: "03", title: "Get your report", desc: "AI agent researches in real-time: demographics, safety, transport, amenities, competition. Scored, structured, actionable." },
            ].map((item) => (
              <div key={item.step} className="p-6" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-[11px] font-mono mb-3" style={{ color: "var(--accent)" }}>{item.step}</div>
                <div className="text-[14px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                <div className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligence Dimensions ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Intelligence Dimensions
          </div>
          <div className="text-[15px] mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
            Every report scores across 5 dimensions, weighted by your intent.
          </div>
          <div className="grid grid-cols-5 gap-px" style={{ background: "var(--border)" }}>
            {[
              { icon: Shield, label: "Safety", desc: "Crime rates, incident types, street lighting, perceived safety" },
              { icon: Train, label: "Transport", desc: "Stations, routes, frequency, walk scores, connectivity" },
              { icon: Globe, label: "Amenities", desc: "Shops, restaurants, healthcare, parks, fitness, nightlife" },
              { icon: Users, label: "Demographics", desc: "Population, age, income, education, diversity, density" },
              { icon: Crosshair, label: "Intent-Specific", desc: "Livability, commercial viability, growth potential, or overall quality" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="p-5" style={{ background: "var(--bg-elevated)" }}>
                  <Icon size={16} className="mb-3" style={{ color: "var(--text-tertiary)" }} />
                  <div className="text-[12px] font-medium mb-1.5" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Intent Types ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Intent-Driven Reports
          </div>
          <div className="text-[15px] mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
            The same area produces completely different intelligence based on your purpose.
          </div>
          <div className="grid grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
            {[
              { label: "Moving", data: "Safety, schools, healthcare, parks, transport, cost of living, community, noise" },
              { label: "Business", data: "Foot traffic, competition density, commercial rent, demographics, spending power, complementary businesses" },
              { label: "Investing", data: "Price trends, rental yields, regeneration projects, planning applications, growth indicators" },
              { label: "Research", data: "Demographics, economy, safety, amenities, transport, culture, history, character" },
            ].map((item) => (
              <div key={item.label} className="p-5" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-[12px] font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{item.label}</div>
                <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{item.data}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Pricing
          </div>
          <div className="text-[15px] mb-8 max-w-lg" style={{ color: "var(--text-secondary)" }}>
            Start free. Upgrade when you need more.
          </div>
          <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
            {[
              { tier: "Free", price: "$0", desc: "3 reports / month", features: ["All intent types", "Full scored reports", "5 intelligence dimensions"] },
              { tier: "Pro", price: "$49", desc: "Unlimited reports", features: ["Everything in Free", "Report history", "Priority generation", "Export & sharing"] },
              { tier: "API", price: "$99", desc: "+ $0.10 per call", features: ["Everything in Pro", "REST API access", "API key management", "Embeddable widget"] },
            ].map((item) => (
              <div key={item.tier} className="p-6" style={{ background: "var(--bg-elevated)" }}>
                <div className="text-[12px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{item.tier}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[24px] font-mono font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{item.price}</span>
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>/mo</span>
                </div>
                <div className="text-[11px] font-mono mb-4" style={{ color: "var(--text-tertiary)" }}>{item.desc}</div>
                <div className="space-y-1.5">
                  {item.features.map((f) => (
                    <div key={f} className="text-[11px] flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                      <span className="text-[9px]" style={{ color: "var(--neon-green)" }}>&#10003;</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section>
        <div className="max-w-[1200px] mx-auto px-6 py-20 text-center">
          <h2 className="text-[24px] font-semibold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Stop Googling. Start knowing.
          </h2>
          <p className="text-[14px] mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
            Generate your first area intelligence report in seconds. No signup required.
          </p>
          <Link
            href="/report"
            className="inline-flex h-11 px-8 items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide"
            style={{ background: "var(--text-primary)", color: "var(--bg)" }}
          >
            Generate a Report
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            AreaIQ &copy; 2026
          </span>
          <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            Area intelligence, instantly.
          </span>
        </div>
      </footer>
    </div>
  );
}
