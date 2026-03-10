import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlan } from "@/lib/usage";
import { stripe } from "@/lib/stripe";
import { PLANS, PlanId } from "@/lib/stripe";
import { sql } from "@/lib/db";

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
    const rows = await sql`
      SELECT stripe_subscription_id FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active' AND stripe_subscription_id IS NOT NULL
    `;

    let cancelAt: string | null = null;
    const hasStripeSubscription = rows.length > 0 && !!rows[0].stripe_subscription_id;

    // If there's a Stripe subscription, check if it's set to cancel
    if (hasStripeSubscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(rows[0].stripe_subscription_id as string) as unknown as {
          cancel_at_period_end: boolean;
          current_period_end: number;
        };
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
    console.error("Subscription info error:", error);
    return NextResponse.json({ error: "Failed to fetch subscription info" }, { status: 500 });
  }
}
