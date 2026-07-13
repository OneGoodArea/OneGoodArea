"use client";

import Link from "next/link";
import { BookDemo } from "./book-demo";

/* HeroPlotted, homepage hero (AR-462).

   Product-led and audience-first: a "Built for" chip row names the ICPs
   (each chip links to its /for page), the headline says what you actually
   do (embed UK area intelligence via one API), and the subhead lists the
   concrete value. Dark surface with the dot-field + centre-glow motif.

   Replaces the old rotating-ICP-word headline: clever but slow to read,
   and the audience is now stated plainly and clickably up top. */

const ICPS = [
  { label: "PropTech",       slug: "proptech" },
  { label: "Insurers",       slug: "insurance" },
  { label: "Lenders",        slug: "lenders" },
  { label: "Site selection", slug: "cre" },
  { label: "Public sector",  slug: "public-sector" },
];

export function HeroPlotted() {
  return (
    <section className="oga-hero-dark" data-oga-surface="dark">
      <div className="oga-hero-dark__field" aria-hidden />
      <div className="oga-hero-dark__glow" aria-hidden />

      <div className="oga-hero-dark__inner">
        <div className="oga-hero-dark__audience">
          <span className="oga-hero-dark__audience-label">Built for</span>
          <span className="oga-hero-dark__audience-list">
            {ICPS.map((icp) => (
              <Link
                key={icp.slug}
                href={`/for/${icp.slug}`}
                className="oga-hero-dark__audience-link"
              >
                {icp.label}
              </Link>
            ))}
          </span>
        </div>

        <h1 className="oga-hero-dark__title">
          Build UK area intelligence into your product.
        </h1>

        <p className="oga-hero-dark__lead">
          The data layer underneath UK property and risk workflows: area scores,
          source-backed signals, monitoring, and intelligence you can audit.
        </p>

        <div className="oga-hero-dark__cta">
          <BookDemo className="oga-btn oga-btn-primary">
            Book a demo
            <span aria-hidden>→</span>
          </BookDemo>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
