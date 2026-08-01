"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { DEMO_URL } from "../../_shared/book-demo";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./lenders.css";

/* /for/lenders - Plan 064 rebuild onto the proptech template. The money shot is
   an audit/decision record that proves reproducibility (re-run today -> same
   number). Illustrations are lender-specific: version pinning, bulk-score run,
   drift, country-scoped percentiles. Demo-led. The old problem/flow/products/
   defend structure is gone. */

export default function ForLendersClient() {
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
          <span>For lenders</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">Area scoring your model risk team can defend.</h1>
        <p className="oga-icp-hero__lead">
          Every response is stamped with the engine version that produced it. Pin
          a version and every call across your book returns the same numbers,
          deploy after deploy. Built for regulated underwriting.
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

/* ---------- What an auditor sees (the money shot) ---------- */
function SectionShowcase() {
  return (
    <section className="oga-section-dark oga-pt-band" data-oga-surface="dark" aria-labelledby="lnd-showcase">
      <div className="oga-pt-band__grid">
        <div className="oga-pt-band__copy">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What an auditor sees</span>
          </div>
          <h2 id="lnd-showcase" className="oga-icp__h2 oga-pt-showcase__h2">
            Prove what produced the decision.
          </h2>
          <p className="oga-icp__lead oga-pt-showcase__lead">
            Every score is stamped and pinned. Re-run the exact call a year later
            and it returns the same number, so a lending decision stays
            defensible.
          </p>
          <ul className="oga-pt-showcase__points">
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Byte-equivalent</span>
              <span className="oga-pt-showcase__point-v">
                Two calls under the same pin return identical numbers across
                deploys.
              </span>
            </li>
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Owner-only pin</span>
              <span className="oga-pt-showcase__point-v">
                Only an owner can move the engine version. Admins and keys
                cannot.
              </span>
            </li>
          </ul>
          <Link href="/products/scores" className="oga-pt-showcase__link">
            See Scores
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pt-band__panel">
          <div className="oga-pt-band__panel-inner">
          <article className="oga-lnd-audit" aria-hidden>
            <div className="oga-lnd-audit__head">
              <span className="oga-lnd-audit__head-label">Underwriting decision</span>
              <span className="oga-lnd-audit__head-date">14 Mar 2026</span>
            </div>

            <div className="oga-lnd-audit__score">
              <span className="oga-lnd-audit__area">M1 1AE · preset Underwriting v1.2</span>
              <div className="oga-lnd-audit__num">
                <span className="oga-lnd-audit__num-val">62</span>
                <span className="oga-lnd-audit__num-max">/100</span>
              </div>
              <span className="oga-lnd-audit__dims">safety 70 · environment 66 · transport 61 · +2</span>
            </div>

            <div className="oga-lnd-audit__replay">
              <div className="oga-lnd-audit__pinchip">
                <span>engine_version</span>
                <span>1.0.0 · pinned</span>
              </div>
              <div className="oga-lnd-audit__rrow">
                <span className="oga-lnd-audit__rrow-when">Recorded</span>
                <span className="oga-lnd-audit__rrow-src">2026-03</span>
                <span className="oga-lnd-audit__rrow-val">62</span>
              </div>
              <div className="oga-lnd-audit__rrow oga-lnd-audit__rrow--match">
                <span className="oga-lnd-audit__rrow-when">Re-run today</span>
                <span className="oga-lnd-audit__rrow-src">same call</span>
                <span className="oga-lnd-audit__rrow-val">62 · match</span>
              </div>
            </div>

            <div className="oga-lnd-audit__foot">
              <span>X-Engine-Version 1.0.0</span>
              <span>plan stored</span>
            </div>
          </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Built for regulated underwriting ---------- */
const BULK: { area: string; score: number }[] = [
  { area: "M1 1AE", score: 62 },
  { area: "B1 1AA", score: 58 },
  { area: "LS1 4DY", score: 67 },
];

function SectionIntegration() {
  return (
    <section className="oga-section-quiet oga-pt-int" aria-labelledby="lnd-int">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-int__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Built for regulated underwriting</span>
          </div>
          <h2 id="lnd-int" className="oga-icp__h2">Four things model risk signs off.</h2>
          <p className="oga-icp__lead">
            Pin the methodology, score the book in bulk, watch it drift, and keep
            every percentile scoped to its own nation.
          </p>
          <code className="oga-pt-int__endpoint">
            <span className="oga-pt-int__endpoint-verb">POST</span>{" "}
            /v1/score
          </code>
        </header>

        <div className="oga-pt-int__grid" aria-hidden>
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-lnd-pin">
                <div className="oga-lnd-pin__row">
                  <span className="oga-lnd-pin__k">engine_version</span>
                  <span className="oga-lnd-pin__v">1.0.0</span>
                </div>
                <div className="oga-lnd-pin__row oga-lnd-pin__row--on">
                  <span className="oga-lnd-pin__k">status</span>
                  <span className="oga-lnd-pin__v">pinned</span>
                </div>
                <div className="oga-lnd-pin__row">
                  <span className="oga-lnd-pin__k">changed by</span>
                  <span className="oga-lnd-pin__v">owner only</span>
                </div>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Pinned methodology</h3>
            <p className="oga-pt-int__desc">
              Set the engine version once, owner-only. Every key in the org
              returns numbers under that pin.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-lnd-bulk">
                <div className="oga-lnd-bulk__head">
                  <span>BTL book</span>
                  <span>4,200 areas</span>
                </div>
                <ul className="oga-lnd-bulk__rows">
                  {BULK.map((b) => (
                    <li key={b.area} className="oga-lnd-bulk__row">
                      <span>{b.area}</span>
                      <span className="oga-lnd-bulk__score">{b.score}</span>
                    </li>
                  ))}
                </ul>
                <span className="oga-lnd-bulk__more">+ 4,197 more · not metered</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Bulk-score the book</h3>
            <p className="oga-pt-int__desc">
              Score the whole portfolio in one run. Scoring is not metered
              against your monthly quota.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-lnd-drift">
                <span className="oga-lnd-drift__area">M1 1AE · median price</span>
                <span className="oga-lnd-drift__delta">£175k → £196k</span>
                <span className="oga-lnd-drift__tag">+12.2% · material</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Track drift on the book</h3>
            <p className="oga-pt-int__desc">
              Prove you knew on the day a tracked area moved. Sample-size gated,
              signed on delivery.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-lnd-nations">
                <div className="oga-lnd-nations__row oga-lnd-nations__row--on">
                  <span className="oga-lnd-nations__name">England</span>
                  <span className="oga-lnd-nations__idx">IMD</span>
                  <span className="oga-lnd-nations__pct">72nd</span>
                </div>
                <div className="oga-lnd-nations__row">
                  <span className="oga-lnd-nations__name">Wales</span>
                  <span className="oga-lnd-nations__idx">WIMD</span>
                  <span className="oga-lnd-nations__pct">scoped</span>
                </div>
                <div className="oga-lnd-nations__row">
                  <span className="oga-lnd-nations__name">Scotland</span>
                  <span className="oga-lnd-nations__idx">SIMD</span>
                  <span className="oga-lnd-nations__pct">scoped</span>
                </div>
                <span className="oga-lnd-nations__note">ranked within nation, never across</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Country-scoped percentiles</h3>
            <p className="oga-pt-int__desc">
              England, Wales and Scotland use different indices. We never
              manufacture a cross-border rank.
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
    title: "Versioned and reproducible",
    body: "Pin the engine version and two calls return the same numbers, deploy after deploy.",
    rows: [
      { left: "deploy 47", right: "62" },
      { left: "deploy 52", right: "62", state: "active" },
      { left: "engine", right: "v1.0.0" },
      { left: "pin", right: "owner-only", state: "dim" },
      { left: "X-Engine-Version", right: "v1.0.0", state: "faint" },
    ],
  },
  {
    title: "Plan-replayable AI",
    body: "Every query echoes the executed plan. Replay it and the same rows come back, no model in the loop.",
    rows: [
      { left: "question", right: "nl" },
      { left: "plan echoed", right: "rank_areas", state: "active" },
      { left: "replay", right: "client" },
      { left: "same rows", right: "deterministic", state: "dim" },
      { left: "stored with", right: "decision", state: "faint" },
    ],
  },
  {
    title: "Sample-size honest",
    body: "Change detection is gated on transaction count. Thin evidence never fires a false alert.",
    rows: [
      { left: "median price", right: "+12.2% material", state: "active" },
      { left: "crime", right: "gated · 3 sales" },
      { left: "deprivation", right: "static" },
      { left: "flood risk", right: "no change", state: "dim" },
      { left: "area type", right: "static", state: "faint" },
    ],
  },
];

function SectionTrust() {
  return (
    <section className="oga-section-dark oga-pt-trust" data-oga-surface="dark" aria-labelledby="lnd-trust">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-trust__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Why it survives audit</span>
          </div>
          <h2 id="lnd-trust" className="oga-icp__h2">Made to be defended, line by line.</h2>
          <p className="oga-icp__lead">
            Your auditors ask how every number was made and whether it still
            holds. The answer is in the response.
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
    q: "Is the engine version pinnable at the org level?",
    a: "Yes, owner-only. Set the engine version once and every product surface honours it, stamping it on the X-Engine-Version response header while the body reports what actually ran. Two calls under the same pin return the same numbers across deploys.",
  },
  {
    q: "Can we replay an AI-assisted query for audit?",
    a: "Yes, this is the core audit contract. Every query returns the executed plan alongside a plan_source that says whether the planner translated a natural-language question or the caller sent the plan directly. Store the plan with the decision, paste it back later, and the same deterministic executor returns the same rows. The model is never in the replay path.",
  },
  {
    q: "How do you help with FCA and PRA model risk requirements?",
    a: "We do not certify your model, that is your model risk team's job. We give you the inputs to do it well: a versioned methodology with a public registry, engine_version on every response, a plan-replayable AI seam, sample-size gating, country-scoped percentiles, and source attribution on every signal. The full methodology is public and drops into your model documentation pack.",
  },
  {
    q: "What gets stored about our portfolios?",
    a: "Just the postcode or area code and an optional label you supply to map back to your own records. No PII, no borrower data, no loan amounts. Change reports and signed webhooks carry only the areas and the moves.",
  },
];

function SectionFaqs() {
  return (
    <section className="oga-section-quiet oga-icp-faqs oga-pt-faqs" aria-labelledby="lnd-faqs">
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 id="lnd-faqs" className="oga-icp__h2">Questions your model risk team asks first.</h2>
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
    <section className="oga-section-dark oga-icp-cta" data-oga-surface="dark" aria-labelledby="lnd-cta">
      <div className="oga-icp__wrap--narrow">
        <h2 id="lnd-cta" className="oga-icp-cta__h2">Close the model-governance gap your auditors keep flagging.</h2>
        <p className="oga-icp-cta__lead">
          Pin the engine version, bulk-score the book, track drift, and replay
          any AI query as a deterministic plan. The audit trail is the response
          itself.
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
