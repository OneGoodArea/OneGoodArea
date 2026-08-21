"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { BookDemo } from "../_shared/book-demo";
import "./pricing.css";

/* /pricing - Founding Pilot Partners (Plan 075) + AR-866 elite repackage.
   The pilot is the lead (ten founding partners, one 40-day sprint); the three
   annual tiers (Build, Decision, Assured) sit alongside it, with Developer
   Sandbox and Data partnership as bars, and the FAQ carries the detail.
   Assured is the audit-grade regulated tier for lenders and insurers.
   Marketing-only; Stripe billing is unchanged.

   Hard rules: zero non-data inline styles, no em dashes, no invented claims.
   The programme terms are the offer; product capabilities named here ship. */

type Plan = {
  id: string;
  name: string;
  price: string;
  priceUnit?: string;
  priceNote: string;
  tagline: string;
  features: string[];
  cta: "demo" | "sales";
  highlight?: boolean;
  badge?: string;
};

const PROGRAMME: string[] = [
  "10 founding spots",
  "40-day sprint",
  "Free during the pilot",
  "Founding rate after",
];

const SPRINT: { days: string; title: string; body: string }[] = [
  { days: "Days 1 to 5", title: "Onboard", body: "Keys, integration and your first real call against a live workflow, with us alongside you." },
  { days: "Days 6 to 25", title: "Build", body: "We wire it into your workflow and ship what you need, week by week, against real usage." },
  { days: "Days 26 to 35", title: "Prove", body: "Run it on real decisions and measure against one success metric agreed up front." },
  { days: "Days 36 to 40", title: "Decide", body: "Review together, then continue at the founding rate or walk away, no obligation." },
];

const PLANS: Plan[] = [
  {
    id: "build",
    name: "Build",
    price: "From £2,000",
    priceUnit: "/ month",
    priceNote: "Billed annually",
    tagline: "Clean UK area signals and deterministic scoring, in production inside your product.",
    features: ["Signals API and area lookup", "Deterministic Scores with confidence", "Version-stamped methodology", "MCP server", "Production use"],
    cta: "demo",
  },
  {
    id: "decision",
    name: "Decision",
    price: "From £5,000",
    priceUnit: "/ month",
    priceNote: "Billed annually",
    tagline: "Rank, compare, explain and forecast areas, and monitor them over time.",
    features: ["Everything in Build", "Full Scores and Intelligence", "Ranked search and peer comparison", "Insights, forecasts and the query planner", "Monitor, portfolios and webhooks"],
    cta: "demo",
    highlight: true,
    badge: "Where most teams start",
  },
  {
    id: "assured",
    name: "Assured",
    price: "Custom",
    priceNote: "Annual contract",
    tagline: "Audit-grade area risk for regulated lending and underwriting decisions.",
    features: ["Everything in Decision", "Methodology and version pinning, locked for your contract term", "Full provenance and version registry for your model file", "Signed DPA, security review and SLA", "Dedicated and audit support"],
    cta: "sales",
  },
];

/* Collapsible plan comparison. The Developer Sandbox column is evaluation
   access (the "Eval" tokens), a capped, non-production grant, so the free
   column never out-features a paid plan. Highlight column is Decision (index 2). */
const COMPARE_COLS = ["Developer Sandbox", "Build", "Decision", "Assured"];
const COMPARE_HIGHLIGHT = 2;
type CompareCell = string | boolean;
const COMPARE_ROWS: { label: string; values: CompareCell[] }[] = [
  { label: "Price", values: ["Free", "From £2,000 / mo", "From £5,000 / mo", "Custom"] },
  { label: "MCP server", values: [true, true, true, true] },
  { label: "Signals", values: ["Eval", true, true, true] },
  { label: "Scores", values: ["Eval", "Basic", "Full", "Full"] },
  { label: "Intelligence", values: ["Eval", false, true, true] },
  { label: "Ranked area search", values: ["Eval", false, true, true] },
  { label: "Peer comparison", values: ["Eval", false, true, true] },
  { label: "Insights and anomaly detection", values: ["Eval", false, true, true] },
  { label: "Forecasts", values: ["Eval", false, true, true] },
  { label: "Natural-language planner", values: ["Eval", false, true, true] },
  { label: "Monitor, portfolios and webhooks", values: ["Eval", false, true, true] },
  { label: "Batch scoring", values: [false, false, true, true] },
  { label: "Custom presets", values: [false, false, true, true] },
  { label: "Version and methodology pinning", values: [false, false, true, true] },
  { label: "IP allowlisting", values: [false, false, true, true] },
  { label: "Pinning locked for contract term", values: [false, false, false, true] },
  { label: "Full provenance and version registry", values: [false, false, false, true] },
  { label: "Signed DPA and security review", values: [false, false, false, true] },
  { label: "SLA", values: [false, false, false, true] },
  { label: "Production use", values: [false, true, true, true] },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "What does the pilot cost?",
    a: "Nothing during the 40 days. Full access to all four products and the MCP server, free, for the length of the sprint. If you continue afterwards, you do it at a founding rate locked in for founding partners.",
  },
  {
    q: "Who makes a good founding partner?",
    a: "Teams with a real UK property workflow: proptech and portals, lenders, insurers, CRE and site selection, public sector and research, or estate agents. If that is you, and you have a named contact who can make decisions, you are a fit.",
  },
  {
    q: "What do you need from us?",
    a: "A real workflow to build against, honest feedback in a short weekly check-in, and a short case study once you have seen the value. That is what makes a 40-day sprint move.",
  },
  {
    q: "What happens after the 40 days?",
    a: "You decide. Continue at the founding rate on an annual plan, or walk away with no obligation. Developer Sandbox stays free to keep evaluating the API whenever you want.",
  },
  {
    q: "Is our data safe, and can you handle procurement?",
    a: "Built in today: IP allowlisting, training opt-out, and per-organisation methodology and version pinning. Data handling and our sub-processors are in the public privacy and data policies, and for your review we will sign a DPA and complete your security questionnaire. SOC 2 and ISO 27001 are on the roadmap.",
  },
];

export default function PricingClient() {
  return (
    <div className="oga-root oga-pricing">
      <Nav />
      <Hero />
      <SectionPlans />
      <SectionSprint />
      <SectionFaq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero (dark) - the pitch + the programme card
   ============================================================ */

function Hero() {
  return (
    <section className="oga-pricing-hero">
      <div className="oga-pricing-hero__dots" aria-hidden />
      <div className="oga-pricing-hero__inner">
        <span className="oga-pricing-hero__eyebrow">
          <span className="oga-pricing-hero__eyebrow-dot" aria-hidden />
          Founding pilot programme · applications open
        </span>
        <h1 className="oga-pricing-hero__title">Ten founding partners. One 40-day sprint.</h1>
        <p className="oga-pricing-hero__lead">
          We are building with ten founding pilot partners over a focused 40-day
          sprint. Free for the pilot, hands-on with our team, and a founding rate
          afterwards.
        </p>
        <div className="oga-pricing-hero__ctas">
          <BookDemo className="oga-btn oga-btn-primary">
            Apply for the pilot
            <span aria-hidden>→</span>
          </BookDemo>
          <Link href="#plans" className="oga-btn oga-btn-secondary">
            See the plans
          </Link>
        </div>
        <ul className="oga-pricing-hero__strip" aria-hidden>
          {PROGRAMME.map((p) => (
            <li key={p} className="oga-pricing-hero__strip-item">{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================
   01 The plans (light) - enterprise packages
   ============================================================ */

function SectionPlans() {
  return (
    <section id="plans" className="oga-pricing-sec oga-pricing-sec--light">
      <div className="oga-pricing__wrap">
        <PriceHead num="01" kicker="The plans" title="Where founding partners land.">
          After the pilot you move onto an annual plan, priced to the job. Founding
          partners lock a founding rate on whichever plan fits. Developer Sandbox stays free
          to evaluate the API first.
        </PriceHead>

        <div className="oga-pricing-plans__grid">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>

        <div className="oga-pricing-devbar">
          <div className="oga-pricing-devbar__lead">
            <span className="oga-pricing-devbar__name">Developer Sandbox</span>
            <span className="oga-pricing-devbar__price">Free</span>
          </div>
          <p className="oga-pricing-devbar__tag">
            Full access to all four products and the MCP server, free, to evaluate.
            Not licensed for production use.
          </p>
          <Link href="/docs" className="oga-btn oga-btn-secondary oga-pricing-devbar__cta">
            View the docs
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pricing-devbar">
          <div className="oga-pricing-devbar__lead">
            <span className="oga-pricing-devbar__name">Data partnership</span>
            <span className="oga-pricing-devbar__price">Licensed</span>
          </div>
          <p className="oga-pricing-devbar__tag">
            Embedding OGA signals inside your own product for your customers? A data
            partnership adds redistribution rights, a licensed feed and co-marketing.
          </p>
          <BookDemo className="oga-btn oga-btn-secondary oga-pricing-devbar__cta">
            Talk to us
            <span aria-hidden>→</span>
          </BookDemo>
        </div>

        <Comparison />

        <p className="oga-pricing-plans__note">
          Plans are annual contracts, priced to the job and the scope. Not sure which
          fits?{" "}
          <BookDemo className="oga-pricing-plans__note-link">Book a demo</BookDemo>.
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={`oga-pricing-plan${plan.highlight ? " oga-pricing-plan--featured" : ""}`}
      {...(plan.highlight ? { "data-oga-surface": "dark" as const } : {})}
    >
      {plan.badge && <span className="oga-pricing-plan__badge">{plan.badge}</span>}
      <div className="oga-pricing-plan__name">{plan.name}</div>
      <p className="oga-pricing-plan__tagline">{plan.tagline}</p>
      <ul className="oga-pricing-plan__features">
        {plan.features.map((f) => (
          <li key={f} className="oga-pricing-plan__feature">
            <span className="oga-pricing-plan__check" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <PlanCta plan={plan} />
    </article>
  );
}

function PlanCta({ plan }: { plan: Plan }) {
  const label = plan.cta === "sales" ? "Talk to sales" : "Book a demo";
  const cls = plan.highlight
    ? "oga-btn oga-btn-primary oga-pricing-plan__cta"
    : "oga-btn oga-btn-secondary oga-pricing-plan__cta";
  return (
    <BookDemo className={cls}>
      {label}
      <span aria-hidden>→</span>
    </BookDemo>
  );
}

/* ---------- Collapsible plan comparison ---------- */
function Comparison() {
  return (
    <details className="oga-pricing-compare">
      <summary className="oga-pricing-compare__toggle">
        <span>Compare all plans</span>
        <span className="oga-pricing-compare__chevron" aria-hidden />
      </summary>
      <div className="oga-pricing-compare__wrap">
        <table className="oga-pricing-compare__table">
          <thead>
            <tr>
              <th className="oga-pricing-compare__th oga-pricing-compare__th--feature">Capability</th>
              {COMPARE_COLS.map((c, i) => (
                <th
                  key={c}
                  className={`oga-pricing-compare__th${i === COMPARE_HIGHLIGHT ? " oga-pricing-compare__th--highlight" : ""}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="oga-pricing-compare__tr">
                <td className="oga-pricing-compare__td oga-pricing-compare__td--feature">{row.label}</td>
                {row.values.map((v, vi) => (
                  <td
                    key={vi}
                    className={`oga-pricing-compare__td${vi === COMPARE_HIGHLIGHT ? " oga-pricing-compare__td--highlight" : ""}`}
                  >
                    <CompareValue value={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function CompareValue({ value }: { value: CompareCell }) {
  if (value === true) return <span className="oga-pricing-compare__check" aria-label="Included">✓</span>;
  if (value === false) return <span className="oga-pricing-compare__dash" aria-label="Not included">·</span>;
  return <span className="oga-pricing-compare__text">{value}</span>;
}

/* ============================================================
   02 The sprint (quiet) - 4-phase timeline
   ============================================================ */

function SectionSprint() {
  return (
    <section id="sprint" className="oga-pricing-sec oga-pricing-sec--quiet">
      <div className="oga-pricing__wrap">
        <PriceHead num="02" kicker="The sprint" title="How the 40 days run.">
          A founding pilot is a structured sprint, not an open-ended trial. Four
          phases, one success metric, and a clear decision at the end.
        </PriceHead>

        <ol className="oga-pricing-sprint">
          <div className="oga-pricing-sprint__rail" aria-hidden />
          {SPRINT.map((p, i) => (
            <li key={p.title} className="oga-pricing-sprint__phase">
              <span className="oga-pricing-sprint__node" aria-hidden>{i + 1}</span>
              <span className="oga-pricing-sprint__days">{p.days}</span>
              <h3 className="oga-pricing-sprint__title">{p.title}</h3>
              <p className="oga-pricing-sprint__body">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ============================================================
   03 FAQ (light)
   ============================================================ */

function SectionFaq() {
  return (
    <section className="oga-pricing-sec oga-pricing-sec--light">
      <div className="oga-pricing__wrap">
        <PriceHead num="03" kicker="Frequently asked" title="The questions partners ask first.">
          The pilot is meant to be low-risk and plainly worded. If something is not
          covered here, ask us on the call.
        </PriceHead>

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
   Final CTA (dark) - scarcity close
   ============================================================ */

function FinalCta() {
  return (
    <section className="oga-pricing-sec oga-pricing-sec--dark oga-pricing-cta" data-oga-surface="dark">
      <div className="oga-pricing__wrap oga-pricing-cta__inner">
        <h2 className="oga-pricing-cta__title">Ten spots. One sprint.</h2>
        <p className="oga-pricing-cta__lead">
          We are taking ten founding partners into this first sprint. If you want to
          shape the product and lock a founding rate, put your name forward.
        </p>
        <div className="oga-pricing-cta__ctas">
          <BookDemo className="oga-btn oga-btn-primary">
            Apply for the pilot
            <span aria-hidden>→</span>
          </BookDemo>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Shared section header
   ============================================================ */

function PriceHead({
  num,
  kicker,
  title,
  children,
}: {
  num: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="oga-pricing-head">
      <div className="oga-pricing-head__eyebrow">
        <span className="oga-pricing-head__num">{num}</span>
        <span className="oga-pricing-head__line" aria-hidden />
        <span>{kicker}</span>
      </div>
      <h2 className="oga-pricing-head__title">{title}</h2>
      <p className="oga-pricing-head__lead">{children}</p>
    </header>
  );
}
