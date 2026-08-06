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
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "./api-reference.css";

/* /docs/api-reference - the reference landing, rebuilt bespoke in the
   product-page language (Plan 064, second pass). Centred hero like
   /methodology, alternating light / cream / dark shells, and a distinct
   monochrome signature per section: the request plate in the hero, the
   essentials tiles, the four products with two-tone (read / write) verbs,
   the control-plane list, and the conventions list beside a live error
   shape. No rainbow verb colours, no reused console. Endpoint paths stay
   (this is the reference); implementation detail and the interactive runner
   live in /playground. Plain full-sentence copy throughout. */

type Verb = "GET" | "POST" | "PUT" | "DELETE";
type Endpoint = { verb: Verb; path: string };
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
    body: "Every public signal for an area, in one consistent shape. The primitive everything else is built on.",
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
    body: "A single 0 to 100 score for an area, from one of four profiles, your own weights, or a weighting saved for your team.",
    endpoints: [{ verb: "POST", path: "/v1/score" }],
  },
  {
    name: "Monitor",
    count: "7 endpoints",
    icon: MonitorIcon,
    body: "Watch a list of areas, enrich them in bulk, track monthly change, and get a signed webhook when something material moves.",
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

const ESSENTIALS: { label: string; value: string; note: string }[] = [
  {
    label: "Base URL",
    value: "onegoodarea.onrender.com/v1",
    note: "One HTTPS endpoint. Every product lives under the /v1 path.",
  },
  {
    label: "Authentication",
    value: "Authorization: Bearer oga_live_…",
    note: "One key per environment, sent as a bearer token on every request.",
  },
  {
    label: "Versioning",
    value: `X-Engine-Version: ${METHODOLOGY_VERSION}`,
    note: "Every response is stamped. Pin a version and the same request returns the same number later.",
  },
  {
    label: "Format",
    value: "application/json",
    note: "JSON in, JSON out. Every value carries its own source and confidence.",
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

const CONVENTIONS: { name: string; body: string }[] = [
  {
    name: "One error shape",
    body: "Every failure returns the same object with a stable code and a plain message, so you handle errors once and never parse prose.",
  },
  {
    name: "Cursor pagination",
    body: "List endpoints page through a stable cursor, so large result sets come back in order with nothing skipped or repeated.",
  },
  {
    name: "Clear rate limits",
    body: "Every response carries your remaining budget in its headers, so you can slow down smoothly instead of being cut off.",
  },
  {
    name: "One consistent shape",
    body: "A signal looks the same on every endpoint, so what you learn reading one response carries straight to the others.",
  },
];

export default function ApiReferenceClient() {
  return (
    <div className="oga-root oga-apiref">
      <Nav />
      <Hero />
      <SectionEssentials />
      <SectionProducts />
      <SectionControlPlane />
      <SectionConventions />
      <SectionResources />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero - headline + the request plate
   ============================================================ */

function Hero() {
  return (
    <section className="oga-apiref-hero">
      <div className="oga-apiref-hero__dots" aria-hidden />
      <div className="oga-apiref-hero__inner">
        <span className="oga-apiref-hero__eyebrow">
          <span>API reference</span>
          <span className="oga-apiref-hero__eyebrow-dot" aria-hidden />
          <span>Engine v{METHODOLOGY_VERSION}</span>
        </span>
        <h1 className="oga-apiref-hero__title">Build on the OneGoodArea API.</h1>
        <p className="oga-apiref-hero__lead">
          Four products and a control plane on one REST API. Browse what every
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

      <div className="oga-apiref-hero__stage" aria-hidden>
        <RequestPlate />
      </div>
    </section>
  );
}

/* The signature illustration: one real request and the shape it returns,
   laid out like a spec sheet rather than a terminal. Monochrome. */
function RequestPlate() {
  return (
    <article className="oga-apiref-plate">
      <div className="oga-apiref-plate__block">
        <div className="oga-apiref-plate__cap">
          <span>Request</span>
          <span className="oga-apiref-plate__cap-meta">REST · JSON</span>
        </div>
        <div className="oga-apiref-plate__req">
          <span className="oga-apiref-verb oga-apiref-verb--read">GET</span>
          <span className="oga-apiref-plate__path">/v1/area?postcode=M1 1AE</span>
        </div>
        <div className="oga-apiref-plate__hdr">Authorization: Bearer oga_live_…</div>
        <div className="oga-apiref-plate__hdr">X-Engine-Version: {METHODOLOGY_VERSION}</div>
      </div>

      <div className="oga-apiref-plate__sep" />

      <div className="oga-apiref-plate__block">
        <div className="oga-apiref-plate__cap">
          <span>Response</span>
          <span className="oga-apiref-plate__cap-ok">200 OK</span>
        </div>
        <ul className="oga-apiref-plate__rows">
          <li><span>area</span><em>M1 1AE · Manchester</em></li>
          <li><span>signals</span><em>7 categories</em></li>
          <li><span>version</span><em>{METHODOLOGY_VERSION}</em></li>
        </ul>
      </div>
    </article>
  );
}

/* ============================================================
   01 Essentials (quiet) - base url, auth, versioning, format
   ============================================================ */

function SectionEssentials() {
  return (
    <section id="essentials" className="oga-apiref-sec oga-apiref-sec--quiet">
      <div className="oga-apiref__wrap">
        <ApiHead num="01" kicker="Start here" title="One base URL, one key, one shape.">
          Everything you need to make a first call. Point at the base URL, send
          your key as a bearer token, and read JSON back with the engine version
          that produced it.
        </ApiHead>

        <div className="oga-apiref-ess__grid">
          {ESSENTIALS.map((e) => (
            <article key={e.label} className="oga-apiref-ess__tile">
              <div className="oga-apiref-ess__label">{e.label}</div>
              <div className="oga-apiref-ess__value">{e.value}</div>
              <p className="oga-apiref-ess__note">{e.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   02 Products (dark) - the four products and their endpoints
   ============================================================ */

function SectionProducts() {
  return (
    <section id="products" className="oga-apiref-sec oga-apiref-sec--dark" data-oga-surface="dark">
      <div className="oga-apiref__wrap">
        <ApiHead num="02" kicker="Products" title="Four products on one API." dark>
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
                  <span className="oga-apiref-prod__icon"><Icon width={24} height={24} /></span>
                  <span className="oga-apiref-prod__count">{p.count}</span>
                </div>
                <h3 className="oga-apiref-prod__name">{p.name}</h3>
                <p className="oga-apiref-prod__body">{p.body}</p>
                <ul className="oga-apiref-prod__eps">
                  {p.endpoints.map((e) => (
                    <li key={`${e.verb}-${e.path}`} className="oga-apiref-prod__ep">
                      <Chip verb={e.verb} />
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

function Chip({ verb }: { verb: Verb }) {
  const kind = verb === "GET" ? "read" : "write";
  return <span className={`oga-apiref-verb oga-apiref-verb--${kind}`}>{verb}</span>;
}

/* ============================================================
   03 Control plane (light) - org configuration endpoints
   ============================================================ */

function SectionControlPlane() {
  return (
    <section id="control-plane" className="oga-apiref-sec oga-apiref-sec--light">
      <div className="oga-apiref__wrap">
        <ApiHead num="03" kicker="Control plane" title="Configure it for your whole organisation.">
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
            The reasoning behind these lives in{" "}
            <Link href="/methodology#levers" className="oga-apiref-cp__link">
              the Levers section of the methodology <span aria-hidden>→</span>
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   04 Conventions (quiet) - how requests and responses behave
   ============================================================ */

function SectionConventions() {
  return (
    <section id="conventions" className="oga-apiref-sec oga-apiref-sec--quiet">
      <div className="oga-apiref__wrap">
        <ApiHead num="04" kicker="Conventions" title="Predictable requests, predictable responses.">
          The same rules hold across every endpoint, so once you have handled one
          call you have handled them all. Errors, paging and rate limits all work
          the same way, whichever product you are using.
        </ApiHead>

        <div className="oga-apiref-conv__grid">
          <ul className="oga-apiref-conv__list">
            {CONVENTIONS.map((c, i) => (
              <li key={c.name} className="oga-apiref-conv__item">
                <span className="oga-apiref-conv__num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="oga-apiref-conv__name">{c.name}</div>
                  <p className="oga-apiref-conv__body">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="oga-apiref-conv__aside">
            <article className="oga-apiref-errplate" aria-hidden data-oga-surface="dark">
              <div className="oga-apiref-errplate__cap">
                <span>Response</span>
                <span className="oga-apiref-errplate__code">404</span>
              </div>
              <pre className="oga-apiref-errplate__code-block">{`{
  "error": {
    "code": "area_not_found",
    "message": "No area matches that postcode."
  }
}`}</pre>
            </article>
            <p className="oga-apiref-conv__note">
              One shape for every error. Switch on the code, show the message.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   05 Go deeper (light) - methodology + interactive reference
   ============================================================ */

function SectionResources() {
  return (
    <section id="reference" className="oga-apiref-sec oga-apiref-sec--light">
      <div className="oga-apiref__wrap">
        <ApiHead num="05" kicker="Go deeper" title="The methodology and the live reference.">
          The reasoning behind every endpoint, and a runner to try them. Both stay
          in step with the API on every deploy, so neither ever drifts.
        </ApiHead>

        <div className="oga-apiref-res__grid">
          <Link href="/methodology" className="oga-apiref-res__card">
            <span className="oga-apiref-res__kicker">Methodology</span>
            <p className="oga-apiref-res__desc">
              How every signal, score, comparison and forecast is worked out, and
              the public sources behind them. The why behind every endpoint.
            </p>
            <span className="oga-apiref-res__cta">Read the methodology <span aria-hidden>→</span></span>
          </Link>
          <Link href="/playground" className="oga-apiref-res__card">
            <span className="oga-apiref-res__kicker">Interactive reference</span>
            <p className="oga-apiref-res__desc">
              Every endpoint, generated from the live API so it never drifts. See
              the exact request and response shapes, and try any call in your
              browser.
            </p>
            <span className="oga-apiref-res__cta">Open the reference <span aria-hidden>→</span></span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA (dark)
   ============================================================ */

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

/* ============================================================
   Shared section header
   ============================================================ */

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
