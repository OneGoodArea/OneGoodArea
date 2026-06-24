import Fastify, { type FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import { registerSystemRoutes } from "./routes/system";
import { registerAuthRoutes } from "./routes/auth";
import { registerMeRoutes } from "./routes/me";
import { registerApiKeysRoutes } from "./routes/api-keys";
import { registerStripeRoutes } from "./routes/stripe";
import { registerWebhooksRoutes } from "./routes/webhooks";
import { registerAdminRoutes } from "./routes/admin";
import { registerSignalsRoutes } from "./routes/signals";
import { registerScoringRoutes } from "./routes/scoring";
import { registerPortfoliosRoutes } from "./routes/portfolios";
import { registerOrgsRoutes } from "./routes/orgs";
import { registerOrgMembersRoutes } from "./routes/org-members";
import { registerOrgBundlesRoutes } from "./routes/org-bundles";
import { registerOrgPresetsRoutes } from "./routes/org-presets";
import { registerOrgCohortsRoutes } from "./routes/org-cohorts";
import { registerOrgMethodologyRoutes } from "./routes/org-methodology";
import { registerIntelligenceRoutes } from "./routes/intelligence";
declare module "fastify" {
  interface FastifyRequest {
    /** Raw request body string, preserved by the JSON content-type parser so the
        Stripe webhook can verify the HMAC signature over the exact payload. */
    rawBody?: string;
  }
}


export async function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, ajv: { customOptions: { keywords: ["example"] } } });

  // OpenAPI/Swagger documentation — /docs (Swagger UI) and /openapi.json (raw spec).
  await app.register(fastifySwagger, {
    openapi: {
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
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

  // JSON parser that also stashes the raw body string on the request. Routes
  // still receive a parsed `request.body` (identical to Fastify's default); the
  // Stripe webhook additionally reads `request.rawBody` to verify the HMAC over
  // the exact payload bytes. Empty bodies error the same way the default does.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    // parseAs:"string" guarantees a string at runtime; Fastify still types it as
    // string | Buffer, so coerce for the type checker.
    const raw = typeof body === "string" ? body : body.toString("utf8");
    request.rawBody = raw;
    // An empty body is treated as "no body" (request.body = undefined) rather
    // than a parse error. The legacy Next routes never errored on an empty body
    // when content-type was application/json (e.g. a DELETE with the header set
    // but no payload), and route handlers already guard `request.body`.
    if (raw.length === 0) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      (err as { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });

  registerSystemRoutes(app);
  registerAuthRoutes(app);
  registerMeRoutes(app);
  registerApiKeysRoutes(app);
  registerStripeRoutes(app);
  registerWebhooksRoutes(app);
  registerAdminRoutes(app);
  registerSignalsRoutes(app);
  registerScoringRoutes(app);
  registerPortfoliosRoutes(app);
  registerOrgsRoutes(app);
  registerOrgMembersRoutes(app);
  registerOrgBundlesRoutes(app);
  registerOrgPresetsRoutes(app);
  registerOrgCohortsRoutes(app);
  registerOrgMethodologyRoutes(app);
  registerIntelligenceRoutes(app);

  return app;
}
