/**
 * Create Stripe products + prices for OneGoodArea pricing v2 (AR-143).
 *
 * Five new monthly products + three annual (17% off, 12-for-10) for the tiers
 * eligible for annual prepay (Build / Scale / Growth). Sandbox is free, no
 * Stripe price needed. Enterprise is contact-only with negotiated price, also
 * no public Stripe price needed.
 *
 * SAFETY:
 *   - Defaults to TEST mode. Pass --live to use the live key.
 *   - Dry-run by default. Pass --execute to actually create products/prices.
 *   - Skips creation if a product with the same metadata.tier already exists.
 *   - Prints all created IDs at the end as env-var assignments to copy into
 *     Vercel + .env.local.
 *
 * Usage:
 *   npx tsx scripts/create-stripe-prices.ts                    # dry-run, test mode
 *   npx tsx scripts/create-stripe-prices.ts --execute          # actually create, test mode
 *   npx tsx scripts/create-stripe-prices.ts --execute --live   # LIVE mode (be careful)
 */

import Stripe from "stripe";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local first, then .env as fallback
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

type TierSpec = {
  tier: string;
  productName: string;
  productDescription: string;
  monthlyPence: number;
  callsPerMonth: number;
  annualEligible: boolean;
};

type AddonSpec = {
  addon: string;
  productName: string;
  productDescription: string;
  monthlyPence: number;
};

const ADDONS: AddonSpec[] = [
  {
    addon: "mcp",
    productName: "OneGoodArea MCP Server",
    productDescription:
      "Add-on: MCP (Model Context Protocol) server access for Claude Desktop, Cursor, and any MCP-compatible client. Score postcodes inline in your AI workflow. Included free on Growth and Enterprise plans.",
    monthlyPence: 2900, // £29/mo
  },
];

const TIERS: TierSpec[] = [
  {
    tier: "starter_v2",
    productName: "OneGoodArea Starter",
    productDescription: "Indie devs, small PropTech, retail-tech. 1,500 API calls / month. Single API key. Idempotency keys.",
    monthlyPence: 4900,
    callsPerMonth: 1500,
    annualEligible: false,
  },
  {
    tier: "build",
    productName: "OneGoodArea Build",
    productDescription: "Niche PropTech, small InsureTech MGA, small CRE. 6,000 API calls / month. Multiple API keys, version pinning, 99.5% SLA, 5-day email support.",
    monthlyPence: 14900,
    callsPerMonth: 6000,
    annualEligible: true,
  },
  {
    tier: "scale",
    productName: "OneGoodArea Scale",
    productDescription: "Mid-tier challenger lender, mid insurer, mid PropTech. 25,000 API calls / month. Webhooks, batch endpoint, audit log, 99.9% SLA, 48h email support, signed DPA.",
    monthlyPence: 49900,
    callsPerMonth: 25000,
    annualEligible: true,
  },
  {
    tier: "growth_v2",
    productName: "OneGoodArea Growth",
    productDescription: "Larger lenders, regional InsureTech, scaling PropTech. 100,000 API calls / month. SOC 2 letter, 99.9% SLA, 24h support, dedicated Slack channel.",
    monthlyPence: 149900,
    callsPerMonth: 100000,
    annualEligible: true,
  },
  {
    tier: "enterprise",
    productName: "OneGoodArea Enterprise",
    productDescription: "Big-6 lender, top-10 insurer, Houseful-scale PropTech, Big-3 CRE. From 250,000 API calls / month. Custom MSA, named CSM, white-label, address-level scoring (when shipped), 99.95% SLA. Negotiated annual contract.",
    monthlyPence: 499900,
    callsPerMonth: 250000,
    annualEligible: false,
  },
];

const ANNUAL_DISCOUNT = 12 / 10; // 12 months for 10 = 17% off

function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes("--live");
  const execute = args.includes("--execute");

  const keyEnv = isLive ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY";
  let secretKey = process.env[keyEnv];

  // Fallback to STRIPE_SECRET_KEY if STRIPE_SECRET_KEY_LIVE not set in --live mode
  if (!secretKey && isLive) {
    secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey && !secretKey.startsWith("sk_live_")) {
      console.error("--live passed but STRIPE_SECRET_KEY is not a live key (does not start with sk_live_). Aborting.");
      process.exit(1);
    }
  }

  if (!secretKey) {
    console.error(`Missing ${keyEnv} (or STRIPE_SECRET_KEY) in environment. Check .env.local.`);
    process.exit(1);
  }

  const mode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";
  if (isLive && mode !== "LIVE") {
    console.error("--live flag passed but secret key is not a live key. Aborting for safety.");
    process.exit(1);
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  OneGoodArea pricing v2 — Stripe product/price creation`);
  console.log(`  Mode:    ${mode}`);
  console.log(`  Action:  ${execute ? "EXECUTE (will create real products + prices)" : "DRY RUN (will only print plan)"}`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");

  const stripe = new Stripe(secretKey);

  type CreatedPrice = { tier: string; envVar: string; priceId: string; cadence: "monthly" | "annual"; amountPence: number };
  const created: CreatedPrice[] = [];

  for (const t of TIERS) {
    console.log(`── ${t.productName} (tier: ${t.tier}) ──`);
    console.log(`   Monthly: ${gbp(t.monthlyPence)} / month, ${t.callsPerMonth.toLocaleString()} calls`);
    if (t.annualEligible) {
      const annualPence = Math.round(t.monthlyPence * 10); // 12-for-10 = 10 months annual
      console.log(`   Annual:  ${gbp(annualPence)} / year (12 for 10, 17% off)`);
    }

    if (!execute) {
      console.log(`   [dry-run] would create product + ${t.annualEligible ? 2 : 1} price(s)`);
      console.log("");
      continue;
    }

    // 1. Find existing product by metadata.tier or create a new one
    const existing = await stripe.products.search({
      query: `metadata['tier']:'${t.tier}' AND metadata['version']:'v2'`,
    });

    let productId: string;
    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`   [skip-product] reusing existing product ${productId}`);
    } else {
      const product = await stripe.products.create({
        name: t.productName,
        description: t.productDescription,
        metadata: {
          tier: t.tier,
          version: "v2",
          created_by: "create-stripe-prices.ts",
          created_at: new Date().toISOString(),
        },
      });
      productId = product.id;
      console.log(`   [created] product ${productId}`);
    }

    // 2. Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: productId,
      unit_amount: t.monthlyPence,
      currency: "gbp",
      recurring: { interval: "month" },
      metadata: {
        tier: t.tier,
        version: "v2",
        cadence: "monthly",
        calls_per_month: String(t.callsPerMonth),
      },
    });
    console.log(`   [created] monthly price ${monthlyPrice.id}`);

    const monthlyEnvVar = `STRIPE_${t.tier.toUpperCase()}_PRICE_ID`;
    created.push({
      tier: t.tier,
      envVar: monthlyEnvVar,
      priceId: monthlyPrice.id,
      cadence: "monthly",
      amountPence: t.monthlyPence,
    });

    // 3. Annual price if eligible
    if (t.annualEligible) {
      const annualPence = Math.round(t.monthlyPence * 10);
      const annualPrice = await stripe.prices.create({
        product: productId,
        unit_amount: annualPence,
        currency: "gbp",
        recurring: { interval: "year" },
        metadata: {
          tier: t.tier,
          version: "v2",
          cadence: "annual",
          calls_per_month: String(t.callsPerMonth),
          discount_pct: "17",
        },
      });
      console.log(`   [created] annual price ${annualPrice.id} at ${gbp(annualPence)}`);

      const annualEnvVar = `STRIPE_${t.tier.toUpperCase()}_ANNUAL_PRICE_ID`;
      created.push({
        tier: t.tier,
        envVar: annualEnvVar,
        priceId: annualPrice.id,
        cadence: "annual",
        amountPence: annualPence,
      });
    }
    console.log("");
  }

  // Add-ons (currently only MCP)
  for (const a of ADDONS) {
    console.log(`── ${a.productName} (addon: ${a.addon}) ──`);
    console.log(`   Monthly: ${gbp(a.monthlyPence)} / month, no quota (entitlement-only)`);

    if (!execute) {
      console.log(`   [dry-run] would create product + 1 price`);
      console.log("");
      continue;
    }

    const existing = await stripe.products.search({
      query: `metadata['addon']:'${a.addon}' AND metadata['version']:'v2'`,
    });
    let productId: string;
    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`   [skip-product] reusing existing product ${productId}`);
    } else {
      const product = await stripe.products.create({
        name: a.productName,
        description: a.productDescription,
        metadata: {
          addon: a.addon,
          version: "v2",
          created_by: "create-stripe-prices.ts",
          created_at: new Date().toISOString(),
        },
      });
      productId = product.id;
      console.log(`   [created] product ${productId}`);
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: a.monthlyPence,
      currency: "gbp",
      recurring: { interval: "month" },
      metadata: { addon: a.addon, version: "v2", cadence: "monthly" },
    });
    console.log(`   [created] monthly price ${price.id}`);

    const envVar = `STRIPE_${a.addon.toUpperCase()}_ADDON_PRICE_ID`;
    created.push({
      tier: `addon:${a.addon}`,
      envVar,
      priceId: price.id,
      cadence: "monthly",
      amountPence: a.monthlyPence,
    });
    console.log("");
  }

  if (!execute) {
    console.log("Dry run complete. Pass --execute to actually create.");
    return;
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Created. Add these env vars to Vercel + .env.local:");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  for (const c of created) {
    console.log(`${c.envVar}=${c.priceId}  # ${c.tier} ${c.cadence} (${gbp(c.amountPence)})`);
  }
  console.log("");
  console.log(`Mode was: ${mode}. Make sure to add these to the matching Vercel environment (production / preview / development) only.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
