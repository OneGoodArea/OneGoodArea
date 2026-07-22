import { getConfig } from "../../../infrastructure/config";
import { AnthropicAiProvider } from "./anthropic-provider";
import { MockAiProvider } from "./mock-provider";
import type { AiProvider } from "./types";
import { decideLlm, type Tier } from "../../tiers";

/* Migrated from legacy src/lib/ai/providers/index.ts. Change: provider
   selection reads the synchronous process.env config (getConfig) instead of
   the async file-based getRuntimeConfig, so getAiProvider() is now sync.

   AR-499: getAiProviderForTier() selects provider+model from the TIERS
   catalog via decideLlm(). The model override is passed to the provider
   constructor so each tier gets its designated model. */

export type { AiProvider } from "./types";

let cachedProvider: AiProvider | null = null;

/** Legacy global provider (mock vs anthropic based on env). Used only by
    paths that don't have a tier context. Prefer getAiProviderForTier(). */
export function getAiProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider =
      getConfig().aiProvider === "mock" ? new MockAiProvider() : new AnthropicAiProvider();
  }

  return cachedProvider;
}

/** AR-499: tier-aware provider factory. Returns a provider configured with
    the model from the TIERS catalog for the given tier. The provider is
    created fresh each call (cheap — Anthropic SDK is stateless). */
export function getAiProviderForTier(tier: Tier): AiProvider {
  if (getConfig().aiProvider === "mock") return new MockAiProvider();
  const route = decideLlm(tier);
  return new AnthropicAiProvider(route.model);
}
