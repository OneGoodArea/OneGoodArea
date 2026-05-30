"use client";

import Link from "next/link";
import { WorldMap } from "./world-map";

/* CoverageSection (05) — "Every UK area, measured monthly."
   Dark surface, contrast after the light Integration section.

   AR-204 PR 2 / commit 6: real geography via world-atlas (Natural
   Earth 110m) + d3-geo Equal-Earth projection. UK is filled +
   stroked at full opacity with a pulsing double halo + label.
   Stats strip carries real numbers (1.8M postcodes etc.); the CTA
   says "Explore the methodology" (no source-count mention per the
   "multiple sources" rule). */

/* ---------- Stats (real numbers, ADR-anchored) ---------- */

const STATS: Array<{ value: string; label: string }> = [
  { value: "1.8M",     label: "Postcodes resolved" },
  { value: "43,916",   label: "LSOAs covered" },
  { value: "Monthly",  label: "Snapshots" },
  { value: "v2.0.2",   label: "Engine — pinnable" },
];

export function CoverageSection() {
  return (
    <section className="oga-coverage" data-oga-surface="dark">
      <div className="oga-coverage__field-bg" aria-hidden />

      <div className="oga-coverage__inner">
        <header className="oga-coverage__header">
          <div className="oga-coverage__eyebrow">
            <span className="oga-coverage__eyebrow-num">05</span>
            <span className="oga-coverage__eyebrow-line" aria-hidden />
            <span>Coverage</span>
          </div>
          <h2 className="oga-coverage__title">Every UK area, measured monthly.</h2>
          <p className="oga-coverage__sub">
            1.8 million postcodes resolved to 43,916 LSOAs across England, Wales,
            and Scotland. Captured once a month, never re-captured. The time-series
            corpus that compounds into the moat.
          </p>
        </header>

        <div className="oga-coverage__viz">
          <WorldMap />
        </div>

        <div className="oga-coverage__stats">
          {STATS.map((s) => (
            <div key={s.label} className="oga-coverage__stat">
              <span className="oga-coverage__stat-val">{s.value}</span>
              <span className="oga-coverage__stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="oga-coverage__cta-row">
          <Link href="/methodology" className="oga-coverage__cta">
            Explore the methodology
            <span aria-hidden className="oga-coverage__cta-arrow">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
