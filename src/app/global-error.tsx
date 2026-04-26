"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

/* Global error boundary. Renders its own <html>/<body> because this fires
   when the root layout itself fails to render. Must be styled inline - no
   imports from the design-v2 Styles component, no layout context. */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[OneGoodArea] Global error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#FFFFFF",
          color: "#0B2018",
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 20px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 540, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Geist Mono', ui-monospace, monospace",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "#445A51",
              marginBottom: 22,
            }}
          >
            Status · HTTP 500
          </div>

          <div
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(96px, 14vw, 160px)",
              fontWeight: 400,
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
              color: "#062A1E",
              margin: "0 0 18px",
            }}
          >
            5
            <span
              style={{
                fontStyle: "italic",
                color: "#0A4D3A",
                position: "relative",
                display: "inline-block",
              }}
            >
              0
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: "8%",
                  right: "8%",
                  bottom: "12%",
                  height: 10,
                  background: "#D4F33A",
                  opacity: 0.88,
                  zIndex: -1,
                }}
              />
            </span>
            0
          </div>

          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(24px, 3.2vw, 34px)",
              fontWeight: 400,
              lineHeight: 1.1,
              letterSpacing: "-0.016em",
              color: "#062A1E",
              margin: "10px 0 14px",
            }}
          >
            The page didn&apos;t load.
          </h1>

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              lineHeight: 1.55,
              color: "#445A51",
              margin: "0 auto 28px",
              maxWidth: "46ch",
            }}
          >
            A critical error prevented the app shell from rendering. Try
            reloading. If this keeps happening, drop us a note.
          </p>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#1A2600",
                background: "#D4F33A",
                padding: "13px 22px",
                borderRadius: 999,
                border: "1px solid #062A1E",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#0A4D3A",
                background: "transparent",
                padding: "13px 22px",
                borderRadius: 999,
                border: "1px solid #E4EAE3",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Go home
            </a>
          </div>

          {error.digest && (
            <div
              style={{
                marginTop: 32,
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6E8278",
              }}
            >
              Ref · {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
