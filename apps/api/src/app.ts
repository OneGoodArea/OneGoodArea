import Fastify, { type FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import { zodSafeJsonSchemaTransform } from "./infrastructure/utils/zod-safe-json-schema-transform";
import { hybridValidatorCompiler } from "./infrastructure/utils/hybrid-validator-compiler";
import { hybridSerializerCompiler } from "./infrastructure/utils/hybrid-serializer-compiler";
import { openApiConfig } from "./modules/developer-surface/openapi-config";

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
import { registerContactRoutes } from "./routes/contact";
import { classifyClientApp } from "./shared/http";
import { requireCredential } from "./shared/require-credential";
import { runWithRequestContext } from "./shared/request-context";
declare module "fastify" {
  interface FastifyRequest {
    /** Raw request body string, preserved by the JSON content-type parser so the
        Stripe webhook can verify the HMAC signature over the exact payload. */
    rawBody?: string;
  }
}


export async function buildApp(opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false, ajv: { customOptions: { keywords: ["example"] } } });

  /* AR-546: route schemas exist in both Zod and plain JSON Schema form, so the
     validator dispatches per route (Zod -> Zod compiler, otherwise -> AJV).
     Setting the Zod compiler globally 500s every JSON Schema route.

     AR-592: same mix exists on `response` schemas (added by AR-562), so the
     serializer dispatches the same way (Zod -> Zod's own encoder, otherwise
     -> fast-json-stringify). Without this, Fastify's default serializer tried
     to read raw Zod objects as JSON Schema and crashed at boot. */
  app.setValidatorCompiler(hybridValidatorCompiler);
  app.setSerializerCompiler(hybridSerializerCompiler);

  /* AR-602: apps/api had no CORS support at all, so every browser-based
     call — including Scalar's "Try it" in the playground — was silently
     blocked regardless of auth (confirmed: no Access-Control-Allow-Origin
     header, OPTIONS preflight 404s). Allow-list the production web app's
     origins; also allow the local web dev server outside production so
     Try-It works against a local apps/api during development. Registered
     before every other plugin/route so it applies universally. */
  await app.register(fastifyCors, {
    origin: [
      "https://www.onegoodarea.com",
      "https://onegoodarea.com",
      ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"]),
    ],
  });

  // OpenAPI/Swagger spec — the decorator app.swagger() builds the spec on demand.
  // Config owned by modules/developer-surface/openapi-config.ts.
  // zodSafeJsonSchemaTransform handles both Zod v4 schemas (via .toJSONSchema())
  // and plain JSON Schema objects (intelligence routes) without crashing.
  await app.register(fastifySwagger, {
    openapi: openApiConfig,
    transform: zodSafeJsonSchemaTransform,
  });

  // Serve the raw OpenAPI spec as JSON at /docs/json — consumed by Scalar at
  // /playground and the web BFF (/api/openapi-spec). Replaces the old
  // @fastify/swagger-ui /docs route which has been removed (Scalar-only).
  app.get(
    "/docs/json",
    { schema: { tags: ["Meta"], summary: "OpenAPI spec (JSON)", security: [] } },
    async () => app.swagger({ yaml: false }),
  );

  // JSON parser that also stashes the raw body string on the request. Routes
  // still receive a parsed `request.body` (identical to Fastify's default); the
  // Stripe webhook additionally reads `request.rawBody` to verify the HMAC over
  // the exact payload bytes. Empty bodies error the same way the default does.
  /* AR-375: stamp every request with {source, client_app} derived from the
     User-Agent and stash it in AsyncLocalStorage so trackEvent (and the
     training-table inserts in AR-376 / AR-377) can read it without
     threading context through every route handler. Bound to the request
     lifecycle via storage.run() — never leaks across requests. */
  app.addHook("onRequest", (request, _reply, done) => {
    const ua = Array.isArray(request.headers["user-agent"])
      ? request.headers["user-agent"][0]
      : request.headers["user-agent"];
    const ctx = classifyClientApp(ua);
    runWithRequestContext(ctx, () => done());
  });

  /* AR-548: 401 before 400. Runs ahead of schema validation so an anonymous
     caller never gets a validation error describing the route's body. Opt-in
     per route via `security` in the schema; handlers still do the real auth. */
  app.addHook("preValidation", requireCredential);

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
  registerContactRoutes(app);

  return app;
}
