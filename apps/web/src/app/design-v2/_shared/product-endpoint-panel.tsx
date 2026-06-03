"use client";

import { useState } from "react";
import "./product-endpoint-panel.css";

/* Shared product-page endpoint panel (AR-211).

   Tabbed verb+path strip with header (title + sub) and per-endpoint
   body (what + parameters grid + response + status codes). Used by
   /products/{signals,scores,monitor,intelligence}. Each product
   provides its own endpoints data; the panel shell + tab state +
   body layout are identical across all 4. */

export type EndpointParam = {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
};

export type EndpointCode = {
  code: string;
  meaning: string;
};

export type ProductEndpoint = {
  method: string;
  path: string;
  what: string;
  params: EndpointParam[];
  response: string;
  codes: EndpointCode[];
};

type ProductEndpointPanelProps = {
  /** Section anchor id (passed up to <section id={anchorId}>) */
  anchorId?: string;
  /** id used for aria-labelledby on the section + the <h2> */
  titleId: string;
  /** h2 text */
  title: string;
  /** sub-heading paragraph */
  sub: string;
  /** aria-label for the tablist */
  tabLabel?: string;
  /** Endpoint list */
  endpoints: ProductEndpoint[];
};

export function ProductEndpointPanel({
  anchorId,
  titleId,
  title,
  sub,
  tabLabel = "Endpoint",
  endpoints,
}: ProductEndpointPanelProps) {
  const [idx, setIdx] = useState(0);
  const ep = endpoints[idx];
  return (
    <section
      id={anchorId}
      className="oga-section-hero oga-product-ep"
      aria-labelledby={titleId}
    >
      <div className="oga-product-ep__wrap">
        <header className="oga-product-ep__head">
          <h2 id={titleId} className="oga-product-ep__title">
            {title}
          </h2>
          <p className="oga-product-ep__sub">{sub}</p>
        </header>

        <div className="oga-product-ep__panel">
          <div className="oga-product-ep__tabs" role="tablist" aria-label={tabLabel}>
            {endpoints.map((e, i) => (
              <button
                key={e.path}
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => setIdx(i)}
                className={`oga-product-ep__tab${i === idx ? " oga-product-ep__tab--active" : ""}`}
              >
                <span
                  className="oga-product-ep__tab-verb"
                  data-verb={e.method}
                >
                  {e.method}
                </span>
                <span className="oga-product-ep__tab-path">{e.path}</span>
              </button>
            ))}
          </div>

          <div className="oga-product-ep__body">
            <p className="oga-product-ep__what">{ep.what}</p>

            <div className="oga-product-ep__grid">
              <div>
                <h4 className="oga-product-ep__col-title">Parameters</h4>
                <ul className="oga-product-ep__params">
                  {ep.params.map((p) => (
                    <li key={p.name}>
                      <div className="oga-product-ep__params-head">
                        <code className="oga-product-ep__params-name">{p.name}</code>
                        <span className="oga-product-ep__params-type">{p.type}</span>
                        {p.required && <span className="oga-product-ep__params-req">Required</span>}
                      </div>
                      <p className="oga-product-ep__params-desc">{p.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="oga-product-ep__col-title">Response</h4>
                <p className="oga-product-ep__response">{ep.response}</p>
                <h4 className="oga-product-ep__col-title">Status codes</h4>
                <dl className="oga-product-ep__codes">
                  {ep.codes.map((c) => (
                    <CodeRow key={c.code} code={c.code} meaning={c.meaning} />
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CodeRow({ code, meaning }: { code: string; meaning: string }) {
  return (
    <>
      <dt>{code}</dt>
      <dd>{meaning}</dd>
    </>
  );
}
