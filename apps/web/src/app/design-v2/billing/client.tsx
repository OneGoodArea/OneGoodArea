"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PlanId } from "@/lib/stripe";
import { AppShell } from "../_shared/app-shell";
import {
  DISPLAY_PLANS,
  PlanGrid,
  type DisplayPlan,
  Spinner,
} from "../_shared/plan-grid";
import { McpAddOnSection, type McpStatus } from "../_shared/mcp-addon-section";
import "./billing.css";

/* /billing — Brand v3 rewrite (AR-204 close-out 8/15).

   In-app billing surface. Lean by design: current plan + plan grid
   + MCP add-on + manage-subscription. The full feature comparison
   lives at /pricing and opens in a new tab so users don't lose
   their place. Stripe Checkout fires from this surface only (never
   from the marketing page). When ?plan=<id> is in the URL, a
   confirm panel is shown above the grid — never auto-fires checkout.

   Per the dashboard proposal (PR #104), this page may move from
   /billing -> /dashboard/billing in a future restructure. Shape
   preserved. */

type Props = {
  plan: PlanId;
  planName: string;
  used: number;
  limit: number;
  mcp: McpStatus;
};

export default function BillingClient(props: Props) {
  return (
    <AppShell
      title="Billing"
      subtitle="Manage your plan, MCP add-on, and subscription."
    >
      <Body {...props} />
    </AppShell>
  );
}

function Body({ plan, planName, used, limit, mcp }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlan = searchParams.get("plan") as PlanId | null;

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  /* If the URL plan matches what the user already has, drop the query so the
     confirm panel doesn't pretend they need to switch to their own plan. */
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
        setCheckoutError(data.error || "Could not start checkout. Please try again.");
        setCheckoutLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError("Could not start checkout. Please try again.");
      setCheckoutLoading(false);
    } catch {
      setCheckoutError("Network error. Please try again.");
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
      {showConfirmPanel && requestedDisplayPlan && (
        <ConfirmPanel
          plan={requestedDisplayPlan}
          loading={checkoutLoading}
          error={checkoutError}
          onContinue={() => continueToCheckout(requestedDisplayPlan.id)}
          onDismiss={dismissConfirm}
        />
      )}

      <CurrentPlanStrip
        planName={planName}
        used={used}
        limit={limit}
        onBilling={openPortal}
        billingLoading={portalLoading}
        showManage={onPaidPlan}
      />

      <PlanGrid
        plans={DISPLAY_PLANS}
        currentPlan={plan}
        loading={null}
        mode="billing"
        onSelect={handlePlanSelect}
      />

      <FullComparisonLink />

      <McpAddOnSection mcp={mcp} />
    </div>
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
    <div className="oga-billing__confirm" data-oga-surface="dark">
      <div className="oga-billing__confirm-body">
        <div className="oga-billing__confirm-eyebrow">
          <span aria-hidden className="oga-billing__confirm-eyebrow-dot" />
          <span>You picked</span>
        </div>
        <div className="oga-billing__confirm-title">
          {plan.name} <span className="oga-billing__confirm-price">· {plan.price}</span>{" "}
          <span className="oga-billing__confirm-cadence">{plan.cadence}</span>
        </div>
        <div className="oga-billing__confirm-meta">
          {plan.reports}
          {plan.perReport ? ` · ${plan.perReport}` : ""}
        </div>
        {error && <div className="oga-billing__confirm-error">{error}</div>}
      </div>

      <div className="oga-billing__confirm-actions">
        <button
          type="button"
          onClick={onContinue}
          disabled={loading}
          className="oga-billing__confirm-primary"
        >
          {loading ? <Spinner /> : "Continue to Stripe"}
          {!loading && <span aria-hidden>→</span>}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={loading}
          className="oga-billing__confirm-ghost"
        >
          Choose a different plan
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Current plan strip (DARK, 2-col)
   ============================================================ */
function CurrentPlanStrip({
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
    <div
      className="oga-billing__current"
      data-oga-surface="dark"
      data-tone={tone}
    >
      <div className="oga-billing__current-col">
        <div className="oga-billing__current-eyebrow">
          <span aria-hidden className="oga-billing__current-eyebrow-dot" />
          <span>Current plan</span>
        </div>
        <div className="oga-billing__current-plan">{planName}</div>
        {showManage && (
          <button
            type="button"
            onClick={onBilling}
            disabled={billingLoading}
            className="oga-billing__current-manage"
          >
            {billingLoading ? "Opening…" : "Manage subscription"}
          </button>
        )}
      </div>

      <div className="oga-billing__current-col">
        <div className="oga-billing__current-usage-head">
          <span>Monthly usage</span>
          {!unlimited && (
            <span className="oga-billing__current-pct">{Math.round(pct)}%</span>
          )}
        </div>
        <div className="oga-billing__current-usage-row">
          <span className="oga-billing__current-usage-value">{used}</span>
          <span className="oga-billing__current-usage-limit">
            / {unlimited ? "∞" : limit}
          </span>
        </div>
        <div className="oga-billing__current-bar">
          <div
            className="oga-billing__current-bar-fill"
            style={{ width: unlimited ? "0%" : `${pct}%` }}
          />
        </div>
        <div className="oga-billing__current-reset">
          Resets on the 1st of the month
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Full-comparison link (opens /pricing in a new tab)
   ============================================================ */
function FullComparisonLink() {
  return (
    <div className="oga-billing__compare">
      <a
        href="/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="oga-billing__compare-link"
      >
        View full feature comparison
        <span aria-hidden>↗</span>
      </a>
    </div>
  );
}
