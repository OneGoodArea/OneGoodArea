"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { DEMO_URL } from "../../_shared/book-demo";
import "../_shared/icp-page.css";
import "../_shared/icp-template.css";
import "./cre.css";

/* /for/cre - Plan 064 rebuild onto the proptech template. CRE is a ranking
   problem at scale, so the money shot is a compound-query shortlist. The
   capability illustrations are CRE-specific: peer-set finder, commercial-profile
   radar, country/LAD scope, and plan replay. Demo-led. The old problem/flow/
   products/defend structure is gone. */

export default function ForCreClient() {
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
          <span>For CRE and site selection</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">Screen the whole UK against your site criteria in one call.</h1>
        <p className="oga-icp-hero__lead">
          Compound, multi-signal ranking across every neighbourhood, scoped to a
          country or a local authority. Find the areas most like your
          best-performing site, and replay the same screen next quarter for a
          comparable answer.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href={DEMO_URL} className="oga-btn oga-btn-primary">
            Book a demo
            <span aria-hidden>→</span>
          </Link>
          <Link href="/products/intelligence" className="oga-btn oga-btn-secondary">
            See Intelligence
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- The shortlist (the money shot) ---------- */
const FILTERS = ["spending ≥ 80", "competition ≤ 30", "transport ≥ 70"];
const SHORTLIST: { rank: string; area: string; name: string; score: number; top?: boolean }[] = [
  { rank: "1", area: "EC1A 1BB", name: "Clerkenwell", score: 91, top: true },
  { rank: "2", area: "M1 1AE", name: "Manchester", score: 88 },
  { rank: "3", area: "LS6 3AA", name: "Headingley", score: 84 },
  { rank: "4", area: "B29 6BN", name: "Selly Oak", score: 80 },
];

function SectionShowcase() {
  return (
    <section className="oga-section-dark oga-pt-band" data-oga-surface="dark" aria-labelledby="cre-showcase">
      <div className="oga-pt-band__grid">
        <div className="oga-pt-band__copy">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What site selection gets back</span>
          </div>
          <h2 id="cre-showcase" className="oga-icp__h2 oga-pt-showcase__h2">
            A ranked shortlist, not a spreadsheet join.
          </h2>
          <p className="oga-icp__lead oga-pt-showcase__lead">
            One typed query takes your compound criteria and ranks every
            catchment in scope. No stitching ONS, Land Registry and a footfall
            file by hand.
          </p>
          <ul className="oga-pt-showcase__points">
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">Compound</span>
              <span className="oga-pt-showcase__point-v">
                Up to eight AND-joined filters with eleven operators, sorted by
                any signal.
              </span>
            </li>
            <li className="oga-pt-showcase__point">
              <span className="oga-pt-showcase__point-k">One call</span>
              <span className="oga-pt-showcase__point-v">
                The whole country ranked in a single round trip, capped at a
                thousand rows.
              </span>
            </li>
          </ul>
          <Link href="/products/intelligence" className="oga-pt-showcase__link">
            See Intelligence
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-pt-band__panel">
          <div className="oga-pt-band__panel-inner">
          <article className="oga-cre-shortlist" aria-hidden>
            <div className="oga-cre-shortlist__head">
              <span className="oga-cre-shortlist__title">Site shortlist</span>
              <span className="oga-cre-shortlist__scope">England</span>
            </div>

            <div className="oga-cre-shortlist__filters">
              {FILTERS.map((f) => (
                <span key={f} className="oga-cre-shortlist__filter">{f}</span>
              ))}
            </div>

            <ul className="oga-cre-shortlist__rows">
              {SHORTLIST.map((r) => (
                <li
                  key={r.area}
                  className={`oga-cre-shortlist__row${r.top ? " oga-cre-shortlist__row--top" : ""}`}
                >
                  <span className="oga-cre-shortlist__rank">{r.rank}</span>
                  <span className="oga-cre-shortlist__area">{r.area}</span>
                  <span className="oga-cre-shortlist__name">{r.name}</span>
                  <span className="oga-cre-shortlist__score">{r.score}</span>
                </li>
              ))}
            </ul>

            <div className="oga-cre-shortlist__foot">
              <span>1,240 catchments ranked</span>
              <span>one call</span>
            </div>
          </article>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- What a site team leans on ---------- */
const PEERS: { code: string; d: string }[] = [
  { code: "E01000921", d: "0.045" },
  { code: "E01004312", d: "0.052" },
  { code: "E01002087", d: "0.061" },
];

/* radar geometry: pentagon in a 120 box, centre 60,60, outer radius ~42. */
const RADAR_GRID = "60,18 99.9,47 84.7,94 35.3,94 20.05,47";
const RADAR_AREA = "60,24.3 81.95,52.86 77.78,84.47 47.65,76.99 32.83,51.17";
const RADAR_AXES: [number, number][] = [
  [60, 18],
  [99.9, 47],
  [84.7, 94],
  [35.3, 94],
  [20.05, 47],
];
const RADAR_DOTS = RADAR_AREA.split(" ").map((p) => p.split(",").map(Number) as [number, number]);

function SectionIntegration() {
  return (
    <section className="oga-section-quiet oga-pt-int" aria-labelledby="cre-int">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-int__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What a site team leans on</span>
          </div>
          <h2 id="cre-int" className="oga-icp__h2">Four moves the committee understands.</h2>
          <p className="oga-icp__lead">
            Find the peers of your best site, score the commercial profile, screen
            at any scope, and replay the whole thing next quarter.
          </p>
          <code className="oga-pt-int__endpoint">
            <span className="oga-pt-int__endpoint-verb">POST</span>{" "}
            /v1/query
          </code>
        </header>

        <div className="oga-pt-int__grid" aria-hidden>
          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-cre-peers">
                <div className="oga-cre-peers__target">
                  <span className="oga-cre-peers__target-tag">Top store</span>
                  <span className="oga-cre-peers__target-code">EC1A 1BB</span>
                </div>
                <ul className="oga-cre-peers__rows">
                  {PEERS.map((p) => (
                    <li key={p.code} className="oga-cre-peers__row">
                      <span className="oga-cre-peers__code">{p.code}</span>
                      <span className="oga-cre-peers__d">{p.d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Areas like your best store</h3>
            <p className="oga-pt-int__desc">
              Give it your top-performing catchment and get its nearest matches by
              signal signature.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-cre-radar">
                <svg className="oga-cre-radar__svg" viewBox="0 0 120 120" aria-hidden>
                  {RADAR_AXES.map(([x, y]) => (
                    <line key={`${x}-${y}`} className="oga-cre-radar__axis" x1="60" y1="60" x2={x} y2={y} />
                  ))}
                  <polygon className="oga-cre-radar__grid" points={RADAR_GRID} />
                  <polygon className="oga-cre-radar__area" points={RADAR_AREA} />
                  {RADAR_DOTS.map(([x, y]) => (
                    <circle key={`${x}-${y}`} className="oga-cre-radar__dot" cx={x} cy={y} r="2.4" />
                  ))}
                </svg>
              </div>
            </div>
            <h3 className="oga-pt-int__title">The commercial profile</h3>
            <p className="oga-pt-int__desc">
              Five dimensions a site analyst already uses: footfall, competition,
              transport, spending power and costs.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-cre-scope">
                <div className="oga-cre-scope__row oga-cre-scope__row--on">
                  <span className="oga-cre-scope__name">England</span>
                  <span className="oga-cre-scope__tag">country</span>
                </div>
                <div className="oga-cre-scope__row">
                  <span className="oga-cre-scope__name">Greater Manchester</span>
                  <span className="oga-cre-scope__tag">LAD</span>
                </div>
                <div className="oga-cre-scope__row">
                  <span className="oga-cre-scope__name">Leeds</span>
                  <span className="oga-cre-scope__tag">LAD</span>
                </div>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Screen at any scope</h3>
            <p className="oga-pt-int__desc">
              Rank across a whole country, or narrow to one local authority.
              ONS-backed boundaries, no fake polygons.
            </p>
          </div>

          <div className="oga-pt-int__cell">
            <div className="oga-pt-int__viz">
              <div className="oga-cre-replay">
                <div className="oga-cre-replay__step">
                  <span className="oga-cre-replay__q">Q3</span>
                  <span className="oga-cre-replay__what">plan saved</span>
                </div>
                <span className="oga-cre-replay__arrow" aria-hidden>↓</span>
                <div className="oga-cre-replay__step oga-cre-replay__step--on">
                  <span className="oga-cre-replay__q">Q4</span>
                  <span className="oga-cre-replay__what">same plan, fresh data</span>
                </div>
                <span className="oga-cre-replay__note">comparable shortlist</span>
              </div>
            </div>
            <h3 className="oga-pt-int__title">Replay it next quarter</h3>
            <p className="oga-pt-int__desc">
              Every shortlist echoes its plan. Save it, run it again on refreshed
              data, get a comparable answer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Why the shortlist survives committee ---------- */
type TrustRow = { left: string; right: string; state?: "dim" | "faint" | "active" };
type TrustCol = { title: string; body: string; rows: TrustRow[] };

const TRUST: TrustCol[] = [
  {
    title: "Same shortlist next quarter",
    body: "The same plan against the same data returns the same rows. The criteria live as JSON, not a spreadsheet.",
    rows: [
      { left: "run · Q3", right: "same rows" },
      { left: "run · Q4", right: "same rows", state: "active" },
      { left: "plan", right: "echoed" },
      { left: "executor", right: "deterministic", state: "dim" },
      { left: "AI", right: "plan only", state: "faint" },
    ],
  },
  {
    title: "One round trip",
    body: "Compound screening is a single call, not a chain of vendor joins reconciled by hand.",
    rows: [
      { left: "filters", right: "up to 8" },
      { left: "operators", right: "value · pct", state: "active" },
      { left: "rows", right: "up to 1,000" },
      { left: "joins", right: "prepared", state: "dim" },
      { left: "scope", right: "country · LAD", state: "faint" },
    ],
  },
  {
    title: "Honest across borders",
    body: "Percentiles are ranked within each nation. We never manufacture a cross-border rank that would not hold up.",
    rows: [
      { left: "England", right: "IMD", state: "active" },
      { left: "Wales", right: "WIMD" },
      { left: "Scotland", right: "SIMD" },
      { left: "scope", right: "within nation", state: "dim" },
      { left: "cross-border", right: "refused", state: "faint" },
    ],
  },
];

function SectionTrust() {
  return (
    <section className="oga-section-dark oga-pt-trust" data-oga-surface="dark" aria-labelledby="cre-trust">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header oga-pt-trust__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Why the shortlist survives committee</span>
          </div>
          <h2 id="cre-trust" className="oga-icp__h2">A shortlist you can put in front of the board.</h2>
          <p className="oga-icp__lead">
            The property committee asks how the list was made and whether it
            holds next quarter. The answer is in the response.
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
    q: "How many catchments can I screen at once?",
    a: "One query ranks the whole country and returns up to 1,000 rows per call, with a default of 100. Each result row carries its area code, so you can pipe the shortlist into the area endpoint for a full profile on the ones that make the cut.",
  },
  {
    q: "Can I use my own commercial weighting?",
    a: "Yes, within the business profile's five dimensions: footfall demand, competition density, transport access, spending power and commercial costs. You re-weight them per request, or save a per-org profile and reference it by id. You re-weight, you do not redefine.",
  },
  {
    q: "What about catchments that are not neighbourhood-shaped?",
    a: "Approximate the catchment as a list of area codes and save it as a cohort, then constrain the peer search to that set. Or resolve a few representative postcodes inside the catchment and aggregate client-side. The neighbourhood-by-month grain is the floor; custom polygons are not on the roadmap.",
  },
  {
    q: "Where does footfall come from?",
    a: "We surface the proxies (residential density, retail amenity counts, transport-station counts) through the business profile. We are not a mobile-footfall vendor. Most CRE teams already have one; OneGoodArea is the deterministic area-context layer underneath it.",
  },
];

function SectionFaqs() {
  return (
    <section className="oga-section-quiet oga-icp-faqs oga-pt-faqs" aria-labelledby="cre-faqs">
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
          </div>
          <h2 id="cre-faqs" className="oga-icp__h2">Questions a site-selection analyst asks first.</h2>
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
    <section className="oga-section-dark oga-icp-cta" data-oga-surface="dark" aria-labelledby="cre-cta">
      <div className="oga-icp__wrap--narrow">
        <h2 id="cre-cta" className="oga-icp-cta__h2">One typed query against the whole UK.</h2>
        <p className="oga-icp-cta__lead">
          Replace the spreadsheet join with a versioned plan, find the peers of
          your best-performing catchment, and score with weights the property
          committee can sign off.
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
