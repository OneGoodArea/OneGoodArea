import type { FastifyInstance } from "fastify";
import { INTENTS } from "@onegoodarea/contracts";
import { getConfig } from "../infrastructure/config";
import { runRescoreCron } from "../modules/engine/rescore";
import { runTrainingRetentionCron } from "../modules/training/retention";
import { logger } from "../modules/tracking/structured-logger";

/** system route handlers — extracted from app.ts per AR-286. */
export function registerSystemRoutes(app: FastifyInstance): void {
    app.get("/health",
      {
      schema: {
            "tags": [
                "Meta"
            ],
            "summary": "Health check",
            "description": "Liveness probe for container hosts."
        },
      }, async () => ({ status: "ok" }));

    app.get("/v1/meta",
      {
      schema: {
            "tags": [
                "Meta"
            ],
            "summary": "API metadata",
            "description": "Returns supported intents, signal categories, and engine version."
        },
      }, async () => ({
      service: "onegoodarea-api",
      phase: "1-reports-vertical",
      intents: INTENTS,
    }));

    app.get("/cron/rescore", async (request, reply) => {
      const config = getConfig();
      const expected = config.cronSecret;
      if (!expected) {
        return reply.code(503).send({ error: "CRON_SECRET not configured on this deployment" });
      }
      if (request.headers.authorization !== `Bearer ${expected}`) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const q = (request.query ?? {}) as { limit?: string; dry_run?: string };
      const limit = q.limit ? parseInt(q.limit, 10) : undefined;
      const dryRun = q.dry_run === "true";

      try {
        const summary = await runRescoreCron({ limit, dryRun });
        logger.info("[cron/rescore] done", summary);
        return reply.send(summary);
      } catch (err) {
        logger.error("[cron/rescore] fatal", err);
        return reply.code(500).send({ error: err instanceof Error ? err.message : "Cron failed" });
      }
    });

    /* AR-377: nightly retention purge for training tables. Same auth
       pattern as /cron/rescore — Bearer CRON_SECRET. Caller should
       schedule via Render cron jobs (or equivalent) once daily. */
    app.get("/cron/training-retention", async (request, reply) => {
      const config = getConfig();
      const expected = config.cronSecret;
      if (!expected) {
        return reply.code(503).send({ error: "CRON_SECRET not configured on this deployment" });
      }
      if (request.headers.authorization !== `Bearer ${expected}`) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const q = (request.query ?? {}) as { dry_run?: string };
      const dryRun = q.dry_run === "true";

      try {
        const summary = await runTrainingRetentionCron({ dryRun });
        logger.info("[cron/training-retention] done", summary);
        return reply.send(summary);
      } catch (err) {
        logger.error("[cron/training-retention] fatal", err);
        return reply.code(500).send({ error: err instanceof Error ? err.message : "Cron failed" });
      }
    });
}
