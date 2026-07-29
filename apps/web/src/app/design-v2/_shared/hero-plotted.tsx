"use client";

import Link from "next/link";

/* HeroPlotted, homepage hero (Plan 064 Phase 1).

   PropTech-shaped without labeling: the headline speaks the buyer's
   vocabulary (comparables, forecasts, signals) over one API, the subhead
   states the value in plain terms, and the CTAs lead self-serve (playground
   first, docs second). The old five-ICP "Built for" rail is gone from the
   hero, so the front door reads for one buyer, not five; ICP discovery lives
   in the nav and footer, and each /for/* page carries its tailored pitch.
   Dark surface with the dot-field + centre-glow motif. */

export function HeroPlotted() {
  return (
    <section className="oga-hero-dark" data-oga-surface="dark">
      <div className="oga-hero-dark__field" aria-hidden />
      <div className="oga-hero-dark__glow" aria-hidden />

      <div className="oga-hero-dark__inner">
        <h1 className="oga-hero-dark__title">
          One API for UK area comparables, forecasts, and signals.
        </h1>

        <p className="oga-hero-dark__lead">
          Neighbourhood-level data from 7 UK public sources, with scoring and
          monitoring built in. Versioned and replayable, so the numbers you
          ship never move under you. Works in your code, and inside Claude Code.
        </p>

        <div className="oga-hero-dark__cta">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-secondary">
            See the docs
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
