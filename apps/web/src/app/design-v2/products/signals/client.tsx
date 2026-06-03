"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { SignalsIcon } from "../../_shared/product-icons";
import { ProductHero } from "../../_shared/product-hero";
import { ProductEndpointPanel } from "../../_shared/product-endpoint-panel";
import { ProductFinalCta } from "../../_shared/product-final-cta";
import { ProductIcpGrid } from "../../_shared/product-icp-grid";
import {
  METHODOLOGY_VERSION,
  getCurrentMethodology,
} from "@/lib/methodology-versions";
import "./signals.css";

/* /products/signals — AR-204 product page #1 — REWRITE v2.

   Rewrite after Pedro's "too templated" feedback. New shape:
     Hero               cream — centred, big icon, no side-card
     § 01 Live specimen DARK  — prebaked AreaProfile visualised as
                                a real product surface (geo rail +
                                signal rows w/ percentile bars +
                                meta footer + JSON toggle)
     § 02 Anatomy       cream — single bespoke SVG diagram, one
                                Signal exploded w/ hairlines
     § 03 Categories    DARK  — 7-category constellation (SVG) +
                                annotated list below
     § 04 Endpoints     cream — single tabbed specimen panel for
                                3 endpoints (not 3 stacked cards)
     § 05 Built for     cream — 5 ICPs in EQUAL treatment, each
                                with a bespoke dot-and-hairline
                                micro-illustration
     CTA                DARK

   Source of truth: docs/DESIGN/AR-204-product-pages-spec-pack.md §1.
   No fake links; no aiq_; no em dashes; zero inline styles. */

const current = getCurrentMethodology();

/* ============================================================
   Prebaked specimens — realistic AreaProfile-shaped data per
   curated postcode. Values are illustrative (the page is up-front
   that this is a "sample response"); shape matches contract.
   ============================================================ */

type PercentileSignal = {
  key: string;
  label: string;
  value: string;
  unit: string;
  percentile: number;
  direction: "higher_is_better" | "lower_is_better" | "neutral";
  confidence: "high" | "med" | "low";
  source: string;
};

type Specimen = {
  postcode: string;
  geo: { lsoa: string; admin_district: string; region: string; country: string };
  area_type: "urban" | "suburban" | "rural";
  signals: PercentileSignal[];
  fetch_mode: "hybrid" | "live" | "store";
  observed_period: string;
};

const SPECIMENS: Specimen[] = [
  {
    postcode: "M1 1AE",
    geo: {
      lsoa: "E01005207",
      admin_district: "Manchester",
      region: "North West",
      country: "England",
    },
    area_type: "urban",
    signals: [
      { key: "deprivation.imd_decile", label: "IMD decile", value: "1", unit: "decile", percentile: 5.4, direction: "higher_is_better", confidence: "high", source: "IMD 2025" },
      { key: "crime.total_12m", label: "Recorded crimes (12mo)", value: "3,712", unit: "count", percentile: 92.1, direction: "lower_is_better", confidence: "high", source: "police.uk" },
      { key: "property.median_price", label: "Median sale price", value: "£182,500", unit: "GBP", percentile: 18.2, direction: "neutral", confidence: "med", source: "HM Land Registry" },
      { key: "property.price_change_pct_yoy", label: "Price change YoY", value: "+4.1%", unit: "pct", percentile: 71.5, direction: "higher_is_better", confidence: "high", source: "derived" },
      { key: "transport.station_count", label: "Stations within 1km", value: "5", unit: "count", percentile: 96.8, direction: "higher_is_better", confidence: "high", source: "OSM" },
    ],
    fetch_mode: "hybrid",
    observed_period: "Apr 2025 to Mar 2026",
  },
  {
    postcode: "EC1A 1BB",
    geo: {
      lsoa: "E01000916",
      admin_district: "City of London",
      region: "London",
      country: "England",
    },
    area_type: "urban",
    signals: [
      { key: "deprivation.imd_decile", label: "IMD decile", value: "8", unit: "decile", percentile: 78.4, direction: "higher_is_better", confidence: "high", source: "IMD 2025" },
      { key: "crime.total_12m", label: "Recorded crimes (12mo)", value: "8,940", unit: "count", percentile: 98.6, direction: "lower_is_better", confidence: "high", source: "police.uk" },
      { key: "property.median_price", label: "Median sale price", value: "£885,000", unit: "GBP", percentile: 96.4, direction: "neutral", confidence: "high", source: "HM Land Registry" },
      { key: "property.price_change_pct_yoy", label: "Price change YoY", value: "-1.8%", unit: "pct", percentile: 22.1, direction: "higher_is_better", confidence: "med", source: "derived" },
      { key: "transport.station_count", label: "Stations within 1km", value: "7", unit: "count", percentile: 99.2, direction: "higher_is_better", confidence: "high", source: "OSM" },
    ],
    fetch_mode: "hybrid",
    observed_period: "Apr 2025 to Mar 2026",
  },
  {
    postcode: "B1 1AA",
    geo: {
      lsoa: "E01033620",
      admin_district: "Birmingham",
      region: "West Midlands",
      country: "England",
    },
    area_type: "urban",
    signals: [
      { key: "deprivation.imd_decile", label: "IMD decile", value: "2", unit: "decile", percentile: 12.0, direction: "higher_is_better", confidence: "high", source: "IMD 2025" },
      { key: "crime.total_12m", label: "Recorded crimes (12mo)", value: "4,108", unit: "count", percentile: 89.3, direction: "lower_is_better", confidence: "high", source: "police.uk" },
      { key: "property.median_price", label: "Median sale price", value: "£165,000", unit: "GBP", percentile: 14.6, direction: "neutral", confidence: "high", source: "HM Land Registry" },
      { key: "property.price_change_pct_yoy", label: "Price change YoY", value: "+6.8%", unit: "pct", percentile: 84.2, direction: "higher_is_better", confidence: "high", source: "derived" },
      { key: "transport.station_count", label: "Stations within 1km", value: "3", unit: "count", percentile: 88.7, direction: "higher_is_better", confidence: "high", source: "OSM" },
    ],
    fetch_mode: "hybrid",
    observed_period: "Apr 2025 to Mar 2026",
  },
  {
    postcode: "EH1 1YZ",
    geo: {
      lsoa: "S01008677",
      admin_district: "Edinburgh",
      region: "Scotland",
      country: "Scotland",
    },
    area_type: "urban",
    signals: [
      { key: "deprivation.simd_decile", label: "SIMD decile", value: "6", unit: "decile", percentile: 58.1, direction: "higher_is_better", confidence: "high", source: "SIMD 2020" },
      { key: "crime.total_12m", label: "Recorded crimes (12mo)", value: "2,205", unit: "count", percentile: 81.3, direction: "lower_is_better", confidence: "high", source: "police.uk" },
      { key: "property.median_price", label: "Median sale price", value: "Falls back to live", unit: "", percentile: 0, direction: "neutral", confidence: "low", source: "live (no store row)" },
      { key: "property.price_change_pct_yoy", label: "Price change YoY", value: "Falls back to live", unit: "", percentile: 0, direction: "higher_is_better", confidence: "low", source: "live (no store row)" },
      { key: "transport.station_count", label: "Stations within 1km", value: "2", unit: "count", percentile: 84.5, direction: "higher_is_better", confidence: "high", source: "OSM" },
    ],
    fetch_mode: "hybrid",
    observed_period: "Apr 2025 to Mar 2026",
  },
  {
    postcode: "CF10 1EP",
    geo: {
      lsoa: "W01001758",
      admin_district: "Cardiff",
      region: "Wales",
      country: "Wales",
    },
    area_type: "urban",
    signals: [
      { key: "deprivation.wimd_decile", label: "WIMD decile", value: "4", unit: "decile", percentile: 38.7, direction: "higher_is_better", confidence: "high", source: "WIMD 2019" },
      { key: "crime.total_12m", label: "Recorded crimes (12mo)", value: "2,856", unit: "count", percentile: 86.4, direction: "lower_is_better", confidence: "high", source: "police.uk" },
      { key: "property.median_price", label: "Median sale price", value: "£212,000", unit: "GBP", percentile: 32.5, direction: "neutral", confidence: "med", source: "HM Land Registry" },
      { key: "property.price_change_pct_yoy", label: "Price change YoY", value: "+2.4%", unit: "pct", percentile: 56.8, direction: "higher_is_better", confidence: "med", source: "derived" },
      { key: "transport.station_count", label: "Stations within 1km", value: "2", unit: "count", percentile: 84.5, direction: "higher_is_better", confidence: "high", source: "OSM" },
    ],
    fetch_mode: "hybrid",
    observed_period: "Apr 2025 to Mar 2026",
  },
];

export default function ProductSignalsClient() {
  return (
    <div className="oga-root oga-sig">
      <Nav />
      <ProductHero
        Icon={SignalsIcon}
        h1="Signals: the typed UK area-data layer."
        lead="One typed primitive over seven categories of public-record data, resolved to LSOA grain across England, Wales and Scotland. Value, normalised position, national-within-country percentile, per-signal confidence and source attribution on every response. Provenance is on the wire, not in a follow-up email."
        primaryHref="/sign-up"
        primaryLabel="Get an API key"
        secondaryHref="/methodology"
        secondaryLabel="Read the methodology"
      />
      <SectionSpecimen />
      <SectionAnatomy />
      <SectionCategories />
      <ProductEndpointPanel
        titleId="sig-ep-title"
        title="Three endpoints. One contract. No SDK required."
        sub="Plain JSON over HTTPS, Bearer-token auth with the oga_ prefix, all paths under /v1/. Single-signal ranking lives here; multi-signal compound filtering lives one product up under Intelligence."
        endpoints={EPS}
      />
      <ProductIcpGrid
        titleId="sig-icps-title"
        title="Same primitive. Five different workflows."
        sub="Each buyer reaches for Signals from a different angle. The data layer underneath is the same."
        whyLabel="Why Signals"
        icps={ICPS}
      />
      <ProductFinalCta
        titleId="sig-cta-title"
        title="Build on the typed UK area-data layer."
        lead="One endpoint resolves any UK postcode to the seven-category Signal catalog at LSOA grain. Provenance on the wire, methodology version stamped on every response, percentiles country-scoped by design."
        primaryHref="/sign-up"
        primaryLabel="Get an API key"
        secondaryHref="/methodology"
        secondaryLabel="Read the methodology"
      />
      <Footer />
    </div>
  );
}

/* ============================================================
   § 01 — Live specimen (DARK) — prebaked AreaProfile per postcode
   ============================================================ */

function SectionSpecimen() {
  const [idx, setIdx] = useState(0);
  const [view, setView] = useState<"rendered" | "json">("rendered");
  const s = SPECIMENS[idx];

  return (
    <section
      className="oga-section-dark oga-sig-spec"
      data-oga-surface="dark"
      aria-labelledby="sig-spec-title"
    >
      <div className="oga-sig__wrap">
        <header className="oga-sig-spec__head">
          <div className="oga-sig-spec__eyebrow">
            <span className="oga-sig-spec__eyebrow-mark" aria-hidden />
            <span>Sample response</span>
            <span className="oga-sig-spec__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="sig-spec-title" className="oga-sig-spec__title">
            See it before you write a line of code.
          </h2>
          <p className="oga-sig-spec__sub">
            Pick a postcode. We render the AreaProfile the same way the API
            returns it. Same shape, same fields, same provenance footer.
          </p>
        </header>

        <div className="oga-sig-spec__chips" role="tablist" aria-label="Sample postcode">
          {SPECIMENS.map((sp, i) => (
            <button
              key={sp.postcode}
              type="button"
              role="tab"
              aria-selected={i === idx}
              onClick={() => setIdx(i)}
              className={`oga-sig-spec__chip${i === idx ? " oga-sig-spec__chip--active" : ""}`}
            >
              {sp.postcode}
            </button>
          ))}
        </div>

        <div className="oga-sig-spec__card">
          <span className="oga-sig-spec__tick oga-sig-spec__tick--tl" aria-hidden />
          <span className="oga-sig-spec__tick oga-sig-spec__tick--tr" aria-hidden />
          <span className="oga-sig-spec__tick oga-sig-spec__tick--bl" aria-hidden />
          <span className="oga-sig-spec__tick oga-sig-spec__tick--br" aria-hidden />

          <div className="oga-sig-spec__resp">
            <span className="oga-sig-spec__resp-method">
              <span className="oga-sig-spec__resp-method-verb oga-verb oga-verb--get">GET</span>
              /v1/area?postcode={encodeURIComponent(s.postcode)}
            </span>
            <button
              type="button"
              className="oga-sig-spec__resp-toggle"
              onClick={() => setView(view === "rendered" ? "json" : "rendered")}
              aria-pressed={view === "json"}
            >
              {view === "rendered" ? "View JSON" : "View rendered"}
            </button>
          </div>

          {view === "rendered" ? <RenderedSpecimen s={s} /> : <JsonSpecimen s={s} />}
        </div>

        <div className="oga-sig-spec__legend">
          <p className="oga-sig-spec__legend-title">Reading this view</p>
          <dl className="oga-sig-spec__legend-rows">
            <dt><code>fetch_mode</code></dt>
            <dd>
              How each signal reached the wire. <strong>store</strong> means
              served from our persisted Postgres layer with a percentile and a
              normalised position. <strong>live</strong> means fetched from the
              upstream source on this request. <strong>hybrid</strong> means
              both happened in one response, which is the common case.
            </dd>
            <dt>Falls back to live</dt>
            <dd>
              Rows marked this way have no persisted row for this LSOA, so the
              service falls back to a live fetch from the upstream source. The
              Scotland postcode above is the classic case: HM Land Registry
              covers England and Wales only, so Scotland LSOAs have no
              store-backed property values today.
            </dd>
          </dl>
        </div>

        <p className="oga-sig-spec__note">
          Sample shape and realistic values. Signal counts and percentiles vary
          per release of the underlying sources.
        </p>
      </div>
    </section>
  );
}

function RenderedSpecimen({ s }: { s: Specimen }) {
  return (
    <>
      <div className="oga-sig-spec__geo">
        <span className="oga-sig-spec__geo-step">
          <span className="oga-sig-spec__geo-step-k">Postcode</span>
          <span>{s.postcode}</span>
        </span>
        <span className="oga-sig-spec__geo-arrow" aria-hidden>→</span>
        <span className="oga-sig-spec__geo-step">
          <span className="oga-sig-spec__geo-step-k">LSOA</span>
          <span>{s.geo.lsoa}</span>
        </span>
        <span className="oga-sig-spec__geo-arrow" aria-hidden>→</span>
        <span className="oga-sig-spec__geo-step">
          <span className="oga-sig-spec__geo-step-k">District</span>
          <span>{s.geo.admin_district}</span>
        </span>
        <span className="oga-sig-spec__geo-arrow" aria-hidden>→</span>
        <span className="oga-sig-spec__geo-step">
          <span className="oga-sig-spec__geo-step-k">Country</span>
          <span>{s.geo.country}</span>
        </span>
        <span className="oga-sig-spec__geo-area-type">{s.area_type}</span>
      </div>

      <div className="oga-sig-spec__rows">
        {s.signals.map((sig) => {
          const isFallback = sig.value === "Falls back to live";
          return (
            <div
              key={sig.key}
              className={`oga-sig-spec__row${isFallback ? " oga-sig-spec__row--fallback" : ""}`}
            >
              <div>
                <code className="oga-sig-spec__row-key">{sig.key}</code>
              </div>
              <div>
                <span
                  className={`oga-sig-spec__row-val${isFallback ? " oga-sig-spec__row-val--fallback" : ""}`}
                >
                  {sig.value}
                </span>
                {sig.unit && !isFallback && (
                  <span className="oga-sig-spec__row-val-unit">{sig.unit}</span>
                )}
              </div>
              <div className="oga-sig-spec__bar-row">
                {isFallback ? (
                  <div className="oga-sig-spec__bar-empty" aria-hidden>
                    <span className="oga-sig-spec__bar-empty-mark" />
                    <span className="oga-sig-spec__bar-empty-mark" />
                    <span className="oga-sig-spec__bar-empty-mark" />
                  </div>
                ) : (
                  <div className="oga-sig-spec__bar" aria-hidden>
                    <div
                      className="oga-sig-spec__bar-fill"
                      style={{ width: `${sig.percentile}%` }}
                    />
                  </div>
                )}
                <div className="oga-sig-spec__bar-meta">
                  <span>
                    {isFallback
                      ? "live fetch only"
                      : `${sig.percentile.toFixed(1)} percentile`}
                  </span>
                  <span className="oga-sig-spec__bar-meta-dir">
                    {sig.direction.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <div className="oga-sig-spec__row-conf">
                <span
                  className={`oga-sig-spec__conf-dot${
                    sig.confidence === "med"
                      ? " oga-sig-spec__conf-dot--med"
                      : sig.confidence === "low"
                      ? " oga-sig-spec__conf-dot--low"
                      : ""
                  }`}
                  aria-label={`Confidence ${sig.confidence}`}
                />
                <span>{sig.source}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="oga-sig-spec__meta-foot">
        <span className="oga-sig-spec__meta-foot-item">
          <span className="oga-sig-spec__meta-foot-k">fetch_mode</span>
          <span className="oga-sig-spec__meta-foot-v">{s.fetch_mode}</span>
        </span>
        <span className="oga-sig-spec__meta-foot-item">
          <span className="oga-sig-spec__meta-foot-k">engine_version</span>
          <span className="oga-sig-spec__meta-foot-v">{METHODOLOGY_VERSION}</span>
        </span>
        <span className="oga-sig-spec__meta-foot-item">
          <span className="oga-sig-spec__meta-foot-k">observed_period</span>
          <span className="oga-sig-spec__meta-foot-v">{s.observed_period}</span>
        </span>
      </div>
    </>
  );
}

function JsonSpecimen({ s }: { s: Specimen }) {
  const json = {
    geo: {
      postcode: s.postcode,
      lsoa: s.geo.lsoa,
      admin_district: s.geo.admin_district,
      region: s.geo.region,
      country: s.geo.country,
      area_type: s.area_type,
    },
    signals: s.signals.map((sig) => ({
      key: sig.key,
      label: sig.label,
      value: sig.value,
      unit: sig.unit,
      percentile: sig.percentile || null,
      direction: sig.direction,
      confidence: sig.confidence === "high" ? 0.9 : sig.confidence === "med" ? 0.65 : 0.35,
      source: sig.source,
      observed_period: s.observed_period,
    })),
    meta: {
      engine_version: METHODOLOGY_VERSION,
      generated_at: current.released_at + "T00:00:00.000Z",
      fetch_mode: s.fetch_mode,
    },
  };
  return <pre className="oga-sig-spec__json">{JSON.stringify(json, null, 2)}</pre>;
}

/* ============================================================
   § 02 — Anatomy of a Signal (cream) — bespoke SVG diagram
   ============================================================ */

function SectionAnatomy() {
  return (
    <section className="oga-section-quiet oga-sig-anatomy" aria-labelledby="sig-anatomy-title">
      <div className="oga-sig__wrap">
        <header className="oga-sig-anatomy__head">
          <div className="oga-sig-anatomy__eyebrow">
            <span className="oga-sig-anatomy__eyebrow-mark" aria-hidden />
            <span>Anatomy of a Signal</span>
            <span className="oga-sig-anatomy__eyebrow-mark" aria-hidden />
          </div>
          <h2 id="sig-anatomy-title" className="oga-sig-anatomy__title">
            Every field load-bearing. None of it decoration.
          </h2>
          <p className="oga-sig-anatomy__sub">
            One Signal exploded. The shape is a Zod schema shared between
            apps/web and apps/api, so the runtime payload and the static types
            cannot drift.
          </p>
        </header>

        <div className="oga-sig-anatomy__diagram">
          <SignalAnatomySvg />
        </div>
      </div>
    </section>
  );
}

/* Bespoke anatomy SVG — central Signal pill with hairlines pulling
   to 8 labelled callouts. Pure dot-and-hairline brand vocab. */
function SignalAnatomySvg() {
  return (
    <svg
      className="oga-sig-anatomy__svg"
      viewBox="0 0 1080 580"
      role="img"
      aria-label="Anatomy of a Signal: fields and their meanings"
    >
      {/* central spec pill */}
      <g transform="translate(540, 290)">
        <rect x="-180" y="-50" width="360" height="100" rx="6"
              fill="none" stroke="currentColor" strokeWidth="1" />
        <text x="-160" y="-22" fontFamily="var(--oga-font-mono)" fontSize="11"
              fill="currentColor" opacity="0.55" letterSpacing="2">SIGNAL</text>
        <text x="-160" y="0" fontFamily="var(--oga-font-mono)" fontSize="14"
              fill="currentColor" fontWeight="500">crime.total_12m</text>
        <text x="-160" y="22" fontFamily="var(--oga-font-mono)" fontSize="13"
              fill="currentColor" opacity="0.7">value: 1200</text>
        {/* anchor dots */}
        <circle cx="-180" cy="-50" r="3" fill="currentColor" />
        <circle cx="180" cy="-50" r="3" fill="currentColor" />
        <circle cx="-180" cy="50" r="3" fill="currentColor" />
        <circle cx="180" cy="50" r="3" fill="currentColor" />
      </g>

      {/* TOP-LEFT — key */}
      <g>
        <line x1="200" y1="100" x2="360" y2="240" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="200" cy="100" r="4" fill="currentColor" />
        <text x="200" y="80" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">KEY</text>
        <text x="200" y="60" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">Stable, category-namespaced.</text>
        <text x="200" y="42" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor" opacity="0.7">Pin against it forever.</text>
      </g>

      {/* TOP-CENTER — category */}
      <g>
        <line x1="540" y1="120" x2="540" y2="240" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="540" cy="120" r="4" fill="currentColor" />
        <text x="540" y="100" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">CATEGORY</text>
        <text x="540" y="80" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">One of seven. Additive.</text>
        <text x="540" y="62" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor" opacity="0.7">Categories never renamed.</text>
      </g>

      {/* TOP-RIGHT — observed_period */}
      <g>
        <line x1="880" y1="100" x2="720" y2="240" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="880" cy="100" r="4" fill="currentColor" />
        <text x="880" y="80" textAnchor="end" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">OBSERVED PERIOD</text>
        <text x="880" y="60" textAnchor="end" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">Static, trailing-window,</text>
        <text x="880" y="42" textAnchor="end" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor" opacity="0.7">or monthly. Audit anchor.</text>
      </g>

      {/* MID-LEFT — normalized_value */}
      <g>
        <line x1="120" y1="290" x2="360" y2="290" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="120" cy="290" r="4" fill="currentColor" />
        <text x="100" y="282" textAnchor="end" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">NORMALIZED_VALUE</text>
        <text x="100" y="304" textAnchor="end" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">0-1 position within country.</text>
      </g>

      {/* MID-RIGHT — percentile */}
      <g>
        <line x1="960" y1="290" x2="720" y2="290" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="960" cy="290" r="4" fill="currentColor" />
        <text x="980" y="282" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">PERCENTILE</text>
        <text x="980" y="304" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">0-100. National-within-country.</text>
      </g>

      {/* BOTTOM-LEFT — confidence */}
      <g>
        <line x1="200" y1="480" x2="360" y2="340" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="200" cy="480" r="4" fill="currentColor" />
        <text x="200" y="500" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">CONFIDENCE</text>
        <text x="200" y="520" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">Per-signal trust (0-1).</text>
        <text x="200" y="538" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor" opacity="0.7">With plain-language reason.</text>
      </g>

      {/* BOTTOM-CENTER — source */}
      <g>
        <line x1="540" y1="460" x2="540" y2="340" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="540" cy="460" r="4" fill="currentColor" />
        <text x="540" y="480" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">SOURCE</text>
        <text x="540" y="500" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">Attribution per value.</text>
        <text x="540" y="518" textAnchor="middle" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor" opacity="0.7">Source catalog on methodology.</text>
      </g>

      {/* BOTTOM-RIGHT — direction */}
      <g>
        <line x1="880" y1="480" x2="720" y2="340" stroke="currentColor" strokeWidth="1" opacity="0.35" />
        <circle cx="880" cy="480" r="4" fill="currentColor" />
        <text x="880" y="500" textAnchor="end" fontFamily="var(--oga-font-mono)" fontSize="10"
              fill="currentColor" opacity="0.6" letterSpacing="2">DIRECTION</text>
        <text x="880" y="520" textAnchor="end" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor">higher / lower / neutral.</text>
        <text x="880" y="538" textAnchor="end" fontFamily="var(--oga-font-sans)" fontSize="13"
              fill="currentColor" opacity="0.7">Orthogonal to position.</text>
      </g>
    </svg>
  );
}

/* ============================================================
   § 03 — The 7 categories (DARK) — constellation
   ============================================================ */

const CATEGORIES: { name: string; desc: string }[] = [
  { name: "Crime", desc: "12-month and monthly counts, store-backed at LSOA × month." },
  { name: "Deprivation", desc: "IMD 2025, WIMD 2019, SIMD 2020. Never cross-compared." },
  { name: "Property", desc: "Median price + transaction count + monthly history. E & W only." },
  { name: "Schools", desc: "Ofsted within 1.5km. Live fetch today." },
  { name: "Amenities", desc: "Shops, food, parks within 0.5-2km. Live counts." },
  { name: "Transport", desc: "Station + bus stop counts at radii. Live." },
  { name: "Environment", desc: "Flood risk + active warnings. Live from EA." },
];

function SectionCategories() {
  return (
    <section
      className="oga-section-dark oga-sig-cats"
      data-oga-surface="dark"
      aria-labelledby="sig-cats-title"
    >
      <div className="oga-sig__wrap">
        <header className="oga-sig-cats__head">
          <h2 id="sig-cats-title" className="oga-sig-cats__title">
            Seven categories. One constellation.
          </h2>
          <p className="oga-sig-cats__sub">
            Each category is a stable namespace under one Signal contract. New
            signals land under existing namespaces. No category is ever renamed.
          </p>
        </header>

        <div className="oga-sig-cats__stage">
          <CategoryConstellationSvg />
        </div>

        <ul className="oga-sig-cats__list">
          {CATEGORIES.map((c) => (
            <li key={c.name} className="oga-sig-cats__item">
              <span className="oga-sig-cats__item-name">{c.name}</span>
              <p className="oga-sig-cats__item-desc">{c.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 7-category constellation — 7 emphasised dots over a 5×5 ambient
   scatter, hairlines + labels around them. */
function CategoryConstellationSvg() {
  return (
    <svg
      className="oga-sig-cats__svg"
      viewBox="0 0 1080 420"
      role="img"
      aria-label="The seven Signal categories as a constellation"
    >
      {/* ambient 9×5 dot scatter */}
      <g fill="currentColor" opacity="0.18">
        {Array.from({ length: 9 }).map((_, c) =>
          Array.from({ length: 5 }).map((_, r) => (
            <circle key={`${c}-${r}`} cx={120 + c * 105} cy={60 + r * 70} r="2" />
          ))
        )}
      </g>

      {/* emphasised category dots (7) — bespoke positions to read as a constellation */}
      <g fill="currentColor">
        {/* Crime */}
        <circle cx="225" cy="200" r="6" />
        <line x1="225" y1="200" x2="225" y2="155" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="225" y="145" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">CRIME</text>

        {/* Deprivation */}
        <circle cx="435" cy="130" r="6" />
        <line x1="435" y1="130" x2="435" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="435" y="75" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">DEPRIVATION</text>

        {/* Property */}
        <circle cx="645" cy="200" r="8" />
        <line x1="645" y1="200" x2="645" y2="155" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="645" y="145" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">PROPERTY</text>

        {/* Schools */}
        <circle cx="855" cy="130" r="6" />
        <line x1="855" y1="130" x2="855" y2="85" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="855" y="75" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">SCHOOLS</text>

        {/* Amenities */}
        <circle cx="225" cy="340" r="6" />
        <line x1="225" y1="340" x2="225" y2="385" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="225" y="403" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">AMENITIES</text>

        {/* Transport */}
        <circle cx="540" cy="340" r="6" />
        <line x1="540" y1="340" x2="540" y2="385" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="540" y="403" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">TRANSPORT</text>

        {/* Environment */}
        <circle cx="855" cy="340" r="6" />
        <line x1="855" y1="340" x2="855" y2="385" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <text x="855" y="403" textAnchor="middle" fontFamily="var(--oga-font-mono)" fontSize="11" letterSpacing="2">ENVIRONMENT</text>
      </g>

      {/* connecting hairlines between categories — subtle */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.18" fill="none">
        <line x1="225" y1="200" x2="435" y2="130" />
        <line x1="435" y1="130" x2="645" y2="200" />
        <line x1="645" y1="200" x2="855" y2="130" />
        <line x1="225" y1="200" x2="225" y2="340" />
        <line x1="225" y1="340" x2="540" y2="340" />
        <line x1="540" y1="340" x2="855" y2="340" />
        <line x1="645" y1="200" x2="540" y2="340" />
      </g>
    </svg>
  );
}

/* ============================================================
   § 04 — Endpoints (cream, compact tabbed panel)
   ============================================================ */

type Param = { name: string; type: string; required: boolean; desc: string };
type Endpoint = {
  method: "GET";
  path: string;
  what: string;
  params: Param[];
  response: string;
  codes: { code: string; meaning: string }[];
};

const EPS: Endpoint[] = [
  {
    method: "GET",
    path: "/v1/area",
    what:
      "Returns the full seven-category Signal catalog for one UK postcode or place name. No scoring, no AI. The primary read.",
    params: [
      { name: "area", type: "string", required: false, desc: "UK postcode or place name. One of area or postcode is required." },
      { name: "postcode", type: "string", required: false, desc: "Alias for area. Same validation and resolution path." },
      { name: "bundle", type: "string (Lever)", required: false, desc: "Bundle id from the caller's org. Filters response to the bundle whitelist." },
    ],
    response: "AreaProfile: { geo, signals[], meta }. Sets X-Engine-Version response header.",
    codes: [
      { code: "200", meaning: "OK." },
      { code: "400", meaning: "Missing or invalid area / postcode." },
      { code: "401", meaning: "Missing or invalid API key." },
      { code: "403", meaning: "Plan has no API access, or IP-allowlist blocked." },
      { code: "404", meaning: "Ungeocodable, or dark flag off." },
      { code: "429", meaning: "Rate-limited (30 req / minute / key)." },
    ],
  },
  {
    method: "GET",
    path: "/v1/signals/:category",
    what:
      "Same AreaProfile shape, filtered to one of the seven categories. Useful when a panel only needs one slice.",
    params: [
      { name: "category", type: "path enum", required: true, desc: "One of: crime, deprivation, property, schools, amenities, transport, environment." },
      { name: "area", type: "string", required: false, desc: "UK postcode or place name. One of area or postcode is required." },
      { name: "postcode", type: "string", required: false, desc: "Alias for area." },
    ],
    response: "AreaProfile where signals[] is the subset of the requested category. Same X-Engine-Version header.",
    codes: [
      { code: "200", meaning: "OK." },
      { code: "400", meaning: "Unknown category, or missing area." },
      { code: "401", meaning: "Missing or invalid API key." },
      { code: "404", meaning: "Area not geocodable, or dark flag off." },
      { code: "429", meaning: "Rate-limited." },
    ],
  },
  {
    method: "GET",
    path: "/v1/areas",
    what:
      "Cross-area ranking. Find LSOAs in a country or LAD where one signal sits above or below a threshold or within a percentile band, sorted.",
    params: [
      { name: "signal", type: "string", required: true, desc: "Signal key to rank by." },
      { name: "country", type: "enum", required: false, desc: "England, Wales, Scotland. Scoped by LSOA prefix." },
      { name: "lad", type: "string", required: false, desc: "Local Authority District code via the ONS spine." },
      { name: "min_percentile · max_percentile", type: "0-100", required: false, desc: "Percentile band." },
      { name: "min_value · max_value", type: "number", required: false, desc: "Raw-value band." },
      { name: "sort", type: "enum", required: false, desc: "percentile (default), percentile_desc, value, value_desc." },
      { name: "limit", type: "integer", required: false, desc: "Default 100, max 1000." },
    ],
    response: "{ signal, count, areas: AreaResult[] } with geo_type, geo_code, value, normalized_value, percentile per row.",
    codes: [
      { code: "200", meaning: "OK." },
      { code: "400", meaning: "Missing signal, invalid country, or out-of-range bounds." },
      { code: "401", meaning: "Missing or invalid API key." },
      { code: "404", meaning: "Dark flag off." },
      { code: "422", meaning: "Requested signal is not in the requested bundle." },
      { code: "429", meaning: "Rate-limited." },
    ],
  },
];

/* SectionEndpoints + CodeRow extracted to shared
   _shared/product-endpoint-panel.{tsx,css} in AR-211.
   Per-product variation = title + sub + EPS data. */

/* ============================================================
   § 05 — Built for (cream, equal-weight ICPs w/ bespoke vizzes)
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
    name: "PropTech",
    Viz: VizProptech,
    problem:
      "Your product already has the buyer or renter on the page. They want decision-grade context about the area at the grain of the property. Building it yourself means stitching together a dozen government APIs and reconciling boundaries.",
    why:
      "One typed request to /v1/area returns the seven-category catalog with country-scoped percentiles and per-signal confidence. Pin to the signal keys your model consumes; the contract stays additive.",
    value:
      "Weeks of integration replaced by one API key. Comparable percentiles, not raw numbers that mean different things in Cardiff and Manchester.",
    sales: "Drop one endpoint into your property detail page and ship richer area context than your competitor's roadmap.",
  },
  {
    name: "Insurance and InsureTech",
    Viz: VizInsurer,
    problem:
      "Underwriting needs deterministic, addressable, dated values you can pin a price to and re-derive on audit. Live one-API-per-source fan-outs and trust-our-score report APIs do not survive an actuarial review.",
    why:
      "Every Signal carries source_snapshot_id, engine_version, observed_period, and a confidence with a plain-language reason. Bundles let you lock the model to the exact signal keys your tariff uses.",
    value:
      "Reproducible inputs you can defend to a regulator. Smaller blast radius on data updates because bundles whitelist what reaches your model.",
    sales: "Deterministic, dated, pinnable area inputs your actuarial team can sign off.",
  },
  {
    name: "Lenders",
    Viz: VizLender,
    problem:
      "Decisioning at scale needs comparable, percentile-normalised area inputs across the book. Most vendors give you raw numbers that are not comparable across home nations, with no audit trail of what the value was on the date you decisioned.",
    why:
      "/v1/area returns national-within-country percentiles; /v1/areas ranks the universe at LSOA grain across a country or LAD. Country scoping is by LSOA code prefix so cross-border methodology lies are structurally impossible.",
    value:
      "Concentration analysis and back-tests run against one consistent grain. Audit trail per decision because the wire payload carries lineage.",
    sales: "Comparable, percentile-normalised, audited area inputs for decisioning at portfolio scale.",
  },
  {
    name: "CRE and site selection",
    Viz: VizCre,
    problem:
      "Picking a site is a ranking problem. Which areas in this LAD meet my thresholds on deprivation, prices and footfall proxies, sorted. You do not want a one-area-at-a-time report API; you want to query the universe.",
    why:
      "/v1/areas filters by country, by LAD, by percentile band or raw-value threshold on a chosen signal. Sort by percentile or value, capped at 1000 rows. Drill into the shortlist with /v1/area for the full profile.",
    value:
      "Shortlists generated against typed thresholds in one HTTP call instead of geocoding 1000 postcodes through a report API. Output is ready to merge with internal data.",
    sales: "Threshold-and-rank the LSOA universe in one query, then drill into any area's full profile.",
  },
  {
    name: "Public sector",
    Viz: VizPublic,
    problem:
      "Public-sector analysts need defensible, sourced, dated metrics that will not be challenged in an FOI response or a council briefing. They need to compare like-with-like inside a country, not across a methodological border.",
    why:
      "Every Signal carries explicit source, observed_period, confidence and confidence_reason. Normalisation is country-scoped on purpose. We refuse to manufacture a cross-GB deprivation percentile.",
    value:
      "An evidence base that holds up under scrutiny. Country-scoped percentiles instead of false-precision cross-border comparisons.",
    sales: "Defensible, sourced, dated area metrics with the methodology version stamped on every response.",
  },
];

/* SectionIcps extracted to shared _shared/product-icp-grid.{tsx,css}
   in AR-211. Per-product: ICPS data + bespoke Viz functions below. */

/* Bespoke ICP micro-illustrations — each ~120px, dot-and-hairline only.
   Currentcolor follows the surface; no inline styles. */

function VizProptech() {
  // listing card with signal overlay
  return (
    <svg className="oga-product-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <rect x="14" y="22" width="92" height="76" rx="2" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="50" x2="106" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      {/* signal overlay dots */}
      <g fill="currentColor">
        <circle cx="30" cy="64" r="2.2" />
        <circle cx="44" cy="64" r="2.2" />
        <circle cx="58" cy="64" r="2.2" />
        <circle cx="72" cy="64" r="2.2" />
        <circle cx="86" cy="64" r="2.2" />
        <circle cx="30" cy="80" r="2.2" opacity="0.4" />
        <circle cx="44" cy="80" r="2.2" />
        <circle cx="58" cy="80" r="2.2" opacity="0.4" />
        <circle cx="72" cy="80" r="2.2" />
        <circle cx="86" cy="80" r="2.2" opacity="0.4" />
      </g>
      {/* corner dot — focal */}
      <circle cx="14" cy="22" r="3" fill="currentColor" />
    </svg>
  );
}

function VizInsurer() {
  // risk gradient — vertical bands of dot density
  return (
    <svg className="oga-product-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="currentColor">
        {[28, 44, 60, 76, 92].map((x, i) => (
          <g key={x}>
            {Array.from({ length: 5 }).map((_, r) => (
              <circle
                key={r}
                cx={x}
                cy={28 + r * 16}
                r={2 + i * 0.6}
                opacity={0.2 + i * 0.15}
              />
            ))}
          </g>
        ))}
      </g>
      <line x1="14" y1="106" x2="106" y2="106" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function VizLender() {
  // portfolio scatter w/ trend line
  return (
    <svg className="oga-product-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="100" x2="14" y2="20" stroke="currentColor" strokeWidth="1" />
      {/* scatter */}
      <g fill="currentColor">
        <circle cx="26" cy="86" r="2" />
        <circle cx="34" cy="78" r="2" />
        <circle cx="42" cy="82" r="2" />
        <circle cx="50" cy="68" r="2" />
        <circle cx="58" cy="72" r="2" />
        <circle cx="66" cy="58" r="2" />
        <circle cx="74" cy="62" r="2" />
        <circle cx="82" cy="48" r="2" />
        <circle cx="90" cy="50" r="2" />
        <circle cx="98" cy="38" r="2" />
      </g>
      {/* trend hairline */}
      <line x1="22" y1="92" x2="100" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

function VizCre() {
  // ranked stack
  return (
    <svg className="oga-product-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="currentColor">
        <circle cx="20" cy="32" r="3" />
        <line x1="28" y1="32" x2="100" y2="32" stroke="currentColor" strokeWidth="1" />
        <circle cx="20" cy="50" r="3" opacity="0.7" />
        <line x1="28" y1="50" x2="84" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <circle cx="20" cy="68" r="3" opacity="0.55" />
        <line x1="28" y1="68" x2="72" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        <circle cx="20" cy="86" r="3" opacity="0.4" />
        <line x1="28" y1="86" x2="58" y2="86" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <circle cx="20" cy="104" r="3" opacity="0.3" />
        <line x1="28" y1="104" x2="48" y2="104" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </g>
    </svg>
  );
}

function VizPublic() {
  // grid of LSOAs w/ one highlighted
  return (
    <svg className="oga-product-icp__viz-svg" viewBox="0 0 120 120" aria-hidden>
      <g fill="currentColor">
        {Array.from({ length: 6 }).map((_, c) =>
          Array.from({ length: 6 }).map((_, r) => {
            const focal = c === 2 && r === 3;
            return (
              <circle
                key={`${c}-${r}`}
                cx={20 + c * 16}
                cy={20 + r * 16}
                r={focal ? 4 : 1.8}
                opacity={focal ? 1 : 0.45}
              />
            );
          })
        )}
      </g>
      {/* hairline cross through highlighted */}
      <line x1="52" y1="68" x2="20" y2="68" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="52" y1="68" x2="52" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.45" />
    </svg>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

/* FinalCta extracted to shared _shared/product-final-cta.{tsx,css}
   in AR-211. */
