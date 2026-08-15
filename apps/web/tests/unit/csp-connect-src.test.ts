import { describe, it, expect } from "vitest";
import { buildSecurityHeaders, getCspConnectSrc, parseDevOrigins } from "@/lib/csp.mts";

/* AR-605: Scalar's "Try it" in /playground fetches directly from the
   browser to apps/api's live origin. The CSP connect-src directive
   restricts which origins the page's own JS may fetch() from at all —
   checked BEFORE the request is sent, independent of apps/api's CORS
   headers (AR-602). Without the API origin here, every Try-It request
   was blocked by the browser itself, confirmed via console:
   "Connecting to 'https://onegoodarea.onrender.com/...' violates ...
   connect-src ... The action has been blocked."

   We assert the *effective* rendered CSP (via buildSecurityHeaders)
   rather than grepping the source text, so the guard survives config
   refactors (e.g. extracting baseConnectSrc into an array). */

describe("CSP connect-src (AR-605)", () => {
  const headers = buildSecurityHeaders({ NODE_ENV: "production" });
  const connectSrc = getCspConnectSrc(headers);

  it("contains a connect-src directive", () => {
    expect(connectSrc).toBeDefined();
  });

  it("allows the apps/api origin so Scalar Try-It can reach it", () => {
    expect(connectSrc).toContain("https://onegoodarea.onrender.com");
  });

  it("keeps the app-origin and payment/analytics hosts in production", () => {
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain("https://api.stripe.com");
    expect(connectSrc).toContain("https://va.vercel-scripts.com");
    expect(connectSrc).toContain("https://vitals.vercel-insights.com");
    expect(connectSrc).toContain("https://*.ingest.de.sentry.io");
    expect(connectSrc).toContain("https://challenges.cloudflare.com");
  });

  it("does not leak dev ws:// origins into production CSP", () => {
    expect(connectSrc).not.toMatch(/ws:\/\//);
  });

  describe("dev mode", () => {
    const devHeaders = buildSecurityHeaders({
      NODE_ENV: "development",
      ALLOWED_DEV_ORIGINS: "tengelmann,localhost",
      PORT: "3000",
    });

    it("adds dev ws:// origins for each allowed host", () => {
      const devConnectSrc = getCspConnectSrc(devHeaders);
      expect(devConnectSrc).toContain("ws://tengelmann:3000");
      expect(devConnectSrc).toContain("ws://localhost:3000");
    });

    it("still includes the apps/api origin", () => {
      const devConnectSrc = getCspConnectSrc(devHeaders);
      expect(devConnectSrc).toContain("https://onegoodarea.onrender.com");
    });
  });

  describe("parseDevOrigins", () => {
    it("defaults to localhost", () => {
      expect(parseDevOrigins({})).toEqual(["localhost"]);
    });

    it("splits, trims, and drops empties", () => {
      expect(parseDevOrigins({ ALLOWED_DEV_ORIGINS: " a, b ,, " })).toEqual(["a", "b"]);
    });
  });
});
