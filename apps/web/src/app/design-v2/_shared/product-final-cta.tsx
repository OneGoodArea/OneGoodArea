"use client";

import Link from "next/link";
import "./product-final-cta.css";

/* Shared product-page final CTA (AR-211).

   DARK closing section with h2 + lead + 2-CTA row. Used by
   /products/{signals,scores,monitor,intelligence}. The four
   FinalCta functions were structurally identical modulo prefix
   and the h2/lead text. Consolidated into one source of truth. */

type ProductFinalCtaProps = {
  /** id used for aria-labelledby on <section> + the <h2> */
  titleId: string;
  /** h2 text */
  title: string;
  /** lead paragraph text (caller can interpolate runtime constants like METHODOLOGY_VERSION) */
  lead: string;
  /** Primary CTA */
  primaryHref: string;
  primaryLabel: string;
  /** Secondary CTA */
  secondaryHref: string;
  secondaryLabel: string;
};

export function ProductFinalCta({
  titleId,
  title,
  lead,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: ProductFinalCtaProps) {
  return (
    <section
      className="oga-section-dark oga-product-cta"
      data-oga-surface="dark"
      aria-labelledby={titleId}
    >
      <div className="oga-product-cta__wrap">
        <h2 id={titleId} className="oga-product-cta__h2">
          {title}
        </h2>
        <p className="oga-product-cta__lead">{lead}</p>
        <div className="oga-product-cta__ctas">
          <Link href={primaryHref} className="oga-btn oga-btn-primary">
            {primaryLabel}
            <span aria-hidden>→</span>
          </Link>
          <Link href={secondaryHref} className="oga-btn oga-btn-secondary">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
