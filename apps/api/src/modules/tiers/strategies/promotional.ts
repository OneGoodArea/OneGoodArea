import type { BillingStrategy } from "../billing-strategy";
import type { UserType } from "@onegoodarea/contracts";
import type { Tier } from "../index";

/** Wraps another BillingStrategy and checks active promotions
 *  (time-limited overrides) before delegating to the wrapped
 *  resolver. Promotions are additive — if a promotion is active
 *  for the user, its tier wins; otherwise the wrapped resolver
 *  decides. */
export class PromotionalResolver implements BillingStrategy {
  constructor(
    private readonly wrapped: BillingStrategy,
  ) {}

  async resolve(ctx: { userId: string; userType: UserType; hasApiKey: boolean }): Promise<Tier> {
    const promoTier = await this.resolvePromotion(ctx);
    if (promoTier) return promoTier;
    return this.wrapped.resolve(ctx);
  }

  /** Check if the user has an active promotion that overrides
   *  their tier. Returns null when no promotion applies. */
  private async resolvePromotion(_ctx: { userId: string; userType: UserType; hasApiKey: boolean }): Promise<Tier | null> {
    // TODO: query active promotions from the DB.
    // Promotions are time-limited tier overrides (e.g. a
    // 30-day enterprise trial for a new signup). The
    // implementation is deferred until the promotions table
    // and cron job land.
    return null;
  }
}