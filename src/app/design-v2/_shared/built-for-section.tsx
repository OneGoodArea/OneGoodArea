"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* BuiltForSection v2 — interactive featured panel. Tabs across top,
   one workflow visible at a time. Bespoke visual per workflow: the
   brand dot grid with different dots highlighted (origination = center
   point, underwriting = horizontal band, etc). Auto-cycles every
   6 seconds, click any tab to take manual control. */

type Workflow = {
  id: string;
  index: string;
  title: string;
  body: string;
  usedBy: string;
  highlight: Array<[number, number]>;
  caption: string;
};

const WORKFLOWS: Workflow[] = [
  {
    id: "origination",
    index: "01",
    title: "Origination",
    body: "Lenders score postcodes for residential mortgage suitability the moment a decision is made. Bulk endpoint scores entire portfolios overnight, with version-pinned methodology your model risk team can defend.",
    usedBy: "Challenger banks · building societies",
    highlight: [[60, 60]],
    caption: "One score per decision",
  },
  {
    id: "underwriting",
    index: "02",
    title: "Underwriting",
    body: "MGAs and property insurers get area-risk signals before binding. Environment Agency flood, Police.uk crime, IMD deprivation. Source-attributed for FCA scrutiny, returned in under 200ms.",
    usedBy: "Specialist insurers · MGAs",
    highlight: [[18, 60], [32, 60], [46, 60], [60, 60], [74, 60], [88, 60], [102, 60]],
    caption: "Risk classification across dimensions",
  },
  {
    id: "site-selection",
    index: "03",
    title: "Site selection",
    body: "Retail and commercial real estate teams compare thousands of postcodes for site decisions. One API instead of stitching multiple data sources. Bulk scoring with confidence bands per area.",
    usedBy: "Retail · CRE · leasing",
    highlight: [[46, 32], [88, 32], [32, 60], [74, 60], [60, 88]],
    caption: "Compare every candidate area",
  },
  {
    id: "portfolio-monitoring",
    index: "04",
    title: "Portfolio monitoring",
    body: "Lenders, insurers, and BTL operators get alerts when an area's classification moves. The time-series rescoring corpus proves the trend, with anomaly explanations source-attributed back to the data that changed.",
    usedBy: "Lender model risk · portfolio teams",
    highlight: [[18, 74], [32, 74], [46, 60], [60, 46], [74, 32], [88, 46]],
    caption: "Time-series anomaly detection",
  },
  {
    id: "planning",
    index: "05",
    title: "Planning decisions",
    body: "Local authorities, MHCLG, and regeneration teams use versioned methodology for housing decisions defensible in public meetings. Same engine, transparent weighting, auditable answers.",
    usedBy: "Councils · Homes England · MHCLG",
    highlight: [[60, 18], [46, 32], [60, 32], [74, 32], [32, 46], [88, 46]],
    caption: "Hierarchical, defensible methodology",
  },
];

const ALL_DOTS: Array<[number, number]> = [
  [60, 18],
  [32, 32], [46, 32], [60, 32], [74, 32], [88, 32],
  [18, 46], [32, 46], [46, 46], [60, 46], [74, 46], [88, 46], [102, 46],
  [18, 60], [32, 60], [46, 60], [60, 60], [74, 60], [88, 60], [102, 60],
  [18, 74], [32, 74], [46, 74], [60, 74], [74, 74], [88, 74], [102, 74],
  [32, 88], [46, 88], [60, 88], [74, 88], [88, 88],
  [60, 102],
];

const AUTO_CYCLE_MS = 6000;

/* WorkflowIcon — tiny version of the same dot-mark visual that appears
   big in the featured panel. Each tab gets a 22px preview of "what's
   highlighted for this workflow" so the tab strip itself becomes a
   visual menu of dot patterns. */
function WorkflowIcon({ highlight }: { highlight: Array<[number, number]> }) {
  return (
    <svg viewBox="0 0 120 120" className="oga-built__tab-icon" aria-hidden>
      {ALL_DOTS.map(([x, y]) => {
        const isHighlighted = highlight.some(([hx, hy]) => hx === x && hy === y);
        return (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={isHighlighted ? 6 : 3.2}
            fill="currentColor"
            opacity={isHighlighted ? 1 : 0.25}
          />
        );
      })}
    </svg>
  );
}

export function BuiltForSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setActive((a) => (a + 1) % WORKFLOWS.length);
    }, AUTO_CYCLE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const current = WORKFLOWS[active];

  function selectTab(i: number) {
    setActive(i);
    setPaused(true);
  }

  return (
    <section className="oga-built">
      <div className="oga-built__field" aria-hidden />

      <div className="oga-built__inner">
        <header className="oga-built__header">
          <div className="oga-built__eyebrow">
            <span className="oga-built__eyebrow-num">02</span>
            <span className="oga-built__eyebrow-line" aria-hidden />
            <span>Built for</span>
          </div>
          <h2 className="oga-built__title">Five workflows. One engine.</h2>
        </header>

        <nav className="oga-built__tabs" role="tablist" aria-label="Workflow">
          {WORKFLOWS.map((w, i) => (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => selectTab(i)}
              className={`oga-built__tab${i === active ? " oga-built__tab--active" : ""}`}
            >
              <WorkflowIcon highlight={w.highlight} />
              <span className="oga-built__tab-num">{w.index}</span>
              <span className="oga-built__tab-label">{w.title}</span>
              {i === active && !paused && (
                <span className="oga-built__tab-bar" aria-hidden />
              )}
            </button>
          ))}
        </nav>

        <div className="oga-built__panel">
          <div className="oga-built__panel-text">
            <h3 className="oga-built__panel-title">{current.title}</h3>
            <p className="oga-built__panel-body">{current.body}</p>
            <div className="oga-built__panel-meta">
              <span className="oga-built__panel-meta-label">Used by</span>
              <span className="oga-built__panel-meta-val">{current.usedBy}</span>
            </div>
            <Link href="/business" className="oga-built__panel-link">
              See the integration
              <span aria-hidden style={{ marginLeft: 6 }}>→</span>
            </Link>
          </div>

          <div className="oga-built__panel-visual" aria-hidden>
            <div className="oga-built__visual-caption">{current.caption}</div>
            <svg viewBox="0 0 120 120" className="oga-built__visual-svg">
              {ALL_DOTS.map(([x, y]) => {
                const isHighlighted = current.highlight.some(([hx, hy]) => hx === x && hy === y);
                return (
                  <circle
                    key={`${x}-${y}`}
                    cx={x}
                    cy={y}
                    r={isHighlighted ? 5 : 2.6}
                    fill="currentColor"
                    opacity={isHighlighted ? 1 : 0.22}
                    className="oga-built__visual-dot"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
