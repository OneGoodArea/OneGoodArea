"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PlanId } from "@/lib/stripe";
import { Styles } from "../_shared/styles";
import { AppShell } from "../_shared/app-shell";
import { DISPLAY_PLANS, PlanGrid, type DisplayPlan, Spinner } from "../_shared/plan-grid";
import { McpAddOnSection, type McpStatus } from "../_shared/mcp-addon-section";

/* AR-146 — in-app billing surface.
   Lean by design: current plan + plan grid + MCP add-on + manage-subscription.
   The full feature comparison lives at /pricing and opens in a new tab so
   users don't lose their place. Stripe Checkout fires from this surface only
   (never from the marketing page). When ?plan=<id> is in the URL, a confirm
   panel is shown above the grid — never auto-fires checkout. */

type Props = {
  plan: PlanId;
  planName: string;
  used: number;
  limit: number;
  mcp: McpStatus;
};

export default function BillingClient(props: Props) {
  return (
    <>
      <Styles />
      <AppShell
        title="Billing"
        subtitle="Manage your plan, MCP add-on, and subscription."
      >
        <Body {...props} />
      </AppShell>
    </>
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

  /* Sandbox is free — no Stripe Checkout. Pick "switch to Sandbox" routes
     to /dashboard (effectively a downgrade-to-free). Paid plans go through
     Stripe Checkout. */
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

  /* Plan-grid click handler. If the user already has the plan, no-op (the
     card is "Current"). Otherwise route to the same page with ?plan=<id>
     so the confirm panel handles the actual fire. Single-source for the
     Stripe POST. */
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
    <div style={{ padding: "28px 40px 64px", display: "flex", flexDirection: "column", gap: 22 }}>
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

/* ─────── Confirm panel (shown when ?plan=<id> is in the URL) ─────── */

function ConfirmPanel({
  plan, loading, error, onContinue, onDismiss,
}: {
  plan: DisplayPlan;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  return (
    <div style={{
      border: "1px solid var(--ink-deep)",
      background: "var(--bg-ink)",
      color: "#FFFFFF",
      borderRadius: 4,
      padding: "26px 28px",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      gap: 24, flexWrap: "wrap",
      position: "relative", overflow: "hidden",
      boxShadow: "0 20px 50px -28px rgba(6,42,30,0.35)",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: -100, right: -60,
        width: 360, height: 360,
        background: "radial-gradient(circle, rgba(212,243,58,0.18) 0%, rgba(212,243,58,0) 60%)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "60ch", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--signal)",
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
            boxShadow: "0 0 8px rgba(212,243,58,0.5)",
          }} />
          You picked
        </div>
        <div style={{
          fontFamily: "var(--display)", fontSize: 28, fontWeight: 500,
          letterSpacing: "-0.018em", color: "#FFFFFF", lineHeight: 1.1,
        }}>
          {plan.name} · <em style={{ fontStyle: "italic", color: "var(--signal)" }}>{plan.price}</em> {plan.cadence}
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 11.5,
          color: "rgba(255,255,255,0.65)", letterSpacing: "0.04em",
        }}>
          {plan.reports}{plan.perReport ? ` · ${plan.perReport}` : ""}
        </div>
        {error && (
          <div style={{
            marginTop: 6,
            fontFamily: "var(--mono)", fontSize: 11,
            color: "#FFB8A8", padding: "8px 12px",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.32)",
            borderRadius: 4,
          }}>{error}</div>
        )}
      </div>

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <button
          onClick={onContinue}
          disabled={loading}
          style={{
            fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500,
            letterSpacing: "0.16em", textTransform: "uppercase",
            color: "var(--signal-ink)", background: "var(--signal)",
            padding: "13px 22px", borderRadius: 999,
            border: "1px solid var(--signal)", cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
            display: "inline-flex", alignItems: "center", gap: 9,
            transition: "transform 140ms cubic-bezier(0.16,1,0.3,1)",
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {loading ? <Spinner /> : "Continue to Stripe"}
          {!loading && <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{"→"}</span>}
        </button>
        <button
          onClick={onDismiss}
          disabled={loading}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "#FFFFFF", background: "transparent",
            border: "1px solid rgba(255,255,255,0.24)",
            padding: "12px 18px", borderRadius: 999, cursor: loading ? "default" : "pointer",
            transition: "background 140ms ease, border-color 140ms ease",
          }}
          onMouseEnter={(e) => {
            if (loading) return;
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
          }}
          onMouseLeave={(e) => {
            if (loading) return;
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
          }}
        >
          Choose a different plan
        </button>
      </div>
    </div>
  );
}

/* ─────── Current plan strip (compact, billing-flavored) ─────── */

function CurrentPlanStrip({
  planName, used, limit, onBilling, billingLoading, showManage,
}: {
  planName: string;
  used: number; limit: number;
  onBilling: () => void; billingLoading: boolean;
  showManage: boolean;
}) {
  const unlimited = limit === Infinity;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const rag = pct >= 90 ? "#FFB8A8" : pct >= 70 ? "#FFE07A" : "var(--signal)";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 0,
      background: "var(--bg-ink)",
      borderRadius: 4,
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 20px 50px -28px rgba(6,42,30,0.35)",
    }}>
      <div aria-hidden style={{
        position: "absolute", top: -120, right: -80,
        width: 420, height: 420,
        background: "radial-gradient(circle, rgba(212,243,58,0.2) 0%, rgba(212,243,58,0) 58%)",
        pointerEvents: "none",
      }} />

      <div style={{
        padding: "26px 28px",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column", gap: 12,
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(212,243,58,0.88)",
          display: "inline-flex", alignItems: "center", gap: 9,
        }}>
          <span aria-hidden style={{
            width: 6, height: 6, borderRadius: 6, background: "var(--signal)",
            boxShadow: "0 0 8px rgba(212,243,58,0.5)",
          }} />
          Current plan
        </div>
        <div style={{
          fontFamily: "var(--display)", fontSize: 32, fontWeight: 500,
          letterSpacing: "-0.018em", color: "#FFFFFF",
          lineHeight: 1,
        }}>{planName}</div>
        {showManage && (
          <div style={{ marginTop: 2 }}>
            <button
              onClick={onBilling}
              disabled={billingLoading}
              style={{
                fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.14em", textTransform: "uppercase",
                color: "#FFFFFF", background: "transparent",
                border: "1px solid rgba(255,255,255,0.24)",
                padding: "10px 18px", borderRadius: 999,
                cursor: billingLoading ? "default" : "pointer",
                opacity: billingLoading ? 0.7 : 1,
                transition: "background 140ms ease, border-color 140ms ease",
              }}
              onMouseEnter={(e) => {
                if (billingLoading) return;
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={(e) => {
                if (billingLoading) return;
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.24)";
              }}
            >
              {billingLoading ? "Opening…" : "Manage subscription"}
            </button>
          </div>
        )}
      </div>

      <div style={{
        padding: "26px 28px",
        display: "flex", flexDirection: "column", gap: 14,
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
        }}>
          <span>Monthly usage</span>
          {!unlimited && <span style={{ color: rag }}>{Math.round(pct)}%</span>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{
            fontFamily: "var(--display)", fontSize: 38, fontWeight: 500,
            letterSpacing: "-0.02em", color: "#FFFFFF",
            lineHeight: 1,
          }}>{used}</span>
          <span style={{
            fontFamily: "var(--mono)", fontSize: 14,
            color: "rgba(255,255,255,0.5)",
          }}>/ {unlimited ? "∞" : limit}</span>
        </div>
        <div style={{
          height: 5, width: "100%",
          background: "rgba(255,255,255,0.08)",
          borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: unlimited ? "0%" : `${pct}%`,
            background: rag,
            transition: "width 420ms cubic-bezier(0.16,1,0.3,1)",
            boxShadow: `0 0 12px ${rag}33`,
          }} />
        </div>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.45)",
        }}>Resets on the 1st of the month</div>
      </div>
    </div>
  );
}

/* ─────── Full-comparison link (opens /pricing in a new tab) ─────── */

function FullComparisonLink() {
  return (
    <div style={{
      display: "flex", justifyContent: "center", padding: "4px 0 12px",
    }}>
      <a
        href="/pricing"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "var(--ink)", background: "var(--bg)",
          padding: "10px 18px", borderRadius: 999, textDecoration: "none",
          border: "1px solid var(--border)",
          display: "inline-flex", alignItems: "center", gap: 9,
          transition: "border-color 140ms ease, background 140ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--ink)";
          e.currentTarget.style.background = "var(--bg-off)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.background = "var(--bg)";
        }}
      >
        View full feature comparison
        <span aria-hidden style={{ fontFamily: "var(--sans)", fontSize: 13 }}>{"↗"}</span>
      </a>
    </div>
  );
}
