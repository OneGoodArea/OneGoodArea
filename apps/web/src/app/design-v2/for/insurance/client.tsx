"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { IcpHeroBadge } from "../_shared/icp-hero-badge";
import { DEMO_URL } from "../../_shared/book-demo";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./insurance.css";

/* /for/insurance - Plan 064 rebuild onto the proptech template: hero, the
   portfolio-monitoring money shot, a capability grid, the defensible receipts,
   a short FAQ, CTA. Demo-led (Book a demo), enterprise-flavoured but no code
   walls. The old problem/flow/products/defend structure is gone. */

export default function ForInsuranceClient() {
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
        <IcpHeroBadge icp="insurance" label="For insurance and InsureTech" />
        <h1 className="oga-icp-hero__h1">Area risk your actuary can audit, monitored continuously.</h1>
        <p className="oga-icp-hero__lead">
          Per-dimension scores with confidence, not a black box. Save your
          weighting once, score every quote against it, and get a signed webhook
          the day a tracked area moves materially.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href={DEMO_URL} className="oga-btn oga-btn-primary">
            Book a demo
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- What your pricing team sees (the money shot) ---------- */
const STEADY: { area: string; signal: string }[] = [
  { area: "B1 1AA", signal: "Crime" },
  { area: "LS1 4DY", signal: "Flood risk" },
  { area: "E1 6AN", signal: "Deprivation" },
];

function SectionShowcase() {
  return (
    <section className="oga-section-dark oga-pt-band" data-oga-surface="dark" aria-labelledby="ins-showcase">
      <div className="oga-pt-band__grid">
        <div className="oga-pt-band__copy">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What your pricing team sees</span>
          </div>
          <h2 id="ins-showcase" className="oga-icp__h2 oga-pt-showcase__h2">
            Watch the book drift, with the receipts.
          </h2>
          <p className="oga-icp__lead oga-pt-showcase__lead">
            Track the insured locations as a portfolio. When an area moves
            materially, you get a signed webhook, gated on sample size so two
            sales never trip an alert.
          </p>
          <ul className="oga-pt-showcase__points">
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Sample-size honest</span>
              <span className="oga-pt-showcase__point-v">
                Moves are gated on transaction count. Static signals never fire a
                false alert.
              </span>
            </li>
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Signed and dated</span>
              <span className="oga-pt-showcase__point-v">
                Every alert carries the period, the from and to values, and an
                HMAC signature you verify.
              </span>
            </li>
          </ul>
          <Link href="/products/monitor" className="oga-pt-showcase__link">
            See Monitor
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pt-band__panel">
          <div className="oga-pt-band__panel-inner">
          <article className="oga-ins-book" aria-hidden>
            <div className="oga-ins-book__head">
              <div className="oga-ins-book__head-main">
                <span className="oga-ins-book__title">Motor book</span>
                <span className="oga-ins-book__sub">Q2 2026 · 1,240 areas tracked</span>
              </div>
              <span className="oga-ins-book__live">Monitoring</span>
            </div>

            <div className="oga-ins-book__alert">
              <div className="oga-ins-book__alert-head">
                <span className="oga-ins-book__alert-tag">Material move</span>
                <span className="oga-ins-book__alert-area">M1 1AE</span>
              </div>
              <div className="oga-ins-book__alert-body">
                <span className="oga-ins-book__alert-signal">Median price</span>
                <span className="oga-ins-book__alert-delta">£248k → £267k · +7.6%</span>
              </div>
              <div className="oga-ins-book__alert-foot">
                <span>Sample size ok · 12 sales</span>
                <span>2026-03 → 2026-04</span>
              </div>
            </div>

            <ul className="oga-ins-book__rows">
              {STEADY.map((t) => (
                <li key={t.area} className="oga-ins-book__row">
                  <span className="oga-ins-book__row-area">{t.area}</span>
                  <span className="oga-ins-book__row-signal">{t.signal}</span>
                  <span className="oga-ins-book__row-status">no material change</span>
                </li>
              ))}
            </ul>

            <div className="oga-ins-book__foot">
              <span>signal.changed · signed webhook</span>
              <span>engine v1.1.0</span>
            </div>
          </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Built for underwriting ---------- */
const WEIGHTS: { label: string; pct: number }[] = [
  { label: "Safety", pct: 35 },
  { label: "Environment", pct: 25 },
  { label: "Demographics", pct: 20 },
  { label: "Transport", pct: 10 },
];

function SectionIntegration() {
  return (
    <section className="oga-section-quiet oga-pt-int" aria-labelledby="ins-int">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-int__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Built for underwriting</span>
          </div>
          <h2 id="ins-int" className="oga-icp__h2">Four things a pricing team leans on.</h2>
          <p className="oga-icp__lead">
            Configurable scoring the actuary owns, monitoring that respects
            sample size, peer-relative screening, and delivery you can verify.
          </p>
          <code className="oga-pt-int__endpoint">
            <span className="oga-pt-int__endpoint-verb">POST</span>{" "}
            /v1/score
          </code>
        </header>

        <div className="oga-pt-int__grid" aria-hidden>
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ins-preset">
                <span className="oga-ins-preset__id">preset · Auto rating v3</span>
                <ul className="oga-pt-int__bars oga-ins-weights">
                  {WEIGHTS.map((w) => (
                    <li key={w.label} className="oga-pt-int__bar-row">
                      <span className="oga-pt-int__bar-label">{w.label}</span>
                      <span className={`oga-pt-bar oga-pt-bar--w${w.pct}`}><span /></span>
                      <span className="oga-pt-int__bar-pct">{w.pct}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <h3 className="oga-pt-int__title">The composite the actuary owns</h3>
            <p className="oga-pt-int__desc">
              Save the weighting once as a preset. Every quote scores against it,
              per dimension, with a confidence on each.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ins-gate">
                <div className="oga-ins-gate__row oga-ins-gate__row--gated">
                  <span className="oga-ins-gate__n">2 sales</span>
                  <span className="oga-ins-gate__label">Median price</span>
                  <span className="oga-ins-gate__status">gated</span>
                </div>
                <div className="oga-ins-gate__row oga-ins-gate__row--material">
                  <span className="oga-ins-gate__n">12 sales</span>
                  <span className="oga-ins-gate__label">Median price</span>
                  <span className="oga-ins-gate__status">material</span>
                </div>
                <span className="oga-ins-gate__note">threshold · min 8 transactions</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Two sales never trip an alert</h3>
            <p className="oga-pt-int__desc">
              Moves are gated on transaction count. Thin evidence stays quiet
              instead of firing a false alarm.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ins-peer">
                <svg className="oga-ins-peer__svg" viewBox="0 0 240 46" aria-hidden>
                  <line className="oga-ins-peer__axis" x1="4" y1="32" x2="236" y2="32" />
                  <circle className="oga-ins-peer__dot" cx="42" cy="32" r="3" />
                  <circle className="oga-ins-peer__dot" cx="60" cy="32" r="3" />
                  <circle className="oga-ins-peer__dot" cx="74" cy="32" r="3" />
                  <circle className="oga-ins-peer__dot" cx="88" cy="32" r="3" />
                  <circle className="oga-ins-peer__dot" cx="102" cy="32" r="3" />
                  <circle className="oga-ins-peer__dot" cx="118" cy="32" r="3" />
                  <line className="oga-ins-peer__tick" x1="210" y1="16" x2="210" y2="32" />
                  <circle className="oga-ins-peer__out" cx="210" cy="32" r="5" />
                  <text className="oga-ins-peer__z" x="210" y="11" textAnchor="middle">z 4.1</text>
                </svg>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Risky vs its peer group</h3>
            <p className="oga-pt-int__desc">
              Rank areas by how far they sit from similar areas, not in absolute
              terms, so a real outlier stands out.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <pre className="oga-ins-hook">{`X-OneGoodArea-Event:
  signal.changed
X-OneGoodArea-Signature:
  t=…, v1=<sha256>`}</pre>
            </div>
            <h3 className="oga-pt-int__title">Signed, auditable delivery</h3>
            <p className="oga-pt-int__desc">
              Material moves fire an HMAC-signed webhook to your endpoint. Verify
              it before you process it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Why it survives audit ---------- */
type TrustRow = { left: string; right: string; state?: "dim" | "faint" | "active" };
type TrustCol = { title: string; body: string; rows: TrustRow[] };

const TRUST: TrustCol[] = [
  {
    title: "Versioned and pinned",
    body: "Pin the engine version per org. Two quarterly back-tests return the same numbers.",
    rows: [
      { left: "back-test Q1", right: "62" },
      { left: "back-test Q2", right: "62", state: "active" },
      { left: "engine", right: "v1.1.0" },
      { left: "pin", right: "owner-only", state: "dim" },
      { left: "X-Engine-Version", right: "v1.1.0", state: "faint" },
    ],
  },
  {
    title: "Transparent components",
    body: "Every score returns its dimensions, the weight applied and a confidence. Never a black box.",
    rows: [
      { left: "safety", right: "70 · w35", state: "active" },
      { left: "environment", right: "66 · w25" },
      { left: "demographics", right: "58 · w20" },
      { left: "transport", right: "61 · w10", state: "dim" },
      { left: "amenities", right: "64 · w10", state: "faint" },
    ],
  },
  {
    title: "Sample-size honest",
    body: "Moves are gated on transaction count. Static signals never fire, so two sales never trip an alert.",
    rows: [
      { left: "median price", right: "+7.6% material", state: "active" },
      { left: "crime", right: "gated · 3 sales" },
      { left: "deprivation", right: "no change" },
      { left: "flood risk", right: "no change", state: "dim" },
      { left: "area type", right: "static", state: "faint" },
    ],
  },
];

function SectionTrust() {
  return (
    <section className="oga-section-dark oga-pt-trust" data-oga-surface="dark" aria-labelledby="ins-trust">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-trust__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Why it survives audit</span>
          </div>
          <h2 id="ins-trust" className="oga-icp__h2">Built to sign off, not to trust blindly.</h2>
          <p className="oga-icp__lead">
            Your model risk and actuarial teams ask how every number was made.
            The answer is in the response.
          </p>
        </header>

        <div className="oga-pt-trust__cols">
          {TRUST.map((c) => (
            <div key={c.title} className="oga-pt-trust__col">
              <div className="oga-pt-trust__viz" aria-hidden>
                {c.rows.map((r) => (
                  <div key={r.left} className={`oga-pt-trow${r.state ? ` oga-pt-trow--${r.state}` : ""}`}>
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
    q: "Can the actuary tune the weights without redeploying our codebase?",
    a: "Yes. Save the weighting recipe once as a scoring preset and reference it by id on every quote. The actuary updates the preset from the dashboard and new quotes pick it up immediately. It is versioned, so model risk can track what changed and when.",
  },
  {
    q: "How are the drift webhooks signed?",
    a: "Stripe-style HMAC-SHA256 over the raw body, with the event type and a timestamped signature in the headers. The signing secret is shown once on subscription and never recoverable, so you store it and verify on receipt before processing. Endpoints must be public HTTPS.",
  },
  {
    q: "What happens when the engine version changes at renewal?",
    a: "You pin the engine version per org, so two quarterly back-tests match. When a new version ships, back-test it on a staging org, validate against your loss-ratio model, then flip the production pin with a single owner-only change.",
  },
  {
    q: "What do you store about our insured locations?",
    a: "Just the postcode or area code and an optional label you supply to map back to your own policy id. No PII, no policy data, no premium amounts. The label is opaque to us.",
  },
];

function SectionFaqs() {
  return (
    <section className="oga-section-quiet oga-icp-faqs oga-pt-faqs" aria-labelledby="ins-faqs">
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 id="ins-faqs" className="oga-icp__h2">Questions your pricing and model risk teams ask.</h2>
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
    <section className="oga-section-dark oga-icp-cta" data-oga-surface="dark" aria-labelledby="ins-cta">
      <div className="oga-icp__wrap--narrow">
        <h2 id="ins-cta" className="oga-icp-cta__h2">Auditable, monitored, sample-size honest.</h2>
        <p className="oga-icp-cta__lead">
          Score with weights the actuary owns, watch the book drift, and get a
          signed webhook the day a tracked area moves.
        </p>
        <div className="oga-icp-cta__ctas">
          <Link href={DEMO_URL} className="oga-btn oga-btn-primary">
            Book a demo
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
