import Link from "next/link";

/* HowItWorksSection (01). Encord-style showcase: a large featured card plus two
   below, each pairing a crafted product surface with a heading and a link. Our
   spin on the reference: two-color brand, and the "screenshots" are real UI
   surfaces we build in markup (area report, portfolio monitor, NL query), so
   it shows the breadth of the product and looks like software, not icons.
   Plan 064. */

const CATS: { label: string; pct: number }[] = [
  { label: "Schools", pct: 81 },
  { label: "Crime", pct: 88 },
  { label: "Prices", pct: 66 },
  { label: "Transport", pct: 79 },
  { label: "Green space", pct: 72 },
];
const PEERS = ["M20 2NR", "M21 8AA", "SK4 3GN"];

const MOVES: { area: string; signal: string; delta: string; dir: "up" | "down" }[] = [
  { area: "M1 1AE", signal: "Prices", delta: "+8.6%", dir: "up" },
  { area: "LS6 3HN", signal: "Crime", delta: "-4.2%", dir: "down" },
  { area: "B15 2TT", signal: "Deprivation", delta: "+2.1%", dir: "up" },
];
const RANKED: { area: string; score: number }[] = [
  { area: "M14 5 Fallowfield", score: 78 },
  { area: "LS11 Beeston", score: 74 },
  { area: "B29 6 Selly Oak", score: 71 },
];

export function HowItWorksSection() {
  return (
    <section className="oga-how" data-oga-surface="light">
      <div className="oga-how__field" aria-hidden />
      <div className="oga-how__inner">
        <header className="oga-how__header">
          <div className="oga-how__eyebrow">
            <span className="oga-how__eyebrow-num">01</span>
            <span className="oga-how__eyebrow-line" aria-hidden />
            <span>How it works</span>
          </div>
          <h2 className="oga-how__title">Get the full area context in a single call.</h2>
          <p className="oga-how__sub">
            Send any UK postcode and get the neighbourhood back: signals, a score,
            price trends and comparables. Then render it, score a portfolio,
            monitor it for change, or ask in plain English.
          </p>
        </header>

        {/* Featured: area report */}
        <article className="oga-how__feature">
          <div className="oga-how__feature-viz">
            <div className="oga-how__report" aria-hidden>
              <div className="oga-how__report-head">
                <div className="oga-how__report-place">
                  <span className="oga-how__report-kicker">Area report</span>
                  <span className="oga-how__report-name">Chorlton, Manchester</span>
                </div>
                <span className="oga-how__report-pc">M21 9PN</span>
              </div>
              <div className="oga-how__report-score">
                <span className="oga-how__report-score-num">74<em>/100</em></span>
                <div className="oga-how__report-score-meta">
                  <span className="oga-how__report-score-label">Investing score</span>
                  <span className="oga-how__report-score-bar oga-how__bar--w74"><span /></span>
                </div>
              </div>
              <ul className="oga-how__report-cats">
                {CATS.map((c) => (
                  <li key={c.label} className="oga-how__report-cat">
                    <span className="oga-how__report-cat-label">{c.label}</span>
                    <span className={`oga-how__report-cat-bar oga-how__bar--w${c.pct}`}><span /></span>
                    <span className="oga-how__report-cat-pct">{c.pct}</span>
                  </li>
                ))}
              </ul>
              <div className="oga-how__report-split">
                <div className="oga-how__report-block">
                  <span className="oga-how__report-sub">Prices, 12 mo</span>
                  <div className="oga-how__report-trend">
                    <svg className="oga-how__spark" viewBox="0 0 120 36" preserveAspectRatio="none">
                      <polyline points="0,30 20,28 40,24 60,23 80,16 100,11 120,6" />
                    </svg>
                    <span className="oga-how__report-trend-val">+6.4%</span>
                  </div>
                </div>
                <div className="oga-how__report-block">
                  <span className="oga-how__report-sub">Comparable areas</span>
                  <div className="oga-how__report-peers">
                    {PEERS.map((p) => (
                      <span key={p} className="oga-how__report-peer">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="oga-how__report-foot">
                <span>engine v1.1.0 · source-backed</span>
                <span className="oga-how__report-brand">OneGoodArea</span>
              </div>
            </div>
          </div>
          <div className="oga-how__feature-text">
            <span className="oga-how__tag">Signals + Scores</span>
            <h3 className="oga-how__feature-title">Score any UK neighbourhood</h3>
            <p className="oga-how__feature-body">
              Multiple categories of public data turned into a single 0-100 score,
              with price trends and comparable areas. Source-backed and versioned,
              for any UK postcode.
            </p>
            <Link href="/products/scores" className="oga-how__feature-link">
              Explore signals and scores
              <span aria-hidden>→</span>
            </Link>
          </div>
        </article>

        {/* Two below: monitor + query */}
        <div className="oga-how__grid">
          <article className="oga-how__card">
            <div className="oga-how__card-viz">
              <div className="oga-how__mock oga-how__mock--monitor" aria-hidden>
                <div className="oga-how__mock-bar">
                  <span>Portfolio</span>
                  <span className="oga-how__mock-tag">3 areas moved</span>
                </div>
                <ul className="oga-how__moves">
                  {MOVES.map((m) => (
                    <li key={m.area} className="oga-how__move">
                      <span className="oga-how__move-area">{m.area}</span>
                      <span className="oga-how__move-signal">{m.signal}</span>
                      <span className={`oga-how__move-delta oga-how__move-delta--${m.dir}`}>
                        {m.delta}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="oga-how__mock-foot">signal.changed → your webhook</div>
              </div>
            </div>
            <span className="oga-how__tag">Monitor</span>
            <h3 className="oga-how__card-title">Monitor a portfolio</h3>
            <p className="oga-how__card-body">
              Track a book of areas and get a signed webhook the month one moves
              past the threshold you set.
            </p>
            <Link href="/products/monitor" className="oga-how__card-link">
              Explore monitoring<span aria-hidden>→</span>
            </Link>
          </article>

          <article className="oga-how__card">
            <div className="oga-how__card-viz">
              <div className="oga-how__mock oga-how__mock--query" aria-hidden>
                <div className="oga-how__query-input">
                  <span className="oga-how__query-caret">›</span>
                  cheap areas with rising prices and low crime
                </div>
                <div className="oga-how__query-plan">rank_areas</div>
                <ol className="oga-how__ranked">
                  {RANKED.map((r, i) => (
                    <li key={r.area} className="oga-how__rank">
                      <span className="oga-how__rank-n">{i + 1}</span>
                      <span className="oga-how__rank-area">{r.area}</span>
                      <span className="oga-how__rank-score">{r.score}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <span className="oga-how__tag">Intelligence</span>
            <h3 className="oga-how__card-title">Ask in plain English</h3>
            <p className="oga-how__card-body">
              Ask in plain English or in code and get ranked areas back, along with
              the exact query, so you can check it and run it again.
            </p>
            <Link href="/products/intelligence" className="oga-how__card-link">
              Explore intelligence<span aria-hidden>→</span>
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
