"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "../_shared/icp-page.css";

/* /for/lenders — AR-204 PR — per-ICP page #2.

   Buyer-centric page for lenders (residential + commercial,
   challenger banks, building societies, BTL lenders). Heaviest
   pitch is engine_version pinning (ADR 0031), plan-replayable
   audit (ADR 0017), and sample-size honesty (ADR 0014).

   Reuses the shared /for/<icp> skeleton + CSS from /for/proptech;
   per-ICP content diverges. SEO via the production
   /for/lenders/page.tsx metadata + FAQPage JSON-LD. */

export default function ForLendersClient() {
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
          <span>For lenders</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">
          Versioned, pinnable area scoring your model risk team can defend.
        </h1>
        <p className="oga-icp-hero__lead">
          Every response stamps the engine version that produced it. Pin a
          version per organisation and every API call across your book
          returns the same numbers, deploy after deploy. The AI seam is
          plan-replayable: any natural-language query can be re-run as a
          deterministic programmatic call. Built for regulated underwriting.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/products/scores" className="oga-btn oga-btn-secondary">
            See Scores
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
    <section className="oga-section-quiet" aria-labelledby="lenders-problem-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>The problem</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="lenders-problem-title" className="oga-icp__h2">
            Every API the underwriting model touches is a model input.
          </h2>
        </header>

        <div className="oga-icp-problem__body">
          <p>
            A mortgage lender&rsquo;s model risk register treats every
            external API the underwriting model depends on as a model input.
            If the supplier silently changes a coefficient, that is an
            undisclosed model change, which is a regulated event. Auditors
            ask: what version of the area score produced this decision in
            March 2026, and is it byte-equivalent to the score you would
            compute today?
          </p>
          <p>
            Most vendors version their codebase, not the methodology, so the
            honest answer is we do not know. The methodology page reads as
            marketing rather than as an audit document. The numbers move
            between releases without notice. Procurement is hard, model
            governance is harder, and the data team eventually gives up and
            rebuilds the layer in-house.
          </p>
          <p>
            On top of that, the book itself drifts continuously. Prices
            move, deprivation shifts, crime rebalances. Risk teams need to
            prove they knew on date X that a tracked LSOA had moved. That
            is a different question from underwriting at origination, and
            it needs the same audit posture.
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
    title: "Pin the engine version at the org level",
    text: "Owner-only PUT call sets the methodology version your book consumes. Validated at write time against the supported version window. Every subsequent API call from any key in the org returns responses stamped with that version on both the body and the X-Engine-Version header.",
    code: `PUT /v1/orgs/:id/methodology
{ "engine_version": "2.0.1" }

# Every response thereafter:
X-Engine-Version: 2.0.1`,
  },
  {
    num: "Step 02",
    title: "Score at decision time",
    text: "POST /v1/score returns the per-dimension components, the weight applied to each, per-dimension confidence, and the aggregate confidence. Custom weights override the chosen profile if your actuarial model has its own weighting. Deterministic engine, golden-tested. No AI in the scoring path.",
    code: `POST /v1/score
{
  "area": "M1 1AE",
  "preset": "research",
  "weights": { "safety_crime": 25, "transport_links": 25,
                "amenities_services": 20,
                "demographics_economy": 15,
                "environment_quality": 15 }
}`,
  },
  {
    num: "Step 03",
    title: "Save the recipe once",
    text: "If your underwriting model has its own weighting, persist it as a per-org scoring profile and reference it as preset_id on every subsequent call. Versioned with created_at and updated_at; replayable; auditable.",
    code: `POST /v1/orgs/:id/presets
{ "name": "Underwriting v1.2",
  "base_preset": "research",
  "weights": { "safety_crime": 25, ... } }
-> { "id": "spr_...", "created_at": "..." }`,
  },
  {
    num: "Step 04",
    title: "Monitor the book continuously",
    text: "Save the lent-against postcodes as a portfolio. Bulk-enrich on intake. Run change detection on a cadence. baseline=first surfaces cumulative drift since onboarding; baseline=previous surfaces month-over-month. Material moves fire signed webhooks. Sample-size gated so a 47-percent swing on two sales never earns an alert.",
    code: `POST /v1/portfolios/:id/changes
{ "baseline": "first",
  "threshold_pct": 5,
  "min_transactions": 8 }`,
  },
  {
    num: "Step 05",
    title: "Audit-replayable AI queries (optional)",
    text: "When analysts want to ask natural-language questions across the book, POST /v1/query returns the executed plan plus plan_source on every response. Model risk can replay any NL answer as a deterministic programmatic call. The LLM only ever emits a typed plan that gets validated and executed against deterministic SQL.",
    code: `POST /v1/query
{ "question": "LSOAs in our book where prices fell more than 5% YoY" }
-> { "plan": { "op": "rank_areas", ... },
     "plan_source": "nl",
     "results": [ ... ] }`,
  },
];

function SectionFlow() {
  return (
    <section
      className="oga-section-dark oga-icp-flow"
      data-oga-surface="dark"
      aria-labelledby="lenders-flow-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-flow__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>How it fits</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="lenders-flow-title" className="oga-icp__h2">
            Five integration points, one audit posture.
          </h2>
          <p className="oga-icp__lead">
            What an underwriting + model-risk integration actually looks like.
            Pin once at the top, then every API surface honours the pin.
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
    name: "Scores",
    slug: "scores",
    use: "Primary surface for underwriting. POST /v1/score returns a 0-to-100 composite with per-dimension components, per-dimension confidence, and engine_version. The engine is frozen v2, golden-tested; AI never touches it. NOT metered against the monthly API call quota, so bulk-scoring a portfolio overnight does not consume report budget.",
    code: `POST /v1/score
{ "area": "M1 1AE", "preset": "research" }
-> { "score": 62,
     "dimensions": [ ... ],
     "confidence": 0.8,
     "weights_source": "preset",
     "engine_version": "${METHODOLOGY_VERSION}" }`,
  },
  {
    num: "02",
    name: "Monitor",
    slug: "monitor",
    use: "Continuous portfolio drift detection. Save lent-against postcodes as a portfolio, bulk-enrich on intake, run change detection ad hoc or on a schedule. Each material move arrives with the exact period_from, period_to, value_from, value_to and pct_change. Stripe-style HMAC-SHA256 signed webhooks fit straight into automated downstream workflows.",
    code: `POST /v1/portfolios/:id/changes
-> { "material_count": 7,
     "changes": [ {
       "signal_key": "property.median_price",
       "area": "M1 1AE",
       "period_from": "2025-04", "period_to": "2026-04",
       "value_from": 175000, "value_to": 196300,
       "pct_change": 12.2 } ] }`,
  },
  {
    num: "03",
    name: "Intelligence",
    slug: "intelligence",
    use: "Audit-replayable AI for analysts. POST /v1/query accepts free-text questions OR programmatic plans. Either way the response echoes the executed plan plus plan_source so model risk can replay any NL answer as a deterministic call. 92.9% planner accuracy on a 14-case curated corpus (measured against claude-sonnet-4-20250514).",
    code: `POST /v1/query
{ "question": "..." }
-> { "plan_source": "nl",
     "plan": { "op": "rank_areas", ... },
     "results": [ ... ] }
# Replay deterministically:
{ "plan": { /* echoed plan above */ } }
-> plan_source: "client"`,
  },
];

function SectionProducts() {
  return (
    <section className="oga-section-hero" aria-labelledby="lenders-products-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-products__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Products you reach for</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="lenders-products-title" className="oga-icp__h2">
            Scores, Monitor, Intelligence. Same API key, same engine pin.
          </h2>
          <p className="oga-icp__lead">
            Signals is the data layer underneath all three, but lenders rarely
            consume the raw catalog directly. Scores is the primary; Monitor
            handles drift; Intelligence makes the AI-assisted queries
            replayable.
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
    title: "Methodology version pinning, owner-only",
    body: "PUT /v1/orgs/:id/methodology persists the engine_version your book consumes. Owner-only; admins cannot change it. Validated at write time against the supported version window. Two API calls under the same pin return the same numbers across deploys.",
  },
  {
    num: "02",
    title: "Engine version on body AND header",
    body: "Every product response carries engine_version in the body (what actually ran) and X-Engine-Version on the response header (the auditor's anchor). The split is deliberate: body = ground truth, header = pin. Will become semantically distinct when v3 freezes a separate engine module.",
  },
  {
    num: "03",
    title: "Plan-replayable AI",
    body: "Intelligence echoes the executed plan plus plan_source on every response. Model risk can replay any natural-language answer as a deterministic programmatic call by pasting the plan back. The LLM only ever emits a typed plan; the database produces the rows.",
  },
  {
    num: "04",
    title: "Sample-size honest",
    body: "Monitor change detection gates price moves on transaction count (default 8 in both periods). Static signals like deprivation produce zero change rows by design. The system says when it cannot tell instead of hallucinating a move. The diff core is unit-tested without DB or network.",
  },
  {
    num: "05",
    title: "92.9% planner accuracy on a 14-case curated corpus",
    body: "Measured against claude-sonnet-4-20250514. By-op breakdown is in-repo (rank_areas 3/4, all other ops 2/2). The Wilson 95% confidence interval is wide (roughly 70 to 99 percent) because the corpus is small by design and version-controlled. The harness measures the seam, not the model; the headline number is provider-specific and re-runs on any model swap.",
  },
  {
    num: "06",
    title: "Country-scoped percentiles",
    body: "Normalisation runs national-within-country. England's IMD, Wales's WIMD, and Scotland's SIMD are different methodologies. We refuse to manufacture a cross-border percentile that would be a methodological lie if challenged in a compliance review.",
  },
];

function SectionDefend() {
  return (
    <section className="oga-section-quiet" aria-labelledby="lenders-defend-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-defend__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What you can defend</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="lenders-defend-title" className="oga-icp__h2">
            Six properties that close the model-governance gap.
          </h2>
          <p className="oga-icp__lead">
            The compliance pitch. Each property is grounded in an architectural
            decision record you can read in the public repo.
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
    q: "Is the engine version pinnable at the org level?",
    a: "Yes. PUT /v1/orgs/:id/methodology persists a per-org engine_version pin. Owner-only. Validated against the supported version window at write time. Every product surface (Score, Area, Areas, Query, Peers, plus the portfolio enrich and changes endpoints) honours the pin by stamping it on the X-Engine-Version response header. Body engine_version still reports what actually ran. The split is deliberate so v2 and v3 can run mixed from a single deployment when v3 ships.",
  },
  {
    q: "How is the methodology versioned?",
    a: "Semver convention. MAJOR is a breaking change to dimension structure or core weighting (would invalidate prior scores). MINOR is additive. PATCH is formula tuning or confidence-rubric refinement. Today the supported pin window is 2.0.0, 2.0.1, 2.0.2; all three are score-equivalent (patches changed only the confidence rubric and source-reliability handling, not the scoring math). The registry is public on /methodology and stamped on every response.",
  },
  {
    q: "Can we replay an AI-assisted query for audit?",
    a: "Yes, and it is the core audit-safety contract on Intelligence. POST /v1/query returns the executed plan in the response body alongside plan_source ('nl' if the planner translated a natural-language question, 'client' if the caller sent the plan directly). Paste the plan back as a {plan} body and the LLM is never touched again; the same deterministic executor produces the same rows. Model risk can store the plan JSON alongside the decision record.",
  },
  {
    q: "What is the latency profile for bulk scoring?",
    a: "Per-key rate limit is 30 requests per minute on /v1/score, not metered against the monthly API call quota. For overnight portfolio runs the typical pattern is concurrent scoring within the rate budget; Monitor's portfolio enrich endpoint runs synchronously with bounded concurrency 5 and a cap of 50 areas per call. A larger book is scored across multiple calls. Async batch (portfolio_runs) is on the roadmap.",
  },
  {
    q: "How do you handle FCA / PRA SS1/23 model risk requirements?",
    a: "We do not certify your model; that is your model risk team's job. What we provide is the inputs to do it well: versioned methodology with a public registry, engine_version on every response, a plan-replayable AI seam, sample-size gating built into change detection, country-scoped percentiles, source attribution on every signal. The full methodology is public at /methodology — your team can include it in the model documentation pack.",
  },
  {
    q: "Can the engine version be locked across multiple environments?",
    a: "Yes. The org-level pin is set once and honoured on every key inside the org. If you operate prod and staging on different orgs, you can pin staging to a newer version (say 2.0.2) while prod stays on 2.0.1, run your back-test on staging, then flip prod via a single owner-only PUT. Two API calls at the same pin always return the same numbers across deploys.",
  },
  {
    q: "What gets stored about our portfolios?",
    a: "Two tables: portfolios (id, name, owner) and portfolio_areas (postcode or LSOA + optional label). No PII, no borrower data, no loan amounts; just the areas. Change reports return material rows; webhooks deliver them signed (HMAC-SHA256, Stripe-style) to your registered HTTPS endpoint. Webhook URLs must be public HTTPS; localhost and RFC 1918 ranges are rejected.",
  },
];

function SectionFaqs() {
  return (
    <section
      className="oga-section-dark oga-icp-faqs"
      data-oga-surface="dark"
      aria-labelledby="lenders-faqs-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="lenders-faqs-title" className="oga-icp__h2">
            Questions your model risk team will ask us first.
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
      aria-labelledby="lenders-cta-title"
    >
      <div className="oga-icp__wrap--narrow">
        <h2 id="lenders-cta-title" className="oga-icp-cta__h2">
          Close the model-governance gap your auditors keep flagging.
        </h2>
        <p className="oga-icp-cta__lead">
          Pin the engine version once. Bulk-score the book. Track drift
          continuously. Replay any AI-assisted query as a deterministic
          plan. The audit trail is the API response itself.
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
