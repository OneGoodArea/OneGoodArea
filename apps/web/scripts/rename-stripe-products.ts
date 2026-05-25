/**
 * Rename legacy Stripe LIVE products from "AreaIQ X" to "OneGoodArea X".
 *
 * Renaming a Stripe Product does NOT affect existing subscriptions, prices,
 * or invoices — only the display name on the dashboard, hosted invoice
 * pages, and Checkout. Safe operation. Stripe keeps a history.
 *
 * Maps the v1 product IDs we identified via stripe-inspect.ts.
 *
 * Usage:
 *   npx tsx scripts/rename-stripe-products.ts             # dry-run, TEST
 *   npx tsx scripts/rename-stripe-products.ts --live      # dry-run, LIVE
 *   npx tsx scripts/rename-stripe-products.ts --live --execute  # actually rename
 */
import Stripe from "stripe";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

type Rename = { id: string; from: string; to: string };

// Source: stripe-inspect.ts output 2026-05-05. Only the 3 with "AreaIQ" prefix
// need renaming. "Growth" and "Developer" already have no prefix.
const RENAMES: Rename[] = [
  { id: "prod_U792nG9ZWx86op", from: "AreaIQ Business", to: "OneGoodArea Business (legacy)" },
  { id: "prod_U792qGADhWOBje", from: "AreaIQ Pro",      to: "OneGoodArea Pro (legacy)" },
  { id: "prod_U792qVIvV7gCpv", from: "AreaIQ Starter",  to: "OneGoodArea Starter (legacy)" },
];

async function main() {
  const isLive = process.argv.includes("--live");
  const execute = process.argv.includes("--execute");
  const keyEnv = isLive ? "STRIPE_SECRET_KEY_LIVE" : "STRIPE_SECRET_KEY";
  const secretKey = process.env[keyEnv];
  if (!secretKey) {
    console.error(`Missing ${keyEnv}`);
    process.exit(1);
  }
  const mode = secretKey.startsWith("sk_live_") ? "LIVE" : "TEST";
  console.log(`\nStripe product rename — ${mode} mode — ${execute ? "EXECUTE" : "DRY RUN"}\n${"=".repeat(60)}\n`);

  const stripe = new Stripe(secretKey);

  for (const r of RENAMES) {
    let actual: Stripe.Product;
    try {
      actual = await stripe.products.retrieve(r.id);
    } catch (e) {
      console.log(`  [skip] ${r.id} not found in this mode (${(e as Error).message.slice(0, 80)})`);
      continue;
    }
    if (actual.name === r.to) {
      console.log(`  [already-renamed] ${r.id}  "${actual.name}"`);
      continue;
    }
    if (actual.name !== r.from) {
      console.log(`  [unexpected name] ${r.id}  expected "${r.from}", found "${actual.name}" — leaving alone`);
      continue;
    }
    if (!execute) {
      console.log(`  [dry-run] ${r.id}  "${r.from}" -> "${r.to}"`);
      continue;
    }
    const updated = await stripe.products.update(r.id, { name: r.to });
    console.log(`  [renamed] ${updated.id}  -> "${updated.name}"`);
  }

  if (!execute) console.log("\nDry run. Pass --execute to apply.\n");
  else console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
