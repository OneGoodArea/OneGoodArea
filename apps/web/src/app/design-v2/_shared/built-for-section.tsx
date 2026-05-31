"use client";

import { useEffect, useRef, useState } from "react";

/* BuiltForSection v4 — re-cut from 5 workflows to 5 ICPs (PropTech /
   Insurance / Lenders / CRE / Public sector). Mirrors the ICP cut on
   /business and the /for/<slug> page set so a buyer sees a consistent
   set of buyer types across the site.

   Tabs across top, one ICP visible at a time. Each tab's panel:

   - tightened body (no specific source names — they live on
     /methodology only, per the "multiple sources" rule)
   - mono "example endpoint" chip (the primary endpoint that ICP
     reaches for)
   - "Used by" meta line
   - "See more for [icp] →" CTA. Flips live as each /for/<slug>
     page ships; stays disabled with "Soon" pill in the meantime
     (wiring rule). */

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
  /* Flips to true as the matching /for/<slug> ICP page ships. While
     false, the CTA renders disabled with a "Soon" pill. */
  ready: boolean;
  highlight: Array<[number, number]>;
  caption: string;
};

const WORKFLOWS: Workflow[] = [
  {
    id: "proptech",
    index: "01",
    title: "PropTech",
    body: "Drop one endpoint into your property detail render and ship richer area context than a competitor's roadmap. LSOA-grain signals across seven categories with country-scoped percentiles, per-signal confidence, and source attribution on every response.",
    endpointVerb: "GET",
    endpointPath: "/v1/area",
    usedBy: "Listing portals · valuation tools · agent CRMs",
    icpLabel: "PropTech",
    icpSlug: "proptech",
    ready: true,
    highlight: [[60, 60]],
    caption: "Area context per listing",
  },
  {
    id: "insurance",
    index: "02",
    title: "Insurance and InsureTech",
    body: "Area-risk signals at quote time, plus continuous portfolio monitoring with sample-size-gated change alerts. Configurable composite scoring the actuary can audit. Signed webhooks the day a tracked LSOA moves materially.",
    endpointVerb: "POST",
    endpointPath: "/v1/portfolios/:id/changes",
    usedBy: "Specialist insurers · MGAs · InsureTech rating engines",
    icpLabel: "Insurance",
    icpSlug: "insurance",
    ready: true,
    highlight: [[18, 60], [32, 60], [46, 60], [60, 60], [74, 60], [88, 60], [102, 60]],
    caption: "Risk classification + continuous drift",
  },
  {
    id: "lenders",
    index: "03",
    title: "Lenders",
    body: "Version-pinned methodology your model risk team can defend. Bulk-score portfolios; track drift across the time-series; replay any AI-assisted query as a deterministic plan. The engine version is stamped on every response.",
    endpointVerb: "POST",
    endpointPath: "/v1/score",
    usedBy: "Challenger banks · building societies · BTL lenders",
    icpLabel: "Lenders",
    icpSlug: "lenders",
    ready: true,
    highlight: [[60, 18], [60, 32], [60, 46], [60, 60], [60, 74]],
    caption: "Versioned, pinnable, auditable",
  },
  {
    id: "cre",
    index: "04",
    title: "CRE and site selection",
    body: "Rank thousands of catchments by your own compound criteria in one typed call. Up to eight AND-joined signal filters; sort by any of them; country or LAD scope. The shortlist is reproducible because every result echoes the executed plan.",
    endpointVerb: "POST",
    endpointPath: "/v1/query",
    usedBy: "Retail expansion · CRE platforms · leasing analytics",
    icpLabel: "CRE",
    icpSlug: "cre",
    ready: true,
    highlight: [[46, 32], [88, 32], [32, 60], [74, 60], [60, 88]],
    caption: "Compound rank across the universe",
  },
  {
    id: "public-sector",
    index: "05",
    title: "Public sector and research",
    body: "Defensible, sourced, dated metrics that survive FOI and procurement scrutiny. Country-scoped percentiles by design (England's IMD is not Scotland's SIMD). Sample-size honesty built in: the system says when it cannot tell instead of hallucinating a move.",
    endpointVerb: "POST",
    endpointPath: "/v1/score",
    usedBy: "Councils · Homes England · MHCLG · research units",
    icpLabel: "Public sector",
    icpSlug: "public-sector",
    ready: true,
    highlight: [[60, 18], [46, 32], [60, 32], [74, 32], [32, 46], [88, 46]],
    caption: "Defensible, FOI-survivable evidence",
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
                  href={`/for/${current.icpSlug}`}
                  className="oga-built__panel-link"
                >
                  See more for {current.icpLabel}
                  <span aria-hidden className="oga-built__panel-link-arrow">→</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="oga-built__panel-link"
                >
                  See more for {current.icpLabel}
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
