"use client";

import Link from "next/link";

/* HeroPlotted, homepage hero (Plan 064 Phase 1, split layout).

   PropTech-shaped without labeling: copy speaks the buyer's vocabulary
   (comparables, forecasts, signals) over one API, and a live request/response
   card on the right shows the product is real and self-serve ("works in your
   code"). Two-color only, per brand. The old five-ICP "Built for" rail is
   gone; ICP discovery lives in the nav/footer + the /for/* pages. */

const RESPONSE = `{
  "area": "M1 1AE",
  "country": "England",
  "signals": [
    { "key": "crime.total_12m",         "percentile": 92 },
    { "key": "property.median_price",   "percentile": 64 },
    { "key": "transport.station_count", "percentile": 81 }
  ],
  "engine_version": "1.0.0"
}`;

export function HeroPlotted() {
  return (
    <section className="oga-hero-dark oga-hero-dark--split" data-oga-surface="dark">
      <div className="oga-hero-dark__field" aria-hidden />
      <div className="oga-hero-dark__glow" aria-hidden />

      <div className="oga-hero-dark__inner">
        <div className="oga-hero-dark__copy">
          <div className="oga-hero-dark__eyebrow">
            <span className="oga-hero-dark__eyebrow-dot" aria-hidden />
            UK area intelligence API
          </div>

          <h1 className="oga-hero-dark__title">
            One API for UK area comparables, forecasts, and signals.
          </h1>

          <p className="oga-hero-dark__lead">
            Neighbourhood-level data from 7 UK public sources, with scoring and
            monitoring built in. Versioned and replayable, so the numbers you
            ship never move under you. Works in your code, and inside Claude
            Code.
          </p>

          <div className="oga-hero-dark__caps" aria-hidden>
            <span>Comparables</span>
            <span>Forecasts</span>
            <span>Scores</span>
            <span>Monitoring</span>
            <span>Signals</span>
          </div>

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

        <div className="oga-hero-dark__code" aria-hidden>
          <div className="oga-hero-dark__code-bar">
            <i /><i /><i />
            <span>GET /v1/area</span>
          </div>
          <pre className="oga-hero-dark__code-pre">
            <b>{"GET /v1/area?postcode=M1 1AE\nAuthorization: Bearer oga_live_..."}</b>
            {"\n\n"}
            {RESPONSE}
          </pre>
        </div>
      </div>
    </section>
  );
}
