"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../../design-v2/_shared/product-icons";
import "./api-reference.css";

/* /docs/api-reference — Brand v3 (Plotted) — rewritten in AR-358.

   Four products, one control plane, one spec. Reframed away from the
   previous "honest interim while we rebuild" theatre, which was
   pre-customer dress-up for a regeneration story that's already
   shipped (@fastify/swagger is wired in apps/api/src/app.ts:35 and
   the live Scalar reference at /openapi consumes it).

   Page layout:
     - Hero: direct framing, no "interim" language
     - Products: 4-up grid with bespoke product icons (same set as
       the marketing /products pages)
     - Levers: visually subordinate single card on a quiet surface,
       because Levers is the control plane, not a 5th product
     - Resources: pointer to /methodology + /openapi (the live
       interactive reference)
     - No roadmap section. The work it described is done. */

type Product = {
  num: string;
  name: string;
  count: string;
  body: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  endpoints: { verb: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"; path: string }[];
};

const PRODUCTS: Product[] = [
  {
    num: "01",
    name: "Signals",
    count: "4 endpoints",
    body: "Raw normalised signal catalog per area. The primitive — every other product composes from this.",
    icon: SignalsIcon,
    endpoints: [
      { verb: "GET", path: "/v1/area" },
      { verb: "GET", path: "/v1/signals/:category" },
      { verb: "GET", path: "/v1/areas" },
      { verb: "GET", path: "/v1/meta" },
    ],
  },
  {
    num: "02",
    name: "Scores",
    count: "1 endpoint",
    body: "Deterministic composite score per area. Four presets, custom weights, or saved organisation preset_id.",
    icon: ScoresIcon,
    endpoints: [
      { verb: "POST", path: "/v1/score" },
    ],
  },
  {
    num: "03",
    name: "Monitor",
    count: "7 endpoints",
    body: "Portfolios of tracked areas. Bulk enrich, detect monthly change, fire signal.changed webhooks.",
    icon: MonitorIcon,
    endpoints: [
      { verb: "POST",   path: "/v1/portfolios" },
      { verb: "GET",    path: "/v1/portfolios" },
      { verb: "GET",    path: "/v1/portfolios/:id" },
      { verb: "DELETE", path: "/v1/portfolios/:id" },
      { verb: "POST",   path: "/v1/portfolios/:id/areas" },
      { verb: "POST",   path: "/v1/portfolios/:id/enrich" },
      { verb: "POST",   path: "/v1/portfolios/:id/changes" },
    ],
  },
  {
    num: "04",
    name: "Intelligence",
    count: "4 endpoints",
    body: "Typed query plane. AI emits the plan; the database answers. 6 plan ops, 92.9% planner accuracy.",
    icon: IntelligenceIcon,
    endpoints: [
      { verb: "POST", path: "/v1/query" },
      { verb: "POST", path: "/v1/peers" },
      { verb: "POST", path: "/v1/insights" },
      { verb: "POST", path: "/v1/forecast" },
    ],
  },
];

const LEVERS_ENDPOINTS = [
  "/v1/orgs (+ CRUD)",
  "/v1/orgs/:id/bundles (+ CRUD)",
  "/v1/orgs/:id/presets (+ CRUD)",
  "/v1/orgs/:id/methodology (pin/unpin)",
  "/v1/orgs/:id/cohorts (+ CRUD)",
  "/v1/orgs/:id/members (+ CRUD, RBAC)",
  "/v1/orgs/:id/invitations",
  "/v1/webhooks",
];

/* ============================================================
   Page
   ============================================================ */

export default function ApiReferenceClient() {
  return (
    <div className="oga-root oga-apiref">
      <Nav />

      <Hero />
      <SectionProducts />
      <SectionLevers />
      <SectionResources />

      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="oga-apiref-hero oga-section-hero">
      <div className="oga-apiref__container--narrow">
        <div className="oga-apiref-hero__eyebrow">
          <span className="oga-apiref-hero__status-dot" aria-hidden />
          <span>API reference</span>
        </div>

        <h1 className="oga-apiref-hero__title">
          Four products. One control plane. One spec.
        </h1>

        <p className="oga-apiref-hero__lead">
          The OneGoodArea API exposes four composable products on one signal-first engine, plus a
          per-organisation control plane. Read the methodology to understand how the engine works.
          Open the interactive reference to query it.
        </p>

        <div className="oga-apiref-hero__actions">
          <Link href="/methodology" className="oga-btn oga-btn-primary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
          <Link href="/openapi" className="oga-btn oga-btn-secondary">
            Open the reference
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionProducts() {
  return (
    <section id="products" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-apiref__container">
        <header className="oga-apiref__header">
          <div className="oga-apiref__eyebrow">
            <span className="oga-apiref__eyebrow-num">01</span>
            <span className="oga-apiref__eyebrow-line" aria-hidden />
            <span>Products</span>
          </div>
          <h2 className="oga-apiref__h2">Four composable products.</h2>
          <p className="oga-apiref__lead">
            Same vocabulary as the marketing surfaces. Each tile lists its live endpoints. The
            engine details live on the methodology page; the interactive request runner lives on
            the reference.
          </p>
        </header>

        <div className="oga-apiref-products__grid">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <article key={p.num} className="oga-apiref-products__card">
                <div className="oga-apiref-products__card-head">
                  <span className="oga-apiref-products__card-icon"><Icon /></span>
                  <div className="oga-apiref-products__card-head-text">
                    <span className="oga-apiref-products__card-num">{p.num}</span>
                    <h3 className="oga-apiref-products__card-name">{p.name}</h3>
                  </div>
                  <span className="oga-apiref-products__card-count">{p.count}</span>
                </div>

                <p className="oga-apiref-products__card-body">{p.body}</p>

                <ul className="oga-apiref-products__endpoints">
                  {p.endpoints.map((e) => (
                    <li key={`${e.verb}-${e.path}`} className="oga-apiref-products__endpoint">
                      <span className={`oga-apiref-products__endpoint-verb oga-verb oga-verb--${e.verb.toLowerCase()}`}>
                        {e.verb}
                      </span>
                      <span className="oga-apiref-products__endpoint-path">{e.path}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionLevers() {
  return (
    <section id="levers" className="oga-section-quiet">
      <div className="oga-apiref__container">
        <header className="oga-apiref__header">
          <div className="oga-apiref__eyebrow">
            <span className="oga-apiref__eyebrow-num">02</span>
            <span className="oga-apiref__eyebrow-line" aria-hidden />
            <span>Control plane</span>
          </div>
          <h2 className="oga-apiref__h2">Levers — per-organisation methodology and admin.</h2>
          <p className="oga-apiref__lead">
            Different audience to the four products. Admins configure how the engine behaves for
            their organisation: custom signal bundles, saved scoring presets, methodology pinning,
            peer cohorts, members and RBAC, white-label, IP allowlist.
          </p>
        </header>

        <article className="oga-apiref-levers__card">
          <div className="oga-apiref-levers__head">
            <span className="oga-apiref-levers__count">~32 endpoints</span>
            <span className="oga-apiref-levers__divider" aria-hidden />
            <span className="oga-apiref-levers__scope">Admin / owner only</span>
          </div>
          <ul className="oga-apiref-levers__endpoints">
            {LEVERS_ENDPOINTS.map((path) => (
              <li key={path} className="oga-apiref-levers__endpoint">
                <span className="oga-apiref-levers__endpoint-bullet" aria-hidden />
                <span className="oga-apiref-levers__endpoint-path">{path}</span>
              </li>
            ))}
          </ul>
          <p className="oga-apiref-levers__foot">
            Full request shapes on the{" "}
            <Link href="/openapi" className="oga-apiref-levers__foot-link">
              interactive reference <span aria-hidden>→</span>
            </Link>
            . Methodology rationale on the{" "}
            <Link href="/methodology#levers" className="oga-apiref-levers__foot-link">
              Levers section of /methodology <span aria-hidden>→</span>
            </Link>.
          </p>
        </article>
      </div>
    </section>
  );
}

function SectionResources() {
  return (
    <section id="resources" className="oga-section-hero">
      <div className="oga-apiref__container">
        <header className="oga-apiref__header">
          <div className="oga-apiref__eyebrow">
            <span className="oga-apiref__eyebrow-num">03</span>
            <span className="oga-apiref__eyebrow-line" aria-hidden />
            <span>Reference</span>
          </div>
          <h2 className="oga-apiref__h2">Methodology and live spec.</h2>
          <p className="oga-apiref__lead">
            The engine details and the request runner. Both are live, both stay in step with the
            backend.
          </p>
        </header>

        <div className="oga-apiref-resources__grid">
          <Link href="/methodology" className="oga-apiref-resources__item">
            <span className="oga-apiref-resources__item-num">03.1</span>
            <h3 className="oga-apiref-resources__item-name">Methodology</h3>
            <p className="oga-apiref-resources__item-desc">
              14 sections covering signals, store, time-series, scoring, Intelligence, Levers,
              versioning. The why behind every endpoint.
            </p>
            <span className="oga-apiref-resources__item-cta">
              Read methodology
              <span aria-hidden>→</span>
            </span>
          </Link>

          <Link href="/openapi" className="oga-apiref-resources__item">
            <span className="oga-apiref-resources__item-num">03.2</span>
            <h3 className="oga-apiref-resources__item-name">Interactive reference</h3>
            <p className="oga-apiref-resources__item-desc">
              OpenAPI 3.0 spec auto-generated from the live Fastify schemas. Request shapes,
              response shapes, try-it-in-browser. Stays in step with the backend on every deploy.
            </p>
            <span className="oga-apiref-resources__item-cta">
              Open reference
              <span aria-hidden>→</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-apiref__container--narrow oga-apiref-cta__inner">
        <h2 className="oga-apiref-cta__title">
          The engine ships today.
        </h2>
        <p className="oga-apiref-cta__lead">
          Get an API key and start scoring areas. The methodology and the reference are both live.
        </p>
        <div className="oga-apiref-cta__buttons">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
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
