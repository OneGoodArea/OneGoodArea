"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { IntelligenceIcon } from "../../_shared/product-icons";
import { BookDemo } from "../../_shared/book-demo";
import "./intelligence.css";

/* /products/intelligence - BESPOKE, same section template as the other products
   but Intelligence-specific: the signature is "the console" - a plain-English
   question turned into a real query, answered by the data. The pitch is "AI as
   the interface, the data as the answer": the AI writes the query, the numbers
   come straight from the data, never invented. Copy is plain and sales-led (no
   "Zod grammar / plan ops / planner accuracy" jargon in prose; the query detail
   stays in the mockups). Alternating light/dark rhythm. */

/* ---------- Hero (light, floating query cards) ---------- */
type Query = { q: string; rows: { area: string; val: string }[] };
const HERO_QUERIES: Query[] = [
  {
    q: "Which areas are cheap, safe and rising?",
    rows: [
      { area: "Manchester · M1", val: "+18.4%" },
      { area: "Birmingham · B1", val: "+14.6%" },
      { area: "Leeds · LS1", val: "+12.9%" },
    ],
  },
  {
    q: "Which areas are most like M1 1AE?",
    rows: [
      { area: "Manchester · NQ", val: "98% match" },
      { area: "Birmingham · Digbeth", val: "96% match" },
      { area: "Leeds · Hunslet", val: "95% match" },
    ],
  },
  {
    q: "Where is crime unusually high?",
    rows: [
      { area: "Birmingham · B9", val: "Flagged" },
      { area: "Manchester · M12", val: "Flagged" },
      { area: "Sheffield · S4", val: "Flagged" },
    ],
  },
];

function IntelligenceHero() {
  return (
    <section className="oga-int-hero">
      <div className="oga-int-hero__wash" aria-hidden />
      <div className="oga-int-hero__dots" aria-hidden />

      <div className="oga-int-hero__inner">
        <span className="oga-int-hero__eyebrow">
          <IntelligenceIcon width={15} height={15} aria-hidden />
          Intelligence
        </span>
        <h1 className="oga-int-hero__title">Ask your area data anything.</h1>
        <p className="oga-int-hero__lead">
          Ask a question the way you&apos;d say it out loud, &quot;which areas are
          cheap, safe and rising?&quot;, and get a clear, checkable answer back.
          The AI works out what you meant. The numbers come straight from the
          data, never made up.
        </p>
        <div className="oga-int-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            See how it works
          </Link>
        </div>
      </div>

      <div className="oga-int-hero__stage" aria-hidden>
        <div className="oga-int-hero__cards">
          {HERO_QUERIES.map((query) => (
            <article key={query.q} className="oga-int-hcard">
              <div className="oga-int-hcard__ask">
                <span className="oga-int-hcard__ask-mark" aria-hidden />
                Ask
              </div>
              <p className="oga-int-hcard__q">{query.q}</p>
              <ul className="oga-int-hcard__rows">
                {query.rows.map((r, i) => (
                  <li key={r.area} className="oga-int-hcard__row">
                    <span className="oga-int-hcard__n">{i + 1}</span>
                    <span className="oga-int-hcard__area">{r.area}</span>
                    <span className="oga-int-hcard__val">{r.val}</span>
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

/* ---------- Section 2 (dark): how it works + why you can trust it ---------- */
const OPS: { name: string; ex: string }[] = [
  { name: "Rank areas", ex: "cheapest, safest, rising" },
  { name: "Find similar", ex: "areas like this one" },
  { name: "Spot outliers", ex: "unusually high or low" },
  { name: "Forecast", ex: "where it's heading" },
];

function HowItWorks() {
  return (
    <section className="oga-int-feat" data-oga-surface="dark" aria-labelledby="int-feat-title">
      <div className="oga-int__wrap">
        <header className="oga-int-feat__head">
          <h2 id="int-feat-title" className="oga-int-feat__h2">The AI is the interface. The data is the answer.</h2>
          <p className="oga-int-feat__sub">
            You ask in plain English. The AI works out the question. The numbers
            come straight from the data, so you get an answer you can actually
            check, not a guess.
          </p>
        </header>

        <div className="oga-int-feat__grid">
          {/* Hero cell - the console (question -> query -> answer) */}
          <article className="oga-int-feat__card oga-int-feat__card--hero">
            <div className="oga-int-feat__card-body">
              <h3 className="oga-int-feat__card-title">Your words become a real query.</h3>
              <p className="oga-int-feat__card-desc">
                Ask it however you like. The AI turns your question into an exact
                query, and the data answers it.
              </p>
            </div>
            <div className="oga-int-feat__mock">
              <div className="oga-int-console">
                <div className="oga-int-console__stage">
                  <span className="oga-int-console__label">You ask</span>
                  <p className="oga-int-console__q">&quot;Which areas are cheap, safe and rising?&quot;</p>
                </div>
                <div className="oga-int-console__stage">
                  <div className="oga-int-console__step">the AI writes the query</div>
                  <div className="oga-int-console__plan">
                    <span className="oga-int-console__plan-op">rank areas</span>
                    <div className="oga-int-console__plan-rows">
                      <div className="oga-int-console__plan-row"><span>price</span><span>≤ £250,000</span></div>
                      <div className="oga-int-console__plan-row"><span>change</span><span>rising</span></div>
                      <div className="oga-int-console__plan-row"><span>crime</span><span>bottom 25%</span></div>
                      <div className="oga-int-console__plan-row"><span>sort by</span><span>price change ↓</span></div>
                      <div className="oga-int-console__plan-row"><span>limit</span><span>5</span></div>
                    </div>
                  </div>
                </div>
                <div className="oga-int-console__stage">
                  <div className="oga-int-console__step">the data answers</div>
                  <ul className="oga-int-console__results">
                    <li className="oga-int-console__res"><span className="oga-int-console__res-n">1</span><span className="oga-int-console__res-a">Manchester · M1</span><span className="oga-int-console__res-v">+18.4%</span></li>
                    <li className="oga-int-console__res"><span className="oga-int-console__res-n">2</span><span className="oga-int-console__res-a">Birmingham · B1</span><span className="oga-int-console__res-v">+14.6%</span></li>
                    <li className="oga-int-console__res"><span className="oga-int-console__res-n">3</span><span className="oga-int-console__res-a">Leeds · LS1</span><span className="oga-int-console__res-v">+12.9%</span></li>
                    <li className="oga-int-console__res"><span className="oga-int-console__res-n">4</span><span className="oga-int-console__res-a">Newcastle · NE1</span><span className="oga-int-console__res-v">+11.2%</span></li>
                    <li className="oga-int-console__res"><span className="oga-int-console__res-n">5</span><span className="oga-int-console__res-a">Sheffield · S1</span><span className="oga-int-console__res-v">+10.4%</span></li>
                  </ul>
                </div>
                <div className="oga-int-console__foot">
                  <span className="oga-int-console__foot-check" aria-hidden>✓</span>
                  Ask it again tomorrow, same five areas
                </div>
              </div>
            </div>
          </article>

          {/* AI plans, data answers */}
          <article className="oga-int-feat__card">
            <div className="oga-int-feat__card-body">
              <h3 className="oga-int-feat__card-title">The AI never sets the numbers.</h3>
              <p className="oga-int-feat__card-desc">
                It reads your question and nothing more. The figures come from the
                data itself, so nothing is invented.
              </p>
            </div>
            <div className="oga-int-feat__mock">
              <div className="oga-int-split">
                <div className="oga-int-split__part">
                  <span className="oga-int-split__k">The AI</span>
                  <span className="oga-int-split__v">Reads your question, writes the query</span>
                </div>
                <div className="oga-int-split__part">
                  <span className="oga-int-split__k">The data</span>
                  <span className="oga-int-split__v">Produces the numbers</span>
                </div>
              </div>
            </div>
          </article>

          {/* Shows its working */}
          <article className="oga-int-feat__card">
            <div className="oga-int-feat__card-body">
              <h3 className="oga-int-feat__card-title">Every answer shows its working.</h3>
              <p className="oga-int-feat__card-desc">
                You get back the exact query that ran, so you can check it, trust it
                and run it again whenever you like.
              </p>
            </div>
            <div className="oga-int-feat__mock">
              <div className="oga-int-echo">
                <div className="oga-int-echo__label">The exact query it ran</div>
                <pre className="oga-int-echo__code">{`rank areas
  price   ≤ £250,000
  change  rising
  crime   bottom 25%`}</pre>
              </div>
            </div>
          </article>

          {/* Four kinds of question (wide) */}
          <article className="oga-int-feat__card oga-int-feat__card--wide">
            <div className="oga-int-feat__card-body">
              <h3 className="oga-int-feat__card-title">Four kinds of question.</h3>
              <p className="oga-int-feat__card-desc">
                Rank them, find the lookalikes, catch the odd ones out or look ahead.
              </p>
            </div>
            <div className="oga-int-feat__mock">
              <div className="oga-int-ops">
                {OPS.map((o) => (
                  <span key={o.name} className="oga-int-op">
                    <span className="oga-int-op__name">{o.name}</span>
                    <span className="oga-int-op__ex">{o.ex}</span>
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

/* ---------- Section 3 (light): flexible in, dependable out ---------- */
function Flexible() {
  return (
    <section className="oga-int-found" aria-labelledby="int-found-title">
      <div className="oga-int__wrap">
        <header className="oga-int-found__head">
          <h2 id="int-found-title" className="oga-int-found__h2">Ask it your way. Get the same answer.</h2>
        </header>

        <div className="oga-int-found__grid">
          {/* Words or JSON */}
          <div className="oga-int-found__cell">
            <div className="oga-int-found__panel">
              <div className="oga-int-inputs">
                <div className="oga-int-inputs__nl">
                  <span className="oga-int-inputs__label">In words</span>
                  <span className="oga-int-inputs__nl-q">&quot;Areas like M1 1AE&quot;</span>
                </div>
                <div className="oga-int-inputs__or"><span>or</span></div>
                <pre className="oga-int-inputs__json">{`{ "find": "similar",
  "to": "M1 1AE" }`}</pre>
              </div>
            </div>
            <h3 className="oga-int-found__cell-title">Ask in words, or send it as code.</h3>
            <p className="oga-int-found__cell-desc">
              Type a plain-English question, or send a structured request straight
              from your app. Either way, the same answer comes back.
            </p>
          </div>

          {/* Replays as code */}
          <div className="oga-int-found__cell">
            <div className="oga-int-found__panel">
              <div className="oga-int-replay">
                <div className="oga-int-replay__q">&quot;Which areas are cheap, safe and rising?&quot;</div>
                <div className="oga-int-replay__arrow" aria-hidden>↓</div>
                <div className="oga-int-replay__code">
                  <span className="oga-int-replay__code-label">Saved query</span>
                  <span className="oga-int-replay__code-op">rank areas · same rules, any time</span>
                </div>
                <div className="oga-int-replay__note">
                  <span className="oga-int-replay__check" aria-hidden>✓</span>
                  Runs the same, with or without the AI
                </div>
              </div>
            </div>
            <h3 className="oga-int-found__cell-title">Every answer replays as code.</h3>
            <p className="oga-int-found__cell-desc">
              Ask once in English and keep the query. From then on it runs the same
              way every time, no AI in the loop, so you can wire it into anything.
            </p>
          </div>
        </div>

        <div className="oga-int-found__band">
          <p className="oga-int-found__band-text">
            Ask hard questions of UK area data in plain English, and get back an
            answer you can check, trust and automate.
          </p>
          <div className="oga-int-found__band-foot">
            <span className="oga-int-found__band-note">ask · check · replay</span>
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 4 (dark): put it to work ---------- */
function ToWork() {
  return (
    <section className="oga-int-flow" data-oga-surface="dark" aria-labelledby="int-flow-title">
      <div className="oga-int__wrap">
        <header className="oga-int-flow__head">
          <h2 id="int-flow-title" className="oga-int-flow__h2">Put the questions to work.</h2>
          <p className="oga-int-flow__sub">
            Shortlist, compare, catch the outliers or look ahead, from your app or
            straight from Claude.
          </p>
        </header>

        <div className="oga-int-flow__grid">
          {/* 1 - shortlist */}
          <article className="oga-int-flow__card">
            <div className="oga-int-flow__mock">
              <div className="oga-int-flow__panel oga-int-mini">
                <span className="oga-int-mini__q">&quot;Cheapest rising areas?&quot;</span>
                <ul className="oga-int-mini__rows">
                  <li><span>Manchester · M1</span><b>+18.4%</b></li>
                  <li><span>Birmingham · B1</span><b>+14.6%</b></li>
                </ul>
              </div>
            </div>
            <p className="oga-int-flow__cap">Build a shortlist of areas that fit a set of rules, in one question.</p>
          </article>

          {/* 2 - find similar */}
          <article className="oga-int-flow__card">
            <div className="oga-int-flow__mock">
              <div className="oga-int-flow__panel oga-int-mini">
                <span className="oga-int-mini__q">&quot;Areas like M1 1AE?&quot;</span>
                <ul className="oga-int-mini__rows">
                  <li><span>Manchester · NQ</span><b>98%</b></li>
                  <li><span>Birmingham · Digbeth</span><b>96%</b></li>
                </ul>
              </div>
            </div>
            <p className="oga-int-flow__cap">Find the areas that look most like one you already know.</p>
          </article>

          {/* 3 - spot outliers */}
          <article className="oga-int-flow__card">
            <div className="oga-int-flow__mock">
              <div className="oga-int-flow__panel oga-int-mini">
                <span className="oga-int-mini__q">&quot;Anything unusual?&quot;</span>
                <ul className="oga-int-mini__rows">
                  <li><span>Birmingham · B9</span><b className="oga-int-mini__flag">Outlier</b></li>
                  <li><span>Manchester · M12</span><b className="oga-int-mini__flag">Outlier</b></li>
                </ul>
              </div>
            </div>
            <p className="oga-int-flow__cap">Catch the areas that stand out from their peers before they surprise you.</p>
          </article>

          {/* 4 - forecast (wide) */}
          <article className="oga-int-flow__card oga-int-flow__card--wide">
            <div className="oga-int-flow__mock">
              <div className="oga-int-flow__panel oga-int-fore">
                <div className="oga-int-fore__q">&quot;Where are M1 1AE prices heading?&quot;</div>
                <div className="oga-int-fore__body">
                  <svg className="oga-int-fore__chart" viewBox="0 0 220 60" fill="none" aria-hidden>
                    <path d="M4 46 L44 42 L84 38 L124 30" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M124 30 L164 24 L204 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 4" opacity="0.6" />
                    <circle cx="124" cy="30" r="2.4" fill="currentColor" />
                    <circle cx="204" cy="16" r="2.4" fill="currentColor" />
                  </svg>
                  <div className="oga-int-fore__val">
                    <span className="oga-int-fore__val-n">+6.2%</span>
                    <span className="oga-int-fore__val-l">projected · next 12 months</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="oga-int-flow__cap">Look ahead at where a signal is trending, with the recent history behind it.</p>
          </article>

          {/* 5 - code / mcp (wide) */}
          <article className="oga-int-flow__card oga-int-flow__card--wide">
            <div className="oga-int-flow__mock">
              <div className="oga-int-flow__panel oga-int-flow__code">
                <div className="oga-int-flow__code-tabs">
                  <span className="oga-int-flow__code-tab oga-int-flow__code-tab--on">REST</span>
                  <span className="oga-int-flow__code-tab">MCP</span>
                </div>
                <pre className="oga-int-flow__code-body">{`POST /v1/query
{ "ask": "cheap, safe, rising areas" }

200 → 5 areas · query echoed back`}</pre>
              </div>
            </div>
            <p className="oga-int-flow__cap">Ask from one API call, or straight from Claude in plain English.</p>
          </article>
        </div>

        <footer className="oga-int-flow__foot">
          <p className="oga-int-flow__foot-text">
            The hard questions about UK areas, answered in seconds, in a form you
            can check and build on.
          </p>
          <div className="oga-int-flow__foot-ctas">
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
            <Link href="/methodology" className="oga-btn oga-btn-secondary">See how it works</Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

/* ---------- FAQ (light) ---------- */
const FAQ: { q: string; a: string }[] = [
  {
    q: "What can I ask it?",
    a: "Things like which areas are cheapest and rising, which areas look like one you know, where something stands out from the norm, and where a trend is heading.",
  },
  {
    q: "Does the AI make up the numbers?",
    a: "No. The AI only works out what your question means and writes the query. Every number comes straight from the data, so nothing is invented.",
  },
  {
    q: "How do I know the answer is right?",
    a: "Every answer comes back with the exact query that produced it, so you can see what was asked, check it, and run it again yourself.",
  },
  {
    q: "Do I have to write in plain English?",
    a: "No. Ask in words, or send a structured request straight from your app. Either way you get the same answer back.",
  },
  {
    q: "Will the same question give the same answer?",
    a: "Yes. Once a question becomes a query, it runs the same way every time, with no AI in the loop, so you can rely on it and automate it.",
  },
  {
    q: "Is this a chatbot?",
    a: "No. You get real, typed results you can act on and build with, not a paragraph of text you have to double-check.",
  },
  {
    q: "How do I use it?",
    a: "Ask in the playground, call it with one API request, or ask straight from Claude. Or book a demo and we'll run your own questions.",
  },
];

function Faq() {
  return (
    <section className="oga-int-faq" aria-labelledby="int-faq-title">
      <div className="oga-int__wrap oga-int-faq__grid">
        <div className="oga-int-faq__aside">
          <div className="oga-int__eyebrow">
            <span className="oga-int__eyebrow-mark" aria-hidden />
            <span>FAQ</span>
          </div>
          <h2 id="int-faq-title" className="oga-int-faq__h2">Intelligence, answered.</h2>
          <p className="oga-int-faq__note">
            Want the detail?{" "}
            <Link href="/methodology" className="oga-int-faq__link">See how it works</Link>.
          </p>
        </div>

        <div className="oga-int-faq__list">
          {FAQ.map((item) => (
            <details key={item.q} className="oga-int-faq__item">
              <summary className="oga-int-faq__q">
                <span>{item.q}</span>
                <span className="oga-int-faq__icon" aria-hidden />
              </summary>
              <div className="oga-int-faq__a">{item.a}</div>
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
    <section className="oga-int-cta" data-oga-surface="dark" aria-labelledby="int-cta">
      <div className="oga-int-cta__field" aria-hidden />
      <div className="oga-int-cta__inner">
        <h2 id="int-cta" className="oga-int-cta__h2">Ask the hard questions. Get answers you can trust.</h2>
        <p className="oga-int-cta__lead">
          Put plain-English questions to UK area data and get back clear, checkable
          answers, ready to act on and build with.
        </p>
        <div className="oga-int-cta__ctas">
          <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">See how it works</Link>
        </div>
      </div>
    </section>
  );
}

export default function ProductIntelligenceClient() {
  return (
    <div className="oga-root oga-int">
      <Nav />
      <IntelligenceHero />
      <HowItWorks />
      <Flexible />
      <ToWork />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
