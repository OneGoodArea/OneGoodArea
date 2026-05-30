"use client";

import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  getCurrentMethodology,
} from "@/lib/methodology-versions";
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
    body: "School inspection ratings — Outstanding, Good, Requires Improvement, Inadequate — within 1.5km of postcode. England only.",
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
  { name: "geo_entities", desc: "Canonical area registry: LSOAs, MSOAs, LADs, regions, with boundary version (2011 / 2021)." },
  { name: "geo_lookup", desc: "ONS NSPL/ONSPD spine: postcode → OA / LSOA / MSOA / LAD / region. 1.8M postcodes loaded." },
  { name: "source_snapshots", desc: "One row per refresh run. Captures source name, captured_at, record count, optional sha. The audit anchor." },
  { name: "signals", desc: "Catalog of every signal we expose. signal_key, label, direction, unit, source, description." },
  { name: "signal_values", desc: "One row per (signal_key, geo_type, geo_code). Current value, normalized_value, source_snapshot_id, engine_version." },
  { name: "signal_percentiles", desc: "Per-scope percentile rank, 0 to 100. Computed in-DB via PERCENT_RANK() window function." },
  { name: "signal_timeseries", desc: "Append-only history. PK includes observed_period; INSERT … ON CONFLICT DO NOTHING — corrections surface as next period, never overwrite." },
];

/* ───────────────────────────── store fetch modes */

const STORE_MODES: { tag: string; body: string }[] = [
  { tag: "live", body: "Every contributing signal was fetched from a live source on this request. The fallback path; happens when the store has no row for an area." },
  { tag: "store", body: "Every contributing signal was read from the persisted store. No live calls were made. The path that scales." },
  { tag: "hybrid", body: "A mix — some signals store-served, some live-served on this request. Honest about partial coverage during the live-to-store migration." },
];

/* ───────────────────────────── derived signals (ADRs 0018, 0020-0024) */

type DerivedSignal = {
  key: string;
  desc: string;
  window: string;
  conf: string;
};

const DERIVED_SIGNALS: DerivedSignal[] = [
  {
    key: "property.price_change_pct_yoy",
    desc: "Count-weighted calendar-year YoY. Median weighted by transaction count, latest year vs prior year.",
    window: "calendar",
    conf: "0.85",
  },
  {
    key: "crime.total_12m_change_pct_yoy",
    desc: "Rolling 12-month sum vs prior 12-month sum. Like-for-like windows; full-coverage guard.",
    window: "rolling 12m",
    conf: "0.85",
  },
  {
    key: "property.transaction_count_change_pct_yoy",
    desc: "Rolling 12-month transaction-count YoY. Surfaces market liquidity shifts independent of price.",
    window: "rolling 12m",
    conf: "0.85",
  },
  {
    key: "property.median_price_change_pct_6m",
    desc: "Latest 6-month window vs prior 6-month window. Count-weighted; full-window guard each side.",
    window: "6m",
    conf: "0.85",
  },
  {
    key: "crime.total_6m_change_pct",
    desc: "6-month crime momentum. Strict full-window guard on both sides.",
    window: "6m",
    conf: "0.85",
  },
  {
    key: "crime.monthly_count_trend_slope_24m",
    desc: "Postgres regr_slope over a synthetic monthly index. More robust than two-point YoY at LSOA grain.",
    window: "24m (min 18)",
    conf: "0.80",
  },
  {
    key: "property.transaction_count_trend_slope_24m",
    desc: "24-month linear-regression slope of transaction count. Multiply by 12 for annualized direction.",
    window: "24m (min 18)",
    conf: "0.80",
  },
  {
    key: "crime.total_12m_peer_relative_z",
    desc: "Z-score against the area's 20-LSOA peer cohort: (target − peer_avg) / peer_stddev. Min 5 peers.",
    window: "current",
    conf: "0.80",
  },
  {
    key: "property.median_price_peer_relative_z",
    desc: "Peer-relative price z-score. Materialized peer graph; same distance metric as POST /v1/peers.",
    window: "current",
    conf: "0.80",
  },
];

/* ───────────────────────────── 4 scoring presets (ADR 0008) */

type Preset = {
  slug: string;
  name: string;
  purpose: string;
  dims: string[];
};

const PRESETS: Preset[] = [
  {
    slug: "moving",
    name: "Moving",
    purpose: "Origination. For someone choosing where to live.",
    dims: ["Safety", "Schools", "Transport", "Amenities", "Cost of Living"],
  },
  {
    slug: "business",
    name: "Business",
    purpose: "Site selection. For commercial location decisions.",
    dims: ["Foot Traffic", "Competition", "Transport", "Spending Power", "Commercial Costs"],
  },
  {
    slug: "investing",
    name: "Investing",
    purpose: "Investment underwrite. For acquisitions and portfolio.",
    dims: ["Price Growth", "Rental Yield", "Regeneration", "Tenant Demand", "Risk Factors"],
  },
  {
    slug: "research",
    name: "Research",
    purpose: "Reference baseline. The default preset.",
    dims: ["Safety", "Transport", "Amenities", "Demographics", "Environment"],
  },
];

/* ───────────────────────────── intelligence plan ops (ADR 0017, 0019, 0023-0025) */

const PLAN_OPS: { name: string; desc: string }[] = [
  { name: "rank_areas",     desc: "Filter + sort LSOAs across signals with AND semantics (eq, lt, lte, gt, gte, between, percentile_*)" },
  { name: "get_area",       desc: "Full signal catalog for an area (geo_code, postcode, or area name)" },
  { name: "score_area",     desc: "Composite score for an area; preset, custom weights, or saved preset_id" },
  { name: "find_peers",     desc: "k-NN similarity search over normalized signal vectors (default k=20)" },
  { name: "find_insights",  desc: "Rank LSOAs by |peer-relative z| for a derived signal (anomaly screening)" },
  { name: "find_forecast",  desc: "Linear-regression projection of one monthly signal at one LSOA (default 24m window, 12m horizon)" },
];

/* ───────────────────────────── peers / insights / forecast (§ 8) */

const DERIVED_THREE: { num: string; name: string; endpoint: string; body: string; honest: string }[] = [
  {
    num: "08.1",
    name: "Peers",
    endpoint: "POST /v1/peers",
    body: "k nearest LSOAs to a target. Euclidean distance over normalized values, dimension-mean-squared (AVG, not SUM), default k=20, max k=200, min 3 overlapping signals.",
    honest: "Distance is symmetric and bounded in [0,1]. No per-signal weighting in v1.",
  },
  {
    num: "08.2",
    name: "Insights",
    endpoint: "POST /v1/insights",
    body: "Anomaly screening: rank LSOAs by |peer-relative z|. Materialized peer graph (~840k assignments). Default k=50, max k=500. Optional |z| threshold.",
    honest: "Peer math is precomputed offline. No request-time recompute.",
  },
  {
    num: "08.3",
    name: "Forecast",
    endpoint: "POST /v1/forecast",
    body: "Linear regression over signal_timeseries: regr_slope, regr_intercept, regr_r2, regr_syy. Default window 24 months, horizon 12. Constant ±2·residual_stderr confidence band.",
    honest: "This is not a learned model. Not ARIMA, not Holt-Winters, not Prophet. CI does not widen with horizon distance.",
  },
];

/* ───────────────────────────── confidence rubric (v2.0.0, refined v2.0.1) */

const CONFIDENCE_BANDS: { band: string; value: string; criteria: string; example: string }[] = [
  { band: "HIGH",   value: "1.0", criteria: "Fresh primary data, sufficient sample, low volatility.", example: "Crime from Police.uk last 12 months; Prices with ≥50 transactions and ≤15% YoY swing." },
  { band: "MEDIUM", value: "0.7", criteria: "Partial fallback, older dataset, smaller sample, or higher volatility.", example: "WIMD 2019 / SIMD 2020 (older than IMD 2025); Schools in Wales/Scotland; Property with 20-50 transactions or wide YoY swing." },
  { band: "LOW",    value: "0.4", criteria: "Full proxy fallback or sparse sample.", example: "Property with fewer than 20 transactions per period." },
  { band: "NONE",   value: "0.2", criteria: "No usable data; signal returns null with reason.", example: "Service unavailable, coverage gap, or out-of-region postcode." },
];

/* ───────────────────────────── semver convention */

const SEMVER: { tag: string; desc: string }[] = [
  { tag: "MAJOR", desc: "Breaking change to dimension structure, intent set, or core weight. Anything that would invalidate prior scores." },
  { tag: "MINOR", desc: "New dimension, new data source, new intent. Additive — old responses still parse." },
  { tag: "PATCH", desc: "Formula tuning, threshold adjustment, confidence rubric refinement. Score values stay byte-identical." },
];

/* ───────────────────────────── scope-not (§ 12) */

const SCOPE_NOT: { tag: string; title: string; body: string }[] = [
  {
    tag: "Not",
    title: "An automated valuation model",
    body: "OneGoodArea does not predict the market value of a specific property. Use a dedicated AVM for that.",
  },
  {
    tag: "Not",
    title: "A credit decisioning model",
    body: "Not a predictor of individual default, affordability, or creditworthiness. Tier-3 enrichment input only.",
  },
  {
    tag: "Not",
    title: "Address-level",
    body: "LSOA grain is the floor today. Address-level scoring via OS AddressBase Premium + UPRN is on the roadmap (AR-134).",
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

/* ───────────────────────────── audit artefacts (§ 13) */

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
  {
    num: "14.4",
    name: "ADR repository",
    desc: "Every architectural decision since signal-first, with rationale and trade-offs.",
    href: "https://github.com/OneGoodArea/OneGoodArea/tree/main/docs/adr",
    external: true,
  },
  {
    num: "14.5",
    name: "AI eval harness",
    desc: "Measured planner accuracy. 92.9% on a 14-case curated corpus against claude-sonnet-4-20250514.",
    href: "https://github.com/OneGoodArea/OneGoodArea/tree/main/apps/api/src/modules/intelligence/eval",
    external: true,
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
      <div className="oga-meth__container oga-meth-hero__row">
        <div>
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
            Signal-first infrastructure. Country-scoped percentiles. Monthly time-series snapshots that
            cannot be backfilled. Deterministic engine, version stamped on every response.
          </p>

          <div className="oga-meth-hero__anchors">
            <Link href="#signal" className="oga-meth-hero__anchor">
              Signal primitive
              <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
            </Link>
            <Link href="#data-sources" className="oga-meth-hero__anchor">
              Data sources
              <span className="oga-meth-hero__anchor-arrow" aria-hidden>↓</span>
            </Link>
            <Link href="#intelligence" className="oga-meth-hero__anchor">
              Query plane
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

        <aside className="oga-meth-hero__card" aria-label="Current engine state">
          <div className="oga-meth-hero__card-label">
            <span className="oga-meth-hero__card-dot" aria-hidden />
            Engine in production
          </div>
          <div className="oga-meth-hero__card-row">
            <span className="oga-meth-hero__card-key">engine_version</span>
            <span className="oga-meth-hero__card-val">{METHODOLOGY_VERSION}</span>
          </div>
          <div className="oga-meth-hero__card-row">
            <span className="oga-meth-hero__card-key">released</span>
            <span className="oga-meth-hero__card-val">{current.released_at}</span>
          </div>
          <div className="oga-meth-hero__card-row">
            <span className="oga-meth-hero__card-key">supported</span>
            <span className="oga-meth-hero__card-val">{METHODOLOGY_VERSIONS.length} versions</span>
          </div>
          <div className="oga-meth-hero__card-row">
            <span className="oga-meth-hero__card-key">pinning</span>
            <span className="oga-meth-hero__card-val">X-Engine-Version</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ─────── § 1 — Signal ─────── */

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
          <h2 className="oga-meth__h2">Signal is the public primitive.</h2>
          <p className="oga-meth__lead">
            A signal is one measured, sourced, normalized, percentiled, time-stamped attribute of a UK
            area. Everything above signals is composition. Reports, scores, peers, insights, and
            forecasts are surfaces built on top.
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
                Per-scope rank 0&ndash;100 from PERCENT_RANK(). Today: national-within-country. Regional and
                per-cohort recompute on the roadmap.
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

/* ─────── § 2 — Data sources ─────── */

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

/* ─────── § 3 — Store + fetch modes ─────── */

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
          <h2 className="oga-meth__h2">Live fetch, persisted store, geographic spine.</h2>
          <p className="oga-meth__lead">
            Slow-moving signals (deprivation, prices, crime) live in a persisted store. Live signals
            (Ofsted, OpenStreetMap, flood) call the source on every request. The geographic spine joins
            them.
          </p>
        </header>

        <div className="oga-meth-store__grid">
          <section className="oga-meth-store__panel" aria-label="Store schema">
            <h3 className="oga-meth-store__panel-title">Store tables</h3>
            <div className="oga-meth-store__tables">
              {STORE_TABLES.map((t) => (
                <div key={t.name} className="oga-meth-store__table-row">
                  <div className="oga-meth-store__table-name">{t.name}</div>
                  <p className="oga-meth-store__table-desc">{t.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="oga-meth-store__modes" aria-label="meta.fetch_mode enum">
            <h3 className="oga-meth-store__panel-title">meta.fetch_mode on every response</h3>
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

/* ─────── § 4 — Normalization ─────── */

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
            Percentiles are computed in the database with PERCENT_RANK() window functions and persisted.
            Each country (England, Wales, Scotland) normalizes within itself. IMD 2025, WIMD 2019, and
            SIMD 2020 are different methodologies; we never compare across.
          </p>
        </header>

        <div className="oga-meth-norm__scopes">
          <article className="oga-meth-norm__scope">
            <div className="oga-meth-norm__scope-head">
              <span className="oga-meth-norm__scope-name">scope = &ldquo;national&rdquo;</span>
              <span className="oga-status oga-status-green oga-meth-norm__scope-status">Live</span>
            </div>
            <p className="oga-meth-norm__scope-body">
              Rank within country. The current production scope. England LSOAs ranked against England;
              Wales against Wales; Scotland against Scotland.
            </p>
          </article>
          <article className="oga-meth-norm__scope">
            <div className="oga-meth-norm__scope-head">
              <span className="oga-meth-norm__scope-name">scope = &ldquo;regional&rdquo;</span>
              <span className="oga-status oga-status-yellow oga-meth-norm__scope-status">Roadmap</span>
            </div>
            <p className="oga-meth-norm__scope-body">
              Rank within ONS region (North West, South East, &hellip;). The geographic spine is loaded;
              the per-region percentile recompute job is not yet built.
            </p>
          </article>
          <article className="oga-meth-norm__scope">
            <div className="oga-meth-norm__scope-head">
              <span className="oga-meth-norm__scope-name">scope = &ldquo;peer_group&rdquo;</span>
              <span className="oga-status oga-status-yellow oga-meth-norm__scope-status">Roadmap</span>
            </div>
            <p className="oga-meth-norm__scope-body">
              Rank within a customer-defined Levers cohort. Cohorts themselves ship today (<code>POST
              /v1/orgs/:id/cohorts</code>); per-cohort percentile recompute is the planned step. The
              k-NN peer graph already drives the peer-relative z-score derived signals (see &sect; 06).
            </p>
          </article>
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

/* ─────── § 5 — Time-series moat (DARK) ─────── */

function SectionMoat() {
  return (
    <section id="moat" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">05</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>The moat</span>
          </div>
          <h2 className="oga-meth__h2">Monthly snapshots, immutable per period.</h2>
          <p className="oga-meth__lead">
            Every month, a CLI job appends one row per signal per area to{" "}
            <code>signal_timeseries</code>, keyed by <code>observed_period</code>. INSERT &hellip; ON
            CONFLICT DO NOTHING. Corrections surface as next period&rsquo;s value, never overwrite the past.
            Un-backfillable history that compounds every month.
          </p>
        </header>

        <div className="oga-meth-moat__row">
          <article className="oga-meth-moat__card">
            <div className="oga-meth-moat__card-name">Append-only</div>
            <p className="oga-meth-moat__card-body">
              History is immutable per (signal_key, geo_type, geo_code, observed_period). The primary
              key prevents duplication; the conflict policy prevents overwrite.
            </p>
          </article>
          <article className="oga-meth-moat__card">
            <div className="oga-meth-moat__card-name">Idempotent</div>
            <p className="oga-meth-moat__card-body">
              The append job is one set-based INSERT &hellip; SELECT statement. Re-running a period is a
              no-op. Safe under partial failure and re-deploy.
            </p>
          </article>
          <article className="oga-meth-moat__card">
            <div className="oga-meth-moat__card-name">Granular</div>
            <p className="oga-meth-moat__card-body">
              Prices and crime ingest write monthly history directly; the static-source job (deprivation)
              snapshots at refresh time. Each signal&rsquo;s observed_period reflects its actual cadence.
            </p>
          </article>
        </div>

        <dl className="oga-meth-stats">
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Prices history</dt>
            <dd className="oga-meth-stats__val">24 months</dd>
            <div className="oga-meth-stats__sub">35,606 E&amp;W LSOAs</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Price history rows</dt>
            <dd className="oga-meth-stats__val">626k+</dd>
            <div className="oga-meth-stats__sub">2024-2025 backfill</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Deprivation snapshot</dt>
            <dd className="oga-meth-stats__val">85,280 rows</dd>
            <div className="oga-meth-stats__sub">IMD 2025 · WIMD · SIMD</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Append cadence</dt>
            <dd className="oga-meth-stats__val">Monthly</dd>
            <div className="oga-meth-stats__sub">GitHub Actions cron</div>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ─────── § 6 — Derived signals ─────── */

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
          <h2 className="oga-meth__h2">YoY, momentum, trend slope, peer-relative.</h2>
          <p className="oga-meth__lead">
            Computed in the database from the time-series, persisted alongside raw signals, immediately
            queryable through the typed query plane. Each derived signal carries a documented window and a
            sample-size guard.
          </p>
        </header>

        <div className="oga-meth-derived__table" role="table" aria-label="Derived signals">
          <div className="oga-meth-derived__row oga-meth-derived__row--head" role="row">
            <div className="oga-meth-derived__key" role="columnheader">signal_key</div>
            <div className="oga-meth-derived__desc" role="columnheader">Methodology</div>
            <div className="oga-meth-derived__window" role="columnheader">Window</div>
            <div className="oga-meth-derived__conf" role="columnheader">Confidence</div>
          </div>
          {DERIVED_SIGNALS.map((s) => (
            <div key={s.key} className="oga-meth-derived__row" role="row">
              <div className="oga-meth-derived__key" role="cell">{s.key}</div>
              <div className="oga-meth-derived__desc" role="cell">{s.desc}</div>
              <div className="oga-meth-derived__row-meta">
                <div className="oga-meth-derived__window" role="cell">{s.window}</div>
                <div className="oga-meth-derived__conf" role="cell">{s.conf}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────── § 7 — Scoring presets ─────── */

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
          <h2 className="oga-meth__h2">Deterministic composites, four presets.</h2>
          <p className="oga-meth__lead">
            <code>POST /v1/score</code> aggregates the signal catalog into a 0&ndash;100 composite. Same input,
            same engine version, same output. Four presets cover the canonical workflows; custom weights
            and saved org presets layer on top.
          </p>
        </header>

        <div className="oga-meth-scoring__grid">
          {PRESETS.map((p) => (
            <article key={p.slug} className="oga-meth-scoring__preset">
              <header className="oga-meth-scoring__preset-head">
                <h3 className="oga-meth-scoring__preset-name">{p.name}</h3>
                <span className="oga-meth-scoring__preset-slug">{p.slug}</span>
              </header>
              <p className="oga-meth-scoring__preset-purpose">{p.purpose}</p>
              <ul className="oga-meth-scoring__preset-dims">
                {p.dims.map((d) => <li key={d} className="oga-meth-scoring__preset-dim">{d}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <p className="oga-meth-scoring__foot">
          The frozen v2 engine computes every dimension. Custom weights pass <code>{`{ preset, weights }`}</code>;
          saved organisation presets pass <code>{`{ preset_id }`}</code>. Response carries <code>weights_source</code>
          {" "}(<code>&quot;preset&quot;</code> or <code>&quot;custom&quot;</code>) and the engine version that produced the number.
        </p>
      </div>
    </section>
  );
}

/* ─────── § 8 — Peers / insights / forecast ─────── */

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

/* ─────── § 9 — Intelligence query plane (DARK) ─────── */

function SectionIntelligence() {
  return (
    <section id="intelligence" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-meth__container">
        <header className="oga-meth__header">
          <div className="oga-meth__eyebrow">
            <span className="oga-meth__eyebrow-num">09</span>
            <span className="oga-meth__eyebrow-line" aria-hidden />
            <span>Query plane</span>
          </div>
          <h2 className="oga-meth__h2">AI emits the plan. The database answers.</h2>
          <p className="oga-meth__lead">
            <code>POST /v1/query</code> is a typed JSON grammar with six plan ops. Programmatic <code>{`{plan}`}</code>{" "}
            never touches the LLM. Natural-language <code>{`{question}`}</code> routes through a planner that emits
            the same typed grammar. Every response echoes the executed plan and <code>plan_source</code> so
            every result is replayable.
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
              <span>POST /v1/query</span>
              <span>plan_source: nl</span>
            </div>
            <div className="oga-meth-intel__sample-body">
              <span className="oga-meth-intel__nl">
                &ldquo;England LSOAs with price ≤ £250k AND YoY &gt; 0 AND crime_pct ≤ 50 AND imd_pct ≥ 50,
                sort by YoY desc, limit 5&rdquo;
              </span>

              <div className="oga-meth-intel__sample-divider">
{`{
  "op": "rank_areas",
  "params": {
    "country": "E",
    "signals": [
      { "key": "property.median_price",                  "filter": { "lte": 250000 } },
      { "key": "property.price_change_pct_yoy",          "filter": { "gt": 0 } },
      { "key": "crime.total_12m",                        "filter": { "percentile_lte": 50 } },
      { "key": "deprivation.imd_decile",                 "filter": { "percentile_gte": 50 } }
    ],
    "sort_by": { "signal": "property.price_change_pct_yoy", "direction": "desc" },
    "limit": 5
  }
}`}
              </div>
            </div>
          </div>
        </div>

        <dl className="oga-meth-stats">
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Planner accuracy</dt>
            <dd className="oga-meth-stats__val">92.9%</dd>
            <div className="oga-meth-stats__sub">14-case curated corpus</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Plan ops</dt>
            <dd className="oga-meth-stats__val">6</dd>
            <div className="oga-meth-stats__sub">rank · get · score · peers · insights · forecast</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Filter ops</dt>
            <dd className="oga-meth-stats__val">11</dd>
            <div className="oga-meth-stats__sub">eq · lt · lte · gt · gte · between · percentile_*</div>
          </div>
          <div className="oga-meth-stats__cell">
            <dt className="oga-meth-stats__label">Model under test</dt>
            <dd className="oga-meth-stats__val">claude-sonnet-4</dd>
            <div className="oga-meth-stats__sub">harness measures the seam, not the model</div>
          </div>
        </dl>
      </div>
    </section>
  );
}

/* ─────── § 10 — Confidence ─────── */

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
          <h2 className="oga-meth__h2">Per-signal, source-driven, honest.</h2>
          <p className="oga-meth__lead">
            Every signal value and every score dimension carries <code>confidence</code> (0.0&ndash;1.0) and a
            human-readable <code>confidence_reason</code>. The rubric is fixed; the inputs are sample size,
            freshness, fallback path, and (for property) YoY volatility.
          </p>
        </header>

        <div className="oga-meth-conf__rubric" role="table" aria-label="Confidence rubric">
          <div className="oga-meth-conf__row" role="row">
            <div role="columnheader">Band</div>
            <div role="columnheader">Value</div>
            <div role="columnheader">Criteria</div>
            <div role="columnheader">Example</div>
          </div>
          {CONFIDENCE_BANDS.map((b) => (
            <div key={b.band} className="oga-meth-conf__row" role="row">
              <div className="oga-meth-conf__band" role="cell">{b.band}</div>
              <div className="oga-meth-conf__value" role="cell">{b.value}</div>
              <div className="oga-meth-conf__criteria" role="cell">{b.criteria}</div>
              <div className="oga-meth-conf__example" role="cell">{b.example}</div>
            </div>
          ))}
        </div>

        <p className="oga-meth-conf__gating">
          Inferred-not-measured dimensions (Foot Traffic, Rental Yield, Regeneration, Tenant Demand) cap
          at <code>MEDIUM</code> by design. Monitor change detection gates on{" "}
          <code>min_transactions</code> (default <code>8</code>) so a 2-sale move never fires a webhook.
        </p>
      </div>
    </section>
  );
}

/* ─────── § 11 — Reproducibility + versioning ─────── */

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
            Every response carries <code>engine_version</code> in the body and{" "}
            <code>X-Engine-Version</code> in the headers. Pin a request to a specific version with the
            request header. Pin a whole organisation through Levers methodology pinning.
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
        </div>

        <p className="oga-meth-versioning__pin">
          Org-level methodology pinning is owner-only. <code>PUT /v1/orgs/:id/methodology</code> sets the
          pin; every scoring response from that org&rsquo;s keys stamps the pinned version in{" "}
          <code>X-Engine-Version</code>. Explicit request headers still win over the org pin. The pinned
          row stays in the database even after a version ages out of support, for audit; runtime
          gracefully falls back to latest rather than 500.
        </p>
      </div>
    </section>
  );
}

/* ─────── § 12 — Per-org methodology (Levers) ─────── */

type Lever = {
  num: string;
  name: string;
  endpoint: { verb: string; path: string };
  rbac: "Owner" | "Admin";
  body: string;
  honest: string;
  adr: string;
};

const LEVERS: Lever[] = [
  {
    num: "12.1",
    name: "Signal bundles",
    endpoint: { verb: "POST", path: "/v1/orgs/:id/bundles" },
    rbac: "Admin",
    body: "Named whitelist of signal_keys. Scopes /v1/area, /v1/areas, and /v1/query — the API exposes only the bundle's signals to your keys.",
    honest: "A request for an out-of-bundle signal returns 422 bundle_signal_not_allowed. No silent omission.",
    adr: "ADR 0029",
  },
  {
    num: "12.2",
    name: "Scoring presets",
    endpoint: { verb: "POST", path: "/v1/orgs/:id/presets" },
    rbac: "Admin",
    body: "Save a (base_preset, weights) pair server-side. Call by preset_id from POST /v1/score. Reusable across team members and replayable in audits.",
    honest: "Frozen v2 engine unchanged. weights_source surfaces as \"custom\" on response.",
    adr: "ADR 0030",
  },
  {
    num: "12.3",
    name: "Methodology pinning",
    endpoint: { verb: "PUT", path: "/v1/orgs/:id/methodology" },
    rbac: "Owner",
    body: "Pin the whole org to a specific engine_version. Every scoring response from the org's keys stamps that version in X-Engine-Version.",
    honest: "Owner-only by design: misclicking a pin has high cost for regulator-facing audits. Explicit request header still wins.",
    adr: "ADR 0031",
  },
  {
    num: "12.4",
    name: "Peer cohorts",
    endpoint: { verb: "POST", path: "/v1/orgs/:id/cohorts" },
    rbac: "Admin",
    body: "Named list of LSOA codes (max 10,000). Scopes the candidate pool on /v1/peers — \"find peers in MY universe.\"",
    honest: "Cohorts ship today; per-cohort percentile recompute (scope=peer_group) is on the roadmap.",
    adr: "ADR 0032",
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
            Levers are the per-organisation methodology controls. All four are opt-in: no bundle, no
            preset_id, no pin, no cohort means default behaviour. RBAC, white-label, and IP allowlist
            live alongside on the operational side.
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
              <code className="oga-meth-levers__card-endpoint">
                <span className="oga-meth-levers__card-verb">{l.endpoint.verb}</span> {l.endpoint.path}
              </code>
              <p className="oga-meth-levers__card-body">{l.body}</p>
              <p className="oga-meth-levers__card-honest">{l.honest}</p>
              <span className="oga-meth-levers__card-adr">{l.adr}</span>
            </article>
          ))}
        </div>

        <p className="oga-meth-levers__foot">
          Three-tier RBAC (<code>member</code> / <code>admin</code> / <code>owner</code>),
          per-org white-label (<code>display_name</code> + <code>brand_url</code>), and
          per-key IP allowlist (<code>allowed_ip_cidrs</code>) are documented in full on{" "}
          <Link href="/docs/levers" className="oga-meth-levers__foot-link">
            /docs/levers <span aria-hidden>→</span>
          </Link>{" "}
          <span className="oga-meth-levers__foot-note">(landing in this workstream)</span>.
        </p>
      </div>
    </section>
  );
}

/* ─────── § 13 — Scope and limitations ─────── */

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

/* ─────── § 14 — Audit artefacts ─────── */

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
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
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
