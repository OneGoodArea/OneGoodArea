"use client";

import type { ComponentType } from "react";
import "./product-icp-grid.css";

/* Shared product-page ICP grid (AR-211).

   "Built for" section — the 5-ICP article list shown on each
   product page. The grid SHELL is identical-modulo-prefix across
   the 4 product pages. The per-ICP visualization (Viz) and the
   per-ICP content (problem/why/value/sales) are per-product.

   Per-product variation passed as props:
   - whyLabel ("Why Signals" / "Why Scores" / "Why Monitor" /
     "Why Intelligence")
   - titleId (aria-labelledby)
   - title (h2)
   - sub (lead paragraph)
   - icps (array of { name, Viz, problem, why, value, sales }) */

export type ProductIcp = {
  name: string;
  Viz: ComponentType;
  problem: string;
  why: string;
  value: string;
  sales: string;
};

type ProductIcpGridProps = {
  titleId: string;
  title: string;
  sub: string;
  /** Per-product "Why X" label, e.g. "Why Signals" */
  whyLabel: string;
  icps: ProductIcp[];
};

export function ProductIcpGrid({
  titleId,
  title,
  sub,
  whyLabel,
  icps,
}: ProductIcpGridProps) {
  return (
    <section className="oga-section-quiet oga-product-icps" aria-labelledby={titleId}>
      <div className="oga-product-icps__wrap">
        <header className="oga-product-icps__head">
          <h2 id={titleId} className="oga-product-icps__title">
            {title}
          </h2>
          <p className="oga-product-icps__sub">{sub}</p>
        </header>

        <div className="oga-product-icps__list">
          {icps.map((i) => {
            const Viz = i.Viz;
            return (
              <article key={i.name} className="oga-product-icp">
                <div className="oga-product-icp__viz" aria-hidden>
                  <Viz />
                </div>
                <div className="oga-product-icp__body">
                  <h3 className="oga-product-icp__name">{i.name}</h3>
                  <div>
                    <p className="oga-product-icp__row-label">The problem</p>
                    <p className="oga-product-icp__row-text">{i.problem}</p>
                  </div>
                  <div>
                    <p className="oga-product-icp__row-label">{whyLabel}</p>
                    <p className="oga-product-icp__row-text">{i.why}</p>
                  </div>
                  <div>
                    <p className="oga-product-icp__row-label">Their value</p>
                    <p className="oga-product-icp__row-text">{i.value}</p>
                  </div>
                  <p className="oga-product-icp__sales">{i.sales}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
