"use client";

import Link from "next/link";
import { Mark } from "./mark";

/* CtaSection — the close. Canvas surface (contrast with dark Coverage
   above, subtle step to the white footer below). Centered, the brand
   mark as a closing signature with a soft pulsing ring. Headline
   bookends the hero: hero opens "the area intelligence layer for
   [workflow]", this closes "for your stack". Ambient strip mirrors
   the hero foot strip. */

export function CtaSection() {
  return (
    <section className="oga-cta">
      <div className="oga-cta__field" aria-hidden />

      <div className="oga-cta__inner">
        <div className="oga-cta__mark" aria-hidden>
          <Mark size={46} />
        </div>

        <h2 className="oga-cta__title">The area intelligence layer for your stack.</h2>

        <p className="oga-cta__sub">
          Free to start. Versioned, documented, and callable from any workflow.
          You could be scoring areas this afternoon.
        </p>

        <div className="oga-cta__buttons">
          <Link href="/sign-up" className="oga-btn oga-btn-lg oga-btn-primary">
            Get started
            <span aria-hidden style={{ marginLeft: 4 }}>→</span>
          </Link>
          <Link href="/docs" className="oga-btn oga-btn-lg oga-btn-secondary">
            Browse the docs
            <span aria-hidden style={{ marginLeft: 4 }}>→</span>
          </Link>
        </div>

        <div className="oga-cta__foot" aria-hidden>
          <span className="oga-status-dot" />
          Engine v2.0.2 · 7 public sources · 42,640 neighbourhoods · deterministic
        </div>
      </div>
    </section>
  );
}
