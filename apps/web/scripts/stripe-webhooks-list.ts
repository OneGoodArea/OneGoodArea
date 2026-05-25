/**
 * List all webhook endpoints in Stripe LIVE.
 *
 * Usage:
 *   npx tsx scripts/stripe-webhooks-list.ts          # TEST
 *   npx tsx scripts/stripe-webhooks-list.ts --live   # LIVE
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
    console.error(`Missing ${keyEnv}`);
    process.exit(1);
  }
  const mode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`\nStripe webhook endpoints — ${mode} mode\n${"=".repeat(60)}\n`);

  const stripe = new Stripe(secretKey);
  const endpoints = await stripe.webhookEndpoints.list({ limit: 50 });

  if (endpoints.data.length === 0) {
    console.log("No webhook endpoints found in this mode.\n");
    return;
  }

  for (const e of endpoints.data) {
    console.log(`  ID:     ${e.id}`);
    console.log(`  URL:    ${e.url}`);
    console.log(`  Status: ${e.status}`);
    console.log(`  Events: ${e.enabled_events.length === 0 ? "(none)" : e.enabled_events.join(", ")}`);
    console.log(`  Created: ${new Date(e.created * 1000).toISOString().slice(0, 10)}`);
    console.log();
  }
  console.log(`Total: ${endpoints.data.length}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
