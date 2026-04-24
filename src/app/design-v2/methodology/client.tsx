"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /methodology
   Long-form reference page. Content mirrors the live site:
   data sources, intent types, scoring functions (named, not exposed),
   role of AI, overall score, score scale (RAG).
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS: { id: string; label: string }[] = [
  { id: "data-sources", label: "Data sources" },
  { id: "intents",      label: "Intent types" },
  { id: "scoring",      label: "Scoring functions" },
  { id: "ai-role",      label: "Role of AI" },
  { id: "overall",      label: "Overall score" },
  { id: "scale",        label: "Score scale" },
];

export default function MethodologyClient() {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <Body />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero() {
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
          position: "absolute", top: -220, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 560,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 1000, margin: "0 auto",
        padding: "100px 40px 56px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.24em", textTransform: "uppercase",
          color: "var(--text-2)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 26,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6,
            background: "var(--signal)",
            animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
          }} />
          Methodology
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 62px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 20px", maxWidth: "22ch",
        }}>
          How OneGoodArea{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>scores an area.</span>
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: 0, maxWidth: "62ch",
        }}>
          Every score is built from real data. Same postcode, same answer. This page is the plain-English record of what the engine reads, what it weighs, and what the AI layer is (and isn&apos;t) allowed to do.
        </p>
      </div>
    </section>
  );
}

/* ─────── Body: sidebar + content ─────── */

function Body() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "64px 0 120px",
    }}>
      <div className="aiq-meth-wrap" style={{
        maxWidth: 1240, margin: "0 auto", padding: "0 40px",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 72, alignItems: "start",
      }}>
        <Sidebar />
        <div style={{ minWidth: 0 }}>
          <DataSources />
          <IntentTypes />
          <ScoringFunctions />
          <RoleOfAi />
          <OverallScore />
          <ScoreScale />
        </div>
      </div>
    </section>
  );
}

function Sidebar() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0% -55% 0%", threshold: [0, 0.25, 0.5] }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <aside className="aiq-meth-sidebar" style={{
      position: "sticky", top: 96, alignSelf: "start",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-3)", marginBottom: 18,
      }}>
        On this page
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} style={{
                display: "inline-block",
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: isActive ? "var(--ink-deep)" : "var(--text-2)",
                textDecoration: "none",
                padding: "6px 0 7px",
                transition: "color 140ms ease",
                borderBottom: isActive ? "2px solid var(--signal)" : "2px solid transparent",
              }}>
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/* ─────── Section primitives ─────── */

function SectionBlock({ id, eyebrow, title, children }: {
  id: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{
      padding: "56px 0 64px",
      scrollMarginTop: 80,
      borderBottom: "1px solid var(--border-dim)",
    }}>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-2)",
        display: "inline-flex", alignItems: "center", gap: 9,
        marginBottom: 16,
      }}>
        <span aria-hidden style={{
          width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
        }} />
        {eyebrow}
      </div>
      <h2 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: "clamp(28px, 3.2vw, 40px)", lineHeight: 1.08,
        letterSpacing: "-0.016em", color: "var(--ink-deep)",
        margin: "0 0 24px", maxWidth: "30ch",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
      lineHeight: 1.62, color: "var(--text-2)",
      letterSpacing: "-0.003em",
      margin: "0 0 14px", maxWidth: "66ch",
    }}>{children}</p>
  );
}

/* ─────── Data sources ─────── */

const DATA_SOURCES: {
  icon: IconName; name: string; provider: string; radius: string; data: string;
}[] = [
  { icon: "map",        name: "Postcodes.io",       provider: "ONS / Royal Mail",       radius: "Point lookup",       data: "Geocoding (latitude/longitude), LSOA code and name, local authority, ward, constituency, and region. Acts as the entry point for all other lookups." },
  { icon: "support",    name: "Police.uk",          provider: "Home Office",            radius: "1 mile",             data: "Street-level crime incidents from the last 3 months, broken down by category (theft, violence, burglary, and so on). Includes monthly trend data for direction-of-travel analysis." },
  { icon: "researcher", name: "ONS / IMD 2025",     provider: "MHCLG via ArcGIS",       radius: "LSOA boundary",      data: "Index of Multiple Deprivation. Ranks 33,755 Lower Super Output Areas across income, employment, health, education, and living environment. Decile 1 = most deprived, decile 10 = least deprived." },
  { icon: "operator",   name: "OpenStreetMap",      provider: "Overpass API",           radius: "500m to 2km",        data: "Nearby amenities: schools within 1.5km, food and shops within 1km, transport stations within 2km, bus stops within 500m, parks and healthcare facilities." },
  { icon: "intent",     name: "Environment Agency", provider: "Defra",                  radius: "3km / 5km",          data: "Flood risk zones within 3km, active flood warnings within 5km, and identified rivers at risk. Data is fetched live per request." },
  { icon: "investor",   name: "HM Land Registry",   provider: "Price Paid Data",        radius: "Postcode district",  data: "Actual sold prices from the last 12 months via SPARQL query. Median and mean prices, year-on-year change, property type breakdown (detached, semi, terraced, flat), tenure split, and price range." },
  { icon: "read",       name: "Ofsted",             provider: "Department for Education", radius: "1.5km",            data: "School inspection ratings (Outstanding, Good, Requires Improvement, Inadequate). England only." },
];

function DataSources() {
  return (
    <SectionBlock
      id="data-sources"
      eyebrow="Data sources"
      title={<>Seven public sources, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>one report.</em></>}
    >
      <P>
        Every report is built from seven live UK government and open data sources, fetched in parallel at the time of request. No cached data. No estimates. No surveys.
      </P>
      <div style={{
        marginTop: 28,
        border: "1px solid var(--border)", background: "var(--bg)",
      }}>
        {DATA_SOURCES.map((s, i) => (
          <div key={s.name} style={{
            padding: "22px 24px",
            borderBottom: i === DATA_SOURCES.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
            display: "grid",
            gridTemplateColumns: "44px 1fr",
            gap: 18, alignItems: "flex-start",
          }}>
            <div style={{ paddingTop: 2 }}>
              <AiqIcon name={s.icon} size={22} />
            </div>
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                flexWrap: "wrap", marginBottom: 6,
              }}>
                <span style={{
                  fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
                  letterSpacing: "-0.012em", color: "var(--ink-deep)",
                }}>{s.name}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--text-3)",
                }}>{s.provider}</span>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  color: "var(--ink)", background: "var(--signal-dim)",
                  padding: "3px 8px", borderRadius: 2,
                }}>{s.radius}</span>
              </div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
                lineHeight: 1.55, color: "var(--text-2)",
                letterSpacing: "-0.003em",
                margin: 0, maxWidth: "66ch",
              }}>{s.data}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─────── Intent types ─────── */

const INTENTS: { code: string; label: string; desc: string; dimensions: string[] }[] = [
  { code: "moving",    label: "Moving",    desc: "Residential relocation", dimensions: ["Safety", "Schools", "Transport", "Amenities", "Cost of Living"] },
  { code: "business",  label: "Business",  desc: "Commercial viability",   dimensions: ["Foot Traffic", "Competition", "Transport", "Spending Power", "Commercial Costs"] },
  { code: "investing", label: "Investing", desc: "Property investment",    dimensions: ["Price Growth", "Rental Yield", "Regeneration", "Tenant Demand", "Risk Factors"] },
  { code: "research",  label: "Research",  desc: "General area profile",   dimensions: ["Safety", "Transport", "Amenities", "Demographics", "Environment"] },
];

function IntentTypes() {
  return (
    <SectionBlock
      id="intents"
      eyebrow="Intent types + dimension weights"
      title={<>Four intents. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>Different priorities.</em></>}
    >
      <P>
        The intent determines which dimensions are scored and how they are weighted. Different use cases care about different things. Moving prioritises safety and schools. Business prioritises foot traffic and spending power.
      </P>
      <P>
        Weights are calibrated internally and are not published.
      </P>
      <div className="aiq-intent-cards" style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 32,
      }}>
        {INTENTS.map((it) => (
          <div key={it.code} style={{
            border: "1px solid var(--border)",
            padding: "22px 22px 20px",
            background: "var(--bg)",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
              <code style={{
                fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                letterSpacing: "0.04em",
                color: "var(--signal-ink)", background: "var(--signal)",
                padding: "3px 9px", borderRadius: 2,
              }}>{it.code}</code>
              <span style={{
                fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
                color: "var(--ink-deep)", letterSpacing: "-0.012em",
              }}>{it.label}</span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10.5,
                color: "var(--text-3)", letterSpacing: "0.04em",
              }}>· {it.desc}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {it.dimensions.map((d) => (
                <li key={d} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                  color: "var(--text)", letterSpacing: "0.02em",
                }}>
                  <span aria-hidden style={{
                    width: 5, height: 5, borderRadius: 5,
                    background: "var(--signal)", opacity: 0.7,
                  }} />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─────── Scoring functions ─────── */

const CORE_FNS: { label: string; intents: string; icon: IconName; body: string }[] = [
  { label: "Safety",          intents: "Moving · Research",             icon: "support",    body: "Uses the last 3 months of police.uk crime data. Rising crime is penalised, falling crime is rewarded, and violent crime concentration is weighted appropriately." },
  { label: "Transport",       intents: "Moving · Business · Research",  icon: "map",        body: "Rail and bus connectivity combined into a single accessibility score. Benchmarked against area type so rural postcodes are judged against other rural postcodes." },
  { label: "Schools",         intents: "Moving",                         icon: "read",       body: "School and educational facility density nearby, with a diminishing returns curve. One good school matters more than many middling ones." },
  { label: "Amenities",       intents: "Moving · Research",             icon: "operator",   body: "Weighted composite across education, food and drink, healthcare, retail, and green spaces. Each category normalised against area-type benchmarks." },
  { label: "Demographics",    intents: "Research",                       icon: "researcher", body: "Official deprivation indices (IMD for England, WIMD for Wales, SIMD for Scotland). Maps decile ranking to a score that reflects the socioeconomic profile of the neighbourhood." },
  { label: "Environment",     intents: "Moving · Research",             icon: "intent",     body: "Combines flood risk zones, active flood warnings, and green space availability. Areas with no flood risk and good park access score highest." },
  { label: "Cost of Living",  intents: "Moving",                         icon: "investor",   body: "Uses Land Registry sold prices as the primary input. Scored as a ratio of local median to national median. Falls back to deprivation data when price data is unavailable." },
];

const BIZ_FNS: { label: string; body: string }[] = [
  { label: "Foot Traffic",      body: "Transport connectivity combined with commercial activity density. Strong rail, bus, and retail presence indicates higher natural footfall." },
  { label: "Competition",       body: "Measures commercial saturation nearby. Lower density scores higher. Useful for identifying underserved areas with unmet demand." },
  { label: "Spending Power",    body: "Derived from deprivation indices as a proxy for local disposable income. Correlates with footfall quality, not just volume." },
  { label: "Commercial Costs",  body: "Uses Land Registry property values as a proxy for commercial rents and overheads. Higher local property prices mean higher commercial costs." },
];

const INV_FNS: { label: string; body: string }[] = [
  { label: "Price Growth",   body: "Real year-on-year price changes from Land Registry. Moderate growth scores highest, sharp declines and flat markets score lower." },
  { label: "Rental Yield",   body: "Uses Land Registry median prices as the yield denominator. Adjusts upward for strong local amenities and transport that drive tenant demand." },
  { label: "Regeneration",   body: "Development potential. Higher-deprivation areas with good transport links score highest. Already-developed premium areas score lower." },
  { label: "Tenant Demand",  body: "Composite of transport connectivity, local amenities, bus coverage, and commercial activity." },
  { label: "Risk Factors",   body: "Crime and environmental risk combined into a single downside metric. Active flood warnings or elevated crime see significant reductions." },
];

function ScoringFunctions() {
  return (
    <SectionBlock
      id="scoring"
      eyebrow="Scoring functions"
      title={<>How each dimension becomes <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>a number.</em></>}
    >
      <P>
        Each dimension has a dedicated scoring function. Inputs go in, a number between 0 and 100 comes out. No randomness. No AI-generated numbers. Below is a plain-English breakdown of what each function considers.
      </P>

      <SubHead eyebrow="Core dimensions" />
      <FunctionList items={CORE_FNS.map((f) => ({
        icon: f.icon, title: f.label, tag: f.intents, body: f.body,
      }))} />

      <SubHead eyebrow="Business intent · derived dimensions" />
      <P>
        Business reports use derived scores that combine transport, amenity, and deprivation data into commercially relevant metrics.
      </P>
      <FunctionList items={BIZ_FNS.map((f) => ({
        icon: "gauge" as IconName, title: f.label, body: f.body,
      }))} />

      <SubHead eyebrow="Investing intent · derived dimensions" />
      <P>
        Investing reports combine deprivation data, transport connectivity, crime statistics, and flood risk into investment-focused metrics.
      </P>
      <FunctionList items={INV_FNS.map((f) => ({
        icon: "investor" as IconName, title: f.label, body: f.body,
      }))} />
    </SectionBlock>
  );
}

function SubHead({ eyebrow }: { eyebrow: string }) {
  return (
    <div style={{
      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
      letterSpacing: "0.22em", textTransform: "uppercase",
      color: "var(--text-3)",
      marginTop: 28, marginBottom: 14,
    }}>{eyebrow}</div>
  );
}

function FunctionList({ items }: {
  items: { icon: IconName; title: string; tag?: string; body: string }[];
}) {
  return (
    <div style={{
      border: "1px solid var(--border)", background: "var(--bg)",
      marginBottom: 20,
    }}>
      {items.map((it, i) => (
        <div key={it.title + i} style={{
          padding: "20px 22px",
          borderBottom: i === items.length - 1 ? "none" : "1px solid var(--border-dim)",
          background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          display: "grid",
          gridTemplateColumns: "40px 1fr",
          gap: 16, alignItems: "flex-start",
        }}>
          <div style={{ paddingTop: 2 }}>
            <AiqIcon name={it.icon} size={20} />
          </div>
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              flexWrap: "wrap", marginBottom: 6,
            }}>
              <span style={{
                fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
                letterSpacing: "-0.012em", color: "var(--ink-deep)",
              }}>{it.title}</span>
              {it.tag && (
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--text-3)",
                  border: "1px solid var(--border)",
                  padding: "3px 7px", borderRadius: 2,
                }}>{it.tag}</span>
              )}
            </div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
              lineHeight: 1.58, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: 0, maxWidth: "64ch",
            }}>{it.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────── Role of AI ─────── */

const PIPELINE: { step: string; title: string; body: string }[] = [
  { step: "01", title: "Fetch data",       body: "Seven APIs queried in parallel for the target location." },
  { step: "02", title: "Compute scores",   body: "Every dimension scored from 0 to 100 by its own function." },
  { step: "03", title: "AI narrates",      body: "The AI engine receives the scores and the raw data, and writes the report." },
  { step: "04", title: "Numbers protected", body: "Any AI-generated numbers are replaced server-side with the computed scores before the report is saved." },
];

const AI_DOES = [
  "Writes the executive summary",
  "Authors the detailed analysis sections",
  "Generates actionable recommendations",
  "Interprets raw data points in context",
  "Explains what the scores mean for your use case",
];

const AI_DOES_NOT = [
  "Sets or modifies any numerical score",
  "Chooses dimension weights",
  "Invents data points or statistics",
  "Overrides the scoring engine",
  "Influences the overall OneGoodArea score",
];

function RoleOfAi() {
  return (
    <SectionBlock
      id="ai-role"
      eyebrow="Role of AI"
      title={<>What our AI engine <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>does (and doesn&apos;t).</em></>}
    >
      <P>
        The numbers on a report are computed. The words around them are written. Those are two different jobs, and our AI engine only does the second one.
      </P>

      <SubHead eyebrow="The pipeline" />
      <div className="aiq-pipeline" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 0, border: "1px solid var(--border)",
        marginBottom: 24,
      }}>
        {PIPELINE.map((s, i) => (
          <div key={s.step} style={{
            padding: "22px 20px",
            borderRight: i < 3 ? "1px solid var(--border)" : "none",
            background: "var(--bg)",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", color: "var(--text-3)",
              marginBottom: 10,
            }}>{s.step}</div>
            <div style={{
              fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
              letterSpacing: "-0.012em", color: "var(--ink-deep)",
              marginBottom: 6,
            }}>{s.title}</div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 13, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
              margin: 0,
            }}>{s.body}</p>
          </div>
        ))}
      </div>

      <SubHead eyebrow="AI does / AI doesn't" />
      <div className="aiq-ai-split" style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 0, border: "1px solid var(--border)",
      }}>
        <div style={{
          padding: "22px 24px",
          borderRight: "1px solid var(--border)",
          background: "var(--bg)",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--ink)", marginBottom: 14,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <span aria-hidden style={{
              width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
            }} />
            AI does
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {AI_DOES.map((item) => (
              <li key={item} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                fontFamily: "var(--sans)", fontSize: 14,
                color: "var(--text-2)", lineHeight: 1.5,
              }}>
                <span aria-hidden style={{
                  flexShrink: 0, marginTop: 6,
                  width: 10, height: 2, background: "var(--signal)",
                  borderRadius: 1,
                }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div style={{
          padding: "22px 24px",
          background: "var(--bg-off)",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "#b42318", marginBottom: 14,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            <span aria-hidden style={{
              width: 6, height: 6, borderRadius: 6, background: "#b42318",
            }} />
            AI doesn&apos;t
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
            {AI_DOES_NOT.map((item) => (
              <li key={item} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                fontFamily: "var(--sans)", fontSize: 14,
                color: "var(--text-2)", lineHeight: 1.5,
              }}>
                <span aria-hidden style={{
                  flexShrink: 0, marginTop: 6,
                  width: 10, height: 2, background: "#b42318",
                  opacity: 0.6, borderRadius: 1,
                }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{
        marginTop: 22,
        background: "var(--signal-dim)",
        border: "1px solid var(--ink)",
        padding: "16px 20px", borderRadius: 4,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink-deep)", marginBottom: 6,
        }}>Numbers protected server-side</div>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
          lineHeight: 1.5, color: "var(--ink-deep)",
          margin: 0,
        }}>
          Even if the AI model returns different numbers in its response, the server replaces them with the pre-computed scores before the report is saved. The numbers you see are always the output of the scoring engine.
        </p>
      </div>
    </SectionBlock>
  );
}

/* ─────── Overall score ─────── */

function OverallScore() {
  return (
    <SectionBlock
      id="overall"
      eyebrow="Overall score"
      title={<>One number, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>keyed to your intent.</em></>}
    >
      <P>
        The overall OneGoodArea score is a weighted average of all dimension scores for the selected intent. Each dimension contributes proportionally to its internally calibrated weight. The result is a single 0 to 100 number representing how well the area suits your stated purpose.
      </P>
      <div style={{
        border: "1px solid var(--border)",
        padding: "22px 24px",
        background: "var(--bg)",
        marginTop: 8,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)", marginBottom: 14,
        }}>
          How it works
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Each dimension is scored independently from 0 to 100.",
            "Dimensions are weighted according to the selected intent.",
            "The weighted scores are combined into a single overall score.",
            "The same postcode with the same data always produces the same number.",
          ].map((item) => (
            <li key={item} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
              color: "var(--text-2)", lineHeight: 1.55,
            }}>
              <span aria-hidden style={{
                flexShrink: 0, marginTop: 7,
                width: 12, height: 2, background: "var(--signal)",
                borderRadius: 1,
              }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </SectionBlock>
  );
}

/* ─────── Score scale (RAG) ─────── */

const BANDS: { range: string; label: string; tone: "strong" | "moderate" | "weak"; note: string }[] = [
  { range: "70 – 100", label: "Strong",   tone: "strong",
    note: "The area performs well in this dimension. A strong foundation with no major concerns. For overall scores, this indicates a highly suitable location for your stated intent." },
  { range: "45 – 69",  label: "Moderate", tone: "moderate",
    note: "The area is adequate but has room for improvement. Some trade-offs to consider. Worth investigating further before making decisions." },
  { range: "0 – 44",   label: "Weak",     tone: "weak",
    note: "The area underperforms in this dimension. Significant challenges identified. Does not necessarily disqualify the area, but indicates a specific weakness worth understanding." },
];

function ScoreScale() {
  return (
    <SectionBlock
      id="scale"
      eyebrow="Score scale"
      title={<>Green, amber, red. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>Three bands.</em></>}
    >
      <P>
        Scores are colour-coded using a Red / Amber / Green system across every report. This applies to both dimension scores and the overall OneGoodArea score.
      </P>
      <div style={{
        marginTop: 20,
        border: "1px solid var(--border)", background: "var(--bg)",
      }}>
        {BANDS.map((b, i) => {
          const bg    = b.tone === "strong"   ? "var(--signal-dim)" : b.tone === "moderate" ? "#FFF4D1" : "#FFE8E2";
          const fg    = b.tone === "strong"   ? "var(--ink-deep)"   : b.tone === "moderate" ? "#6E5300" : "#A01B00";
          const dotBg = b.tone === "strong"   ? "var(--ink)"        : b.tone === "moderate" ? "#D49900" : "#D13A1E";
          return (
            <div key={b.label} style={{
              padding: "22px 24px",
              borderBottom: i === BANDS.length - 1 ? "none" : "1px solid var(--border-dim)",
              display: "grid",
              gridTemplateColumns: "170px 1fr",
              gap: 20, alignItems: "start",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{
                  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: fg, background: bg,
                  padding: "4px 10px", borderRadius: 2,
                  alignSelf: "flex-start",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                  <span aria-hidden style={{
                    width: 6, height: 6, borderRadius: 6, background: dotBg,
                  }} />
                  {b.range}
                </span>
                <span style={{
                  fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
                  letterSpacing: "-0.012em",
                  color: fg,
                }}>{b.label}</span>
              </div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
                lineHeight: 1.55, color: "var(--text-2)",
                letterSpacing: "-0.003em",
                margin: 0, maxWidth: "66ch",
              }}>{b.note}</p>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 22,
        border: "1px solid var(--border)",
        background: "var(--bg-off)",
        padding: "16px 20px", borderRadius: 4,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)", marginBottom: 6,
        }}>A note on interpretation</div>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          margin: 0,
        }}>
          A low score in one dimension does not make an area unsuitable. Context matters. A business location with a low competition score (meaning heavy saturation) might still succeed with strong differentiation. Read the narrative sections alongside the numbers.
        </p>
      </div>
    </SectionBlock>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section style={{
      background: "var(--bg-off)",
      padding: "100px 0 120px",
    }}>
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(32px, 4vw, 46px)", lineHeight: 1.06,
          letterSpacing: "-0.018em", color: "var(--ink-deep)",
          margin: "0 0 14px",
        }}>
          See the engine <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
          }}>in action.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          margin: "0 auto 30px", maxWidth: "52ch",
        }}>
          Run a free report for any UK postcode. Read the numbers, read the reasoning, decide.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/design-v2" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "14px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--ink-deep)",
            display: "inline-flex", alignItems: "center", gap: 9,
            transition: "transform 140ms cubic-bezier(0.16,1,0.3,1)",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Try a postcode
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <Link href="/design-v2/docs" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "var(--ink)", background: "transparent",
            padding: "14px 22px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--border)",
            display: "inline-flex", alignItems: "center", gap: 9,
            transition: "border-color 140ms ease, background 140ms ease",
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ink)";
              e.currentTarget.style.background = "var(--bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Read the API docs
          </Link>
        </div>
      </div>
    </section>
  );
}
