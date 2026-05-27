import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/usage";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getStripeCustomerId(userId);
    if (!customerId) {
      return NextResponse.json({ error: "No billing account" }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    logger.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to create portal" }, { status: 500 });
  }
}
