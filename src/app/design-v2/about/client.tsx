"use client";

import React from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /about
   Editorial story page: the gap, principles, data, timeline, builder.
   ═══════════════════════════════════════════════════════════════ */

export default function AboutClient() {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <StatsStrip />
      <TheGap />
      <Principles />
      <DataSources />
      <Timeline />
      <Builder />
      <Mission />
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
          width: 880, height: 640,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.18) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 880, margin: "0 auto",
        padding: "112px 40px 80px",
        position: "relative", zIndex: 1, textAlign: "center",
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
          About OneGoodArea
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(44px, 5.6vw, 72px)", lineHeight: 1.02,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 24px",
        }}>
          We built the location intelligence layer{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>regulated buyers couldn&apos;t find.</span>
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17.5, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: "0 auto", maxWidth: "58ch",
        }}>
          Deterministic UK area scoring. Same input, same answer, version-stamped on every report, confidence-banded per dimension. Built for FCA-regulated workflows, embeddable in any product.
        </p>
      </div>
    </section>
  );
}

/* ─────── Stats ─────── */

const STATS: { value: string; label: string }[] = [
  { value: "Every",   label: "UK postcode" },
  { value: "7",       label: "Public datasets" },
  { value: "v2.0.2",  label: "Engine stamped" },
  { value: "OpenAPI", label: "3.0 spec" },
];

function StatsStrip() {
  return (
    <section style={{
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div className="aiq-stats-strip" style={{
          display: "grid",
          gridTemplateColumns: `repeat(${STATS.length}, 1fr)`,
          gap: 0,
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              padding: "28px 24px",
              borderRight: i < STATS.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{
                fontFamily: "var(--display)", fontSize: 36, fontWeight: 500,
                letterSpacing: "-0.02em", color: "var(--ink-deep)",
                lineHeight: 1,
              }}>{s.value}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--text-3)",
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── The gap ─────── */

function TheGap() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="Why it exists"
          title={<>The UK has lots of listings. It didn&apos;t have a{" "}<em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>proper read.</em></>}
        />

        <div className="aiq-gap-grid" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 72, marginTop: 64,
          alignItems: "start",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 14,
            }}>What regulated buyers had</div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
              lineHeight: 1.62, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: "0 0 14px", maxWidth: "50ch",
            }}>
              Black-box AVMs from incumbent vendors. No methodology disclosure, no version pinning, no per-dimension confidence band. Hard to enter into a model risk register, harder to defend in a regulatory review.
            </p>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
              lineHeight: 1.62, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: 0, maxWidth: "50ch",
            }}>
              Or the alternative: raw Land Registry pulls, ONS CSV dumps, council-scraped data. Free at source, expensive in engineering hours. Months to integrate, no audit trail, no support contract when the data vintage shifts.
            </p>
          </div>
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--ink)", marginBottom: 14,
            }}>What we built instead</div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
              lineHeight: 1.62, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: "0 0 14px", maxWidth: "50ch",
            }}>
              The deterministic UK location intelligence layer. One API call returns a postcode-level score, five weighted dimensions, per-dimension confidence, cited public datasets, and a version stamp. Same input, same output, every time.
            </p>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
              lineHeight: 1.62, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: 0, maxWidth: "50ch",
            }}>
              Methodology pinning so the model risk team knows exactly which engine version produced every score. Public changelog. Audit trail on every response. Built to be embedded in lender, insurer, and PropTech surfaces without a six-month integration cycle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────── Section head helper ─────── */

function SectionHead({ eyebrow, title, sub }: {
  eyebrow: string; title: React.ReactNode; sub?: string;
}) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-2)",
        display: "inline-flex", alignItems: "center", gap: 9,
        marginBottom: 20,
      }}>
        <span aria-hidden style={{
          width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
        }} />
        {eyebrow}
      </div>
      <h2 style={{
        fontFamily: "var(--display)", fontWeight: 400,
        fontSize: "clamp(34px, 4.2vw, 52px)", lineHeight: 1.05,
        letterSpacing: "-0.018em", color: "var(--ink-deep)",
        margin: 0, maxWidth: "26ch",
      }}>
        {title}
      </h2>
      {sub && (
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: "18px 0 0", maxWidth: "58ch",
        }}>{sub}</p>
      )}
    </div>
  );
}

/* ─────── Principles · editorial rows with bespoke icons ─────── */

const PRINCIPLES: { icon: IconName; title: string; body: string }[] = [
  { icon: "data",    title: "Deterministic by design",       body: "Scores come from public datasets using fixed formulas. Same input, same output, every time. The AI narrates the result; it never generates the numbers. Server-side score lock is enforced in the response layer." },
  { icon: "repeat",  title: "Version-stamped responses",     body: "Every response carries an engine_version field and a per-dimension confidence band. Buyers entering reports into a model risk register get a clean audit line. X-Engine-Version request header pins the methodology when a regulated workflow needs it." },
  { icon: "intent",  title: "Intent shapes the weighting",   body: "Origination scoring is not the same as site selection. We rebalance the five dimensions per intent. Safety and schools weigh heaviest for origination; footfall, competition, and spending power for site selection. Same engine, four different products." },
  { icon: "map",     title: "Benchmarked against its own peer group", body: "A village with one school is not the same as a city with one school. Every postcode is classified urban / suburban / rural from postcodes.io rural-urban codes and benchmarked against its own peer group. No unfair comparisons between a London high street and a Lake District lane." },
];

function Principles() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="What we believe"
          title={<>Four rules, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>one engine.</em></>}
        />
        <div style={{ marginTop: 64 }}>
          {PRINCIPLES.map((p, i) => (
            <div key={p.title} className="aiq-capability-row" style={{
              display: "grid",
              gridTemplateColumns: "56px 240px 1fr",
              gap: 32, alignItems: "start",
              padding: "32px 0",
              borderTop: i === 0 ? "1px solid var(--border)" : "none",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.18em", color: "var(--text-3)",
                paddingTop: 6,
              }}>0{i + 1}</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <AiqIcon name={p.icon} size={24} />
                <div style={{
                  fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
                  letterSpacing: "-0.014em", color: "var(--ink-deep)",
                  lineHeight: 1.18,
                }}>{p.title}</div>
              </div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 15.5, fontWeight: 400,
                lineHeight: 1.58, color: "var(--text-2)",
                letterSpacing: "-0.003em",
                margin: 0, maxWidth: "62ch",
              }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── Data sources · editorial list ─────── */

const SOURCES: { icon: IconName; name: string; role: string; detail: string }[] = [
  { icon: "map",        name: "Postcodes.io",          role: "Geocoding + LSOA lookup",       detail: "The front door. Every postcode resolved to coordinates, LSOA, and MSOA so every downstream query knows exactly where it's looking." },
  { icon: "support",    name: "Police.uk",             role: "Street-level crime",            detail: "12 months of incidents by category and street, used to score safety per intent and cite specific figures in the narrative." },
  { icon: "researcher", name: "IMD 2025",              role: "Deprivation indices",           detail: "The Ministry of Housing, Communities and Local Government's 2025 release for England, with WIMD (Wales) and SIMD (Scotland) for full UK coverage." },
  { icon: "operator",   name: "OpenStreetMap",         role: "Amenities and transport",       detail: "Schools, GP surgeries, shops, cafés, parks, bus stops, and train stations within 0.5–2km radii. Volunteer-maintained, surprisingly current." },
  { icon: "investor",   name: "HM Land Registry",      role: "Property sold prices",          detail: "Real transactions. Median sold price, year-on-year change, transaction counts, and property-type breakdowns. No asking prices, no estate-agent optimism." },
  { icon: "intent",     name: "Environment Agency",    role: "Flood risk",                    detail: "Flood-zone classification and live flood-warning data. Lives in the Environment & Quality dimension, surfaced as a citation when the zone is 2 or 3." },
  { icon: "read",       name: "Ofsted",                role: "School inspections (England)",  detail: "Inspection ratings seeded locally, queried by coordinates for schools within 1.5km. Scotland (Education Scotland) and Wales (Estyn) planned." },
];

function DataSources() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="What we read"
          title={<>Seven public sources, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>one report.</em></>}
          sub="Every fact in a report comes from one of the seven. Each response carries a data_freshness block so you can see the source and age of each datapoint."
        />
        <div style={{
          marginTop: 56,
          border: "1px solid var(--border)", background: "var(--bg)",
        }}>
          {SOURCES.map((s, i) => (
            <div key={s.name} className="aiq-capability-row" style={{
              display: "grid",
              gridTemplateColumns: "56px 260px 1fr",
              gap: 28, alignItems: "center",
              padding: "22px 28px",
              borderBottom: i === SOURCES.length - 1 ? "none" : "1px solid var(--border-dim)",
            }}>
              <AiqIcon name={s.icon} size={24} />
              <div>
                <div style={{
                  fontFamily: "var(--display)", fontSize: 19, fontWeight: 500,
                  letterSpacing: "-0.012em", color: "var(--ink-deep)",
                  lineHeight: 1.15, marginBottom: 4,
                }}>{s.name}</div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: "var(--text-3)",
                }}>{s.role}</div>
              </div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
                lineHeight: 1.55, color: "var(--text-2)",
                letterSpacing: "-0.003em",
                margin: 0, maxWidth: "64ch",
              }}>{s.detail}</p>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 18, display: "flex", alignItems: "center", gap: 10,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
          }} />
          <span style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--text-3)",
          }}>
            Want the detail? See <Link href="/methodology" style={{ color: "var(--ink-deep)", textDecoration: "underline" }}>the methodology page</Link>.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─────── Timeline ─────── */

const MILESTONES: { date: string; label: string; body: string }[] = [
  { date: "January 2025",  label: "Idea validated",         body: "Ran into the same question for the fourth time: is this area any good? Checked every tool available. The honest answer was 'not really, and certainly not per-intent'." },
  { date: "February 2025", label: "First prototype",        body: "Seven public datasets wired in parallel: Postcodes.io, Police.uk, IMD, OpenStreetMap, Environment Agency, HM Land Registry, Ofsted. Narrative generated from the numbers, not from thin air." },
  { date: "March 2025",    label: "Deterministic engine",   body: "AI-generated scores swapped for fixed formulas. Numbers became reproducible. The narrative stayed AI-written. Server-side score lock added so the AI never drifts the output." },
  { date: "March 2025",    label: "Public launch",          body: "Live at the consumer surface. Stripe checkout, API keys, Ofsted integration, watchlist. Built and shipped solo." },
  { date: "April 2026",    label: "Engine v2.0.0",          body: "Confidence per dimension, methodology versioning, OpenAPI 3.0 spec, interactive API reference. Every response stamped with the engine version that produced it." },
  { date: "April 2026",    label: "Strategic repositioning", body: "Pivot from consumer postcode tool to the deterministic UK location intelligence layer for regulated B2B buyers. Front door moves to mortgage lenders, insurance underwriters, PropTech, retail / CRE site selection." },
  { date: "May 2026",      label: "Pricing v2 + MCP server", body: "Six-tier pricing for the B2B audience (Sandbox through Enterprise). Native MCP server for Claude Desktop and IDE workflows ships at v0.2.0." },
  { date: "May 2026",      label: "API infrastructure complete", body: "API keys hashed at rest, bulk endpoint for portfolio-scale calls, Idempotency-Key support, outbound webhooks with HMAC signing, and X-Engine-Version header for model-risk-register pinning." },
];

function Timeline() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="How we got here"
          title={<>A short <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>timeline.</em></>}
        />
        <div style={{ marginTop: 56, position: "relative" }}>
          <div aria-hidden style={{
            position: "absolute", left: 11, top: 12, bottom: 12,
            width: 1, background: "var(--border)",
          }} />
          {MILESTONES.map((m, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "24px 1fr",
              gap: 28, alignItems: "start",
              padding: "22px 0 26px",
              position: "relative",
            }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <span aria-hidden style={{
                  width: 11, height: 11, borderRadius: 11,
                  background: "var(--signal)",
                  border: "2px solid var(--ink-deep)",
                  boxShadow: "0 0 0 4px var(--bg)",
                  marginTop: 6,
                }} />
              </div>
              <div>
                <div style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.22em", textTransform: "uppercase",
                  color: "var(--text-3)", marginBottom: 6,
                }}>{m.date}</div>
                <div style={{
                  fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
                  letterSpacing: "-0.014em", color: "var(--ink-deep)",
                  lineHeight: 1.18, marginBottom: 6,
                }}>{m.label}</div>
                <p style={{
                  fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
                  lineHeight: 1.55, color: "var(--text-2)",
                  letterSpacing: "-0.003em",
                  margin: 0, maxWidth: "58ch",
                }}>{m.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── Builder · Pedro bio ─────── */

function Builder() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 28,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
          }} />
          Built by
        </div>
        <div className="aiq-builder-row" style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 40, alignItems: "start",
        }}>
          <div style={{
            width: 120, height: 120,
            background: "var(--signal-dim)",
            border: "1px solid var(--ink-deep)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--display)", fontSize: 40, fontWeight: 500,
            letterSpacing: "-0.02em", color: "var(--ink-deep)",
          }}>PS</div>
          <div>
            <h3 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(28px, 3.4vw, 36px)", lineHeight: 1.08,
              letterSpacing: "-0.016em", color: "var(--ink-deep)",
              margin: "0 0 6px",
            }}>
              Pedro <span style={{
                fontStyle: "italic", color: "var(--ink)",
                borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
              }}>Serapião</span>
            </h3>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 20,
            }}>Software engineer · Product builder · UK</div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
              lineHeight: 1.58, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: "0 0 14px", maxWidth: "56ch",
            }}>
              I kept running into the same problem: trying to make location decisions without reliable, structured data. Rightmove gives you vibes, PropertyData gives you spreadsheets, nothing gave you scored, transparent, intent-driven intelligence at a reader&apos;s price point.
            </p>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
              lineHeight: 1.58, color: "var(--text-2)",
              letterSpacing: "-0.003em",
              margin: 0, maxWidth: "56ch",
            }}>
              OneGoodArea is the tool I wanted on the other side of those decisions. Every feature exists because it solves a problem I had myself. No vanity metrics, no filler.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────── Mission ─────── */

function Mission() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "110px 0",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          borderLeft: "3px solid var(--signal)",
          paddingLeft: 28,
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-3)", marginBottom: 16,
          }}>Mission</div>
          <p style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(30px, 3.8vw, 44px)", lineHeight: 1.12,
            letterSpacing: "-0.016em", color: "var(--ink-deep)",
            margin: 0, maxWidth: "28ch",
          }}>
            Make area intelligence{" "}
            <em style={{
              fontStyle: "italic", color: "var(--ink)",
              borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
            }}>accessible, transparent, and useful</em>
            {" "}for every UK location decision.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section style={{
      background: "var(--bg-ink)",
      padding: "120px 0 140px",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: -180, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 600,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.12) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "0 40px",
        textAlign: "center", position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(212,243,58,0.9)",
          display: "inline-flex", alignItems: "center", gap: 9,
          marginBottom: 22,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
          }} />
          See it in action
        </div>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(38px, 5vw, 58px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "#FFFFFF",
          margin: "0 0 18px",
        }}>
          Try the engine. <em style={{
            fontStyle: "italic", color: "var(--signal)",
          }}>Read the methodology.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.55, color: "rgba(255,255,255,0.64)",
          margin: "0 auto 36px", maxWidth: "52ch",
        }}>
          Sandbox is free, no card. 35 calls a month against the full API surface. Pin a version, fire webhooks, batch a portfolio.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/pricing" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "14px 24px", borderRadius: 999, textDecoration: "none",
            border: "1px solid var(--signal)",
            display: "inline-flex", alignItems: "center", gap: 9,
            transition: "transform 140ms cubic-bezier(0.16,1,0.3,1)",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Start on Sandbox
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <Link href="/methodology" style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.88)", background: "transparent",
            padding: "14px 24px", borderRadius: 999, textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.22)",
            display: "inline-flex", alignItems: "center", gap: 9,
            transition: "border-color 140ms ease, background 140ms ease",
          }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
