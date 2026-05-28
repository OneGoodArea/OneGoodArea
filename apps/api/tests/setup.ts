import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw-server";

/* Global test setup (wired via vitest.config.ts setupFiles). Boots the MSW
   server once, resets per-test handlers between tests, and tears down at the
   end. Tests that make no network calls are unaffected. */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
