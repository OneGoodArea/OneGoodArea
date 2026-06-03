"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "../_shared/icp-page.css";

/* /for/cre — AR-204 PR — per-ICP page #4.

   Buyer-centric page for CRE + site selection (retail expansion teams,
   CRE platforms, leasing analytics, asset managers).

   Reuses the shared /for/<icp> skeleton + CSS. Heaviest pitch:
   compound multi-signal rank via Intelligence /v1/query, single-signal
   threshold rank via Signals /v1/areas, business-profile scoring via
   Scores. find_peers gives "areas like our best-performing store" in
   one call. */

export default function ForCreClient() {
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
          <span>For CRE and site selection</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">
          Screen the whole UK against your site criteria in one typed call.
        </h1>
        <p className="oga-icp-hero__lead">
          Compound multi-signal ranking across LSOAs, country or local
          authority scope. Up to eight AND-joined filters with eleven
          comparison operators. Find the peer set of your best-performing
          catchment in one call. Replay any ranked shortlist as a
          deterministic plan next quarter and get the same answer.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
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

/* ============================================================
   § 01 — The problem
   ============================================================ */

function SectionProblem() {
  return (
    <section className="oga-section-quiet" aria-labelledby="cre-problem-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>The problem</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="cre-problem-title" className="oga-icp__h2">
            Site selection is a ranking problem at portfolio scale.
          </h2>
        </header>

        <div className="oga-icp-problem__body">
          <p>
            Picking a site for a new store, a build-to-rent block, or a
            tenant catchment is not a single-area decision. It is a ranking
            problem at portfolio scale. Which areas in this country or
            local authority meet our thresholds on footfall demand,
            competition density, transport access, spending power and
            commercial costs, sorted by which one is the closest match to
            our best-performing locations?
          </p>
          <p>
            The legacy answer is to stitch ONS Mid-Year Estimates, postcode
            sector demographics, Land Registry, a footfall provider, and a
            crime spreadsheet, then re-rank by hand in Excel. Each refresh
            of the criteria means rebuilding the join. Adding a new
            constraint means a new spreadsheet. The shortlist is not
            reproducible next quarter because the data and the join logic
            both change underneath you.
          </p>
          <p>
            What CRE and site-selection teams actually want: a single typed
            query that takes compound criteria, runs against a stable
            LSOA-grain dataset, returns ranked rows, and lets you replay
            the same query next quarter and get a comparable answer. Plus
            a separate call that says &ldquo;here are the catchments most
            like our top-performing store.&rdquo;
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
    title: "Compound rank in one call",
    text: "POST /v1/query with a rank_areas plan. Up to 8 AND-joined filters on stored signal keys, 11 comparison operators (eq, lt, lte, gt, gte, between, plus the five percentile variants). Sort by any signal, scope by country or local authority district, cap at 1000 rows. One round trip.",
    code: `POST /v1/query
{ "plan": { "op": "rank_areas", "params": {
   "signals": [
     { "key": "property.median_price", "filter": { "lte": 300000 } },
     { "key": "crime.total_12m", "filter": { "percentile_lte": 25 } },
     { "key": "property.price_change_pct_yoy",
       "filter": { "gt": 0 } } ],
   "sort_by": { "signal": "property.price_change_pct_yoy",
                "direction": "desc" },
   "country": "England", "limit": 50 } } }`,
  },
  {
    num: "Step 02",
    title: "Drill into shortlisted areas",
    text: "Each rank_areas result row carries geo_code (the canonical LSOA). Pipe the shortlist into GET /v1/area for the full seven-category profile per area. Compose your own dashboard rows from the typed signals catalog.",
    code: `# For each LSOA in the shortlist:
GET /v1/area?postcode=M1 1AE
-> { "geo": { "lsoa": "E01005207", ... },
     "signals": [ ... 7 categories ... ],
     "meta": { "engine_version": "${METHODOLOGY_VERSION}" } }`,
  },
  {
    num: "Step 03",
    title: "Find areas like the best-performing one",
    text: "POST /v1/peers takes a target LSOA (your top store) and returns k nearest neighbours by Euclidean distance over normalised signal values. Default k=20, min 3 overlapping dimensions. Materialised peer graph (~840k assignments across 42k LSOAs) so the call is cheap and stable.",
    code: `POST /v1/peers
{ "target": { "postcode": "EC1A 1BB" },
  "country": "England",
  "k": 20 }
-> { "peers": [
     { "geo_code": "E01...", "distance": 0.045,
       "n_dims_used": 7 } ] }`,
  },
  {
    num: "Step 04",
    title: "Score with the commercial profile",
    text: "POST /v1/score with the business profile returns the 5 dimensions a site-selection analyst already uses: foot_traffic_demand, competition_density, transport_access, local_spending_power, commercial_costs. Custom weights or a saved org profile (preset_id) lets the team encode their own brand fit.",
    code: `POST /v1/score
{ "area": "EC1A 1BB", "preset": "business" }
-> { "score": 71, "area_type": "urban",
     "dimensions": [ { "key": "foot_traffic_demand", ... } ],
     "weights_source": "preset",
     "engine_version": "${METHODOLOGY_VERSION}" }`,
  },
  {
    num: "Step 05",
    title: "Replay the screen next quarter",
    text: "The /v1/query response echoes the executed plan plus plan_source. Save the plan JSON alongside the shortlist; next quarter, paste it back as the request body and get a comparable answer against refreshed data. The criteria become version-controlled JSON instead of a spreadsheet that lives on one analyst's laptop.",
    code: `# Q3 query
POST /v1/query { "plan": { ... } }
-> { "plan_source": "client",
     "plan":   { /* echoed */ },
     "results": [ ... ] }

# Q4: same plan, refreshed data
POST /v1/query { "plan": { /* paste */ } }`,
  },
];

function SectionFlow() {
  return (
    <section
      className="oga-section-dark oga-icp-flow"
      data-oga-surface="dark"
      aria-labelledby="cre-flow-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-flow__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>How it fits</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="cre-flow-title" className="oga-icp__h2">
            Five integration points from screen to score to replay.
          </h2>
          <p className="oga-icp__lead">
            What a typical CRE or site-selection integration looks like.
            Compound query first, drill in second, peer set third, score
            fourth, replay fifth.
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
    name: "Intelligence",
    slug: "intelligence",
    use: "Primary surface. /v1/query with rank_areas does compound screening across the UK in one call. /v1/peers gives the peer set of any target catchment in one call. /v1/insights ranks LSOAs by peer-relative anomaly when you want to find catchments that are unusual for their group. Every response echoes the executed plan for replay.",
    code: `POST /v1/query
{ "plan": { "op": "rank_areas", "params": {
   "signals": [ { "key": "...", "filter": { ... } } ],
   "sort_by": { ... },
   "country": "England", "limit": 50 } } }
-> { "plan_source": "client",
     "plan":   { /* echoed for replay */ },
     "results": [ ... ] }`,
  },
  {
    num: "02",
    name: "Signals",
    slug: "signals",
    use: "Single-signal cross-area ranking via /v1/areas. When the screen is one dimension at a time (\"top 50 LSOAs by price_change_pct_yoy in the West Midlands\"), /v1/areas is the simpler surface. Same store, same percentiles, same LSOA grain. /v1/area drills into any shortlisted LSOA for the full seven-category profile.",
    code: `GET /v1/areas?signal=property.price_change_pct_yoy
       &country=England&min_percentile=80
       &sort=value_desc&limit=50
-> { "signal": "property.price_change_pct_yoy",
     "count": 50,
     "areas": [
       { "geo_type": "lsoa", "geo_code": "E01...",
         "value": 18.4, "percentile": 92.1 } ] }`,
  },
  {
    num: "03",
    name: "Scores",
    slug: "scores",
    use: "The commercial profile returns the five dimensions a site-selection analyst already uses. Custom weights per portfolio class (food + bev vs convenience vs experiential), or a saved org profile (preset_id) for brand-specific fit. Deterministic engine, same score across deploys.",
    code: `POST /v1/score
{ "area": "EC1A 1BB", "preset": "business" }
-> { "score": 71, "area_type": "urban",
     "dimensions": [
       { "key": "foot_traffic_demand", ... },
       { "key": "competition_density", ... },
       { "key": "transport_access", ... },
       { "key": "local_spending_power", ... },
       { "key": "commercial_costs", ... } ] }`,
  },
];

function SectionProducts() {
  return (
    <section className="oga-section-hero" aria-labelledby="cre-products-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-products__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Products you reach for</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="cre-products-title" className="oga-icp__h2">
            Intelligence leads. Signals handles single-signal scans. Scores is the brand-fit lens.
          </h2>
          <p className="oga-icp__lead">
            Monitor (portfolio drift detection) is rarely the primary CRE
            lift, but if you watch a leased portfolio it slots in the same
            way it does for insurers.
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
    title: "Compound queries in one round trip",
    body: "rank_areas accepts up to 8 AND-joined signal filters with 11 comparison operators (raw value or percentile). One INNER JOIN per signal in the executor. AND semantics across all filters. No more spreadsheet joins; no more partial joins across data vendors.",
  },
  {
    num: "02",
    title: "Reproducible shortlists",
    body: "Every /v1/query response echoes the executed plan plus plan_source. Save the plan JSON alongside the shortlist; replay it next quarter against refreshed data and get a comparable answer. Criteria become version-controlled JSON instead of an Excel file on a laptop.",
  },
  {
    num: "03",
    title: "Materialised peer graph",
    body: "/v1/peers reads from a materialised k-NN graph (~840k assignments across 42k LSOAs, k=20 default). The peer math runs offline in the refresh:peers + derive:signals batch so query-time is cheap. Same definition of \"peer\" feeds find_peers, find_insights, and the peer-relative-z derived signals.",
  },
  {
    num: "04",
    title: "ONS-backed scope, no fake polygons",
    body: "Country and LAD scoping use the official ONS NSPL spine. Region scope is on the roadmap; ad-hoc polygon overlays are not. Where the analyst wants a custom catchment, Levers peer cohorts persist an explicit list of LSOA codes per org and constrain /v1/peers to that universe.",
  },
  {
    num: "05",
    title: "Deterministic + stable",
    body: "Same postcode plus same scoring profile gives the same score across deploys. Same plan gives the same shortlist across the same data state. The deterministic engine is frozen v2, golden-tested; AI never sets the numbers (AI translates NL into the typed plan; the database produces the rows).",
  },
  {
    num: "06",
    title: "Country-scoped percentiles",
    body: "Normalisation runs national-within-country. England's IMD, Wales's WIMD, and Scotland's SIMD are different methodologies. A cross-border percentile would be a lie. If you operate across all three countries, you compare percentiles within each, not across.",
  },
];

function SectionDefend() {
  return (
    <section className="oga-section-quiet" aria-labelledby="cre-defend-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-defend__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What you can defend</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="cre-defend-title" className="oga-icp__h2">
            Six properties the property committee will sign off.
          </h2>
          <p className="oga-icp__lead">
            The shortlist needs to survive committee scrutiny. Each property
            is documented on /methodology and stamped on every response.
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
    q: "What is the difference between /v1/areas and /v1/query?",
    a: "/v1/areas (Signals product) is single-signal threshold-and-rank within a country or local authority. Faster to write, easier to cache, no plan grammar to learn. /v1/query (Intelligence product) is the compound version: up to 8 AND-joined signal filters, 11 comparison operators, plus the other five plan ops (get_area, score_area, find_peers, find_insights, find_forecast). Use /v1/areas when the screen is one dimension; use /v1/query when it is compound.",
  },
  {
    q: "Can I screen hundreds of catchments at once?",
    a: "Yes. /v1/query with rank_areas caps at 1000 rows per call. Default limit is 100. The executor runs one signal_values INNER JOIN per filter signal in the plan, all parameters bound through prepared statements so there is no SQL injection surface and the database can plan efficiently. For most CRE screens, one call returns the shortlist; pipe each result row's geo_code into /v1/area for full per-area profiles if you need them.",
  },
  {
    q: "Can I customise the commercial dimensions?",
    a: "Yes, but within the business profile's fixed 5-dimension set (foot_traffic_demand, competition_density, transport_access, local_spending_power, commercial_costs). You re-weight, you do not redefine. Custom weights per request OR save a per-org profile via POST /v1/orgs/:id/presets and reference it as preset_id on every call. Weight keys must match PRESET_DIMENSION_KEYS[business].",
  },
  {
    q: "How do you handle catchments that are not LSOA-shaped?",
    a: "Two options. (a) Approximate the catchment as a list of LSOA codes and use Levers peer cohorts to persist it (POST /v1/orgs/:id/cohorts, up to 10000 LSOA codes per cohort). Pass cohort_id on /v1/peers to constrain the candidate set. (b) Resolve a few representative postcodes inside the catchment via /v1/area and aggregate signals client-side. Custom-polygon ingest is not on the roadmap; the LSOA × month grain is the floor.",
  },
  {
    q: "Where does footfall data come from?",
    a: "Today we surface the proxies (residential density, retail amenity counts within radii, transport-station counts) via the business scoring profile. We do not ingest mobile-device footfall feeds (Streetlytics, Mytraffic, etc.). Most CRE teams already have one of those; OneGoodArea is the deterministic area-context layer underneath, not a footfall vendor. If footfall ingest moves up the priority list, it will land as a new signal category, not a replacement.",
  },
  {
    q: "How does the peer set actually get computed?",
    a: "Euclidean distance over normalised signal values, dimension-mean-squared (distance = SQRT(AVG_i((t_i - c_i)^2)) over dimensions both the target and candidate have normalised). Symmetric, bounded in [0,1], robust to missing dimensions. Default k=20, min 3 overlapping dimensions. The graph is materialised in peer_assignments (~840k rows) by the refresh:peers batch; query-time is a single LATERAL join.",
  },
  {
    q: "Can the team replay the same shortlist next quarter?",
    a: "Yes, by design. Every /v1/query response carries plan_source and the executed plan. Save the plan JSON alongside the shortlist. Next quarter, paste the plan back as the request body and the same deterministic executor runs it against refreshed data. If the engine version moved between runs, the response header X-Engine-Version tells you so; org-level methodology pinning locks the version if you want byte-equivalent runs.",
  },
];

function SectionFaqs() {
  return (
    <section
      className="oga-section-dark oga-icp-faqs"
      data-oga-surface="dark"
      aria-labelledby="cre-faqs-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="cre-faqs-title" className="oga-icp__h2">
            Questions a CRE analyst asks before integrating.
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
      aria-labelledby="cre-cta-title"
    >
      <div className="oga-icp__wrap--narrow">
        <h2 id="cre-cta-title" className="oga-icp-cta__h2">
          One typed query against the whole UK. Reproducible next quarter.
        </h2>
        <p className="oga-icp-cta__lead">
          Replace the spreadsheet join with a versioned plan. Get the peer
          set of your best-performing catchment in one call. Score with
          weights the property committee can sign off.
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
