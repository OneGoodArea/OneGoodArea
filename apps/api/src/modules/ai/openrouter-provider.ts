import type { AiProvider } from "./types";

/* OpenRouter provider — OpenAI-compatible API.

   OpenRouter's chat completions endpoint follows the OpenAI wire format,
   so we use plain fetch instead of adding an SDK dependency. The API key
   comes directly from the environment (AR-616: providers read their own
   keys from process.env, not from getConfig()):
     OPENROUTER_API_KEY      — required
     OPENROUTER_BASE_URL     — defaults to https://openrouter.ai/api/v1
     OPENROUTER_MODEL        — defaults to deepseek/deepseek-chat-v3-0324:free
     OPENROUTER_MAX_TOKENS   — defaults to 4096

   Server-side only — never expose the OpenRouter API key to the client. */

export class OpenRouterAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(modelOverride?: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    this.apiKey = apiKey;
    this.baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
    this.model = modelOverride ?? process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324:free";
    this.maxTokens = Number(process.env.OPENROUTER_MAX_TOKENS ?? 4096);
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
      throw new Error(`OpenRouter API error ${response.status}: ${body}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No text response from OpenRouter");
    }

    return text;
  }
}
