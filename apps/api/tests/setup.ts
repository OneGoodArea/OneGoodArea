import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw-server";

/* Global test setup (wired via vitest.config.ts setupFiles). Boots the MSW
   server once, resets per-test handlers between tests, and tears down at the
   end. Tests that make no network calls are unaffected.

   Uses "error" so a test can never silently hit a real upstream — every
   outbound request must be mocked. The Stripe route tests are the one
   exception: they close MSW in their own beforeAll (see msw-server.ts) so the
   Stripe SDK can reach the local stripe-mock service directly. */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
