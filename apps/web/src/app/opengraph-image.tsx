import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OneGoodArea - UK Area Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* OG image in OneGoodArea visual language.
   Cream background, forest-ink text, chartreuse accents on eyebrow dot
   and the italic headline underline. ImageResponse runs on the edge
   runtime, so we use system fallbacks for Fraunces (Georgia) and
   Geist Mono (ui-monospace). */

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
          padding: "70px 80px",
          background: "#F6F9F4",
          position: "relative",
        }}
      >
        {/* Subtle radial chartreuse wash behind hero */}
        <div
          style={{
            position: "absolute",
            top: -240,
            left: 200,
            width: 800,
            height: 600,
            display: "flex",
            background:
              "radial-gradient(ellipse at center, rgba(212,243,58,0.28) 0%, rgba(212,243,58,0) 58%)",
          }}
        />

        {/* Top row: eyebrow + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 10,
                background: "#D4F33A",
                boxShadow: "0 0 0 6px rgba(212,243,58,0.3)",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: 16,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 500,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#445A51",
              }}
            >
              UK area intelligence
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontSize: 26,
                fontFamily: "Georgia, serif",
                fontWeight: 500,
                letterSpacing: -0.5,
                color: "#062A1E",
              }}
            >
              OneGood
            </span>
            <span
              style={{
                fontSize: 26,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontWeight: 500,
                letterSpacing: -0.5,
                color: "#0A4D3A",
              }}
            >
              Area
            </span>
          </div>
        </div>

        {/* Middle: headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            position: "relative",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: -2,
              color: "#062A1E",
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            <span>An intelligence report for&nbsp;</span>
            <span
              style={{
                fontStyle: "italic",
                color: "#0A4D3A",
                position: "relative",
                display: "flex",
                paddingBottom: 8,
                borderBottom: "5px solid #D4F33A",
              }}
            >
              every UK postcode
            </span>
            <span>.</span>
          </div>
          <div
            style={{
              fontSize: 22,
              fontFamily: "sans-serif",
              color: "#445A51",
              lineHeight: 1.5,
              maxWidth: 820,
              display: "flex",
            }}
          >
            Type a place. Pick why you&apos;re looking. Seven public datasets
            do the rest.
          </div>
        </div>

        {/* Bottom row: stats + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 32,
            borderTop: "1px solid #E4EAE3",
            paddingTop: 24,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: 48 }}>
            {[
              { value: "42,640", label: "UK neighbourhoods" },
              { value: "7", label: "Public datasets" },
              { value: "4", label: "Intents" },
            ].map((s) => (
              <div
                key={s.label}
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontFamily: "Georgia, serif",
                    fontWeight: 500,
                    letterSpacing: -1,
                    color: "#062A1E",
                    display: "flex",
                  }}
                >
                  {s.value}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "ui-monospace, monospace",
                    fontWeight: 500,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#6E8278",
                    display: "flex",
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              border: "1px solid #062A1E",
              background: "#D4F33A",
              borderRadius: 999,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 500,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#1A2600",
                display: "flex",
              }}
            >
              onegoodarea.com
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
