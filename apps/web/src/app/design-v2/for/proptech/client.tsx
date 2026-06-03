"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import "../_shared/icp-page.css";

/* /for/proptech — AR-204 PR — per-ICP page #1.

   Buyer-centric page for PropTech platforms (listing portals,
   valuation tools, agent CRMs, search products).

   Sets the template for the next 4 ICP pages (lenders, insurance,
   cre, public-sector). Same structural skeleton; per-ICP content +
   FAQs diverge.

   SEO-tuned via the production /for/proptech/page.tsx metadata. */

export default function ForProptechClient() {
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
          <span>For PropTech</span>
          <span className="oga-icp-hero__eyebrow-mark" aria-hidden />
        </div>
        <h1 className="oga-icp-hero__h1">
          UK area data your listing pages can ship next week.
        </h1>
        <p className="oga-icp-hero__lead">
          One API key replaces a dozen government data integrations. LSOA-grain
          signals across seven categories with country-scoped percentiles,
          per-signal confidence, and source attribution on every response.
          Built for portals, valuation tools, agent CRMs, and search products.
        </p>
        <div className="oga-icp-hero__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/products/signals" className="oga-btn oga-btn-secondary">
            See Signals
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
    <section className="oga-section-quiet" aria-labelledby="proptech-problem-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp__header">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>The problem</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="proptech-problem-title" className="oga-icp__h2">
            Your users want area context. You do not want a data team.
          </h2>
        </header>

        <div className="oga-icp-problem__body">
          <p>
            A user on your property detail page has already decided they care
            about this address. The next thing they want to know is what the
            area is like. Schools. Crime. Prices in the neighbourhood. How it
            compares to other areas they have looked at. How it has moved over
            the last year.
          </p>
          <p>
            Building that view yourself means integrating the police bulk
            archive, HM Land Registry Price Paid, the IMD / WIMD / SIMD
            deprivation indices, Ofsted, ONS NSPL for postcode resolution,
            OpenStreetMap for amenity counts, and the Environment Agency for
            flood. Then normalising mismatched deciles, reconciling 2011 versus
            2021 boundaries, deciding what to do when Scotland prices fall back
            to live because HM Land Registry is England and Wales only. Then
            owning the refresh cadence forever.
          </p>
          <p>
            That is a data team. Most PropTech teams already know they should
            not be hiring one. The question is what to integrate against instead.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 02 — Workflow walkthrough (DARK)
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
    title: "Resolve the postcode",
    text: "Drop GET /v1/area into your property detail render. We resolve the postcode to its LSOA via the ONS spine and return the seven-category catalog. No 12-step join across upstream APIs.",
    code: `GET /v1/area?postcode=M1 1AE
  -H "Authorization: Bearer oga_..."`,
  },
  {
    num: "Step 02",
    title: "Render the area panel",
    text: "Each signal carries value, normalized_value, percentile (national within country), direction, source, observed_period and confidence. Render whichever fields fit the panel. Percentile bars work especially well.",
    code: `{
  "key": "crime.total_12m",
  "value": 3712,
  "percentile": 92.1,
  "confidence": 0.9,
  "direction": "lower_is_better"
}`,
  },
  {
    num: "Step 03",
    title: "Compress to a headline score (optional)",
    text: "If you want a single number per listing for your search filters or summary card, POST /v1/score with one of four scoring profiles. Deterministic engine, version stamped on every response, same input always returns the same number so cached UI states stay coherent.",
    code: `POST /v1/score
{ "area": "M1 1AE", "preset": "moving" }
-> { "score": 58, "engine_version": "2.0.2" }`,
  },
  {
    num: "Step 04",
    title: "Add similar-areas tiles (optional)",
    text: "POST /v1/peers gives you the k-nearest LSOAs by Euclidean distance over normalized signal values. Powers an areas-like-this-one widget without you running a peer graph cache.",
    code: `POST /v1/peers
{ "target": { "postcode": "M1 1AE" },
  "country": "England", "k": 20 }`,
  },
  {
    num: "Step 05",
    title: "Ship",
    text: "Bearer token authentication, plain JSON over HTTPS, all paths under /v1/. No SDK required. 30 requests per minute per key on every product surface; cached responses do not count against quota.",
    code: `# That is it. A handful of curl-equivalent calls.
# Bearer header, JSON body, /v1/ paths.`,
  },
];

function SectionFlow() {
  return (
    <section
      className="oga-section-dark oga-icp-flow"
      data-oga-surface="dark"
      aria-labelledby="proptech-flow-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-flow__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>How it fits</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="proptech-flow-title" className="oga-icp__h2">
            Five steps from API key to richer listings.
          </h2>
          <p className="oga-icp__lead">
            What a typical PropTech integration actually looks like. No magic.
            One Bearer token, plain JSON, paths under /v1/.
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
    use: "The primary integration for PropTech. GET /v1/area returns the seven-category catalog at LSOA grain. Pin to the signal keys your product consumes (property.median_price, crime.total_12m, deprivation.imd_decile, transport.station_count) and the contract stays additive over time.",
    code: `GET /v1/area?postcode=SW1A 1AA
{
  "geo":   { "lsoa": "E01000001", "country": "England" },
  "signals": [ { "key": "...", "value": ..., "percentile": ... } ],
  "meta":  { "engine_version": "2.0.2", "fetch_mode": "hybrid" }
}`,
  },
  {
    num: "02",
    name: "Scores",
    slug: "scores",
    use: "When your UI needs a single 0-to-100 number per listing for search filters or a summary card. Four scoring profiles cover the four audiences your product sees (residential origination, commercial, investment, research baseline). Components plus weights plus confidence come back in every response so you can drill into the breakdown on demand.",
    code: `POST /v1/score
{ "area": "SW1A 1AA", "preset": "investing" }
-> { "score": 71, "area_type": "urban",
     "dimensions": [...], "engine_version": "2.0.2" }`,
  },
  {
    num: "03",
    name: "Intelligence",
    slug: "intelligence",
    use: "When you want a similar-areas tile or natural-language area search baked into your product. POST /v1/peers powers areas-like-this-one in one call. POST /v1/query accepts free-text questions or programmatic plans and returns ranked results from deterministic SQL.",
    code: `POST /v1/query
{ "question": "cheap places to buy with rising prices and low crime" }
-> { "plan": { "op": "rank_areas", ... },
     "plan_source": "nl",
     "results": [ ... ] }`,
  },
];

function SectionProducts() {
  return (
    <section className="oga-section-hero" aria-labelledby="proptech-products-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-products__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Products you reach for</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="proptech-products-title" className="oga-icp__h2">
            Three of the four products. One API key.
          </h2>
          <p className="oga-icp__lead">
            Monitor (portfolios plus change detection) is not the primary lift
            for PropTech, but Signals, Scores, and Intelligence cover every
            area-context surface a property product needs.
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
    title: "Engine version on every response",
    body: "engine_version is stamped on the body and on the X-Engine-Version response header. If a score in your UI gets challenged, you can point at the exact methodology version that produced it.",
  },
  {
    num: "02",
    title: "Country-scoped percentiles, not invented ones",
    body: "Percentiles are national-within-country. England's IMD, Wales's WIMD, and Scotland's SIMD are different methodologies. We refuse to manufacture a cross-border percentile that would be a lie.",
  },
  {
    num: "03",
    title: "Provenance on the wire",
    body: "Every signal carries source, observed_period, confidence, and a plain-language confidence_reason. fetch_mode is honestly live, store, or hybrid so you always know how each value was served.",
  },
  {
    num: "04",
    title: "Deterministic + stable for caching",
    body: "Same postcode plus same scoring profile equals the same score across deploys. Cached UI states stay coherent. The engine is frozen v2 and golden-tested; AI never sets the numbers.",
  },
];

function SectionDefend() {
  return (
    <section className="oga-section-quiet" aria-labelledby="proptech-defend-title">
      <div className="oga-icp__wrap">
        <header className="oga-icp-defend__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>What you can defend</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="proptech-defend-title" className="oga-icp__h2">
            Four properties your customer success and product teams will thank you for.
          </h2>
          <p className="oga-icp__lead">
            None of these are unique pitches per ICP — they hold across the
            platform — but they matter for PropTech because your end users
            ask questions about every number you show.
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
    q: "Does the API scale to listing-page traffic?",
    a: "Bearer-token API at /v1/area is rate-limited at 30 requests per minute per key. For higher-throughput listing-page traffic the typical pattern is to cache the AreaProfile per postcode at your edge and serve the JSON yourself. Same postcode within a month is deterministic, so cache windows can be generous.",
  },
  {
    q: "What grain is the data at?",
    a: "LSOA × month. There are about 42,000 LSOAs across England, Wales, and Scotland; postcodes resolve into LSOAs via the ONS NSPL spine. We do not offer per-postcode or per-address signals today; address-level (UPRN) is on the roadmap.",
  },
  {
    q: "Can I show your numbers without attribution?",
    a: "Attribution is on you. Each signal carries a source string (e.g. police.uk, IMD 2025) so you can render it next to the value if your platform needs to. The OneGoodArea brand is not required on your listing pages unless your contract says so.",
  },
  {
    q: "What happens when a postcode is in Scotland?",
    a: "fetch_mode is honestly hybrid. Deprivation comes from SIMD (Scotland's index), crime from police.uk, transport and amenities from OpenStreetMap. Property median price falls back to live fetch because HM Land Registry covers England and Wales only. Your UI gets the value with a confidence dot reflecting that source.",
  },
  {
    q: "Do you have customer logos I can show to procurement?",
    a: "We are early. We would rather have a clean published methodology and a stamped engine version on every response than logos that imply social proof we have not earned. If procurement needs deeper assurance we are happy to do a call.",
  },
  {
    q: "Is there a free tier for me to integrate against?",
    a: "Pricing is being finalised. The /v1/area endpoint is the primary read for PropTech and is rate-limited rather than monthly-quota-metered, which makes integration testing cheap. Get an API key and use it; we will tell you ahead of any price changes.",
  },
];

function SectionFaqs() {
  return (
    <section
      className="oga-section-dark oga-icp-faqs"
      data-oga-surface="dark"
      aria-labelledby="proptech-faqs-title"
    >
      <div className="oga-icp__wrap">
        <header className="oga-icp-faqs__head">
          <div className="oga-icp__eyebrow">
            <span className="oga-icp__eyebrow-mark" aria-hidden />
            <span>Frequently asked</span>
            <span className="oga-icp__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="proptech-faqs-title" className="oga-icp__h2">
            Real questions PropTech buyers ask us.
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
      aria-labelledby="proptech-cta-title"
    >
      <div className="oga-icp__wrap--narrow">
        <h2 id="proptech-cta-title" className="oga-icp-cta__h2">
          Ship richer area context than your competitor&rsquo;s roadmap.
        </h2>
        <p className="oga-icp-cta__lead">
          One endpoint, one API key, one engine version stamped on every
          response. Drop /v1/area into your listing pages and replace a
          dozen data integrations.
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
