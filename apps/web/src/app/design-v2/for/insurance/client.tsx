"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "../_shared/icp-page.css";

/* /for/insurance — AR-204 PR — per-ICP page #3.

   Buyer-centric page for insurers + InsureTech platforms (specialist
   carriers, MGAs, InsureTech rating engines).

   Reuses the shared /for/<icp> skeleton + CSS. Heaviest pitch:
   portfolio drift detection w/ signed webhooks (Monitor primary),
   configurable composite scoring the actuary can audit (Scores w/
   per-org preset_id), peer-relative anomaly screening (Intelligence
   find_peers + find_insights w/ Levers peer cohorts). */

export default function ForInsuranceClient() {
  return (
    <div className="oga-root oga-icp">
      <Nav />
      <Hero />
      <SectionProblem />
      <SectionFlow />
      <SectionProducts />
      <SectionDefend />
      <SectionFaqs />
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
    <section className="oga-section-hero oga-icp-hero">
      <div className="oga-icp__wrap--narrow">
        <div className="oga-icp-hero__eyebrow">
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
          <span>For insurance and InsureTech</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">
          Area risk inputs the actuary can audit, plus continuous drift detection.
        </h1>
        <p className="oga-icp-hero__lead">
          Per-dimension scores with per-dimension confidence so the actuary
          sees the components, not a black box. Save your weighting recipe
          once and reference it as a preset_id on every quote. Track the
          insured-location book as a portfolio and detect material moves
          on demand with sample-size gating, signed-webhook delivery, and
          full lineage on every alert.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/products/monitor" className="oga-btn oga-btn-secondary">
            See Monitor
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   01 — The problem
   ============================================================ */

function SectionProblem() {
  return (
    <section className="oga-section-quiet" aria-labelledby="insurance-problem-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>The problem</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="insurance-problem-title" className="oga-icp__h2">
            Black-box area scores die in actuarial review.
          </h2>
        </header>

        <div className="oga-icp-problem__body">
          <p>
            An underwriter&rsquo;s area-risk view is a weighted blend the
            actuary owns: safety, flood, demographics, property volatility.
            The weights change with each pricing cycle. Off-the-shelf
            &ldquo;area scores&rdquo; are black-box composites with weights
            the vendor chose; useless inside an underwriting model because
            the actuary cannot see, let alone tune, the weighting. Sending
            the full weights map on every API call is also operationally
            painful: the weights live in the carrier&rsquo;s codebase, not
            the vendor&rsquo;s.
          </p>
          <p>
            Once the book is written it drifts continuously. Median prices
            move, deprivation shifts neighbourhood by neighbourhood, crime
            patterns rebalance. Pricing teams need to know when a tracked
            LSOA has actually changed, not at renewal but ongoing, and the
            alert has to be auditable. The wrong way to know is a 47-percent
            swing on two sales lighting up the inbox.
          </p>
          <p>
            On top of that, &ldquo;risky&rdquo; in absolute terms is rarely
            the right question. The right question is &ldquo;risky relative
            to its peer group&rdquo;: areas with similar demographic and
            built-environment signatures. That needs a stable peer
            definition and a relative score that follows the same
            methodology every quarter.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   02 — How it fits (DARK)
   ============================================================ */

type FlowStep = {
  num: string;
  title: string;
  text: string;
  code: string;
};

const FLOW: FlowStep[] = [
  {
    num: "Step 01",
    title: "Save the actuarial weighting once",
    text: "Persist your weighting recipe as a per-org scoring profile (preset_id). Versioned with created_at and updated_at; references the base profile and the dimension weights. Owner or admin only.",
    code: `POST /v1/orgs/:id/presets
{ "name": "Auto rating v3",
  "base_preset": "research",
  "weights": { "safety_crime": 35,
                "environment_quality": 25,
                "demographics_economy": 20,
                "transport_links": 10,
                "amenities_services": 10 } }
-> { "id": "spr_...", "created_at": "..." }`,
  },
  {
    num: "Step 02",
    title: "Score at quote time",
    text: "POST /v1/score with preset_id replaces the weights map on every call. The deterministic engine returns the per-dimension breakdown, weights, and per-dimension confidence so the actuary sees the components. NOT metered against the monthly API call quota.",
    code: `POST /v1/score
{ "area": "M1 1AE", "preset_id": "spr_..." }
-> { "score": 62,
     "dimensions": [
       { "key": "safety_crime", "score": 70,
         "weight": 35, "confidence": 0.9 } ],
     "weights_source": "custom",
     "engine_version": "${METHODOLOGY_VERSION}" }`,
  },
  {
    num: "Step 03",
    title: "Save the insured book as a portfolio",
    text: "Group the insured locations under one or more portfolios (postcodes or LSOAs). Bulk-enrich on intake. Static signals (deprivation, area type) produce zero change rows by design; only signals that actually move bite.",
    code: `POST /v1/portfolios
{ "name": "Motor book Q2 2026" }
POST /v1/portfolios/:id/areas
{ "areas": [
   { "area": "M1 1AE", "label": "Pol #142" },
   { "area": "B1 1AA", "label": "Pol #143" } ] }`,
  },
  {
    num: "Step 04",
    title: "Detect drift continuously",
    text: "Run change detection on a cadence. baseline=previous catches month-over-month moves; baseline=first surfaces cumulative drift since onboarding. Sample-size gating (default 8 transactions) keeps a 2-sale swing from earning an alert. Material moves fire signal.changed webhooks signed Stripe-style HMAC-SHA256.",
    code: `POST /v1/portfolios/:id/changes
{ "baseline": "previous",
  "threshold_pct": 5,
  "min_transactions": 8 }
# Webhook envelope:
X-OneGoodArea-Event:     signal.changed
X-OneGoodArea-Signature: t=...,v1=<sha256>`,
  },
  {
    num: "Step 05",
    title: "Peer-relative anomaly screening",
    text: "POST /v1/insights ranks LSOAs by absolute peer-relative z-score on a pre-materialised similarity graph. \"Unusually high crime vs its peer group\" rather than absolute terms. With Levers peer cohorts, pin a custom peer set (your insured universe) when the global graph is not tight enough.",
    code: `POST /v1/insights
{ "signal_key": "crime.total_12m_peer_relative_z",
  "country":   "England",
  "min_abs_z": 2,
  "k":         50 }
-> [ { "geo_code": "E01...",
       "peer_relative_z": 4.12, "abs_z": 4.12 } ]`,
  },
];

function SectionFlow() {
  return (
    <section
      className="oga-section-dark oga-icp-flow"
      data-oga-surface="dark"
      aria-labelledby="insurance-flow-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-flow__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>How it fits</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="insurance-flow-title" className="oga-icp__h2">
            Five integration points across rating + portfolio monitoring.
          </h2>
          <p className="oga-icp__lead">
            What an InsureTech or carrier integration actually looks like.
            Save the actuarial recipe once, score at quote time, watch the
            book continuously, comp against the peer group.
          </p>
        </header>

        <div className="oga-icp-flow__steps">
          {FLOW.map((s) => (
            <article key={s.num} className="oga-icp-flow__step">
              <span className="oga-icp-flow__step-num">{s.num}</span>
              <div className="oga-icp-flow__step-body">
                <h3 className="oga-icp-flow__step-title">{s.title}</h3>
                <p className="oga-icp-flow__step-text">{s.text}</p>
              </div>
              <pre className="oga-icp-flow__step-code">{s.code}</pre>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   03 — Products you reach for (cream)
   ============================================================ */

type ProductUse = {
  num: string;
  name: string;
  slug: string;
  use: string;
  code: string;
};

const PRODUCTS: ProductUse[] = [
  {
    num: "01",
    name: "Monitor",
    slug: "monitor",
    use: "Primary surface for InsureTech. Save the book as a portfolio, bulk-enrich on intake, detect material moves on demand. ChangeReport returns the exact period_from, period_to, value_from, value_to and pct_change per material row. Webhooks deliver signed Stripe-style HMAC-SHA256 envelopes to your registered HTTPS endpoint.",
    code: `POST /v1/portfolios/:id/changes
-> { "material_count": 4,
     "changes": [ {
       "signal_key": "property.median_price",
       "area": "M1 1AE",
       "period_from": "2026-03",
       "period_to":   "2026-04",
       "pct_change":  7.6,
       "direction":   "up" } ] }`,
  },
  {
    num: "02",
    name: "Scores",
    slug: "scores",
    use: "Configurable composite scoring with per-org saved profiles. preset_id replaces the weights map on every call. Every response returns per-dimension components, weights, and per-dimension confidence so the actuary can audit the breakdown. Variance-aware confidence on property dimensions caps wide YoY swings at MEDIUM.",
    code: `POST /v1/score
{ "area": "M1 1AE", "preset_id": "spr_..." }
-> { "score": 62,
     "dimensions": [...],
     "confidence": 0.82,
     "weights_source": "custom",
     "engine_version": "${METHODOLOGY_VERSION}" }`,
  },
  {
    num: "03",
    name: "Intelligence",
    slug: "intelligence",
    use: "Peer-relative anomaly screening. find_peers gives a stable, symmetric peer set (Euclidean dimension-mean-squared over normalised signals); find_insights ranks LSOAs by absolute peer-relative z-score. Pre-materialised peer graph (~840k assignments across 42k LSOAs). cohort_id lets you pin a custom peer universe.",
    code: `POST /v1/peers
{ "target": { "postcode": "M1 1AE" },
  "country": "England", "k": 20 }
-> { "peers": [
     { "geo_code": "E01...", "distance": 0.045,
       "n_dims_used": 7 } ] }`,
  },
];

function SectionProducts() {
  return (
    <section className="oga-section-hero" aria-labelledby="insurance-products-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-products__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Products you reach for</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="insurance-products-title" className="oga-icp__h2">
            Monitor leads. Scores backs underwriting. Intelligence handles the peer lens.
          </h2>
          <p className="oga-icp__lead">
            Signals is the data layer underneath all three. InsureTech rarely
            reads the raw catalog directly; the action is in the composite
            and the time-series.
          </p>
        </header>

        <div className="oga-icp-products__grid">
          {PRODUCTS.map((p) => (
            <article key={p.slug} className="oga-icp-product">
              <div>
                <header className="oga-icp-product__head">
                  <span className="oga-icp-product__num">{p.num}</span>
                  <h3 className="oga-icp-product__name">{p.name}</h3>
                  <Link
                    href={`/products/${p.slug}`}
                    className="oga-icp-product__name-link"
                  >
                    See product →
                  </Link>
                </header>
                <p className="oga-icp-product__use">{p.use}</p>
              </div>
              <pre className="oga-icp-product__code">{p.code}</pre>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   04 — What you can defend (cream-quiet)
   ============================================================ */

type DefendCard = {
  num: string;
  title: string;
  body: string;
};

const DEFEND: DefendCard[] = [
  {
    num: "01",
    title: "Configurable weights, transparent components",
    body: "Every Scores response returns the 5 per-dimension scores, the weight applied to each, and per-dimension confidence. The actuary sees the components, not a black box. Custom weights or a saved preset_id; either way the breakdown is in the response.",
  },
  {
    num: "02",
    title: "Variance-aware confidence",
    body: "Confidence on property-backed dimensions caps wide YoY swings at MEDIUM rather than letting them present as HIGH. Honesty as a feature: the actuary gets a signal when volatility makes a value less trustworthy.",
  },
  {
    num: "03",
    title: "Sample-size gated change detection",
    body: "Monitor's diff core gates price moves on transaction count (default 8 in both periods). Static signals produce zero change rows by design. The system says when it cannot tell instead of hallucinating a move. The diff core is unit-tested without DB or network.",
  },
  {
    num: "04",
    title: "Signed webhook delivery",
    body: "Material changes fire signal.changed webhooks signed Stripe-style HMAC-SHA256. The signing secret is returned ONCE on subscription create. Webhook URLs must be public HTTPS; localhost and RFC 1918 ranges rejected at validation. 5-second delivery timeout.",
  },
  {
    num: "05",
    title: "Peer-relative anomaly, not absolute",
    body: "Intelligence find_peers gives a stable, symmetric similarity metric (Euclidean dimension-mean-squared over normalised signals, bounded in [0,1]). find_insights ranks LSOAs by abs(peer_relative_z) so the underwriter flags catchments that are 3 sigma from their peer group, not 3 sigma absolute.",
  },
  {
    num: "06",
    title: "Methodology version pinning",
    body: "Per-org engine_version pin honoured on every product response via X-Engine-Version header. Owner-only. Two API calls under the same pin return the same numbers across deploys. Audit-grade reproducibility for quarterly back-tests.",
  },
];

function SectionDefend() {
  return (
    <section className="oga-section-quiet" aria-labelledby="insurance-defend-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-defend__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What you can defend</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="insurance-defend-title" className="oga-icp__h2">
            Six properties an actuarial team will sign off.
          </h2>
          <p className="oga-icp__lead">
            The compliance + actuarial-audit pitch. Each property is
            documented on /methodology and stamped on every response.
          </p>
        </header>

        <div className="oga-icp-defend__grid">
          {DEFEND.map((d) => (
            <article key={d.num} className="oga-icp-defend-card">
              <span className="oga-icp-defend-card__num">{d.num}</span>
              <h3 className="oga-icp-defend-card__title">{d.title}</h3>
              <p className="oga-icp-defend-card__body">{d.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   05 — FAQs (DARK)
   ============================================================ */

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: "Can the actuary tune the weights without redeploying our codebase?",
    a: "Yes. Save the weighting recipe as a per-org scoring profile via POST /v1/orgs/:id/presets and reference it as preset_id on every /v1/score call. The actuary updates the profile via the dashboard or a PATCH; new quotes pick it up immediately. The profile is versioned with created_at and updated_at so model risk can track what changed when.",
  },
  {
    q: "What is the latency profile for inline rating engines?",
    a: "Per-key rate limit is 30 requests per minute on /v1/score and /v1/area. Bearer-token auth over HTTPS, plain JSON. Typical pattern for rating engines is to cache the AreaProfile or score per postcode for a refresh window (monthly is the natural cadence; signals do not move faster than that). Async batch (portfolio_runs) is on the roadmap if your back-test runs need higher throughput.",
  },
  {
    q: "How are webhook deliveries signed?",
    a: "Stripe-style HMAC-SHA256 over the raw body, sent as X-OneGoodArea-Signature: t=<unix>,v1=<hex>. Header X-OneGoodArea-Event carries the event type (today change detection only fires signal.changed). The signing secret is returned ONCE on subscription create and never recoverable; you store it on receive side and verify before processing.",
  },
  {
    q: "Can we use a custom peer set instead of the global similarity graph?",
    a: "Yes, via Levers peer cohorts. POST /v1/orgs/:id/cohorts persists a named list of LSOA codes (your insured universe, or a regional underwriting band, etc.). Pass cohort_id on /v1/peers and the candidate set is constrained to the cohort. The target itself does not need to be in the cohort, which is intentional: 'areas like THIS one, but only from my universe'.",
  },
  {
    q: "What happens during the renewal cycle when the engine version changes?",
    a: "Pin the engine version per org via PUT /v1/orgs/:id/methodology (owner-only). Two quarterly back-tests at the same pin return the same numbers. When a new engine version ships, run a parallel back-test on a staging org pinned to the new version, validate against your loss-ratio model, then flip the prod pin via a single owner-only PUT. Supported pin window today is 2.0.0, 2.0.1, 2.0.2.",
  },
  {
    q: "Do you support MGA or carrier-of-carriers setups with separate books?",
    a: "Yes. Each org is multi-tenant capable: separate signal bundles, separate scoring profiles, separate methodology pins, separate peer cohorts, separate webhooks. The Levers stack is designed for the MGA / Lloyd's syndicate pattern where one entity holds multiple distinct books with different actuarial methodologies.",
  },
  {
    q: "What gets stored about our insured locations?",
    a: "Two tables: portfolios (id, name, owner) and portfolio_areas (postcode or LSOA, plus an optional label you supply). No PII, no policy data, no premium amounts. The label is opaque to us; carriers typically use it to map back to their internal policy id without exposing it.",
  },
];

function SectionFaqs() {
  return (
    <section
      className="oga-section-dark oga-icp-faqs"
      data-oga-surface="dark"
      aria-labelledby="insurance-faqs-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="insurance-faqs-title" className="oga-icp__h2">
            Questions your actuarial + pricing teams ask first.
          </h2>
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

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

function FinalCta() {
  return (
    <section
      className="oga-section-dark oga-icp-cta"
      data-oga-surface="dark"
      aria-labelledby="insurance-cta-title"
    >
      <div className="oga-icp__wrap--narrow">
        <h2 id="insurance-cta-title" className="oga-icp-cta__h2">
          Configurable. Auditable. Continuously monitored. Sample-size honest.
        </h2>
        <p className="oga-icp-cta__lead">
          Score with weights the actuary owns, save the recipe as preset_id,
          watch the insured book drift continuously, get signed webhooks the
          day a tracked LSOA moves materially.
        </p>
        <div className="oga-icp-cta__ctas">
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
