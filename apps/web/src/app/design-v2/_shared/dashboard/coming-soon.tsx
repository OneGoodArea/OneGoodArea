/* Shared placeholder for routes the AR-252 sidebar links to but
   their real implementations haven't shipped yet. Kept dead-simple
   on purpose — when the real page lands it replaces page.tsx; this
   component never bleeds into the real implementation. Brand v3
   surface vocabulary (warm-white card on cream, mono caps eyebrow,
   editorial title). No CTAs — there's nothing to do yet. */

import type { ReactNode } from "react";

interface ComingSoonProps {
  /** Mono caps eyebrow above the title, naming the phase that
      delivers this surface (e.g. "Phase 2", "Phase 3 — Levers"). */
  phase: string;
  /** Editorial page title — same voice as a real dashboard page so
      the placeholder feels like a route, not an error. */
  title: string;
  /** One paragraph explaining what will live here. Treat as a
      contract with the user about what the surface promises. */
  description: ReactNode;
}

export default function ComingSoon({ phase, title, description }: ComingSoonProps) {
  return (
    <div className="oga-coming-soon">
      <div className="oga-coming-soon__card">
        <span className="oga-coming-soon__eyebrow">
          <span className="oga-coming-soon__dot" aria-hidden />
          {phase}
        </span>
        <h2 className="oga-coming-soon__title">{title}</h2>
        <p className="oga-coming-soon__body">{description}</p>
      </div>
      <style>{`
        .oga-coming-soon {
          padding: 40px 0;
          display: flex;
          justify-content: center;
        }
        .oga-coming-soon__card {
          max-width: 560px;
          background: var(--oga-bg-warm);
          border: 1px solid var(--oga-line-soft);
          border-radius: 4px;
          padding: 32px;
        }
        .oga-coming-soon__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--oga-font-mono);
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--oga-fg-muted);
          margin-bottom: 16px;
        }
        .oga-coming-soon__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--oga-ink);
        }
        .oga-coming-soon__title {
          font-family: var(--oga-font-serif, var(--oga-font-sans));
          font-size: 26px;
          font-weight: 500;
          line-height: 1.2;
          color: var(--oga-ink);
          margin: 0 0 14px 0;
        }
        .oga-coming-soon__body {
          font-size: 14.5px;
          line-height: 1.55;
          color: var(--oga-fg);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
