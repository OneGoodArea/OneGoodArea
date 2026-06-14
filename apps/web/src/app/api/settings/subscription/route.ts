import { type NextRequest } from "next/server";
import { proxySession } from "@/lib/server/proxy";

/* GET /api/settings/subscription — proxied to apps/api GET /settings/subscription.
   The API container handles session auth, getUserPlan, Stripe subscription
   lookup, and returns { plan, planName, hasStripeSubscription, cancelAt }. */

export async function GET(req: NextRequest) {
  return proxySession(req, "/settings/subscription");
}
