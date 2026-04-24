"use client";

import { useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /business
   Same design language as the home page. B2B marketing page:
   hero + stats + API preview + capabilities + audiences + pricing + CTA
   ═══════════════════════════════════════════════════════════════ */

export default function BusinessClient() {
  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <StatsStrip />
      <ApiPreview />
      <Capabilities />
      <Audiences />
      <PricingStrip />
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
          position: "absolute", top: -220, right: -180,
          width: 760, height: 620,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.18) 0%, rgba(212,243,58,0) 62%)",
        }} />
      </div>

      <div style={{
        maxWidth: 1240, margin: "0 auto", padding: "96px 40px 84px",
        position: "relative", zIndex: 1,
      }}>
        <div className="aiq-hero-grid" style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 72, alignItems: "start",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-2)",
              display: "inline-flex", alignItems: "center", gap: 9,
              marginBottom: 26,
            }}>
              <span aria-hidden style={{
                width: 6, height: 6, borderRadius: 6,
                background: "var(--signal)",
                animation: "aiq-pulse-dot 1.6s ease-in-out infinite",
              }} />
              For businesses · API + widget
            </div>

            <h1 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(42px, 5.6vw, 68px)", lineHeight: 1.02,
              letterSpacing: "-0.02em", color: "var(--ink-deep)",
              margin: "0 0 24px",
            }}>
              Every UK postcode,{" "}
              <span style={{
                fontStyle: "italic", color: "var(--ink)",
                borderBottom: "3px solid var(--signal)", paddingBottom: 2,
              }}>scored.</span>
              <br />
              One API call.
            </h1>

            <p style={{
              fontFamily: "var(--sans)", fontSize: 17, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
              letterSpacing: "-0.005em",
              margin: "0 0 36px", maxWidth: "46ch",
            }}>
              A REST API and drop-in widget for property portals, relocation platforms, and investment tools. The same engine that powers OneGoodArea, on your surface.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link href="/design-v2/pricing" style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--signal-ink)", background: "var(--signal)",
                padding: "13px 22px", borderRadius: 999, textDecoration: "none",
                border: "1px solid var(--ink-deep)",
                display: "inline-flex", alignItems: "center", gap: 9,
                transition: "transform 140ms cubic-bezier(0.16,1,0.3,1), box-shadow 140ms",
                boxShadow: "0 1px 0 rgba(6,42,30,0.04)",
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(6,42,30,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(6,42,30,0.04)";
                }}
              >
                Get API access
                <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
              </Link>
              <a href="mailto:hello@area-iq.co.uk?subject=Enterprise API enquiry" style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--ink)", background: "transparent",
                padding: "13px 22px", borderRadius: 999, textDecoration: "none",
                border: "1px solid var(--border)",
                display: "inline-flex", alignItems: "center", gap: 9,
                transition: "background 140ms ease, border-color 140ms ease",
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-off)";
                  e.currentTarget.style.borderColor = "var(--ink)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                Talk to sales
              </a>
            </div>
          </div>

          <HeroCodeCard />
        </div>
      </div>
    </section>
  );
}

/* Compact code card in the hero · a teaser for the API preview below.
   Uses chartreuse syntax highlights, not terminal-green. */
function HeroCodeCard() {
  return (
    <div style={{
      background: "var(--ink-deep)", borderRadius: 6,
      padding: "22px 24px 24px",
      boxShadow: "0 24px 60px -20px rgba(6,42,30,0.28)",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 38,
        display: "flex", alignItems: "center", gap: 6, padding: "0 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: "rgba(255,255,255,0.18)" }} />
        <span style={{ width: 8, height: 8, borderRadius: 8, background: "rgba(255,255,255,0.12)" }} />
        <span style={{ width: 8, height: 8, borderRadius: 8, background: "rgba(255,255,255,0.12)" }} />
        <span style={{
          marginLeft: 12,
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.42)",
        }}>
          api.area-iq.co.uk / v1 / report
        </span>
      </div>
      <pre style={{
        marginTop: 28, fontFamily: "var(--mono)", fontSize: 12.5,
        lineHeight: 1.7, color: "rgba(255,255,255,0.82)",
        margin: 0, paddingTop: 16, whiteSpace: "pre", overflow: "hidden",
      }}>
{'POST '}<span style={{ color: "var(--signal)" }}>/v1/report</span>{'\n'}
<span style={{ color: "rgba(255,255,255,0.42)" }}>Authorization:</span>{' Bearer '}<span style={{ color: "var(--signal)" }}>aiq_***</span>{'\n'}
{'\n'}
{'{\n'}
{'  '}<span style={{ color: "rgba(255,255,255,0.55)" }}>&quot;area&quot;</span>{': '}<span style={{ color: "var(--signal)" }}>&quot;SW1A 1AA&quot;</span>{',\n'}
{'  '}<span style={{ color: "rgba(255,255,255,0.55)" }}>&quot;intent&quot;</span>{': '}<span style={{ color: "var(--signal)" }}>&quot;moving&quot;</span>{'\n'}
{'}'}
      </pre>
      <div style={{
        marginTop: 22, paddingTop: 18,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 14,
        fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
      }}>
        <span style={{
          color: "var(--signal)", padding: "3px 8px",
          background: "rgba(212,243,58,0.14)", borderRadius: 3,
        }}>200 OK</span>
        <span style={{ color: "rgba(255,255,255,0.48)" }}>
          Report · 78/100 · moving
        </span>
      </div>
    </div>
  );
}

/* ─────── Stats strip ─────── */

const STATS: { value: string; label: string }[] = [
  { value: "42,640", label: "UK neighbourhoods" },
  { value: "7",      label: "Public datasets" },
  { value: "4",      label: "Intent modes" },
  { value: "24h",    label: "Response cache" },
];

function StatsStrip() {
  return (
    <section style={{
      borderBottom: "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
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
                fontFamily: "var(--display)", fontSize: 32, fontWeight: 500,
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

/* ─────── API preview · long form ─────── */

const REQUEST_SNIPPET = `curl -X POST https://www.area-iq.co.uk/api/v1/report \\
  -H "Authorization: Bearer aiq_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"area": "SW1A 1AA", "intent": "moving"}'`;

const RESPONSE_SNIPPET = `{
  "id": "rpt_1710000000_abc123",
  "report": {
    "area":          "Westminster, SW1A 1AA",
    "intent":        "moving",
    "area_type":     "urban",
    "areaiq_score":  78,
    "sub_scores": [
      { "label": "Safety & Crime",      "score": 72, "weight": 25 },
      { "label": "Schools & Education", "score": 68, "weight": 20 },
      { "label": "Transport & Commute", "score": 94, "weight": 20 },
      { "label": "Daily Amenities",     "score": 86, "weight": 15 },
      { "label": "Cost of Living",      "score": 70, "weight": 20 }
    ],
    "property_data":    { "median_price": 895000, "price_change_pct": 2.1 },
    "schools_data":     { "rating_breakdown": { ... } },
    "summary":          "Westminster scores 78 out of 100 …",
    "recommendations":  [ … ],
    "data_sources":     [ "postcodes.io", "police.uk", ... ],
    "data_freshness":   [ { "source": "Police", "period": "12mo", ... } ]
  }
}`;

function ApiPreview() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="Developer experience"
          title={<>One request. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>A full read.</em></>}
          sub="Send a postcode and an intent. Get back an overall score, five weighted dimensions, a plain-English narrative, and data-backed recommendations. Four intent modes: moving, investing, business, research."
        />

        <div className="aiq-api-grid" style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
          marginTop: 56,
        }}>
          <CodeBlock label="Request" snippet={REQUEST_SNIPPET} copyable />
          <CodeBlock label="Response · 200 OK" snippet={RESPONSE_SNIPPET} />
        </div>

        <div style={{
          marginTop: 40, display: "flex", gap: 32, flexWrap: "wrap",
          alignItems: "center",
        }}>
          <Link href="/design-v2/docs" style={linkInline}>
            Read the API docs
            <span aria-hidden>→</span>
          </Link>
          <Link href="/design-v2/docs#embed" style={{ ...linkInline, color: "var(--text-2)" }}>
            Drop-in widget
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

const linkInline: React.CSSProperties = {
  fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
  letterSpacing: "0.16em", textTransform: "uppercase",
  color: "var(--ink-deep)", textDecoration: "none",
  display: "inline-flex", alignItems: "center", gap: 8,
  borderBottom: "1px solid var(--ink-deep)", paddingBottom: 3,
};

function CodeBlock({ label, snippet, copyable }: {
  label: string; snippet: string; copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background: "var(--ink-deep)", borderRadius: 6,
      padding: "18px 22px 24px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14, paddingBottom: 14,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)",
        }}>{label}</span>
        {copyable && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(snippet);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: copied ? "var(--signal)" : "rgba(255,255,255,0.6)",
              background: "transparent", border: "1px solid rgba(255,255,255,0.14)",
              padding: "5px 10px", borderRadius: 3, cursor: "pointer",
              transition: "color 140ms ease, border-color 140ms ease",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre style={{
        margin: 0, fontFamily: "var(--mono)", fontSize: 12,
        lineHeight: 1.65, color: "rgba(255,255,255,0.8)",
        whiteSpace: "pre", overflow: "auto",
      }}>{snippet}</pre>
    </div>
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
        margin: 0, maxWidth: "22ch",
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

/* ─────── Capabilities · editorial list with AiqIcons ─────── */

const CAPABILITIES: { icon: IconName; title: string; body: string }[] = [
  { icon: "api",        title: "REST API",            body: "POST a postcode and an intent. Back comes an overall score, five weighted dimensions with reasoning, a narrative, recommendations, and cited data. Bearer-token auth, 30 requests a minute, JSON in and out." },
  { icon: "map",        title: "Drop-in widget",      body: "Single-origin script for any page. No API key on the client. Reads from the 24-hour cache so embed traffic never hits live pricing. CORS-enabled, 60 requests an hour per origin." },
  { icon: "intent",     title: "Four intent modes",   body: "Moving, opening a business, investing, and research. Same postcode, different scores. The engine reweights five dimensions to match what the reader is actually deciding. Moving weighs Safety 25% · Schools 20% · Transport 20% · Amenities 15% · Cost 20%. Business rewrites the lot." },
  { icon: "data",       title: "Seven public datasets", body: "Postcodes.io, Police.uk (12 months of street-level incidents), IMD 2025, OpenStreetMap (amenities, transport, schools), HM Land Registry, Environment Agency flood risk, and Ofsted inspections. Every response carries a data_freshness block so you know exactly what was read and when." },
  { icon: "read",       title: "Plain-English read",  body: "Numbers tell you what. The narrative explains why. Specific facts cited inline: median sold price, YoY change, crime rate per intent, flood zone, nearest Outstanding school within 1.5km. No vague copy. Every claim is grounded in one of the datasets above." },
  { icon: "researcher", title: "Self-serve dashboard",body: "Manage keys, monitor calls, view a 30-day trend. Cached hits don't count against your quota, so embed traffic is effectively free. Billing and quota live with the account. No procurement loop to use the product." },
];

function Capabilities() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="What you're integrating"
          title={<>Built to <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>embed</em>, not to demo.</>}
        />

        <div style={{ marginTop: 64 }}>
          {CAPABILITIES.map((c, i) => (
            <div key={c.title} style={{
              display: "grid",
              gridTemplateColumns: "48px 220px 1fr",
              gap: 32, alignItems: "start",
              padding: "28px 0",
              borderTop: i === 0 ? "1px solid var(--border)" : "none",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.16em", color: "var(--text-3)",
                paddingTop: 4,
              }}>
                0{i + 1}
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <AiqIcon name={c.icon} size={22} />
                <div style={{
                  fontFamily: "var(--display)", fontSize: 21, fontWeight: 500,
                  letterSpacing: "-0.012em", color: "var(--ink-deep)",
                  lineHeight: 1.18, paddingTop: 0,
                }}>{c.title}</div>
              </div>
              <div style={{
                fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
                lineHeight: 1.55, color: "var(--text-2)",
                letterSpacing: "-0.004em", maxWidth: "58ch",
              }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── Audiences · who this is for ─────── */

const B2B_AUDIENCES: { icon: IconName; title: string; body: string; tag: string }[] = [
  { icon: "buyer",    title: "Property portals",     tag: "API or widget",  body: "Add area scores to every listing page. Give buyers objective data on safety, transport, schools, and amenities before they book a viewing." },
  { icon: "agent",    title: "Estate agents",        tag: "Widget or API",  body: "Show area quality alongside property details. Embed the score card on your site, or pull scores into the CRM for your briefs." },
  { icon: "investor", title: "Investment platforms", tag: "API batches",    body: "Screen postcodes at scale for yield, safety, and growth potential. Filter by intent-specific dimensions. Cached queries are free." },
  { icon: "map",      title: "Relocation companies", tag: "API",            body: "Score destination neighbourhoods for corporate clients automatically. Provide objective area intelligence alongside relocation packages." },
];

function Audiences() {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="Who this is for"
          title={<>Four teams. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>One engine.</em></>}
        />

        <div className="aiq-audiences-grid" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0, marginTop: 64,
          border: "1px solid var(--border)",
        }}>
          {B2B_AUDIENCES.map((a, i) => (
            <div key={a.title} style={{
              padding: "34px 32px",
              borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
              borderBottom: i < 2 ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", gap: 14,
              background: "var(--bg)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <AiqIcon name={a.icon} size={24} />
                <div style={{
                  fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
                  letterSpacing: "-0.012em", color: "var(--ink-deep)",
                  lineHeight: 1,
                }}>{a.title}</div>
              </div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 400,
                lineHeight: 1.55, color: "var(--text-2)",
                letterSpacing: "-0.003em",
                margin: 0, maxWidth: "52ch",
              }}>{a.body}</p>
              <span style={{
                alignSelf: "flex-start",
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.2em", textTransform: "uppercase",
                color: "var(--ink)", background: "var(--signal-dim)",
                padding: "4px 9px", borderRadius: 2,
              }}>{a.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── Pricing strip ─────── */

const TIERS: { name: string; price: string; cadence: string; reports: string; perReport: string; desc: string; highlight?: boolean }[] = [
  { name: "Developer",  price: "£49",     cadence: "/mo",  reports: "100 reports",   perReport: "£0.49 each", desc: "Solo devs, prototypes, early integrations." },
  { name: "Business",   price: "£249",    cadence: "/mo",  reports: "500 reports",   perReport: "£0.50 each", desc: "Platforms and integrations with steady traffic.", highlight: true },
  { name: "Growth",     price: "£499",    cadence: "/mo",  reports: "1,500 reports", perReport: "£0.33 each", desc: "Portals and high-volume surfaces." },
  { name: "Enterprise", price: "Custom",  cadence: "",     reports: "5,000+",        perReport: "Custom",     desc: "SLAs, annual contracts, bespoke terms." },
];

function PricingStrip() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="API pricing"
          title={<>Scale as <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>you grow.</em></>}
          sub="Cached queries don't count against your quota. Cancel any time. No setup fee."
        />

        <div className="aiq-tier-grid" style={{
          display: "grid", gridTemplateColumns: `repeat(${TIERS.length}, 1fr)`,
          gap: 0, marginTop: 56,
          border: "1px solid var(--border)",
        }}>
          {TIERS.map((t, i) => (
            <div key={t.name} style={{
              padding: "30px 26px 32px",
              borderRight: i < TIERS.length - 1 ? "1px solid var(--border)" : "none",
              background: t.highlight ? "var(--bg-off)" : "var(--bg)",
              position: "relative",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              {t.highlight && (
                <span aria-hidden style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: 3, background: "var(--signal)",
                }} />
              )}
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "var(--text-2)",
              }}>{t.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{
                  fontFamily: "var(--display)", fontSize: 38, fontWeight: 500,
                  letterSpacing: "-0.02em", color: "var(--ink-deep)",
                  lineHeight: 1,
                }}>{t.price}</span>
                {t.cadence && <span style={{
                  fontFamily: "var(--mono)", fontSize: 12,
                  color: "var(--text-3)",
                }}>{t.cadence}</span>}
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.06em", color: "var(--ink)",
              }}>{t.reports}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5,
                color: "var(--text-3)",
              }}>{t.perReport}</div>
              <div style={{
                fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
                lineHeight: 1.5, color: "var(--text-2)",
                marginTop: 4,
              }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 28,
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--text-3)",
          display: "flex", gap: 28, flexWrap: "wrap",
        }}>
          <span>✓ Cached queries free</span>
          <span>✓ Self-serve onboarding</span>
          <span>✓ Cancel any time</span>
          <span>✓ Bearer token auth</span>
        </div>
      </div>
    </section>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section style={{
      background: "var(--ink-deep)",
      padding: "120px 0 140px",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: -200, left: "50%",
          transform: "translateX(-50%)",
          width: 900, height: 600,
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
          Ready when you are
        </div>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5.2vw, 64px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "#FFFFFF",
          margin: "0 0 18px",
        }}>
          Put a <em style={{
            fontStyle: "italic", color: "var(--signal)",
          }}>proper read</em> on every postcode in your product.
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.55, color: "rgba(255,255,255,0.64)",
          margin: "0 auto 36px", maxWidth: "48ch",
        }}>
          Create an account, subscribe to a plan, generate a key, start building. Under two minutes, no sales call.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/design-v2/pricing" style={{
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
            Get API access
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <a href="mailto:hello@area-iq.co.uk?subject=Enterprise API enquiry" style={{
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
            Talk to sales
          </a>
        </div>
      </div>
    </section>
  );
}
