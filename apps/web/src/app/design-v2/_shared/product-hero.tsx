"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import "./product-hero.css";

/* Shared product-page hero (AR-211).

   Used by /products/{signals,scores,monitor,intelligence}. The four
   product page heroes were character-for-character identical modulo
   prefix (`oga-sig-*` / `oga-scr-*` / `oga-mon-*` / `oga-int-*`),
   icon component, h1 text, and lead text. Extracted to one component
   so the hero shell ships from one place. Per-product variation is
   props-only.

   Visual parity = hard requirement. Standardised on the 62ch lead
   max-width (monitor's value; all 4 looked identical at this width). */

type ProductHeroProps = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconSize?: number;
  h1: string;
  lead: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export function ProductHero({
  Icon,
  iconSize = 132,
  h1,
  lead,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: ProductHeroProps) {
  return (
    <section className="oga-section-hero oga-product-hero">
      <div className="oga-product-hero__wrap">
        <div className="oga-product-hero__icon" aria-hidden>
          <Icon width={iconSize} height={iconSize} />
        </div>
        <h1 className="oga-product-hero__h1">{h1}</h1>
        <p className="oga-product-hero__lead">{lead}</p>
        <div className="oga-product-hero__ctas">
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
