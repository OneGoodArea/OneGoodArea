"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import "./integration-section.css";

/* ---------- Bespoke glyphs per surface ----------
   Each glyph is a 100x100 dot-and-hairline diagram in the Plotted
   vocabulary. They were in the legacy 4-column layout; bringing them
   back into the new tabbed reskin as the tab's icon. */

type IconProps = SVGProps<SVGSVGElement>;
const glyphBase: IconProps = {
  viewBox: "0 0 100 100",
  fill: "none",
  "aria-hidden": true,
};

function GlyphRest(props: IconProps) {
  /* One area in, one score out. Solid center dot inside hairline
     ring + 4 faint corner dots for grid context. */
  const corners: Array<[number, number]> = [[26, 26], [74, 26], [26, 74], [74, 74]];
  return (
    <svg {...glyphBase} {...props}>
      {corners.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill="currentColor" opacity={0.20} />
      ))}
      <circle cx={50} cy={50} r={25} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.40} />
      <circle cx={50} cy={50} r={9} fill="currentColor" />
    </svg>
  );
}

function GlyphBulk(props: IconProps) {
  /* Volume — dense uniform field of areas scored at once. Soft
     radial vignette so the field reads as deep rather than flat. */
  const coords = [20, 35, 50, 65, 80];
  return (
    <svg {...glyphBase} {...props}>
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

function GlyphQuery(props: IconProps) {
  /* Question → plan → structured answer. Scattered NL dots left,
     central plan node with halo, structured 2x3 result grid right.
     Hairline cross-bar ties them together. */
  return (
    <svg {...glyphBase} {...props}>
      <circle cx={12} cy={32} r={2.4} fill="currentColor" opacity={0.42} />
      <circle cx={24} cy={44} r={2.4} fill="currentColor" opacity={0.42} />
      <circle cx={14} cy={56} r={2.4} fill="currentColor" opacity={0.42} />
      <circle cx={26} cy={68} r={2.4} fill="currentColor" opacity={0.42} />
      <line x1={28} y1={50} x2={62} y2={50} stroke="currentColor" strokeWidth={0.8} opacity={0.42} />
      <circle cx={46} cy={50} r={6.5} fill="currentColor" />
      <circle cx={46} cy={50} r={9.5} fill="none" stroke="currentColor" strokeWidth={0.6} opacity={0.32} />
      <circle cx={70} cy={36} r={2.4} fill="currentColor" />
      <circle cx={84} cy={36} r={2.4} fill="currentColor" />
      <circle cx={70} cy={50} r={2.4} fill="currentColor" />
      <circle cx={84} cy={50} r={2.4} fill="currentColor" />
      <circle cx={70} cy={64} r={2.4} fill="currentColor" />
      <circle cx={84} cy={64} r={2.4} fill="currentColor" />
    </svg>
  );
}

function GlyphWebhooks(props: IconProps) {
  /* Push — source node emitting concentric arcs rightward toward a
     subscriber. The arcs pulse outward to feel like a live push. */
  const arc = (r: number) => {
    const x1 = 30 + r * Math.cos((-52 * Math.PI) / 180);
    const y1 = 50 + r * Math.sin((-52 * Math.PI) / 180);
    const x2 = 30 + r * Math.cos((52 * Math.PI) / 180);
    const y2 = 50 + r * Math.sin((52 * Math.PI) / 180);
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  return (
    <svg {...glyphBase} {...props}>
      <path d={arc(42)} fill="none" stroke="currentColor" strokeWidth={1.0} opacity={0.18} className="oga-integration__pulse oga-integration__pulse--3" />
      <path d={arc(30)} fill="none" stroke="currentColor" strokeWidth={1.1} opacity={0.30} className="oga-integration__pulse oga-integration__pulse--2" />
      <path d={arc(18)} fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.45} className="oga-integration__pulse oga-integration__pulse--1" />
      <circle cx={84} cy={50} r={3.4} fill="currentColor" opacity={0.35} />
      <circle cx={30} cy={50} r={7.5} fill="currentColor" />
    </svg>
  );
}

/* IntegrationSection (04) — code-first reskin.
   AR-204 PR 2 / commit 5.

   Replaces the legacy 4-column spec-sheet layout. Now a tabbed
   featured panel pattern (same UX as section 2 BuiltFor) with the
   featured panel rendering a real curl + response in the existing
   .oga-code-panel vocabulary (specimen-mount corner ticks, line
   numbers, token-coloured syntax — already in components.css).

   The 4 surfaces are: REST · Bulk · Query plane · Webhooks.
   MCP is intentionally NOT a tab — it has its own /docs/mcp page
   for buyers who care; the homepage doesn't promote it. */

type Surface = {
  id: "rest" | "bulk" | "query" | "webhooks";
  Glyph: ComponentType<IconProps>;
  tabMethod: string;
  tabName: string;
  panelName: string;
  panelBody: string;
  ctaLabel: string;
  ctaHref: string;
  /* If ctaHref is a route that exists, set ready=true. Otherwise the
     CTA renders disabled w/ a "Coming soon" pill (wiring rule). */
  ready: boolean;
  /* Header chip shown above the code panel body (e.g. "REQUEST · GET /v1/area") */
  codePanelHeader: string;
  codeLines: string[];
};

const SURFACES: Surface[] = [
  {
    id: "rest",
    Glyph: GlyphRest,
    tabMethod: "GET /v1/area",
    tabName: "REST API",
    panelName: "REST API",
    panelBody: "One authenticated call returns a full area profile: every signal with source citation, normalized value, country-scoped percentile, and confidence. Versioned, documented, production-ready.",
    ctaLabel: "Read the API reference",
    ctaHref: "/docs/api-reference",
    ready: true,
    codePanelHeader: "REQUEST · GET /v1/area",
    codeLines: [
      `curl -H "Authorization: Bearer oga_..." \\`,
      `  "https://api.onegoodarea.com/v1/area?postcode=M1+1AE"`,
      ``,
      `// 200 OK`,
      `{`,
      `  "geo_code": "E01005132",`,
      `  "engine_version": "2.0.2",`,
      `  "signals": {`,
      `    "deprivation.imd_decile": {`,
      `      "value": 2,`,
      `      "normalized_value": 0.78,`,
      `      "percentile": 0.92,`,
      `      "confidence": 1.0`,
      `    }`,
      `  }`,
      `}`,
    ],
  },
  {
    id: "query",
    Glyph: GlyphQuery,
    tabMethod: "POST /v1/query",
    tabName: "Query plane",
    panelName: "Query plane",
    panelBody: "Ask in JSON or natural language. The AI emits the query plan; the database executes. Every response echoes the plan that ran, so any answer is reproducible and auditable.",
    ctaLabel: "Read the query plane docs",
    ctaHref: "/docs/api-reference",
    ready: true,
    codePanelHeader: "REQUEST · POST /v1/query",
    codeLines: [
      `curl -X POST \\`,
      `  -H "Authorization: Bearer oga_..." \\`,
      `  -d '{`,
      `    "question":`,
      `      "areas under £250k AND rising YoY in England"`,
      `  }' \\`,
      `  "https://api.onegoodarea.com/v1/query"`,
      ``,
      `// 200 OK`,
      `{`,
      `  "executed_plan": {`,
      `    "op": "rank_areas",`,
      `    "params": { /* compound filter + sort */ }`,
      `  },`,
      `  "results": [ /* ranked LSOAs */ ]`,
      `}`,
    ],
  },
  {
    id: "webhooks",
    Glyph: GlyphWebhooks,
    tabMethod: "signal.changed",
    tabName: "Webhooks",
    panelName: "Webhooks",
    panelBody: "Subscribe once and we push. The signal.changed event fires the month a monitored area's signal moves past your configured threshold.",
    ctaLabel: "Read the webhook docs",
    ctaHref: "/docs/api-reference",
    ready: true,
    codePanelHeader: "EVENT · signal.changed",
    codeLines: [
      `// POST to your registered webhook URL`,
      `{`,
      `  "event": "signal.changed",`,
      `  "portfolio_id": "ptf_...",`,
      `  "geo_code": "E01005132",`,
      `  "signal_key": "property.median_price",`,
      `  "previous_value": 197000,`,
      `  "current_value": 214000,`,
      `  "change_pct": 8.6,`,
      `  "observed_period": "2026-05"`,
      `}`,
    ],
  },
];

/* ---------- Token-colour each code line ----------
   Minimal pattern matcher: strings, numbers, comments, HTTP verbs,
   header keys. Everything else renders plain. Same vocabulary as
   .oga-code-panel__key / __str / __num-val / __punct / __comment / __fn
   already shipped in components.css. */
const TOKEN_RE = /("[^"]*"|\/\/[^\n]*|\b(?:GET|POST|PUT|DELETE|PATCH)\b|\b(?:Authorization|Content-Type)\b|-?\d+(?:\.\d+)?)/g;

function tokenize(line: string) {
  const out: Array<{ key: number; text: string; cls?: string }> = [];
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > last) {
      out.push({ key: k++, text: line.slice(last, m.index) });
    }
    const t = m[0];
    let cls: string | undefined;
    if (t.startsWith('"')) cls = "oga-code-panel__str";
    else if (t.startsWith("//")) cls = "oga-code-panel__comment";
    else if (/^[A-Z]/.test(t)) cls = "oga-code-panel__fn";
    else if (/^-?\d/.test(t)) cls = "oga-code-panel__num-val";
    else cls = "oga-code-panel__key";
    out.push({ key: k++, text: t, cls });
    last = m.index + t.length;
  }
  if (last < line.length) {
    out.push({ key: k++, text: line.slice(last) });
  }
  return out;
}

const AUTO_CYCLE_MS = 9000;

export function IntegrationSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setActive((a) => (a + 1) % SURFACES.length);
    }, AUTO_CYCLE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const current = SURFACES[active];

  function selectTab(i: number) {
    setActive(i);
    setPaused(true);
  }

  return (
    <section className="oga-int">
      <div className="oga-int__field" aria-hidden />

      <div className="oga-int__inner">
        <header className="oga-int__header">
          <div className="oga-int__eyebrow">
            <span className="oga-int__eyebrow-num">04</span>
            <span className="oga-int__eyebrow-line" aria-hidden />
            <span>Integration</span>
          </div>
          <h2 className="oga-int__title">Four ways into one engine.</h2>
          <p className="oga-int__sub">
            Consume the engine however your stack works. Authenticated, versioned,
            documented. Every response stamped with the engine version that
            produced it.
          </p>
        </header>

        <nav className="oga-int__tabs" role="tablist" aria-label="Integration surface">
          {SURFACES.map((s, i) => {
            const Glyph = s.Glyph;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => selectTab(i)}
                className={`oga-int__tab${i === active ? " oga-int__tab--active" : ""}`}
              >
                <span className="oga-int__tab-glyph" aria-hidden>
                  <Glyph />
                </span>
                <span className="oga-int__tab-text">
                  <span className="oga-int__tab-method">{s.tabMethod}</span>
                  <span className="oga-int__tab-name">{s.tabName}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="oga-int__panel">
          <div className="oga-int__panel-code">
            <div className="oga-code-panel">
              <span className="oga-code-panel__tick oga-code-panel__tick--tl" aria-hidden />
              <span className="oga-code-panel__tick oga-code-panel__tick--tr" aria-hidden />
              <span className="oga-code-panel__tick oga-code-panel__tick--bl" aria-hidden />
              <span className="oga-code-panel__tick oga-code-panel__tick--br" aria-hidden />
              <div className="oga-code-panel__header">
                <span className="oga-code-panel__live">
                  <span className="oga-status-dot" aria-hidden /> Live
                </span>
                <span className="oga-code-panel__path">{current.codePanelHeader}</span>
                <span className="oga-code-panel__meta">v2.0.2</span>
              </div>
              <pre className="oga-code-panel__body">
                {current.codeLines.map((line, i) => (
                  <div key={i} className="oga-code-panel__line">
                    <span className="oga-code-panel__num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="oga-code-panel__text">
                      {tokenize(line).map((t) => (
                        t.cls
                          ? <span key={t.key} className={t.cls}>{t.text}</span>
                          : <span key={t.key}>{t.text}</span>
                      ))}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>

          <div className="oga-int__panel-text">
            <h3 className="oga-int__panel-name">{current.panelName}</h3>
            <p className="oga-int__panel-body">{current.panelBody}</p>

            {current.ready ? (
              <Link href={current.ctaHref} className="oga-int__panel-cta">
                {current.ctaLabel}
                <span aria-hidden className="oga-int__panel-cta-arrow">→</span>
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="oga-int__panel-cta"
              >
                {current.ctaLabel}
                <span aria-hidden className="oga-int__panel-cta-arrow">→</span>
              </button>
            )}

            <div className="oga-int__panel-meta">
              <span className="oga-int__panel-meta-label">Engine</span>
              <span className="oga-int__panel-meta-val">v2.0.2 · Pinnable per org</span>
            </div>
          </div>
        </div>

        <div className="oga-int__foot">
          <p className="oga-int__foot-text">
            Pin the engine version once and your integration stays reproducible.
            <strong> Same plan → same result</strong>, regardless of when you replay it.
          </p>
        </div>
      </div>
    </section>
  );
}
