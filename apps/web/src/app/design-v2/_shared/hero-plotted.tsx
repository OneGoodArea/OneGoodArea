"use client";

import Link from "next/link";

/* HeroPlotted — bold dark hero with vertically-rotating ICP word.
   "The area intelligence layer for [cycling]." 5 ICPs cycle on
   a 14s loop. Pure CSS keyframes (no JS state). Centered layout.

   AR-204 PR P:
   - Rotator words flipped from generic workflows to the 5 ICPs we
     now have dedicated pages for. Each rotating word is a Link to
     its /for/<slug> page so the hero becomes a navigable index of
     who we're for. */

const ICPS = [
  { label: "PropTech",      slug: "proptech" },
  { label: "insurance",     slug: "insurance" },
  { label: "lenders",       slug: "lenders" },
  { label: "CRE",           slug: "cre" },
  { label: "public sector", slug: "public-sector" },
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
              {ICPS.concat(ICPS[0]).map((icp, i) => (
                <span key={i} className="oga-rotator__item">
                  <Link
                    href={`/for/${icp.slug}`}
                    className="oga-rotator__word oga-rotator__word--link"
                    aria-label={`See OneGoodArea for ${icp.label}`}
                  >
                    <span className="oga-rotator__label">{icp.label}</span>
                    <svg
                      className="oga-rotator__arrow"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M7 17 L17 7" />
                      <path d="M8 7 H17 V16" />
                    </svg>
                  </Link>
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
