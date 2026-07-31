import { getConfig } from "../../infrastructure/config";
import type { AiProvider } from "./types";

/* DeepSeek Flash provider — OpenAI-compatible API.

   DeepSeek's chat completions endpoint follows the OpenAI wire format,
   so we use plain fetch instead of adding an SDK dependency. The API
   key and base URL come from environment variables:
     DEEPSEEK_API_KEY      — required
     DEEPSEEK_BASE_URL     — defaults to https://api.deepseek.com/v1
     DEEPSEEK_MODEL        — defaults to deepseek-chat
     DEEPSEEK_MAX_TOKENS   — defaults to 4096

   Used as a cheaper alternative to Anthropic for local dev, Docker test
   stacks, and lower-value tiers. */

export class DeepSeekAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(modelOverride?: string) {
    const config = getConfig();
    const apiKey = config.deepseekApiKey;

    if (!apiKey) {
      throw new Error("Missing DEEPSEEK_API_KEY");
    }

    this.apiKey = apiKey;
    this.baseUrl = config.deepseekBaseUrl;
    this.model = modelOverride ?? config.deepseekModel;
    this.maxTokens = config.deepseekMaxTokens;
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
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${body}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No text response from DeepSeek");
    }

    return text;
  }
}
