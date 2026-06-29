import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../../../infrastructure/config";
import type { AiProvider } from "./types";

/* Migrated VERBATIM from legacy src/lib/ai/providers/anthropic-provider.ts.
   Reads ANTHROPIC_API_KEY from centralised config.

   AR-383: model is now read from getConfig().anthropicModel
   (env: ANTHROPIC_MODEL) with a current-Sonnet default. The previous
   hardcoded snapshot ID was retired by Anthropic, breaking every NL
   planner call with a 404 not_found_error. Configurable so future
   model retirements are a Render env-var change, not a code deploy. */

export class AnthropicAiProvider implements AiProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    const config = getConfig();
    const apiKey = config.anthropicApiKey;

    if (!apiKey) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    this.client = new Anthropic({ apiKey });
    this.model = config.anthropicModel;
  }

  async generateNarrative(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
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
