import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, PLANS, PlanId } from "@/lib/stripe";
import { trackEvent } from "@/lib/activity";
import { sql } from "@/lib/db";
import { row, SubscriptionRow } from "@/lib/db-types";
import { generateId } from "@/lib/id";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!plan || !["starter", "pro", "developer", "business", "growth"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = PLANS[plan as PlanId];
    if (!planConfig.priceId) {
      return NextResponse.json({ error: "Plan not configured. Please contact support." }, { status: 400 });
    }

    // Look up existing subscription record
    let subRow: Pick<SubscriptionRow, "stripe_customer_id" | "stripe_subscription_id"> | null = null;
    try {
      const subRows = await sql`
        SELECT stripe_customer_id, stripe_subscription_id
        FROM subscriptions WHERE user_id = ${userId}
      `;
      if (subRows.length > 0) {
        subRow = row<Pick<SubscriptionRow, "stripe_customer_id" | "stripe_subscription_id">>(subRows[0]);
      }
    } catch (dbErr) {
      logger.error("Checkout: DB lookup failed for user", userId, dbErr);
      return NextResponse.json({ error: "Database error. Please try again." }, { status: 500 });
    }

    let customerId = subRow?.stripe_customer_id || null;
    const existingSubId = subRow?.stripe_subscription_id || null;

    // If user has an existing Stripe subscription, update it instead of creating a new one
    if (existingSubId && customerId) {
      try {
        const sub = await stripe.subscriptions.retrieve(existingSubId);
        if (sub.status === "active" || sub.status === "trialing") {
          // Swap the plan via proration
          await stripe.subscriptions.update(existingSubId, {
            items: [{ id: sub.items.data[0].id, price: planConfig.priceId }],
            proration_behavior: "create_prorations",
          });

          await sql`
            UPDATE subscriptions SET
              plan = ${plan},
              updated_at = NOW()
            WHERE user_id = ${userId}
          `;

          trackEvent("plan.changed", userId, { plan });
          return NextResponse.json({ url: `/dashboard?upgraded=true` });
        }
        // If subscription exists but is cancelled/past_due, fall through to new checkout
      } catch (err) {
        // Subscription doesn't exist in Stripe (stale test-mode data), fall through
        logger.warn("Checkout: stale subscription", existingSubId, "- falling through to new checkout:", err);
      }
    }

    // Validate existing customer still exists in Stripe (handles test→live mismatch)
    if (customerId) {
      try {
        const cust = await stripe.customers.retrieve(customerId);
        if (cust.deleted) customerId = null;
      } catch {
        logger.warn("Checkout: stale customer", customerId, "- creating new customer");
        customerId = null;
      }
    }

    // Create new Stripe customer if needed
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: session.user?.email || undefined,
          metadata: { user_id: userId },
        });
        customerId = customer.id;
      } catch (stripeErr) {
        logger.error("Checkout: Stripe customer creation failed", stripeErr);
        return NextResponse.json({ error: "Payment service error. Please try again." }, { status: 500 });
      }

      try {
        await sql`
          INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
          VALUES (${generateId("sub")}, ${userId}, ${customerId}, 'free', 'active')
          ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${customerId}
        `;
      } catch (dbErr) {
        logger.error("Checkout: subscription upsert failed for user", userId, dbErr);
        return NextResponse.json({ error: "Database error. Please try again." }, { status: 500 });
      }
    }

    // Create checkout session for new subscription
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        success_url: `${req.nextUrl.origin}/dashboard?upgraded=true`,
        cancel_url: `${req.nextUrl.origin}/pricing`,
        metadata: { user_id: userId, plan },
      });
    } catch (stripeErr) {
      logger.error("Checkout: session creation failed for plan", plan, "priceId", planConfig.priceId, stripeErr);
      return NextResponse.json({ error: "Failed to start checkout. Please try again." }, { status: 500 });
    }

    trackEvent("plan.upgrade.started", userId, { plan });
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    logger.error("Checkout: unexpected error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
