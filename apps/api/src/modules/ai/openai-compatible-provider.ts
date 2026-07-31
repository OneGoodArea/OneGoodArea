import type { AiProvider } from "./types";

export interface OpenAiCompatibleProviderConfig {
  name: string;
  envPrefix: string;
  defaultBaseUrl: string;
  defaultModel: string;
  defaultMaxTokens: number;
}

/* Shared implementation for the OpenAI-compatible chat-completions
   providers (DeepSeek, OpenRouter, OpenCode Zen). They follow the OpenAI
   wire format, so we use plain fetch instead of adding an SDK dependency.

   The providers differ by data, not behaviour — a single config-driven
   class is parameterized instead of subclassed. For each provider it reads:
     <PREFIX>_API_KEY      — required
     <PREFIX>_BASE_URL     — defaults to the provider default
     <PREFIX>_MODEL        — defaults to the provider default (modelOverride wins)
     <PREFIX>_MAX_TOKENS   — defaults to the provider default

   Server-side only — never expose provider API keys to the client. */

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly name: string;
  private readonly params: Record<string, unknown>;

  constructor(config: OpenAiCompatibleProviderConfig, modelOverride?: string, params?: Record<string, unknown>) {
    const apiKey = process.env[`${config.envPrefix}_API_KEY`];

    if (!apiKey) {
      throw new Error(`Missing ${config.envPrefix}_API_KEY`);
    }

    this.apiKey = apiKey;
    this.baseUrl = process.env[`${config.envPrefix}_BASE_URL`] ?? config.defaultBaseUrl;
    this.model = modelOverride ?? process.env[`${config.envPrefix}_MODEL`] ?? config.defaultModel;
    this.maxTokens = Number(process.env[`${config.envPrefix}_MAX_TOKENS`] ?? config.defaultMaxTokens);
    this.name = config.name;
    this.params = params ?? {};
  }

  async generateNarrative(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: "user", content: prompt }],
        ...this.params,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${this.name} API error ${response.status}: ${body}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`No text response from ${this.name}`);
    }

    return text;
  }
}
