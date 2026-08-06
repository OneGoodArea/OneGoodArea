"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";
import { DEMO_URL } from "../../design-v2/_shared/book-demo";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../../design-v2/_shared/product-icons";
import "./api-reference.css";

/* /docs/api-reference - the reference landing, rebuilt bespoke in the
   product-page language (Plan 064). A signature request/response console in
   the hero, then the four products with their live endpoints, the
   control-plane endpoints, and the routes to /methodology and the live
   interactive Scalar reference (the Scalar itself is untouched). Endpoint
   paths stay (this is the reference); implementation jargon and the planner
   accuracy stat are gone, plain full-sentence copy throughout. */

type Endpoint = { verb: "GET" | "POST" | "PUT" | "DELETE"; path: string };
type Product = {
  name: string;
  count: string;
  body: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  endpoints: Endpoint[];
};

const PRODUCTS: Product[] = [
  {
    name: "Signals",
    count: "4 endpoints",
    icon: SignalsIcon,
    body: "Every public signal for an area, in one consistent shape. The primitive everything else builds on.",
    endpoints: [
      { verb: "GET", path: "/v1/area" },
      { verb: "GET", path: "/v1/signals/:category" },
      { verb: "GET", path: "/v1/areas" },
      { verb: "GET", path: "/v1/meta" },
    ],
  },
  {
    name: "Scores",
    count: "1 endpoint",
    icon: ScoresIcon,
    body: "A single 0 to 100 score for an area, from one of four profiles, custom weights, or a weighting saved for your organisation.",
    endpoints: [{ verb: "POST", path: "/v1/score" }],
  },
  {
    name: "Monitor",
    count: "7 endpoints",
    icon: MonitorIcon,
    body: "Watch a list of areas, enrich them in bulk, detect monthly change, and get a signed webhook when something material moves.",
    endpoints: [
      { verb: "POST", path: "/v1/portfolios" },
      { verb: "GET", path: "/v1/portfolios" },
      { verb: "GET", path: "/v1/portfolios/:id" },
      { verb: "DELETE", path: "/v1/portfolios/:id" },
      { verb: "POST", path: "/v1/portfolios/:id/areas" },
      { verb: "POST", path: "/v1/portfolios/:id/enrich" },
      { verb: "POST", path: "/v1/portfolios/:id/changes" },
    ],
  },
  {
    name: "Intelligence",
    count: "4 endpoints",
    icon: IntelligenceIcon,
    body: "Ask in plain English or send a typed query. You get the answer and the plan behind it, so every result can be reviewed and run again.",
    endpoints: [
      { verb: "POST", path: "/v1/query" },
      { verb: "POST", path: "/v1/peers" },
      { verb: "POST", path: "/v1/insights" },
      { verb: "POST", path: "/v1/forecast" },
    ],
  },
];

const CONTROL_PLANE: { path: string; note: string }[] = [
  { path: "/v1/orgs", note: "Organisations" },
  { path: "/v1/orgs/:id/bundles", note: "Signal bundles" },
  { path: "/v1/orgs/:id/presets", note: "Scoring presets" },
  { path: "/v1/orgs/:id/methodology", note: "Version pinning" },
  { path: "/v1/orgs/:id/cohorts", note: "Peer groups" },
  { path: "/v1/orgs/:id/members", note: "Members and roles" },
  { path: "/v1/orgs/:id/invitations", note: "Invitations" },
  { path: "/v1/webhooks", note: "Webhook delivery" },
];

export default function ApiReferenceClient() {
  return (
    <div className="oga-root oga-apiref">
      <Nav />
      <Hero />
      <SectionProducts />
      <SectionControlPlane />
      <SectionResources />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------- Hero: headline + request/response console ---------- */

function Hero() {
  return (
    <section className="oga-apiref-hero">
      <div className="oga-apiref-hero__dots" aria-hidden />
      <div className="oga-apiref-hero__inner">
        <div className="oga-apiref-hero__copy">
          <span className="oga-apiref-hero__eyebrow">
            <span className="oga-apiref-hero__eyebrow-dot" aria-hidden />
            API reference
          </span>
          <h1 className="oga-apiref-hero__title">Build on the OneGoodArea API.</h1>
          <p className="oga-apiref-hero__lead">
            Four products and a control plane, all on one API. Browse what every
            endpoint does here, read how the engine works on the methodology page,
            or open the interactive reference to try any call in your browser.
          </p>
          <div className="oga-apiref-hero__ctas">
            <Link href="/playground" className="oga-btn oga-btn-primary">
              Open the interactive reference
              <span aria-hidden>→</span>
            </Link>
            <Link href="/methodology" className="oga-btn oga-btn-secondary">
              Read the methodology
            </Link>
          </div>
        </div>

        <div className="oga-apiref-hero__console" aria-hidden>
          <div className="oga-apiref-hero__con-bar">
            <span className="oga-apiref-hero__con-dots"><i /><i /><i /></span>
            <span className="oga-apiref-hero__con-meta">REST · JSON</span>
          </div>
          <div className="oga-apiref-hero__con-body">
            <div className="oga-apiref-hero__con-req">
              <span className="oga-apiref-hero__con-verb">GET</span>
              <span className="oga-apiref-hero__con-path">/v1/area?postcode=M1 1AE</span>
            </div>
            <div className="oga-apiref-hero__con-auth">Authorization: Bearer oga_…</div>
            <div className="oga-apiref-hero__con-sep" />
            <ul className="oga-apiref-hero__con-rows">
              <li><span>crime</span><span>92nd pct</span><em>police.uk</em></li>
              <li><span>deprivation</span><span>decile 1</span><em>IMD 2025</em></li>
              <li><span>schools</span><span>4 rated good</span><em>Ofsted</em></li>
            </ul>
            <div className="oga-apiref-hero__con-status">200 · engine v1.1.0</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 01 Products (dark) ---------- */

function SectionProducts() {
  return (
    <section id="products" className="oga-apiref-sec oga-apiref-sec--dark" data-oga-surface="dark">
      <div className="oga-apiref__wrap">
        <ApiHead num="01" kicker="Products" title="Four products on one API." dark>
          Each product exposes a small set of endpoints. Read how they work on the
          methodology page, and open the interactive reference to try any of them
          in your browser.
        </ApiHead>

        <div className="oga-apiref-prod__grid">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <article key={p.name} className="oga-apiref-prod__card">
                <div className="oga-apiref-prod__top">
                  <span className="oga-apiref-prod__icon"><Icon width={26} height={26} /></span>
                  <span className="oga-apiref-prod__count">{p.count}</span>
                </div>
                <h3 className="oga-apiref-prod__name">{p.name}</h3>
                <p className="oga-apiref-prod__body">{p.body}</p>
                <ul className="oga-apiref-prod__eps">
                  {p.endpoints.map((e) => (
                    <li key={`${e.verb}-${e.path}`} className="oga-apiref-prod__ep">
                      <span className={`oga-apiref-prod__verb oga-apiref-prod__verb--${e.verb.toLowerCase()}`}>{e.verb}</span>
                      <span className="oga-apiref-prod__path">{e.path}</span>
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

/* ---------- 02 Control plane (quiet) ---------- */

function SectionControlPlane() {
  return (
    <section id="control-plane" className="oga-apiref-sec oga-apiref-sec--quiet">
      <div className="oga-apiref__wrap">
        <ApiHead num="02" kicker="Control plane" title="Configure it for your whole organisation.">
          A separate set of endpoints for admins and owners: signal bundles,
          scoring presets, version pinning, peer groups, members and roles, and
          webhook delivery. All opt-in, and covered in full on the interactive
          reference.
        </ApiHead>

        <div className="oga-apiref-cp__panel">
          <ul className="oga-apiref-cp__list">
            {CONTROL_PLANE.map((c) => (
              <li key={c.path} className="oga-apiref-cp__row">
                <span className="oga-apiref-cp__path">{c.path}</span>
                <span className="oga-apiref-cp__note">{c.note}</span>
              </li>
            ))}
          </ul>
          <p className="oga-apiref-cp__foot">
            The why behind these lives in{" "}
            <Link href="/methodology#levers" className="oga-apiref-cp__link">
              the Levers section of the methodology <span aria-hidden>→</span>
            </Link>.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 03 Reference (light) ---------- */

function SectionResources() {
  return (
    <section id="reference" className="oga-apiref-sec oga-apiref-sec--light">
      <div className="oga-apiref__wrap">
        <ApiHead num="03" kicker="Go deeper" title="The methodology and the live reference.">
          The reasoning behind every endpoint, and a runner to try them. Both stay
          in step with the API on every deploy.
        </ApiHead>

        <div className="oga-apiref-res__grid">
          <Link href="/methodology" className="oga-apiref-res__card">
            <h3 className="oga-apiref-res__name">Methodology</h3>
            <p className="oga-apiref-res__desc">
              How every signal, score, comparison and forecast is worked out, and
              the public sources behind them. The why behind every endpoint.
            </p>
            <span className="oga-apiref-res__cta">Read the methodology <span aria-hidden>→</span></span>
          </Link>
          <Link href="/playground" className="oga-apiref-res__card">
            <h3 className="oga-apiref-res__name">Interactive reference</h3>
            <p className="oga-apiref-res__desc">
              Every endpoint, generated from the live API so it never drifts. See
              the request and response shapes, and try any call in your browser.
            </p>
            <span className="oga-apiref-res__cta">Open the reference <span aria-hidden>→</span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA (dark) ---------- */

function FinalCta() {
  return (
    <section className="oga-apiref-sec oga-apiref-sec--dark oga-apiref-cta" data-oga-surface="dark">
      <div className="oga-apiref__wrap oga-apiref-cta__inner">
        <h2 className="oga-apiref-cta__title">Start building.</h2>
        <p className="oga-apiref-cta__lead">
          Make your first call in the playground, then reach for the interactive
          reference whenever you need the exact shape of a request.
        </p>
        <div className="oga-apiref-cta__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href={DEMO_URL} className="oga-btn oga-btn-secondary">
            Book a demo
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shared section header ---------- */

function ApiHead({
  num,
  kicker,
  title,
  children,
  dark = false,
}: {
  num: string;
  kicker: string;
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <header className={`oga-apiref-head${dark ? " oga-apiref-head--dark" : ""}`}>
      <div className="oga-apiref-head__eyebrow">
        <span className="oga-apiref-head__num">{num}</span>
        <span className="oga-apiref-head__line" aria-hidden />
        <span>{kicker}</span>
      </div>
      <h2 className="oga-apiref-head__title">{title}</h2>
      <p className="oga-apiref-head__lead">{children}</p>
    </header>
  );
}
