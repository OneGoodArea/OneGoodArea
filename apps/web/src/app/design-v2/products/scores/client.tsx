"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { ScoresIcon } from "../../_shared/product-icons";
import { ProductHero } from "../../_shared/product-hero";
import { ProductEndpointPanel } from "../../_shared/product-endpoint-panel";
import { ProductFinalCta } from "../../_shared/product-final-cta";
import { SCORING_PROFILES } from "@/lib/scoring-profiles";
import { ProductIcpGrid } from "../../_shared/product-icp-grid";
import {
  METHODOLOGY_VERSION,
  getCurrentMethodology,
} from "@/lib/methodology-versions";
import "./scores.css";

/* /products/scores — AR-204 product page #2.

   Pattern parity with /products/signals but Scores-specific visual
   treatment per section. Source of truth:
   docs/DESIGN/AR-204-product-pages-spec-pack.md §2.

   Every claim traces to ADR 0008 (Scores v3) / 0030 (custom presets) /
   0031 (methodology pinning) or apps/api code. Pre-baked specimen w/
   realistic values; deterministic engine; no AI in the scoring path. */

const current = getCurrentMethodology();

/* ============================================================
   Preset definitions — mirrored from PRESET_DIMENSION_KEYS in
   apps/api/src/modules/scoring/score.ts. Each preset has its OWN
   5-dimension set (NOT same 5 re-weighted).
   ============================================================ */

type Preset = "moving" | "business" | "investing" | "research";

type DimensionDef = {
  key: string;
  label: string;
  defaultWeight: number;
};

const PRESET_DIMS: Record<Preset, DimensionDef[]> = {
  moving: [
    { key: "safety_crime",        label: "Safety & Crime",        defaultWeight: 25 },
    { key: "schools_education",   label: "Schools & Education",   defaultWeight: 25 },
    { key: "transport_commute",   label: "Transport & Commute",   defaultWeight: 20 },
    { key: "daily_amenities",     label: "Daily Amenities",       defaultWeight: 15 },
    { key: "cost_of_living",      label: "Cost of Living",        defaultWeight: 15 },
  ],
  business: [
    { key: "foot_traffic_demand", label: "Foot Traffic & Demand", defaultWeight: 30 },
    { key: "competition_density", label: "Competition Density",   defaultWeight: 20 },
    { key: "transport_access",    label: "Transport Access",      defaultWeight: 15 },
    { key: "local_spending_power",label: "Local Spending Power",  defaultWeight: 20 },
    { key: "commercial_costs",    label: "Commercial Costs",      defaultWeight: 15 },
  ],
  investing: [
    { key: "price_growth",                label: "Price Growth",             defaultWeight: 30 },
    { key: "rental_yield",                label: "Rental Yield",             defaultWeight: 25 },
    { key: "regeneration_infrastructure", label: "Regeneration",             defaultWeight: 15 },
    { key: "tenant_demand",               label: "Tenant Demand",            defaultWeight: 20 },
    { key: "risk_factors",                label: "Risk Factors",             defaultWeight: 10 },
  ],
  research: [
    { key: "safety_crime",         label: "Safety & Crime",         defaultWeight: 20 },
    { key: "transport_links",      label: "Transport Links",        defaultWeight: 20 },
    { key: "amenities_services",   label: "Amenities & Services",   defaultWeight: 20 },
    { key: "demographics_economy", label: "Demographics & Economy", defaultWeight: 20 },
    { key: "environment_quality",  label: "Environment Quality",    defaultWeight: 20 },
  ],
};

/* Prebaked specimen scores per (postcode × preset). Values are
   realistic-shaped and consistent with the kind of output the
   deterministic engine produces for the postcode + preset pair. */

type SpecScore = {
  score: number;
  area_type: "urban" | "suburban" | "rural";
  dims: { score: number; confidence: "high" | "med" | "low" }[];
};

const PREBAKED: Record<string, Record<Preset, SpecScore>> = {
  "M1 1AE": {
    moving:    { score: 58, area_type: "urban", dims: [{score:42,confidence:"high"},{score:68,confidence:"high"},{score:84,confidence:"high"},{score:72,confidence:"med"},{score:54,confidence:"med"}] },
    business:  { score: 71, area_type: "urban", dims: [{score:88,confidence:"high"},{score:62,confidence:"high"},{score:84,confidence:"high"},{score:58,confidence:"med"},{score:48,confidence:"med"}] },
    investing: { score: 65, area_type: "urban", dims: [{score:78,confidence:"high"},{score:71,confidence:"med"},{score:64,confidence:"med"},{score:58,confidence:"med"},{score:52,confidence:"high"}] },
    research:  { score: 62, area_type: "urban", dims: [{score:42,confidence:"high"},{score:84,confidence:"high"},{score:72,confidence:"med"},{score:58,confidence:"high"},{score:55,confidence:"med"}] },
  },
  "EC1A 1BB": {
    moving:    { score: 62, area_type: "urban", dims: [{score:35,confidence:"high"},{score:62,confidence:"high"},{score:96,confidence:"high"},{score:88,confidence:"high"},{score:32,confidence:"high"}] },
    business:  { score: 86, area_type: "urban", dims: [{score:95,confidence:"high"},{score:78,confidence:"high"},{score:96,confidence:"high"},{score:92,confidence:"high"},{score:38,confidence:"high"}] },
    investing: { score: 71, area_type: "urban", dims: [{score:48,confidence:"med"},{score:82,confidence:"high"},{score:88,confidence:"high"},{score:84,confidence:"high"},{score:62,confidence:"high"}] },
    research:  { score: 74, area_type: "urban", dims: [{score:35,confidence:"high"},{score:96,confidence:"high"},{score:88,confidence:"high"},{score:82,confidence:"high"},{score:62,confidence:"med"}] },
  },
  "B1 1AA": {
    moving:    { score: 54, area_type: "urban", dims: [{score:45,confidence:"high"},{score:58,confidence:"high"},{score:72,confidence:"high"},{score:65,confidence:"med"},{score:62,confidence:"med"}] },
    business:  { score: 68, area_type: "urban", dims: [{score:78,confidence:"high"},{score:55,confidence:"high"},{score:72,confidence:"high"},{score:55,confidence:"med"},{score:65,confidence:"med"}] },
    investing: { score: 73, area_type: "urban", dims: [{score:86,confidence:"high"},{score:74,confidence:"high"},{score:68,confidence:"med"},{score:62,confidence:"med"},{score:55,confidence:"high"}] },
    research:  { score: 60, area_type: "urban", dims: [{score:45,confidence:"high"},{score:72,confidence:"high"},{score:65,confidence:"med"},{score:58,confidence:"high"},{score:62,confidence:"med"}] },
  },
  "YO1 7PR": {
    moving:    { score: 72, area_type: "suburban", dims: [{score:82,confidence:"high"},{score:78,confidence:"high"},{score:62,confidence:"med"},{score:68,confidence:"med"},{score:72,confidence:"med"}] },
    business:  { score: 58, area_type: "suburban", dims: [{score:55,confidence:"med"},{score:68,confidence:"high"},{score:62,confidence:"med"},{score:52,confidence:"med"},{score:72,confidence:"med"}] },
    investing: { score: 61, area_type: "suburban", dims: [{score:55,confidence:"med"},{score:62,confidence:"med"},{score:58,confidence:"med"},{score:64,confidence:"med"},{score:68,confidence:"high"}] },
    research:  { score: 70, area_type: "suburban", dims: [{score:82,confidence:"high"},{score:62,confidence:"med"},{score:68,confidence:"med"},{score:71,confidence:"high"},{score:76,confidence:"med"}] },
  },
};

const POSTCODES = Object.keys(PREBAKED);
const PRESETS: Preset[] = ["moving", "business", "investing", "research"];

export default function ProductScoresClient() {
  return (
    <div className="oga-root oga-scr">
      <Nav />
      <ProductHero
        Icon={ScoresIcon}
        h1="Scores: deterministic composite scoring."
        lead="One 0-to-100 number per UK area. Four scoring profiles tuned to four workflows: residential origination, commercial site selection, investment underwrite, and research. Each profile uses its own five-dimension set; override the weights per request or save your own recipe against your org. The engine is frozen, golden-tested, and AI never touches the scoring path. Every response stamps the engine version that produced it."
        primaryHref="/sign-up"
        primaryLabel="Get an API key"
        secondaryHref="/methodology"
        secondaryLabel="Read the methodology"
      />
      <SectionSpecimen />
      <SectionPresets />
      <SectionAnatomy />
      <ProductEndpointPanel
        titleId="scr-ep-title"
        title="The primary scoring endpoint plus Levers preset CRUD."
        sub="Plain JSON over HTTPS, Bearer-token auth with the oga_ prefix, all paths under /v1/. Score endpoint is not metered against the monthly API call quota."
        endpoints={EPS}
      />
      <ProductIcpGrid
        titleId="scr-icps-title"
        title="Same engine. Five different buyer workflows."
        sub="What the score is FOR changes per buyer. The deterministic pipeline underneath does not."
        whyLabel="Why Scores"
        icps={ICPS}
      />
      <ProductFinalCta
        titleId="scr-cta-title"
        title="Configurable composite scoring, version-stamped and deterministic."
        lead="Four presets, each with its own five dimensions. Override weights per request or save them as a per-org preset. AI never touches the scoring path. The methodology version is on every response, both body and header."
        primaryHref="/sign-up"
        primaryLabel="Get an API key"
        secondaryHref="/methodology"
        secondaryLabel="Read the methodology"
      />
      <Footer />
    </div>
  );
}

/* ============================================================
   § 01 — Live specimen (DARK) — postcode × preset → score
   ============================================================ */

function SectionSpecimen() {
  const [postcode, setPostcode] = useState<string>(POSTCODES[0]);
  const [preset, setPreset] = useState<Preset>("research");
  const [view, setView] = useState<"rendered" | "json">("rendered");
  const sample = PREBAKED[postcode][preset];
  const dims = PRESET_DIMS[preset];

  return (
    <section
      className="oga-section-dark oga-scr-spec"
      data-oga-surface="dark"
      aria-labelledby="scr-spec-title"
    >
      <div className="oga-scr__wrap">
        <header className="oga-scr-spec__head">
          <div className="oga-scr-spec__eyebrow">
            <span className="oga-scr-spec__eyebrow-mark" aria-hidden />
            <span>Sample response</span>
            <span className="oga-scr-spec__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="scr-spec-title" className="oga-scr-spec__title">
            One score. Five dimensions. The engine version on every response.
          </h2>
          <p className="oga-scr-spec__sub">
            Pick a postcode and a scoring profile. See the composite number,
            the five dimensions that produced it, the weight applied to each,
            and the engine version that ran.
          </p>
        </header>

        <div className="oga-scr-spec__pickers">
          <div className="oga-scr-spec__picker" role="tablist" aria-label="Postcode">
            <span className="oga-scr-spec__picker-label">Postcode</span>
            {POSTCODES.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={p === postcode}
                onClick={() => setPostcode(p)}
                className={`oga-scr-spec__chip${p === postcode ? " oga-scr-spec__chip--active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="oga-scr-spec__picker" role="tablist" aria-label="Scoring profile">
            <span className="oga-scr-spec__picker-label">Profile</span>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={p === preset}
                onClick={() => setPreset(p)}
                className={`oga-scr-spec__chip${p === preset ? " oga-scr-spec__chip--active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="oga-scr-spec__card">
          <span className="oga-scr-spec__tick oga-scr-spec__tick--tl" aria-hidden />
          <span className="oga-scr-spec__tick oga-scr-spec__tick--tr" aria-hidden />
          <span className="oga-scr-spec__tick oga-scr-spec__tick--bl" aria-hidden />
          <span className="oga-scr-spec__tick oga-scr-spec__tick--br" aria-hidden />

          <div className="oga-scr-spec__resp">
            <span className="oga-scr-spec__resp-method">
              <span className="oga-scr-spec__resp-method-verb oga-verb oga-verb--post">POST</span>
              /v1/score
            </span>
            <button
              type="button"
              className="oga-scr-spec__resp-toggle"
              onClick={() => setView(view === "rendered" ? "json" : "rendered")}
              aria-pressed={view === "json"}
            >
              {view === "rendered" ? "View JSON" : "View rendered"}
            </button>
          </div>

          {view === "rendered" ? (
            <RenderedScore postcode={postcode} preset={preset} sample={sample} dims={dims} />
          ) : (
            <JsonScore postcode={postcode} preset={preset} sample={sample} dims={dims} />
          )}
        </div>

        <div className="oga-scr-spec__legend">
          <p className="oga-scr-spec__legend-title">Reading this view</p>
          <dl className="oga-scr-spec__legend-rows">
            <dt><code>preset</code></dt>
            <dd>
              The API parameter that selects the scoring profile. Each profile
              uses a <strong>different</strong> five-dimension set, not the
              same five re-weighted. The residential profile (safety, schools,
              commute, amenities, cost of living) does not share dimensions
              with the investment profile (price growth, yield, regeneration,
              tenant demand, risk factors).
            </dd>
            <dt><code>weights_source</code></dt>
            <dd>
              Either <strong>preset</strong> (defaults used) or
              <strong> custom</strong> (caller supplied weights, or resolved a
              saved org profile via preset_id). The strict 2-value enum lives
              in the contract; saved profiles surface as custom.
            </dd>
            <dt><code>engine_version</code></dt>
            <dd>
              Stamped on the response body and on the
              <strong> X-Engine-Version</strong> header. Org-level methodology
              pinning (Levers) overrides per caller. Supported window today:
              2.0.0, 2.0.1, 2.0.2. All score-equivalent.
            </dd>
          </dl>
        </div>

        <p className="oga-scr-spec__note">
          Sample shape and illustrative values. Real scores vary per release of
          the underlying sources and the engine version your org is pinned to.
        </p>
      </div>
    </section>
  );
}

function RenderedScore({
  postcode,
  preset,
  sample,
  dims,
}: {
  postcode: string;
  preset: Preset;
  sample: SpecScore;
  dims: DimensionDef[];
}) {
  return (
    <>
      <div className="oga-scr-spec__score-panel">
        <div className="oga-scr-spec__score-number">
          <span className="oga-scr-spec__score-number-val">{sample.score}</span>
          <span className="oga-scr-spec__score-number-denom">/ 100</span>
        </div>
        <div className="oga-scr-spec__score-meta">
          <div className="oga-scr-spec__score-meta-row">
            <span className="oga-scr-spec__score-meta-k">area</span>
            <span className="oga-scr-spec__score-meta-v">{postcode}</span>
          </div>
          <div className="oga-scr-spec__score-meta-row">
            <span className="oga-scr-spec__score-meta-k">preset</span>
            <span className="oga-scr-spec__score-meta-v">{preset}</span>
          </div>
          <div className="oga-scr-spec__score-meta-row">
            <span className="oga-scr-spec__score-meta-k">area_type</span>
            <span className="oga-scr-spec__score-meta-v">{sample.area_type}</span>
          </div>
          <div className="oga-scr-spec__score-meta-row">
            <span className="oga-scr-spec__score-meta-k">weights_source</span>
            <span className="oga-scr-spec__score-meta-v">preset</span>
          </div>
          <div className="oga-scr-spec__score-meta-row">
            <span className="oga-scr-spec__score-meta-k">engine_version</span>
            <span className="oga-scr-spec__score-meta-v">{METHODOLOGY_VERSION}</span>
          </div>
        </div>
      </div>

      <h3 className="oga-scr-spec__dims-title">Dimensions</h3>
      <div className="oga-scr-spec__dims">
        {dims.map((d, i) => {
          const dimResult = sample.dims[i];
          return (
            <div key={d.key} className="oga-scr-spec__dim">
              <div>
                <span className="oga-scr-spec__dim-name">{d.label}</span>
                <code className="oga-scr-spec__dim-name-slug">{d.key}</code>
              </div>
              <div className="oga-scr-spec__dim-val">{dimResult.score}</div>
              <div className="oga-scr-spec__dim-bar-row">
                <div className="oga-scr-spec__dim-bar" aria-hidden>
                  <div className="oga-scr-spec__dim-bar-fill" style={{ width: `${dimResult.score}%` }} />
                </div>
                <div className="oga-scr-spec__dim-bar-meta">
                  <span>weight {d.defaultWeight}</span>
                  <span>contributes {((dimResult.score * d.defaultWeight) / 100).toFixed(1)}</span>
                </div>
              </div>
              <div className="oga-scr-spec__dim-conf">
                <span
                  className={`oga-scr-spec__conf-dot${
                    dimResult.confidence === "med"
                      ? " oga-scr-spec__conf-dot--med"
                      : dimResult.confidence === "low"
                      ? " oga-scr-spec__conf-dot--low"
                      : ""
                  }`}
                  aria-label={`Confidence ${dimResult.confidence}`}
                />
                <span>{dimResult.confidence === "high" ? "high" : dimResult.confidence === "med" ? "medium" : "low"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function JsonScore({
  postcode,
  preset,
  sample,
  dims,
}: {
  postcode: string;
  preset: Preset;
  sample: SpecScore;
  dims: DimensionDef[];
}) {
  const totalWeight = dims.reduce((s, d) => s + d.defaultWeight, 0);
  const aggConf =
    sample.dims.reduce((s, r, i) => {
      const c = r.confidence === "high" ? 0.9 : r.confidence === "med" ? 0.65 : 0.35;
      return s + c * dims[i].defaultWeight;
    }, 0) / totalWeight;

  const json = {
    area: postcode,
    preset,
    score: sample.score,
    area_type: sample.area_type,
    dimensions: dims.map((d, i) => ({
      key: d.key,
      label: d.label,
      score: sample.dims[i].score,
      weight: d.defaultWeight,
      confidence: sample.dims[i].confidence === "high" ? 0.9 : sample.dims[i].confidence === "med" ? 0.65 : 0.35,
    })),
    confidence: Number(aggConf.toFixed(2)),
    weights_source: "preset",
    engine_version: METHODOLOGY_VERSION,
  };
  return <pre className="oga-scr-spec__json">{JSON.stringify(json, null, 2)}</pre>;
}

/* ============================================================
   § 02 — The four presets (cream) — 4 columns × 5 dims
   ============================================================ */

/* The four preset cards are now sourced from lib/scoring-profiles —
   shared with the /welcome onboarding flow's intent picker so the
   B2B framing stays in sync across surfaces. AR-251 [AR-248-C]. */
const PRESET_CARDS = SCORING_PROFILES;

function SectionPresets() {
  return (
    <section className="oga-section-quiet oga-scr-presets" aria-labelledby="scr-presets-title">
      <div className="oga-scr__wrap">
        <header className="oga-scr-presets__head">
          <h2 id="scr-presets-title" className="oga-scr-presets__title">
            Four scoring profiles. Each tuned to a different workflow.
          </h2>
          <p className="oga-scr-presets__sub">
            Each profile selects a different five-dimension set plus default
            weights. The matrices are different on purpose: a residential
            origination flow does not care about commercial costs, and an
            investment underwrite does not care about schools. The engine
            should not pretend those are the same.
          </p>
        </header>

        <div className="oga-scr-presets__grid">
          {PRESET_CARDS.map((p) => {
            const Glyph = p.Glyph;
            return (
              <article key={p.slug} className="oga-scr-preset">
                <div className="oga-scr-preset__glyph" aria-hidden>
                  <Glyph />
                </div>
                <h3 className="oga-scr-preset__name">{p.name}</h3>
                <code className="oga-scr-preset__slug">preset: {p.slug}</code>
                <p className="oga-scr-preset__use">{p.use}</p>
                <p className="oga-scr-preset__dims-title">5 Dimensions</p>
                <ul className="oga-scr-preset__dims">
                  {PRESET_DIMS[p.slug].map((d) => (
                    <li key={d.key}>
                      <span className="oga-scr-preset__dim-dot" aria-hidden />
                      <span>{d.label}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* Glyphs moved to lib/scoring-profiles — single source of truth
   shared with the /welcome onboarding intent picker. AR-251. */

/* ============================================================
   § 03 — Anatomy / pipeline (DARK)
   ============================================================ */

function SectionAnatomy() {
  return (
    <section
      className="oga-section-dark oga-scr-anat"
      data-oga-surface="dark"
      aria-labelledby="scr-anat-title"
    >
      <div className="oga-scr__wrap">
        <header className="oga-scr-anat__head">
          <h2 id="scr-anat-title" className="oga-scr-anat__title">
            Deterministic pipeline. AI never touches the numbers.
          </h2>
          <p className="oga-scr-anat__sub">
            Each call runs the same three steps in the same order. Caller
            weights enter the pure aggregation, not the engine. Same inputs
            always produce the same score.
          </p>
        </header>

        <div className="oga-scr-anat__stage">
          <PipelineSvg />
        </div>

        <ul className="oga-scr-anat__notes">
          <li className="oga-scr-anat__note">
            <span className="oga-scr-anat__note-num">Step 01</span>
            <h3 className="oga-scr-anat__note-title">Fetch sources</h3>
            <p className="oga-scr-anat__note-body">
              Hybrid read across the persisted store and live upstream fetches.
              Deprivation, property and crime served from the store when LSOA
              coverage exists; amenities, transport, schools and environment
              live per request.
            </p>
          </li>
          <li className="oga-scr-anat__note">
            <span className="oga-scr-anat__note-num">Step 02</span>
            <h3 className="oga-scr-anat__note-title">Compute scores</h3>
            <p className="oga-scr-anat__note-body">
              Frozen v2 deterministic engine produces the five per-dimension
              scores for the chosen preset, plus per-dimension confidence.
              Golden-tested. AI does not touch this step.
            </p>
          </li>
          <li className="oga-scr-anat__note">
            <span className="oga-scr-anat__note-num">Step 03</span>
            <h3 className="oga-scr-anat__note-title">Apply weights</h3>
            <p className="oga-scr-anat__note-body">
              Pure aggregation outside the engine. Default weights from the
              preset, overridden by caller weights or a saved org preset_id.
              Aggregate confidence is weight-weighted across dimensions.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function PipelineSvg() {
  return (
    <svg
      className="oga-scr-anat__svg"
      viewBox="0 0 1080 360"
      role="img"
      aria-label="Scoring pipeline: fetch sources, compute scores, apply weights"
    >
      {/* horizontal flow line */}
      <line x1="120" y1="180" x2="960" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.3" />

      {/* 5 source dots feeding into compute */}
      <g fill="currentColor">
        <circle cx="80" cy="80" r="3" />
        <circle cx="80" cy="130" r="3" />
        <circle cx="80" cy="180" r="3.5" />
        <circle cx="80" cy="230" r="3" />
        <circle cx="80" cy="280" r="3" />
      </g>
      <g stroke="currentColor" strokeWidth="1" opacity="0.45" fill="none">
        <line x1="80" y1="80"  x2="320" y2="180" />
        <line x1="80" y1="130" x2="320" y2="180" />
        <line x1="80" y1="180" x2="320" y2="180" />
        <line x1="80" y1="230" x2="320" y2="180" />
        <line x1="80" y1="280" x2="320" y2="180" />
      </g>
      <text x="80" y="320" fontFamily="var(--oga-font-mono)" fontSize="10" letterSpacing="2"
            fill="currentColor" opacity="0.6">SOURCES</text>

      {/* Stage 1: fetch box */}
      <g transform="translate(320, 140)">
        <rect x="0" y="0" width="160" height="80" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="80" y="32" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 01</text>
        <text x="80" y="55" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="14"
              fill="currentColor">fetchAreaSources</text>
        <circle cx="0" cy="40" r="3" fill="currentColor" />
        <circle cx="160" cy="40" r="3" fill="currentColor" />
      </g>
      <line x1="480" y1="180" x2="540" y2="180" stroke="currentColor" strokeWidth="1" />

      {/* Stage 2: compute box (frozen engine — accented) */}
      <g transform="translate(540, 130)">
        <rect x="0" y="0" width="160" height="100" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="80" y="28" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 02</text>
        <text x="80" y="52" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="14"
              fill="currentColor">computeScores</text>
        <text x="80" y="75" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.65" letterSpacing="2">FROZEN v2 ENGINE</text>
        <circle cx="0" cy="50" r="3" fill="currentColor" />
        <circle cx="160" cy="50" r="3" fill="currentColor" />
      </g>
      <line x1="700" y1="180" x2="760" y2="180" stroke="currentColor" strokeWidth="1" />

      {/* Caller weights — drops down into stage 3 */}
      <g transform="translate(760, 60)">
        <rect x="0" y="0" width="160" height="50" rx="3" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <text x="80" y="20" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">OPTIONAL</text>
        <text x="80" y="38" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">Caller weights / preset_id</text>
      </g>
      <line x1="840" y1="110" x2="840" y2="160" stroke="currentColor" strokeWidth="1" opacity="0.55" strokeDasharray="3 3" />

      {/* Stage 3: applyWeights */}
      <g transform="translate(760, 140)">
        <rect x="0" y="0" width="160" height="80" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="80" y="32" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 03</text>
        <text x="80" y="55" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="14"
              fill="currentColor">applyWeights</text>
        <circle cx="0" cy="40" r="3" fill="currentColor" />
        <circle cx="160" cy="40" r="3" fill="currentColor" />
      </g>

      {/* Final ScoreResult */}
      <line x1="920" y1="180" x2="980" y2="180" stroke="currentColor" strokeWidth="1" />
      <g transform="translate(980, 150)">
        <rect x="0" y="0" width="80" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="40" y="24" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">RESPONSE</text>
        <text x="40" y="44" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="14"
              fill="currentColor" fontWeight="500">62 / 100</text>
      </g>
    </svg>
  );
}

/* ============================================================
   § 04 — Endpoints (cream) — POST /v1/score · /presets
   ============================================================ */

type Param = { name: string; type: string; required: boolean; desc: string };
type Endpoint = {
  method: "POST" | "GET" | "PATCH" | "DELETE";
  path: string;
  what: string;
  params: Param[];
  response: string;
  codes: { code: string; meaning: string }[];
};

const EPS: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/score",
    what:
      "The primary scoring endpoint. Send an area and a preset; get a 0-100 composite, the five dimensions that produced it, the weight applied to each, per-dimension confidence, the aggregate confidence, weights_source and the engine_version that ran. Not metered against the monthly API call quota.",
    params: [
      { name: "area", type: "string", required: true, desc: "UK postcode or place name. Geocoded server-side." },
      { name: "preset", type: "enum", required: false, desc: "moving · business · investing · research. Defaults to research. Each preset has its OWN 5 dimensions." },
      { name: "weights", type: "Record<key, positive number>", required: false, desc: "Override the preset's default weights. Keys must be in PRESET_DIMENSION_KEYS[preset]. Partial overrides keep defaults for missing keys." },
      { name: "preset_id", type: "string (Lever)", required: false, desc: "Reference a saved per-org preset (spr_…). Mutually exclusive with preset + weights. 422 preset_id_conflict otherwise." },
      { name: "X-Engine-Version", type: "header", required: false, desc: "Pin response engine version per request. Must be in SUPPORTED_ENGINE_VERSIONS = ['2.0.0','2.0.1','2.0.2']. Beats org-level pin." },
    ],
    response:
      "ScoreResult: { area, preset, score, area_type, dimensions[5]: { key, label, score, weight, confidence }, confidence, weights_source ('preset' | 'custom'), engine_version }. Response header X-Engine-Version carries the effective pin.",
    codes: [
      { code: "200", meaning: "Score computed." },
      { code: "400", meaning: "Missing area, invalid preset, unknown dimension key, non-positive weight, empty weights." },
      { code: "401", meaning: "Missing or invalid Bearer oga_… API key." },
      { code: "403", meaning: "Plan has no API access, or IP-allowlist blocked." },
      { code: "404", meaning: "Area cannot be geocoded, or preset_id unknown in caller's org." },
      { code: "422", meaning: "preset_id_conflict (mutually exclusive) or no_org_context." },
      { code: "429", meaning: "Per-key rate-limited (30 req / min)." },
    ],
  },
  {
    method: "POST",
    path: "/v1/orgs/:id/presets",
    what:
      "Levers: saved scoring presets. CRUD endpoint family. POST creates a saved {base_preset, weights} bundle referenced later as preset_id on /v1/score. Org admin or owner only. Weight keys validated against the base_preset's dimension set at write time.",
    params: [
      { name: "name", type: "string (1-200)", required: true, desc: "Human-readable name, e.g. 'Underwriting v1'." },
      { name: "slug", type: "string ([a-z0-9-]+, 2-60)", required: false, desc: "Optional slug; derived from name if omitted. Unique within the org." },
      { name: "base_preset", type: "enum", required: true, desc: "Selects the dimension set the weights will be validated against." },
      { name: "weights", type: "Record<key, positive number> (non-empty)", required: true, desc: "Keys MUST be in PRESET_DIMENSION_KEYS[base_preset]. 400 unknown_weight_keys otherwise." },
    ],
    response:
      "201 ScoringPreset: { id: 'spr_…', org_id, slug, name, base_preset, weights, created_at, updated_at }. Companion endpoints: GET list, GET one, PATCH, DELETE.",
    codes: [
      { code: "201", meaning: "Preset created." },
      { code: "400", meaning: "Schema violation or unknown_weight_keys." },
      { code: "403", meaning: "admin_required. Caller is a member but not admin or owner." },
      { code: "404", meaning: "Org not found or caller is not a member." },
      { code: "409", meaning: "A preset with that slug already exists in the org." },
    ],
  },
];

/* SectionEndpoints + CodeRow extracted to shared
   _shared/product-endpoint-panel.{tsx,css} in AR-211.
   Per-product variation = title + sub + EPS data. */

/* ============================================================
   § 05 — Built for (cream) — 5 ICPs, Lender leads
   ============================================================ */

type Icp = {
  name: string;
  Viz: () => ReactElement;
  problem: string;
  why: string;
  value: string;
  sales: string;
};

const ICPS: Icp[] = [
  {
    name: "Lenders",
    Viz: VizLender,
    problem:
      "A mortgage lender's model risk register treats every API the underwriting model depends on as a model input. If the supplier silently changes a coefficient, that's an undisclosed model change, a regulated event. Auditors ask: 'what version of the area score produced this decision, and is it byte-equivalent to the score you'd compute today?'",
    why:
      "Every /v1/score response carries engine_version in the body AND X-Engine-Version on the response header. Both can be locked at the org level (Levers methodology pin), owner-only, write-time validated against SUPPORTED_ENGINE_VERSIONS. The deterministic engine is frozen v2, golden-tested. AI never touches the scoring path.",
    value:
      "Every decision produced from /v1/score is reproducible to a known methodology version. The model risk register has a 1:1 mapping between an API call and the engine that ran. Closes a compliance gap that's table-stakes for any production underwriting model.",
    sales:
      "Versioned, pinnable, deterministic area scoring with the audit trail your model risk register already asks for.",
  },
  {
    name: "Insurance and InsureTech",
    Viz: VizInsurer,
    problem:
      "An underwriter's area-risk view is a weighted blend the actuary owns (safety, flood, demographics, property volatility) and the weights change with each pricing cycle. Off-the-shelf 'area scores' are black-box composites with frozen weights the vendor chose; useless inside an underwriting model because the actuary cannot see or tune the weighting.",
    why:
      "POST /v1/score returns every dimension's raw score, weight, and per-dimension confidence. The actuary sees the components, not a black box. With Levers saved presets the carrier saves a preset once and references it as preset_id forever. Confidence is variance-aware on property-backed dimensions so wide swings cap at MEDIUM.",
    value:
      "Configurable weights without per-call payload. Transparent components for actuary review. Honest confidence signal that flags volatility before adverse selection bites. One preset_id per underwriting model lifecycle.",
    sales:
      "Configurable composite scoring the actuary can audit, with a saved preset_id per model and honest confidence on every dimension.",
  },
  {
    name: "PropTech",
    Viz: VizPropTech,
    problem:
      "PropTech tools need a single composite 'how good is this area' number for the UI, not a 12-signal forensics view. But buyers, renters and agents see different things in 'good': a family cares about schools and safety, an investor cares about growth and yield, a business cares about footfall. One score does not fit; building four bespoke scores in-house means owning the data pipeline.",
    why:
      "The four scoring profiles are exactly those four audiences. One endpoint, one call, four UX flavours by parameter. The engine is deterministic, so the score is stable for a given postcode + profile across deploys, so cached UI states stay coherent. Components plus weights plus confidence come back in every response.",
    value:
      "Four audience-matched scores from one endpoint, no in-house pipeline. Deterministic + stable for caching. Transparency on demand (drill into the five dimensions) without a second API roundtrip.",
    sales:
      "One endpoint, four audience-tuned composite scores, deterministic enough to cache and transparent enough to drill into.",
  },
  {
    name: "CRE and site selection",
    Viz: VizCre,
    problem:
      "A CRE site-selection workflow needs to compare hundreds of candidate locations on a consistent yardstick: footfall demand, competition density, transport access, local spending power, commercial costs. Most data vendors stop at single-signal lookups; rolling them into a defensible score is the analyst's problem.",
    why:
      "POST /v1/score with the commercial site-selection profile returns exactly the five dimensions a site-selection analyst needs, with weights the team can override per portfolio class or save once via preset_id. Every response carries per-dimension confidence + the deterministic engine version, so the committee paper has a defensible methodology pointer.",
    value:
      "Purpose-built commercial-workflow dimensions instead of a generic composite. Configurable weights per portfolio class. Defensible methodology cite. Free of the monthly API call quota: score thousands of candidates at the per-key rate limit.",
    sales:
      "A purpose-built commercial site-selection score with per-portfolio weights and a methodology cite you can put in the committee paper.",
  },
  {
    name: "Public sector",
    Viz: VizPublic,
    problem:
      "A council planning team or regeneration body needs a consistent way to triage LSOAs across a borough. They do not need an AI narrative; they need a reproducible, methodology-documented number that survives FOI scrutiny and the next procurement review.",
    why:
      "POST /v1/score with the research baseline profile is the general-purpose composite. The engine is deterministic: same postcode + profile equals the same score across deploys. The methodology changelog is published and engine_version is stamped on every response. An FOI request can be answered by pointing at the version.",
    value:
      "FOI-defensible methodology trail. Reproducible across deploys and procurement cycles. Researcher-tuned default preset that does not bias toward commercial or investor lenses.",
    sales:
      "A reproducible, methodology-documented composite for triaging areas at the LSOA level, built for the procurement notice and the FOI request.",
  },
];

/* SectionIcps extracted to shared _shared/product-icp-grid.{tsx,css}
   in AR-211. Per-product: ICPS data + bespoke Viz functions below. */

/* ICP micro-illustrations — Scores-specific. 120x120, dot-and-hairline. */

function VizLender() {
  // Versioned ledger — three rows w/ version stamps + a focal "current"
  return (
    <svg className="oga-scr-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <rect x="14" y="14" width="92" height="92" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <g fill="currentColor">
        {/* version dots in a column */}
        <circle cx="28" cy="30" r="2" opacity="0.4" />
        <circle cx="28" cy="50" r="2" opacity="0.55" />
        <circle cx="28" cy="70" r="2" opacity="0.7" />
        <circle cx="28" cy="90" r="4" />
      </g>
      {/* version labels — hairlines */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.4">
        <line x1="36" y1="30" x2="92" y2="30" />
        <line x1="36" y1="50" x2="78" y2="50" />
        <line x1="36" y1="70" x2="84" y2="70" />
      </g>
      <line x1="36" y1="90" x2="98" y2="90" stroke="currentColor" strokeWidth="1.4" />
      {/* checkmark at the focal row */}
      <circle cx="98" cy="90" r="3" fill="currentColor" />
    </svg>
  );
}

function VizInsurer() {
  // Five dials — visual of configurable weights
  return (
    <svg className="oga-scr-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      {[24, 44, 60, 76, 96].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="60" r="9" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          {/* needle */}
          <line
            x1={x}
            y1="60"
            x2={x + 6 * Math.cos(((i - 2) / 4) * Math.PI - Math.PI / 2)}
            y2={60 + 6 * Math.sin(((i - 2) / 4) * Math.PI - Math.PI / 2)}
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <circle cx={x} cy="60" r="1.4" fill="currentColor" />
        </g>
      ))}
      <line x1="14" y1="86" x2="106" y2="86" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

function VizPropTech() {
  // 4 audience badges arranged in a 2x2
  return (
    <svg className="oga-scr-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="14" y="14" width="42" height="42" rx="2" />
        <rect x="64" y="14" width="42" height="42" rx="2" />
        <rect x="14" y="64" width="42" height="42" rx="2" />
        <rect x="64" y="64" width="42" height="42" rx="2" />
      </g>
      <g fill="currentColor">
        <circle cx="35" cy="35" r="3.5" />
        <circle cx="85" cy="35" r="3.5" />
        <circle cx="35" cy="85" r="3.5" />
        <circle cx="85" cy="85" r="3.5" />
      </g>
    </svg>
  );
}

function VizCre() {
  // 5 stacked dim bars — the business preset
  return (
    <svg className="oga-scr-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      {[
        { y: 24, w: 86 },
        { y: 40, w: 64 },
        { y: 56, w: 78 },
        { y: 72, w: 58 },
        { y: 88, w: 42 },
      ].map((b, i) => (
        <g key={i}>
          <line x1="14" y1={b.y} x2="14" y2={b.y} stroke="currentColor" strokeWidth="1" />
          <circle cx="14" cy={b.y} r="2.4" fill="currentColor" />
          <line
            x1="20"
            y1={b.y}
            x2={20 + b.w}
            y2={b.y}
            stroke="currentColor"
            strokeWidth="3"
            opacity={0.45 + i * 0.05}
          />
        </g>
      ))}
    </svg>
  );
}

function VizPublic() {
  // Stamped document — three stamp marks at the bottom
  return (
    <svg className="oga-scr-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <rect x="22" y="14" width="76" height="86" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      {/* doc lines */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.45">
        <line x1="32" y1="30" x2="88" y2="30" />
        <line x1="32" y1="40" x2="80" y2="40" />
        <line x1="32" y1="50" x2="86" y2="50" />
        <line x1="32" y1="60" x2="72" y2="60" />
        <line x1="32" y1="70" x2="80" y2="70" />
      </g>
      {/* methodology stamp at bottom */}
      <g fill="currentColor">
        <circle cx="38" cy="88" r="3" />
        <circle cx="52" cy="88" r="3" />
        <circle cx="66" cy="88" r="3" />
      </g>
      <line x1="32" y1="80" x2="88" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

/* FinalCta extracted to shared _shared/product-final-cta.{tsx,css}
   in AR-211. */
