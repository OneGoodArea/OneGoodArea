import type { ComponentType, SVGProps } from "react";
import { ApiReferenceIcon, McpServerIcon } from "./docs-icons";
import { SignalsIcon } from "./product-icons";

/* HowItWorksSection (01). The "what / how" explainer between the hero and the
   products: a postcode goes in, area intelligence comes out, you build it into
   your product. Light surface (clear break from the dark hero). The call strip
   shows the breadth of the API (not just one endpoint) with real, verified
   paths. Reuses existing brand icons; no invented assets. Plan 064. */

const STEPS: {
  num: string;
  title: string;
  body: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  {
    num: "01",
    title: "Send a postcode",
    body: "One authenticated call with any UK postcode. No SDK, no data pipeline to build and maintain.",
    Icon: ApiReferenceIcon,
  },
  {
    num: "02",
    title: "Get the area back",
    body: "Signals, a 0-100 score, comparables and forecasts, all in one response. Source-backed, versioned, and confidence-rated.",
    Icon: SignalsIcon,
  },
  {
    num: "03",
    title: "Build it in",
    body: "Render it on a listing, score a portfolio, watch it for change, or ask questions in plain English.",
    Icon: McpServerIcon,
  },
];

const CALLS: { verb: "GET" | "POST"; path: string; label: string }[] = [
  { verb: "GET", path: "/v1/area", label: "Area signals" },
  { verb: "POST", path: "/v1/score", label: "A 0-100 score" },
  { verb: "POST", path: "/v1/peers", label: "Comparables" },
  { verb: "POST", path: "/v1/query", label: "Ask in English" },
  { verb: "POST", path: "/v1/portfolios", label: "Monitor a portfolio" },
];

export function HowItWorksSection() {
  return (
    <section className="oga-how" data-oga-surface="light">
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
          {STEPS.map((s) => {
            const Icon = s.Icon;
            return (
              <li key={s.num} className="oga-how__step">
                <div className="oga-how__step-top">
                  <span className="oga-how__step-icon" aria-hidden>
                    <Icon />
                  </span>
                  <span className="oga-how__step-num">{s.num}</span>
                </div>
                <h3 className="oga-how__step-title">{s.title}</h3>
                <p className="oga-how__step-body">{s.body}</p>
              </li>
            );
          })}
        </ol>

        <div className="oga-how__calls">
          <span className="oga-how__calls-label">One key, every call</span>
          <ul className="oga-how__calls-list">
            {CALLS.map((c) => (
              <li key={c.path} className="oga-how__call">
                <span className="oga-how__call-endpoint">
                  <span className={`oga-verb oga-verb--${c.verb.toLowerCase()}`}>{c.verb}</span>
                  <span className="oga-how__call-path">{c.path}</span>
                </span>
                <span className="oga-how__call-label">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
