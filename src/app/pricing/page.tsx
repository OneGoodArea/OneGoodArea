"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    period: "/mo",
    desc: "3 reports per month",
    features: [
      "All 4 intent types",
      "Full scored reports",
      "5 intelligence dimensions",
      "Shareable report URLs",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "£39",
    period: "/mo",
    desc: "Unlimited reports",
    features: [
      "Everything in Free",
      "Unlimited reports",
      "Report history dashboard",
      "Priority generation",
      "Export & sharing",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "api",
    name: "API",
    price: "£79",
    period: "/mo",
    desc: "Unlimited + API access",
    features: [
      "Everything in Pro",
      "REST API access",
      "API key management",
      "Embeddable widget",
      "Webhook integrations",
    ],
    cta: "Upgrade to API",
  },
];

export default function PricingPage() {
  const { isSignedIn } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(planId: string) {
    if (planId === "free" || loading) return;

    setLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-grid">
      <Navbar breadcrumbs={[{ label: "Pricing" }]}>
        <Link
          href={isSignedIn ? "/report" : "/sign-in"}
          className="h-8 px-4 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-colors"
          style={{ background: "var(--text-primary)", color: "var(--bg)" }}
        >
          {isSignedIn ? "Go to App" : "Sign In"}
          <ArrowRight size={12} />
        </Link>
      </Navbar>

      {/* Main */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-[14px]" style={{ color: "var(--text-secondary)" }}>
            Start free. Upgrade when you need more intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px max-w-[900px] mx-auto" style={{ background: "var(--border)" }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 relative"
              style={{ background: "var(--bg-elevated)" }}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "var(--neon-green)" }} />
              )}

              <div className="mb-4">
                <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-mono font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {plan.price}
                  </span>
                  <span className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {plan.period}
                  </span>
                </div>
                <div className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  {plan.desc}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-start gap-2">
                    <Check size={12} className="mt-0.5 shrink-0" style={{ color: "var(--neon-green)" }} />
                    <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.disabled || loading === plan.id}
                className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all disabled:opacity-30"
                style={{
                  background: plan.highlight ? "var(--text-primary)" : "var(--bg-active)",
                  color: plan.highlight ? "var(--bg)" : "var(--text-secondary)",
                  border: plan.highlight ? "none" : "1px solid var(--border)",
                }}
              >
                {loading === plan.id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <>
                    {plan.cta}
                    {!plan.disabled && <ArrowRight size={11} />}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
