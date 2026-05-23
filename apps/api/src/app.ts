import Fastify, { type FastifyInstance } from "fastify";
import { INTENTS } from "@onegoodarea/contracts";

/* Phase 0 scaffold of the standalone backend.

   buildApp() is a pure factory so tests can drive it via app.inject()
   without binding a port. Routes here are skeleton only — the real domain
   modules (reports, api-keys, usage, billing, ...) migrate in Phase 1+.

   /v1/meta intentionally imports from @onegoodarea/contracts to prove the
   monorepo wiring works end to end (backend consumes the shared package). */

export function buildApp(opts: { logger?: boolean } = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  // Liveness probe for the container host (Render/Fly/etc.).
  app.get("/health", async () => ({ status: "ok" }));

  // Proves apps/api can consume packages/contracts (shared source of truth).
  app.get("/v1/meta", async () => ({
    service: "onegoodarea-api",
    phase: "0-scaffold",
    intents: INTENTS,
  }));

  return app;
}
