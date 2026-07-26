import { getConfig } from "../../../infrastructure/config";
import { AnthropicAiProvider } from "./anthropic-provider";
import { DeepSeekAiProvider } from "./deepseek-provider";
import { MockAiProvider } from "./mock-provider";
import type { AiProvider } from "./types";
import { decideLlm, type Tier } from "../../tiers";

/* Migrated from legacy src/lib/ai/providers/index.ts. Change: provider
   selection reads the synchronous process.env config (getConfig) instead of
   the async file-based getRuntimeConfig, so getAiProvider() is now sync.

   AR-499: getAiProviderForTier() selects provider+model from the TIERS
   catalog via decideLlm(). The model override is passed to the provider
   constructor so each tier gets its designated model.

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
      provider === "deepseek" ? new DeepSeekAiProvider() :
      new AnthropicAiProvider();
  }

  return cachedProvider;
}

/** AR-499: tier-aware provider factory. Returns a provider configured with
    the model from the TIERS catalog for the given tier. The provider is
    created fresh each call (cheap — SDKs are stateless). */
export function getAiProviderForTier(tier: Tier): AiProvider {
  const provider = getConfig().aiProvider;
  if (provider === "mock") return new MockAiProvider();
  if (provider === "deepseek") return new DeepSeekAiProvider();
  const route = decideLlm(tier);
  return new AnthropicAiProvider(route.model);
}
