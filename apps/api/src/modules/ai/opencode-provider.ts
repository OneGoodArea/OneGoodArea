import type { AiProvider } from "./types";

/* OpenCode Zen provider — OpenAI-compatible API.

   OpenCode Zen's chat completions endpoint follows the OpenAI wire format,
   so we use plain fetch instead of adding an SDK dependency. The API key
   comes directly from the environment (AR-616: providers read their own
   keys from process.env, not from getConfig()):
     OPENCODE_API_KEY        — required
     OPENCODE_BASE_URL       — defaults to https://opencode.ai/zen/v1
     OPENCODE_MODEL          — defaults to deepseek-v4-flash-free
     OPENCODE_MAX_TOKENS     — defaults to 4096 */

export class OpenCodeAiProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(modelOverride?: string) {
    const apiKey = process.env.OPENCODE_API_KEY;

    if (!apiKey) {
      throw new Error("Missing OPENCODE_API_KEY");
    }

    this.apiKey = apiKey;
    this.baseUrl = process.env.OPENCODE_BASE_URL ?? "https://opencode.ai/zen/v1";
    this.model = modelOverride ?? process.env.OPENCODE_MODEL ?? "deepseek-v4-flash-free";
    this.maxTokens = Number(process.env.OPENCODE_MAX_TOKENS ?? 4096);
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
      throw new Error(`OpenCode API error ${response.status}: ${body}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No text response from OpenCode");
    }

    return text;
  }
}
