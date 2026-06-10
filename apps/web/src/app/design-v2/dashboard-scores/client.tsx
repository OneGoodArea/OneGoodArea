"use client";

/* AR-260 /dashboard/scores workbench.

   Pick a postcode + a preset, see the 0-100 composite score, the 5
   weighted dimensions with per-dimension scores + confidence stamps,
   area type, engine version stamp. Same product-header vocabulary
   as /dashboard/signals (AR-259): the ScoresIcon framed as a brand
   mark at the top, mono caps PRODUCT eyebrow, serif title, tagline.

   MVP fixtures: 4 postcodes x 4 presets, lifted from the marketing
   /products/scores prebaked specimen data. Live /v1/score integration
   is a follow-up ticket (needs the dashboard to either use the user's
   own api key client-side or proxy via the bridge token, neither of
   which is wired today). */

import { useState } from "react";
import { AppShell } from "../_shared/app-shell";
import { ScoresIcon } from "../_shared/product-icons";
import { SCORING_PROFILES, type ProfileSlug } from "@/lib/scoring-profiles";
import "./client.css";

type Preset = ProfileSlug;

interface PresetDef {
  id: Preset;
  dimensions: Array<{ key: string; label: string; weight: number }>;
}

/* Preset dimensions + default weights mirror the deterministic
   engine. The workflow names + bespoke glyphs come from
   @/lib/scoring-profiles (SCORING_PROFILES) which is the single
   source of truth shared with /products/scores and /welcome. */
const PRESET_DIMS: Record<Preset, PresetDef["dimensions"]> = {
  moving: [
    { key: "safety_crime",       label: "Safety and Crime",        weight: 25 },
    { key: "schools_education",  label: "Schools and Education",   weight: 25 },
    { key: "transport_commute",  label: "Transport and Commute",   weight: 20 },
    { key: "daily_amenities",    label: "Daily Amenities",         weight: 15 },
    { key: "cost_of_living",     label: "Cost of Living",          weight: 15 },
  ],
  business: [
    { key: "foot_traffic_demand", label: "Foot Traffic and Demand", weight: 30 },
    { key: "competition_density", label: "Competition Density",      weight: 20 },
    { key: "transport_access",    label: "Transport Access",         weight: 15 },
    { key: "local_spending_power",label: "Local Spending Power",     weight: 20 },
    { key: "commercial_costs",    label: "Commercial Costs",         weight: 15 },
  ],
  investing: [
    { key: "price_growth",                label: "Price Growth",             weight: 30 },
    { key: "rental_yield",                label: "Rental Yield",             weight: 25 },
    { key: "regeneration_infrastructure", label: "Regeneration",             weight: 15 },
    { key: "tenant_demand",               label: "Tenant Demand",            weight: 20 },
    { key: "risk_factors",                label: "Risk Factors",             weight: 10 },
  ],
  research: [
    { key: "safety_crime",         label: "Safety and Crime",         weight: 20 },
    { key: "transport_links",      label: "Transport Links",          weight: 20 },
    { key: "amenities_services",   label: "Amenities and Services",   weight: 20 },
    { key: "demographics_economy", label: "Demographics and Economy", weight: 20 },
    { key: "environment_quality",  label: "Environment Quality",      weight: 20 },
  ],
};

function profileFor(slug: ProfileSlug) {
  return SCORING_PROFILES.find((p) => p.slug === slug)!;
}

type AreaType = "urban" | "suburban" | "rural";
type Confidence = "high" | "med" | "low";

interface SpecScore {
  score: number;
  area_type: AreaType;
  dims: Array<{ score: number; confidence: Confidence }>;
}

/* Prebaked specimens per (postcode x preset). Realistic-shaped,
   parallels the marketing /products/scores client. Engine version
   is whatever main carries. */
const ENGINE_VERSION = "2.0.2";

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

export default function ScoresWorkbenchClient() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

function Body() {
  const [postcode, setPostcode] = useState<string>(POSTCODES[0]);
  const [preset, setPreset] = useState<Preset>("moving");
  const profile = profileFor(preset);
  const dimensions = PRESET_DIMS[preset];
  const result = PREBAKED[postcode][preset];

  const aggConf = aggregateConfidence(
    result.dims.map((d) => d.confidence),
    dimensions.map((d) => d.weight),
  );

  return (
    <div className="oga-scoresb">
      <header className="oga-scoresb__product">
        <span className="oga-scoresb__product-mark" aria-hidden>
          <ScoresIcon width={56} height={56} />
        </span>
        <div className="oga-scoresb__product-text">
          <span className="oga-scoresb__product-eyebrow">Product</span>
          <h2 className="oga-scoresb__product-title">Scores</h2>
          <p className="oga-scoresb__product-tagline">
            Deterministic composite scoring. Pick a postcode and a profile,
            see the 0-100 number, the five weighted dimensions, and the
            per-dimension confidence. The engine version is stamped on every
            response. AI never touches the scoring path.
          </p>
        </div>
      </header>

      {/* AR-260: honest about the data. Numbers below are prebaked
          fixtures so the workbench is exercisable without an API
          call. Real /v1/score with the user's key lands in a
          follow-up ticket. */}
      <aside className="oga-scoresb__demo" role="status">
        <span className="oga-scoresb__demo-dot" aria-hidden />
        <span className="oga-scoresb__demo-label">Sample data</span>
        <span className="oga-scoresb__demo-body">
          Numbers below are prebaked specimens for four representative
          postcodes. The live /v1/score endpoint runs the same engine on
          your real postcodes the moment your code calls it.
        </span>
      </aside>

      <div className="oga-scoresb__pickers">
        <div
          className="oga-scoresb__picker"
          role="tablist"
          aria-label="Postcode"
        >
          <span className="oga-scoresb__picker-label">Postcode</span>
          <div className="oga-scoresb__chips">
            {POSTCODES.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={p === postcode}
                onClick={() => setPostcode(p)}
                className={
                  p === postcode
                    ? "oga-scoresb__chip oga-scoresb__chip--active"
                    : "oga-scoresb__chip"
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div
          className="oga-scoresb__picker oga-scoresb__picker--profiles"
          role="tablist"
          aria-label="Scoring profile"
        >
          <span className="oga-scoresb__picker-label">Profile</span>
          <div className="oga-scoresb__profile-chips">
            {SCORING_PROFILES.map((p) => {
              const isActive = p.slug === preset;
              const Glyph = p.Glyph;
              return (
                <button
                  key={p.slug}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPreset(p.slug)}
                  className={
                    isActive
                      ? "oga-scoresb__profile oga-scoresb__profile--active"
                      : "oga-scoresb__profile"
                  }
                >
                  <span className="oga-scoresb__profile-glyph" aria-hidden>
                    <Glyph />
                  </span>
                  <span className="oga-scoresb__profile-text">
                    <span className="oga-scoresb__profile-name">{p.name}</span>
                    <span className="oga-scoresb__profile-slug">
                      preset: {p.slug}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ResultCard
        postcode={postcode}
        preset={preset}
        dimensions={dimensions}
        result={result}
        aggConf={aggConf}
      />

      <div className="oga-scoresb__split">
        <CodeBlock postcode={postcode} preset={preset} />
        <SchemaPanel />
      </div>
    </div>
  );
}

/* ============================================================
   Result card: composite + dimensions
   ============================================================ */

function ResultCard({
  postcode,
  preset,
  dimensions,
  result,
  aggConf,
}: {
  postcode: string;
  preset: Preset;
  dimensions: PresetDef["dimensions"];
  result: SpecScore;
  aggConf: number;
}) {
  const profile = profileFor(preset);
  const Glyph = profile.Glyph;
  return (
    <section className="oga-scoresb-result">
      <header className="oga-scoresb-result__head">
        <div className="oga-scoresb-result__head-left">
          <div className="oga-scoresb-result__composite">
            <span className="oga-scoresb-result__composite-value">
              {result.score}
            </span>
            <span className="oga-scoresb-result__composite-of">/ 100</span>
          </div>
          <div className="oga-scoresb-result__composite-meta">
            <code className="oga-scoresb-result__pcode">{postcode}</code>
            <span className="oga-scoresb-result__chip" data-kind="area">
              {result.area_type}
            </span>
            <span
              className="oga-scoresb-result__chip"
              data-kind={confidenceBand(aggConf)}
            >
              confidence {Math.round(aggConf * 100)}%
            </span>
          </div>
        </div>
        <div className="oga-scoresb-result__head-right">
          <span className="oga-scoresb-result__profile-glyph" aria-hidden>
            <Glyph />
          </span>
          <span className="oga-scoresb-result__preset-eyebrow">Profile</span>
          <span className="oga-scoresb-result__preset-workflow">
            {profile.name}
          </span>
          <span className="oga-scoresb-result__preset-id">
            preset: {preset}
          </span>
          <span className="oga-scoresb-result__engine">
            engine v{ENGINE_VERSION}
          </span>
        </div>
      </header>

      <ul className="oga-scoresb-result__dims">
        {dimensions.map((dim, i) => {
          const value = result.dims[i];
          const contribution = Math.round((value.score * dim.weight) / 100);
          return (
            <li key={dim.key} className="oga-scoresb-result__dim">
              <div className="oga-scoresb-result__dim-head">
                <span className="oga-scoresb-result__dim-label">
                  {dim.label}
                </span>
                <span className="oga-scoresb-result__dim-weight">
                  weight {dim.weight}%
                </span>
              </div>
              <div className="oga-scoresb-result__dim-bar">
                <div
                  className="oga-scoresb-result__dim-bar-fill"
                  style={{ width: `${value.score}%` }}
                />
              </div>
              <div className="oga-scoresb-result__dim-foot">
                <span className="oga-scoresb-result__dim-score">
                  {value.score}
                </span>
                <span
                  className="oga-scoresb-result__chip"
                  data-kind={value.confidence}
                >
                  {value.confidence}
                </span>
                <span className="oga-scoresb-result__dim-contrib">
                  contributes {contribution}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============================================================
   Code block + schema reference
   ============================================================ */

function CodeBlock({ postcode, preset }: { postcode: string; preset: Preset }) {
  const curl = `curl https://api.onegoodarea.com/v1/score \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -X POST \\
  -d '{
    "area": "${postcode}",
    "preset": "${preset}"
  }'`;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="oga-scoresb-code">
      <div className="oga-scoresb-code__head">
        <span className="oga-scoresb-code__path">
          POST /v1/score <strong>preset=&quot;{preset}&quot;</strong>
        </span>
        <button
          type="button"
          onClick={copy}
          className="oga-scoresb-code__copy"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="oga-scoresb-code__pre">
        <code>{curl}</code>
      </pre>
      <p className="oga-scoresb-code__hint">
        Override the preset&apos;s default weights per request by passing{" "}
        <code>weights</code>, or save your own recipe against your org and
        reference it with <code>preset_id</code>.
      </p>
    </div>
  );
}

function SchemaPanel() {
  const rows: Array<{ field: string; type: string; desc: string }> = [
    { field: "area",            type: "string",            desc: "Resolved area or postcode." },
    { field: "preset",          type: "Preset",            desc: "moving / business / investing / research." },
    { field: "score",           type: "number 0-100",      desc: "Composite score." },
    { field: "area_type",       type: "AreaType",          desc: "urban / suburban / rural." },
    { field: "dimensions",      type: "ScoreDimension[]",  desc: "5 weighted components." },
    { field: "  .key",          type: "string",            desc: "Stable dimension slug." },
    { field: "  .label",        type: "string",            desc: "Display label." },
    { field: "  .score",        type: "number 0-100",      desc: "Dimension score." },
    { field: "  .weight",       type: "number",            desc: "Weight applied. Sums to 100." },
    { field: "  .confidence",   type: "number 0-1",        desc: "Per-dimension data quality." },
    { field: "confidence",      type: "number 0-1",        desc: "Aggregate confidence." },
    { field: "weights_source",  type: "preset | custom",   desc: "Whether overrides were used." },
    { field: "engine_version",  type: "string",            desc: "Methodology version that ran." },
  ];

  return (
    <div className="oga-scoresb-schema">
      <header className="oga-scoresb-schema__head">
        <span className="oga-scoresb-schema__eyebrow">Score schema</span>
        <p className="oga-scoresb-schema__hint">
          Every /v1/score response carries these fields. Same shape across
          all four presets.
        </p>
      </header>
      <ul className="oga-scoresb-schema__rows">
        {rows.map((r) => (
          <li key={r.field}>
            <code className="oga-scoresb-schema__field">{r.field}</code>
            <code className="oga-scoresb-schema__type">{r.type}</code>
            <span className="oga-scoresb-schema__desc">{r.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */

function confidenceBand(conf: number): Confidence {
  if (conf >= 0.75) return "high";
  if (conf >= 0.50) return "med";
  return "low";
}

function aggregateConfidence(confs: Confidence[], weights: number[]): number {
  const num = (c: Confidence) =>
    c === "high" ? 0.85 : c === "med" ? 0.65 : 0.35;
  let sum = 0;
  let wsum = 0;
  for (let i = 0; i < confs.length; i++) {
    const w = weights[i] ?? 0;
    sum += num(confs[i]) * w;
    wsum += w;
  }
  return wsum > 0 ? sum / wsum : 0;
}
