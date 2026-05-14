"use client";

import { useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* =================================================================
   OneGoodArea · Design V2 · /business
   B2B marketing page for the regulated buyer audience.
   Hero · stats · API preview · capabilities · vertical use cases ·
   regulatory signals · pricing · final CTA.
   ================================================================= */

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
      <RegulatoryStrip />
      <PricingStrip />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* --- Hero --- */

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
              For regulated buyers · API + MCP + widget
            </div>

            <h1 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(42px, 5.6vw, 68px)", lineHeight: 1.02,
              letterSpacing: "-0.02em", color: "var(--ink-deep)",
              margin: "0 0 24px",
            }}>
              The deterministic UK{" "}
              <span style={{
                fontStyle: "italic", color: "var(--ink)",
                borderBottom: "3px solid var(--signal)", paddingBottom: 2,
              }}>location intelligence</span>
              <br />
              layer.
            </h1>

            <p style={{
              fontFamily: "var(--sans)", fontSize: 17, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
              letterSpacing: "-0.005em",
              margin: "0 0 36px", maxWidth: "48ch",
            }}>
              Every UK postcode scored from seven public datasets using fixed formulas. Same input, same output, version-stamped, confidence-banded per dimension. Built to be entered into a model risk register.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Link href="/pricing" style={{
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
              <a href="mailto:hello@onegoodarea.com?subject=Enterprise%20API%20enquiry" style={{
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

/* Compact code card in the hero. Teases the API preview below. */
function HeroCodeCard() {
  return (
    <div style={{
      background: "var(--bg-ink)", borderRadius: 6,
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
          api.onegoodarea.com / v1 / report
        </span>
      </div>
      <pre style={{
        marginTop: 28, fontFamily: "var(--mono)", fontSize: 12.5,
        lineHeight: 1.7, color: "rgba(255,255,255,0.82)",
        margin: 0, paddingTop: 16, whiteSpace: "pre", overflow: "hidden",
      }}>
{'POST '}<span style={{ color: "var(--signal)" }}>/v1/report</span>{'\n'}
<span style={{ color: "rgba(255,255,255,0.42)" }}>Authorization:</span>{' Bearer '}<span style={{ color: "var(--signal)" }}>aiq_***</span>{'\n'}
<span style={{ color: "rgba(255,255,255,0.42)" }}>X-Engine-Version:</span>{' '}<span style={{ color: "var(--signal)" }}>2.0.2</span>{'\n'}
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
          engine 2.0.2 · score 78 · confidence 0.82
        </span>
      </div>
    </div>
  );
}

/* --- Stats strip --- */

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

/* --- API preview · long form --- */

const REQUEST_SNIPPET = `curl -X POST https://www.onegoodarea.com/api/v1/report \\
  -H "Authorization: Bearer aiq_your_key" \\
  -H "X-Engine-Version: 2.0.2" \\
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \\
  -H "Content-Type: application/json" \\
  -d '{"area": "SW1A 1AA", "intent": "moving"}'`;

const RESPONSE_SNIPPET = `{
  "id": "rpt_1710000000_abc123",
  "report": {
    "area":           "Westminster, SW1A 1AA",
    "intent":         "moving",
    "area_type":      "urban",
    "areaiq_score":   78,
    "confidence":     0.82,
    "engine_version": "2.0.2",
    "sub_scores": [
      { "label": "Safety & Crime",      "score": 72, "weight": 25,
        "confidence": 0.90, "confidence_reason": "Live police.uk data" },
      { "label": "Schools & Education", "score": 68, "weight": 20,
        "confidence": 1.00, "confidence_reason": "Ofsted inspections" },
      { "label": "Transport & Commute", "score": 94, "weight": 20,
        "confidence": 0.85, "confidence_reason": "OSM amenities" },
      { "label": "Daily Amenities",     "score": 86, "weight": 15,
        "confidence": 0.85, "confidence_reason": "OSM amenities" },
      { "label": "Cost of Living",      "score": 70, "weight": 20,
        "confidence": 0.70, "confidence_reason": "Land Registry, 83 txns" }
    ],
    "property_data":  { "median_price": 895000, "price_change_pct": 2.1 },
    "schools_data":   { "rating_breakdown": { ... } },
    "data_sources":   [ "postcodes.io", "police.uk", ... ],
    "data_freshness": [ { "source": "Police", "period": "12mo", ... } ]
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
          sub="Send a postcode and an intent. Get back an overall score, five weighted dimensions with confidence bands, a plain-English narrative, and cited data sources. Pin the engine version with one header. Retry safely with the idempotency key."
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
          <Link href="/docs/api-reference" style={linkInline}>
            Open the OpenAPI reference
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs/mcp" style={{ ...linkInline, color: "var(--text-2)" }}>
            MCP server
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs#embed" style={{ ...linkInline, color: "var(--text-2)" }}>
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
      background: "var(--bg-ink)", borderRadius: 6,
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

/* --- Section head helper --- */

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
          margin: "18px 0 0", maxWidth: "62ch",
        }}>{sub}</p>
      )}
    </div>
  );
}

/* --- Capabilities · what's actually shipped --- */

const CAPABILITIES: { icon: IconName; title: string; body: string }[] = [
  { icon: "api",        title: "REST API + bulk endpoint", body: "POST /v1/report for one postcode. POST /v1/batch for up to 100 in one call with bounded concurrency. Bearer token auth. 30 requests a minute on single, 5 batches a minute. JSON in and out, cited data sources on every response." },
  { icon: "data",       title: "Engine version pinning",   body: "Send X-Engine-Version: 2.0.2 to lock every response to that methodology version. Response stamps the same value into the body, plus an X-Engine-Version header. Buyers entering reports into a model risk register get a clean audit trail." },
  { icon: "researcher", title: "Confidence per dimension", body: "Every dimension returns a confidence value (0.0 to 1.0) and a reason string. High when the data is fresh primary source, medium for partial fallback, low for proxy data, none when missing. Aggregate confidence on the overall report. Buyers see the trust band, not just the number." },
  { icon: "repeat",     title: "Idempotency-Key + retries", body: "Stripe-style Idempotency-Key header on /v1/report and /v1/batch. Retries with the same key + body return the cached response within 24 hours without consuming additional quota. Different body with the same key returns 409. Safe to retry on network failure." },
  { icon: "intent",     title: "Outbound webhooks",        body: "Subscribe a URL to event types. report.created fires after every successful generation; score.changed when the time-series cron detects a material change. Stripe-style HMAC-SHA256 signing, 5s timeout per delivery, failures recorded for replay." },
  { icon: "operator",   title: "MCP server + widget",      body: "Native Model Context Protocol server for Claude Desktop / IDE workflows. Drop-in widget for any page with no API key on the client, reading from the 24-hour cache. Same engine on every surface. Same scores from every door." },
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
            <div key={c.title} className="aiq-capability-row" style={{
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
                letterSpacing: "-0.004em", maxWidth: "62ch",
              }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Audiences · B2B vertical use cases --- */

const B2B_AUDIENCES: { icon: IconName; title: string; body: string; tag: string }[] = [
  { icon: "investor", title: "Mortgage lenders",    tag: "/v1/batch · webhooks",
    body: "Screen portfolios at scale. Submit 100 postcodes per batch call, pre-checked against your monthly quota. Subscribe to score.changed webhooks to catch material movements on watchlisted properties. Methodology pinning gives your model risk team a clean line of sight on every score that touches a credit decision." },
  { icon: "support",  title: "Insurance underwriters", tag: "/v1/report · MCP",
    body: "Enrich quote workflows with environment-agency flood zones, crime baselines, deprivation indices, and property volatility bands. Per-dimension confidence tells underwriters when to trust the proxy and when to ask for a manual review. MCP server lets actuarial analysts query the engine from Claude in seconds." },
  { icon: "buyer",    title: "PropTech platforms",     tag: "API · widget · MCP",
    body: "Embed deterministic area intelligence on every listing, valuation screen, or relocation flow. REST API for server-side enrichment. Drop-in widget for embed traffic that reads from the 24-hour cache, so customer-facing pages stay snappy and your quota isn't drained by anonymous browsers." },
  { icon: "agent",    title: "Retail / CRE site selection", tag: "/v1/batch",
    body: "Score a longlist of candidate locations against the business intent: foot traffic, competition density, transport access, local spending power, commercial costs. Reweight a portfolio against the same engine; compare apples to apples across cities and regions without hand-tuning a model per market." },
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
          title={<>Four buyers. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>One engine.</em></>}
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
                margin: 0, maxWidth: "56ch",
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

/* --- Regulatory signal strip --- */

const REG_SIGNALS: { label: string; body: string }[] = [
  { label: "Auditable", body: "Every report stamped with engine_version and per-dimension confidence. Entered into model risk register without ambiguity." },
  { label: "Version-pinned", body: "X-Engine-Version request header locks the methodology. Patch versions in the v2.x series are score-equivalent by design." },
  { label: "Deterministic", body: "Scores computed from public datasets using fixed formulas. The AI narrates but never generates the numbers." },
  { label: "Hashed at rest", body: "API keys SHA-256 hashed in the database. Server never sees a plaintext key after the issue moment. Same pattern as Stripe / GitHub." },
];

function RegulatoryStrip() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "96px 0 104px",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <SectionHead
          eyebrow="Built for the model risk register"
          title={<>Four properties <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>your compliance team will ask for.</em></>}
          sub="None of this is a sticker on a marketing page. Every property below is a real surface on the API today, with docs and tests behind it."
        />

        <div className="aiq-reg-grid" style={{
          display: "grid",
          gridTemplateColumns: `repeat(${REG_SIGNALS.length}, 1fr)`,
          gap: 0, marginTop: 56,
          border: "1px solid var(--border)",
          background: "var(--bg-off)",
        }}>
          {REG_SIGNALS.map((s, i) => (
            <div key={s.label} style={{
              padding: "26px 24px",
              borderRight: i < REG_SIGNALS.length - 1 ? "1px solid var(--border)" : "none",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: "var(--ink)",
              }}>{s.label}</div>
              <p style={{
                fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
                lineHeight: 1.55, color: "var(--text-2)",
                letterSpacing: "-0.003em",
                margin: 0, maxWidth: "30ch",
              }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 22,
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          Enterprise security review pack available on request.
        </div>
      </div>
    </section>
  );
}

/* --- Pricing strip · V2 plans, sourced from src/lib/stripe.ts PLANS --- */

const TIERS: { name: string; price: string; cadence: string; reports: string; mcp: string; desc: string; highlight?: boolean }[] = [
  { name: "Sandbox",    price: "£0",     cadence: "/mo",  reports: "35 calls",          mcp: "Add-on",         desc: "Try the API end to end without a card. Full surface, capped." },
  { name: "Starter",    price: "£49",    cadence: "/mo",  reports: "1,500 calls",       mcp: "£29/mo add-on",  desc: "Solo devs and pilots." },
  { name: "Build",      price: "£149",   cadence: "/mo",  reports: "6,000 calls",       mcp: "£29/mo add-on",  desc: "Production integrations with steady traffic.", highlight: true },
  { name: "Scale",      price: "£499",   cadence: "/mo",  reports: "25,000 calls",      mcp: "£29/mo add-on",  desc: "Portals and platforms with embed-heavy surfaces." },
  { name: "Growth",     price: "£1,499", cadence: "/mo",  reports: "100,000 calls",     mcp: "Included",       desc: "Lender portfolios, InsurTech back-ends, multi-product surfaces." },
  { name: "Enterprise", price: "£4,999+", cadence: "/mo", reports: "250,000+ calls",    mcp: "Included",       desc: "Annual contract, SLAs, security review, bespoke commercials." },
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
          title={<>Six tiers. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>Same engine.</em></>}
          sub="Cached calls don't count against your quota. Build and Scale carry a soft overage cap, hard caps on Sandbox and Starter, negotiated overages on Enterprise. Cancel any time."
        />

        <div className="aiq-tier-grid" style={{
          display: "grid", gridTemplateColumns: `repeat(${TIERS.length}, 1fr)`,
          gap: 0, marginTop: 56,
          border: "1px solid var(--border)",
        }}>
          {TIERS.map((t, i) => (
            <div key={t.name} style={{
              padding: "28px 18px 30px",
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
                  fontFamily: "var(--display)", fontSize: 30, fontWeight: 500,
                  letterSpacing: "-0.02em", color: "var(--ink-deep)",
                  lineHeight: 1,
                }}>{t.price}</span>
                {t.cadence && <span style={{
                  fontFamily: "var(--mono)", fontSize: 11,
                  color: "var(--text-3)",
                }}>{t.cadence}</span>}
              </div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.06em", color: "var(--ink)",
              }}>{t.reports}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10,
                color: "var(--text-3)",
                letterSpacing: "0.06em",
              }}>MCP: {t.mcp}</div>
              <div style={{
                fontFamily: "var(--sans)", fontSize: 13, fontWeight: 400,
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
          <span>✓ Cached calls free</span>
          <span>✓ Self-serve from Sandbox</span>
          <span>✓ Annual billing on Build+</span>
          <span>✓ Cancel any time</span>
        </div>

        <div style={{
          marginTop: 32, display: "flex", gap: 28, flexWrap: "wrap",
          alignItems: "center",
        }}>
          <Link href="/pricing" style={linkInline}>
            See the full pricing page
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --- Final CTA --- */

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
          A <em style={{
            fontStyle: "italic", color: "var(--signal)",
          }}>deterministic read</em> on every UK postcode in your product.
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 400,
          lineHeight: 1.55, color: "rgba(255,255,255,0.64)",
          margin: "0 auto 36px", maxWidth: "50ch",
        }}>
          Start on Sandbox without a card. Go to Build when the pilot lands. Enterprise contracts available for portfolio-scale workloads.
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
            Get API access
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <a href="mailto:hello@onegoodarea.com?subject=Enterprise%20API%20enquiry" style={{
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
