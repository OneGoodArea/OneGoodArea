"use client";

/* CoverageSection (05) — the scale exhale.
   Dark surface, contrast after light Integration. An abstract field
   of neighbourhoods (deliberately NOT a UK silhouette — that was
   rejected for section 2). A monochrome dot field, brightness-varied,
   a few neighbourhoods glowing, with a stats strip beneath.
   Copy says "neighbourhoods", never "postcodes"; coverage is Great
   Britain (England/Wales/Scotland), not the whole UK. */

function rand(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const FIELD_COLS = 52;
const FIELD_ROWS = 13;

type Dot = { x: number; y: number; r: number; o: number; bright: boolean };

function buildField(): Dot[] {
  const dots: Dot[] = [];
  for (let row = 0; row < FIELD_ROWS; row++) {
    for (let col = 0; col < FIELD_COLS; col++) {
      const i = row * FIELD_COLS + col + 1;
      const v = rand(i);
      const bright = v > 0.94;
      dots.push({
        x: col * 10 + 5,
        y: row * 10 + 5,
        r: bright ? 2.0 : 1.5,
        o: bright ? 0.95 : 0.12 + v * v * 0.5,
        bright,
      });
    }
  }
  return dots;
}

const FIELD = buildField();

const STATS: Array<{ value: string; label: string }> = [
  { value: "42,640", label: "Neighbourhoods" },
  { value: "7", label: "Public sources" },
  { value: "3", label: "Nations" },
  { value: "0–100", label: "Score scale" },
];

export function CoverageSection() {
  return (
    <section className="oga-coverage" data-oga-surface="dark">
      <div className="oga-coverage__field-bg" aria-hidden />

      <div className="oga-coverage__inner">
        <header className="oga-coverage__header">
          <div className="oga-coverage__eyebrow">
            <span className="oga-coverage__eyebrow-num">05</span>
            <span className="oga-coverage__eyebrow-line" aria-hidden />
            <span>Coverage</span>
          </div>
          <h2 className="oga-coverage__title">Every neighbourhood in Great Britain.</h2>
          <p className="oga-coverage__sub">
            42,640 neighbourhoods, scored from seven public sources by one
            deterministic engine. England, Wales, and Scotland, at the grain
            official statistics are published.
          </p>
        </header>

        <div className="oga-coverage__viz" aria-hidden>
          <svg
            viewBox="0 0 520 130"
            className="oga-coverage__viz-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            {FIELD.map((d, i) => (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={d.r}
                fill="currentColor"
                opacity={d.o}
                className={d.bright ? "oga-coverage__dot oga-coverage__dot--bright" : "oga-coverage__dot"}
                style={d.bright ? { animationDelay: `${(i % 11) * 280}ms` } : undefined}
              />
            ))}
          </svg>
        </div>

        <div className="oga-coverage__stats">
          {STATS.map((s) => (
            <div key={s.label} className="oga-coverage__stat">
              <span className="oga-coverage__stat-val">{s.value}</span>
              <span className="oga-coverage__stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
