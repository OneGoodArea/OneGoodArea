import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, ADDONS, ADDON_KEYS, PLANS, PlanId, type AddonKey } from "@/lib/stripe";
import { trackEvent } from "@/lib/activity";
import { sql } from "@/lib/db";
import { row, SubscriptionRow } from "@/lib/db-types";
import { generateId } from "@/lib/id";
import { hasAddon, getUserPlan } from "@/lib/usage";
import { logger } from "@/lib/logger";

/**
 * POST /api/stripe/addon-checkout
 *
 * Body: { addon: "mcp" }
 *
 * Creates a Stripe Checkout Session for purchasing an add-on subscription.
 * Add-ons live as separate Stripe Subscriptions (not items on the main plan)
 * so cancellation is isolated. Webhook handler routes the resulting
 * customer.subscription.created event to insert a row in
 * subscription_addons.
 *
 * Idempotent guards:
 *   - 200 with redirect to /dashboard if user already owns active add-on
 *   - 200 with note if user's plan already includes the entitlement (e.g.
 *     Growth+ already gets MCP free, no need to buy add-on)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { addon } = await req.json().catch(() => ({}));
    if (typeof addon !== "string" || !ADDON_KEYS.includes(addon as AddonKey)) {
      return NextResponse.json(
        { error: `Invalid addon. Supported: ${ADDON_KEYS.join(", ")}` },
        { status: 400 }
      );
    }
    const addonKey = addon as AddonKey;
    const cfg = ADDONS[addonKey];

    if (!cfg.priceId) {
      logger.error("[addon-checkout] price ID missing for", addonKey);
      return NextResponse.json(
        { error: "Add-on not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Guard: already owns active add-on
    if (await hasAddon(userId, addonKey)) {
      return NextResponse.json({
        url: `/dashboard?addon=${addonKey}&already_owned=1`,
        already_owned: true,
      });
    }

    // Guard: plan already grants entitlement (Growth+ for MCP)
    const plan = await getUserPlan(userId);
    if (addonKey === "mcp" && PLANS[plan as PlanId]?.mcpAccess === true) {
      return NextResponse.json({
        url: `/dashboard?addon=${addonKey}&plan_includes=1`,
        plan_includes: true,
      });
    }

    // Find or create the user's Stripe customer ID
    let subRow: Pick<SubscriptionRow, "stripe_customer_id"> | null = null;
    try {
      const subRows = await sql`
        SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId}
      `;
      if (subRows.length > 0) {
        subRow = row<Pick<SubscriptionRow, "stripe_customer_id">>(subRows[0]);
      }
    } catch (dbErr) {
      logger.error("[addon-checkout] DB lookup failed for user", userId, dbErr);
      return NextResponse.json({ error: "Database error. Please try again." }, { status: 500 });
    }

    let customerId = subRow?.stripe_customer_id || null;

    // Validate Stripe customer still exists (handles test→live mismatches)
    if (customerId) {
      try {
        const cust = await stripe.customers.retrieve(customerId);
        if (cust.deleted) customerId = null;
      } catch {
        logger.warn("[addon-checkout] stale customer", customerId, "- creating new");
        customerId = null;
      }
    }

    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: session.user?.email || undefined,
          metadata: { user_id: userId },
        });
        customerId = customer.id;
      } catch (stripeErr) {
        logger.error("[addon-checkout] Stripe customer creation failed", stripeErr);
        return NextResponse.json({ error: "Payment service error." }, { status: 500 });
      }

      try {
        await sql`
          INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
          VALUES (${generateId("sub")}, ${userId}, ${customerId}, 'sandbox', 'active')
          ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${customerId}
        `;
      } catch (dbErr) {
        logger.error("[addon-checkout] subscription upsert failed", dbErr);
        return NextResponse.json({ error: "Database error." }, { status: 500 });
      }
    }

    // Create Stripe Checkout Session for the add-on subscription.
    // metadata.addon = "mcp" tells the webhook this is an add-on purchase.
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: cfg.priceId, quantity: 1 }],
        success_url: `${req.nextUrl.origin}/dashboard?addon=${addonKey}&purchased=1`,
        cancel_url: `${req.nextUrl.origin}/dashboard?addon=${addonKey}&cancelled=1`,
        metadata: { user_id: userId, addon: addonKey },
        subscription_data: {
          metadata: { user_id: userId, addon: addonKey },
        },
      });
    } catch (stripeErr) {
      logger.error("[addon-checkout] session creation failed", addonKey, stripeErr);
      return NextResponse.json({ error: "Failed to start checkout." }, { status: 500 });
    }

    trackEvent("addon.purchase.started", userId, { addon: addonKey });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error("[addon-checkout] unexpected:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
