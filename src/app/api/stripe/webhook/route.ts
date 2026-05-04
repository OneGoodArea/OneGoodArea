import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sql } from "@/lib/db";
import { trackEvent } from "@/lib/activity";
import Stripe from "stripe";
import { ensureWebhookEventsTable } from "@/lib/db-schema";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/id";
import { asSubscription } from "@/lib/stripe-types";

let _webhookTableReady = false;
async function ensureWebhookTable() {
  if (_webhookTableReady) return;
  await ensureWebhookEventsTable();
  _webhookTableReady = true;
}

async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM webhook_events WHERE id = ${eventId} AND status = 'processed'
  `;
  return rows.length > 0;
}

async function recordEvent(eventId: string, eventType: string, status: "processed" | "failed", error?: string) {
  await sql`
    INSERT INTO webhook_events (id, type, status, error)
    VALUES (${eventId}, ${eventType}, ${status}, ${error ?? null})
    ON CONFLICT (id) DO UPDATE SET
      status = ${status},
      error = ${error ?? null},
      processed_at = NOW()
  `;
}

async function cleanupOldEvents() {
  // Run cleanup roughly 1 in 100 webhook calls to avoid unnecessary work
  if (Math.random() > 0.01) return;
  await sql`
    DELETE FROM webhook_events
    WHERE processed_at < NOW() - INTERVAL '30 days'
  `;
  logger.info("[stripe-webhook] Cleaned up webhook_events older than 30 days");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Ensure table exists, check idempotency, and trigger opportunistic cleanup
  await ensureWebhookTable();

  if (await isEventAlreadyProcessed(event.id)) {
    logger.info(`[stripe-webhook] Skipping already-processed event ${event.id} (${event.type})`);
    return NextResponse.json({ received: true, deduplicated: true });
  }

  // Opportunistic cleanup of old records
  cleanupOldEvents().catch((err) =>
    logger.error("[stripe-webhook] Cleanup error (non-fatal):", err)
  );

  try {
    logger.info(`[stripe-webhook] Processing event ${event.id} (${event.type})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.user_id;
        const plan = session.metadata?.plan;

        if (clerkUserId && plan) trackEvent("plan.upgraded", clerkUserId, { plan });
        if (clerkUserId && plan && session.subscription) {
          const sub = asSubscription(
            await stripe.subscriptions.retrieve(session.subscription as string)
          );

          await sql`
            INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_start, current_period_end)
            VALUES (
              ${generateId("sub")},
              ${clerkUserId},
              ${session.customer as string},
              ${sub.id},
              ${plan},
              'active',
              ${new Date(sub.current_period_start * 1000).toISOString()},
              ${new Date(sub.current_period_end * 1000).toISOString()}
            )
            ON CONFLICT (user_id) DO UPDATE SET
              stripe_subscription_id = ${sub.id},
              plan = ${plan},
              status = 'active',
              current_period_start = ${new Date(sub.current_period_start * 1000).toISOString()},
              current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
              updated_at = NOW()
          `;
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = asSubscription(event.data.object);

        await sql`
          UPDATE subscriptions SET
            status = ${sub.status === "active" ? "active" : "inactive"},
            current_period_start = ${new Date(sub.current_period_start * 1000).toISOString()},
            current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
            updated_at = NOW()
          WHERE stripe_customer_id = ${sub.customer}
        `;
        break;
      }

      case "customer.subscription.deleted": {
        const sub = asSubscription(event.data.object);

        // On cancellation, revert to v2 Sandbox (250 calls/mo, apiAccess: true).
        // Better goodwill than v1 'free' (3 reports, no API) and consistent
        // with the new-user default in usage.ts.
        await sql`
          UPDATE subscriptions SET
            plan = 'sandbox',
            status = 'active',
            stripe_subscription_id = NULL,
            current_period_start = NULL,
            current_period_end = NULL,
            updated_at = NOW()
          WHERE stripe_customer_id = ${sub.customer}
        `;
        break;
      }
    }

    // Record successful processing
    await recordEvent(event.id, event.type, "processed");
    logger.info(`[stripe-webhook] Successfully processed event ${event.id} (${event.type})`);

    return NextResponse.json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    logger.error(`[stripe-webhook] Failed to process event ${event.id} (${event.type}):`, errorMessage);

    // Record the failure so we can debug, but don't block retries
    try {
      await recordEvent(event.id, event.type, "failed", errorMessage);
    } catch (recordErr) {
      logger.error("[stripe-webhook] Failed to record error event:", recordErr);
    }

    // Return 500 so Stripe will retry the event
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
