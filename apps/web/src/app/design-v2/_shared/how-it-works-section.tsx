/* HowItWorksSection (01). The missing "what / how" explainer between the hero
   and the ICP section: a postcode goes in, area intelligence comes out, you
   build it into your product. Three steps, dark surface so it reads as one
   cohesive intro with the hero. Strictly two-color. Plan 064. */

const STEPS: { num: string; title: string; body: string; chip?: string }[] = [
  {
    num: "01",
    title: "Send a postcode",
    body: "One authenticated call with any UK postcode. No SDK, no data pipeline to build and maintain.",
    chip: "GET /v1/area",
  },
  {
    num: "02",
    title: "Get the area back",
    body: "Every signal, a 0-100 score, comparables and forecasts. Source-backed, versioned, and confidence-rated.",
  },
  {
    num: "03",
    title: "Build it in",
    body: "Render it on a listing, score a portfolio, watch it for change, or ask questions in plain English.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="oga-how" data-oga-surface="dark">
      <div className="oga-how__inner">
        <header className="oga-how__header">
          <div className="oga-how__eyebrow">
            <span className="oga-how__eyebrow-num">01</span>
            <span className="oga-how__eyebrow-line" aria-hidden />
            <span>How it works</span>
          </div>
          <h2 className="oga-how__title">From a postcode to your product.</h2>
        </header>

        <ol className="oga-how__steps">
          {STEPS.map((s) => (
            <li key={s.num} className="oga-how__step">
              <span className="oga-how__step-num">{s.num}</span>
              <h3 className="oga-how__step-title">{s.title}</h3>
              <p className="oga-how__step-body">{s.body}</p>
              {s.chip && <span className="oga-how__step-chip">{s.chip}</span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
