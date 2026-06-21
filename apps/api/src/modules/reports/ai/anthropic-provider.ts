import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../../infrastructure/config";
import type { AiProvider } from "./types";

/* Migrated VERBATIM from legacy src/lib/ai/providers/anthropic-provider.ts.
   Reads ANTHROPIC_API_KEY from centralised config. */

export class AnthropicAiProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor() {
    const config = getConfig();
    const apiKey = config.anthropicApiKey;

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
