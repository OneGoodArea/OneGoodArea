"use client";

import Link from "next/link";
import { Mark } from "./mark";

/* CtaSection — the close (06).
   AR-204 PR 2 / commit 7.

   Canvas surface (contrast with dark Coverage above, subtle step
   to the footer below). Centered: brand mark + headline + sub +
   B2B CTAs + a small live-state strip.

   Updated from v1:
   - Title bookends the hero's positioning thesis (no "for your stack"
     consumer framing).
   - Sub drops the "scoring areas this afternoon" marketing claim
     (same energy as the "Live in an afternoon" we cut from
     section 4).
   - Primary CTA: "Get an API key" (was "Get started"). Matches the
     hero CTA, makes the action concrete.
   - Secondary CTA: "Read the methodology" (was "Browse the docs").
     Methodology is where the real trust artefacts live.
   - Foot strip: real numbers, NO source count or source names
     (locked rule, NO EXCEPTIONS). Replaces the outdated
     "7 public sources · 42,640 neighbourhoods" with the v3
     measurement set.
   - Stripped inline-style arrow margins (Marcos's rule — the
     .oga-btn class already provides gap: 6px between flex
     children). */

export function CtaSection() {
  return (
    <section className="oga-cta">
      <div className="oga-cta__field" aria-hidden />

      <div className="oga-cta__inner">
        <div className="oga-cta__mark" aria-hidden>
          <Mark size={46} />
        </div>

        <h2 className="oga-cta__title">
          Build on the data layer underneath UK property workflows.
        </h2>

        <p className="oga-cta__sub">
          API plus a dashboard control plane. Deterministic, version-pinned,
          source-attributed on every response.
        </p>

        <div className="oga-cta__buttons">
          <Link href="/sign-up" className="oga-btn oga-btn-lg oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-lg oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="oga-cta__foot" aria-hidden>
          <span className="oga-status-dot" />
          Engine v2.0.2 · 1.8M postcodes · 43,916 LSOAs · monthly snapshots
        </div>
      </div>
    </section>
  );
}
