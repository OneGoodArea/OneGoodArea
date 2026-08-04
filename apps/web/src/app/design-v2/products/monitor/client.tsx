"use client";

import Link from "next/link";
import { Nav } from "../../_shared/nav";
import { Footer } from "../../_shared/footer";
import { MonitorIcon } from "../../_shared/product-icons";
import { BookDemo } from "../../_shared/book-demo";
import "./monitor.css";

/* /products/monitor - BESPOKE, same section template as the other products but
   Monitor-specific: the signature is "the watch" - change/alert cards, a
   materiality filter that holds back noise, and signed delivery. Copy is plain
   and sales-led (no "HMAC / threshold / sample-size gate" jargon in prose; the
   API detail stays in the mockups). Alternating light/dark rhythm. */

/* ---------- Hero (light, floating change cards) ---------- */
type Change = {
  pc: string; place: string; sig: string;
  from: string; to: string; pct: string;
  status: "alert" | "held"; note: string;
};
const HERO_CHANGES: Change[] = [
  { pc: "M1 1AE", place: "Manchester", sig: "Median price", from: "£182,500", to: "£196,300", pct: "+7.6%", status: "alert", note: "Alert sent" },
  { pc: "B1 1AA", place: "Birmingham", sig: "Recorded crime", from: "4,108", to: "4,512", pct: "+9.8%", status: "alert", note: "Alert sent" },
  { pc: "NE1 7RU", place: "Newcastle", sig: "Median price", from: "£148,000", to: "£217,500", pct: "+47%", status: "held", note: "Held back · too few sales" },
];

function MonitorHero() {
  return (
    <section className="oga-mon-hero">
      <div className="oga-mon-hero__wash" aria-hidden />
      <div className="oga-mon-hero__dots" aria-hidden />

      <div className="oga-mon-hero__inner">
        <span className="oga-mon-hero__eyebrow">
          <MonitorIcon width={15} height={15} aria-hidden />
          Monitor
        </span>
        <h1 className="oga-mon-hero__title">Know the moment an area moves.</h1>
        <p className="oga-mon-hero__lead">
          Save the areas you care about and we&apos;ll keep watch. When something
          real shifts, prices jump, crime climbs, a rating changes, you hear about
          it straight away. Only the moves that matter, so you&apos;re never buried
          in noise.
        </p>
        <div className="oga-mon-hero__ctas">
          <Link href="/playground" className="oga-btn oga-btn-primary">
            Try in the playground
            <span aria-hidden>→</span>
          </Link>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            See how alerts work
          </Link>
        </div>
      </div>

      <div className="oga-mon-hero__stage" aria-hidden>
        <div className="oga-mon-hero__cards">
          {HERO_CHANGES.map((c) => (
            <article key={c.pc} className="oga-mon-hcard">
              <div className="oga-mon-hcard__top">
                <span className="oga-mon-hcard__tag">Lending book</span>
                <span className={`oga-mon-hcard__ind oga-mon-hcard__ind--${c.status === "alert" ? "up" : "flat"}`}>
                  {c.status === "alert" ? "↑" : "–"}
                </span>
              </div>
              <div className="oga-mon-hcard__id">
                <span className="oga-mon-hcard__pc">{c.pc}</span>
                <span className="oga-mon-hcard__place">{c.place}</span>
              </div>
              <div className="oga-mon-hcard__change">
                <span className="oga-mon-hcard__sig">{c.sig}</span>
                <div className="oga-mon-hcard__vals">
                  <span>{c.from}</span>
                  <span className="oga-mon-hcard__arrow">→</span>
                  <span>{c.to}</span>
                  <span className="oga-mon-hcard__pct">{c.pct}</span>
                </div>
              </div>
              <div className={`oga-mon-hcard__status oga-mon-hcard__status--${c.status}`}>
                <span className="oga-mon-hcard__status-dot" />
                {c.note}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 2 (dark): only what matters, and you can trust it ---------- */
const REPORT: { area: string; sig: string; pct: string; status: "alert" | "held"; note: string }[] = [
  { area: "M1 1AE", sig: "Median price", pct: "+7.6%", status: "alert", note: "Alerted" },
  { area: "B1 1AA", sig: "Recorded crime", pct: "+9.8%", status: "alert", note: "Alerted" },
  { area: "LS1 4DT", sig: "Median price", pct: "+2.6%", status: "held", note: "Below your threshold" },
  { area: "NE1 7RU", sig: "Median price", pct: "+47%", status: "held", note: "Too few sales" },
];

const KNOBS: { k: string; v: string }[] = [
  { k: "Compare to", v: "Last month" },
  { k: "Only moves over", v: "5%" },
  { k: "Ignore under", v: "8 sales" },
];

function Trust() {
  return (
    <section className="oga-mon-feat" data-oga-surface="dark" aria-labelledby="mon-feat-title">
      <div className="oga-mon__wrap">
        <header className="oga-mon-feat__head">
          <h2 id="mon-feat-title" className="oga-mon-feat__h2">Only the moves that matter.</h2>
          <p className="oga-mon-feat__sub">
            We watch the numbers month to month, hold back the noise, and only tell
            you when something genuinely changed, in a form your systems can trust.
          </p>
        </header>

        <div className="oga-mon-feat__grid">
          {/* Hero cell - the filtered change report */}
          <article className="oga-mon-feat__card oga-mon-feat__card--hero">
            <div className="oga-mon-feat__card-body">
              <h3 className="oga-mon-feat__card-title">The noise stays out.</h3>
              <p className="oga-mon-feat__card-desc">
                We compare each area to the month before and only surface the moves
                big enough to act on. A 47% jump built on two sales never reaches
                you.
              </p>
            </div>
            <div className="oga-mon-feat__mock">
              <div className="oga-mon-report">
                {REPORT.map((r) => (
                  <div key={r.area} className={`oga-mon-report__row oga-mon-report__row--${r.status}`}>
                    <div className="oga-mon-report__area">
                      <span className="oga-mon-report__pc">{r.area}</span>
                      <span className="oga-mon-report__sig">{r.sig}</span>
                    </div>
                    <span className="oga-mon-report__pct">{r.pct}</span>
                    <span className={`oga-mon-report__status oga-mon-report__status--${r.status}`}>
                      <span className="oga-mon-report__dot" />
                      {r.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* See exactly what shifted */}
          <article className="oga-mon-feat__card">
            <div className="oga-mon-feat__card-body">
              <h3 className="oga-mon-feat__card-title">See exactly what shifted.</h3>
              <p className="oga-mon-feat__card-desc">
                Every change shows the value before, the value after and the periods
                compared. No guessing what moved.
              </p>
            </div>
            <div className="oga-mon-feat__mock">
              <div className="oga-mon-detail">
                <div className="oga-mon-detail__head">
                  <span className="oga-mon-detail__sig">Median price</span>
                  <span className="oga-mon-detail__area">M1 1AE</span>
                </div>
                <div className="oga-mon-detail__vals">
                  <span className="oga-mon-detail__from">£182,500</span>
                  <span className="oga-mon-detail__arrow" aria-hidden>→</span>
                  <span className="oga-mon-detail__to">£196,300</span>
                </div>
                <div className="oga-mon-detail__foot">
                  <span>Mar → Apr 2026</span>
                  <span className="oga-mon-detail__pct">+7.6%</span>
                </div>
              </div>
            </div>
          </article>

          {/* Signed */}
          <article className="oga-mon-feat__card">
            <div className="oga-mon-feat__card-body">
              <h3 className="oga-mon-feat__card-title">Signed, so you know it&apos;s real.</h3>
              <p className="oga-mon-feat__card-desc">
                Each alert is signed, so your systems can check it genuinely came
                from us before acting on it.
              </p>
            </div>
            <div className="oga-mon-feat__mock">
              <div className="oga-mon-hook">
                <div className="oga-mon-hook__code">POST /your/webhook</div>
                <div className="oga-mon-hook__code oga-mon-hook__code--dim">Signature: t=1748…, v1=9f2a…</div>
                <div className="oga-mon-hook__verify">
                  <span className="oga-mon-hook__check" aria-hidden>✓</span>
                  Verified, safe to act on
                </div>
              </div>
            </div>
          </article>

          {/* Knobs (wide) */}
          <article className="oga-mon-feat__card oga-mon-feat__card--wide">
            <div className="oga-mon-feat__card-body">
              <h3 className="oga-mon-feat__card-title">You set what counts.</h3>
              <p className="oga-mon-feat__card-desc">
                Decide what &quot;a real move&quot; means for you, and we hold everything else back.
              </p>
            </div>
            <div className="oga-mon-feat__mock">
              <div className="oga-mon-knobs">
                {KNOBS.map((k) => (
                  <div key={k.k} className="oga-mon-knob">
                    <span className="oga-mon-knob__k">{k.k}</span>
                    <span className="oga-mon-knob__v">{k.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 3 (light): watch a book, hear the changes ---------- */
const BOOK: { pc: string; place: string }[] = [
  { pc: "M1 1AE", place: "Manchester" },
  { pc: "B1 1AA", place: "Birmingham" },
  { pc: "LS1 4DT", place: "Leeds" },
  { pc: "NE1 7RU", place: "Newcastle" },
];

function Watch() {
  return (
    <section className="oga-mon-found" aria-labelledby="mon-found-title">
      <div className="oga-mon__wrap">
        <header className="oga-mon-found__head">
          <h2 id="mon-found-title" className="oga-mon-found__h2">Watch a book. Hear about the changes.</h2>
        </header>

        <div className="oga-mon-found__grid">
          {/* Watch a book */}
          <div className="oga-mon-found__cell">
            <div className="oga-mon-found__panel">
              <div className="oga-mon-book">
                <div className="oga-mon-book__head">
                  <span className="oga-mon-book__title">Lending book</span>
                  <span className="oga-mon-book__count">210 areas watched</span>
                </div>
                <ul className="oga-mon-book__list">
                  {BOOK.map((a) => (
                    <li key={a.pc} className="oga-mon-book__row">
                      <span className="oga-mon-book__dot" />
                      <span className="oga-mon-book__pc">{a.pc}</span>
                      <span className="oga-mon-book__place">{a.place}</span>
                    </li>
                  ))}
                  <li className="oga-mon-book__more">+ 206 more</li>
                </ul>
              </div>
            </div>
            <h3 className="oga-mon-found__cell-title">Keep a whole book under watch.</h3>
            <p className="oga-mon-found__cell-desc">
              Save hundreds of areas at once, a lending book, a store estate, a
              research panel, and keep the lot under watch without lifting a finger.
            </p>
          </div>

          {/* Alerts land where you work */}
          <div className="oga-mon-found__cell">
            <div className="oga-mon-found__panel">
              <div className="oga-mon-deliver">
                <div className="oga-mon-deliver__src">
                  <span className="oga-mon-deliver__src-dot" />
                  Change detected · M1 1AE
                </div>
                <span className="oga-mon-deliver__arrow" aria-hidden>↓</span>
                <ul className="oga-mon-deliver__dest">
                  <li className="oga-mon-deliver__row"><span>Your webhook</span><span className="oga-mon-deliver__ok">Delivered</span></li>
                  <li className="oga-mon-deliver__row"><span>#risk-alerts</span><span className="oga-mon-deliver__ok">Delivered</span></li>
                </ul>
              </div>
            </div>
            <h3 className="oga-mon-found__cell-title">Alerts land where you already work.</h3>
            <p className="oga-mon-found__cell-desc">
              Changes arrive as a message straight to your own systems, your app,
              your Slack, your inbox, the moment they happen. Nothing new to check.
            </p>
          </div>
        </div>

        <div className="oga-mon-found__band">
          <p className="oga-mon-found__band-text">
            Save the areas that matter, tell us what counts as a real move, and get
            a trustworthy heads-up the moment one happens.
          </p>
          <div className="oga-mon-found__band-foot">
            <span className="oga-mon-found__band-note">watch · filter · signed alerts</span>
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section 4 (dark): put the watch to work ---------- */
function ToWork() {
  return (
    <section className="oga-mon-flow" data-oga-surface="dark" aria-labelledby="mon-flow-title">
      <div className="oga-mon__wrap">
        <header className="oga-mon-flow__head">
          <h2 id="mon-flow-title" className="oga-mon-flow__h2">Put the watch to work.</h2>
          <p className="oga-mon-flow__sub">
            Watch a book, get pinged when it matters, on your terms and in your own
            tools.
          </p>
        </header>

        <div className="oga-mon-flow__grid">
          {/* 1 - watch a book */}
          <article className="oga-mon-flow__card">
            <div className="oga-mon-flow__mock">
              <div className="oga-mon-flow__panel oga-mon-watch">
                <span className="oga-mon-watch__eye" aria-hidden>
                  <MonitorIcon width={22} height={22} />
                </span>
                <span className="oga-mon-watch__n">210</span>
                <span className="oga-mon-watch__label">areas under watch</span>
              </div>
            </div>
            <p className="oga-mon-flow__cap">Watch a lending book, a store estate or a research panel in one place.</p>
          </article>

          {/* 2 - alert */}
          <article className="oga-mon-flow__card">
            <div className="oga-mon-flow__mock">
              <div className="oga-mon-flow__panel oga-mon-slack">
                <div className="oga-mon-slack__head">
                  <span className="oga-mon-slack__badge">OGA</span>
                  #risk-alerts
                </div>
                <p className="oga-mon-slack__msg">
                  <b>M1 1AE</b> median price up <b>7.6%</b> vs last month.
                </p>
              </div>
            </div>
            <p className="oga-mon-flow__cap">Get pinged in Slack, email or your own app the moment something moves.</p>
          </article>

          {/* 3 - schedule */}
          <article className="oga-mon-flow__card">
            <div className="oga-mon-flow__mock">
              <div className="oga-mon-flow__panel oga-mon-sched">
                <div className="oga-mon-sched__row"><span>Checks</span><b>Every month</b></div>
                <div className="oga-mon-sched__row"><span>Last run</span><b>1 Apr 2026</b></div>
                <div className="oga-mon-sched__row oga-mon-sched__row--next"><span>Next</span><b>1 May 2026</b></div>
              </div>
            </div>
            <p className="oga-mon-flow__cap">Re-check on the schedule you set, or on demand whenever you need it.</p>
          </article>

          {/* 4 - tune (wide) */}
          <article className="oga-mon-flow__card oga-mon-flow__card--wide">
            <div className="oga-mon-flow__mock">
              <div className="oga-mon-flow__panel oga-mon-knobs oga-mon-knobs--wide">
                {KNOBS.map((k) => (
                  <div key={k.k} className="oga-mon-knob">
                    <span className="oga-mon-knob__k">{k.k}</span>
                    <span className="oga-mon-knob__v">{k.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="oga-mon-flow__cap">Tune what counts as a real move, so you only ever hear about the ones you care about.</p>
          </article>

          {/* 5 - code (wide) */}
          <article className="oga-mon-flow__card oga-mon-flow__card--wide">
            <div className="oga-mon-flow__mock">
              <div className="oga-mon-flow__panel oga-mon-flow__code">
                <div className="oga-mon-flow__code-tabs">
                  <span className="oga-mon-flow__code-tab oga-mon-flow__code-tab--on">REST</span>
                  <span className="oga-mon-flow__code-tab">MCP</span>
                </div>
                <pre className="oga-mon-flow__code-body">{`POST /v1/portfolios/:id/changes
{ "since": "last_month", "min_move": 5 }

200 → 2 material moves · signed`}</pre>
              </div>
            </div>
            <p className="oga-mon-flow__cap">Set it up with one API call, or ask in plain English through Claude.</p>
          </article>
        </div>

        <footer className="oga-mon-flow__foot">
          <p className="oga-mon-flow__foot-text">
            One less thing to watch by hand. The changes that matter come to you,
            already checked and ready to trust.
          </p>
          <div className="oga-mon-flow__foot-ctas">
            <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
            <Link href="/methodology" className="oga-btn oga-btn-secondary">See how alerts work</Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

/* ---------- FAQ (light) ---------- */
const FAQ: { q: string; a: string }[] = [
  {
    q: "What can you watch?",
    a: "Any UK areas you save into a book, prices, crime, school ratings and the rest. Save a handful or a few hundred at once.",
  },
  {
    q: "How do you decide what counts as a real change?",
    a: "You set the rules: compare to last month or a year ago, ignore anything smaller than a percentage you choose, and skip moves built on too few sales.",
  },
  {
    q: "Why won't a big jump always alert me?",
    a: "If a move is based on only a handful of transactions it isn't reliable, so we hold it back until there's enough behind it to trust.",
  },
  {
    q: "How do alerts reach me?",
    a: "As a message straight to your own systems, your webhook, Slack, email or app, the moment a change happens.",
  },
  {
    q: "How do I know an alert is genuine?",
    a: "Every alert is signed, so your systems can check it really came from us before acting on it.",
  },
  {
    q: "How often does it check?",
    a: "On a schedule you set, or on demand whenever you want a fresh read.",
  },
  {
    q: "How do I get started?",
    a: "Save a book of areas and switch on alerts, or book a demo and we'll set it up on your own portfolio.",
  },
];

function Faq() {
  return (
    <section className="oga-mon-faq" aria-labelledby="mon-faq-title">
      <div className="oga-mon__wrap oga-mon-faq__grid">
        <div className="oga-mon-faq__aside">
          <div className="oga-mon__eyebrow">
            <span className="oga-mon__eyebrow-mark" aria-hidden />
            <span>FAQ</span>
          </div>
          <h2 id="mon-faq-title" className="oga-mon-faq__h2">Monitor, answered.</h2>
          <p className="oga-mon-faq__note">
            Want the detail?{" "}
            <Link href="/methodology" className="oga-mon-faq__link">See how alerts work</Link>.
          </p>
        </div>

        <div className="oga-mon-faq__list">
          {FAQ.map((item) => (
            <details key={item.q} className="oga-mon-faq__item">
              <summary className="oga-mon-faq__q">
                <span>{item.q}</span>
                <span className="oga-mon-faq__icon" aria-hidden />
              </summary>
              <div className="oga-mon-faq__a">{item.a}</div>
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
    <section className="oga-mon-cta" data-oga-surface="dark" aria-labelledby="mon-cta">
      <div className="oga-mon-cta__field" aria-hidden />
      <div className="oga-mon-cta__inner">
        <h2 id="mon-cta" className="oga-mon-cta__h2">Never miss a move that matters.</h2>
        <p className="oga-mon-cta__lead">
          Put your areas under watch and get a trustworthy heads-up the moment
          something real changes. Only the moves worth your attention.
        </p>
        <div className="oga-mon-cta__ctas">
          <BookDemo className="oga-btn oga-btn-primary">Book a demo</BookDemo>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">See how alerts work</Link>
        </div>
      </div>
    </section>
  );
}

export default function ProductMonitorClient() {
  return (
    <div className="oga-root oga-mon">
      <Nav />
      <MonitorHero />
      <Trust />
      <Watch />
      <ToWork />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
