"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, Download, Lock, Share2, Copy, ShieldCheck, Bookmark, Check, Clock, Radio, Database, TrendingUp, TrendingDown, Minus, PoundSterling } from "lucide-react";
import { AreaReport } from "@/lib/types";
import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast";
import type { PlanId } from "@/lib/stripe";
import Link from "next/link";

function getRAG(score: number) {
  if (score >= 70) return { color: "var(--neon-green)", dim: "var(--neon-green-dim)", glow: "neon-green-glow", label: "Strong" };
  if (score >= 45) return { color: "var(--neon-amber)", dim: "var(--neon-amber-dim)", glow: "neon-amber-glow", label: "Moderate" };
  return { color: "var(--neon-red)", dim: "var(--neon-red-dim)", glow: "neon-red-glow", label: "Weak" };
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

/* ── Score Context Bar ── */
function ScoreContextBar({ score }: { score: number }) {
  const [mounted, setMounted] = useState(false);
  const { color } = getRAG(score);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Score Distribution</span>
        <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>0 to 100</span>
      </div>
      <div className="relative h-2 w-full" style={{ background: "var(--border)" }}>
        {/* RAG zones */}
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: "45%", background: "var(--neon-red-dim)" }} />
          <div className="h-full" style={{ width: "25%", background: "var(--neon-amber-dim)" }} />
          <div className="h-full" style={{ width: "30%", background: "var(--neon-green-dim)" }} />
        </div>
        {/* Score marker */}
        <div
          className="absolute top-0 h-full w-0.5 transition-all duration-1000 ease-out"
          style={{
            left: mounted ? `${score}%` : "0%",
            background: color,
            boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[8px] font-mono" style={{ color: "var(--neon-red)", opacity: 0.6 }}>Weak</span>
        <span className="text-[8px] font-mono" style={{ color: "var(--neon-amber)", opacity: 0.6 }}>Moderate</span>
        <span className="text-[8px] font-mono" style={{ color: "var(--neon-green)", opacity: 0.6 }}>Strong</span>
      </div>
    </div>
  );
}

/* ── Radar Chart ── */
function RadarChart({ subScores, size = 220 }: { subScores: AreaReport["sub_scores"]; size?: number }) {
  const [mounted, setMounted] = useState(false);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = [20, 40, 60, 80, 100];
  const count = subScores.length;

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  function getPoint(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function getPolygon(value: number): string {
    return Array.from({ length: count }, (_, i) => getPoint(i, value).join(",")).join(" ");
  }

  const dataPoints = subScores.map((s, i) => getPoint(i, mounted ? s.score : 0));
  const dataPolygon = dataPoints.map(p => p.join(",")).join(" ");

  // Compute average color based on average score
  const avgScore = subScores.reduce((sum, s) => sum + s.score, 0) / subScores.length;
  const { color: fillColor } = getRAG(avgScore);

  return (
    <div className="relative py-4 px-8" style={{ width: size + 64, height: size + 32 }}>
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        {/* Grid levels */}
        {levels.map((level) => (
          <polygon
            key={level}
            points={getPolygon(level)}
            fill="none"
            stroke="var(--border)"
            strokeWidth={level === 100 ? 1 : 0.5}
            opacity={level === 100 ? 0.8 : 0.4}
          />
        ))}

        {/* Axis lines */}
        {subScores.map((_, i) => {
          const [x, y] = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.4}
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={dataPolygon}
          fill={fillColor}
          fillOpacity={0.1}
          stroke={fillColor}
          strokeWidth={1.5}
          style={{
            transition: "all 0.8s ease-out",
            filter: `drop-shadow(0 0 4px ${fillColor})`,
          }}
        />

        {/* Data points */}
        {dataPoints.map((point, i) => {
          const { color } = getRAG(subScores[i].score);
          return (
            <circle
              key={i}
              cx={point[0]}
              cy={point[1]}
              r={3}
              fill={color}
              stroke="var(--bg)"
              strokeWidth={1}
              style={{
                transition: "all 0.8s ease-out",
                filter: `drop-shadow(0 0 3px ${color})`,
              }}
            />
          );
        })}

        {/* Labels */}
        {subScores.map((sub, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const labelR = maxR + 20;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          const { color } = getRAG(sub.score);

          // Determine text anchor based on position
          let anchor: "start" | "middle" | "end" = "middle";
          if (Math.cos(angle) > 0.3) anchor = "start";
          else if (Math.cos(angle) < -0.3) anchor = "end";

          return (
            <g key={i}>
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="var(--text-tertiary)"
                fontSize="9"
                fontFamily="var(--font-mono)"
              >
                {sub.label}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={color}
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="600"
              >
                {mounted ? sub.score : 0}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Sub-score detail bar ── */
function SubScoreBar({ label, score, weight, summary, reasoning, delay }: { label: string; score: number; weight?: number; summary: string; reasoning?: string; delay: number }) {
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
      {reasoning && (
        <p className="text-[9px] font-mono mt-1 leading-snug" style={{ color: "var(--text-tertiary)", opacity: 0.7 }}>
          Data: {reasoning}
        </p>
      )}
    </div>
  );
}

/* ── Collapsible Section Card ── */
function SectionCard({ section, index, defaultOpen = false }: { section: AreaReport["sections"][0]; index: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="border animate-fade-in-up"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: `${200 + index * 80}ms` }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors hover:brightness-110"
        style={{ borderBottom: open ? "1px solid var(--border)" : "none" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="text-[13px] font-semibold text-left flex-1" style={{ color: "var(--text-primary)" }}>
          {section.title}
        </h2>
        {section.data_points && section.data_points.length > 0 && !open && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 hidden sm:block" style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}>
            {section.data_points.length} data points
          </span>
        )}
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: "var(--text-tertiary)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <>
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
        </>
      )}
    </div>
  );
}

/* ── Main Report View ── */
export function ReportView({ report, plan = "free", reportId }: { report: AreaReport; plan?: PlanId; reportId?: string }) {
  const { color: scoreColor, glow: scoreGlow } = getRAG(report.areaiq_score);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const reportUrl = reportId ? `https://www.area-iq.co.uk/report/${reportId}` : "";
  const shareText = `${report.area} scored ${report.areaiq_score}/100 for ${report.intent} on AreaIQ`;

  function copyLink() {
    if (!reportUrl) return;
    navigator.clipboard.writeText(reportUrl);
    toast.success("Link copied to clipboard");
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${reportUrl}`)}`, "_blank");
  }

  function shareLinkedIn() {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(reportUrl)}`, "_blank");
  }

  function shareX() {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(reportUrl)}`, "_blank");
  }

  async function exportPDF() {
    if (exporting) return;
    setExporting(true);
    try {
      const { exportReportPDF } = await import("@/lib/pdf-export");
      exportReportPDF(report);
    } catch (err) {
      console.error("[AreaIQ] PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  async function saveToWatchlist() {
    if (saving || saved) return;
    setSaving(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postcode: report.area,
          label: "",
          intent: report.intent,
        }),
      });
      if (res.ok || res.status === 409) {
        setSaved(true);
        toast.success(res.status === 409 ? "Already in your watchlist" : "Saved to watchlist");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[960px]">
      {/* ── Header ── */}
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
            style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
          >
            {report.intent}
          </span>
          {report.area_type && (
            <span
              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5"
              style={{ color: "var(--text-secondary)", background: "var(--bg-active)" }}
            >
              {report.area_type}
            </span>
          )}
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {new Date(report.generated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 ml-auto ${scoreGlow}`}
            style={{ color: scoreColor, background: getRAG(report.areaiq_score).dim }}
          >
            {getRAG(report.areaiq_score).label}
          </span>
        </div>
        <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {report.area}
        </h1>
        <p className="text-[13px] mt-2 max-w-2xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {report.summary}
        </p>
      </div>

      {/* ── Score Overview ── */}
      <div
        className="border mb-3 animate-fade-in-up"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: "100ms" }}
      >
        <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Intelligence Score
          </span>
          <div className="flex items-center gap-2">
            {report.area_type && (
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {report.area_type} benchmarks
              </span>
            )}
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              · {report.sub_scores.length} dimensions
            </span>
          </div>
        </div>

        {/* ── Data Freshness Strip ── */}
        {report.data_freshness && report.data_freshness.length > 0 && (
          <div className="px-5 py-2 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Data freshness
            </span>
            {report.data_freshness.map((df) => {
              const statusColor = df.status === "live"
                ? "var(--neon-green)"
                : df.status === "recent"
                  ? "var(--neon-amber)"
                  : "var(--text-tertiary)";
              const statusBg = df.status === "live"
                ? "var(--neon-green-dim)"
                : df.status === "recent"
                  ? "var(--neon-amber-dim)"
                  : "var(--bg-active)";
              const StatusIcon = df.status === "live" ? Radio : df.status === "recent" ? Clock : Database;
              return (
                <span
                  key={df.source}
                  className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5"
                  style={{ color: statusColor, background: statusBg }}
                >
                  <StatusIcon size={8} />
                  {df.source} · {df.period}
                </span>
              );
            })}
          </div>
        )}

        <div className="p-5">
          {/* Score Ring + Radar Chart */}
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
            <div className="flex flex-col items-center shrink-0">
              <ScoreRing score={report.areaiq_score} size={130} />
              <div className="text-center mt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  AreaIQ Score
                </span>
              </div>
              <div className="w-full mt-4 max-w-[200px]">
                <ScoreContextBar score={report.areaiq_score} />
              </div>
              <div
                className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5"
                style={{ background: "var(--neon-green-dim)", borderRadius: "2px" }}
              >
                <ShieldCheck size={11} style={{ color: "var(--neon-green)" }} />
                <span className="text-[9px] font-mono" style={{ color: "var(--neon-green)" }}>
                  Deterministic scores. AI explains, never sets.
                </span>
              </div>
            </div>

            {report.sub_scores.length >= 3 && (
              <div className="flex-1 flex justify-center overflow-hidden">
                <RadarChart subScores={report.sub_scores} size={200} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dimension Breakdown ── */}
      <div
        className="border mb-6 animate-fade-in-up"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: "200ms" }}
      >
        <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Dimension Breakdown
          </span>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {report.sub_scores.map((sub, i) => (
            <SubScoreBar key={sub.label} label={sub.label} score={sub.score} weight={sub.weight} summary={sub.summary} reasoning={sub.reasoning} delay={400 + i * 100} />
          ))}
        </div>
      </div>

      {/* ── Property Market Panel (Pro+ / API plans) ── */}
      {report.property_data && plan !== "free" && plan !== "starter" && (
        <div
          className="border mb-6 animate-fade-in-up"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: "250ms" }}
        >
          <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <PoundSterling size={12} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Property Market
              </span>
            </div>
            <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              HM Land Registry &middot; {report.property_data.postcode_area} &middot; {report.property_data.period}
            </span>
          </div>

          <div className="p-5">
            {/* Top stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-4" style={{ background: "var(--border)" }}>
              <div className="px-4 py-3" style={{ background: "var(--bg)" }}>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                  Median Price
                </div>
                <div className="text-[18px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  £{report.property_data.median_price.toLocaleString()}
                </div>
              </div>
              <div className="px-4 py-3" style={{ background: "var(--bg)" }}>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                  YoY Change
                </div>
                <div className="flex items-center gap-1.5">
                  {report.property_data.price_change_pct !== null ? (
                    <>
                      {report.property_data.price_change_pct > 0 ? (
                        <TrendingUp size={14} style={{ color: "var(--neon-green)" }} />
                      ) : report.property_data.price_change_pct < 0 ? (
                        <TrendingDown size={14} style={{ color: "var(--neon-red)" }} />
                      ) : (
                        <Minus size={14} style={{ color: "var(--text-tertiary)" }} />
                      )}
                      <span
                        className="text-[18px] font-mono font-bold"
                        style={{
                          color: report.property_data.price_change_pct > 0
                            ? "var(--neon-green)"
                            : report.property_data.price_change_pct < 0
                              ? "var(--neon-red)"
                              : "var(--text-primary)",
                        }}
                      >
                        {report.property_data.price_change_pct > 0 ? "+" : ""}{report.property_data.price_change_pct}%
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] font-mono" style={{ color: "var(--text-tertiary)" }}>N/A</span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3" style={{ background: "var(--bg)" }}>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                  Transactions
                </div>
                <div className="text-[18px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  {report.property_data.transaction_count}
                </div>
              </div>
              <div className="px-4 py-3" style={{ background: "var(--bg)" }}>
                <div className="text-[9px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>
                  Mean Price
                </div>
                <div className="text-[18px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                  £{report.property_data.mean_price.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Property type breakdown */}
            {report.property_data.by_property_type.length > 0 && (
              <div className="mb-4">
                <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                  By Property Type
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
                  {report.property_data.by_property_type.map((pt) => (
                    <div key={pt.type} className="px-3 py-2.5" style={{ background: "var(--bg)" }}>
                      <div className="text-[10px] font-mono mb-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {pt.type}
                      </div>
                      <div className="text-[13px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                        £{pt.median.toLocaleString()}
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                        {pt.count} sales
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tenure split + price range */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Tenure bar */}
              {(report.property_data.tenure_split.freehold + report.property_data.tenure_split.leasehold) > 0 && (() => {
                const total = report.property_data.tenure_split.freehold + report.property_data.tenure_split.leasehold;
                const freeholdPct = Math.round((report.property_data.tenure_split.freehold / total) * 100);
                return (
                  <div className="flex-1">
                    <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                      Tenure Split
                    </div>
                    <div className="h-2 w-full flex" style={{ background: "var(--border)" }}>
                      <div style={{ width: `${freeholdPct}%`, background: "var(--neon-green)" }} />
                      <div style={{ width: `${100 - freeholdPct}%`, background: "var(--neon-amber)" }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] font-mono" style={{ color: "var(--neon-green)" }}>
                        Freehold {freeholdPct}%
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: "var(--neon-amber)" }}>
                        Leasehold {100 - freeholdPct}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Price range */}
              <div className="flex-1">
                <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Price Range
                </div>
                <div className="h-2 w-full" style={{ background: "var(--border)" }}>
                  <div className="h-full" style={{ width: "100%", background: "var(--accent-dim)" }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    £{report.property_data.price_range.min.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-secondary)" }}>
                    £{report.property_data.price_range.max.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Property Market Teaser (free/starter) ── */}
      {report.property_data && (plan === "free" || plan === "starter") && (
        <Link
          href="/pricing"
          className="border mb-6 animate-fade-in-up block transition-colors hover:brightness-110"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: "250ms" }}
        >
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={14} style={{ color: "var(--text-tertiary)" }} />
              <div>
                <span className="text-[11px] font-mono font-semibold block" style={{ color: "var(--text-primary)" }}>
                  Property Market Data
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  Median prices, YoY trends, property types, tenure split from HM Land Registry
                </span>
              </div>
            </div>
            <span
              className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1"
              style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
            >
              Pro
            </span>
          </div>
        </Link>
      )}

      {/* ── Sections (collapsible) ── */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Detailed Analysis
          </span>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            · click to expand
          </span>
        </div>
        {report.sections.map((section, i) => (
          <SectionCard key={i} section={section} index={i} defaultOpen={i === 0} />
        ))}
      </div>

      {/* ── Recommendations ── */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: `${200 + report.sections.length * 80 + 80}ms` }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Recommendations
            </span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {report.recommendations.length} actions
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {report.recommendations.map((rec, i) => (
              <div
                key={i}
                className="border px-5 py-3.5 flex gap-4 animate-fade-in-up"
                style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: `${300 + i * 60}ms` }}
              >
                <div className="shrink-0 mt-0.5">
                  <span
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    {i + 1}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Logo size="sm" variant="footer" />
          <span className="text-[10px] font-mono hidden sm:inline" style={{ color: "var(--text-tertiary)" }}>Intelligence Report</span>
          {plan === "free" ? (
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80"
              style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <Lock size={10} />
              PDF · Upgrade
            </Link>
          ) : (
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ color: "var(--accent)", borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <Download size={10} />
              {exporting ? "Exporting..." : "PDF"}
            </button>
          )}
          <button
            onClick={saveToWatchlist}
            disabled={saving || saved}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80 disabled:opacity-60"
            style={{
              color: saved ? "var(--neon-green)" : "var(--neon-amber)",
              borderColor: "var(--border)",
              background: "var(--bg)",
            }}
          >
            {saved ? <Check size={10} /> : <Bookmark size={10} />}
            {saving ? "Saving..." : saved ? "Saved" : "Watch"}
          </button>
          {reportId && (
            <>
              <span className="text-[10px]" style={{ color: "var(--border)" }}>|</span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80"
                style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <Copy size={10} />
                Link
              </button>
              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80"
                style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <Share2 size={10} />
                WhatsApp
              </button>
              <button
                onClick={shareLinkedIn}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80"
                style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <Share2 size={10} />
                LinkedIn
              </button>
              <button
                onClick={shareX}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors hover:opacity-80"
                style={{ color: "var(--text-tertiary)", borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <Share2 size={10} />
                X
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
