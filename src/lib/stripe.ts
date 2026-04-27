import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Neither apiKey nor config.authenticator provided");
  }

  stripeClient = new Stripe(secretKey, { typescript: true });
  return stripeClient;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, _receiver) {
    const client = getStripeClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    reportsPerMonth: 3,
    priceId: null,
    apiAccess: false,
  },
  starter: {
    name: "Starter",
    price: 2900, // £29 in pence
    reportsPerMonth: 20,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    apiAccess: false,
  },
  pro: {
    name: "Pro",
    price: 7900, // £79 in pence
    reportsPerMonth: 75,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    apiAccess: false,
  },
  developer: {
    name: "Developer",
    price: 9900, // £99 in pence (April 2026 reprice)
    reportsPerMonth: 10000,
    priceId: process.env.STRIPE_DEVELOPER_PRICE_ID || "price_1TQrWc0oI5PvXSlpqAlXQaG8",
    apiAccess: true,
  },
  business: {
    name: "Business",
    price: 49900, // £499 in pence (April 2026 reprice)
    reportsPerMonth: 50000,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || "price_1TQrWd0oI5PvXSlpFeLRBkAt",
    apiAccess: true,
  },
  growth: {
    name: "Growth",
    price: 149900, // £1,499 in pence (April 2026 reprice)
    reportsPerMonth: 250000,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || "price_1TQrWd0oI5PvXSlpZASdLVI4",
    apiAccess: true,
  },
} as const;

/* April 2026 reprice notes:
 * - New live price IDs above replace the original Developer £49 / Business £249 / Growth £499 tiers.
 * - Existing subscribers on the old prices are grandfathered: their subscriptions keep the
 *   original Stripe price IDs and the original quotas via Stripe's subscription model.
 * - The OLD price IDs (price_1T9Q3V0oI5PvXSlpwhhZ2Sef, price_1T8ukH0oI5PvXSlprHY1EWJY,
 *   price_1T9Q3W0oI5PvXSlpCMjOCgKO) remain ACTIVE in Stripe — do not archive.
 * - Production env vars on Vercel can override these defaults. If unset, the new live
 *   price IDs are used. Test/staging environments should set their own STRIPE_*_PRICE_ID
 *   env vars to test-mode price IDs in .env.local.
 */

export type PlanId = keyof typeof PLANS;

export const API_PLANS: PlanId[] = ["developer", "business", "growth"];
export const CONSUMER_PLANS: PlanId[] = ["free", "starter", "pro"];
