/* Content-Security-Policy + related security headers, built as a pure
   function so the effective values are testable directly (AR-605 guard).

   AR-605: Scalar's "Try it" in /playground fetches directly from the
   browser to apps/api's live origin. The CSP connect-src directive
   restricts which origins the page's own JS may fetch() from at all —
   checked BEFORE the request is sent, independent of apps/api's CORS
   headers (AR-602). Without the API origin here, every Try-It request
   was blocked by the browser itself. */

export type CspEnv = Record<string, string | undefined>;

export function parseDevOrigins(env: CspEnv = process.env): string[] {
  return (env.ALLOWED_DEV_ORIGINS ?? "localhost")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildSecurityHeaders(
  env: CspEnv = process.env,
): Array<{ key: string; value: string }> {
  const devOrigins = parseDevOrigins(env);

  const baseConnectSrc = [
    "'self'",
    "https://onegoodarea.onrender.com",
    "https://api.stripe.com",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://*.ingest.de.sentry.io",
    "https://challenges.cloudflare.com",
  ];

  return [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    {
      key: "Content-Security-Policy",
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src " +
          [
            ...baseConnectSrc,
            ...(env.NODE_ENV !== "production"
              ? devOrigins.map((o) => `ws://${o}:${env.PORT ?? "3000"}`)
              : []),
          ].join(" "),
        "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; "),
    },
  ];
}

export function getCspConnectSrc(headers: Array<{ key: string; value: string }>): string | undefined {
  return headers
    .find((h) => h.key === "Content-Security-Policy")
    ?.value.split("; ")
    .find((directive) => directive.startsWith("connect-src "));
}
