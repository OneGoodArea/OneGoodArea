import { getConfig } from "../../../infrastructure/config";
import { AnthropicAiProvider } from "./anthropic-provider";
import { MockAiProvider } from "./mock-provider";
import type { AiProvider } from "./types";

/* Migrated from legacy src/lib/ai/providers/index.ts. Change: provider
   selection reads the synchronous process.env config (getConfig) instead of
   the async file-based getRuntimeConfig, so getAiProvider() is now sync. */

export type { AiProvider } from "./types";

let cachedProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!cachedProvider) {
    cachedProvider =
      getConfig().aiProvider === "mock" ? new MockAiProvider() : new AnthropicAiProvider();
  }

  return cachedProvider;
}
