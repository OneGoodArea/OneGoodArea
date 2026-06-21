"use client";

import type { ReactElement } from "react";
import type { PlanId } from "@/lib/stripe";
import "./plan-grid.css";

/* Shared plan-grid primitive (AR-204 close-out sweep 3/16).
   Used on /pricing (mode="marketing") and /dashboard/billing
   (mode="billing"). Single source of truth for the public V2 plan
   display, so the two surfaces never drift.

   Brand v3 redesign: each card carries a bespoke dot-and-hairline
   SVG illustration in the brand product-icon vocabulary (same
   family as SignalsIcon / ScoresIcon / MonitorIcon /
   IntelligenceIcon, and the 6 principle illustrations on /about).
   Illustrations escalate in density across the 5 tiers, visualising
   "scaling complexity" — Sandbox is a single eval dot, Growth is
   a full constellation.

   Hover states: card lifts subtly, border brightens, illustration
   intensifies. Highlighted plan (Build) carries a top accent rule,
   slightly deeper background, and a filled-ink CTA.

   Self-contained CSS animations (oga-spin) so the spinner survives
   the .aiq-block strip at the end of the sweep. */

export type DisplayPlan = {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  reports: string;
  perReport?: string;
  blurb: string;
  cta: string;
  ctaBilling?: string;
  highlight?: boolean;
  disabled?: boolean;
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

/* ============================================================
   Per-plan bespoke illustrations — dot-and-hairline vocabulary.
   Density escalates with tier ("scaling complexity"). All 32x32
   viewBox, currentColor stroke/fill so they invert with the
   card's text colour.
   ============================================================ */

const VIZ_BASE = {
  className: "oga-plan-card__viz-svg",
  viewBox: "0 0 32 32",
  fill: "none",
  "aria-hidden": true as const,
};

function VizSandbox() {
  /* One dashed dot in a sparse 5x5 grid — "evaluation, single
     pulse, not yet productionised". */
  return (
    <svg {...VIZ_BASE}>
      <g fill="currentColor" opacity="0.18">
        <circle cx="6"  cy="16" r="0.9" />
        <circle cx="11" cy="16" r="0.9" />
        <circle cx="21" cy="16" r="0.9" />
        <circle cx="26" cy="16" r="0.9" />
      </g>
      <circle cx="16" cy="16" r="2.4" fill="none" stroke="currentColor" strokeWidth="0.9" strokeDasharray="2 2" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

function VizStarter() {
  /* Two dots forming a starter pair with a hairline connector. */
  return (
    <svg {...VIZ_BASE}>
      <g fill="currentColor" opacity="0.22">
        <circle cx="6"  cy="22" r="0.9" />
        <circle cx="26" cy="22" r="0.9" />
        <circle cx="6"  cy="10" r="0.9" />
        <circle cx="26" cy="10" r="0.9" />
      </g>
      <line x1="11" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" />
      <circle cx="11" cy="16" r="1.6" fill="currentColor" />
      <circle cx="21" cy="16" r="1.6" fill="currentColor" />
    </svg>
  );
}

function VizBuild() {
  /* Triangle of 3 dots, denser ambient field. The build phase
     (small team in production). */
  return (
    <svg {...VIZ_BASE}>
      <g fill="currentColor" opacity="0.22">
        <circle cx="6"  cy="6"  r="0.9" />
        <circle cx="26" cy="6"  r="0.9" />
        <circle cx="6"  cy="26" r="0.9" />
        <circle cx="26" cy="26" r="0.9" />
        <circle cx="16" cy="6"  r="0.9" />
        <circle cx="6"  cy="16" r="0.9" />
      </g>
      <g stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.55">
        <line x1="11" y1="11" x2="21" y2="11" />
        <line x1="11" y1="11" x2="16" y2="21" />
        <line x1="21" y1="11" x2="16" y2="21" />
      </g>
      <circle cx="11" cy="11" r="1.7" fill="currentColor" />
      <circle cx="21" cy="11" r="1.7" fill="currentColor" />
      <circle cx="16" cy="21" r="1.9" fill="currentColor" />
    </svg>
  );
}

function VizScale() {
  /* 5-dot mesh with cross-connectors. Mid-tier — multiple
     systems integrating. */
  return (
    <svg {...VIZ_BASE}>
      <g fill="currentColor" opacity="0.2">
        <circle cx="6"  cy="6"  r="0.9" />
        <circle cx="26" cy="26" r="0.9" />
        <circle cx="16" cy="6"  r="0.9" />
        <circle cx="16" cy="26" r="0.9" />
      </g>
      <g stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.45">
        <line x1="8"  y1="10" x2="24" y2="22" />
        <line x1="24" y1="10" x2="8"  y2="22" />
        <line x1="8"  y1="10" x2="24" y2="10" />
        <line x1="8"  y1="22" x2="24" y2="22" />
      </g>
      <circle cx="8"  cy="10" r="1.6" fill="currentColor" />
      <circle cx="24" cy="10" r="1.6" fill="currentColor" />
      <circle cx="8"  cy="22" r="1.6" fill="currentColor" />
      <circle cx="24" cy="22" r="1.6" fill="currentColor" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" />
    </svg>
  );
}

function VizGrowth() {
  /* Hub-and-spoke constellation — 7 surfaced dots + ambient field.
     High-volume — the platform fully wired. */
  return (
    <svg {...VIZ_BASE}>
      <g fill="currentColor" opacity="0.2">
        <circle cx="4"  cy="4"  r="0.8" />
        <circle cx="28" cy="4"  r="0.8" />
        <circle cx="4"  cy="28" r="0.8" />
        <circle cx="28" cy="28" r="0.8" />
        <circle cx="16" cy="4"  r="0.8" />
        <circle cx="4"  cy="16" r="0.8" />
        <circle cx="28" cy="16" r="0.8" />
        <circle cx="16" cy="28" r="0.8" />
      </g>
      <g stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.45">
        <line x1="8"  y1="8"  x2="16" y2="16" />
        <line x1="24" y1="8"  x2="16" y2="16" />
        <line x1="8"  y1="24" x2="16" y2="16" />
        <line x1="24" y1="24" x2="16" y2="16" />
        <line x1="16" y1="9"  x2="16" y2="16" />
        <line x1="16" y1="23" x2="16" y2="16" />
      </g>
      <g fill="currentColor">
        <circle cx="8"  cy="8"  r="1.5" />
        <circle cx="24" cy="8"  r="1.5" />
        <circle cx="8"  cy="24" r="1.5" />
        <circle cx="24" cy="24" r="1.5" />
        <circle cx="16" cy="9"  r="1.4" />
        <circle cx="16" cy="23" r="1.4" />
        <circle cx="16" cy="16" r="2.4" />
      </g>
    </svg>
  );
}

export const PLAN_VIZ: Record<PlanId, () => ReactElement> = {
  // legacy v1 plans never render through this grid, but the type
  // requires we map every PlanId. They alias to the closest v2 viz.
  free:        VizSandbox,
  starter:     VizStarter,
  pro:         VizStarter,
  developer:   VizBuild,
  business:    VizScale,
  growth:      VizGrowth,
  sandbox:     VizSandbox,
  starter_v2:  VizStarter,
  build:       VizBuild,
  scale:       VizScale,
  growth_v2:   VizGrowth,
  enterprise:  VizGrowth,
};

export function PlanGrid({
  plans,
  currentPlan,
  loading,
  mode,
  onSelect,
}: {
  plans: DisplayPlan[];
  currentPlan: string | null;
  loading: string | null;
  mode: PlanGridMode;
  onSelect: (id: PlanId) => void;
}) {
  return (
    <section className="oga-plan-grid">
      <div className="oga-plan-grid__inner">
        <div
          className="oga-plan-grid__cards"
          data-cols={plans.length}
        >
          {plans.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              mode={mode}
              isCurrent={currentPlan === p.id}
              isLoading={loading === p.id}
              onClick={() => onSelect(p.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PlanCard({
  plan,
  mode,
  isCurrent,
  isLoading,
  onClick,
}: {
  plan: DisplayPlan;
  mode: PlanGridMode;
  isCurrent: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  const ctaLabel =
    mode === "billing" && plan.ctaBilling ? plan.ctaBilling : plan.cta;
  const buttonDisabled = plan.disabled || isCurrent || isLoading;
  const Viz = PLAN_VIZ[plan.id] ?? VizSandbox;

  const cardClasses = [
    "oga-plan-card",
    plan.highlight ? "oga-plan-card--highlight" : "",
    isCurrent ? "oga-plan-card--current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const buttonClasses = [
    "oga-plan-card__cta",
    plan.highlight ? "oga-plan-card__cta--primary" : "",
    isCurrent ? "oga-plan-card__cta--current" : "",
    plan.disabled ? "oga-plan-card__cta--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClasses}>
      {plan.highlight && (
        <span className="oga-plan-card__accent" aria-hidden />
      )}

      <div className="oga-plan-card__viz">
        <Viz />
      </div>

      <div className="oga-plan-card__head">
        <span className="oga-plan-card__name">{plan.name}</span>
        {plan.highlight && !isCurrent && (
          <span className="oga-plan-card__pill oga-plan-card__pill--popular">
            Popular
          </span>
        )}
        {isCurrent && (
          <span className="oga-plan-card__pill oga-plan-card__pill--current">
            Current
          </span>
        )}
      </div>

      <div className="oga-plan-card__price-row">
        <span className="oga-plan-card__price">{plan.price}</span>
        <span className="oga-plan-card__cadence">{plan.cadence}</span>
      </div>

      <div className="oga-plan-card__reports">{plan.reports}</div>
      {plan.perReport && (
        <div className="oga-plan-card__per-report">{plan.perReport}</div>
      )}

      <p className="oga-plan-card__blurb">{plan.blurb}</p>

      <div className="oga-plan-card__spacer" aria-hidden />

      <button
        type="button"
        onClick={onClick}
        disabled={buttonDisabled}
        className={buttonClasses}
      >
        {isLoading ? (
          <Spinner />
        ) : isCurrent ? (
          "Current plan"
        ) : (
          <>
            {ctaLabel}
            {!plan.disabled && (
              <span aria-hidden className="oga-plan-card__cta-arrow">
                →
              </span>
            )}
          </>
        )}
      </button>
    </article>
  );
}

export function Spinner() {
  return <span className="oga-plan-spinner" aria-hidden />;
}
