"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PlanId } from "@/lib/stripe";
import { AppShell, AppCard } from "../_shared/app-shell";
import {
  DISPLAY_PLANS,
  PLAN_VIZ,
  type DisplayPlan,
} from "../_shared/plan-grid";
import { McpAddOnSection, type McpStatus } from "../_shared/mcp-addon-section";
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

function Body({ plan, planName, used, limit, mcp }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get("plan") as PlanId | null;

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  /* If the URL plan matches what the user already has, drop the
     query so the confirm panel doesn't pretend they need to switch
     to their own plan. */
  useEffect(() => {
    if (requestedPlan && requestedPlan === plan) {
      router.replace("/dashboard/billing");
    }
  }, [requestedPlan, plan, router]);

  const requestedDisplayPlan = requestedPlan
    ? DISPLAY_PLANS.find((p) => p.id === requestedPlan) ?? null
    : null;
  const showConfirmPanel = !!requestedDisplayPlan && requestedPlan !== plan;

  async function continueToCheckout(planId: PlanId) {
    if (planId === "sandbox") {
      router.push("/dashboard");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Could not start checkout. Try again.");
        setCheckoutLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError("Could not start checkout. Try again.");
      setCheckoutLoading(false);
    } catch {
      setCheckoutError("Network error. Try again.");
      setCheckoutLoading(false);
    }
  }

  function handlePlanSelect(planId: PlanId) {
    if (planId === plan) return;
    router.push(`/dashboard/billing?plan=${encodeURIComponent(planId)}`);
  }

  function dismissConfirm() {
    setCheckoutError(null);
    router.replace("/dashboard/billing");
  }

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

      {showConfirmPanel && requestedDisplayPlan ? (
        <ConfirmPanel
          plan={requestedDisplayPlan}
          loading={checkoutLoading}
          error={checkoutError}
          onContinue={() => continueToCheckout(requestedDisplayPlan.id)}
          onDismiss={dismissConfirm}
        />
      ) : null}

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

      <AppCard title="Switch plan" noPad>
        <PlanList
          plans={DISPLAY_PLANS}
          currentPlan={plan}
          onSelect={handlePlanSelect}
        />
        <div className="oga-billing__compare-foot">
          Need the full feature comparison?{" "}
          <Link
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="oga-billing__compare-link"
          >
            Open pricing page <span aria-hidden>↗</span>
          </Link>
        </div>
      </AppCard>

      <McpAddOnSection mcp={mcp} />
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

/* ============================================================
   Plan list (compact rows — replaces the marketing PlanGrid)
   ============================================================ */
function PlanList({
  plans,
  currentPlan,
  onSelect,
}: {
  plans: DisplayPlan[];
  currentPlan: string | null;
  onSelect: (id: PlanId) => void;
}) {
  return (
    <ul className="oga-billing__plans">
      {plans.map((p) => {
        const isCurrent = currentPlan === p.id;
        const Viz = PLAN_VIZ[p.id];
        return (
          <li key={p.id} className="oga-billing__plan-row" data-current={isCurrent}>
            <span className="oga-billing__plan-glyph" aria-hidden>
              {Viz ? <Viz /> : null}
            </span>
            <div className="oga-billing__plan-meta">
              <span className="oga-billing__plan-name">{p.name}</span>
              <span className="oga-billing__plan-tagline">{p.blurb}</span>
            </div>
            <span className="oga-billing__plan-price">{p.price}</span>
            {isCurrent ? (
              <span className="oga-billing__plan-current-chip">Current</span>
            ) : p.disabled ? (
              <span className="oga-billing__plan-disabled">Contact sales</span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className="oga-billing__btn-ghost"
              >
                Switch
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================
   Confirm panel (shown when ?plan=<id> is in the URL)
   ============================================================ */
function ConfirmPanel({
  plan,
  loading,
  error,
  onContinue,
  onDismiss,
}: {
  plan: DisplayPlan;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="oga-billing__confirm" role="status">
      <div className="oga-billing__confirm-head">
        <span className="oga-billing__row-label">Switching to</span>
        <span className="oga-billing__confirm-plan">{plan.name}</span>
        <span className="oga-billing__confirm-price">{plan.price}</span>
      </div>
      <p className="oga-billing__confirm-body">
        We&apos;ll redirect you to Stripe&apos;s hosted checkout to enter
        card details and confirm. You&apos;ll come back to the dashboard
        when payment succeeds.
      </p>
      {error ? (
        <p className="oga-billing__confirm-error" role="alert">{error}</p>
      ) : null}
      <div className="oga-billing__confirm-actions">
        <button
          type="button"
          onClick={onContinue}
          disabled={loading}
          className="oga-billing__btn-primary"
        >
          {loading ? "Opening…" : "Continue to Stripe"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={loading}
          className="oga-billing__btn-ghost"
        >
          Choose a different plan
        </button>
      </div>
    </div>
  );
}
