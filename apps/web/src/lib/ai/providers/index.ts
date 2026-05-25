import { getRuntimeConfig } from "@/lib/runtime/env";
import { AnthropicAiProvider } from "./anthropic-provider";
import { MockAiProvider } from "./mock-provider";
import type { AiProvider } from "./types";

let cachedProvider: Promise<AiProvider> | null = null;

export function getAiProvider(): Promise<AiProvider> {
  if (!cachedProvider) {
    cachedProvider = getRuntimeConfig().then((config) => {
      return config.aiProvider === "mock" ? new MockAiProvider() : new AnthropicAiProvider();
    });
  }

  return cachedProvider;
}
