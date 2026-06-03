"use client";

import Link from "next/link";
import { Nav } from "../../design-v2/_shared/nav";
import { Footer } from "../../design-v2/_shared/footer";
import "./api-reference.css";

/* /docs/api-reference — Brand v3 (Plotted) — AR-204 PR B + cleanup.

   The interactive reference is being regenerated from live Fastify
   schemas (each route file under apps/api/src/modules). While that
   ships, this page presents a surface map of every product endpoint
   and pointers to what works today: /methodology, ADR repo, source.

   Per Pedro 2026-05-30: dropped the previous "what the previous
   spec got wrong" callout. Pre-launch, that section read as
   apology to nobody; the hero pill "API reference, being
   regenerated" already conveys the rebuild without dwelling.

   While here, flipped § 01 Surface map to .oga-section-dark to
   address the related "no mid-page dark anchor" issue Pedro
   flagged on /docs/mcp. Surface cards get translucent-on-dark
   styling per the data-oga-surface override block in
   api-reference.css. */

/* ───────────────────────────── surface map */

type Surface = {
  num: string;
  name: string;
  count: string;
  body: string;
  endpoints: { verb: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"; path: string }[];
  more?: string;
  docsHref: string;
  docsReady: boolean;
};

const SURFACES: Surface[] = [
  {
    num: "01",
    name: "Signals",
    count: "4 endpoints",
    body: "Raw normalized signal catalog per area. The primitive — every other surface composes from this.",
    endpoints: [
      { verb: "GET", path: "/v1/area" },
      { verb: "GET", path: "/v1/signals/:category" },
      { verb: "GET", path: "/v1/areas" },
      { verb: "GET", path: "/v1/meta" },
    ],
    docsHref: "/docs/signals",
    docsReady: false,
  },
  {
    num: "02",
    name: "Scores",
    count: "1 endpoint",
    body: "Deterministic composite score per area. Four presets, custom weights, or saved organisation preset_id.",
    endpoints: [
      { verb: "POST", path: "/v1/score" },
    ],
    docsHref: "/docs/scores",
    docsReady: false,
  },
  {
    num: "03",
    name: "Monitor",
    count: "7 endpoints",
    body: "Portfolios of tracked areas. Bulk enrich, detect monthly change, fire signal.changed webhooks.",
    endpoints: [
      { verb: "POST",   path: "/v1/portfolios" },
      { verb: "GET",    path: "/v1/portfolios" },
      { verb: "GET",    path: "/v1/portfolios/:id" },
      { verb: "DELETE", path: "/v1/portfolios/:id" },
      { verb: "POST",   path: "/v1/portfolios/:id/areas" },
      { verb: "POST",   path: "/v1/portfolios/:id/enrich" },
      { verb: "POST",   path: "/v1/portfolios/:id/changes" },
    ],
    docsHref: "/docs/monitor",
    docsReady: false,
  },
  {
    num: "04",
    name: "Intelligence",
    count: "4 endpoints",
    body: "Typed query plane. AI emits the plan; the database answers. 6 plan ops, 92.9% planner accuracy.",
    endpoints: [
      { verb: "POST", path: "/v1/query" },
      { verb: "POST", path: "/v1/peers" },
      { verb: "POST", path: "/v1/insights" },
      { verb: "POST", path: "/v1/forecast" },
    ],
    docsHref: "/docs/intelligence",
    docsReady: false,
  },
  {
    num: "05",
    name: "Levers (organisation)",
    count: "~25 endpoints",
    body: "Per-organisation methodology + admin. Custom signal bundles, scoring presets, methodology pinning, peer cohorts, members, RBAC, white-label, IP allowlist.",
    endpoints: [
      { verb: "POST",   path: "/v1/orgs" },
      { verb: "PATCH",  path: "/v1/orgs/:id" },
      { verb: "POST",   path: "/v1/orgs/:id/bundles" },
      { verb: "POST",   path: "/v1/orgs/:id/presets" },
      { verb: "PUT",    path: "/v1/orgs/:id/methodology" },
      { verb: "POST",   path: "/v1/orgs/:id/cohorts" },
    ],
    more: "+ 19 more (CRUD per resource, members CRUD)",
    docsHref: "/docs/levers",
    docsReady: false,
  },
  {
    num: "06",
    name: "Reports",
    count: "3 endpoints",
    body: "AI-narrated report for one area, bulk batch, list-mine.",
    endpoints: [
      { verb: "POST", path: "/v1/report" },
      { verb: "POST", path: "/v1/batch" },
      { verb: "GET",  path: "/me/reports" },
    ],
    docsHref: "/docs/reports",
    docsReady: false,
  },
];

/* ───────────────────────────── what you can use today */

type ResourceTile = {
  num: string;
  name: string;
  desc: string;
  href: string;
  external?: boolean;
  cta: string;
};

const RESOURCES: ResourceTile[] = [
  {
    num: "03.1",
    name: "Methodology",
    desc: "Live page. 14 sections covering signals, store, time-series, scoring, Intelligence, Levers, versioning.",
    href: "/methodology",
    cta: "Read methodology",
  },
  {
    num: "03.2",
    name: "Current spec snapshot",
    desc: "OpenAPI 3.0 v2.0.0. Documents the existing surface; kept available for buyers integrated against it while the interactive reference is regenerated.",
    href: "/openapi.json",
    cta: "Download JSON",
  },
];

/* ============================================================
   Page
   ============================================================ */

export default function ApiReferenceClient() {
  return (
    <div className="oga-root oga-apiref">
      <Nav />

      <Hero />
      <SectionSurfaces />
      <SectionToday />
      <SectionRoadmap />

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
          <span className="oga-apiref-hero__eyebrow-sep" aria-hidden />
          <span>Being regenerated</span>
        </div>

        <h1 className="oga-apiref-hero__title">
          An honest interim while we rebuild the interactive reference.
        </h1>

        <p className="oga-apiref-hero__lead">
          We&rsquo;re regenerating the interactive reference from the live Fastify backend. While that
          ships, here&rsquo;s a surface map of every product endpoint, with a pointer to the methodology.
        </p>

        <div className="oga-apiref-hero__actions">
          <Link href="/methodology" className="oga-btn oga-btn-primary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            Back to docs
            <span aria-hidden>←</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionSurfaces() {
  return (
    <section id="surfaces" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-apiref__container">
        <header className="oga-apiref__header">
          <div className="oga-apiref__eyebrow">
            <span className="oga-apiref__eyebrow-num">01</span>
            <span className="oga-apiref__eyebrow-line" aria-hidden />
            <span>Surface map</span>
          </div>
          <h2 className="oga-apiref__h2">Six product surfaces, ~70 live endpoints.</h2>
          <p className="oga-apiref__lead">
            One card per product surface with a representative endpoint list. Detailed per-surface docs
            are the next wave of work; until they ship, the methodology page covers the engine.
          </p>
        </header>

        <div className="oga-apiref-surfaces__grid">
          {SURFACES.map((s) => (
            <article key={s.num} className="oga-apiref-surfaces__card">
              <div className="oga-apiref-surfaces__card-head">
                <span className="oga-apiref-surfaces__card-num">{s.num}</span>
                <span className="oga-apiref-surfaces__card-count">{s.count}</span>
              </div>
              <h3 className="oga-apiref-surfaces__card-name">{s.name}</h3>
              <p className="oga-apiref-surfaces__card-body">{s.body}</p>

              <ul className="oga-apiref-surfaces__endpoints">
                {s.endpoints.map((e) => (
                  <li key={`${e.verb}-${e.path}`} className="oga-apiref-surfaces__endpoint">
                    <span className={`oga-apiref-surfaces__endpoint-verb oga-verb oga-verb--${e.verb.toLowerCase()}`}>
                      {e.verb}
                    </span>
                    <span className="oga-apiref-surfaces__endpoint-path">{e.path}</span>
                  </li>
                ))}
                {s.more && (
                  <li className="oga-apiref-surfaces__more">{s.more}</li>
                )}
              </ul>

              <span className="oga-apiref-surfaces__card-cta">
                <span>{s.docsHref}</span>
                <span className="oga-apiref-surfaces__card-cta-pill">Coming soon</span>
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionToday() {
  return (
    <section id="today" className="oga-section-hero">
      <div className="oga-apiref__container">
        <header className="oga-apiref__header">
          <div className="oga-apiref__eyebrow">
            <span className="oga-apiref__eyebrow-num">02</span>
            <span className="oga-apiref__eyebrow-line" aria-hidden />
            <span>What you can use today</span>
          </div>
          <h2 className="oga-apiref__h2">Two resources that work right now.</h2>
          <p className="oga-apiref__lead">
            Methodology page for the engine, and the current OpenAPI spec snapshot for buyers who
            already integrated.
          </p>
        </header>

        <div className="oga-apiref-today__grid">
          {RESOURCES.map((r) => {
            const inner = (
              <>
                <span className="oga-apiref-today__item-num">{r.num}</span>
                <h3 className="oga-apiref-today__item-name">{r.name}</h3>
                <p className="oga-apiref-today__item-desc">{r.desc}</p>
                <span className="oga-apiref-today__item-cta">
                  {r.cta}
                  <span aria-hidden>→</span>
                </span>
              </>
            );

            if (r.external) {
              return (
                <a
                  key={r.num}
                  className="oga-apiref-today__item"
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {inner}
                </a>
              );
            }

            return (
              <Link key={r.num} className="oga-apiref-today__item" href={r.href}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionRoadmap() {
  return (
    <section id="roadmap" className="oga-section-quiet">
      <div className="oga-apiref__container">
        <header className="oga-apiref__header">
          <div className="oga-apiref__eyebrow">
            <span className="oga-apiref__eyebrow-num">03</span>
            <span className="oga-apiref__eyebrow-line" aria-hidden />
            <span>Track to the new spec</span>
          </div>
          <h2 className="oga-apiref__h2">Regenerate from the live backend, not by hand.</h2>
          <p className="oga-apiref__lead">
            The new spec will be derived from Fastify route schemas already defined in
            <code> apps/api/src/modules/**/routes.ts</code>. Same source of truth as the live API.
            Auto-regenerated on every release.
          </p>
        </header>

        <article className="oga-apiref-roadmap__card">
          <div className="oga-apiref-roadmap__label">
            Track A &middot; Separate ticket
          </div>
          <div className="oga-apiref-roadmap__body">
            <h3>OpenAPI regeneration from Fastify schemas</h3>
            <p>
              Wire <code>@fastify/swagger</code> + <code>@fastify/swagger-ui</code> into apps/api;
              publish at <code>apps/api/.../openapi.json</code>; have apps/web fetch and embed at build
              time. Auth surfaced consistently with the <code>oga_</code> prefix. Engine-version enum
              read from <code>getSupportedEngineVersions()</code> rather than hardcoded. Dark-flagged
              endpoints noted with an <code>x-availability</code> extension.
            </p>
            <p>
              When that lands, this page returns to an interactive reference (Scalar or equivalent),
              themed to Brand v3. Until then, this honest map.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-apiref__container--narrow oga-apiref-cta__inner">
        <h2 className="oga-apiref-cta__title">
          The engine ships today, even while the spec catches up.
        </h2>
        <p className="oga-apiref-cta__lead">
          Get an API key and read the methodology. The surface is real; the documentation rebuild is in
          flight.
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
