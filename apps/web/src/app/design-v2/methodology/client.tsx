"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Nav } from "../_shared/nav";
import { Footer } from "../_shared/footer";
import { BookDemo } from "../_shared/book-demo";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_VERSIONS,
  getCurrentMethodology,
} from "@/lib/methodology-versions";
import { SCORING_PROFILES } from "@/lib/scoring-profiles";
import { CATEGORY_GLYPH } from "../_shared/dashboard/category-glyphs";
import type { SignalCategory } from "@onegoodarea/contracts";
import "./methodology.css";

/* /methodology - the public trust page, rebuilt bespoke in the product-page
   language (Plan 064). Signature illustrations per section: the hero signal
   card, the seven-category source grid, the snapshots timeline, the scoring
   glyph tiles, the query console, the confidence meter and the version
   timeline. Exposure-reduced: no internal table names, SQL, endpoint paths,
   exact thresholds, formulas, model names or roadmap. Every fact traces to
   the live product; implementation detail lives in the private pack. */

const current = getCurrentMethodology();

export default function MethodologyClient() {
  return (
    <div className="oga-root oga-meth">
      <Nav />
      <Hero />
      <SectionSignal />
      <SectionSources />
      <SectionContext />
      <SectionSnapshots />
      <SectionScoring />
      <SectionDerived />
      <SectionQuery />
      <SectionConfidence />
      <SectionVersioning />
      <SectionLevers />
      <SectionScope />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ============================================================
   Hero - the anatomy of a trustworthy number
   ============================================================ */

function Hero() {
  return (
    <section className="oga-meth-hero">
      <div className="oga-meth-hero__dots" aria-hidden />
      <div className="oga-meth-hero__inner">
        <span className="oga-meth-hero__eyebrow">
          <span>Methodology</span>
          <span className="oga-meth-hero__eyebrow-dot" aria-hidden />
          <span>v{METHODOLOGY_VERSION}</span>
          <span className="oga-meth-hero__eyebrow-dot" aria-hidden />
          <span>Released {current.released_at}</span>
        </span>
        <h1 className="oga-meth-hero__title">Every UK number we return, and why you can trust it.</h1>
        <p className="oga-meth-hero__lead">
          Every value comes from a named public source, is placed in national
          context, carries its own confidence, and is stamped with the version
          that produced it. So you can trace it, cite it, and get the same answer
          when you check it again.
        </p>
        <div className="oga-meth-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try it in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="#sources" className="oga-btn oga-btn-secondary">
            See the sources
          </Link>
        </div>
      </div>

      <div className="oga-meth-hero__stage" aria-hidden>
        <SignalCard />
      </div>
    </section>
  );
}

/* The signature illustration: one real signal, with every trust attribute on
   show. Reused (smaller) inside the Signal section. */
function SignalCard({ compact = false }: { compact?: boolean }) {
  return (
    <article className={`oga-meth-sigcard${compact ? " oga-meth-sigcard--compact" : ""}`}>
      <div className="oga-meth-sigcard__top">
        <span className="oga-meth-sigcard__glyph">{CATEGORY_GLYPH.crime()}</span>
        <span className="oga-meth-sigcard__id">
          <span className="oga-meth-sigcard__cat">Crime</span>
          <span className="oga-meth-sigcard__pc">M1 1AE · Manchester</span>
        </span>
        <span className="oga-meth-sigcard__conf">
          <span className="oga-meth-sigcard__conf-dot" />
          High confidence
        </span>
      </div>

      <div className="oga-meth-sigcard__value">
        <span className="oga-meth-sigcard__num">92</span>
        <span className="oga-meth-sigcard__unit">nd percentile</span>
      </div>

      <div className="oga-meth-sigcard__bar">
        <span className="oga-meth-sigcard__bar-fill" />
        <span className="oga-meth-sigcard__bar-dot" />
      </div>
      <div className="oga-meth-sigcard__bar-ends">
        <span>Lowest in England</span>
        <span>Highest</span>
      </div>

      <div className="oga-meth-sigcard__foot">
        <span className="oga-meth-sigcard__src">police.uk</span>
        <span className="oga-meth-sigcard__ver">v{METHODOLOGY_VERSION}</span>
      </div>
    </article>
  );
}

/* ============================================================
   01 - What a signal is
   ============================================================ */

const SIGNAL_ATTRS: { name: string; body: string }[] = [
  { name: "The value", body: "The measurement itself, in its own unit, or empty with a reason when there is nothing solid to report." },
  { name: "National context", body: "Where the value sits against comparable areas, from 0 to 100, so a number means something on its own." },
  { name: "Confidence", body: "How solid the number is, based on the source, the sample and how recent it is. Honest, not aspirational." },
  { name: "Its source", body: "The named public dataset it came from, so you can cite it and stand behind it." },
  { name: "A version stamp", body: "The engine version that produced it, so the same request returns the same number, months later." },
];

function SectionSignal() {
  return (
    <section id="signal" className="oga-meth-sec oga-meth-sec--quiet">
      <div className="oga-meth__wrap">
        <SecHead num="01" kicker="The primitive" title="Everything starts with a signal.">
          A signal is one measured attribute of a UK area, from a named source,
          placed in national context, time-stamped and confidence-rated. Scores,
          comparisons and forecasts are all built on top of signals.
        </SecHead>

        <div className="oga-meth-signal__grid">
          <ul className="oga-meth-signal__attrs">
            {SIGNAL_ATTRS.map((a, i) => (
              <li key={a.name} className="oga-meth-signal__attr">
                <span className="oga-meth-signal__attr-num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="oga-meth-signal__attr-name">{a.name}</div>
                  <p className="oga-meth-signal__attr-body">{a.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="oga-meth-signal__card" aria-hidden>
            <SignalCard compact />
            <p className="oga-meth-signal__card-note">
              One signal, with every part on show. Nothing is a bare number.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   02 - Sources (DARK, seven-category glyph grid)
   ============================================================ */

const CATEGORY_SOURCES: { cat: SignalCategory; name: string; source: string; coverage: string }[] = [
  { cat: "crime", name: "Crime", source: "police.uk", coverage: "England · Wales · Scotland" },
  { cat: "deprivation", name: "Deprivation", source: "IMD, WIMD and SIMD", coverage: "England · Wales · Scotland" },
  { cat: "property", name: "Property", source: "HM Land Registry", coverage: "England · Wales" },
  { cat: "schools", name: "Schools", source: "Ofsted and the DfE", coverage: "England" },
  { cat: "amenities", name: "Amenities", source: "OpenStreetMap", coverage: "United Kingdom" },
  { cat: "transport", name: "Transport", source: "OpenStreetMap", coverage: "United Kingdom" },
  { cat: "environment", name: "Environment", source: "Environment Agency", coverage: "United Kingdom" },
];

function SectionSources() {
  return (
    <section id="sources" className="oga-meth-sec oga-meth-sec--dark" data-oga-surface="dark">
      <div className="oga-meth__wrap">
        <SecHead num="02" kicker="Where the data comes from" title="Every number traces back to a public source." dark>
          Seven categories, each from official, public datasets. We name every one
          here, and every response carries its source alongside the value, so you
          can always show your working.
        </SecHead>

        <div className="oga-meth-src__grid">
          {CATEGORY_SOURCES.map((s) => (
            <article key={s.name} className="oga-meth-src__card">
              <span className="oga-meth-src__glyph">{CATEGORY_GLYPH[s.cat]()}</span>
              <h3 className="oga-meth-src__name">{s.name}</h3>
              <p className="oga-meth-src__source">{s.source}</p>
              <p className="oga-meth-src__coverage">{s.coverage}</p>
            </article>
          ))}
          <article className="oga-meth-src__card oga-meth-src__card--note">
            <p className="oga-meth-src__note">
              Postcodes are resolved to neighbourhoods through the official ONS
              spine, so every value lands on the right area.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   03 - Context (national vs regional)
   ============================================================ */

const NATIONAL: { val: string; place: string }[] = [
  { val: "£16.3M", place: "Kensington and Chelsea" },
  { val: "£11.3M", place: "Westminster" },
  { val: "£8.6M", place: "Westminster" },
  { val: "£6.8M", place: "Westminster" },
  { val: "£6.7M", place: "Kensington and Chelsea" },
];
const REGIONAL: { val: string; place: string; region: string }[] = [
  { val: "£16.3M", place: "Kensington and Chelsea", region: "London" },
  { val: "£3.9M", place: "Oxford", region: "South East" },
  { val: "£2.8M", place: "Broadland", region: "East of England" },
  { val: "£985k", place: "Oadby and Wigston", region: "East Midlands" },
  { val: "£970k", place: "Northumberland", region: "North East" },
];

function SectionContext() {
  return (
    <section id="context" className="oga-meth-sec oga-meth-sec--light">
      <div className="oga-meth__wrap">
        <SecHead num="03" kicker="National context" title="Every number is ranked within its own country and region.">
          Every value is ranked against comparable areas. Each country is ranked
          within itself, because their deprivation indices are built differently
          and are not comparable across the border. You can also rank an area
          against its own region, so a strong area in a quieter part of the country
          is not flattened by the national picture.
        </SecHead>

        <div className="oga-meth-ctx">
          <div className="oga-meth-ctx__cols">
            <div className="oga-meth-ctx__col">
              <div className="oga-meth-ctx__col-head">National ranking</div>
              <ol className="oga-meth-ctx__list">
                {NATIONAL.map((r, i) => (
                  <li key={i} className="oga-meth-ctx__row">
                    <span className="oga-meth-ctx__rank">{i + 1}</span>
                    <span className="oga-meth-ctx__val">{r.val}</span>
                    <span className="oga-meth-ctx__place">{r.place}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="oga-meth-ctx__col">
              <div className="oga-meth-ctx__col-head">Regional ranking</div>
              <ol className="oga-meth-ctx__list">
                {REGIONAL.map((r, i) => (
                  <li key={i} className="oga-meth-ctx__row">
                    <span className="oga-meth-ctx__rank">{i + 1}</span>
                    <span className="oga-meth-ctx__val">{r.val}</span>
                    <span className="oga-meth-ctx__place">
                      {r.place} <em>· {r.region}</em>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="oga-meth-ctx__caveat">
            The same signal, the same country, the same shortlist. National returns
            five slices of prime London; regional returns the top of five different
            markets.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   04 - Historical snapshots (DARK, timeline)
   ============================================================ */

const SNAPSHOT_POINTS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const SNAPSHOT_CARDS: { name: string; body: string }[] = [
  { name: "Never overwritten", body: "A correction shows up as the next month's value, so a number you saw before stays exactly as it was, and stays reproducible." },
  { name: "Always reproducible", body: "Because the history never changes, a figure you cite today returns the same figure when you or an auditor check it months from now." },
  { name: "Compounding", body: "The record gets deeper every month, building up area history that nobody can backfill after the fact." },
];

function SectionSnapshots() {
  return (
    <section id="snapshots" className="oga-meth-sec oga-meth-sec--dark" data-oga-surface="dark">
      <div className="oga-meth__wrap">
        <SecHead num="04" kicker="Historical snapshots" title="We keep a monthly record that only ever grows." dark>
          Each month we add a fresh snapshot of every signal in every area. We only
          ever add to that history, never overwrite it, so past values stay exactly
          as they were measured and any figure can be reproduced months later.
        </SecHead>

        <div className="oga-meth-time" aria-hidden>
          <div className="oga-meth-time__line" />
          {SNAPSHOT_POINTS.map((m, i) => (
            <div
              key={m}
              className={`oga-meth-time__tick${i === SNAPSHOT_POINTS.length - 1 ? " oga-meth-time__tick--now" : ""}`}
            >
              <span className="oga-meth-time__bar" style={{ height: `${18 + i * 5}px` }} />
              <span className="oga-meth-time__label">{m}</span>
            </div>
          ))}
          <span className="oga-meth-time__next">+ next month</span>
        </div>

        <div className="oga-meth-snap__row">
          {SNAPSHOT_CARDS.map((c) => (
            <article key={c.name} className="oga-meth-snap__card">
              <h3 className="oga-meth-snap__name">{c.name}</h3>
              <p className="oga-meth-snap__body">{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   05 - Scoring (chips + profile glyph tiles)
   ============================================================ */

const SCORING_CATEGORIES = ["Crime", "Deprivation", "Property", "Schools", "Amenities", "Transport", "Environment"];

function SectionScoring() {
  return (
    <section id="scoring" className="oga-meth-sec oga-meth-sec--quiet">
      <div className="oga-meth__wrap">
        <SecHead num="05" kicker="Scoring" title="Every score is built from the same seven categories.">
          A score turns an area&apos;s signals into a single number from 0 to 100.
          Every profile scores the same seven categories; the profile only changes
          how they are weighted for its job. The scoring is deterministic, so the
          same inputs always return the same score.
        </SecHead>

        <div className="oga-meth-score__cats" aria-label="The seven scoring categories">
          {SCORING_CATEGORIES.map((c) => (
            <span key={c} className="oga-meth-score__cat">{c}</span>
          ))}
        </div>

        <div className="oga-meth-score__tiles">
          {SCORING_PROFILES.map((p) => (
            <article key={p.slug} className="oga-meth-score__tile">
              <span className="oga-meth-score__tile-glyph" aria-hidden>{p.Glyph()}</span>
              <h3 className="oga-meth-score__tile-name">{p.name}</h3>
              <p className="oga-meth-score__tile-use">{p.use}</p>
            </article>
          ))}
        </div>

        <p className="oga-meth-score__foot">
          You can re-weight the seven categories for a single request, or save a
          weighting against your organisation and reuse it. Every score is stamped
          with the version that produced it, so you can pin it and reproduce the
          exact number later.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   06 - Beyond a single reading (derived + surfaces)
   ============================================================ */

const DERIVED: { name: string; body: string }[] = [
  { name: "Change over time", body: "How prices, sales activity and crime have moved against a year ago." },
  { name: "Momentum", body: "The recent direction of travel, so a fast-moving area shows up early." },
  { name: "Trend", body: "The longer-run direction over a couple of years, steadier than a single jump." },
  { name: "Peer comparison", body: "How an area reads against similar areas, high or low for its kind." },
];

const SURFACES: { name: string; body: string; honest: string }[] = [
  { name: "Similar areas", body: "The areas most like a given one, based on how closely they sit across the signals they share.", honest: "A simple, symmetric similarity." },
  { name: "Outliers", body: "Areas that stand out from their peer group on a signal, so unusual places surface on their own.", honest: "Worked out ahead of time, so it is fast." },
  { name: "Forecast", body: "A straightforward projection of where a monthly signal is heading, with a confidence band around it.", honest: "A transparent trend, not a black box." },
];

function SectionDerived() {
  return (
    <section id="derived" className="oga-meth-sec oga-meth-sec--light">
      <div className="oga-meth__wrap">
        <SecHead num="06" kicker="Beyond a single reading" title="We show how areas change, compare and where they head.">
          As well as today&apos;s numbers, we work out how areas are changing, how
          they compare with their peers, and where a signal is heading. Each one
          comes with its own time window and its own confidence.
        </SecHead>

        <div className="oga-meth-der__cards">
          {DERIVED.map((d) => (
            <article key={d.name} className="oga-meth-der__card">
              <h3 className="oga-meth-der__name">{d.name}</h3>
              <p className="oga-meth-der__body">{d.body}</p>
            </article>
          ))}
        </div>

        <div className="oga-meth-surf__row">
          {SURFACES.map((s, i) => (
            <article key={s.name} className="oga-meth-surf__card">
              <span className="oga-meth-surf__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="oga-meth-surf__name">{s.name}</h3>
              <p className="oga-meth-surf__body">{s.body}</p>
              <p className="oga-meth-surf__honest">{s.honest}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   07 - Ask a question (DARK, console)
   ============================================================ */

const CAN_DO = ["Rank areas", "Look one up", "Score it", "Compare areas", "Find similar", "Spot outliers", "Forecast"];

function SectionQuery() {
  return (
    <section id="query" className="oga-meth-sec oga-meth-sec--dark" data-oga-surface="dark">
      <div className="oga-meth__wrap">
        <SecHead num="07" kicker="Ask a question" title="Ask in plain English, get an answer you can check." dark>
          Ask a question in plain English and it is turned into a precise query. You
          get the answer and the exact query behind it, so every result can be
          reviewed and run again. Prefer to be exact? Send the typed query yourself
          and skip the AI entirely.
        </SecHead>

        <div className="oga-meth-q__row">
          <div className="oga-meth-q__can">
            {CAN_DO.map((c) => (
              <span key={c} className="oga-meth-q__chip">{c}</span>
            ))}
          </div>

          <div className="oga-meth-q__console">
            <div className="oga-meth-q__bar">
              <span className="oga-meth-q__dots" aria-hidden><i /><i /><i /></span>
              <span className="oga-meth-q__bar-label">Your question, in plain English</span>
            </div>
            <div className="oga-meth-q__body">
              <p className="oga-meth-q__ask">
                &ldquo;English neighbourhoods under £250k where prices are rising,
                crime is below average and deprivation is low, best growth first,
                top five.&rdquo;
              </p>
              <div className="oga-meth-q__sep" aria-hidden />
              <p className="oga-meth-q__plan">
                <span className="oga-meth-q__plan-tag">Understood as</span>
                Rank English areas, keep the ones under £250k with prices rising,
                crime and deprivation both in the better half, sort by growth,
                return the top five, and hand back the plan so you can run it again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   08 - Confidence (meter)
   ============================================================ */

const CONF_BANDS: { band: string; pct: number; means: string; example: string }[] = [
  { band: "High", pct: 100, means: "Fresh data from the primary source, a healthy sample, little movement.", example: "Recent crime, or prices where there are plenty of sales." },
  { band: "Medium", pct: 68, means: "An older release, a smaller sample, a fallback source, or a more volatile signal.", example: "Older deprivation indices, or prices in a thinner market." },
  { band: "Low", pct: 38, means: "A proxy fallback, or very little underlying data.", example: "Prices where there are very few recent sales." },
  { band: "None", pct: 12, means: "No usable data. The value comes back empty, with the reason.", example: "A source is down, or the area is outside our coverage." },
];

function SectionConfidence() {
  return (
    <section id="confidence" className="oga-meth-sec oga-meth-sec--quiet">
      <div className="oga-meth__wrap">
        <SecHead num="08" kicker="Confidence" title="Every number tells you how sure we are.">
          Every value comes with a confidence level and a short, plain-English
          reason. It reflects how fresh the data is, how large the sample is,
          whether we had to fall back to another source, and how much the signal
          moves around. When the data is thin, the response says so.
        </SecHead>

        <div className="oga-meth-conf__meters">
          {CONF_BANDS.map((b) => (
            <div key={b.band} className="oga-meth-conf__meter">
              <div className="oga-meth-conf__meter-head">
                <span className="oga-meth-conf__meter-band">{b.band}</span>
              </div>
              <div className="oga-meth-conf__gauge">
                <span className="oga-meth-conf__gauge-fill" style={{ width: `${b.pct}%` }} />
              </div>
              <p className="oga-meth-conf__means">{b.means}</p>
              <p className="oga-meth-conf__eg">{b.example}</p>
            </div>
          ))}
        </div>

        <p className="oga-meth-conf__gating">
          Categories that are inferred rather than directly measured are capped at
          medium confidence by design. And when we watch an area for change, a move
          backed by too little data is held back rather than flagged, so a one-off
          blip never triggers a false alarm.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   09 - Versioning (timeline + current)
   ============================================================ */

const SEMVER: { tag: string; desc: string }[] = [
  { tag: "Major", desc: "A change big enough that scores could move, and would invalidate numbers you saved under the old version." },
  { tag: "Minor", desc: "An addition, such as a new category or data source, that does not change the numbers you already have." },
  { tag: "Patch", desc: "A small refinement, with scores staying exactly the same." },
];

function SectionVersioning() {
  return (
    <section id="versioning" className="oga-meth-sec oga-meth-sec--light">
      <div className="oga-meth__wrap">
        <SecHead num="09" kicker="Reproducibility" title="Every number is stamped with a version you can pin.">
          Every response is stamped with the engine version that produced it, so you
          always know which version a number came from. You can pin a single request
          to a version, or pin your whole organisation, and get the same numbers back
          for as long as you need them.
        </SecHead>

        <div className="oga-meth-ver__grid">
          <div className="oga-meth-ver__semver">
            {SEMVER.map((s) => (
              <div key={s.tag} className="oga-meth-ver__semver-row">
                <span className="oga-meth-ver__semver-tag">{s.tag}</span>
                <span className="oga-meth-ver__semver-desc">{s.desc}</span>
              </div>
            ))}
            <p className="oga-meth-ver__pin">
              Pinning your whole organisation is owner-only, because it matters for
              regulator-facing audits. A single request can still ask for the latest,
              and older pinned versions stay available for as long as you rely on them.
            </p>
          </div>

          <aside className="oga-meth-ver__timeline" aria-label="Version history">
            <div className="oga-meth-ver__timeline-label">Version history</div>
            {[...METHODOLOGY_VERSIONS].reverse().map((v) => (
              <div
                key={v.version}
                className={`oga-meth-ver__entry${v.version === METHODOLOGY_VERSION ? " oga-meth-ver__entry--current" : ""}`}
              >
                <span className="oga-meth-ver__entry-dot" aria-hidden />
                <div className="oga-meth-ver__entry-body">
                  <div className="oga-meth-ver__entry-head">
                    <span className="oga-meth-ver__entry-badge">v{v.version}</span>
                    <span className="oga-meth-ver__entry-date">{v.released_at}</span>
                    {v.version === METHODOLOGY_VERSION && (
                      <span className="oga-meth-ver__entry-now">current</span>
                    )}
                  </div>
                  <p className="oga-meth-ver__entry-summary">{v.summary}</p>
                  <ul className="oga-meth-ver__entry-changes">
                    {v.changes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   10 - Levers
   ============================================================ */

const LEVERS: { name: string; rbac: string; body: string }[] = [
  { name: "Signal bundles", rbac: "Admin", body: "Choose which signals your team's keys can see, so everyone works from the same agreed set." },
  { name: "Scoring presets", rbac: "Admin", body: "Save a scoring weighting for your organisation and reuse it across the team, so every score is worked out the same way." },
  { name: "Version pinning", rbac: "Owner", body: "Pin your whole organisation to a specific engine version, so every score stays reproducible for as long as you need it." },
  { name: "Peer groups", rbac: "Admin", body: "Define your own set of areas, so “similar areas” means similar within your portfolio, not the whole country." },
];

function SectionLevers() {
  return (
    <section id="levers" className="oga-meth-sec oga-meth-sec--quiet">
      <div className="oga-meth__wrap">
        <SecHead num="10" kicker="For your team" title="Configure how the API behaves for your organisation.">
          Levers are the controls that shape the API for your keys. All four are
          opt-in, so if you leave them alone everything works exactly as it does by
          default. Role-based access, white-labelling and IP allowlisting sit
          alongside them.
        </SecHead>

        <div className="oga-meth-lev__grid">
          {LEVERS.map((l) => (
            <article key={l.name} className="oga-meth-lev__card">
              <div className="oga-meth-lev__head">
                <h3 className="oga-meth-lev__name">{l.name}</h3>
                <span className="oga-meth-lev__rbac">{l.rbac}-only</span>
              </div>
              <p className="oga-meth-lev__body">{l.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   11 - Scope and limitations
   ============================================================ */

const SCOPE: { tag: string; title: string; body: string }[] = [
  { tag: "Not", title: "An automated valuation model", body: "It does not predict the market value of a specific property. Use a dedicated AVM for that." },
  { tag: "Not", title: "A credit decision", body: "It is an input to enrich your own models, never a decision on any individual's affordability or creditworthiness." },
  { tag: "Not", title: "Address-level", body: "We score small areas, not individual addresses. For a specific property, pair us with an address-level source." },
  { tag: "Watch", title: "Neighbourhood edges", body: "An area right on the boundary of another deserves a closer look. These boundaries are administrative, not behavioural." },
  { tag: "Care", title: "Regulated use", body: "Deprivation correlates with protected characteristics. In regulated workflows, buyers stay responsible for fair-lending compliance." },
];

function SectionScope() {
  return (
    <section id="scope" className="oga-meth-sec oga-meth-sec--light">
      <div className="oga-meth__wrap">
        <SecHead num="11" kicker="Scope and limits" title="What this is, and what it is not.">
          Said up front to save you time. This is decision-grade area screening and
          analysis. It is not valuation, not lending, and not address-level today.
        </SecHead>

        <div className="oga-meth-scope__grid">
          {SCOPE.map((s) => (
            <article key={s.title} className="oga-meth-scope__card">
              <span className="oga-meth-scope__tag">{s.tag}</span>
              <h3 className="oga-meth-scope__title">{s.title}</h3>
              <p className="oga-meth-scope__body">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Final CTA (DARK)
   ============================================================ */

function FinalCta() {
  return (
    <section className="oga-meth-sec oga-meth-sec--dark oga-meth-cta" data-oga-surface="dark">
      <div className="oga-meth__wrap oga-meth-cta__inner">
        <h2 className="oga-meth-cta__title">You can trace, cite and reproduce every number.</h2>
        <p className="oga-meth-cta__lead">
          Source-backed, placed in context, confidence-rated and version-stamped.
          Everything a team needs to build on UK area data with confidence.
        </p>
        <div className="oga-meth-cta__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try it in the playground
            <span aria-hidden>→</span>
          </Link>
          <BookDemo className="oga-btn oga-btn-secondary">Book a demo</BookDemo>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Shared section header
   ============================================================ */

function SecHead({
  num,
  kicker,
  title,
  children,
  dark = false,
}: {
  num: string;
  kicker: string;
  title: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <header className={`oga-meth-head${dark ? " oga-meth-head--dark" : ""}`}>
      <div className="oga-meth-head__eyebrow">
        <span className="oga-meth-head__num">{num}</span>
        <span className="oga-meth-head__line" aria-hidden />
        <span>{kicker}</span>
      </div>
      <h2 className="oga-meth-head__title">{title}</h2>
      <p className="oga-meth-head__lead">{children}</p>
    </header>
  );
}
