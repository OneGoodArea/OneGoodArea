"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import "./changelog.css";

/* /changelog — Brand v3 (Plotted).

   Buyer-facing changelog. Trimmed to the 1.0 launch (AR-449): pre-launch
   iteration history is deliberately omitted. This is the record from launch
   forward. */

type EntryType = "feature" | "fix" | "improvement";
type Entry = { type: EntryType; title: string; description?: string };
type Month = { month: string; updatedAt: string; entries: Entry[] };

const CHANGELOG: Month[] = [
  {
    month: "July 2026",
    updatedAt: "2026-07-08",
    entries: [
      {
        type: "feature",
        title: "OneGoodArea 1.0.",
        description: "The deterministic data and intelligence layer for UK area workflows, live. Four products over one signal store and one frozen scoring engine.",
      },
      {
        type: "feature",
        title: "Signals.",
        description: "Per-area values across seven categories (crime, deprivation, property, schools, amenities, transport, environment). Each carries its source, observed period, confidence, and national and regional percentile.",
      },
      {
        type: "feature",
        title: "Scores.",
        description: "Deterministic 0-100 composites over five weighted dimensions per preset. No AI in the scoring path: the same input and engine version produce the same number every time. Every response is versioned and pinnable via the X-Engine-Version header for model risk registers.",
      },
      {
        type: "feature",
        title: "Monitor.",
        description: "Track portfolios of areas and detect material change over the time-series store. Fires signal.changed webhooks, with sample-size gating to suppress small-sample noise.",
      },
      {
        type: "feature",
        title: "Intelligence.",
        description: "A typed query plane. Send a programmatic plan or a natural-language question; both run through the same deterministic executor and echo the executed plan for replay. Peers (k-NN), insights (peer-relative anomalies), and forecast (linear projection). The AI plans the query; it never sets the numbers.",
      },
      {
        type: "feature",
        title: "Enterprise controls.",
        description: "Per-org signal bundles, saved scoring presets, methodology pinning, peer cohorts, three-tier RBAC, white-label, and per-key IP allowlist.",
      },
    ],
  },
];

/* ============================================================
   Page
   ============================================================ */

export default function ChangelogClient() {
  const total = CHANGELOG.reduce((sum, m) => sum + m.entries.length, 0);
  const [latest, ...earlier] = CHANGELOG;

  return (
    <div className="oga-root oga-changelog">
      <Nav />

      <Hero total={total} latestDate={latest.updatedAt} />
      <SectionLatest month={latest} />
      {earlier.length > 0 && <SectionArchive months={earlier} />}

      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero({ total, latestDate }: { total: number; latestDate: string }) {
  return (
    <section className="oga-changelog-hero oga-section-hero">
      <div className="oga-changelog__container--narrow">
        <div className="oga-changelog-hero__eyebrow">
          <span className="oga-changelog-hero__dot" aria-hidden />
          <span>Changelog</span>
          <span className="oga-changelog-hero__eyebrow-sep" aria-hidden />
          <span>Updated {latestDate}</span>
        </div>

        <h1 className="oga-changelog-hero__title">What we&rsquo;ve shipped.</h1>

        <p className="oga-changelog-hero__lead">
          OneGoodArea 1.0, the deterministic data and intelligence layer for UK area
          workflows. This is the buyer-facing record of what shipped, from launch forward.
        </p>

        <div className="oga-changelog-hero__meta">
          <span className="oga-changelog-hero__meta-dot" aria-hidden />
          {total} updates in the 1.0 launch
        </div>
      </div>
    </section>
  );
}

/* ─────── 01 — This release (DARK, collapsible, open by default) ─────── */

function SectionLatest({ month }: { month: Month }) {
  return (
    <section id="latest" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-changelog__container">
        <header className="oga-changelog__header">
          <div className="oga-changelog__eyebrow">
            <span className="oga-changelog__eyebrow-num">01</span>
            <span className="oga-changelog__eyebrow-line" aria-hidden />
            <span>This release</span>
          </div>
          <h2 className="oga-changelog__h2">What just landed.</h2>
          <p className="oga-changelog__lead">
            The 1.0 launch, open by default. Click to collapse. Each entry tagged feature,
            improvement, or fix.
          </p>
        </header>

        <div className="oga-changelog-archive__list oga-changelog-archive__list--single">
          <MonthBlock month={month} openByDefault />
        </div>
      </div>
    </section>
  );
}

/* ─────── 02 — Earlier (cream timeline, all collapsed by default) ─────── */

function SectionArchive({ months }: { months: Month[] }) {
  return (
    <section id="archive" className="oga-section-hero">
      <div className="oga-changelog__container">
        <header className="oga-changelog__header">
          <div className="oga-changelog__eyebrow">
            <span className="oga-changelog__eyebrow-num">02</span>
            <span className="oga-changelog__eyebrow-line" aria-hidden />
            <span>Earlier releases</span>
          </div>
          <h2 className="oga-changelog__h2">The road behind.</h2>
          <p className="oga-changelog__lead">
            Reverse-chronological. Click any month to expand. Each entry tagged feature, improvement,
            or fix.
          </p>
        </header>

        <div className="oga-changelog-archive__list">
          <div className="oga-changelog-archive__rail" aria-hidden />
          {months.map((m) => (
            <MonthBlock key={m.month} month={m} openByDefault={false} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MonthBlock({ month, openByDefault }: { month: Month; openByDefault: boolean }) {
  const [open, setOpen] = useState(openByDefault);
  const counts = countEntries(month.entries);

  return (
    <div className="oga-changelog-archive__month">
      <div className="oga-changelog-archive__node" aria-hidden>
        <span className="oga-changelog-archive__node-dot" />
      </div>
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="oga-changelog-archive__toggle"
        >
          <span className="oga-changelog-archive__toggle-label">
            <span className="oga-changelog-archive__toggle-month">{month.month}</span>
            <span className="oga-changelog-archive__toggle-counts">
              {counts.feature > 0     && <Badge type="feature"     n={counts.feature} />}
              {counts.fix > 0         && <Badge type="fix"         n={counts.fix} />}
              {counts.improvement > 0 && <Badge type="improvement" n={counts.improvement} />}
            </span>
          </span>
          <span className="oga-changelog-archive__toggle-glyph" aria-hidden>+</span>
        </button>

        <div className={`oga-changelog-archive__panel${open ? " oga-changelog-archive__panel--open" : ""}`}>
          <div className="oga-changelog-archive__entries">
            {month.entries.map((e, i) => (
              <div key={i} className="oga-changelog-archive__entry">
                <Badge type={e.type} />
                <div>
                  <h4 className="oga-changelog-archive__entry-title">{e.title}</h4>
                  {e.description && <p className="oga-changelog-archive__entry-desc">{e.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────── Badge (shared) ─────── */

function Badge({ type, n }: { type: EntryType; n?: number }) {
  const label = type === "feature" ? "Feature" : type === "fix" ? "Fix" : "Improvement";
  return (
    <span className={`oga-changelog-badge oga-changelog-badge--${type}`}>
      {n !== undefined ? `${n} ` : ""}{label}{n !== undefined && n !== 1 ? "s" : ""}
    </span>
  );
}

function countEntries(entries: Entry[]) {
  return entries.reduce(
    (acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    },
    { feature: 0, fix: 0, improvement: 0 } as Record<EntryType, number>,
  );
}

/* ─────── Final CTA ─────── */

function FinalCta() {
  return (
    <section className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-changelog__container--narrow oga-changelog-cta__inner">
        <h2 className="oga-changelog-cta__title">Something missing?</h2>
        <p className="oga-changelog-cta__lead">
          Tell us what you&rsquo;d like to see next. Most items on this page started as an email.
        </p>
        <div className="oga-changelog-cta__buttons">
          <a href="mailto:operation@onegoodarea.co.uk?subject=Feature request" className="oga-btn oga-btn-primary">
            Request a feature
            <span aria-hidden>&rarr;</span>
          </a>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
