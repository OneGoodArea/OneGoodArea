import { OpenAiCompatibleProvider, type OpenAiCompatibleProviderConfig } from "./openai-compatible-provider";

/* DeepSeek — OpenAI-compatible API. Cheaper alternative to Anthropic for
   local dev, Docker test stacks, and lower-value tiers. Implemented by the
   shared OpenAiCompatibleProvider, constructed here from this config:
     DEEPSEEK_API_KEY      — required
     DEEPSEEK_BASE_URL     — defaults to https://api.deepseek.com/v1
     DEEPSEEK_MODEL        — defaults to deepseek-chat
     DEEPSEEK_MAX_TOKENS   — defaults to 4096 */

export const deepSeekProviderConfig: OpenAiCompatibleProviderConfig = {
  name: "DeepSeek",
  envPrefix: "DEEPSEEK",
  defaultBaseUrl: "https://api.deepseek.com/v1",
  defaultModel: "deepseek-chat",
  defaultMaxTokens: 4096,
};

export const createDeepSeekProvider = (modelOverride?: string, params?: Record<string, unknown>) =>
  new OpenAiCompatibleProvider(deepSeekProviderConfig, modelOverride, params);
