import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/* OneGoodArea favicon - matches the Mark component used in the Wordmark
   on the nav. Concentric forest-ink rings on a cream surface with the
   signature offset chartreuse dot at the top-right (the "area locked
   in" pin). ImageResponse can't render raw SVG, so we rebuild the same
   geometry with absolutely positioned divs. */

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#F6F9F4",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          border: "1px solid #062A1E",
        }}
      >
        {/* Outer ring (r=10 on 24px viewBox → ~18.8px on 32px) */}
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 20,
            border: "1.5px solid #0A4D3A",
            display: "flex",
            position: "absolute",
          }}
        />
        {/* Inner ring (r=5.5 on 24px viewBox → ~11px on 32px) */}
        <div
          style={{
            width: 11,
            height: 11,
            borderRadius: 11,
            border: "1.5px solid #0A4D3A",
            display: "flex",
            position: "absolute",
          }}
        />
        {/* Offset chartreuse dot (top-right of centre, per Mark: cx=15.4, cy=9.2) */}
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: 7,
            background: "#D4F33A",
            border: "1.3px solid #062A1E",
            display: "flex",
            position: "absolute",
            top: 6,
            right: 6,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
