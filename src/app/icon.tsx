import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/* OneGoodArea favicon: forest-ink square with concentric ring + chartreuse
   center dot. Mirrors the Mark component used inside the site. */

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#062A1E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
          position: "relative",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 20,
            border: "1.5px solid rgba(212,243,58,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 12,
            border: "1.5px solid rgba(212,243,58,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
          }}
        />
        {/* Centre dot */}
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: 5,
            background: "#D4F33A",
            display: "flex",
            position: "absolute",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
