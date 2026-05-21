"use client";

import Link from "next/link";

/* DefensibleSection v8 — compact zigzag storytelling.
   Four short rows, alternating sides. Each row has a tight branded
   visual on one side and an explanation + audit signal on the other.
   Reads top-to-bottom as a four-act story of how a score gets made. */

type Stage = {
  id: "sources" | "methodology" | "score" | "confidence";
  index: string;
  title: string;
  body: string;
  signalLabel: string;
  signalValue: string;
};

const STAGES: Stage[] = [
  {
    id: "sources",
    index: "01",
    title: "Seven sources, each cited.",
    body: "Authoritative UK public datasets feed every score. Each dimension cites the dataset it came from, with the URL and ingest date on the response.",
    signalLabel: "Returned in",
    signalValue: "every API response",
  },
  {
    id: "methodology",
    index: "02",
    title: "Methodology pinned.",
    body: "Every score is stamped with the engine version that produced it. Pin your contract to v2.0.2 and the math stays reproducible. Weights are documented, formula is published.",
    signalLabel: "Request header",
    signalValue: "X-Engine-Version: 2.0.2",
  },
  {
    id: "score",
    index: "03",
    title: "One deterministic number.",
    body: "Same input, same answer. Forever. No drift, no probabilistic outputs, no AI hallucinating a number into a regulated workflow. Replay any past score, get the same result.",
    signalLabel: "Property",
    signalValue: "Reproducible by replay",
  },
  {
    id: "confidence",
    index: "04",
    title: "Confidence on every dimension.",
    body: "Where the underlying data is thin or stale, the engine says so before your underwriter does. Confidence is a first-class field on the response, not a footnote in a PDF.",
    signalLabel: "Response field",
    signalValue: "confidence_by_dimension",
  },
];

/* ----- Refined dot-mark data-viz per stage. Each is a 200x200 SVG.
   Inputs render radially (sources converging, methodology as a
   versioned contour around the mark); outputs render as linear
   charts (score on a population distribution, confidence as
   per-dimension interval bars). All monochrome, dot-grid dialect. */

const MARK_DOTS: Array<[number, number]> = [
  [60, 18],
  [32, 32], [46, 32], [60, 32], [74, 32], [88, 32],
  [32, 46], [46, 46], [60, 46], [74, 46], [88, 46],
  [18, 60], [32, 60], [46, 60], [60, 60], [74, 60], [88, 60], [102, 60],
  [32, 74], [46, 74], [60, 74], [74, 74], [88, 74],
  [32, 88], [46, 88], [60, 88], [74, 88], [88, 88],
  [60, 102],
];

function VisualSources() {
  /* Seven data streams converging on a single point. Each spoke is a
     source; dots brighten and grow toward the center where they
     resolve into one score. Faint concentric guides add depth. */
  const SPOKES = 7;
  const RINGS = 5;
  const dots: Array<{ x: number; y: number; r: number; o: number; d: number }> = [];
  for (let i = 0; i < SPOKES; i++) {
    const a = (i / SPOKES) * Math.PI * 2 - Math.PI / 2;
    for (let j = 0; j < RINGS; j++) {
      const rad = 34 + j * 13;
      dots.push({
        x: 100 + Math.cos(a) * rad,
        y: 100 + Math.sin(a) * rad,
        r: 3.2 - j * 0.34,
        o: 1 - j * 0.15,
        d: (RINGS - 1 - j) * 70 + i * 26,
      });
    }
  }
  return (
    <svg viewBox="0 0 200 200" className="oga-defensible__viz" aria-hidden>
      {[34, 47, 60, 73, 86].map((r) => (
        <circle key={r} cx={100} cy={100} r={r} fill="none" stroke="currentColor" strokeWidth={0.4} opacity={0.07} />
      ))}
      {dots.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill="currentColor"
          opacity={p.o}
          className="oga-defensible__viz-src"
          style={{ animationDelay: `${p.d}ms` }}
        />
      ))}
      <circle cx={100} cy={100} r={4.6} fill="currentColor" />
    </svg>
  );
}

function VisualMethodology() {
  /* The mark held inside a versioned contour. A crisp boundary ring
     plus a dashed outer contour, with the version pinned to the ring
     like an elevation label on a map. */
  return (
    <svg viewBox="0 0 200 200" className="oga-defensible__viz" aria-hidden>
      <g transform="translate(40 40)">
        {MARK_DOTS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} fill="currentColor" opacity={0.32} />
        ))}
      </g>
      <circle cx={100} cy={100} r={74} fill="none" stroke="currentColor" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.28} />
      <circle cx={100} cy={100} r={60} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.50} />
      <g transform="translate(100 40)">
        <line x1={0} y1={0} x2={0} y2={4} stroke="currentColor" strokeWidth={0.6} opacity={0.5} />
        <rect x={-23} y={-15} width={46} height={16} fill="#1A1C1F" stroke="currentColor" strokeWidth={0.7} />
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          fontFamily="var(--oga-font-mono)"
          fontSize="9"
          fontWeight="500"
          letterSpacing="0.10em"
          fill="currentColor"
        >
          v2.0.2
        </text>
      </g>
    </svg>
  );
}

function VisualScore() {
  /* The score plotted on the population distribution of all UK areas.
     A dot-density bell with 73 marked precisely: this area sits above
     the typical area, and you can see exactly where. */
  const mean = 58;
  const sd = 17;
  const x0 = 18;
  const x1 = 182;
  const baseY = 150;
  const cols: Array<{ cx: number; n: number; s: number }> = [];
  for (let s = 8; s <= 96; s += 4.5) {
    const h = Math.exp(-((s - mean) ** 2) / (2 * sd * sd));
    cols.push({ cx: x0 + (s / 100) * (x1 - x0), n: Math.round(h * 7), s });
  }
  const markerS = 73;
  const markerX = x0 + (markerS / 100) * (x1 - x0);
  return (
    <svg viewBox="0 0 200 200" className="oga-defensible__viz" aria-hidden>
      {cols.map((c, ci) =>
        Array.from({ length: c.n }).map((_, ri) => {
          const near = Math.abs(c.cx - markerX) < 6;
          return (
            <circle
              key={`${ci}-${ri}`}
              cx={c.cx}
              cy={baseY - ri * 8}
              r={2}
              fill="currentColor"
              opacity={near ? 0.95 : 0.26}
            />
          );
        })
      )}
      <line x1={14} y1={baseY + 7} x2={186} y2={baseY + 7} stroke="currentColor" strokeWidth={0.5} opacity={0.18} />
      <line x1={markerX} y1={52} x2={markerX} y2={baseY + 7} stroke="currentColor" strokeWidth={0.8} opacity={0.6} />
      <circle cx={markerX} cy={52} r={3} fill="currentColor" />
      <text
        x={markerX}
        y={42}
        textAnchor="middle"
        fontFamily="var(--oga-font-sans)"
        fontSize="22"
        fontWeight="500"
        letterSpacing="-0.02em"
        fill="currentColor"
      >
        73
      </text>
    </svg>
  );
}

function VisualConfidence() {
  /* Per-dimension confidence intervals. Four error bars: the point is
     the estimate, the span is the interval, tighter span = higher
     confidence. Transport's data is thinner, so its band is wider. */
  const DIMS = [
    { label: "CRIME", est: 0.78, conf: 0.92 },
    { label: "FLOOD", est: 0.60, conf: 0.86 },
    { label: "SCHOOLS", est: 0.86, conf: 0.95 },
    { label: "TRANSPORT", est: 0.50, conf: 0.73 },
  ];
  const x0 = 70;
  const x1 = 190;
  const w = x1 - x0;
  return (
    <svg viewBox="0 0 200 200" className="oga-defensible__viz" aria-hidden>
      {DIMS.map((d, i) => {
        const y = 46 + i * 38;
        const estX = x0 + d.est * w;
        const half = (1 - d.conf) * 36;
        return (
          <g key={d.label}>
            <text
              x={8}
              y={y + 3}
              fontFamily="var(--oga-font-mono)"
              fontSize="7.5"
              fontWeight="500"
              letterSpacing="0.10em"
              fill="currentColor"
              opacity={0.62}
            >
              {d.label}
            </text>
            <line x1={x0} y1={y} x2={x1} y2={y} stroke="currentColor" strokeWidth={0.5} opacity={0.14} />
            <line x1={estX - half} y1={y} x2={estX + half} y2={y} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />
            <line x1={estX - half} y1={y - 3.5} x2={estX - half} y2={y + 3.5} stroke="currentColor" strokeWidth={0.7} opacity={0.45} />
            <line x1={estX + half} y1={y - 3.5} x2={estX + half} y2={y + 3.5} stroke="currentColor" strokeWidth={0.7} opacity={0.45} />
            <circle cx={estX} cy={y} r={3} fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

function StageVisual({ id }: { id: Stage["id"] }) {
  if (id === "sources")     return <VisualSources />;
  if (id === "methodology") return <VisualMethodology />;
  if (id === "score")       return <VisualScore />;
  return <VisualConfidence />;
}

export function DefensibleSection() {
  return (
    <section className="oga-defensible" data-oga-surface="dark">
      <div className="oga-defensible__field" aria-hidden />

      <div className="oga-defensible__inner">
        <header className="oga-defensible__header">
          <div className="oga-defensible__eyebrow">
            <span className="oga-defensible__eyebrow-num">03</span>
            <span className="oga-defensible__eyebrow-line" aria-hidden />
            <span>How a score gets made</span>
          </div>
          <h2 className="oga-defensible__title">Defensible by default.</h2>
          <p className="oga-defensible__sub">
            Four stages, end-to-end. Each one is something your model risk team can audit, your underwriter can cite, and your auditor can replay.
          </p>
        </header>

        <ol className="oga-defensible__zigzag">
          {STAGES.map((s, i) => {
            const side = i % 2 === 0 ? "r" : "l";
            return (
              <li
                key={s.id}
                className={`oga-defensible__row oga-defensible__row--${side}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="oga-defensible__row-text">
                  <div className="oga-defensible__row-head">
                    <span className="oga-defensible__row-num">{s.index}</span>
                    <h3 className="oga-defensible__row-title">{s.title}</h3>
                  </div>
                  <p className="oga-defensible__row-body">{s.body}</p>
                  <div className="oga-defensible__row-signal">
                    <span className="oga-defensible__row-signal-label">{s.signalLabel}</span>
                    <span className="oga-defensible__row-signal-val">{s.signalValue}</span>
                  </div>
                </div>
                <div className="oga-defensible__row-visual">
                  <StageVisual id={s.id} />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="oga-defensible__close">
          <p className="oga-defensible__close-text">
            Same input, same answer. Every time. That is what &ldquo;defensible by default&rdquo; means in practice.
          </p>
          <Link href="/methodology" className="oga-btn oga-btn-secondary">
            Read the methodology
            <span aria-hidden style={{ marginLeft: 6 }}>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
