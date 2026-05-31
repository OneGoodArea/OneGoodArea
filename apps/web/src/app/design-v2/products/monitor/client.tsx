"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { MonitorIcon } from "../../_shared/product-icons";
import { METHODOLOGY_VERSION } from "@/lib/methodology-versions";
import "./monitor.css";

/* /products/monitor — AR-204 product page #3.

   Pattern parity w/ /products/{signals,scores}, Monitor-specific
   bespoke illustrations + content. Source of truth:
   docs/DESIGN/AR-204-product-pages-spec-pack.md §3.

   Hard rules: no em dashes in user-facing copy; no `aiq_`; no fake
   links; prebaked specimen is illustrative not live (see foot note +
   memory follow-up). */

/* ============================================================
   Prebaked portfolio specimen — a fixed "Demo lender book"
   ChangeReport that the live demo would return for a curated
   portfolio. Values realistic-shape; not live API output.
   ============================================================ */

type Baseline = "previous" | "first";
type Threshold = 0 | 5 | 10;
type MinTx = 0 | 8;

const DEMO_AREAS = [
  { postcode: "M1 1AE",   lsoa: "E01005207" },
  { postcode: "B1 1AA",   lsoa: "E01033620" },
  { postcode: "LS1 4DT",  lsoa: "E01011358" },
  { postcode: "NE1 7RU",  lsoa: "E01008397" },
];

type SignalChange = {
  signal_key: string;
  area_label: string;
  geo_code: string;
  period_from: string;
  period_to: string;
  value_from: string;
  value_to: string;
  pct_change: number; // signed
  unit?: string;
};

/* All hypothetical material moves the demo portfolio could surface.
   We then filter by baseline + threshold + min_transactions and
   render the resulting subset. */
const ALL_MOVES: (SignalChange & {
  baseline: Baseline | "any";
  requires_min_tx: number; // 0 if not a price move
})[] = [
  // baseline=previous (latest month vs prior month)
  {
    signal_key: "property.median_price",
    area_label: "M1 1AE",
    geo_code: "E01005207",
    period_from: "2026-03",
    period_to: "2026-04",
    value_from: "£182,500",
    value_to: "£196,300",
    pct_change: 7.6,
    baseline: "previous",
    requires_min_tx: 8,
  },
  {
    signal_key: "crime.total_12m",
    area_label: "B1 1AA",
    geo_code: "E01033620",
    period_from: "2026-03",
    period_to: "2026-04",
    value_from: "4,108",
    value_to: "4,512",
    pct_change: 9.8,
    baseline: "previous",
    requires_min_tx: 0,
  },
  {
    signal_key: "property.median_price",
    area_label: "LS1 4DT",
    geo_code: "E01011358",
    period_from: "2026-03",
    period_to: "2026-04",
    value_from: "£212,800",
    value_to: "£218,400",
    pct_change: 2.6,
    baseline: "previous",
    requires_min_tx: 8,
  },
  // noisy low-transaction move that gets filtered by min_transactions
  {
    signal_key: "property.median_price",
    area_label: "NE1 7RU",
    geo_code: "E01008397",
    period_from: "2026-03",
    period_to: "2026-04",
    value_from: "£148,000",
    value_to: "£217,500",
    pct_change: 47.0,
    baseline: "previous",
    requires_min_tx: 999, // intentionally fails the 8-tx gate
  },

  // baseline=first (latest month vs oldest in stored range, 12m back)
  {
    signal_key: "property.median_price",
    area_label: "M1 1AE",
    geo_code: "E01005207",
    period_from: "2025-04",
    period_to: "2026-04",
    value_from: "£175,000",
    value_to: "£196,300",
    pct_change: 12.2,
    baseline: "first",
    requires_min_tx: 8,
  },
  {
    signal_key: "crime.total_12m",
    area_label: "B1 1AA",
    geo_code: "E01033620",
    period_from: "2025-04",
    period_to: "2026-04",
    value_from: "3,654",
    value_to: "4,512",
    pct_change: 23.5,
    baseline: "first",
    requires_min_tx: 0,
  },
  {
    signal_key: "property.median_price",
    area_label: "LS1 4DT",
    geo_code: "E01011358",
    period_from: "2025-04",
    period_to: "2026-04",
    value_from: "£198,400",
    value_to: "£218,400",
    pct_change: 10.1,
    baseline: "first",
    requires_min_tx: 8,
  },
  {
    signal_key: "crime.total_12m",
    area_label: "M1 1AE",
    geo_code: "E01005207",
    period_from: "2025-04",
    period_to: "2026-04",
    value_from: "3,840",
    value_to: "3,712",
    pct_change: -3.3,
    baseline: "first",
    requires_min_tx: 0,
  },
];

export default function ProductMonitorClient() {
  return (
    <div className="oga-root oga-mon">
      <Nav />
      <Hero />
      <SectionSpecimen />
      <SectionWatched />
      <SectionPipeline />
      <SectionEndpoints />
      <SectionIcps />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero
   ============================================================ */

function Hero() {
  return (
    <section className="oga-section-hero oga-mon-hero">
      <div className="oga-mon__wrap--narrow">
        <div className="oga-mon-hero__icon" aria-hidden>
          <MonitorIcon width={132} height={132} />
        </div>
        <h1 className="oga-mon-hero__h1">
          Monitor: portfolios plus signed change detection.
        </h1>
        <p className="oga-mon-hero__lead">
          Save a book of UK areas, enrich it on intake, and detect material
          moves across the monthly time-series on demand. Each move arrives as
          a structured row with the exact periods compared, the raw values
          before and after, and the percent change. Material alerts deliver as
          Stripe-style HMAC-SHA256 signed webhooks. Sample-size gated so a
          47% swing on two sales never earns an alert.
        </p>
        <div className="oga-mon-hero__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   § 01 — Live specimen (DARK) — ChangeReport for a demo portfolio
   ============================================================ */

function SectionSpecimen() {
  const [baseline, setBaseline] = useState<Baseline>("previous");
  const [threshold, setThreshold] = useState<Threshold>(5);
  const [minTx, setMinTx] = useState<MinTx>(8);
  const [view, setView] = useState<"rendered" | "json">("rendered");

  const candidates = ALL_MOVES.filter((m) => m.baseline === baseline);
  const filtered = candidates.filter(
    (m) => Math.abs(m.pct_change) >= threshold && m.requires_min_tx <= minTx
  );

  return (
    <section
      className="oga-section-dark oga-mon-spec"
      data-oga-surface="dark"
      aria-labelledby="mon-spec-title"
    >
      <div className="oga-mon__wrap">
        <header className="oga-mon-spec__head">
          <div className="oga-mon-spec__eyebrow">
            <span className="oga-mon-spec__eyebrow-mark" aria-hidden />
            <span>Sample response</span>
            <span className="oga-mon-spec__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="mon-spec-title" className="oga-mon-spec__title">
            One portfolio. One change report. Sample-size honest.
          </h2>
          <p className="oga-mon-spec__sub">
            Turn the knobs and watch material moves drop in or out. The
            baseline picks what &ldquo;from&rdquo; means; the threshold sets what counts
            as material; the sample gate keeps a 2-sale swing from earning an
            alert.
          </p>
        </header>

        <div className="oga-mon-spec__knobs">
          <div className="oga-mon-spec__knob" role="tablist" aria-label="Baseline">
            <span className="oga-mon-spec__knob-label">baseline</span>
            {(["previous", "first"] as Baseline[]).map((b) => (
              <button
                key={b}
                type="button"
                role="tab"
                aria-selected={baseline === b}
                onClick={() => setBaseline(b)}
                className={`oga-mon-spec__knob-chip${baseline === b ? " oga-mon-spec__knob-chip--active" : ""}`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="oga-mon-spec__knob" role="tablist" aria-label="Threshold percent">
            <span className="oga-mon-spec__knob-label">threshold_pct</span>
            {([0, 5, 10] as Threshold[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={threshold === t}
                onClick={() => setThreshold(t)}
                className={`oga-mon-spec__knob-chip${threshold === t ? " oga-mon-spec__knob-chip--active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="oga-mon-spec__knob" role="tablist" aria-label="Minimum transactions">
            <span className="oga-mon-spec__knob-label">min_transactions</span>
            {([0, 8] as MinTx[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={minTx === m}
                onClick={() => setMinTx(m)}
                className={`oga-mon-spec__knob-chip${minTx === m ? " oga-mon-spec__knob-chip--active" : ""}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="oga-mon-spec__card">
          <span className="oga-mon-spec__tick oga-mon-spec__tick--tl" aria-hidden />
          <span className="oga-mon-spec__tick oga-mon-spec__tick--tr" aria-hidden />
          <span className="oga-mon-spec__tick oga-mon-spec__tick--bl" aria-hidden />
          <span className="oga-mon-spec__tick oga-mon-spec__tick--br" aria-hidden />

          <div className="oga-mon-spec__resp">
            <span className="oga-mon-spec__resp-method">
              <span className="oga-mon-spec__resp-method-verb">POST</span>
              /v1/portfolios/pf_demo_lender/changes
            </span>
            <button
              type="button"
              className="oga-mon-spec__resp-toggle"
              onClick={() => setView(view === "rendered" ? "json" : "rendered")}
              aria-pressed={view === "json"}
            >
              {view === "rendered" ? "View JSON" : "View rendered"}
            </button>
          </div>

          {view === "rendered" ? (
            <RenderedReport
              baseline={baseline}
              threshold={threshold}
              minTx={minTx}
              changes={filtered}
              candidates={candidates}
            />
          ) : (
            <JsonReport
              baseline={baseline}
              threshold={threshold}
              minTx={minTx}
              changes={filtered}
            />
          )}
        </div>

        <div className="oga-mon-spec__legend">
          <p className="oga-mon-spec__legend-title">Reading this view</p>
          <dl className="oga-mon-spec__legend-rows">
            <dt><code>baseline</code></dt>
            <dd>
              What <strong>period_from</strong> means. <strong>previous</strong>
              compares the latest period to the one before it (month over
              month); <strong>first</strong> compares the latest period to the
              oldest in the stored range (cumulative drift since you started
              watching).
            </dd>
            <dt><code>threshold_pct</code></dt>
            <dd>
              The absolute percent change a (area, signal) move must clear to
              count as material. Set it to 0 to see every move; set it to 10
              to filter out small drift.
            </dd>
            <dt><code>min_transactions</code></dt>
            <dd>
              Sample-size gate. Price moves only count when both periods had at
              least N transactions. Default 8. Set it to 0 to disable; you will
              see a 47% swing on 2 sales appear. Set it back to 8 and the
              honest engine drops that row.
            </dd>
            <dt>Static signals</dt>
            <dd>
              Deprivation and other static signals produce zero change rows by
              design. They have one observed period; there is nothing to diff.
            </dd>
          </dl>
        </div>

        <p className="oga-mon-spec__note">
          Demo portfolio with illustrative values. Real outputs vary per book,
          per refresh, per source release.
        </p>
      </div>
    </section>
  );
}

function RenderedReport({
  baseline,
  threshold,
  minTx,
  changes,
  candidates,
}: {
  baseline: Baseline;
  threshold: Threshold;
  minTx: MinTx;
  changes: typeof ALL_MOVES;
  candidates: typeof ALL_MOVES;
}) {
  return (
    <>
      <div className="oga-mon-spec__portfolio">
        <div className="oga-mon-spec__portfolio-head">
          <h3 className="oga-mon-spec__portfolio-name">Demo lender book</h3>
          <div className="oga-mon-spec__portfolio-meta">
            <span>
              <span className="oga-mon-spec__portfolio-meta-k">areas</span>{" "}
              <span className="oga-mon-spec__portfolio-meta-v">{DEMO_AREAS.length}</span>
            </span>
            <span>
              <span className="oga-mon-spec__portfolio-meta-k">checked</span>{" "}
              <span className="oga-mon-spec__portfolio-meta-v">{DEMO_AREAS.length}</span>
            </span>
            <span>
              <span className="oga-mon-spec__portfolio-meta-k">material</span>{" "}
              <span className="oga-mon-spec__portfolio-meta-v">{changes.length}</span>
            </span>
          </div>
        </div>
        <div className="oga-mon-spec__portfolio-areas">
          {DEMO_AREAS.map((a) => (
            <span key={a.postcode} className="oga-mon-spec__portfolio-area">
              {a.postcode} · {a.lsoa}
            </span>
          ))}
        </div>
      </div>

      <div className="oga-mon-spec__report-head">
        <p className="oga-mon-spec__report-title">Material changes</p>
        <div className="oga-mon-spec__report-counts">
          <span>
            <span className="oga-mon-spec__report-count-k">baseline</span>
            <span className="oga-mon-spec__report-count-v">{baseline}</span>
          </span>
          <span>
            <span className="oga-mon-spec__report-count-k">threshold</span>
            <span className="oga-mon-spec__report-count-v">{threshold}%</span>
          </span>
          <span>
            <span className="oga-mon-spec__report-count-k">min_tx</span>
            <span className="oga-mon-spec__report-count-v">{minTx}</span>
          </span>
        </div>
      </div>

      {changes.length > 0 ? (
        <div className="oga-mon-spec__changes">
          {changes.map((c, i) => (
            <div key={i} className="oga-mon-spec__change">
              <div className="oga-mon-spec__change-row1">
                <code className="oga-mon-spec__change-signal">{c.signal_key}</code>
                <span className="oga-mon-spec__change-area">
                  {c.area_label} · {c.geo_code}
                </span>
              </div>
              <div className="oga-mon-spec__change-periods">
                <span>{c.period_from}</span>
                <span className="oga-mon-spec__change-periods-arrow" aria-hidden>→</span>
                <span>{c.period_to}</span>
              </div>
              <div className="oga-mon-spec__change-values">
                <span>{c.value_from}</span>
                <span className="oga-mon-spec__change-periods-arrow" aria-hidden>→</span>
                <span>{c.value_to}</span>
              </div>
              <div className="oga-mon-spec__change-pct">
                <span
                  className={`oga-mon-spec__change-pct-arrow${
                    c.pct_change < 0 ? " oga-mon-spec__change-pct-arrow--down" : ""
                  }`}
                  aria-hidden
                >
                  {c.pct_change >= 0 ? "▲" : "▼"}
                </span>
                <span>
                  {c.pct_change >= 0 ? "+" : ""}
                  {c.pct_change.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="oga-mon-spec__empty">
          <p className="oga-mon-spec__empty-title">No material changes</p>
          <p className="oga-mon-spec__empty-body">
            Nothing crossed your {threshold}% threshold this run with min
            transactions of {minTx}. {candidates.length > changes.length
              ? `${candidates.length - changes.length} sub-threshold move${candidates.length - changes.length === 1 ? "" : "s"} were dropped silently. Lower the threshold to see them.`
              : "Try a different baseline or threshold."}
          </p>
        </div>
      )}

      {changes.length > 0 && (
        <div className="oga-mon-spec__webhook">
          <p className="oga-mon-spec__webhook-title">Webhook delivery (per material row)</p>
          <pre className="oga-mon-spec__webhook-headers">
{`POST  ${"https://api.example.com/oga/hook"}
X-OneGoodArea-Event:     signal.changed
X-OneGoodArea-Signature: t=1748736000,v1=<hmac-sha256-hex>
X-OneGoodArea-Delivery:  wd_a8s2k4m9q
Content-Type:            application/json
`}
            <em>
{`{ "event": "signal.changed", "data": { /* the SignalChange row above */ } }`}
            </em>
          </pre>
        </div>
      )}
    </>
  );
}

function JsonReport({
  baseline,
  threshold,
  minTx,
  changes,
}: {
  baseline: Baseline;
  threshold: Threshold;
  minTx: MinTx;
  changes: typeof ALL_MOVES;
}) {
  const json = {
    portfolio_id: "pf_demo_lender",
    baseline,
    threshold_pct: threshold,
    min_transactions: minTx,
    areas_checked: DEMO_AREAS.length,
    material_count: changes.length,
    changes: changes.map((c) => ({
      signal_key: c.signal_key,
      area: c.area_label,
      geo_code: c.geo_code,
      period_from: c.period_from,
      period_to: c.period_to,
      value_from: c.value_from,
      value_to: c.value_to,
      pct_change: c.pct_change,
      direction: c.pct_change > 0 ? "up" : c.pct_change < 0 ? "down" : "flat",
      material: true,
    })),
    generated_at: `2026-05-31T00:00:00.000Z`,
    engine_version: METHODOLOGY_VERSION,
  };
  return <pre className="oga-mon-spec__json">{JSON.stringify(json, null, 2)}</pre>;
}

/* ============================================================
   § 02 — What gets watched (cream) — signals Monitor diffs
   ============================================================ */

type WatchCard = {
  title: string;
  body: string;
  note: string;
  Viz: () => ReactElement;
};

const WATCHED: WatchCard[] = [
  {
    title: "Prices that actually move",
    body:
      "Median sale price month over month, plus YoY against the same window a year ago. The signal that drives most lender and PropTech alerts.",
    note: "Backed by 24+ months of monthly history per LSOA.",
    Viz: VizPriceMove,
  },
  {
    title: "Crime trend",
    body:
      "Trailing-12-month total per area plus monthly counts. Watch areas where crime is rising or improving against their own past.",
    note: "Police.uk bulk archive, monthly cadence.",
    Viz: VizCrimeTrend,
  },
  {
    title: "Derived YoY signals",
    body:
      "Built-in derived signals like property.price_change_pct_yoy compose over the time-series store. No client-side rollup needed.",
    note: "Computed in-DB, refreshed monthly.",
    Viz: VizDerivedYoy,
  },
];

function SectionWatched() {
  return (
    <section
      className="oga-section-quiet oga-mon-watch"
      aria-labelledby="mon-watch-title"
    >
      <div className="oga-mon__wrap">
        <header className="oga-mon-watch__head">
          <h2 id="mon-watch-title" className="oga-mon-watch__title">
            What Monitor actually watches.
          </h2>
          <p className="oga-mon-watch__sub">
            Monitor diffs the monthly time-series store. Signals that move
            over time fire alerts; static signals (deprivation, area type)
            never trigger because there is nothing to compare.
          </p>
        </header>

        <div className="oga-mon-watch__grid">
          {WATCHED.map((w) => {
            const Viz = w.Viz;
            return (
              <article key={w.title} className="oga-mon-watch-card">
                <div className="oga-mon-watch-card__viz" aria-hidden>
                  <Viz />
                </div>
                <h3 className="oga-mon-watch-card__title">{w.title}</h3>
                <p className="oga-mon-watch-card__body">{w.body}</p>
                <p className="oga-mon-watch-card__note">
                  <strong>How</strong> {w.note}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function VizPriceMove() {
  // line chart with two periods marked
  return (
    <svg viewBox="0 0 240 80" aria-hidden>
      <line x1="10" y1="68" x2="230" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <path
        d="M 10 50 L 30 52 L 50 48 L 70 46 L 90 42 L 110 44 L 130 40 L 150 36 L 170 30 L 190 28 L 210 22 L 230 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <g fill="currentColor">
        <circle cx="50" cy="48" r="3" opacity="0.55" />
        <circle cx="230" cy="18" r="4" />
      </g>
      <line x1="50" y1="48" x2="50" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="2 2" />
      <line x1="230" y1="18" x2="230" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="2 2" />
    </svg>
  );
}

function VizCrimeTrend() {
  // bars trending — alternating heights to show monthly counts
  return (
    <svg viewBox="0 0 240 80" aria-hidden>
      <line x1="10" y1="68" x2="230" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      {[
        [16, 36],
        [32, 28],
        [48, 32],
        [64, 24],
        [80, 30],
        [96, 22],
        [112, 26],
        [128, 18],
        [144, 22],
        [160, 14],
        [176, 18],
        [192, 12],
        [208, 16],
      ].map(([x, h], i) => (
        <line
          key={i}
          x1={x}
          y1={68 - h}
          x2={x}
          y2="68"
          stroke="currentColor"
          strokeWidth="3"
          opacity={0.4 + i * 0.045}
        />
      ))}
    </svg>
  );
}

function VizDerivedYoy() {
  // two parallel rolling-window arcs — latest vs prior
  return (
    <svg viewBox="0 0 240 80" aria-hidden>
      <line x1="10" y1="68" x2="230" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <path
        d="M 20 55 Q 80 45 140 38 T 220 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M 20 60 Q 80 56 140 50 T 220 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
        strokeDasharray="3 3"
      />
      <g fill="currentColor">
        <circle cx="220" cy="28" r="3.5" />
        <circle cx="220" cy="44" r="2.5" opacity="0.55" />
      </g>
      <line x1="220" y1="28" x2="220" y2="44" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/* ============================================================
   § 03 — Pipeline (DARK)
   ============================================================ */

function SectionPipeline() {
  return (
    <section
      className="oga-section-dark oga-mon-pipe"
      data-oga-surface="dark"
      aria-labelledby="mon-pipe-title"
    >
      <div className="oga-mon__wrap">
        <header className="oga-mon-pipe__head">
          <h2 id="mon-pipe-title" className="oga-mon-pipe__title">
            Save a book. Diff the time-series. Fire a signed webhook.
          </h2>
          <p className="oga-mon-pipe__sub">
            Four steps in a deterministic order. The diff core is pure code,
            unit-tested without a database. The webhook envelope is Stripe-
            style HMAC-SHA256 so receivers can verify authenticity.
          </p>
        </header>

        <div className="oga-mon-pipe__stage">
          <MonitorPipelineSvg />
        </div>

        <ul className="oga-mon-pipe__notes">
          <li className="oga-mon-pipe__note">
            <span className="oga-mon-pipe__note-num">Step 01</span>
            <h3 className="oga-mon-pipe__note-title">Save the book</h3>
            <p className="oga-mon-pipe__note-body">
              POST /v1/portfolios then /areas to add up to 200 areas per call,
              deduped on (portfolio_id, area). Areas can be postcodes or LSOA
              codes; the engine resolves both to LSOAs.
            </p>
          </li>
          <li className="oga-mon-pipe__note">
            <span className="oga-mon-pipe__note-num">Step 02</span>
            <h3 className="oga-mon-pipe__note-title">Bulk enrich</h3>
            <p className="oga-mon-pipe__note-body">
              /enrich runs the deterministic scoring engine over every tracked
              area. Synchronous, cap 50 per call, concurrency 5. Per-area
              failures captured, never fatal.
            </p>
          </li>
          <li className="oga-mon-pipe__note">
            <span className="oga-mon-pipe__note-num">Step 03</span>
            <h3 className="oga-mon-pipe__note-title">Detect material moves</h3>
            <p className="oga-mon-pipe__note-body">
              /changes diffs each (area, signal) series against the chosen
              baseline. Threshold filters small drift; min_transactions filters
              noisy low-volume price swings.
            </p>
          </li>
          <li className="oga-mon-pipe__note">
            <span className="oga-mon-pipe__note-num">Step 04</span>
            <h3 className="oga-mon-pipe__note-title">Signed webhook delivery</h3>
            <p className="oga-mon-pipe__note-body">
              Material rows fire signal.changed events to your registered
              HTTPS endpoint. HMAC-SHA256 over the raw body, secret returned
              once on subscription create. 5-second delivery timeout.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function MonitorPipelineSvg() {
  return (
    <svg
      className="oga-mon-pipe__svg"
      viewBox="0 0 1080 280"
      role="img"
      aria-label="Monitor pipeline: portfolio, enrich, detect, deliver"
    >
      <line x1="80" y1="140" x2="1000" y2="140" stroke="currentColor" strokeWidth="1" opacity="0.3" />

      {/* Step 01: portfolio (4 LSOA dots) */}
      <g transform="translate(50, 110)">
        <rect x="0" y="0" width="180" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="90" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 01 · PORTFOLIO</text>
        <g fill="currentColor">
          <circle cx="40" cy="42" r="3" />
          <circle cx="70" cy="42" r="3" />
          <circle cx="100" cy="42" r="3" />
          <circle cx="130" cy="42" r="3" />
        </g>
      </g>

      {/* Step 02: enrich box */}
      <g transform="translate(280, 110)">
        <rect x="0" y="0" width="180" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="90" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 02 · ENRICH</text>
        <text x="90" y="46" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">cap 50 · concurrency 5</text>
      </g>

      {/* Connector */}
      <line x1="230" y1="140" x2="280" y2="140" stroke="currentColor" strokeWidth="1" />
      <line x1="460" y1="140" x2="510" y2="140" stroke="currentColor" strokeWidth="1" />

      {/* Step 03: detect — accented (the core) */}
      <g transform="translate(510, 90)">
        <rect x="0" y="0" width="240" height="100" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <text x="120" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 03 · DETECT MOVES</text>
        <text x="120" y="48" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="14"
              fill="currentColor">diff time-series</text>
        <text x="120" y="72" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.65" letterSpacing="2">THRESHOLD + SAMPLE GATE</text>
      </g>

      {/* signal_timeseries source dropping in from below */}
      <g transform="translate(560, 210)">
        <rect x="0" y="0" width="140" height="40" rx="3" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <text x="70" y="16" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="9.5"
              fill="currentColor" opacity="0.55" letterSpacing="2">STORE</text>
        <text x="70" y="32" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="12"
              fill="currentColor">signal_timeseries</text>
      </g>
      <line x1="630" y1="190" x2="630" y2="210" stroke="currentColor" strokeWidth="1" opacity="0.55" strokeDasharray="3 3" />

      {/* Step 04: deliver */}
      <g transform="translate(800, 110)">
        <rect x="0" y="0" width="220" height="60" rx="3" fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="110" y="22" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.55" letterSpacing="2">STEP 04 · WEBHOOK</text>
        <text x="110" y="46" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">HMAC-SHA256 signed</text>
      </g>
      <line x1="750" y1="140" x2="800" y2="140" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/* ============================================================
   § 04 — Endpoints (cream) — tabbed panel
   ============================================================ */

type Param = { name: string; type: string; required: boolean; desc: string };
type Endpoint = {
  method: "POST" | "GET" | "DELETE";
  path: string;
  what: string;
  params: Param[];
  response: string;
  codes: { code: string; meaning: string }[];
};

const EPS: Endpoint[] = [
  {
    method: "POST",
    path: "/v1/portfolios",
    what:
      "Create a new portfolio (an empty book). Pair with POST /:id/areas to populate it. Portfolios are scoped to the api-key's user_id today; org-scoping ships with the Levers re-scope.",
    params: [
      { name: "name", type: "string", required: true, desc: "Portfolio name, trimmed, max 200 chars." },
    ],
    response: "201 Portfolio: { id: 'pf_...', name, area_count: 0 }.",
    codes: [
      { code: "201", meaning: "Created." },
      { code: "400", meaning: "Missing or oversized name." },
      { code: "401", meaning: "Missing or invalid Bearer oga_… API key." },
      { code: "404", meaning: "Signals API dark flag off." },
    ],
  },
  {
    method: "POST",
    path: "/v1/portfolios/:id/areas",
    what:
      "Add areas to a portfolio. Deduped on (portfolio_id, area) so re-adding is a no-op. Capped at 200 areas per call. Areas can be postcodes or LSOA codes.",
    params: [
      { name: "areas", type: "Array<{area, label?}>", required: true, desc: "1..200 entries. area is a non-empty string (postcode, place, or LSOA code); label is optional." },
    ],
    response: "200 { added: number }. Duplicates are silently skipped via ON CONFLICT DO NOTHING.",
    codes: [
      { code: "200", meaning: "Added (added may be less than submitted if dedup)." },
      { code: "400", meaning: "Empty or oversized array, or item missing area string." },
      { code: "404", meaning: "Portfolio not owned or does not exist." },
    ],
  },
  {
    method: "POST",
    path: "/v1/portfolios/:id/enrich",
    what:
      "Bulk-score every tracked area through the deterministic engine. Synchronous, cap 50 per call, in-flight concurrency 5. Per-area failures captured in the response, never fatal. NOT metered against the monthly report quota.",
    params: [
      { name: "preset", type: "enum", required: false, desc: "Scoring profile. Defaults to research baseline. Same four enum values as /v1/score." },
    ],
    response: "200 { count, results: [{ area, label, score, error }] }. X-Engine-Version response header.",
    codes: [
      { code: "200", meaning: "Enriched. Per-row .error captures per-area failures." },
      { code: "400", meaning: "Invalid preset." },
      { code: "404", meaning: "Portfolio not owned or does not exist." },
    ],
  },
  {
    method: "POST",
    path: "/v1/portfolios/:id/changes",
    what:
      "Detect material moves across each tracked area's stored time-series. On demand; there is no scheduled cron today. Material rows fire signal.changed webhooks if you have a subscription registered. Static signals produce no rows by design.",
    params: [
      { name: "baseline", type: "'previous' | 'first'", required: false, desc: "What period_from means. 'previous' = latest vs prior period (month over month). 'first' = latest vs oldest in the stored range. Default previous." },
      { name: "threshold_pct", type: "number ≥ 0", required: false, desc: "Absolute percent change required to be material. Default 5." },
      { name: "min_transactions", type: "number ≥ 0", required: false, desc: "Sample-size gate for price moves. Both periods must have at least N transactions. Default 8. Set 0 to disable." },
      { name: "emit", type: "boolean", required: false, desc: "Fire signal.changed webhooks for material changes. Default true." },
    ],
    response: "200 ChangeReport: { portfolio_id, baseline, threshold_pct, min_transactions, areas_checked, material_count, changes: SignalChange[], generated_at }. Material rows only.",
    codes: [
      { code: "200", meaning: "Report generated (material_count may be 0; that is also signal)." },
      { code: "400", meaning: "Invalid baseline, threshold_pct, or min_transactions." },
      { code: "404", meaning: "Portfolio not owned or does not exist." },
    ],
  },
  {
    method: "POST",
    path: "/v1/webhooks",
    what:
      "Register a webhook subscription for the event catalog. Returns the signing secret ONCE on creation. The catalog is exactly 3 events: report.created, score.changed, signal.changed. Today Monitor only fires signal.changed.",
    params: [
      { name: "url", type: "string", required: true, desc: "Public HTTPS endpoint. Rejected: http, localhost, 127.0.0.1, RFC 1918 ranges, link-local." },
      { name: "events", type: "string[]", required: true, desc: "Non-empty subset of ['report.created', 'score.changed', 'signal.changed']. Unknown event types are silently filtered." },
    ],
    response: "201 WebhookSubscription: { id, url, events, secret: 'whsec_...', created_at }. Save the secret; it is never returned again.",
    codes: [
      { code: "201", meaning: "Created." },
      { code: "400", meaning: "Bad URL or no supported events in the list." },
      { code: "401", meaning: "Missing or invalid API key." },
    ],
  },
];

function SectionEndpoints() {
  const [idx, setIdx] = useState(0);
  const ep = EPS[idx];
  return (
    <section
      className="oga-section-hero oga-mon-ep"
      aria-labelledby="mon-ep-title"
    >
      <div className="oga-mon__wrap">
        <header className="oga-mon-ep__head">
          <h2 id="mon-ep-title" className="oga-mon-ep__title">
            Five endpoints. One signed event catalog.
          </h2>
          <p className="oga-mon-ep__sub">
            Portfolios CRUD plus enrich plus change detection plus webhook
            subscriptions. Plain JSON over HTTPS, Bearer-token auth with the
            oga_ prefix, all paths under /v1/.
          </p>
        </header>

        <div className="oga-mon-ep__panel">
          <div className="oga-mon-ep__tabs" role="tablist" aria-label="Endpoint">
            {EPS.map((e, i) => (
              <button
                key={e.path}
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => setIdx(i)}
                className={`oga-mon-ep__tab${i === idx ? " oga-mon-ep__tab--active" : ""}`}
              >
                <span className="oga-mon-ep__tab-verb">{e.method}</span>
                <span className="oga-mon-ep__tab-path">{e.path}</span>
              </button>
            ))}
          </div>

          <div className="oga-mon-ep__body">
            <p className="oga-mon-ep__what">{ep.what}</p>

            <div className="oga-mon-ep__grid">
              <div>
                <h4 className="oga-mon-ep__col-title">Parameters</h4>
                <ul className="oga-mon-ep__params">
                  {ep.params.map((p) => (
                    <li key={p.name}>
                      <div className="oga-mon-ep__params-head">
                        <code className="oga-mon-ep__params-name">{p.name}</code>
                        <span className="oga-mon-ep__params-type">{p.type}</span>
                        {p.required && <span className="oga-mon-ep__params-req">Required</span>}
                      </div>
                      <p className="oga-mon-ep__params-desc">{p.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="oga-mon-ep__col-title">Response</h4>
                <p className="oga-mon-ep__response">{ep.response}</p>
                <h4 className="oga-mon-ep__col-title">Status codes</h4>
                <dl className="oga-mon-ep__codes">
                  {ep.codes.map((c) => (
                    <CodeRow key={c.code} code={c.code} meaning={c.meaning} />
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeRow({ code, meaning }: { code: string; meaning: string }) {
  return (
    <>
      <dt>{code}</dt>
      <dd>{meaning}</dd>
    </>
  );
}

/* ============================================================
   § 05 — Built for (cream) — 5 ICPs, InsureTech leads
   ============================================================ */

type Icp = {
  name: string;
  Viz: () => ReactElement;
  problem: string;
  why: string;
  value: string;
  sales: string;
};

const ICPS: Icp[] = [
  {
    name: "Insurance and InsureTech",
    Viz: VizInsurer,
    problem:
      "An insurer's book of insured locations drifts continuously. Median prices move; deprivation context shifts neighbourhood by neighbourhood; crime patterns rebalance. Pricing teams need to know when the assumed risk profile of a tracked LSOA has actually changed, not at renewal but ongoing, and they need the alert to be auditable.",
    why:
      "Save the insured-location book as a portfolio. Enrich on intake. Run change detection on a cadence. Material moves arrive as signed signal.changed webhooks with the exact signal_key, periods, raw values, and percent change. Sample-size gating is exactly the de-noising an actuarial team needs.",
    value:
      "Exposure drift detected continuously, not at renewal. Every alert is auditable: raw values, periods, threshold, sample gate all in the same envelope. HMAC-SHA256 signing means it is fit for automated pricing or referral workflows.",
    sales:
      "Sign your insured-location book up as a portfolio. Get HMAC-signed alerts the day a tracked LSOA's risk signal materially moves.",
  },
  {
    name: "Lenders",
    Viz: VizLender,
    problem:
      "A residential or commercial lender's book is geographically concentrated. The questions are where location-risk has drifted and which LSOAs have moved enough to retrigger LTV stress. Manual re-screening at portfolio scale is impossible; spreadsheet-based reviews lag actual moves by quarters.",
    why:
      "Store the book once, bulk-enrich on intake (sync up to 50, concurrency 5), then run change detection ad hoc or on a schedule. baseline=first surfaces cumulative drift since onboarding; baseline=previous surfaces month-over-month moves. Both report exact value_from, value_to, pct_change per tracked LSOA-signal pair.",
    value:
      "Risk teams can prove 'we knew on date X' for every material move. period_from, period_to, threshold and sample gate are in the response and on the signed webhook. The full loop is one HTTP surface behind one API key.",
    sales:
      "Track location-risk drift across the lending book with sample-size-gated change alerts that you can audit row-by-row.",
  },
  {
    name: "PropTech",
    Viz: VizPropTech,
    problem:
      "PropTech platforms surface portfolio dashboards, alerts and what-changed-this-month digests to landlords, agents and asset managers. They have the UI; they do not have a deterministic, signed source of area-level change to ship to customers without owning a data team.",
    why:
      "Attach a portfolio to each customer's book and call /v1/portfolios/:id/changes on a cadence. The output is shaped for UI: one row per (area, signal) with period_from/to, value_from/to, pct_change, direction, material. Feed it into a movers panel. Webhooks turn it into push notifications.",
    value:
      "Ship a portfolio-intelligence feature on top of OneGoodArea instead of building one. Customers get area-level signal moves with stamped engine_version and lineage, not vibes. Sample-size gating means they do not embarrass themselves with a 47% move on 2 sales.",
    sales:
      "Attach a OneGoodArea portfolio to every customer book, ship a movers feed without a data team.",
  },
  {
    name: "CRE and site selection",
    Viz: VizCre,
    problem:
      "A site-selection or CRE team carries a watchlist of candidate locations: shortlisted development sites, tenant catchments, comparable hold areas. They want to know when a watched area's price or trend signal has moved enough to revisit the underwriting, without re-running ad-hoc reports every week.",
    why:
      "A watchlist is a portfolio. Candidates are areas. /v1/portfolios/:id/changes with baseline=first tells you which watched LSOAs have moved since you started watching. Threshold_pct tunes what material means for their underwriting hurdle.",
    value:
      "The team stops re-running area reports manually. Material moves arrive as a list or webhook, with exact pct_change and from/to periods needed to retrigger an underwriting review. Static signals correctly do nothing; only signals that actually move trigger.",
    sales:
      "Your watchlist as a portfolio. Tunable change-detection tells you which sites have moved enough to revisit.",
  },
  {
    name: "Public sector",
    Viz: VizPublic,
    problem:
      "Local authority and central-gov analytical teams hold lists of priority LSOAs (regen targets, levelling-up wards, intervention catchments) and need a defensible, lineage-stamped record of how their tracked areas have moved over time. The honest answer is often that sample size is too small; the system needs to say so, not hallucinate a move.",
    why:
      "Monitor is honest by construction. A single-period signal (deprivation) produces no change row. A price move on 2 sales is filtered by min_transactions=8. The ChangeReport carries baseline, threshold_pct, and min_transactions, so a published 'areas that moved' note has the methodology stamped inside the artifact.",
    value:
      "A reproducible, lineage-stamped record of which tracked areas moved between two periods, with gating decisions visible in the artifact. The diff core is documented in the ADR trail and unit-tested.",
    sales:
      "Track priority LSOAs as a portfolio. Get a lineage-stamped change report with honest sample-size gating built in.",
  },
];

function SectionIcps() {
  return (
    <section
      className="oga-section-quiet oga-mon-icps"
      aria-labelledby="mon-icps-title"
    >
      <div className="oga-mon__wrap">
        <header className="oga-mon-icps__head">
          <h2 id="mon-icps-title" className="oga-mon-icps__title">
            One book. Five buyer workflows.
          </h2>
          <p className="oga-mon-icps__sub">
            Same portfolio. Same change-detection mechanics. Different
            questions each buyer is trying to answer with the alert.
          </p>
        </header>

        <div className="oga-mon-icps__list">
          {ICPS.map((i) => {
            const Viz = i.Viz;
            return (
              <article key={i.name} className="oga-mon-icp">
                <div className="oga-mon-icp__viz" aria-hidden>
                  <Viz />
                </div>
                <div className="oga-mon-icp__body">
                  <h3 className="oga-mon-icp__name">{i.name}</h3>
                  <div>
                    <p className="oga-mon-icp__row-label">The problem</p>
                    <p className="oga-mon-icp__row-text">{i.problem}</p>
                  </div>
                  <div>
                    <p className="oga-mon-icp__row-label">Why Monitor</p>
                    <p className="oga-mon-icp__row-text">{i.why}</p>
                  </div>
                  <div>
                    <p className="oga-mon-icp__row-label">Their value</p>
                    <p className="oga-mon-icp__row-text">{i.value}</p>
                  </div>
                  <p className="oga-mon-icp__sales">{i.sales}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ICP micro-illustrations — Monitor-specific. */

function VizInsurer() {
  // book of locations with one pulsing focal — exposure drift
  return (
    <svg className="oga-mon-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <rect x="14" y="14" width="92" height="92" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <g fill="currentColor">
        {/* portfolio grid */}
        <circle cx="32" cy="32" r="2.6" />
        <circle cx="50" cy="32" r="2.6" />
        <circle cx="68" cy="32" r="2.6" />
        <circle cx="86" cy="32" r="2.6" />
        <circle cx="32" cy="50" r="2.6" />
        <circle cx="50" cy="50" r="2.6" />
        <circle cx="68" cy="50" r="5" />
        <circle cx="86" cy="50" r="2.6" />
        <circle cx="32" cy="68" r="2.6" />
        <circle cx="50" cy="68" r="2.6" />
        <circle cx="68" cy="68" r="2.6" />
        <circle cx="86" cy="68" r="2.6" />
        <circle cx="32" cy="86" r="2.6" />
        <circle cx="50" cy="86" r="2.6" />
        <circle cx="68" cy="86" r="2.6" />
        <circle cx="86" cy="86" r="2.6" />
      </g>
      {/* halo around the focal — change pulse */}
      <circle cx="68" cy="50" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

function VizLender() {
  // book scattered across loan-to-value axis; one point drifted up
  return (
    <svg className="oga-mon-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="100" x2="14" y2="20" stroke="currentColor" strokeWidth="1" />
      <g fill="currentColor">
        <circle cx="28" cy="72" r="2" />
        <circle cx="38" cy="68" r="2" />
        <circle cx="48" cy="74" r="2" />
        <circle cx="58" cy="64" r="2" />
        <circle cx="68" cy="70" r="2" />
        <circle cx="78" cy="58" r="2" />
        <circle cx="88" cy="62" r="2" />
        <circle cx="98" cy="44" r="3.5" />
      </g>
      {/* drift arrow */}
      <line x1="98" y1="62" x2="98" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <path d="M 95 50 L 98 44 L 101 50" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function VizPropTech() {
  // dashboard card with mover row + arrow
  return (
    <svg className="oga-mon-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <rect x="14" y="22" width="92" height="76" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="40" x2="106" y2="40" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <g fill="currentColor">
        <circle cx="24" cy="56" r="2" />
        <line x1="32" y1="56" x2="76" y2="56" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="86" cy="56" r="2.5" />
      </g>
      <g fill="currentColor">
        <circle cx="24" cy="72" r="2" />
        <line x1="32" y1="72" x2="68" y2="72" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="78" cy="72" r="2.5" />
      </g>
      <g fill="currentColor">
        <circle cx="24" cy="88" r="2" />
        <line x1="32" y1="88" x2="80" y2="88" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <circle cx="90" cy="88" r="2.5" />
      </g>
      {/* mover arrow */}
      <path d="M 96 56 l 4 -4 l 4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function VizCre() {
  // watchlist with one star
  return (
    <svg className="oga-mon-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="currentColor">
        <circle cx="22" cy="28" r="2.5" />
        <line x1="32" y1="28" x2="98" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <circle cx="22" cy="48" r="2.5" />
        <line x1="32" y1="48" x2="84" y2="48" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <circle cx="22" cy="68" r="2.5" />
        <line x1="32" y1="68" x2="90" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <circle cx="22" cy="88" r="2.5" />
        <line x1="32" y1="88" x2="74" y2="88" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        {/* mover row */}
        <circle cx="22" cy="48" r="4" />
        <circle cx="92" cy="48" r="3" />
      </g>
      <line x1="86" y1="48" x2="92" y2="42" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function VizPublic() {
  // grid of tracked LSOAs with two highlighted as movers
  return (
    <svg className="oga-mon-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="currentColor">
        {Array.from({ length: 6 }).map((_, c) =>
          Array.from({ length: 6 }).map((_, r) => {
            const focal = (c === 1 && r === 2) || (c === 4 && r === 4);
            return (
              <circle
                key={`${c}-${r}`}
                cx={18 + c * 17}
                cy={18 + r * 17}
                r={focal ? 4 : 1.6}
                opacity={focal ? 1 : 0.4}
              />
            );
          })
        )}
      </g>
      <line x1="35" y1="52" x2="86" y2="86" stroke="currentColor" strokeWidth="1" opacity="0.45" strokeDasharray="3 3" />
    </svg>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

function FinalCta() {
  return (
    <section
      className="oga-section-dark oga-mon-cta"
      data-oga-surface="dark"
      aria-labelledby="mon-cta-title"
    >
      <div className="oga-mon__wrap--narrow">
        <h2 id="mon-cta-title" className="oga-mon-cta__h2">
          Monitor your book of UK areas. Sample-size honest by default.
        </h2>
        <p className="oga-mon-cta__lead">
          Save areas, bulk-enrich, run change detection, get signed webhooks
          when something material shifts. The diff core is unit-tested, the
          envelope is HMAC-SHA256 signed, and a 47% swing on 2 sales never
          earns an alert.
        </p>
        <div className="oga-mon-cta__ctas">
          <Link href="/sign-up" className="oga-btn oga-btn-primary">
            Get an API key
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
          </Link>
        </div>
      </div>
    </section>
  );
}
