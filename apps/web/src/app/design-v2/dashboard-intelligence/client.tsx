"use client";

/* AR-264 /dashboard/intelligence catalogue.

   Intelligence is the typed query plane that customers integrate
   against from their own code. The dashboard's job here is reference
   + management — pick the right op, see its shape, copy the call.
   Customers don't RUN queries from /dashboard; that belongs in their
   code (POST /v1/query) or /docs/playground for prospects.

   Page shape is its own thing — not a Signals clone:

   1) "Query plane shape" stripe at the top. Three terse code blocks
      side-by-side: NL input, programmatic input, response envelope.
      Visually explains the dual-input contract before any op.

   2) Two-pane ops browser. Left rail = the 7 ops as a navigation
      list, glyph + label + return type. Right pane = the selected
      op's FULL detail in one direct view: blurb, param table,
      worked example (NL + plan), and the copyable curl. No expand /
      collapse, no scrolling-and-clicking — pick op, read detail.

   3) Typed errors panel at the bottom. Stable codes a consumer
      branches on instead of pattern-matching strings.

   This is a developer-surface layout (docs browser pattern),
   structurally distinct from Signals' category grid, Scores' preset
   management, and Monitor's portfolio CRUD. */

import { useState } from "react";
import { AppShell } from "../_shared/app-shell";
import { IntelligenceIcon } from "../_shared/product-icons";
import { OP_GLYPH, type IntelligenceOp } from "../_shared/dashboard/op-glyphs";
import "./client.css";

interface ParamRow {
  name: string;
  type: string;
  desc: string;
  required?: boolean;
  defaultValue?: string;
}

interface OpEntry {
  key: IntelligenceOp;
  family: string;
  label: string;
  blurb: string;
  /** Return-type label shown in the left rail + the detail header. */
  returns: string;
  params: ParamRow[];
  example: { question: string; plan: object };
}

const OP_CATALOGUE: readonly OpEntry[] = [
  {
    key: "rank_areas",
    family: "Cross-area",
    label: "Rank areas",
    blurb: "Rank LSOAs across a region by one signal, or a compound of signals with AND filters.",
    returns: "AreaResult[]",
    params: [
      { name: "signal | signals", type: "string | SignalEntry[]", desc: "Singular: one signal key. Compound: array of {key, filter?} with per-signal filters.", required: true },
      { name: "sort | sort_by",   type: "enum | SortBy",          desc: "Singular: percentile_desc | percentile | value_desc | value. Compound: {signal, mode, direction}." },
      { name: "country",          type: "England | Wales | Scotland", desc: "Optional country scope." },
      { name: "lad",              type: "ONS LAD code",           desc: "Optional local-authority scope, e.g. E08000003." },
      { name: "limit",            type: "1..1000",                desc: "Max rows returned.", defaultValue: "100" },
      { name: "min_percentile, max_percentile", type: "0..100", desc: "Singular-only percentile bounds." },
      { name: "min_value, max_value",           type: "number", desc: "Singular-only raw-value bounds." },
    ],
    example: {
      question: "England areas under £250k with rising prices and low crime",
      plan: {
        op: "rank_areas",
        params: {
          signals: [
            { key: "property.median_price", filter: { lte: 250000 } },
            { key: "property.price_change_pct_yoy", filter: { gt: 0 } },
            { key: "crime.total_12m", filter: { percentile_lte: 50 } },
          ],
          sort_by: { signal: "property.price_change_pct_yoy", mode: "value", direction: "desc" },
          country: "England",
          limit: 50,
        },
      },
    },
  },
  {
    key: "get_area",
    family: "Single area",
    label: "Get area",
    blurb: "Full signal profile for one area. Postcodes resolve directly; ambiguous place names return 422 with candidates.",
    returns: "AreaProfile",
    params: [
      { name: "area", type: "string", desc: "Postcode (M1 1AE) or place name. Postcodes skip the disambiguation step.", required: true },
    ],
    example: {
      question: "Tell me about M1 1AE",
      plan: { op: "get_area", params: { area: "M1 1AE" } },
    },
  },
  {
    key: "compare_areas",
    family: "Multi-area",
    label: "Compare areas",
    blurb: "Side-by-side profiles for 2-5 areas in plan order. Not-found slots stay null — never silently dropped.",
    returns: "CompareAreaSlot[]",
    params: [
      { name: "areas", type: "string[] (2..5)", desc: "Ordered list of postcodes or place names. Each slot resolves independently.", required: true },
    ],
    example: {
      question: "Compare M1 1AE and EC1A 1BB",
      plan: { op: "compare_areas", params: { areas: ["M1 1AE", "EC1A 1BB"] } },
    },
  },
  {
    key: "score_area",
    family: "Scoring",
    label: "Score area",
    blurb: "Composite 0-100 score with dimension breakdown. Preset or custom weights.",
    returns: "ScoreResult",
    params: [
      { name: "area",    type: "string",                                  desc: "Postcode or place name.", required: true },
      { name: "preset",  type: "moving | business | investing | research", desc: "Intent preset.", defaultValue: "research" },
      { name: "weights", type: "Record<string, number>",                  desc: "Optional per-dimension override. Keys are dimension slugs." },
    ],
    example: {
      question: "Score SW1A 1AA for investment",
      plan: { op: "score_area", params: { area: "SW1A 1AA", preset: "investing" } },
    },
  },
  {
    key: "find_peers",
    family: "Discovery",
    label: "Find peers",
    blurb: "k-NN over normalised signals. Areas most similar to a target across a chosen dimension subset.",
    returns: "PeersResponse",
    params: [
      { name: "target",      type: "{geo_code} | {postcode} | {area}", desc: "Exactly one of the three identifiers.", required: true },
      { name: "signals",     type: "string[]",                          desc: "Optional dimension subset. Default = every normalised signal the target has." },
      { name: "country, lad", type: "string",                            desc: "Optional country / LAD scope on candidate set." },
      { name: "k",           type: "1..200",                             desc: "Number of peers returned.", defaultValue: "20" },
      { name: "min_signals", type: "1..20",                              desc: "Minimum dimensions a candidate must share with the target.", defaultValue: "3" },
    ],
    example: {
      question: "Areas similar to M1 1AE in England",
      plan: { op: "find_peers", params: { target: { postcode: "M1 1AE" }, country: "England", k: 20 } },
    },
  },
  {
    key: "find_insights",
    family: "Discovery",
    label: "Find insights",
    blurb: "Anomaly screening — LSOAs ranked by |peer-relative z| on a chosen signal. Statistical outliers vs their peer group.",
    returns: "InsightsResponse",
    params: [
      { name: "signal_key",  type: "string", desc: "A peer_relative_z signal key (e.g. crime.total_12m_peer_relative_z).", required: true },
      { name: "country, lad", type: "string", desc: "Optional scope." },
      { name: "min_abs_z",   type: "number", desc: "Drop rows below this |z| threshold." },
      { name: "k",           type: "1..500", desc: "Max rows returned.", defaultValue: "50" },
    ],
    example: {
      question: "England LSOAs with anomalously high crime vs their peer group, |z| >= 2",
      plan: { op: "find_insights", params: { signal_key: "crime.total_12m_peer_relative_z", country: "England", min_abs_z: 2, k: 50 } },
    },
  },
  {
    key: "find_forecast",
    family: "Time-series",
    label: "Find forecast",
    blurb: "Linear-regression projection of one signal at one area. Returns observation-period points with confidence bounds.",
    returns: "ForecastResponse",
    params: [
      { name: "target",          type: "{geo_code} | {postcode} | {area}", desc: "Exactly one identifier.", required: true },
      { name: "signal_key",      type: "string",                          desc: "A monthly time-series signal key.", required: true },
      { name: "window_months",   type: "6..120",                          desc: "How much history to fit on.", defaultValue: "24" },
      { name: "horizon_months",  type: "1..60",                           desc: "How many months to project.", defaultValue: "12" },
    ],
    example: {
      question: "Forecast the next 12 months of median house price in M1 1AE",
      plan: { op: "find_forecast", params: { target: { postcode: "M1 1AE" }, signal_key: "property.median_price", horizon_months: 12 } },
    },
  },
] as const;

const ERROR_REFERENCE: ReadonlyArray<{ code: string; status: number; desc: string }> = [
  { code: "ambiguous_location",        status: 422, desc: "A place name matched multiple distinct places. Body carries candidates[] — re-ask with a specific postcode." },
  { code: "bundle_signal_not_allowed", status: 422, desc: "The validated plan references signals outside the caller's bundle. Body lists the offending signal keys." },
  { code: "invalid_plan",              status: 422, desc: "The plan failed Zod validation against the typed grammar. Body carries the validation error path + reason." },
  { code: "no_json",                   status: 422, desc: "The planner LLM did not return parseable JSON. Body carries the raw model output for debugging." },
  { code: "llm_error",                 status: 422, desc: "The planner LLM call failed (network, auth, upstream timeout). Retry — typically transient." },
];

export default function IntelligenceCatalogueClient() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

function Body() {
  /* Selected op drives the right pane. No expand/collapse — pick op,
     read detail. Default to the first op (rank_areas) so the page
     never shows an empty pane. */
  const [selected, setSelected] = useState<IntelligenceOp>("rank_areas");
  const entry = OP_CATALOGUE.find((o) => o.key === selected)!;

  return (
    <div className="oga-int">
      <header className="oga-int__product">
        <span className="oga-int__product-mark" aria-hidden>
          <IntelligenceIcon width={56} height={56} />
        </span>
        <div className="oga-int__product-text">
          <span className="oga-int__product-eyebrow">Product</span>
          <h2 className="oga-int__product-title">Intelligence</h2>
          <p className="oga-int__product-tagline">
            Seven typed operations over the moat. Send a natural-language
            question or a pre-built plan — the validated plan, plan_source,
            and result ride back together so you can audit, replay, and pin
            versions in production.
          </p>
        </div>
      </header>

      <QueryPlaneShape />

      <section className="oga-int__browser" aria-label="Operations browser">
        <nav className="oga-int-rail" aria-label="Operations">
          <span className="oga-int-rail__eyebrow">Operations</span>
          <ul className="oga-int-rail__list">
            {OP_CATALOGUE.map((op) => {
              const active = op.key === selected;
              return (
                <li key={op.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(op.key)}
                    className={active ? "oga-int-rail__item oga-int-rail__item--active" : "oga-int-rail__item"}
                    aria-current={active ? "true" : undefined}
                  >
                    <span className="oga-int-rail__glyph" aria-hidden>
                      {OP_GLYPH[op.key]()}
                    </span>
                    <span className="oga-int-rail__text">
                      <span className="oga-int-rail__label">{op.label}</span>
                      <code className="oga-int-rail__returns">{op.returns}</code>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <article className="oga-int-detail" key={entry.key}>
          <OpDetail entry={entry} />
        </article>
      </section>

      <ErrorsPanel />
    </div>
  );
}

/* The dual-input contract as a compact code stripe — three terse blocks
   side-by-side: NL input, programmatic input, response envelope. No
   marketing prose; this is the contract a developer needs to see
   before they navigate the ops list. */
function QueryPlaneShape() {
  return (
    <section className="oga-int-shape" aria-label="Query plane shape">
      <Block
        eyebrow="Input · Path 1"
        tag="NL"
        title="Question → planner"
        code={`POST /v1/query
{ "question": "…" }`}
        note={'plan_source: "nl"'}
      />
      <Connector />
      <Block
        eyebrow="Input · Path 2"
        tag="Programmatic"
        title="Plan → executor"
        code={`POST /v1/query
{ "plan": { "op": "…" } }`}
        note={'plan_source: "client"'}
      />
      <Connector />
      <Block
        eyebrow="Response"
        tag="Envelope"
        title="Same shape"
        code={`{
  plan, plan_source,
  results, meta
}`}
        note="Replayable + auditable"
      />
    </section>
  );
}

function Block({ eyebrow, tag, title, code, note }: { eyebrow: string; tag: string; title: string; code: string; note: string }) {
  return (
    <div className="oga-int-shape__block">
      <header>
        <span className="oga-int-shape__eyebrow">{eyebrow}</span>
        <span className="oga-int-shape__tag">{tag}</span>
      </header>
      <h4 className="oga-int-shape__title">{title}</h4>
      <pre className="oga-int-shape__code"><code>{code}</code></pre>
      <p className="oga-int-shape__note">{note}</p>
    </div>
  );
}

function Connector() {
  return (
    <span className="oga-int-shape__connector" aria-hidden>
      <svg viewBox="0 0 16 32" width="16" height="32">
        <line x1="0" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <polyline points="11,11 16,16 11,21" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.7" />
      </svg>
    </span>
  );
}

function OpDetail({ entry }: { entry: OpEntry }) {
  const planJson = JSON.stringify(entry.example.plan, null, 2);
  const compactPlan = JSON.stringify(entry.example.plan);
  const curl = `curl https://api.onegoodarea.com/v1/query \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${compactPlan}'`;
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <header className="oga-int-detail__head">
        <span className="oga-int-detail__glyph" aria-hidden>
          {OP_GLYPH[entry.key]()}
        </span>
        <div className="oga-int-detail__head-text">
          <span className="oga-int-detail__eyebrow">
            {entry.family} · returns <code>{entry.returns}</code>
          </span>
          <h3 className="oga-int-detail__title">{entry.label}</h3>
          <p className="oga-int-detail__blurb">{entry.blurb}</p>
        </div>
      </header>

      <section className="oga-int-detail__params">
        <span className="oga-int-detail__section-eyebrow">Parameters</span>
        <ul>
          {entry.params.map((p) => (
            <li key={p.name}>
              <code className="oga-int-detail__param-name">{p.name}</code>
              <code className="oga-int-detail__param-type">{p.type}</code>
              <span className="oga-int-detail__param-desc">
                {p.desc}
                {p.defaultValue ? (
                  <span className="oga-int-detail__param-default">
                    Default: <code>{p.defaultValue}</code>
                  </span>
                ) : null}
                {p.required ? (
                  <span className="oga-int-detail__param-required">required</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="oga-int-detail__example">
        <span className="oga-int-detail__section-eyebrow">Worked example</span>
        <div className="oga-int-detail__example-pair">
          <div className="oga-int-detail__example-col">
            <span className="oga-int-detail__example-eyebrow">Natural language</span>
            <pre>{JSON.stringify({ question: entry.example.question }, null, 2)}</pre>
          </div>
          <div className="oga-int-detail__example-col">
            <span className="oga-int-detail__example-eyebrow">Programmatic plan</span>
            <pre>{planJson}</pre>
          </div>
        </div>
      </section>

      <section className="oga-int-detail__call">
        <header>
          <span className="oga-int-detail__section-eyebrow">Call</span>
          <button type="button" className="oga-int-detail__copy" onClick={() => copy(curl)}>
            {copied ? "Copied ✓" : "Copy curl"}
          </button>
        </header>
        <pre className="oga-int-detail__curl"><code>{curl}</code></pre>
      </section>
    </>
  );
}

function ErrorsPanel() {
  return (
    <section className="oga-int-errs" aria-label="Typed errors">
      <header className="oga-int-errs__head">
        <span className="oga-int-errs__eyebrow">Typed errors (422)</span>
        <p className="oga-int-errs__hint">
          Every 422 carries a typed <code>code</code>. Branch on it instead of
          pattern-matching the message string — codes are stable; messages
          can change.
        </p>
      </header>
      <ul className="oga-int-errs__rows">
        {ERROR_REFERENCE.map((e) => (
          <li key={e.code}>
            <code className="oga-int-errs__code">{e.code}</code>
            <code className="oga-int-errs__status">HTTP {e.status}</code>
            <span className="oga-int-errs__desc">{e.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
