import { AsyncLocalStorage } from "node:async_hooks";

/* Per-request context stamped by the Fastify onRequest hook (see app.ts)
   and read by trackEvent + the training-table inserts. Adoption + training
   capture all derive from these two fields. AR-375. */

export type RequestSource = "mcp" | "api";
export type ClientApp = "claude-desktop" | "cursor" | "claude-code" | "other";

export interface RequestContext {
  source: RequestSource;
  client_app: ClientApp;
}

const storage = new AsyncLocalStorage<RequestContext>();

/* Run `fn` with `ctx` as the current request context. The Fastify onRequest
   hook wraps the rest of the request lifecycle in this — never call from a
   route handler directly. */
export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/* Read the current context. Returns null when called outside a request (e.g.
   a CLI script that calls trackEvent). Callers MUST handle null — never
   blindly destructure. */
export function getRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}
