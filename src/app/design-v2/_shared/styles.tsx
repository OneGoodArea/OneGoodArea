"use client";

/* Global tokens + fonts + animations + responsive rules for every design-v2
   page. Wrap page content in className="aiq" for the vars to scope. */

export function Styles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

      .aiq {
        /* Ink — forest green primary */
        --ink:        #0A4D3A;
        --ink-deep:   #062A1E;
        --ink-soft:   #1C5E4A;
        /* Signal — chartreuse (the alive accent) */
        --signal:     #D4F33A;
        --signal-ink: #1A2600;
        --signal-dim: #E9F69E;
        /* Surface */
        --bg:         #FFFFFF;
        --bg-off:     #F6F9F4;
        --bg-ink:     #062A1E;
        /* Line + text */
        --border:     #E4EAE3;
        --border-dim: #F0F3EE;
        --text:       #0B2018;
        --text-2:     #445A51;
        --text-3:     #6E8278;
        --text-4:     #9CAFA5;

        --display: 'Fraunces', 'Times New Roman', serif;
        --sans:    'Inter', -apple-system, system-ui, sans-serif;
        --mono:    'Geist Mono', ui-monospace, 'SF Mono', monospace;

        background: var(--bg);
        color: var(--text);
        font-family: var(--sans);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }

      .aiq *::selection { background: var(--signal); color: var(--signal-ink); }
      html { scroll-behavior: smooth; }

      @keyframes aiq-fade-up {
        from { opacity: 0; transform: translateY(14px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes aiq-pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.35; transform: scale(0.85); }
      }
      @keyframes aiq-ring-pulse {
        0%   { transform: scale(0.6); opacity: 0.9; }
        100% { transform: scale(3.2); opacity: 0; }
      }
      @keyframes aiq-caret {
        0%, 49%   { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      @keyframes aiq-scan {
        from { background-position: 0 0; }
        to   { background-position: 0 22px; }
      }
      @keyframes aiq-source-run {
        0%   { width: 0%; }
        100% { width: 100%; }
      }
      @keyframes aiq-rotate-in {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes aiq-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      /* ─── Responsive ─────────────────────────────────────── */
      /* Tablet / narrow desktop: stack the hero columns */
      @media (max-width: 960px) {
        .aiq-hero-grid {
          grid-template-columns: 1fr !important;
          gap: 48px !important;
          padding: 32px 28px 40px !important;
        }
        .aiq-engine {
          position: static !important;
        }
        .aiq-map {
          max-width: 520px;
          margin: 0 auto;
        }
      }

      /* Mobile: single column, smaller text, nav compacts */
      @media (max-width: 720px) {
        .aiq-nav-links,
        .aiq-nav-div {
          display: none !important;
        }
        .aiq-headline {
          margin-top: 20px !important;
        }
        .aiq-for-line {
          white-space: normal !important;
        }
        .aiq-report-grid {
          grid-template-columns: 1fr !important;
          gap: 28px !important;
          padding: 24px !important;
        }
      }

      @media (max-width: 520px) {
        .aiq-nav-beta { display: none !important; }
      }

      /* Who + Why 2-col: stack on narrow viewports */
      @media (max-width: 820px) {
        .aiq-who-why-grid {
          grid-template-columns: 1fr !important;
          gap: 48px !important;
        }
        .aiq-who-why-divider { display: none !important; }
        .aiq-who-col {
          padding-right: 0 !important;
          padding-bottom: 40px !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-why-col {
          padding-left: 0 !important;
          padding-top: 8px !important;
        }
      }

      /* Intents section: collapse to 2 cols on tablet, 1 on mobile */
      @media (max-width: 880px) {
        .aiq-intents-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-intent-col:nth-child(2) { border-right: none !important; }
        .aiq-intent-col:nth-child(1),
        .aiq-intent-col:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
      }
      @media (max-width: 560px) {
        .aiq-intents-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-intent-col { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
        .aiq-intent-col:last-child { border-bottom: none !important; }
      }


      /* How It Works zigzag: rows collapse on narrow viewports */
      @media (max-width: 820px) {
        .aiq-hiw-row {
          grid-template-columns: 1fr !important;
          gap: 28px !important;
          padding: 24px 0 !important;
        }
        .aiq-hiw-row > *:nth-child(1) {
          order: 1 !important;
        }
        .aiq-hiw-row > *:nth-child(2) {
          order: 2 !important;
        }
        .aiq-hiw-connector {
          padding: 4px 0 !important;
        }
      }

      /* Footer: collapse to single column on narrow viewports */
      @media (max-width: 820px) {
        .aiq-footer-top {
          grid-template-columns: 1fr 1fr !important;
          gap: 48px !important;
          margin-bottom: 56px !important;
        }
        .aiq-footer-brand {
          grid-column: 1 / -1 !important;
          margin-bottom: 8px !important;
        }
      }
      @media (max-width: 520px) {
        .aiq-footer-top {
          grid-template-columns: 1fr !important;
          gap: 40px !important;
        }
        .aiq-footer-bottom {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 14px !important;
        }
      }

      /* Business page — API preview, audiences, pricing strip */
      @media (max-width: 900px) {
        .aiq-api-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-audiences-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-audiences-grid > *:nth-child(odd) { border-right: none !important; }
        .aiq-audiences-grid > *:not(:last-child) { border-bottom: 1px solid var(--border) !important; }
      }
      @media (max-width: 820px) {
        .aiq-tier-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-tier-grid > *:nth-child(2) { border-right: none !important; }
        .aiq-tier-grid > *:nth-child(1),
        .aiq-tier-grid > *:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
      }
      @media (max-width: 520px) {
        .aiq-tier-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-tier-grid > * { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
        .aiq-tier-grid > *:last-child { border-bottom: none !important; }
      }

      /* Methodology + Docs — sidebar collapses on narrow, tables wrap */
      @media (max-width: 900px) {
        .aiq-meth-wrap,
        .aiq-docs-wrap {
          grid-template-columns: 1fr !important;
          gap: 32px !important;
        }
        .aiq-meth-sidebar,
        .aiq-docs-sidebar {
          position: static !important;
        }
        .aiq-intent-cards {
          grid-template-columns: 1fr !important;
        }
        .aiq-quickstart-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-quickstart-grid > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-quickstart-grid > *:last-child { border-bottom: none !important; }
        .aiq-rl-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-rl-grid > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-rl-grid > *:last-child { border-bottom: none !important; }
        .aiq-field-table > * {
          grid-template-columns: 1fr !important;
          gap: 6px !important;
        }
      }

      /* About page — two-column gap grid, builder row, stats strip */
      @media (max-width: 820px) {
        .aiq-gap-grid {
          grid-template-columns: 1fr !important;
          gap: 48px !important;
        }
        .aiq-builder-row {
          grid-template-columns: 1fr !important;
          gap: 24px !important;
        }
      }
      @media (max-width: 620px) {
        .aiq-stats-strip {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-stats-strip > *:nth-child(2) { border-right: none !important; }
        .aiq-stats-strip > *:nth-child(1),
        .aiq-stats-strip > *:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
      }

      /* Pricing page — plan grid + feature table */
      @media (max-width: 900px) {
        .aiq-plan-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-plan-grid > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-plan-grid > *:last-child { border-bottom: none !important; }
      }
      @media (max-width: 880px) {
        .aiq-feature-table .aiq-feat-row {
          grid-template-columns: 1fr !important;
          gap: 14px !important;
          padding: 22px 22px !important;
        }
        .aiq-feature-table .aiq-feat-head {
          display: none !important;
        }
        .aiq-feature-table .aiq-feat-row > *:not(:first-child) {
          display: inline-flex !important;
          align-items: center;
          justify-content: flex-start !important;
          gap: 10px;
        }
      }

      /* Small phones: tighten everything */
      @media (max-width: 480px) {
        .aiq-hero-grid {
          padding: 24px 20px 36px !important;
          gap: 40px !important;
        }
        .aiq-dim-row {
          grid-template-columns: minmax(0, 1fr) 48px !important;
          grid-template-areas:
            "label score"
            "bar   bar" !important;
          gap: 6px 12px !important;
        }
        .aiq-dim-row > :nth-child(1) { grid-area: label; }
        .aiq-dim-row > :nth-child(2) { grid-area: bar; }
        .aiq-dim-row > :nth-child(3) { grid-area: score; }
      }
    `}</style>
  );
}
