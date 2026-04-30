"use client";

import React from "react";
import Link from "next/link";
import { Styles } from "../../_shared/styles";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import type { AreaData, AreaDimension } from "@/data/area-types";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /area/[slug]
   Programmatic SEO area page (32 UK cities share the template).
   Bespoke score ring + radar chart + dimension breakdown + intents +
   locked sections teaser + related areas, all in design-v2 language.
   ═══════════════════════════════════════════════════════════════ */

type Related = { slug: string; name: string; overallScore: number };

type RagTone = "strong" | "moderate" | "weak";
type RagStyle = { fg: string; bg: string; dot: string; label: string };

function rag(score: number): RagStyle {
  if (score >= 70) return { fg: "var(--ink-deep)", bg: "var(--signal-dim)", dot: "var(--ink)",  label: "Strong"   };
  if (score >= 45) return { fg: "#6E5300",         bg: "#FFF4D1",            dot: "#D49900",    label: "Moderate" };
  return              { fg: "#A01B00",             bg: "#FFE8E2",            dot: "#D13A1E",    label: "Weak"     };
}
function ragRing(score: number): string {
  if (score >= 70) return "var(--ink)";
  if (score >= 45) return "#D49900";
  return "#D13A1E";
}
function ragTone(score: number): RagTone {
  if (score >= 70) return "strong";
  if (score >= 45) return "moderate";
  return "weak";
}

export default function AreaClient({ slug, area, related }: {
  slug: string; area: AreaData; related: Related[];
}) {
  const r = rag(area.overallScore);
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero area={area} ragStyle={r} />
      <Body area={area} />
      <Related items={related} />
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: area.name,
            description: area.summary,
            address: {
              "@type": "PostalAddress",
              addressRegion: area.region,
              addressCountry: "GB",
              postalCode: area.postcode,
            },
            url: `https://www.onegoodarea.com/area/${slug}`,
            additionalProperty: [
              { "@type": "PropertyValue", name: "OneGoodArea Score", value: area.overallScore, maxValue: 100, unitText: "points" },
              ...area.dimensions.map((d) => ({
                "@type": "PropertyValue", name: `${d.label} Score`, value: d.score, maxValue: 100, unitText: "points",
              })),
            ],
          }),
        }}
      />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero({ area, ragStyle }: { area: AreaData; ragStyle: RagStyle }) {
  const ring = ragRing(area.overallScore);
  return (
    <section style={{
      position: "relative",
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", top: -240, left: "50%",
          transform: "translateX(-50%)",
          width: 960, height: 620,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.16) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>

      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "92px 40px 72px",
        position: "relative", zIndex: 1,
      }}>
        <div className="aiq-area-hero" style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 56, alignItems: "start",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-2)",
              display: "inline-flex", alignItems: "center", gap: 10,
              marginBottom: 18, flexWrap: "wrap",
            }}>
              <span aria-hidden style={{
                width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
                animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
              }} />
              {area.region}
              <span style={{
                padding: "3px 8px",
                border: "1px solid var(--border)", borderRadius: 2,
                background: "var(--bg-off)", color: "var(--ink)",
                fontSize: 10,
              }}>{area.areaType}</span>
              <span style={{
                padding: "3px 8px",
                background: ragStyle.bg, color: ragStyle.fg,
                borderRadius: 2, fontSize: 10,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: ragStyle.dot }} />
                {ragStyle.label}
              </span>
            </div>

            <h1 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(40px, 5.2vw, 58px)", lineHeight: 1.04,
              letterSpacing: "-0.02em", color: "var(--ink-deep)",
              margin: "0 0 20px",
            }}>
              {area.name}
            </h1>

            <p style={{
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
              lineHeight: 1.6, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: "0 0 24px", maxWidth: "62ch",
            }}>
              {area.summary}
            </p>

            <div style={{
              display: "flex", gap: 18, flexWrap: "wrap",
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 20,
            }}>
              <span>Postcode · {area.postcode}</span>
              <span>Population · {area.population}</span>
              <span>Avg. property · {area.avgPropertyPrice}</span>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {area.dataSources.map((src) => (
                <span key={src} style={{
                  fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "var(--ink)", background: "var(--signal-dim)",
                  padding: "3px 8px", borderRadius: 2,
                }}>{src}</span>
              ))}
            </div>
          </div>

          <ScoreRing score={area.overallScore} ring={ring} />
        </div>
      </div>
    </section>
  );
}

function ScoreRing({ score, ring }: { score: number; ring: string }) {
  const size = 180;
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="aiq-score-ring" style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <div style={{
        position: "relative", width: size, height: size,
        padding: 8,
      }}>
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="var(--border)" strokeWidth="2.5" fill="none"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={ring} strokeWidth="5" fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 0,
        }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 56, fontWeight: 500,
            letterSpacing: "-0.03em", color: "var(--ink-deep)",
            lineHeight: 1,
          }}>{score}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.18em", color: "var(--text-3)",
            marginTop: 4,
          }}>/ 100</span>
        </div>
      </div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)",
      }}>OneGoodArea score</div>
    </div>
  );
}

/* ─────── Body ─────── */

function Body({ area }: { area: AreaData }) {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "72px 0 100px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <DimensionRadar area={area} />
        <DimensionBreakdown area={area} />
        <ScoreByIntent area={area} />
        <LockedSections area={area} />
        <Cta area={area} />
      </div>
    </section>
  );
}

/* Radar chart · design-v2 colours */

function DimensionRadar({ area }: { area: AreaData }) {
  const size = 280;
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 40;
  const levels = [25, 50, 75, 100];
  const count = area.dimensions.length;

  function point(i: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }
  function polygon(value: number): string {
    return Array.from({ length: count }, (_, i) => point(i, value).join(",")).join(" ");
  }

  const avg = area.dimensions.reduce((s, d) => s + d.score, 0) / area.dimensions.length;
  const fill = ragRing(avg);
  const points = area.dimensions.map((d, i) => point(i, d.score));
  const dataPolygon = points.map((p) => p.join(",")).join(" ");

  return (
    <div style={{
      marginBottom: 28,
      border: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <SectionHead eyebrow="Dimension overview" note={`${area.areaType} benchmarks · ${count} dimensions`} />
      <div style={{
        padding: "28px 24px 36px",
        display: "flex", justifyContent: "center",
      }}>
        <svg width={size + 80} height={size + 40} style={{ overflow: "visible" }}>
          <g transform={`translate(40, 20)`}>
            {levels.map((level) => (
              <polygon key={level} points={polygon(level)} fill="none"
                stroke="var(--border)" strokeWidth={level === 100 ? 1 : 0.5}
                opacity={level === 100 ? 0.9 : 0.5} />
            ))}
            {area.dimensions.map((_, i) => {
              const [x, y] = point(i, 100);
              return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
                stroke="var(--border)" strokeWidth={0.5} opacity={0.5} />;
            })}
            <polygon points={dataPolygon}
              fill={fill} fillOpacity={0.14}
              stroke={fill} strokeWidth={1.75} />
            {points.map((p, i) => {
              const c = ragRing(area.dimensions[i].score);
              return <circle key={i} cx={p[0]} cy={p[1]} r={4}
                fill={c} stroke="var(--bg)" strokeWidth={1.5} />;
            })}
            {area.dimensions.map((d, i) => {
              const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
              const lx = cx + (maxR + 26) * Math.cos(angle);
              const ly = cy + (maxR + 26) * Math.sin(angle);
              const dimRag = rag(d.score);
              let anchor: "start" | "middle" | "end" = "middle";
              if (Math.cos(angle) > 0.3) anchor = "start";
              else if (Math.cos(angle) < -0.3) anchor = "end";
              return (
                <g key={i}>
                  <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle"
                    fill="var(--text-3)" fontSize="10.5"
                    fontFamily="var(--mono)" letterSpacing="0.06em">
                    {d.label}
                  </text>
                  <text x={lx} y={ly + 14} textAnchor={anchor} dominantBaseline="middle"
                    fill={dimRag.dot} fontSize="13"
                    fontFamily="var(--display)" fontWeight="500">
                    {d.score}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

function SectionHead({ eyebrow, note }: { eyebrow: string; note?: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, flexWrap: "wrap",
      padding: "14px 24px",
      borderBottom: "1px solid var(--border)",
      background: "var(--bg-off)",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--ink)",
        display: "inline-flex", alignItems: "center", gap: 9,
      }}>
        <span aria-hidden style={{
          width: 5, height: 5, borderRadius: 5, background: "var(--signal)",
        }} />
        {eyebrow}
      </div>
      {note && (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em",
          color: "var(--text-3)",
        }}>{note}</div>
      )}
    </div>
  );
}

function DimensionBreakdown({ area }: { area: AreaData }) {
  return (
    <div style={{
      marginBottom: 28,
      border: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <SectionHead eyebrow="Dimension breakdown" />
      <div className="aiq-dim-grid" style={{
        padding: "24px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "22px 32px",
      }}>
        {area.dimensions.map((d) => <DimensionRow key={d.label} dim={d} />)}
      </div>
    </div>
  );
}

function DimensionRow({ dim }: { dim: AreaDimension }) {
  const r = rag(dim.score);
  const ring = ragRing(dim.score);
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 15, fontWeight: 500,
            letterSpacing: "-0.01em", color: "var(--ink-deep)",
          }}>{dim.label}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
            letterSpacing: "0.14em",
            color: "var(--text-3)",
            border: "1px solid var(--border)",
            padding: "2px 6px", borderRadius: 2,
          }}>{dim.weight}%</span>
        </div>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 15, fontWeight: 600,
          color: r.dot, letterSpacing: "0.02em",
        }}>{dim.score}</span>
      </div>
      <div style={{
        height: 4, width: "100%",
        background: r.bg,
        overflow: "hidden", borderRadius: 2,
        marginBottom: 8,
      }}>
        <div style={{
          height: "100%",
          width: `${dim.score}%`,
          background: ring,
          transition: "width 500ms cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
      <p style={{
        fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 400,
        lineHeight: 1.5, color: "var(--text-2)",
        margin: 0,
      }}>{dim.summary}</p>
    </div>
  );
}

function ScoreByIntent({ area }: { area: AreaData }) {
  return (
    <div style={{
      marginBottom: 28,
      border: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <SectionHead eyebrow="Score by intent" note="Same area, different scores for different purposes" />
      <div className="aiq-intent-scores" style={{
        display: "grid",
        gridTemplateColumns: `repeat(${area.intents.length}, 1fr)`,
        gap: 0,
      }}>
        {area.intents.map((intent, i) => {
          const r = rag(intent.score);
          return (
            <div key={intent.slug} style={{
              padding: "28px 20px 24px",
              textAlign: "center",
              borderRight: i < area.intents.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 36, fontWeight: 500,
                letterSpacing: "-0.02em",
                color: r.dot, lineHeight: 1,
              }}>{intent.score}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--text-3)", marginTop: 4,
              }}>/ 100</div>
              <div style={{
                fontFamily: "var(--display)", fontSize: 14.5, fontWeight: 500,
                color: "var(--ink-deep)", marginTop: 10,
                letterSpacing: "-0.01em",
              }}>{intent.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LockedSections({ area }: { area: AreaData }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 14,
        display: "inline-flex", alignItems: "center", gap: 9,
      }}>
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: "var(--signal)" }} />
        Detailed analysis · {area.lockedSections.length} sections
      </div>
      <div style={{
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}>
        {area.lockedSections.map((title, i) => (
          <div key={i} style={{
            padding: "14px 22px",
            borderBottom: i < area.lockedSections.length - 1 ? "1px solid var(--border-dim)" : "none",
            display: "flex", alignItems: "center", gap: 16,
            opacity: 0.55,
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.18em", color: "var(--text-3)",
            }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{
              flex: 1,
              fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
              letterSpacing: "-0.012em", color: "var(--ink-deep)",
            }}>{title}</span>
            <LockIcon />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 14,
        display: "inline-flex", alignItems: "center", gap: 9,
      }}>
        <span aria-hidden style={{ width: 5, height: 5, borderRadius: 5, background: "var(--signal)" }} />
        Recommendations · {area.lockedRecommendations} actions
      </div>
      <div style={{
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}>
        {Array.from({ length: area.lockedRecommendations }, (_, i) => (
          <div key={i} style={{
            padding: "16px 22px",
            borderBottom: i < area.lockedRecommendations - 1 ? "1px solid var(--border-dim)" : "none",
            display: "flex", alignItems: "center", gap: 16,
            opacity: 0.55,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "var(--signal-dim)", color: "var(--ink-deep)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
              flexShrink: 0,
            }}>{i + 1}</span>
            <div aria-hidden style={{
              flex: 1,
              height: 8, borderRadius: 2,
              background: "var(--border)",
              maxWidth: `${70 - i * 8}%`,
            }} />
            <LockIcon />
          </div>
        ))}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="var(--text-3)" strokeWidth="1.6" />
      <path d="M8 11 V7 A 4 4 0 0 1 16 7 V11" stroke="var(--text-3)" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

function Cta({ area }: { area: AreaData }) {
  return (
    <div style={{
      border: "1px solid var(--border)",
      background: "var(--bg-ink)",
      padding: "40px 32px",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: -140, left: "50%",
        transform: "translateX(-50%)",
        width: 720, height: 420,
        background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 62%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "relative", zIndex: 1,
        textAlign: "center", maxWidth: 720, margin: "0 auto",
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(212,243,58,0.9)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 16,
        }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)" }} />
          Full report locked
        </div>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(26px, 3.4vw, 36px)", lineHeight: 1.08,
          letterSpacing: "-0.016em", color: "#FFFFFF",
          margin: "0 0 12px",
        }}>
          Unlock the full <em style={{
            fontStyle: "italic", color: "var(--signal)",
          }}>{area.name}</em> report.
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
          lineHeight: 1.55, color: "rgba(255,255,255,0.64)",
          margin: "0 auto 26px", maxWidth: "56ch",
        }}>
          {area.lockedSections.length} sections of detailed analysis, data-backed reasoning for every score, and {area.lockedRecommendations} personalised recommendations. Built from {area.dataSources.length} live UK data sources.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={`/sign-up?postcode=${encodeURIComponent(area.postcode)}`} style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "13px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--signal)",
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            Generate full report
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <Link href="/pricing" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.88)", background: "transparent",
            padding: "13px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.22)",
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            See pricing
          </Link>
        </div>
        <div style={{
          marginTop: 18,
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}>
          Free tier · 3 reports/month · No card required
        </div>
      </div>
    </div>
  );
}

function Related({ items }: { items: Related[] }) {
  if (items.length === 0) return null;
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "80px 0 100px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)", marginBottom: 20,
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 6, background: "var(--signal)" }} />
          More UK area reports
        </div>
        <div className="aiq-related-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
        }}>
          {items.map((a) => {
            const tone = ragTone(a.overallScore);
            const fg  = tone === "strong" ? "var(--ink-deep)" : tone === "moderate" ? "#6E5300" : "#A01B00";
            return (
              <Link key={a.slug} href={`/area/${a.slug}`} style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
                padding: "14px 16px",
                textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12,
                transition: "border-color 140ms ease, background 140ms ease",
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--ink)";
                  e.currentTarget.style.background = "var(--bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "var(--bg)";
                }}
              >
                <span style={{
                  fontFamily: "var(--display)", fontSize: 14.5, fontWeight: 500,
                  letterSpacing: "-0.01em", color: "var(--ink-deep)",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{a.name}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600,
                  color: fg, flexShrink: 0,
                }}>{a.overallScore}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
