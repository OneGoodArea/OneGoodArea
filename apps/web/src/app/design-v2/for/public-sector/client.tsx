"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "../_shared/icp-page.css";

/* /for/public-sector — AR-204 PR — per-ICP page #5 (final).

   Buyer-centric page for public sector + research (councils, central
   government analytical units, regeneration bodies, research
   institutes).

   Reuses the shared /for/<icp> skeleton + CSS. Heaviest pitch:
   provenance on every signal, country-scoped percentiles (no
   cross-border lies), plan-replayable analyst queries for audit,
   methodology pinning for the procurement cycle. */

export default function ForPublicSectorClient() {
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
          <span>For public sector and research</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">
          Sourced, dated, methodology-stamped UK area metrics that survive FOI.
        </h1>
        <p className="oga-icp-hero__lead">
          Provenance on every signal: source, observed period, confidence
          reason. Country-scoped percentiles by design. The methodology
          changelog is public and the engine version is stamped on every
          response. Built for council planning, central-gov analytical
          units, regeneration bodies, and research institutes.
        </p>
        <div className="oga-icp-hero__ctas">
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

/* ============================================================
   § 01 — The problem
   ============================================================ */

function SectionProblem() {
  return (
    <section className="oga-section-quiet" aria-labelledby="ps-problem-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>The problem</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="ps-problem-title" className="oga-icp__h2">
            Every number you publish has to defend itself.
          </h2>
        </header>

        <div className="oga-icp-problem__body">
          <p>
            Public-sector teams cannot publish numbers they cannot defend.
            A council briefing, a regeneration committee paper, a research
            note, an FOI response: every figure has to point at a source, a
            release date, a methodology, and a confidence that holds up
            under questioning. A black-box AI score is unusable here.
          </p>
          <p>
            Most vendors lump England, Wales, and Scotland together into a
            single &ldquo;UK area score&rdquo; and call it normalised. That
            is a methodological lie. England&rsquo;s IMD, Wales&rsquo;s
            WIMD, and Scotland&rsquo;s SIMD are different methodologies on
            different release schedules. Comparing them directly inflates
            or deflates rank in ways that would not survive procurement
            review.
          </p>
          <p>
            Analysts also need reproducibility. The methodology cannot
            silently change between the procurement notice that named the
            vendor and the deliverable six months later. Same area today
            and on the contract end-date should produce the same metric, or
            the difference has to be a documented version bump rather than
            an undisclosed change.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 02 — How it fits (DARK)
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
    title: "Resolve any area with sourced signals",
    text: "GET /v1/area returns the seven-category catalog at LSOA grain. Each signal carries an explicit source, observed period, confidence value, and a plain-language confidence_reason. Country-scoped percentiles where the store backs them (deprivation, property, crime).",
    code: `GET /v1/area?postcode=M1 1AE
-> { "signals": [
       { "key": "deprivation.imd_decile",
         "value": 1, "percentile": 5.4,
         "source": "IMD 2025 (England)",
         "observed_period": "IMD 2025",
         "confidence": 0.95,
         "confidence_reason":
           "IMD 2025 release; complete LSOA coverage." } ],
     "meta": { "engine_version": "${METHODOLOGY_VERSION}" } }`,
  },
  {
    num: "Step 02",
    title: "Triage areas with the research profile",
    text: "POST /v1/score with the research baseline profile is the general-purpose composite for triage. Balanced default weights across safety, transport, amenities, demographics, environment. Deterministic, no AI in the path, methodology version stamped on body and header.",
    code: `POST /v1/score
{ "area": "M1 1AE", "preset": "research" }
-> { "score": 62, "area_type": "urban",
     "dimensions": [ ... 5 default-weighted ... ],
     "engine_version": "${METHODOLOGY_VERSION}" }`,
  },
  {
    num: "Step 03",
    title: "Lock the methodology for the contract cycle",
    text: "PUT /v1/orgs/:id/methodology pins the engine version your org consumes. Owner-only, validated at write time. Same call from any key inside the org returns responses stamped with that version. Procurement teams pin to the version named in the contract; analysts get reproducible numbers across the deliverable timeline.",
    code: `PUT /v1/orgs/:id/methodology
{ "engine_version": "2.0.1" }

# Every subsequent product response:
X-Engine-Version: 2.0.1`,
  },
  {
    num: "Step 04",
    title: "Track priority areas as a portfolio",
    text: "Save your priority LSOAs (regen targets, levelling-up wards, intervention catchments) as a portfolio. Run change detection on a cadence. Static signals like deprivation produce zero change rows by design; only signals that actually move bite. Sample-size gating means a price swing on two sales never lights up a council briefing.",
    code: `POST /v1/portfolios/:id/changes
{ "baseline": "first",
  "threshold_pct": 5,
  "min_transactions": 8 }
-> { "material_count": 4,
     "changes": [ {
       "signal_key": "property.median_price",
       "area": "E01005207",
       "period_from": "2025-04",
       "period_to":   "2026-04",
       "pct_change":  12.2 } ] }`,
  },
  {
    num: "Step 05",
    title: "Audit-replayable analyst queries",
    text: "When analysts use natural language via /v1/query, the response echoes the executed plan plus plan_source. Any analyst answer can be replayed as a deterministic programmatic call. The AI is the interface; the database is the answer. The trail is the API response itself.",
    code: `POST /v1/query
{ "question":
   "wards in our priority set where IMD decile is 1 or 2" }
-> { "plan_source": "nl",
     "plan":   { "op": "rank_areas", ... },
     "results": [ ... ] }
# Replay deterministically by pasting the plan back:
{ "plan": { /* echoed above */ } }`,
  },
];

function SectionFlow() {
  return (
    <section
      className="oga-section-dark oga-icp-flow"
      data-oga-surface="dark"
      aria-labelledby="ps-flow-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-flow__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>How it fits</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="ps-flow-title" className="oga-icp__h2">
            Five integration points from sourcing to publication.
          </h2>
          <p className="oga-icp__lead">
            What an analytical-unit or research integration looks like.
            Sourced signals, balanced triage, locked methodology, tracked
            priority set, audit-replayable AI.
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
   § 03 — Products you reach for (cream)
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
    name: "Signals",
    slug: "signals",
    use: "Primary surface for public-sector workflows. Every signal carries an explicit source, observed_period, confidence value, and plain-language confidence_reason. Country-scoped percentiles where the store backs them. Provenance is on the wire on every response, ready for an FOI footnote.",
    code: `GET /v1/area?postcode=M1 1AE
-> { "geo":   { "lsoa": "E01005207", "country": "England" },
     "signals": [
       { "key": "crime.total_12m",
         "value": 3712, "percentile": 92.1,
         "source": "police.uk",
         "observed_period": "Apr 2025 to Mar 2026",
         "confidence": 0.9,
         "confidence_reason": "12 months of data." } ],
     "meta": { "engine_version": "${METHODOLOGY_VERSION}",
                "fetch_mode": "hybrid" } }`,
  },
  {
    num: "02",
    name: "Scores",
    slug: "scores",
    use: "Research baseline profile is the general-purpose composite. Balanced default weights across safety, transport, amenities, demographics, environment. Deterministic engine, golden-tested, no AI in the path. Pin the engine version for the contract cycle and the numbers stop drifting under your deliverable timeline.",
    code: `POST /v1/score
{ "area": "M1 1AE", "preset": "research" }
-> { "score": 62, "area_type": "urban",
     "dimensions": [
       { "key": "safety_crime", "score": 70, "weight": 20 },
       { "key": "transport_links", ... },
       { "key": "amenities_services", ... },
       { "key": "demographics_economy", ... },
       { "key": "environment_quality", ... } ],
     "engine_version": "${METHODOLOGY_VERSION}" }`,
  },
  {
    num: "03",
    name: "Monitor",
    slug: "monitor",
    use: "Track priority LSOAs (regen targets, levelling-up wards, intervention catchments) as a portfolio. Change detection is on-demand; static signals produce no rows by design; sample-size gating keeps a noisy 2-sale swing from earning an alert. The ChangeReport carries baseline + threshold + min_transactions so a published \"areas that moved\" note has the methodology stamped inside the artifact.",
    code: `POST /v1/portfolios/:id/changes
{ "baseline": "first",
  "threshold_pct": 5,
  "min_transactions": 8 }
-> { "areas_checked": 64,
     "material_count": 7,
     "changes": [ ... lineage-stamped rows ... ] }`,
  },
  {
    num: "04",
    name: "Intelligence",
    slug: "intelligence",
    use: "Audit-replayable analyst queries. /v1/query accepts free-text questions; the response echoes the executed plan plus plan_source. Any natural-language answer can be re-run as a deterministic programmatic call by pasting the plan back. The AI is the interface; the database is the answer. 92.9% planner accuracy measured on a 14-case curated corpus (the corpus is in the repo and version-controlled).",
    code: `POST /v1/query
{ "question": "..." }
-> { "plan_source": "nl",
     "plan":   { "op": "rank_areas", ... },
     "results": [ ... ] }
# Replay deterministically:
{ "plan": { /* echoed plan above */ } }
-> plan_source: "client"`,
  },
];

function SectionProducts() {
  return (
    <section className="oga-section-hero" aria-labelledby="ps-products-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-products__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Products you reach for</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="ps-products-title" className="oga-icp__h2">
            All four products. Each one earns its place in the publication trail.
          </h2>
          <p className="oga-icp__lead">
            Signals for raw sourced data, Scores for balanced triage,
            Monitor for tracked priority sets, Intelligence for audit-
            replayable analyst queries. One API key.
          </p>
        </header>

        <div className="oga-icp-products__grid">
          {PRODUCTS.map((p) => (
            <article key={p.slug} className="oga-icp-product">
              <div>
                <header className="oga-icp-product__head">
                  <span className="oga-icp-product__num">§ {p.num}</span>
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
   § 04 — What you can defend (cream-quiet)
   ============================================================ */

type DefendCard = {
  num: string;
  title: string;
  body: string;
};

const DEFEND: DefendCard[] = [
  {
    num: "01",
    title: "Country-scoped percentiles by design",
    body: "Normalisation runs national-within-country. England's IMD 2025, Wales's WIMD 2019, and Scotland's SIMD 2020 are different methodologies on different release schedules. We refuse to manufacture a cross-border percentile that would not survive procurement review.",
  },
  {
    num: "02",
    title: "Provenance on every signal",
    body: "Every Signal carries an explicit source, observed_period, confidence (0-1), and a plain-language confidence_reason. Lineage stamps (source_snapshot_id, engine_version, boundary_version) on every persisted row. Ready for an FOI footnote without you stitching it together.",
  },
  {
    num: "03",
    title: "Sample-size honest",
    body: "Monitor change detection gates price moves on transaction count (default 8 in both periods). Static signals produce zero change rows. The system says when it cannot tell instead of hallucinating a move that would embarrass a council briefing.",
  },
  {
    num: "04",
    title: "Plan-replayable AI",
    body: "Every Intelligence response echoes the executed plan plus plan_source ('nl' or 'client'). Any natural-language analyst answer can be replayed as a deterministic programmatic call. The methodology behind the answer is a JSON object you can store in the publication appendix.",
  },
  {
    num: "05",
    title: "Methodology version pinning for the contract cycle",
    body: "Per-org engine_version pin honoured on every product response via X-Engine-Version header. Owner-only, validated against the supported window. Two API calls under the same pin return the same numbers across deploys, which is exactly what a procurement deliverable timeline requires.",
  },
  {
    num: "06",
    title: "Published methodology + open ADR trail",
    body: "The methodology is public on /methodology. The full architectural decision record is open at github.com/OneGoodArea/OneGoodArea/tree/main/docs/adr. Your research note can cite the exact ADR your methodology section references; readers can verify the code path against the rule.",
  },
];

function SectionDefend() {
  return (
    <section className="oga-section-quiet" aria-labelledby="ps-defend-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-defend__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What you can defend</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="ps-defend-title" className="oga-icp__h2">
            Six properties that hold up at FOI and procurement review.
          </h2>
          <p className="oga-icp__lead">
            The defensibility pitch. Each property is grounded in an
            architectural decision record open in the public repo, ready
            to be cited in your methodology section.
          </p>
        </header>

        <div className="oga-icp-defend__grid">
          {DEFEND.map((d) => (
            <article key={d.num} className="oga-icp-defend-card">
              <span className="oga-icp-defend-card__num">§ {d.num}</span>
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
   § 05 — FAQs (DARK)
   ============================================================ */

type Faq = { q: string; a: string };

const FAQS: Faq[] = [
  {
    q: "Will the numbers survive an FOI response?",
    a: "Yes by construction. Each signal carries an explicit source, observed_period, confidence, and plain-language confidence_reason. The methodology version is stamped on every response body and the X-Engine-Version header. The full methodology is public on /methodology and the architectural decision record is open at github.com/OneGoodArea/OneGoodArea/tree/main/docs/adr. Your FOI footnote can point at the source, the release, the engine version, and the ADR.",
  },
  {
    q: "Can we pin the methodology for a contract or procurement deliverable?",
    a: "Yes. PUT /v1/orgs/:id/methodology persists an engine_version pin per organisation. Owner-only, validated against the supported version window. Every product response honours the pin via the X-Engine-Version response header. Two API calls under the same pin return the same numbers across deploys, which is exactly what a procurement deliverable timeline requires.",
  },
  {
    q: "Do you cover Northern Ireland?",
    a: "Not yet. England, Wales, and Scotland are covered today via the ONS NSPL spine and the three national deprivation methodologies (IMD 2025, WIMD 2019, SIMD 2020). NIMDM (Northern Ireland's deprivation measure) and the NI postcode spine are on the roadmap. The Signal contract is country-scoped, so NI postcodes return null rather than a fabricated cross-border value.",
  },
  {
    q: "Can the analyst cite OneGoodArea in a research note or report?",
    a: "Yes. Each signal carries a source string (e.g. police.uk, IMD 2025, HM Land Registry) you can cite directly. For methodology citation, the canonical reference is the /methodology page plus the engine version your queries ran under (visible on the X-Engine-Version header). The ADR trail is open and citable.",
  },
  {
    q: "What about precision and statistical confidence intervals?",
    a: "Confidence today is availability + sample based (0 to 1) rather than a calibrated statistical CI. Property dimensions cap at MEDIUM when the underlying YoY swing is wide (variance-aware rubric). Calibrated outcome-based confidence with proper intervals is on the roadmap as Phase 7; the current value is honest about being a v1 trust signal, not a statistical CI.",
  },
  {
    q: "Can we aggregate signals to ward or district level?",
    a: "Today aggregation is country and Local Authority District via the ONS spine. Ward-level and MSOA-level aggregation are on the roadmap. For now the typical pattern is to resolve a list of LSOA codes (the ward's constituent LSOAs from your own spine lookup) and aggregate client-side. Levers peer cohorts persist named LSOA lists if the aggregation is one your team uses repeatedly.",
  },
  {
    q: "What gets stored about us as an org?",
    a: "Org row with name and slug; member roster with three-tier RBAC (owner, admin, member); api_keys table linked to your org. Optional Levers state: signal bundles (named signal-key whitelists), saved scoring profiles, methodology pin, peer cohorts, white-label display_name and brand_url, per-key IP CIDR allowlist. No PII about residents of the areas you query; the LSOA grain is statistical, not personal.",
  },
];

function SectionFaqs() {
  return (
    <section
      className="oga-section-dark oga-icp-faqs"
      data-oga-surface="dark"
      aria-labelledby="ps-faqs-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="ps-faqs-title" className="oga-icp__h2">
            Questions a research or analytical unit asks first.
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
      aria-labelledby="ps-cta-title"
    >
      <div className="oga-icp__wrap--narrow">
        <h2 id="ps-cta-title" className="oga-icp-cta__h2">
          Sourced, dated, methodology-stamped. Built for the publication.
        </h2>
        <p className="oga-icp-cta__lead">
          Pin the methodology for the contract cycle, track priority LSOAs
          as a portfolio, replay any analyst query as a deterministic
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
