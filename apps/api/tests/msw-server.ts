import { setupServer } from "msw/node";

/* Shared MSW server for apps/api tests. Data-source fetcher tests register
   per-test handlers via server.use(...). Any unmocked outbound request errors
   (see setup.ts onUnhandledRequest: "error") so a test can never silently hit
   a real upstream (police.uk, ONS, Land Registry, Overpass, Ofsted...).

   Stripe test files close MSW in beforeAll / re-listen in afterAll because
   the Stripe SDK's internal NodeHttpClient must reach the stripe-mock Docker
   service directly. */
export const server = setupServer();
