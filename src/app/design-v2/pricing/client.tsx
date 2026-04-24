"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /pricing
   Two audiences (web reports / API access), shared visual system.
   Preserves Stripe checkout wiring + session-aware CTAs.
   ═══════════════════════════════════════════════════════════════ */

type PlanId =
  | "free" | "starter" | "pro"
  | "developer" | "business" | "growth";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  reports: string;
  perReport?: string;
  blurb: string;
  cta: string;
  highlight?: boolean;
  disabled?: boolean;
};

const WEB_PLANS: Plan[] = [
  { id: "free",    name: "Free",    price: "£0",  cadence: "forever", reports: "3 reports / month",  blurb: "Kick the tyres. A few reports a month, all data sources, no card required.", cta: "Start free", disabled: true },
  { id: "starter", name: "Starter", price: "£29", cadence: "/ month", reports: "20 reports / month", blurb: "For freelance agents, landlords, and the occasional move.", cta: "Get Starter" },
  { id: "pro",     name: "Pro",     price: "£79", cadence: "/ month", reports: "75 reports / month", blurb: "For agencies and active investors scoring areas regularly.", cta: "Upgrade to Pro", highlight: true },
];

const API_PLANS: Plan[] = [
  { id: "developer", name: "Developer", price: "£49",  cadence: "/ month", reports: "100 reports / month",  perReport: "£0.49 each", blurb: "For solo devs and small PropTech prototypes.", cta: "Start building" },
  { id: "business",  name: "Business",  price: "£249", cadence: "/ month", reports: "500 reports / month",  perReport: "£0.50 each", blurb: "For platforms and integrations with steady traffic.", cta: "Get Business", highlight: true },
  { id: "growth",    name: "Growth",    price: "£499", cadence: "/ month", reports: "1,500 reports / month", perReport: "£0.33 each", blurb: "For portals and high-volume surfaces.", cta: "Get Growth" },
];

type Row = { label: string; values: (string | boolean)[]; sub?: string; icon?: IconName };

const WEB_FEATURES: Row[] = [
  { label: "Reports / month",            values: ["3", "20", "75"],           icon: "data" },
  { label: "Seven public datasets",      values: [true, true, true],          sub: "Postcodes.io · Police.uk · IMD · OSM · Land Registry · EA · Ofsted", icon: "map" },
  { label: "All four intent modes",      values: [true, true, true],          sub: "Moving · Business · Investing · Research", icon: "intent" },
  { label: "Same answer every time",     values: [true, true, true],          sub: "Public-data formulas. Score is reproducible.", icon: "repeat" },
  { label: "Share & email delivery",     values: [true, true, true],          sub: "WhatsApp, LinkedIn, X, direct link, email", icon: "share" },
  { label: "Watchlist & CSV export",     values: [true, true, true],          sub: "Save areas, filter, export", icon: "watchlist" },
  { label: "Data freshness badges",      values: [true, true, true],          sub: "Source + age on every datapoint", icon: "fresh" },
  { label: "PDF export",                 values: [false, true, true],         sub: "Branded report as PDF", icon: "pdf" },
  { label: "Area comparison",            values: [false, true, true],         sub: "Side-by-side intelligence", icon: "compare" },
  { label: "Property market data",       values: [false, false, true],        sub: "Land Registry sold prices + YoY", icon: "investor" },
  { label: "Ofsted school ratings",      values: [true, true, true],          sub: "Within 1.5km (England)", icon: "researcher" },
];

const API_FEATURES: Row[] = [
  { label: "API reports / month",        values: ["100", "500", "1,500"],     icon: "data" },
  { label: "REST API access",            values: [true, true, true],          sub: "Bearer token, JSON in/out", icon: "api" },
  { label: "API key management",         values: [true, true, true],          sub: "Create, revoke, rotate", icon: "key" },
  { label: "Full API documentation",     values: [true, true, true],          sub: "Routes, params, response shapes", icon: "read" },
  { label: "30 req/min rate limit",      values: [true, true, true],          sub: "Per key, sliding window", icon: "gauge" },
  { label: "24-hour response cache",     values: [true, true, true],          sub: "Cache hits don't count against quota", icon: "cache" },
  { label: "Seven public datasets",      values: [true, true, true],          sub: "Postcodes.io · Police.uk · IMD · OSM · Land Registry · EA · Ofsted", icon: "map" },
  { label: "Written narrative",          values: [true, true, true],          sub: "Plain-English read with cited facts", icon: "read" },
  { label: "Usage dashboard",            values: [true, true, true],          sub: "30-day trend + per-key breakdown", icon: "dash" },
  { label: "Drop-in widget",             values: [true, true, true],          sub: "CORS-enabled, cache-only, 60/hr per origin", icon: "widget" },
  { label: "Priority support",           values: [false, true, true],         sub: "Faster response times", icon: "support" },
];

/* ─────── Root ─────── */

export default function PricingClient() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [tab, setTab] = useState<"web" | "api">("web");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/usage").then(r => r.json()).then(data => {
      if (data?.plan) {
        setCurrentPlan(data.plan);
        if (["developer", "business", "growth"].includes(data.plan)) setTab("api");
      }
    }).catch(() => setCurrentPlan("free"));
  }, [isSignedIn]);

  async function handleUpgrade(planId: PlanId) {
    if (planId === "free" || loading) return;
    if (!isSignedIn) {
      window.location.href = `/design-v2/sign-in?callbackUrl=/design-v2/pricing`;
      return;
    }
    setLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(null);
        return;
      }
      if (data.url) window.location.href = data.url;
      else { setError("Failed to start checkout."); setLoading(null); }
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(null);
    }
  }

  const plans    = tab === "web" ? WEB_PLANS : API_PLANS;
  const features = tab === "web" ? WEB_FEATURES : API_FEATURES;

  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <AudienceSwitch tab={tab} setTab={setTab} />
      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
      <PlanGrid
        plans={plans}
        tab={tab}
        currentPlan={currentPlan}
        loading={loading}
        onUpgrade={handleUpgrade}
      />
      {tab === "api" && <EnterpriseCallout />}
      <FeatureTable plans={plans} rows={features} tab={tab} />
      <Faq />
      <FinalCta isSignedIn={isSignedIn} />
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
          position: "absolute", top: -240, left: "50%",
          transform: "translateX(-50%)",
          width: 900, height: 680,
          background: "radial-gradient(ellipse at center, rgba(212,243,58,0.18) 0%, rgba(212,243,58,0) 60%)",
        }} />
      </div>
      <div style={{
        maxWidth: 900, margin: "0 auto",
        padding: "112px 40px 56px",
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
          Pricing · GBP · cancel any time
        </div>
        <h1 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(44px, 5.8vw, 72px)", lineHeight: 1.02,
          letterSpacing: "-0.02em", color: "var(--ink-deep)",
          margin: "0 0 22px",
        }}>
          Pay for{" "}
          <span style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "3px solid var(--signal)", paddingBottom: 2,
          }}>volume.</span>
          <br />
          Everything else is included.
        </h1>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 17.5, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          letterSpacing: "-0.005em",
          margin: "0 auto", maxWidth: "58ch",
        }}>
          Every plan ships the seven public datasets, four intent modes, the written narrative, and the watchlist. Your price is your quota, nothing more.
        </p>
      </div>
    </section>
  );
}

/* ─────── Audience switch ─────── */

function AudienceSwitch({ tab, setTab }: {
  tab: "web" | "api"; setTab: (t: "web" | "api") => void;
}) {
  return (
    <section style={{
      background: "var(--bg)",
      padding: "24px 0 8px",
      display: "flex", justifyContent: "center",
    }}>
      <div style={{
        display: "inline-flex", padding: 4,
        background: "var(--bg-off)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        gap: 2,
      }}>
        {[
          { id: "web" as const, label: "For readers", sub: "Web reports" },
          { id: "api" as const, label: "For builders", sub: "API + widget" },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: active ? "var(--signal-ink)" : "var(--text-2)",
                background: active ? "var(--signal)" : "transparent",
                padding: "10px 20px", borderRadius: 999,
                border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 10,
                transition: "background 180ms ease, color 180ms ease",
              }}
            >
              <span>{t.label}</span>
              <span aria-hidden style={{
                width: 1, height: 10,
                background: active ? "rgba(26,38,0,0.28)" : "var(--border)",
              }} />
              <span style={{
                fontSize: 10.5,
                color: active ? "rgba(26,38,0,0.72)" : "var(--text-3)",
                letterSpacing: "0.12em",
              }}>{t.sub}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ─────── Error banner ─────── */

function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div style={{
      maxWidth: 1100, margin: "20px auto 0", padding: "0 40px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px",
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 4,
      }}>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 12,
          color: "#b42318", letterSpacing: "-0.005em",
        }}>{error}</span>
        <button onClick={onDismiss} style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "#b42318", background: "transparent", border: "none",
          cursor: "pointer", padding: "4px 8px",
        }}>Dismiss</button>
      </div>
    </div>
  );
}

/* ─────── Plan grid ─────── */

function PlanGrid({
  plans, tab, currentPlan, loading, onUpgrade,
}: {
  plans: Plan[]; tab: "web" | "api";
  currentPlan: string | null; loading: string | null;
  onUpgrade: (id: PlanId) => void;
}) {
  return (
    <section style={{
      background: "var(--bg)",
      padding: "48px 0 80px",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div className="aiq-plan-grid" style={{
          display: "grid",
          gridTemplateColumns: `repeat(${plans.length}, 1fr)`,
          gap: 0, border: "1px solid var(--border)",
        }}>
          {plans.map((p, i) => (
            <PlanCard
              key={p.id}
              plan={p}
              isLast={i === plans.length - 1}
              isCurrent={currentPlan === p.id}
              isLoading={loading === p.id}
              onClick={() => onUpgrade(p.id)}
            />
          ))}
        </div>
        <div style={{
          marginTop: 18, display: "flex", gap: 22, flexWrap: "wrap",
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <span>✓ Billed monthly</span>
          <span>✓ Cancel any time</span>
          <span>✓ No setup fee</span>
          {tab === "api" && <span>✓ Cached hits free</span>}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan, isLast, isCurrent, isLoading, onClick }: {
  plan: Plan; isLast: boolean; isCurrent: boolean; isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <div style={{
      padding: "34px 30px 32px",
      borderRight: !isLast ? "1px solid var(--border)" : "none",
      background: plan.highlight ? "var(--bg-off)" : "var(--bg)",
      position: "relative",
      display: "flex", flexDirection: "column", gap: 14,
      minHeight: 380,
    }}>
      {plan.highlight && (
        <span aria-hidden style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 3, background: "var(--signal)",
        }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--text-2)",
        }}>{plan.name}</div>
        {plan.highlight && !isCurrent && (
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--ink)", background: "var(--signal-dim)",
            padding: "3px 7px 2px", borderRadius: 2,
          }}>Popular</span>
        )}
        {isCurrent && (
          <span style={{
            fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "3px 7px 2px", borderRadius: 2,
          }}>Current</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{
          fontFamily: "var(--display)", fontSize: 52, fontWeight: 500,
          letterSpacing: "-0.024em", color: "var(--ink-deep)", lineHeight: 1,
        }}>{plan.price}</span>
        <span style={{
          fontFamily: "var(--mono)", fontSize: 12,
          color: "var(--text-3)", letterSpacing: "0.04em",
        }}>{plan.cadence}</span>
      </div>
      <div style={{
        fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
        letterSpacing: "0.04em", color: "var(--ink)",
      }}>{plan.reports}</div>
      {plan.perReport && (
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10.5,
          color: "var(--text-3)",
        }}>{plan.perReport}</div>
      )}
      <p style={{
        fontFamily: "var(--sans)", fontSize: 14, fontWeight: 400,
        lineHeight: 1.5, color: "var(--text-2)",
        letterSpacing: "-0.003em", margin: 0,
      }}>{plan.blurb}</p>
      <div style={{ flex: 1 }} />
      <button
        onClick={onClick}
        disabled={plan.disabled || isCurrent || isLoading}
        style={{
          width: "100%", height: 44,
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: isCurrent
            ? "var(--ink)"
            : plan.highlight ? "var(--signal-ink)" : "var(--ink-deep)",
          background: isCurrent
            ? "var(--signal-dim)"
            : plan.highlight ? "var(--signal)" : "transparent",
          border: isCurrent
            ? "1px solid var(--ink)"
            : plan.highlight
              ? "1px solid var(--ink-deep)"
              : "1px solid var(--border)",
          borderRadius: 999, cursor: (plan.disabled || isCurrent || isLoading) ? "default" : "pointer",
          opacity: plan.disabled ? 0.45 : 1,
          transition: "background 140ms ease, border-color 140ms ease, transform 140ms cubic-bezier(0.16,1,0.3,1)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
        onMouseEnter={(e) => {
          if (plan.disabled || isCurrent || isLoading) return;
          if (!plan.highlight) {
            e.currentTarget.style.background = "var(--bg-off)";
            e.currentTarget.style.borderColor = "var(--ink)";
          } else {
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (plan.disabled || isCurrent || isLoading) return;
          if (!plan.highlight) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border)";
          } else {
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        {isLoading ? <Spinner /> : isCurrent ? "Current plan" : plan.cta}
        {!isLoading && !isCurrent && !plan.disabled && (
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: "50%",
      border: "1.5px solid currentColor", borderTopColor: "transparent",
      display: "inline-block",
      animation: "aiq-spin 800ms linear infinite",
    }} />
  );
}

/* ─────── Enterprise callout (API tab) ─────── */

function EnterpriseCallout() {
  return (
    <section style={{
      background: "var(--bg)",
      padding: "0 0 80px",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          background: "var(--ink-deep)", color: "#FFFFFF",
          padding: "34px 40px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 28, flexWrap: "wrap",
          position: "relative", overflow: "hidden",
          borderRadius: 4,
        }}>
          <div aria-hidden style={{
            position: "absolute", top: -140, right: -120,
            width: 440, height: 440,
            background: "radial-gradient(circle, rgba(212,243,58,0.16) 0%, rgba(212,243,58,0) 62%)",
          }} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: "56ch" }}>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(212,243,58,0.92)", marginBottom: 10,
            }}>
              Enterprise
            </div>
            <div style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: 26, letterSpacing: "-0.014em", lineHeight: 1.2,
              color: "#FFFFFF", marginBottom: 6,
            }}>
              5,000+ reports, SLAs, <em style={{ fontStyle: "italic", color: "var(--signal)" }}>annual contracts.</em>
            </div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 14,
              color: "rgba(255,255,255,0.64)", lineHeight: 1.5,
            }}>
              Dedicated support, volume pricing, bespoke integration help. Drop us a line and we&apos;ll put a proposal together.
            </div>
          </div>
          <a
            href="mailto:hello@area-iq.co.uk?subject=Enterprise API pricing"
            style={{
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "13px 22px", borderRadius: 999, textDecoration: "none",
              border: "1px solid var(--signal)",
              display: "inline-flex", alignItems: "center", gap: 9,
              position: "relative", zIndex: 1,
              transition: "transform 140ms cubic-bezier(0.16,1,0.3,1)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Contact sales
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ─────── Feature comparison ─────── */

function FeatureTable({ plans, rows, tab }: {
  plans: Plan[]; rows: Row[]; tab: "web" | "api";
}) {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      padding: "96px 0",
    }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 40px" }}>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 36, gap: 20, flexWrap: "wrap",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-2)", marginBottom: 12,
              display: "inline-flex", alignItems: "center", gap: 9,
            }}>
              <span aria-hidden style={{
                width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
              }} />
              What&apos;s in every plan
            </div>
            <h2 style={{
              fontFamily: "var(--display)", fontWeight: 400,
              fontSize: "clamp(28px, 3.6vw, 40px)", lineHeight: 1.08,
              letterSpacing: "-0.016em", color: "var(--ink-deep)",
              margin: 0, maxWidth: "26ch",
            }}>
              {tab === "web"
                ? <>Read-level features, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>side by side.</em></>
                : <>Integration features, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>side by side.</em></>}
            </h2>
          </div>
        </div>

        <div className="aiq-feature-table" style={{
          border: "1px solid var(--border)", background: "var(--bg)",
        }}>
          <div className="aiq-feat-row aiq-feat-head" style={{
            display: "grid",
            gridTemplateColumns: `minmax(0, 1fr) repeat(${plans.length}, 140px)`,
            gap: 18, padding: "16px 26px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-off)",
          }}>
            <span style={{
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: "var(--text-3)",
            }}>Feature</span>
            {plans.map((p) => (
              <span key={p.id} style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.22em", textTransform: "uppercase",
                color: p.highlight ? "var(--ink-deep)" : "var(--text-3)",
                textAlign: "center",
              }}>{p.name}</span>
            ))}
          </div>

          {rows.map((row, i) => (
            <div key={row.label} className="aiq-feat-row" style={{
              display: "grid",
              gridTemplateColumns: `minmax(0, 1fr) repeat(${plans.length}, 140px)`,
              gap: 18, padding: "18px 26px", alignItems: "center",
              borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-dim)",
            }}>
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 12,
              }}>
                {row.icon && (
                  <div style={{ paddingTop: 2, flexShrink: 0 }}>
                    <AiqIcon name={row.icon} size={18} />
                  </div>
                )}
                <div>
                  <div style={{
                    fontFamily: "var(--sans)", fontSize: 14.5, fontWeight: 500,
                    color: "var(--ink-deep)", letterSpacing: "-0.005em",
                    lineHeight: 1.35,
                  }}>{row.label}</div>
                  {row.sub && (
                    <div style={{
                      fontFamily: "var(--mono)", fontSize: 11,
                      color: "var(--text-3)", letterSpacing: "0.02em",
                      marginTop: 3,
                    }}>{row.sub}</div>
                  )}
                </div>
              </div>
              {row.values.map((v, j) => (
                <div key={j} style={{
                  display: "flex", justifyContent: "center", alignItems: "center",
                }}>
                  {typeof v === "string" ? (
                    <span style={{
                      fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
                      letterSpacing: "-0.012em", color: "var(--ink-deep)",
                    }}>{v}</span>
                  ) : v ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <circle cx="8" cy="8" r="7" fill="var(--signal)" />
                      <path d="M5 8.2 L7 10.2 L11.2 6" stroke="var(--signal-ink)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <span aria-hidden style={{
                      width: 14, height: 1.5, background: "var(--border-dim)",
                    }} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── FAQ ─────── */

const FAQS: { q: string; a: string }[] = [
  { q: "What counts as a report?",
    a: "One postcode scored for one intent. If you run the same postcode under two intents, that's two reports. Repeat queries of the same postcode+intent inside 24 hours come from the cache and don't count." },
  { q: "Can I change plans?",
    a: "Any time. Upgrades prorate immediately, downgrades take effect at the end of the billing cycle. Cancelling stops renewal, and you keep access until the cycle ends." },
  { q: "What happens if I hit the limit?",
    a: "You'll see a clear \"upgrade to continue\" message. Nothing breaks, no overage charges. Your next report waits for the next cycle or a plan change." },
  { q: "Do cached API responses count?",
    a: "No. Cache hits on the 24-hour window are free. Your quota only decrements on live computations. Embeds via the widget never hit your quota (widget is cache-only by design)." },
  { q: "Is my payment information secure?",
    a: "All billing is handled by Stripe. We never see or store your card. Cancel, upgrade, and manage payment methods from the billing portal linked inside the app." },
  { q: "Can I get a refund?",
    a: "We refund unused portions on a case-by-case basis. Drop us a line within 14 days of a charge and we'll sort it. No dark patterns." },
];

function Faq() {
  return (
    <section style={{
      background: "var(--bg)",
      padding: "120px 0",
    }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "var(--text-2)", marginBottom: 14,
            display: "inline-flex", alignItems: "center", gap: 9,
          }}>
            <span aria-hidden style={{
              width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
            }} />
            Frequently asked
          </div>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 400,
            fontSize: "clamp(32px, 4.2vw, 48px)", lineHeight: 1.04,
            letterSpacing: "-0.018em", color: "var(--ink-deep)",
            margin: 0,
          }}>
            Questions <em style={{
              fontStyle: "italic", color: "var(--ink)",
              borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
            }}>before you pay.</em>
          </h2>
        </div>

        <div style={{ border: "1px solid var(--border)" }}>
          {FAQS.map((item, i) => (
            <FaqRow key={item.q} item={item} index={i} isLast={i === FAQS.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqRow({ item, index, isLast }: {
  item: { q: string; a: string }; index: number; isLast: boolean;
}) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div style={{
      borderBottom: isLast ? "none" : "1px solid var(--border)",
      background: "var(--bg)",
    }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          width: "100%", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          gap: 20, padding: "26px 32px",
          background: "transparent", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 18,
        }}>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.18em", color: "var(--text-3)",
          }}>0{index + 1}</span>
          <span style={{
            fontFamily: "var(--display)", fontSize: 20, fontWeight: 500,
            letterSpacing: "-0.012em", color: "var(--ink-deep)",
            lineHeight: 1.2,
          }}>{item.q}</span>
        </span>
        <span aria-hidden style={{
          width: 26, height: 26,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--border)", borderRadius: "50%",
          color: "var(--ink)", fontFamily: "var(--sans)", fontSize: 14,
          transition: "transform 240ms cubic-bezier(0.16,1,0.3,1), background 140ms ease",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
          background: open ? "var(--signal-dim)" : "transparent",
          flexShrink: 0,
        }}>+</span>
      </button>
      <div style={{
        maxHeight: open ? 400 : 0, overflow: "hidden",
        transition: "max-height 320ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          padding: "0 32px 28px 72px",
          fontFamily: "var(--sans)", fontSize: 15, fontWeight: 400,
          lineHeight: 1.55, color: "var(--text-2)",
          letterSpacing: "-0.003em", maxWidth: "68ch",
        }}>{item.a}</div>
      </div>
    </div>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section style={{
      background: "var(--bg-off)",
      borderTop: "1px solid var(--border)",
      padding: "100px 0 120px",
    }}>
      <div style={{
        maxWidth: 820, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--display)", fontWeight: 400,
          fontSize: "clamp(34px, 4.4vw, 52px)", lineHeight: 1.06,
          letterSpacing: "-0.018em", color: "var(--ink-deep)",
          margin: "0 0 16px",
        }}>
          Start with a <em style={{
            fontStyle: "italic", color: "var(--ink)",
            borderBottom: "2.5px solid var(--signal)", paddingBottom: 1,
          }}>single postcode.</em>
        </h2>
        <p style={{
          fontFamily: "var(--sans)", fontSize: 16, fontWeight: 400,
          lineHeight: 1.5, color: "var(--text-2)",
          letterSpacing: "-0.003em",
          margin: "0 auto 32px", maxWidth: "52ch",
        }}>
          Three reports a month are free. No card, no timer. Decide after you&apos;ve seen one.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={isSignedIn ? "/design-v2" : "/sign-up"}
            style={{
              fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--signal-ink)", background: "var(--signal)",
              padding: "14px 24px", borderRadius: 999, textDecoration: "none",
              border: "1px solid var(--ink-deep)",
              display: "inline-flex", alignItems: "center", gap: 9,
              transition: "transform 140ms cubic-bezier(0.16,1,0.3,1)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            {isSignedIn ? "Try a postcode" : "Start free"}
            <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>→</span>
          </Link>
          <Link
            href="/design-v2/business"
            style={{
              fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: "var(--ink)", background: "transparent",
              padding: "14px 24px", borderRadius: 999, textDecoration: "none",
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
            For businesses
          </Link>
        </div>
      </div>
    </section>
  );
}
