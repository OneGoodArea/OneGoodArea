/* AR-241 (Dashboard redesign Epic AR-217 — Phase 0.5): metric tile primitive.

   The /dashboard Home redesign needs a top strip with metric tiles:
   plan badge + quota bar + adaptive Upgrade CTA (reads /v1/me).
   Per the dashboard proposal: "Top strip: plan badge + quota bar
   + adaptive Upgrade CTA."

   Planned consumers (2-3):
   - /dashboard Home top strip (Phase 1 AR-217-B5)
   - /api-usage page metric tiles
   - /dashboard/billing summary tiles

   Generalises the existing StatCell from AppShell (label + dot +
   value + hint + accent) by adding:
   - progress bar (quota usage)
   - delta indicator (trend up/down/neutral with status colour)
   - action slot (Upgrade CTA, inline link/button)
   - light + dark surface variants
   - tabular-nums on the value

   Brand v3 vocabulary — warm-white gradient + edge-lit material on
   light, graphite gradient + dot-field motif on dark. Same family
   as DataTable + EmptyState + CodeBlock. */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import "./stats-card.css";

/* ============================================================
   Types
   ============================================================ */

export type StatsCardAccent = "strong" | "moderate" | "weak";
export type DeltaTrend = "up" | "down" | "neutral";

export interface StatsCardDelta {
  /** Label rendered next to the trend glyph (e.g. "+8.6%", "-12k"). */
  value: string;
  /** Trend direction — drives the glyph + colour. up = green,
      down = red, neutral = muted. */
  trend: DeltaTrend;
}

export interface StatsCardProgress {
  /** Current value (e.g. API calls used). */
  current: number;
  /** Max value (e.g. monthly quota). Fill = current/max, capped at 100%. */
  max: number;
}

export interface StatsCardAction {
  /** Display label (e.g. "Upgrade", "View usage"). */
  label: string;
  /** If provided, renders as a <Link>. */
  href?: string;
  /** If provided, renders as a <button>. */
  onClick?: () => void;
}

export interface StatsCardProps {
  /** Metric label — mono caps, with a colored accent dot. */
  label: string;
  /** Large headline value. ReactNode so consumers can pass formatted
      numbers / badges / spans. */
  value: ReactNode;
  /** Optional supporting context line (e.g. "of 50,000 included"). */
  hint?: string;
  /** Optional change indicator. Renders inline at the value baseline. */
  delta?: StatsCardDelta;
  /** Optional quota bar. Renders below the value row. */
  progress?: StatsCardProgress;
  /** Accent — drives dot + value tone via data-accent. Default "strong". */
  accent?: StatsCardAccent;
  /** Optional inline CTA (e.g. "Upgrade"). */
  action?: StatsCardAction;
  /** Surface variant. Default "light". */
  surface?: "light" | "dark";
}

/* ============================================================
   Component
   ============================================================ */

export function StatsCard({
  label,
  value,
  hint,
  delta,
  progress,
  accent = "strong",
  action,
  surface = "light",
}: StatsCardProps) {
  const progressPct = progress
    ? Math.min(100, Math.max(0, (progress.current / progress.max) * 100))
    : null;

  return (
    <div
      className="oga-stats-card"
      data-accent={accent}
      data-surface={surface}
    >
      <div className="oga-stats-card__label">
        <span aria-hidden className="oga-stats-card__dot" />
        {label}
      </div>

      <div className="oga-stats-card__value-row">
        <div className="oga-stats-card__value">{value}</div>
        {delta ? (
          <span
            className="oga-stats-card__delta"
            data-trend={delta.trend}
            aria-label={`Change: ${delta.value} (${delta.trend})`}
          >
            <span aria-hidden className="oga-stats-card__delta-glyph">
              {delta.trend === "up" ? "↑" : delta.trend === "down" ? "↓" : "→"}
            </span>
            {delta.value}
          </span>
        ) : null}
      </div>

      {progress ? (
        <div
          className="oga-stats-card__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.max}
          aria-valuenow={progress.current}
          aria-label={`${progress.current} of ${progress.max}`}
        >
          <div
            className="oga-stats-card__progress-fill"
            /* CSS custom property for the fill width — same pattern
               DataTable uses for --oga-dt-cols. Not a styling decision
               (the rule that fills width is in stats-card.css); just
               a dynamic value flowing from React state into CSS. */
            style={{ "--oga-stats-card-pct": `${progressPct ?? 0}%` } as React.CSSProperties}
          />
        </div>
      ) : null}

      {hint ? <div className="oga-stats-card__hint">{hint}</div> : null}

      {action ? (
        <div className="oga-stats-card__action-row">
          <ActionButton action={action} />
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
   Action — renders <Link> if href, <button> if onClick
   ============================================================ */

function ActionButton({ action }: { action: StatsCardAction }) {
  const className = "oga-stats-card__action";
  if (action.href) {
    return (
      <Link href={action.href} className={className} onClick={action.onClick}>
        {action.label}
        <span aria-hidden className="oga-stats-card__action-arrow">→</span>
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
      <span aria-hidden className="oga-stats-card__action-arrow">→</span>
    </button>
  );
}
