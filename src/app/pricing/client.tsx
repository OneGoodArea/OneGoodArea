"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, Loader2, Minus, Code2, Users } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const consumerPlans = [
  {
    id: "free",
    name: "Free",
    price: "£0",
    period: "forever",
    desc: "Try it out",
    reports: "3 reports / month",
    cta: "Get Started",
    disabled: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: "£29",
    period: "/mo",
    desc: "For freelance agents and landlords",
    reports: "20 reports / month",
    cta: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "£79",
    period: "/mo",
    desc: "For agencies and active investors",
    reports: "75 reports / month",
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

const apiPlans = [
  {
    id: "developer",
    name: "Developer",
    price: "£49",
    period: "/mo",
    desc: "For solo devs and small PropTech builders",
    reports: "100 API reports / month",
    perReport: "£0.49 / report",
    cta: "Start Building",
  },
  {
    id: "business",
    name: "Business",
    price: "£249",
    period: "/mo",
    desc: "For platforms and integrations",
    reports: "500 API reports / month",
    perReport: "£0.50 / report",
    cta: "Get Business",
    highlight: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: "£499",
    period: "/mo",
    desc: "For portals and high-volume platforms",
    reports: "1,500 API reports / month",
    perReport: "£0.33 / report",
    cta: "Get Growth",
  },
];

const consumerFeatures = [
  { label: "Reports per month", values: ["3", "20", "75"] },
  { label: "7 UK data sources", values: [true, true, true] },
  { label: "All intent types", values: [true, true, true], sub: "Moving, business, investing, research" },
  { label: "Deterministic scoring", values: [true, true, true], sub: "16 functions, area-type benchmarks" },
  { label: "Share & email delivery", values: [true, true, true], sub: "WhatsApp, LinkedIn, X, direct link, email" },
  { label: "Watchlist & CSV export", values: [true, true, true], sub: "Save areas, filter, export as CSV" },
  { label: "Data freshness badges", values: [true, true, true], sub: "Source and age for every data point" },
  { label: "PDF export", values: [false, true, true], sub: "Download branded report as PDF" },
  { label: "Area comparison", values: [false, true, true], sub: "Side-by-side area intelligence" },
  { label: "Property Market data", values: [false, false, true], sub: "HM Land Registry sold prices and trends" },
  { label: "Nearby Schools with Ofsted ratings", values: [true, true, true], sub: "Inspection ratings for schools within 1.5km (England)" },
];

const apiFeatures = [
  { label: "API reports per month", values: ["100", "500", "1,500"] },
  { label: "REST API access", values: [true, true, true] },
  { label: "API key management", values: [true, true, true] },
  { label: "Full API documentation", values: [true, true, true] },
  { label: "30 req/min rate limit", values: [true, true, true] },
  { label: "7 UK data sources", values: [true, true, true] },
  { label: "Deterministic scoring", values: [true, true, true] },
  { label: "AI narrative", values: [true, true, true] },
  { label: "Usage dashboard", values: [true, true, true] },
  { label: "Priority support", values: [false, true, true] },
];

type PlanCard = {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  reports: string;
  perReport?: string;
  cta: string;
  highlight?: boolean;
  disabled?: boolean;
};

function PlanCardComponent({
  plan,
  loading,
  onUpgrade,
  currentPlan,
}: {
  plan: PlanCard;
  loading: string | null;
  onUpgrade: (id: string) => void;
  currentPlan: string | null;
}) {
  const isCurrent = currentPlan === plan.id;

  return (
    <div
      className="p-6 flex flex-col relative"
      style={{ background: isCurrent ? "var(--bg-active)" : "var(--bg-elevated)" }}
    >
      {(plan.highlight || isCurrent) && (
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: isCurrent ? "var(--accent)" : "var(--neon-green)" }} />
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {plan.name}
          </span>
          {isCurrent && (
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5"
              style={{ color: "var(--accent)", background: "var(--accent-dim)" }}
            >
              Current Plan
            </span>
          )}
          {plan.highlight && !isCurrent && (
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
        {plan.perReport && (
          <div className="text-[10px] font-mono mb-1" style={{ color: "var(--text-tertiary)" }}>
            {plan.perReport}
          </div>
        )}
        <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {plan.desc}
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={() => onUpgrade(plan.id)}
          disabled={plan.disabled || isCurrent || loading === plan.id}
          className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all cursor-pointer disabled:opacity-30 disabled:cursor-default"
          style={{
            background: isCurrent ? "var(--accent-dim)" : plan.highlight ? "var(--text-primary)" : "var(--bg-active)",
            color: isCurrent ? "var(--accent)" : plan.highlight ? "var(--bg)" : "var(--text-secondary)",
            border: isCurrent ? "1px solid var(--accent)" : plan.highlight ? "none" : "1px solid var(--border)",
          }}
        >
          {loading === plan.id ? (
            <Loader2 size={13} className="animate-spin" />
          ) : isCurrent ? (
            <>Current Plan</>
          ) : (
            <>
              {plan.cta}
              {!plan.disabled && <ArrowRight size={11} />}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function FeatureTable({
  plans,
  features,
}: {
  plans: PlanCard[];
  features: { label: string; values: (string | boolean)[]; sub?: string }[];
}) {
  const cols = plans.length;
  return (
    <div className="border" style={{ borderColor: "var(--border)" }}>
      {/* Table header */}
      <div
        className={`hidden lg:grid gap-4 px-5 py-3 border-b overflow-x-auto`}
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
          gridTemplateColumns: `1fr repeat(${cols}, 120px)`,
        }}
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
            className={`hidden lg:grid gap-4 px-5 py-3 items-center`}
            style={{
              background: i % 2 === 0 ? "var(--bg)" : "var(--bg-elevated)",
              gridTemplateColumns: `1fr repeat(${cols}, 120px)`,
            }}
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
            <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
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
  );
}

export default function PricingPage() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [loading, setLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"consumer" | "api">("consumer");
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  // Fetch user's current plan and auto-switch tab
  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/usage").then(r => r.json()).then(data => {
        if (data.plan) {
          setCurrentPlan(data.plan);
          const apiPlans = ["developer", "business", "growth"];
          if (apiPlans.includes(data.plan)) setTab("api");
        }
      }).catch(() => { setCurrentPlan("free"); });
    }
  }, [isSignedIn]);

  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(planId: string) {
    if (planId === "free" || loading) return;

    if (!isSignedIn) {
      window.location.href = `/sign-in?callbackUrl=/pricing`;
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(null);
    }
  }

  const activePlans = tab === "consumer" ? consumerPlans : apiPlans;
  const activeFeatures = tab === "consumer" ? consumerFeatures : apiFeatures;

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
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="text-[14px] max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
            Every plan includes all 7 UK data sources, deterministic scoring, and AI narrative.
            Pay only for volume.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-px mb-10">
          <button
            onClick={() => setTab("consumer")}
            className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all cursor-pointer"
            style={{
              background: tab === "consumer" ? "var(--bg-elevated)" : "var(--bg)",
              color: tab === "consumer" ? "var(--text-primary)" : "var(--text-tertiary)",
              borderTop: `1px solid ${tab === "consumer" ? "var(--text-tertiary)" : "var(--border)"}`,
              borderBottom: `1px solid ${tab === "consumer" ? "var(--text-tertiary)" : "var(--border)"}`,
              borderLeft: `1px solid ${tab === "consumer" ? "var(--text-tertiary)" : "var(--border)"}`,
              borderRight: "none",
            }}
          >
            <Users size={12} />
            Web Reports
          </button>
          <button
            onClick={() => setTab("api")}
            className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide transition-all cursor-pointer"
            style={{
              background: tab === "api" ? "var(--bg-elevated)" : "var(--bg)",
              color: tab === "api" ? "var(--neon-green)" : "var(--text-tertiary)",
              borderTop: `1px solid ${tab === "api" ? "var(--neon-green)" : "var(--border)"}`,
              borderBottom: `1px solid ${tab === "api" ? "var(--neon-green)" : "var(--border)"}`,
              borderLeft: `1px solid ${tab === "api" ? "var(--neon-green)" : "var(--border)"}`,
              borderRight: `1px solid ${tab === "api" ? "var(--neon-green)" : "var(--border)"}`,
            }}
          >
            <Code2 size={12} />
            API Access
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            className="max-w-[1100px] mx-auto mb-4 px-4 py-3 text-[12px] font-mono flex items-center justify-between"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-[11px] opacity-60 hover:opacity-100 cursor-pointer">dismiss</button>
          </div>
        )}

        {/* Plan Cards */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${activePlans.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-px max-w-[1100px] mx-auto mb-16`}
          style={{ background: "var(--border)" }}
        >
          {activePlans.map((plan) => (
            <PlanCardComponent
              key={plan.id}
              plan={plan}
              loading={loading}
              onUpgrade={handleUpgrade}
              currentPlan={currentPlan}
            />
          ))}
        </div>

        {/* Enterprise banner (API tab only) */}
        {tab === "api" && (
          <div
            className="max-w-[1100px] mx-auto mb-16 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <div>
              <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                Enterprise
              </div>
              <div className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                Need 5,000+ reports, custom SLAs, annual contracts, or dedicated support? Let&apos;s talk.
              </div>
            </div>
            <a
              href="mailto:hello@area-iq.co.uk?subject=Enterprise API pricing"
              className="h-9 px-5 flex items-center gap-2 text-[11px] font-mono font-medium uppercase tracking-wide shrink-0 transition-colors"
              style={{
                background: "var(--bg-active)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Contact Sales
              <ArrowRight size={11} />
            </a>
          </div>
        )}

        {/* Feature Comparison Table */}
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[16px] font-semibold tracking-tight mb-4" style={{ color: "var(--text-primary)" }}>
            {tab === "consumer" ? "Feature comparison" : "API feature comparison"}
          </h2>

          <FeatureTable plans={activePlans} features={activeFeatures} />

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
