"use client";

import { useEffect, useRef, useState } from "react";

/* BuiltForSection v3 — interactive featured panel for the 5 workflows.
   Tabs across top, one workflow visible at a time. Each tab's panel:

   - tightened body (no specific source names — they live on
     /methodology only, per the "multiple sources" rule)
   - mono "example endpoint" chip (real API call for this workflow)
   - "Used by" meta line
   - "Build for [icp] →" CTA disabled w/ "Coming soon" pill (the
     /icps/<slug> pages do not exist yet — per the wiring rule, never
     a fake link)

   AR-204 PR 2 / commit 4. */

type Workflow = {
  id: string;
  index: string;
  title: string;
  body: string;
  endpointVerb: "GET" | "POST";
  endpointPath: string;
  usedBy: string;
  icpLabel: string;
  icpSlug: string;
  /* ICP pages are pending (PRs after this epic). While ready=false,
     the CTA renders disabled with "Coming soon". */
  ready: boolean;
  highlight: Array<[number, number]>;
  caption: string;
};

const WORKFLOWS: Workflow[] = [
  {
    id: "origination",
    index: "01",
    title: "Origination",
    body: "Score every applicant's postcode at decision time. Bulk-score whole portfolios overnight. Version-pinned methodology your model risk team can defend in front of regulators.",
    endpointVerb: "POST",
    endpointPath: "/v1/score",
    usedBy: "Challenger banks · building societies",
    icpLabel: "lenders",
    icpSlug: "lenders",
    ready: false,
    highlight: [[60, 60]],
    caption: "One score per decision",
  },
  {
    id: "underwriting",
    index: "02",
    title: "Underwriting",
    body: "Area-risk signals returned in milliseconds at quote time. Confidence on every dimension, source-attributed per call, fast enough for inline rating engines and pre-bind workflows.",
    endpointVerb: "GET",
    endpointPath: "/v1/area",
    usedBy: "Specialist insurers · MGAs",
    icpLabel: "insurers",
    icpSlug: "insurers",
    ready: false,
    highlight: [[18, 60], [32, 60], [46, 60], [60, 60], [74, 60], [88, 60], [102, 60]],
    caption: "Risk classification across dimensions",
  },
  {
    id: "site-selection",
    index: "03",
    title: "Site selection",
    body: "Rank thousands of candidate postcodes by your own criteria. One API instead of stitching disparate sources. Confidence bands per area so you know how much to trust each comparison.",
    endpointVerb: "POST",
    endpointPath: "/v1/query",
    usedBy: "Retail · CRE · leasing",
    icpLabel: "CRE",
    icpSlug: "cre",
    ready: false,
    highlight: [[46, 32], [88, 32], [32, 60], [74, 60], [60, 88]],
    caption: "Compare every candidate area",
  },
  {
    id: "portfolio-monitoring",
    index: "04",
    title: "Portfolio monitoring",
    body: "Track a book of areas; get webhooks the month a signal moves past your threshold. Monthly snapshots are the moat: every change is auditable back to the underlying time-series.",
    endpointVerb: "POST",
    endpointPath: "/v1/portfolios/:id/changes",
    usedBy: "Lender model risk · portfolio teams",
    icpLabel: "portfolio teams",
    icpSlug: "portfolio-teams",
    ready: false,
    highlight: [[32, 88], [32, 74], [46, 60], [60, 46], [74, 32], [88, 46]],
    caption: "Time-series anomaly detection",
  },
  {
    id: "planning",
    index: "05",
    title: "Planning decisions",
    body: "Score areas with your own weighted methodology for housing and regeneration decisions. Same engine, transparent weighting, version-pinned outputs you can defend in a public meeting.",
    endpointVerb: "POST",
    endpointPath: "/v1/score",
    usedBy: "Councils · Homes England · MHCLG",
    icpLabel: "public sector",
    icpSlug: "public-sector",
    ready: false,
    highlight: [[60, 18], [46, 32], [60, 32], [74, 32], [32, 46], [88, 46]],
    caption: "Hierarchical, defensible methodology",
  },
];

const ALL_DOTS: Array<[number, number]> = [
  [60, 18],
  [32, 32], [46, 32], [60, 32], [74, 32], [88, 32],
  [32, 46], [46, 46], [60, 46], [74, 46], [88, 46],
  [18, 60], [32, 60], [46, 60], [60, 60], [74, 60], [88, 60], [102, 60],
  [32, 74], [46, 74], [60, 74], [74, 74], [88, 74],
  [32, 88], [46, 88], [60, 88], [74, 88], [88, 88],
  [60, 102],
];

const AUTO_CYCLE_MS = 6000;

/* WorkflowIcon — tiny version of the same dot-mark visual that appears
   big in the featured panel. */
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

            <span className="oga-built__panel-endpoint">
              <span className="oga-built__panel-endpoint-verb">{current.endpointVerb}</span>
              <span>{current.endpointPath}</span>
            </span>

            <div className="oga-built__panel-meta">
              <span className="oga-built__panel-meta-label">Used by</span>
              <span className="oga-built__panel-meta-val">{current.usedBy}</span>
            </div>

            <div className="oga-built__panel-cta">
              {current.ready ? (
                <a
                  href={`/icps/${current.icpSlug}`}
                  className="oga-built__panel-link"
                >
                  Build for {current.icpLabel}
                  <span aria-hidden className="oga-built__panel-link-arrow">→</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="oga-built__panel-link"
                >
                  Build for {current.icpLabel}
                  <span aria-hidden className="oga-built__panel-link-arrow">→</span>
                </button>
              )}
              {!current.ready && (
                <span className="oga-built__panel-cta-pill">Coming soon</span>
              )}
            </div>
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
