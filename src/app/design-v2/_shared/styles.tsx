"use client";

/* Global tokens + fonts + animations + responsive rules for every design-v2
   page. Wrap page content in className="aiq" for the vars to scope. */

export function Styles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

      .aiq {
        /* Ink · forest green primary */
        --ink:        #0A4D3A;
        --ink-deep:   #062A1E;
        --ink-soft:   #1C5E4A;
        /* Signal · chartreuse (the alive accent) */
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

      /* Dark theme · flips all tokens when data-theme="dark" is on <html>.
         Chartreuse stays (it's brand signal on both). Surfaces go dark-forest,
         text vars go light. Components reading from these vars adapt. */
      [data-theme="dark"] .aiq {
        --ink:        #C4F5D4;
        --ink-deep:   #F5F8F6;
        --ink-soft:   #8FB8A5;
        --signal:     #D4F33A;
        --signal-ink: #1A2600;
        --signal-dim: #2E4310;
        --bg:         #0A1713;
        --bg-off:     #0F201A;
        --bg-ink:     #000A05;
        --border:     #1F2E28;
        --border-dim: #172520;
        --text:       #E4EAE3;
        --text-2:     #A8B8B0;
        --text-3:     #7D908A;
        --text-4:     #556864;
      }

      .aiq *::selection { background: var(--signal); color: var(--signal-ink); }
      html { scroll-behavior: smooth; }

      /* Theme-aware nav scroll overlay */
      .aiq-nav-top { background: transparent; }
      .aiq-nav-scrolled { background: rgba(255,255,255,0.86); }
      [data-theme="dark"] .aiq-nav-scrolled { background: rgba(10,23,19,0.86); }

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

      /* Business page · API preview, audiences, pricing strip */
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

      /* Auth shell · two-column stacks on mobile */
      @media (max-width: 880px) {
        .aiq-auth-shell {
          grid-template-columns: 1fr !important;
        }
        .aiq-auth-brand {
          min-height: auto !important;
          padding: 40px 32px 48px !important;
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
      }

      /* Legal shell · sidebar collapses */
      @media (max-width: 900px) {
        .aiq-legal-wrap {
          grid-template-columns: 1fr !important;
          gap: 32px !important;
        }
        .aiq-legal-sidebar {
          position: static !important;
        }
      }

      /* App shell · sidebar stacks on narrow, page grids collapse */
      @media (max-width: 960px) {
        .aiq-app-shell {
          grid-template-columns: 1fr !important;
        }
        .aiq-app-sidebar {
          position: static !important;
          height: auto !important;
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
          padding: 18px 20px !important;
        }
      }
      @media (max-width: 820px) {
        .aiq-dash-usage {
          grid-template-columns: 1fr !important;
        }
        .aiq-dash-usage > *:first-child {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-dash-stats {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-dash-stats > *:nth-child(2) { border-right: none !important; }
        .aiq-dash-stats > *:nth-child(1),
        .aiq-dash-stats > *:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
        .aiq-watchlist {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-watchlist > *:nth-child(2n) { border-right: none !important; }
        .aiq-reports-head,
        .aiq-reports-row {
          grid-template-columns: 1fr 80px 40px !important;
          gap: 10px !important;
        }
        .aiq-reports-head > *:nth-child(2),
        .aiq-reports-head > *:nth-child(4),
        .aiq-reports-row > *:nth-child(2),
        .aiq-reports-row > *:nth-child(4) { display: none !important; }
        .aiq-usage-stats {
          grid-template-columns: 1fr !important;
        }
        .aiq-usage-stats > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-usage-stats > *:last-child { border-bottom: none !important; }
        .aiq-usage-quick {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 560px) {
        .aiq-watchlist {
          grid-template-columns: 1fr !important;
        }
        .aiq-watchlist > * { border-right: none !important; }
      }

      /* Admin · collapse multi-col grids */
      @media (max-width: 900px) {
        .aiq-admin-kpi {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-admin-kpi > *:nth-child(2) { border-right: none !important; }
        .aiq-admin-kpi > *:nth-child(1),
        .aiq-admin-kpi > *:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
        .aiq-admin-2col,
        .aiq-admin-3col {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 540px) {
        .aiq-admin-kpi {
          grid-template-columns: 1fr !important;
        }
        .aiq-admin-kpi > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-admin-kpi > *:last-child { border-bottom: none !important; }
      }

      /* Report + Compare · layout grids */
      @media (max-width: 900px) {
        .aiq-report-intents {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-report-hero {
          grid-template-columns: 1fr !important;
        }
        .aiq-report-hero > *:last-child {
          border-left: none !important;
          border-top: 1px solid rgba(255,255,255,0.08) !important;
        }
        .aiq-property-stats,
        .aiq-schools-breakdown {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-compare-heads,
        .aiq-compare-summaries,
        .aiq-compare-bars {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 540px) {
        .aiq-report-intents {
          grid-template-columns: 1fr !important;
        }
      }

      /* Area page · hero + dim grid + intent grid + related grid */
      @media (max-width: 820px) {
        .aiq-area-hero {
          grid-template-columns: 1fr !important;
          gap: 36px !important;
        }
        .aiq-score-ring {
          align-self: flex-start;
        }
        .aiq-dim-grid {
          grid-template-columns: 1fr !important;
        }
        .aiq-intent-scores {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-intent-scores > *:nth-child(2) { border-right: none !important; }
        .aiq-intent-scores > *:nth-child(1),
        .aiq-intent-scores > *:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
        .aiq-related-grid {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-post-nav {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 520px) {
        .aiq-intent-scores {
          grid-template-columns: 1fr !important;
        }
        .aiq-intent-scores > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-intent-scores > *:last-child { border-bottom: none !important; }
        .aiq-related-grid {
          grid-template-columns: 1fr !important;
        }
      }

      /* Methodology · pipeline + AI split stack on narrow */
      @media (max-width: 880px) {
        .aiq-pipeline {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        .aiq-pipeline > *:nth-child(2) { border-right: none !important; }
        .aiq-pipeline > *:nth-child(1),
        .aiq-pipeline > *:nth-child(2) { border-bottom: 1px solid var(--border) !important; }
        .aiq-ai-split {
          grid-template-columns: 1fr !important;
        }
        .aiq-ai-split > *:first-child {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
      }
      @media (max-width: 520px) {
        .aiq-pipeline {
          grid-template-columns: 1fr !important;
        }
        .aiq-pipeline > * {
          border-right: none !important;
          border-bottom: 1px solid var(--border) !important;
        }
        .aiq-pipeline > *:last-child { border-bottom: none !important; }
      }

      /* Methodology + Docs · sidebar collapses on narrow, tables wrap */
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

      /* About page · two-column gap grid, builder row, stats strip */
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

      /* Pricing page · plan grid + feature table */
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
