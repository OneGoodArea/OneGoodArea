"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/stripe";
import { AppShell, AppCard } from "../_shared/app-shell";
import { BookDemo } from "../_shared/book-demo";
import type { McpStatus } from "../_shared/mcp-addon-section";
import "./billing.css";

/* /dashboard/billing — AR-280 rebuild.

   Pre-AR-280 the page mixed brand-v3 product framing with the
   shared marketing PlanGrid + a dark CurrentPlanStrip + sans
   pill buttons. None of that matched the operational mono-caps
   vocabulary the rest of the dashboard now uses. This file is the
   wholesale visual rewrite: AppCard sections, brand mono-caps
   buttons, a compact local PlanList in place of the marketing
   PlanGrid, tighter spacing. Functional flows unchanged: Stripe
   Checkout + Stripe Portal + the ?plan= confirm-and-go shape. */

type Props = {
  plan: PlanId;
  planName: string;
  used: number;
  limit: number;
  mcp: McpStatus;
};

export default function BillingClient(props: Props) {
  return (
    <AppShell>
      <Body {...props} />
    </AppShell>
  );
}

/* Reuses the exact "billing" path data from NavIconDark (the
   sidebar's Billing glyph: a credit card with magstripe + chip),
   scaled from 16x16 to 56x56 inside the 64x64 boxed mark. */
function BillingMark() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="8" width="20" height="13" rx="1.5" />
      <path d="M4 12.5 H24" />
      <rect x="6" y="16" width="6" height="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Body({ plan, planName, used, limit }: Props) {
  const [portalLoading, setPortalLoading] = useState(false);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPortalLoading(false);
    } catch {
      setPortalLoading(false);
    }
  }

  const onPaidPlan = plan !== "sandbox" && plan !== "free";

  return (
    <div className="oga-billing">
      <header className="oga-billing__product">
        <span className="oga-billing__product-mark" aria-hidden>
          <BillingMark />
        </span>
        <div className="oga-billing__product-text">
          <span className="oga-billing__product-eyebrow">Account</span>
          <h2 className="oga-billing__product-title">Billing</h2>
          <p className="oga-billing__product-tagline">
            Your plan, monthly usage, and add-ons. Stripe owns the payment
            step and the card on file. Clicking{" "}
            <strong>Continue to Stripe</strong> redirects to their hosted
            checkout and back to the dashboard.
          </p>
        </div>
      </header>

      <AppCard title="Current plan" noPad>
        <CurrentPlanContent
          planName={planName}
          used={used}
          limit={limit}
          onBilling={openPortal}
          billingLoading={portalLoading}
          showManage={onPaidPlan}
        />
      </AppCard>

      <AppCard title="Change plan">
        <p className="oga-billing__compare-foot">
          OneGoodArea is sold through a demo and an annual contract. To change
          your plan or discuss a package,{" "}
          <BookDemo className="oga-billing__compare-link">book a demo</BookDemo>.
        </p>
      </AppCard>
    </div>
  );
}

/* ============================================================
   Current plan content (inside an AppCard)
   ============================================================ */
function CurrentPlanContent({
  planName,
  used,
  limit,
  onBilling,
  billingLoading,
  showManage,
}: {
  planName: string;
  used: number;
  limit: number;
  onBilling: () => void;
  billingLoading: boolean;
  showManage: boolean;
}) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const tone: "strong" | "moderate" | "weak" =
    pct >= 90 ? "weak" : pct >= 70 ? "moderate" : "strong";

  return (
    <div className="oga-billing__current">
      <div className="oga-billing__current-left">
        <span className="oga-billing__row-label">Plan</span>
        <span className="oga-billing__current-plan">{planName}</span>
      </div>

      <div className="oga-billing__current-mid">
        <div className="oga-billing__row-head">
          <span className="oga-billing__row-label">Monthly usage</span>
          {!unlimited ? (
            <span className="oga-billing__current-pct" data-tone={tone}>
              {Math.round(pct)}%
            </span>
          ) : null}
        </div>
        <div className="oga-billing__current-counts">
          <span className="oga-billing__current-used">{used.toLocaleString()}</span>
          <span className="oga-billing__current-limit">
            / {unlimited ? "∞" : limit.toLocaleString()}
          </span>
        </div>
        <div className="oga-billing__bar">
          <div
            className="oga-billing__bar-fill"
            data-tone={tone}
            style={{ width: unlimited ? "0%" : `${pct}%` }}
          />
        </div>
        <span className="oga-billing__current-reset">
          Resets on the 1st of the month
        </span>
      </div>

      <div className="oga-billing__current-right">
        {showManage ? (
          <button
            type="button"
            onClick={onBilling}
            disabled={billingLoading}
            className="oga-billing__btn-primary"
          >
            {billingLoading ? "Opening…" : "Manage on Stripe"}
          </button>
        ) : (
          <span className="oga-billing__current-hint">
            Manage card + invoices appears here once you upgrade.
          </span>
        )}
      </div>
    </div>
  );
}

