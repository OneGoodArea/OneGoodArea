import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { trackEvent } from "@/lib/activity";
import { row, SubscriptionRow } from "@/lib/db-types";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { asSubscription } from "@/lib/stripe-types";

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up the user's active Stripe subscription
    const rows = await sql`
      SELECT stripe_subscription_id, plan, current_period_end
      FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active' AND stripe_subscription_id IS NOT NULL
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const sub = row<Pick<SubscriptionRow, "stripe_subscription_id" | "plan">>(rows[0]);
    const subscriptionId = sub.stripe_subscription_id;
    const plan = sub.plan;

    // Check if already set to cancel at period end
    const currentSub = asSubscription(
      await stripe.subscriptions.retrieve(subscriptionId)
    );
    if (currentSub.cancel_at_period_end) {
      return NextResponse.json(
        {
          error: "Subscription is already scheduled for cancellation",
          cancel_at: new Date(currentSub.current_period_end * 1000).toISOString(),
        },
        { status: 409 }
      );
    }

    // Cancel at end of billing period (not immediate)
    const updatedSub = asSubscription(
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    );

    const cancelAt = new Date(updatedSub.current_period_end * 1000).toISOString();

    trackEvent("plan.cancel_scheduled", userId, { plan, cancel_at: cancelAt });

    return NextResponse.json({
      success: true,
      cancel_at: cancelAt,
      message: "Subscription will be cancelled at the end of the billing period",
    });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    logger.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
