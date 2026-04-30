import { ImageResponse } from "next/og";
import { BLOG_POSTS } from "../posts";

export const runtime = "edge";
export const alt = "OneGoodArea Blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Per-post blog OG image in OneGoodArea language. */

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
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
          Post not found
        </div>
      ),
      { ...size }
    );
  }

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
        <div
          style={{
            position: "absolute",
            top: -240,
            left: 200,
            width: 800,
            height: 600,
            display: "flex",
            background:
              "radial-gradient(ellipse at center, rgba(212,243,58,0.22) 0%, rgba(212,243,58,0) 60%)",
          }}
        />

        {/* Top row */}
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
              The OneGoodArea blog
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

        {/* Middle: post title + description */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            position: "relative",
            maxWidth: 960,
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              color: "#062A1E",
              display: "flex",
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              fontSize: 20,
              fontFamily: "sans-serif",
              color: "#445A51",
              lineHeight: 1.5,
              maxWidth: 820,
              display: "flex",
            }}
          >
            {post.description}
          </div>
        </div>

        {/* Bottom: meta + domain */}
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
              alignItems: "center",
              gap: 20,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: "#445A51",
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "flex" }}>{post.date}</span>
            <span style={{ color: "#9CAFA5", display: "flex" }}>·</span>
            <span style={{ display: "flex" }}>{post.readTime} read</span>
            <span style={{ color: "#9CAFA5", display: "flex" }}>·</span>
            <div style={{ display: "flex", gap: 8 }}>
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    color: "#062A1E",
                    background: "#E9F69E",
                    padding: "3px 8px",
                    borderRadius: 2,
                    display: "flex",
                  }}
                >
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
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
