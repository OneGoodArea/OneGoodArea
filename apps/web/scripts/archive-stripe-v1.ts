/**
 * Archive legacy V1 Stripe LIVE products. Sets `active: false` on the
 * 5 V1 products + their prices, hiding them from new checkouts while
 * keeping any existing subscription / invoice references intact.
 *
 * Archive is REVERSIBLE. To un-archive: stripe.products.update(id, { active: true }).
 *
 * Why archive instead of delete: Stripe blocks deletion of any product
 * that has had a subscription, invoice, or payment_link attached. Archive
 * is the soft-delete equivalent and is what Stripe themselves recommend.
 *
 * Per memory: zero V1 paying customers as of 2026-05-04, but the V1 plan
 * IDs (developer / business / growth / starter / pro) remain valid in the
 * checkout endpoint for hypothetical grandfathering. Archive does NOT
 * change that — it only blocks NEW checkouts of these products.
 *
 * Usage:
 *   npx tsx scripts/archive-stripe-v1.ts                    # dry-run, TEST
 *   npx tsx scripts/archive-stripe-v1.ts --live             # dry-run, LIVE (just lists)
 *   npx tsx scripts/archive-stripe-v1.ts --live --execute   # actually archive
 */
import Stripe from "stripe";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// 5 V1 LIVE products identified via stripe-inspect.ts on 2026-05-05.
// IDs are stable across modes only if we're careful — these are LIVE-mode IDs.
const V1_PRODUCT_IDS = [
  "prod_U792nG9ZWx86op", // OneGoodArea Business (legacy) — was AreaIQ Business
  "prod_U792qGADhWOBje", // OneGoodArea Pro (legacy) — was AreaIQ Pro
  "prod_U792qVIvV7gCpv", // OneGoodArea Starter (legacy) — was AreaIQ Starter
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
  console.log(`\nStripe V1 archive — ${mode} mode — ${execute ? "EXECUTE" : "DRY RUN"}\n${"=".repeat(60)}\n`);

  const stripe = new Stripe(secretKey);

  // Discover ALL active V1-shaped products (the 3 "(legacy)" + the 2 untagged ones
  // "Developer" and "Growth"). We look up by exact ID for the renamed ones, then
  // discover any other active products with names "Developer" or "Growth".
  const targets: { id: string; name: string; prices: { id: string; active: boolean }[] }[] = [];

  for (const pid of V1_PRODUCT_IDS) {
    try {
      const p = await stripe.products.retrieve(pid);
      if (!p.active) {
        console.log(`  [already-archived] ${p.id}  "${p.name}"`);
        continue;
      }
      const prices = await stripe.prices.list({ product: p.id, limit: 100 });
      targets.push({
        id: p.id,
        name: p.name,
        prices: prices.data.map((pr) => ({ id: pr.id, active: pr.active })),
      });
    } catch (e) {
      console.log(`  [skip] ${pid} not found in this mode (${(e as Error).message.slice(0, 80)})`);
    }
  }

  // Also catch the un-renamed "Developer" + "Growth" products by name search.
  const all = await stripe.products.list({ active: true, limit: 100 });
  for (const p of all.data) {
    if (V1_PRODUCT_IDS.includes(p.id)) continue; // already in targets
    if (p.name === "Developer" || p.name === "Growth") {
      const prices = await stripe.prices.list({ product: p.id, limit: 100 });
      targets.push({
        id: p.id,
        name: p.name,
        prices: prices.data.map((pr) => ({ id: pr.id, active: pr.active })),
      });
    }
  }

  if (targets.length === 0) {
    console.log("\nNothing to archive. All V1 products already inactive (or not present in this mode).\n");
    return;
  }

  console.log(`\nFound ${targets.length} active V1 product${targets.length === 1 ? "" : "s"} to archive:\n`);
  for (const t of targets) {
    console.log(`  - ${t.id}  "${t.name}"  (${t.prices.length} price${t.prices.length === 1 ? "" : "s"})`);
    for (const pr of t.prices) {
      console.log(`      └─ ${pr.id}  active=${pr.active}`);
    }
  }
  console.log();

  if (!execute) {
    console.log("DRY RUN — pass --execute to actually archive.\n");
    return;
  }

  let productCount = 0;
  let priceCount = 0;
  for (const t of targets) {
    // Archive prices first (Stripe convention — though Stripe also auto-handles this).
    for (const pr of t.prices) {
      if (!pr.active) continue;
      await stripe.prices.update(pr.id, { active: false });
      console.log(`  archived price  ${pr.id}`);
      priceCount++;
    }
    await stripe.products.update(t.id, { active: false });
    console.log(`  archived PRODUCT ${t.id}  "${t.name}"`);
    productCount++;
  }

  console.log(`\n${"=".repeat(60)}\nArchived ${productCount} product${productCount === 1 ? "" : "s"} and ${priceCount} price${priceCount === 1 ? "" : "s"}.\nReversible at any time via stripe.products.update(id, { active: true }).\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
