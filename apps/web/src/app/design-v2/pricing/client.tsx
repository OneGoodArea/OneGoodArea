"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { PlanId } from "@/lib/stripe";
import { Styles } from "../_shared/styles";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { AiqIcon, type IconName } from "../_shared/icons";
import { DISPLAY_PLANS, PlanGrid, type DisplayPlan } from "../_shared/plan-grid";

/* ═══════════════════════════════════════════════════════════════
   OneGoodArea · Design V2 · /pricing
   Marketing-only surface. Authenticated upgrades happen at
   /dashboard/billing (AR-145). Plan grid + card definitions live
   in _shared/plan-grid.tsx so this page and the in-app billing
   page can never drift.
   ═══════════════════════════════════════════════════════════════ */

type Row = { label: string; values: (string | boolean)[]; sub?: string; icon?: IconName };

// Columns: Sandbox · Starter · Build · Scale · Growth (5 tiers).
// CRITICAL RULE (per feedback_no_invented_claims.md): only list features that
// are SHIPPED. No "coming soon" rows in this comparison table. Roadmap items
// belong in a separate Roadmap section, NEVER as gated features in this table.
const API_FEATURES: Row[] = [
  { label: "API calls / month",          values: ["250", "1,500", "6,000", "25,000", "100,000"],                  icon: "data" },
  { label: "Effective £ per call",       values: ["—", "£0.033", "£0.025", "£0.020", "£0.015"],                    icon: "gauge" },
  { label: "REST API + Bearer auth",     values: [true, true, true, true, true],            sub: "JSON in/out, OpenAPI 3.0 spec", icon: "api" },
  { label: "5-dimension scoring engine", values: [true, true, true, true, true],            sub: "Confidence per dimension, source attribution, version stamp", icon: "intent" },
  { label: "7 public datasets",          values: [true, true, true, true, true],            sub: "Postcodes.io · Police.uk · IMD · OSM · Land Registry · EA · Ofsted", icon: "map" },
  { label: "Drop-in widget (CORS)",      values: [true, true, true, true, true],            sub: "Cache-only, 60/hr per origin", icon: "widget" },
  { label: "API keys",                   values: ["1", "1", "5", "10", "25"],                icon: "key" },
  { label: "30 req/min rate limit",      values: [true, true, true, true, true],            sub: "Per key, sliding window", icon: "gauge" },
  { label: "24-hour response cache",     values: [true, true, true, true, true],            sub: "Cache hits don't count against quota", icon: "cache" },
  { label: "Email support",              values: ["community", "community", "5-day", "48h", "24h"], icon: "support" },
  { label: "MCP server access",          values: ["add-on", "add-on", "add-on", "add-on", true],     sub: "Claude Desktop / Cursor / any MCP client. £29/mo add-on for Sandbox/Starter/Build/Scale; included free on Growth and Enterprise.", icon: "api" },
];

/* ─────── Root ─────── */

export default function PricingClient() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/usage").then(r => r.json()).then(data => {
      if (data?.plan) setCurrentPlan(data.plan);
    }).catch(() => setCurrentPlan("free"));
  }, [isSignedIn]);

  /* Marketing-page click-through (AR-147). Never opens Stripe Checkout from
     here — that lives at /dashboard/billing now. Anonymous users go through
     sign-up; signed-in users go straight to the in-app billing surface with
     the chosen plan pre-selected so they hit the confirm panel. */
  function handleSelect(planId: PlanId) {
    if (planId === "sandbox") {
      window.location.href = isSignedIn ? `/dashboard` : `/sign-up?plan=sandbox`;
      return;
    }
    const billingTarget = `/dashboard/billing?plan=${encodeURIComponent(planId)}`;
    if (!isSignedIn) {
      window.location.href = `/sign-up?callbackUrl=${encodeURIComponent(billingTarget)}`;
      return;
    }
    window.location.href = billingTarget;
  }

  return (
    <div className="aiq">
      <Styles />
      <Nav />
      <Hero />
      <PlanGrid
        plans={DISPLAY_PLANS}
        currentPlan={currentPlan}
        loading={null}
        mode="marketing"
        onSelect={handleSelect}
      />
      <EnterpriseCallout />
      <FeatureTable plans={DISPLAY_PLANS} rows={API_FEATURES} />
      <RetiredPlansNotice />
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
          API pricing · GBP · cancel any time
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
          margin: "0 auto", maxWidth: "66ch",
        }}>
          Developer tier to evaluate. Production tiers to ship customer-facing surfaces. Enterprise for portfolio scale and contract terms. Every tier ships the seven public datasets, four intent modes, engine version pinning, and per-dimension confidence. Your price is your monthly call volume; everything else is included.
        </p>
      </div>
    </section>
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
          background: "var(--bg-ink)", color: "#FFFFFF",
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
              From £4,999 / month, 250,000+ calls, <em style={{ fontStyle: "italic", color: "var(--signal)" }}>custom contract.</em>
            </div>
            <div style={{
              fontFamily: "var(--sans)", fontSize: 14,
              color: "rgba(255,255,255,0.64)", lineHeight: 1.5,
            }}>
              Annual contract with negotiated overage and volume pricing. Custom MSA, signed DPA, security review pack on request, methodology pinning by engine version, full audit trail per request. Named technical contact for support and integration. Address-level scoring on the v3 roadmap. Built for challenger lenders, mid-market InsureTech, and PropTech platforms running portfolio-scale workloads.
            </div>
          </div>
          <a
            href="mailto:operation@onegoodarea.co.uk?subject=Enterprise API pricing"
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

function FeatureTable({ plans, rows }: {
  plans: DisplayPlan[]; rows: Row[];
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
              Integration features, <em style={{ fontStyle: "italic", color: "var(--ink)", borderBottom: "2.5px solid var(--signal)" }}>side by side.</em>
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

/* ─────── Retired plans notice ─────── */

function RetiredPlansNotice() {
  return (
    <section style={{
      background: "var(--bg)",
      borderTop: "1px solid var(--border-dim)",
      padding: "28px 0",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "0 40px",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--text-3)", margin: 0, lineHeight: 1.7,
        }}>
          Web report plans were retired April 2026.
          {" "}Existing subscribers continue on their current plan.
          {" "}Contact{" "}
          <a
            href="mailto:operation@onegoodarea.co.uk?subject=Plan migration"
            style={{
              color: "var(--ink)", textDecoration: "underline",
              textUnderlineOffset: 3, textDecorationColor: "var(--border)",
            }}
          >operation@onegoodarea.co.uk</a>
          {" "}to migrate.
        </p>
      </div>
    </section>
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
          Read the docs, grab a key, ship a request in minutes. No card to start. Decide after you&apos;ve seen the JSON.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={isSignedIn ? "/" : "/sign-up"}
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
            href="/business"
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
