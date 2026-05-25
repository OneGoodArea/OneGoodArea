"use client";

import Link from "next/link";

/* IntegrationSection (04) — "live in an afternoon".
   Light surface for contrast after the dark Defensible section.
   One engine, four ways in. A distribution bus across the top
   branches into four spec-sheet columns (hairline dividers, no card
   chrome). Each surface gets a bespoke dot-mark glyph in the same
   data-viz dialect as Defensible: a single framed dot (REST), a dense
   field (bulk), a node graph (MCP), radiating arcs (webhooks). */

type Surface = {
  id: "rest" | "bulk" | "mcp" | "webhooks";
  method: string;
  name: string;
  body: string;
  meta: string;
};

const SURFACES: Surface[] = [
  {
    id: "rest",
    method: "GET /v1/report",
    name: "REST API",
    body: "One authenticated call returns a full area score: every dimension, its source citation, and its confidence band. Versioned, documented, ready for production.",
    meta: "One area · one call",
  },
  {
    id: "bulk",
    method: "POST /v1/batch",
    name: "Bulk scoring",
    body: "Score up to 100 areas in a single request, or run entire portfolios overnight. Same engine, same version pinning, concurrency handled for you.",
    meta: "100 areas · one request",
  },
  {
    id: "mcp",
    method: "MCP protocol",
    name: "MCP server",
    body: "Drop the engine into Claude, Cursor, or any MCP client as a native tool. Your agents query UK area intelligence directly, with no glue code to maintain.",
    meta: "Agent-native · zero glue",
  },
  {
    id: "webhooks",
    method: "report.created",
    name: "Webhooks",
    body: "Subscribe once and we push. Get notified the moment a report lands. Score-change alerts for monitored portfolios ship next.",
    meta: "Push · subscribe once",
  },
];

/* ----- Bespoke dot-mark glyph per surface. 100x100, monochrome. ----- */

function GlyphRest() {
  /* One area in, one score out. A single framed result: solid center
     dot inside a hairline ring, with four faint corner dots for grid
     context. The single-vs-many contrast with bulk is the point. */
  const corners: Array<[number, number]> = [
    [26, 26], [74, 26], [26, 74], [74, 74],
  ];
  return (
    <svg viewBox="0 0 100 100" className="oga-integration__glyph-svg" aria-hidden>
      {corners.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill="currentColor" opacity={0.20} />
      ))}
      <circle cx={50} cy={50} r={25} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.40} />
      <circle cx={50} cy={50} r={9} fill="currentColor" />
    </svg>
  );
}

function GlyphBulk() {
  /* Volume — a dense uniform field of areas scored at once. Soft
     radial vignette so the field reads as deep rather than flat. */
  const coords = [20, 35, 50, 65, 80];
  return (
    <svg viewBox="0 0 100 100" className="oga-integration__glyph-svg" aria-hidden>
      {coords.map((y) =>
        coords.map((x) => {
          const d = Math.hypot(x - 50, y - 50);
          const o = Math.max(0.32, 1 - d / 60);
          return <circle key={`${x}-${y}`} cx={x} cy={y} r={3.1} fill="currentColor" opacity={o} />;
        })
      )}
    </svg>
  );
}

function GlyphMcp() {
  /* A node graph — the engine at the center, agent clients wired in
     around it. Connection over hairlines, no glue. */
  const SAT = 5;
  const sats = Array.from({ length: SAT }, (_, i) => {
    const a = (i / SAT) * Math.PI * 2 - Math.PI / 2;
    return [50 + Math.cos(a) * 31, 50 + Math.sin(a) * 31] as [number, number];
  });
  return (
    <svg viewBox="0 0 100 100" className="oga-integration__glyph-svg" aria-hidden>
      {sats.map(([x, y], i) => (
        <line key={`l-${i}`} x1={50} y1={50} x2={x} y2={y} stroke="currentColor" strokeWidth={0.7} opacity={0.32} />
      ))}
      {sats.map(([x, y], i) => (
        <circle key={`s-${i}`} cx={x} cy={y} r={4} fill="currentColor" opacity={0.78} />
      ))}
      <circle cx={50} cy={50} r={7.5} fill="currentColor" />
    </svg>
  );
}

function GlyphWebhooks() {
  /* Push — a source node emitting concentric arcs rightward toward a
     subscriber. The arcs pulse outward to feel like a live push. */
  const arc = (r: number) => {
    const x1 = 30 + r * Math.cos((-52 * Math.PI) / 180);
    const y1 = 50 + r * Math.sin((-52 * Math.PI) / 180);
    const x2 = 30 + r * Math.cos((52 * Math.PI) / 180);
    const y2 = 50 + r * Math.sin((52 * Math.PI) / 180);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  return (
    <svg viewBox="0 0 100 100" className="oga-integration__glyph-svg" aria-hidden>
      <path d={arc(42)} fill="none" stroke="currentColor" strokeWidth={1.0} opacity={0.18} className="oga-integration__pulse oga-integration__pulse--3" />
      <path d={arc(30)} fill="none" stroke="currentColor" strokeWidth={1.1} opacity={0.30} className="oga-integration__pulse oga-integration__pulse--2" />
      <path d={arc(18)} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.45} className="oga-integration__pulse oga-integration__pulse--1" />
      <circle cx={84} cy={50} r={3.4} fill="currentColor" opacity={0.35} />
      <circle cx={30} cy={50} r={7.5} fill="currentColor" />
    </svg>
  );
}

function Glyph({ id }: { id: Surface["id"] }) {
  if (id === "rest") return <GlyphRest />;
  if (id === "bulk") return <GlyphBulk />;
  if (id === "mcp") return <GlyphMcp />;
  return <GlyphWebhooks />;
}

export function IntegrationSection() {
  return (
    <section className="oga-integration">
      <div className="oga-integration__field" aria-hidden />

      <div className="oga-integration__inner">
        <header className="oga-integration__header">
          <div className="oga-integration__eyebrow">
            <span className="oga-integration__eyebrow-num">04</span>
            <span className="oga-integration__eyebrow-line" aria-hidden />
            <span>Integration</span>
          </div>
          <h2 className="oga-integration__title">Live in an afternoon.</h2>
          <p className="oga-integration__sub">
            Consume the engine however your stack works. One REST call, a bulk
            job, an MCP tool for your agents, or webhooks that push to you.
            Authenticated, versioned, and documented.
          </p>
        </header>

        {/* Distribution bus — one engine branches into the four surfaces. */}
        <div className="oga-integration__bus" aria-hidden>
          <span className="oga-integration__bus-node">
            <span className="oga-integration__bus-dot" />
            Engine&nbsp;·&nbsp;v2.0.2
          </span>
        </div>

        <div className="oga-integration__grid">
          {SURFACES.map((s, i) => (
            <article
              key={s.id}
              className="oga-integration__col"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="oga-integration__col-junction" aria-hidden />
              <div className="oga-integration__col-glyph">
                <Glyph id={s.id} />
              </div>
              <div className="oga-integration__col-method">{s.method}</div>
              <h3 className="oga-integration__col-name">{s.name}</h3>
              <p className="oga-integration__col-body">{s.body}</p>
              <div className="oga-integration__col-meta">{s.meta}</div>
            </article>
          ))}
        </div>

        <div className="oga-integration__foot">
          <p className="oga-integration__foot-text">
            Every response is stamped with the engine version that produced it.
            Pin it once and your integration stays reproducible.
          </p>
          <div className="oga-integration__foot-links">
            <Link href="/docs/api-reference" className="oga-btn oga-btn-primary">
              Read the API reference
              <span aria-hidden style={{ marginLeft: 6 }}>→</span>
            </Link>
            <Link href="/docs/mcp" className="oga-btn oga-btn-secondary">
              MCP install docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
