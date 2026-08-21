"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { IcpHeroBadge } from "../_shared/icp-hero-badge";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./estate-agents.css";

/* /for/estate-agents - Plan 074 ICP page. Frames the same area-data API for
   estate agents: turn the area story buyers already research into a reason to
   book a viewing. Shares the ICP shell (hero, money-shot band, capability
   grid, trust grid, FAQ, CTA) with the other /for pages, but every
   illustration is estate-agent-specific (oga-ea-*): the brochure listing panel,
   postcode coverage, buyer selling-points, price trend, and nearby comparison.
   No shared proptech vizs, no em-dashes. */

export default function ForEstateAgentsClient() {
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
        <IcpHeroBadge icp="estate-agents" label="For estate agents" />
        <h1 className="oga-icp-hero__h1">Answer the area question before it is asked.</h1>
        <p className="oga-icp-hero__lead">
          Schools, crime, prices and transport for any UK postcode, from one
          call. Put the area story buyers already research straight onto your
          listings, with no data team and no extra integrations.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/showcase/estate-agents" className="oga-btn oga-btn-primary">
            Try the demo workflow
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
const PANEL: { label: string; value: number }[] = [
  { label: "Schools", value: 84 },
  { label: "Crime", value: 79 },
  { label: "Prices", value: 71 },
  { label: "Transport", value: 88 },
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
            answers it, with real, source-backed data rendered however fits your
            brand.
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
            <div className="oga-ea-card">
              <div className="oga-ea-card__photo">
                <svg className="oga-ea-card__house" viewBox="0 0 260 96" preserveAspectRatio="xMidYMax meet" aria-hidden>
                  <path d="M30 88 V46 L130 16 L230 46 V88" />
                  <rect x="64" y="54" width="30" height="24" rx="1.5" />
                  <rect x="166" y="54" width="30" height="24" rx="1.5" />
                  <path d="M112 88 V56 H148 V88" />
                </svg>
                <span className="oga-ea-card__tag">For sale · £550,000</span>
              </div>
              <div className="oga-ea-card__listing">
                <span className="oga-ea-card__addr">12 Northern Grove, Didsbury</span>
                <span className="oga-ea-card__spec">4 bed semi-detached · M20 2RU</span>
              </div>
              <div className="oga-ea-card__area">
                <span className="oga-ea-card__area-label">The area at a glance</span>
                <span className="oga-ea-card__score"><em>Area score</em><b>82</b></span>
              </div>
              <ul className="oga-ea-tiles">
                {PANEL.map((t) => (
                  <li key={t.label} className="oga-ea-tile">
                    <span className="oga-ea-tile__label">{t.label}</span>
                    <span className="oga-ea-tile__val">{t.value}</span>
                  </li>
                ))}
              </ul>
              <div className="oga-ea-card__foot">
                <span>police.uk · Land Registry · Ofsted</span>
                <span>by OneGoodArea</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Integration (four estate-agent illustrations) ---------- */
const NEARBY: { pc: string; name: string; score: number; active?: boolean }[] = [
  { pc: "M20 2NR", name: "Didsbury", score: 78 },
  { pc: "M21 8AA", name: "Chorlton", score: 74, active: true },
  { pc: "SK4 3GN", name: "Heaton Moor", score: 71 },
];

const SELLING_POINTS = [
  "Ofsted-good schools within a mile",
  "Crime well below the city average",
  "Prices up year on year",
];

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
            One authenticated GET, plain JSON, no SDK. Everything below comes back
            in a single response. Your software or portal provider wires it once,
            then it renders onto any listing.
          </p>
          <code className="oga-pt-int__endpoint">
            <span className="oga-pt-int__endpoint-verb">GET</span>{" "}
            /v1/area?postcode=M21 9PN
          </code>
        </header>

        <div className="oga-pt-int__grid" aria-hidden>
          {/* 1. Coverage */}
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ea-cover">
                <span className="oga-ea-cover__pc">M21 9PN</span>
                <span className="oga-ea-cover__arrow" aria-hidden>→</span>
                <div className="oga-ea-cover__nations">
                  <span className="oga-ea-cover__nation oga-ea-cover__nation--on">England</span>
                  <span className="oga-ea-cover__nation">Wales</span>
                  <span className="oga-ea-cover__nation">Scotland</span>
                </div>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Any UK postcode</h3>
            <p className="oga-pt-int__desc">
              One call covers England, Wales and Scotland, so it drops into your
              listing template once and works everywhere you list.
            </p>
          </div>

          {/* 2. Selling points */}
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <ul className="oga-ea-points">
                {SELLING_POINTS.map((p) => (
                  <li key={p} className="oga-ea-points__item">
                    <span className="oga-ea-points__tick" aria-hidden>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <h3 className="oga-pt-int__title">The selling points, surfaced</h3>
            <p className="oga-pt-int__desc">
              The area facts buyers care about, pulled out and ready to paste
              into a brochure.
            </p>
          </div>

          {/* 3. Price trend */}
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ea-trend">
                <div className="oga-ea-trend__top">
                  <span className="oga-ea-trend__label">Median price</span>
                  <span className="oga-ea-trend__delta">+12% YoY</span>
                </div>
                <div className="oga-ea-trend__vals">
                  <span className="oga-ea-trend__from">£175k</span>
                  <span className="oga-ea-trend__arrow" aria-hidden>→</span>
                  <span className="oga-ea-trend__to">£196k</span>
                </div>
                <svg className="oga-ea-trend__line" viewBox="0 0 200 34" preserveAspectRatio="none" aria-hidden>
                  <polyline points="0,29 40,26 80,25 120,17 160,11 200,4" />
                  <circle cx="200" cy="4" r="3.5" />
                </svg>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Prices, and where they head</h3>
            <p className="oga-pt-int__desc">
              Monthly snapshots show the direction of travel, the &ldquo;on the
              way up&rdquo; line that helps a listing sell.
            </p>
          </div>

          {/* 4. Nearby comparison */}
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <ul className="oga-ea-nearby">
                {NEARBY.map((c) => (
                  <li
                    key={c.pc}
                    className={`oga-ea-nearby__row${c.active ? " oga-ea-nearby__row--on" : ""}`}
                  >
                    <span className="oga-ea-nearby__pc">{c.pc}</span>
                    <span className="oga-ea-nearby__name">{c.name}</span>
                    <span className="oga-ea-nearby__score">{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
            <h3 className="oga-pt-int__title">How it compares nearby</h3>
            <p className="oga-pt-int__desc">
              The closest similar areas, ranked, so a buyer can see where else is
              worth a look.
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
    title: "Source-backed",
    body: "Every value carries the public source it came from and the date it was captured.",
    rows: [
      { left: "crime", right: "police.uk · 2026-05" },
      { left: "prices", right: "Land Registry · 2026-Q1", state: "active" },
      { left: "schools", right: "Ofsted · 2025" },
      { left: "deprivation", right: "IMD · 2025", state: "dim" },
      { left: "flood", right: "Environment Agency", state: "faint" },
    ],
  },
  {
    title: "Never invented",
    body: "Percentiles are ranked within each nation, never faked across borders.",
    rows: [
      { rank: "1", left: "M14 Fallowfield", right: "78" },
      { rank: "2", left: "LS11 Beeston", right: "74", state: "active" },
      { rank: "3", left: "B29 Selly Oak", right: "71" },
      { rank: "4", left: "SW9 Brixton", right: "68", state: "dim" },
      { rank: "5", left: "S2 Sheffield", right: "64", state: "faint" },
    ],
  },
  {
    title: "Refreshed monthly",
    body: "Neighbourhood data updated every month, and the same within a month so listing pages can cache.",
    rows: [
      { left: "Apr", right: "72" },
      { left: "May", right: "73" },
      { left: "Jun", right: "74", state: "active" },
      { left: "Jul", right: "74", state: "dim" },
      { left: "next", right: "monthly", state: "faint" },
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
    q: "We are not a software team, is this hard to use?",
    a: "One authenticated GET returns the whole area for a postcode as plain JSON. Your software or portal provider wires it once, then it renders onto any listing without extra integrations.",
  },
  {
    q: "How fresh is the area data?",
    a: "Neighbourhood level (LSOA), refreshed monthly, for any UK postcode across England, Wales and Scotland. The same postcode within a month returns the same data, so cache windows on busy listing pages can be generous.",
  },
  {
    q: "Can we publish the scores on our own listings?",
    a: "Yes. It is your brochure and your design, so render the score, signals and comparison however fits your brand. Each value carries its source so you can attribute it if you want to, but the OneGoodArea brand is not required.",
  },
  {
    q: "Is there a free way to try it?",
    a: "Yes. The free Developer Sandbox gives you full access for 30 days, no card. Or enter a postcode on the live demo at /showcase/estate-agents and see real signals right now.",
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
  return (
    <section className="oga-section-dark oga-icp-cta" data-oga-surface="dark" aria-labelledby="ea-cta">
      <div className="oga-icp__wrap--narrow">
        <h2 id="ea-cta" className="oga-icp-cta__h2">Put the area on every listing.</h2>
        <p className="oga-icp-cta__lead">
          Answer the area question before a buyer asks it. One call, onto any
          brochure, with the sources built in.
        </p>
        <div className="oga-icp-cta__ctas">
          <Link href="/showcase/estate-agents" className="oga-btn oga-btn-primary">
            Try the demo workflow
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
