import { buildApp } from "./app";

/* Entry point for the standalone backend (npm run dev / container CMD).
   The Next app does NOT import this — apps/api runs as its own process. */

const port = Number(process.env.PORT ?? 8080);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildApp({ logger: true });

app
  .listen({ port, host })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
