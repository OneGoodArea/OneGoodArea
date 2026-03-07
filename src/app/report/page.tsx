"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2, MapPin, Activity, BarChart3, Zap } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Intent } from "@/lib/types";
import Link from "next/link";
import { Logo } from "@/components/logo";

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
  const router = useRouter();
  const [area, setArea] = useState("");
  const [intent, setIntent] = useState<Intent>("research");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ plan: string; used: number; limit: number } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        setUsage({ plan: data.plan, used: data.used, limit: data.limit });
        if (!data.allowed) setLimitReached(true);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!area.trim() || loading || limitReached) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: area.trim(), intent }),
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.error === "limit_reached") {
          setLimitReached(true);
          setLoading(false);
          return;
        }
      }

      if (!res.ok) throw new Error("Failed to generate report");

      const data = await res.json();
      router.push(`/report/${data.id}`);
    } catch {
      setError("Failed to generate report. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      {/* ── Header ── */}
      <header className="border-b shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/" />
            <span className="text-[10px] font-mono" style={{ color: "var(--border-hover)" }}>/</span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Report Generator
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden sm:block text-[10px] font-mono uppercase tracking-wider transition-colors hover:opacity-80"
              style={{ color: "var(--text-tertiary)" }}
            >
              My Reports
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full neon-dot" style={{ color: "var(--neon-green)", background: "var(--neon-green)" }} />
              Online
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6">
        {/* ── Form State ── */}
        {!loading && (
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

              {/* Usage indicator */}
              {usage && (
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                        Monthly Usage
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {usage.used}/{usage.limit === Infinity ? "∞" : usage.limit} reports
                      </span>
                    </div>
                    <div className="h-1 w-full" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full transition-all"
                        style={{
                          width: usage.limit === Infinity ? "0%" : `${Math.min((usage.used / usage.limit) * 100, 100)}%`,
                          background: usage.used >= usage.limit && usage.limit !== Infinity ? "var(--neon-red)" : "var(--neon-green)",
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono uppercase px-2 py-0.5"
                    style={{ color: "var(--text-tertiary)", background: "var(--bg-active)", border: "1px solid var(--border)" }}
                  >
                    {usage.plan}
                  </span>
                </div>
              )}

              {/* Limit reached prompt */}
              {limitReached && (
                <div
                  className="mb-6 border p-5"
                  style={{ borderColor: "var(--neon-amber-dim)", background: "var(--bg-elevated)" }}
                >
                  <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--neon-amber)" }}>
                    Monthly limit reached
                  </div>
                  <p className="text-[12px] mb-4" style={{ color: "var(--text-secondary)" }}>
                    You&apos;ve used all {usage?.limit} free reports this month. Upgrade to Pro for unlimited reports.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex h-8 px-4 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
                    style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                  >
                    View Plans
                    <ArrowRight size={11} />
                  </Link>
                </div>
              )}

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
                      placeholder="e.g. Shoreditch, London or BS1 Bristol"
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
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
      </main>

      {/* ── Footer ── */}
      <footer className="border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-10 flex items-center justify-between">
          <Logo size="sm" variant="footer" />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Area intelligence, instantly.</span>
        </div>
      </footer>
    </div>
  );
}
