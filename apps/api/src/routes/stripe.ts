import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateSessionOrApiKey } from "../shared/auth-session";
import { headerString } from "../shared/http";
import { sendAppError } from "../shared/errors";
import { logger } from "../modules/tracking/structured-logger";
import { sql } from "../infrastructure/db/client";
import { row, type SubscriptionRow } from "../infrastructure/db/types";
import { stripe } from "../modules/billing/stripe-client";
import { asSubscription } from "../modules/billing/stripe-types";
import { getStripeCustomerId } from "../modules/usage";
import { handleStripeWebhook } from "../modules/billing/webhook-handler";

import { APP_URL } from "../infrastructure/config";
import { trackEvent } from "../modules/tracking/activity";
/** stripe route handlers — extracted from app.ts per AR-286. */
export function registerStripeRoutes(app: FastifyInstance): void {
    app.post("/stripe/webhook",
      {
        schema: {
          tags: ["Stripe"],
          summary: "Stripe webhook",
          description: "Receive Stripe webhook events. Signature verified in handler.",
          security: [],
          "x-internal": true,
          response: {
            200: z.object({}).passthrough(),
          },
        },
      },
      async (request, reply) => {
      const result = await handleStripeWebhook(
        request.rawBody ?? "",
        headerString(request.headers["stripe-signature"]),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
return reply.code(result.status as any).send(result.body);
    });

    app.post("/stripe/portal",
      {
        schema: {
          tags: ["Stripe"],
          summary: "Billing portal",
          description: "Create a Stripe billing portal session.",
          security: [{ bearerToken: [] }, { bearerAuth: [] }],
          "x-internal": true,
          response: {
            200: z.object({ url: z.string() }),
            400: z.object({ error: z.string() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
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

    app.post("/stripe/cancel",
      {
        schema: {
          tags: ["Stripe"],
          summary: "Cancel subscription",
          description: "Schedule subscription cancellation at end of billing period.",
          security: [{ bearerToken: [] }, { bearerAuth: [] }],
          "x-internal": true,
          response: {
            200: z.object({ success: z.literal(true), cancel_at: z.string(), message: z.string() }),
            404: z.object({ error: z.string() }),
            409: z.object({ error: z.string(), cancel_at: z.string() }),
            500: z.object({ error: z.string() }),
          },
        },
      },
      async (request, reply) => {
      try {
        const userId = await authenticateSessionOrApiKey(request, reply);
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
      if (sendAppError(reply, error)) return;
        logger.error("Cancel subscription error:", error);
        return reply.code(500).send({ error: "Failed to cancel subscription" });
      }
    });

    app.post("/stripe/checkout",
      {
        schema: {
          tags: ["Stripe"],
          summary: "Checkout",
          description: "Create a Stripe checkout session. Currently disabled (demo-led sales).",
          security: [{ bearerToken: [] }, { bearerAuth: [] }],
          "x-internal": true,
          response: {
            403: z.object({ error: z.string(), code: z.string() }),
          },
        },
      },
      async (request, reply) => {
      // AR-489: OneGoodArea is demo-led (AR-456) and no longer sells any tier
      // self-serve. Checkout is disabled. Existing subscribers still manage and
      // cancel via /stripe/portal and /stripe/cancel (both untouched).
      const userId = await authenticateSessionOrApiKey(request, reply);
      if (!userId) return reply; // 401 already sent
      return reply.code(403).send({
        error: "Self-serve checkout is not available. OneGoodArea is sold through a demo and annual contract. Book a demo to get started.",
        code: "self_serve_disabled",
      });
    });

    app.post("/stripe/addon-checkout",
      {
        schema: {
          tags: ["Stripe"],
          summary: "Add-on checkout",
          description: "Create a Stripe add-on checkout session. Currently retired (MCP included free).",
          security: [{ bearerToken: [] }, { bearerAuth: [] }],
          "x-internal": true,
          response: {
            403: z.object({ error: z.string(), code: z.string() }),
          },
        },
      },
      async (request, reply) => {
      // AR-489: the MCP add-on is retired. MCP is included on the free Developer
      // tier (AR-487) and every package; the standalone add-on is no longer sold.
      // Existing add-on subscribers keep access (hasAddon still grants it) and
      // can cancel via the billing portal.
      const userId = await authenticateSessionOrApiKey(request, reply);
      if (!userId) return reply; // 401 already sent
      return reply.code(403).send({
        error: "The MCP add-on is no longer sold separately. MCP is included on the free Developer tier and every package. Book a demo to get started.",
        code: "addon_retired",
      });
    });
}
