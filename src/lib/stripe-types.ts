/**
 * Typed Stripe object interfaces.
 * Replaces fragile `as unknown as { ... }` casts across webhook, cancel, and subscription routes.
 */

export interface StripeSubscriptionFields {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number;
  current_period_end: number;
}

export interface StripeCheckoutSessionFields {
  customer: string;
  subscription: string | null;
  metadata: Record<string, string> | null;
}

/**
 * Safely extract typed fields from a Stripe event data object.
 * Stripe SDK types are overly complex; this casts once at the boundary.
 */
export function asSubscription(obj: unknown): StripeSubscriptionFields {
  return obj as StripeSubscriptionFields;
}

export function asCheckoutSession(obj: unknown): StripeCheckoutSessionFields {
  return obj as StripeCheckoutSessionFields;
}
