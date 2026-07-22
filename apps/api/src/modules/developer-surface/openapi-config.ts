/**
 * Developer Surface — OpenAPI spec configuration.
 *
 * Owns the Swagger/OpenAPI metadata (info, tags, security schemes) that
 * feeds `@fastify/swagger` and ultimately powers the Scalar renderer at
 * `/playground`. Extracted from app.ts so the developer-surface module is
 * self-contained.
 */
import type { FastifyDynamicSwaggerOptions } from "@fastify/swagger";

export const openApiConfig: FastifyDynamicSwaggerOptions["openapi"] = {
  info: {
    title: "OneGoodArea API",
    version: "1.0.0",
    description: "Area intelligence API — scores, signals, reports, and org management.",
  },
  servers: [{ url: process.env.API_PUBLIC_URL || "http://localhost:4000" }],
  tags: [
    { name: "Meta", description: "Health and version endpoints" },
    { name: "Reports", description: "Generate and retrieve area reports" },
    { name: "Signals", description: "Signal-first area profiles" },
    { name: "Scores", description: "Scoring engine" },
    { name: "Portfolios", description: "Portfolio management" },
    { name: "Orgs", description: "Organization and member management" },
    { name: "Invitations", description: "Org invitations" },
    { name: "Bundles", description: "Signal bundles" },
    { name: "Presets", description: "Scoring presets" },
    { name: "Methodology", description: "Engine version pins" },
    { name: "Cohorts", description: "Area cohorts" },
    { name: "Intelligence", description: "Query, peers, insights, forecast" },
    { name: "Webhooks", description: "Outbound webhook subscriptions" },
    { name: "Usage", description: "Plan and quota endpoints" },
    { name: "Keys", description: "API key management" },
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Stripe", description: "Billing and subscriptions" },
    { name: "Settings", description: "Account settings" },
    { name: "Dashboard", description: "Dashboard composite data" },
    { name: "Tracking", description: "Analytics and pageview tracking" },
    { name: "Watchlist", description: "Saved areas watchlist" },
    { name: "Admin", description: "Admin analytics (superuser only)" },
    { name: "Cron", description: "Scheduled jobs" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API key from /keys. Header: Authorization: Bearer oga_live_...",
      },
      bridgeToken: {
        type: "http",
        scheme: "bearer",
        description: "Bridge token minted by the web BFF. Internal use only.",
      },
      bearerToken: {
        type: "http",
        scheme: "bearer",
        description: "JWT session token. Browser login. Authorization: Bearer <jwt>.",
      },
    },
  },
};
