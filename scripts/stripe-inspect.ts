/**
 * Read-only Stripe inspection. Lists products + prices in TEST or LIVE mode.
 *
 * Usage:
 *   npx tsx scripts/stripe-inspect.ts            # TEST mode
 *   npx tsx scripts/stripe-inspect.ts --live     # LIVE mode (read-only)
 */
import Stripe from "stripe";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const isLive = process.argv.includes("--live");
  const keyEnv = isLive ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY";
  const secretKey = process.env[keyEnv];
  if (!secretKey) {
    console.error(`Missing ${keyEnv} in .env.local`);
    process.exit(1);
  }
  const mode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`\nStripe inspect — ${mode} mode\n${"=".repeat(60)}\n`);

  const stripe = new Stripe(secretKey);

  const products = await stripe.products.list({ limit: 100, active: true });
  for (const p of products.data) {
    const prices = await stripe.prices.list({ product: p.id, limit: 10, active: true });
    const tag = p.metadata.tier
      ? `[v${p.metadata.version || "?"} tier=${p.metadata.tier}]`
      : p.metadata.addon
      ? `[v${p.metadata.version || "?"} addon=${p.metadata.addon}]`
      : "[untagged]";
    console.log(`${tag}  ${p.id}  "${p.name}"`);
    for (const pr of prices.data) {
      const amt = pr.unit_amount ? `£${(pr.unit_amount / 100).toLocaleString()}` : "free";
      const interval = pr.recurring?.interval || "one-off";
      console.log(`    └─ ${pr.id}  ${amt}/${interval}`);
    }
  }

  console.log(`\nTotal active products: ${products.data.length}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
