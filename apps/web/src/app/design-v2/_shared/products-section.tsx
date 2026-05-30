"use client";

import { SignalsIcon, ScoresIcon, MonitorIcon, IntelligenceIcon } from "./product-icons";
import type { ComponentType, SVGProps } from "react";
import "./products-section.css";

/* Products Section (03) — "The four products."
   Replaces the legacy DefensibleSection (methodology zigzag — that
   content moves to /methodology when that page is redesigned in PR 10).
   2x2 grid of product cards on a dark graphite surface; keeps the
   homepage's dark-light-dark rhythm.
   AR-204 PR 2. */

type Product = {
  slug: "signals" | "scores" | "monitor" | "intelligence";
  number: string;
  name: string;
  body: string;
  endpoint: { verb: "GET" | "POST"; path: string };
  caps: string[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /* Flip to true once /products/<slug> ships. While false, the CTA
     renders disabled with a "Coming soon" pill per the wiring rule. */
  ready: boolean;
};

const PRODUCTS: Product[] = [
  {
    slug: "signals",
    number: "01",
    name: "Signals",
    body: "Raw normalized data per area. Every signal carries source, observed period, confidence, normalized value, and country-scoped percentile.",
    endpoint: { verb: "GET", path: "/v1/area?postcode=…" },
    caps: [
      "LSOA × month grain, postcode resolution via ONS spine",
      "Deprivation, crime, property, derived YoY + momentum",
      "Source lineage on every value",
    ],
    icon: SignalsIcon,
    ready: false,
  },
  {
    slug: "scores",
    number: "02",
    name: "Scores",
    body: "Composite 0–100 score per area. Presets or custom weights. Deterministic frozen engine; same input always returns the same number.",
    endpoint: { verb: "POST", path: "/v1/score" },
    caps: [
      "Three presets or per-dimension custom weights",
      "Engine version stamped on every response",
      "Org-level methodology pinning for compliance",
    ],
    icon: ScoresIcon,
    ready: false,
  },
  {
    slug: "monitor",
    number: "03",
    name: "Monitor",
    body: "Save a portfolio, enrich it, detect material change month over month. Webhook alerts when a signal moves past your configured threshold.",
    endpoint: { verb: "POST", path: "/v1/portfolios/:id/enrich" },
    caps: [
      "Bulk enrichment for portfolios up to 200 areas",
      "Monthly change detection with configurable threshold",
      "signal.changed webhooks delivered to your endpoint",
    ],
    icon: MonitorIcon,
    ready: false,
  },
  {
    slug: "intelligence",
    number: "04",
    name: "Intelligence",
    body: "Typed query plane over the store. Ask in JSON or natural language. AI emits the plan; the database answers. Every result is reproducible.",
    endpoint: { verb: "POST", path: "/v1/query" },
    caps: [
      "Compound filter + rank, find peers, insights, forecast",
      "92.9% planner accuracy baseline (14-case corpus)",
      "Plan echoed on every response for full auditability",
    ],
    icon: IntelligenceIcon,
    ready: false,
  },
];

export function ProductsSection() {
  return (
    <section className="oga-products" id="products">
      <div className="oga-products__field" aria-hidden />

      <div className="oga-products__inner">
        <div className="oga-products__header">
          <span className="oga-products__eyebrow">
            <span className="oga-products__eyebrow-num">03</span>
            <span className="oga-products__eyebrow-line" aria-hidden />
            Products
          </span>
          <h2 className="oga-products__title">Four composable building blocks.</h2>
          <p className="oga-products__lead">
            Signals are the primitive. Scores compose them into a number. Monitor watches them
            over time. Intelligence queries them in plan-form. Use one. Use all four. Same engine,
            same lineage, same audit trail.
          </p>
        </div>

        <div className="oga-products__grid">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const Icon = product.icon;
  return (
    <article className="oga-products__card">
      <div className="oga-products__card-head">
        <span className="oga-products__card-icon" aria-hidden><Icon /></span>
        <span className="oga-products__card-num">Product {product.number}</span>
      </div>

      <h3 className="oga-products__card-name">{product.name}</h3>
      <p className="oga-products__card-body">{product.body}</p>

      <span className="oga-products__card-endpoint">
        <span className="oga-products__card-endpoint-verb">{product.endpoint.verb}</span>
        <span>{product.endpoint.path}</span>
      </span>

      <ul className="oga-products__card-caps">
        {product.caps.map((cap) => (
          <li key={cap} className="oga-products__card-cap">{cap}</li>
        ))}
      </ul>

      <div className="oga-products__card-foot">
        {product.ready ? (
          <a href={`/products/${product.slug}`} className="oga-products__card-cta">
            Explore {product.name}
            <span aria-hidden>→</span>
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="oga-products__card-cta"
          >
            Explore {product.name}
            <span aria-hidden>→</span>
          </button>
        )}
        {!product.ready && (
          <span className="oga-products__card-pill">Coming soon</span>
        )}
      </div>
    </article>
  );
}
