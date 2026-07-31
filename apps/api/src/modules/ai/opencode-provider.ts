import { OpenAiCompatibleProvider, type OpenAiCompatibleProviderConfig } from "./openai-compatible-provider";

/* OpenCode Zen — OpenAI-compatible API. Implemented by the shared
   OpenAiCompatibleProvider, constructed here from this config:
     OPENCODE_API_KEY        — required
     OPENCODE_BASE_URL       — defaults to https://opencode.ai/zen/v1
     OPENCODE_MODEL          — defaults to deepseek-v4-flash-free
     OPENCODE_MAX_TOKENS     — defaults to 4096 */

export const openCodeProviderConfig: OpenAiCompatibleProviderConfig = {
  name: "OpenCode",
  envPrefix: "OPENCODE",
  defaultBaseUrl: "https://opencode.ai/zen/v1",
  defaultModel: "deepseek-v4-flash-free",
  defaultMaxTokens: 4096,
};

export const createOpenCodeProvider = (modelOverride?: string, params?: Record<string, unknown>) =>
  new OpenAiCompatibleProvider(openCodeProviderConfig, modelOverride, params);
