"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Styles } from "../_shared/styles";
import { AppShell, AppCard, GhostCta, appRag } from "../_shared/app-shell";
import type { AreaReport } from "@/lib/types";

type Report = { id: string; area: string; intent: string; report: AreaReport; score: number; created_at: string };
type Summary = { id: string; area: string; intent: string; score: number; created_at: string };

export default function CompareClient({ selected, all }: {
  selected: Report[]; all: Summary[];
}) {
  return (
    <>
      <Styles />
      <AppShell
        title="Compare areas"
        subtitle="Pick two reports to see the scores side by side."
        actions={<GhostCta href="/design-v2/dashboard">← Dashboard</GhostCta>}
      >
        <div style={{ padding: "28px 40px 64px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 1100 }}>
          <Picker selected={selected} all={all} />
          {selected.length === 2 && <SideBySide a={selected[0]} b={selected[1]} />}
          {selected.length === 1 && <OneSelected report={selected[0]} />}
          {selected.length === 0 && <EmptyCompare />}
        </div>
      </AppShell>
    </>
  );
}

function Picker({ selected, all }: { selected: Report[]; all: Summary[] }) {
  const router = useRouter();
  const selectedIds = new Set(selected.map((r) => r.id));

  function toggle(id: string) {
    const current = [...selectedIds];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : current.length >= 2
        ? [current[1], id]  // drop oldest, add new
        : [...current, id];
    const qs = next.length > 0 ? `?reports=${next.join(",")}` : "";
    router.push(`/design-v2/compare${qs}`);
  }

  return (
    <AppCard title={`Select two · ${selected.length}/2 picked`} noPad>
      <div style={{
        padding: "14px 22px",
        borderBottom: "1px solid var(--border)",
        display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.14em", color: "var(--text-2)",
        }}>
          Tap a report to add or remove.
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => router.push("/design-v2/compare")}
            style={{
              marginLeft: "auto",
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--text-2)", background: "transparent",
              border: "1px solid var(--border)",
              padding: "5px 10px", borderRadius: 2, cursor: "pointer",
            }}
          >Clear</button>
        )}
      </div>

      {all.length === 0 ? (
        <div style={{ padding: "32px 22px", textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
            color: "var(--ink-deep)", marginBottom: 6,
          }}>No reports to compare yet</div>
          <p style={{
            fontFamily: "var(--sans)", fontSize: 14,
            color: "var(--text-2)", margin: "0 auto 14px", maxWidth: "44ch",
          }}>Generate two reports, then come back here.</p>
          <GhostCta href="/design-v2/report">Generate a report</GhostCta>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {all.map((r, i) => {
            const isPicked = selectedIds.has(r.id);
            const rag = appRag(r.score);
            return (
              <li key={r.id} style={{
                borderBottom: i < all.length - 1 ? "1px solid var(--border-dim)" : "none",
              }}>
                <button
                  onClick={() => toggle(r.id)}
                  className="aiq-compare-picker-row"
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "13px 22px",
                    background: isPicked ? "var(--signal-dim)" : "transparent",
                    border: "none", cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "24px 1fr 120px 70px 100px",
                    gap: 14, alignItems: "center",
                    transition: "background 140ms ease",
                  }}
                  onMouseEnter={(e) => { if (!isPicked) e.currentTarget.style.background = "var(--bg-off)"; }}
                  onMouseLeave={(e) => { if (!isPicked) e.currentTarget.style.background = "transparent"; }}
                >
                  <span aria-hidden style={{
                    width: 18, height: 18, borderRadius: 3,
                    border: `1.5px solid ${isPicked ? "var(--ink-deep)" : "var(--border)"}`,
                    background: isPicked ? "var(--signal)" : "transparent",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    transition: "background 140ms ease, border-color 140ms ease",
                  }}>
                    {isPicked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12 L10 17 L19 8" stroke="var(--signal-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
                    letterSpacing: "-0.008em", color: "var(--ink-deep)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{r.area}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                    letterSpacing: "0.04em",
                    color: "var(--signal-ink)", background: "var(--signal)",
                    padding: "3px 8px", borderRadius: 2, justifySelf: "start",
                  }}>{r.intent}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 14, fontWeight: 600,
                    color: rag.dot,
                  }}>{r.score}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                    letterSpacing: "0.06em", color: "var(--text-3)",
                  }}>{formatDate(r.created_at)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppCard>
  );
}

function SideBySide({ a, b }: { a: Report; b: Report }) {
  const alignedDims = alignDimensions(a, b);
  const ragA = appRag(a.score);
  const ragB = appRag(b.score);
  return (
    <>
      <AppCard noPad>
        <div className="aiq-compare-heads" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
        }}>
          <CompareHead report={a} rag={ragA} />
          <CompareHead report={b} rag={ragB} border="left" />
        </div>
      </AppCard>

      <AppCard title="Dimension-by-dimension">
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {alignedDims.map((row, i) => <CompareDim key={i} row={row} />)}
        </div>
      </AppCard>

      <AppCard title="Summaries">
        <div className="aiq-compare-summaries" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}>
          <SummaryCol label={a.area} text={a.report.summary} />
          <SummaryCol label={b.area} text={b.report.summary} />
        </div>
      </AppCard>
    </>
  );
}

function CompareHead({ report, rag, border }: {
  report: Report;
  rag: ReturnType<typeof appRag>;
  border?: "left";
}) {
  return (
    <div style={{
      padding: "24px 26px",
      borderLeft: border === "left" ? "1px solid var(--border)" : "none",
      background: "var(--bg-ink)",
      color: "#FFFFFF",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: -90, right: -70,
        width: 260, height: 260,
        background: "radial-gradient(circle, rgba(212,243,58,0.18) 0%, rgba(212,243,58,0) 60%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--signal)", marginBottom: 8,
          }}>{report.intent}</div>
          <div style={{
            fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
            letterSpacing: "-0.014em", color: "#FFFFFF",
            lineHeight: 1.1,
            overflow: "hidden", textOverflow: "ellipsis",
          }}>{report.area}</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{
            fontFamily: "var(--display)", fontSize: 44, fontWeight: 500,
            letterSpacing: "-0.024em",
            color: "var(--signal)", lineHeight: 1,
          }}>{report.score}</div>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
            letterSpacing: "0.22em", color: "rgba(255,255,255,0.5)",
            marginTop: 4,
          }}>/ 100</div>
        </div>
      </div>
    </div>
  );
}

function alignDimensions(a: Report, b: Report) {
  const labelsA = a.report.sub_scores.map((s) => s.label);
  const labelsB = b.report.sub_scores.map((s) => s.label);
  const allLabels = Array.from(new Set([...labelsA, ...labelsB]));
  return allLabels.map((label) => ({
    label,
    a: a.report.sub_scores.find((s) => s.label === label) || null,
    b: b.report.sub_scores.find((s) => s.label === label) || null,
  }));
}

function CompareDim({ row }: {
  row: { label: string; a: AreaReport["sub_scores"][number] | null; b: AreaReport["sub_scores"][number] | null };
}) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
        letterSpacing: "-0.01em", color: "var(--ink-deep)",
        marginBottom: 10,
      }}>{row.label}</div>
      <div className="aiq-compare-bars" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20,
      }}>
        <DimBar sub={row.a} />
        <DimBar sub={row.b} />
      </div>
    </div>
  );
}

function DimBar({ sub }: { sub: AreaReport["sub_scores"][number] | null }) {
  if (!sub) {
    return (
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.14em", color: "var(--text-3)",
        padding: "12px 14px",
        border: "1px dashed var(--border)",
        borderRadius: 3,
      }}>Not in this intent</div>
    );
  }
  const rag = appRag(sub.score);
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 5,
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.16em",
          color: "var(--text-3)",
        }}>Weight {sub.weight}</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600,
          color: rag.dot,
        }}>{sub.score}</span>
      </div>
      <div style={{
        height: 6, width: "100%",
        background: rag.bg,
        borderRadius: 2, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${sub.score}%`, background: rag.dot,
          transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 400,
        lineHeight: 1.5, color: "var(--text-2)",
        margin: "8px 0 0",
      }}>{sub.summary}</p>
    </div>
  );
}

function SummaryCol({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--ink)", marginBottom: 10,
        display: "inline-flex", alignItems: "center", gap: 8,
      }}>
        <span aria-hidden style={{
          width: 5, height: 5, borderRadius: 5, background: "var(--signal)",
        }} />
        {label}
      </div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
        lineHeight: 1.65, color: "var(--text-2)",
        margin: 0, maxWidth: "48ch",
      }}>{text}</p>
    </div>
  );
}

function OneSelected({ report }: { report: Report }) {
  return (
    <AppCard>
      <div style={{
        fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
        letterSpacing: "-0.01em", color: "var(--ink-deep)",
        marginBottom: 6,
      }}>Pick one more report</div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 14,
        color: "var(--text-2)", margin: 0,
      }}>
        <strong style={{ color: "var(--ink-deep)" }}>{report.area}</strong> is waiting. Tap another report above to see the comparison.
      </p>
    </AppCard>
  );
}

function EmptyCompare() {
  return (
    <AppCard>
      <div style={{
        fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
        letterSpacing: "-0.01em", color: "var(--ink-deep)",
        marginBottom: 6,
      }}>Pick two reports</div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 14,
        color: "var(--text-2)", margin: 0, lineHeight: 1.5,
      }}>
        Tap any two reports in the list above. OneGoodArea will line them up score-by-score, dimension-by-dimension.
      </p>
    </AppCard>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
