"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { ScoresIcon } from "../../_shared/product-icons";
import { BookDemo } from "../../_shared/book-demo";
import { SCORING_PROFILES, type ProfileSlug } from "@/lib/scoring-profiles";
import "./scores.css";

/* The four scoring setups already have dot-and-hairline glyphs in the shared
   catalogue (house / storefront / trend / pentagon). Reuse them so the
   marketing page and the dashboard presets stay in one visual language. */
function ProfileGlyph({ slug }: { slug: ProfileSlug }) {
  const p = SCORING_PROFILES.find((x) => x.slug === slug);
  if (!p) return null;
  const G = p.Glyph;
  return <G />;
}

/* /products/scores - BESPOKE, same section template as /products/signals but
   Scores-specific: the 0-to-100 dial is the signature illustration, and every
   mockup shows a score, its breakdown, its weights or the four setups. Copy is
   plain and sales-led (no "composite / deterministic / dimensions" jargon in
   prose; the API detail stays in the mockups). Alternating light/dark rhythm:
   hero (light) -> what's behind it (dark) -> setups (light) -> put to work
   (dark) -> FAQ (light) -> CTA (dark). */

/* ---------- Score dial (the signature illustration) ---------- */
function ScoreRing({ score, size = 64, stroke = 5 }: { score: number; size?: number; stroke?: number }) {
  const cx = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - score / 100);
  return (
    <svg className="oga-scr-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth={stroke} />
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text className="oga-scr-ring__num" x={cx} y={cx} dominantBaseline="central" textAnchor="middle" fontSize={Math.round(size * 0.32)}>
        {score}
      </text>
    </svg>
  );
}

/* ---------- Hero (light, floating score cards) ---------- */
const HERO_SCORES: { pc: string; place: string; slug: ProfileSlug; profile: string; score: number; top: { label: string; score: number }[] }[] = [
  { pc: "M1 1AE", place: "Manchester", slug: "moving", profile: "Moving", score: 58, top: [{ label: "Transport", score: 84 }, { label: "Amenities", score: 72 }] },
  { pc: "EC1A 1BB", place: "London", slug: "business", profile: "Business", score: 86, top: [{ label: "Transport access", score: 96 }, { label: "Foot traffic", score: 95 }] },
  { pc: "YO1 7PR", place: "York", slug: "research", profile: "Research", score: 70, top: [{ label: "Safety", score: 82 }, { label: "Environment", score: 76 }] },
];

function ScoresHero() {
  return (
    <section className="oga-scr-hero">
      <div className="oga-scr-hero__wash" aria-hidden />
      <div className="oga-scr-hero__dots" aria-hidden />

      <div className="oga-scr-hero__inner">
        <span className="oga-scr-hero__eyebrow">
          <ScoresIcon width={15} height={15} aria-hidden />
          Scores
        </span>
        <h1 className="oga-scr-hero__title">One clear score for every UK area.</h1>
        <p className="oga-scr-hero__lead">
          Turn everything we know about a neighbourhood into a single number from
          0 to 100. Pick one of four ready-made setups, or weight it your own way,
          and get the same trustworthy answer every time.
        </p>
        <div className="oga-scr-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            See how it&apos;s scored
          </Link>
        </div>
      </div>

      <div className="oga-scr-hero__stage" aria-hidden>
        <div className="oga-scr-hero__cards">
          {HERO_SCORES.map((s) => (
            <article key={s.pc} className="oga-scr-hcard">
              <div className="oga-scr-hcard__top">
                <span className="oga-scr-hcard__tag">
                  <span className="oga-scr-hcard__tag-glyph"><ProfileGlyph slug={s.slug} /></span>
                  {s.profile}
                </span>
                <span className="oga-scr-hcard__conf">
                  <span className="oga-scr-hcard__conf-dot" />
                  High confidence
                </span>
              </div>
              <div className="oga-scr-hcard__score">
                <ScoreRing score={s.score} size={66} />
                <div className="oga-scr-hcard__score-id">
                  <span className="oga-scr-hcard__pc">{s.pc}</span>
                  <span className="oga-scr-hcard__place">{s.place}</span>
                </div>
              </div>
              <ul className="oga-scr-hcard__dims">
                {s.top.map((d) => (
                  <li key={d.label} className="oga-scr-hcard__dim">
                    <span className="oga-scr-hcard__dim-k">{d.label}</span>
                    <span className="oga-scr-hcard__dim-v">{d.score}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 2 (dark): what's behind the number ---------- */
const BREAKDOWN: { label: string; score: number }[] = [
  { label: "Safety & Crime", score: 42 },
  { label: "Schools & Education", score: 68 },
  { label: "Transport & Commute", score: 84 },
  { label: "Daily Amenities", score: 72 },
  { label: "Cost of Living", score: 54 },
];

const CONF_ROWS: { label: string; score: number; conf: "High" | "Medium" }[] = [
  { label: "Transport & Commute", score: 84, conf: "High" },
  { label: "Schools & Education", score: 68, conf: "High" },
  { label: "Cost of Living", score: 54, conf: "Medium" },
];

const PROFILES: { slug: ProfileSlug; name: string; line: string }[] = [
  { slug: "moving", name: "Moving", line: "A neighbourhood to live in" },
  { slug: "business", name: "Business", line: "A place to open or trade" },
  { slug: "investing", name: "Investing", line: "A property worth buying" },
  { slug: "research", name: "Research", line: "A balanced, general read" },
];

function Behind() {
  return (
    <section className="oga-scr-feat" data-oga-surface="dark" aria-labelledby="scr-feat-title">
      <div className="oga-scr__wrap">
        <header className="oga-scr-feat__head">
          <h2 id="scr-feat-title" className="oga-scr-feat__h2">A score you can stand behind.</h2>
          <p className="oga-scr-feat__sub">
            No black box. Every number shows what it&apos;s built from, how sure we
            are, and gives you the same answer every single time.
          </p>
        </header>

        <div className="oga-scr-feat__grid">
          {/* Hero cell - the score and its reasons */}
          <article className="oga-scr-feat__card oga-scr-feat__card--hero">
            <div className="oga-scr-feat__card-body">
              <h3 className="oga-scr-feat__card-title">One number, and the reasons behind it.</h3>
              <p className="oga-scr-feat__card-desc">
                Every score opens up into the handful of things it&apos;s built
                from, so you always see why an area landed where it did.
              </p>
            </div>
            <div className="oga-scr-feat__mock">
              <div className="oga-scr-brk">
                <div className="oga-scr-brk__head">
                  <ScoreRing score={58} size={72} />
                  <div className="oga-scr-brk__head-txt">
                    <span className="oga-scr-brk__head-pc">M1 1AE · Manchester</span>
                    <span className="oga-scr-brk__head-prof">Moving setup</span>
                  </div>
                </div>
                <ul className="oga-scr-brk__list">
                  {BREAKDOWN.map((d) => (
                    <li key={d.label} className="oga-scr-brk__row">
                      <span className="oga-scr-brk__k">{d.label}</span>
                      <span className="oga-scr-brk__bar">
                        <span className="oga-scr-brk__fill" style={{ width: `${d.score}%` }} />
                      </span>
                      <span className="oga-scr-brk__v">{d.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          {/* Confidence */}
          <article className="oga-scr-feat__card">
            <div className="oga-scr-feat__card-body">
              <h3 className="oga-scr-feat__card-title">You know how sure we are.</h3>
              <p className="oga-scr-feat__card-desc">
                Every part of the score comes with a confidence level, so thin data
                never hides behind a confident-looking number.
              </p>
            </div>
            <div className="oga-scr-feat__mock">
              <ul className="oga-scr-clist">
                {CONF_ROWS.map((r) => (
                  <li key={r.label} className="oga-scr-clist__row">
                    <span className="oga-scr-clist__k">{r.label}</span>
                    <span className="oga-scr-clist__v">{r.score}</span>
                    <span className={`oga-scr-clist__conf oga-scr-clist__conf--${r.conf === "High" ? "hi" : "md"}`}>
                      <span className="oga-scr-clist__dot" />
                      {r.conf}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Same every time */}
          <article className="oga-scr-feat__card">
            <div className="oga-scr-feat__card-body">
              <h3 className="oga-scr-feat__card-title">The same answer, every time.</h3>
              <p className="oga-scr-feat__card-desc">
                Ask for the same area twice and you get the same score. Nothing
                drifts, so you can rely on it in front of a customer.
              </p>
            </div>
            <div className="oga-scr-feat__mock">
              <div className="oga-scr-same">
                <span className="oga-scr-same__label">M1 1AE · Moving</span>
                <div className="oga-scr-same__row"><span>Today</span><b>58</b></div>
                <div className="oga-scr-same__row"><span>Next month</span><b>58</b></div>
                <div className="oga-scr-same__note">
                  <span className="oga-scr-same__check" aria-hidden>✓</span>
                  Identical, tied to a version you can cite
                </div>
              </div>
            </div>
          </article>

          {/* Four setups (wide) */}
          <article className="oga-scr-feat__card oga-scr-feat__card--wide">
            <div className="oga-scr-feat__card-body">
              <h3 className="oga-scr-feat__card-title">Four setups, ready to go.</h3>
              <p className="oga-scr-feat__card-desc">
                Each one weighs up the things that matter for a different job, out of
                the box.
              </p>
            </div>
            <div className="oga-scr-feat__mock">
              <div className="oga-scr-profrow">
                {PROFILES.map((p) => (
                  <span key={p.name} className="oga-scr-profbadge">
                    <span className="oga-scr-profbadge__glyph"><ProfileGlyph slug={p.slug} /></span>
                    <span className="oga-scr-profbadge__txt">
                      <span className="oga-scr-profbadge__name">{p.name}</span>
                      <span className="oga-scr-profbadge__line">{p.line}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 3 (light): setups + your own recipe ---------- */
const DEFAULT_WEIGHTS: { label: string; w: number }[] = [
  { label: "Crime", w: 20 },
  { label: "Deprivation", w: 10 },
  { label: "Property", w: 20 },
  { label: "Schools", w: 20 },
  { label: "Amenities", w: 10 },
  { label: "Transport", w: 15 },
  { label: "Environment", w: 5 },
];

const CUSTOM_WEIGHTS: { label: string; w: number }[] = [
  { label: "Crime", w: 40 },
  { label: "Deprivation", w: 10 },
  { label: "Property", w: 15 },
  { label: "Schools", w: 10 },
  { label: "Amenities", w: 10 },
  { label: "Transport", w: 10 },
  { label: "Environment", w: 5 },
];

function Setups() {
  return (
    <section className="oga-scr-found" aria-labelledby="scr-found-title">
      <div className="oga-scr__wrap">
        <header className="oga-scr-found__head">
          <h2 id="scr-found-title" className="oga-scr-found__h2">Tuned to the way you actually work.</h2>
        </header>

        <div className="oga-scr-found__grid">
          {/* Pick a setup */}
          <div className="oga-scr-found__cell">
            <div className="oga-scr-found__panel">
              <div className="oga-scr-recipe">
                <div className="oga-scr-recipe__head">
                  <span className="oga-scr-recipe__title">
                    <span className="oga-scr-recipe__glyph"><ProfileGlyph slug="moving" /></span>
                    Moving setup
                  </span>
                  <span className="oga-scr-recipe__tag">Ready-made</span>
                </div>
                <ul className="oga-scr-recipe__list">
                  {DEFAULT_WEIGHTS.map((d) => (
                    <li key={d.label} className="oga-scr-recipe__row">
                      <span className="oga-scr-recipe__k">{d.label}</span>
                      <span className="oga-scr-recipe__w">{d.w}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <h3 className="oga-scr-found__cell-title">Pick the setup that fits the job.</h3>
            <p className="oga-scr-found__cell-desc">
              Moving home, choosing a business location, weighing up an investment
              or a general read. Each setup already weighs up the seven categories that
              matter most for that decision.
            </p>
          </div>

          {/* Build your own */}
          <div className="oga-scr-found__cell">
            <div className="oga-scr-found__panel">
              <div className="oga-scr-recipe">
                <div className="oga-scr-recipe__head">
                  <span className="oga-scr-recipe__title">Your recipe</span>
                  <span className="oga-scr-recipe__tag oga-scr-recipe__tag--saved">Saved to your team</span>
                </div>
                <ul className="oga-scr-recipe__list">
                  {CUSTOM_WEIGHTS.map((d) => (
                    <li key={d.label} className="oga-scr-recipe__row oga-scr-recipe__row--edit">
                      <span className="oga-scr-recipe__k">{d.label}</span>
                      <span className="oga-scr-recipe__bar">
                        <span className="oga-scr-recipe__fill" style={{ width: `${d.w * 2.2}%` }} />
                      </span>
                      <span className="oga-scr-recipe__w">{d.w}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <h3 className="oga-scr-found__cell-title">Or weight it your own way.</h3>
            <p className="oga-scr-found__cell-desc">
              Care more about safety than schools? Turn the dials. Save your mix once
              and your whole team scores every area the same way from then on.
            </p>
          </div>
        </div>

        <div className="oga-scr-found__band">
          <p className="oga-scr-found__band-text">
            One score, built from real public data, weighted the way you choose and
            the same every time. Everything you need to rank areas with confidence.
          </p>
          <div className="oga-scr-found__band-foot">
            <span className="oga-scr-found__band-note">0-100 · four setups · your own recipes</span>
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 4 (dark): put the score to work ---------- */
const RANK: { pc: string; place: string; score: number }[] = [
  { pc: "EC1A 1BB", place: "London", score: 86 },
  { pc: "M1 1AE", place: "Manchester", score: 71 },
  { pc: "B1 1AA", place: "Birmingham", score: 68 },
];

function ToWork() {
  return (
    <section className="oga-scr-flow" data-oga-surface="dark" aria-labelledby="scr-flow-title">
      <div className="oga-scr__wrap">
        <header className="oga-scr-flow__head">
          <h2 id="scr-flow-title" className="oga-scr-flow__h2">Put the score to work.</h2>
          <p className="oga-scr-flow__sub">
            Show it, rank on it, decide with it or match it to your own risk. One
            number that drops straight into the way you already work.
          </p>
        </header>

        <div className="oga-scr-flow__grid">
          {/* 1 - show a score */}
          <article className="oga-scr-flow__card">
            <div className="oga-scr-flow__mock">
              <div className="oga-scr-flow__panel oga-scr-badge">
                <div className="oga-scr-badge__row">
                  <span className="oga-scr-badge__pc">M21 9PN</span>
                  <span className="oga-scr-badge__place">Chorlton</span>
                </div>
                <div className="oga-scr-badge__score">
                  <ScoreRing score={72} size={54} />
                  <span className="oga-scr-badge__label">Area score</span>
                </div>
              </div>
            </div>
            <p className="oga-scr-flow__cap">Show a clear area score on any listing, application or dashboard.</p>
          </article>

          {/* 2 - rank areas */}
          <article className="oga-scr-flow__card">
            <div className="oga-scr-flow__mock">
              <div className="oga-scr-flow__panel oga-scr-rank">
                {RANK.map((r, i) => (
                  <div key={r.pc} className="oga-scr-rank__row">
                    <span className="oga-scr-rank__n">{i + 1}</span>
                    <span className="oga-scr-rank__pc">{r.pc}</span>
                    <span className="oga-scr-rank__place">{r.place}</span>
                    <span className="oga-scr-rank__score">{r.score}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="oga-scr-flow__cap">Rank and shortlist a whole list of areas in one go.</p>
          </article>

          {/* 3 - set a cut-off */}
          <article className="oga-scr-flow__card">
            <div className="oga-scr-flow__mock">
              <div className="oga-scr-flow__panel oga-scr-cut">
                <div className="oga-scr-cut__head"><span>Area score</span><b>58</b></div>
                <div className="oga-scr-cut__bar"><span className="oga-scr-cut__fill" /><span className="oga-scr-cut__mark" /></div>
                <div className="oga-scr-cut__flag">
                  <span className="oga-scr-cut__dot" />
                  Below your cut-off of 65
                </div>
              </div>
            </div>
            <p className="oga-scr-flow__cap">Set a pass mark and let the score flag what needs a closer look.</p>
          </article>

          {/* 4 - one recipe for the team (wide) */}
          <article className="oga-scr-flow__card oga-scr-flow__card--wide">
            <div className="oga-scr-flow__mock">
              <div className="oga-scr-flow__panel oga-scr-team">
                <div className="oga-scr-team__recipe">
                  <span className="oga-scr-team__recipe-name">Underwriting recipe</span>
                  <span className="oga-scr-team__recipe-tag">Locked</span>
                </div>
                <span className="oga-scr-team__arrow" aria-hidden>→</span>
                <div className="oga-scr-team__people">
                  <span className="oga-scr-team__avatars"><i /><i /><i /></span>
                  <span className="oga-scr-team__people-txt">Used by everyone in your org</span>
                </div>
              </div>
            </div>
            <p className="oga-scr-flow__cap">Agree one way of scoring and everyone on the team uses it, automatically.</p>
          </article>

          {/* 5 - one API call (wide) */}
          <article className="oga-scr-flow__card oga-scr-flow__card--wide">
            <div className="oga-scr-flow__mock">
              <div className="oga-scr-flow__panel oga-scr-flow__code">
                <div className="oga-scr-flow__code-tabs">
                  <span className="oga-scr-flow__code-tab oga-scr-flow__code-tab--on">REST</span>
                  <span className="oga-scr-flow__code-tab">MCP</span>
                </div>
                <pre className="oga-scr-flow__code-body">{`POST /v1/score
{ "area": "M1 1AE", "preset": "moving" }

200 → score 58 · engine v1.1.0`}</pre>
              </div>
            </div>
            <p className="oga-scr-flow__cap">Get a score from one API call, or ask in plain English through Claude.</p>
          </article>
        </div>

        <footer className="oga-scr-flow__foot">
          <p className="oga-scr-flow__foot-text">
            One number your whole team can agree on, defend to a regulator and drop
            straight into the product.
          </p>
          <div className="oga-scr-flow__foot-ctas">
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
            <Link href="/methodology" className="oga-btn oga-btn-secondary">See how it&apos;s scored</Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

/* ---------- FAQ (light) ---------- */
const FAQ: { q: string; a: string }[] = [
  {
    q: "How is the score worked out?",
    a: "We take the public data about an area, look at the handful of things that matter for what you're deciding, weigh them up and turn it into one number from 0 to 100.",
  },
  {
    q: "What are the four setups?",
    a: "Moving home, choosing a business location, weighing up an investment, and a general research read. Each one focuses on the seven categories that matter most for that job.",
  },
  {
    q: "Can I change what the score cares about?",
    a: "Yes. Turn the dials to weight things your own way for a single request, or save your mix as a recipe so your whole team scores every area the same way.",
  },
  {
    q: "Does an AI decide the score?",
    a: "No. It's worked out the same way every time from the data underneath, so there's no black box and nothing quietly changes on you.",
  },
  {
    q: "Will the same area always get the same score?",
    a: "Yes, as long as the setup is the same. Every score is tied to a published version you can point back to, which matters when you have to defend a decision.",
  },
  {
    q: "Do I get to see why an area scored the way it did?",
    a: "Always. Every score opens up into its seven parts, how much each one counted, and how confident we are in each.",
  },
  {
    q: "How do I use it?",
    a: "One API call gives you the score and its breakdown. Or book a demo and we'll run it on your own areas.",
  },
];

function Faq() {
  return (
    <section className="oga-scr-faq" aria-labelledby="scr-faq-title">
      <div className="oga-scr__wrap oga-scr-faq__grid">
        <div className="oga-scr-faq__aside">
          <div className="oga-scr__eyebrow">
            <span className="oga-scr__eyebrow-mark" aria-hidden />
            <span>FAQ</span>
          </div>
          <h2 id="scr-faq-title" className="oga-scr-faq__h2">Scores, answered.</h2>
          <p className="oga-scr-faq__note">
            Still weighing it up?{" "}
            <Link href="/methodology" className="oga-scr-faq__link">See how it&apos;s scored</Link>.
          </p>
        </div>

        <div className="oga-scr-faq__list">
          {FAQ.map((item) => (
            <details key={item.q} className="oga-scr-faq__item">
              <summary className="oga-scr-faq__q">
                <span>{item.q}</span>
                <span className="oga-scr-faq__icon" aria-hidden />
              </summary>
              <div className="oga-scr-faq__a">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA (dark) ---------- */
function FinalCta() {
  return (
    <section className="oga-scr-cta" data-oga-surface="dark" aria-labelledby="scr-cta">
      <div className="oga-scr-cta__field" aria-hidden />
      <div className="oga-scr-cta__inner">
        <h2 id="scr-cta" className="oga-scr-cta__h2">One score your whole team can stand behind.</h2>
        <p className="oga-scr-cta__lead">
          Rank any UK area 0 to 100, weighted the way you work and the same every
          time. Ready to show a customer or defend to a regulator.
        </p>
        <div className="oga-scr-cta__ctas">
          <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">See how it&apos;s scored</Link>
        </div>
      </div>
    </section>
  );
}

export default function ProductScoresClient() {
  return (
    <div className="oga-root oga-scr">
      <Nav />
      <ScoresHero />
      <Behind />
      <Setups />
      <ToWork />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
