import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ShieldCheck, MapPin, Lock } from "lucide-react";
import { FullNavbar } from "@/components/full-navbar";
import { Footer } from "@/components/footer";
import { notFound } from "next/navigation";
import { getRAG } from "@/lib/rag";
import type { AreaData, AreaDimension } from "@/data/area-types";
import areasJson from "@/data/areas.json";

const AREAS = areasJson as Record<string, AreaData>;


/* ── Metadata ── */

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return Object.keys(AREAS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) return { title: "Area Not Found | AreaIQ" };

  const title = `${area.name} Area Intelligence | Score: ${area.overallScore}/100 | AreaIQ`;
  const description = `${area.name} scores ${area.overallScore}/100 on AreaIQ. Safety, transport, schools, amenities, cost of living, and green space, all scored and explained.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.area-iq.co.uk/area/${slug}`,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${area.name} Area Intelligence` }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `https://www.area-iq.co.uk/area/${slug}` },
  };
}

/* ── Page ── */

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = AREAS[slug];
  if (!area) notFound();

  const { color: scoreColor, dim: scoreDim, label: scoreLabel } = getRAG(area.overallScore);

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <FullNavbar breadcrumb={area.name} />

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[960px] mx-auto px-6 py-10 md:py-14">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={12} style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>{area.region}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ color: "var(--text-secondary)", background: "var(--bg-active)" }}>
                    {area.areaType}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5" style={{ color: scoreColor, background: scoreDim }}>
                    {scoreLabel}
                  </span>
                </div>
                <h1 className="text-[28px] md:text-[36px] font-semibold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
                  {area.name}
                </h1>
                <p className="text-[13px] leading-relaxed max-w-[560px] mb-4" style={{ color: "var(--text-secondary)" }}>
                  {area.summary}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  <span>Postcode: {area.postcode}</span>
                  <span>Population: {area.population}</span>
                  <span>Avg. property: {area.avgPropertyPrice}</span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  {area.dataSources.map((src) => (
                    <span key={src} className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score ring in hero */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative" style={{ width: 140, height: 140 }}>
                  <svg width={140} height={140} className="score-ring">
                    <circle className="score-ring-track" cx={70} cy={70} r={62} />
                    <circle
                      className="score-ring-fill"
                      cx={70} cy={70} r={62}
                      stroke={scoreColor}
                      strokeDasharray={2 * Math.PI * 62}
                      strokeDashoffset={2 * Math.PI * 62 - (area.overallScore / 100) * 2 * Math.PI * 62}
                      style={{ filter: `drop-shadow(0 0 6px ${scoreColor})` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[32px] font-mono font-bold tracking-tight" style={{ color: scoreColor }}>
                      {area.overallScore}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>/100</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider mt-2" style={{ color: "var(--text-tertiary)" }}>
                  AreaIQ Score
                </span>
                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: "var(--neon-green-dim)", borderRadius: "2px" }}>
                  <ShieldCheck size={11} style={{ color: "var(--neon-green)" }} />
                  <span className="text-[9px] font-mono" style={{ color: "var(--neon-green)" }}>
                    Deterministic scores
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-8">

          {/* ── Radar Chart ── */}
          <div className="border mb-3" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Dimension Overview
              </h2>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {area.areaType} benchmarks · {area.dimensions.length} dimensions
              </span>
            </div>
            <div className="p-5 flex justify-center">
              <RadarChartStatic dimensions={area.dimensions} size={220} />
            </div>
          </div>

          {/* ── Dimension Breakdown (scores + summaries, NO data reasoning) ── */}
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Dimension Breakdown
              </h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {area.dimensions.map((dim) => {
                const { color, dim: dimBg } = getRAG(dim.score);
                return (
                  <div key={dim.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono" style={{ color: "var(--text-secondary)" }}>{dim.label}</span>
                        <span className="text-[9px] font-mono px-1 py-px" style={{ color: "var(--text-tertiary)", background: "var(--bg)" }}>
                          {dim.weight}%
                        </span>
                      </div>
                      <span className="text-[13px] font-mono font-semibold" style={{ color }}>{dim.score}</span>
                    </div>
                    <div className="h-1.5 w-full" style={{ background: dimBg }}>
                      <div className="h-full" style={{ width: `${dim.score}%`, background: color }} />
                    </div>
                    <p className="text-[10px] mt-1.5 leading-snug" style={{ color: "var(--text-tertiary)" }}>{dim.summary}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Score by Intent ── */}
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="px-5 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Score by Intent
              </h2>
              <span className="text-[10px] font-mono ml-2" style={{ color: "var(--text-tertiary)" }}>
                · Same area, different scores depending on your purpose
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: "var(--border)" }}>
              {area.intents.map((intent) => {
                const { color } = getRAG(intent.score);
                return (
                  <div key={intent.slug} className="p-5 text-center" style={{ background: "var(--bg)" }}>
                    <span className="text-[28px] font-mono font-bold" style={{ color }}>{intent.score}</span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>/100</span>
                    <div className="text-[11px] font-mono mt-1" style={{ color: "var(--text-secondary)" }}>{intent.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Locked: Detailed Analysis ── */}
          <div className="relative mb-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                  Detailed Analysis
                </h2>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  · {area.lockedSections.length} sections
                </span>
              </div>
              {area.lockedSections.map((title, i) => (
                <div key={i} className="border px-5 py-3 flex items-center gap-3" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", opacity: 0.5 }}>
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </span>
                  <Lock size={12} style={{ color: "var(--text-tertiary)" }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Locked: Recommendations ── */}
          <div className="relative mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Recommendations
              </h2>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                {area.lockedRecommendations} actions
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: area.lockedRecommendations }, (_, i) => (
                <div key={i} className="border px-5 py-3.5 flex gap-4" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", opacity: 0.5 }}>
                  <div className="shrink-0 mt-0.5">
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold" style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-2.5 rounded-sm" style={{ width: `${65 - i * 10}%`, background: "var(--border)" }} />
                    <Lock size={10} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="border mb-6" style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}>
            <div className="p-8 md:p-10 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Lock size={14} style={{ color: "var(--neon-amber)" }} />
                <h2 className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--neon-amber)" }}>
                  Full report locked
                </h2>
              </div>
              <h2 className="text-[20px] md:text-[24px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
                Unlock the full {area.name} report
              </h2>
              <p className="text-[13px] max-w-lg mx-auto mb-6" style={{ color: "var(--text-secondary)" }}>
                Detailed analysis across {area.lockedSections.length} sections, data-backed reasoning for every score, and {area.lockedRecommendations} personalised recommendations. Powered by live data from {area.dataSources.length} UK sources.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/report?postcode=${encodeURIComponent(area.postcode)}`}
                  className="h-10 px-6 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide transition-colors"
                  style={{ background: "var(--text-primary)", color: "var(--bg)" }}
                >
                  Generate Full Report <ArrowRight size={12} />
                </Link>
                <Link
                  href="/pricing"
                  className="h-10 px-6 flex items-center gap-2 text-[12px] font-mono font-medium uppercase tracking-wide transition-colors"
                  style={{ background: "var(--bg-active)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  View Pricing
                </Link>
              </div>
              <p className="text-[10px] font-mono mt-4" style={{ color: "var(--text-tertiary)" }}>
                Free tier: 3 reports/month. No card required.
              </p>
            </div>
          </div>

          {/* ── Data Sources ── */}
          <div className="py-4 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--border)" }}>
            <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Sources:</span>
            {area.dataSources.map((src) => (
              <span key={src} className="text-[9px] font-mono px-1.5 py-0.5" style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}>
                {src}
              </span>
            ))}
          </div>

          {/* ── Related Areas ── */}
          <div className="py-6 border-t" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[10px] font-mono uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
              More UK Area Reports
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(AREAS)
                .filter(([s]) => s !== slug)
                .slice(0, 8)
                .map(([s, a]) => {
                  const { color } = getRAG(a.overallScore);
                  return (
                    <Link
                      key={s}
                      href={`/area/${s}`}
                      className="border px-3 py-2.5 flex items-center justify-between gap-2 transition-colors hover:border-[var(--text-tertiary)]"
                      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
                    >
                      <span className="text-[11px] font-mono truncate" style={{ color: "var(--text-secondary)" }}>{a.name}</span>
                      <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color }}>{a.overallScore}</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ── JSON-LD ── */}
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
              additionalProperty: [
                { "@type": "PropertyValue", name: "AreaIQ Score", value: area.overallScore, maxValue: 100, unitText: "points" },
                ...area.dimensions.map((d) => ({
                  "@type": "PropertyValue", name: `${d.label} Score`, value: d.score, maxValue: 100, unitText: "points",
                })),
              ],
            }),
          }}
        />
      </main>

      <Footer />
    </div>
  );
}

/* ── Static Radar Chart ── */

function RadarChartStatic({ dimensions, size = 200 }: { dimensions: AreaDimension[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 30;
  const levels = [20, 40, 60, 80, 100];
  const count = dimensions.length;

  function getPoint(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function getPolygon(value: number): string {
    return Array.from({ length: count }, (_, i) => getPoint(i, value).join(",")).join(" ");
  }

  const dataPoints = dimensions.map((d, i) => getPoint(i, d.score));
  const dataPolygon = dataPoints.map(p => p.join(",")).join(" ");
  const avgScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  const { color: fillColor } = getRAG(avgScore);

  return (
    <div className="relative py-4 px-8" style={{ width: size + 64, height: size + 32 }}>
      <svg width={size} height={size} style={{ overflow: "visible" }}>
        {levels.map((level) => (
          <polygon key={level} points={getPolygon(level)} fill="none" stroke="var(--border)" strokeWidth={level === 100 ? 1 : 0.5} opacity={level === 100 ? 0.8 : 0.4} />
        ))}
        {dimensions.map((_, i) => {
          const [x, y] = getPoint(i, 100);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth={0.5} opacity={0.4} />;
        })}
        <polygon points={dataPolygon} fill={fillColor} fillOpacity={0.1} stroke={fillColor} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 4px ${fillColor})` }} />
        {dataPoints.map((point, i) => {
          const { color } = getRAG(dimensions[i].score);
          return <circle key={i} cx={point[0]} cy={point[1]} r={3} fill={color} stroke="var(--bg)" strokeWidth={1} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />;
        })}
        {dimensions.map((dim, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          const labelR = maxR + 20;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy + labelR * Math.sin(angle);
          const { color } = getRAG(dim.score);
          let anchor: "start" | "middle" | "end" = "middle";
          if (Math.cos(angle) > 0.3) anchor = "start";
          else if (Math.cos(angle) < -0.3) anchor = "end";
          return (
            <g key={i}>
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fill="var(--text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">{dim.label}</text>
              <text x={lx} y={ly + 12} textAnchor={anchor} dominantBaseline="middle" fill={color} fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">{dim.score}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
