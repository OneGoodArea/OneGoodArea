"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "./business.css";

/* /business — AR-204 B2B sales surface.

   Buyer-centric view. Each ICP gets a substantial section that
   answers their own question: which products do I reach for, why,
   what value, what's the sales line. Each section ends in a disabled
   "See more for <ICP>" CTA per the wiring rule. Per-ICP sub-pages
   (/business/lender etc.) ship as a later PR set with SEO tuning.

   Hard rules: no aiq_, no em dashes, no fake links, no "7 sources",
   zero inline styles. Every claim traces to ADR or apps/api code. */

const PRODUCTS = [
  { slug: "signals",      label: "Signals" },
  { slug: "scores",       label: "Scores" },
  { slug: "monitor",      label: "Monitor" },
  { slug: "intelligence", label: "Intelligence" },
] as const;
type ProductSlug = (typeof PRODUCTS)[number]["slug"];

/* ICPs whose /for/<anchor> page exists today. The "See more for <ICP>"
   CTA on each section flips from a disabled "Soon" pill to a live
   link as each ICP page lands. Add anchors here as new ICP pages ship. */
const READY_ICPS = new Set<string>(["proptech"]);

/* ============================================================
   ICP DEFINITIONS
   ============================================================ */

type Icp = {
  num: string;
  anchor: string;
  shortName: string;
  fullName: string;
  tagline: string;
  problem: string;
  why: string;
  value: string;
  sales: string;
  productsUsed: ProductSlug[];
  Viz: () => ReactElement;
  proof: { title: string; snippet: string; foot: string };
};

const ICPS: Icp[] = [
  {
    num: "01",
    anchor: "proptech",
    shortName: "PropTech",
    fullName: "PropTech platforms",
    tagline:
      "Listing portals, valuation tools, agent CRMs, search products. The audience already has the buyer or renter on the page; the area context is what comes next.",
    problem:
      "Your product surfaces UK properties to users who immediately want to know what the area is like. Building that yourself means stitching crime, deprivation, prices, transport, amenities and schools across mismatched government APIs, normalising indices across England, Wales and Scotland, and reconciling 2011 versus 2021 boundaries. That is a data team you do not want to hire.",
    why:
      "Signals is exactly that data layer, already stitched together. One typed request to /v1/area returns the seven-category catalog at LSOA grain with national-within-country percentiles, normalised positions, per-signal confidence, and source attribution. Scores compresses the catalog into a single 0-to-100 number per audience (one of four scoring profiles). Intelligence handles natural-language search and similar-areas tiles in one call.",
    value:
      "Weeks of integration replaced by one API key. Your area-detail screen ships with comparable percentiles instead of raw numbers that mean different things in Cardiff and Manchester. Same postcode plus profile gives the same score across deploys, so cached UI states stay coherent.",
    sales:
      "Drop one endpoint into your property detail page and ship richer area context than your competitor's roadmap.",
    productsUsed: ["signals", "scores", "intelligence"],
    Viz: VizProptech,
    proof: {
      title: "What lands on a listing page",
      snippet: `GET /v1/area?postcode=M1 1AE
{
  "signals": [
    { "key": "crime.total_12m", "value": 3712,
      "percentile": 92.1, "confidence": 0.9 },
    { "key": "property.median_price",
      "value": 182500, "percentile": 18.2 }
  ],
  "meta": { "engine_version": "${METHODOLOGY_VERSION}" }
}`,
      foot: "One API key. Seven categories. LSOA grain.",
    },
  },
  {
    num: "02",
    anchor: "insurance",
    shortName: "Insurance",
    fullName: "Insurance and InsureTech",
    tagline:
      "Carriers, MGAs, and InsureTech platforms that need defensible, dated area inputs for underwriting and continuous portfolio monitoring.",
    problem:
      "Underwriting needs deterministic, addressable, dated values you can pin a price to and re-derive on audit. Once the book is written it drifts continuously: prices move, deprivation shifts, crime rebalances. Pricing teams need to know when a tracked LSOA has actually changed, not at renewal but ongoing, and the alert has to be auditable rather than a black-box score.",
    why:
      "Scores returns every dimension's raw score, weight, and per-dimension confidence so the actuary sees the components. Custom weights or a saved org profile (preset_id) lets the carrier lock the model. Monitor saves the insured-location book as a portfolio and detects material moves on demand, with sample-size gating so a 47-percent swing on two sales never earns an alert. Material moves fire signed webhooks. Intelligence find_peers gives a stable peer set; find_insights ranks LSOAs by peer-relative anomaly z-score.",
    value:
      "Reproducible inputs you can defend to a regulator. Per-signal confidence flows into your decline-or-refer logic without you inventing it. Exposure drift detected continuously, not at renewal. Every alert is auditable: raw values, periods, threshold, sample gate, all in the same envelope.",
    sales:
      "Configurable composite scoring the actuary can audit, plus HMAC-signed alerts the day a tracked LSOA moves materially.",
    productsUsed: ["scores", "monitor", "intelligence"],
    Viz: VizInsurer,
    proof: {
      title: "Material change envelope (signal.changed)",
      snippet: `X-OneGoodArea-Event:     signal.changed
X-OneGoodArea-Signature: t=...,v1=<sha256>

{
  "signal_key": "property.median_price",
  "area": "M1 1AE",
  "period_from": "2026-03",
  "period_to":   "2026-04",
  "pct_change":  7.6,
  "min_transactions": 8
}`,
      foot: "Sample-size gated. Stripe-style signed.",
    },
  },
  {
    num: "03",
    anchor: "lender",
    shortName: "Lender",
    fullName: "Lenders",
    tagline:
      "Residential and commercial lenders whose underwriting models need versioned, pinnable, auditable area inputs that hold up at a model risk committee.",
    problem:
      "A regulated lender's model risk register treats every API the underwriting model depends on as a model input. Auditors ask which version of the area score produced this decision, and whether it is byte-equivalent to the score you would compute today. Most vendors version their codebase, not the methodology, so the honest answer is we do not know.",
    why:
      "Every Scores response carries engine_version in the body and X-Engine-Version on the response header. Both can be locked at the org level (methodology pinning, owner-only, write-time validated). The deterministic engine is frozen v2, golden-tested; AI never touches the scoring path. Monitor records every period_from, period_to and pct_change so risk teams can prove they knew on date X. Intelligence echoes the executed plan plus plan_source so any natural-language answer is replayable as a deterministic programmatic call.",
    value:
      "Every decision produced from /v1/score is reproducible to a known methodology version. The model risk register has a 1-to-1 mapping between an API call and the engine that ran. AI-assisted screening is auditable because the LLM only ever emits a typed plan that gets validated and run against deterministic SQL.",
    sales:
      "Versioned, pinnable area scoring with a plan-replayable AI seam your model risk committee will sign off.",
    productsUsed: ["scores", "monitor", "intelligence"],
    Viz: VizLender,
    proof: {
      title: "Engine version pinning",
      snippet: `# Pin per request
curl -H "X-Engine-Version: 2.0.1" /v1/score

# Pin org-wide (owner only)
PUT /v1/orgs/:id/methodology
{ "engine_version": "2.0.1" }

# Response header on every call
X-Engine-Version: 2.0.1`,
      foot: "Audit anchor. Compliance-grade.",
    },
  },
  {
    num: "04",
    anchor: "cre",
    shortName: "CRE",
    fullName: "Commercial real estate and site selection",
    tagline:
      "Retail expansion teams, asset managers, and CRE analytics platforms screening hundreds of UK catchments against compound criteria.",
    problem:
      "Picking a site is a ranking problem at portfolio scale. Which areas in this LAD or country meet my thresholds on footfall demand, competition density, transport access, spending power and commercial costs, sorted by which one moved most this year. You do not want a one-area-at-a-time report API; you want to query the universe and rank.",
    why:
      "Signals /v1/areas is single-signal threshold-and-rank within a country or LAD. Intelligence /v1/query is the compound version: up to 8 AND-joined signal filters, sort by any of them, country or LAD scope, capped at 1000 rows. find_peers gives the peer set of your best-performing catchment in one call. Scores with the commercial preset returns the 5 dimensions a site-selection analyst already uses.",
    value:
      "Hundreds of catchment screens compress into one round trip. Criteria become version-controlled JSON instead of a spreadsheet. The shortlist is reproducible: every result echoes the executed plan, so a colleague can paste it back and get the same answer next quarter.",
    sales:
      "Screen the whole UK against your compound site criteria in one typed call, then ask for the peer set of your best-performing catchment.",
    productsUsed: ["signals", "scores", "intelligence"],
    Viz: VizCre,
    proof: {
      title: "Compound rank query",
      snippet: `POST /v1/query
{
  "plan": {
    "op": "rank_areas",
    "params": {
      "signals": [
        { "key": "property.median_price",  "filter": { "lte": 250000 } },
        { "key": "property.price_change_pct_yoy",
          "filter": { "gt": 0 } },
        { "key": "crime.total_12m",
          "filter": { "percentile_lte": 25 } }
      ],
      "sort_by": { "signal": "property.price_change_pct_yoy",
                   "direction": "desc" },
      "country": "England", "limit": 50
    }
  }
}`,
      foot: "8 filters AND-joined. One round trip.",
    },
  },
  {
    num: "05",
    anchor: "public-sector",
    shortName: "Public sector",
    fullName: "Public sector and research",
    tagline:
      "Council planning teams, central-government analytical units, and regen bodies that need defensible, sourced, dated metrics that survive FOI scrutiny.",
    problem:
      "Public-sector teams have to defend every number they publish. A black-box AI score is unusable; they need to point at the methodology, the inputs, and the SQL. They also need to compare like-with-like inside a country, not across a methodological border. England's IMD 2025 is not comparable to Scotland's SIMD 2020; pretending otherwise is a methodological lie.",
    why:
      "Every Signal carries an explicit source, observed_period, and confidence_reason. Normalisation is country-scoped on purpose. Scores' research baseline is the balanced default. Monitor produces a lineage-stamped change report (baseline, threshold, sample gate all in the artifact). Intelligence echoes the executed plan so any answer is replayable as a deterministic call. The methodology version is on every response.",
    value:
      "An evidence base that holds up under scrutiny. Country-scoped percentiles instead of false-precision cross-border comparisons. Same methodology version on every report run if you pin it. Honest sample-size gating: the system says when it cannot tell, instead of hallucinating a move.",
    sales:
      "Defensible, sourced, dated area metrics with the methodology version stamped on every response. Built for the procurement notice and the FOI request.",
    productsUsed: ["signals", "monitor", "intelligence"],
    Viz: VizPublic,
    proof: {
      title: "Provenance on every signal",
      snippet: `{
  "key": "deprivation.imd_decile",
  "value": 1,
  "percentile": 5.4,
  "confidence": 0.95,
  "confidence_reason":
    "IMD 2025 release; complete LSOA coverage.",
  "source": "IMD 2025 (England)",
  "observed_period": "IMD 2025",
  "meta": { "engine_version": "${METHODOLOGY_VERSION}" }
}`,
      foot: "Source. Period. Confidence reason. Every row.",
    },
  },
];

/* ============================================================
   Page assembly
   ============================================================ */

export default function BusinessClient() {
  return (
    <div className="oga-root oga-biz">
      <Nav />
      <Hero />
      <SectionModes />
      {ICPS.map((icp, i) => (
        <SectionIcp key={icp.anchor} icp={icp} altSurface={i % 2 === 1} />
      ))}
      <SectionPillars />
      <SectionProof />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero
   ============================================================ */

function Hero() {
  return (
    <section className="oga-section-hero oga-biz-hero">
      <div className="oga-biz__wrap--narrow">
        <p className="oga-biz-hero__eyebrow">For B2B integrators</p>
        <h1 className="oga-biz-hero__h1">
          The data and intelligence layer underneath UK property workflows.
        </h1>
        <p className="oga-biz-hero__lead">
          Deterministic signals at LSOA grain. Configurable composite scoring
          with a pinnable engine version. Portfolio monitoring with sample-
          size-gated change alerts. A typed query plane where AI emits the
          plan and the database produces the answer. One API key. Five buyer
          workflows.
        </p>
        <div className="oga-biz-hero__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>

        <nav className="oga-biz-hero__anchor-strip" aria-label="Jump to your workflow">
          <p className="oga-biz-hero__anchor-strip-label">Jump to your workflow</p>
          {ICPS.map((i) => (
            <a key={i.anchor} href={`#${i.anchor}`} className="oga-biz-hero__anchor">
              {i.shortName}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

/* ============================================================
   § 01 — Two ways to integrate (DARK)
   ============================================================ */

function SectionModes() {
  return (
    <section
      className="oga-section-dark oga-biz-modes"
      data-oga-surface="dark"
      aria-labelledby="biz-modes-title"
    >
      <div className="oga-biz__wrap">
        <header className="oga-biz-modes__head">
          <div className="oga-biz-modes__eyebrow">
            <span className="oga-biz-modes__eyebrow-mark" aria-hidden />
            <span>How you integrate</span>
            <span className="oga-biz-modes__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="biz-modes-title" className="oga-biz-modes__title">
            Two ways in. Both are real today.
          </h2>
          <p className="oga-biz-modes__sub">
            Most buyers integrate the API directly into their existing product
            or underwriting flow. Some prefer to configure how the API behaves
            from a dashboard. Either way you reach the same deterministic
            engine and the same data layer.
          </p>
        </header>

        <div className="oga-biz-modes__grid">
          <article className="oga-biz-mode">
            <span className="oga-biz-mode__num">Mode 01</span>
            <h3 className="oga-biz-mode__title">API-first integration</h3>
            <p className="oga-biz-mode__body">
              Your product, underwriting engine, or analytics notebook calls
              OneGoodArea directly. We are infrastructure underneath your
              workflow.
            </p>
            <ul className="oga-biz-mode__list">
              <li>Listing page calls GET /v1/area on every postcode load</li>
              <li>Rating engine calls POST /v1/score with custom weights</li>
              <li>Underwriting batch calls POST /v1/query for rank-by-criteria</li>
              <li>Notebook calls POST /v1/insights for anomaly screening</li>
            </ul>
            <p className="oga-biz-mode__foot">Bearer token · oga_ prefix · /v1/</p>
          </article>

          <article className="oga-biz-mode">
            <span className="oga-biz-mode__num">Mode 02</span>
            <h3 className="oga-biz-mode__title">Dashboard control plane</h3>
            <p className="oga-biz-mode__body">
              Configure how the API behaves per organisation. Pin a methodology
              version, save scoring profiles, manage signal bundles, monitor
              portfolios, register webhooks, control IP allowlists.
            </p>
            <ul className="oga-biz-mode__list">
              <li>Org methodology pin (owner-only) · X-Engine-Version honoured</li>
              <li>Saved scoring profiles referenced by preset_id</li>
              <li>Custom signal bundles per org</li>
              <li>Per-key IP allowlist · three-tier RBAC</li>
            </ul>
            <p className="oga-biz-mode__foot">Dashboard · multi-tenant · Levers</p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 02 — Per-ICP sections
   ============================================================ */

function SectionIcp({ icp, altSurface }: { icp: Icp; altSurface: boolean }) {
  const Viz = icp.Viz;
  return (
    <section
      id={icp.anchor}
      className={`oga-biz-icp${altSurface ? " oga-biz-icp--alt" : ""}`}
      aria-labelledby={`biz-icp-${icp.anchor}`}
    >
      <div className="oga-biz-icp__inner">
        <div>
          <header className="oga-biz-icp__head">
            <div className="oga-biz-icp__eyebrow">
              <span className="oga-biz-icp__eyebrow-num">§ {icp.num}</span>
              <span aria-hidden className="oga-biz-icp__eyebrow-line" />
              <span>For {icp.shortName.toLowerCase()}</span>
            </div>
            <h2 id={`biz-icp-${icp.anchor}`} className="oga-biz-icp__name">
              {icp.fullName}
            </h2>
            <p className="oga-biz-icp__tagline">{icp.tagline}</p>
          </header>

          <div className="oga-biz-icp__rows">
            <div className="oga-biz-icp__row">
              <p className="oga-biz-icp__row-label">The problem</p>
              <p className="oga-biz-icp__row-text">{icp.problem}</p>
            </div>
            <div className="oga-biz-icp__row">
              <p className="oga-biz-icp__row-label">Why OneGoodArea</p>
              <p className="oga-biz-icp__row-text">{icp.why}</p>
            </div>
            <div className="oga-biz-icp__row">
              <p className="oga-biz-icp__row-label">Their value</p>
              <p className="oga-biz-icp__row-text">{icp.value}</p>
            </div>
            <div className="oga-biz-icp__row">
              <p className="oga-biz-icp__row-label">Products they reach for</p>
              <div className="oga-biz-icp__products">
                {icp.productsUsed.map((slug) => {
                  const prod = PRODUCTS.find((p) => p.slug === slug)!;
                  return (
                    <Link
                      key={slug}
                      href={`/products/${slug}`}
                      className="oga-biz-icp__product"
                    >
                      {prod.label}
                      <span aria-hidden>→</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="oga-biz-icp__sales">{icp.sales}</p>

          <div className="oga-biz-icp__cta-row">
            {READY_ICPS.has(icp.anchor) ? (
              <Link href={`/for/${icp.anchor}`} className="oga-btn oga-btn-primary">
                See more for {icp.shortName}
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <button
                type="button"
                className="oga-biz-icp__cta-disabled"
                disabled
                aria-disabled
                aria-label={`See more for ${icp.shortName} (coming soon)`}
              >
                See more for {icp.shortName}
                <span className="oga-biz-icp__cta-soon-pill">Soon</span>
              </button>
            )}
            <Link href="/sign-up" className="oga-btn oga-btn-secondary">
              Get an API key
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <aside className="oga-biz-icp__proof" aria-label="Proof element">
          <div className="oga-biz-icp__viz" aria-hidden>
            <Viz />
          </div>
          <div className="oga-biz-icp__proof-card">
            <p className="oga-biz-icp__proof-title">{icp.proof.title}</p>
            <pre className="oga-biz-icp__proof-snippet">{icp.proof.snippet}</pre>
            <p className="oga-biz-icp__proof-foot">{icp.proof.foot}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ICP viz components (bigger than product-page versions — these are
   page-level decorative anchors) */

function VizProptech() {
  return (
    <svg className="oga-biz-icp__viz-svg" viewBox="0 0 200 200" aria-hidden>
      <rect x="20" y="30" width="160" height="140" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="20" y1="64" x2="180" y2="64" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <g fill="currentColor">
        {[88, 108, 128, 148].map((y) =>
          [44, 70, 96, 122, 148].map((x, i) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={i === 4 ? 3.2 : 2} opacity={i === 4 ? 1 : 0.6} />
          ))
        )}
      </g>
      <circle cx="20" cy="30" r="4" fill="currentColor" />
    </svg>
  );
}

function VizInsurer() {
  return (
    <svg className="oga-biz-icp__viz-svg" viewBox="0 0 200 200" aria-hidden>
      <rect x="20" y="20" width="160" height="160" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <g fill="currentColor">
        {[44, 68, 92, 116, 140, 164].map((x) =>
          [44, 68, 92, 116, 140, 164].map((y) => {
            const focal = x === 92 && y === 92;
            return <circle key={`${x}-${y}`} cx={x} cy={y} r={focal ? 5 : 2.4} opacity={focal ? 1 : 0.5} />;
          })
        )}
      </g>
      <circle cx="92" cy="92" r="16" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="92" cy="92" r="24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function VizLender() {
  return (
    <svg className="oga-biz-icp__viz-svg" viewBox="0 0 200 200" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55">
        <rect x="30" y="30" width="100" height="60" rx="3" />
        <rect x="50" y="74" width="100" height="60" rx="3" />
      </g>
      <rect x="70" y="118" width="100" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g fill="currentColor">
        <circle cx="88" cy="148" r="3" />
        <circle cx="108" cy="148" r="3" />
        <circle cx="128" cy="148" r="3" />
        <circle cx="158" cy="148" r="5" />
      </g>
      <line x1="80" y1="132" x2="160" y2="132" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <text x="78" y="44" fontFamily="var(--oga-font-mono)" fontSize="9" fill="currentColor" opacity="0.55">v2.0.0</text>
      <text x="98" y="88" fontFamily="var(--oga-font-mono)" fontSize="9" fill="currentColor" opacity="0.55">v2.0.1</text>
      <text x="118" y="132" fontFamily="var(--oga-font-mono)" fontSize="10" fill="currentColor">v2.0.2</text>
    </svg>
  );
}

function VizCre() {
  return (
    <svg className="oga-biz-icp__viz-svg" viewBox="0 0 200 200" aria-hidden>
      <line x1="22" y1="170" x2="178" y2="170" stroke="currentColor" strokeWidth="1" />
      <line x1="22" y1="170" x2="22" y2="22" stroke="currentColor" strokeWidth="1" />
      <line x1="22" y1="170" x2="178" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="3 3" />
      <g fill="currentColor">
        <circle cx="52" cy="138" r="2.4" opacity="0.45" />
        <circle cx="78" cy="118" r="2.4" opacity="0.55" />
        <circle cx="104" cy="92" r="2.4" opacity="0.65" />
        <circle cx="132" cy="66" r="2.4" opacity="0.75" />
        <circle cx="158" cy="40" r="5" />
      </g>
      <circle cx="158" cy="40" r="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function VizPublic() {
  return (
    <svg className="oga-biz-icp__viz-svg" viewBox="0 0 200 200" aria-hidden>
      <rect x="40" y="22" width="120" height="156" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
      <g stroke="currentColor" strokeWidth="1" opacity="0.4">
        {[42, 58, 74, 90, 106, 122].map((y) => (
          <line key={y} x1="54" y1={y} x2={y === 122 ? 134 : 146} y2={y} />
        ))}
      </g>
      <g fill="currentColor">
        <circle cx="58" cy="148" r="3.6" />
        <circle cx="80" cy="148" r="3.6" />
        <circle cx="102" cy="148" r="3.6" />
        <circle cx="124" cy="148" r="3.6" />
      </g>
      <line x1="54" y1="138" x2="146" y2="138" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <text x="100" y="170" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="9" fill="currentColor" opacity="0.55" letterSpacing="2">METHODOLOGY</text>
    </svg>
  );
}

/* ============================================================
   § 03 — Common pillars (cream)
   ============================================================ */

const PILLARS = [
  {
    num: "01",
    title: "Methodology version stamped",
    body:
      "Every response carries engine_version in the body and X-Engine-Version on the response header. Org-level methodology pinning locks the version per caller, owner-only.",
    cite: "ADR 0008 · 0031",
  },
  {
    num: "02",
    title: "Plan-replayable AI",
    body:
      "Intelligence echoes the executed plan plus plan_source on every response. Any natural-language answer can be replayed as a deterministic programmatic call. AI never sets the numbers; the database does.",
    cite: "ADR 0017 · 0026",
  },
  {
    num: "03",
    title: "Sample-size honest",
    body:
      "Monitor change detection gates price moves on transaction count (default 8). Static signals produce zero change rows. The system says when it cannot tell instead of hallucinating a move.",
    cite: "ADR 0013 · 0014",
  },
  {
    num: "04",
    title: "Provenance on the wire",
    body:
      "Every signal carries source, observed_period, confidence and confidence_reason. fetch_mode is honestly live, store, or hybrid. Lineage stamps (source_snapshot_id, boundary_version) on every persisted row.",
    cite: "ADR 0001 · 0002",
  },
  {
    num: "05",
    title: "Levers · per-org config",
    body:
      "Custom signal bundles, saved scoring profiles, methodology pinning, peer cohorts, three-tier RBAC, white-label, per-key IP allowlist. Opt-in and additive on top of the deterministic engine.",
    cite: "ADR 0027 to 0034",
  },
  {
    num: "06",
    title: "Country-scoped percentiles",
    body:
      "Normalisation runs national-within-country. England's IMD, Wales's WIMD, and Scotland's SIMD are different methodologies and we refuse to manufacture a cross-border percentile.",
    cite: "ADR 0005",
  },
];

function SectionPillars() {
  return (
    <section
      className="oga-section-quiet oga-biz-pillars"
      aria-labelledby="biz-pillars-title"
    >
      <div className="oga-biz__wrap">
        <header className="oga-biz-pillars__head">
          <div className="oga-biz-pillars__eyebrow">
            <span className="oga-biz-pillars__eyebrow-mark" aria-hidden />
            <span>What every integration gets</span>
            <span className="oga-biz-pillars__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="biz-pillars-title" className="oga-biz-pillars__title">
            Six properties of the data and intelligence layer.
          </h2>
          <p className="oga-biz-pillars__sub">
            These hold regardless of which ICP you fit into. They are why
            buyers ship OneGoodArea instead of stitching the data themselves.
          </p>
        </header>

        <div className="oga-biz-pillars__grid">
          {PILLARS.map((p) => (
            <article key={p.num} className="oga-biz-pillar">
              <span className="oga-biz-pillar__num">§ {p.num}</span>
              <h3 className="oga-biz-pillar__title">{p.title}</h3>
              <p className="oga-biz-pillar__body">{p.body}</p>
              <span className="oga-biz-pillar__cite">{p.cite}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 04 — Proof strip (DARK)
   ============================================================ */

function SectionProof() {
  return (
    <section
      className="oga-section-dark oga-biz-proof"
      data-oga-surface="dark"
      aria-labelledby="biz-proof-title"
    >
      <div className="oga-biz__wrap">
        <header className="oga-biz-proof__head">
          <h2 id="biz-proof-title" className="oga-biz-proof__title">
            Measured, version-stamped, deterministic.
          </h2>
          <p className="oga-biz-proof__sub">
            Numbers you can audit. Every one of these is grounded in a public
            ADR or apps/api code.
          </p>
        </header>

        <div className="oga-biz-proof__strip">
          <div className="oga-biz-proof-stat">
            <span className="oga-biz-proof-stat__num">92.9%</span>
            <span className="oga-biz-proof-stat__label">Planner accuracy</span>
            <p className="oga-biz-proof-stat__body">
              On a 14-case curated corpus measured against
              claude-sonnet-4-20250514. Published with the methodology.
            </p>
          </div>
          <div className="oga-biz-proof-stat">
            <span className="oga-biz-proof-stat__num">v{METHODOLOGY_VERSION}</span>
            <span className="oga-biz-proof-stat__label">Engine stamped</span>
            <p className="oga-biz-proof-stat__body">
              On every response body and the X-Engine-Version header. Pinnable
              per org so two runs return the same numbers.
            </p>
          </div>
          <div className="oga-biz-proof-stat">
            <span className="oga-biz-proof-stat__num">4</span>
            <span className="oga-biz-proof-stat__label">Products live</span>
            <p className="oga-biz-proof-stat__body">
              Signals, Scores, Monitor, Intelligence. One API key, one
              contract, one deterministic engine underneath.
            </p>
          </div>
          <div className="oga-biz-proof-stat">
            <span className="oga-biz-proof-stat__num">35</span>
            <span className="oga-biz-proof-stat__label">ADRs published</span>
            <p className="oga-biz-proof-stat__body">
              Every architectural decision in docs/adr/. The methodology is
              public; the code is open; the trail is the audit.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

function FinalCta() {
  return (
    <section
      className="oga-section-dark oga-biz-cta"
      data-oga-surface="dark"
      aria-labelledby="biz-cta-title"
    >
      <div className="oga-biz__wrap--narrow">
        <h2 id="biz-cta-title" className="oga-biz-cta__h2">
          One data and intelligence layer. Five buyer workflows.
        </h2>
        <p className="oga-biz-cta__lead">
          Get an API key and integrate against the surfaces that already
          exist. Pin the methodology version once and your team is on the
          same numbers every quarter.
        </p>
        <div className="oga-biz-cta__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
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
