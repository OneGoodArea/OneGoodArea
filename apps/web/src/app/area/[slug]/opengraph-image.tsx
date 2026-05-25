import { ImageResponse } from "next/og";
import areasJson from "@/data/areas.json";
import type { AreaData } from "@/data/area-types";

const AREAS = areasJson as Record<string, AreaData>;

export const runtime = "edge";
export const alt = "OneGoodArea Area Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Per-area OG image in OneGoodArea language. Cream surface, forest ink,
   chartreuse accents on ring + eyebrow. Score ring, top-3 dimensions,
   meta row. */

function ragColor(score: number) {
  if (score >= 70) return "#0A4D3A";
  if (score >= 45) return "#B8860B";
  return "#A01B00";
}

function ragLabel(score: number) {
  if (score >= 70) return "Strong";
  if (score >= 45) return "Moderate";
  return "Weak";
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = AREAS[slug];

  if (!area) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F6F9F4",
            color: "#062A1E",
            fontFamily: "Georgia, serif",
            fontSize: 40,
          }}
        >
          Area not found
        </div>
      ),
      { ...size }
    );
  }

  const scoreColor = ragColor(area.overallScore);
  const toneLabel = ragLabel(area.overallScore);

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
        {/* Soft chartreuse wash top-left */}
        <div
          style={{
            position: "absolute",
            top: -220,
            left: -100,
            width: 700,
            height: 500,
            display: "flex",
            background:
              "radial-gradient(ellipse at center, rgba(212,243,58,0.25) 0%, rgba(212,243,58,0) 62%)",
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
                fontSize: 15,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 500,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#445A51",
              }}
            >
              {area.region} · Area report
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontSize: 22,
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
                fontSize: 22,
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

        {/* Middle row: area name + score ring */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: 76,
                fontFamily: "Georgia, serif",
                fontWeight: 400,
                lineHeight: 1.02,
                letterSpacing: -2,
                color: "#062A1E",
                display: "flex",
              }}
            >
              {area.name}
            </div>
            <div
              style={{
                fontSize: 19,
                fontFamily: "sans-serif",
                color: "#445A51",
                display: "flex",
                gap: 20,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 500,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 2,
                  border: `1px solid ${scoreColor}`,
                  color: scoreColor,
                  background: "rgba(255,255,255,0.6)",
                  display: "flex",
                }}
              >
                {toneLabel} fit
              </span>
              <span style={{ display: "flex" }}>{area.areaType}</span>
            </div>

            <div style={{ display: "flex", gap: 28, marginTop: 18 }}>
              {area.dimensions.slice(0, 4).map((dim) => (
                <div
                  key={dim.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
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
                    {dim.label.replace(" & ", " & ")}
                  </span>
                  <span
                    style={{
                      fontSize: 28,
                      fontFamily: "Georgia, serif",
                      fontWeight: 500,
                      letterSpacing: -1,
                      color: ragColor(dim.score),
                      display: "flex",
                    }}
                  >
                    {dim.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Score ring */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 200,
              height: 200,
              borderRadius: "50%",
              border: `5px solid ${scoreColor}`,
              background: "#FFFFFF",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <span
              style={{
                fontSize: 68,
                fontFamily: "Georgia, serif",
                fontWeight: 500,
                letterSpacing: -2,
                color: scoreColor,
                lineHeight: 1,
                display: "flex",
              }}
            >
              {area.overallScore}
            </span>
            <span
              style={{
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                fontWeight: 500,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#6E8278",
                marginTop: 4,
                display: "flex",
              }}
            >
              of 100
            </span>
          </div>
        </div>

        {/* Bottom row: meta + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            borderTop: "1px solid #E4EAE3",
            paddingTop: 22,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 36,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: "#445A51",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "flex" }}>
              Population {area.population}
            </span>
            <span style={{ display: "flex" }}>
              Avg property {area.avgPropertyPrice}
            </span>
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
                fontSize: 13,
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
