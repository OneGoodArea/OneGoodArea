"use client";

import Link from "next/link";

/* HeroPlotted — bold dark hero with vertically-rotating workflow word.
   "The area intelligence layer for [cycling]." 5 workflows cycle on
   a 14s loop. Pure CSS keyframes (no JS state). Centered layout.

   AR-204 PR 2 / commit 3:
   - Dropped the legacy "Sourced from: Police.uk · Ofsted · ..." foot
     strip per the "multiple sources" rule. Specific sources live on
     /methodology, not on the marketing hero.
   - Stripped inline-style arrow margin (Marcos's rule); the .oga-btn
     class already provides gap: 6px between flex children so the
     arrow inherits natural spacing. */

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
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
