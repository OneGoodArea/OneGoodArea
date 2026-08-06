"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./estate-agents.css";

/* /for/estate-agents - Plan 074 ICP page. Frames the same area-data API for
   estate agents: turn the area story buyers already research into a reason to
   book a viewing. Mirrors the proptech page structure — problem/money-shot,
   integration, trust, FAQ, CTA — with estate-agent copy and a brochure-style
   panel that drops the area context straight onto a listing. */

export default function ForEstateAgentsClient() {
  return (
    <div className="oga-root oga-icp">
      <Nav />
      <Hero />
      <SectionShowcase />
      <SectionIntegration />
      <SectionTrust />
      <SectionFaqs />
      <Footer />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="oga-section-quiet oga-icp-hero">
      <div className="oga-icp__wrap--narrow">
        <div className="oga-icp-hero__eyebrow">
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
          <span>For Estate Agents</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">Answer the area question before it is asked.</h1>
        <p className="oga-icp-hero__lead">
          Schools, crime, prices and transport for any UK postcode, from one
          call. Put the area story buyers already research straight onto your
          listings — no data team, no extra integrations.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/showcase/estate-agents" className="oga-btn oga-btn-primary">
            Try the Demo Workflow
            <span aria-hidden>→</span>
          </Link>
          <Link href="/playground" className="oga-btn oga-btn-secondary">
            Try in the playground
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- What your listing looks like (the money shot) ---------- */
const PANEL: { label: string; pct: number }[] = [
  { label: "Schools", pct: 81 },
  { label: "Crime", pct: 88 },
  { label: "Prices", pct: 66 },
  { label: "Transport", pct: 79 },
];

function SectionShowcase() {
  return (
    <section className="oga-section-dark oga-pt-band" data-oga-surface="dark" aria-labelledby="ea-showcase">
      <div className="oga-pt-band__grid">
        <div className="oga-pt-band__copy">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What your listing looks like</span>
          </div>
          <h2 id="ea-showcase" className="oga-icp__h2 oga-pt-showcase__h2">
            Drop the area onto every brochure.
          </h2>
          <p className="oga-icp__lead oga-pt-showcase__lead">
            Buyers Google the area before they book a viewing. Your listing now
            answers it — with real, source-backed data rendered however fits
            your brand.
          </p>
          <ul className="oga-pt-showcase__points">
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Every listing</span>
              <span className="oga-pt-showcase__point-v">
                The same call covers any UK postcode, so it drops into your
                listing template once.
              </span>
            </li>
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Your brochure</span>
              <span className="oga-pt-showcase__point-v">
                Render the score and signals however fits your design. Our
                attribution is optional.
              </span>
            </li>
          </ul>
          <Link href="/showcase/estate-agents" className="oga-pt-showcase__link">
            See the live demo
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pt-band__panel">
          <div className="oga-pt-band__panel-inner" aria-hidden>
            <div className="oga-ea-out__listing">
              <span className="oga-ea-out__addr">48 Wilbraham Road, Chorlton</span>
              <span className="oga-ea-out__spec">For sale · £425,000 · 3 bed terraced · M21 9PN</span>
            </div>
            <div className="oga-ea-out__head">
              <div className="oga-ea-out__heading">
                <span className="oga-ea-out__label">The area in a glance</span>
                <span className="oga-ea-out__by">by OneGoodArea</span>
              </div>
              <div className="oga-ea-ring">
                <svg className="oga-ea-ring__svg" viewBox="0 0 72 72" aria-hidden>
                  <circle className="oga-ea-ring__track" cx="36" cy="36" r="30" />
                  <circle className="oga-ea-ring__value" cx="36" cy="36" r="30" />
                </svg>
                <span className="oga-ea-ring__num">74</span>
              </div>
            </div>
            <ul className="oga-ea-out__rows">
              {PANEL.map((r) => (
                <li key={r.label} className="oga-ea-out__row">
                  <span className="oga-ea-out__row-label">{r.label}</span>
                  <span className={`oga-pt-bar oga-pt-bar--w${r.pct}`}><span /></span>
                  <span className="oga-ea-out__row-pct">{r.pct}</span>
                </li>
              ))}
            </ul>
            <div className="oga-ea-out__foot">
              <span>police.uk · Land Registry · Ofsted</span>
              <span>Updated Jul 2026</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Integration ---------- */
const COMPARABLES: { pc: string; name: string; score: number; active?: boolean }[] = [
  { pc: "M20 2NR", name: "Didsbury", score: 78 },
  { pc: "M21 8AA", name: "Chorlton", score: 74, active: true },
  { pc: "SK4 3GN", name: "Heaton Moor", score: 71 },
];

/* Score trend over eight monthly snapshots, drifting up. viewBox 240x64, y is
   inverted so a lower number sits higher on the chart. */
const SPARK_POINTS = "0,52 34,48 68,46 102,48 136,38 170,32 204,22 238,12";

function SectionIntegration() {
  return (
    <section className="oga-section-quiet oga-pt-int" aria-labelledby="ea-int">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-int__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Integration</span>
          </div>
          <h2 id="ea-int" className="oga-icp__h2">One call returns the whole area.</h2>
          <p className="oga-icp__lead">
            One authenticated GET, plain JSON, no SDK. Everything below comes
            back in a single response — your software or portal provider wires
            it once, then it renders onto any listing.
          </p>
          <code className="oga-pt-int__endpoint">
            <span className="oga-pt-int__endpoint-verb">GET</span>{" "}
            /v1/area?postcode=M21 9PN
          </code>
        </header>

        <div className="oga-pt-int__grid" aria-hidden>
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz oga-pt-int__viz--score">
              <span className="oga-pt-int__score">74<em>/100</em></span>
              <span className="oga-pt-int__score-label">Area score</span>
            </div>
            <h3 className="oga-pt-int__title">A score you can quote</h3>
            <p className="oga-pt-int__desc">
              One headline number per postcode, country-scoped so it actually
              means something in a brochure.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <ul className="oga-pt-int__bars">
                {PANEL.map((r) => (
                  <li key={r.label} className="oga-pt-int__bar-row">
                    <span className="oga-pt-int__bar-label">{r.label}</span>
                    <span className={`oga-pt-bar oga-pt-bar--w${r.pct}`}><span /></span>
                    <span className="oga-pt-int__bar-pct">{r.pct}</span>
                  </li>
                ))}
              </ul>
            </div>
            <h3 className="oga-pt-int__title">Area signals, ranked</h3>
            <p className="oga-pt-int__desc">
              Every category as a percentile, each one carrying the source it
              came from.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <svg className="oga-pt-int__spark" viewBox="0 0 240 64" aria-hidden>
                <polyline className="oga-pt-int__spark-line" points={SPARK_POINTS} />
                <circle className="oga-pt-int__spark-dot" cx="238" cy="12" r="4" />
              </svg>
              <div className="oga-pt-int__spark-axis">
                <span>Jan</span>
                <span>Aug</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">How it is moving</h3>
            <p className="oga-pt-int__desc">
              Monthly snapshots, so you can show the direction of travel — the
              &ldquo;it&rsquo;s on the way up&rdquo; line that sells.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <ul className="oga-pt-int__rank">
                {COMPARABLES.map((c) => (
                  <li
                    key={c.pc}
                    className={`oga-pt-int__rrow${c.active ? " oga-pt-int__rrow--active" : ""}`}
                  >
                    <span className="oga-pt-int__rrow-pc">{c.pc}</span>
                    <span className="oga-pt-int__rrow-name">{c.name}</span>
                    <span className="oga-pt-int__rrow-score">{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
            <h3 className="oga-pt-int__title">Compared to nearby</h3>
            <p className="oga-pt-int__desc">
              The closest similar areas, ranked — so buyers can see where else
              compares.
            </p>
          </div>
        </div>

        <div className="oga-pt-int__cta-row">
          <Link href="/docs" className="oga-pt-int__link">
            Read the docs
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Why you can trust it ---------- */
type TrustRow = { left: string; right: string; rank?: string; state?: "active" | "dim" | "faint" };
type TrustCol = { title: string; body: string; rows: TrustRow[] };

const TRUST: TrustCol[] = [
  {
    title: "Versioned",
    body: "Every response is stamped with the exact model that produced it.",
    rows: [
      { left: "GET /v1/area", right: "v1.0.0" },
      { left: "POST /v1/score", right: "v1.0.0", state: "active" },
      { left: "POST /v1/query", right: "v1.0.0" },
      { left: "POST /v1/peers", right: "v1.0.0", state: "dim" },
      { left: "GET /v1/meta", right: "v1.0.0", state: "faint" },
    ],
  },
  {
    title: "Source-backed",
    body: "Every value carries its source and the date it was captured.",
    rows: [
      { left: "crime", right: "police.uk · 2026-05" },
      { left: "prices", right: "Land Registry · 2026-Q1", state: "active" },
      { left: "schools", right: "Ofsted · 2025" },
      { left: "deprivation", right: "IMD · 2025", state: "dim" },
      { left: "flood", right: "Environment Agency", state: "faint" },
    ],
  },
  {
    title: "No invented numbers",
    body: "Percentiles ranked within each nation, never faked across borders.",
    rows: [
      { rank: "1", left: "M14 Fallowfield", right: "78" },
      { rank: "2", left: "LS11 Beeston", right: "74", state: "active" },
      { rank: "3", left: "B29 Selly Oak", right: "71" },
      { rank: "4", left: "SW9 Brixton", right: "68", state: "dim" },
      { rank: "5", left: "S2 Sheffield", right: "64", state: "faint" },
    ],
  },
];

function SectionTrust() {
  return (
    <section className="oga-section-dark oga-pt-trust" data-oga-surface="dark" aria-labelledby="ea-trust">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-trust__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Why you can trust it</span>
          </div>
          <h2 id="ea-trust" className="oga-icp__h2">Every number comes with its receipts.</h2>
          <p className="oga-icp__lead">
            Buyers and vendors will ask where a figure came from. The provenance
            is built into the response.
          </p>
        </header>

        <div className="oga-pt-trust__cols">
          {TRUST.map((c) => (
            <div key={c.title} className="oga-pt-trust__col">
              <div className="oga-pt-trust__viz" aria-hidden>
                {c.rows.map((r) => (
                  <div key={r.left} className={`oga-pt-trow${r.state ? ` oga-pt-trow--${r.state}` : ""}`}>
                    {r.rank && <span className="oga-pt-trow__rank">{r.rank}</span>}
                    <span className="oga-pt-trow__left">{r.left}</span>
                    <span className="oga-pt-trow__right">{r.right}</span>
                  </div>
                ))}
              </div>
              <h3 className="oga-pt-trust__ctitle">{c.title}</h3>
              <p className="oga-pt-trust__csub">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const FAQS: { q: string; a: string }[] = [
  {
    q: "We're not a software team — is this hard to use?",
    a: "One authenticated GET returns the whole area for a postcode as plain JSON. Your software or portal provider wires it once, then it renders onto any listing without extra integrations.",
  },
  {
    q: "How fresh is the area data?",
    a: "Neighbourhood level (LSOA), refreshed monthly, for any UK postcode across England, Wales and Scotland. The same postcode within a month returns the same data, so cache windows on busy listing pages can be generous.",
  },
  {
    q: "Can we publish the scores on our own listings?",
    a: "It is your brochure and your design — render the score, signals and comparison however fits your brand. Each value carries its source so you can attribute it if you want to, but the OneGoodArea brand is not required.",
  },
  {
    q: "Is there a free way to try it?",
    a: "Yes. The free Developer tier gives you full access for 30 days, no card. Or enter a postcode on the live demo at /showcase/estate-agents and see real signals right now.",
  },
];

function SectionFaqs() {
  return (
    <section className="oga-section-quiet oga-icp-faqs oga-pt-faqs" aria-labelledby="ea-faqs">
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 id="ea-faqs" className="oga-icp__h2">Questions estate agents ask us.</h2>
        </header>
        <div className="oga-icp-faqs__list">
          {FAQS.map((f) => (
            <article key={f.q} className="oga-icp-faq">
              <h3 className="oga-icp-faq__q">{f.q}</h3>
              <p className="oga-icp-faq__a">{f.a}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCta() {
  return null;
}
