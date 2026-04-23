"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea — Design V2 · /docs
   REST API + widget reference. Sticky sidebar scrollspy, dark code
   blocks with chartreuse accents, language tabs on examples.
   ═══════════════════════════════════════════════════════════════ */

const SECTIONS: { id: string; label: string }[] = [
  { id: "quickstart",     label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "endpoint",       label: "Endpoint" },
  { id: "request",        label: "Request body" },
  { id: "response",       label: "Response" },
  { id: "errors",         label: "Errors" },
  { id: "rate-limits",    label: "Rate limits" },
  { id: "data-sources",   label: "Data sources" },
  { id: "widget",         label: "Drop-in widget" },
  { id: "examples",       label: "Code examples" },
];

export default function DocsClient() {
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
          position: "absolute", top: -220, right: -160,
          width: 760, height: 560,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.14) 0%, rgba(212,243,58,0) 62%)",
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
          API v1 · Stable · JSON over HTTPS
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(40px, 5vw, 62px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 20px", maxWidth: "22ch",
        }}>
          A postcode in, a{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>full read</span>
          {" "}out.
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: 0, maxWidth: "62ch",
        }}>
          REST endpoint, Bearer token auth, JSON in and out. Every response is cached for 24 hours — cached hits don&apos;t count against your quota.
        </p>
        <div style={{
          marginTop: 28, display: "flex", gap: 22, flexWrap: "wrap",
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <span>✓ REST</span>
          <span>✓ JSON</span>
          <span>✓ Bearer auth</span>
          <span>✓ 30 req/min</span>
          <span>✓ 24h cache</span>
          <span>✓ HTTPS only</span>
        </div>
      </div>
    </section>
  );
}

/* ─────── Body ─────── */

function Body() {
  return (
    <section style={{
      background: "var(--bg)",
      borderBottom: "1px solid var(--border)",
      padding: "56px 0 120px",
    }}>
      <div className="aiq-docs-wrap" style={{
        maxWidth: 1240, margin: "0 auto", padding: "0 40px",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 72, alignItems: "start",
      }}>
        <Sidebar />
        <div style={{ minWidth: 0 }}>
          <Quickstart />
          <Authentication />
          <Endpoint />
          <RequestBody />
          <ResponseShape />
          <Errors />
          <RateLimits />
          <DataSources />
          <Widget />
          <CodeExamples />
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
    <aside className="aiq-docs-sidebar" style={{
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
      <div style={{
        marginTop: 32, padding: "18px 16px",
        background: "var(--bg-off)", border: "1px solid var(--border)",
        borderRadius: 4,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--text-3)", marginBottom: 8,
        }}>Get a key</div>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 12.5, fontWeight: 400,
          lineHeight: 1.45, color: "var(--text-2)",
          margin: "0 0 12px",
        }}>
          API access requires a Developer, Business, or Growth plan.
        </p>
        <Link href="/design-v2/pricing" style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--ink-deep)", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
          borderBottom: "1px solid var(--ink-deep)", paddingBottom: 2,
        }}>
          See the plans
          <span aria-hidden>→</span>
        </Link>
      </div>
    </aside>
  );
}

/* ─────── Section wrapper + text primitives ─────── */

function Block({ id, eyebrow, title, children }: {
  id: string; eyebrow: string; title: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section id={id} style={{
      padding: "48px 0 56px",
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
        fontSize: "clamp(26px, 3vw, 36px)", lineHeight: 1.08,
        letterSpacing: "-0.014em", color: "var(--ink-deep)",
        margin: "0 0 22px", maxWidth: "30ch",
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
      fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
      lineHeight: 1.6, color: "var(--text-2)",
      letterSpacing: "-0.003em",
      margin: "0 0 14px", maxWidth: "68ch",
    }}>{children}</p>
  );
}

function IC({ children }: { children: React.ReactNode }) {
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

/* ─────── Dark code block with copy + optional language tab(s) ─────── */

function CodeBlock({ lang, snippet, copyable = true }: {
  lang?: string; snippet: string; copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{
      background: "var(--ink-deep)", borderRadius: 6,
      padding: "16px 20px 20px",
      position: "relative", overflow: "hidden",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12, paddingBottom: 12,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.2em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.48)",
        }}>{lang || "snippet"}</span>
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
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.14)",
              padding: "5px 10px", borderRadius: 3, cursor: "pointer",
              transition: "color 140ms ease, border-color 140ms ease",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre style={{
        margin: 0, fontFamily: "var(--mono)", fontSize: 12.5,
        lineHeight: 1.65, color: "rgba(255,255,255,0.82)",
        whiteSpace: "pre", overflow: "auto",
      }}>{snippet}</pre>
    </div>
  );
}

/* ─────── Tabbed code block for SDK examples ─────── */

function TabbedCode({ tabs }: {
  tabs: { label: string; lang: string; snippet: string }[];
}) {
  const [idx, setIdx] = useState(0);
  const active = tabs[idx];
  return (
    <div style={{
      background: "var(--ink-deep)", borderRadius: 6,
      padding: "14px 20px 20px", overflow: "hidden",
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14, paddingBottom: 14,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map((t, i) => {
            const isActive = i === idx;
            return (
              <button
                key={t.label}
                onClick={() => setIdx(i)}
                style={{
                  fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: isActive ? "var(--signal-ink)" : "rgba(255,255,255,0.6)",
                  background: isActive ? "var(--signal)" : "transparent",
                  border: "none",
                  padding: "6px 12px", borderRadius: 3, cursor: "pointer",
                  transition: "background 140ms ease, color 140ms ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <CopySnippet text={active.snippet} />
      </div>
      <pre style={{
        margin: 0, fontFamily: "var(--mono)", fontSize: 12.5,
        lineHeight: 1.65, color: "rgba(255,255,255,0.82)",
        whiteSpace: "pre", overflow: "auto",
      }}>{active.snippet}</pre>
    </div>
  );
}

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      style={{
        fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
        letterSpacing: "0.18em", textTransform: "uppercase",
        color: copied ? "var(--signal)" : "rgba(255,255,255,0.6)",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.14)",
        padding: "5px 10px", borderRadius: 3, cursor: "pointer",
        transition: "color 140ms ease, border-color 140ms ease",
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ─────── Quickstart ─────── */

function Quickstart() {
  return (
    <Block
      id="quickstart"
      eyebrow="Quickstart"
      title={<>Three steps, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>under two minutes.</em></>}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0, border: "1px solid var(--border)", marginBottom: 24,
      }} className="aiq-quickstart-grid">
        {[
          { step: "01", title: "Get a key",       body: "Subscribe to a Developer, Business, or Growth plan. Generate a key from the dashboard." },
          { step: "02", title: "Send a request",  body: "POST a postcode and an intent to /api/v1/report with your Bearer token." },
          { step: "03", title: "Read the report", body: "Back comes a score, five weighted dimensions, a narrative, recommendations, and citations." },
        ].map((s, i) => (
          <div key={s.step} style={{
            padding: "22px 22px 24px",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
            background: "var(--bg)",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.2em", color: "var(--text-3)",
              marginBottom: 10,
            }}>{s.step}</div>
            <div style={{
              fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
              letterSpacing: "-0.012em", color: "var(--ink-deep)",
              marginBottom: 6,
            }}>{s.title}</div>
            <p style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
              margin: 0,
            }}>{s.body}</p>
          </div>
        ))}
      </div>
      <CodeBlock lang="bash" snippet={`curl -X POST https://www.area-iq.co.uk/api/v1/report \\
  -H "Authorization: Bearer aiq_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"area": "Shoreditch", "intent": "business"}'`} />
    </Block>
  );
}

/* ─────── Authentication ─────── */

function Authentication() {
  return (
    <Block
      id="authentication"
      eyebrow="Authentication"
      title={<>Bearer token <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>on every request.</em></>}
    >
      <P>
        Every request carries an <IC>Authorization</IC> header with a 48-character hex token prefixed with <IC>aiq_</IC>. Generate and revoke keys from your{" "}
        <Link href="/dashboard" style={{ color: "var(--ink)", textDecoration: "underline" }}>dashboard</Link>.
      </P>
      <CodeBlock lang="http" snippet={`Authorization: Bearer aiq_your_api_key_here`} />
      <div style={{
        marginTop: 20, padding: "16px 20px",
        background: "var(--signal-dim)",
        border: "1px solid var(--ink)",
        borderRadius: 4,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink-deep)", marginBottom: 6,
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <AiqIcon name="key" size={14} />
          Security
        </div>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
          lineHeight: 1.55, color: "var(--ink-deep)",
          margin: 0,
        }}>
          Keys carry full account access. Do not ship them in client-side code or public repositories. If a key is exposed, revoke it from the dashboard — revocation is instant.
        </p>
      </div>
    </Block>
  );
}

/* ─────── Endpoint ─────── */

function Endpoint() {
  return (
    <Block
      id="endpoint"
      eyebrow="Endpoint"
      title={<>One endpoint. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>One verb.</em></>}
    >
      <div style={{
        border: "1px solid var(--border)",
        background: "var(--bg-off)",
        padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--signal-ink)", background: "var(--signal)",
          padding: "4px 9px", borderRadius: 2,
        }}>POST</span>
        <code style={{
          fontFamily: "var(--mono)", fontSize: 14, fontWeight: 500,
          color: "var(--ink-deep)", letterSpacing: "0.02em",
        }}>
          https://www.area-iq.co.uk/api/v1/report
        </code>
      </div>
      <P>
        HTTPS only. Plain HTTP is rejected. Content-Type must be <IC>application/json</IC>.
      </P>
    </Block>
  );
}

/* ─────── Request body ─────── */

const FIELDS: { name: string; type: string; required: boolean; desc: React.ReactNode }[] = [
  { name: "area",   type: "string", required: true, desc: <>UK area name or postcode. e.g. <IC>&quot;Shoreditch&quot;</IC>, <IC>&quot;SW1A 1AA&quot;</IC>, <IC>&quot;Manchester city centre&quot;</IC>. Max 100 characters.</> },
  { name: "intent", type: "string", required: true, desc: <>One of: <IC>moving</IC> · <IC>business</IC> · <IC>investing</IC> · <IC>research</IC>. Determines which five dimensions get computed and how they&apos;re weighted.</> },
];

const INTENT_TABLE: { code: string; label: string; dims: string }[] = [
  { code: "moving",    label: "Moving home",        dims: "Safety · Schools · Transport · Amenities · Cost of Living" },
  { code: "business",  label: "Opening a business", dims: "Foot Traffic · Competition · Access · Spending Power · Costs" },
  { code: "investing", label: "Property investing", dims: "Price Growth · Rental Yield · Regeneration · Demand · Risk" },
  { code: "research",  label: "Research profile",   dims: "Safety · Transport · Amenities · Demographics · Environment" },
];

function RequestBody() {
  return (
    <Block
      id="request"
      eyebrow="Request body"
      title={<>Two fields. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>That&apos;s the contract.</em></>}
    >
      <div style={{
        border: "1px solid var(--border)", marginBottom: 24,
      }} className="aiq-field-table">
        <div style={{
          display: "grid",
          gridTemplateColumns: "120px 80px 90px 1fr",
          gap: 16, padding: "12px 18px",
          background: "var(--bg-off)",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <span>Field</span><span>Type</span><span>Required</span><span>Description</span>
        </div>
        {FIELDS.map((f, i) => (
          <div key={f.name} style={{
            display: "grid",
            gridTemplateColumns: "120px 80px 90px 1fr",
            gap: 16, padding: "14px 18px", alignItems: "flex-start",
            borderBottom: i === FIELDS.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: "var(--bg)",
          }}>
            <code style={{
              fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
              color: "var(--ink-deep)",
            }}>{f.name}</code>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 12,
              color: "var(--text-3)",
            }}>{f.type}</span>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: f.required ? "var(--ink)" : "var(--text-3)",
            }}>{f.required ? "Yes" : "No"}</span>
            <span style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
            }}>{f.desc}</span>
          </div>
        ))}
      </div>

      <h3 style={{
        fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "0 0 14px",
      }}>Intent types + their dimensions</h3>
      <div style={{ border: "1px solid var(--border)" }}>
        {INTENT_TABLE.map((it, i) => (
          <div key={it.code} style={{
            display: "grid",
            gridTemplateColumns: "120px 200px 1fr",
            gap: 20, padding: "14px 18px", alignItems: "center",
            borderBottom: i === INTENT_TABLE.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          }}>
            <code style={{
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "3px 8px", borderRadius: 2,
              justifySelf: "start",
            }}>{it.code}</code>
            <span style={{
              fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
              letterSpacing: "-0.01em", color: "var(--ink-deep)",
            }}>{it.label}</span>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 400,
              color: "var(--text-2)",
            }}>{it.dims}</span>
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ─────── Response ─────── */

const RESPONSE_JSON = `{
  "id": "rpt_1709834567_a1b2c3",
  "report": {
    "area":          "Shoreditch, London",
    "intent":        "business",
    "area_type":     "urban",
    "areaiq_score":  74,
    "sub_scores": [
      {
        "label":     "Foot Traffic & Demand",
        "score":     82,
        "weight":    30,
        "reasoning": "45,000 daily commuters via Liverpool Street station. 23 restaurants within 500m suggests strong baseline footfall."
      },
      { "label": "Competition Density", "score": 68, "weight": 20, "reasoning": "…" },
      { "label": "Transport & Access",  "score": 79, "weight": 15, "reasoning": "…" },
      { "label": "Local Spending Power","score": 71, "weight": 20, "reasoning": "…" },
      { "label": "Commercial Costs",    "score": 62, "weight": 15, "reasoning": "…" }
    ],
    "summary":         "Shoreditch scores 74/100 for business viability …",
    "sections":        [ { "title": "Location & Demographics", "content": "…" } ],
    "recommendations": [ "Consider locations east of Shoreditch High Street …" ],
    "property_data":   { "median_price": 645000, "price_change_pct": 1.8 },
    "schools_data":    { "rating_breakdown": { ... } },
    "data_sources":    [ "postcodes.io", "police.uk", "IMD 2025", "OpenStreetMap",
                         "Environment Agency", "HM Land Registry", "Ofsted" ],
    "data_freshness":  [ { "source": "Police", "period": "12mo", "status": "live" } ],
    "generated_at":    "2026-04-23T12:34:56.789Z"
  }
}`;

const RESPONSE_FIELDS: { path: string; type: string; desc: string }[] = [
  { path: "id",                             type: "string",      desc: "Unique report ID. Prefixed rpt_." },
  { path: "report.area",                    type: "string",      desc: "Normalised area name." },
  { path: "report.intent",                  type: "string",      desc: "Intent type used for scoring." },
  { path: "report.area_type",               type: "string",      desc: "urban | suburban | rural — benchmark category." },
  { path: "report.areaiq_score",            type: "number",      desc: "Overall weighted score 0–100 (integer)." },
  { path: "report.sub_scores[]",            type: "SubScore[]",  desc: "Exactly five dimensions keyed to the intent." },
  { path: "report.sub_scores[].label",      type: "string",      desc: "Dimension name — varies per intent." },
  { path: "report.sub_scores[].score",      type: "number",      desc: "Dimension score 0–100 (integer)." },
  { path: "report.sub_scores[].weight",     type: "number",      desc: "Relative weight. Sums to 100 across all five." },
  { path: "report.sub_scores[].reasoning",  type: "string",      desc: "Data-backed explanation for this score." },
  { path: "report.summary",                 type: "string",      desc: "2–3 sentence executive summary." },
  { path: "report.sections[]",              type: "Section[]",   desc: "4–6 detailed analysis sections." },
  { path: "report.recommendations[]",       type: "string[]",    desc: "3+ actionable recommendations." },
  { path: "report.property_data",           type: "object",      desc: "Median sold price + YoY change + transaction counts." },
  { path: "report.schools_data",            type: "object",      desc: "Schools within 1.5km with Ofsted ratings (England)." },
  { path: "report.data_sources[]",          type: "string[]",    desc: "Datasets that contributed to this report." },
  { path: "report.data_freshness[]",        type: "Freshness[]", desc: "Per-source period + status (live/recent/static)." },
  { path: "report.generated_at",            type: "string",      desc: "ISO 8601 timestamp." },
];

function ResponseShape() {
  return (
    <Block
      id="response"
      eyebrow="Response"
      title={<>A score, five dimensions, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>and the reasoning.</em></>}
    >
      <P>
        A successful request returns <IC>200 OK</IC> with a report ID and the full report object.
      </P>

      <h3 style={{
        fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "22px 0 14px",
      }}>Schema</h3>

      <div style={{ border: "1px solid var(--border)", marginBottom: 28 }}>
        {RESPONSE_FIELDS.map((f, i) => (
          <div key={f.path} style={{
            display: "grid",
            gridTemplateColumns: "240px 120px 1fr",
            gap: 16, padding: "10px 18px", alignItems: "flex-start",
            borderBottom: i === RESPONSE_FIELDS.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          }}>
            <code style={{
              fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 500,
              color: "var(--ink-deep)",
              paddingLeft: f.path.split(".").length > 2 ? 16 : 0,
            }}>{f.path}</code>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 11.5,
              color: "var(--text-3)",
            }}>{f.type}</span>
            <span style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
            }}>{f.desc}</span>
          </div>
        ))}
      </div>

      <h3 style={{
        fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "0 0 14px",
      }}>Example response</h3>
      <CodeBlock lang="json" snippet={RESPONSE_JSON} />
    </Block>
  );
}

/* ─────── Errors ─────── */

const ERRORS: { code: string; status: string; desc: string }[] = [
  { code: "200", status: "OK",           desc: "Report generated." },
  { code: "400", status: "Bad Request",  desc: "Missing or invalid area / intent field." },
  { code: "401", status: "Unauthorized", desc: "Missing, invalid, or revoked API key." },
  { code: "403", status: "Forbidden",    desc: "Active API plan required (Developer / Business / Growth)." },
  { code: "429", status: "Rate Limited", desc: "30 req/min exceeded. Retry-After header included." },
  { code: "500", status: "Server Error", desc: "Internal error. Retry, or contact support." },
];

function Errors() {
  return (
    <Block
      id="errors"
      eyebrow="Errors"
      title={<>Clear codes, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>one error field.</em></>}
    >
      <P>
        Non-2xx responses return a JSON object with a single <IC>error</IC> field describing the issue.
      </P>
      <div style={{ border: "1px solid var(--border)", marginBottom: 20 }}>
        {ERRORS.map((e, i) => {
          const colour = e.code.startsWith("2") ? "var(--ink)"
                        : e.code.startsWith("4") ? "#b38700"
                        : "#b42318";
          return (
            <div key={e.code} style={{
              display: "grid",
              gridTemplateColumns: "60px 170px 1fr",
              gap: 16, padding: "12px 18px", alignItems: "center",
              borderBottom: i === ERRORS.length - 1 ? "none" : "1px solid var(--border-dim)",
              background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
            }}>
              <code style={{
                fontFamily: "var(--mono)", fontSize: 13, fontWeight: 500,
                color: colour,
              }}>{e.code}</code>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--ink-deep)",
              }}>{e.status}</span>
              <span style={{
                fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
                lineHeight: 1.5, color: "var(--text-2)",
              }}>{e.desc}</span>
            </div>
          );
        })}
      </div>
      <CodeBlock lang="json" snippet={`{\n  "error": "Missing required field: area (string)"\n}`} />
    </Block>
  );
}

/* ─────── Rate limits ─────── */

function RateLimits() {
  return (
    <Block
      id="rate-limits"
      eyebrow="Rate limits"
      title={<>Per key, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>sliding window.</em></>}
    >
      <P>
        The API allows 30 requests per minute per key, tracked as a sliding window. Every response carries <IC>X-RateLimit-Limit</IC>, <IC>X-RateLimit-Remaining</IC>, and <IC>X-RateLimit-Reset</IC> headers. 429 responses include a <IC>Retry-After</IC> header.
      </P>
      <P>
        The embeddable widget has its own ceiling — 60 requests per hour per origin, cache-only — so public embeds on your property listings never consume API quota.
      </P>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0, border: "1px solid var(--border)",
        marginTop: 8,
      }} className="aiq-rl-grid">
        {[
          { metric: "API",          limit: "30 req / minute", note: "Per key, sliding window" },
          { metric: "Widget",       limit: "60 req / hour",   note: "Per origin, cache-only" },
          { metric: "Cache TTL",    limit: "24 hours",        note: "Cache hits don't count against quota" },
        ].map((r, i) => (
          <div key={r.metric} style={{
            padding: "20px 22px",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
            background: "var(--bg)",
          }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-3)", marginBottom: 10,
            }}>{r.metric}</div>
            <div style={{
              fontFamily: "var(--display)", fontSize: 22, fontWeight: 500,
              letterSpacing: "-0.014em", color: "var(--ink-deep)",
              marginBottom: 4,
            }}>{r.limit}</div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 13, fontWeight: 400,
              color: "var(--text-2)", lineHeight: 1.45,
            }}>{r.note}</div>
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ─────── Data sources ─────── */

const DOCS_DS: { icon: IconName; name: string; provider: string; use: string }[] = [
  { icon: "map",        name: "Postcodes.io",        provider: "ONS / Royal Mail",        use: "Geocoding, ward, LSOA, constituency, region, country." },
  { icon: "support",    name: "Police.uk",           provider: "Home Office",             use: "Street-level crime, 12-month rolling window, category breakdown." },
  { icon: "researcher", name: "IMD 2025 / WIMD / SIMD", provider: "MHCLG via ArcGIS",     use: "Deprivation rank + decile. Covers England, Wales, Scotland." },
  { icon: "operator",   name: "OpenStreetMap",       provider: "Overpass API",            use: "Schools, amenities, transport stops within 0.5–2km." },
  { icon: "intent",     name: "Environment Agency",  provider: "Defra",                   use: "Flood risk zones + active flood warnings." },
  { icon: "investor",   name: "HM Land Registry",    provider: "SPARQL endpoint",         use: "Sold prices by postcode district, property types, YoY trends." },
  { icon: "read",       name: "Ofsted",              provider: "Dept for Education",      use: "School inspections within 1.5km. England today." },
];

function DataSources() {
  return (
    <Block
      id="data-sources"
      eyebrow="Data sources"
      title={<>Seven datasets. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>All public.</em></>}
    >
      <P>
        Every response carries a <IC>data_sources</IC> array and a <IC>data_freshness</IC> block so you can audit exactly which dataset contributed to which claim.
      </P>
      <div style={{
        border: "1px solid var(--border)", marginTop: 8,
      }}>
        {DOCS_DS.map((d, i) => (
          <div key={d.name} style={{
            display: "grid",
            gridTemplateColumns: "44px 200px 1fr",
            gap: 18, alignItems: "center",
            padding: "14px 18px",
            borderBottom: i === DOCS_DS.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          }}>
            <AiqIcon name={d.icon} size={20} />
            <div>
              <div style={{
                fontFamily: "var(--display)", fontSize: 16, fontWeight: 500,
                letterSpacing: "-0.01em", color: "var(--ink-deep)",
              }}>{d.name}</div>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--text-3)", marginTop: 2,
              }}>{d.provider}</div>
            </div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
            }}>{d.use}</div>
          </div>
        ))}
      </div>
    </Block>
  );
}

/* ─────── Widget ─────── */

const WIDGET_HTML = `<!-- Where the widget should render -->
<div
  data-areaiq-postcode="SW1A 1AA"
  data-areaiq-intent="moving"
></div>

<!-- Before </body> -->
<script src="https://www.area-iq.co.uk/widget.js"></script>`;

const WIDGET_MULTI = `<div data-areaiq-postcode="E1 6AN"   data-areaiq-intent="investing"></div>
<div data-areaiq-postcode="SW11 1AA" data-areaiq-intent="moving"></div>
<div data-areaiq-postcode="M1 1AD"   data-areaiq-intent="business"
     data-areaiq-theme="light"></div>

<script src="https://www.area-iq.co.uk/widget.js"></script>`;

const WIDGET_ATTRS: { attr: string; required: boolean; desc: string }[] = [
  { attr: "data-areaiq-postcode", required: true,  desc: "UK postcode or area name." },
  { attr: "data-areaiq-intent",   required: false, desc: "moving (default) · business · investing · research." },
  { attr: "data-areaiq-theme",    required: false, desc: "dark (default) · light." },
];

function Widget() {
  return (
    <Block
      id="widget"
      eyebrow="Drop-in widget"
      title={<>One script tag. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>No API key on the client.</em></>}
    >
      <P>
        The widget renders a score card on any page. It reads from the 24-hour cache only — embed traffic never hits live compute, so your quota stays intact.
      </P>
      <h3 style={{
        fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "18px 0 10px",
      }}>Basic usage</h3>
      <CodeBlock lang="html" snippet={WIDGET_HTML} />

      <h3 style={{
        fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "26px 0 10px",
      }}>Attributes</h3>
      <div style={{ border: "1px solid var(--border)", marginBottom: 8 }}>
        {WIDGET_ATTRS.map((a, i) => (
          <div key={a.attr} style={{
            display: "grid",
            gridTemplateColumns: "240px 100px 1fr",
            gap: 16, padding: "12px 18px", alignItems: "center",
            borderBottom: i === WIDGET_ATTRS.length - 1 ? "none" : "1px solid var(--border-dim)",
            background: i % 2 === 0 ? "var(--bg)" : "var(--bg-off)",
          }}>
            <code style={{
              fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 500,
              color: "var(--ink-deep)",
            }}>{a.attr}</code>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: a.required ? "var(--ink)" : "var(--text-3)",
            }}>{a.required ? "Required" : "Optional"}</span>
            <span style={{
              fontFamily: "var(--sans)", fontSize: 13.5, fontWeight: 400,
              lineHeight: 1.5, color: "var(--text-2)",
            }}>{a.desc}</span>
          </div>
        ))}
      </div>

      <h3 style={{
        fontFamily: "var(--display)", fontSize: 18, fontWeight: 500,
        letterSpacing: "-0.012em", color: "var(--ink-deep)",
        margin: "26px 0 10px",
      }}>Multiple widgets on one page</h3>
      <CodeBlock lang="html" snippet={WIDGET_MULTI} />
    </Block>
  );
}

/* ─────── Code examples ─────── */

const EX_CURL = `curl -X POST https://www.area-iq.co.uk/api/v1/report \\
  -H "Authorization: Bearer aiq_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "area":   "Shoreditch",
    "intent": "business"
  }'`;

const EX_NODE = `const response = await fetch("https://www.area-iq.co.uk/api/v1/report", {
  method: "POST",
  headers: {
    "Authorization": "Bearer aiq_your_api_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    area:   "Camden",
    intent: "investing",
  }),
});

const { id, report } = await response.json();

console.log(report.areaiq_score);       // 72
console.log(report.sub_scores.length);  // 5
console.log(report.recommendations);    // ["Consider …", …]`;

const EX_PY = `import requests

response = requests.post(
    "https://www.area-iq.co.uk/api/v1/report",
    headers={"Authorization": "Bearer aiq_your_api_key"},
    json={"area": "Camden", "intent": "investing"},
)

data = response.json()
report = data["report"]

print(f"Score: {report['areaiq_score']}/100")
print(f"Dimensions: {len(report['sub_scores'])}")

for sub in report["sub_scores"]:
    print(f"  {sub['label']}: {sub['score']}/100")`;

const EX_GO = `payload := map[string]string{
    "area":   "Manchester",
    "intent": "moving",
}

body, _ := json.Marshal(payload)
req, _ := http.NewRequest("POST", "https://www.area-iq.co.uk/api/v1/report", bytes.NewBuffer(body))
req.Header.Set("Authorization", "Bearer aiq_your_api_key")
req.Header.Set("Content-Type", "application/json")

resp, _ := http.DefaultClient.Do(req)
defer resp.Body.Close()

var result map[string]interface{}
json.NewDecoder(resp.Body).Decode(&result)`;

function CodeExamples() {
  return (
    <Block
      id="examples"
      eyebrow="Code examples"
      title={<>Any HTTP client. <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>No SDK required.</em></>}
    >
      <P>
        The API speaks plain JSON over HTTPS. Use whatever HTTP client your stack prefers. Below: cURL, Node.js, Python, and Go.
      </P>
      <TabbedCode tabs={[
        { label: "cURL",       lang: "bash",       snippet: EX_CURL },
        { label: "Node.js",    lang: "typescript", snippet: EX_NODE },
        { label: "Python",     lang: "python",     snippet: EX_PY   },
        { label: "Go",         lang: "go",         snippet: EX_GO   },
      ]} />
    </Block>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section style={{
      background: "var(--ink-deep)",
      padding: "100px 0 120px",
      position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: -180, left: "50%",
          transform: "translateX(-50%)",
          width: 880, height: 560,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.12) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "0 40px",
        textAlign: "center", position: "relative", zIndex: 1,
      }}>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(34px, 4.4vw, 52px)", lineHeight: 1.04,
          letterSpacing: "-0.02em", color: "#FFFFFF",
          margin: "0 0 16px",
        }}>
          Grab a key. <em style={{
            fontStyle: "italic", color: "var(--signal)",
          }}>Start building.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
          lineHeight: 1.55, color: "rgba(255,255,255,0.64)",
          margin: "0 auto 30px", maxWidth: "48ch",
        }}>
          Developer plan starts at £49/mo for 100 reports. Cached hits and widget embeds are free on top.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
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
            See the plans
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
