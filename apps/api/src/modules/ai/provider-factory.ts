import { getConfig } from "../../infrastructure/config";
import { AnthropicAiProvider } from "./anthropic-provider";
import { createDeepSeekProvider } from "./deepseek-provider";
import { MockAiProvider } from "./mock-provider";
import { createStrategyProvider } from "./strategy-provider";
import type { AiProvider } from "./types";
import { decideLlm, type Tier } from "../tiers";

/* Migrated from legacy src/lib/ai/providers/index.ts. Change: provider
   selection reads the synchronous process.env config (getConfig) instead of
   the async file-based getRuntimeConfig, so getAiProvider() is now sync.

   AR-614: getAiProviderForTier() builds a strategy provider from the AI
   config route (decideLlm) — round_robin / fallback_chain / list_pick with
   aiRetryCount retries. The OGA_AI_PROVIDER=mock|deepseek shortcuts are kept
   for the Docker test stacks (compose.test.yml) until AR-615 removes
   OGA_AI_PROVIDER entirely; every other path honours the configured strategy.

   DeepSeek Flash: cheaper alternative to Anthropic for local dev, Docker
   test stacks, and lower-value tiers. Set OGA_AI_PROVIDER=deepseek and
   DEEPSEEK_API_KEY to activate. */

export type { AiProvider } from "./types";

let cachedProvider: AiProvider | null = null;

/** Legacy global provider (mock vs anthropic based on env). Used only by
    paths that don't have a tier context. Prefer getAiProviderForTier(). */
export function getAiProvider(): AiProvider {
  if (!cachedProvider) {
    const provider = getConfig().aiProvider;
    cachedProvider =
      provider === "mock" ? new MockAiProvider() :
      provider === "deepseek" ? createDeepSeekProvider() :
      new AnthropicAiProvider();
  }

  return cachedProvider;
}

/** AR-499/AR-614: tier-aware provider factory. Returns a strategy provider
    built from the resolved AI config route for the tier (decideLlm). The
    provider is created fresh each call (cheap — SDKs are stateless). */
export function getAiProviderForTier(tier: Tier): AiProvider {
  const provider = getConfig().aiProvider;
  if (provider === "mock") return new MockAiProvider();
  if (provider === "deepseek") return createDeepSeekProvider();
  return createStrategyProvider(decideLlm(tier));
}
