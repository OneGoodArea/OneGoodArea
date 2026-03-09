"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@/components/user-button";
import { ArrowRight, Plus, X } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AreaReport } from "@/lib/types";

function getRAG(score: number) {
  if (score >= 70) return { color: "var(--neon-green)", dim: "var(--neon-green-dim)", glow: "neon-green-glow", label: "Strong" };
  if (score >= 45) return { color: "var(--neon-amber)", dim: "var(--neon-amber-dim)", glow: "neon-amber-glow", label: "Moderate" };
  return { color: "var(--neon-red)", dim: "var(--neon-red-dim)", glow: "neon-red-glow", label: "Weak" };
}

interface ReportData {
  id: string;
  area: string;
  intent: string;
  report: AreaReport;
  score: number;
  created_at: string;
}

interface ReportSummary {
  id: string;
  area: string;
  intent: string;
  score: number;
  created_at: string;
}

/* ── Mini Score Ring ── */
function MiniScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const { color } = getRAG(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={3}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[20px] font-mono font-bold ${getRAG(score).glow}`} style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

/* ── Comparison Bar ── */
function ComparisonBar({
  label,
  scoreA,
  scoreB,
  areaA,
  areaB,
  weight,
}: {
  label: string;
  scoreA: number;
  scoreB: number;
  areaA: string;
  areaB: string;
  weight?: number;
}) {
  const ragA = getRAG(scoreA);
  const ragB = getRAG(scoreB);
  const winner = scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie";
  const diff = Math.abs(scoreA - scoreB);

  return (
    <div className="py-3 px-4 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{label}</span>
          {weight && (
            <span className="text-[9px] font-mono px-1 py-px" style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}>
              {weight}%
            </span>
          )}
        </div>
        {diff > 0 && (
          <span className="text-[9px] font-mono" style={{ color: winner === "A" ? ragA.color : ragB.color }}>
            {winner === "A" ? areaA : areaB} +{diff}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Area A */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-tertiary)" }}>{areaA}</span>
            <span className={`text-[12px] font-mono font-semibold ${ragA.glow}`} style={{ color: ragA.color }}>{scoreA}</span>
          </div>
          <div className="h-1.5 w-full" style={{ background: ragA.dim }}>
            <div className="h-full transition-all duration-700" style={{ width: `${scoreA}%`, background: ragA.color }} />
          </div>
        </div>

        {/* Area B */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-tertiary)" }}>{areaB}</span>
            <span className={`text-[12px] font-mono font-semibold ${ragB.glow}`} style={{ color: ragB.color }}>{scoreB}</span>
          </div>
          <div className="h-1.5 w-full" style={{ background: ragB.dim }}>
            <div className="h-full transition-all duration-700" style={{ width: `${scoreB}%`, background: ragB.color }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Report Picker ── */
function ReportPicker({
  allReports,
  selectedIds,
  onSelect,
  slot,
}: {
  allReports: ReportSummary[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  slot: "A" | "B";
}) {
  const available = allReports.filter((r) => !selectedIds.includes(r.id));

  return (
    <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
      <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Select Area {slot}
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {available.length === 0 ? (
          <div className="p-4 text-center">
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>No reports available</span>
          </div>
        ) : (
          available.map((r) => {
            const rag = getRAG(r.score);
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className="w-full px-4 py-3 border-b flex items-center justify-between transition-colors hover:brightness-110"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              >
                <div className="text-left">
                  <div className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{r.area}</div>
                  <div className="text-[10px] font-mono uppercase" style={{ color: "var(--text-tertiary)" }}>{r.intent}</div>
                </div>
                <span className={`text-[14px] font-mono font-bold ${rag.glow}`} style={{ color: rag.color }}>{r.score}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Main Compare View ── */
export function CompareClient({
  selectedReports,
  allReports,
}: {
  selectedReports: ReportData[];
  allReports: ReportSummary[];
}) {
  const router = useRouter();
  const [reportA] = useState<ReportData | null>(selectedReports[0] || null);
  const [reportB] = useState<ReportData | null>(selectedReports[1] || null);

  const needsSelection = !reportA || !reportB;
  const selectedIds = [reportA?.id, reportB?.id].filter(Boolean) as string[];

  function selectReport(id: string, slot: "A" | "B") {
    if (slot === "A") {
      router.push(`/compare?reports=${id}${reportB ? `,${reportB.id}` : ""}`);
    } else {
      router.push(`/compare?reports=${reportA ? `${reportA.id},` : ""}${id}`);
    }
  }

  function removeReport(slot: "A" | "B") {
    if (slot === "A") {
      router.push(reportB ? `/compare?reports=${reportB.id}` : "/compare");
    } else {
      router.push(reportA ? `/compare?reports=${reportA.id}` : "/compare");
    }
  }

  // Match sub-scores by label for comparison
  const subScorePairs: { label: string; scoreA: number; scoreB: number; weightA?: number; weightB?: number }[] = [];
  if (reportA && reportB) {
    const allLabels = new Set([
      ...reportA.report.sub_scores.map((s) => s.label),
      ...reportB.report.sub_scores.map((s) => s.label),
    ]);

    for (const label of allLabels) {
      const a = reportA.report.sub_scores.find((s) => s.label === label);
      const b = reportB.report.sub_scores.find((s) => s.label === label);
      if (a || b) {
        subScorePairs.push({
          label,
          scoreA: a?.score ?? 0,
          scoreB: b?.score ?? 0,
          weightA: a?.weight,
          weightB: b?.weight,
        });
      }
    }
  }

  const winsA = subScorePairs.filter((p) => p.scoreA > p.scoreB).length;
  const winsB = subScorePairs.filter((p) => p.scoreB > p.scoreA).length;

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Compare" }]}>
        <Link
          href="/report"
          className="h-7 px-3 flex items-center gap-1.5 text-[10px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          <Plus size={11} />
          New Report
        </Link>
        <UserButton />
      </Navbar>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
            Area Comparison
          </h1>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Compare two areas side by side to make better decisions.
          </p>
        </div>

        {/* Selection / Picker */}
        {needsSelection && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Slot A */}
            <div>
              {reportA ? (
                <SelectedCard report={reportA} onRemove={() => removeReport("A")} />
              ) : (
                <ReportPicker
                  allReports={allReports}
                  selectedIds={selectedIds}
                  onSelect={(id) => selectReport(id, "A")}
                  slot="A"
                />
              )}
            </div>
            {/* Slot B */}
            <div>
              {reportB ? (
                <SelectedCard report={reportB} onRemove={() => removeReport("B")} />
              ) : (
                <ReportPicker
                  allReports={allReports}
                  selectedIds={selectedIds}
                  onSelect={(id) => selectReport(id, "B")}
                  slot="B"
                />
              )}
            </div>
          </div>
        )}

        {/* Comparison View */}
        {reportA && reportB && (
          <div className="space-y-4 animate-fade-in-up">
            {/* Score Overview */}
            <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
              <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Overall Scores
                </span>
                <button
                  onClick={() => router.push("/compare")}
                  className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 transition-colors"
                  style={{ color: "var(--text-tertiary)", background: "var(--bg-active)" }}
                >
                  Change
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                  {/* Area A */}
                  <div className="flex flex-col items-center text-center">
                    <MiniScoreRing score={reportA.report.areaiq_score} />
                    <h2 className="text-[15px] font-semibold mt-3" style={{ color: "var(--text-primary)" }}>
                      {reportA.report.area}
                    </h2>
                    <span className="text-[10px] font-mono uppercase mt-1" style={{ color: "var(--accent)" }}>
                      {reportA.report.intent}
                    </span>
                    <p className="text-[10px] mt-2 leading-snug max-w-[280px]" style={{ color: "var(--text-tertiary)" }}>
                      {reportA.report.summary.split(".")[0]}.
                    </p>
                  </div>

                  {/* Area B */}
                  <div className="flex flex-col items-center text-center">
                    <MiniScoreRing score={reportB.report.areaiq_score} />
                    <h2 className="text-[15px] font-semibold mt-3" style={{ color: "var(--text-primary)" }}>
                      {reportB.report.area}
                    </h2>
                    <span className="text-[10px] font-mono uppercase mt-1" style={{ color: "var(--accent)" }}>
                      {reportB.report.intent}
                    </span>
                    <p className="text-[10px] mt-2 leading-snug max-w-[280px]" style={{ color: "var(--text-tertiary)" }}>
                      {reportB.report.summary.split(".")[0]}.
                    </p>
                  </div>
                </div>

                {/* Verdict */}
                <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: "var(--border)" }}>
                  {reportA.report.areaiq_score === reportB.report.areaiq_score ? (
                    <span className="text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>
                      Both areas score equally at {reportA.report.areaiq_score}/100
                    </span>
                  ) : (
                    <span className="text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>
                      <span className={getRAG(Math.max(reportA.report.areaiq_score, reportB.report.areaiq_score)).glow}
                        style={{ color: getRAG(Math.max(reportA.report.areaiq_score, reportB.report.areaiq_score)).color }}>
                        {reportA.report.areaiq_score > reportB.report.areaiq_score ? reportA.report.area : reportB.report.area}
                      </span>
                      {" "}scores {Math.abs(reportA.report.areaiq_score - reportB.report.areaiq_score)} points higher overall
                      {" · "}wins {Math.max(winsA, winsB)}/{subScorePairs.length} dimensions
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-Score Comparison */}
            <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
              <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Dimension Breakdown
                </span>
              </div>

              {subScorePairs.map((pair) => (
                <ComparisonBar
                  key={pair.label}
                  label={pair.label}
                  scoreA={pair.scoreA}
                  scoreB={pair.scoreB}
                  areaA={reportA.report.area}
                  areaB={reportB.report.area}
                  weight={pair.weightA || pair.weightB}
                />
              ))}
            </div>

            {/* Recommendations Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RecommendationsCard area={reportA.report.area} recommendations={reportA.report.recommendations} />
              <RecommendationsCard area={reportB.report.area} recommendations={reportB.report.recommendations} />
            </div>

            {/* View Full Reports */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              <Link
                href={`/report/${reportA.id}`}
                className="border px-4 py-3 flex items-center justify-between transition-colors hover:brightness-110"
                style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
              >
                <div>
                  <div className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Full Report</div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{reportA.report.area}</div>
                </div>
                <ArrowRight size={14} style={{ color: "var(--text-tertiary)" }} />
              </Link>
              <Link
                href={`/report/${reportB.id}`}
                className="border px-4 py-3 flex items-center justify-between transition-colors hover:brightness-110"
                style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
              >
                <div>
                  <div className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>Full Report</div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{reportB.report.area}</div>
                </div>
                <ArrowRight size={14} style={{ color: "var(--text-tertiary)" }} />
              </Link>
            </div>
          </div>
        )}

        {/* Empty state — no reports at all */}
        {allReports.length < 2 && needsSelection && (
          <div
            className="border p-8 text-center mt-4"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
          >
            <div className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>
              You need at least 2 reports to compare
            </div>
            <div className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
              Generate reports for different areas, then come back to compare them side by side.
            </div>
            <Link
              href="/report"
              className="inline-flex h-9 px-5 items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide"
              style={{ background: "var(--text-primary)", color: "var(--bg)" }}
            >
              Generate Report
              <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* ── Selected Card (shown after picking a report) ── */
function SelectedCard({ report, onRemove }: { report: ReportData; onRemove: () => void }) {
  const rag = getRAG(report.score);
  return (
    <div className="border p-4 flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
      <div>
        <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{report.area}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono uppercase" style={{ color: "var(--text-tertiary)" }}>{report.intent}</span>
          <span className={`text-[12px] font-mono font-semibold ${rag.glow}`} style={{ color: rag.color }}>{report.score}</span>
        </div>
      </div>
      <button onClick={onRemove} className="p-1 transition-colors" style={{ color: "var(--text-tertiary)" }}>
        <X size={14} />
      </button>
    </div>
  );
}

/* ── Recommendations Card ── */
function RecommendationsCard({ area, recommendations }: { area: string; recommendations: string[] }) {
  return (
    <div className="border" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
      <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          {area} · Recommendations
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {recommendations.slice(0, 3).map((rec, i) => (
          <div key={i} className="px-4 py-2.5 flex gap-3" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-mono mt-0.5 shrink-0" style={{ color: "var(--accent)" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
