import { z } from "zod";
import type { AiConfig } from "./types";

const AiProviderEntrySchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

const AiStrategySchema = z.enum(["round_robin", "fallback_chain", "list_pick"]);

const AiStrategyConfigSchema = z.object({
  strategy: AiStrategySchema,
  providers: z.array(AiProviderEntrySchema).min(1),
});

export const AiConfigSchema = z.object({
  aiRetryCount: z.number().int().min(0).default(1),
  strategies: z.record(z.string(), AiStrategyConfigSchema),
});

export function parseAiConfig(raw: unknown): AiConfig {
  return AiConfigSchema.parse(raw) as AiConfig;
}

const DEFAULT_AI_CONFIG: AiConfig = {
  aiRetryCount: 1,
  strategies: {
    anonymous: {
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
    },
    logged_in: {
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
    },
    basic: {
      strategy: "fallback_chain",
      providers: [
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
        { provider: "deepseek", model: "deepseek-v4-flash" },
      ],
    },
    high_tier: {
      strategy: "fallback_chain",
      providers: [
        { provider: "deepseek", model: "deepseek-v4-pro" },
        { provider: "deepseek", model: "deepseek-v4-flash" },
        { provider: "anthropic", model: "claude-sonnet-4-5", params: { max_tokens: 8192 } },
        { provider: "anthropic", model: "claude-haiku-4-5", params: { max_tokens: 4096 } },
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
        { provider: "anthropic", model: "claude-opus-4-6", params: { max_tokens: 8192 } },
      ],
    },
    engineering: {
      strategy: "fallback_chain",
      providers: [
        { provider: "anthropic", model: "claude-opus-4-6", params: { max_tokens: 8192 } },
      ],
    },
    superuser: {
      strategy: "fallback_chain",
      providers: [
        { provider: "anthropic", model: "claude-sonnet-4-5", params: { max_tokens: 8192 } },
        { provider: "deepseek", model: "deepseek-v4-pro" },
        { provider: "anthropic", model: "claude-opus-4-6", params: { max_tokens: 8192 } },
        { provider: "deepseek", model: "deepseek-v4-flash" },
        { provider: "anthropic", model: "claude-haiku-4-5", params: { max_tokens: 4096 } },
        { provider: "opencode", model: "deepseek-v4-flash-free" },
        { provider: "openrouter", model: "deepseek/deepseek-chat-v3-0324:free" },
      ],
    },
  },
};

let cached: AiConfig | null = null;

export function getAiConfig(): AiConfig {
  if (!cached) {
    cached = parseAiConfig(DEFAULT_AI_CONFIG);
  }
  return cached;
}
