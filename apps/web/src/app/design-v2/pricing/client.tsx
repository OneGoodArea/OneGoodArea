"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { PlanId } from "@/lib/stripe";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { DISPLAY_PLANS, PlanGrid, type DisplayPlan } from "../_shared/plan-grid";
import "./pricing.css";

/* /pricing — Brand v3 rewrite (AR-204 close-out sweep 3/16, bundled
   with plan-grid). Marketing-only surface. Authenticated upgrades
   happen at /dashboard/billing (AR-145).

   Locked surface plan (per the surface-rotation rule):
     Hero               DARK
     Plan grid           cream
     Enterprise callout cream-quiet
     Feature table       cream
     FAQ                cream-quiet
     Final CTA           DARK

   All pricing + rate-limit numbers verified against
   apps/web/src/lib/stripe.ts (PLANS + ADDONS) +
   apps/api/src/infrastructure/config/index.ts (RATE_LIMITS). */

type Row = {
  label: string;
  values: (string | boolean)[];
  sub?: string;
};

/* Columns map to DISPLAY_PLANS order: Sandbox · Starter · Build ·
   Scale · Growth. CRITICAL RULE (per feedback_no_invented_claims.md):
   only list features that are SHIPPED. No "coming soon" rows in
   this comparison table. */
const API_FEATURES: Row[] = [
  { label: "API calls / month",          values: ["35", "1,500", "6,000", "25,000", "100,000"] },
  { label: "Effective £ per call",       values: ["—", "£0.033", "£0.025", "£0.020", "£0.015"] },
  { label: "Hard cap or soft cap",       values: ["Hard", "Hard", "Soft +25%", "Soft +25%", "Soft +25%"],   sub: "Soft-cap tiers carry +25% headroom above the included count at £0.05 per call. Past +25% the limit becomes hard." },
  { label: "Rate limit",                  values: ["30 req/min", "30 req/min", "30 req/min", "30 req/min", "30 req/min"], sub: "60-second sliding window, per API key" },
  { label: "REST API + Bearer auth",     values: [true, true, true, true, true],                            sub: "JSON in/out, OpenAPI 3.0 spec, idempotency-key replay" },
  { label: "4 products on one engine",   values: [true, true, true, true, true],                            sub: "Signals · Scores · Monitor · Intelligence" },
  { label: "7 official UK data sources",  values: [true, true, true, true, true],                            sub: "Police.uk · IMD 2025 / WIMD 2019 / SIMD 2020 · HM Land Registry · Ofsted · OSM · Environment Agency · ONS NSPL · Postcodes.io" },
  { label: "Engine version pinning",     values: [true, true, true, true, true],                            sub: "Per-org methodology pin on every response (owner-only)" },
  { label: "Webhooks",                    values: [true, true, true, true, true],                            sub: "HMAC-SHA256-signed signal.changed delivery" },
  { label: "API keys",                    values: ["1", "1", "5", "10", "25"] },
  { label: "24-hour idempotency cache",  values: [true, true, true, true, true],                            sub: "Cache replays don't count against monthly quota" },
  { label: "Email support",               values: ["community", "community", "5-day", "48h", "24h"] },
  { label: "MCP server access",           values: ["£29 add-on", "£29 add-on", "£29 add-on", "£29 add-on", true], sub: "Claude Desktop / Cursor / any MCP client. Add-on at £29/mo on the four lower tiers; included free on Growth and Enterprise." },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What counts as an API call?",
    a: "One billable hit on a metered endpoint (/v1/score, /v1/area, /v1/query, /v1/peers, /v1/insights, /v1/forecast, /v1/portfolios). Repeat calls inside the 24-hour idempotency window come from the cache and don't count.",
  },
  {
    q: "What is a soft cap, and what does the overage cost?",
    a: "Build, Scale, and Growth carry +25% headroom above the included monthly count. Calls in that headroom band are charged at £0.05 (5p) per call on the next invoice. Past +25% the limit becomes hard and further calls return 402 Payment Required. Sandbox and Starter are hard-cap (no overage by design). Enterprise is negotiated in the MSA.",
  },
  {
    q: "Can I change plans?",
    a: "Any time, from /dashboard/billing. Upgrades prorate immediately; downgrades take effect at the end of the billing cycle. Cancelling stops renewal and you keep access until the cycle ends.",
  },
  {
    q: "What happens when I hit the limit?",
    a: "On a hard-cap tier, further calls return 402 Payment Required and the dashboard surfaces an upgrade prompt. On a soft-cap tier, you continue through the +25% headroom at the overage rate, then 402 above that. Quotas reset on the first of each calendar month.",
  },
  {
    q: "What is the MCP add-on?",
    a: "The Model Context Protocol server exposes OneGoodArea to Claude Desktop, Cursor, and any MCP-compatible client. £29 per month as an add-on on Sandbox, Starter, Build, and Scale. Included free on Growth and Enterprise. Set-up walkthrough at /docs/mcp.",
  },
  {
    q: "Do cached responses count against my quota?",
    a: "No. Idempotency cache hits (24-hour window via the Idempotency-Key header) are free. Your monthly quota only decrements on live computations. The cache hit is signalled on the X-Idempotency-Replayed response header.",
  },
  {
    q: "Is payment information secure?",
    a: "All billing is handled by Stripe. We never see or store your card. Cancel, upgrade, and manage payment methods from the Stripe billing portal linked from /dashboard/billing.",
  },
  {
    q: "Can I get a refund?",
    a: "We refund unused portions on a case-by-case basis. Email operation@onegoodarea.co.uk within 14 days of a charge and we'll sort it. No dark patterns.",
  },
];

/* ============================================================
   Root
   ============================================================ */

export default function PricingClient() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        if (data?.plan) setCurrentPlan(data.plan);
      })
      .catch(() => setCurrentPlan("free"));
  }, [isSignedIn]);

  /* Marketing-page click-through (AR-147). Never opens Stripe Checkout
     from here — that lives at /dashboard/billing. Anonymous users go
     through sign-up; signed-in users go straight to the in-app billing
     surface with the chosen plan pre-selected. */
  function handleSelect(planId: PlanId) {
    if (planId === "sandbox") {
      window.location.href = isSignedIn ? "/dashboard" : "/sign-up?plan=sandbox";
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
    <div className="oga-root oga-pricing">
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
      <Faq />
      <FinalCta isSignedIn={isSignedIn} />
      <Footer />
    </div>
  );
}

/* ============================================================
   HERO (DARK)
   ============================================================ */

function Hero() {
  return (
    <section
      className="oga-section-dark oga-pricing-hero"
      data-oga-surface="dark"
    >
      <div className="oga-pricing-hero__inner">
        <div className="oga-pricing-hero__eyebrow oga-eyebrow oga-eyebrow--inverse">
          <span className="oga-eyebrow-dot" aria-hidden />
          <span>Pricing</span>
        </div>
        <h1 className="oga-pricing-hero__title">
          Six tiers. One engine. One methodology.
        </h1>
        <p className="oga-pricing-hero__lead">
          Sandbox is free with no card. Soft caps on the production tiers
          keep usage spikes from breaking your billing. Enterprise is a
          custom contract with named technical contact and negotiated
          volume.
        </p>
        <div className="oga-pricing-hero__stamps">
          <span className="oga-pricing-hero__stamp">
            <span className="oga-pricing-hero__stamp-label">Engine</span>
            <span className="oga-pricing-hero__stamp-value">v2.0.2</span>
          </span>
          <span className="oga-pricing-hero__stamp">
            <span className="oga-pricing-hero__stamp-label">Rate limit</span>
            <span className="oga-pricing-hero__stamp-value">30 / min</span>
          </span>
          <span className="oga-pricing-hero__stamp">
            <span className="oga-pricing-hero__stamp-label">Idempotency</span>
            <span className="oga-pricing-hero__stamp-value">24h</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   ENTERPRISE CALLOUT (cream-quiet)
   ============================================================ */

function EnterpriseCallout() {
  return (
    <section
      className="oga-section-quiet oga-pricing-ent"
      data-oga-surface="light"
    >
      <div className="oga-pricing-ent__inner">
        <div className="oga-pricing-ent__card">
          <div className="oga-pricing-ent__body">
            <div className="oga-pricing-ent__eyebrow oga-eyebrow">
              <span className="oga-eyebrow-dot" aria-hidden />
              <span>Enterprise</span>
            </div>
            <h2 className="oga-pricing-ent__title">
              From £4,999 / month. 250,000-call floor. Custom contract.
            </h2>
            <p className="oga-pricing-ent__lead">
              Annual contract with negotiated overage and volume pricing.
              Custom MSA, signed DPA, security review pack on request,
              methodology pinning by engine version, full audit trail per
              request. Named technical contact for support and integration.
              Built for challenger lenders, mid-market InsureTech, and
              PropTech platforms running portfolio-scale workloads.
            </p>
          </div>
          <a
            className="oga-btn oga-btn-primary oga-pricing-ent__cta"
            href="mailto:operation@onegoodarea.co.uk?subject=Enterprise%20API%20pricing"
          >
            Contact sales
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FEATURE TABLE (cream)
   ============================================================ */

function FeatureTable({
  plans,
  rows,
}: {
  plans: DisplayPlan[];
  rows: Row[];
}) {
  return (
    <section className="oga-pricing-table" data-oga-surface="light">
      <div className="oga-pricing-table__inner">
        <header className="oga-pricing-table__head">
          <div className="oga-pricing-table__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>Compare</span>
          </div>
          <h2 className="oga-pricing-table__title">
            Every shipped feature, side by side.
          </h2>
          <p className="oga-pricing-table__lead">
            What is in the table is in the product today. Roadmap items
            don&rsquo;t appear here.
          </p>
        </header>

        <div className="oga-pricing-table__wrap">
          <table className="oga-pricing-table__table">
            <thead>
              <tr>
                <th className="oga-pricing-table__th oga-pricing-table__th--feature">
                  Feature
                </th>
                {plans.map((p) => (
                  <th
                    key={p.id}
                    className={
                      p.highlight
                        ? "oga-pricing-table__th oga-pricing-table__th--highlight"
                        : "oga-pricing-table__th"
                    }
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="oga-pricing-table__tr">
                  <td className="oga-pricing-table__td oga-pricing-table__td--feature">
                    <span className="oga-pricing-table__label">{row.label}</span>
                    {row.sub && (
                      <span className="oga-pricing-table__sub">{row.sub}</span>
                    )}
                  </td>
                  {row.values.map((v, vi) => (
                    <td
                      key={vi}
                      className={
                        plans[vi]?.highlight
                          ? "oga-pricing-table__td oga-pricing-table__td--highlight"
                          : "oga-pricing-table__td"
                      }
                    >
                      <CellValue value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="oga-pricing-table__check" aria-label="Included">
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="oga-pricing-table__dash" aria-label="Not included">
        —
      </span>
    );
  }
  return <span className="oga-pricing-table__cell-text">{value}</span>;
}

/* ============================================================
   FAQ (cream-quiet) — native <details> accordion
   ============================================================ */

function Faq() {
  return (
    <section
      className="oga-section-quiet oga-pricing-faq"
      data-oga-surface="light"
    >
      <div className="oga-pricing-faq__inner">
        <header className="oga-pricing-faq__head">
          <div className="oga-pricing-faq__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 className="oga-pricing-faq__title">Questions before you pay.</h2>
        </header>

        <div className="oga-pricing-faq__list">
          {FAQS.map((item) => (
            <details key={item.q} className="oga-pricing-faq__qa">
              <summary className="oga-pricing-faq__q">
                <span>{item.q}</span>
                <span className="oga-pricing-faq__chevron" aria-hidden />
              </summary>
              <div className="oga-pricing-faq__a">
                <p>{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FINAL CTA (DARK)
   ============================================================ */

function FinalCta({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <section
      className="oga-section-dark oga-pricing-cta"
      data-oga-surface="dark"
    >
      <div className="oga-pricing-cta__inner">
        <h2 className="oga-pricing-cta__title">
          Start with a single call.
        </h2>
        <p className="oga-pricing-cta__lead">
          Read the docs, grab a key, ship a request in minutes. No card to
          start. Decide after you&rsquo;ve seen the JSON.
        </p>
        <div className="oga-pricing-cta__buttons">
          <Link
            href={isSignedIn ? "/dashboard" : "/sign-up"}
            className="oga-btn oga-btn-primary"
          >
            {isSignedIn ? "Open dashboard" : "Start free"}
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
