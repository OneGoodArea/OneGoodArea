"use client";

import { useEffect, useState, useRef } from "react";
import { AreaReport } from "@/lib/types";

function getRAG(score: number) {
  if (score >= 70) return { color: "var(--neon-green)", dim: "var(--neon-green-dim)", glow: "neon-green-glow" };
  if (score >= 45) return { color: "var(--neon-amber)", dim: "var(--neon-amber-dim)", glow: "neon-amber-glow" };
  return { color: "var(--neon-red)", dim: "var(--neon-red-dim)", glow: "neon-red-glow" };
}

/* ── Score Ring ── */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const [mounted, setMounted] = useState(false);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const { color } = getRAG(score);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="score-ring" width={size} height={size}>
        <circle className="score-ring-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="score-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? offset : circumference}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber value={score} className={`text-[28px] font-mono font-bold tracking-tight ${getRAG(score).glow}`} style={{ color }} />
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>/100</span>
      </div>
    </div>
  );
}

/* ── Animated number ── */
function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }

    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return <span className={className} style={style}>{display}</span>;
}

/* ── Sub-score bar ── */
function SubScoreBar({ label, score, weight, summary, delay }: { label: string; score: number; weight?: number; summary: string; delay: number }) {
  const [mounted, setMounted] = useState(false);
  const { color, dim, glow } = getRAG(score);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="animate-fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{label}</span>
          {weight && (
            <span className="text-[9px] font-mono px-1 py-px" style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}>
              {weight}%
            </span>
          )}
        </div>
        <span className={`text-[13px] font-mono font-semibold ${glow}`} style={{ color }}>
          {mounted ? score : 0}
        </span>
      </div>
      <div className="h-1.5 w-full" style={{ background: dim }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: mounted ? `${score}%` : "0%", background: color }}
        />
      </div>
      <p className="text-[10px] mt-1.5 leading-snug" style={{ color: "var(--text-tertiary)" }}>{summary}</p>
    </div>
  );
}

/* ── Section card ── */
function SectionCard({ section, index }: { section: AreaReport["sections"][0]; index: number }) {
  return (
    <div
      className="border animate-fade-in-up"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: `${200 + index * 80}ms` }}
    >
      <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{section.title}</h2>
      </div>

      <div className="px-5 py-4">
        <div className="text-[13px] leading-[1.7] whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
          {section.content}
        </div>
      </div>

      {section.data_points && section.data_points.length > 0 && (
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
            {section.data_points.map((dp, j) => (
              <div key={j} className="px-4 py-2.5" style={{ background: "var(--bg)" }}>
                <div className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  {dp.label}
                </div>
                <div className="text-[13px] font-mono mt-0.5 font-medium" style={{ color: "var(--text-primary)" }}>
                  {dp.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Report View ── */
export function ReportView({ report }: { report: AreaReport }) {
  const { color: scoreColor, glow: scoreGlow } = getRAG(report.areaiq_score);

  return (
    <div className="max-w-[960px]">
      {/* ── Header ── */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
            style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
          >
            {report.intent}
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {new Date(report.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {/* RAG badge */}
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 ml-auto ${scoreGlow}`}
            style={{ color: scoreColor, background: getRAG(report.areaiq_score).dim }}
          >
            {report.areaiq_score >= 70 ? "Strong" : report.areaiq_score >= 45 ? "Moderate" : "Weak"}
          </span>
        </div>
        <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {report.area}
        </h1>
        <p className="text-[13px] mt-2 max-w-2xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {report.summary}
        </p>
      </div>

      {/* ── Score panel ── */}
      <div
        className="border mb-6 animate-fade-in-up"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: "100ms" }}
      >
        <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Intelligence Score
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {report.sub_scores.length} weighted dimensions
          </span>
        </div>

        <div className="p-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="shrink-0">
              <ScoreRing score={report.areaiq_score} />
              <div className="text-center mt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  AreaIQ Score
                </span>
              </div>
            </div>

            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {report.sub_scores.map((sub, i) => (
                <SubScoreBar key={sub.label} label={sub.label} score={sub.score} weight={sub.weight} summary={sub.summary} delay={300 + i * 120} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="space-y-3 mb-6">
        {report.sections.map((section, i) => (
          <SectionCard key={i} section={section} index={i} />
        ))}
      </div>

      {/* ── Recommendations ── */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div
          className="border animate-fade-in-up"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: `${200 + report.sections.length * 80 + 80}ms` }}
        >
          <div className="px-5 py-2.5 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Recommendations
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {report.recommendations.length} actions
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {report.recommendations.map((rec, i) => (
              <div key={i} className="px-5 py-3 flex gap-4" style={{ borderColor: "var(--border)" }}>
                <span className="text-[11px] font-mono mt-0.5 shrink-0 w-5 text-right" style={{ color: "var(--accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-tight" style={{ color: "var(--text-tertiary)" }}>AreaIQ</span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>Intelligence Report</span>
        </div>
        <div className="flex items-center gap-3">
          {report.data_sources && report.data_sources.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Sources:
              </span>
              {report.data_sources.map((src) => (
                <span
                  key={src}
                  className="text-[9px] font-mono px-1.5 py-0.5"
                  style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
                >
                  {src}
                </span>
              ))}
            </div>
          )}
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {new Date(report.generated_at).toLocaleString("en-GB")}
          </span>
        </div>
      </div>
    </div>
  );
}
