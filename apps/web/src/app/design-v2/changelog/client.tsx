"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import "./changelog.css";

/* /changelog — Brand v3 (Plotted) — AR-204 PR D.

   Buyer-facing changelog only. Internal-only architectural moves
   (monorepo split, Fastify cutover, container parity, DAL work)
   are deliberately omitted per Pedro 2026-05-30 — they're shipped
   capability from an engineering view, not from a buyer's. */

type EntryType = "feature" | "fix" | "improvement";
type Entry = { type: EntryType; title: string; description?: string };
type Month = { month: string; updatedAt: string; entries: Entry[] };

const CHANGELOG: Month[] = [
  {
    month: "May 2026",
    updatedAt: "2026-05-30",
    entries: [
      {
        type: "feature",
        title: "Intelligence query plane.",
        description: "New POST /v1/query: a typed JSON plan grammar with six ops (rank_areas, get_area, score_area, find_peers, find_insights, find_forecast). Programmatic plans skip the LLM entirely; natural-language questions route through a planner that emits the same typed grammar. Every response echoes the executed plan and plan_source for full replay.",
      },
      {
        type: "feature",
        title: "Compound multi-signal queries.",
        description: "rank_areas accepts up to eight signals[] with per-signal filters and a sort_by directive. Filter ops: eq, lt, lte, gt, gte, between, plus percentile variants. AND semantics across signals via INNER JOINs. One query, one plan, many constraints.",
      },
      {
        type: "feature",
        title: "Similarity, anomaly, and forecast surfaces.",
        description: "POST /v1/peers (k-NN over normalized signal vectors, default k=20, min 3 overlapping signals). POST /v1/insights (rank LSOAs by absolute peer-relative z-score; materialized peer graph so no request-time recompute). POST /v1/forecast (linear regression over signal_timeseries with constant confidence band; default 24-month window, 12-month horizon; not a learned model).",
      },
      {
        type: "feature",
        title: "Derived signals: YoY, momentum, trend slope, peer-relative.",
        description: "Five new derived signals computed in-DB and immediately queryable through the query plane: property.price_change_pct_yoy (count-weighted calendar year), crime.total_12m_change_pct_yoy (rolling 12), property.median_price_change_pct_6m (6-month momentum), crime.monthly_count_trend_slope_24m (regr_slope), and peer-relative z-scores. Each documented with window length, minimum-observations guard, and confidence stamp.",
      },
      {
        type: "feature",
        title: "AI eval harness with measured planner accuracy.",
        description: "92.9% on a 14-case curated corpus against claude-sonnet-4. By-op breakdown published. The harness measures the production seam (Zod schema, planner, executor) not the model.",
      },
      {
        type: "feature",
        title: "Levers: per-organisation methodology controls.",
        description: "Custom signal bundles (whitelist of signal_keys the API exposes to your keys). Saved scoring presets (recall a (base_preset, weights) tuple by id from /v1/score). Org-level methodology pinning (lock your org to a specific engine_version; stamped on X-Engine-Version for every scoring response). Per-org peer cohorts (named LSOA lists that scope /v1/peers candidates). All four are opt-in.",
      },
      {
        type: "feature",
        title: "Three-tier RBAC.",
        description: "member (read-only on org surfaces), admin (daily ops: bundles, presets, cohorts, member CRUD, org rename), owner (chain-of-authority: methodology pinning, granting ownership, removing owners). Last-owner guard. Four typed 403 codes (admin_required, owner_required, cannot_grant_owner, cannot_remove_owner_as_admin) for client programming.",
      },
      {
        type: "feature",
        title: "White-label and per-key IP allowlist.",
        description: "Per-org display_name and brand_url surfaced on /v1/me. Per-API-key allowed_ip_cidrs[] enforced at the gateway with full IPv4 CIDR matching. Empty array means no restriction; existing keys unchanged.",
      },
      {
        type: "improvement",
        title: "Brand v3 (Plotted) live.",
        description: "New homepage, methodology page, and docs surfaces. Geist sans plus the warm graphite + cream two-colour palette. The 29-dot Plotted mark on every page. /methodology fully rewritten to reflect the system as it actually is (14 sections, every claim traced to an ADR).",
      },
    ],
  },
  {
    month: "April 2026",
    updatedAt: "2026-04-30",
    entries: [
      {
        type: "feature",
        title: "Confidence per dimension.",
        description: "Every score now ships with a confidence value (0.0-1.0) plus a written reason. HIGH for primary fresh data, MEDIUM for partial fallback or older datasets, LOW for proxy fallback, NONE when data is missing. Honest about inferred-not-measured dimensions like Footfall and Rental Yield.",
      },
      {
        type: "feature",
        title: "Methodology versioning.",
        description: "Every response stamps the engine version that produced it. Public methodology changelog established. Lets regulated buyers pin a version in their model risk register via the X-Engine-Version header.",
      },
      {
        type: "feature",
        title: "OpenAPI 3.0 spec.",
        description: "First public API contract published at /openapi.json. (Note: superseded by the live-Fastify regeneration tracked separately; see /docs/api-reference for the surface map.)",
      },
      {
        type: "feature",
        title: "Time-series re-scoring infrastructure.",
        description: "Monthly re-scoring of top UK postcodes builds a trend dataset that compounds. New report_history table tracks every score with confidence and engine version stamp. (Distinct from the broader signal_timeseries moat that landed in May.)",
      },
      {
        type: "improvement",
        title: "Stripe-parity API hygiene.",
        description: "Retry-After header on 429 responses across the report and widget endpoints. Honest rate-limit feedback for clients implementing backoff.",
      },
      {
        type: "improvement",
        title: "Mobile, properly.",
        description: "Every route works on a phone. Hamburger nav, off-canvas sidebar, tables that collapse sensibly, readable type down to 375px.",
      },
      {
        type: "improvement",
        title: "Loading, error, and 404 states in brand.",
        description: "Skeleton loaders, error recovery, and not-found pages that match the rest of the site.",
      },
      {
        type: "improvement",
        title: "Dark mode, audited.",
        description: "Dark-theme tokens rewired so every page reads cleanly in low light.",
      },
    ],
  },
  {
    month: "March 2026",
    updatedAt: "2026-03-31",
    entries: [
      { type: "feature", title: "Ofsted school inspection ratings.",  description: "Reports include Ofsted ratings for nearby schools in England. Each school shown with its rating and distance. School quality factors into the Schools and Education score." },
      { type: "feature", title: "IMD 2025 deprivation data.",         description: "English deprivation data upgraded from IMD 2019 to IMD 2025. Now covers 33,755 neighbourhoods using the latest census boundaries." },
      { type: "feature", title: "HM Land Registry integration.",      description: "Real sold prices from the Land Registry Price Paid API. Median price, YoY trends, property type breakdown, tenure split, and price range." },
      { type: "feature", title: "Property Market panel on reports.",  description: "New report section with local property market data. Included on every report." },
      { type: "feature", title: "Data freshness badges.",              description: "Colour-coded badges on every report showing the source and age of each data point." },
      { type: "feature", title: "PDF export.",                          description: "Download any report as a branded PDF with Property Market and Schools data included." },
      { type: "feature", title: "Saved areas and watchlist.",         description: "Save areas from reports, view them on a dashboard grid, and export as CSV." },
      { type: "feature", title: "32 UK area pages.",                   description: "Programmatic SEO pages for 32 UK cities with real scored data." },
      { type: "feature", title: "Embeddable widget.",                  description: "Drop a single script tag on any page to show OneGoodArea scores. No API key needed." },
      { type: "feature", title: "Area-type aware scoring.",            description: "Urban, suburban, and rural areas scored against different benchmarks for fair comparison." },
      { type: "feature", title: "Dark and light theme toggle.",        description: "Switch between dark and light mode from the navbar. Warm off-white palette in light mode. Persists across sessions." },
      { type: "feature", title: "Share buttons and email delivery.",   description: "One-click sharing to WhatsApp, LinkedIn, X, or copy link. Reports emailed automatically with score summary." },
      { type: "feature", title: "B2B landing page and API pricing.",   description: "Dedicated /business page with capabilities and use cases. API tiers from £49/mo to £499/mo." },
      { type: "feature", title: "Interactive API playground.",         description: "Live playground on the docs page with curated postcodes, score visualisation, and raw JSON toggle." },
      { type: "feature", title: "Blog.",                                description: "New /blog section with data-driven posts on UK areas, property investment, and home buying." },
      { type: "fix",     title: "Geocode accuracy for place names.",   description: "Searching by city name now correctly resolves to the city, not a small suburb with the same name." },
    ],
  },
  {
    month: "February 2026",
    updatedAt: "2026-02-28",
    entries: [
      { type: "feature",     title: "Reproducible scoring engine.",    description: "Scoring functions, four intent profiles, transparent reasoning strings. Same postcode, same score, every time." },
      { type: "feature",     title: "Live Stripe payments.",            description: "Credit-based model with checkout, billing portal, and webhook handling." },
      { type: "feature",     title: "Email verification.",              description: "Branded verification emails with token-based flow via Resend." },
      { type: "feature",     title: "Activity tracking and admin.",    description: "Custom analytics with no third-party tools." },
    ],
  },
  {
    month: "January 2026",
    updatedAt: "2026-01-31",
    entries: [
      { type: "feature", title: "Interactive report display.",  description: "Radar chart, collapsible sections, score context bar, and RAG colour coding." },
      { type: "feature", title: "Public REST API.",              description: "Bearer auth, API key management, and full documentation with code examples." },
      { type: "feature", title: "Area comparison.",              description: "Side-by-side scoring of two locations with dimensional breakdown." },
      { type: "feature", title: "Pricing and plans.",            description: "Credit-based model with comparison table and Stripe integration." },
      { type: "feature", title: "Core platform launch.",         description: "Dashboard, auth, Neon Postgres, AI-narrated reports, deployment to Vercel." },
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

      <Hero total={total} months={CHANGELOG.length} latestDate={latest.updatedAt} />
      <SectionLatest month={latest} />
      <SectionArchive months={earlier} />

      <FinalCta />
      <Footer />
    </div>
  );
}

/* ─────── Hero ─────── */

function Hero({ total, months, latestDate }: { total: number; months: number; latestDate: string }) {
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
          New product surfaces, new derived signals, new org controls. OneGoodArea gets sharper every
          month and this is the buyer-facing written record.
        </p>

        <div className="oga-changelog-hero__meta">
          <span className="oga-changelog-hero__meta-dot" aria-hidden />
          {total} updates across {months} months
        </div>
      </div>
    </section>
  );
}

/* ─────── § 01 — This month (DARK, collapsible, open by default) ─────── */

function SectionLatest({ month }: { month: Month }) {
  return (
    <section id="latest" className="oga-section-dark" data-oga-surface="dark">
      <div className="oga-changelog__container">
        <header className="oga-changelog__header">
          <div className="oga-changelog__eyebrow">
            <span className="oga-changelog__eyebrow-num">01</span>
            <span className="oga-changelog__eyebrow-line" aria-hidden />
            <span>This month</span>
          </div>
          <h2 className="oga-changelog__h2">What just landed.</h2>
          <p className="oga-changelog__lead">
            The freshest batch of shipped capability, open by default. Click to collapse, or scroll
            for earlier months below.
          </p>
        </header>

        <div className="oga-changelog-archive__list oga-changelog-archive__list--single">
          <MonthBlock month={month} openByDefault />
        </div>
      </div>
    </section>
  );
}

/* ─────── § 02 — Earlier (cream timeline, all collapsed by default) ─────── */

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
            <span aria-hidden>→</span>
          </a>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
