"use client";

import Link from "next/link";

/* HeroPlotted — bold dark hero with vertically-rotating ICP word.
   "Property intelligence for [cycling]". 5 ICPs cycle on a 16s loop.
   Pure CSS keyframes (no JS state), perfectly smooth, GPU-friendly.

   Pedro 2026-05-16: scrap the safe spec, give your best work. This
   is the answer — confident dark hero, the kind Cursor / Vercel /
   Trigger.dev / fmovieds.gd ship. */

/* Workflows cycle, not ICPs. Each workflow is a real job the engine
   answers for — and most workflows are done by multiple ICPs, so the
   audience compounds. "Origination" covers lenders + brokers + building
   societies; "underwriting" covers insurers + lenders; etc. */
const WORKFLOWS = [
  "origination.",
  "underwriting.",
  "site selection.",
  "portfolio monitoring.",
  "planning decisions.",
];

export function HeroPlotted() {
  return (
    <section className="oga-hero-dark" data-oga-surface="dark">
      <div className="oga-hero-dark__field" aria-hidden />
      <div className="oga-hero-dark__glow" aria-hidden />

      <div className="oga-hero-dark__inner">
        <h1 className="oga-hero-dark__title">
          <span className="oga-hero-dark__line1">The area intelligence layer for</span>
          <span className="oga-rotator" aria-live="polite">
            <span className="oga-rotator__list">
              {WORKFLOWS.concat(WORKFLOWS[0]).map((w, i) => (
                <span key={i} className="oga-rotator__item">
                  <span className="oga-rotator__word">{w}</span>
                </span>
              ))}
            </span>
          </span>
        </h1>

        <p className="oga-hero-dark__lead">
          Decision-grade scoring across every UK area. One API, version-pinned
          methodology, callable from any AI workflow.
        </p>

        <div className="oga-hero-dark__cta">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get started
            <span aria-hidden style={{ marginLeft: 4 }}>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden style={{ marginLeft: 4 }}>→</span>
          </Link>
        </div>
      </div>

      <div className="oga-hero-dark__foot" aria-hidden>
        <span className="oga-hero-dark__foot-label">
          <span className="oga-status-dot" /> Sourced from
        </span>
        <span className="oga-hero-dark__foot-item">Police.uk</span>
        <span className="oga-hero-dark__foot-sep" />
        <span className="oga-hero-dark__foot-item">Ofsted</span>
        <span className="oga-hero-dark__foot-sep" />
        <span className="oga-hero-dark__foot-item">Environment Agency</span>
        <span className="oga-hero-dark__foot-sep" />
        <span className="oga-hero-dark__foot-item">HM Land Registry</span>
        <span className="oga-hero-dark__foot-sep" />
        <span className="oga-hero-dark__foot-item">ONS</span>
        <span className="oga-hero-dark__foot-sep" />
        <span className="oga-hero-dark__foot-item">OpenStreetMap</span>
        <span className="oga-hero-dark__foot-sep" />
        <span className="oga-hero-dark__foot-item">Postcodes.io</span>
      </div>
    </section>
  );
}
