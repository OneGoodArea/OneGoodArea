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

/* OneGoodArea PLANS (canonical source of truth for tiers, quotas, and Stripe IDs).
 *
 * Two generations live side-by-side:
 *   - V1 LEGACY (free / starter / pro / developer / business / growth) — kept ALIVE for
 *     grandfathered Stripe subscribers. As of 2026-05-04, zero paying customers, but the
 *     architecture supports grandfathering for the day someone pays.
 *   - V2 ACTIVE (sandbox / starter_v2 / build / scale / growth_v2 / enterprise) — pricing v2
 *     per AR-143, approved 2026-05-04. Public on /pricing. New signups land here.
 *
 * V2 design notes (research-backed, see PRICING-V2-PROPOSAL.md):
 *   - Per-call rates beat WhenFresh / Hometrack / Cotality 50-95% while keeping 60%+ margin
 *     via 24h cache (typical 70-80% cache-hit rate at scale).
 *   - Sandbox is the developer-led discovery tier — small quota, hard cap, no card.
 *   - Build / Scale / Growth are eligible for 17% annual prepay (12 for 10).
 *   - Enterprise has a published floor (£4,999/mo) that anchors contract conversations;
 *     real ACVs negotiated to £60-250k/yr.
 *
 * Overage rules (V2 only):
 *   - Sandbox + Starter: HARD cap. 429 thrown, no extra calls billed.
 *   - Build / Scale / Growth: SOFT cap with +25% headroom included, then £0.05/call (~3x list,
 *     market-standard penalty).
 *   - Enterprise: NEGOTIATED. Custom commit + tiered overage in MSA.
 *
 * Stripe price IDs:
 *   - V1 fallbacks are LIVE production price IDs (existing customers).
 *   - V2 fallbacks are EMPTY — must be set via env var (.env.local for dev, Vercel for prod).
 *     TEST mode IDs were generated 2026-05-04 via scripts/create-stripe-prices.ts and are
 *     in .env.local. To create LIVE prices, run the script with --execute --live.
 */
export const PLANS = {
  /* ─── V1 LEGACY (grandfathering only — not on public /pricing) ─── */
  free: {
    name: "Free",
    price: 0,
    reportsPerMonth: 3,
    priceId: null,
    apiAccess: false,
    generation: "v1",
    overageMode: "hard" as const,
  },
  starter: {
    name: "Starter (legacy)",
    price: 2900, // £29
    reportsPerMonth: 20,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    apiAccess: false,
    generation: "v1",
    overageMode: "hard" as const,
  },
  pro: {
    name: "Pro (legacy)",
    price: 7900, // £79
    reportsPerMonth: 75,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    apiAccess: false,
    generation: "v1",
    overageMode: "hard" as const,
  },
  developer: {
    name: "Developer (legacy)",
    price: 9900, // £99 (April 2026 reprice)
    reportsPerMonth: 10000,
    priceId: process.env.STRIPE_DEVELOPER_PRICE_ID || "price_1TQrWc0oI5PvXSlpqAlXQaG8",
    apiAccess: true,
    generation: "v1",
    overageMode: "hard" as const,
  },
  business: {
    name: "Business (legacy)",
    price: 49900, // £499 (April 2026 reprice)
    reportsPerMonth: 50000,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || "price_1TQrWd0oI5PvXSlpFeLRBkAt",
    apiAccess: true,
    generation: "v1",
    overageMode: "hard" as const,
  },
  growth: {
    name: "Growth (legacy)",
    price: 149900, // £1,499 (April 2026 reprice)
    reportsPerMonth: 250000,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID || "price_1TQrWd0oI5PvXSlpZASdLVI4",
    apiAccess: true,
    generation: "v1",
    overageMode: "hard" as const,
  },

  /* ─── V2 ACTIVE (public on /pricing, AR-143) ─── */
  sandbox: {
    name: "Sandbox",
    price: 0,
    reportsPerMonth: 35,
    priceId: null,
    apiAccess: true,
    generation: "v2",
    overageMode: "hard" as const,
    overagePence: 0,
    softCapHeadroomPct: 0,
  },
  starter_v2: {
    name: "Starter",
    price: 4900, // £49
    reportsPerMonth: 1500,
    priceId: process.env.STRIPE_STARTER_V2_PRICE_ID || "",
    apiAccess: true,
    generation: "v2",
    overageMode: "hard" as const,
    overagePence: 0,
    softCapHeadroomPct: 0,
  },
  build: {
    name: "Build",
    price: 14900, // £149
    reportsPerMonth: 6000,
    priceId: process.env.STRIPE_BUILD_PRICE_ID || "",
    annualPriceId: process.env.STRIPE_BUILD_ANNUAL_PRICE_ID || "",
    apiAccess: true,
    generation: "v2",
    overageMode: "soft" as const,
    overagePence: 5, // £0.05 per overage call
    softCapHeadroomPct: 25,
  },
  scale: {
    name: "Scale",
    price: 49900, // £499
    reportsPerMonth: 25000,
    priceId: process.env.STRIPE_SCALE_PRICE_ID || "",
    annualPriceId: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || "",
    apiAccess: true,
    generation: "v2",
    overageMode: "soft" as const,
    overagePence: 5,
    softCapHeadroomPct: 25,
  },
  growth_v2: {
    name: "Growth",
    price: 149900, // £1,499
    reportsPerMonth: 100000,
    priceId: process.env.STRIPE_GROWTH_V2_PRICE_ID || "",
    annualPriceId: process.env.STRIPE_GROWTH_V2_ANNUAL_PRICE_ID || "",
    apiAccess: true,
    generation: "v2",
    overageMode: "soft" as const,
    overagePence: 5,
    softCapHeadroomPct: 25,
  },
  enterprise: {
    name: "Enterprise",
    price: 499900, // £4,999/mo public floor; real ACVs negotiated £60-250k/yr
    reportsPerMonth: 250000, // floor; negotiated up
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
    apiAccess: true,
    generation: "v2",
    overageMode: "negotiated" as const,
    overagePence: 0,
    softCapHeadroomPct: 0,
  },
} as const;

export type PlanId = keyof typeof PLANS;

/* Plan groupings.
 *
 * API_PLANS = any tier with apiAccess: true (used by hasApiAccess() to gate API key issuance).
 * CONSUMER_PLANS = legacy v1 consumer tiers (free / starter / pro), kept for grandfathering.
 * V2_PUBLIC_PLANS = the tiers shown on /pricing (the live commercial offering).
 * V2_PAID_PLANS = paid v2 tiers (excludes Sandbox).
 */
export const API_PLANS: PlanId[] = [
  // V1 (grandfathered)
  "developer", "business", "growth",
  // V2 active
  "sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise",
];
export const CONSUMER_PLANS: PlanId[] = ["free", "starter", "pro"];
export const V2_PUBLIC_PLANS: PlanId[] = ["sandbox", "starter_v2", "build", "scale", "growth_v2", "enterprise"];
export const V2_PAID_PLANS: PlanId[] = ["starter_v2", "build", "scale", "growth_v2", "enterprise"];
