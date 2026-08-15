import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { buildSecurityHeaders, parseDevOrigins } from "./src/lib/csp.mts";

const devOrigins = parseDevOrigins();

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: devOrigins,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(),
      },
    ];
  },
  async redirects() {
    return [
      { source: "/report", destination: "/dashboard", permanent: true },
      { source: "/report/:id", destination: "/dashboard", permanent: true },
      { source: "/blog", destination: "/", permanent: true },
      { source: "/blog/:slug", destination: "/", permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
