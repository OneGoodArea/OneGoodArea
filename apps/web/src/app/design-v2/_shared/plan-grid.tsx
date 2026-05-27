"use client";

import React from "react";
import type { PlanId } from "@/lib/stripe";

/* Shared plan grid + plan card + spinner. Used on the marketing /pricing page
   (mode="marketing") and the in-app /dashboard/billing surface (mode="billing").
   Single source of truth for the public V2 plan display, so the two surfaces
   never drift. */

export type DisplayPlan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  reports: string;
  perReport?: string;
  blurb: string;
  /* Marketing CTA copy (e.g., "Get Build"). */
  cta: string;
  /* Billing-mode CTA override (e.g., "Switch to Build"). Falls back to cta. */
  ctaBilling?: string;
  highlight?: boolean;
  disabled?: boolean;
  /* Free tier: no Stripe checkout, parent decides where to route. */
  free?: boolean;
};

export const DISPLAY_PLANS: DisplayPlan[] = [
  { id: "sandbox",    name: "Sandbox",  price: "£0",     cadence: "forever",   reports: "35 calls / month",      perReport: "no card required", blurb: "Evaluate the API across a handful of postcodes and intents. Hard cap.",  cta: "Start free", ctaBilling: "Sandbox", free: true },
  { id: "starter_v2", name: "Starter",  price: "£49",    cadence: "/ month",   reports: "1,500 calls / month",   perReport: "£0.033 per call",  blurb: "Indie devs and small PropTech in early production.",                    cta: "Start building", ctaBilling: "Switch to Starter" },
  { id: "build",      name: "Build",    price: "£149",   cadence: "/ month",   reports: "6,000 calls / month",   perReport: "£0.025 per call",  blurb: "Niche PropTech, small InsureTech MGA, small CRE team.",                 cta: "Get Build", ctaBilling: "Switch to Build", highlight: true },
  { id: "scale",      name: "Scale",    price: "£499",   cadence: "/ month",   reports: "25,000 calls / month",  perReport: "£0.020 per call",  blurb: "Mid-tier challenger lender, mid insurer, mid PropTech.",                cta: "Get Scale", ctaBilling: "Switch to Scale" },
  { id: "growth_v2",  name: "Growth",   price: "£1,499", cadence: "/ month",   reports: "100,000 calls / month", perReport: "£0.015 per call",  blurb: "Larger lenders, regional InsureTech, scaling PropTech.",                cta: "Get Growth", ctaBilling: "Switch to Growth" },
];

export type PlanGridMode = "marketing" | "billing";

export function PlanGrid({
  plans, currentPlan, loading, mode, onSelect,
}: {
  plans: DisplayPlan[];
  currentPlan: string | null;
  loading: string | null;
  mode: PlanGridMode;
  onSelect: (id: PlanId) => void;
}) {
  return (
    <section style={{ background: "var(--bg)", padding: "48px 0 80px" }}>
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
              mode={mode}
              isLast={i === plans.length - 1}
              isCurrent={currentPlan === p.id}
              isLoading={loading === p.id}
              onClick={() => onSelect(p.id)}
            />
          ))}
        </div>
        <div style={{
          marginTop: 18, display: "flex", gap: 22, flexWrap: "wrap",
          fontFamily: "var(--mono)", fontSize: 10.5, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--text-3)",
        }}>
          <span>{"✓"} Billed monthly</span>
          <span>{"✓"} Cancel any time</span>
          <span>{"✓"} No setup fee</span>
          <span>{"✓"} Cached hits free</span>
        </div>
      </div>
    </section>
  );
}

export function PlanCard({
  plan, mode, isLast, isCurrent, isLoading, onClick,
}: {
  plan: DisplayPlan;
  mode: PlanGridMode;
  isLast: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const ctaLabel = mode === "billing" && plan.ctaBilling ? plan.ctaBilling : plan.cta;
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
        {isLoading ? <Spinner /> : isCurrent ? "Current plan" : ctaLabel}
        {!isLoading && !isCurrent && !plan.disabled && (
          <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{"→"}</span>
        )}
      </button>
    </div>
  );
}

export function Spinner() {
  return (
    <span style={{
      width: 14, height: 14, borderRadius: "50%",
      border: "1.5px solid currentColor", borderTopColor: "transparent",
      display: "inline-block",
      animation: "aiq-spin 800ms linear infinite",
    }} />
  );
}
