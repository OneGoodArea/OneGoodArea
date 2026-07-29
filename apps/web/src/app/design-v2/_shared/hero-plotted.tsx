"use client";

import Link from "next/link";

/* HeroPlotted, homepage hero (Plan 064).

   Clean centered hero: headline, subhead, two CTAs, on the dot-field +
   centre-glow background. No rail, no chips, no product panel. Copy speaks the
   buyer's vocabulary (comparables, forecasts, signals) over one API. Strictly
   two-color per brand. ICP discovery lives in the nav/footer + /for/* pages. */

export function HeroPlotted() {
  return (
    <section className="oga-hero-dark" data-oga-surface="dark">
      <div className="oga-hero-dark__field" aria-hidden />
      <div className="oga-hero-dark__glow" aria-hidden />

      <div className="oga-hero-dark__inner">
        <h1 className="oga-hero-dark__title">
          Every UK neighbourhood, one API.
        </h1>

        <p className="oga-hero-dark__lead">
          Neighbourhood-level data from UK public sources, with scoring and
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
