import Stripe from "stripe";
import { getConfig } from "../../infrastructure/config";

/* Stripe SDK client. Migrated VERBATIM from legacy src/lib/stripe.ts (the
   getStripeClient + `stripe` proxy half only; the PLANS/ADDONS catalog was
   split out earlier into ./plans). Reads STRIPE_SECRET_KEY from centralised
   config (container-injected env, not the Next loader).

   The export is a lazy Proxy so importing this module never constructs a client
   or requires the key; the client is built on first property access and cached,
   which keeps the key out of code paths (tests, the migrator) that never touch
   Stripe. */

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const config = getConfig();
  const secretKey = config.stripeSecretKey;
  if (!secretKey) {
    throw new Error("Neither apiKey nor config.authenticator provided");
  }

  stripeClient = new Stripe(secretKey, {
    typescript: true,
    ...(config.stripeApiBaseUrl ? { apiBase: config.stripeApiBaseUrl } : {}),
  });
  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  // Trailing `receiver` arg dropped vs the legacy src/lib/stripe.ts copy: it was
  // unused (lint) and the Proxy get trap behaves identically without it.
  get(_target, prop) {
    const client = getStripeClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
