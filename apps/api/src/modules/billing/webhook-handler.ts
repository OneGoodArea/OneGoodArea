import Stripe from "stripe";
import { getConfig } from "../../infrastructure/config";
import { stripe } from "./stripe-client";
import { asSubscription } from "./stripe-types";
import { sql } from "../../infrastructure/db/client";
import { generateId } from "../../infrastructure/utils/id";
import { trackEvent } from "../tracking/activity";
import { logger } from "../tracking/structured-logger";

/* Stripe webhook processing. Migrated from legacy src/app/api/stripe/webhook.

   This is the only billing route that is server-to-server (Stripe -> us,
   authenticated by HMAC signature), so it migrates ahead of the session-authed
   checkout/portal/cancel routes (those ride with the auth + JWT-bridge phase).

   Changes vs legacy: the per-request ensureWebhookEventsTable() /
   ensureSubscriptionAddonsTable() self-creates are dropped (the migrator owns
   the webhook_events + subscription_addons + subscriptions DDL); imports are
   repointed to the apps/api infrastructure. All signature verification,
   idempotency, event routing and DB writes are otherwise verbatim. The HTTP
   shape is returned as { status, body } so the Fastify route stays thin and the
   logic is unit-testable without a server. */

async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const rows = await sql`
    SELECT id FROM webhook_events WHERE id = ${eventId} AND status = 'processed'
  `;
  return rows.length > 0;
}

async function recordEvent(
  eventId: string,
  eventType: string,
  status: "processed" | "failed",
  error?: string,
) {
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

/** Verify + process a Stripe webhook. Returns the HTTP status + JSON body for
    the route to send. A 500 tells Stripe to retry; a 400 (bad signature) does
    not. Already-processed events are deduplicated (200). */
export async function handleStripeWebhook(
  rawBody: string,
  signature: string | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  let event: Stripe.Event;

  const config = getConfig();
  const webhookSecret = config.stripeWebhookSecret;

  if (!webhookSecret) {
    return { status: 500, body: { error: "Webhook secret not configured" } };
  }

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
  } catch {
    return { status: 400, body: { error: "Invalid signature" } };
  }

  // Idempotency: skip events we've already fully processed.
  if (await isEventAlreadyProcessed(event.id)) {
    logger.info(`[stripe-webhook] Skipping already-processed event ${event.id} (${event.type})`);
    return { status: 200, body: { received: true, deduplicated: true } };
  }

  // Opportunistic cleanup of old records
  cleanupOldEvents().catch((err) =>
    logger.error("[stripe-webhook] Cleanup error (non-fatal):", err),
  );

  try {
    logger.info(`[stripe-webhook] Processing event ${event.id} (${event.type})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkUserId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        const addon = session.metadata?.addon;

        // Branch 1: ADD-ON purchase (e.g. MCP £29/mo). Insert into
        // subscription_addons table; do NOT touch the user's main plan row.
        if (clerkUserId && addon && session.subscription) {
          const sub = asSubscription(
            await stripe.subscriptions.retrieve(session.subscription as string),
          );

          await sql`
            INSERT INTO subscription_addons (
              id, user_id, addon_key, stripe_subscription_id, stripe_customer_id,
              status, current_period_start, current_period_end
            )
            VALUES (
              ${generateId("addon")},
              ${clerkUserId},
              ${addon},
              ${sub.id},
              ${session.customer as string},
              'active',
              ${new Date(sub.current_period_start * 1000).toISOString()},
              ${new Date(sub.current_period_end * 1000).toISOString()}
            )
            ON CONFLICT (user_id, addon_key) DO UPDATE SET
              stripe_subscription_id = ${sub.id},
              stripe_customer_id = ${session.customer as string},
              status = 'active',
              current_period_start = ${new Date(sub.current_period_start * 1000).toISOString()},
              current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
              updated_at = NOW()
          `;
          trackEvent("addon.purchased", clerkUserId, { addon });
          break;
        }

        // Branch 2: MAIN PLAN upgrade (existing behaviour preserved)
        if (clerkUserId && plan) trackEvent("plan.upgraded", clerkUserId, { plan });
        if (clerkUserId && plan && session.subscription) {
          const sub = asSubscription(
            await stripe.subscriptions.retrieve(session.subscription as string),
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
        const subMetadata = (sub as unknown as { metadata?: Record<string, string> }).metadata ?? {};
        const addon = subMetadata.addon;

        // Branch 1: this is an add-on subscription (mirror status into addon row)
        if (addon) {
          const newStatus = sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled";
          await sql`
            UPDATE subscription_addons SET
              status = ${newStatus},
              current_period_start = ${new Date(sub.current_period_start * 1000).toISOString()},
              current_period_end = ${new Date(sub.current_period_end * 1000).toISOString()},
              updated_at = NOW()
            WHERE stripe_subscription_id = ${sub.id}
          `;
          break;
        }

        // Branch 2: main plan subscription (existing behaviour)
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
        const subMetadata = (sub as unknown as { metadata?: Record<string, string> }).metadata ?? {};
        const addon = subMetadata.addon;

        // Branch 1: add-on cancellation (mark cancelled — keep row for history)
        if (addon) {
          await sql`
            UPDATE subscription_addons SET
              status = 'cancelled',
              updated_at = NOW()
            WHERE stripe_subscription_id = ${sub.id}
          `;
          break;
        }

        // Branch 2: main plan cancellation — revert to v2 Sandbox.
        // Better goodwill than v1 'free' (3 reports, no API) and consistent
        // with the new-user default in the usage module.
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

    return { status: 200, body: { received: true } };
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
    return { status: 500, body: { error: "Webhook processing failed" } };
  }
}
