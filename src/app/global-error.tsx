"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[AreaIQ] Global error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          backgroundColor: "#09090b",
          color: "#e4e4e8",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 520, padding: "0 24px" }}>
          {/* Terminal window */}
          <div
            style={{
              borderRadius: 8,
              border: "1px solid #1c1c22",
              background: "#0f0f12",
              overflow: "hidden",
            }}
          >
            {/* Title bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 16px",
                height: 36,
                borderBottom: "1px solid #1c1c22",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ff3344",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#ffaa00",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#00ff88",
                  }}
                />
              </div>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#5a5a66",
                }}
              >
                area-iq / critical-error
              </span>
            </div>

            {/* Body */}
            <div style={{ padding: 20 }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span style={{ color: "#00ff88" }}>$</span>
                <span style={{ color: "#8a8a96" }}>
                  system --health-check
                </span>
              </div>

              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#ff3344" }}>ERR</span>
                  <span style={{ color: "#8a8a96" }}>
                    A critical error occurred
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ color: "#ff3344" }}>ERR</span>
                  <span style={{ color: "#8a8a96" }}>
                    Application layout failed to render
                  </span>
                </div>
                {error.digest && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: "#5a5a66" }}>REF</span>
                    <span style={{ color: "#5a5a66" }}>
                      Digest: {error.digest}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span style={{ color: "#ffaa00" }}>WARN</span>
                  <span style={{ color: "#8a8a96" }}>
                    Please reload the page. If this persists, contact support.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "monospace",
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "#ff3344",
                textShadow:
                  "0 0 6px rgba(255,51,68,0.15), 0 0 20px rgba(255,51,68,0.08)",
                margin: 0,
              }}
            >
              500
            </h1>
            <p
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#8a8a96",
              }}
            >
              Something went wrong.
            </p>
          </div>

          {/* Actions */}
          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "0 20px",
                height: 40,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                background: "#00ff88",
                color: "#09090b",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "0 20px",
                height: 40,
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: "1px solid #2a2a32",
                background: "#0f0f12",
                color: "#e4e4e8",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
