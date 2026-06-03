"use client";

import React from "react";
import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import type { AreaData, AreaDimension } from "@/data/area-types";
import "./area-slug.css";

/* /area/[slug] — Brand v3 rewrite v3 (AR-204 close-out 13/15).

   Mirrors /about's exact pattern + primitives:
     • .oga-eyebrow + .oga-eyebrow-mono / .oga-eyebrow-dot (real shared)
     • .oga-section-quiet / .oga-section-dark + data-oga-surface (real shared)
     • .oga-btn + .oga-btn-primary / .oga-btn-secondary (real shared)
     • 920px prose container, 1120px grid container
     • Section padding clamp(56-64, 8-9vw, 112-120) 24

   Section flow (matches /about altitude):
     Hero                  -- cream, text-only, 2-CTA row
     § 01 Overall score    -- cream-quiet, editorial split (H2 + prose | ring)
     § 02 By the dimensions -- DARK, 3-col card grid (mirrors /about's principles)
     § 03 Score by intent   -- cream, prose + 4-up stat strip (mirrors /about's STATS)
     § 04 Inside the report -- cream-quiet, single editorial teaser card
     § 05 Get the report    -- DARK CTA (mirrors /about's "Talk to us")
     Related                -- cream, restrained grid
*/

type Related = { slug: string; name: string; overallScore: number };

type RagTone = "strong" | "moderate" | "weak";

function ragTone(score: number): RagTone {
  if (score >= 70) return "strong";
  if (score >= 45) return "moderate";
  return "weak";
}

function ragLabel(tone: RagTone): string {
  return tone === "strong" ? "Strong" : tone === "moderate" ? "Moderate" : "Weak";
}

/* RAG colours — only used where genuine semantic signal (score ring,
   dimension card score number, intent score number). Otherwise text
   stays ink / white per surface. */
function ragColor(tone: RagTone, surface: "light" | "dark"): string {
  if (surface === "light") {
    if (tone === "strong")   return "var(--oga-fg)";
    if (tone === "moderate") return "#D49900";
    return "#D13A1E";
  }
  if (tone === "strong")   return "var(--oga-white)";
  if (tone === "moderate") return "#FFE07A";
  return "#FFB8A8";
}

export default function AreaClient({ slug, area, related }: {
  slug: string; area: AreaData; related: Related[];
}) {
  const signupHref = `/sign-up?postcode=${encodeURIComponent(area.postcode)}`;
  return (
    <div className="oga-root oga-area">
      <Nav />

      {/* HERO — mirrors product hero pattern (oga-section-hero +
              centered, identity-anchor up top, h1 + lead + 2-CTA) ---- */}
      <section className="oga-section-hero oga-area-hero" data-oga-surface="light">
        <div className="oga-area-hero__inner">
          <div className="oga-area-hero__anchor" aria-hidden>
            <HeroScoreRing score={area.overallScore} />
          </div>

          <div className="oga-area-hero__eyebrow oga-eyebrow">
            <span className="oga-eyebrow-dot" aria-hidden />
            <span>{area.region} · {area.areaType}</span>
          </div>

          <h1 className="oga-area-hero__h1">{area.name}</h1>

          <p className="oga-area-hero__lead">{area.summary}</p>

          <div className="oga-area-hero__ctas">
            <Link href={signupHref} className="oga-btn oga-btn-primary">
              Generate full report
              <span aria-hidden>→</span>
            </Link>
            <Link href="/methodology" className="oga-btn oga-btn-secondary">
              Read the methodology
            </Link>
          </div>
        </div>
      </section>

      {/* § 01 — BY THE DIMENSIONS (DARK) -------------------------- */}
      <Dimensions area={area} />

      {/* § 02 — SCORE BY INTENT (cream) --------------------------- */}
      <Intents area={area} />

      {/* § 03 — INSIDE THE FULL REPORT (cream-quiet) -------------- */}
      <LockedTeaser area={area} />

      {/* § 04 — CLOSING CTA (DARK) -------------------------------- */}
      <ClosingCta area={area} signupHref={signupHref} />

      {/* Related -------------------------------------------------- */}
      <Related items={related} />

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: area.name,
            description: area.summary,
            address: {
              "@type": "PostalAddress",
              addressRegion: area.region,
              addressCountry: "GB",
              postalCode: area.postcode,
            },
            url: `https://www.onegoodarea.com/area/${slug}`,
            additionalProperty: [
              { "@type": "PropertyValue", name: "OneGoodArea Score", value: area.overallScore, maxValue: 100, unitText: "points" },
              ...area.dimensions.map((d) => ({
                "@type": "PropertyValue", name: `${d.label} Score`, value: d.score, maxValue: 100, unitText: "points",
              })),
            ],
          }),
        }}
      />
    </div>
  );
}

/* ============================================================
   Hero score ring — centered identity anchor, sized to match the
   product-page hero icon presence (160px). Carries the actual area
   score as both visual and content. RAG tone on the progress stroke.
   ============================================================ */
function HeroScoreRing({ score }: { score: number }) {
  const tone = ragTone(score);
  const size = 112;
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const ring = ragColor(tone, "light");

  return (
    <div className="oga-area-hero__ring" data-tone={tone}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--oga-border)" strokeWidth="2" fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={ring} strokeWidth="4" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="oga-area-hero__ring-fill"
        />
      </svg>
      <div className="oga-area-hero__ring-text">
        <span className="oga-area-hero__ring-value">{score}</span>
        <span className="oga-area-hero__ring-out">{ragLabel(tone)}</span>
      </div>
    </div>
  );
}

/* ============================================================
   § 01 — By the dimensions (DARK, 3-col card grid)
   ============================================================ */
function Dimensions({ area }: { area: AreaData }) {
  return (
    <section className="oga-section-dark oga-area-dims" data-oga-surface="dark">
      <div className="oga-area-dims__inner">
        <div className="oga-area-dims__head">
          <div className="oga-area-dims__eyebrow oga-eyebrow oga-eyebrow--inverse">
            <span className="oga-eyebrow-mono">01</span>
            <span>By the dimensions</span>
          </div>
          <h2 className="oga-area-dims__title">
            Every dimension. Every weight. Every reason.
          </h2>
          <p className="oga-area-dims__lead">
            {area.dimensions.length} weighted scores computed from {area.dataSources.length} live UK data sources. Each one carries its own evidence trail.
          </p>
        </div>

        <ol className="oga-area-dims__grid">
          {area.dimensions.map((d, i) => (
            <DimensionCard key={d.label} dim={d} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function DimensionCard({ dim, index }: { dim: AreaDimension; index: number }) {
  const tone = ragTone(dim.score);
  const fg = ragColor(tone, "dark");
  return (
    <li className="oga-area-dims__card">
      <div className="oga-area-dims__card-viz">
        <DimensionViz score={dim.score} />
      </div>
      <div className="oga-area-dims__card-meta">
        <span className="oga-area-dims__card-num">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className="oga-area-dims__card-score"
          style={{ color: fg }}
        >
          {dim.score}
          <span className="oga-area-dims__card-score-mut">/ {dim.weight}%</span>
        </span>
      </div>
      <h3 className="oga-area-dims__card-title">{dim.label}</h3>
      <p className="oga-area-dims__card-body">{dim.summary}</p>
    </li>
  );
}

/* Dimension viz — 5x5 dot grid, N filled (N = round(score/4)), rest
   dimmed. Brand v3 dot-motif vocabulary, restrained, no chartjunk.
   currentColor adapts to surface (white on DARK). */
function DimensionViz({ score }: { score: number }) {
  const totalDots = 25;
  const filled = Math.round((score / 100) * totalDots);
  const cols = [4, 10, 16, 22, 28];
  const rows = [4, 10, 16, 22, 28];

  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className="oga-area-dims__card-svg">
      <g fill="currentColor">
        {rows.map((y, rIdx) =>
          cols.map((x, cIdx) => {
            const dotIdx = rIdx * 5 + cIdx;
            const isFilled = dotIdx < filled;
            return (
              <circle
                key={`${rIdx}-${cIdx}`}
                cx={x}
                cy={y}
                r={isFilled ? 1.3 : 1.0}
                opacity={isFilled ? 1 : 0.18}
              />
            );
          }),
        )}
      </g>
    </svg>
  );
}

/* ============================================================
   § 03 — Score by intent (cream, prose + 4-up stat strip)
   ============================================================ */
function Intents({ area }: { area: AreaData }) {
  return (
    <section className="oga-area-intents" data-oga-surface="light">
      <div className="oga-area-intents__inner">
        <div className="oga-area-intents__eyebrow oga-eyebrow">
          <span className="oga-eyebrow-mono">02</span>
          <span>Score by intent</span>
        </div>

        <h2 className="oga-area-intents__title">
          One area. Scored against every intent.
        </h2>

        <div className="oga-area-intents__prose">
          <p>
            The same dimensions, weighted differently for each use-case. A great area for a first-time-buyer is rarely the same area for a hands-off landlord. Intent-relative scoring is the difference between a generic ranking and a decision-grade one.
          </p>
        </div>

        <ul className="oga-area-intents__stats">
          {area.intents.map((intent) => {
            const tone = ragTone(intent.score);
            return (
              <li key={intent.slug} className="oga-area-intents__stat">
                <div
                  className="oga-area-intents__stat-value"
                  style={{ color: ragColor(tone, "light") }}
                >
                  {intent.score}
                </div>
                <div className="oga-area-intents__stat-label">
                  {intent.label}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ============================================================
   § 04 — Inside the full report (cream-quiet, single teaser card)
   ============================================================ */
function LockedTeaser({ area }: { area: AreaData }) {
  return (
    <section className="oga-section-quiet oga-area-locked" data-oga-surface="light">
      <div className="oga-area-locked__inner">
        <div className="oga-area-locked__eyebrow oga-eyebrow">
          <span className="oga-eyebrow-mono">03</span>
          <span>Inside the full report</span>
        </div>

        <h2 className="oga-area-locked__title">
          What&rsquo;s behind the lock.
        </h2>

        <div className="oga-area-locked__prose">
          <p>
            {area.lockedSections.length} sections of detailed reasoning. {area.lockedRecommendations} personalised recommendations for this area. The raw signals behind every score, attributed to the source.
          </p>
        </div>

        <div className="oga-area-locked__card">
          <div className="oga-area-locked__card-head">
            <div className="oga-area-locked__card-head-text">
              <div className="oga-area-locked__card-eyebrow">
                The full {area.name} report
              </div>
              <div className="oga-area-locked__card-line">
                {area.lockedSections.length + 1} sections · {area.dataSources.length} sources · methodology-versioned
              </div>
            </div>
            <LockIcon />
          </div>

          <ol className="oga-area-locked__list">
            {area.lockedSections.map((title, i) => (
              <li key={i} className="oga-area-locked__list-item">
                <span className="oga-area-locked__list-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="oga-area-locked__list-text">{title}</span>
              </li>
            ))}
            <li className="oga-area-locked__list-item oga-area-locked__list-item--rec">
              <span className="oga-area-locked__list-num">
                {String(area.lockedSections.length + 1).padStart(2, "0")}
              </span>
              <span className="oga-area-locked__list-text">
                {area.lockedRecommendations} personalised recommendations.
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="oga-area-locked__icon"
    >
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 11 V7 A 4 4 0 0 1 16 7 V11" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  );
}

/* ============================================================
   § 05 — Closing CTA (DARK)
   ============================================================ */
function ClosingCta({ area, signupHref }: { area: AreaData; signupHref: string }) {
  return (
    <section className="oga-section-dark oga-area-cta" data-oga-surface="dark">
      <div className="oga-area-cta__inner">
        <div className="oga-area-cta__eyebrow oga-eyebrow oga-eyebrow--inverse">
          <span className="oga-eyebrow-mono">04</span>
          <span>Get the report</span>
        </div>

        <h2 className="oga-area-cta__title">
          Get the full report on {area.name}.
        </h2>

        <p className="oga-area-cta__lead">
          Every dimension reasoned through. Every score backed by the raw signals behind it. Methodology-versioned so you can audit every output.
        </p>

        <div className="oga-area-cta__actions">
          <Link href={signupHref} className="oga-btn oga-btn-primary">
            Generate full report
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

/* ============================================================
   Related areas (cream tail, restrained grid)
   ============================================================ */
function Related({ items }: { items: Related[] }) {
  if (items.length === 0) return null;
  return (
    <section className="oga-area-related" data-oga-surface="light">
      <div className="oga-area-related__inner">
        <div className="oga-area-related__eyebrow oga-eyebrow">
          <span className="oga-eyebrow-dot" aria-hidden />
          <span>More UK areas</span>
        </div>

        <h2 className="oga-area-related__title">
          Compare against other UK areas.
        </h2>

        <ul className="oga-area-related__grid">
          {items.map((a) => {
            const tone = ragTone(a.overallScore);
            return (
              <li key={a.slug} className="oga-area-related__cell">
                <Link href={`/area/${a.slug}`} className="oga-area-related__card">
                  <span className="oga-area-related__name">{a.name}</span>
                  <span
                    className="oga-area-related__score"
                    style={{ color: ragColor(tone, "light") }}
                  >
                    {a.overallScore}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
