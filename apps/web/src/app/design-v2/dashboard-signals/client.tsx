"use client";

/* AR-259 /dashboard/signals catalogue.

   What you can query, in one place. Reads the static SIGNAL_CATALOGUE
   from contracts (source of truth mirroring apps/api/area-profile.ts)
   and renders it as 7 category cards. Each card shows source +
   signal count + an expand control that reveals the signal keys in
   that category with their unit + direction inline.

   Below the grid: a dark code example showing how to fetch a
   category from the user's own code, parameterised on the selected
   category for whichever card was last expanded (or crime if none).
   Schema reference panel on the right showing the Signal response
   shape so the catalogue and the wire format are visible in the
   same scroll.

   This page is the dashboard operational reference. The narrative
   sit lives at /products/signals (marketing). */

import { useMemo, useState, type ReactNode } from "react";
import { AppShell } from "../_shared/app-shell";
import { SignalsIcon } from "../_shared/product-icons";
import {
  SIGNAL_CATALOGUE,
  SIGNAL_CATEGORIES,
  type SignalCategory,
  type SignalCatalogueEntry,
} from "@onegoodarea/contracts";
import "./client.css";

/* Editorial copy per category. Keeps the catalogue page from
   reading like an enum dump. One-line take on what the category
   actually tells you. */
const CATEGORY_BLURB: Record<SignalCategory, string> = {
  crime:        "Recorded incidents and monthly rates. Lower is better.",
  deprivation:  "Official multi-domain deprivation indices, decile and rank within country.",
  property:     "Sale prices, year-on-year movement, transaction volume.",
  schools:      "Inspected schools within range, share rated Good or Outstanding.",
  amenities:    "Restaurants, pubs, healthcare, shops, parks. Density of nearby points of interest.",
  transport:    "Public transport access, stations and bus stops in range.",
  environment:  "Flood-risk area count and active warnings.",
};

const CATEGORY_LABEL: Record<SignalCategory, string> = {
  crime:        "Crime",
  deprivation:  "Deprivation",
  property:     "Property",
  schools:      "Schools",
  amenities:    "Amenities",
  transport:    "Transport",
  environment:  "Environment",
};

export default function SignalsCatalogueClient() {
  /* AR-259: no AppShell title. The page-internal product header
     (SignalsIcon + serif title + tagline) carries the moment; an
     AppShell chrome title would duplicate it. */
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}

function Body() {
  const [expanded, setExpanded] = useState<SignalCategory | null>(null);
  const [codeCategory, setCodeCategory] = useState<SignalCategory>("crime");

  /* Group entries by category once. SIGNAL_CATALOGUE is static so
     a useMemo with no deps is essentially a top-level constant. */
  const grouped = useMemo(() => {
    const out: Record<SignalCategory, SignalCatalogueEntry[]> = {
      crime: [], deprivation: [], property: [], schools: [],
      amenities: [], transport: [], environment: [],
    };
    for (const entry of SIGNAL_CATALOGUE) {
      out[entry.category].push(entry);
    }
    return out;
  }, []);

  /* Sources per category, deduped, for the card subline. */
  const sources = useMemo(() => {
    const out: Record<SignalCategory, string[]> = {
      crime: [], deprivation: [], property: [], schools: [],
      amenities: [], transport: [], environment: [],
    };
    for (const cat of SIGNAL_CATEGORIES) {
      out[cat] = Array.from(new Set(grouped[cat].map((e) => e.source)));
    }
    return out;
  }, [grouped]);

  function toggle(cat: SignalCategory) {
    setExpanded(expanded === cat ? null : cat);
    setCodeCategory(cat);
  }

  return (
    <div className="oga-sig">
      <header className="oga-sig__product">
        <span className="oga-sig__product-mark" aria-hidden>
          <SignalsIcon width={56} height={56} />
        </span>
        <div className="oga-sig__product-text">
          <span className="oga-sig__product-eyebrow">Product</span>
          <h2 className="oga-sig__product-title">Signals</h2>
          <p className="oga-sig__product-tagline">
            Seven categories of normalised UK area data, addressable per
            signal key. Every response carries value, unit, direction,
            confidence and source attribution. The catalogue below is the
            wire format your code consumes.
          </p>
        </div>
      </header>

      <section className="oga-sig__grid">
        {SIGNAL_CATEGORIES.map((cat) => {
          const entries = grouped[cat];
          const srcs = sources[cat];
          const isOpen = expanded === cat;
          return (
            <article
              key={cat}
              className={
                isOpen ? "oga-sig-card oga-sig-card--open" : "oga-sig-card"
              }
            >
              <button
                type="button"
                onClick={() => toggle(cat)}
                className="oga-sig-card__head"
                aria-expanded={isOpen}
              >
                <span className="oga-sig-card__glyph" aria-hidden>
                  {CATEGORY_GLYPH[cat]()}
                </span>
                <span className="oga-sig-card__eyebrow">{cat}</span>
                <h3 className="oga-sig-card__title">{CATEGORY_LABEL[cat]}</h3>
                <p className="oga-sig-card__blurb">{CATEGORY_BLURB[cat]}</p>
                <div className="oga-sig-card__meta">
                  <span className="oga-sig-card__count">
                    {entries.length} signal{entries.length === 1 ? "" : "s"}
                  </span>
                  <span className="oga-sig-card__sources">
                    {srcs.join(" · ")}
                  </span>
                </div>
                <span aria-hidden className="oga-sig-card__chev">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen ? (
                <ul className="oga-sig-card__keys">
                  {entries.map((e) => (
                    <li key={e.key} className="oga-sig-key">
                      <code className="oga-sig-key__name">{e.key}</code>
                      <span className="oga-sig-key__label">{e.label}</span>
                      <span className="oga-sig-key__unit">{e.unit}</span>
                      <span
                        className="oga-sig-key__dir"
                        data-dir={e.direction}
                      >
                        {directionLabel(e.direction)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>

      <div className="oga-sig__split">
        <CodeBlock category={codeCategory} />
        <SchemaPanel />
      </div>
    </div>
  );
}

function CodeBlock({ category }: { category: SignalCategory }) {
  const curl = `curl https://api.onegoodarea.com/v1/signals/${category} \\
  -H "Authorization: Bearer $OGA_API_KEY" \\
  -G \\
  --data-urlencode "postcode=SW1A 1AA"`;
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="oga-sig-code">
      <div className="oga-sig-code__head">
        <span className="oga-sig-code__path">
          GET /v1/signals/<strong>{category}</strong>
        </span>
        <button
          type="button"
          onClick={copy}
          className="oga-sig-code__copy"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="oga-sig-code__pre">
        <code>{curl}</code>
      </pre>
      <p className="oga-sig-code__hint">
        Pass a UK postcode or place name in <code>postcode</code> or{" "}
        <code>area</code>. Response includes only the signals in the
        requested category.
      </p>
    </div>
  );
}

function SchemaPanel() {
  const rows: Array<{ field: string; type: string; desc: string }> = [
    { field: "key",                type: "string",         desc: "Stable category-namespaced id." },
    { field: "category",           type: "SignalCategory", desc: "One of the 7 categories." },
    { field: "label",              type: "string",         desc: "Display label." },
    { field: "value",              type: "number | string | null", desc: "Raw value. null means no coverage." },
    { field: "unit",               type: "string | null",  desc: "Unit: count, GBP, pct, decile, rank, per_month." },
    { field: "normalized_value",   type: "number | null?", desc: "0-1 position within distribution. Store-backed only." },
    { field: "percentile",         type: "number | null?", desc: "0-100 rank. Store-backed only." },
    { field: "direction",          type: "SignalDirection", desc: "higher_is_better, lower_is_better, or neutral." },
    { field: "confidence",         type: "number 0-1",     desc: "Per-signal data trust." },
    { field: "confidence_reason",  type: "string",         desc: "Plain-language reason." },
    { field: "source",             type: "string",         desc: "Dataset attribution." },
    { field: "observed_period",    type: "string",         desc: "Period the value describes." },
  ];

  return (
    <div className="oga-sig-schema">
      <header className="oga-sig-schema__head">
        <span className="oga-sig-schema__eyebrow">Signal schema</span>
        <p className="oga-sig-schema__hint">
          Every entry in the response carries these fields. Same shape
          across all 7 categories.
        </p>
      </header>
      <ul className="oga-sig-schema__rows">
        {rows.map((r) => (
          <li key={r.field}>
            <code className="oga-sig-schema__field">{r.field}</code>
            <code className="oga-sig-schema__type">{r.type}</code>
            <span className="oga-sig-schema__desc">{r.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function directionLabel(dir: SignalCatalogueEntry["direction"]): string {
  switch (dir) {
    case "higher_is_better":
      return "higher better";
    case "lower_is_better":
      return "lower better";
    case "neutral":
      return "neutral";
  }
}

/* ============================================================
   Category glyphs. 24x24 viewBox, currentColor hairlines (1.4-
   1.6px). Same brand vocabulary as the product-icons + nav-icons
   sets: dot-and-line geometric, no decorative flourishes. One per
   category, each chosen to mirror the data domain visually.
   ============================================================ */

const CATEGORY_GLYPH: Record<SignalCategory, () => ReactNode> = {
  crime: () => (
    /* Crosshair + emphasized centre dot: a single observed
       incident on a watch grid. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  ),
  deprivation: () => (
    /* Stepped bars rising left to right: deciles 1-10 collapsed
       into a 4-step indicator. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3"  y="16" width="3" height="5"  fill="currentColor" />
      <rect x="8"  y="13" width="3" height="8"  fill="currentColor" />
      <rect x="13" y="9"  width="3" height="12" fill="currentColor" />
      <rect x="18" y="4"  width="3" height="17" fill="currentColor" />
    </svg>
  ),
  property: () => (
    /* House silhouette: roof triangle + body rectangle. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 11L12 4l9 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="5.5"
        y="10"
        width="13"
        height="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="10.5" y="14" width="3" height="6" fill="currentColor" />
    </svg>
  ),
  schools: () => (
    /* Pediment + columns: institutional silhouette. Same vocabulary
       as the OrgIcon in nav-icons, sized for the catalogue card. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8L12 3l9 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 21h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 9v12M9 9v12M15 9v12M19 9v12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  ),
  amenities: () => (
    /* Three loose clusters of dots: density of nearby POIs. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <g fill="currentColor">
        {/* Cluster top-left */}
        <circle cx="5"  cy="5"  r="1.4" />
        <circle cx="8"  cy="4"  r="1.4" />
        <circle cx="6"  cy="8"  r="1.4" />
        {/* Cluster bottom-right */}
        <circle cx="18" cy="16" r="1.4" />
        <circle cx="20" cy="19" r="1.4" />
        <circle cx="16" cy="19" r="1.4" />
        {/* Cluster right-top */}
        <circle cx="17" cy="6"  r="1.4" />
        <circle cx="20" cy="9"  r="1.4" />
        <circle cx="17" cy="10" r="1.4" />
        {/* Cluster bottom-left */}
        <circle cx="5"  cy="17" r="1.4" />
        <circle cx="7"  cy="20" r="1.4" />
      </g>
    </svg>
  ),
  transport: () => (
    /* Horizontal route with two stops: a line connecting two
       circles. Reads as a transit segment. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="7"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="var(--oga-bg-warm, #FAF8F4)"
      />
      <circle
        cx="17"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="var(--oga-bg-warm, #FAF8F4)"
      />
      <circle cx="7"  cy="12" r="1"   fill="currentColor" />
      <circle cx="17" cy="12" r="1"   fill="currentColor" />
    </svg>
  ),
  environment: () => (
    /* Three stacked wave lines: water / flood domain. */
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 7c2.5-2 5-2 7.5 0S14.5 9 17 7s5-2 5-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 13c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 19c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 5-2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};
