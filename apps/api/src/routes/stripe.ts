import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticateSession } from "../shared/auth-session";
import { headerString } from "../shared/http";
import { isAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { row, type SubscriptionRow } from "../infrastructure/db/types";
import { stripe } from "../modules/billing/stripe-client";
import { asSubscription } from "../modules/billing/stripe-types";
import { getUserPlan, getStripeCustomerId, getUserEmail, hasAddon } from "../modules/usage";
import { PLANS, ADDONS, ADDON_KEYS } from "../modules/billing/plans";
import { handleStripeWebhook } from "../modules/billing/webhook-handler";

import { APP_URL } from "../infrastructure/config";
import { trackEvent } from "../modules/tracking/activity";
import type { AddonKey, PlanId } from "../modules/billing/plans";
import { V2_PAID_PLANS } from "../modules/billing/plans";
import { generateId } from "../infrastructure/utils/id";
/** stripe route handlers — extracted from app.ts per AR-286. */
export function registerStripeRoutes(app: FastifyInstance): void {
    app.post("/stripe/webhook", async (request, reply) => {
      const result = await handleStripeWebhook(
        request.rawBody ?? "",
        headerString(request.headers["stripe-signature"]),
      );
      return reply.code(result.status).send(result.body);
    });

    app.post("/stripe/portal", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        const customerId = await getStripeCustomerId(userId);
        if (!customerId) {
          return reply.code(400).send({ error: "No billing account" });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${APP_URL}/dashboard`,
        });

        return reply.send({ url: portalSession.url });
      } catch (error) {
        logger.error("Portal error:", error);
        return reply.code(500).send({ error: "Failed to create portal" });
      }
    });

    app.post("/stripe/cancel", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        // Look up the user's active Stripe subscription.
        const subRows = await sql`
          SELECT stripe_subscription_id, plan, current_period_end
          FROM subscriptions
          WHERE user_id = ${userId} AND status = 'active' AND stripe_subscription_id IS NOT NULL
        `;
        if (subRows.length === 0) {
          return reply.code(404).send({ error: "No active subscription found" });
        }

        const sub = row<Pick<SubscriptionRow, "stripe_subscription_id" | "plan">>(subRows[0]);
        const subscriptionId = sub.stripe_subscription_id;
        const plan = sub.plan;

        // Already scheduled to cancel? Report the existing date.
        const currentSub = asSubscription(await stripe.subscriptions.retrieve(subscriptionId));
        if (currentSub.cancel_at_period_end) {
          return reply.code(409).send({
            error: "Subscription is already scheduled for cancellation",
            cancel_at: new Date(currentSub.current_period_end * 1000).toISOString(),
          });
        }

        const updatedSub = asSubscription(
          await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true }),
        );
        const cancelAt = new Date(updatedSub.current_period_end * 1000).toISOString();

        trackEvent("plan.cancel_scheduled", userId, { plan, cancel_at: cancelAt });

        return reply.send({
          success: true,
          cancel_at: cancelAt,
          message: "Subscription will be cancelled at the end of the billing period",
        });
      } catch (error) {
        if (isAppError(error)) {
          return reply.code(error.statusCode).send({ error: error.message, code: error.code });
        }
        logger.error("Cancel subscription error:", error);
        return reply.code(500).send({ error: "Failed to cancel subscription" });
      }
    });

    app.post("/stripe/checkout", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        const { plan } = (request.body ?? {}) as { plan?: unknown };
        // Accept v2 paid plans (new commercial offering) + v1 legacy paid plans
        // (so a grandfathered customer can still move between v1 tiers). Sandbox is
        // free (no checkout); Enterprise is contact-only (not self-serve here).
        const v1LegacyPaid = ["starter", "pro", "developer", "business", "growth"];
        const v2SelfServePaid = V2_PAID_PLANS.filter((p) => p !== "enterprise");
        const allowedPlans: string[] = [...v1LegacyPaid, ...v2SelfServePaid];
        if (typeof plan !== "string" || !allowedPlans.includes(plan)) {
          return reply.code(400).send({ error: "Invalid plan" });
        }

        const planConfig = PLANS[plan as PlanId];
        if (!planConfig.priceId) {
          return reply.code(400).send({ error: "Plan not configured. Please contact support." });
        }

        // Look up existing subscription record.
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
          return reply.code(500).send({ error: "Database error. Please try again." });
        }

        let customerId = subRow?.stripe_customer_id || null;
        const existingSubId = subRow?.stripe_subscription_id || null;

        // If the user has an existing Stripe subscription, swap the plan in place.
        if (existingSubId && customerId) {
          try {
            const sub = await stripe.subscriptions.retrieve(existingSubId);
            if (sub.status === "active" || sub.status === "trialing") {
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
              return reply.send({ url: `/dashboard?upgraded=true` });
            }
            // Cancelled/past_due: fall through to a fresh checkout.
          } catch (err) {
            // Subscription missing in Stripe (stale test-mode data): fall through.
            logger.warn("Checkout: stale subscription", existingSubId, "- falling through to new checkout:", err);
          }
        }

        // Validate the stored customer still exists in Stripe (test->live drift).
        if (customerId) {
          try {
            const cust = await stripe.customers.retrieve(customerId);
            if (cust.deleted) customerId = null;
          } catch {
            logger.warn("Checkout: stale customer", customerId, "- creating new customer");
            customerId = null;
          }
        }

        // Create a new Stripe customer if needed.
        if (!customerId) {
          try {
            const customer = await stripe.customers.create({
              email: (await getUserEmail(userId)) || undefined,
              metadata: { user_id: userId },
            });
            customerId = customer.id;
          } catch (stripeErr) {
            logger.error("Checkout: Stripe customer creation failed", stripeErr);
            return reply.code(500).send({ error: "Payment service error. Please try again." });
          }

          try {
            await sql`
              INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
              VALUES (${generateId("sub")}, ${userId}, ${customerId}, 'free', 'active')
              ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${customerId}
            `;
          } catch (dbErr) {
            logger.error("Checkout: subscription upsert failed for user", userId, dbErr);
            return reply.code(500).send({ error: "Database error. Please try again." });
          }
        }

        // Create the checkout session for a new subscription.
        let checkoutSession;
        try {
          checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: planConfig.priceId, quantity: 1 }],
            success_url: `${APP_URL}/dashboard?upgraded=true`,
            cancel_url: `${APP_URL}/pricing`,
            metadata: { user_id: userId, plan },
          });
        } catch (stripeErr) {
          logger.error("Checkout: session creation failed for plan", plan, "priceId", planConfig.priceId, stripeErr);
          return reply.code(500).send({ error: "Failed to start checkout. Please try again." });
        }

        trackEvent("plan.upgrade.started", userId, { plan });
        return reply.send({ url: checkoutSession.url });
      } catch (error) {
        logger.error("Checkout: unexpected error:", error);
        return reply.code(500).send({ error: "Something went wrong. Please try again." });
      }
    });

    app.post("/stripe/addon-checkout", async (request, reply) => {
      try {
        const userId = await authenticateSession(request, reply);
        if (!userId) return reply; // 401 already sent

        const { addon } = (request.body ?? {}) as { addon?: unknown };
        if (typeof addon !== "string" || !ADDON_KEYS.includes(addon as AddonKey)) {
          return reply.code(400).send({ error: `Invalid addon. Supported: ${ADDON_KEYS.join(", ")}` });
        }
        const addonKey = addon as AddonKey;
        const cfg = ADDONS[addonKey];

        if (!cfg.priceId) {
          logger.error("[addon-checkout] price ID missing for", addonKey);
          return reply.code(500).send({ error: "Add-on not configured. Please contact support." });
        }

        // Guard: already owns the active add-on.
        if (await hasAddon(userId, addonKey)) {
          return reply.send({ url: `/dashboard?addon=${addonKey}&already_owned=1`, already_owned: true });
        }

        // Guard: the plan already grants the entitlement (Growth+ for MCP).
        const plan = await getUserPlan(userId);
        if (addonKey === "mcp" && PLANS[plan as PlanId]?.mcpAccess === true) {
          return reply.send({ url: `/dashboard?addon=${addonKey}&plan_includes=1`, plan_includes: true });
        }

        // Find or create the user's Stripe customer.
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
          return reply.code(500).send({ error: "Database error. Please try again." });
        }

        let customerId = subRow?.stripe_customer_id || null;

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
              email: (await getUserEmail(userId)) || undefined,
              metadata: { user_id: userId },
            });
            customerId = customer.id;
          } catch (stripeErr) {
            logger.error("[addon-checkout] Stripe customer creation failed", stripeErr);
            return reply.code(500).send({ error: "Payment service error." });
          }

          try {
            await sql`
              INSERT INTO subscriptions (id, user_id, stripe_customer_id, plan, status)
              VALUES (${generateId("sub")}, ${userId}, ${customerId}, 'sandbox', 'active')
              ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = ${customerId}
            `;
          } catch (dbErr) {
            logger.error("[addon-checkout] subscription upsert failed", dbErr);
            return reply.code(500).send({ error: "Database error." });
          }
        }

        // metadata.addon tells the webhook this is an add-on purchase.
        let checkoutSession;
        try {
          checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: cfg.priceId, quantity: 1 }],
            success_url: `${APP_URL}/dashboard?addon=${addonKey}&purchased=1`,
            cancel_url: `${APP_URL}/dashboard?addon=${addonKey}&cancelled=1`,
            metadata: { user_id: userId, addon: addonKey },
            subscription_data: {
              metadata: { user_id: userId, addon: addonKey },
            },
          });
        } catch (stripeErr) {
          logger.error("[addon-checkout] session creation failed", addonKey, stripeErr);
          return reply.code(500).send({ error: "Failed to start checkout." });
        }

        trackEvent("addon.purchase.started", userId, { addon: addonKey });
        return reply.send({ url: checkoutSession.url });
      } catch (error) {
        logger.error("[addon-checkout] unexpected:", error);
        return reply.code(500).send({ error: "Something went wrong." });
      }
    });
}
