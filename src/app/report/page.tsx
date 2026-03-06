"use client";

import { useState, useEffect } from "react";
import { Search, ArrowRight, Loader2, MapPin, Activity, BarChart3, Zap } from "lucide-react";
import { AreaReport, Intent } from "@/lib/types";
import { ReportView } from "@/components/report-view";
import Link from "next/link";

const intents: { value: Intent; label: string; desc: string; icon: typeof MapPin }[] = [
  { value: "moving", label: "Moving", desc: "Evaluate for living", icon: MapPin },
  { value: "business", label: "Business", desc: "Open a business", icon: BarChart3 },
  { value: "investing", label: "Investing", desc: "Investment potential", icon: Activity },
  { value: "research", label: "Research", desc: "General overview", icon: Zap },
];

const loadingSteps = [
  "Initialising area research agent",
  "Querying demographic data sources",
  "Pulling transport & infrastructure data",
  "Analysing local amenities & services",
  "Evaluating safety metrics",
  "Cross-referencing market signals",
  "Computing sub-scores",
  "Synthesising intelligence report",
  "Compiling final assessment",
];

function LoadingState({ area }: { area: string }) {
  const [activeStep, setActiveStep] = useState(0);
  const [stepTimes] = useState(() =>
    loadingSteps.map(() => (Math.random() * 1.5 + 0.3).toFixed(1))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((s) => (s < loadingSteps.length - 1 ? s + 1 : s));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in py-12 max-w-2xl mx-auto">
      <div className="mb-8 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
          Target Area
        </div>
        <div className="text-[20px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {area}
        </div>
      </div>

      <div className="space-y-0">
        {loadingSteps.map((step, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          const isPending = i > activeStep;

          return (
            <div
              key={step}
              className="flex items-center gap-3 py-2 transition-all duration-300"
              style={{ opacity: isPending ? 0.2 : 1 }}
            >
              <div className="w-5 flex justify-center shrink-0">
                {isDone && (
                  <span className="text-[11px] font-mono neon-green-glow" style={{ color: "var(--neon-green)" }}>&#10003;</span>
                )}
                {isActive && (
                  <Loader2 size={12} className="animate-spin" style={{ color: "var(--accent)" }} />
                )}
                {isPending && (
                  <span className="block w-1 h-1" style={{ background: "var(--border-hover)" }} />
                )}
              </div>
              <span
                className="text-[12px] font-mono transition-colors duration-300"
                style={{ color: isDone ? "var(--text-tertiary)" : isActive ? "var(--text-primary)" : "var(--text-tertiary)" }}
              >
                {step}
              </span>
              {isDone && (
                <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--text-tertiary)" }}>
                  {stepTimes[i]}s
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 h-px w-full" style={{ background: "var(--border)" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${((activeStep + 1) / loadingSteps.length) * 100}%`,
            background: "var(--accent)",
          }}
        />
      </div>
      <div className="mt-2 flex justify-between">
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Processing</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          {Math.round(((activeStep + 1) / loadingSteps.length) * 100)}%
        </span>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [area, setArea] = useState("");
  const [intent, setIntent] = useState<Intent>("research");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AreaReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!area.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: area.trim(), intent }),
      });

      if (!res.ok) throw new Error("Failed to generate report");

      const data = await res.json();
      setReport(data.report);
    } catch {
      setError("Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* ── Header ── */}
      <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              AreaIQ
            </Link>
            <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Report Generator
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full neon-dot" style={{ color: "var(--neon-green)", background: "var(--neon-green)" }} />
            System online
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6">
        {/* ── Form State ── */}
        {!report && !loading && (
          <div className="animate-fade-in py-10">
            <div className="max-w-xl">
              <div className="mb-8">
                <h1 className="text-[22px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                  Generate Area Report
                </h1>
                <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
                  Enter a location and select your research intent.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Area */}
                <div className="mb-4">
                  <label className="block text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                    Target Area
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-tertiary)" }} />
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Shoreditch, London or Austin, TX 78701"
                      className="w-full h-10 pl-9 pr-4 text-[13px] border font-mono"
                      style={{ background: "var(--bg-elevated)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {/* Intent */}
                <div className="mb-6">
                  <label className="block text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                    Research Intent
                  </label>
                  <div className="grid grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
                    {intents.map((i) => {
                      const Icon = i.icon;
                      const selected = intent === i.value;
                      return (
                        <button
                          key={i.value}
                          type="button"
                          onClick={() => setIntent(i.value)}
                          className="h-[68px] text-left px-3 py-2.5 transition-all duration-150 relative"
                          style={{ background: selected ? "var(--bg-active)" : "var(--bg-elevated)" }}
                        >
                          {selected && (
                            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "var(--accent)" }} />
                          )}
                          <Icon
                            size={13}
                            className="mb-1.5"
                            style={{ color: selected ? "var(--accent)" : "var(--text-tertiary)" }}
                          />
                          <div className="text-[12px] font-medium" style={{ color: selected ? "var(--text-primary)" : "var(--text-secondary)" }}>
                            {i.label}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                            {i.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!area.trim() || loading}
                  className="h-10 px-6 flex items-center gap-2 text-[12px] font-mono font-medium tracking-wide uppercase transition-all duration-150 disabled:opacity-20"
                  style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                >
                  Generate Report
                  <ArrowRight size={13} />
                </button>

                {error && (
                  <p className="mt-4 text-[12px] font-mono" style={{ color: "var(--neon-red)" }}>
                    {error}
                  </p>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && <LoadingState area={area} />}

        {/* ── Report ── */}
        {report && !loading && (
          <div className="animate-fade-in py-8">
            <button
              onClick={() => { setReport(null); setArea(""); }}
              className="text-[11px] font-mono mb-6 flex items-center gap-1.5 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
            >
              <ArrowRight size={11} className="rotate-180" />
              New report
            </button>
            <ReportView report={report} />
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-10 flex items-center justify-between">
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>AreaIQ</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Area intelligence, instantly.</span>
        </div>
      </footer>
    </div>
  );
}
