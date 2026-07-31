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
    body: "The underlying data for any UK area: crime, prices, deprivation, transport and more. Every value carries its source, its date, and a confidence score.",
    endpoint: { verb: "GET", path: "/v1/area?postcode=…" },
    caps: [
      "Neighbourhood-level (LSOA), refreshed monthly, from any UK postcode",
      "Crime, prices, deprivation, transport, plus year-on-year trends",
      "The source behind every number",
    ],
    icon: SignalsIcon,
    ready: true,
  },
  {
    slug: "scores",
    number: "02",
    name: "Scores",
    body: "A single 0-100 score for any area, from ready-made presets or your own weights. Repeatable by design: the same area always returns the same score.",
    endpoint: { verb: "POST", path: "/v1/score" },
    caps: [
      "Ready-made presets, or set your own weights",
      "Every response tells you which version produced it",
      "Lock a version your team relies on",
    ],
    icon: ScoresIcon,
    ready: true,
  },
  {
    slug: "monitor",
    number: "03",
    name: "Monitor",
    body: "Track a portfolio of areas and get alerted when something moves. Detects material month-over-month change and calls your webhook the day it happens.",
    endpoint: { verb: "POST", path: "/v1/portfolios/:id/enrich" },
    caps: [
      "Enrich portfolios of up to 200 areas at once",
      "Monthly change detection at a threshold you set",
      "Signed webhooks when a tracked area moves",
    ],
    icon: MonitorIcon,
    ready: true,
  },
  {
    slug: "intelligence",
    number: "04",
    name: "Intelligence",
    body: "Ask questions in plain English, or send a structured query. You get back a plan you can audit, and the same answer every time.",
    endpoint: { verb: "POST", path: "/v1/query" },
    caps: [
      "Rank, compare, find similar areas, spot anomalies, forecast",
      "Every answer comes with the plan that produced it",
      "Reproducible: the same question returns the same answer",
    ],
    icon: IntelligenceIcon,
    ready: true,
  },
];

export function ProductsSection() {
  return (
    <section className="oga-products" id="products">
      <div className="oga-products__field" aria-hidden />

      <div className="oga-products__inner">
        <div className="oga-products__header">
          <span className="oga-products__eyebrow">
            <span className="oga-products__eyebrow-num">02</span>
            <span className="oga-products__eyebrow-line" aria-hidden />
            Products
          </span>
          <h2 className="oga-products__title">Four products, one API.</h2>
          <p className="oga-products__lead">
            Pull the signals for any UK area, compress them into a score, track them
            over time, or ask questions across every neighbourhood. Use one product or
            all four, on the same versioned engine.
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
        <span className={`oga-products__card-endpoint-verb oga-verb oga-verb--${product.endpoint.verb.toLowerCase()}`}>
          {product.endpoint.verb}
        </span>
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
