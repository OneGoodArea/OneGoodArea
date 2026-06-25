import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.stripe.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.de.sentry.io",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Self-contained server bundle in .next/standalone -- powers
  // container/web/Containerfile (Plan 008). Vercel ignores this flag and
  // builds its own way, so production deploys are unaffected.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // AR-327: legacy /report surface retired in favour of the four-product
  // dashboard (Signals / Scores / Monitor / Intelligence). Permanent
  // redirects keep any inbound traffic from blog posts, search-action
  // results, or bookmarks landing on something useful instead of 404
  // during the marketing-sweep gap (Phase 8 of epic AR-324).
  async redirects() {
    return [
      { source: "/report", destination: "/dashboard", permanent: true },
      { source: "/report/:id", destination: "/dashboard", permanent: true },
      // AR-334: the legacy B2C blog retired. Existing indexed blog URLs
      // (5 posts + the index) redirect home until a dedicated research-
      // notes surface ships under a future epic.
      { source: "/blog", destination: "/", permanent: true },
      { source: "/blog/:slug", destination: "/", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
