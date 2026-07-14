import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OneGoodArea, UK area intelligence infrastructure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* OG / social preview, Brand v3 (Plotted). Warm cream canvas, graphite ink,
   the dot-grid mark as the logo plus a large faint mark as background
   texture, and the product-led headline that matches the homepage hero.
   Edge runtime, so system font fallbacks (Geist -> sans-serif /
   ui-monospace). AR-473 (replaces the old forest-green + lime B2C card). */

const MARK_ROWS = ["...X...", ".XXXXX.", ".XXXXX.", "XXXCXXX", ".XXXXX.", ".XXXXX.", "...X..."];

function Mark({ cell, color, opacity = 1 }: { cell: number; color: string; opacity?: number }) {
  const dot = Math.round(cell * 0.56);
  return (
    <div style={{ display: "flex", flexDirection: "column", opacity }}>
      {MARK_ROWS.map((row, ri) => (
        <div key={ri} style={{ display: "flex" }}>
          {[...row].map((ch, ci) => (
            <div
              key={ci}
              style={{
                width: cell,
                height: cell,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ch !== "." ? (
                <div
                  style={{
                    width: ch === "C" ? cell : dot,
                    height: ch === "C" ? cell : dot,
                    borderRadius: cell,
                    background: color,
                    display: "flex",
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 80px",
          background: "#EFECE6",
          position: "relative",
        }}
      >
        {/* large faint mark, background texture bleeding off the right edge */}
        <div style={{ position: "absolute", top: 130, right: -80, display: "flex" }}>
          <Mark cell={64} color="#1A1C1F" opacity={0.05} />
        </div>

        {/* top: mark + wordmark lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          <Mark cell={9} color="#1A1C1F" />
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontFamily: "sans-serif",
              fontWeight: 600,
              letterSpacing: -0.6,
              color: "#1A1C1F",
            }}
          >
            onegoodarea
          </div>
        </div>

        {/* middle: eyebrow + headline + subhead */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            position: "relative",
            maxWidth: 1000,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: 8, background: "#1A1C1F", display: "flex" }} />
            <div
              style={{
                display: "flex",
                fontSize: 15,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 500,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#55565A",
              }}
            >
              Built for property and risk teams
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 66,
              fontFamily: "sans-serif",
              fontWeight: 600,
              lineHeight: 1.04,
              letterSpacing: -2,
              color: "#1A1C1F",
            }}
          >
            Build UK area intelligence into your product.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontFamily: "sans-serif",
              color: "#45474B",
              lineHeight: 1.45,
              maxWidth: 880,
            }}
          >
            Area scores, source-backed signals, monitoring, and intelligence you
            can audit. One API.
          </div>
        </div>

        {/* bottom: proof + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(26,28,31,0.14)",
            paddingTop: 24,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 15,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 500,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#6E6F73",
            }}
          >
            UK-wide · Versioned · Explainable
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              border: "1px solid rgba(26,28,31,0.4)",
              borderRadius: 999,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 500,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#1A1C1F",
              }}
            >
              onegoodarea.com
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
