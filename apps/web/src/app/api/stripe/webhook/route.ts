import { type NextRequest, NextResponse } from "next/server";
import { proxyStripeWebhook } from "@/lib/server/proxy";

// Stripe webhook forwarding — raw body + Stripe-Signature preserved
// so the API container can verify the HMAC signature.
export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxyStripeWebhook(req);
}
