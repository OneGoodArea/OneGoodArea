"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Styles } from "../../_shared/styles";
import { AppShell, AppCard, appRag, GhostCta } from "../../_shared/app-shell";
import type { AreaReport } from "@/lib/types";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /report/[id]
   Focused read-only v2 display: score ring, dimensions, summary,
   sections, recommendations, data sources. Advanced features
   (PDF export, share, watchlist toggle) are Batch 5 follow-up.
   ═══════════════════════════════════════════════════════════════ */

type Props = {
  id: string;
  report: AreaReport;
  score: number;
  createdAt: string;
};

export default function ReportViewClient({ id, report, score, createdAt }: Props) {
  const rag = appRag(score);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  function flash(kind: "ok" | "err", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <>
      <Styles />
      <AppShell
        title={report.area}
        subtitle={`${report.intent} · generated ${formatDate(createdAt)}`}
        actions={
          <ReportActions id={id} report={report} score={score} onToast={flash} />
        }
      >
        <div style={{ padding: "28px 40px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
          {toast && <Toast kind={toast.kind} msg={toast.msg} />}
          <HeroBlock report={report} score={score} rag={rag} />
          <Dimensions subScores={report.sub_scores} />
          <SummaryBlock summary={report.summary} />
          {report.property_data && <PropertyBlock data={report.property_data} />}
          {report.schools_data && report.schools_data.schools.length > 0 && <SchoolsBlock data={report.schools_data} />}
          <SectionsBlock sections={report.sections} />
          <RecommendationsBlock recs={report.recommendations} />
          <MetaBlock report={report} id={id} />
        </div>
      </AppShell>
    </>
  );
}

/* ─────── Action bar: share · PDF · watchlist ─────── */

function ReportActions({ id, report, score, onToast }: {
  id: string; report: AreaReport; score: number;
  onToast: (kind: "ok" | "err", msg: string) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/report/${id}`
    : `https://www.area-iq.co.uk/report/${id}`;
  const shareText = `${report.area} scored ${score}/100 for ${report.intent} on OneGoodArea`;

  function copyLink() {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(shareUrl);
    onToast("ok", "Link copied");
    setShareOpen(false);
  }

  function openSocial(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
    setShareOpen(false);
  }

  async function exportPDF() {
    if (exporting) return;
    setExporting(true);
    try {
      const { exportReportPDF } = await import("@/lib/pdf-export");
      exportReportPDF(report);
      onToast("ok", "PDF downloaded");
    } catch {
      onToast("err", "PDF export failed");
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
        body: JSON.stringify({ postcode: report.area, label: "", intent: report.intent }),
      });
      if (res.ok) { setSaved(true); onToast("ok", "Saved to watchlist"); }
      else if (res.status === 409) { setSaved(true); onToast("ok", "Already in watchlist"); }
      else { onToast("err", "Could not save"); }
    } catch {
      onToast("err", "Network error");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", position: "relative" }}>
      <ActionBtn
        onClick={saveToWatchlist}
        disabled={saving || saved}
        tone={saved ? "active" : "ghost"}
      >
        <BookmarkIcon filled={saved} />
        {saved ? "Saved" : saving ? "Saving…" : "Save area"}
      </ActionBtn>

      <ActionBtn onClick={exportPDF} disabled={exporting} tone="ghost">
        <DownloadIcon />
        {exporting ? "Preparing…" : "PDF"}
      </ActionBtn>

      <div style={{ position: "relative" }}>
        <ActionBtn onClick={() => setShareOpen(!shareOpen)} tone="ghost">
          <ShareIcon />
          Share
        </ActionBtn>
        {shareOpen && (
          <ShareMenu
            shareUrl={shareUrl} shareText={shareText}
            onCopy={copyLink} onSocial={openSocial}
            onClose={() => setShareOpen(false)}
          />
        )}
      </div>

      <GhostCta href="/design-v2/dashboard">← Reports</GhostCta>
    </div>
  );
}

function ActionBtn({ children, onClick, disabled, tone }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; tone: "ghost" | "active";
}) {
  const isActive = tone === "active";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.14em", textTransform: "uppercase",
        color: isActive ? "var(--signal-ink)" : "var(--ink)",
        background: isActive ? "var(--signal)" : "var(--bg)",
        padding: "10px 16px", borderRadius: 999,
        border: `1px solid ${isActive ? "var(--ink-deep)" : "var(--border)"}`,
        display: "inline-flex", alignItems: "center", gap: 7,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "border-color 140ms ease, background 140ms ease",
      }}
      onMouseEnter={(e) => {
        if (disabled || isActive) return;
        e.currentTarget.style.borderColor = "var(--ink)";
        e.currentTarget.style.background = "var(--bg-off)";
      }}
      onMouseLeave={(e) => {
        if (disabled || isActive) return;
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg)";
      }}
    >
      {children}
    </button>
  );
}

function ShareMenu({ shareUrl, shareText, onCopy, onSocial, onClose }: {
  shareUrl: string; shareText: string;
  onCopy: () => void; onSocial: (url: string) => void; onClose: () => void;
}) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const xUrl  = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 30,
        }}
      />
      <div style={{
        position: "absolute", top: "calc(100% + 6px)", right: 0,
        zIndex: 31, minWidth: 220,
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        boxShadow: "0 16px 36px -10px rgba(6,42,30,0.18)",
        overflow: "hidden",
      }}>
        <ShareItem label="WhatsApp"    onClick={() => onSocial(waUrl)} />
        <ShareItem label="LinkedIn"    onClick={() => onSocial(liUrl)} />
        <ShareItem label="X (Twitter)" onClick={() => onSocial(xUrl)} />
        <div style={{ borderTop: "1px solid var(--border-dim)" }} />
        <ShareItem label="Copy link" onClick={onCopy} primary />
      </div>
    </>
  );
}

function ShareItem({ label, onClick, primary }: {
  label: string; onClick: () => void; primary?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", textAlign: "left",
        padding: "11px 16px",
        fontFamily: primary ? "var(--mono)" : "var(--sans)",
        fontSize: primary ? 10.5 : 13.5,
        letterSpacing: primary ? "0.18em" : "-0.003em",
        textTransform: primary ? "uppercase" : "none",
        color: primary ? "var(--ink-deep)" : "var(--ink-deep)",
        background: hover ? "var(--signal-dim)" : "transparent",
        border: "none", cursor: "pointer",
        fontWeight: primary ? 600 : 500,
        transition: "background 140ms ease",
      }}
    >
      {label}
    </button>
  );
}

function Toast({ kind, msg }: { kind: "ok" | "err"; msg: string }) {
  const fg = kind === "ok" ? "var(--ink-deep)" : "#A01B00";
  const bg = kind === "ok" ? "var(--signal-dim)" : "rgba(239,68,68,0.08)";
  const border = kind === "ok" ? "var(--ink-deep)" : "rgba(239,68,68,0.3)";
  return (
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 60,
      padding: "10px 14px",
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 4,
      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.12em", textTransform: "uppercase",
      color: fg,
      display: "inline-flex", alignItems: "center", gap: 9,
      boxShadow: "0 12px 28px -10px rgba(6,42,30,0.22)",
      animation: "aiq-fade-up 220ms ease",
    }}>
      <span aria-hidden style={{
        width: 6, height: 6, borderRadius: 6,
        background: kind === "ok" ? "var(--signal)" : "#D13A1E",
      }} />
      {msg}
    </div>
  );
}

/* ─────── Icons ─────── */

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path d="M6 4 H18 V22 L12 17 L6 22 Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4 V15 M6 11 L12 17 L18 11 M4 21 H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 11 L15.8 6.5 M8.2 13 L15.8 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─────── Hero: score ring + summary ─────── */

function HeroBlock({ report, score, rag }: {
  report: AreaReport; score: number;
  rag: ReturnType<typeof appRag>;
}) {
  return (
    <AppCard noPad>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 220px",
        gap: 0,
        background: "var(--ink-deep)",
        color: "#FFFFFF",
        position: "relative", overflow: "hidden",
      }} className="aiq-report-hero">
        <div aria-hidden style={{
          position: "absolute", top: -140, right: -100,
          width: 480, height: 480,
          background: "radial-gradient(circle, rgba(212,243,58,0.18) 0%, rgba(212,243,58,0) 60%)",
          pointerEvents: "none",
        }} />

        <div style={{
          padding: "28px 32px",
          position: "relative", zIndex: 1,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--signal)", marginBottom: 14,
          }}>
            <span aria-hidden style={{
              width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
              boxShadow: "0 0 10px rgba(212,243,58,0.5)",
            }} />
            Intent · {report.intent}
            {report.area_type && (
              <>
                <span aria-hidden style={{ width: 1, height: 10, background: "rgba(255,255,255,0.24)", margin: "0 4px" }} />
                <span>{report.area_type}</span>
              </>
            )}
          </div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.06,
            letterSpacing: "-0.018em", color: "#FFFFFF",
            margin: "0 0 14px", maxWidth: "18ch",
          }}>{report.area}</h2>
          <p style={{
            fontFamily: "var(--display)", fontSize: 17, fontWeight: 400,
            fontStyle: "italic", lineHeight: 1.45,
            color: "rgba(255,255,255,0.88)",
            margin: 0, maxWidth: "48ch",
          }}>
            {trimSummary(report.summary)}
          </p>
        </div>

        <ScoreRing score={score} />
      </div>
    </AppCard>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 220;
  const r = size / 2 - 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const ringColor = score >= 70 ? "var(--signal)" : score >= 45 ? "#FFE07A" : "#FFB8A8";
  return (
    <div style={{
      background: "rgba(0,0,0,0.15)",
      borderLeft: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
      position: "relative", zIndex: 1,
    }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r}
            stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" />
          <circle cx={size/2} cy={size/2} r={r}
            stroke={ringColor} strokeWidth="6" fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ filter: `drop-shadow(0 0 8px ${ringColor}66)` }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 72, fontWeight: 500,
            letterSpacing: "-0.03em", color: "#FFFFFF", lineHeight: 1,
          }}>{score}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)",
            marginTop: 6,
          }}>/ 100</span>
        </div>
      </div>
      <div style={{
        marginTop: 12,
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: ringColor,
      }}>Overall score</div>
    </div>
  );
}

function trimSummary(s: string, max = 300): string {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/[.,;:\s]*$/, "") + "…";
}

/* ─────── Dimensions ─────── */

function Dimensions({ subScores }: { subScores: AreaReport["sub_scores"] }) {
  return (
    <AppCard title="Dimensions" note={`${subScores.length} weighted scores`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {subScores.map((sub) => <DimensionRow key={sub.label} sub={sub} />)}
      </div>
    </AppCard>
  );
}

function DimensionRow({ sub }: { sub: AreaReport["sub_scores"][number] }) {
  const rag = appRag(sub.score);
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 12, marginBottom: 8, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
            letterSpacing: "-0.01em", color: "var(--ink-deep)",
          }}>{sub.label}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
            letterSpacing: "0.14em",
            color: "var(--text-3)",
            border: "1px solid var(--border)",
            padding: "2px 7px", borderRadius: 2,
          }}>Weight {sub.weight}</span>
        </div>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 16, fontWeight: 600,
          color: rag.dot,
          display: "inline-flex", alignItems: "center", gap: 7,
        }}>
          <span aria-hidden style={{
            width: 7, height: 7, borderRadius: 7, background: rag.dot,
          }} />
          {sub.score}
        </span>
      </div>
      <div style={{
        height: 6, width: "100%",
        background: rag.bg,
        borderRadius: 2, overflow: "hidden",
        marginBottom: 10,
      }}>
        <div style={{
          height: "100%", width: `${sub.score}%`, background: rag.dot,
          transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
        lineHeight: 1.55, color: "var(--text-2)",
        letterSpacing: "-0.003em",
        margin: 0, maxWidth: "72ch",
      }}>{sub.summary}</p>
    </div>
  );
}

/* ─────── Summary + sections ─────── */

function SummaryBlock({ summary }: { summary: string }) {
  return (
    <AppCard title="Executive summary">
      <p style={{
        fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
        lineHeight: 1.66, color: "var(--text)",
        letterSpacing: "-0.003em",
        margin: 0, maxWidth: "72ch",
      }}>{summary}</p>
    </AppCard>
  );
}

function SectionsBlock({ sections }: { sections: AreaReport["sections"] }) {
  if (!sections || sections.length === 0) return null;
  return (
    <AppCard title={`Detailed analysis · ${sections.length} section${sections.length !== 1 ? "s" : ""}`} noPad>
      <div>
        {sections.map((section, i) => (
          <div key={section.title} style={{
            padding: "22px 24px",
            borderBottom: i < sections.length - 1 ? "1px solid var(--border-dim)" : "none",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 8,
            }}>§ {String(i + 1).padStart(2, "0")}</div>
            <h3 style={{
              fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
              letterSpacing: "-0.014em", color: "var(--ink-deep)",
              margin: "0 0 12px", lineHeight: 1.2,
            }}>{section.title}</h3>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
              lineHeight: 1.65, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: 0, maxWidth: "68ch",
              whiteSpace: "pre-wrap",
            }}>{section.content}</p>
            {section.data_points && section.data_points.length > 0 && (
              <div style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}>
                {section.data_points.map((dp) => (
                  <div key={dp.label} style={{
                    padding: "10px 14px",
                    background: "var(--bg-off)",
                    border: "1px solid var(--border)",
                    borderRadius: 3,
                  }}>
                    <div style={{
                      fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                      letterSpacing: "0.2em", textTransform: "uppercase",
                      color: "var(--text-3)", marginBottom: 3,
                    }}>{dp.label}</div>
                    <div style={{
                      fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
                      letterSpacing: "-0.01em", color: "var(--ink-deep)",
                    }}>{dp.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppCard>
  );
}

/* ─────── Property market block ─────── */

function PropertyBlock({ data }: { data: NonNullable<AreaReport["property_data"]> }) {
  const yoy = data.price_change_pct;
  const yoyTone = yoy === null ? "var(--text-3)" : yoy > 0 ? "var(--ink)" : yoy < 0 ? "#A01B00" : "var(--text-3)";
  return (
    <AppCard title={`Property market · ${data.postcode_area}`} note={data.period}>
      <div className="aiq-property-stats" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0,
        border: "1px solid var(--border)",
        borderRadius: 3, overflow: "hidden",
      }}>
        <PropStat label="Median price" value={formatMoney(data.median_price)} />
        <PropStat
          label="YoY"
          value={yoy === null ? "—" : `${yoy > 0 ? "+" : ""}${yoy.toFixed(1)}%`}
          tone={yoyTone}
        />
        <PropStat label="Transactions" value={data.transaction_count.toLocaleString()} />
        <PropStat label="Tenure" value={`${Math.round(data.tenure_split.freehold)}% freehold`} />
      </div>
      {data.by_property_type.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 10,
          }}>By property type</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {data.by_property_type.map((t) => (
              <li key={t.type} style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 14, alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px dashed var(--border-dim)",
              }}>
                <span style={{
                  fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 500,
                  color: "var(--ink-deep)", letterSpacing: "-0.005em",
                }}>{t.type}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11,
                  color: "var(--text-3)",
                }}>{t.count} sales</span>
                <span style={{
                  fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
                  letterSpacing: "-0.01em", color: "var(--ink-deep)",
                }}>{formatMoney(t.median)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppCard>
  );
}

function PropStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{
      padding: "14px 18px",
      borderRight: "1px solid var(--border)",
      background: "var(--bg-off)",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
        letterSpacing: "-0.014em",
        color: tone || "var(--ink-deep)",
      }}>{value}</div>
    </div>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

/* ─────── Schools block ─────── */

function SchoolsBlock({ data }: { data: NonNullable<AreaReport["schools_data"]> }) {
  return (
    <AppCard title={`Nearby schools · ${data.schools.length}`} note={data.inspectorate}>
      <div className="aiq-schools-breakdown" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10, marginBottom: 18,
      }}>
        {Object.entries(data.rating_breakdown).map(([rating, count]) => {
          const ragStyle = ratingRag(rating);
          return (
            <div key={rating} style={{
              padding: "12px 14px",
              border: "1px solid var(--border)",
              background: "var(--bg-off)",
              borderRadius: 3,
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: ragStyle.fg, background: ragStyle.bg,
                padding: "2px 7px", borderRadius: 2,
                display: "inline-flex", alignItems: "center", gap: 6,
                marginBottom: 8,
              }}>
                <span aria-hidden style={{ width: 4, height: 4, borderRadius: 4, background: ragStyle.dot }} />
                {rating}
              </div>
              <div style={{
                fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
                letterSpacing: "-0.014em", color: "var(--ink-deep)",
              }}>{count}</div>
            </div>
          );
        })}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        {data.schools.slice(0, 6).map((s, i) => {
          const ragStyle = ratingRag(s.rating);
          return (
            <li key={s.name + i} style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: 14, alignItems: "center",
              padding: "10px 0",
              borderBottom: i < Math.min(data.schools.length, 6) - 1 ? "1px dashed var(--border-dim)" : "none",
            }}>
              <span>
                <span style={{
                  fontFamily: "var(--display)", fontSize: 14.5, fontWeight: 500,
                  color: "var(--ink-deep)", letterSpacing: "-0.005em",
                  display: "block", lineHeight: 1.3,
                }}>{s.name}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.14em", color: "var(--text-3)",
                }}>{s.phase}</span>
              </span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: ragStyle.fg, background: ragStyle.bg,
                padding: "2px 7px", borderRadius: 2,
              }}>{s.rating}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                color: "var(--text-3)",
              }}>{s.distance_km.toFixed(1)}km</span>
            </li>
          );
        })}
      </ul>
    </AppCard>
  );
}

function ratingRag(rating: string): { fg: string; bg: string; dot: string } {
  const r = rating.toLowerCase();
  if (r.includes("outstanding")) return { fg: "var(--ink-deep)", bg: "var(--signal-dim)", dot: "var(--ink)" };
  if (r.includes("good"))         return { fg: "#225F14",         bg: "#E2F2D7",          dot: "#4A8F2B" };
  if (r.includes("requires"))     return { fg: "#6E5300",         bg: "#FFF4D1",          dot: "#D49900" };
  if (r.includes("inadequate"))   return { fg: "#A01B00",         bg: "#FFE8E2",          dot: "#D13A1E" };
  return { fg: "var(--text-2)", bg: "var(--bg-off)", dot: "var(--border)" };
}

/* ─────── Recommendations ─────── */

function RecommendationsBlock({ recs }: { recs: string[] }) {
  if (!recs || recs.length === 0) return null;
  return (
    <AppCard title={`Recommendations · ${recs.length}`} noPad>
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {recs.map((rec, i) => (
          <li key={i} style={{
            display: "grid",
            gridTemplateColumns: "44px 1fr",
            gap: 16, alignItems: "flex-start",
            padding: "16px 22px",
            borderBottom: i < recs.length - 1 ? "1px solid var(--border-dim)" : "none",
          }}>
            <span aria-hidden style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--signal)", color: "var(--signal-ink)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 600,
              border: "1px solid var(--ink-deep)",
              flexShrink: 0,
            }}>{i + 1}</span>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
              lineHeight: 1.6, color: "var(--text)",
              letterSpacing: "-0.003em",
              margin: 0, maxWidth: "72ch",
            }}>{rec}</p>
          </li>
        ))}
      </ol>
    </AppCard>
  );
}

/* ─────── Metadata footer ─────── */

function MetaBlock({ report, id }: { report: AreaReport; id: string }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
      letterSpacing: "0.14em",
      color: "var(--text-3)",
      padding: "16px 20px",
      border: "1px dashed var(--border)",
      borderRadius: 4,
      display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    }}>
      <span>Report · {id}</span>
      {report.data_sources && report.data_sources.length > 0 && (
        <>
          <span aria-hidden style={{ width: 1, height: 10, background: "var(--border)" }} />
          <span>Sources · {report.data_sources.join(" · ")}</span>
        </>
      )}
      <span aria-hidden style={{ width: 1, height: 10, background: "var(--border)" }} />
      <span>Generated · {formatDate(report.generated_at)}</span>
    </div>
  );
}

function formatDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ts; }
}
