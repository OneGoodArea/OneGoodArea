"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Loader2, Minus } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    period: "forever",
    desc: "Try it out",
    reports: "3 reports / month",
    target: "Individual exploration",
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: "£29",
    period: "/mo",
    desc: "For freelance agents & landlords",
    reports: "20 reports / month",
    target: "Solo professionals",
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "£79",
    period: "/mo",
    desc: "For agencies & active investors",
    reports: "75 reports / month",
    target: "Agencies & power users",
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "£249",
    period: "/mo",
    desc: "For proptech teams & platforms",
    reports: "300 reports / month",
    target: "Programmatic access",
    cta: "Contact Sales",
  },
];

const features = [
  { label: "Reports per month", values: ["3", "20", "75", "300"] },
  { label: "UK data sources", values: [true, true, true, true] },
  { label: "All intent types", values: [true, true, true, true], sub: "Moving, business, investing, research" },
  { label: "Weighted scoring", values: [true, true, true, true], sub: "5 dimensions per intent" },
  { label: "Shareable report URLs", values: [true, true, true, true] },
  { label: "Report history", values: [true, true, true, true] },
  { label: "Area comparison", values: [false, true, true, true], sub: "Side-by-side area intelligence" },
  { label: "REST API access", values: [false, false, false, true] },
  { label: "API key management", values: [false, false, false, true] },
  { label: "API documentation", values: [false, false, false, true] },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(planId: string) {
    if (planId === "free" || loading) return;

    if (!isSignedIn) {
      window.location.href = `/sign-in?callbackUrl=/pricing`;
      return;
    }

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

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-[14px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            Every plan includes all 5 UK data sources, all intent types, and full scored reports.
            Pay only for volume.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px max-w-[1100px] mx-auto mb-16" style={{ background: "var(--border)" }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="p-6 flex flex-col relative"
              style={{ background: "var(--bg-elevated)" }}
            >
              {plan.highlight && (
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "var(--neon-green)" }} />
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {plan.name}
                  </span>
                  {plan.highlight && (
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5"
                      style={{ color: "var(--neon-green)", background: "var(--neon-green-dim)" }}
                    >
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-[32px] font-mono font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {plan.price}
                  </span>
                  <span className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                    {plan.period}
                  </span>
                </div>
                <div className="text-[11px] font-mono mb-1" style={{ color: "var(--neon-green)" }}>
                  {plan.reports}
                </div>
                <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {plan.desc}
                </div>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.disabled || loading === plan.id}
                  className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
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
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[16px] font-semibold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            Feature comparison
          </h2>

          <div className="border" style={{ borderColor: "var(--border)" }}>
            {/* Table header */}
            <div
              className="hidden lg:grid grid-cols-[1fr_repeat(4,120px)] gap-4 px-5 py-3 border-b overflow-x-auto"
              style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
            >
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Feature
              </span>
              {plans.map((p) => (
                <span key={p.id} className="text-[9px] font-mono uppercase tracking-wider text-center" style={{ color: "var(--text-tertiary)" }}>
                  {p.name}
                </span>
              ))}
            </div>

            {/* Rows */}
            {features.map((feature, i) => (
              <div
                key={feature.label}
                className="border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                {/* Desktop row */}
                <div
                  className="hidden lg:grid grid-cols-[1fr_repeat(4,120px)] gap-4 px-5 py-3 items-center"
                  style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-elevated)" }}
                >
                  <div>
                    <span className="text-[12px]" style={{ color: "var(--text-primary)" }}>
                      {feature.label}
                    </span>
                    {feature.sub && (
                      <span className="block text-[10px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {feature.sub}
                      </span>
                    )}
                  </div>
                  {feature.values.map((val, j) => (
                    <div key={j} className="flex justify-center">
                      {typeof val === "string" ? (
                        <span className="text-[13px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                          {val}
                        </span>
                      ) : val ? (
                        <Check size={14} style={{ color: "var(--neon-green)" }} />
                      ) : (
                        <Minus size={14} style={{ color: "var(--border-hover)" }} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile row */}
                <div
                  className="lg:hidden px-5 py-3"
                  style={{ background: i % 2 === 0 ? "var(--bg)" : "var(--bg-elevated)" }}
                >
                  <div className="text-[12px] mb-2" style={{ color: "var(--text-primary)" }}>
                    {feature.label}
                    {feature.sub && (
                      <span className="block text-[10px] font-mono mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {feature.sub}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {feature.values.map((val, j) => (
                      <div key={j} className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-mono uppercase" style={{ color: "var(--text-tertiary)" }}>
                          {plans[j].name}
                        </span>
                        {typeof val === "string" ? (
                          <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                            {val}
                          </span>
                        ) : val ? (
                          <Check size={12} style={{ color: "var(--neon-green)" }} />
                        ) : (
                          <Minus size={12} style={{ color: "var(--border-hover)" }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
              All plans billed monthly. Cancel anytime. Prices in GBP.
            </p>
            <p className="text-[11px] font-mono mt-1" style={{ color: "var(--text-tertiary)" }}>
              Need a custom volume? <span style={{ color: "var(--text-secondary)" }}>hello@area-iq.co.uk</span>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
