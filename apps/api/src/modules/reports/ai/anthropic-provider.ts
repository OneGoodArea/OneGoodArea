import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "./types";

/* Migrated VERBATIM from legacy src/lib/ai/providers/anthropic-provider.ts.
   Reads ANTHROPIC_API_KEY from process.env (the backend's config boundary). */

export class AnthropicAiProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    this.client = new Anthropic({ apiKey });
  }

  async generateNarrative(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((item) => item.type === "text");
    if (!text || text.type !== "text") {
      throw new Error("No text response from AI");
    }

    return text.text;
  }
}
