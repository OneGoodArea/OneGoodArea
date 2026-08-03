"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { BookDemo } from "../../_shared/book-demo";
import { SignalsIcon } from "../../_shared/product-icons";
import { CATEGORY_GLYPH } from "../../_shared/dashboard/category-glyphs";
import type { SignalCategory } from "@onegoodarea/contracts";
import "./signals.css";

/* /products/signals - BESPOKE, built section by section to Pedro's references:
   a light hero with floating signal cards (hero1.png), a bento of the four
   guarantees (section2.png), a two-up capability section with a proof band
   (section3.png), the coverage grid, a workflows section and the anatomy of a
   signal. */

/* ---------- Hero (light, centred, floating signal cards) ----------
   Reference: Gem's product hero (hero1.png) - eyebrow pill, big centred
   headline, centred lead, two CTAs, then a band of floating "product shot"
   cards. Ours are real area readouts drawn from the demo data, using the
   same category glyphs as the rest of the page. The hero paints its wash
   behind the sticky nav (margin-top: -52px) so the nav blends at the top
   and only takes its glass on scroll. */
const HERO_CARDS: {
  tag: string;
  pc: string;
  place: string;
  rows: { cat: SignalCategory; label: string; value: string }[];
}[] = [
  {
    tag: "Urban · England",
    pc: "M1 1AE",
    place: "Manchester",
    rows: [
      { cat: "crime", label: "Recorded crime", value: "92nd pct" },
      { cat: "deprivation", label: "IMD decile", value: "1 of 10" },
    ],
  },
  {
    tag: "Urban · Scotland",
    pc: "EH1 1YZ",
    place: "Edinburgh",
    rows: [
      { cat: "deprivation", label: "SIMD decile", value: "6 of 10" },
      { cat: "transport", label: "Stations < 1 km", value: "2" },
    ],
  },
  {
    tag: "Urban · Wales",
    pc: "CF10 1EP",
    place: "Cardiff",
    rows: [
      { cat: "property", label: "Median sale price", value: "£212k" },
      { cat: "deprivation", label: "WIMD decile", value: "4 of 10" },
    ],
  },
];

function SignalsHero() {
  return (
    <section className="oga-sig-hero">
      <div className="oga-sig-hero__wash" aria-hidden />
      <div className="oga-sig-hero__dots" aria-hidden />

      <div className="oga-sig-hero__inner">
        <span className="oga-sig-hero__eyebrow">
          <SignalsIcon width={15} height={15} aria-hidden />
          Signals
        </span>
        <h1 className="oga-sig-hero__title">UK area data your product can rely on.</h1>
        <p className="oga-sig-hero__lead">
          Bring crime, deprivation, property, schools, amenities, transport and
          environmental data into your product through one API. Every signal is
          returned in a consistent format, placed in national context,
          confidence-rated and linked to its source.
        </p>
        <div className="oga-sig-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Explore a live response
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            View the API docs
          </Link>
        </div>
      </div>

      <div className="oga-sig-hero__stage" aria-hidden>
        <div className="oga-sig-hero__cards">
          {HERO_CARDS.map((c) => (
            <article key={c.pc} className="oga-sig-hcard">
              <div className="oga-sig-hcard__top">
                <span className="oga-sig-hcard__tag">{c.tag}</span>
                <span className="oga-sig-hcard__conf">
                  <span className="oga-sig-hcard__conf-dot" />
                  High confidence
                </span>
              </div>
              <div className="oga-sig-hcard__id">
                <span className="oga-sig-hcard__pc">{c.pc}</span>
                <span className="oga-sig-hcard__place">{c.place}</span>
              </div>
              <ul className="oga-sig-hcard__rows">
                {c.rows.map((r) => (
                  <li key={r.label} className="oga-sig-hcard__row">
                    <span className="oga-sig-hcard__glyph">{CATEGORY_GLYPH[r.cat]()}</span>
                    <span className="oga-sig-hcard__label">{r.label}</span>
                    <span className="oga-sig-hcard__val">{r.value}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ProductSignalsClient() {
  return (
    <div className="oga-root oga-sig">
      <Nav />
      <SignalsHero />
      <Properties />
      <Foundation />
      <Workflows />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------- Section 2: the four guarantees (reference section2.png) ----------
   Centred header, four flat cards, each a property that holds for every
   signal, each carrying a small bespoke mockup that shows that property in
   our own product vocabulary. Closed by one centred CTA. */
function Properties() {
  return (
    <section className="oga-sig-feat" data-oga-surface="dark" aria-labelledby="sig-feat-title">
      <div className="oga-sig__wrap">
        <header className="oga-sig-feat__head">
          <h2 id="sig-feat-title" className="oga-sig-feat__h2">Every signal, ready to build on.</h2>
          <p className="oga-sig-feat__sub">
            One consistent shape, national context, confidence and a source on
            every value. The same four guarantees behind every number we return.
          </p>
        </header>

        <div className="oga-sig-feat__grid">
          {/* Hero cell - consistent shape (tall, left) */}
          <article className="oga-sig-feat__card oga-sig-feat__card--hero">
            <div className="oga-sig-feat__card-body">
              <h3 className="oga-sig-feat__card-title">One consistent shape.</h3>
              <p className="oga-sig-feat__card-desc">
                Every signal returns in the same structure, whatever source or
                country it came from. Integrate once and read every category the
                same way.
              </p>
            </div>
            <div className="oga-sig-feat__mock">
              <div className="oga-sig-feat__code">
                <div className="oga-sig-feat__code-head">crime.total_12m</div>
                <pre className="oga-sig-feat__code-body">{`{
  "signal": "crime.total_12m",
  "value": 3712,
  "unit": "count",
  "national_pct": 92,
  "confidence": "high",
  "source": "police.uk",
  "observed": {
    "from": "2025-04",
    "to": "2026-03"
  }
}`}</pre>
              </div>
            </div>
          </article>

          {/* National context (top-right) */}
          <article className="oga-sig-feat__card">
            <div className="oga-sig-feat__card-body">
              <h3 className="oga-sig-feat__card-title">Placed in national context.</h3>
              <p className="oga-sig-feat__card-desc">
                Every value ranked against comparable areas, so a number means
                something on its own.
              </p>
            </div>
            <div className="oga-sig-feat__mock">
              <div className="oga-sig-feat__pct">
                <div className="oga-sig-feat__pct-top">
                  <span className="oga-sig-feat__pct-label">92nd percentile</span>
                  <span className="oga-sig-feat__pct-nat">England</span>
                </div>
                <div className="oga-sig-feat__pct-track">
                  <span className="oga-sig-feat__pct-fill" />
                  <span className="oga-sig-feat__pct-dot" />
                </div>
                <div className="oga-sig-feat__pct-ends">
                  <span>Lowest</span>
                  <span>Highest</span>
                </div>
              </div>
            </div>
          </article>

          {/* Confidence (bottom-right) */}
          <article className="oga-sig-feat__card">
            <div className="oga-sig-feat__card-body">
              <h3 className="oga-sig-feat__card-title">Confidence on every value.</h3>
              <p className="oga-sig-feat__card-desc">
                Know how solid each number is before you ship it.
              </p>
            </div>
            <div className="oga-sig-feat__mock">
              <div className="oga-sig-feat__conf">
                <div className="oga-sig-feat__conf-head">
                  <span className="oga-sig-feat__conf-label">Recorded crime · M1 1AE</span>
                  <span className="oga-sig-feat__conf-val">3,712</span>
                </div>
                <div className="oga-sig-feat__conf-row">
                  <span className="oga-sig-feat__conf-chip">
                    <span className="oga-sig-feat__conf-dot" />
                    High confidence
                  </span>
                  <span className="oga-sig-feat__conf-bars" aria-hidden>
                    <i className="on" /><i className="on" /><i className="on" />
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* Source coverage (full-width strip) */}
          <article className="oga-sig-feat__card oga-sig-feat__card--wide">
            <div className="oga-sig-feat__card-body">
              <h3 className="oga-sig-feat__card-title">Traceable to its source.</h3>
              <p className="oga-sig-feat__card-desc">
                Every number links back to the official dataset it came from,
                ready to cite.
              </p>
            </div>
            <div className="oga-sig-feat__mock">
              <div className="oga-sig-feat__srcrow">
                {([
                  { cat: "crime", name: "Crime", from: "police.uk" },
                  { cat: "deprivation", name: "Deprivation", from: "IMD, WIMD, SIMD" },
                  { cat: "property", name: "Property", from: "Land Registry" },
                  { cat: "schools", name: "Schools", from: "Ofsted, DfE" },
                  { cat: "amenities", name: "Amenities", from: "OpenStreetMap" },
                  { cat: "transport", name: "Transport", from: "OpenStreetMap" },
                  { cat: "environment", name: "Environment", from: "Environment Agency" },
                ] as { cat: SignalCategory; name: string; from: string }[]).map((s) => (
                  <span key={s.name} className="oga-sig-feat__srcbadge">
                    <span className="oga-sig-feat__srcbadge-glyph">{CATEGORY_GLYPH[s.cat]()}</span>
                    <span className="oga-sig-feat__srcbadge-text">
                      <span className="oga-sig-feat__srcbadge-name">{s.name}</span>
                      <span className="oga-sig-feat__srcbadge-from">{s.from}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="oga-sig-feat__cta">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try it in the playground
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 3: coverage + reproducibility, with a proof band ----------
   Reference: section3.png - left-aligned headline, two large cards each with a
   product mockup and its title/description below, then a band on a tinted
   panel. section3.png's band is a customer testimonial; we do NOT ship a
   fabricated customer, so the band carries our own promise + a real CTA until a
   genuine quote exists. */
const FOUND_AREAS: { pc: string; place: string; nation: string }[] = [
  { pc: "M1 1AE", place: "Manchester", nation: "England" },
  { pc: "EH1 1YZ", place: "Edinburgh", nation: "Scotland" },
  { pc: "CF10 1EP", place: "Cardiff", nation: "Wales" },
  { pc: "B1 1AA", place: "Birmingham", nation: "England" },
];

function Foundation() {
  return (
    <section className="oga-sig-found" aria-labelledby="sig-found-title">
      <div className="oga-sig__wrap">
        <header className="oga-sig-found__head">
          <h2 id="sig-found-title" className="oga-sig-found__h2">One source of truth for every UK area.</h2>
        </header>

        <div className="oga-sig-found__grid">
          {/* Card 1 - national coverage */}
          <div className="oga-sig-found__cell">
            <div className="oga-sig-found__panel">
              <div className="oga-sig-found__areas">
                <div className="oga-sig-found__areas-head">
                  <span className="oga-sig-found__areas-title">Areas</span>
                  <span className="oga-sig-found__areas-pill">England · Wales · Scotland</span>
                </div>
                <ul className="oga-sig-found__arealist">
                  {FOUND_AREAS.map((a) => (
                    <li key={a.pc} className="oga-sig-found__arearow">
                      <span className="oga-sig-found__area-pc">{a.pc}</span>
                      <span className="oga-sig-found__area-place">{a.place}</span>
                      <span className="oga-sig-found__area-nation">{a.nation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <h3 className="oga-sig-found__cell-title">The same API across three nations.</h3>
            <p className="oga-sig-found__cell-desc">
              England, Wales and Scotland behind one endpoint, each signal reported
              in its own country&apos;s official index. No separate integrations to build
              or keep in sync.
            </p>
          </div>

          {/* Card 2 - versioned + replayable */}
          <div className="oga-sig-found__cell">
            <div className="oga-sig-found__panel">
              <div className="oga-sig-found__ver">
                <div className="oga-sig-found__ver-head">
                  <span className="oga-sig-found__ver-sig">crime.total_12m</span>
                  <span className="oga-sig-found__ver-tag">engine v1.0.0</span>
                </div>
                <span className="oga-sig-found__ver-val">3,712</span>
                <div className="oga-sig-found__ver-meta">Observed 2025-04 → 2026-03</div>
                <div className="oga-sig-found__ver-replay">
                  <span className="oga-sig-found__ver-check" aria-hidden>✓</span>
                  Same request returns the same number
                </div>
              </div>
            </div>
            <h3 className="oga-sig-found__cell-title">Versioned, so numbers never move.</h3>
            <p className="oga-sig-found__cell-desc">
              Every response is stamped with the engine version that produced it.
              Replay a call months later and you get the exact same figures, so what
              you ship stays reproducible.
            </p>
          </div>
        </div>

        {/* Proof band - placeholder for a real quote; never fabricate a customer */}
        <div className="oga-sig-found__band">
          <p className="oga-sig-found__band-text">
            Sourced, comparable, confidence-rated and versioned. Everything a
            product team needs to build on UK area data without owning the pipeline.
          </p>
          <div className="oga-sig-found__band-foot">
            <span className="oga-sig-found__band-note">One API · every category · three nations</span>
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 4: real workflows (reference section4.png) ---------- */
function Workflows() {
  return (
    <section className="oga-sig-flow" data-oga-surface="dark" aria-labelledby="sig-flow-title">
      <div className="oga-sig__wrap">
        <header className="oga-sig-flow__head">
          <h2 id="sig-flow-title" className="oga-sig-flow__h2">Built for the workflows you already run.</h2>
          <p className="oga-sig-flow__sub">
            The same consistent area data behind the features you ship, the
            comparisons you make, the decisions you defend and the plumbing you
            would rather not maintain.
          </p>
        </header>

        <div className="oga-sig-flow__grid">
          {/* 1 - enrich a listing */}
          <article className="oga-sig-flow__card">
            <div className="oga-sig-flow__mock">
              <div className="oga-sig-flow__panel oga-sig-flow__listing">
                <div className="oga-sig-flow__listing-head">
                  <span className="oga-sig-flow__listing-tag">Listing</span>
                  <span className="oga-sig-flow__listing-pc">M21 9PN</span>
                </div>
                <ul className="oga-sig-flow__rows">
                  <li className="oga-sig-flow__row">
                    <span className="oga-sig-flow__row-glyph">{CATEGORY_GLYPH.crime()}</span>
                    <span className="oga-sig-flow__row-k">Crime</span>
                    <span className="oga-sig-flow__row-v">34th pct</span>
                  </li>
                  <li className="oga-sig-flow__row">
                    <span className="oga-sig-flow__row-glyph">{CATEGORY_GLYPH.schools()}</span>
                    <span className="oga-sig-flow__row-k">Schools</span>
                    <span className="oga-sig-flow__row-v">4 nearby</span>
                  </li>
                  <li className="oga-sig-flow__row">
                    <span className="oga-sig-flow__row-glyph">{CATEGORY_GLYPH.transport()}</span>
                    <span className="oga-sig-flow__row-k">Transport</span>
                    <span className="oga-sig-flow__row-v">3 stations</span>
                  </li>
                </ul>
              </div>
            </div>
            <p className="oga-sig-flow__cap">Add local-area context to listings, applications, reports and customer journeys.</p>
          </article>

          {/* 2 - compare areas */}
          <article className="oga-sig-flow__card">
            <div className="oga-sig-flow__mock">
              <div className="oga-sig-flow__panel oga-sig-flow__cmp">
                <div className="oga-sig-flow__cmp-col">
                  <span className="oga-sig-flow__cmp-pc">M1 1AE</span>
                  <span className="oga-sig-flow__cmp-m">Crime <b>92nd</b></span>
                  <span className="oga-sig-flow__cmp-m">IMD <b>1</b></span>
                </div>
                <span className="oga-sig-flow__cmp-vs">vs</span>
                <div className="oga-sig-flow__cmp-col">
                  <span className="oga-sig-flow__cmp-pc">CF10 1EP</span>
                  <span className="oga-sig-flow__cmp-m">Crime <b>86th</b></span>
                  <span className="oga-sig-flow__cmp-m">WIMD <b>4</b></span>
                </div>
              </div>
            </div>
            <p className="oga-sig-flow__cap">Compare any two areas on the same national scale, not isolated numbers.</p>
          </article>

          {/* 3 - support a decision */}
          <article className="oga-sig-flow__card">
            <div className="oga-sig-flow__mock">
              <div className="oga-sig-flow__panel oga-sig-flow__decide">
                <div className="oga-sig-flow__decide-head">
                  <span>IMD decile</span>
                  <b>1 / 10</b>
                </div>
                <div className="oga-sig-flow__decide-bar"><span className="oga-sig-flow__decide-fill" /></div>
                <div className="oga-sig-flow__decide-flag">
                  <span className="oga-sig-flow__decide-dot" />
                  Below your threshold
                </div>
              </div>
            </div>
            <p className="oga-sig-flow__cap">Bring consistent evidence into research, underwriting, risk and site-selection.</p>
          </article>

          {/* 4 - cut data maintenance (wide) */}
          <article className="oga-sig-flow__card oga-sig-flow__card--wide">
            <div className="oga-sig-flow__mock">
              <div className="oga-sig-flow__panel oga-sig-flow__consol">
                <ul className="oga-sig-flow__consol-src">
                  <li>police.uk</li>
                  <li>Land Registry</li>
                  <li>IMD · WIMD · SIMD</li>
                  <li>Ofsted · DfE</li>
                  <li>OpenStreetMap</li>
                  <li>Environment Agency</li>
                </ul>
                <span className="oga-sig-flow__consol-arrow" aria-hidden>→</span>
                <div className="oga-sig-flow__consol-api">
                  <span className="oga-sig-flow__consol-api-label">One API</span>
                  <span className="oga-sig-flow__consol-api-ep">GET /v1/area</span>
                </div>
              </div>
            </div>
            <p className="oga-sig-flow__cap">Work with one API instead of sourcing, cleaning and monitoring several public datasets.</p>
          </article>

          {/* 5 - call from code or Claude (wide) */}
          <article className="oga-sig-flow__card oga-sig-flow__card--wide">
            <div className="oga-sig-flow__mock">
              <div className="oga-sig-flow__panel oga-sig-flow__code">
                <div className="oga-sig-flow__code-tabs">
                  <span className="oga-sig-flow__code-tab oga-sig-flow__code-tab--on">REST</span>
                  <span className="oga-sig-flow__code-tab">MCP</span>
                </div>
                <pre className="oga-sig-flow__code-body">{`GET /v1/area/M1 1AE
Authorization: Bearer oga_live_…

200 · engine v1.0.0`}</pre>
              </div>
            </div>
            <p className="oga-sig-flow__cap">Call it from your code, or ask in plain English through the MCP server.</p>
          </article>
        </div>

        <footer className="oga-sig-flow__foot">
          <p className="oga-sig-flow__foot-text">
            Less integration to build. Fewer datasets to babysit. More decisions
            grounded in area data you can trust.
          </p>
          <div className="oga-sig-flow__foot-ctas">
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
            <Link href="/docs" className="oga-btn oga-btn-secondary">View the API docs</Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

/* ---------- FAQ (Signals-specific, native details accordion) ---------- */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Which areas do you cover?",
    a: "Every small area (LSOA and its equivalents) across England, Wales and Scotland. Send a postcode or an area code and you get the neighbourhood back.",
  },
  {
    q: "Where does the data come from?",
    a: "Official public sources: police.uk, HM Land Registry, the IMD, WIMD and SIMD deprivation indices, official education datasets, OpenStreetMap and the Environment Agency. Every value links back to the source it came from.",
  },
  {
    q: "How are England, Wales and Scotland handled?",
    a: "Each country is reported in its own official index — IMD in England, WIMD in Wales and SIMD in Scotland — inside one consistent response shape, so you integrate once.",
  },
  {
    q: "How often is the data updated?",
    a: "Each category follows its own cycle: crime and property monthly, deprivation on official release, the rest as their sources publish. Every response says when each value was observed.",
  },
  {
    q: "What does the confidence rating mean?",
    a: "Every value carries a confidence level based on how complete and recent the underlying data is, so your team can decide how to use it.",
  },
  {
    q: "Are the numbers stable over time?",
    a: "Yes. Every response is stamped with the engine version that produced it, and replaying the same request returns the same figures.",
  },
  {
    q: "How do I access it?",
    a: "A REST API, or the MCP server so you can call it from your code or ask in plain English through Claude.",
  },
];

function Faq() {
  return (
    <section className="oga-sig-faq" aria-labelledby="sig-faq-title">
      <div className="oga-sig__wrap oga-sig-faq__grid">
        <div className="oga-sig-faq__aside">
          <div className="oga-sig__eyebrow">
            <span className="oga-sig__eyebrow-mark" aria-hidden />
            <span>FAQ</span>
          </div>
          <h2 id="sig-faq-title" className="oga-sig-faq__h2">Signals, answered.</h2>
          <p className="oga-sig-faq__note">
            Still have a question?{" "}
            <Link href="/docs" className="oga-sig-faq__link">Read the documentation</Link>.
          </p>
        </div>

        <div className="oga-sig-faq__list">
          {FAQ.map((item) => (
            <details key={item.q} className="oga-sig-faq__item">
              <summary className="oga-sig-faq__q">
                <span>{item.q}</span>
                <span className="oga-sig-faq__icon" aria-hidden />
              </summary>
              <div className="oga-sig-faq__a">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA (dark) ---------- */
function FinalCta() {
  return (
    <section className="oga-sig-cta" data-oga-surface="dark" aria-labelledby="sig-cta">
      <div className="oga-sig-cta__field" aria-hidden />
      <div className="oga-sig-cta__inner">
        <h2 id="sig-cta" className="oga-sig-cta__h2">Use UK area data without building and maintaining separate integrations.</h2>
        <p className="oga-sig-cta__lead">
          Bring sourced, comparable and confidence-rated area data into your
          product through one API.
        </p>
        <div className="oga-sig-cta__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            Read the documentation
          </Link>
        </div>
      </div>
    </section>
  );
}
