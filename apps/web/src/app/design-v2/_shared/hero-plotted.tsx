"use client";

import Link from "next/link";

/* HeroPlotted, homepage hero (Plan 064, product-panel layout).

   Anchored on a real OGA area panel (postcode -> score + percentile bars, the
   product's actual output) rather than a generic code block or feature chips,
   so the front door looks like the product, not a templated API landing page.
   Copy left, panel right, a quiet public-sources strip below. Strictly
   two-color per brand; depth via opacity, no accent colour. */

const SIGNALS: { label: string; pct: number }[] = [
  { label: "Crime", pct: 92 },
  { label: "Schools", pct: 78 },
  { label: "Transport", pct: 81 },
  { label: "Prices", pct: 64 },
];

const SOURCES = ["Police.uk", "HM Land Registry", "Ofsted", "ONS", "Environment Agency"];

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

        <div className="oga-hero-panel" aria-hidden>
          <div className="oga-hero-panel__head">
            <span className="oga-hero-panel__area">M1 1AE · Manchester</span>
            <span className="oga-hero-panel__live">
              <i />live
            </span>
          </div>

          <div className="oga-hero-panel__score">
            <span className="oga-hero-panel__score-num">72</span>
            <span className="oga-hero-panel__score-label">
              Investing score
              <em>out of 100</em>
            </span>
          </div>

          <div className="oga-hero-panel__rows">
            {SIGNALS.map((s) => (
              <div className="oga-hero-panel__row" key={s.label}>
                <span className="oga-hero-panel__row-label">{s.label}</span>
                <span className={`oga-hero-panel__bar oga-hero-panel__bar--w${s.pct}`}>
                  <span />
                </span>
                <span className="oga-hero-panel__row-pct">{s.pct}</span>
              </div>
            ))}
          </div>

          <div className="oga-hero-panel__foot">
            <span>engine v1.0.0</span>
            <span>source-backed</span>
          </div>
        </div>
      </div>

      <div className="oga-hero-dark__sources">
        <span className="oga-hero-dark__sources-label">Built on 7 UK public sources</span>
        <span className="oga-hero-dark__sources-list">
          {SOURCES.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </span>
      </div>
    </section>
  );
}
