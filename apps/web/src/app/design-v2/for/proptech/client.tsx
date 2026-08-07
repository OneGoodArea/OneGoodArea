"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./proptech.css";

/* /for/proptech - Plan 064 rebuild. PropTech-explicit, simpler and buyer-first:
   the problem, what it looks like on a real listing (the money shot), how
   little it takes to ship, why the numbers are defensible, a short FAQ. The
   old 5-step curl wall and jargon are gone. */

export default function ForProptechClient() {
  return (
    <div className="oga-root oga-icp">
      <Nav />
      <Hero />
      <SectionShowcase />
      <SectionIntegration />
      <SectionTrust />
      <SectionFaqs />
      <FinalCta />
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
          <span>For PropTech</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">Add area context to every listing.</h1>
        <p className="oga-icp-hero__lead">
          Schools, crime, prices, transport and a score you can stand behind, for
          any UK postcode, from one API. No data team. Live in an afternoon.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/showcase/proptech" className="oga-btn oga-btn-secondary">
            Try the demo workflow
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            See the docs
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- What your users see (the money shot) ---------- */
const PANEL: { label: string; pct: number }[] = [
  { label: "Schools", pct: 81 },
  { label: "Crime", pct: 88 },
  { label: "Prices", pct: 66 },
  { label: "Transport", pct: 79 },
];

function SectionShowcase() {
  return (
    <section className="oga-section-dark oga-pt-band" data-oga-surface="dark" aria-labelledby="pt-showcase">
      <div className="oga-pt-band__grid">
        <div className="oga-pt-band__copy">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What your users see</span>
          </div>
          <h2 id="pt-showcase" className="oga-icp__h2 oga-pt-showcase__h2">
            Drop it straight onto your listings.
          </h2>
          <p className="oga-icp__lead oga-pt-showcase__lead">
            Your listing, your design. The area score, the signals and the
            comparison are ours, source-backed and rendered however fits your UI.
          </p>
          <ul className="oga-pt-showcase__points">
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Your brand</span>
              <span className="oga-pt-showcase__point-v">
                Render the score, signals and comparison however fits your UI.
                Our attribution is optional.
              </span>
            </li>
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Every listing</span>
              <span className="oga-pt-showcase__point-v">
                The same call covers any UK postcode, so it drops into your
                listing template once.
              </span>
            </li>
          </ul>
          <Link href="/docs" className="oga-pt-showcase__link">
            See it in the docs
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pt-band__panel">
          <div className="oga-pt-band__panel-inner" aria-hidden>
            <div className="oga-pt-out__listing">
              <span className="oga-pt-out__addr">48 Wilbraham Road, Chorlton</span>
              <span className="oga-pt-out__spec">£425,000 · 3 bed terraced · M21 9PN</span>
            </div>
            <div className="oga-pt-out__head">
              <div className="oga-pt-out__heading">
                <span className="oga-pt-out__label">Area intelligence</span>
                <span className="oga-pt-out__by">by OneGoodArea</span>
              </div>
              <div className="oga-pt-ring">
                <svg className="oga-pt-ring__svg" viewBox="0 0 72 72" aria-hidden>
                  <circle className="oga-pt-ring__track" cx="36" cy="36" r="30" />
                  <circle className="oga-pt-ring__value" cx="36" cy="36" r="30" />
                </svg>
                <span className="oga-pt-ring__num">74</span>
              </div>
            </div>
            <ul className="oga-pt-out__rows">
              {PANEL.map((r) => (
                <li key={r.label} className="oga-pt-out__row">
                  <span className="oga-pt-out__row-label">{r.label}</span>
                  <span className={`oga-pt-bar oga-pt-bar--w${r.pct}`}><span /></span>
                  <span className="oga-pt-out__row-pct">{r.pct}</span>
                </li>
              ))}
            </ul>
            <div className="oga-pt-out__foot">
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
    <section className="oga-section-quiet oga-pt-int" aria-labelledby="pt-int">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-int__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Integration</span>
          </div>
          <h2 id="pt-int" className="oga-icp__h2">One call returns the whole area.</h2>
          <p className="oga-icp__lead">
            One authenticated GET, plain JSON, no SDK. Everything below comes back
            in a single response, ready to render however fits your UI.
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
            <h3 className="oga-pt-int__title">A score you can show</h3>
            <p className="oga-pt-int__desc">
              One headline number per postcode, country-scoped so it actually
              means something.
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
              Monthly snapshots, so you can show the direction of travel, not
              just today.
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
              The closest similar areas, ranked, in the very same response.
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
    <section className="oga-section-dark oga-pt-trust" data-oga-surface="dark" aria-labelledby="pt-trust">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-trust__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Why you can trust it</span>
          </div>
          <h2 id="pt-trust" className="oga-icp__h2">Every number comes with its receipts.</h2>
          <p className="oga-icp__lead">
            Your users ask about every figure you show them. The provenance is
            built into the response.
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
    q: "Does it scale to listing-page traffic?",
    a: "Yes. Cache the area per postcode at your edge and serve it yourself. The same postcode within a month returns the same data, so cache windows can be generous.",
  },
  {
    q: "How fine-grained is the data?",
    a: "Neighbourhood level (LSOA), refreshed monthly, for any UK postcode across England, Wales and Scotland. Address-level is on the roadmap.",
  },
  {
    q: "Do I have to show your branding?",
    a: "No. It is your listing and your design. Each value carries its source so you can attribute the data if you want to, but the OneGoodArea brand is not required.",
  },
  {
    q: "Is there a free way to try it?",
    a: "Yes. The free Developer tier gives you full access for 30 days, no card, to build and evaluate against. Pricing for production is at /pricing.",
  },
];

function SectionFaqs() {
  return (
    <section className="oga-section-quiet oga-icp-faqs oga-pt-faqs" aria-labelledby="pt-faqs">
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 id="pt-faqs" className="oga-icp__h2">Questions PropTech teams ask us.</h2>
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
  return (
    <section className="oga-section-dark oga-icp-cta" data-oga-surface="dark" aria-labelledby="pt-cta">
      <div className="oga-icp__wrap--narrow">
        <h2 id="pt-cta" className="oga-icp-cta__h2">See it on your own listings.</h2>
        <p className="oga-icp-cta__lead">
          Try the API in the playground, no card required, or read the docs and
          ship area context this week.
        </p>
        <div className="oga-icp-cta__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            See the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
