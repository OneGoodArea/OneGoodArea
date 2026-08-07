"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import {
  SignalsIcon,
  ScoresIcon,
  MonitorIcon,
  IntelligenceIcon,
} from "../_shared/product-icons";
import "./changelog.css";

/* /changelog - the buyer-facing changelog, rebuilt bespoke in the product-page
   language (Plan 064). Split index + detail: a sticky release index on the
   left, full detail on the right. The latest release is a dark featured panel;
   earlier releases sit on light. Product-named entries are anchored by their
   product icon. Monochrome with a single green accent (the "latest" dot),
   two-tone type tags (feature filled, improvement / fix outline). Plain
   full-sentence copy: no composite / typed query plane / signal.changed / k-NN
   / X-Engine-Version / peer-relative-anomaly jargon. Trimmed to the 1.0 launch
   forward (AR-449); the record is hand-written here and updated on buyer-facing
   releases. */

type ProductKey = "signals" | "scores" | "monitor" | "intelligence";
type EntryType = "feature" | "improvement" | "fix";
type Entry = { type: EntryType; title: string; description: string; product?: ProductKey };
type Release = {
  version: string;
  date: string;
  label: string;
  summary: string;
  entries: Entry[];
};

const PRODUCT_ICON: Record<ProductKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  signals: SignalsIcon,
  scores: ScoresIcon,
  monitor: MonitorIcon,
  intelligence: IntelligenceIcon,
};

const RELEASES: Release[] = [
  {
    version: "1.1.0",
    date: "2026-08-04",
    label: "August 2026",
    summary:
      "Intent-aware scoring. Every preset now scores the same seven categories; the decision you are making only changes how they are weighted.",
    entries: [
      {
        type: "improvement",
        title: "Intent-aware scoring",
        product: "scores",
        description:
          "Every preset now scores the same seven categories (safety and crime, deprivation, property, schools, amenities, transport, environment) from the full set of sources. The decision you are making only changes how they are weighted: property counts for more when investing, transport when choosing a business site, deprivation when moving.",
      },
      {
        type: "improvement",
        title: "Custom weights on any preset",
        product: "scores",
        description:
          "Re-weight the same seven categories for any preset, so a score can follow your own priorities. Every response is still stamped with the engine version that produced it, so numbers stay reproducible for audits.",
      },
    ],
  },
  {
    version: "1.0",
    date: "2026-07-08",
    label: "July 2026",
    summary:
      "The launch. The data and intelligence layer for UK area workflows, live: four products on one shared store of signals and one fixed scoring engine.",
    entries: [
      {
        type: "feature",
        title: "OneGoodArea 1.0",
        description:
          "The data and intelligence layer for UK area workflows, live. Four products on one shared store of signals and one fixed scoring engine.",
      },
      {
        type: "feature",
        title: "Signals",
        product: "signals",
        description:
          "Every public signal for an area across seven categories: crime, deprivation, property, schools, amenities, transport and environment. Each value carries its source, when it was measured, its confidence, and where it sits nationally and regionally.",
      },
      {
        type: "feature",
        title: "Scores",
        product: "scores",
        description:
          "A single 0 to 100 score for an area, built from the seven categories for one of four presets. The scoring never uses AI, so the same inputs always return the same score, and every result is stamped with a version you can pin and reproduce.",
      },
      {
        type: "feature",
        title: "Monitor",
        product: "monitor",
        description:
          "Watch a list of areas and get told when something material changes, with a signed webhook. Small, noisy moves are held back, so you only hear about the ones that matter.",
      },
      {
        type: "feature",
        title: "Intelligence",
        product: "intelligence",
        description:
          "Ask in plain English or send a typed query. You get the answer and the exact query behind it, so every result can be checked and run again. Includes similar-area comparison, outlier detection and a straightforward forecast. The AI works out the query; it never decides the numbers.",
      },
      {
        type: "feature",
        title: "Enterprise controls",
        description:
          "Per-organisation signal bundles, saved scoring presets, version pinning, peer groups, role-based access, white-labelling, and per-key IP allowlisting.",
      },
    ],
  },
];

const anchor = (version: string) => `v${version.replace(/\./g, "-")}`;

/* ============================================================
   Page
   ============================================================ */

export default function ChangelogClient() {
  const total = RELEASES.reduce((sum, r) => sum + r.entries.length, 0);
  const latestVersion = RELEASES[0]?.version;

  return (
    <div className="oga-root oga-changelog">
      <Nav />
      <Hero latest={RELEASES[0]!} releaseCount={RELEASES.length} total={total} />

      <section className="oga-changelog-sec oga-changelog-sec--quiet">
        <div className="oga-changelog__wrap oga-clog__grid">
          <ReleaseIndex releases={RELEASES} latestVersion={latestVersion} />
          <div className="oga-clog__detail">
            {RELEASES.map((r, i) => (
              <ReleasePanel key={r.version} release={r} featured={i === 0} />
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero
   ============================================================ */

function Hero({ latest, releaseCount, total }: { latest: Release; releaseCount: number; total: number }) {
  return (
    <section className="oga-changelog-hero">
      <div className="oga-changelog-hero__dots" aria-hidden />
      <div className="oga-changelog-hero__inner">
        <span className="oga-changelog-hero__eyebrow">
          <span>Changelog</span>
          <span className="oga-changelog-hero__eyebrow-dot" aria-hidden />
          <span>Updated {latest.date}</span>
        </span>
        <h1 className="oga-changelog-hero__title">Everything we&apos;ve shipped.</h1>
        <p className="oga-changelog-hero__lead">
          OneGoodArea 1.0 and every release since. The buyer-facing record of what
          shipped, from launch forward, plainly, so you always know what changed
          and when.
        </p>
        <div className="oga-changelog-hero__meta">
          <span className="oga-changelog-hero__meta-dot" aria-hidden />
          {releaseCount} releases · {total} updates since launch
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Left: sticky release index
   ============================================================ */

function ReleaseIndex({ releases, latestVersion }: { releases: Release[]; latestVersion?: string }) {
  return (
    <aside className="oga-clog-index">
      <div className="oga-clog-index__label">Releases</div>
      <nav className="oga-clog-index__list">
        {releases.map((r) => {
          const isLatest = r.version === latestVersion;
          return (
            <a
              key={r.version}
              href={`#${anchor(r.version)}`}
              className={`oga-clog-index__item${isLatest ? " oga-clog-index__item--latest" : ""}`}
            >
              <span className="oga-clog-index__dot" aria-hidden />
              <span className="oga-clog-index__ver">v{r.version}</span>
              <span className="oga-clog-index__date">{r.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

/* ============================================================
   Right: release detail panel
   ============================================================ */

function ReleasePanel({ release, featured }: { release: Release; featured: boolean }) {
  return (
    <article
      id={anchor(release.version)}
      className={`oga-clog-rel${featured ? " oga-clog-rel--featured" : ""}`}
      {...(featured ? { "data-oga-surface": "dark" as const } : {})}
    >
      <div className="oga-clog-rel__head">
        {featured && (
          <span className="oga-clog-rel__latest">
            <span className="oga-clog-rel__latest-dot" aria-hidden />
            Latest
          </span>
        )}
        <span className="oga-clog-rel__ver">v{release.version}</span>
        <span className="oga-clog-rel__month">{release.label}</span>
        <span className="oga-clog-rel__date">{release.date}</span>
      </div>
      <p className="oga-clog-rel__summary">{release.summary}</p>

      <div className="oga-clog-rel__entries">
        {release.entries.map((e) => (
          <EntryRow key={e.title} entry={e} />
        ))}
      </div>
    </article>
  );
}

function EntryRow({ entry }: { entry: Entry }) {
  const Icon = entry.product ? PRODUCT_ICON[entry.product] : null;
  return (
    <div className="oga-clog-entry">
      <span className="oga-clog-entry__icon" aria-hidden>
        {Icon ? <Icon width={20} height={20} /> : <span className="oga-clog-entry__dot" />}
      </span>
      <div className="oga-clog-entry__main">
        <div className="oga-clog-entry__top">
          <h3 className="oga-clog-entry__title">{entry.title}</h3>
          <Tag type={entry.type} />
        </div>
        <p className="oga-clog-entry__desc">{entry.description}</p>
      </div>
    </div>
  );
}

/* ============================================================
   Type tag - two-tone monochrome
   ============================================================ */

function Tag({ type }: { type: EntryType }) {
  const label = type === "feature" ? "Feature" : type === "improvement" ? "Improvement" : "Fix";
  return <span className={`oga-changelog-tag oga-changelog-tag--${type}`}>{label}</span>;
}

/* ============================================================
   Final CTA (dark)
   ============================================================ */

function FinalCta() {
  return (
    <section className="oga-changelog-sec oga-changelog-sec--dark oga-changelog-cta" data-oga-surface="dark">
      <div className="oga-changelog__wrap oga-changelog-cta__inner">
        <h2 className="oga-changelog-cta__title">Something you want next?</h2>
        <p className="oga-changelog-cta__lead">
          Tell us what would help. Most of what ships here started as an email
          from someone building on the API.
        </p>
        <div className="oga-changelog-cta__ctas">
          <a
            href="mailto:operation@onegoodarea.co.uk?subject=Feature request"
            className="oga-btn oga-btn-primary"
          >
            Request a feature
            <span aria-hidden>→</span>
          </a>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
