import { OpenAiCompatibleProvider, type OpenAiCompatibleProviderConfig } from "./openai-compatible-provider";

/* OpenRouter — OpenAI-compatible API. Implemented by the shared
   OpenAiCompatibleProvider, constructed here from this config:
     OPENROUTER_API_KEY      — required
     OPENROUTER_BASE_URL     — defaults to https://openrouter.ai/api/v1
     OPENROUTER_MODEL        — defaults to deepseek/deepseek-chat-v3-0324:free
     OPENROUTER_MAX_TOKENS   — defaults to 4096 */

export const openRouterProviderConfig: OpenAiCompatibleProviderConfig = {
  name: "OpenRouter",
  envPrefix: "OPENROUTER",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "deepseek/deepseek-chat-v3-0324:free",
  defaultMaxTokens: 4096,
};

export const createOpenRouterProvider = (modelOverride?: string) =>
  new OpenAiCompatibleProvider(openRouterProviderConfig, modelOverride);
