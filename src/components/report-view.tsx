"use client";

import { useState } from "react";
import { Download, Lock, Share2, Copy, ShieldCheck, Bookmark, Check, Clock, Radio, Database, TrendingUp, TrendingDown, Minus, PoundSterling, GraduationCap } from "lucide-react";
import { AreaReport } from "@/lib/types";
import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast";
import type { PlanId } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { getRAG } from "@/lib/rag";
import { ScoreRing, ScoreContextBar } from "@/components/report/score-display";
import { RadarChart } from "@/components/report/radar-chart";
import { SubScoreBar } from "@/components/report/sub-score-bar";
import { SectionCard } from "@/components/report/section-card";

/* ── Main Report View ── */
export function ReportView({ report, plan = "free", reportId }: { report: AreaReport; plan?: PlanId; reportId?: string }) {
  const { color: scoreColor, glow: scoreGlow } = getRAG(report.areaiq_score);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const reportUrl = reportId ? `https://www.onegoodarea.com/report/${reportId}` : "";
  const shareText = `${report.area} scored ${report.areaiq_score}/100 for ${report.intent} on OneGoodArea`;

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
      logger.error("[OneGoodArea] PDF export failed:", err);
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
                  OneGoodArea Score
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

      {/* ── Schools Panel (when Ofsted data available) ── */}
      {report.schools_data && report.schools_data.schools.length > 0 && (
        <div
          className="border mb-6 animate-fade-in-up"
          style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", animationDelay: "275ms" }}
        >
          <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <GraduationCap size={12} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Nearby Schools
              </span>
            </div>
            <span className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              {report.schools_data.inspectorate} &middot; {report.schools_data.schools.length} rated schools within 1.5km
            </span>
          </div>

          {/* Rating breakdown bar */}
          {(() => {
            const bd = report.schools_data.rating_breakdown;
            const total = report.schools_data.schools.length;
            const outstanding = bd["Outstanding"] || 0;
            const good = bd["Good"] || 0;
            const ri = bd["Requires Improvement"] || 0;
            const inadequate = bd["Inadequate"] || 0;

            return (
              <div className="px-5 pt-4 pb-2">
                <div className="text-[9px] font-mono uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Rating Distribution
                </div>
                <div className="h-2.5 w-full flex overflow-hidden" style={{ background: "var(--border)" }}>
                  {outstanding > 0 && (
                    <div style={{ width: `${(outstanding / total) * 100}%`, background: "var(--neon-green)" }} />
                  )}
                  {good > 0 && (
                    <div style={{ width: `${(good / total) * 100}%`, background: "var(--accent)" }} />
                  )}
                  {ri > 0 && (
                    <div style={{ width: `${(ri / total) * 100}%`, background: "var(--neon-amber)" }} />
                  )}
                  {inadequate > 0 && (
                    <div style={{ width: `${(inadequate / total) * 100}%`, background: "var(--neon-red)" }} />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {outstanding > 0 && (
                    <span className="text-[9px] font-mono flex items-center gap-1">
                      <span className="w-2 h-2 inline-block" style={{ background: "var(--neon-green)" }} />
                      <span style={{ color: "var(--neon-green)" }}>{outstanding} Outstanding</span>
                    </span>
                  )}
                  {good > 0 && (
                    <span className="text-[9px] font-mono flex items-center gap-1">
                      <span className="w-2 h-2 inline-block" style={{ background: "var(--accent)" }} />
                      <span style={{ color: "var(--accent)" }}>{good} Good</span>
                    </span>
                  )}
                  {ri > 0 && (
                    <span className="text-[9px] font-mono flex items-center gap-1">
                      <span className="w-2 h-2 inline-block" style={{ background: "var(--neon-amber)" }} />
                      <span style={{ color: "var(--neon-amber)" }}>{ri} Requires Improvement</span>
                    </span>
                  )}
                  {inadequate > 0 && (
                    <span className="text-[9px] font-mono flex items-center gap-1">
                      <span className="w-2 h-2 inline-block" style={{ background: "var(--neon-red)" }} />
                      <span style={{ color: "var(--neon-red)" }}>{inadequate} Inadequate</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* School list */}
          <div className="px-5 pb-4">
            <div className="border" style={{ borderColor: "var(--border)" }}>
              {report.schools_data.schools.map((school, i) => {
                const ratingColor =
                  school.rating === "Outstanding" ? "var(--neon-green)" :
                  school.rating === "Good" ? "var(--accent)" :
                  school.rating === "Requires Improvement" ? "var(--neon-amber)" :
                  school.rating === "Inadequate" ? "var(--neon-red)" :
                  "var(--text-tertiary)";
                const ratingBg =
                  school.rating === "Outstanding" ? "var(--neon-green-dim)" :
                  school.rating === "Good" ? "var(--accent-dim)" :
                  school.rating === "Requires Improvement" ? "var(--neon-amber-dim)" :
                  school.rating === "Inadequate" ? "var(--neon-red-dim)" :
                  "var(--bg-active)";

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{
                      background: "var(--bg)",
                      borderBottom: i < report.schools_data!.schools.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono truncate" style={{ color: "var(--text-primary)" }}>
                        {school.name}
                      </div>
                      <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {school.phase} &middot; {school.distance_km}km
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-mono px-2 py-0.5 shrink-0 ml-3"
                      style={{ color: ratingColor, background: ratingBg }}
                    >
                      {school.rating}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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
