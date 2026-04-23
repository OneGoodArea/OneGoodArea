"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea — Design V2 · /methodology
   Long-form reference page. Sticky sidebar scrollspy + editorial
   content sections.
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS: { id: string; label: string }[] = [
  { id: "overview",        label: "Overview" },
  { id: "data-sources",    label: "Data sources" },
  { id: "intents",         label: "Intent weighting" },
  { id: "scoring",         label: "Scoring functions" },
  { id: "narrative",       label: "The narrative layer" },
  { id: "overall",         label: "The overall score" },
  { id: "scale",           label: "Score scale" },
  { id: "freshness",       label: "Freshness + cache" },
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
          Methodology · Version 1
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 62px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 20px", maxWidth: "22ch",
        }}>
          How we score{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>every UK postcode.</span>
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: 0, maxWidth: "62ch",
        }}>
          Every score comes from real public data using the same formulas every time. This page is the written record — the exact sources, the exact weights, the exact role of the written narrative, and the exact shape of the number you end up with.
        </p>
      </div>
    </section>
  );
}

/* ─────── Body: sticky sidebar + editorial content ─────── */

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
          <Overview />
          <DataSources />
          <Intents />
          <Scoring />
          <Narrative />
          <Overall />
          <Scale />
          <Freshness />
        </div>
      </div>
    </section>
  );
}

/* Sticky sidebar with scrollspy — chartreuse underline on active. */
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
                position: "relative",
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

/* ─────── Section wrapper ─────── */

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
        margin: "0 0 24px", maxWidth: "28ch",
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

/* ─────── Overview ─────── */

function Overview() {
  return (
    <SectionBlock
      id="overview"
      eyebrow="Overview"
      title={<>Public data, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>reproducible formulas</em>, written reasoning.</>}
    >
      <P>
        The engine reads seven public datasets, classifies the area as urban, suburban, or rural, runs five deterministic scoring functions against that context, and returns one overall score plus five weighted dimensions — all keyed to one of four intents.
      </P>
      <P>
        A separate layer writes the narrative and recommendations on top of those numbers. That layer never invents the score; it explains it.
      </P>
      <P>
        Everything below is the exact procedure. Same postcode and same intent will always give you the same score. Cached responses are byte-identical.
      </P>
    </SectionBlock>
  );
}

/* ─────── Data sources ─────── */

const DS: { icon: IconName; name: string; provider: string; use: string }[] = [
  { icon: "map",        name: "Postcodes.io",        provider: "ONS / Royal Mail",        use: "Geocoding + ward, LSOA, constituency, region, country." },
  { icon: "support",    name: "Police.uk",           provider: "Home Office",             use: "Street-level crime, 12 months rolling, category breakdown." },
  { icon: "researcher", name: "IMD 2025",            provider: "MHCLG via ArcGIS",        use: "Index of Multiple Deprivation: rank + decile by LSOA. WIMD (Wales), SIMD (Scotland)." },
  { icon: "operator",   name: "OpenStreetMap",       provider: "Overpass API",            use: "Schools, shops, cafés, healthcare, parks, bus stops, stations within 0.5–2km." },
  { icon: "intent",     name: "Environment Agency",  provider: "Defra",                   use: "Flood-risk zone + active flood warnings." },
  { icon: "investor",   name: "HM Land Registry",    provider: "HM Land Registry SPARQL", use: "Sold prices by postcode district, property types, YoY change, transaction counts." },
  { icon: "read",       name: "Ofsted",              provider: "Department for Education",use: "School inspection ratings within 1.5km. England today; Scotland / Wales planned." },
];

function DataSources() {
  return (
    <SectionBlock
      id="data-sources"
      eyebrow="Data sources"
      title={<>Seven public datasets. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>No private feeds.</em></>}
    >
      <P>
        Every fact in a report traces back to one of seven sources below. Response payloads include a <Code>data_freshness</Code> block with source + period + status so you can cite with confidence.
      </P>
      <div style={{
        marginTop: 28,
        border: "1px solid var(--border)", background: "var(--bg)",
      }}>
        {DS.map((d, i) => (
          <div key={d.name} style={{
            display: "grid",
            gridTemplateColumns: "56px 220px 1fr",
            gap: 24, alignItems: "center",
            padding: "18px 22px",
            borderBottom: i === DS.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          }}>
            <AiqIcon name={d.icon} size={22} />
            <div>
              <div style={{
                fontFamily: "var(--display)", fontSize: 17, fontWeight: 500,
                letterSpacing: "-0.012em", color: "var(--ink-deep)",
                lineHeight: 1.2, marginBottom: 2,
              }}>{d.name}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--text-3)",
              }}>{d.provider}</div>
            </div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
              lineHeight: 1.55, color: "var(--text-2)",
              letterSpacing: "-0.003em",
            }}>{d.use}</div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─────── Intent weighting ─────── */

const INTENTS: { code: string; label: string; desc: string; dims: { label: string; weight: number }[] }[] = [
  { code: "moving",    label: "Moving home",        desc: "What a buyer or renter needs before a viewing or tenancy.",
    dims: [
      { label: "Safety & Crime",      weight: 25 },
      { label: "Schools & Education", weight: 20 },
      { label: "Transport & Commute", weight: 20 },
      { label: "Daily Amenities",     weight: 15 },
      { label: "Cost of Living",      weight: 20 },
    ] },
  { code: "business",  label: "Opening a business", desc: "What an operator weighs before signing a lease.",
    dims: [
      { label: "Foot Traffic & Demand", weight: 30 },
      { label: "Competition Density",   weight: 20 },
      { label: "Transport & Access",    weight: 15 },
      { label: "Local Spending Power",  weight: 20 },
      { label: "Commercial Costs",      weight: 15 },
    ] },
  { code: "investing", label: "Property investing", desc: "The buy-to-let or development read.",
    dims: [
      { label: "Price Growth",               weight: 25 },
      { label: "Rental Yield",               weight: 25 },
      { label: "Regeneration & Infrastructure", weight: 20 },
      { label: "Tenant Demand",              weight: 15 },
      { label: "Risk Factors",               weight: 15 },
    ] },
  { code: "research",  label: "Research / profile", desc: "The balanced neutral read for analysts and journalists.",
    dims: [
      { label: "Safety & Crime",          weight: 20 },
      { label: "Transport Links",         weight: 20 },
      { label: "Amenities & Services",    weight: 20 },
      { label: "Demographics & Economy",  weight: 20 },
      { label: "Environment & Quality",   weight: 20 },
    ] },
];

function Intents() {
  return (
    <SectionBlock
      id="intents"
      eyebrow="Intent weighting"
      title={<>Four intents. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>Five dimensions each.</em></>}
    >
      <P>
        A great area for a family is not the same as a great area for a coffee shop. The engine keeps the data identical but reweights the five dimensions per intent — and renames them to match the decision the reader is actually making.
      </P>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 28 }}
           className="aiq-intent-cards">
        {INTENTS.map((it) => (
          <div key={it.code} style={{
            border: "1px solid var(--border)",
            padding: "22px 22px 18px",
            background: "var(--bg)",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <code style={{
                fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                letterSpacing: "0.04em",
                color: "var(--signal-ink)", background: "var(--signal)",
                padding: "2px 8px", borderRadius: 2,
              }}>{it.code}</code>
              <span style={{
                fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
                color: "var(--ink-deep)", letterSpacing: "-0.012em",
              }}>{it.label}</span>
            </div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
              margin: "0 0 14px",
            }}>{it.desc}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {it.dims.map((d) => (
                <li key={d.label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "6px 0",
                  borderBottom: "1px dashed var(--border-dim)",
                }}>
                  <span style={{
                    fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
                    color: "var(--ink-deep)", flex: 1,
                  }}>{d.label}</span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
                    letterSpacing: "0.04em", color: "var(--ink)",
                  }}>{d.weight}%</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─────── Scoring ─────── */

function Scoring() {
  return (
    <SectionBlock
      id="scoring"
      eyebrow="Scoring functions"
      title={<>From raw data to <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>a number 0–100.</em></>}
    >
      <P>
        Each dimension runs a scoring function that takes raw public data, classifies the area against its own category (urban / suburban / rural), and returns a clamped score between 0 and 100. The code lives in <Code>src/lib/scoring-engine.ts</Code>.
      </P>
      <P>
        The function is pure — no randomness, no network calls inside the scoring layer itself. By the time the scorer runs, every external API has already returned and the inputs are in hand. This is what makes the score reproducible.
      </P>
      <P>
        Benchmarks are area-type-aware. A London high street and a Lake District lane both get "fair" scores, not an unfair head-to-head. The underlying shape of each function is a normalised distance from the category benchmark, shifted to keep most areas in the middle of the scale rather than bunching at 50.
      </P>
    </SectionBlock>
  );
}

/* ─────── Narrative ─────── */

function Narrative() {
  return (
    <SectionBlock
      id="narrative"
      eyebrow="The narrative layer"
      title={<>Numbers describe. Words <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>explain.</em></>}
    >
      <P>
        After the scoring engine runs, a language model writes the summary, the per-dimension reasoning, and the recommendations. Its inputs are the numbers, the data citations, and the intent. Its outputs are plain English — cited facts, never invented ones.
      </P>
      <P>
        If the numbers are absent, the narrative is absent. If the crime figure says 72, the narrative cannot claim the area is unsafe. The language layer is a commentator on the score, not a voice of its own.
      </P>
      <P>
        Because the narrative layer is generative, the exact wording can vary if you request a fresh report for the same postcode. The numbers do not. The cache stores the entire response — subsequent hits inside 24 hours return byte-identical prose.
      </P>
    </SectionBlock>
  );
}

/* ─────── Overall score ─────── */

function Overall() {
  return (
    <SectionBlock
      id="overall"
      eyebrow="The overall score"
      title={<>Weighted average. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>Clamped 0–100.</em></>}
    >
      <P>
        The top-line <Code>areaiq_score</Code> is the weighted average of the five dimensions for the chosen intent. Weights always sum to 100.
      </P>
      <div style={{
        background: "var(--ink-deep)", color: "rgba(255,255,255,0.88)",
        padding: "18px 22px", borderRadius: 4,
        fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7,
        marginTop: 14, marginBottom: 18,
      }}>
        <span style={{ color: "var(--signal)" }}>areaiq_score</span> = Σ ( dim<sub>i</sub>.score × dim<sub>i</sub>.weight ) / 100
      </div>
      <P>
        All scores are clamped to the 0–100 range after rounding to the nearest integer. Two reports on the same postcode + intent will always round to the same integer — there is no drift from the language layer because the language layer never touches the number.
      </P>
    </SectionBlock>
  );
}

/* ─────── Score scale ─────── */

const BANDS: { range: string; label: string; note: string }[] = [
  { range: "90 – 100", label: "Exceptional", note: "Top-tier fit for the chosen intent. Rare, and usually visible on the street." },
  { range: "75 – 89",  label: "Strong",      note: "A confident yes. Some trade-offs, but they're manageable within the intent." },
  { range: "60 – 74",  label: "Fair",        note: "Mixed — strengths in some dimensions, genuine weaknesses in others. Read the reasoning." },
  { range: "45 – 59",  label: "Cautious",    note: "More weaknesses than strengths. Needs a specific reason to proceed." },
  { range: "0 – 44",   label: "Low fit",     note: "Benchmarks aren't there. This doesn't mean bad — it means not for this intent." },
];

function Scale() {
  return (
    <SectionBlock
      id="scale"
      eyebrow="Score scale"
      title={<>What the <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>numbers mean.</em></>}
    >
      <P>
        The scale is intent-relative. A 72 for "opening a business" does not mean the same thing as a 72 for "moving home" — they're computed against different benchmarks, on different dimensions, with different weights.
      </P>
      <div style={{ marginTop: 28, border: "1px solid var(--border)" }}>
        {BANDS.map((b, i) => (
          <div key={b.range} style={{
            display: "grid",
            gridTemplateColumns: "140px 160px 1fr",
            gap: 20, alignItems: "center",
            padding: "18px 22px",
            borderBottom: i === BANDS.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          }}>
            <div style={{
              fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
              letterSpacing: "-0.012em", color: "var(--ink-deep)",
            }}>{b.range}</div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "var(--ink)",
            }}>{b.label}</div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
            }}>{b.note}</div>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

/* ─────── Freshness + cache ─────── */

function Freshness() {
  return (
    <SectionBlock
      id="freshness"
      eyebrow="Freshness + cache"
      title={<>What&apos;s live, what&apos;s <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>cached.</em></>}
    >
      <P>
        When a postcode + intent combination has not been scored in the past 24 hours, the engine fetches all seven data sources in parallel, runs the scorer, writes the narrative, stores the report, and returns it.
      </P>
      <P>
        Repeat queries for the same postcode + intent inside 24 hours come from the cache. They are byte-identical. API cache hits do not count against your monthly quota; the embeddable widget is cache-only by design, so embeds never hit your quota.
      </P>
      <P>
        Every response includes a <Code>data_freshness</Code> array: per source, the period read, and the status (<Code>live</Code>, <Code>recent</Code>, or <Code>static</Code>). If you need to audit a specific claim in a report, the <Code>data_sources</Code> array names every dataset that contributed to it.
      </P>
    </SectionBlock>
  );
}

/* ─────── Inline code element ─────── */

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 500,
      background: "var(--bg-off)",
      border: "1px solid var(--border)",
      padding: "1px 6px", borderRadius: 2,
      color: "var(--ink-deep)",
    }}>{children}</code>
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
          Run a free report for any UK postcode. Read the numbers; read the reasoning; decide.
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
