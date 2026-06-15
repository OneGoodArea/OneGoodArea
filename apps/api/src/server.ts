import { buildApp } from "./app";
import { getConfig } from "./infrastructure/config";

/* Entry point for the standalone backend (npm run dev / container CMD).
   The Next app does NOT import this — apps/api runs as its own process. */

const config = getConfig();

(async () => {
  const app = await buildApp({ logger: true });

  app
    .listen({ port: config.port, host: config.host })
    .catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
})();
