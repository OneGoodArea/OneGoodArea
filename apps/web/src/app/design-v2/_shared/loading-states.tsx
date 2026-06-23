"use client";

import type { CSSProperties } from "react";
import { AppShell } from "./app-shell";
import "./loading-states.css";

/* Loading states — shared skeleton primitives in Brand v3 vocabulary.
   AR-204 close-out sweep. Replaces the legacy .aiq + inline-style
   version that depended on the .aiq cascade in globals.css.

   Self-contained: defines its own @keyframes (oga-pulse-dot /
   oga-skeleton) in the co-located CSS, so when the .aiq block is
   stripped later, these loaders survive untouched.

   Used by each route segment's loading.tsx file in Next.js. */

/* Global /loading.tsx fallback — a minimal centred pulse.
   Next.js uses this while a route segment streams if there's no
   closer loading.tsx. Keeps the marketing nav/footer out since
   it's a global fallback. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="oga-root oga-loader-page">
      <CenteredPulse label={label} />
    </div>
  );
}

/* App-shell loader — renders the full sidebar chrome with a pulse
   in the main area. Used by /dashboard/loading.tsx etc so the
   sidebar doesn't flicker during route transitions. AppShell
   itself stays on legacy until its own migration; this file's
   contribution is the inner pulse. */
export function AppLoader({
  title,
  label = "Loading",
}: {
  title?: string;
  label?: string;
}) {
  return (
    <AppShell title={title}>
      <div className="oga-loader-app">
        <CenteredPulse label={label} />
      </div>
    </AppShell>
  );
}

function CenteredPulse({ label }: { label: string }) {
  return (
    <div className="oga-pulse">
      <span className="oga-pulse__dot" aria-hidden />
      <span className="oga-pulse__label">{label}</span>
    </div>
  );
}

/* Skeleton bar — animated placeholder for rows in tables / cards.
   Used by various dashboard loaders. Prop-driven dimensions + delay
   pass through as CSS custom properties so the TSX stays free of
   design declarations (only runtime values cross the boundary). */
export function SkeletonBar({
  width = "100%",
  height = 12,
  delay = 0,
}: {
  width?: string | number;
  height?: number;
  delay?: number;
}) {
  const widthValue = typeof width === "number" ? `${width}px` : width;
  const styleVars = {
    "--oga-skel-w": widthValue,
    "--oga-skel-h": `${height}px`,
    "--oga-skel-delay": `${delay}ms`,
  } as CSSProperties;
  return <span className="oga-skeleton" style={styleVars} />;
}
