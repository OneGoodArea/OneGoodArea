"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { IntelligenceIcon } from "../../_shared/product-icons";
import { ProductHero } from "../../_shared/product-hero";
import { ProductEndpointPanel } from "../../_shared/product-endpoint-panel";
import { ProductFinalCta } from "../../_shared/product-final-cta";
import { ProductIcpGrid } from "../../_shared/product-icp-grid";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "./intelligence.css";

/* /products/intelligence — AR-204 product page #4 (flagship).

   Pattern parity w/ Signals / Scores / Monitor, Intelligence-specific
   bespoke illustrations + content per spec pack §4.

   The flagship demo: NL question → typed plan emitted → results rendered.
   Drives home the "AI as interface, deterministic SQL as answer" pitch.

   Hard rules: no em dashes in user-facing copy; no `aiq_`; no fake links;
   prebaked specimen is illustrative, NOT live API output (see foot note +
   memory follow-up). The 92.9% planner accuracy MUST always be qualified
   with "on a 14-case curated corpus" per ADR 0026. */

/* ============================================================
   Prebaked NL→plan→result specimens — one per curated question.
   The plan shape mirrors the real Zod-strict QueryPlan grammar
   from packages/contracts/src/intelligence.ts.
   ============================================================ */

type SpecimenRow = { id: string; label: string; value: string };

type Specimen = {
  question: string;
  op: "rank_areas" | "find_peers" | "find_insights" | "find_forecast";
  plan: object;
  metaPills: { k: string; v: string }[];
  rowsTitle: string;
  rows: SpecimenRow[];
  curlBody: string;
};

const SPECIMENS: Specimen[] = [
  {
    question:
      "England LSOAs under £250k AND rising YoY AND in bottom quartile crime, sort by YoY desc, limit 5",
    op: "rank_areas",
    plan: {
      op: "rank_areas",
      params: {
        signals: [
          { key: "property.median_price", filter: { lte: 250000 } },
          { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
          { key: "crime.total_12m", filter: { percentile_lte: 25 } },
        ],
        sort_by: {
          signal: "property.price_change_pct_yoy",
          mode: "value",
          direction: "desc",
        },
        country: "England",
        limit: 5,
      },
    },
    metaPills: [
      { k: "scope", v: "England" },
      { k: "limit", v: "5" },
      { k: "matched", v: "5" },
    ],
    rowsTitle: "Top 5 LSOAs by YoY (desc)",
    rows: [
      { id: "E01005207", label: "Manchester · M1 catchment", value: "+18.4%" },
      { id: "E01033620", label: "Birmingham · B1 catchment", value: "+14.6%" },
      { id: "E01011358", label: "Leeds · LS1 catchment", value: "+12.9%" },
      { id: "E01008397", label: "Newcastle · NE1 catchment", value: "+11.2%" },
      { id: "E01017641", label: "Sheffield · S1 catchment", value: "+10.4%" },
    ],
    curlBody: `{ "plan": { "op": "rank_areas", "params": { ... } } }`,
  },
  {
    question: "Areas similar to M1 1AE in England",
    op: "find_peers",
    plan: {
      op: "find_peers",
      params: {
        target: { postcode: "M1 1AE" },
        country: "England",
        k: 20,
        min_signals: 3,
      },
    },
    metaPills: [
      { k: "target", v: "E01005207" },
      { k: "k", v: "20" },
      { k: "min_dims", v: "3" },
    ],
    rowsTitle: "Top 5 peers by Euclidean distance",
    rows: [
      { id: "E01005391", label: "Manchester · NQ", value: "0.041" },
      { id: "E01033817", label: "Birmingham · Digbeth", value: "0.058" },
      { id: "E01011411", label: "Leeds · Hunslet", value: "0.062" },
      { id: "E01008214", label: "Newcastle · Ouseburn", value: "0.067" },
      { id: "E01017502", label: "Sheffield · Kelham", value: "0.071" },
    ],
    curlBody: `{ "plan": { "op": "find_peers", "params": { ... } } }`,
  },
  {
    question:
      "England LSOAs with anomalously high crime vs peers, |z| ≥ 2",
    op: "find_insights",
    plan: {
      op: "find_insights",
      params: {
        signal_key: "crime.total_12m_peer_relative_z",
        country: "England",
        min_abs_z: 2,
        k: 50,
      },
    },
    metaPills: [
      { k: "signal", v: "crime.total_12m_peer_relative_z" },
      { k: "min_abs_z", v: "2" },
      { k: "returned", v: "5" },
    ],
    rowsTitle: "Top 5 LSOAs by |peer-relative z|",
    rows: [
      { id: "E01033410", label: "Birmingham · LSOA outlier", value: "+4.12 σ" },
      { id: "E01005482", label: "Manchester · LSOA outlier", value: "+3.81 σ" },
      { id: "E01011718", label: "Leeds · LSOA outlier", value: "+3.54 σ" },
      { id: "E01017903", label: "Sheffield · LSOA outlier", value: "+3.18 σ" },
      { id: "E01008127", label: "Newcastle · LSOA outlier", value: "+2.96 σ" },
    ],
    curlBody: `{ "plan": { "op": "find_insights", "params": { ... } } }`,
  },
  {
    question:
      "Forecast median house price in M1 1AE for the next 12 months",
    op: "find_forecast",
    plan: {
      op: "find_forecast",
      params: {
        target: { postcode: "M1 1AE" },
        signal_key: "property.median_price",
        window_months: 24,
        horizon_months: 12,
      },
    },
    metaPills: [
      { k: "n_obs", v: "23" },
      { k: "r²", v: "0.71" },
      { k: "slope_pm", v: "+£1,250" },
    ],
    rowsTitle: "Projection · constant ±2·σ band",
    rows: [
      { id: "2026-06", label: "+1 month", value: "£218,500" },
      { id: "2026-09", label: "+4 months", value: "£222,250" },
      { id: "2026-12", label: "+7 months", value: "£226,000" },
      { id: "2027-03", label: "+10 months", value: "£229,750" },
      { id: "2027-05", label: "+12 months", value: "£232,250" },
    ],
    curlBody: `{ "plan": { "op": "find_forecast", "params": { ... } } }`,
  },
];

export default function ProductIntelligenceClient() {
  return (
    <div className="oga-root oga-int">
      <Nav />
      <ProductHero
        Icon={IntelligenceIcon}
        h1="Intelligence: a typed query plane over the moat."
        lead="Six plan ops, one Zod-strict grammar. Send a programmatic plan object or a natural-language question. Either way the same deterministic executor runs the plan against the database and returns typed rows. The response always echoes the executed plan so any natural-language answer can be replayed as a programmatic call. Not a chatbot. Not a narrative. AI never sets the numbers."
        primaryHref="/sign-up"
        primaryLabel="Get an API key"
        secondaryHref="/methodology"
        secondaryLabel="Read the methodology"
      />
      <SectionSpecimen />
      <SectionOps />
      <SectionPipeline />
      <SectionEval />
      <ProductEndpointPanel
        titleId="int-ep-title"
        title="One typed query plane. Three convenience endpoints."
        sub="/v1/query is the typed plane (6 ops). /v1/peers, /v1/insights, /v1/forecast are convenience endpoints over the same plan ops. Same executor, two surfaces."
        endpoints={EPS}
      />
      <ProductIcpGrid
        titleId="int-icps-title"
        title="Same query plane. Five different buyer workflows."
        sub="One executor. Five very different questions buyers are trying to answer. The grammar is the same; the angle of attack is not."
        whyLabel="Why Intelligence"
        icps={ICPS}
      />
      <ProductFinalCta
        titleId="int-cta-title"
        title="Query UK areas in JSON or English. Get the same deterministic answer."
        lead={`Six plan ops. One typed grammar. AI emits the plan, the database produces the rows, the response always echoes the plan so any natural-language answer can be replayed as a programmatic call. Engine version ${METHODOLOGY_VERSION} is stamped on every response.`}
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
   § 01 — Live specimen (DARK) — NL → plan → results
   ============================================================ */

function SectionSpecimen() {
  const [idx, setIdx] = useState(0);
  const s = SPECIMENS[idx];

  return (
    <section
      className="oga-section-dark oga-int-spec"
      data-oga-surface="dark"
      aria-labelledby="int-spec-title"
    >
      <div className="oga-int__wrap">
        <header className="oga-int-spec__head">
          <div className="oga-int-spec__eyebrow">
            <span className="oga-int-spec__eyebrow-mark" aria-hidden />
            <span>Sample response</span>
            <span className="oga-int-spec__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="int-spec-title" className="oga-int-spec__title">
            The AI picks the query. The database produces the answer.
          </h2>
          <p className="oga-int-spec__sub">
            Pick a natural-language question. Watch the planner emit a
            Zod-strict plan. See the typed rows that came out of the
            executor. Below the result: the equivalent programmatic call
            you can paste into your terminal.
          </p>
        </header>

        <div
          className="oga-int-spec__questions"
          role="tablist"
          aria-label="Natural-language question"
        >
          {SPECIMENS.map((sp, i) => (
            <button
              key={sp.question}
              type="button"
              role="tab"
              aria-selected={i === idx}
              onClick={() => setIdx(i)}
              className={`oga-int-spec__question${i === idx ? " oga-int-spec__question--active" : ""}`}
            >
              {sp.question}
            </button>
          ))}
        </div>

        <div className="oga-int-spec__card">
          <span className="oga-int-spec__tick oga-int-spec__tick--tl" aria-hidden />
          <span className="oga-int-spec__tick oga-int-spec__tick--tr" aria-hidden />
          <span className="oga-int-spec__tick oga-int-spec__tick--bl" aria-hidden />
          <span className="oga-int-spec__tick oga-int-spec__tick--br" aria-hidden />

          <div className="oga-int-spec__resp">
            <span className="oga-int-spec__resp-method">
              <span className="oga-int-spec__resp-method-verb">POST</span>
              /v1/query
            </span>
            <span className="oga-int-spec__resp-source">
              <span>plan_source</span>
              <span className="oga-int-spec__resp-source-mode">nl</span>
            </span>
          </div>

          <div className="oga-int-spec__question-shown">
            <span className="oga-int-spec__question-shown-k">question</span>
            {s.question}
          </div>

          <div className="oga-int-spec__panes">
            <div className="oga-int-spec__pane">
              <p className="oga-int-spec__pane-title">
                Plan emitted
                <span className="oga-int-spec__pane-title-tag">Zod-strict</span>
              </p>
              <pre className="oga-int-spec__plan-pre">
                {JSON.stringify(s.plan, null, 2)}
              </pre>
            </div>

            <div className="oga-int-spec__pane">
              <p className="oga-int-spec__pane-title">
                Results
                <span className="oga-int-spec__pane-title-tag">{s.op}</span>
              </p>
              <div className="oga-int-spec__results">
                <div className="oga-int-spec__result-meta">
                  {s.metaPills.map((p) => (
                    <span key={p.k}>
                      <span className="oga-int-spec__result-meta-k">{p.k}</span>
                      <span className="oga-int-spec__result-meta-v">{p.v}</span>
                    </span>
                  ))}
                </div>
                <p
                  style={undefined}
                  className="oga-int-spec__pane-title"
                  aria-hidden
                >
                  {s.rowsTitle}
                </p>
                <div className="oga-int-spec__rows">
                  {s.rows.map((r) => (
                    <div key={r.id} className="oga-int-spec__row">
                      <code className="oga-int-spec__row-id">{r.id}</code>
                      <span className="oga-int-spec__row-label">{r.label}</span>
                      <span className="oga-int-spec__row-value">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="oga-int-spec__replay">
            <p className="oga-int-spec__replay-title">
              Replay as a programmatic call (no LLM, deterministic)
            </p>
            <pre className="oga-int-spec__replay-pre">
{`curl https://api.onegoodarea.com/v1/query \\
  -H "Authorization: Bearer oga_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '${s.curlBody}'`}
            </pre>
          </div>
        </div>

        <div className="oga-int-spec__legend">
          <p className="oga-int-spec__legend-title">Reading this view</p>
          <dl className="oga-int-spec__legend-rows">
            <dt><code>plan_source</code></dt>
            <dd>
              <strong>nl</strong> means the planner translated a natural-
              language question into the plan above (one LLM call against
              the AiProvider seam). <strong>client</strong> means a
              caller sent the plan directly. Either path runs through the
              SAME executor; the response always echoes the plan back.
            </dd>
            <dt>Zod-strict</dt>
            <dd>
              The plan is validated against a discriminated union with
              <strong> .strict()</strong> on every nested object. Unknown
              ops, unknown params, and extra keys are REJECTED before the
              executor touches the database. Invalid LLM output returns
              422 with the raw planner output for inspection.
            </dd>
            <dt>Deterministic SQL</dt>
            <dd>
              The executor dispatches each op to a deterministic Postgres
              query. AI never sets the numbers. AI never touches the
              database. Two identical plans always return the same rows
              against the same data state.
            </dd>
          </dl>
        </div>

        <p className="oga-int-spec__note">
          Sample shape and realistic values. Real responses depend on the
          data state at the time of the call.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   § 02 — Six plan ops (cream)
   ============================================================ */

type Op = {
  slug: string;
  name: string;
  body: string;
  Glyph: () => ReactElement;
  example: string;
};

const OPS: Op[] = [
  {
    slug: "rank_areas",
    name: "Rank areas",
    body: "Filter and sort LSOAs across one or more signals. AND semantics across up to 8 filter signals; 11 comparison operators including percentile bands.",
    Glyph: GlyphRank,
    example: "signals[].filter: lte / gt / percentile_between · sort_by",
  },
  {
    slug: "get_area",
    name: "Get area",
    body: "Return the full AreaProfile for one resolved area. Same shape as GET /v1/area on the Signals product; exposed here for plan chaining.",
    Glyph: GlyphGet,
    example: "params: { area }",
  },
  {
    slug: "score_area",
    name: "Score area",
    body: "Run the deterministic scoring engine for one area with a chosen profile. Same engine as POST /v1/score; same engine_version stamp.",
    Glyph: GlyphScore,
    example: "params: { area, preset, weights? }",
  },
  {
    slug: "find_peers",
    name: "Find peers",
    body: "k-NN over normalised signal values. Euclidean dimension-mean-squared, bounded [0,1], robust to missing dimensions. Default k=20, min 3 overlapping dims.",
    Glyph: GlyphPeers,
    example: "target: postcode | geo_code | area",
  },
  {
    slug: "find_insights",
    name: "Find insights",
    body: "Anomaly screening. Rank LSOAs by |peer_relative_z| on a pre-materialised z-score signal. signal_key must end in _peer_relative_z.",
    Glyph: GlyphInsights,
    example: "signal_key: crime.total_12m_peer_relative_z",
  },
  {
    slug: "find_forecast",
    name: "Find forecast",
    body: "Linear regression projection for one signal at one LSOA. Postgres regr_slope / regr_intercept over the trailing window. Constant ±2·σ band. NOT a learned model.",
    Glyph: GlyphForecast,
    example: "window_months: 24 · horizon_months: 12",
  },
];

function SectionOps() {
  return (
    <section
      className="oga-section-quiet oga-int-ops"
      aria-labelledby="int-ops-title"
    >
      <div className="oga-int__wrap">
        <header className="oga-int-ops__head">
          <h2 id="int-ops-title" className="oga-int-ops__title">
            Six plan ops. One typed grammar.
          </h2>
          <p className="oga-int-ops__sub">
            Every operation under /v1/query is one of these six. The shape
            is a Zod-strict discriminated union; the planner can only emit
            valid plans; unknown ops are rejected before execution.
          </p>
        </header>

        <div className="oga-int-ops__grid">
          {OPS.map((o) => {
            const Glyph = o.Glyph;
            return (
              <article key={o.slug} className="oga-int-op">
                <div className="oga-int-op__glyph" aria-hidden>
                  <Glyph />
                </div>
                <code className="oga-int-op__slug">op: {o.slug}</code>
                <h3 className="oga-int-op__name">{o.name}</h3>
                <p className="oga-int-op__body">{o.body}</p>
                <div className="oga-int-op__example">
                  <span className="oga-int-op__example-k">Shape</span>
                  {o.example}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* Tiny per-op glyphs — 36x36, dot-and-hairline */
function GlyphRank() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      <g fill="currentColor">
        <circle cx="6" cy="8" r="2.4" />
        <line x1="10" y1="8" x2="30" y2="8" stroke="currentColor" strokeWidth="1" />
        <circle cx="6" cy="18" r="2.4" opacity="0.75" />
        <line x1="10" y1="18" x2="24" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.75" />
        <circle cx="6" cy="28" r="2.4" opacity="0.45" />
        <line x1="10" y1="28" x2="18" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      </g>
    </svg>
  );
}

function GlyphGet() {
  // single dot with concentric ring (one specific area)
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      <circle cx="18" cy="18" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="18" cy="18" r="6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <circle cx="18" cy="18" r="3" fill="currentColor" />
    </svg>
  );
}

function GlyphScore() {
  // 5 inputs converging to apex (same as ScoresIcon shape, mini)
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      <g stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4">
        <line x1="6"  y1="30" x2="18" y2="6" />
        <line x1="12" y1="30" x2="18" y2="6" />
        <line x1="18" y1="30" x2="18" y2="6" />
        <line x1="24" y1="30" x2="18" y2="6" />
        <line x1="30" y1="30" x2="18" y2="6" />
      </g>
      <g fill="currentColor">
        <circle cx="6"  cy="30" r="1.4" />
        <circle cx="12" cy="30" r="1.4" />
        <circle cx="18" cy="30" r="1.4" />
        <circle cx="24" cy="30" r="1.4" />
        <circle cx="30" cy="30" r="1.4" />
        <circle cx="18" cy="6"  r="2.5" />
      </g>
    </svg>
  );
}

function GlyphPeers() {
  // target dot with neighbors at varying distance
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      <circle cx="18" cy="18" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" strokeDasharray="2 2" />
      <g fill="currentColor">
        <circle cx="18" cy="18" r="3" />
        <circle cx="10" cy="14" r="1.8" />
        <circle cx="26" cy="14" r="1.8" />
        <circle cx="14" cy="26" r="1.8" />
        <circle cx="24" cy="26" r="1.8" />
        <circle cx="28" cy="20" r="1.8" />
      </g>
    </svg>
  );
}

function GlyphInsights() {
  // distribution bell with one outlier marked
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      <path
        d="M 4 28 Q 12 28 14 14 Q 18 4 22 14 Q 24 28 32 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <line x1="4" y1="28" x2="32" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <circle cx="30" cy="22" r="2.6" fill="currentColor" />
    </svg>
  );
}

function GlyphForecast() {
  // line with projection dashes extending out
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" aria-hidden>
      <line x1="4" y1="28" x2="32" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <path
        d="M 4 24 L 10 22 L 16 19 L 20 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M 20 16 L 26 12 L 32 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeDasharray="2 2"
      />
      <g fill="currentColor">
        <circle cx="20" cy="16" r="2" />
        <circle cx="32" cy="8" r="2" />
      </g>
    </svg>
  );
}

/* ============================================================
   § 03 — Pipeline (DARK)
   ============================================================ */

function SectionPipeline() {
  return (
    <section
      className="oga-section-dark oga-int-pipe"
      data-oga-surface="dark"
      aria-labelledby="int-pipe-title"
    >
      <div className="oga-int__wrap">
        <header className="oga-int-pipe__head">
          <h2 id="int-pipe-title" className="oga-int-pipe__title">
            One executor. Two input modes. Zero AI in the answer path.
          </h2>
          <p className="oga-int-pipe__sub">
            A natural-language question routes through the planner; a
            programmatic plan skips the planner entirely. Both arrive at
            the same Zod validator and the same executor. Plans run
            against the database; AI never reads or returns a row.
          </p>
        </header>

        <div className="oga-int-pipe__stage">
          <IntelligencePipelineSvg />
        </div>

        <ul className="oga-int-pipe__notes">
          <li className="oga-int-pipe__note">
            <span className="oga-int-pipe__note-num">Planner seam</span>
            <h3 className="oga-int-pipe__note-title">
              AiProvider, not a model lock-in.
            </h3>
            <p className="oga-int-pipe__note-body">
              The planner calls a provider seam, not Anthropic directly.
              Swapping models is a config change. The 92.9% baseline is
              measured against the seam, not the provider.
            </p>
          </li>
          <li className="oga-int-pipe__note">
            <span className="oga-int-pipe__note-num">Zod strict</span>
            <h3 className="oga-int-pipe__note-title">
              Invalid plans get rejected before SQL.
            </h3>
            <p className="oga-int-pipe__note-body">
              Every nested object is .strict(). Unknown ops, unknown
              params, extra keys: 422 with the raw planner output. The
              executor only ever sees valid plans.
            </p>
          </li>
          <li className="oga-int-pipe__note">
            <span className="oga-int-pipe__note-num">Same executor</span>
            <h3 className="oga-int-pipe__note-title">
              NL and programmatic share the same code path.
            </h3>
            <p className="oga-int-pipe__note-body">
              The executor does not know whether the plan came from a
              question or a client. plan_source is metadata for audit, not
              a branch in the runtime.
            </p>
          </li>
          <li className="oga-int-pipe__note">
            <span className="oga-int-pipe__note-num">Replayable</span>
            <h3 className="oga-int-pipe__note-title">
              Every NL answer can be re-run as a programmatic call.
            </h3>
            <p className="oga-int-pipe__note-body">
              The response echoes the executed plan. Paste it into a
              {' '}<code>plan</code> body and the LLM is never touched
              again. That is the audit-safety contract.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function IntelligencePipelineSvg() {
  return (
    <svg
      className="oga-int-pipe__svg"
      viewBox="0 0 1080 360"
      role="img"
      aria-label="Intelligence pipeline: NL or programmatic plan, Zod validator, executor, database"
    >
      {/* Two inputs converge into the validator */}
      <g transform="translate(40, 60)">
        <rect x="0" y="0" width="180" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="90" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">INPUT · NL</text>
        <text x="90" y="42" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">{`{ question }`}</text>
      </g>

      <g transform="translate(40, 240)">
        <rect x="0" y="0" width="180" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="90" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">INPUT · PROGRAMMATIC</text>
        <text x="90" y="42" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">{`{ plan }`}</text>
      </g>

      {/* Planner — only NL path goes through it */}
      <g transform="translate(280, 60)">
        <rect x="0" y="0" width="160" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        <text x="80" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">PLANNER</text>
        <text x="80" y="42" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">NL → plan</text>
      </g>

      {/* Routing lines */}
      <line x1="220" y1="90" x2="280" y2="90" stroke="currentColor" strokeWidth="1" />
      <line x1="440" y1="90" x2="540" y2="180" stroke="currentColor" strokeWidth="1" />
      <line x1="220" y1="270" x2="540" y2="180" stroke="currentColor" strokeWidth="1" />

      {/* Validator — accented (the gate) */}
      <g transform="translate(540, 150)">
        <rect x="0" y="0" width="180" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="90" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">ZOD STRICT</text>
        <text x="90" y="42" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">validate plan</text>
      </g>
      <line x1="720" y1="180" x2="780" y2="180" stroke="currentColor" strokeWidth="1" />

      {/* Executor — accented (the core) */}
      <g transform="translate(780, 150)">
        <rect x="0" y="0" width="160" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="80" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">EXECUTOR</text>
        <text x="80" y="42" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">deterministic SQL</text>
      </g>

      {/* Database — drops down. Two-line table-name layout because
          "signal_values · signal_timeseries" on one line at mono-11 is
          ~200px wide; box is 160px. Two-line keeps real table names
          visible while staying within bounds. */}
      <g transform="translate(780, 256)">
        <rect x="0" y="0" width="160" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="80" y="18" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="9.5"
              fill="currentColor" opacity="0.55" letterSpacing="2">DATABASE</text>
        <text x="80" y="38" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11"
              fill="currentColor">signal_values</text>
        <text x="80" y="54" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11"
              fill="currentColor">signal_timeseries</text>
      </g>
      <line x1="860" y1="210" x2="860" y2="256" stroke="currentColor" strokeWidth="1" opacity="0.55" strokeDasharray="3 3" />

      {/* Response — to the right */}
      <g transform="translate(960, 150)">
        <rect x="0" y="0" width="100" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="50" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">RESPONSE</text>
        <text x="50" y="42" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="12"
              fill="currentColor">plan · rows</text>
      </g>
      <line x1="940" y1="180" x2="960" y2="180" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/* ============================================================
   § 04 — Measured accuracy (cream) — 92.9% baseline
   ============================================================ */

function SectionEval() {
  return (
    <section
      className="oga-section-quiet oga-int-eval"
      aria-labelledby="int-eval-title"
    >
      <div className="oga-int__wrap">
        <header className="oga-int-eval__head">
          <h2 id="int-eval-title" className="oga-int-eval__title">
            Measured accuracy. Published corpus. Falsifiable.
          </h2>
          <p className="oga-int-eval__sub">
            We run a CLI eval harness against a curated corpus of natural-
            language questions and compare the emitted plan to the
            expected plan via a deep-diff. Every result is in-repo and
            reproducible.
          </p>
        </header>

        <div className="oga-int-eval__card">
          <div className="oga-int-eval__headline">
            <span className="oga-int-eval__headline-num">92.9%</span>
            <span className="oga-int-eval__headline-denom">
              planner accuracy on a 14-case curated corpus, measured
              against claude-sonnet-4-20250514
            </span>
          </div>
          <div className="oga-int-eval__breakdown">
            <div className="oga-int-eval__breakdown-row">
              <span className="oga-int-eval__breakdown-k">get_area</span>
              <span className="oga-int-eval__breakdown-v">2 / 2</span>
            </div>
            <div className="oga-int-eval__breakdown-row">
              <span className="oga-int-eval__breakdown-k">score_area</span>
              <span className="oga-int-eval__breakdown-v">2 / 2</span>
            </div>
            <div className="oga-int-eval__breakdown-row">
              <span className="oga-int-eval__breakdown-k">find_peers</span>
              <span className="oga-int-eval__breakdown-v">2 / 2</span>
            </div>
            <div className="oga-int-eval__breakdown-row">
              <span className="oga-int-eval__breakdown-k">find_insights</span>
              <span className="oga-int-eval__breakdown-v">2 / 2</span>
            </div>
            <div className="oga-int-eval__breakdown-row">
              <span className="oga-int-eval__breakdown-k">find_forecast</span>
              <span className="oga-int-eval__breakdown-v">2 / 2</span>
            </div>
            <div className="oga-int-eval__breakdown-row">
              <span className="oga-int-eval__breakdown-k">rank_areas</span>
              <span className="oga-int-eval__breakdown-v">3 / 4</span>
            </div>
          </div>
        </div>

        <p className="oga-int-eval__caveat">
          92.9% on n=14 carries a wide Wilson 95% confidence interval of
          roughly 70 to 99 percent. The corpus is small by design and
          version-controlled. Headline number is provider-specific and
          gets re-run on any model swap. End-to-end NL → result accuracy
          is a separate eval; this number is the NL → plan seam only.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   § 05 — Endpoints (cream)
   ============================================================ */

type Param = { name: string; type: string; required: boolean; desc: string };
type Endpoint = {
  method: "POST";
  path: string;
  what: string;
  params: Param[];
  response: string;
  codes: { code: string; meaning: string }[];
};

const EPS: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/query",
    what:
      "The typed query plane. Send EXACTLY ONE of {question} or {plan}. NL routes through the planner; programmatic skips it. Both arrive at the same executor. Response always echoes the executed plan plus plan_source.",
    params: [
      { name: "question", type: "string", required: false, desc: "Natural-language question. Routed through the planner. Mutually exclusive with plan." },
      { name: "plan", type: "QueryPlan", required: false, desc: "Pre-built plan matching QueryPlanSchema (Zod-strict). The LLM is never touched. Mutually exclusive with question." },
      { name: "bundle", type: "string (Lever)", required: false, desc: "Custom signal-bundle id. Plan signals are gated against the bundle whitelist after planning; 422 bundle_signal_not_allowed otherwise." },
    ],
    response: "Per-op union response. Every variant carries { plan, plan_source: 'client' | 'nl', results, meta:{generated_at} }. X-Engine-Version header carries the effective methodology pin.",
    codes: [
      { code: "200", meaning: "Plan validated and executed." },
      { code: "400", meaning: "Request shape invalid (both question and plan, or neither)." },
      { code: "401", meaning: "Missing or invalid API key." },
      { code: "404", meaning: "Signals API flag off." },
      { code: "422", meaning: "Planner returned no JSON, invalid plan, LLM error, or plan referenced signals outside the active bundle. Raw planner output carried in the body." },
    ],
  },
  {
    method: "POST",
    path: "/v1/peers",
    what:
      "Convenience endpoint over the find_peers plan op. Same Euclidean dimension-mean-squared k-NN, same materialised peer graph, same min_signals HAVING guard.",
    params: [
      { name: "target", type: "{geo_code} | {postcode} | {area}", required: true, desc: "EXACTLY one. Resolves to an LSOA via the ONS spine if postcode or area." },
      { name: "signals", type: "string[]", required: false, desc: "Subset of dimensions to compare on (1..20). Default = all signals the target has normalised." },
      { name: "country", type: "enum", required: false, desc: "England, Wales, Scotland. Scopes the candidate set by LSOA prefix." },
      { name: "lad", type: "string", required: false, desc: "Local Authority District code. Scopes via the ONS spine." },
      { name: "k", type: "number", required: false, desc: "Peers to return. Default 20, max 200." },
      { name: "min_signals", type: "number", required: false, desc: "HAVING guard. Minimum overlapping dimensions per peer. Default 3." },
      { name: "cohort_id", type: "string (Lever)", required: false, desc: "Constrain candidates to a named org peer cohort." },
    ],
    response: "PeersResponse: { target:{geo_code, signals_used}, peers:[{geo_code, distance, n_dims_used}], meta }. distance in [0,1].",
    codes: [
      { code: "200", meaning: "Peers found." },
      { code: "400", meaning: "target missing or contains multiple of {geo_code, postcode, area}; signals/k/min_signals fail bounds." },
      { code: "401", meaning: "Missing or invalid API key." },
      { code: "404", meaning: "Target could not be resolved OR has no normalised signal values; cohort not in caller's org." },
    ],
  },
  {
    method: "POST",
    path: "/v1/insights",
    what:
      "Convenience endpoint over the find_insights plan op. Anomaly screening: LSOAs ranked by |peer_relative_z| on a pre-materialised z-score signal.",
    params: [
      { name: "signal_key", type: "string", required: true, desc: "MUST end in _peer_relative_z. The executor reads from a pre-materialised column; the peer math runs offline." },
      { name: "country", type: "enum", required: false, desc: "England, Wales, Scotland. Country scope." },
      { name: "lad", type: "string", required: false, desc: "Local Authority District code." },
      { name: "min_abs_z", type: "number", required: false, desc: "Filter to |z| at or above the threshold. Default 0 (no threshold)." },
      { name: "k", type: "number", required: false, desc: "Default 50, max 500." },
    ],
    response: "InsightsResponse: { signal_key, insights:[{geo_code, peer_relative_z (signed), abs_z}], meta }. Ranked by abs_z desc.",
    codes: [
      { code: "200", meaning: "Insights returned in rank order." },
      { code: "400", meaning: "signal_key not a *_peer_relative_z signal, or other bounds fail." },
      { code: "401", meaning: "Missing or invalid API key." },
    ],
  },
  {
    method: "POST",
    path: "/v1/forecast",
    what:
      "Convenience endpoint over the find_forecast plan op. Linear regression projection for ONE signal at ONE LSOA. NOT a learned model.",
    params: [
      { name: "target", type: "{geo_code} | {postcode} | {area}", required: true, desc: "EXACTLY one. Same shape as /v1/peers." },
      { name: "signal_key", type: "string", required: true, desc: "Any signal with a monthly time-series (e.g. property.median_price, crime.monthly_count)." },
      { name: "window_months", type: "number", required: false, desc: "Trailing window to fit. Default 24, min 6, max 120." },
      { name: "horizon_months", type: "number", required: false, desc: "Months to project ahead. Default 12, max 60." },
    ],
    response: "ForecastResponse: { target:{geo_code}, signal_key, points:[{observed_period 'YYYY-MM', projected_value, lower_bound, upper_bound}], meta:{n_observations, r2, slope_per_month, intercept, residual_stderr, latest_observed_period, window_months, horizon_months} }. Constant-width band (does NOT widen with horizon).",
    codes: [
      { code: "200", meaning: "Projection returned in native signal units." },
      { code: "400", meaning: "target ill-formed, signal_key missing, window or horizon out of bounds." },
      { code: "401", meaning: "Missing or invalid API key." },
      { code: "404", meaning: "Target could not be resolved OR window has fewer than 2 monthly observations." },
    ],
  },
];

/* SectionEndpoints + CodeRow extracted to shared
   _shared/product-endpoint-panel.{tsx,css} in AR-211.
   Per-product variation = title + sub + EPS data. */

/* ============================================================
   § 06 — Built for (cream) — 5 ICPs, CRE leads
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
    name: "CRE and site selection",
    Viz: VizCre,
    problem:
      "A retail or site-selection team has to screen hundreds of candidate catchments against compound criteria: affordable footprint, rising demographic momentum, low crime, deprivation profile that matches the brand. Today they stitch ONS extracts, Land Registry and a crime spreadsheet, then re-rank by hand. Each refresh means rebuilding the join.",
    why:
      "One typed compound rank_areas plan answers all of that. signals[] of up to 8 AND-joined filters, sort_by any of them, country or LAD scope, limit. find_peers narrows the shortlist to areas like the best-performing store. find_insights flags catchments where one signal is unusually high or low vs the peer group. The plan grammar IS the API.",
    value:
      "Hundreds of catchment screens compress into one round trip. The criteria are version-controlled JSON, not a spreadsheet. The shortlist is reproducible: every result echoes the executed plan so a colleague can paste it back and get the same answer.",
    sales:
      "Screen the whole UK against your compound site criteria in one typed call, then ask for the peer set of your best-performing catchment.",
  },
  {
    name: "Public sector",
    Viz: VizPublic,
    problem:
      "Research and policy teams have to defend every number they publish. A black-box AI score is unusable; they need to point at the methodology, the inputs, and the SQL. The analysis also needs to be reproducible next quarter when the data refreshes.",
    why:
      "Every response echoes the executed plan plus plan_source ('client' or 'nl'), so any answer is replayable as a programmatic call. Forecast meta exposes n_observations, r2, slope_per_month, residual_stderr; insights expose signed peer_relative_z and abs_z; peers expose distance and n_dims_used. No inference inside the executor.",
    value:
      "Methodology defensibility. The team can point at a published methodology, a Zod schema, and the SQL that produced every row. The AI is constrained to picking the query, never to setting the numbers.",
    sales:
      "An AI query plane where the AI is the interface, not the answer. Every row traces to deterministic SQL and a published methodology.",
  },
  {
    name: "Lenders",
    Viz: VizLender,
    problem:
      "A regulated lender needs an answer they can defend to a model risk committee. 'Our planner uses AI' is a non-starter unless it is measurable, version-pinned, and auditable. The methodology cannot silently change between two quarterly portfolio runs.",
    why:
      "Three guarantees together: the 92.9% planner accuracy on the 14-case curated corpus is published with its methodology, the executed plan plus plan_source ride in every response so model risk can replay any NL answer as a deterministic {plan} POST, and the X-Engine-Version header honours methodology pinning per org so two runs at the same pin return the same numbers.",
    value:
      "Auditable AI-assisted screening. The compliance story is 'here is the corpus, here is the accuracy number, here is the version we ran under, here is the plan that produced this row'. Not 'the LLM told us'.",
    sales:
      "AI-assisted area queries with a published accuracy number, a typed plan you can replay, and a methodology-pin header so quarterly runs are deterministic.",
  },
  {
    name: "Insurance and InsureTech",
    Viz: VizInsurer,
    problem:
      "An underwriter needs to comp a risk postcode against its true peer group, not 'national average' and not 'same town'. Areas with similar demographic and built-environment signatures. They also need to spot catchments drifting away from that peer norm before the loss ratio tells them.",
    why:
      "find_peers gives a stable, symmetric similarity metric (Euclidean dimension-mean-squared over normalised signals in [0,1]). find_insights then ranks LSOAs by |peer_relative_z| on crime.total_12m_peer_relative_z or property.median_price_peer_relative_z, so the underwriter scans for unusually high crime vs the peer group, not in absolute terms. cohort_id lets the org pin a custom peer set when the global graph is not tight enough.",
    value:
      "A relative-risk lens, not just an absolute-risk lens. The underwriter can defend a flag as 'this catchment is 3.8 stddev from its peer group on crime', with the peer set itself materialised and inspectable.",
    sales:
      "Peer-relative anomaly screening over a materialised similarity graph. Comp risk against a real peer group, not a postcode-district average.",
  },
  {
    name: "PropTech",
    Viz: VizPropTech,
    problem:
      "Listing platforms and property-search products want to surface 'areas like this one' tiles and answer ad-hoc natural-language queries from users (e.g. 'cheap places to buy where prices are rising and crime is low'). They do not want to build a query planner, an AI ops stack, or a peer-graph cache.",
    why:
      "POST /v1/query takes a free-text question; the planner translates through the SAME deterministic executor used in programmatic mode; the response carries the executed plan back. PropTech can render the rows directly OR pre-stage common queries as {plan} bodies for high-traffic pages (no LLM cost per pageview). find_peers is the 'similar areas' tile in one call.",
    value:
      "Two surfaces over one executor. NL for ad-hoc, {plan} for high-traffic. No internal planner to maintain, no LLM-cost-per-pageview unless they want it.",
    sales:
      "One typed API behind both your 'similar areas' tile and your natural-language area search.",
  },
];

/* SectionIcps extracted to shared _shared/product-icp-grid.{tsx,css}
   in AR-211. Per-product: ICPS data + bespoke Viz functions below. */

/* ICP micro-illustrations */

function VizCre() {
  // Compound filter visualization — 3 axes converging on a target
  return (
    <svg className="oga-int-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <line x1="14" y1="106" x2="106" y2="106" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="106" x2="14" y2="14" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="106" x2="106" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />
      <g fill="currentColor">
        <circle cx="34" cy="80" r="2" opacity="0.5" />
        <circle cx="50" cy="64" r="2" opacity="0.55" />
        <circle cx="68" cy="48" r="2" opacity="0.65" />
        <circle cx="86" cy="32" r="4" />
      </g>
      <circle cx="86" cy="32" r="9" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

function VizPublic() {
  // Plan echo — JSON braces around dots
  return (
    <svg className="oga-int-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g stroke="currentColor" strokeWidth="1.5" fill="none">
        <path d="M 30 28 Q 20 28 20 38 L 20 56 Q 20 60 16 60 Q 20 60 20 64 L 20 82 Q 20 92 30 92" />
        <path d="M 90 28 Q 100 28 100 38 L 100 56 Q 100 60 104 60 Q 100 60 100 64 L 100 82 Q 100 92 90 92" />
      </g>
      <g fill="currentColor">
        <circle cx="44" cy="52" r="2.6" />
        <circle cx="60" cy="52" r="2.6" />
        <circle cx="76" cy="52" r="2.6" />
        <circle cx="44" cy="68" r="2.6" />
        <circle cx="60" cy="68" r="2.6" />
        <circle cx="76" cy="68" r="2.6" />
      </g>
    </svg>
  );
}

function VizLender() {
  // Versioned plan replay — three stacked plan objects with one focal
  return (
    <svg className="oga-int-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55">
        <rect x="20" y="20" width="56" height="36" rx="2" />
        <rect x="32" y="44" width="56" height="36" rx="2" />
      </g>
      <rect x="44" y="68" width="56" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g fill="currentColor">
        <circle cx="56" cy="86" r="2" />
        <circle cx="68" cy="86" r="2" />
        <circle cx="80" cy="86" r="2" />
        <circle cx="92" cy="86" r="3" />
      </g>
      <line x1="50" y1="76" x2="94" y2="76" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

function VizInsurer() {
  // Peer cluster with one outlier marked
  return (
    <svg className="oga-int-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <circle cx="50" cy="60" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />
      <g fill="currentColor">
        <circle cx="38" cy="48" r="2.2" />
        <circle cx="52" cy="44" r="2.2" />
        <circle cx="64" cy="52" r="2.2" />
        <circle cx="40" cy="64" r="2.2" />
        <circle cx="56" cy="68" r="2.2" />
        <circle cx="68" cy="62" r="2.2" />
        <circle cx="48" cy="76" r="2.2" />
        <circle cx="60" cy="80" r="2.2" />
      </g>
      <circle cx="98" cy="32" r="4" fill="currentColor" />
      <line x1="68" y1="50" x2="92" y2="36" stroke="currentColor" strokeWidth="1" opacity="0.7" strokeDasharray="2 2" />
    </svg>
  );
}

function VizPropTech() {
  // search box with similar-areas tiles below
  return (
    <svg className="oga-int-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <rect x="14" y="20" width="92" height="22" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="22" y1="31" x2="84" y2="31" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="14" y="56" width="28" height="20" rx="2" />
        <rect x="46" y="56" width="28" height="20" rx="2" />
        <rect x="78" y="56" width="28" height="20" rx="2" />
        <rect x="14" y="84" width="28" height="20" rx="2" />
        <rect x="46" y="84" width="28" height="20" rx="2" />
        <rect x="78" y="84" width="28" height="20" rx="2" />
      </g>
      <g fill="currentColor">
        <circle cx="28" cy="66" r="2" />
        <circle cx="60" cy="66" r="2" />
        <circle cx="92" cy="66" r="2" />
        <circle cx="28" cy="94" r="2" />
        <circle cx="60" cy="94" r="2" />
        <circle cx="92" cy="94" r="2" />
      </g>
    </svg>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

/* FinalCta extracted to shared _shared/product-final-cta.{tsx,css}
   in AR-211. */
