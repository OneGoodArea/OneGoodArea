import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/usage";
import { stripe } from "@/lib/stripe";
import { PLANS, PlanId } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { row, SubscriptionRow } from "@/lib/db-types";
import { logger } from "@/lib/logger";
import { asSubscription } from "@/lib/stripe-types";

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await getUserPlan(userId);
    const planConfig = PLANS[plan as PlanId];

    // Check if there's an active Stripe subscription
    const subRows = await sql`
      SELECT stripe_subscription_id FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active' AND stripe_subscription_id IS NOT NULL
    `;

    let cancelAt: string | null = null;
    const subRecord = subRows.length > 0 ? row<Pick<SubscriptionRow, "stripe_subscription_id">>(subRows[0]) : null;
    const hasStripeSubscription = !!subRecord?.stripe_subscription_id;

    // If there's a Stripe subscription, check if it's set to cancel
    if (hasStripeSubscription && subRecord) {
      try {
        const sub = asSubscription(
          await stripe.subscriptions.retrieve(subRecord.stripe_subscription_id)
        );
        if (sub.cancel_at_period_end && sub.current_period_end) {
          cancelAt = new Date(sub.current_period_end * 1000).toISOString();
        }
      } catch {
        // Subscription may no longer exist in Stripe, treat as no subscription
      }
    }

    return NextResponse.json({
      plan,
      planName: planConfig.name,
      hasStripeSubscription,
      cancelAt,
    });
  } catch (error) {
    logger.error("Subscription info error:", error);
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Failed to fetch subscription info" }, { status: 500 });
  }
}
