import { createStrategyProvider } from "./strategy-provider";
import type { AiProvider } from "./types";
import { decideLlm, type Tier } from "../tiers";

/* AR-614/AR-615: getAiProviderForTier() builds a strategy provider from the
   AI config route (decideLlm) — round_robin / fallback_chain / list_pick with
   aiRetryCount retries. Provider selection is driven entirely by the AI config
   strategies; the legacy OGA_AI_PROVIDER env switch was removed in AR-615. */

export type { AiProvider } from "./types";

/** AR-499/AR-614: tier-aware provider factory. Returns a strategy provider
    built from the resolved AI config route for the tier (decideLlm). The
    provider is created fresh each call (cheap — SDKs are stateless). */
export function getAiProviderForTier(tier: Tier): AiProvider {
  return createStrategyProvider(decideLlm(tier));
}
