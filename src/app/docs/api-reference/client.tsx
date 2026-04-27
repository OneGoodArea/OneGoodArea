"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import Link from "next/link";

/* OneGoodArea API reference page.
 *
 * Renders the OpenAPI 3.0 spec at /openapi.json as interactive
 * developer documentation, Stripe-style. Buyers can browse endpoints,
 * inspect schemas, and copy curl commands without leaving the site.
 *
 * Brand-tinted via customCss override on Scalar's CSS variables. */

export default function ApiReferenceClient() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      {/* Compact branded header strip with a back-link to the editorial /docs page */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#062A1E",
        borderBottom: "1px solid rgba(212,243,58,0.18)",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
        fontFamily: "'Geist Mono', ui-monospace, monospace",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            width: 6, height: 6, borderRadius: 999,
            background: "#D4F33A",
            boxShadow: "0 0 0 4px rgba(212,243,58,0.22)",
          }} />
          <span style={{
            fontSize: 11, fontWeight: 500,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.92)",
          }}>OneGoodArea API · v2.0.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Link href="/docs" style={{
            fontSize: 11, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.78)",
            textDecoration: "none",
          }}>← Back to docs</Link>
          <a href="/openapi.json" download="onegoodarea-openapi.json" style={{
            fontSize: 11, fontWeight: 500,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "#062A1E",
            background: "#D4F33A",
            padding: "8px 14px",
            borderRadius: 999,
            textDecoration: "none",
            border: "1px solid rgba(6,42,30,0.12)",
          }}>Download spec ↓</a>
        </div>
      </div>

      <ApiReferenceReact
        configuration={{
          url: "/openapi.json",
          theme: "default",
          layout: "modern",
          hideDarkModeToggle: false,
          customCss: `
            :root {
              --scalar-font: "Inter", system-ui, sans-serif;
              --scalar-font-code: "Geist Mono", ui-monospace, monospace;
              --scalar-color-accent: #0A4D3A;
              --scalar-button-1: #062A1E;
              --scalar-button-1-color: #FFFFFF;
              --scalar-button-1-hover: #0A4D3A;
            }
            .light-mode {
              --scalar-color-1: #0B2018;
              --scalar-color-2: #445A51;
              --scalar-color-3: #6E8278;
              --scalar-color-accent: #0A4D3A;
              --scalar-background-1: #FFFFFF;
              --scalar-background-2: #F6F9F4;
              --scalar-background-3: #E4EAE3;
              --scalar-border-color: #E4EAE3;
            }
            .scalar-api-reference [class*="introduction"] h1 {
              font-family: "Fraunces", "Times New Roman", serif !important;
              font-weight: 400 !important;
              letter-spacing: -0.02em !important;
            }
          `,
        }}
      />
    </div>
  );
}
