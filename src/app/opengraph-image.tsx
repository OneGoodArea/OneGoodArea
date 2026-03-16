import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AreaIQ - UK Area Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          padding: "60px 70px",
          background: "#09090b",
          fontFamily: "monospace",
        }}
      >
        {/* Top: Logo + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "36px", fontWeight: 700, color: "#e4e4e8", letterSpacing: "-0.5px" }}>
            AREA
          </span>
          <span style={{ fontSize: "36px", fontWeight: 700, color: "#00ff88", letterSpacing: "-0.5px" }}>
            IQ
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "#555",
              border: "1px solid #1c1c22",
              padding: "3px 8px",
              marginLeft: "8px",
              background: "#0f0f12",
            }}
          >
            BETA
          </span>
        </div>

        {/* Middle: Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "52px", fontWeight: 600, color: "#e4e4e8", lineHeight: 1.1, letterSpacing: "-1px" }}>
            UK area intelligence.
          </div>
          <div style={{ fontSize: "52px", fontWeight: 600, color: "#3b82f6", lineHeight: 1.1, letterSpacing: "-1px" }}>
            Scored. Explained. Instant.
          </div>
          <div style={{ fontSize: "20px", color: "#71717a", lineHeight: 1.5, maxWidth: "700px", marginTop: "8px" }}>
            Enter any UK postcode. Get a scored intelligence report from real government data: crime, deprivation, amenities, flood risk. In seconds.
          </div>
        </div>

        {/* Bottom: Stats strip */}
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          {[
            { value: "6", label: "DATA SOURCES" },
            { value: "33,755", label: "LSOAs COVERED" },
            { value: "4", label: "INTENT TYPES" },
            { value: "100%", label: "UK COVERAGE" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "28px", fontWeight: 700, color: "#00ff88" }}>
                {stat.value}
              </span>
              <span style={{ fontSize: "10px", color: "#555", letterSpacing: "1.5px" }}>
                {stat.label}
              </span>
            </div>
          ))}

          {/* Domain */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ff88" }} />
            <span style={{ fontSize: "14px", color: "#71717a" }}>
              area-iq.co.uk
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
