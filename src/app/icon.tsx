import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#09090b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: -0.5,
            display: "flex",
          }}
        >
          <span style={{ color: "#ffffff" }}>A</span>
          <span style={{ color: "#00ff88" }}>IQ</span>
        </span>
      </div>
    ),
    { ...size }
  );
}
