"use client";

import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { DEMO_URL } from "../_shared/book-demo";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  getCurrentMethodology,
} from "@/lib/methodology-versions";
import { SCORING_PROFILES } from "@/lib/scoring-profiles";
import "./methodology.css";

/* /methodology — Brand v3 (Plotted) — AR-204 PR A.

   Full rewrite from the previous Fraunces-themed inline-style
   methodology page. Reflects the system we actually shipped:
   Signal-first primitive (ADR 0001), persisted store (0002-0006,
   0011-0016), normalization (0005), time-series moat (0010),
   derived signals (0018-0024), Scores presets (0008, 0030),
   Peers/Insights/Forecast (0023, 0024, 0025), the Intelligence
   query plane (0017, 0019), AI eval harness (0026), org-level
   methodology pinning (0031).

   Wraps in <div className="oga-root"> to match the homepage
   (apps/web/src/app/design-v2/client.tsx); no .aiq wrapper, no
   <Styles /> no-op. All styling in ./methodology.css — zero
   inline style objects per the AR-204 hygiene rule. */

const current = getCurrentMethodology();

/* ───────────────────────────── 7 data sources */

type SourceTile = {
  num: string;
  name: string;
  provider: string;
  body: string;
  coverage: string;
  cadence: string;
  grain: string;
};

const DATA_SOURCES: SourceTile[] = [
  {
    num: "01",
    name: "Deprivation indices",
    provider: "MHCLG (IMD 2025), StatsWales (WIMD 2019), Scottish Gov (SIMD 2020)",
    body: "Decile, rank, and the seven IMD domain scores per LSOA. Country-specific methodologies; we never compare across the border.",
    coverage: "England · Wales · Scotland",
    cadence: "Static per release",
    grain: "LSOA",
  },
  {
    num: "02",
    name: "HM Land Registry Price Paid",
    provider: "HM Land Registry",
    body: "Standard residential sales (PPD category A, types D/S/T/F, non-deleted, positive prices). Median price + transaction count per LSOA per month.",
    coverage: "England & Wales",
    cadence: "Monthly",
    grain: "LSOA × month",
  },
  {
    num: "03",
    name: "Police.uk crime archive",
    provider: "Home Office",
    body: "Bulk street-level archive joined to LSOA codes carried on each record. Aggregated to monthly count per LSOA. No spatial join needed.",
    coverage: "England · Wales · Scotland",
    cadence: "Monthly",
    grain: "LSOA × month",
  },
  {
    num: "04",
    name: "Ofsted inspections",
    provider: "Department for Education",
    body: "School inspection ratings (Outstanding, Good, Requires Improvement, Inadequate) within 1.5km of postcode. England only.",
    coverage: "England",
    cadence: "Live (Ofsted API)",
    grain: "School (1.5km radius)",
  },
  {
    num: "05",
    name: "OpenStreetMap",
    provider: "OSM contributors via Overpass",
    body: "Schools, food/shops, transport stations, bus stops, parks, healthcare. Live amenity counts at radius bands around the postcode.",
    coverage: "United Kingdom",
    cadence: "Live (Overpass)",
    grain: "0.5km - 2km radius",
  },
  {
    num: "06",
    name: "Environment Agency flood",
    provider: "Defra",
    body: "Flood risk zones and active warnings around the postcode. Distinguishes river-at-risk from active-warning states.",
    coverage: "United Kingdom",
    cadence: "Live (EA API)",
    grain: "3km - 5km radius",
  },
  {
    num: "07",
    name: "Postcodes.io geocoding",
    provider: "ONS / Royal Mail (postcodes.io)",
    body: "Postcode resolution: lat/long, LSOA, local authority, ward, constituency, region, country, rural-urban classification.",
    coverage: "United Kingdom",
    cadence: "Live (postcodes.io)",
    grain: "Postcode",
  },
];

/* ───────────────────────────── store tables (ADR 0002) */

const STORE_TABLES: { name: string; desc: string }[] = [
  { name: "Area registry", desc: "Every UK small area, and the postcodes that resolve into it, so a postcode always maps to the right neighbourhood." },
  { name: "Source snapshots", desc: "A dated record of each data refresh, capturing where the numbers came from and when. The anchor that makes every value auditable." },
  { name: "Current values", desc: "The latest value for every signal in every area, placed in national context and linked back to the snapshot it came from." },
  { name: "Monthly history", desc: "A month-by-month record that is only ever added to, so past values are preserved and any figure can be reproduced later." },
];

/* ───────────────────────────── store fetch modes */

const STORE_MODES: { tag: string; body: string }[] = [
  { tag: "live", body: "Every number in this response was fetched fresh from its source when you asked." },
  { tag: "stored", body: "Every number was served from our own store, so it comes back fast and consistently." },
  { tag: "mixed", body: "A blend of the two, so you always know exactly how each number was sourced." },
];

/* ───────────────────────────── derived signals (ADRs 0018, 0020-0024) */

type DerivedSignal = {
  name: string;
  desc: string;
};

const DERIVED_SIGNALS: DerivedSignal[] = [
  {
    name: "Change over time",
    desc: "How prices, sales activity and crime have moved compared with a year ago.",
  },
  {
    name: "Momentum",
    desc: "The recent direction of travel over the last few months, so a fast-moving area shows up early.",
  },
  {
    name: "Trend",
    desc: "The longer-run direction over a couple of years, steadier than a single year-on-year jump.",
  },
  {
    name: "Peer comparison",
    desc: "How an area compares with similar areas, so a number reads as high or low for its kind, not just nationally.",
  },
];

/* ───────────────────────────── 4 scoring presets (ADR 0008) */

/* Every preset scores the same seven categories (ADR 0038 / engine 1.1.0);
   the preset only changes how they are weighted for its use case. */
const SCORING_CATEGORIES = [
  "Crime",
  "Deprivation",
  "Property",
  "Schools",
  "Amenities",
  "Transport",
  "Environment",
] as const;

/* The four scoring profiles (formal names, use copy and glyphs) come from
   the shared catalog @/lib/scoring-profiles, so this page stays in sync with
   the dashboard and /products/scores. */

/* ───────────────────────────── intelligence plan ops (ADR 0017, 0019, 0023-0025) */

const PLAN_OPS: { name: string; desc: string }[] = [
  { name: "Rank areas",       desc: "Filter and sort areas across any combination of signals" },
  { name: "Look up an area",  desc: "Pull the full picture for a single postcode or area" },
  { name: "Score an area",    desc: "Get a composite score for the workflow you choose" },
  { name: "Compare areas",    desc: "Put several areas side by side on the same measures" },
  { name: "Find similar",     desc: "Surface the areas most like a given one" },
  { name: "Spot outliers",    desc: "Find areas that stand out from their peers" },
  { name: "Forecast",         desc: "Project where a single measure is heading" },
];

/* ───────────────────────────── peers / insights / forecast (8) */

const DERIVED_THREE: { num: string; name: string; endpoint: string; body: string; honest: string }[] = [
  {
    num: "01",
    name: "Similar areas",
    endpoint: "Peers",
    body: "The areas most like a given one, based on how closely they sit across the signals they share. Useful for building a comparison set you can defend.",
    honest: "A simple, symmetric similarity, so \"most like\" means the same thing in both directions.",
  },
  {
    num: "02",
    name: "Outliers",
    endpoint: "Insights",
    body: "Areas that stand out from their peer group on a given signal, so unusual places surface without you having to hunt for them.",
    honest: "Worked out ahead of time, so it comes back fast.",
  },
  {
    num: "03",
    name: "Forecast",
    endpoint: "Projection",
    body: "A straightforward projection of where a single monthly signal is heading, with a confidence band around it.",
    honest: "A transparent trend projection, not a black-box predictive model.",
  },
];

/* ───────────────────────────── confidence rubric */

const CONFIDENCE_BANDS: { band: string; criteria: string; example: string }[] = [
  { band: "High",   criteria: "Fresh data from the primary source, with a healthy sample and little movement.", example: "Recent crime from police.uk, or prices in an area with plenty of recent sales." },
  { band: "Medium", criteria: "An older release, a smaller sample, a fallback source, or a more volatile signal.", example: "Older deprivation indices, schools in Wales or Scotland, or prices in a thinner market." },
  { band: "Low",    criteria: "A proxy fallback, or very little underlying data.", example: "Prices in an area with very few recent sales." },
  { band: "None",   criteria: "No usable data. The value comes back empty, with the reason why.", example: "A source is unavailable, or the area is outside our coverage." },
];

/* ───────────────────────────── semver convention */

const SEMVER: { tag: string; desc: string }[] = [
  { tag: "Major", desc: "A change big enough that scores could move. Anything that would invalidate numbers you saved under the old version." },
  { tag: "Minor", desc: "An addition, such as a new category or data source, that does not change the numbers you already have." },
  { tag: "Patch", desc: "A small refinement, with scores staying exactly the same." },
];

/* ───────────────────────────── scope-not (12) */

const SCOPE_NOT: { tag: string; title: string; body: string }[] = [
  {
    tag: "Not",
    title: "An automated valuation model",
    body: "OneGoodArea does not predict the market value of a specific property. Use a dedicated AVM for that.",
  },
  {
    tag: "Not",
    title: "A credit decisioning model",
    body: "It does not predict an individual's default, affordability or creditworthiness. It is an input to enrich your own models, not a decision on any person.",
  },
  {
    tag: "Not",
    title: "Address-level",
    body: "We score small areas (neighbourhoods), not individual addresses. For anything that needs a specific property, pair us with an address-level source.",
  },
  {
    tag: "MAUP",
    title: "Modifiable Areal Unit Problem",
    body: "Scores within 100m of an LSOA boundary deserve a closer look. Postcode and LSOA boundaries are administrative, not behavioural.",
  },
  {
    tag: "Fair lending",
    title: "Protected-characteristic correlation",
    body: "Deprivation indices correlate with protected characteristics. Buyers are responsible for FCA / CONC / SS1/23 compliance in regulated workflows.",
  },
];

/* ───────────────────────────── audit artefacts (13) */

const AUDIT: { num: string; name: string; desc: string; href: string; external?: boolean; disabled?: boolean }[] = [
  {
    num: "14.1",
    name: "Methodology page",
    desc: "You are here. Stamped on every release with engine_version + released_at.",
    href: "/methodology",
  },
  {
    num: "14.2",
    name: "Changelog",
    desc: "Public release history. Every shipped MAJOR / MINOR / PATCH bump documented.",
    href: "/changelog",
  },
  {
    num: "14.3",
    name: "API reference",
    desc: "OpenAPI 3.0 spec rendered as an interactive reference. Currently being regenerated against the live backend.",
    href: "/docs/api-reference",
  },
];

/* ============================================================
   Page
   ============================================================ */

export default function MethodologyClient() {
  return (
    <div className="oga-root oga-meth">
      <Nav />

      <Hero />

      <SectionSignal />
      <SectionDataSources />
      <SectionStore />
      <SectionNormalization />
      <SectionMoat />
      <SectionDerived />
      <SectionScoring />
      <SectionPeersInsightsForecast />
      <SectionIntelligence />
      <SectionConfidence />
      <SectionVersioning />
      <SectionLevers />
      <SectionScope />
      <SectionAudit />

      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero() {
  return (
    <section className="oga-meth-hero oga-section-hero">
      <div className="oga-meth__container">
        <div className="oga-meth-hero__eyebrow">
          <span>Methodology</span>
          <span className="oga-meth-hero__eyebrow-sep" aria-hidden />
          <span>v{METHODOLOGY_VERSION}</span>
          <span className="oga-meth-hero__eyebrow-sep" aria-hidden />
          <span>Released {current.released_at}</span>
        </div>

        <h1 className="oga-meth-hero__title">
          How OneGoodArea computes a UK area&rsquo;s signals, scores, and trends.
        </h1>

        <p className="oga-meth-hero__lead">
          Every number comes from a named public source, is placed in national
          context, carries its own confidence, and is stamped with the engine
          version that produced it. So you can trace it, cite it, and get the same
          answer when you check it again.
        </p>

        <div className="oga-meth-hero__anchors">
          <Link href="#signal" className="oga-meth-hero__anchor">
            What a signal is
            <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
          </Link>
          <Link href="#data-sources" className="oga-meth-hero__anchor">
            Data sources
            <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
          </Link>
          <Link href="#intelligence" className="oga-meth-hero__anchor">
            Ask a question
            <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
          </Link>
          <Link href="#versioning" className="oga-meth-hero__anchor">
            Versioning
            <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
          </Link>
          <Link href="#levers" className="oga-meth-hero__anchor">
            Levers
            <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────── 1 — Signal ─────── */

function SectionSignal() {
  return (
    <section id="signal" className="oga-section-quiet">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">01</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>The primitive</span>
          </div>
          <h2 className="oga-meth__h2">Everything starts with a signal.</h2>
          <p className="oga-meth__lead">
            A signal is one measured attribute of a UK area, from a named source,
            placed in national context, time-stamped and confidence-rated.
            Everything else, scores, comparisons and forecasts, is built on top of
            signals.
          </p>
        </header>

        <div className="oga-meth-signal__grid">
          <div className="oga-meth-signal__attrs">
            <div className="oga-meth-signal__attr">
              <div className="oga-meth-signal__attr-name">value</div>
              <p className="oga-meth-signal__attr-body">
                The raw measurement in its native unit. number, string, or null with a reason.
              </p>
            </div>
            <div className="oga-meth-signal__attr">
              <div className="oga-meth-signal__attr-name">normalized_value</div>
              <p className="oga-meth-signal__attr-body">
                Direction-agnostic position 0&ndash;1 within country. Ascending: 0 = lowest, 1 = highest. Read
                with the signal&rsquo;s direction field.
              </p>
            </div>
            <div className="oga-meth-signal__attr">
              <div className="oga-meth-signal__attr-name">percentile</div>
              <p className="oga-meth-signal__attr-body">
                National rank from 0 to 100, worked out within each country.
              </p>
            </div>
            <div className="oga-meth-signal__attr">
              <div className="oga-meth-signal__attr-name">regional_percentile</div>
              <p className="oga-meth-signal__attr-body">
                Same rank scale, partitioned by ONS region instead of country. Surfaces within-region
                outperformers instead of the national flatten. Per-cohort recompute is still on the roadmap.
              </p>
            </div>
            <div className="oga-meth-signal__attr">
              <div className="oga-meth-signal__attr-name">confidence</div>
              <p className="oga-meth-signal__attr-body">
                0.0&ndash;1.0 with confidence_reason. Source-driven (sample size, freshness, fallback path).
                Honest, not aspirational.
              </p>
            </div>
          </div>

          <SignalSampleCode />
        </div>

        <p className="oga-meth-signal__lineage">
          Every signal_value and timeseries row carries <code>source_snapshot_id</code> and
          <code> engine_version</code>. Re-running the same query against the same engine version returns
          the same number. Always.
        </p>
      </div>
    </section>
  );
}

function SignalSampleCode() {
  return (
    <div className="oga-code-panel" aria-label="Sample Signal JSON">
      <span className="oga-code-panel__tick oga-code-panel__tick--tl" aria-hidden />
      <span className="oga-code-panel__tick oga-code-panel__tick--tr" aria-hidden />
      <span className="oga-code-panel__tick oga-code-panel__tick--bl" aria-hidden />
      <span className="oga-code-panel__tick oga-code-panel__tick--br" aria-hidden />
      <div className="oga-code-panel__header">
        <span className="oga-code-panel__live">SIGNAL</span>
        <span className="oga-code-panel__path">deprivation.imd_decile</span>
        <span className="oga-code-panel__meta">E01000002 · v{METHODOLOGY_VERSION}</span>
      </div>
      <div className="oga-code-panel__body">
        {SIGNAL_LINES.map((line, i) => (
          <div key={i} className="oga-code-panel__line">
            <span className="oga-code-panel__num">{String(i + 1).padStart(2, "0")}</span>
            <span
              className="oga-code-panel__text"
              dangerouslySetInnerHTML={{ __html: line }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const SIGNAL_LINES: string[] = [
  '<span class="oga-code-panel__punct">{</span>',
  '  <span class="oga-code-panel__key">"signal_key"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__str">"deprivation.imd_decile"</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"value"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__num-val">9</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"normalized_value"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__num-val">0.967</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"percentile"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__num-val">96.7</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"confidence"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__num-val">1.0</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"confidence_reason"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__str">"IMD 2025, England, fresh primary"</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"direction"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__str">"higher_is_better"</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"observed_period"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__str">"2025"</span><span class="oga-code-panel__punct">,</span>',
  '  <span class="oga-code-panel__key">"source_snapshot_id"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__str">"snap_imd2025_en_…"</span><span class="oga-code-panel__punct">,</span>',
  `  <span class="oga-code-panel__key">"engine_version"</span><span class="oga-code-panel__punct">:</span> <span class="oga-code-panel__str">"${METHODOLOGY_VERSION}"</span>`,
  '<span class="oga-code-panel__punct">}</span>',
];

/* ─────── 2 — Data sources ─────── */

function SectionDataSources() {
  return (
    <section id="data-sources" className="oga-section-hero">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">02</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Data sources</span>
          </div>
          <h2 className="oga-meth__h2">Seven public-record sources back every signal.</h2>
          <p className="oga-meth__lead">
            We name every source on this page. Marketing copy elsewhere says &ldquo;multiple sources&rdquo;;
            full provenance lives here and in <code>source_snapshots</code> on every API response.
          </p>
        </header>

        <div className="oga-meth-sources__grid">
          {DATA_SOURCES.map((s) => (
            <article key={s.num} className="oga-meth-sources__tile">
              <div className="oga-meth-sources__tile-head">
                <span className="oga-meth-sources__tile-num">{s.num}</span>
                <span className="oga-status oga-status-green oga-meth-sources__tile-status">In production</span>
              </div>
              <div>
                <h3 className="oga-meth-sources__tile-name">{s.name}</h3>
                <p className="oga-meth-sources__tile-provider">{s.provider}</p>
              </div>
              <p className="oga-meth-sources__tile-body">{s.body}</p>
              <div className="oga-meth-sources__tile-meta">
                <div>
                  <div className="oga-meth-sources__meta-key">Coverage</div>
                  <div className="oga-meth-sources__meta-val">{s.coverage}</div>
                </div>
                <div>
                  <div className="oga-meth-sources__meta-key">Cadence</div>
                  <div className="oga-meth-sources__meta-val">{s.cadence}</div>
                </div>
                <div>
                  <div className="oga-meth-sources__meta-key">Grain</div>
                  <div className="oga-meth-sources__meta-val">{s.grain}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── 3 — Store + fetch modes ─────── */

function SectionStore() {
  return (
    <section id="store" className="oga-section-quiet">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">03</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>How we store it</span>
          </div>
          <h2 className="oga-meth__h2">Some data is kept, some is fetched live.</h2>
          <p className="oga-meth__lead">
            Slower-moving data like deprivation, prices and crime is kept in our
            own store, so it returns fast and stays consistent. Faster-moving data
            like schools, local amenities and flood risk is fetched live from the
            source each time you ask. Every response tells you which.
          </p>
        </header>

        <div className="oga-meth-store__grid">
          <section className="oga-meth-store__panel" aria-label="Store schema">
            <h3 className="oga-meth-store__panel-title">What we keep</h3>
            <div className="oga-meth-store__tables">
              {STORE_TABLES.map((t) => (
                <div key={t.name} className="oga-meth-store__table-row">
                  <div className="oga-meth-store__table-name">{t.name}</div>
                  <p className="oga-meth-store__table-desc">{t.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="oga-meth-store__modes" aria-label="How each number was sourced">
            <h3 className="oga-meth-store__panel-title">How each number was sourced</h3>
            {STORE_MODES.map((m) => (
              <div key={m.tag} className="oga-meth-store__mode">
                <div className="oga-meth-store__mode-head">
                  <span className="oga-meth-store__mode-tag">{m.tag}</span>
                </div>
                <p className="oga-meth-store__mode-desc">{m.body}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </section>
  );
}

/* ─────── 4 — Normalization ─────── */

function SectionNormalization() {
  return (
    <section id="normalization" className="oga-section-hero">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">04</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Normalization</span>
          </div>
          <h2 className="oga-meth__h2">Country-scoped percentiles, never cross-border.</h2>
          <p className="oga-meth__lead">
            Every value is ranked against comparable areas and kept up to date.
            Each country (England, Wales and Scotland) is ranked within itself,
            because their deprivation indices are built differently and are not
            comparable across the border.
          </p>
        </header>

        <div className="oga-meth-norm__scopes">
          <article className="oga-meth-norm__scope">
            <div className="oga-meth-norm__scope-head">
              <span className="oga-meth-norm__scope-name">National</span>
              <span className="oga-status oga-status-green oga-meth-norm__scope-status">Live</span>
            </div>
            <p className="oga-meth-norm__scope-body">
              Rank each area against the whole country. England is ranked against
              England, Wales against Wales, and Scotland against Scotland.
            </p>
          </article>
          <article className="oga-meth-norm__scope">
            <div className="oga-meth-norm__scope-head">
              <span className="oga-meth-norm__scope-name">Regional</span>
              <span className="oga-status oga-status-green oga-meth-norm__scope-status">Live</span>
            </div>
            <p className="oga-meth-norm__scope-body">
              Rank each area against its own region instead, so a strong area in a
              quieter region stands out rather than being flattened by the national
              picture.
            </p>
          </article>
        </div>

        {/* AR-410: live example of the national-vs-regional split. Same
            query, same signal, only ?scope= differs. National dumps
            you into prime London; regional gives you the top LSOA of
            each ONS region. */}
        <div className="oga-meth-norm__example">
          <div className="oga-meth-norm__example-head">
            <span className="oga-meth-norm__example-tag">Live example</span>
            <span className="oga-meth-norm__example-title">
              Top-5 most expensive LSOAs in England, by scope
            </span>
          </div>
          <p className="oga-meth-norm__example-lead">
            The same signal, the same country, the same shortlist size, only the
            way the ranking is scoped changes.
          </p>
          <div className="oga-meth-norm__example-cols">
            <div className="oga-meth-norm__example-col">
              <div className="oga-meth-norm__example-col-head">
                <span className="oga-meth-norm__example-col-name">National ranking</span>
              </div>
              <ol className="oga-meth-norm__example-list">
                <li>
                  <span className="oga-meth-norm__example-val">&pound;16.3M</span>
                  <span className="oga-meth-norm__example-place">Kensington and Chelsea 007E</span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;11.3M</span>
                  <span className="oga-meth-norm__example-place">Westminster 019E</span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;8.6M</span>
                  <span className="oga-meth-norm__example-place">Westminster 018D</span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;6.8M</span>
                  <span className="oga-meth-norm__example-place">Westminster 003C</span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;6.7M</span>
                  <span className="oga-meth-norm__example-place">Kensington and Chelsea 014B</span>
                </li>
              </ol>
            </div>
            <div className="oga-meth-norm__example-col">
              <div className="oga-meth-norm__example-col-head">
                <span className="oga-meth-norm__example-col-name">Regional ranking</span>
              </div>
              <ol className="oga-meth-norm__example-list">
                <li>
                  <span className="oga-meth-norm__example-val">&pound;16.3M</span>
                  <span className="oga-meth-norm__example-place">
                    Kensington and Chelsea 007E <em>&mdash; London</em>
                  </span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;3.9M</span>
                  <span className="oga-meth-norm__example-place">
                    Oxford 008F <em>&mdash; South East</em>
                  </span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;2.8M</span>
                  <span className="oga-meth-norm__example-place">
                    Broadland 002C <em>&mdash; East of England</em>
                  </span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;985k</span>
                  <span className="oga-meth-norm__example-place">
                    Oadby and Wigston 010C <em>&mdash; East Midlands</em>
                  </span>
                </li>
                <li>
                  <span className="oga-meth-norm__example-val">&pound;970k</span>
                  <span className="oga-meth-norm__example-place">
                    Northumberland 043C <em>&mdash; North East</em>
                  </span>
                </li>
              </ol>
            </div>
          </div>
          <p className="oga-meth-norm__example-caveat">
            National returns five prime-London LSOAs. Regional returns one from each of five different
            ONS regions &mdash; the top of each market. Kensington and Chelsea 007E appears in both because
            it is #1 in London <em>and</em> #1 nationally.
          </p>
        </div>

        <dl className="oga-meth-stats">
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Direction</dt>
            <dd className="oga-meth-stats__val">Ascending</dd>
            <div className="oga-meth-stats__sub">0 lowest · 1 highest</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">England LSOAs</dt>
            <dd className="oga-meth-stats__val">33,755</dd>
            <div className="oga-meth-stats__sub">2021 boundaries</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Wales LSOAs</dt>
            <dd className="oga-meth-stats__val">1,917</dd>
            <div className="oga-meth-stats__sub">2011 boundaries</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Scotland data zones</dt>
            <dd className="oga-meth-stats__val">6,976</dd>
            <div className="oga-meth-stats__sub">2011 boundaries</div>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ─────── 5 — Time-series moat (DARK) ─────── */

function SectionMoat() {
  return (
    <section id="moat" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">05</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Historical snapshots</span>
          </div>
          <h2 className="oga-meth__h2">A monthly record that only ever grows.</h2>
          <p className="oga-meth__lead">
            Each month we add a fresh snapshot of every signal in every area. We
            only ever add to that history, never overwrite it, so past values stay
            exactly as they were measured and any figure can be reproduced months
            later. It is area context that cannot be recreated after the fact.
          </p>
        </header>

        <div className="oga-meth-moat__row">
          <article className="oga-meth-moat__card">
            <div className="oga-meth-moat__card-name">Never overwritten</div>
            <p className="oga-meth-moat__card-body">
              A correction shows up as the next month&rsquo;s value, so a number you
              saw before stays exactly as it was, and stays reproducible.
            </p>
          </article>
          <article className="oga-meth-moat__card">
            <div className="oga-meth-moat__card-name">Always reproducible</div>
            <p className="oga-meth-moat__card-body">
              Because the history never changes, a figure you cite today returns
              the same figure when you or an auditor check it months from now.
            </p>
          </article>
          <article className="oga-meth-moat__card">
            <div className="oga-meth-moat__card-name">Compounding</div>
            <p className="oga-meth-moat__card-body">
              The record gets deeper every month, building up area history that
              nobody can backfill after the fact.
            </p>
          </article>
        </div>

        <dl className="oga-meth-stats">
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">History so far</dt>
            <dd className="oga-meth-stats__val">24 months</dd>
            <div className="oga-meth-stats__sub">and growing</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Coverage</dt>
            <dd className="oga-meth-stats__val">3 nations</dd>
            <div className="oga-meth-stats__sub">England · Wales · Scotland</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Updated</dt>
            <dd className="oga-meth-stats__val">Monthly</dd>
            <div className="oga-meth-stats__sub">a new snapshot each month</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Past values</dt>
            <dd className="oga-meth-stats__val">Preserved</dd>
            <div className="oga-meth-stats__sub">never overwritten</div>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ─────── 6 — Derived signals ─────── */

function SectionDerived() {
  return (
    <section id="derived" className="oga-section-quiet">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">06</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Derived signals</span>
          </div>
          <h2 className="oga-meth__h2">Signals that show movement, not just a snapshot.</h2>
          <p className="oga-meth__lead">
            As well as today&apos;s numbers, we work out how areas are changing, so
            you see direction, not just a single reading. Each of these comes with
            its own time window and its own confidence.
          </p>
        </header>

        <div className="oga-meth-derived__cards">
          {DERIVED_SIGNALS.map((s) => (
            <article key={s.name} className="oga-meth-derived__card">
              <h3 className="oga-meth-derived__card-name">{s.name}</h3>
              <p className="oga-meth-derived__card-desc">{s.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── 7 — Scoring presets ─────── */

function SectionScoring() {
  return (
    <section id="scoring" className="oga-section-hero">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">07</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Scoring</span>
          </div>
          <h2 className="oga-meth__h2">One score, from the same seven categories.</h2>
          <p className="oga-meth__lead">
            A score turns an area&apos;s signals into a single 0 to 100 number. Every
            preset scores the same seven categories; the preset only changes how
            they are weighted for its use case. The scoring is deterministic, so
            the same inputs always return the same score.
          </p>
        </header>

        <div className="oga-meth-scoring__cats" aria-label="The seven scoring categories">
          {SCORING_CATEGORIES.map((c) => (
            <span key={c} className="oga-meth-scoring__cat">{c}</span>
          ))}
        </div>

        <div className="oga-meth-scoring__grid">
          {SCORING_PROFILES.map((p) => (
            <article key={p.slug} className="oga-meth-scoring__preset">
              <div className="oga-meth-scoring__preset-glyph" aria-hidden>{p.Glyph()}</div>
              <h3 className="oga-meth-scoring__preset-name">{p.name}</h3>
              <p className="oga-meth-scoring__preset-purpose">{p.use}</p>
            </article>
          ))}
        </div>

        <p className="oga-meth-scoring__foot">
          You can re-weight the seven categories for a single request, or save a
          weighting against your organisation and reuse it. Every response is
          stamped with the engine version that produced the score, so you can pin
          it and reproduce the exact number later.
        </p>
      </div>
    </section>
  );
}

/* ─────── 8 — Peers / insights / forecast ─────── */

function SectionPeersInsightsForecast() {
  return (
    <section id="peers-insights-forecast" className="oga-section-quiet">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">08</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Derived surfaces</span>
          </div>
          <h2 className="oga-meth__h2">Similarity, anomaly, projection.</h2>
          <p className="oga-meth__lead">
            Three derived surfaces over the store. Each one is honest about what it is, what it isn&rsquo;t,
            and what the defaults assume.
          </p>
        </header>

        <div className="oga-meth-derived3">
          {DERIVED_THREE.map((c) => (
            <article key={c.num} className="oga-meth-derived3__card">
              <div className="oga-meth-derived3__card-num">{c.num}</div>
              <h3 className="oga-meth-derived3__card-name">{c.name}</h3>
              <code className="oga-meth-derived3__card-endpoint">{c.endpoint}</code>
              <p className="oga-meth-derived3__card-body">{c.body}</p>
              <p className="oga-meth-derived3__card-honest">{c.honest}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── 9 — Intelligence query plane (DARK) ─────── */

function SectionIntelligence() {
  return (
    <section id="intelligence" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">09</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Ask a question</span>
          </div>
          <h2 className="oga-meth__h2">Ask in plain English, get an answer you can check.</h2>
          <p className="oga-meth__lead">
            Ask a question in plain English and it is turned into a precise query.
            You get the answer and the exact query behind it, so every result can
            be reviewed and run again. Prefer to be exact? Send the typed query
            yourself and skip the AI entirely.
          </p>
        </header>

        <div className="oga-meth-intel__row">
          <ul className="oga-meth-intel__ops">
            {PLAN_OPS.map((op) => (
              <li key={op.name} className="oga-meth-intel__op">
                <span className="oga-meth-intel__op-name">{op.name}</span>
                <span className="oga-meth-intel__op-desc">{op.desc}</span>
              </li>
            ))}
          </ul>

          <div className="oga-meth-intel__sample">
            <div className="oga-meth-intel__sample-head">
              <span>Your question</span>
              <span>in plain English</span>
            </div>
            <div className="oga-meth-intel__sample-body">
              <span className="oga-meth-intel__nl">
                &ldquo;English neighbourhoods under &pound;250k where prices are rising,
                crime is below average and deprivation is low, best growth first,
                top five.&rdquo;
              </span>

              <div className="oga-meth-intel__sample-divider">
                Understood as: rank English areas, keep the ones under &pound;250k with
                prices rising, crime in the better half and deprivation in the
                better half, sort by growth, and return the top five, with the plan
                handed back so you can run it again.
              </div>
            </div>
          </div>
        </div>

        <dl className="oga-meth-stats">
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Ask in</dt>
            <dd className="oga-meth-stats__val">Plain English</dd>
            <div className="oga-meth-stats__sub">or send a typed query</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">You can</dt>
            <dd className="oga-meth-stats__val">Rank &amp; compare</dd>
            <div className="oga-meth-stats__sub">areas across any signals</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">And</dt>
            <dd className="oga-meth-stats__val">Find similar areas</dd>
            <div className="oga-meth-stats__sub">outliers and forecasts too</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Every result</dt>
            <dd className="oga-meth-stats__val">Replayable</dd>
            <div className="oga-meth-stats__sub">the plan comes back with it</div>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ─────── 10 — Confidence ─────── */

function SectionConfidence() {
  return (
    <section id="confidence" className="oga-section-quiet">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">10</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Confidence</span>
          </div>
          <h2 className="oga-meth__h2">Every number tells you how sure we are.</h2>
          <p className="oga-meth__lead">
            Every value comes with a confidence level and a short, plain-English
            reason. It reflects how fresh the data is, how large the sample is,
            whether we had to fall back to another source, and how much the signal
            moves around.
          </p>
        </header>

        <div className="oga-meth-conf__rubric" role="table" aria-label="Confidence rubric">
          <div className="oga-meth-conf__row" role="row">
            <div role="columnheader">Level</div>
            <div role="columnheader">What it means</div>
            <div role="columnheader">Example</div>
          </div>
          {CONFIDENCE_BANDS.map((b) => (
            <div key={b.band} className="oga-meth-conf__row" role="row">
              <div className="oga-meth-conf__band" role="cell">{b.band}</div>
              <div className="oga-meth-conf__criteria" role="cell">{b.criteria}</div>
              <div className="oga-meth-conf__example" role="cell">{b.example}</div>
            </div>
          ))}
        </div>

        <p className="oga-meth-conf__gating">
          Categories that are inferred rather than directly measured are capped at
          medium confidence by design. And when we watch an area for change, a move
          backed by too little data is held back rather than flagged, so a one-off
          blip never triggers a false alarm.
        </p>
      </div>
    </section>
  );
}

/* ─────── 11 — Reproducibility + versioning ─────── */

function SectionVersioning() {
  return (
    <section id="versioning" className="oga-section-hero">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">11</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Reproducibility &amp; versioning</span>
          </div>
          <h2 className="oga-meth__h2">Engine version stamped on every response.</h2>
          <p className="oga-meth__lead">
            Every response is stamped with the engine version that produced it, so
            you always know which version a number came from. You can pin a single
            request to a specific version, or pin your whole organisation, and get
            the same numbers back for as long as you need them.
          </p>
        </header>

        <div className="oga-meth-versioning__grid">
          <div className="oga-meth-versioning__semver">
            <div className="oga-meth-versioning__semver-row">
              <div>Bump</div>
              <div>Meaning</div>
            </div>
            {SEMVER.map((s) => (
              <div key={s.tag} className="oga-meth-versioning__semver-row">
                <div className="oga-meth-versioning__semver-tag">{s.tag}</div>
                <div className="oga-meth-versioning__semver-desc">{s.desc}</div>
              </div>
            ))}
          </div>

          <article className="oga-meth-versioning__current">
            <div className="oga-meth-versioning__current-label">Current engine</div>
            <div className="oga-meth-versioning__current-version">v{METHODOLOGY_VERSION}</div>
            <p className="oga-meth-versioning__current-summary">{current.summary}</p>
            <div className="oga-meth-versioning__current-meta">
              <span>
                <span className="oga-meth-versioning__current-meta-key">released</span>
                <span className="oga-meth-versioning__current-meta-val">{current.released_at}</span>
              </span>
              <span>
                <span className="oga-meth-versioning__current-meta-key">history</span>
                <span className="oga-meth-versioning__current-meta-val">{METHODOLOGY_VERSIONS.length} versions</span>
              </span>
            </div>
          </article>

          <aside className="oga-meth-versioning__history" aria-label="Engine version history">
            <div className="oga-meth-versioning__history-label">Version history</div>
            {[...METHODOLOGY_VERSIONS].reverse().map((v) => (
              <div
                key={v.version}
                className={`oga-meth-versioning__version${v.version === METHODOLOGY_VERSION ? " oga-meth-versioning__version--current" : ""}`}
              >
                <div className="oga-meth-versioning__version-head">
                  <span className="oga-meth-versioning__version-badge">v{v.version}</span>
                  <span className="oga-meth-versioning__version-date">{v.released_at}</span>
                  {v.version === METHODOLOGY_VERSION && (
                    <span className="oga-meth-versioning__version-current-tag">current</span>
                  )}
                </div>
                <p className="oga-meth-versioning__version-summary">{v.summary}</p>
                <ul className="oga-meth-versioning__version-changes">
                  {v.changes.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>
        </div>

        <p className="oga-meth-versioning__pin">
          Pinning your whole organisation is owner-only, because it matters for
          regulator-facing audits. A single request can still ask for the latest
          when you need it, and older pinned versions stay available for as long as
          you rely on them.
        </p>
      </div>
    </section>
  );
}

/* ─────── 12 — Per-org methodology (Levers) ─────── */

type Lever = {
  num: string;
  name: string;
  rbac: "Owner" | "Admin";
  body: string;
  honest: string;
};

const LEVERS: Lever[] = [
  {
    num: "01",
    name: "Signal bundles",
    rbac: "Admin",
    body: "Choose which signals your team's keys can see, so everyone works from the same agreed set.",
    honest: "Ask for a signal outside the set and you get a clear error, never a silent gap.",
  },
  {
    num: "02",
    name: "Scoring presets",
    rbac: "Admin",
    body: "Save a scoring weighting for your organisation and reuse it across the team, so every score is worked out the same way and can be replayed in an audit.",
    honest: "The engine itself is unchanged; only the weighting is yours.",
  },
  {
    num: "03",
    name: "Version pinning",
    rbac: "Owner",
    body: "Pin your whole organisation to a specific engine version, so every score stays reproducible for as long as you need it.",
    honest: "Owner-only, because pinning matters for regulator-facing audits. A single request can still override it.",
  },
  {
    num: "04",
    name: "Peer groups",
    rbac: "Admin",
    body: "Define your own set of areas, so \"similar areas\" means similar within your portfolio, not the whole country.",
    honest: "Available today, and it does not change how anyone else's results are worked out.",
  },
];

function SectionLevers() {
  return (
    <section id="levers" className="oga-section-hero">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">12</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Per-organisation methodology</span>
          </div>
          <h2 className="oga-meth__h2">Four Levers shape how the API behaves for your keys.</h2>
          <p className="oga-meth__lead">
            Levers are the controls that shape how the API behaves for your
            organisation. All four are opt-in, so if you leave them alone
            everything works exactly as it does by default. Role-based access,
            white-labelling and IP allowlisting sit alongside them.
          </p>
        </header>

        <div className="oga-meth-levers__grid">
          {LEVERS.map((l) => (
            <article key={l.num} className="oga-meth-levers__card">
              <div className="oga-meth-levers__card-head">
                <span className="oga-meth-levers__card-num">{l.num}</span>
                <span className="oga-meth-levers__card-rbac">{l.rbac}-only</span>
              </div>
              <h3 className="oga-meth-levers__card-name">{l.name}</h3>
              <p className="oga-meth-levers__card-body">{l.body}</p>
              <p className="oga-meth-levers__card-honest">{l.honest}</p>
            </article>
          ))}
        </div>

        <p className="oga-meth-levers__foot">
          Role-based access, per-organisation white-labelling and per-key IP
          allowlisting round out the controls. The full detail lives in{" "}
          <Link href="/docs#levers" className="oga-meth-levers__foot-link">
            the docs <span aria-hidden>→</span>
          </Link>.
        </p>
      </div>
    </section>
  );
}

/* ─────── 13 — Scope and limitations ─────── */

function SectionScope() {
  return (
    <section id="scope" className="oga-section-quiet">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">13</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Scope &amp; limitations</span>
          </div>
          <h2 className="oga-meth__h2">What this is, and what it isn&rsquo;t.</h2>
          <p className="oga-meth__lead">
            Said up front to save reviewer time. The system is decision-grade screening + analysis; not
            valuation, not lending, not address-level today.
          </p>
        </header>

        <div className="oga-meth-scope__grid">
          {SCOPE_NOT.map((s) => (
            <article key={s.title} className="oga-meth-scope__card">
              <span className="oga-meth-scope__card-tag">{s.tag}</span>
              <h3 className="oga-meth-scope__card-title">{s.title}</h3>
              <p className="oga-meth-scope__card-body">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── 14 — Audit artefacts ─────── */

function SectionAudit() {
  return (
    <section id="audit" className="oga-section-hero">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">14</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Audit artefacts</span>
          </div>
          <h2 className="oga-meth__h2">Everything we publish for audit.</h2>
          <p className="oga-meth__lead">
            Five public artefacts, four of them outside this page. The fifth is this page.
          </p>
        </header>

        <div className="oga-meth-audit__grid">
          {AUDIT.map((a) => {
            const inner = (
              <>
                <span className="oga-meth-audit__item-num">{a.num}</span>
                <h3 className="oga-meth-audit__item-name">{a.name}</h3>
                <p className="oga-meth-audit__item-desc">{a.desc}</p>
                <span className="oga-meth-audit__item-link">
                  {a.external ? "Open on GitHub" : "Open"}
                  <span aria-hidden>→</span>
                </span>
              </>
            );

            if (a.external) {
              return (
                <a
                  key={a.num}
                  className="oga-meth-audit__item"
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {inner}
                </a>
              );
            }

            return (
              <Link key={a.num} className="oga-meth-audit__item" href={a.href}>
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-meth__container--narrow oga-meth-cta__inner">
        <h2 className="oga-meth-cta__title">
          Build on the data layer underneath UK property workflows.
        </h2>
        <p className="oga-meth-cta__lead">
          A typed signal API, four product surfaces, monthly time-series history, and org-level
          methodology pinning. Same answer, every time you ask.
        </p>
        <div className="oga-meth-cta__buttons">
          <Link href={DEMO_URL} className="oga-btn oga-btn-primary">
            Book a demo
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            Read the docs
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
