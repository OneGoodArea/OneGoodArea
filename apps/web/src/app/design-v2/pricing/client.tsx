"use client";

import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { BookDemo } from "../_shared/book-demo";
import "./pricing.css";

/* /pricing, B2B repackage (AR-456). Demo-led, four workflow packages.
   Marketing-only surface: no Stripe checkout and no self-serve signup
   path from here (that rework rides with the demo-led pivot). Spec:
   docs/PLANS/pricing_strategy_v1.md.

   Hard rules: zero inline styles, no em dashes, no invented claims.
   Every capability in the comparison table is a shipped product feature;
   the four packages are the commercial layer on top. */

type Pkg = {
  id: string;
  name: string;
  price: string;
  priceUnit?: string;
  priceNote: string;
  tagline: string;
  features: string[];
  cta: "demo" | "sales" | "docs";
  highlight?: boolean;
  badge?: string;
};

const PACKAGES: Pkg[] = [
  {
    id: "developer",
    name: "Developer",
    price: "Free",
    priceNote: "Evaluation only",
    tagline: "Evaluate the API and explore the MCP server. Not licensed for production use.",
    features: [
      "MCP server access",
      "Sample signals and demo scoring",
      "Full docs and OpenAPI spec",
      "No card required",
    ],
    cta: "docs",
  },
  {
    id: "core",
    name: "Core API",
    price: "From £2,000",
    priceUnit: "/ month",
    priceNote: "Billed annually",
    tagline: "Clean UK area signals and deterministic scoring inside your product or workflow.",
    features: [
      "Signals API and area lookup",
      "Deterministic Scores",
      "Standard methodology, version-stamped",
      "Production use",
      "Standard support",
    ],
    cta: "demo",
  },
  {
    id: "intelligence",
    name: "Decision Intelligence",
    price: "From £5,000",
    priceUnit: "/ month",
    priceNote: "Billed annually",
    tagline: "Rank, compare, explain and forecast areas with a versioned methodology.",
    features: [
      "Everything in Core API",
      "Full Scores and Intelligence",
      "Ranked area search and peer comparison",
      "Insights, forecasts, natural-language planner",
      "Custom presets and implementation support",
    ],
    cta: "demo",
    highlight: true,
    badge: "Where most teams start",
  },
  {
    id: "enterprise",
    name: "Enterprise Monitor",
    price: "Custom",
    priceNote: "Annual contract",
    tagline: "Portfolio monitoring, controls and support for regulated, high-volume workflows.",
    features: [
      "Everything in Decision Intelligence",
      "Monitor and webhooks",
      "Methodology pinning and IP allowlisting",
      "Custom cohorts and SLA",
      "Security review and dedicated support",
    ],
    cta: "sales",
  },
];

type Cell = string | boolean;
const COLS = ["Developer", "Core API", "Decision Intelligence", "Enterprise Monitor"];
const HIGHLIGHT_COL = 2;

const MATRIX: { label: string; values: Cell[] }[] = [
  { label: "MCP server", values: [true, true, true, true] },
  { label: "Signals", values: ["Sample", true, true, true] },
  { label: "Scores", values: ["Demo", "Basic", "Full", "Full"] },
  { label: "Intelligence", values: [false, "Limited", "Full", "Full"] },
  { label: "Ranked area search", values: [false, "Limited", true, true] },
  { label: "Peer comparison", values: [false, "Limited", true, true] },
  { label: "Insights and anomaly detection", values: [false, false, true, true] },
  { label: "Forecasts", values: [false, false, true, true] },
  { label: "Natural-language planner", values: [false, false, true, true] },
  { label: "Monitor and webhooks", values: [false, false, "Add-on", true] },
  { label: "Custom presets", values: [false, false, true, true] },
  { label: "Custom cohorts", values: [false, false, "Add-on", true] },
  { label: "Methodology pinning", values: [false, false, false, true] },
  { label: "IP allowlisting", values: [false, false, false, true] },
  { label: "SLA", values: [false, false, "Limited", true] },
  { label: "Production use", values: [false, true, true, true] },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I get started?",
    a: "Book a demo. We look at your use case, then either run a paid pilot or move straight to an annual contract. Developer access is free if you just want to evaluate the API or explore the MCP server first.",
  },
  {
    q: "Is there a free trial?",
    a: "Developer is free for evaluation, prototyping and MCP exploration. It is not licensed for production, customer-facing or revenue-generating use. For a production evaluation we run a fixed-scope paid pilot.",
  },
  {
    q: "What is a paid pilot?",
    a: "A time-boxed evaluation against one defined use case and one success metric agreed up front, from £7,500. Half the pilot fee is credited against your first annual contract if you convert within 60 days.",
  },
  {
    q: "How is OneGoodArea priced?",
    a: "Around workflow value and production importance, not raw API-call volume. Plans are annual contracts. Usage limits exist to protect the platform, but they are not the headline.",
  },
  {
    q: "Can I buy just one product?",
    a: "You buy a workflow-led package that already includes the signals and scores it needs. If you want data, that is Core API. If you want decisions, Decision Intelligence. If you want ongoing monitoring, Enterprise Monitor.",
  },
  {
    q: "Do you support procurement and security review?",
    a: "Yes, on Enterprise Monitor and regulated pilots: security review support, signed DPA, methodology documentation, IP allowlisting, training opt-out and audit-ready version pinning.",
  },
];

export default function PricingClient() {
  return (
    <div className="oga-root oga-pricing">
      <Nav />
      <Hero />
      <Packages />
      <Comparison />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   HERO (DARK)
   ============================================================ */
function Hero() {
  return (
    <section className="oga-section-dark oga-pricing-hero" data-oga-surface="dark">
      <div className="oga-pricing-hero__inner">
        <div className="oga-pricing-hero__eyebrow oga-eyebrow oga-eyebrow--inverse">
          <span className="oga-eyebrow-dot" aria-hidden />
          <span>Pricing</span>
        </div>
        <h1 className="oga-pricing-hero__title">
          One engine, four ways to buy.
        </h1>
        <p className="oga-pricing-hero__lead">
          Developer is free to evaluate. The three paid plans are annual
          contracts, priced to the job: area data, decision workflows, or
          portfolio monitoring. Run a paid pilot first if you want to prove it.
        </p>
        <div className="oga-pricing-hero__stamps">
          <Stamp label="Engine" value="v1.0.0" />
          <Stamp label="Contracts" value="Annual" />
          <Stamp label="Try first" value="Paid pilot" />
        </div>
      </div>
    </section>
  );
}

function Stamp({ label, value }: { label: string; value: string }) {
  return (
    <span className="oga-pricing-hero__stamp">
      <span className="oga-pricing-hero__stamp-label">{label}</span>
      <span className="oga-pricing-hero__stamp-value">{value}</span>
    </span>
  );
}

/* ============================================================
   PACKAGE CARDS (cream)
   ============================================================ */
function Packages() {
  return (
    <section className="oga-pricing-cards" data-oga-surface="light">
      <div className="oga-pricing-cards__inner">
        <div className="oga-pricing-cards__grid">
          {PACKAGES.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
        <p className="oga-pricing-cards__note">
          Guide prices, billed annually. Final pricing depends on usage, support
          and scope. Not sure which fits?{" "}
          <BookDemo className="oga-pricing-cards__note-link">Book a demo</BookDemo>.
        </p>
      </div>
    </section>
  );
}

function PackageCard({ pkg }: { pkg: Pkg }) {
  return (
    <div
      className={
        pkg.highlight
          ? "oga-pricing-card oga-pricing-card--highlight"
          : "oga-pricing-card"
      }
    >
      {pkg.badge && <span className="oga-pricing-card__badge">{pkg.badge}</span>}
      <div className="oga-pricing-card__name">{pkg.name}</div>
      <div className="oga-pricing-card__price">
        {pkg.price}
        {pkg.priceUnit && (
          <span className="oga-pricing-card__price-unit">{pkg.priceUnit}</span>
        )}
      </div>
      <div className="oga-pricing-card__price-note">{pkg.priceNote}</div>
      <p className="oga-pricing-card__tagline">{pkg.tagline}</p>
      <ul className="oga-pricing-card__features">
        {pkg.features.map((f) => (
          <li key={f} className="oga-pricing-card__feature">
            <span className="oga-pricing-card__feature-dot" aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="oga-pricing-card__cta-wrap">
        <PackageCta pkg={pkg} />
      </div>
    </div>
  );
}

function PackageCta({ pkg }: { pkg: Pkg }) {
  if (pkg.cta === "docs") {
    return (
      <Link href="/docs" className="oga-btn oga-btn-secondary oga-pricing-card__cta">
        View the docs
        <span aria-hidden>→</span>
      </Link>
    );
  }
  const label = pkg.cta === "sales" ? "Talk to sales" : "Book a demo";
  const cls = pkg.highlight
    ? "oga-btn oga-btn-primary oga-pricing-card__cta"
    : "oga-btn oga-btn-secondary oga-pricing-card__cta";
  return (
    <BookDemo className={cls}>
      {label}
      <span aria-hidden>→</span>
    </BookDemo>
  );
}

/* ============================================================
   COMPARISON TABLE (cream)
   ============================================================ */
function Comparison() {
  return (
    <section className="oga-pricing-table" data-oga-surface="light">
      <div className="oga-pricing-table__inner">
        <header className="oga-pricing-table__head">
          <div className="oga-pricing-table__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>Compare</span>
          </div>
          <h2 className="oga-pricing-table__title">What each package includes.</h2>
          <p className="oga-pricing-table__lead">
            Every capability below ships in the product today. You buy the
            package that fits the job; it includes the signals and scores that
            job needs.
          </p>
        </header>

        <div className="oga-pricing-table__wrap">
          <table className="oga-pricing-table__table">
            <thead>
              <tr>
                <th className="oga-pricing-table__th oga-pricing-table__th--feature">
                  Capability
                </th>
                {COLS.map((c, i) => (
                  <th
                    key={c}
                    className={
                      i === HIGHLIGHT_COL
                        ? "oga-pricing-table__th oga-pricing-table__th--highlight"
                        : "oga-pricing-table__th"
                    }
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.label} className="oga-pricing-table__tr">
                  <td className="oga-pricing-table__td oga-pricing-table__td--feature">
                    <span className="oga-pricing-table__label">{row.label}</span>
                  </td>
                  {row.values.map((v, vi) => (
                    <td
                      key={vi}
                      className={
                        vi === HIGHLIGHT_COL
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

function CellValue({ value }: { value: Cell }) {
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
        ·
      </span>
    );
  }
  return <span className="oga-pricing-table__cell-text">{value}</span>;
}

/* ============================================================
   FAQ (cream-quiet)
   ============================================================ */
function Faq() {
  return (
    <section className="oga-section-quiet oga-pricing-faq" data-oga-surface="light">
      <div className="oga-pricing-faq__inner">
        <header className="oga-pricing-faq__head">
          <div className="oga-pricing-faq__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 className="oga-pricing-faq__title">How buying works.</h2>
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
function FinalCta() {
  return (
    <section className="oga-section-dark oga-pricing-cta" data-oga-surface="dark">
      <div className="oga-pricing-cta__inner">
        <h2 className="oga-pricing-cta__title">See it on your own use case.</h2>
        <p className="oga-pricing-cta__lead">
          Book a demo and we will run OneGoodArea against a real workflow, then
          size a pilot or an annual contract.
        </p>
        <div className="oga-pricing-cta__buttons">
          <BookDemo className="oga-btn oga-btn-primary">
            Book a demo
            <span aria-hidden>→</span>
          </BookDemo>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
