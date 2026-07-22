import Fastify, { type FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { type ZodTypeProvider } from "@fastify/type-provider-zod";
import { zodSafeJsonSchemaTransform } from "./infrastructure/utils/zod-safe-json-schema-transform";
import { hybridValidatorCompiler } from "./infrastructure/utils/hybrid-validator-compiler";
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

     No serializer compiler is set: no route declares a response schema, and
     the previous `setSerializerCompiler(validatorCompiler)` passed a VALIDATOR
     where a serializer was expected, which would have failed the moment one
     was added. Fastify's default serializer applies until then. */
  app.setValidatorCompiler(hybridValidatorCompiler);

  // OpenAPI/Swagger documentation — /docs (Swagger UI) and /docs/json (raw spec).
  // Config owned by modules/developer-surface/openapi-config.ts.
  // zodSafeJsonSchemaTransform handles both Zod v4 schemas (via .toJSONSchema())
  // and plain JSON Schema objects (intelligence routes) without crashing.
  await app.register(fastifySwagger, {
    openapi: openApiConfig,
    transform: zodSafeJsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: true },
  });

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
