"use client";

import React from "react";
import { Styles } from "./styles";
import { AppShell } from "./app-shell";

/* Loading states - shared skeleton primitives in design-v2 language.
   All loaders use the brand tokens (chartreuse pulse, cream/dark-adapt
   surfaces, Fraunces mute). Used by /design-v2/ * /loading.tsx files. */

/* Global /design-v2/loading.tsx fallback - a minimal centred pulse.
   Next.js uses this while a route segment streams if there's no closer
   loading.tsx. Keeps the marketing nav/footer out since it's a global
   fallback. */
export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <>
      <Styles />
      <div className="aiq" style={{
        minHeight: "60vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg)",
        padding: "80px 40px",
      }}>
        <CenteredPulse label={label} />
      </div>
    </>
  );
}

/* App-shell loader - renders the full sidebar chrome with a pulse in
   the main area. Used by /design-v2/dashboard/loading.tsx etc so the
   sidebar doesn't flicker during route transitions. */
export function AppLoader({ title, label = "Loading" }: {
  title?: string; label?: string;
}) {
  return (
    <>
      <Styles />
      <AppShell title={title}>
        <div style={{
          minHeight: "50vh",
          padding: "40px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CenteredPulse label={label} />
        </div>
      </AppShell>
    </>
  );
}

function CenteredPulse({ label }: { label: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 14,
      padding: "18px 22px",
      border: "1px solid var(--border)",
      background: "var(--bg-off)",
      borderRadius: 4,
      color: "var(--text-2)",
    }}>
      <span aria-hidden style={{
        width: 10, height: 10, borderRadius: 10,
        background: "var(--signal)",
        boxShadow: "0 0 0 0 rgba(212,243,58,0.5)",
        animation: "aiq-pulse-dot 1.3s ease-in-out infinite",
      }} />
      <span style={{
        fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: "var(--text-2)",
      }}>{label}</span>
    </div>
  );
}

/* Skeleton bar - chartreuse-tinted animated placeholder for rows.
   Used for table skeletons in the dashboard/compare loaders. */
export function SkeletonBar({ width = "100%", height = 12, delay = 0 }: {
  width?: string | number; height?: number; delay?: number;
}) {
  return (
    <span style={{
      display: "inline-block",
      width, height,
      background: "linear-gradient(90deg, var(--border-dim) 0%, var(--border) 50%, var(--border-dim) 100%)",
      backgroundSize: "200% 100%",
      borderRadius: 3,
      animation: `aiq-skeleton 1.4s ease-in-out ${delay}ms infinite`,
      verticalAlign: "middle",
    }} />
  );
}
