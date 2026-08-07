"use client";

const PORTFOLIO: { postcode: string; area: string; score: number; delta: number }[] = [
  { postcode: "M20 2NR", area: "Didsbury", score: 78, delta: 2 },
  { postcode: "M21 8AA", area: "Chorlton", score: 74, delta: 0 },
  { postcode: "SK4 3GN", area: "Heaton Moor", score: 71, delta: -1 },
  { postcode: "M14 6BT", area: "Fallowfield", score: 68, delta: 3 },
];

const CHANGES: { postcode: string; signal: string; from: number; to: number }[] = [
  { postcode: "M20 2NR", signal: "Prices", from: 74, to: 78 },
  { postcode: "M20 2NR", signal: "Schools", from: 71, to: 72 },
  { postcode: "SK4 3GN", signal: "Crime", from: 66, to: 64 },
  { postcode: "M14 6BT", signal: "Transport", from: 58, to: 63 },
];

function fmtDelta(delta: number): string {
  return delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta}`;
}

export function MonitorTab() {
  return (
    <div className="prx-monitor">
      <div className="prx-monitor__notice">
        Static demo data. Wire this tab to a portfolio endpoint to track real areas.
      </div>

      <section className="prx-monitor__portfolio" aria-label="Demo portfolio">
        <h4 className="prx-monitor__title">Your portfolio</h4>
        <ul className="prx-monitor__rows">
          {PORTFOLIO.map((p) => (
            <li key={p.postcode} className="prx-monitor__row">
              <div className="prx-monitor__area">
                <span className="prx-monitor__pc">{p.postcode}</span>
                <span className="prx-monitor__name">{p.area}</span>
              </div>
              <div className="prx-monitor__score">
                <span className="prx-monitor__score-num">{p.score}</span>
                <span
                  className={`prx-monitor__delta${
                    p.delta > 0
                      ? " prx-monitor__delta--up"
                      : p.delta < 0
                        ? " prx-monitor__delta--down"
                        : ""
                  }`}
                >
                  {fmtDelta(p.delta)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="prx-monitor__diff" aria-label="Change diff since last snapshot">
        <h4 className="prx-monitor__title">Changes since last snapshot</h4>
        <ul className="prx-monitor__diff-list">
          {CHANGES.map((c) => (
            <li key={`${c.postcode}-${c.signal}`} className="prx-monitor__diff-row">
              <span className="prx-monitor__diff-pc">{c.postcode}</span>
              <span className="prx-monitor__diff-signal">{c.signal}</span>
              <span className="prx-monitor__diff-arrow">→</span>
              <span className="prx-monitor__diff-from">{c.from}</span>
              <span className="prx-monitor__diff-to">{c.to}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
