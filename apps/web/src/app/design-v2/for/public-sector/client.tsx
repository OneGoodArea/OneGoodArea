"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { IcpHeroBadge } from "../_shared/icp-hero-badge";
import { DEMO_URL } from "../../_shared/book-demo";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./public-sector.css";

/* /for/public-sector - Plan 064 rebuild onto the proptech template. The buyer
   publishes numbers that must defend themselves, so the money shot is an
   FOI-ready evidence record. Illustrations are PS-specific: a "cannot tell"
   honesty state, per-nation scoping, a replayable analyst query, and no personal
   data. Demo-led. The old problem/flow/products/defend structure is gone. */

export default function ForPublicSectorClient() {
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
        <IcpHeroBadge icp="public-sector" label="For public sector and research" />
        <h1 className="oga-icp-hero__h1">Area metrics that survive FOI and procurement review.</h1>
        <p className="oga-icp-hero__lead">
          Every value carries its source, its release date and a confidence.
          Percentiles are ranked within each nation, the methodology is public,
          and the engine version is stamped on every response.
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

/* ---------- What you can publish (the money shot) ---------- */
function SectionShowcase() {
  return (
    <section className="oga-section-dark oga-pt-band" data-oga-surface="dark" aria-labelledby="ps-showcase">
      <div className="oga-pt-band__grid">
        <div className="oga-pt-band__copy">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What you can publish</span>
          </div>
          <h2 id="ps-showcase" className="oga-icp__h2 oga-pt-showcase__h2">
            A number that defends itself.
          </h2>
          <p className="oga-icp__lead oga-pt-showcase__lead">
            Every value comes with its source, its release date and a confidence,
            ranked within its own nation. Paste it straight into an FOI response
            or a committee paper.
          </p>
          <ul className="oga-pt-showcase__points">
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">FOI-ready</span>
              <span className="oga-pt-showcase__point-v">
                Source, observed period and confidence come attached to every
                value.
              </span>
            </li>
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Citable</span>
              <span className="oga-pt-showcase__point-v">
                Reference the public methodology and the exact engine version
                behind the number.
              </span>
            </li>
          </ul>
          <Link href="/methodology" className="oga-pt-showcase__link">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pt-band__panel">
          <div className="oga-pt-band__panel-inner">
          <article className="oga-ps-record" aria-hidden>
            <div className="oga-ps-record__head">
              <span className="oga-ps-record__label">Evidence record</span>
              <span className="oga-ps-record__ver">engine v1.1.0</span>
            </div>

            <div className="oga-ps-record__meta">
              <div className="oga-ps-record__row">
                <span>Area</span>
                <span>M1 1AE · Manchester</span>
              </div>
              <div className="oga-ps-record__row">
                <span>Signal</span>
                <span>crime.total_12m</span>
              </div>
            </div>

            <div className="oga-ps-record__value">
              <span className="oga-ps-record__value-num">3,712</span>
              <span className="oga-ps-record__value-pct">92nd percentile · England</span>
            </div>

            <div className="oga-ps-record__prov">
              <div className="oga-ps-record__prow">
                <span>Source</span>
                <span>police.uk</span>
              </div>
              <div className="oga-ps-record__prow">
                <span>Observed</span>
                <span>Apr 2025 to Mar 2026</span>
              </div>
              <div className="oga-ps-record__prow">
                <span>Confidence</span>
                <span>0.90 · 12 months of data</span>
              </div>
            </div>

            <div className="oga-ps-record__foot">
              <span>Ranked within England</span>
              <span>cite /methodology</span>
            </div>
          </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Built for the publication trail ---------- */
function SectionIntegration() {
  return (
    <section className="oga-section-quiet oga-pt-int" aria-labelledby="ps-int">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-int__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Built for the publication trail</span>
          </div>
          <h2 id="ps-int" className="oga-icp__h2">Four things that hold up at review.</h2>
          <p className="oga-icp__lead">
            It admits what it cannot tell, keeps each nation separate, replays any
            analyst query, and never touches personal data.
          </p>
          <code className="oga-pt-int__endpoint">
            <span className="oga-pt-int__endpoint-verb">GET</span>{" "}
            /v1/area
          </code>
        </header>

        <div className="oga-pt-int__grid" aria-hidden>
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ps-tell">
                <div className="oga-ps-tell__row">
                  <span className="oga-ps-tell__k">crime</span>
                  <span className="oga-ps-tell__v">3,712</span>
                </div>
                <div className="oga-ps-tell__row">
                  <span className="oga-ps-tell__k">deprivation</span>
                  <span className="oga-ps-tell__v">decile 3</span>
                </div>
                <div className="oga-ps-tell__row oga-ps-tell__row--none">
                  <span className="oga-ps-tell__k">price change</span>
                  <span className="oga-ps-tell__none">cannot tell · 2 sales</span>
                </div>
              </div>
            </div>
            <h3 className="oga-pt-int__title">It says when it cannot tell</h3>
            <p className="oga-pt-int__desc">
              Thin evidence returns no number instead of a guess. A council
              briefing never carries a fabricated move.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ps-nations">
                <div className="oga-ps-nations__row">
                  <span className="oga-ps-nations__name">England</span>
                  <span className="oga-ps-nations__idx">IMD 2025</span>
                </div>
                <div className="oga-ps-nations__row">
                  <span className="oga-ps-nations__name">Wales</span>
                  <span className="oga-ps-nations__idx">WIMD 2019</span>
                </div>
                <div className="oga-ps-nations__row">
                  <span className="oga-ps-nations__name">Scotland</span>
                  <span className="oga-ps-nations__idx">SIMD 2020</span>
                </div>
                <div className="oga-ps-nations__never">
                  <span>a single UK score</span>
                  <span className="oga-ps-nations__x">never merged</span>
                </div>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Percentiles within each nation</h3>
            <p className="oga-pt-int__desc">
              Three different methodologies on three release schedules. We never
              merge them into a cross-border rank.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ps-query">
                <div className="oga-ps-query__nl">{`"wards where IMD decile is 1 or 2"`}</div>
                <span className="oga-ps-query__arrow" aria-hidden>↓</span>
                <pre className="oga-ps-query__plan">{`{ op: "rank_areas",
  filter: { imd_decile: { lte: 2 } } }`}</pre>
                <span className="oga-ps-query__note">plan stored · replayable</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Replay any analyst query</h3>
            <p className="oga-pt-int__desc">
              Natural language becomes a typed plan. Store it with the paper and
              re-run the exact query on demand.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-ps-grain">
                <div className="oga-ps-grain__row">
                  <span className="oga-ps-grain__k">Grain</span>
                  <span className="oga-ps-grain__v">neighbourhood (LSOA)</span>
                </div>
                <div className="oga-ps-grain__row">
                  <span className="oga-ps-grain__k">Personal data</span>
                  <span className="oga-ps-grain__v">none</span>
                </div>
                <div className="oga-ps-grain__row">
                  <span className="oga-ps-grain__k">Basis</span>
                  <span className="oga-ps-grain__v">aggregate statistics</span>
                </div>
              </div>
            </div>
            <h3 className="oga-pt-int__title">No personal data</h3>
            <p className="oga-pt-int__desc">
              Everything is neighbourhood-grain aggregate statistics. Nothing
              about residents of the areas you query.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Why it survives FOI ---------- */
type TrustRow = { left: string; right: string; state?: "dim" | "faint" | "active" };
type TrustCol = { title: string; body: string; rows: TrustRow[] };

const TRUST: TrustCol[] = [
  {
    title: "Never invented",
    body: "Every value points at a source. Where we cannot back a number, we return nothing rather than fabricate one.",
    rows: [
      { left: "crime", right: "police.uk" },
      { left: "deprivation", right: "IMD 2025", state: "active" },
      { left: "NI postcode", right: "null" },
      { left: "cross-border", right: "refused", state: "dim" },
      { left: "fabrication", right: "never", state: "faint" },
    ],
  },
  {
    title: "Pinned for the contract",
    body: "Pin the version named in the procurement notice. The number on the deliverable matches the one at award.",
    rows: [
      { left: "at award", right: "v1.1.0" },
      { left: "at delivery", right: "v1.1.0", state: "active" },
      { left: "X-Engine-Version", right: "1.1.0" },
      { left: "pin", right: "owner-only", state: "dim" },
      { left: "drift", right: "none", state: "faint" },
    ],
  },
  {
    title: "Public, citable method",
    body: "The methodology is published and versioned. Cite the page and the exact engine version behind any figure.",
    rows: [
      { left: "/methodology", right: "public" },
      { left: "engine", right: "v1.1.0", state: "active" },
      { left: "changelog", right: "versioned" },
      { left: "source", right: "per signal", state: "dim" },
      { left: "cite", right: "in the note", state: "faint" },
    ],
  },
];

function SectionTrust() {
  return (
    <section className="oga-section-dark oga-pt-trust" data-oga-surface="dark" aria-labelledby="ps-trust">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-trust__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Why it survives FOI</span>
          </div>
          <h2 id="ps-trust" className="oga-icp__h2">Made to be published, not just used.</h2>
          <p className="oga-icp__lead">
            A reviewer asks where a figure came from and whether it still holds.
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
    q: "Will the numbers survive an FOI response?",
    a: "Yes, by construction. Every value carries its source, observed period, and a plain-language confidence. The methodology is public and the engine version is stamped on every response. Your FOI footnote can point at the source, the release and the exact version behind the figure.",
  },
  {
    q: "Can we pin the methodology for a procurement deliverable?",
    a: "Yes, owner-only. Pin the engine version named in the procurement notice and every response honours it. Two calls under the same pin return the same numbers, so the figure on the deliverable matches the one at award, across the whole contract timeline.",
  },
  {
    q: "Do you cover Northern Ireland?",
    a: "Not yet. England, Wales and Scotland are covered today, each with its own national deprivation methodology. Northern Ireland is on the roadmap. Until then an NI postcode returns null rather than a fabricated cross-border value, which is the honest answer for a published figure.",
  },
  {
    q: "What do you store about residents of the areas we query?",
    a: "Nothing. Everything is neighbourhood-grain aggregate statistics, not personal data. We hold your org, your members and your API keys, plus optional saved settings. No information about individual residents of the areas you look up.",
  },
];

function SectionFaqs() {
  return (
    <section className="oga-section-quiet oga-icp-faqs oga-pt-faqs" aria-labelledby="ps-faqs">
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 id="ps-faqs" className="oga-icp__h2">Questions a research or analytical unit asks first.</h2>
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
    <section className="oga-section-dark oga-icp-cta" data-oga-surface="dark" aria-labelledby="ps-cta">
      <div className="oga-icp__wrap--narrow">
        <h2 id="ps-cta" className="oga-icp-cta__h2">Sourced, dated, and built for the publication.</h2>
        <p className="oga-icp-cta__lead">
          Pin the methodology for the contract cycle, cite the exact version
          behind every number, and know it will hold at FOI and procurement
          review.
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
